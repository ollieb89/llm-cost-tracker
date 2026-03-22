"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLogContent = parseLogContent;
exports.validateTokens = validateTokens;
const pricing_1 = require("./pricing");
// OpenAI API response: "usage": {"prompt_tokens": N, "completion_tokens": N, "total_tokens": N}
const OPENAI_USAGE_RE = /"model"\s*:\s*"([^"]+)"[\s\S]{0,500}?"usage"\s*:\s*\{[^}]*"prompt_tokens"\s*:\s*(\d+)[^}]*"completion_tokens"\s*:\s*(\d+)/g;
// Anthropic API response: "usage": {"input_tokens": N, "output_tokens": N}
const ANTHROPIC_USAGE_RE = /"model"\s*:\s*"([^"]+)"[\s\S]{0,500}?"usage"\s*:\s*\{[^}]*"input_tokens"\s*:\s*(\d+)[^}]*"output_tokens"\s*:\s*(\d+)/g;
// Generic: input_tokens/output_tokens/model as plain log lines
const GENERIC_LOG_RE = /(?:model|Model)[=:\s]+"?([a-z0-9._-]+)"?\s*.*?(?:input[_-]tokens|prompt[_-]tokens)[=:\s]+(\d+)\s*.*?(?:output[_-]tokens|completion[_-]tokens)[=:\s]+(\d+)/gi;
function parseLogContent(content) {
    const results = [];
    const seen = new Set();
    // OpenAI responses
    const oaiRe = new RegExp(OPENAI_USAGE_RE.source, 'g');
    let m;
    while ((m = oaiRe.exec(content)) !== null) {
        const key = `openai:${m[1]}:${m[2]}:${m[3]}`;
        if (!seen.has(key)) {
            seen.add(key);
            results.push({
                provider: 'openai',
                model: m[1],
                inputTokens: parseInt(m[2], 10),
                outputTokens: parseInt(m[3], 10),
                source: 'log-openai',
                rawMatch: m[0].slice(0, 120)
            });
        }
    }
    // Anthropic responses
    const antRe = new RegExp(ANTHROPIC_USAGE_RE.source, 'g');
    while ((m = antRe.exec(content)) !== null) {
        const key = `anthropic:${m[1]}:${m[2]}:${m[3]}`;
        if (!seen.has(key)) {
            seen.add(key);
            results.push({
                provider: 'anthropic',
                model: m[1],
                inputTokens: parseInt(m[2], 10),
                outputTokens: parseInt(m[3], 10),
                source: 'log-anthropic',
                rawMatch: m[0].slice(0, 120)
            });
        }
    }
    // Generic log pattern
    const genRe = new RegExp(GENERIC_LOG_RE.source, 'gi');
    while ((m = genRe.exec(content)) !== null) {
        const model = m[1].toLowerCase();
        const inputTokens = parseInt(m[2], 10);
        const outputTokens = parseInt(m[3], 10);
        // Try to infer provider from model name
        let provider = 'unknown';
        if (model.startsWith('gpt') || model.startsWith('o1') || model.startsWith('o3'))
            provider = 'openai';
        else if (model.startsWith('claude'))
            provider = 'anthropic';
        else if (model.startsWith('gemini'))
            provider = 'google';
        else if (model.startsWith('command'))
            provider = 'cohere';
        // Validate it exists in pricing table
        if (provider === 'unknown' || !(0, pricing_1.lookupPricing)(provider, model))
            continue;
        const key = `${provider}:${model}:${inputTokens}:${outputTokens}`;
        if (!seen.has(key)) {
            seen.add(key);
            results.push({ provider, model, inputTokens, outputTokens, source: 'log-generic' });
        }
    }
    return results;
}
function validateTokens(inputTokens, outputTokens) {
    if (!Number.isInteger(inputTokens) || inputTokens < 0)
        return 'input-tokens must be a non-negative integer';
    if (!Number.isInteger(outputTokens) || outputTokens < 0)
        return 'output-tokens must be a non-negative integer';
    if (inputTokens === 0 && outputTokens === 0)
        return 'both input-tokens and output-tokens are zero';
    if (inputTokens > 10000000)
        return 'input-tokens exceeds 10M — verify this is correct';
    if (outputTokens > 2000000)
        return 'output-tokens exceeds 2M — verify this is correct';
    return null;
}
