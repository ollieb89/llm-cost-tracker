import { formatMarkdownReport, formatTextSummary, recordsToCSV } from '../src/reporter';
import { buildReport, buildCostRecord, CostRecord } from '../src/tracker';

function makeRecord(provider: string, model: string, cost: number): CostRecord {
  return buildCostRecord(provider, model, 10000, 5000, cost * 0.7, cost * 0.3, 'test');
}

describe('formatMarkdownReport', () => {
  it('includes cost in summary', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.15)], null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('LLM Cost Tracker');
    expect(md).toContain('Total Cost');
    expect(md).toContain('gpt-4o');
  });

  it('shows budget exceeded warning', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.80)], 0.50);
    const md = formatMarkdownReport(report);
    expect(md).toContain('EXCEEDED');
    expect(md).toContain('Budget Exceeded');
  });

  it('shows within budget message', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.20)], 0.50);
    const md = formatMarkdownReport(report);
    expect(md).toContain('Within Budget');
  });

  it('includes provider and model breakdown table', () => {
    const report = buildReport([makeRecord('anthropic', 'claude-sonnet-4', 0.10)], null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('anthropic');
    expect(md).toContain('claude-sonnet-4');
    expect(md).toContain('Model Breakdown');
  });

  it('includes workflow name when provided', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.05)], null);
    const md = formatMarkdownReport(report, 'My CI Workflow');
    expect(md).toContain('My CI Workflow');
  });

  it('includes powered by footer', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.01)], null);
    const md = formatMarkdownReport(report);
    expect(md).toContain('llm-cost-tracker');
    expect(md).toContain('github.com/ollieb89/llm-cost-tracker');
  });
});

describe('formatTextSummary', () => {
  it('contains core metrics', () => {
    const report = buildReport([makeRecord('google', 'gemini-2.5-flash', 0.02)], 1.00);
    const text = formatTextSummary(report);
    expect(text).toContain('Total cost:');
    expect(text).toContain('Input tokens:');
    expect(text).toContain('Budget limit:');
    expect(text).toContain('Status:');
    expect(text).toContain('gemini');
  });

  it('omits budget section when no limit', () => {
    const report = buildReport([makeRecord('openai', 'gpt-4o', 0.05)], null);
    const text = formatTextSummary(report);
    expect(text).not.toContain('Budget limit:');
  });
});

describe('recordsToCSV', () => {
  it('generates valid CSV with header', () => {
    const records = [makeRecord('openai', 'gpt-4o', 0.10)];
    const csv = recordsToCSV(records);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('timestamp,provider,model');
    expect(lines[1]).toContain('openai');
    expect(lines[1]).toContain('gpt-4o');
    expect(lines.length).toBe(2);
  });

  it('handles multiple records', () => {
    const records = [
      makeRecord('openai', 'gpt-4o', 0.10),
      makeRecord('anthropic', 'claude-haiku-4', 0.02)
    ];
    const csv = recordsToCSV(records);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3);
  });

  it('generates empty CSV with just header for no records', () => {
    const csv = recordsToCSV([]);
    expect(csv.trim()).toContain('timestamp,provider,model');
    expect(csv.split('\n').length).toBe(1);
  });
});
