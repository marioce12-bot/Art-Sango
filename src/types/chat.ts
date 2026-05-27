export type ChatRole = "user" | "assistant" | "system";

export type AttachmentKind = "image" | "file" | "video";

export type Attachment = {
  id: string;
  name: string;
  type: string;
  size: number;
  kind: AttachmentKind;
  dataUrl?: string;
};

export type ChatMessage = {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: string;
  attachments?: Attachment[];
  modelId?: string;
  error?: boolean;
};

export type Conversation = {
  id: string;
  title: string;
  modelId: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type PublicModel = {
  id: string;
  label: string;
  description: string;
  badge: string;
  supports: Array<"text" | "image" | "file" | "video">;
};

export type ChatRequest = {
  conversationId?: string;
  modelId: string;
  messages: ChatMessage[];
  attachments?: Attachment[];
};

export type ChatResponse = {
  message: ChatMessage;
  model: PublicModel;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};
