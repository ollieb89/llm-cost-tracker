"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCostRecord = buildCostRecord;
exports.computeBudgetStatus = computeBudgetStatus;
exports.aggregateRecords = aggregateRecords;
exports.buildReport = buildReport;
exports.formatCostSummary = formatCostSummary;
const pricing_1 = require("./pricing");
function buildCostRecord(provider, model, inputTokens, outputTokens, inputCost, outputCost, source, context = {}) {
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
function computeBudgetStatus(totalCost, budgetLimit) {
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
function aggregateRecords(records) {
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
function buildReport(records, budgetLimit) {
    const agg = aggregateRecords(records);
    return {
        ...agg,
        budgetStatus: computeBudgetStatus(agg.totalCost, budgetLimit),
        generatedAt: new Date().toISOString()
    };
}
function formatCostSummary(report) {
    const { totalInputTokens, totalOutputTokens, totalCost, budgetStatus } = report;
    const lines = [
        `Total tokens: ${(totalInputTokens + totalOutputTokens).toLocaleString()} (${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out)`,
        `Total cost: ${(0, pricing_1.formatUSD)(totalCost)}`
    ];
    if (budgetStatus.budgetLimit !== null) {
        lines.push(`Budget: ${(0, pricing_1.formatUSD)(budgetStatus.budgetLimit)} | Remaining: ${(0, pricing_1.formatUSD)(Math.max(0, budgetStatus.budgetRemaining ?? 0))}`);
        if (budgetStatus.budgetExceeded) {
            lines.push(`⚠ Budget exceeded by ${(0, pricing_1.formatUSD)(budgetStatus.overrunAmount)} (${budgetStatus.overrunPercent}%)`);
        }
    }
    return lines.join('\n');
}
