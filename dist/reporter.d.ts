import { CostReport, CostRecord } from './tracker';
export declare function formatMarkdownReport(report: CostReport, workflowName?: string): string;
export declare function formatJobSummary(report: CostReport): string;
export declare function formatTextSummary(report: CostReport): string;
export declare function recordsToCSV(records: CostRecord[]): string;
