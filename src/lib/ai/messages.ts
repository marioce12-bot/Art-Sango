import type { Attachment, ChatMessage } from "@/types/chat";

export type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<Record<string, unknown>>;
};

function fileSummary(attachments: Attachment[] = []): string {
  if (!attachments.length) return "";

  const lines = attachments.map((file) => {
    const mb = file.size / 1024 / 1024;
    return `- ${file.name} (${file.kind}, ${file.type || "type inconnu"}, ${mb.toFixed(2)} Mo)`;
  });

  return `\n\nPièces jointes préparées pour analyse multimodale:\n${lines.join("\n")}`;
}

function toUserContent(message: ChatMessage): ProviderMessage["content"] {
  const imageAttachments = message.attachments?.filter((file) => file.kind === "image" && file.dataUrl) ?? [];
  const nonImageAttachments = message.attachments?.filter((file) => file.kind !== "image") ?? [];
  const text = `${message.content || "Analyse les pièces jointes et aide-moi à avancer."}${fileSummary(nonImageAttachments)}`;

  if (!imageAttachments.length) return text;

  return [
    { type: "text", text },
    ...imageAttachments.map((file) => ({
      type: "image_url",
      image_url: { url: file.dataUrl },
    })),
  ];
}

export function toProviderMessages(messages: ChatMessage[], systemPrompt: string): ProviderMessage[] {
  const recentMessages = messages.slice(-12);

  return [
    { role: "system", content: systemPrompt },
    ...recentMessages.map((message) => ({
      role: message.role,
      content: message.role === "user" ? toUserContent(message) : message.content,
    })),
  ];
}
