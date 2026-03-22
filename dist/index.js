"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pricing_1 = require("./pricing");
const parser_1 = require("./parser");
const tracker_1 = require("./tracker");
const reporter_1 = require("./reporter");
async function run() {
    try {
        // Inputs
        const provider = core.getInput('provider').toLowerCase().trim();
        const model = core.getInput('model').toLowerCase().trim();
        const inputTokensRaw = core.getInput('input-tokens');
        const outputTokensRaw = core.getInput('output-tokens');
        const budgetLimitRaw = core.getInput('budget-limit');
        const onBudgetExceeded = core.getInput('on-budget-exceeded') || 'warn';
        const postComment = core.getBooleanInput('post-comment');
        const logFile = core.getInput('log-file');
        const outputFile = core.getInput('output-file');
        const token = core.getInput('github-token');
        const budgetLimit = budgetLimitRaw ? parseFloat(budgetLimitRaw) : null;
        const records = [];
        const context = github.context;
        const runContext = {
            runId: String(context.runId || ''),
            workflowName: context.workflow || undefined,
            jobName: context.job || undefined,
            prNumber: context.payload.pull_request?.number
        };
        // Mode 1: Direct token inputs
        if (provider && model && inputTokensRaw && outputTokensRaw) {
            const inputTokens = parseInt(inputTokensRaw, 10);
            const outputTokens = parseInt(outputTokensRaw, 10);
            const validationError = (0, parser_1.validateTokens)(inputTokens, outputTokens);
            if (validationError) {
                core.warning('Token validation: ' + validationError);
            }
            const pricing = (0, pricing_1.lookupPricing)(provider, model);
            if (!pricing) {
                core.setFailed('Unknown provider/model combination: ' + provider + '/' + model + '. Check the pricing table in the README.');
                return;
            }
            const { inputCost, outputCost } = (0, pricing_1.calculateCost)(pricing, inputTokens, outputTokens);
            records.push((0, tracker_1.buildCostRecord)(provider, pricing.model, inputTokens, outputTokens, inputCost, outputCost, 'direct-input', runContext));
        }
        // Mode 2: Log file scanning
        if (logFile) {
            const logPath = path.resolve(logFile);
            if (!fs.existsSync(logPath)) {
                core.warning('Log file not found: ' + logPath);
            }
            else {
                const content = fs.readFileSync(logPath, 'utf8');
                const parsed = (0, parser_1.parseLogContent)(content);
                for (const usage of parsed) {
                    const pricing = (0, pricing_1.lookupPricing)(usage.provider, usage.model);
                    if (!pricing)
                        continue;
                    const { inputCost, outputCost } = (0, pricing_1.calculateCost)(pricing, usage.inputTokens, usage.outputTokens);
                    records.push((0, tracker_1.buildCostRecord)(usage.provider, pricing.model, usage.inputTokens, usage.outputTokens, inputCost, outputCost, usage.source, runContext));
                }
                core.info('Parsed ' + parsed.length + ' LLM usage record(s) from log file');
            }
        }
        if (records.length === 0) {
            core.warning('No LLM usage records found. Provide provider+model+tokens or a log-file input.');
            core.setOutput('cost-usd', '0');
            core.setOutput('total-tokens', '0');
            core.setOutput('budget-remaining', budgetLimit !== null ? String(budgetLimit) : '');
            core.setOutput('budget-exceeded', 'false');
            return;
        }
        const report = (0, tracker_1.buildReport)(records, budgetLimit);
        const { budgetStatus } = report;
        // Outputs
        core.setOutput('cost-usd', report.totalCost.toFixed(8));
        core.setOutput('total-tokens', String(report.totalTokens));
        core.setOutput('budget-remaining', budgetStatus.budgetRemaining !== null ? budgetStatus.budgetRemaining.toFixed(8) : '');
        core.setOutput('budget-exceeded', String(budgetStatus.budgetExceeded));
        // Job summary
        core.summary.addRaw((0, reporter_1.formatJobSummary)(report)).write();
        // Text summary to log
        core.info('\n' + (0, reporter_1.formatTextSummary)(report));
        // Artifact output
        if (outputFile) {
            const outPath = path.resolve(outputFile);
            const ext = path.extname(outPath).toLowerCase();
            const content = ext === '.csv' ? (0, reporter_1.recordsToCSV)(records) : JSON.stringify(report, null, 2);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, content);
            core.info('Cost data written to ' + outPath);
        }
        // PR comment
        if (postComment && token && context.payload.pull_request) {
            const octokit = github.getOctokit(token);
            const body = (0, reporter_1.formatMarkdownReport)(report, context.workflow);
            await octokit.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body
            });
        }
        // Budget enforcement
        if (budgetStatus.budgetExceeded) {
            const msg = 'LLM budget exceeded: spent ' + report.totalCost.toFixed(6) + ' USD, limit ' + (budgetLimit ?? 0) + ' USD (overrun: +' + budgetStatus.overrunAmount.toFixed(6) + ' USD, ' + budgetStatus.overrunPercent + '% over)';
            if (onBudgetExceeded === 'fail') {
                core.setFailed(msg);
            }
            else if (onBudgetExceeded === 'warn' || onBudgetExceeded === 'comment') {
                core.warning(msg);
            }
        }
    }
    catch (error) {
        core.setFailed(error instanceof Error ? error.message : String(error));
    }
}
run();
