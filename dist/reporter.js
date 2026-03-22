"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatMarkdownReport = formatMarkdownReport;
exports.formatJobSummary = formatJobSummary;
exports.formatTextSummary = formatTextSummary;
exports.recordsToCSV = recordsToCSV;
const pricing_1 = require("./pricing");
function formatMarkdownReport(report, workflowName) {
    const { records, totalInputTokens, totalOutputTokens, totalCost, budgetStatus } = report;
    const lines = [];
    lines.push('## 💰 LLM Cost Tracker Report');
    lines.push('');
    if (workflowName)
        lines.push(`**Workflow:** ${workflowName}  `);
    lines.push(`**Generated:** ${new Date(report.generatedAt).toUTCString()}`);
    lines.push('');
    lines.push('### 📊 Summary');
    lines.push('');
    lines.push('| Metric | Value |');
    lines.push('|--------|-------|');
    lines.push(`| Total Cost | **${(0, pricing_1.formatUSD)(totalCost)}** |`);
    lines.push(`| Input Tokens | ${totalInputTokens.toLocaleString()} |`);
    lines.push(`| Output Tokens | ${totalOutputTokens.toLocaleString()} |`);
    lines.push(`| Total Tokens | ${(totalInputTokens + totalOutputTokens).toLocaleString()} |`);
    if (budgetStatus.budgetLimit !== null) {
        lines.push(`| Budget Limit | ${(0, pricing_1.formatUSD)(budgetStatus.budgetLimit)} |`);
        lines.push(`| Budget Remaining | ${(0, pricing_1.formatUSD)(Math.max(0, budgetStatus.budgetRemaining ?? 0))} |`);
        lines.push(`| Status | ${budgetStatus.budgetExceeded ? '🔴 **EXCEEDED**' : '🟢 OK'} |`);
    }
    lines.push('');
    if (records.length > 0) {
        lines.push('### 🤖 Model Breakdown');
        lines.push('');
        lines.push('| Provider | Model | Input Tokens | Output Tokens | Cost |');
        lines.push('|----------|-------|-------------|--------------|------|');
        for (const r of records) {
            lines.push(`| ${r.provider} | ${r.model} | ${r.inputTokens.toLocaleString()} | ${r.outputTokens.toLocaleString()} | ${(0, pricing_1.formatUSD)(r.totalCost)} |`);
        }
        lines.push('');
    }
    if (budgetStatus.budgetExceeded) {
        lines.push('### ⚠️ Budget Exceeded');
        lines.push('');
        lines.push(`This run cost **${(0, pricing_1.formatUSD)(totalCost)}**, exceeding the budget of **${(0, pricing_1.formatUSD)(budgetStatus.budgetLimit ?? 0)}** by **${(0, pricing_1.formatUSD)(budgetStatus.overrunAmount)}** (${budgetStatus.overrunPercent}% over).`);
        lines.push('');
        lines.push('**Suggestions:**');
        lines.push('- Switch to a smaller/cheaper model for this workflow');
        lines.push('- Reduce context window size or output token limits');
        lines.push('- Cache results where possible');
        lines.push('');
    }
    else if (budgetStatus.budgetLimit !== null) {
        lines.push('### ✅ Within Budget');
        lines.push('');
        lines.push(`This run cost **${(0, pricing_1.formatUSD)(totalCost)}** of **${(0, pricing_1.formatUSD)(budgetStatus.budgetLimit)}** budget.`);
        lines.push('');
    }
    lines.push('---');
    lines.push('*Powered by [llm-cost-tracker](https://github.com/ollieb89/llm-cost-tracker)*');
    return lines.join('\n');
}
function formatJobSummary(report) {
    return formatMarkdownReport(report);
}
function formatTextSummary(report) {
    const lines = [
        'LLM Cost Tracker',
        '================',
        `Total cost:    ${(0, pricing_1.formatUSD)(report.totalCost)}`,
        `Input tokens:  ${report.totalInputTokens.toLocaleString()}`,
        `Output tokens: ${report.totalOutputTokens.toLocaleString()}`,
        `Total tokens:  ${report.totalTokens.toLocaleString()}`
    ];
    if (report.budgetStatus.budgetLimit !== null) {
        lines.push(`Budget limit:  ${(0, pricing_1.formatUSD)(report.budgetStatus.budgetLimit)}`);
        lines.push(`Budget left:   ${(0, pricing_1.formatUSD)(Math.max(0, report.budgetStatus.budgetRemaining ?? 0))}`);
        lines.push(`Status:        ${report.budgetStatus.budgetExceeded ? 'EXCEEDED' : 'OK'}`);
    }
    if (report.records.length > 0) {
        lines.push('');
        lines.push('Models used:');
        for (const r of report.records) {
            lines.push(`  ${r.provider}/${r.model}: ${(r.inputTokens + r.outputTokens).toLocaleString()} tokens = ${(0, pricing_1.formatUSD)(r.totalCost)}`);
        }
    }
    return lines.join('\n');
}
function recordsToCSV(records) {
    const header = 'timestamp,provider,model,input_tokens,output_tokens,total_tokens,input_cost_usd,output_cost_usd,total_cost_usd,source';
    const rows = records.map(r => [r.timestamp, r.provider, r.model, r.inputTokens, r.outputTokens, r.totalTokens,
        r.inputCost.toFixed(8), r.outputCost.toFixed(8), r.totalCost.toFixed(8), r.source].join(','));
    return [header, ...rows].join('\n');
}
