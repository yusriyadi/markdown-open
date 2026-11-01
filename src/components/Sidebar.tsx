import { useState } from 'react'

import type { FileTreeNode } from '../lib/types'

interface SidebarProps {
  tree: FileTreeNode[]
  activePath: string | null
  onSelectFile: (path: string) => void
  workspacePath?: string | null
}

function TreeNode({ node, activePath, onSelectFile, depth }: {
  node: FileTreeNode
  activePath: string | null
  onSelectFile: (path: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(true)

  if (node.type === 'file') {
    const isActive = node.path === activePath
    return (
      <div
        className={`tree-item tree-file ${isActive ? 'tree-item-active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelectFile(node.path)}
        title={node.path}
      >
        <span className="tree-icon">📄</span>
        <span className="tree-name">{node.name}</span>
      </div>
    )
  }

  return (
    <div>
      <div
        className="tree-item tree-folder"
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="tree-arrow">{expanded ? '▾' : '▸'}</span>
        <span className="tree-icon">{expanded ? '📂' : '📁'}</span>
        <span className="tree-name">{node.name}</span>
      </div>
      {expanded && node.children?.map((child) => (
        <TreeNode
          key={child.path}
          node={child}
          activePath={activePath}
          onSelectFile={onSelectFile}
          depth={depth + 1}
        />
      ))}
    </div>
  )
}

export default function Sidebar({ tree, activePath, onSelectFile, workspacePath }: SidebarProps) {

  const folderName = workspacePath ? workspacePath.split('/').pop() || workspacePath : null

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span title={workspacePath || undefined}>📁 {folderName || 'Explorer'}</span>
        <span className="sidebar-count">{countFiles(tree)} files</span>
      </div>
      <div className="sidebar-tree">
        {tree.length === 0 && <p className="sidebar-empty">No Markdown files in this folder.</p>}
        {tree.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            activePath={activePath}
            onSelectFile={onSelectFile}
            depth={0}
          />
        ))}
      </div>
    </aside>
  )
}

function countFiles(nodes: FileTreeNode[]): number {
  let count = 0
  for (const node of nodes) {
    if (node.type === 'file') count++
    if (node.children) count += countFiles(node.children)
  }
  return count
}
