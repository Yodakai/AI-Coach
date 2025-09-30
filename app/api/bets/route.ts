import { NextRequest, NextResponse } from "next/server";
import { listBets, saveBet } from "@/lib/store";
import { detectSport } from "@/lib/utils";
import { z } from "zod";

function userKeyFromReq(req: NextRequest) {
  // For simplicity we use a client-side pseudo key from a cookie
  // In real auth, replace with your session/user id.
  const cookie = req.cookies.get("mlh_user_key")?.value || "anon";
  return cookie;
}

const BetBody = z.object({
  event: z.string(),
  market: z.string(),
  odds: z.string(),
  units: z.number().default(0),
  sportTag: z.string().optional()
});

export async function GET(req: NextRequest) {
  const userKey = userKeyFromReq(req);
  const rows = await listBets(userKey);
  // Return newest first
  rows.sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  try {
    const userKey = userKeyFromReq(req);
    const data = BetBody.parse(await req.json());
    const sportTag = data.sportTag || detectSport(data.event);
    const row = await saveBet(userKey, { ...data, sportTag });
    return NextResponse.json(row);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Bet save error" }, { status: 400 });
  }
}
