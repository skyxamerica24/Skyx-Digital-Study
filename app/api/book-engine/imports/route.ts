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
    if (id) {
      const project = await readPdfImport(user.userId, id);
      return project ? NextResponse.json({ project }) : NextResponse.json({ error: "Import not found." }, { status: 404 });
    }
    const items = await prisma.pdfImport.findMany({
      where: { ownerId: user.userId }, orderBy: { createdAt: "desc" },
      select: { id: true, fileName: true },
    });
    return NextResponse.json({ enabled: true, items });
  } catch {
    return NextResponse.json({ error: "Saved PDF imports could not be loaded." }, { status: 503 });
  }
}
