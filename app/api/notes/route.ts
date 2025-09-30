import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL } from "@/lib/openai";

export async function POST(req: NextRequest) {
  try {
    const { lastMessages } = await req.json();

    const system = `Summarize into three sections with bullets:
1) Summary,
2) Key Takeaways,
3) Action Items.`;

    const r = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(lastMessages || []) }
      ]
    });

    return NextResponse.json({ notes: r.choices?.[0]?.message?.content || "" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Notes error" }, { status: 400 });
  }
}
