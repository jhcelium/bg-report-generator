# Neoidigital Background Investigation Report Generator

AI-powered company background investigation tool. Enter a company name → get a professional due diligence report in minutes.

## Features

- **Real-time web search** — Uses Claude API + web search for live data
- **Dual theme** — Dark professional / Light clean, one-click switch
- **10-section report** — Executive Summary, Company Profile, Key People, Digital Footprint, Financial Signals, Supply Chain, Risk Assessment (Admiralty Code), ACH Analysis, Cross-Analysis, Action Plan
- **Single HTML file** — No build step, no dependencies, just open in browser
- **Export** — Print to PDF or download as standalone HTML

## Quick Start

1. Get an [Anthropic API key](https://console.anthropic.com/)
2. Open `index.html` in your browser
3. Paste your API key, enter a company name, click **Start Investigation**
4. Report generates in ~2 minutes

## Cost

~$0.12 per report using Claude Sonnet 4.6 ($3/$15 per MTok + $0.01/search)

| Volume | Monthly Cost |
|--------|-------------|
| 10/mo  | ~$1.2       |
| 100/mo | ~$12        |
| 1000/mo| ~$120       |

## Production Deployment

> ⚠️ The current version calls the Anthropic API directly from the browser. For production use, **set up a backend proxy** to protect your API key.

Example proxy (Node.js):

```javascript
// server.js
app.post('/api/claude', async (req, res) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(req.body)
  });
  const data = await response.json();
  res.json(data);
});
```

Then change the fetch URL in the HTML from `https://api.anthropic.com/v1/messages` to `/api/claude`.

## Tech Stack

- Claude Sonnet 4.6 (`claude-sonnet-4-6`)
- Web Search API (`web_search_20260209`)
- Single-file HTML/CSS/JS (no framework)

## File Structure

```
index.html      # Background investigation report generator
README.md       # This file
```

## License

MIT

---

Built by [Neoidigital](https://neoidigital.com)
