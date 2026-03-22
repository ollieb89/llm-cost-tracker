import * as core from '@actions/core';
import * as github from '@actions/github';
import * as fs from 'fs';
import * as path from 'path';
import { lookupPricing, calculateCost } from './pricing';
import { parseLogContent, validateTokens } from './parser';
import { buildCostRecord, buildReport, CostRecord } from './tracker';
import { formatMarkdownReport, formatJobSummary, formatTextSummary, recordsToCSV } from './reporter';

async function run(): Promise<void> {
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
    const records: CostRecord[] = [];
    const context = github.context;

    const runContext = {
      runId: String(context.runId || ''),
      workflowName: context.workflow || undefined,
      jobName: context.job || undefined,
      prNumber: context.payload.pull_request?.number as number | undefined
    };

    // Mode 1: Direct token inputs
    if (provider && model && inputTokensRaw && outputTokensRaw) {
      const inputTokens = parseInt(inputTokensRaw, 10);
      const outputTokens = parseInt(outputTokensRaw, 10);

      const validationError = validateTokens(inputTokens, outputTokens);
      if (validationError) {
        core.warning('Token validation: ' + validationError);
      }

      const pricing = lookupPricing(provider, model);
      if (!pricing) {
        core.setFailed('Unknown provider/model combination: ' + provider + '/' + model + '. Check the pricing table in the README.');
        return;
      }

      const { inputCost, outputCost } = calculateCost(pricing, inputTokens, outputTokens);
      records.push(buildCostRecord(provider, pricing.model, inputTokens, outputTokens, inputCost, outputCost, 'direct-input', runContext));
    }

    // Mode 2: Log file scanning
    if (logFile) {
      const logPath = path.resolve(logFile);
      if (!fs.existsSync(logPath)) {
        core.warning('Log file not found: ' + logPath);
      } else {
        const content = fs.readFileSync(logPath, 'utf8');
        const parsed = parseLogContent(content);
        for (const usage of parsed) {
          const pricing = lookupPricing(usage.provider, usage.model);
          if (!pricing) continue;
          const { inputCost, outputCost } = calculateCost(pricing, usage.inputTokens, usage.outputTokens);
          records.push(buildCostRecord(usage.provider, pricing.model, usage.inputTokens, usage.outputTokens, inputCost, outputCost, usage.source, runContext));
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

    const report = buildReport(records, budgetLimit);
    const { budgetStatus } = report;

    // Outputs
    core.setOutput('cost-usd', report.totalCost.toFixed(8));
    core.setOutput('total-tokens', String(report.totalTokens));
    core.setOutput('budget-remaining', budgetStatus.budgetRemaining !== null ? budgetStatus.budgetRemaining.toFixed(8) : '');
    core.setOutput('budget-exceeded', String(budgetStatus.budgetExceeded));

    // Job summary
    core.summary.addRaw(formatJobSummary(report)).write();

    // Text summary to log
    core.info('\n' + formatTextSummary(report));

    // Artifact output
    if (outputFile) {
      const outPath = path.resolve(outputFile);
      const ext = path.extname(outPath).toLowerCase();
      const content = ext === '.csv' ? recordsToCSV(records) : JSON.stringify(report, null, 2);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content);
      core.info('Cost data written to ' + outPath);
    }

    // PR comment
    if (postComment && token && context.payload.pull_request) {
      const octokit = github.getOctokit(token);
      const body = formatMarkdownReport(report, context.workflow);
      await octokit.rest.issues.createComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.payload.pull_request.number as number,
        body
      });
    }

    // Budget enforcement
    if (budgetStatus.budgetExceeded) {
      const msg = 'LLM budget exceeded: spent ' + report.totalCost.toFixed(6) + ' USD, limit ' + (budgetLimit ?? 0) + ' USD (overrun: +' + budgetStatus.overrunAmount.toFixed(6) + ' USD, ' + budgetStatus.overrunPercent + '% over)';
      if (onBudgetExceeded === 'fail') {
        core.setFailed(msg);
      } else if (onBudgetExceeded === 'warn' || onBudgetExceeded === 'comment') {
        core.warning(msg);
      }
    }
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
