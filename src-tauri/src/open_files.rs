use crate::documents::{AppError, Documents};
use serde::Serialize;
use std::{
    collections::VecDeque,
    path::{Path, PathBuf},
    sync::Mutex,
};

#[derive(Debug, Serialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum OpenRequest {
    Document { path: PathBuf },
    Error { message: String },
}

#[derive(Default)]
pub struct OpenFiles(Mutex<VecDeque<OpenRequest>>);

impl OpenFiles {
    pub fn enqueue(&self, documents: &Documents, path: &Path) {
        let request = match documents.grant_file(path) {
            Ok(path) => OpenRequest::Document { path },
            Err(AppError { message, .. }) => OpenRequest::Error { message },
        };
        self.0.lock().unwrap().push_back(request);
    }

    pub fn drain(&self) -> Vec<OpenRequest> {
        self.0.lock().unwrap().drain(..).collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn buffers_before_frontend_ready_and_delivers_once_in_order() {
        let dir = tempfile::tempdir().unwrap();
        let a = dir.path().join("a.md");
        let b = dir.path().join("b.md");
        std::fs::write(&a, "A").unwrap();
        std::fs::write(&b, "B").unwrap();
        let queue = OpenFiles::default();
        let documents = Documents::default();
        queue.enqueue(&documents, &a);
        queue.enqueue(&documents, &b);
        let items = queue.drain();
        assert!(matches!(&items[0], OpenRequest::Document {path} if path.ends_with("a.md")));
        assert!(matches!(&items[1], OpenRequest::Document {path} if path.ends_with("b.md")));
        assert!(queue.drain().is_empty());
        assert_eq!(documents.read(&a).unwrap().content, "A");
        queue.enqueue(&documents, &dir.path().join("missing.md"));
        assert!(matches!(&queue.drain()[0], OpenRequest::Error { .. }));
    }
}
