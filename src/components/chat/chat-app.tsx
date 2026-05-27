"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";

import type { Attachment, ChatMessage, ChatResponse, Conversation, PublicModel } from "@/types/chat";
import {
  createConversation,
  createTitleFromText,
  loadActiveConversationId,
  loadConversations,
  saveActiveConversationId,
  saveConversations,
} from "@/lib/storage/conversations";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_FILES = 3;

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type IconName =
  | "arrow-up"
  | "bot"
  | "copy"
  | "file"
  | "image"
  | "menu"
  | "message"
  | "more"
  | "paperclip"
  | "pen"
  | "plus"
  | "sparkles"
  | "trash"
  | "video"
  | "x";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    "arrow-up": <path d="M12 19V5m0 0-6 6m6-6 6 6" />,
    bot: <path d="M12 8V4m-7 8a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-4Zm4 1h.01M15 13h.01M9 17h6" />,
    copy: <path d="M8 8h10v10H8zM6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />,
    file: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 0v6h6M8 13h8M8 17h5" />,
    image: <path d="M4 5h16v14H4zM8 13l2.5-3 3.5 4 2-2.5 4 5.5M8 8h.01" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />,
    more: <path d="M5 12h.01M12 12h.01M19 12h.01" />,
    paperclip: <path d="m21 8.5-9.8 9.8a5 5 0 0 1-7.1-7.1l10-10a3.5 3.5 0 0 1 5 5l-10 10a2 2 0 1 1-2.8-2.8l9.4-9.4" />,
    pen: <path d="m16 3 5 5L8 21H3v-5zM14 5l5 5" />,
    plus: <path d="M12 5v14M5 12h14" />,
    sparkles: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
    trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />,
    video: <path d="M4 6h12v12H4zM16 10l5-3v10l-5-3" />,
    x: <path d="M18 6 6 18M6 6l12 12" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
const QUICK_PROMPTS = [
  "Crée une description produit premium pour un sac artisanal en raphia.",
  "Aide-moi à fixer un prix juste pour une sculpture faite main.",
  "Transforme ce texte en post Instagram vendeur.",
  "Propose un positionnement de marque pour mon atelier.",
];

type ChatAppProps = {
  models: PublicModel[];
};

export function ChatApp({ models }: ChatAppProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [composerError, setComposerError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const saved = loadConversations();
    const active = loadActiveConversationId();
    const initial = saved.length ? saved : [createConversation(models[0]?.id)];
    const nextActive = active && initial.some((conversation) => conversation.id === active) ? active : initial[0].id;

    setConversations(initial);
    setActiveId(nextActive);
  }, [models]);

  useEffect(() => {
    if (!conversations.length) return;
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (!activeId) return;
    saveActiveConversationId(activeId);
  }, [activeId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) ?? conversations[0],
    [activeId, conversations],
  );

  const selectedModel = models.find((model) => model.id === activeConversation?.modelId) ?? models[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages.length, isSending]);

  function updateConversation(id: string, updater: (conversation: Conversation) => Conversation) {
    setConversations((current) => current.map((conversation) => (conversation.id === id ? updater(conversation) : conversation)));
  }

  function handleNewConversation(modelId = selectedModel?.id ?? models[0]?.id) {
    const conversation = createConversation(modelId);
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    setAttachments([]);
    setSidebarOpen(false);
  }

  function handleDeleteConversation(id: string) {
    setConversations((current) => {
      const next = current.filter((conversation) => conversation.id !== id);
      if (!next.length) {
        const replacement = createConversation(models[0]?.id);
        setActiveId(replacement.id);
        return [replacement];
      }
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  function handleModelChange(modelId: string) {
    if (!activeConversation) return;
    updateConversation(activeConversation.id, (conversation) => ({ ...conversation, modelId, updatedAt: new Date().toISOString() }));
  }

  async function readFile(file: File): Promise<Attachment> {
    const kind = file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error(`Impossible de lire ${file.name}`));
      reader.readAsDataURL(file);
    });

    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: file.type,
      size: file.size,
      kind,
      dataUrl,
    };
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setComposerError("");

    const incoming = Array.from(files).slice(0, MAX_FILES - attachments.length);
    const tooLarge = incoming.find((file) => file.size > MAX_FILE_SIZE);
    if (tooLarge) {
      setComposerError(`Le fichier ${tooLarge.name} dépasse 3 Mo pour ce MVP.`);
      return;
    }

    if (attachments.length + incoming.length > MAX_FILES) {
      setComposerError(`Maximum ${MAX_FILES} pièces jointes par message.`);
      return;
    }

    try {
      const prepared = await Promise.all(incoming.map(readFile));
      setAttachments((current) => [...current, ...prepared]);
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : "Lecture du fichier impossible.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSend(overrideText?: string) {
    if (!activeConversation || isSending) return;

    const content = (overrideText ?? input).trim();
    if (!content && !attachments.length) return;

    setComposerError("");
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      attachments,
      createdAt: now,
      modelId: activeConversation.modelId,
    };

    const nextMessages = [...activeConversation.messages, userMessage];
    const shouldRetitle = activeConversation.messages.length === 0;

    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: shouldRetitle ? createTitleFromText(content, attachments) : conversation.title,
      messages: nextMessages,
      updatedAt: now,
    }));

    setInput("");
    setAttachments([]);
    setIsSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          modelId: activeConversation.modelId,
          messages: nextMessages,
        }),
      });

      const data = (await response.json()) as Partial<ChatResponse> & { error?: string };
      if (!response.ok || !data.message) throw new Error(data.error || "Réponse IA invalide.");

      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, data.message as ChatMessage],
        updatedAt: new Date().toISOString(),
      }));
    } catch (error) {
      const assistantError: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error instanceof Error ? error.message : "Erreur pendant l'appel IA.",
        createdAt: new Date().toISOString(),
        error: true,
      };

      updateConversation(activeConversation.id, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, assistantError],
        updatedAt: new Date().toISOString(),
      }));
    } finally {
      setIsSending(false);
    }
  }

  if (!activeConversation || !selectedModel) {
    return null;
  }

  return (
    <main className="min-h-screen p-3 text-ink sm:p-5">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-kola/10 bg-[#fff8eb]/55 shadow-soft backdrop-blur-3xl sm:h-[calc(100vh-2.5rem)]">
        <Sidebar
          activeId={activeConversation.id}
          conversations={conversations}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onDelete={handleDeleteConversation}
          onNew={() => handleNewConversation()}
          onSelect={(id) => {
            setActiveId(id);
            setSidebarOpen(false);
          }}
        />

        <section className="relative flex min-w-0 flex-1 flex-col">
          <Header
            model={selectedModel}
            models={models}
            onMenu={() => setSidebarOpen(true)}
            onModelChange={handleModelChange}
            onNew={() => handleNewConversation()}
          />

          <div className="scrollbar-soft flex-1 overflow-y-auto px-4 pb-36 pt-5 sm:px-8 lg:px-12">
            {activeConversation.messages.length === 0 ? (
              <Welcome onPrompt={(prompt) => handleSend(prompt)} />
            ) : (
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {activeConversation.messages.map((message) => (
                  <MessageBubble key={message.id} message={message} modelLabel={selectedModel.label} />
                ))}
                {isSending ? <TypingIndicator /> : null}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          <Composer
            attachments={attachments}
            error={composerError}
            fileInputRef={fileInputRef}
            input={input}
            isSending={isSending}
            onAttachClick={() => fileInputRef.current?.click()}
            onFiles={handleFiles}
            onInput={setInput}
            onRemoveAttachment={(id) => setAttachments((current) => current.filter((file) => file.id !== id))}
            onSend={() => handleSend()}
          />
        </section>
      </div>
    </main>
  );
}

function Sidebar({
  activeId,
  conversations,
  isOpen,
  onClose,
  onDelete,
  onNew,
  onSelect,
}: {
  activeId: string;
  conversations: Conversation[];
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-30 bg-ink/25 backdrop-blur-sm transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          "glass-panel fixed inset-y-3 left-3 z-40 flex w-[min(86vw,21rem)] flex-col rounded-[1.6rem] p-3 transition-transform duration-300 lg:static lg:z-auto lg:w-80 lg:translate-x-0 lg:rounded-none lg:border-0 lg:border-r lg:border-kola/10 lg:bg-kola/[0.04] lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-[110%]",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-2 py-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-clay">ArtSango</p>
            <h1 className="font-display text-2xl font-semibold text-ink">AI Studio</h1>
          </div>
          <button className="rounded-full p-2 text-kola/70 hover:bg-kola/10 lg:hidden" onClick={onClose} aria-label="Fermer">
            <Icon name="x" size={18} />
          </button>
        </div>

        <button
          className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-sand shadow-glow transition hover:-translate-y-0.5 hover:bg-kola"
          onClick={onNew}
        >
          <Icon name="plus" size={18} />
          Nouvelle discussion
        </button>

        <div className="mt-5 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-kola/55">
          <Icon name="message" size={14} />
          Conversations
        </div>

        <div className="scrollbar-soft mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
          {conversations.map((conversation) => (
            <div key={conversation.id} className="group relative">
              <button
                className={cn(
                  "w-full rounded-2xl px-3 py-3 text-left transition",
                  conversation.id === activeId ? "bg-white/80 shadow-sm" : "hover:bg-white/45",
                )}
                onClick={() => onSelect(conversation.id)}
              >
                <p className="truncate text-sm font-semibold text-ink">{conversation.title}</p>
                <p className="mt-1 text-xs text-kola/55">{new Date(conversation.updatedAt).toLocaleDateString("fr-FR")}</p>
              </button>
              <button
                className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full p-2 text-kola/45 hover:bg-clay/10 hover:text-clay group-hover:block"
                onClick={() => onDelete(conversation.id)}
                aria-label="Supprimer la conversation"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}

function Header({
  model,
  models,
  onMenu,
  onModelChange,
  onNew,
}: {
  model: PublicModel;
  models: PublicModel[];
  onMenu: () => void;
  onModelChange: (modelId: string) => void;
  onNew: () => void;
}) {
  return (
    <header className="z-20 flex items-center justify-between gap-3 border-b border-kola/10 bg-[#fff8eb]/72 px-4 py-3 backdrop-blur-2xl sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="rounded-full p-2 text-kola hover:bg-kola/10 lg:hidden" onClick={onMenu} aria-label="Ouvrir le menu">
          <Icon name="menu" size={20} />
        </button>
        <div className="hidden h-11 w-11 place-items-center rounded-2xl bg-ink text-sand shadow-glow sm:grid">
          <Icon name="sparkles" size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink">Assistant IA pour artisans africains</p>
          <p className="truncate text-xs text-kola/60">Descriptions, prix, posts sociaux, branding et conseils business</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="model-select">
          Modèle IA
        </label>
        <select
          id="model-select"
          className="max-w-[11rem] rounded-2xl border border-kola/10 bg-white/70 px-3 py-2 text-xs font-semibold text-ink outline-none transition hover:bg-white focus:border-clay sm:max-w-xs sm:text-sm"
          value={model.id}
          onChange={(event) => onModelChange(event.target.value)}
        >
          {models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button className="hidden rounded-2xl border border-kola/10 bg-white/60 px-3 py-2 text-sm font-semibold text-kola transition hover:bg-white sm:block" onClick={onNew}>
          Nouveau
        </button>
      </div>
    </header>
  );
}

function Welcome({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center py-10 animate-rise">
      <div className="max-w-3xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brass/30 bg-brass/15 px-4 py-2 text-sm font-semibold text-kola">
          <Icon name="bot" size={16} />
          MVP conversationnel prêt pour provider multi-modèles
        </div>
        <h2 className="font-display text-4xl font-semibold leading-tight text-ink sm:text-6xl">
          Un copilote IA pour vendre l'artisanat avec plus de clarté.
        </h2>
        <p className="mt-5 max-w-2xl text-base leading-7 text-kola/75 sm:text-lg">
          Discute naturellement avec ArtSango AI. Ajoute une photo, un fichier ou une idée brute, puis demande une description produit, un prix, un post social ou un conseil de marque.
        </p>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            className="group rounded-3xl border border-kola/10 bg-white/58 p-5 text-left shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white hover:shadow-soft"
            onClick={() => onPrompt(prompt)}
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-palm/10 text-palm transition group-hover:bg-palm group-hover:text-sand">
              <Icon name="pen" size={18} />
            </div>
            <p className="text-sm font-semibold leading-6 text-ink">{prompt}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message, modelLabel }: { message: ChatMessage; modelLabel: string }) {
  const isUser = message.role === "user";

  async function copyContent() {
    await navigator.clipboard.writeText(message.content);
  }

  return (
    <article className={cn("flex animate-rise gap-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser ? (
        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ink text-sand shadow-glow">
          <Icon name="sparkles" size={17} />
        </div>
      ) : null}

      <div className={cn("max-w-[88%] rounded-[1.6rem] px-5 py-4 sm:max-w-[78%]", isUser ? "bg-ink text-sand" : message.error ? "border border-clay/25 bg-clay/10 text-ink" : "bg-white/78 text-ink shadow-sm")}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className={cn("text-[0.68rem] font-bold uppercase tracking-[0.18em]", isUser ? "text-sand/60" : "text-kola/45")}>{isUser ? "Vous" : modelLabel}</p>
          {!isUser ? (
            <button className="rounded-full p-1.5 text-kola/45 hover:bg-kola/10 hover:text-kola" onClick={copyContent} aria-label="Copier">
              <Icon name="copy" size={14} />
            </button>
          ) : null}
        </div>

        {message.attachments?.length ? <AttachmentPreviewList attachments={message.attachments} compact /> : null}

        <div className="whitespace-pre-wrap text-sm leading-7 sm:text-[0.95rem]">{message.content}</div>
      </div>
    </article>
  );
}

function Composer({
  attachments,
  error,
  fileInputRef,
  input,
  isSending,
  onAttachClick,
  onFiles,
  onInput,
  onRemoveAttachment,
  onSend,
}: {
  attachments: Attachment[];
  error: string;
  fileInputRef: RefObject<HTMLInputElement | null>;
  input: string;
  isSending: boolean;
  onAttachClick: () => void;
  onFiles: (files: FileList | null) => void;
  onInput: (value: string) => void;
  onRemoveAttachment: (id: string) => void;
  onSend: () => void;
}) {
  const canSend = Boolean(input.trim() || attachments.length) && !isSending;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-[#f5efe4] via-[#f5efe4]/92 to-transparent px-3 pb-3 pt-12 sm:px-6 sm:pb-6">
      <div className="pointer-events-auto mx-auto max-w-3xl">
        {attachments.length ? <AttachmentPreviewList attachments={attachments} onRemove={onRemoveAttachment} /> : null}
        {error ? <p className="mb-2 rounded-2xl border border-clay/20 bg-clay/10 px-4 py-2 text-xs font-semibold text-clay">{error}</p> : null}

        <div className="glass-panel rounded-[1.6rem] p-2">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv"
              onChange={(event) => onFiles(event.target.files)}
            />
            <button
              className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-kola transition hover:bg-kola/10"
              onClick={onAttachClick}
              aria-label="Ajouter une image, un fichier ou une vidéo"
            >
              <Icon name="paperclip" size={20} />
            </button>
            <textarea
              className="scrollbar-soft max-h-40 min-h-11 flex-1 resize-none bg-transparent px-1 py-3 text-sm leading-6 text-ink outline-none placeholder:text-kola/45 sm:text-base"
              placeholder="Message ArtSango AI..."
              rows={1}
              value={input}
              onChange={(event) => onInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <button
              className={cn(
                "mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition",
                canSend ? "bg-ink text-sand shadow-glow hover:-translate-y-0.5 hover:bg-kola" : "bg-kola/10 text-kola/35",
              )}
              disabled={!canSend}
              onClick={onSend}
              aria-label="Envoyer"
            >
              {isSending ? <Icon name="more" size={20} /> : <Icon name="arrow-up" size={20} />}
            </button>
          </div>
        </div>
        <p className="mt-2 text-center text-[0.7rem] text-kola/50">Les fichiers sont préparés pour le multimodal. La clé API reste uniquement côté serveur.</p>
      </div>
    </div>
  );
}

function AttachmentPreviewList({
  attachments,
  compact = false,
  onRemove,
}: {
  attachments: Attachment[];
  compact?: boolean;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className={cn("mb-2 flex flex-wrap gap-2", compact && "mb-3")}>
      {attachments.map((file) => (
        <div key={file.id} className={cn("flex items-center gap-2 rounded-2xl border border-kola/10 bg-white/75 p-2 text-ink shadow-sm", compact ? "max-w-full" : "max-w-[15rem]")}> 
          {file.kind === "image" && file.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={file.dataUrl} alt="" className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-palm/10 text-palm">
              {file.kind === "video" ? <Icon name="video" size={18} /> : file.kind === "image" ? <Icon name="image" size={18} /> : <Icon name="file" size={18} />}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{file.name}</p>
            <p className="text-[0.68rem] text-kola/55">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
          </div>
          {onRemove ? (
            <button className="rounded-full p-1 text-kola/45 hover:bg-kola/10 hover:text-clay" onClick={() => onRemove(file.id)} aria-label="Retirer">
              <Icon name="x" size={14} />
            </button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ink text-sand shadow-glow">
        <Icon name="sparkles" size={17} />
      </div>
      <div className="flex items-center gap-2 rounded-[1.4rem] bg-white/78 px-5 py-4 shadow-sm">
        <span className="h-2 w-2 animate-pulse rounded-full bg-kola/45" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-kola/45 [animation-delay:160ms]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-kola/45 [animation-delay:320ms]" />
      </div>
    </div>
  );
}








