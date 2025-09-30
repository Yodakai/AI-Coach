import { NextRequest, NextResponse } from "next/server";
import { listBets, updateBet } from "@/lib/store";

function userKeyFromReq(req: NextRequest) {
  return req.cookies.get("mlh_user_key")?.value || "anon";
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userKey = userKeyFromReq(req);
    const { result, clv } = await req.json();
    const upd = await updateBet(userKey, params.id, { result, clv });
    if (!upd) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(upd);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Update error" }, { status: 400 });
  }
}
