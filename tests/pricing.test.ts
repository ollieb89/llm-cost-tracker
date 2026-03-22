import { lookupPricing, calculateCost, formatUSD, listProviders, PRICING_TABLE } from '../src/pricing';

describe('lookupPricing', () => {
  it('finds exact model match for gpt-4o', () => {
    const p = lookupPricing('openai', 'gpt-4o');
    expect(p).not.toBeNull();
    expect(p?.model).toBe('gpt-4o');
    expect(p?.inputPer1M).toBe(2.50);
    expect(p?.outputPer1M).toBe(10.00);
  });

  it('finds exact model match for gpt-4o-mini', () => {
    const p = lookupPricing('openai', 'gpt-4o-mini');
    expect(p).not.toBeNull();
    expect(p?.model).toBe('gpt-4o-mini');
    expect(p?.inputPer1M).toBe(0.15);
  });

  it('is case-insensitive', () => {
    expect(lookupPricing('OpenAI', 'GPT-4O')).not.toBeNull();
    expect(lookupPricing('ANTHROPIC', 'CLAUDE-SONNET-4')).not.toBeNull();
  });

  it('resolves short aliases', () => {
    expect(lookupPricing('openai', 'gpt4o')).not.toBeNull();
    expect(lookupPricing('anthropic', 'sonnet')).not.toBeNull();
    expect(lookupPricing('anthropic', 'haiku')).not.toBeNull();
    expect(lookupPricing('anthropic', 'opus')).not.toBeNull();
  });

  it('returns null for unknown model', () => {
    expect(lookupPricing('openai', 'gpt-99-ultra')).toBeNull();
  });

  it('returns null for unknown provider', () => {
    expect(lookupPricing('fakecorp', 'model-x')).toBeNull();
  });

  it('finds all models in pricing table', () => {
    for (const entry of PRICING_TABLE) {
      const found = lookupPricing(entry.provider, entry.model);
      expect(found).not.toBeNull();
    }
  });

  it('fuzzy matches versioned model names (claude-opus-4-5 -> claude-opus-4)', () => {
    const p = lookupPricing('anthropic', 'claude-opus-4-5');
    expect(p).not.toBeNull();
    expect(p?.model).toBe('claude-opus-4');
  });

  it('fuzzy matches claude-sonnet API model name', () => {
    const p = lookupPricing('anthropic', 'claude-sonnet-4-20250514');
    expect(p).not.toBeNull();
    expect(p?.model).toBe('claude-sonnet-4');
  });
});

describe('calculateCost', () => {
  it('calculates cost correctly for gpt-4o at 1M input / 500k output', () => {
    const pricing = lookupPricing('openai', 'gpt-4o')!;
    const { inputCost, outputCost, totalCost } = calculateCost(pricing, 1_000_000, 500_000);
    expect(inputCost).toBeCloseTo(2.50, 5);
    expect(outputCost).toBeCloseTo(5.00, 5);
    expect(totalCost).toBeCloseTo(7.50, 5);
  });

  it('calculates zero cost for zero tokens', () => {
    const pricing = lookupPricing('openai', 'gpt-4o')!;
    expect(calculateCost(pricing, 0, 0).totalCost).toBe(0);
  });

  it('correctly prices gpt-4o-mini tiny usage', () => {
    const pricing = lookupPricing('openai', 'gpt-4o-mini')!;
    // 1000/1M * 0.15 + 500/1M * 0.60 = 0.00015 + 0.00030 = 0.00045
    expect(pricing.inputPer1M).toBe(0.15);
    const { totalCost } = calculateCost(pricing, 1000, 500);
    expect(totalCost).toBeCloseTo(0.00045, 8);
  });

  it('prices Anthropic Claude sonnet correctly', () => {
    const pricing = lookupPricing('anthropic', 'claude-sonnet-4')!;
    const { inputCost, outputCost } = calculateCost(pricing, 100_000, 50_000);
    expect(inputCost).toBeCloseTo(0.30, 5);
    expect(outputCost).toBeCloseTo(0.75, 5);
  });

  it('prices Gemini Flash correctly', () => {
    const pricing = lookupPricing('google', 'gemini-2.5-flash')!;
    const { totalCost } = calculateCost(pricing, 1_000_000, 1_000_000);
    // 1*0.075 + 1*0.30 = 0.375
    expect(totalCost).toBeCloseTo(0.375, 5);
  });

  it('input and output costs sum to total', () => {
    const pricing = lookupPricing('openai', 'o1')!;
    const { inputCost, outputCost, totalCost } = calculateCost(pricing, 50_000, 10_000);
    expect(totalCost).toBeCloseTo(inputCost + outputCost, 10);
  });
});

describe('formatUSD', () => {
  it('formats larger amounts with 4 decimal places', () => {
    expect(formatUSD(1.5)).toBe('$1.5000');
  });

  it('formats tiny amounts with 6 decimal places', () => {
    expect(formatUSD(0.0000045)).toBe('$0.000005');
  });

  it('formats amounts in the cents range', () => {
    expect(formatUSD(0.05)).toBe('$0.0500');
  });
});

describe('listProviders', () => {
  it('returns all known providers', () => {
    const providers = listProviders();
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
    expect(providers).toContain('google');
    expect(providers).toContain('cohere');
  });

  it('returns unique providers only', () => {
    const providers = listProviders();
    expect(new Set(providers).size).toBe(providers.length);
  });
});
