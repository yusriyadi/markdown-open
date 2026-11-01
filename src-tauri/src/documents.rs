use serde::Serialize;
use std::{
    collections::HashSet,
    fs, io,
    path::{Path, PathBuf},
    sync::Mutex,
};
use url::Url;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub path: PathBuf,
    pub file_name: String,
    pub content: String,
}

pub use crate::error::AppError;

fn io_error(error: io::Error) -> AppError {
    let code = match error.kind() {
        io::ErrorKind::NotFound => "notFound",
        io::ErrorKind::PermissionDenied => "permissionDenied",
        io::ErrorKind::InvalidData => "invalidEncoding",
        _ => "io",
    };
    AppError::new(code, error.to_string())
}

pub fn is_markdown(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("md") || e.eq_ignore_ascii_case("markdown"))
}

// Grants come only from native dialogs, OS file-open/drop events, or links in an
// already-authorized document. Frontend commands cannot grant arbitrary paths.
#[derive(Default)]
pub struct Documents {
    files: Mutex<HashSet<PathBuf>>,
    roots: Mutex<HashSet<PathBuf>>,
}

impl Documents {
    pub fn grant_file(&self, path: &Path) -> Result<PathBuf, AppError> {
        let path = fs::canonicalize(path).map_err(io_error)?;
        if !is_markdown(&path) || !path.is_file() {
            return Err(AppError::new(
                "unsupportedFormat",
                "Choose a Markdown file (.md or .markdown).",
            ));
        }
        self.files.lock().unwrap().insert(path.clone());
        Ok(path)
    }

    pub fn grant_workspace(&self, path: &Path) -> Result<PathBuf, AppError> {
        let path = fs::canonicalize(path).map_err(io_error)?;
        if !path.is_dir() {
            return Err(AppError::new("notDirectory", "Choose a workspace folder."));
        }
        self.roots.lock().unwrap().insert(path.clone());
        Ok(path)
    }

    fn authorized(&self, path: &Path) -> bool {
        self.files.lock().unwrap().contains(path)
            || self
                .roots
                .lock()
                .unwrap()
                .iter()
                .any(|root| path.starts_with(root))
    }

    pub fn read(&self, path: &Path) -> Result<Document, AppError> {
        let path = fs::canonicalize(path).map_err(io_error)?;
        if !self.authorized(&path) {
            return Err(AppError::new(
                "accessDenied",
                "Open this document using Open File, Finder, or a workspace first.",
            ));
        }
        if !is_markdown(&path) || !path.is_file() {
            return Err(AppError::new(
                "unsupportedFormat",
                "Only Markdown files can be opened.",
            ));
        }
        let content = fs::read_to_string(&path).map_err(io_error)?;
        Ok(Document {
            file_name: path.file_name().unwrap().to_string_lossy().into(),
            path,
            content,
        })
    }

    pub fn resolve_link(&self, current: &Path, href: &str) -> Result<PathBuf, AppError> {
        let current = fs::canonicalize(current).map_err(io_error)?;
        if !self.authorized(&current) {
            return Err(AppError::new(
                "accessDenied",
                "The source document is not authorized.",
            ));
        }
        let base = Url::from_file_path(&current)
            .map_err(|_| AppError::new("invalidPath", "Invalid document path."))?;
        let target = base
            .join(href)
            .map_err(|_| AppError::new("invalidPath", "Invalid document link."))?;
        if target.scheme() != "file" {
            return Err(AppError::new(
                "invalidPath",
                "Only local Markdown links can be opened here.",
            ));
        }
        let path = target
            .to_file_path()
            .map_err(|_| AppError::new("invalidPath", "Invalid file URL."))?;
        self.grant_file(&path)
    }

    pub fn scan(&self, root: &Path) -> Result<WorkspaceTree, AppError> {
        let root = fs::canonicalize(root).map_err(io_error)?;
        if !self.roots.lock().unwrap().contains(&root) {
            return Err(AppError::new(
                "accessDenied",
                "Choose this workspace using Open Folder first.",
            ));
        }
        let mut warnings = Vec::new();
        let nodes = scan_dir(&root, &mut warnings).map_err(io_error)?;
        Ok(WorkspaceTree { nodes, warnings })
    }
}

#[derive(Debug, Serialize)]
pub struct TreeNode {
    pub name: String,
    pub path: PathBuf,
    #[serde(rename = "type")]
    pub kind: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<TreeNode>>,
}

#[derive(Debug, Serialize)]
pub struct WorkspaceTree {
    pub nodes: Vec<TreeNode>,
    pub warnings: Vec<String>,
}

fn scan_dir(root: &Path, warnings: &mut Vec<String>) -> io::Result<Vec<TreeNode>> {
    let mut nodes = Vec::new();
    for entry in fs::read_dir(root)? {
        let entry = match entry {
            Ok(entry) => entry,
            Err(e) => {
                warnings.push(e.to_string());
                continue;
            }
        };
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().into_owned();
        let kind = match entry.file_type() {
            Ok(kind) => kind,
            Err(e) => {
                warnings.push(e.to_string());
                continue;
            }
        };
        // Skip all symlinks, including links outside the authorized workspace.
        if kind.is_symlink() {
            continue;
        }
        if kind.is_dir() {
            if name == ".git" || name == "node_modules" {
                continue;
            }
            match scan_dir(&path, warnings) {
                Ok(children) if !children.is_empty() => nodes.push(TreeNode {
                    name,
                    path,
                    kind: "directory",
                    children: Some(children),
                }),
                Ok(_) => {}
                Err(e) => warnings.push(format!("{}: {}", path.display(), e)),
            }
        } else if kind.is_file() && is_markdown(&path) {
            nodes.push(TreeNode {
                name,
                path,
                kind: "file",
                children: None,
            });
        }
    }
    nodes.sort_by(|a, b| {
        (a.kind != "directory")
            .cmp(&(b.kind != "directory"))
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
            .then_with(|| a.name.cmp(&b.name))
    });
    Ok(nodes)
}

pub fn external_url(value: &str) -> Result<Url, AppError> {
    let url =
        Url::parse(value).map_err(|_| AppError::new("invalidUrl", "Invalid external link."))?;
    if !matches!(url.scheme(), "http" | "https" | "mailto") {
        return Err(AppError::new(
            "unsupportedScheme",
            "This link type is not supported.",
        ));
    }
    Ok(url)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_empty_unicode_and_rejects_unauthorized_and_invalid_files() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("catatan kosong 日本.MD");
        fs::write(&file, "").unwrap();
        let documents = Documents::default();
        assert_eq!(documents.read(&file).unwrap_err().code, "accessDenied");
        documents.grant_file(&file).unwrap();
        let doc = documents.read(&file).unwrap();
        assert_eq!(doc.content, "");
        assert_eq!(doc.file_name, "catatan kosong 日本.MD");
        fs::write(&file, [0xff, 0xfe]).unwrap();
        assert_eq!(documents.read(&file).unwrap_err().code, "invalidEncoding");
        assert_eq!(
            documents
                .read(&dir.path().join("missing.md"))
                .unwrap_err()
                .code,
            "notFound"
        );
        let other = dir.path().join("secret.txt");
        fs::write(&other, "secret").unwrap();
        assert_eq!(
            documents.grant_file(&other).unwrap_err().code,
            "unsupportedFormat"
        );
    }

    #[test]
    fn resolves_encoded_relative_links_outside_workspace_and_validates_source() {
        let dir = tempfile::tempdir().unwrap();
        let workspace = dir.path().join("workspace");
        fs::create_dir(&workspace).unwrap();
        let current = workspace.join("start.md");
        let target = dir.path().join("catatan 日本.markdown");
        fs::write(&current, "hello").unwrap();
        fs::write(&target, "target").unwrap();
        let documents = Documents::default();
        assert_eq!(
            documents
                .resolve_link(&current, "../catatan%20日本.markdown")
                .unwrap_err()
                .code,
            "accessDenied"
        );
        documents.grant_workspace(&workspace).unwrap();
        let resolved = documents
            .resolve_link(
                &current,
                "../catatan%20%E6%97%A5%E6%9C%AC.markdown?x=1#heading",
            )
            .unwrap();
        assert_eq!(documents.read(&resolved).unwrap().content, "target");
        assert_eq!(
            documents
                .resolve_link(&current, "https://example.com/file.md")
                .unwrap_err()
                .code,
            "invalidPath"
        );
        assert!(documents.resolve_link(&current, "../missing.md").is_err());
    }

    #[test]
    fn scans_relevant_tree_in_stable_order_and_does_not_follow_symlinks() {
        let dir = tempfile::tempdir().unwrap();
        for folder in ["Zfolder", "empty", ".git", "node_modules"] {
            fs::create_dir(dir.path().join(folder)).unwrap();
        }
        for name in [
            "Zfolder/nested.MARKDOWN",
            "b.md",
            "A.MD",
            "empty/note.txt",
            ".git/hidden.md",
            "node_modules/hidden.md",
        ] {
            fs::write(dir.path().join(name), "content").unwrap();
        }
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(dir.path(), dir.path().join("cycle")).unwrap();
            std::os::unix::fs::symlink(dir.path().join("b.md"), dir.path().join("linked.md"))
                .unwrap();
        }
        let documents = Documents::default();
        assert_eq!(documents.scan(dir.path()).unwrap_err().code, "accessDenied");
        let root = documents.grant_workspace(dir.path()).unwrap();
        let tree = documents.scan(&root).unwrap();
        assert_eq!(
            tree.nodes
                .iter()
                .map(|n| n.name.as_str())
                .collect::<Vec<_>>(),
            ["Zfolder", "A.MD", "b.md"]
        );
        assert_eq!(
            tree.nodes[0].children.as_ref().unwrap()[0].name,
            "nested.MARKDOWN"
        );
        assert!(tree.warnings.is_empty());
        assert_eq!(
            documents.read(&dir.path().join("b.md")).unwrap().content,
            "content"
        );
    }

    #[cfg(unix)]
    #[test]
    fn workspace_grants_do_not_follow_links_outside_root() {
        let dir = tempfile::tempdir().unwrap();
        let other = tempfile::tempdir().unwrap();
        let secret = other.path().join("other.md");
        fs::write(&secret, "not granted").unwrap();
        let link = dir.path().join("link.md");
        std::os::unix::fs::symlink(&secret, &link).unwrap();
        let documents = Documents::default();
        documents.grant_workspace(dir.path()).unwrap();
        assert_eq!(documents.read(&link).unwrap_err().code, "accessDenied");
    }

    #[test]
    fn external_links_only_allow_web_and_email() {
        for good in [
            "https://example.com",
            "http://localhost:8000",
            "mailto:hello@example.com",
        ] {
            assert!(external_url(good).is_ok());
        }
        for bad in [
            "javascript:alert(1)",
            "file:///etc/passwd",
            "data:text/html,test",
            "not a url",
        ] {
            assert!(external_url(bad).is_err());
        }
    }
}
