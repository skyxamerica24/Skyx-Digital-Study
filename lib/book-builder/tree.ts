// Pure tree utilities for the Manual Book Builder.
// Kept free of Prisma/React so the logic is unit-testable and reusable by
// server actions, the builder UI, and (later) the assistant's book functions.

export type NodeKind = "chapter" | "topic" | "subtopic" | "point";

export interface FlatNode {
  id: string;
  bookId: string;
  parentId: string | null;
  kind: string;
  title: string;
  orderIndex: number;
  contentMarkdown?: string | null;
  model3dKey?: string | null;
  diagramId?: string | null;
  isPublished: boolean;
}

export interface TreeNode extends FlatNode {
  children: TreeNode[];
  depth: number;
}

export const KIND_BY_DEPTH: NodeKind[] = ["chapter", "topic", "subtopic", "point"];

export function kindForDepth(depth: number): NodeKind {
  return KIND_BY_DEPTH[Math.min(Math.max(depth, 0), KIND_BY_DEPTH.length - 1)];
}

export function childrenOf(nodes: FlatNode[], parentId: string | null): FlatNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex || a.title.localeCompare(b.title));
}

export function buildTree(nodes: FlatNode[]): TreeNode[] {
  const walk = (parentId: string | null, depth: number): TreeNode[] =>
    childrenOf(nodes, parentId).map((n) => ({ ...n, depth, children: walk(n.id, depth + 1) }));
  return walk(null, 0);
}

export function nodeById(nodes: FlatNode[], id: string): FlatNode | undefined {
  return nodes.find((n) => n.id === id);
}

/** Ancestors of a node, root first, excluding the node itself. */
export function ancestorsOf(nodes: FlatNode[], id: string): FlatNode[] {
  const chain: FlatNode[] = [];
  let current = nodeById(nodes, id);
  const guard = new Set<string>();
  while (current?.parentId && !guard.has(current.parentId)) {
    guard.add(current.parentId);
    const parent = nodeById(nodes, current.parentId);
    if (!parent) break;
    chain.unshift(parent);
    current = parent;
  }
  return chain;
}

export function breadcrumb(nodes: FlatNode[], id: string): string[] {
  const self = nodeById(nodes, id);
  if (!self) return [];
  return [...ancestorsOf(nodes, id).map((n) => n.title), self.title];
}

export function depthOf(nodes: FlatNode[], id: string): number {
  return ancestorsOf(nodes, id).length;
}

/** The node itself plus every descendant id. */
export function descendantIds(nodes: FlatNode[], id: string): Set<string> {
  const result = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of nodes) {
      if (n.parentId && result.has(n.parentId) && !result.has(n.id)) {
        result.add(n.id);
        grew = true;
      }
    }
  }
  return result;
}

/** True when moving `id` under `newParentId` would create a cycle. */
export function wouldCreateCycle(nodes: FlatNode[], id: string, newParentId: string | null): boolean {
  if (newParentId === null) return false;
  if (newParentId === id) return true;
  return descendantIds(nodes, id).has(newParentId);
}

/** Depth-first flat walk with each node's ancestor path (root first, including itself). */
export function walkDfs(
  nodes: FlatNode[],
): Array<{ node: FlatNode; path: FlatNode[]; depth: number }> {
  const out: Array<{ node: FlatNode; path: FlatNode[]; depth: number }> = [];
  const visit = (parentId: string | null, path: FlatNode[], depth: number) => {
    for (const child of childrenOf(nodes, parentId)) {
      const childPath = [...path, child];
      out.push({ node: child, path: childPath, depth });
      visit(child.id, childPath, depth + 1);
    }
  };
  visit(null, [], 0);
  return out;
}

export function estimateReadingMinutes(markdown?: string | null): number {
  if (!markdown) return 1;
  const words = markdown.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export interface TopicRow {
  chapterNumber: number;
  chapterTitle: string;
  sectionTitle: string;
  topicTitle: string;
  orderIndex: number;
  contentMarkdown: string;
  readingMinutes: number;
  model3dKey?: string;
  searchTokens: string;
  sourceNodeId: string;
  isPublished: boolean;
}

/**
 * Materialise the node tree into flat BookTopic rows so the existing Reader,
 * search, study tabs and exam tooling work with hand-built books unchanged.
 * A node becomes a reading page when it has content or is a leaf. Pure
 * container nodes get a generated "what is inside" page so navigation
 * never dead-ends. Unpublished nodes hide their whole subtree.
 */
export function nodesToTopicRows(nodes: FlatNode[]): TopicRow[] {
  const rows: TopicRow[] = [];
  const chapterNumbers = new Map<string, number>();
  childrenOf(nodes, null).forEach((root, i) => chapterNumbers.set(root.id, i + 1));

  for (const { node, path } of walkDfs(nodes)) {
    const hidden = path.some((p) => !p.isPublished);
    if (hidden) continue;
    const kids = childrenOf(nodes, node.id).filter((k) => k.isPublished);
    const hasContent = !!(node.contentMarkdown && node.contentMarkdown.trim().length > 0);
    if (!hasContent && kids.length > 0) {
      const listing = kids.map((k) => `- ${k.title}`).join("\n");
      rows.push(makeRow(node, path, chapterNumbers, `## ${node.title}\n\nএই অংশে যা আছে:\n\n${listing}\n`));
      continue;
    }
    rows.push(makeRow(node, path, chapterNumbers, node.contentMarkdown || ""));
  }
  rows.forEach((r, i) => (r.orderIndex = i));
  return rows;
}

function makeRow(
  node: FlatNode,
  path: FlatNode[],
  chapterNumbers: Map<string, number>,
  content: string,
): TopicRow {
  const root = path[0];
  const crumb = path.map((p) => p.title);
  return {
    chapterNumber: root ? chapterNumbers.get(root.id) ?? 1 : 1,
    chapterTitle: root?.title ?? "",
    sectionTitle: path.length > 2 ? path[path.length - 2].title : path.length === 2 ? path[0].title : "",
    topicTitle: node.title,
    orderIndex: 0,
    contentMarkdown: content,
    readingMinutes: estimateReadingMinutes(content),
    model3dKey: node.model3dKey || undefined,
    searchTokens: crumb.join(" ").toLowerCase().slice(0, 1900),
    sourceNodeId: node.id,
    isPublished: true,
  };
}

export interface OutlineItem {
  title: string;
  depth: number;
}

/**
 * Parse an indented outline into items. Depth comes from leading
 * spaces/tabs (2 spaces = 1 level) or markdown heading depth (#, ##, ...).
 * List markers (-, *, 1.) are stripped. Depth jumps are clamped so a
 * line can be at most one level deeper than the previous line.
 */
export function parseOutline(text: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    let depth = 0;
    const heading = rawLine.match(/^\s*(#{1,6})\s+(.*)$/);
    if (heading) {
      depth = heading[1].length - 1;
      items.push({ title: heading[2].trim(), depth });
      continue;
    }
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].replace(/\t/g, "  ").length : 0;
    depth = Math.floor(indent / 2);
    const title = rawLine
      .trim()
      .replace(/^[-*•]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();
    if (title) items.push({ title, depth });
  }
  for (let i = 0; i < items.length; i++) {
    const maxDepth = i === 0 ? 0 : items[i - 1].depth + 1;
    if (items[i].depth > maxDepth) items[i].depth = maxDepth;
  }
  return items;
}
