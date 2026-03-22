import { formatUSD } from './pricing';

export interface CostRecord {
  timestamp: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  runId?: string;
  workflowName?: string;
  jobName?: string;
  prNumber?: number;
  source: string;
}

export interface BudgetStatus {
  budgetLimit: number | null;
  runCost: number;
  budgetRemaining: number | null;
  budgetExceeded: boolean;
  overrunAmount: number;
  overrunPercent: number;
}

export interface CostReport {
  records: CostRecord[];
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalInputCost: number;
  totalOutputCost: number;
  totalCost: number;
  budgetStatus: BudgetStatus;
  generatedAt: string;
}

export function buildCostRecord(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  inputCost: number,
  outputCost: number,
  source: string,
  context: {
    runId?: string;
    workflowName?: string;
    jobName?: string;
    prNumber?: number;
  } = {}
): CostRecord {
  return {
    timestamp: new Date().toISOString(),
    provider,
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    source,
    ...context
  };
}

export function computeBudgetStatus(totalCost: number, budgetLimit: number | null): BudgetStatus {
  if (budgetLimit === null) {
    return {
      budgetLimit: null,
      runCost: totalCost,
      budgetRemaining: null,
      budgetExceeded: false,
      overrunAmount: 0,
      overrunPercent: 0
    };
  }

  const budgetRemaining = budgetLimit - totalCost;
  const budgetExceeded = totalCost > budgetLimit;
  const overrunAmount = budgetExceeded ? totalCost - budgetLimit : 0;
  const overrunPercent = budgetLimit > 0 && budgetExceeded
    ? Math.round((overrunAmount / budgetLimit) * 100)
    : 0;

  return {
    budgetLimit,
    runCost: totalCost,
    budgetRemaining,
    budgetExceeded,
    overrunAmount,
    overrunPercent
  };
}

export function aggregateRecords(records: CostRecord[]): Omit<CostReport, 'budgetStatus' | 'generatedAt'> {
  const totalInputTokens = records.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutputTokens = records.reduce((s, r) => s + r.outputTokens, 0);
  const totalInputCost = records.reduce((s, r) => s + r.inputCost, 0);
  const totalOutputCost = records.reduce((s, r) => s + r.outputCost, 0);
  return {
    records,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalInputCost,
    totalOutputCost,
    totalCost: totalInputCost + totalOutputCost
  };
}

export function buildReport(records: CostRecord[], budgetLimit: number | null): CostReport {
  const agg = aggregateRecords(records);
  return {
    ...agg,
    budgetStatus: computeBudgetStatus(agg.totalCost, budgetLimit),
    generatedAt: new Date().toISOString()
  };
}

export function formatCostSummary(report: CostReport): string {
  const { totalInputTokens, totalOutputTokens, totalCost, budgetStatus } = report;
  const lines = [
    `Total tokens: ${(totalInputTokens + totalOutputTokens).toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
    `Total cost: ${formatUSD(totalCost)}`
  ];
  if (budgetStatus.budgetLimit !== null) {
    lines.push(`Budget: ${formatUSD(budgetStatus.budgetLimit)} | Remaining: ${formatUSD(Math.max(0, budgetStatus.budgetRemaining ?? 0))}`);
    if (budgetStatus.budgetExceeded) {
      lines.push(`⚠ Budget exceeded by ${formatUSD(budgetStatus.overrunAmount)} (${budgetStatus.overrunPercent}%)`);
    }
  }
  return lines.join('\n');
}
