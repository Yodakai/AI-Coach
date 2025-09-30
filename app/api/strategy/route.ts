import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { goal, bankroll, horizonWeeks } = await req.json();

    const system = `Build a personalized betting plan with 5 sections:
1) Risk & unit sizing (Kelly-lite default),
2) Market focus (which markets to target/avoid and why),
3) Routine checklist (pre-bet),
4) Bankroll rails (stop loss, heat checks),
5) Improvement loop (post-mortems, CLV tracking).
Return concise, bullet-first output.`;

    const reply = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Goal:${goal || ""} | Bankroll:${bankroll || ""} | HorizonWeeks:${horizonWeeks || ""}` }
      ]
    });

    return NextResponse.json({ plan: reply.choices?.[0]?.message?.content || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Strategy error" }, { status: 400 });
  }
}
