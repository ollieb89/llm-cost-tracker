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
export declare function buildCostRecord(provider: string, model: string, inputTokens: number, outputTokens: number, inputCost: number, outputCost: number, source: string, context?: {
    runId?: string;
    workflowName?: string;
    jobName?: string;
    prNumber?: number;
}): CostRecord;
export declare function computeBudgetStatus(totalCost: number, budgetLimit: number | null): BudgetStatus;
export declare function aggregateRecords(records: CostRecord[]): Omit<CostReport, 'budgetStatus' | 'generatedAt'>;
export declare function buildReport(records: CostRecord[], budgetLimit: number | null): CostReport;
export declare function formatCostSummary(report: CostReport): string;
