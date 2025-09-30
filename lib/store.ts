// Minimal persistence with optional Vercel KV.
// Falls back to ephemeral in-memory store when KV envs absent.

type BetRow = {
  id: string;
  userKey: string;
  event: string;
  market: string;
  odds: string;
  units: number;
  sportTag?: string;
  result?: "win" | "loss" | "push";
  clv?: number;
  createdAt: number;
};

const useKV = !!process.env.KV_REST_API_URL && !!process.env.KV_REST_API_TOKEN;
let memory: Record<string, BetRow[]> = {}; // userKey -> BetRow[]

async function kvFetch(path: string, init?: RequestInit) {
  const url = `${process.env.KV_REST_API_URL}${path}`;
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${process.env.KV_REST_API_TOKEN}`,
    "Content-Type": "application/json"
  };
  const r = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function keyFor(userKey: string) {
  return `mlh:bets:${userKey}`;
}

export async function listBets(userKey: string): Promise<BetRow[]> {
  if (!userKey) return [];
  if (useKV) {
    const j = await kvFetch(`/get/${encodeURIComponent(keyFor(userKey))}`, { method: "GET" }).catch(() => ({ result: null }));
    return j?.result ? JSON.parse(j.result) as BetRow[] : [];
  }
  return memory[userKey] || [];
}

export async function saveBet(userKey: string, row: Omit<BetRow, "id" | "createdAt">): Promise<BetRow> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const full: BetRow = { id, createdAt: now, userKey, ...row };

  if (useKV) {
    const cur = await listBets(userKey);
    const next = [...cur, full];
    await kvFetch(`/set/${encodeURIComponent(keyFor(userKey))}`, { method: "POST", body: JSON.stringify({ value: JSON.stringify(next) }) });
    return full;
  }

  memory[userKey] = [...(memory[userKey] || []), full];
  return full;
}

export async function updateBet(userKey: string, id: string, patch: Partial<BetRow>): Promise<BetRow | null> {
  if (useKV) {
    const cur = await listBets(userKey);
    const idx = cur.findIndex(b => b.id === id);
    if (idx < 0) return null;
    const upd = { ...cur[idx], ...patch };
    cur[idx] = upd;
    await kvFetch(`/set/${encodeURIComponent(keyFor(userKey))}`, { method: "POST", body: JSON.stringify({ value: JSON.stringify(cur) }) });
    return upd;
  }
  const cur = memory[userKey] || [];
  const idx = cur.findIndex(b => b.id === id);
  if (idx < 0) return null;
  cur[idx] = { ...cur[idx], ...patch };
  memory[userKey] = cur;
  return cur[idx];
}

