import { NextResponse } from "next/server";
import { parseValidatedJson, readerAdminSchema } from "@/lib/api-schemas";
import { verifyAdmin, AccessError } from "@/lib/reader-live/identity";
import { changeReaderSettings, listReaderSettings, ReaderConfigurationError } from "@/lib/reader-live/settings-server";
import { testReaderConnection } from "@/lib/reader-live/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failure(error: unknown) {
  const message = error instanceof AccessError || error instanceof ReaderConfigurationError
    ? error.message
    : "Reader settings are unavailable. Check the server configuration.";
  return NextResponse.json({ error: message }, { status: error instanceof AccessError ? error.status : 400 });
}
export async function GET(request: Request) {
  try {
    await verifyAdmin(request);
    return NextResponse.json(await listReaderSettings(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const audit = await verifyAdmin(request);
    const parsed = await parseValidatedJson(request, readerAdminSchema);
    if (parsed.errorResponse) return parsed.errorResponse;
    const change = parsed.data;
    await audit(change.action, "credentialId" in change ? change.credentialId : "book-reader");
    if (change.action === "test") await testReaderConnection(change.binding);
    else await changeReaderSettings(change);
    return NextResponse.json(await listReaderSettings());
  } catch (error) { return failure(error); }
}
