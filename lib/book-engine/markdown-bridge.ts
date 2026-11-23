import { marked } from "marked";
import TurndownService from "turndown";

export interface BookBlockTemplate {
  id: string;
  label: string;
  bnLabel: string;
  description: string;
  category: "callout" | "structure" | "assessment";
  html: string;
  markdown: string;
}

export const BOOK_BLOCK_TEMPLATES: BookBlockTemplate[] = [
  {
    id: "definition",
    label: "Definition Box",
    bnLabel: "সংজ্ঞা বক্স",
    description: "Highlight a core textbook term or definition",
    category: "callout",
    html: `<blockquote><p><strong>সংজ্ঞা (Definition):</strong> এখানে মূল সংজ্ঞা বা পরিভাষা লিখুন।</p></blockquote><p></p>`,
    markdown: `\n> **সংজ্ঞা (Definition):** এখানে মূল সংজ্ঞা বা পরিভাষা লিখুন।\n\n`,
  },
  {
    id: "key-note",
    label: "Exam Key Note",
    bnLabel: "গুরুত্বপূর্ণ নোট",
    description: "High-yield exam tip or memory point",
    category: "callout",
    html: `<blockquote><p><strong>গুরুত্বপূর্ণ নোট (Key Point):</strong> বোর্ড ও ভর্তি পরীক্ষার জন্য মনে রাখার মূল তথ্য এখানে লিখুন।</p></blockquote><p></p>`,
    markdown: `\n> **গুরুত্বপূর্ণ নোট (Key Point):** বোর্ড ও ভর্তি পরীক্ষার জন্য মনে রাখার মূল তথ্য এখানে লিখুন।\n\n`,
  },
  {
    id: "formula",
    label: "Formula / Law Block",
    bnLabel: "সূত্র / সমীকরণ",
    description: "Clean monospace block for formulas or rules",
    category: "structure",
    html: `<pre><code>Formula / সূত্র:\nF = m × a\nএকক (Unit): Newton (N)</code></pre><p></p>`,
    markdown: `\n\`\`\`\nFormula / সূত্র:\nF = m × a\nএকক (Unit): Newton (N)\n\`\`\`\n\n`,
  },
  {
    id: "comparison-table",
    label: "Comparison Table",
    bnLabel: "তুলনামূলক টেবিল",
    description: "3-column structured comparison table",
    category: "structure",
    html: `<table><thead><tr><th>বিষয় (Topic)</th><th>পার্থক্য ১ (Type A)</th><th>পার্থক্য ২ (Type B)</th></tr></thead><tbody><tr><td>গঠন (Structure)</td><td>বৈশিষ্ট্য লিখুন</td><td>বৈশিষ্ট্য লিখুন</td></tr><tr><td>কাজ (Function)</td><td>কাজ লিখুন</td><td>কাজ লিখুন</td></tr></tbody></table><p></p>`,
    markdown: `\n| বিষয় (Topic) | পার্থক্য ১ (Type A) | পার্থক্য ২ (Type B) |\n| --- | --- | --- |\n| গঠন (Structure) | বৈশিষ্ট্য লিখুন | বৈশিষ্ট্য লিখুন |\n| কাজ (Function) | কাজ লিখুন | কাজ লিখুন |\n\n`,
  },
  {
    id: "mcq-block",
    label: "Practice MCQ Block",
    bnLabel: "অনুশীলন প্রশ্ন",
    description: "Structured MCQ stem ready for future Paper Builder",
    category: "assessment",
    html: `<blockquote><p><strong>প্রশ্ন (MCQ):</strong> প্রশ্নটি এখানে লিখুন?</p><ol><li>ক) অপশন ১</li><li>খ) অপশন ২</li><li>গ) অপশন ৩</li><li>ঘ) অপশন ৪</li></ol><p><strong>সঠিক উত্তর:</strong> ক · <em>ব্যাখ্যা: সংক্ষিপ্ত ব্যাখ্যা এখানে লিখুন।</em></p></blockquote><p></p>`,
    markdown: `\n> **প্রশ্ন (MCQ):** প্রশ্নটি এখানে লিখুন?\n> 1. ক) অপশন ১\n> 2. খ) অপশন ২\n> 3. গ) অপশন ৩\n> 4. ঘ) অপশন ৪\n>\n> **সঠিক উত্তর:** ক · *ব্যাখ্যা: সংক্ষিপ্ত ব্যাখ্যা এখানে লিখুন।*\n\n`,
  },
  {
    id: "section-divider",
    label: "Section Divider",
    bnLabel: "সেকশন ব্রেক",
    description: "Insert a horizontal section break & subheading",
    category: "structure",
    html: `<hr /><h2>নতুন উপ-অধ্যায় (New Section)</h2><p>এখানে লেখা শুরু করুন...</p>`,
    markdown: `\n---\n\n## নতুন উপ-অধ্যায় (New Section)\n\nএখানে লেখা শুরু করুন...\n`,
  },
];

/**
 * Strips any potentially unsafe tags or event attributes before handing HTML to ProseMirror.
 */
export function sanitizeBookHtml(rawHtml: string): string {
  return rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

/**
 * Converts Book Markdown into clean, safe HTML for Tiptap Visual Editor.
 */
export function markdownToSafeHtml(markdown: string): string {
  const input = (markdown || "").trim();
  if (!input) return "<p></p>";
  // Restore ==highlight== spans cleanly while leaving fenced code blocks untouched
  const withHighlights = input
    .split(/(```[\s\S]*?```|`[^`\n]+`)/g)
    .map((segment, idx) =>
      idx % 2 === 1
        ? segment
        : segment.replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
    )
    .join("");
  const parsed = marked.parse(withHighlights, {
    gfm: true,
    breaks: false,
    async: false,
  });
  const htmlStr = typeof parsed === "string" ? parsed : "";
  return sanitizeBookHtml(htmlStr) || "<p></p>";
}

let cachedTurndown: TurndownService | null = null;

function getTurndownInstance(): TurndownService {
  if (cachedTurndown) return cachedTurndown;

  const td = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    hr: "---",
  });

  td.remove(["script", "style", "iframe", "noscript"]);

  // Preserve Highlight marks cleanly as ==highlighted== or bold fallback
  td.addRule("markHighlight", {
    filter: "mark",
    replacement(content) {
      return content ? `==${content}==` : "";
    },
  });

  // Preserve GFM Markdown tables cleanly when exporting from Tiptap
  td.addRule("gfmTable", {
    filter: "table",
    replacement(_content, node) {
      const table = node as HTMLTableElement;
      const rows = Array.from(table.querySelectorAll("tr"));
      if (rows.length === 0) return "";

      const matrix = rows.map((tr) =>
        Array.from(tr.querySelectorAll("th, td")).map((cell) =>
          (cell.textContent || "")
            .replace(/\|/g, "\\|")
            .replace(/\s+/g, " ")
            .trim()
        )
      );

      const colCount = Math.max(...matrix.map((r) => r.length), 1);
      const normalized = matrix.map((r) => {
        const padded = [...r];
        while (padded.length < colCount) padded.push("");
        return padded;
      });

      const header = `| ${normalized[0].join(" | ")} |`;
      const divider = `| ${normalized[0].map(() => "---").join(" | ")} |`;
      const body = normalized.slice(1).map((r) => `| ${r.join(" | ")} |`);

      return `\n\n${[header, divider, ...body].join("\n")}\n\n`;
    },
  });

  cachedTurndown = td;
  return td;
}

/**
 * Converts Tiptap Visual HTML back to crisp, portable GFM Markdown.
 */
export function htmlToCleanMarkdown(html: string): string {
  const safe = sanitizeBookHtml(html || "");
  if (!safe.trim() || safe.trim() === "<p></p>") return "";
  const td = getTurndownInstance();
  return td
    .turndown(safe)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
