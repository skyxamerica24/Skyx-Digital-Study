import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  skyxBookProjectSchema,
  type SkyxBookProject,
} from "@/lib/book-engine/types";

export interface StoredBookSummary {
  id: string;
  fileName: string;
  title: string;
  author: string;
  subject: string;
  chaptersCount: number;
  pagesCount: number;
  sizeBytes: number;
  updatedAt: string;
}

export interface StorageStatusInfo {
  mode: "portable" | "vps-local";
  ready: boolean;
  requiresToken: boolean;
  baseDirConfigured: boolean;
  message: string;
}

export interface BookStorageAdapter {
  getStatus(): Promise<StorageStatusInfo>;
  listProjects(): Promise<StoredBookSummary[]>;
  readProject(projectId: string): Promise<SkyxBookProject | null>;
  saveProject(project: SkyxBookProject): Promise<StoredBookSummary>;
  deleteProject(projectId: string): Promise<boolean>;
}

const SAFE_PROJECT_ID_RE = /^[a-zA-Z0-9_-]{3,80}$/;
const MAX_STORED_FILE_BYTES = 30 * 1024 * 1024; // 30 MB per project JSON

export function isValidProjectId(id: string): boolean {
  return SAFE_PROJECT_ID_RE.test(id);
}

/**
 * Constant-time token verification for VPS Local Disk Storage operations.
 */
export function verifyStorageAccessToken(providedToken: string | null): boolean {
  const configuredToken = (process.env.SKYX_VPS_STORAGE_TOKEN || "").trim();
  if (!configuredToken) {
    // Require an explicit server token before allowing VPS filesystem mutations
    return false;
  }
  if (!providedToken) return false;
  const a = Buffer.from(providedToken.trim(), "utf8");
  const b = Buffer.from(configuredToken, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

class PortableStorageAdapter implements BookStorageAdapter {
  async getStatus(): Promise<StorageStatusInfo> {
    return {
      mode: "portable",
      ready: true,
      requiresToken: false,
      baseDirConfigured: false,
      message:
        "Running in Portable Export Mode (no server disk writes). Export .skyxbook.json / .skyxbook.zip locally, or enable SKYX_STORAGE_MODE=vps_local on your own VPS.",
    };
  }

  async listProjects(): Promise<StoredBookSummary[]> {
    return [];
  }

  async readProject(): Promise<SkyxBookProject | null> {
    throw new Error("VPS Local Disk Storage is disabled in Portable Mode.");
  }

  async saveProject(): Promise<StoredBookSummary> {
    throw new Error("VPS Local Disk Storage is disabled in Portable Mode.");
  }

  async deleteProject(): Promise<boolean> {
    throw new Error("VPS Local Disk Storage is disabled in Portable Mode.");
  }
}

class VpsLocalDiskStorageAdapter implements BookStorageAdapter {
  private readonly baseDir: string;

  constructor(rawDir: string) {
    this.baseDir = path.resolve(rawDir);
  }

  private resolveSafeProjectPath(projectId: string): string {
    if (!isValidProjectId(projectId)) {
      throw new Error("Invalid project ID format.");
    }
    const targetFile = path.resolve(this.baseDir, `${projectId}.skyxbook.json`);
    const prefix = this.baseDir.endsWith(path.sep)
      ? this.baseDir
      : `${this.baseDir}${path.sep}`;
    if (!targetFile.startsWith(prefix)) {
      throw new Error("Resolved path escapes storage directory.");
    }
    return targetFile;
  }

  private async ensureBaseDir(): Promise<void> {
    await fs.mkdir(this.baseDir, { recursive: true, mode: 0o750 });
  }

  async getStatus(): Promise<StorageStatusInfo> {
    const tokenConfigured = Boolean(
      (process.env.SKYX_VPS_STORAGE_TOKEN || "").trim()
    );
    try {
      await this.ensureBaseDir();
      return {
        mode: "vps-local",
        ready: tokenConfigured,
        requiresToken: true,
        baseDirConfigured: true,
        message: tokenConfigured
          ? "VPS Local Disk Storage is active and ready (No Docker required)."
          : "VPS Local Disk directory is ready, but SKYX_VPS_STORAGE_TOKEN must be set on the server to authorize writes.",
      };
    } catch {
      return {
        mode: "vps-local",
        ready: false,
        requiresToken: true,
        baseDirConfigured: true,
        message: "Unable to access configured VPS storage directory.",
      };
    }
  }

  async listProjects(): Promise<StoredBookSummary[]> {
    await this.ensureBaseDir();
    const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
    const summaries: StoredBookSummary[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".skyxbook.json")) continue;
      const id = entry.name.replace(/\.skyxbook\.json$/, "");
      if (!isValidProjectId(id)) continue;

      try {
        const filePath = this.resolveSafeProjectPath(id);
        const stat = await fs.stat(filePath);
        if (stat.size > MAX_STORED_FILE_BYTES) continue;
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(raw) as Partial<SkyxBookProject>;
        summaries.push({
          id,
          fileName: entry.name,
          title: typeof parsed.title === "string" ? parsed.title : id,
          author:
            typeof parsed.author === "string" ? parsed.author : "Unknown Author",
          subject:
            typeof parsed.subject === "string" ? parsed.subject : "General",
          chaptersCount: Array.isArray(parsed.chapters)
            ? parsed.chapters.length
            : 0,
          pagesCount: Array.isArray(parsed.pages) ? parsed.pages.length : 0,
          sizeBytes: stat.size,
          updatedAt:
            typeof parsed.updatedAt === "string"
              ? parsed.updatedAt
              : stat.mtime.toISOString(),
        });
      } catch {
        // Skip unreadable or corrupted project files cleanly
      }
    }

    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async readProject(projectId: string): Promise<SkyxBookProject | null> {
    const filePath = this.resolveSafeProjectPath(projectId);
    try {
      const stat = await fs.stat(filePath);
      if (stat.size > MAX_STORED_FILE_BYTES) {
        throw new Error("Stored project exceeds maximum allowed size.");
      }
      const raw = await fs.readFile(filePath, "utf8");
      const parsed = skyxBookProjectSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        throw new Error("Stored project failed schema validation.");
      }
      return parsed.data;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ENOENT"
      ) {
        return null;
      }
      throw err;
    }
  }

  async saveProject(project: SkyxBookProject): Promise<StoredBookSummary> {
    await this.ensureBaseDir();
    const safeId = project.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 72);
    if (!isValidProjectId(safeId)) {
      throw new Error("Project ID must be 3–80 alphanumeric, dash, or underscore characters.");
    }

    const toStore: SkyxBookProject = {
      ...project,
      id: safeId,
      updatedAt: new Date().toISOString(),
      storageRef: {
        mode: "vps-local",
        relativePath: `${safeId}.skyxbook.json`,
      },
    };

    const json = JSON.stringify(toStore, null, 2);
    const bytes = Buffer.byteLength(json, "utf8");
    if (bytes > MAX_STORED_FILE_BYTES) {
      throw new Error("Project exceeds the 30 MB storage limit.");
    }

    const targetPath = this.resolveSafeProjectPath(safeId);
    const tmpPath = path.resolve(
      this.baseDir,
      `.${safeId}.${crypto.randomBytes(6).toString("hex")}.tmp`
    );
    const prefix = this.baseDir.endsWith(path.sep)
      ? this.baseDir
      : `${this.baseDir}${path.sep}`;
    if (!tmpPath.startsWith(prefix)) {
      throw new Error("Temp path escapes storage directory.");
    }

    await fs.writeFile(tmpPath, json, { encoding: "utf8", mode: 0o640 });
    await fs.rename(tmpPath, targetPath);

    return {
      id: safeId,
      fileName: `${safeId}.skyxbook.json`,
      title: toStore.title,
      author: toStore.author,
      subject: toStore.subject,
      chaptersCount: toStore.chapters.length,
      pagesCount: toStore.pages.length,
      sizeBytes: bytes,
      updatedAt: toStore.updatedAt,
    };
  }

  async deleteProject(projectId: string): Promise<boolean> {
    const filePath = this.resolveSafeProjectPath(projectId);
    try {
      await fs.unlink(filePath);
      return true;
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "ENOENT"
      ) {
        return false;
      }
      throw err;
    }
  }
}

export function getBookStorageAdapter(): BookStorageAdapter {
  const mode = (process.env.SKYX_STORAGE_MODE || "portable").trim().toLowerCase();
  const rawDir = (process.env.SKYX_VPS_STORAGE_DIR || "").trim();

  if (mode === "vps_local" && rawDir.length > 0) {
    return new VpsLocalDiskStorageAdapter(rawDir);
  }
  return new PortableStorageAdapter();
}
