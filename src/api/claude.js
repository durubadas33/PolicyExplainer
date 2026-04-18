export const SYSTEM_EXPLAINER = `You are a plain-language policy explainer for citizens. Your job is to make complex government and institutional policy documents easy to understand.

When given a policy name or document text, respond with valid JSON ONLY (no markdown, no backticks) in this exact format:
{
  "summary": "A clear 2-3 sentence explanation in plain language that anyone can understand",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "requiredActions": ["Action citizens must take 1", "Action 2"],
  "impacts": ["How this affects you 1", "Impact 2"],
  "readingLevel": "Simple/Moderate/Complex"
}`;

export const SYSTEM_QA = `You are a helpful policy assistant who answers citizen questions about policies in plain, simple language.
Keep answers under 3 sentences. Be direct and clear. If you don't know, say so honestly.
Always end with a practical tip if relevant.`;

export const callClaude = async (messages, system) => {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing API Key. Please create a .env file and add VITE_ANTHROPIC_API_KEY.");
  }

  const res = await fetch("/api/anthropic/v1/messages", {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1000,
      system,
      messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error: ${res.status} - ${errText}`);
  }
  const data = await res.json();
  return data.content.find((b) => b.type === "text")?.text || "";
};
