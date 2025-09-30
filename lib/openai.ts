import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
if (!OPENAI_API_KEY) {
  console.warn("⚠️ Missing OPENAI_API_KEY. Add it in Vercel → Project → Settings → Environment Variables.");
}

export const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
export const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
