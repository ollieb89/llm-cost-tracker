# llm-cost-tracker

[![AI DevOps Actions Suite](https://img.shields.io/badge/AI%20DevOps%20Actions-Suite-blue?logo=github)](https://github.com/ollieb89/ai-devops-actions)

[![CI](https://github.com/ollieb89/llm-cost-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/ollieb89/llm-cost-tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/ollieb89/llm-cost-tracker)](https://github.com/ollieb89/llm-cost-tracker/releases)

> **The first GitHub Action for tracking LLM API costs in CI pipelines.**

Teams using AI in CI (code review, test generation, PR summaries) have zero visibility into spend. `llm-cost-tracker` gives you cost breakdowns, budget alerts, PR comment reports, and artifact output — entirely from built-in pricing tables, no external API required.

## Features

- **Cost Calculation** — built-in pricing tables for OpenAI, Anthropic, Google Gemini, and Cohere
- **Budget Alerts** — set per-run budget limits, get warned or fail the build on overrun
- **PR Comment Report** — post a detailed markdown cost breakdown to the PR
- **Log File Scanning** — scan CI logs for OpenAI/Anthropic response payloads automatically
- **Artifact Output** — write cost records as JSON or CSV for trend analysis
- **GitHub Job Summary** — cost table written to the Actions job summary
- **No external APIs** — all pricing built in, works offline

## Quick Start

### Direct token input

```yaml
- name: Track LLM costs
  uses: ollieb89/llm-cost-tracker@v1
  with:
    provider: openai
    model: gpt-4o
    input-tokens: ${{ steps.ai-review.outputs.input-tokens }}
    output-tokens: ${{ steps.ai-review.outputs.output-tokens }}
    budget-limit: '0.50'
    on-budget-exceeded: warn
```

### Log file scanning

```yaml
- name: Track LLM costs from logs
  uses: ollieb89/llm-cost-tracker@v1
  with:
    log-file: ci-output.log
    budget-limit: '1.00'
    on-budget-exceeded: fail
```

### Full example with PR comment

```yaml
- name: Track LLM costs
  uses: ollieb89/llm-cost-tracker@v1
  with:
    provider: anthropic
    model: claude-sonnet-4
    input-tokens: '15000'
    output-tokens: '4000'
    budget-limit: '0.50'
    on-budget-exceeded: warn
    post-comment: true
    output-file: cost-report.json
    github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Inputs

| Input | Description | Default |
|-------|-------------|---------|
| `provider` | LLM provider: `openai`, `anthropic`, `google`, `cohere` | — |
| `model` | Model name (see pricing table below) | — |
| `input-tokens` | Number of input/prompt tokens | — |
| `output-tokens` | Number of output/completion tokens | — |
| `budget-limit` | Budget limit in USD. Triggers alert if exceeded. | — |
| `on-budget-exceeded` | `warn`, `fail`, or `comment` | `warn` |
| `post-comment` | Post cost report as PR comment | `false` |
| `log-file` | Path to CI log to scan for LLM usage | — |
| `output-file` | Path to write JSON or CSV cost artifact | — |
| `github-token` | GitHub token (required for PR comments) | `${{ github.token }}` |

## Outputs

| Output | Description |
|--------|-------------|
| `cost-usd` | Total cost in USD for this run |
| `total-tokens` | Total tokens consumed |
| `budget-remaining` | Remaining budget in USD |
| `budget-exceeded` | `true` / `false` |

## Pricing Table

### OpenAI
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `gpt-4o` | $2.50 | $10.00 |
| `gpt-4o-mini` | $0.15 | $0.60 |
| `o1` | $15.00 | $60.00 |
| `o1-mini` | $3.00 | $12.00 |
| `gpt-4-turbo` | $10.00 | $30.00 |
| `gpt-3.5-turbo` | $0.50 | $1.50 |

### Anthropic
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `claude-opus-4` | $15.00 | $75.00 |
| `claude-sonnet-4` | $3.00 | $15.00 |
| `claude-haiku-4` | $0.80 | $4.00 |
| `claude-3-opus` | $15.00 | $75.00 |
| `claude-3-sonnet` | $3.00 | $15.00 |
| `claude-3-haiku` | $0.25 | $1.25 |

### Google
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `gemini-2.5-pro` | $1.25 | $10.00 |
| `gemini-2.5-flash` | $0.075 | $0.30 |
| `gemini-1.5-pro` | $1.25 | $5.00 |
| `gemini-1.5-flash` | $0.075 | $0.30 |

### Cohere
| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| `command-r-plus` | $2.50 | $10.00 |
| `command-r` | $0.15 | $0.60 |
| `command` | $1.00 | $2.00 |

*Aliases supported: `gpt4o`, `sonnet`, `haiku`, `opus`, `gemini-flash`, etc.*

## Example PR Comment

```
## 💰 LLM Cost Tracker Report

| Metric | Value |
|--------|-------|
| Total Cost | $0.0675 |
| Input Tokens | 15,000 |
| Output Tokens | 4,000 |
| Total Tokens | 19,000 |
| Budget Limit | $0.50 |
| Budget Remaining | $0.4325 |
| Status | 🟢 OK |

### 🤖 Model Breakdown

| Provider | Model | Input Tokens | Output Tokens | Cost |
|----------|-------|-------------|--------------|------|
| anthropic | claude-sonnet-4 | 15,000 | 4,000 | $0.0675 |
```

## Combine with other actions

```yaml
- uses: ollieb89/ai-code-reviewer@v1
  id: review
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}

- uses: ollieb89/llm-cost-tracker@v1
  with:
    provider: openai
    model: gpt-4o
    input-tokens: ${{ steps.review.outputs.input-tokens }}
    output-tokens: ${{ steps.review.outputs.output-tokens }}
    budget-limit: '0.10'
    on-budget-exceeded: warn
```

## Tests

```bash
npm test
```

54 tests covering pricing calculations, budget logic, log parsing, report formatting, and CSV output.

## License

MIT — see [LICENSE](LICENSE)


---
## Part of the AI DevOps Actions suite

This action is one of five tools that form the **[AI DevOps Actions](https://github.com/ollieb89/ai-devops-actions)** suite — the CI/CD layer for AI-native development.

| Action | Purpose |
|--------|---------|
| [ai-pr-guardian](https://github.com/ollieb89/ai-pr-guardian) | Gate low-quality and AI-generated PRs |
| [llm-cost-tracker](https://github.com/ollieb89/llm-cost-tracker) | Track AI API costs in CI, alert on overruns |
| [mcp-server-tester](https://github.com/ollieb89/mcp-server-tester) | Validate MCP servers: health, compliance, discovery |
| [actions-lockfile-generator](https://github.com/ollieb89/actions-lockfile-generator) | Pin Actions to SHA, prevent supply chain attacks |
| [agent-skill-validator](https://github.com/ollieb89/agent-skill-validator) | Lint and validate agent skill repos |

→ [View the full suite and pipeline example](https://github.com/ollieb89/ai-devops-actions)
