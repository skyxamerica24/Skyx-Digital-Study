import { NextRequest, NextResponse } from "next/server";
import {
  extractDocumentBuffer,
  getExtension,
  isSupportedExtension,
} from "@/lib/book-engine/extractors";

import { getCurrentUser } from "@/lib/db/user";
import { pdfStorageEnabled, savePdfImport } from "@/lib/book-engine/pdf-imports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data with a 'file' field." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const entry = formData.get("file");

    if (!entry || !(entry instanceof File)) {
      return NextResponse.json(
        {
          error:
            "No file provided. Please select a PDF, EPUB, DOCX, CSV, MD, TXT, or .skyxbook.json file.",
        },
        { status: 400 }
      );
    }

    if (entry.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 }
      );
    }

    if (entry.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `File exceeds the maximum allowed size of ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
        },
        { status: 413 }
      );
    }

    const safeFileName = entry.name.replace(/[/\\]/g, "_").slice(0, 240);
    const ext = getExtension(safeFileName);
    if (!isSupportedExtension(ext)) {
      return NextResponse.json(
        {
          error: `Unsupported format ".${ext || "unknown"}". Allowed: PDF, EPUB, DOCX, CSV, MD, TXT, .skyxbook.json.`,
        },
        { status: 400 }
      );
    }

    let ownerId: string | undefined;
    if (pdfStorageEnabled()) {
      const token = req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null;
      const user = await getCurrentUser(token);
      if (!user) return NextResponse.json({ error: "Sign in before importing a PDF." }, { status: 401 });
      ownerId = user.userId;
    }
    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const project = await extractDocumentBuffer(buffer, safeFileName, formData.get("ocr") === "force");

    if (ownerId) {
      try {
        const saved = await savePdfImport(ownerId, project, buffer, formData.get("ocr") === "force", safeFileName);
        if (!saved) throw new Error("Import missing");
        const warnings = Array.from(new Set([...saved.extraction.warnings, ...project.extraction.warnings]));
        return NextResponse.json({ project: { ...saved, extraction: { ...saved.extraction, warnings } }, archived: true, warnings });
      } catch (error) {
        console.error("PDF archive write failed", error);
        return NextResponse.json({ error: "Could not save the book and extracted pages. Retry the upload." }, { status: 503 });
      }
    }
    return NextResponse.json({
      project,
      warnings: project.extraction.warnings,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to extract document content on the server.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
