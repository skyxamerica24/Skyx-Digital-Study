import { NextRequest, NextResponse } from "next/server";
import { loadConversationAction } from "@/lib/actions/ai-history-actions";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const conversation = await loadConversationAction(id);
    return NextResponse.json({ conversation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load conversation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
