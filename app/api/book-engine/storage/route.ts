import { NextRequest, NextResponse } from "next/server";
import {
  getBookStorageAdapter,
  isValidProjectId,
  verifyStorageAccessToken,
} from "@/lib/book-engine/storage-adapter";
import { skyxBookProjectSchema } from "@/lib/book-engine/types";

export const runtime = "nodejs";

function extractStorageToken(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return req.headers.get("x-skyx-storage-token");
}

/**
 * GET /api/book-engine/storage
 * - Default: returns runtime storage status (safe, no secrets or full server paths exposed)
 * - ?list=1 (vps-local + valid token): lists saved .skyxbook.json projects on VPS disk
 * - ?id=<projectId> (vps-local + valid token): loads a saved project from VPS disk
 */
export async function GET(req: NextRequest) {
  try {
    const adapter = getBookStorageAdapter();
    const status = await adapter.getStatus();

    const idParam = req.nextUrl.searchParams.get("id");
    const listParam = req.nextUrl.searchParams.get("list");

    if (!idParam && !listParam) {
      return NextResponse.json({ status });
    }

    if (status.mode !== "vps-local") {
      return NextResponse.json(
        { error: "VPS Local Disk Storage is not enabled on this server.", status },
        { status: 403 }
      );
    }

    if (!verifyStorageAccessToken(extractStorageToken(req))) {
      return NextResponse.json(
        { error: "Unauthorized: valid VPS storage access token required." },
        { status: 401 }
      );
    }

    if (idParam) {
      if (!isValidProjectId(idParam)) {
        return NextResponse.json(
          { error: "Invalid project ID format." },
          { status: 400 }
        );
      }
      const project = await adapter.readProject(idParam);
      if (!project) {
        return NextResponse.json(
          { error: "Project not found on VPS storage." },
          { status: 404 }
        );
      }
      return NextResponse.json({ project });
    }

    const items = await adapter.listProjects();
    return NextResponse.json({ status, items });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Storage operation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/book-engine/storage
 * Saves a validated SkyxBookProject JSON atomically to VPS local disk (when SKYX_STORAGE_MODE=vps_local).
 */
export async function POST(req: NextRequest) {
  try {
    const adapter = getBookStorageAdapter();
    const status = await adapter.getStatus();

    if (status.mode !== "vps-local") {
      return NextResponse.json(
        {
          error:
            "VPS Local Disk Storage is disabled in Portable Mode. Use Save .skyxbook to download locally.",
        },
        { status: 403 }
      );
    }

    if (!verifyStorageAccessToken(extractStorageToken(req))) {
      return NextResponse.json(
        { error: "Unauthorized: valid VPS storage access token required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = skyxBookProjectSchema.safeParse(body?.project ?? body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Invalid book project payload.",
          details: parsed.error.issues.slice(0, 5),
        },
        { status: 400 }
      );
    }

    const summary = await adapter.saveProject(parsed.data);
    return NextResponse.json({ saved: summary });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to save project to VPS disk.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/book-engine/storage?id=<projectId>
 * Removes a stored .skyxbook.json file from VPS local disk.
 */
export async function DELETE(req: NextRequest) {
  try {
    const adapter = getBookStorageAdapter();
    const status = await adapter.getStatus();

    if (status.mode !== "vps-local") {
      return NextResponse.json(
        { error: "VPS Local Disk Storage is disabled in Portable Mode." },
        { status: 403 }
      );
    }

    if (!verifyStorageAccessToken(extractStorageToken(req))) {
      return NextResponse.json(
        { error: "Unauthorized: valid VPS storage access token required." },
        { status: 401 }
      );
    }

    const idParam = req.nextUrl.searchParams.get("id") || "";
    if (!isValidProjectId(idParam)) {
      return NextResponse.json(
        { error: "Invalid project ID format." },
        { status: 400 }
      );
    }

    const deleted = await adapter.deleteProject(idParam);
    return NextResponse.json({ deleted, id: idParam });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to delete project.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
