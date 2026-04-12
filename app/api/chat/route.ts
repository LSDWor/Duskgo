import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

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

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const LITEAPI_URL = "https://api.liteapi.travel/v3.0/data/hotels";

const FALLBACK_MODELS = [
  process.env.OPENROUTER_MODEL,
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-120b:free",
  "google/gemma-4-31b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
].filter(Boolean) as string[];

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callOpenRouter(apiKey: string, model: string, messages: ChatMessage[]) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://duskgo.app",
      "X-Title": "Duskgo",
    },
    body: JSON.stringify({ model, messages, temperature: 0.2 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status} (${model}): ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json?.choices?.[0]?.message?.content ?? "") as string;
}

async function callWithFallback(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
  const errors: string[] = [];
  for (const model of FALLBACK_MODELS) {
    try {
      const content = await callOpenRouter(apiKey, model, messages);
      if (content) return content;
    } catch (e: any) {
      errors.push(e?.message || String(e));
    }
  }
  throw new Error(`All OpenRouter models failed: ${errors.join(" | ")}`);
}

function extractJson(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Model did not return JSON");
  return JSON.parse(m[0]);
}

async function searchHotels(args: Parsed): Promise<Hotel[]> {
  const apiKey = process.env.LITEAPI_KEY;
  if (!apiKey) throw new Error("LITEAPI_KEY not set");

  const url = new URL(LITEAPI_URL);
  url.searchParams.set("countryCode", args.countryCode);
  url.searchParams.set("cityName", args.destination);
  url.searchParams.set("limit", "20");

  const res = await fetch(url.toString(), {
    headers: { "X-API-Key": apiKey, accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LiteAPI ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const raw: any[] = json?.data || [];

  return raw.slice(0, 20).map((h) => ({
    id: String(h.id ?? h.hotelId ?? crypto.randomUUID()),
    name: String(h.name ?? "Unknown hotel"),
    address: h.address ?? undefined,
    city: h.city ?? undefined,
    country: h.country ?? undefined,
    rating: typeof h.rating === "number" ? h.rating : undefined,
    thumbnail: h.thumbnail ?? h.main_photo ?? h.image ?? undefined,
  }));
}

const TOOLS = {
  search_hotels: searchHotels,
} as const;

const SYSTEM_PROMPT = `You are Duskgo, an AI travel concierge. The user describes a trip in natural language. You plan which tool to call and return ONLY a JSON object (no prose, no markdown, no code fences) with this exact shape:

{
  "reasoning": "<2-5 sentences explaining how you understood the request: destination, dates, travelers, any constraints. First-person, conversational.>",
  "tool_call": {
    "name": "search_hotels",
    "arguments": {
      "destination": "<primary city name>",
      "countryCode": "<ISO 3166-1 alpha-2>",
      "checkIn": "YYYY-MM-DD",
      "checkOut": "YYYY-MM-DD",
      "adults": <integer, default 2>
    }
  }
}

Available tools:
- search_hotels(destination, countryCode, checkIn, checkOut, adults): Returns hotels in a city.

Rules:
- Today is ${todayISO(0)}. If dates are vague ("next month", "in June"), pick sensible concrete dates in the future.
- If only duration is given, assume check-in 30 days from today.
- Always include a tool_call. If the user is ambiguous, make your best guess and explain it in "reasoning".
- Output ONLY the JSON object. No explanations outside the JSON.`;

function formatDateRange(a: string, b: string) {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    });
    return `${fmt.format(new Date(a))} → ${fmt.format(new Date(b))}`;
  } catch {
    return `${a} → ${b}`;
  }
}

export async function POST(req: Request) {
  let body: { messages?: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages[] required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

      try {
        emit({ type: "status", text: "Thinking…" });
        await sleep(120);

        const llmMessages: ChatMessage[] = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.filter((m) => m.role === "user" || m.role === "assistant"),
        ];

        const raw = await callWithFallback(llmMessages);
        const envelope = extractJson(raw);

        const reasoning: string =
          typeof envelope.reasoning === "string" ? envelope.reasoning : "";
        if (reasoning) emit({ type: "reasoning", text: reasoning });

        const toolCall = envelope.tool_call;
        if (!toolCall || typeof toolCall !== "object") {
          throw new Error("Model did not propose a tool_call");
        }
        const name: string = String(toolCall.name || "");
        const args = toolCall.arguments || toolCall.args || {};
        if (!(name in TOOLS)) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const parsed: Parsed = {
          destination: String(args.destination || "").trim(),
          countryCode: String(args.countryCode || "").toUpperCase().trim(),
          checkIn: String(args.checkIn || todayISO(30)),
          checkOut: String(args.checkOut || todayISO(33)),
          adults: Number.isFinite(args.adults) ? Number(args.adults) : 2,
        };
        if (!parsed.destination || !parsed.countryCode) {
          throw new Error("Model returned incomplete tool arguments");
        }

        emit({ type: "tool_call", name, args: parsed });

        const hotels = await (TOOLS as any)[name](parsed);
        emit({ type: "tool_result", name, parsed, hotels });

        const when = formatDateRange(parsed.checkIn, parsed.checkOut);
        const summary =
          hotels.length === 0
            ? `I couldn't find hotels in ${parsed.destination} for ${when}. Try a different city or dates.`
            : `Found ${hotels.length} hotels in ${parsed.destination} for ${when}, ${parsed.adults} ${parsed.adults === 1 ? "adult" : "adults"}.`;
        emit({ type: "message", text: summary });

        emit({ type: "done" });
      } catch (err: any) {
        emit({ type: "error", text: err?.message || "Internal error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
