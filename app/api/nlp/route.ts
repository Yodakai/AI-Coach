import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { detectSport } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // ✅ Pull API key at runtime, not at import
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("❌ Missing OPENAI_API_KEY in environment");
      return NextResponse.json(
        { error: "Server misconfiguration: missing API key" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const system = `Extract a clean JSON bet from free text.
Schema: { "event": string, "market": string, "odds": string, "units": number, "sportTag": string }.
Strict JSON only. Infer sportTag if obvious.`;

    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini", // ✅ fallback model
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    });

    let parsed: any = {};
    try {
      parsed = JSON.parse(r.choices?.[0]?.message?.content || "{}");
    } catch {
      console.warn("⚠️ Failed to parse OpenAI response:", r.choices?.[0]);
    }

    if (!parsed?.sportTag && parsed?.event) {
      parsed.sportTag = detectSport(parsed.event);
    }
    if (parsed?.units && typeof parsed.units !== "number") {
      parsed.units = Number(parsed.units) || 0;
    }

    return NextResponse.json({ parsed });
  } catch (e: any) {
    console.error("NLP error:", e);
    return NextResponse.json(
      { error: e?.message || "NLP error" },
      { status: 500 }
    );
  }
}
