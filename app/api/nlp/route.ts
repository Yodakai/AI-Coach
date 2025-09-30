import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL } from "@/lib/openai";
import { detectSport } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const system = `Extract a clean JSON bet from free text.
Schema: { "event": string, "market": string, "odds": string, "units": number, "sportTag": string }.
Strict JSON only. Infer sportTag if obvious.`;

    const r = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text }
      ]
    });

    let parsed: any = {};
    try { parsed = JSON.parse(r.choices?.[0]?.message?.content || "{}"); } catch {}

    if (!parsed?.sportTag && parsed?.event) parsed.sportTag = detectSport(parsed.event);
    if (parsed?.units && typeof parsed.units !== "number") parsed.units = Number(parsed.units) || 0;

    return NextResponse.json({ parsed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "NLP error" }, { status: 400 });
  }
}
