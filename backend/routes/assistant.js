import { Router } from 'express';
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
    const diff = 100 - keys.reduce((s, k) => s + nums[k], 0);
    nums.stocks += diff;
  }
  return {
    message: obj.message,
    allocation: nums,
    reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : '',
    isSharia: !!obj.isSharia,
  };
}

async function callGroq(messages) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages,
      temperature: 0.7,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new Error(json.error?.message || `Groq error ${response.status}`);
  if (!json.choices?.length) throw new Error('No response generated');
  return json.choices[0].message.content;
}

router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { messages, userProfile } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] required' });
    }

    if (!process.env.GROQ_API_KEY) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      const text = (lastUser?.content || '').toLowerCase();
      const mockAlloc =
        text.includes('sharia') || text.includes('halal')
          ? { stocks: 20, baskets: 30, bonds: 10, gold: 40 }
          : { stocks: 35, baskets: 25, bonds: 25, gold: 15 };
      return res.json({
        message: 'AI key not configured. Here is a demo allocation.',
        allocation: mockAlloc,
        reasoning: 'Demo mode: balanced sample.',
        isSharia: !!(text.includes('sharia') || text.includes('halal')),
      });
    }

    const profileBits = userProfile ? `User profile: ${JSON.stringify(userProfile)}` : '';
    const systemContent = profileBits ? `${SYSTEM}\n\n${profileBits}` : SYSTEM;

    const groqMessages = [
      { role: 'system', content: systemContent },
      ...messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || ''),
      })),
    ];

    let raw = await callGroq(groqMessages);

    let parsed = null;
    const jsonStr = stripJsonBlock(raw);
    if (jsonStr) {
      try { parsed = validatePayload(JSON.parse(jsonStr)); } catch { parsed = null; }
    }

    if (jsonStr && !parsed) {
      groqMessages.push({ role: 'assistant', content: raw });
      groqMessages.push({
        role: 'user',
        content: 'Your last message was not valid JSON. Reply with ONLY one JSON object: {"message","allocation","reasoning","isSharia"} as specified.',
      });
      raw = await callGroq(groqMessages);
      const j2 = stripJsonBlock(raw);
      if (j2) {
        try { parsed = validatePayload(JSON.parse(j2)); } catch { parsed = null; }
      }
    }

    if (parsed?.allocation) return res.json(parsed);
    if (parsed) return res.json({ message: parsed.message, allocation: null, reasoning: parsed.reasoning, isSharia: parsed.isSharia });
    return res.json({ message: raw, allocation: null, reasoning: null, isSharia: null });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Assistant failed', detail: String(e.message || e) });
  }
});

export default router;
