"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import clsx from "clsx";

// -----------------------
// Schemas
// -----------------------
const BetSchema = z.object({
  id: z.string().optional(),
  event: z.string(),
  market: z.string(),
  odds: z.string(),
  units: z.number().default(0),
  sportTag: z.string().optional(),
  result: z.enum(["win", "loss", "push"]).optional(),
  clv: z.number().optional()
});
type Bet = z.infer<typeof BetSchema>;

// -----------------------
// Helpers
// -----------------------
const personas = [
  { key: "sharp", label: "Sharp (default)" },
  { key: "teacher", label: "Teacher (explain it simply)" },
  { key: "contrarian", label: "Contrarian angles" },
  { key: "bankroll-nanny", label: "Bankroll nanny (risk-aware)" }
];

const riskTags = [
  { key: "cautious", label: "Cautious" },
  { key: "balanced", label: "Balanced (default)" },
  { key: "aggressive", label: "Aggressive" }
];

function impliedFromAmerican(oddsStr: string) {
  const o = Number(oddsStr);
  if (Number.isNaN(o)) return undefined;
  return o > 0 ? 100 / (o + 100) : Math.abs(o) / (Math.abs(o) + 100);
}

function copy(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

const Panel: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <div className="card p-4 space-y-4">
    <div className="flex items-center justify-between">
      <div className="font-semibold">{title}</div>
      {right}
    </div>
    {children}
  </div>
);

// -----------------------
// Main Page
// -----------------------
export default function Page() {
  // Chat state
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [persona, setPersona] = useState("sharp");
  const [risk, setRisk] = useState("balanced");

  // Receipts panel (parsed JSON blocks returned by coach)
  const [receipts, setReceipts] = useState<any | null>(null);

  // NLP extraction state
  const [nlpInput, setNlpInput] = useState("");
  const [nlpBet, setNlpBet] = useState<Bet | null>(null);

  // Bets (tracker)
  const [bets, setBets] = useState<Bet[]>([]);

  const chatRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Load bets on mount
  useEffect(() => {
    void fetchBets();
  }, []);

  async function fetchBets() {
    const r = await fetch("/api/bets", { method: "GET" });
    if (r.ok) {
      const j = await r.json();
      setBets(Array.isArray(j) ? j : []);
    }
  }

  async function sendMessage() {
    const q = input.trim();
    if (!q) return;
    const userMsg = { role: "user" as const, content: q };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    // optimistic placeholder
    setMessages((m) => [...m, { role: "assistant", content: "…" }]);

    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: q, persona, riskTag: risk })
    });

    if (!res.ok) {
      setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: "⚠️ Error from coach." }]);
      return;
    }

    const data = await res.json() as { reply: string; receipts?: any; suggestedBet?: Bet };
    setMessages((m) => [...m.slice(0, -1), { role: "assistant", content: data.reply || "No reply." }]);

    // Receipts (EPA, injuries, weather, etc.)
    if (data.receipts) setReceipts(data.receipts);

    // If coach returns a structured suggested bet, prefill NLP card
    if (data.suggestedBet) setNlpBet(data.suggestedBet);
  }

  async function parseNLP() {
    const t = nlpInput.trim();
    if (!t) return;
    const r = await fetch("/api/nlp", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
    if (!r.ok) return;
    const d = await r.json() as { parsed?: Bet };
    if (d.parsed) {
      // normalize units to number
      const units = typeof d.parsed.units === "number" ? d.parsed.units : Number(d.parsed.units) || 0;
      setNlpBet({ ...d.parsed, units });
    }
  }

  async function saveBet() {
    if (!nlpBet) return;
    const r = await fetch("/api/bets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nlpBet) });
    if (r.ok) {
      setNlpBet(null);
      await fetchBets();
    }
  }

  async function shareDiscord(text: string) {
    await fetch("/api/share-discord", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) });
  }

  const bankrollCurve = useMemo(() => {
    // super-simple picture: cumulative units
    const pts = [0];
    let cum = 0;
    for (const b of bets) {
      // if you later store result values with net units, adjust here
      cum += Number(b.units) || 0;
      pts.push(cum);
    }
    return pts;
  }, [bets]);

  return (
    <div className="space-y-6">
      {/* Coach */}
      <Panel
        title="AI Coach"
        right={
          <div className="flex gap-2">
            <select className="input" value={persona} onChange={(e) => setPersona(e.target.value)}>
              {personas.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
            <select className="input" value={risk} onChange={(e) => setRisk(e.target.value)}>
              {riskTags.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
        }
      >
        <div
          ref={chatRef}
          className="h-[360px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/30 p-3 space-y-2"
        >
          {messages.map((m, i) => (
            <div key={i} className={clsx("max-w-[85%] rounded-xl px-3 py-2", m.role === "user" ? "ml-auto bg-slate-900" : "bg-slate-800")}>
              <div className="prose prose-invert max-w-none text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {messages.length === 0 && (
            <div className="text-muted text-sm">Tip: ask for “2 angles + receipts” or paste a matchup and odds. Use the dropdowns for persona & risk.</div>
          )}
        </div>
        <div className="flex gap-2">
          <input
            className="input w-full"
            placeholder="Ask your coach… (e.g., 'Cowboys-Eagles total? give me 1 safe + 1 high-variance with receipts')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" ? void sendMessage() : null}
          />
          <button className="btn btn-primary" onClick={sendMessage}>Send</button>
        </div>

        {/* Receipts accordion */}
        {receipts && (
          <details className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <summary className="cursor-pointer font-semibold">Receipts (EPA/play, injuries, OL/DL, weather, pace)</summary>
            <pre className="mt-3 whitespace-pre-wrap text-xs opacity-90">{JSON.stringify(receipts, null, 2)}</pre>
          </details>
        )}

        {/* Micro-guides accordion */}
        <details className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
          <summary className="cursor-pointer font-semibold">Built-in Guides (tap to expand)</summary>
          <div className="grid md:grid-cols-3 gap-3 mt-3">
            <Guide title="Totals checklist" bullets={[
              "QB efficiency (EPA/CPOE), weather (wind > 12mph matters), OL/DL injuries",
              "Pace: situation-neutral pace & pass rate over expected",
              "Explosive rate (pass/run) & red zone TD %",
              "Model vs Market edge ≥ 3–4 pts to fire"
            ]} />
            <Guide title="Sides checklist" bullets={[
              "QB delta, trenches (pressure vs pressure allowed), WR/CB mismatches",
              "Travel/rest (TNF, West→East early), injuries/inactives",
              "Fair line vs spread: fire if ≥ 1.5–2.0 pts edge"
            ]} />
            <Guide title="Bankroll rails" bullets={[
              "Kelly-lite 0.5x default (reduce variance)",
              "Daily stop loss (-3u) / weekly (-8u) example",
              "No chasing, record CLV (close vs bet line)"
            ]} />
          </div>
        </details>
      </Panel>

      {/* NLP & Bet Card */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="NLP Bet Extractor">
          <div className="space-y-2">
            <input className="input w-full" placeholder={`Ex: "2u Eagles -2.5 (-110) vs Cowboys"`} value={nlpInput} onChange={(e) => setNlpInput(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn" onClick={parseNLP}>Parse</button>
              <span className="label">Paste any shorthand; we’ll structure it.</span>
            </div>
          </div>

          {nlpBet && (
            <div className="mt-4 rounded-xl border border-slate-800 p-3 bg-slate-900/40">
              <div className="font-semibold mb-2">Bet Card</div>
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="Event" value={nlpBet.event} onChange={(v) => setNlpBet({ ...nlpBet, event: v })} />
                <Field label="Market" value={nlpBet.market} onChange={(v) => setNlpBet({ ...nlpBet, market: v })} />
                <Field label="Odds (American)" value={nlpBet.odds} onChange={(v) => setNlpBet({ ...nlpBet, odds: v })} />
                <Field label="Units" value={String(nlpBet.units)} onChange={(v) => setNlpBet({ ...nlpBet, units: Number(v) || 0 })} />
              </div>

              {/* Edge helper */}
              <div className="mt-3 text-sm">
                <span className="label">Edge helper: </span>
                <span className="text-edge">
                  {(() => {
                    const imp = impliedFromAmerican(nlpBet.odds);
                    return typeof imp === "number" ? `Implied ≈ ${(imp * 100).toFixed(1)}%` : "Add valid odds";
                  })()}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button className="btn btn-primary" onClick={saveBet}>Save to Tracker</button>
                <button className="btn" onClick={() => copy(`${nlpBet.event} — ${nlpBet.market} ${nlpBet.odds} (${nlpBet.units}u)`)}>Copy</button>
                <button className="btn" onClick={() => shareDiscord(`🎯 ${nlpBet.event} — ${nlpBet.market} ${nlpBet.odds} (${nlpBet.units}u)`)}>
                  Share to Discord
                </button>
              </div>
            </div>
          )}
        </Panel>

        <Panel
          title="Bet Tracker (lite)"
          right={<span className="label">Auto-saves to KV if configured; otherwise in-memory (ephemeral)</span>}
        >
          {bets.length === 0 ? (
            <div className="text-sm text-muted">No bets yet — save one from the Bet Card.</div>
          ) : (
            <div className="space-y-2">
              {bets.map((b) => (
                <div key={b.id || `${b.event}-${b.market}-${b.odds}`} className="rounded-lg border border-slate-800 px-3 py-2 bg-slate-900/40">
                  <div className="text-sm font-semibold">{b.event}</div>
                  <div className="text-xs opacity-80">{b.market} • {b.odds} • {b.units}u</div>
                </div>
              ))}
            </div>
          )}

          <details className="mt-3 rounded-xl border border-slate-800 bg-slate-900/40 p-3">
            <summary className="cursor-pointer font-semibold">Cumulative Units (simple)</summary>
            <div className="mt-2 text-xs opacity-80">
              {bankrollCurve.map((v, i) => (
                <span key={i} className="mr-2">{i}:{v}</span>
              ))}
            </div>
          </details>
        </Panel>
      </div>
    </div>
  );
}

function Guide({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
      <div className="font-semibold">{title}</div>
      <ul className="mt-2 list-disc pl-5 text-sm opacity-90">
        {bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="label mb-1">{label}</div>
      <input className="input w-full" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

