/**
 * Strips <think>...</think> reasoning blocks from AI responses.
 * These are internal chain-of-thought tags that should never be shown to users.
 */
export const sanitizeAIResponse = (text: string): string => {
  if (!text) return '';
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<\/think>/gi, '')
    .replace(/<think>/gi, '')
    .trim();
};

/**
 * Returns a short preview of an AI response, stripped of think tags and markdown.
 */
export const getResponsePreview = (text: string, maxLength = 200): string => {
  const clean = sanitizeAIResponse(text).replace(/[#*_`]/g, '');
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength).trim() + '...';
};
