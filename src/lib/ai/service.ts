import { ARTSANGO_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { getModelConfig } from "@/lib/ai/models";
import { toProviderMessages } from "@/lib/ai/messages";
import { createOpenAICompatibleCompletion } from "@/lib/ai/providers/openai-compatible";
import type { ChatMessage } from "@/types/chat";

function createMockReply(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((message) => message.role === "user");
  const ask = last?.content || "votre demande";

  return [
    "Mode démonstration actif. La structure ArtSango AI fonctionne, mais le provider réel n'est pas encore configuré.",
    "",
    `Pour votre demande: ${ask}`,
    "",
    "Proposition rapide:",
    "1. Clarifie le produit, la matière, la technique et l'origine.",
    "2. Transforme ces détails en bénéfices clients: authenticité, durabilité, cadeau, décoration, statut.",
    "3. Termine avec un appel à l'action simple: commander, demander une personnalisation, écrire sur WhatsApp.",
  ].join("\n");
}

export async function createAssistantReply({
  modelId,
  messages,
}: {
  modelId: string;
  messages: ChatMessage[];
}) {
  const modelConfig = getModelConfig(modelId);

  if (process.env.ARTSANGO_AI_USE_MOCK === "true") {
    return { content: createMockReply(messages), modelConfig };
  }

  const providerMessages = toProviderMessages(messages, ARTSANGO_SYSTEM_PROMPT);
  const result = await createOpenAICompatibleCompletion({ messages: providerMessages, modelConfig });

  return { content: result.content, usage: result.usage, modelConfig };
}
