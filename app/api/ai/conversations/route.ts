import { NextRequest, NextResponse } from "next/server";
import {
  createConversationAction,
  deleteConversationAction,
  listConversationsAction,
  saveMessagePairAction,
  updateConversationTitleAction,
} from "@/lib/actions/ai-history-actions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get("channelId");
    if (!channelId) {
      return NextResponse.json({ error: "channelId is required." }, { status: 400 });
    }
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const conversations = await listConversationsAction(channelId, limit);
    return NextResponse.json({ conversations });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list conversations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    switch (action) {
      case "create": {
        const conversation = await createConversationAction(data);
        return NextResponse.json({ conversation });
      }

      case "savePair": {
        const result = await saveMessagePairAction(data);
        return NextResponse.json({ ...result });
      }

      case "delete": {
        const result = await deleteConversationAction(data.conversationId);
        return NextResponse.json(result);
      }

      case "updateTitle": {
        const updated = await updateConversationTitleAction(data.conversationId, data.title);
        return NextResponse.json({ conversation: updated });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process request.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
