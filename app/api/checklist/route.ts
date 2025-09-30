import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { sportOrMarket } = await req.json();

    const system = `Return a sharp, compact pre-bet checklist (3–7 bullets) for the given sport/market. Write for speed.`;
    const r = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: sportOrMarket || "NFL Totals" }
      ]
    });

    return NextResponse.json({ checklist: r.choices?.[0]?.message?.content || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Checklist error" }, { status: 400 });
  }
}

