import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Check the catalog and marketplace schema as well as the database connection.
    await prisma.bookListing.findFirst({ select: { bookId: true } });
    return NextResponse.json({ status: "ready", database: "available" });
  } catch {
    return NextResponse.json({ status: "unavailable", database: "unavailable" }, { status: 503 });
  }
}
