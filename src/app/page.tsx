import { getPublicModels } from "@/lib/ai/models";
import { ChatApp } from "@/components/chat/chat-app";

export default function Home() {
  return <ChatApp models={getPublicModels()} />;
}
