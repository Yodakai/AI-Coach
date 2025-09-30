import { NextRequest, NextResponse } from "next/server";
import { maskHandle } from "@/lib/utils";
import { listBets } from "@/lib/store";

/**
 * Demo leaderboard:
 * - Not real multi-user; we group by userKey if you extend auth.
 * - Here we compute a simple totalUnits = sum(units) as placeholder.
 */
export async function GET(_req: NextRequest) {
  // In a real app: aggregate across many users.
  // For now we just produce a single mock leaderboard item.
  const selfBets = await listBets("anon");
  const totalUnits = selfBets.reduce((a, b) => a + (Number(b.units) || 0), 0);
  const streak = Math.min(selfBets.length, 5); // placeholder

  return NextResponse.json({
    leaderboard: [
      { nickname: maskHandle("user@example.com"), totalUnits, streak }
    ]
  });
}
