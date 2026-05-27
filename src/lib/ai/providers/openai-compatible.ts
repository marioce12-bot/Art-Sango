import type { ModelConfig } from "@/lib/ai/models";
import { getProviderBaseUrl, resolveProviderModel } from "@/lib/ai/models";
import type { ProviderMessage } from "@/lib/ai/messages";

export type CompletionResult = {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

function readError(data: unknown, fallback: string): string {
  if (!data || typeof data !== "object") return fallback;
  const record = data as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "string") return error;
  if (error && typeof error === "object" && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, string>).message;
  }
  if (typeof record.message === "string") return record.message;

  return fallback;
}

function extractContent(data: unknown): string {
  const choices = (data as { choices?: Array<{ message?: { content?: unknown }; text?: unknown }> })?.choices;
  const first = choices?.[0];
  const content = first?.message?.content ?? first?.text;

  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String((part as { text?: unknown }).text ?? "");
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

export async function createOpenAICompatibleCompletion({
  messages,
  modelConfig,
}: {
  messages: ProviderMessage[];
  modelConfig: ModelConfig;
}): Promise<CompletionResult> {
  const apiKey = process.env.ARTSANGO_AI_API_KEY;
  const baseUrl = getProviderBaseUrl();
  const providerModel = resolveProviderModel(modelConfig);

  if (!apiKey || !providerModel) {
    throw new Error("Configuration IA manquante. Définis ARTSANGO_AI_API_KEY dans .env.local ou Vercel.");
  }

  const response = await fetch(`${baseUrl}${modelConfig.endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: providerModel,
      messages,
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.maxTokens,
      ...(modelConfig.reasoningEffort ? { reasoning_effort: modelConfig.reasoningEffort } : {}),
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(readError(data, `Erreur provider IA HTTP ${response.status}`));
  }

  const content = extractContent(data);
  if (!content) throw new Error("Le provider IA a retourné une réponse vide.");

  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } })?.usage;

  return {
    content,
    usage: usage
      ? {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        }
      : undefined,
  };
}