export interface ModelPricing {
  provider: string;
  model: string;
  inputPer1M: number;
  outputPer1M: number;
  aliases?: string[];
}

export const PRICING_TABLE: ModelPricing[] = [
  // OpenAI
  { provider: 'openai', model: 'gpt-4o',            inputPer1M: 2.50,  outputPer1M: 10.00, aliases: ['gpt4o'] },
  { provider: 'openai', model: 'gpt-4o-mini',        inputPer1M: 0.15,  outputPer1M: 0.60,  aliases: ['gpt4o-mini'] },
  { provider: 'openai', model: 'o1',                 inputPer1M: 15.00, outputPer1M: 60.00 },
  { provider: 'openai', model: 'o1-mini',            inputPer1M: 3.00,  outputPer1M: 12.00 },
  { provider: 'openai', model: 'o3-mini',            inputPer1M: 1.10,  outputPer1M: 4.40 },
  { provider: 'openai', model: 'gpt-4-turbo',        inputPer1M: 10.00, outputPer1M: 30.00 },
  { provider: 'openai', model: 'gpt-3.5-turbo',      inputPer1M: 0.50,  outputPer1M: 1.50,  aliases: ['gpt35-turbo'] },
  // Anthropic
  { provider: 'anthropic', model: 'claude-opus-4',   inputPer1M: 15.00, outputPer1M: 75.00, aliases: ['claude-opus-4-5', 'opus'] },
  { provider: 'anthropic', model: 'claude-sonnet-4', inputPer1M: 3.00,  outputPer1M: 15.00, aliases: ['claude-sonnet-4-5', 'sonnet'] },
  { provider: 'anthropic', model: 'claude-haiku-4',  inputPer1M: 0.80,  outputPer1M: 4.00,  aliases: ['claude-haiku-4-5', 'haiku'] },
  { provider: 'anthropic', model: 'claude-3-opus',   inputPer1M: 15.00, outputPer1M: 75.00 },
  { provider: 'anthropic', model: 'claude-3-sonnet', inputPer1M: 3.00,  outputPer1M: 15.00 },
  { provider: 'anthropic', model: 'claude-3-haiku',  inputPer1M: 0.25,  outputPer1M: 1.25 },
  // Google
  { provider: 'google', model: 'gemini-2.5-pro',     inputPer1M: 1.25,  outputPer1M: 10.00 },
  { provider: 'google', model: 'gemini-2.5-flash',   inputPer1M: 0.075, outputPer1M: 0.30,  aliases: ['gemini-flash'] },
  { provider: 'google', model: 'gemini-1.5-pro',     inputPer1M: 1.25,  outputPer1M: 5.00 },
  { provider: 'google', model: 'gemini-1.5-flash',   inputPer1M: 0.075, outputPer1M: 0.30 },
  // Cohere
  { provider: 'cohere', model: 'command-r-plus',     inputPer1M: 2.50,  outputPer1M: 10.00 },
  { provider: 'cohere', model: 'command-r',          inputPer1M: 0.15,  outputPer1M: 0.60 },
  { provider: 'cohere', model: 'command',            inputPer1M: 1.00,  outputPer1M: 2.00 },
];

export function lookupPricing(provider: string, model: string): ModelPricing | null {
  const p = provider.toLowerCase().trim();
  const m = model.toLowerCase().trim();

  const candidates = PRICING_TABLE.filter(e => e.provider === p);

  // Pass 1: exact match
  for (const entry of candidates) {
    if (entry.model === m) return entry;
  }
  // Pass 2: alias match
  for (const entry of candidates) {
    if (entry.aliases?.includes(m)) return entry;
  }
  // Pass 3: fuzzy — input starts with known model (e.g. claude-sonnet-4-20250514)
  // Only match if no other candidate is a closer (longer) exact prefix
  let bestFuzzy: ModelPricing | null = null;
  let bestLen = 0;
  for (const entry of candidates) {
    if (m.startsWith(entry.model) && entry.model.length > bestLen) {
      bestFuzzy = entry;
      bestLen = entry.model.length;
    }
  }
  return bestFuzzy;
}

export function calculateCost(
  pricing: ModelPricing,
  inputTokens: number,
  outputTokens: number
): { inputCost: number; outputCost: number; totalCost: number } {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return { inputCost, outputCost, totalCost: inputCost + outputCost };
}

export function formatUSD(amount: number): string {
  if (amount < 0.001) return '$' + amount.toFixed(6);
  if (amount < 0.01) return '$' + amount.toFixed(4);
  return '$' + amount.toFixed(4);
}

export function listProviders(): string[] {
  return [...new Set(PRICING_TABLE.map(p => p.provider))];
}
