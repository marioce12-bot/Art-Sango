import type { PublicModel } from "@/types/chat";

export type ModelProvider = "build-with-afri";
export type ModelCapability = "chat" | "image" | "audio" | "video" | "asr";

export const AFRI_BASE_URL = "https://build.lewisnote.com/v1";

export type ModelConfig = PublicModel & {
  capability: "chat";
  provider: ModelProvider;
  providerModel: string;
  envModelKey: string;
  endpoint: "/chat/completions";
  temperature: number;
  maxTokens: number;
  reasoningEffort?: "none" | "low" | "medium" | "high" | "xhigh";
};

export type MediaModelConfig = {
  id: string;
  label: string;
  description: string;
  capability: Exclude<ModelCapability, "chat">;
  provider: ModelProvider;
  providerModel?: string;
  envModelKey?: string;
  endpoint: string;
  badge: string;
  defaults: Record<string, string | number | boolean>;
};

export const AI_MODELS: ModelConfig[] = [
  {
    id: "gpt-5.5",
    label: "GPT-5.5",
    description: "Modèle haut de gamme pour production, documents longs, vision et raisonnement supérieur.",
    badge: "Premium",
    capability: "chat",
    provider: "build-with-afri",
    providerModel: "gpt-5.5",
    envModelKey: "ARTSANGO_AI_GPT55_MODEL",
    endpoint: "/chat/completions",
    temperature: 0.62,
    maxTokens: 1400,
    reasoningEffort: "medium",
    supports: ["text", "image", "file"],
  },
  {
    id: "claude-opus-4.7",
    label: "Claude Opus 4.7",
    description: "Modèle puissant pour analyse profonde, stratégie, architecture et raisonnement long.",
    badge: "200k",
    capability: "chat",
    provider: "build-with-afri",
    providerModel: "claude-opus-4.7",
    envModelKey: "ARTSANGO_AI_CLAUDE_OPUS_MODEL",
    endpoint: "/chat/completions",
    temperature: 0.58,
    maxTokens: 1600,
    reasoningEffort: "high",
    supports: ["text", "image", "file"],
  },
];

export const AI_MEDIA_MODELS: MediaModelConfig[] = [
  {
    id: "gpt-image-2",
    label: "GPT Image 2",
    description: "Génération et édition d'images produit, visuels marketing et storyboards.",
    capability: "image",
    provider: "build-with-afri",
    providerModel: "gpt-image-2",
    envModelKey: "ARTSANGO_AI_IMAGE_MODEL",
    endpoint: "/images",
    badge: "Image",
    defaults: {
      size: "1536x1024",
      quality: "medium",
    },
  },
  {
    id: "gpt-audio-1.5",
    label: "GPT Audio 1.5",
    description: "Synthèse vocale haute qualité pour narration, e-learning et assistants vocaux.",
    capability: "audio",
    provider: "build-with-afri",
    providerModel: "gpt-audio-1.5",
    envModelKey: "ARTSANGO_AI_TTS_MODEL",
    endpoint: "/audio/speech",
    badge: "TTS",
    defaults: {
      voice: "alloy",
      format: "mp3",
    },
  },
  {
    id: "sora-2",
    label: "Sora 2",
    description: "Génération vidéo asynchrone à partir de texte ou image.",
    capability: "video",
    provider: "build-with-afri",
    providerModel: "sora-2",
    envModelKey: "ARTSANGO_AI_VIDEO_MODEL",
    endpoint: "/videos/generations",
    badge: "Video",
    defaults: {
      seconds: 8,
      size: "vertical",
    },
  },
  {
    id: "afri-asr",
    label: "AFRI ASR",
    description: "Transcription multilingue avec support étendu pour langues africaines et internationales.",
    capability: "asr",
    provider: "build-with-afri",
    endpoint: "/audio/afri-asr/transcribe",
    badge: "ASR",
    defaults: {
      language: "fr",
    },
  },
];

export const DEFAULT_MODEL_ID = AI_MODELS[0].id;

export function getPublicModels(): PublicModel[] {
  return AI_MODELS.map(({ id, label, description, badge, supports }) => ({
    id,
    label,
    description,
    badge,
    supports,
  }));
}

export function getModelConfig(modelId?: string): ModelConfig {
  return AI_MODELS.find((model) => model.id === modelId) ?? AI_MODELS[0];
}

export function getMediaModelConfig(modelId: string): MediaModelConfig | undefined {
  return AI_MEDIA_MODELS.find((model) => model.id === modelId);
}

export function getProviderBaseUrl(): string {
  return (process.env.ARTSANGO_AI_BASE_URL || AFRI_BASE_URL).replace(/\/$/, "");
}

export function resolveProviderModel(config: ModelConfig | MediaModelConfig): string {
  const configured = config.envModelKey ? process.env[config.envModelKey] : "";
  return configured || config.providerModel || "";
}