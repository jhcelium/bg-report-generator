# Neoidigital Due Diligence Report Generator

AI-powered company due diligence tool. Enter a company name, pay $79 via Stripe, and get a professional business partner due diligence report in minutes.

**Live:** https://duediligence.neoidigital.com

## Features

- **Stripe payment** — $79 per report, secure checkout via Stripe
- **Real-time web search** — Uses Claude API + web search for live data
- **Dual theme** — Dark professional / Light clean, one-click switch
- **10-section report** — Executive Summary, Company Profile, Key People, Digital Footprint, Financial Signals, Supply Chain, Risk Assessment (Admiralty Code), ACH Analysis, Cross-Analysis, Action Plan
- **Export** — Print to PDF or download as standalone HTML

## Quick Start

1. Copy `.env.example` to `.env` and fill in your keys:
   ```bash
   cp .env.example .env
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Open http://localhost:3000 in your browser

## Environment Variables

| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (`sk-ant-api03-...`) |
| `PORT` | Server port (default: 3000) |
| `BASE_URL` | Public URL for Stripe redirects (default: http://localhost:3000) |

## Stripe Webhook Setup

For production, set up the Stripe webhook to receive payment events:

```bash
# Using Stripe CLI for local development
stripe listen --forward-to localhost:3000/webhook
```

In the Stripe Dashboard, add the webhook endpoint: `https://duediligence.neoidigital.com/webhook`

## Tech Stack

- Node.js + Express
- Stripe Checkout
- Claude Sonnet 4.6 (`claude-sonnet-4-6`)
- Web Search API (`web_search_20260209`)
- Single-file HTML/CSS/JS frontend

## File Structure

```
index.html      # Frontend — form, payment flow, report renderer
server.js       # Backend — Stripe checkout, payment verification, Claude API
package.json    # Dependencies
.env.example    # Environment variable template
.gitignore      # Ignore node_modules and .env
```

## License

MIT

---

Built by [Neoidigital](https://www.japan-market.neoidigital.com/)
