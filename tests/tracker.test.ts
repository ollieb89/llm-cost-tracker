import { buildCostRecord, computeBudgetStatus, aggregateRecords, buildReport, formatCostSummary } from '../src/tracker';

function makeRecord(cost: number, inputTokens = 1000, outputTokens = 500) {
  return buildCostRecord('openai', 'gpt-4o', inputTokens, outputTokens, cost * 0.6, cost * 0.4, 'test');
}

describe('computeBudgetStatus', () => {
  it('returns no budget status when limit is null', () => {
    const s = computeBudgetStatus(0.5, null);
    expect(s.budgetLimit).toBeNull();
    expect(s.budgetExceeded).toBe(false);
    expect(s.budgetRemaining).toBeNull();
  });

  it('marks exceeded when cost > limit', () => {
    const s = computeBudgetStatus(0.75, 0.50);
    expect(s.budgetExceeded).toBe(true);
    expect(s.overrunAmount).toBeCloseTo(0.25, 5);
    expect(s.overrunPercent).toBe(50);
  });

  it('marks within budget when cost <= limit', () => {
    const s = computeBudgetStatus(0.30, 0.50);
    expect(s.budgetExceeded).toBe(false);
    expect(s.budgetRemaining).toBeCloseTo(0.20, 5);
    expect(s.overrunAmount).toBe(0);
  });

  it('handles exact budget match', () => {
    const s = computeBudgetStatus(0.50, 0.50);
    expect(s.budgetExceeded).toBe(false);
  });
});

describe('aggregateRecords', () => {
  it('sums tokens and costs correctly', () => {
    const records = [makeRecord(0.10, 1000, 500), makeRecord(0.20, 2000, 1000)];
    const agg = aggregateRecords(records);
    expect(agg.totalInputTokens).toBe(3000);
    expect(agg.totalOutputTokens).toBe(1500);
    expect(agg.totalCost).toBeCloseTo(0.30, 5);
  });

  it('returns zeros for empty records', () => {
    const agg = aggregateRecords([]);
    expect(agg.totalCost).toBe(0);
    expect(agg.totalTokens).toBe(0);
  });
});

describe('buildCostRecord', () => {
  it('includes all required fields', () => {
    const r = buildCostRecord('anthropic', 'claude-sonnet-4', 100, 50, 0.003, 0.075, 'direct', { runId: '123' });
    expect(r.provider).toBe('anthropic');
    expect(r.model).toBe('claude-sonnet-4');
    expect(r.totalTokens).toBe(150);
    expect(r.totalCost).toBeCloseTo(0.078, 5);
    expect(r.runId).toBe('123');
    expect(r.timestamp).toBeTruthy();
  });
});

describe('buildReport', () => {
  it('produces a complete report with budget status', () => {
    const records = [makeRecord(0.75)];
    const report = buildReport(records, 0.50);
    expect(report.totalCost).toBeCloseTo(0.75, 5);
    expect(report.budgetStatus.budgetExceeded).toBe(true);
    expect(report.generatedAt).toBeTruthy();
  });

  it('report with no budget has null remaining', () => {
    const records = [makeRecord(0.10)];
    const report = buildReport(records, null);
    expect(report.budgetStatus.budgetRemaining).toBeNull();
    expect(report.budgetStatus.budgetExceeded).toBe(false);
  });
});

describe('formatCostSummary', () => {
  it('includes total cost', () => {
    const report = buildReport([makeRecord(0.05)], null);
    const summary = formatCostSummary(report);
    expect(summary).toContain('Total cost:');
  });

  it('includes budget info when limit set', () => {
    const report = buildReport([makeRecord(0.80)], 0.50);
    const summary = formatCostSummary(report);
    expect(summary).toContain('Budget exceeded');
  });
});
