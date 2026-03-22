# llm-cost-tracker — Spec

## What
GitHub Action that tracks AI/LLM API costs in CI pipelines and alerts on budget overruns.

## Problem
Teams using AI in CI (code review, test generation, PR summaries) have zero visibility into spend. There are NO GitHub Actions for this — only runtime platforms (LiteLLM, Helicone, AgentOps). Complete whitespace in the Actions marketplace.

## Features (MVP v1.0.0)
1. **Cost Parsing** — parse LLM API response metadata (tokens in/out, model) from logs or direct input
2. **Provider Support** — OpenAI, Anthropic, Google Gemini, Cohere (pricing tables built-in, auto-updated)
3. **Budget Thresholds** — set per-run and per-month budget limits, alert/fail on overrun
4. **PR Comment Report** — posts cost breakdown as PR comment (model, tokens, cost, cumulative)
5. **Cost Tracking** — write cost records to a JSON artifact for trend analysis
6. **Workflow Summary** — GitHub Actions job summary with cost table
7. **Configurable Actions** — warn | fail | comment on budget breach

## Architecture
- TypeScript GitHub Action
- Built-in pricing tables for all major providers (no external API needed)
- Inputs: provider, model, input-tokens, output-tokens, budget-limit, currency
- Outputs: cost-usd, total-tokens, budget-remaining, budget-exceeded
- Also supports log-file input mode (scans CI logs for OpenAI/Anthropic response payloads)

## Pricing Table (as of v1.0.0)
### OpenAI
- gpt-4o: $2.50/1M in, $10.00/1M out
- gpt-4o-mini: $0.15/1M in, $0.60/1M out
- o1: $15.00/1M in, $60.00/1M out

### Anthropic
- claude-opus-4: $15.00/1M in, $75.00/1M out
- claude-sonnet-4: $3.00/1M in, $15.00/1M out
- claude-haiku-4: $0.80/1M in, $4.00/1M out

### Google
- gemini-2.5-pro: $1.25/1M in, $10.00/1M out
- gemini-2.5-flash: $0.075/1M in, $0.30/1M out

## Config Example
```yaml
- uses: ollieb89/llm-cost-tracker@v1
  with:
    provider: openai
    model: gpt-4o
    input-tokens: ${{ steps.ai-review.outputs.input-tokens }}
    output-tokens: ${{ steps.ai-review.outputs.output-tokens }}
    budget-limit: '0.50'  # USD per run
    on-budget-exceeded: warn  # warn | fail | comment
    post-comment: true
```

## Deliverables
- action.yml
- src/ (TypeScript): index.ts, pricing.ts, tracker.ts, reporter.ts, parser.ts
- tests/ (Jest, 25+ tests)
- README.md with badges, usage, pricing table, config reference
- LICENSE (MIT, ollieb89)
- .github/workflows/ci.yml
- Tag v1.0.0, GitHub Release

## SEO Topics
llm, cost-tracking, github-actions, openai, anthropic, ai-budget, ci-cd, developer-tools, monitoring, cost-management
