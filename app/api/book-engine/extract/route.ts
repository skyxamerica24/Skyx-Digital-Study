import { NextRequest, NextResponse } from "next/server";
import {
  extractDocumentBuffer,
  getExtension,
  isSupportedExtension,
} from "@/lib/book-engine/extractors";

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

    const arrayBuffer = await entry.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const project = await extractDocumentBuffer(buffer, safeFileName);

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
