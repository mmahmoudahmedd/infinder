import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

const SYSTEM = `You are INFINDER's Smart Investment Assistant — a friendly, educational guide for beginner investors in Egypt (EGP). This is not licensed financial advice; encourage users to do their own research.

Your job:
1. Chat naturally. Answer questions like "what is a bond?" or "is gold risky?" in simple language.
2. When you need to recommend a portfolio, first gather: goal (save vs grow), time horizon, risk comfort, Sharia preference.
3. Available allocation buckets (percentages must sum to 100): stocks, baskets (stock baskets), bonds, gold.
4. When you are ready to output a FINAL recommendation, respond with ONLY a single JSON object (no markdown fences, no backticks) with this exact shape:
{"message":"string","allocation":{"stocks":number,"baskets":number,"bonds":number,"gold":number},"reasoning":"string","isSharia":boolean}
5. If you are not yet giving the final allocation, respond with normal conversational text only (no JSON).

Keep messages concise. Be encouraging.`;

function stripJsonBlock(text) {
  if (!text) return null;
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) return fence[1].trim();
  if (t.startsWith('{') && t.endsWith('}')) return t;
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) return t.slice(start, end + 1);
  return null;
}

function validatePayload(obj) {
  if (!obj || typeof obj.message !== 'string') return null;
  const a = obj.allocation;
  if (!a || typeof a !== 'object') return { message: obj.message, allocation: null, reasoning: obj.reasoning, isSharia: !!obj.isSharia };
  const keys = ['stocks', 'baskets', 'bonds', 'gold'];
  const nums = {};
  let sum = 0;
  for (const k of keys) {
    const n = Math.round(Number(a[k]) || 0);
    nums[k] = Math.max(0, Math.min(100, n));
    sum += nums[k];
  }
  if (sum === 0) return { message: obj.message, allocation: null, reasoning: obj.reasoning, isSharia: !!obj.isSharia };
  if (Math.abs(sum - 100) > 2) {
    const f = 100 / sum;
    for (const k of keys) nums[k] = Math.round(nums[k] * f);
    let diff = 100 - keys.reduce((s, k) => s + nums[k], 0);
    nums.stocks += diff;
  }
  return {
    message: obj.message,
    allocation: nums,
    reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    isSharia: !!obj.isSharia,
  };
}

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { messages, userProfile } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] required' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const text = (lastUser?.content || '').toLowerCase();
      const mockAlloc =
        text.includes('sharia') || text.includes('halal')
          ? { stocks: 20, baskets: 30, bonds: 10, gold: 40 }
          : { stocks: 35, baskets: 25, bonds: 25, gold: 15 };
      return res.json({
        message:
          'Gemini API key is not set on the server. Here is a demo allocation so the UI still works. Add GEMINI_API_KEY to your backend .env for real AI chat.',
        allocation: mockAlloc,
        reasoning: 'Demo mode: balanced sample with slightly more gold when Sharia-related keywords are detected.',
        isSharia: !!(text.includes('sharia') || text.includes('halal')),
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      systemInstruction: SYSTEM,
    });

    const profileBits = userProfile
      ? `User profile JSON: ${JSON.stringify(userProfile)}`
      : '';
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    }));
    const last = messages[messages.length - 1];
    const lastText = [profileBits, String(last.content || '')].filter(Boolean).join('\n\n');

    const chat = model.startChat({ history });
    let result = await chat.sendMessage(lastText);
    let raw = result.response.text();

    let parsed = null;
    const jsonStr = stripJsonBlock(raw);
    if (jsonStr) {
      try {
        parsed = validatePayload(JSON.parse(jsonStr));
      } catch {
        parsed = null;
      }
    }

    if (jsonStr && !parsed) {
      const retry = await chat.sendMessage(
        'Your last message was not valid JSON. Reply with ONLY one JSON object: {"message","allocation","reasoning","isSharia"} as specified.'
      );
      raw = retry.response.text();
      const j2 = stripJsonBlock(raw);
      if (j2) {
        try {
          parsed = validatePayload(JSON.parse(j2));
        } catch {
          parsed = null;
        }
      }
    }

    if (parsed && parsed.allocation) {
      return res.json(parsed);
    }

    if (parsed && !parsed.allocation) {
      return res.json({ message: parsed.message, allocation: null, reasoning: parsed.reasoning, isSharia: parsed.isSharia });
    }

    return res.json({ message: raw, allocation: null, reasoning: null, isSharia: null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Assistant failed', detail: String(e.message || e) });
  }
});

export default router;
