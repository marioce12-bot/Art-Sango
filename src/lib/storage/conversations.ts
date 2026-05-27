import type { Attachment, Conversation } from "@/types/chat";
import { DEFAULT_MODEL_ID } from "@/lib/ai/models";

const STORAGE_KEY = "artsango_ai_conversations";
const ACTIVE_KEY = "artsango_ai_active_conversation";

export function createConversation(modelId = DEFAULT_MODEL_ID): Conversation {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    title: "Nouvelle discussion",
    modelId,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createTitleFromText(text: string, attachments: Attachment[] = []): string {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean) return clean.length > 48 ? `${clean.slice(0, 48)}...` : clean;
  if (attachments.length) return `Analyse de ${attachments[0].name}`;
  return "Discussion artisanale";
}

export function loadConversations(): Conversation[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function loadActiveConversationId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_KEY);
}

export function saveActiveConversationId(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_KEY, id);
}
