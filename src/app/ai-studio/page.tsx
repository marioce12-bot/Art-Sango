import { ChatApp } from "@/components/chat/chat-app";
import { getPublicModels } from "@/lib/ai/models";

export default function AiStudioPage() {
  return <ChatApp models={getPublicModels()} />;
}
