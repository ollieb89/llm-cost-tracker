import { parseLogContent, validateTokens } from '../src/parser';

const OPENAI_LOG = `
{"model":"gpt-4o","choices":[{"message":{"content":"Hello"}}],"usage":{"prompt_tokens":150,"completion_tokens":80,"total_tokens":230}}
`;

const ANTHROPIC_LOG = `
{"id":"msg_abc","type":"message","model":"claude-sonnet-4-20250514","usage":{"input_tokens":200,"output_tokens":120}}
`;

const MULTI_LOG = OPENAI_LOG + ANTHROPIC_LOG;

describe('parseLogContent - OpenAI', () => {
  it('parses OpenAI response correctly', () => {
    const results = parseLogContent(OPENAI_LOG);
    expect(results.length).toBe(1);
    expect(results[0].provider).toBe('openai');
    expect(results[0].inputTokens).toBe(150);
    expect(results[0].outputTokens).toBe(80);
  });

  it('deduplicates identical matches', () => {
    const results = parseLogContent(OPENAI_LOG + OPENAI_LOG);
    expect(results.length).toBe(1);
  });
});

describe('parseLogContent - Anthropic', () => {
  it('parses Anthropic response correctly', () => {
    const results = parseLogContent(ANTHROPIC_LOG);
    expect(results.length).toBe(1);
    expect(results[0].provider).toBe('anthropic');
    expect(results[0].inputTokens).toBe(200);
    expect(results[0].outputTokens).toBe(120);
  });
});

describe('parseLogContent - multiple', () => {
  it('parses multiple providers from same log', () => {
    const results = parseLogContent(MULTI_LOG);
    const providers = results.map(r => r.provider);
    expect(providers).toContain('openai');
    expect(providers).toContain('anthropic');
  });

  it('returns empty array for no matches', () => {
    expect(parseLogContent('no llm data here')).toEqual([]);
  });
});

describe('validateTokens', () => {
  it('returns null for valid tokens', () => {
    expect(validateTokens(1000, 500)).toBeNull();
  });

  it('errors on both zero', () => {
    expect(validateTokens(0, 0)).not.toBeNull();
  });

  it('allows single zero', () => {
    expect(validateTokens(100, 0)).toBeNull();
    expect(validateTokens(0, 100)).toBeNull();
  });

  it('errors on negative values', () => {
    expect(validateTokens(-1, 100)).not.toBeNull();
    expect(validateTokens(100, -1)).not.toBeNull();
  });

  it('errors on unreasonably large input-tokens', () => {
    expect(validateTokens(15_000_000, 100)).not.toBeNull();
  });

  it('errors on unreasonably large output-tokens', () => {
    expect(validateTokens(100, 3_000_000)).not.toBeNull();
  });

  it('errors on non-integer', () => {
    expect(validateTokens(1.5, 100)).not.toBeNull();
  });
});
