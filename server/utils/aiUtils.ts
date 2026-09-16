/**
 * AI UTILITIES
 * Shared functions for parsing and validating raw AI responses.
 */

export function parseAIResponse(rawText: string): string {
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  const matches = [...rawText.matchAll(codeBlockRegex)];
  
  if (matches.length > 0) {
    for (let i = matches.length - 1; i >= 0; i--) {
      const candidate = matches[i][1].trim();
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (e) {}
    }
  }
  
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return rawText.substring(firstBrace, lastBrace + 1).trim();
  }
  
  throw new Error("[FATAL] Unable to extract valid JSON candidate from response.");
}

export function verifyScratchpadOrder(jsonString: string): void {
  // Strip common JSON comments (// and /* */) to handle LLM quirks
  const stripped = jsonString
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  // Robustly find the first key
  const firstKeyRegex = /\{\s*"(.*?)"/;
  const match = stripped.match(firstKeyRegex);
  
  if (match && match[1] !== "chain_of_thought_scratchpad") {
    throw new Error(`[SCHEMA_VIOLATION] Commitment Bias Error: Reasoning key 'chain_of_thought_scratchpad' must be the FIRST property. Found '${match[1]}' instead.`);
  }
}
