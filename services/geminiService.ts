
import { config } from './config';
import { supabase } from './supabaseClient';

export const analyzeDiscImage = async (base64Image: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const response = await fetch(`${config.apiBaseUrl}/api/ai/gemini`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({ base64Image }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'AI Analysis failed';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return null;
  }
};
