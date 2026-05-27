import { NextResponse } from "next/server";
import { createAssistantReply } from "@/lib/ai/service";
import { getModelConfig, getPublicModels } from "@/lib/ai/models";
import type { ChatRequest, ChatResponse } from "@/types/chat";

export const runtime = "nodejs";

function isValidRequest(body: Partial<ChatRequest>): body is ChatRequest {
  return Boolean(body.modelId && Array.isArray(body.messages) && body.messages.length > 0);
}

export async function GET() {
  return NextResponse.json({ models: getPublicModels() });
}

export async function POST(request: Request) {
  let body: Partial<ChatRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (!isValidRequest(body)) {
    return NextResponse.json({ error: "modelId et messages sont requis." }, { status: 400 });
  }

  const latest = body.messages[body.messages.length - 1];
  if (latest.role !== "user" || (!latest.content.trim() && !latest.attachments?.length)) {
    return NextResponse.json({ error: "Le dernier message utilisateur est vide." }, { status: 400 });
  }

  try {
    const { content, usage, modelConfig } = await createAssistantReply({
      modelId: body.modelId,
      messages: body.messages,
    });

    const response: ChatResponse = {
      model: getModelConfig(modelConfig.id),
      usage,
      message: {
        id: crypto.randomUUID(),
        role: "assistant",
        content,
        createdAt: new Date().toISOString(),
        modelId: modelConfig.id,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur IA inconnue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
