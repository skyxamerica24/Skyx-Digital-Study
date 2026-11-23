import type { ReaderFontKey } from "@/lib/types";

export interface ReaderFontOption {
  key: ReaderFontKey;
  label: string;
  subtitle: string;
  category: "Serif" | "Sans";
  sample: string;
  cssFontFamily: string;
  headingFontFamily: string;
}

export const READER_FONT_OPTIONS: ReaderFontOption[] = [
  {
    key: "editorial",
    label: "Editorial Serif",
    subtitle: "Lora · Noto Serif Bengali",
    category: "Serif",
    sample: "Aa অ",
    cssFontFamily: "var(--font-lora), var(--font-noto-serif-bn), Georgia, serif",
    headingFontFamily: "var(--font-lora), var(--font-noto-serif-bn), Georgia, serif",
  },
  {
    key: "modern",
    label: "Modern Sans",
    subtitle: "Manrope · Noto Sans Bengali",
    category: "Sans",
    sample: "Aa অ",
    cssFontFamily: "var(--font-manrope), var(--font-noto-sans-bn), ui-sans-serif, sans-serif",
    headingFontFamily: "var(--font-manrope), var(--font-noto-sans-bn), ui-sans-serif, sans-serif",
  },
  {
    key: "textbook",
    label: "Print Textbook",
    subtitle: "Source Serif · Tiro Bangla",
    category: "Serif",
    sample: "Aa অ",
    cssFontFamily: "var(--font-source-serif), var(--font-tiro-bn), Georgia, serif",
    headingFontFamily: "var(--font-source-serif), var(--font-tiro-bn), Georgia, serif",
  },
  {
    key: "geometric",
    label: "Clean Geometric",
    subtitle: "Plus Jakarta · Anek Bangla",
    category: "Sans",
    sample: "Aa অ",
    cssFontFamily: "var(--font-jakarta), var(--font-anek-bn), ui-sans-serif, sans-serif",
    headingFontFamily: "var(--font-jakarta), var(--font-anek-bn), ui-sans-serif, sans-serif",
  },
  {
    key: "classic",
    label: "Minimal Studio",
    subtitle: "DM Sans · Noto Sans Bengali",
    category: "Sans",
    sample: "Aa অ",
    cssFontFamily: "var(--font-dm-sans), var(--font-noto-sans-bn), ui-sans-serif, sans-serif",
    headingFontFamily: "var(--font-dm-sans), var(--font-noto-sans-bn), ui-sans-serif, sans-serif",
  },
  {
    key: "journal",
    label: "Classic Journal",
    subtitle: "Merriweather · Noto Serif Bengali",
    category: "Serif",
    sample: "Aa অ",
    cssFontFamily: "var(--font-merriweather), var(--font-noto-serif-bn), Georgia, serif",
    headingFontFamily: "var(--font-merriweather), var(--font-noto-serif-bn), Georgia, serif",
  },
];

export function resolveReaderFont(fontKey?: string): ReaderFontOption {
  if (fontKey === "serif") return READER_FONT_OPTIONS[0];
  if (fontKey === "sans") return READER_FONT_OPTIONS[1];
  return READER_FONT_OPTIONS.find((f) => f.key === fontKey) || READER_FONT_OPTIONS[0];
}
