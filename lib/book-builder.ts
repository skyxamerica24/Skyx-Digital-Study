import { z } from "zod";

export const nodeKinds = ["chapter", "topic", "subtopic", "point"] as const;
export const bookDraftSchema = z.object({
  title: z.string().trim().max(195),
  author: z.string().trim().max(135),
  subtitle: z.string().trim().max(235),
  subject: z.string().trim().max(135),
  description: z.string().trim().max(1150),
  language: z.enum(["en", "bn", "bilingual"]),
  accessTier: z.enum(["free", "premium", "admin"]),
  nodes: z.array(z.object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    kind: z.enum(nodeKinds),
    title: z.string().trim().min(1).max(195),
    markdown: z.string().max(250000),
    visible: z.boolean(),
  })).max(5000),
});
export type BookDraft = z.infer<typeof bookDraftSchema>;
export type DraftNode = BookDraft["nodes"][number];

export function orderBookNodes(nodes: DraftNode[]) {
  const children = new Map<string | null, DraftNode[]>();
  const ids = new Set(nodes.map(node => node.id));
  if (ids.size !== nodes.length) throw new Error("Duplicate sections.");
  for (const node of nodes) {
    if (node.parentId && !ids.has(node.parentId)) throw new Error("A parent section is missing.");
    const siblings = children.get(node.parentId) ?? [];
    siblings.push(node);
    children.set(node.parentId, siblings);
  }
  const ordered: { node: DraftNode; depth: number; path: string[]; visible: boolean; chapter: number }[] = [];
  const stack = (children.get(null) ?? []).map((node, i) => ({
    node, depth: 0, path: [node.title], visible: node.visible, chapter: i + 1,
  })).reverse();
  while (stack.length) {
    const item = stack.pop()!;
    ordered.push(item);
    const nested = children.get(item.node.id) ?? [];
    for (let i = nested.length - 1; i >= 0; i--) {
      const node = nested[i];
      stack.push({ node, depth: item.depth + 1, path: [...item.path, node.title],
        visible: item.visible && node.visible, chapter: item.chapter });
    }
  }
  if (ordered.length !== nodes.length) throw new Error("A section cannot contain itself or one of its ancestors.");
  return ordered;
}

export function parseBookOutline(outline: string, makeId: () => string): DraftNode[] {
  const levels: { indent: number; id: string }[] = [];
  return outline.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const indent = line.match(/^[\t ]*/)?.[0].replace(/\t/g, "    ").length ?? 0;
    while (levels.length && levels.at(-1)!.indent >= indent) levels.pop();
    const id = makeId();
    const node = { id, parentId: levels.at(-1)?.id ?? null,
      kind: nodeKinds[Math.min(levels.length, nodeKinds.length - 1)], title: line.trim(),
      markdown: "", visible: true };
    levels.push({ id, indent });
    return node;
  });
}
