type PriceTable = {
  [provider: string]: {
    [model: string]: { inputPer1k: number; outputPer1k: number };
  };
};

// Minimal starter pricing (USD per 1K tokens). Update as providers change.
const PRICES: PriceTable = {
  anthropic: {
    'claude-3-5-sonnet-20241022': { inputPer1k: 3.0, outputPer1k: 15.0 },
  },
  openai: {
    'gpt-4-turbo-preview': { inputPer1k: 10.0, outputPer1k: 30.0 },
  },
};

export function estimateCostUsd(provider: string, model: string | undefined, tokensIn: number, tokensOut: number): number {
  const table = PRICES[provider.toLowerCase()];
  const price = model && table ? table[model] : undefined;
  if (!price) return 0;
  const cost = (tokensIn / 1000) * price.inputPer1k + (tokensOut / 1000) * price.outputPer1k;
  return Math.round(cost * 10000) / 10000; // 4dp
}

// Rough token estimate: assume ~4 chars per token
export function estimateTokensFromMessages(messages: Array<{ role: string; content: string }>): { inTokens: number; outTokensCap: number } {
  const totalChars = messages.reduce((s, m) => s + (m.content?.length || 0), 0);
  const inTokens = Math.ceil(totalChars / 4);
  // Assume output capped by max assistant tokens (caller should pass intended max)
  return { inTokens, outTokensCap: 0 };
}
