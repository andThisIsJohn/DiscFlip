import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase for server-side auth verification
const supabase = createClient(
  process.env.SUPABASE_URL!,
  (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!
);

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60000;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // SERVER-SIDE AUTHORIZATION CHECK
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Vault credentials missing. Please sign in.' });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return res.status(401).json({ error: 'Invalid hunter session. Vault access denied.' });
  }

  // Rate Limiting by Authenticated User ID
  const now = Date.now();
  const userData = rateLimitMap.get(user.id) || { count: 0, lastReset: now };
  if (now - userData.lastReset > WINDOW_MS) {
    userData.count = 1;
    userData.lastReset = now;
  } else {
    userData.count++;
  }
  rateLimitMap.set(user.id, userData);
  if (userData.count > RATE_LIMIT)
    return res.status(429).json({ error: 'Too many requests. Please slow down, hunter.' });

  const { base64Image, mimeType } = req.body || {};
  const imageType =
    typeof mimeType === 'string' && /^image\/(jpeg|png|webp|heic|heif)$/.test(mimeType)
      ? mimeType
      : 'image/jpeg';
  if (!base64Image) return res.status(400).json({ error: 'Missing image data for appraisal.' });
  if (base64Image.length > 15 * 1024 * 1024)
    return res.status(413).json({ error: 'Payload too large.' });

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: imageType, data: base64Image } },
          {
            text: `Analyze this disc golf disc for identification. Suggest Brand, Mold, and Plastic. Identify visible flaws. Provide response as JSON.`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brand: { type: Type.STRING },
            mold: { type: Type.STRING },
            plastic: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            flightNumbers: {
              type: Type.OBJECT,
              properties: {
                speed: { type: Type.NUMBER },
                glide: { type: Type.NUMBER },
                turn: { type: Type.NUMBER },
                fade: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    });

    if (!response.text) throw new Error('No response from AI model');
    return res.status(200).json(JSON.parse(response.text));
  } catch (error: any) {
    console.error('Gemini Proxy Error:', error);
    return res.status(500).json({ error: 'AI Analysis failed' });
  }
}
