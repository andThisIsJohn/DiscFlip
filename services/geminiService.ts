import { config } from './config';
import { supabase } from './supabaseClient';

/**
 * Ask the AI to identify a disc from a photo. Accepts a data: URL (preferred, keeps the
 * image type) or raw base64 JPEG. Returns null if identification isn't available.
 */
export const analyzeDiscImage = async (image: string) => {
  if (config.isMockEnabled) return null; // needs the /api server + GEMINI_API_KEY
  const match = /^data:(image\/[a-zA-Z+.-]+);base64,(.*)$/.exec(image);
  const mimeType = match ? match[1] : 'image/jpeg';
  const base64Image = match ? match[2] : image;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch(`${config.apiBaseUrl}/api/ai/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
      body: JSON.stringify({ base64Image, mimeType }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'AI Analysis failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch {
        // response was not JSON; keep the generic message
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('AI Analysis failed:', error);
    return null;
  }
};
