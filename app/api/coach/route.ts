import { NextRequest, NextResponse } from "next/server";
import { openai, OPENAI_MODEL } from "@/lib/openai";
import { z } from "zod";

/**
 * Upgraded coach:
 * - Personas + risk modes
 * - Always returns a friendly answer PLUS a JSON receipts block if possible
 * - Optionally returns a structured suggested bet {event, market, odds, units, sportTag}
 * - "Receipts" = EPA/play notes, injuries, OL/DL, weather, pace (summarized by model)
 * NOTE: This template does not scrape live data; it instructs the model to cite the categories ("receipts").
 * If you add your own data fetchers, inject them into the system prompt below.
 */

const Body = z.object({
  message: z.string(),
  persona: z.string().optional(),
  riskTag: z.string().optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, persona = "sharp", riskTag = "balanced" } = Body.parse(body);

    const system = [
      "You are Moneyline Hacks’ AI Betting Coach.",
      "Speak clearly and concisely, show two angles when appropriate (1 safe, 1 higher variance).",
      "ALWAYS surface a 'Receipts' JSON with categories: epa_play, pace, injuries_inactives, trenches_ol_dl, weather, market_view.",
      "If a clean recommendation emerges, ALSO emit a 'SuggestedBet' JSON: {event, market, odds, units, sportTag}.",
      "Default stake = Kelly-lite 0.5 (but do not over-commit; include a quick bank-rails note when riskTag=aggressive).",
      `Persona=${persona}. Risk=${riskTag}.`
    ].join(" ");

    const user = [
      "User message:",
      message,
      "",
      "Output format:",
      "1) A concise natural-language answer.",
      '2) A fenced JSON block labelled "RECEIPTS": {epa_play, pace, injuries_inactives, trenches_ol_dl, weather, market_view}. Keep values short.',
      '3) (Optional) A fenced JSON block labelled "SUGGESTED_BET": {event, market, odds, units, sportTag} if and only if confidence is reasonable.',
      "Keep everything user-friendly; no purple prose."
    ].join("\n");

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user }
      ]
    });

    const content = completion.choices?.[0]?.message?.content || "No reply.";
    // Parse fenced JSON blocks if present
    const receipts = parseFencedJSON(content, "RECEIPTS");
    const suggestedBet = parseFencedJSON(content, "SUGGESTED_BET");

    return NextResponse.json({ reply: content, receipts, suggestedBet });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Coach error" }, { status: 400 });
  }
}

function parseFencedJSON(text: string, label: string) {
  // looks for ```json [LABEL]\n{...}\n```
  const rx = new RegExp("```json\\s*" + label + "\\s*\\n([\\s\\S]*?)```", "i");
  const m = text.match(rx);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

