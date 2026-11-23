import { createHash } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { skyxBookProjectSchema } from "@/lib/book-engine/types";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/db/user";
import { prisma } from "@/lib/db";
import { pdfStorageEnabled, readPdfImport } from "@/lib/book-engine/pdf-imports";

export async function GET(req: NextRequest) {
  if (!pdfStorageEnabled()) return NextResponse.json({ enabled: false, items: [] });
  try {
    const user = await getCurrentUser(req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null);
    if (!user) return NextResponse.json({ error: "Sign in to open saved PDF imports." }, { status: 401 });
    const id = req.nextUrl.searchParams.get("id");
    if (id?.startsWith("edition-")) {
      const edition = await prisma.bookEdition.findFirst({ where: { ownerId: user.userId, id: id.slice(8) }, select: { snapshot: true } });
      if (!edition) return NextResponse.json({ error: "Book not found." }, { status: 404 });
      return NextResponse.json({ project: JSON.parse((await promisify(gunzip)(edition.snapshot)).toString("utf8")) });
    }
    if (id && req.nextUrl.searchParams.has("source")) {
      const book = await prisma.pdfImport.findFirst({ where: { id, ownerId: user.userId }, select: { sourcePath: true } });
      if (!book) return NextResponse.json({ error: "Book not found." }, { status: 404 });
      const bytes = await readFile(path.join(process.env.SKYX_VPS_STORAGE_DIR!, book.sourcePath));
      return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/octet-stream", "Cache-Control": "private, no-store" } });
    }
    if (id) {
      const project = await readPdfImport(user.userId, id);
      return project ? NextResponse.json({ project }) : NextResponse.json({ error: "Import not found." }, { status: 404 });
    }
    const items = await prisma.pdfImport.findMany({
      where: { ownerId: user.userId }, orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true },
    });
    const editions = await prisma.bookEdition.findMany({ where: { ownerId: user.userId }, orderBy: { createdAt: "desc" }, select: { id: true, title: true, createdAt: true } });
    return NextResponse.json({ enabled: true, items: [...editions.map(e => ({id:"edition-" + e.id, fileName:e.title, edited:true,createdAt:e.createdAt})), ...items] });
  } catch {
    return NextResponse.json({ error: "Saved PDF imports could not be loaded." }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  if (!pdfStorageEnabled()) return NextResponse.json({error:"Portable mode"}, {status:409});
  try {
    const user = await getCurrentUser(req.headers.get("authorization")?.replace(/^Bearer /i, "") ?? null);
    if (!user) return NextResponse.json({error:"Sign in to save books."}, {status:401});
    const parsed = skyxBookProjectSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({error:"Invalid book project."}, {status:400});
    const json = JSON.stringify(parsed.data);
    const digest = createHash("sha256").update(json).digest("hex");
    const edition = await prisma.bookEdition.upsert({
      where: {ownerId_digest:{ownerId:user.userId,digest}}, update:{},
      create:{ownerId:user.userId,digest,title:parsed.data.title,snapshot:new Uint8Array(await promisify(gzip)(json))},
      select:{id:true}
    });
    return NextResponse.json({id:"edition-"+edition.id});
  } catch {
    return NextResponse.json({error:"Could not save the edited book."},{status:503});
  }
}
