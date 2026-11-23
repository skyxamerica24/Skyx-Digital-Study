import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { BookPageRecord, SkyxBookProject } from "./types";

export function pdfStorageEnabled() {
  return process.env.SKYX_STORAGE_MODE?.trim().toLowerCase() === "vps_local";
}

export async function readPdfImport(ownerId: string, id: string) {
  const record = await prisma.pdfImport.findFirst({
    where: { id, ownerId },
    include: { pages: { orderBy: { pageNumber: "asc" } } },
  });
  if (!record) return null;
  const metadata = record.metadata as unknown as Omit<SkyxBookProject, "pages">;
  return {
    ...metadata,
    pages: record.pages.map(({ details, rawText, cleanedText, pageNumber }) => ({
      ...(details as unknown as BookPageRecord), rawText, cleanedText, pageNumber,
    })),
  };
}

export async function savePdfImport(ownerId: string, project: SkyxBookProject, bytes: Buffer, forceOcr = false) {
  const base = process.env.SKYX_VPS_STORAGE_DIR?.trim();
  if (!base) throw new Error("Missing SKYX_VPS_STORAGE_DIR");
  const { sha256, fileName } = project.extraction;
  if (!/^[0-9a-f]{64}$/.test(sha256)) throw new Error("Invalid PDF digest");
  const sourcePath = path.join("originals", sha256.slice(0, 2), sha256 + ".pdf");
  const finalPath = path.resolve(base, sourcePath);
  await mkdir(path.dirname(finalPath), { recursive: true, mode: 0o750 });
  const tmp = finalPath + "." + randomUUID() + ".tmp";
  try {
    await writeFile(tmp, bytes, { mode: 0o640, flag: "wx" });
    await rename(tmp, finalPath);
  } finally {
    await rm(tmp, { force: true });
  }

  const { pages, ...metadata } = project;
  metadata.storageRef = { mode: "vps-local", relativePath: sourcePath };
  const id = await prisma.$transaction(async (tx) => {
    const inserted = await tx.pdfImport.createMany({
      data: { ownerId, sha256, fileName, sourcePath, metadata: JSON.parse(JSON.stringify(metadata)) },
      skipDuplicates: true,
    });
    const row = await tx.pdfImport.findUniqueOrThrow({
      where: { ownerId_sha256: { ownerId, sha256 } }, select: { id: true },
    });
    // Conditional update locks the import before replacing its page set.
    // Preserve the prior extraction if an OCR dependency failed this time.
    const canRefresh = !project.extraction.warnings.some(w => w.includes("OCR unavailable") || w.includes("OCR found no"));
    const updated = !inserted.count && canRefresh && await tx.pdfImport.updateMany({
      where: {
        id: row.id,
        ...(forceOcr || pages.some(p => p.layout?.source === "ocr") ? {} :
          { NOT: { metadata: { path: ["extraction", "engineUsed"], equals: project.extraction.engineUsed } } }),
      },
      data: { metadata: JSON.parse(JSON.stringify(metadata)) },
    });
    if (updated && updated.count) await tx.pdfImportPage.deleteMany({where: {importId: row.id}});
    if (inserted.count || (updated && updated.count)) {
      for (let start = 0; start < pages.length; start += 100) {
        await tx.pdfImportPage.createMany({
          data: pages.slice(start, start + 100).map(({ pageNumber, rawText, cleanedText, ...details }) => ({
            importId: row.id, pageNumber, rawText, cleanedText, details,
          })),
        });
      }
    }
    return row.id;
  }, { timeout: 60000 });
  return readPdfImport(ownerId, id);
}
