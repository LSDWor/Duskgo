"use client";

import { useEffect, useRef, useState } from "react";

type Hotel = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  rating?: number;
  thumbnail?: string;
};

type Parsed = {
  destination: string;
  countryCode: string;
  checkIn: string;
  checkOut: string;
  adults: number;
};

type UserMessage = { id: string; role: "user"; content: string };
type AssistantMessage = {
  id: string;
  role: "assistant";
  status: "streaming" | "done" | "error";
  reasoning?: string;
  toolCall?: { name: string; args: Parsed };
  toolResult?: { parsed: Parsed; hotels: Hotel[] };
  message?: string;
  error?: string;
};
type Message = UserMessage | AssistantMessage;

const SUGGESTIONS = [
  "3 nights in Paris for 2 people in early June",
  "Beach hotel in Bali for a week next month",
  "Cheap stay in Tokyo, April, solo traveler",
  "Family-friendly hotel in Rome, 5 days in July",
];

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

/* ----------------------------- icons ----------------------------- */

function ArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function Spinner(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="animate-spin" {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function Chevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
function Check(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ------------------------ assistant message ---------------------- */

function formatDateRange(a?: string, b?: string) {
  if (!a || !b) return "";
  try {
    const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    return `${fmt.format(new Date(a))} → ${fmt.format(new Date(b))}`;
  } catch {
    return `${a} → ${b}`;
  }
}

function ReasoningSection({ text, streaming }: { text: string; streaming: boolean }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (!streaming) setOpen(false);
  }, [streaming]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-left"
      >
        <span className="flex size-4 items-center justify-center">
          <span
            className={`size-1.5 rounded-full bg-muted-foreground ${
              streaming ? "animate-pulse" : ""
            }`}
          />
        </span>
        <span
          className={`text-xs font-medium ${
            streaming ? "animate-pulse text-muted-foreground" : "text-foreground"
          }`}
        >
          {streaming ? "Thinking…" : "Thoughts"}
        </span>
        <Chevron
          className={`text-muted-foreground transition-transform ${
            open ? "rotate-90" : ""
          }`}
        />
      </button>
      {open && (
        <div className="ml-[7px] mt-2 border-l pl-4">
          <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
            {text}
          </p>
        </div>
      )}
    </div>
  );
}

function ToolCallRow({
  args,
  resultCount,
  status,
}: {
  args: Parsed;
  resultCount?: number;
  status: "running" | "done" | "error";
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex size-4 items-center justify-center text-muted-foreground">
        <SearchIcon />
      </span>
      <span className="font-medium">search_hotels</span>
      <span className="truncate text-muted-foreground">
        {args.destination}, {args.countryCode} · {formatDateRange(args.checkIn, args.checkOut)}
      </span>
      <span className="ml-auto flex items-center gap-1.5">
        {status === "running" && (
          <>
            <Spinner />
            <span className="text-muted-foreground">Searching…</span>
          </>
        )}
        {status === "done" && (
          <>
            <Check className="text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              {resultCount ?? 0} results
            </span>
          </>
        )}
        {status === "error" && <span className="text-red-500">Failed</span>}
      </span>
    </div>
  );
}

function HotelCard({ h }: { h: Hotel }) {
  return (
    <article className="group overflow-hidden rounded-xl border bg-card transition hover:shadow-md">
      {h.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={h.thumbnail}
          alt={h.name}
          className="h-40 w-full object-cover transition group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-muted text-xs text-muted-foreground">
          No image
        </div>
      )}
      <div className="p-4">
        <h3 className="line-clamp-1 text-sm font-medium">{h.name}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
          {[h.address, h.city, h.country].filter(Boolean).join(", ") || "—"}
        </p>
        {typeof h.rating === "number" && (
          <p className="mt-2 text-xs font-medium">★ {h.rating.toFixed(1)}</p>
        )}
      </div>
    </article>
  );
}

function AssistantMessageView({ msg }: { msg: AssistantMessage }) {
  const streaming = msg.status === "streaming";
  const toolStatus: "running" | "done" | "error" = msg.error
    ? "error"
    : msg.toolResult
    ? "done"
    : "running";

  return (
    <div className="space-y-4">
      {msg.reasoning && (
        <ReasoningSection text={msg.reasoning} streaming={streaming && !msg.toolResult} />
      )}

      {msg.toolCall && (
        <ToolCallRow
          args={msg.toolCall.args}
          resultCount={msg.toolResult?.hotels.length}
          status={toolStatus}
        />
      )}

      {msg.toolResult && msg.toolResult.hotels.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {msg.toolResult.hotels.map((h) => (
            <HotelCard key={h.id} h={h} />
          ))}
        </div>
      )}

      {msg.message && (
        <p className="text-sm leading-relaxed text-foreground">{msg.message}</p>
      )}

      {msg.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-300">
          {msg.error}
        </div>
      )}

      {streaming && !msg.reasoning && !msg.toolCall && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner />
          <span className="animate-pulse">Thinking…</span>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- page ------------------------------- */

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function runChat(content: string) {
    if (!content.trim() || loading) return;

    const userMsg: UserMessage = { id: uid(), role: "user", content: content.trim() };
    const assistantMsg: AssistantMessage = {
      id: uid(),
      role: "assistant",
      status: "streaming",
    };
    const history: ChatApiMessage[] = [...messages, userMsg].map((m) =>
      m.role === "user"
        ? { role: "user", content: m.content }
        : {
            role: "assistant",
            content:
              (m as AssistantMessage).message ??
              (m as AssistantMessage).reasoning ??
              "",
          }
    );

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setQuery("");
    setLoading(true);

    const patch = (fn: (a: AssistantMessage) => AssistantMessage) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantMsg.id && m.role === "assistant" ? fn(m) : m))
      );
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          switch (evt.type) {
            case "status":
              break;
            case "reasoning":
              patch((a) => ({ ...a, reasoning: evt.text }));
              break;
            case "tool_call":
              patch((a) => ({
                ...a,
                toolCall: { name: evt.name, args: evt.args },
              }));
              break;
            case "tool_result":
              patch((a) => ({
                ...a,
                toolResult: { parsed: evt.parsed, hotels: evt.hotels },
              }));
              break;
            case "message":
              patch((a) => ({ ...a, message: evt.text }));
              break;
            case "done":
              patch((a) => ({ ...a, status: "done" }));
              break;
            case "error":
              patch((a) => ({ ...a, status: "error", error: evt.text }));
              break;
          }
        }
      }
    } catch (err: any) {
      patch((a) => ({ ...a, status: "error", error: err?.message || "Request failed" }));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runChat(query);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as any);
    }
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }

  const hasMessages = messages.length > 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-foreground" />
          <span className="text-sm font-semibold tracking-tight">Duskgo</span>
        </div>
        <div className="flex items-center gap-3">
          {hasMessages && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              New chat
            </button>
          )}
          <a
            href="https://github.com/LSDWor/Duskgo"
            className="text-xs text-muted-foreground transition hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </div>
      </header>

      {!hasMessages && (
        <section className="flex flex-1 flex-col items-center justify-center pb-24">
          <div className="mb-8 text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
              Where to next?
            </h1>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Describe your trip. Duskgo thinks it through and finds real hotels.
            </p>
          </div>

          <form onSubmit={onSubmit} className="w-full">
            <InputCard
              query={query}
              setQuery={setQuery}
              onKeyDown={onKeyDown}
              loading={loading}
              autosize={autosize}
            />
          </form>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => runChat(s)}
                disabled={loading}
                className="rounded-full border bg-card px-3.5 py-1.5 text-xs text-muted-foreground transition hover:text-foreground hover:shadow-sm disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          <footer className="mt-12 text-center text-xs text-muted-foreground">
            Hotels via LiteAPI · Reasoning via OpenRouter
          </footer>
        </section>
      )}

      {hasMessages && (
        <>
          <section className="flex-1 pb-40 pt-4">
            <div className="space-y-10">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <AssistantMessageView key={m.id} msg={m} />
                )
              )}
              <div ref={bottomRef} />
            </div>
          </section>

          <div className="sticky bottom-0 -mx-4 border-t border-border/60 bg-background/80 px-4 pb-4 pt-3 backdrop-blur">
            <form onSubmit={onSubmit}>
              <InputCard
                query={query}
                setQuery={setQuery}
                onKeyDown={onKeyDown}
                loading={loading}
                autosize={autosize}
              />
            </form>
          </div>
        </>
      )}
    </main>
  );
}

function InputCard({
  query,
  setQuery,
  onKeyDown,
  loading,
  autosize,
}: {
  query: string;
  setQuery: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  loading: boolean;
  autosize: (el: HTMLTextAreaElement) => void;
}) {
  return (
    <div className="group relative rounded-3xl border bg-card shadow-sm transition focus-within:border-foreground/40 focus-within:shadow-md">
      <textarea
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          autosize(e.currentTarget);
        }}
        onKeyDown={onKeyDown}
        placeholder="Ask for hotels anywhere…"
        rows={1}
        className="block w-full resize-none rounded-3xl bg-transparent px-5 py-4 pr-14 text-[15px] leading-6 placeholder:text-muted-foreground focus:outline-none"
      />
      <button
        type="submit"
        disabled={loading || !query.trim()}
        aria-label="Send"
        className="absolute bottom-2.5 right-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
      >
        {loading ? <Spinner /> : <ArrowUp />}
      </button>
    </div>
  );
}

type ChatApiMessage = { role: "user" | "assistant"; content: string };
