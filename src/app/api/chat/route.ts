import { NextResponse } from "next/server";
import { createAssistantReply } from "@/lib/ai/service";
import {
  DEFAULT_MODEL_ID,
  getMediaModelConfig,
  getModelConfig,
  getProviderBaseUrl,
  getPublicModels,
  resolveProviderModel,
} from "@/lib/ai/models";
import type { Attachment, ChatMessage, ChatRequest, ChatResponse } from "@/types/chat";

export const runtime = "nodejs";

function isValidRequest(body: Partial<ChatRequest>): body is ChatRequest {
  return Boolean(body.modelId && Array.isArray(body.messages) && body.messages.length > 0);
}

type LegacyStudioRequest = {
  prompt?: string;
  imageDataUrl?: string;
};

function normalizeDataUrl(dataUrl: unknown): string {
  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:image/")) return "";
  return dataUrl;
}

function readProviderError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return String((error as Record<string, unknown>).message);
  }
  if (typeof record.message === "string") return record.message;

  return fallback;
}

function extractImageUrl(data: unknown): string {
  const item = (data as { data?: Array<{ url?: string; b64_json?: string }> })?.data?.[0];
  return item?.url || (item?.b64_json ? `data:image/png;base64,${item.b64_json}` : "");
}

function dataUrlToBlob(dataUrl: string) {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("Image invalide.");

  const [, mimeType, base64] = match;
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const ext = mimeType.split("/")[1] || "png";

  return { blob: new Blob([bytes], { type: mimeType }), ext };
}

function inferStudioIntent(prompt: string, hasImage: boolean) {
  const text = prompt.toLowerCase();
  const asksImage = /(g[eé]n[ée]r|cr[ée]e|fabrique|produis).*(image|visuel|affiche|illustration|logo)|image de|visuel de/.test(text);
  const asksImprove = /(am[eé]liore|retouche|optimise|corrige|upscale|am[ée]lioration|am[ée]liorer).*(image|photo|visuel)|am[eé]liore-la|am[eé]liore cette/.test(text);

  if (hasImage && asksImprove) return "image_edit";
  if (!hasImage && asksImage) return "image_generate";
  if (hasImage) return "image_analysis";
  return "text_chat";
}

async function requestStudioImageGeneration(prompt: string) {
  const imageModel = getMediaModelConfig("gpt-image-2");
  const apiKey = process.env.ARTSANGO_AI_API_KEY;
  const providerModel = imageModel ? resolveProviderModel(imageModel) : "";

  if (!imageModel || !apiKey || !providerModel) {
    throw new Error("Configuration image IA manquante. Définis ARTSANGO_AI_API_KEY et ARTSANGO_AI_IMAGE_MODEL dans Vercel.");
  }

  const response = await fetch(`${getProviderBaseUrl()}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: providerModel,
      prompt,
      size: imageModel.defaults.size || "1024x1024",
      quality: imageModel.defaults.quality || "high",
      n: 1,
      output_format: "png",
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) throw new Error(readProviderError(data, `Image API HTTP ${response.status}`));

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) throw new Error("Image non retournée par le modèle IA.");

  return imageUrl;
}

async function requestStudioImageEdit(prompt: string, imageDataUrl: string) {
  const imageModel = getMediaModelConfig("gpt-image-2");
  const apiKey = process.env.ARTSANGO_AI_API_KEY;
  const providerModel = imageModel ? resolveProviderModel(imageModel) : "";

  if (!imageModel || !apiKey || !providerModel) {
    throw new Error("Configuration image IA manquante. Définis ARTSANGO_AI_API_KEY et ARTSANGO_AI_IMAGE_MODEL dans Vercel.");
  }

  const { blob, ext } = dataUrlToBlob(imageDataUrl);
  const form = new FormData();
  form.append("model", providerModel);
  form.append("prompt", prompt || "Améliore cette image artisanale, conserve son identité et augmente la qualité.");
  form.append("size", String(imageModel.defaults.size || "1024x1024"));
  form.append("quality", String(imageModel.defaults.quality || "high"));
  form.append("n", "1");
  form.append("output_format", "png");
  form.append("image", blob, `upload.${ext}`);

  const response = await fetch(`${getProviderBaseUrl()}/images/edits`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) throw new Error(readProviderError(data, `Image edit API HTTP ${response.status}`));

  const imageUrl = extractImageUrl(data);
  if (!imageUrl) throw new Error("Image améliorée non retournée par le modèle IA.");

  return imageUrl;
}

function isLegacyStudioRequest(body: Partial<ChatRequest> & LegacyStudioRequest) {
  return typeof body.prompt === "string" || typeof body.imageDataUrl === "string";
}

function createStudioMessage({ prompt = "", imageDataUrl = "" }: LegacyStudioRequest): ChatMessage {
  const attachments: Attachment[] = imageDataUrl
    ? [
        {
          id: crypto.randomUUID(),
          name: "image-importee.png",
          type: "image/png",
          size: imageDataUrl.length,
          kind: "image",
          dataUrl: imageDataUrl,
        },
      ]
    : [];

  return {
    id: crypto.randomUUID(),
    role: "user",
    content: prompt.trim(),
    attachments,
    createdAt: new Date().toISOString(),
    modelId: DEFAULT_MODEL_ID,
  };
}

async function createLegacyStudioResponse(body: LegacyStudioRequest) {
  const prompt = (body.prompt || "").trim();
  const imageDataUrl = normalizeDataUrl(body.imageDataUrl);

  if (!prompt && !imageDataUrl) {
    return NextResponse.json({ error: "Message ou image requis." }, { status: 400 });
  }

  if (prompt.toLowerCase() === "ping") {
    return NextResponse.json({ mode: "status", reply: "IA connectée." });
  }

  const mode = inferStudioIntent(prompt, Boolean(imageDataUrl));
  let replyPrompt = prompt;
  let imageUrl = "";

  if (mode === "image_generate") {
    imageUrl = await requestStudioImageGeneration(prompt);
    replyPrompt = `L'image a été générée pour cette demande: "${prompt}". Donne 1) un court texte de présentation produit, 2) une légende réseaux sociaux avec hashtags, 3) un CTA e-commerce.`;
  }

  if (mode === "image_edit") {
    imageUrl = await requestStudioImageEdit(prompt, imageDataUrl);
    replyPrompt = `L'image a été améliorée selon cette demande: "${prompt || "améliorer l'image"}". Propose un texte d'accompagnement vendeur + une version courte Instagram avec hashtags.`;
  }

  const { content } = await createAssistantReply({
    modelId: DEFAULT_MODEL_ID,
    messages: [createStudioMessage({ prompt: replyPrompt, imageDataUrl: mode === "image_analysis" ? imageDataUrl : "" })],
  });

  return NextResponse.json({
    mode,
    reply: content,
    imageUrl,
  });
}

export async function GET() {
  return NextResponse.json({ models: getPublicModels() });
}

export async function POST(request: Request) {
  let body: Partial<ChatRequest> & LegacyStudioRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide." }, { status: 400 });
  }

  if (isLegacyStudioRequest(body)) {
    try {
      return await createLegacyStudioResponse(body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur IA inconnue.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
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
