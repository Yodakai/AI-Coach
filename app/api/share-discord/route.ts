import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    const url = process.env.DISCORD_WEBHOOK_URL;
    if (!url) return NextResponse.json({ ok: false, message: "No webhook set" });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text?.slice(0, 1800) || "..." })
    });
    if (!r.ok) throw new Error(await r.text());
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Discord error" }, { status: 400 });
  }
}
