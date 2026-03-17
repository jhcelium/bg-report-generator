require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

// Stripe webhook needs raw body — must be registered BEFORE express.json()
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`Payment completed: session=${session.id}, amount=${session.amount_total}, email=${session.customer_email}`);
  }

  res.json({ received: true });
});

app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ── Stripe Checkout ──────────────────────────────────────────────────────────

app.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env' });
    const { companyName } = req.body;
    if (!companyName) return res.status(400).json({ error: 'companyName is required' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Company Due Diligence Report',
            description: `Professional due diligence report for: ${companyName}`,
          },
          unit_amount: 7900,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${BASE_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/?cancelled=true`,
      metadata: { companyName },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe session error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Report Generation (SSE) ─────────────────────────────────────────────────

app.post('/generate-report', async (req, res) => {
  const { sessionId, companyName, companyUrl, companyCountry, companyIndustry, companyContext, companyExtra } = req.body;

  if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });
  if (!companyName) return res.status(400).json({ error: 'companyName is required' });

  // Verify Stripe payment
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured. Set STRIPE_SECRET_KEY in .env' });
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error('Stripe verification error:', err);
    return res.status(400).json({ error: 'Invalid session' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (type, data) => {
    res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
  };

  const today = new Date().toISOString().split('T')[0];
  const inputSummary = `Company: ${companyName} | Website: ${companyUrl || '?'} | Country: ${companyCountry || '?'} | Industry: ${companyIndustry || '?'} | Purpose: ${companyContext || 'Business partnership evaluation'} | Notes: ${companyExtra || 'none'}`;

  try {
    // ── Phase 1: Research ─────────────────────────────────────────────────
    sendEvent('progress', { message: 'Phase 1/3: Researching company (web search enabled)...', percent: 10 });

    const research = await callClaude([{
      role: "user",
      content: `Conduct a comprehensive background investigation on: ${inputSummary}

Use web search for latest real-time data. Search: official website, LinkedIn, Trustpilot, BBB, Glassdoor, Google Reviews, Amazon, Crunchbase, PitchBook, social media, business registries.

Return JSON (concise values, max 50 words each):
{
  "company": {
    "legal_name": null, "dba": null, "related_entities": [], "registration_country": null,
    "hq_address": null, "founded_year": null, "domain": null, "domain_age": null,
    "employees": null, "founder_ceo": null, "revenue_estimate": null,
    "revenue_tier": null, "funding": null, "industry": null, "business_model": null,
    "market_coverage": null, "tech_stack": [], "brands": [], "certifications": null, "phone": null
  },
  "kpis": {"revenue": null, "funding": null, "employees": null, "years": null, "open_positions": null, "rating": null},
  "key_people": [{"name": null, "title": null, "email": null, "location": null, "background": null, "priority": "P1", "approach_tip": null}],
  "email_format": null,
  "org_insight": null,
  "decision_path": null,
  "social_media": [{"platform": null, "data": null, "status": null}],
  "review_platforms": [{"platform": null, "rating": null, "count": null, "positive": null, "negative": null}],
  "domain_whois": {"domain": null, "registered": null, "expires": null, "registrar": null},
  "structural_weakness": null,
  "funding_rounds": [{"round": null, "date": null, "amount": null, "investors": null}],
  "revenue_sources": [{"source": null, "data": null, "reliability": null, "assessment": null}],
  "supply_chain": {"entities": [{"name": null, "location": null, "role": null}], "assessment": null},
  "legal_issues": [{"case": null, "type": null, "significance": null}],
  "financial_health": null
}`
    }], 4096, true);

    sendEvent('progress', { message: 'Phase 1/3: Research complete', percent: 50 });

    const researchShort = research.substring(0, 3000);

    // ── Phase 2: Risk Assessment ──────────────────────────────────────────
    sendEvent('progress', { message: 'Phase 2/3: Risk assessment in progress...', percent: 55 });

    const riskAssessment = await callClaude([{
      role: "user",
      content: `Perform risk assessment based on research data. Company: ${companyName} | Purpose: ${companyContext || 'Business partnership evaluation'}

Research data (summary):
${researchShort}

Return JSON (concise values, max 30 words each):
{
  "executive_summary": {
    "conclusion": "Core conclusion",
    "risk_level": "low or medium or high",
    "risk_label": "Risk recommendation label",
    "recommendation": "One-line recommendation",
    "key_findings": [{"num": "01", "text": "Finding", "type": "positive or warning or critical"}]
  },
  "admiralty_assessment": [{"item": "Item", "content": "Content", "source": "Source", "reliability": "A-F", "credibility": "1-6", "meaning": "Meaning", "signal": "ok or warn or bad"}],
  "ach_analysis": [{"hypothesis": "Hypothesis", "probability": "70%", "class": "primary or secondary or tertiary", "description": "Description"}],
  "ach_conclusion": "Final judgment",
  "cross_analysis": [{"num": "01", "title": "Title", "body": "Description", "signal": "red or yellow or green", "opportunity_or_risk": "opportunity or risk", "actionable": "Recommendation"}],
  "strategic_insight": "Strategic summary"
}`
    }], 4096, false);

    sendEvent('progress', { message: 'Phase 2/3: Risk assessment complete', percent: 70 });

    // ── Phase 3: Action Plan ──────────────────────────────────────────────
    sendEvent('progress', { message: 'Phase 3/3: Generating action plan...', percent: 75 });

    const actionPlan = await callClaude([{
      role: "user",
      content: `Generate partnership action plan. Company: ${companyName} | Purpose: ${companyContext || 'Business partnership evaluation'}

Research data (summary):
${researchShort}

Return JSON (concise values):
{
  "action_plan": {
    "contact_strategy": [{"priority": "P1", "person": "Name", "email": "Email", "scenario": "Scenario", "approach": "Approach"}],
    "contract_notes": ["Note 1", "Note 2"],
    "must_haves": ["Must-have 1", "Must-have 2"],
    "risk_mitigation": ["Mitigation 1", "Mitigation 2"],
    "verification_checklist": ["Verify 1", "Verify 2"]
  },
  "data_sources": [{"name": "Source", "url": "URL", "date": "${today}"}]
}`
    }], 2048, false);

    sendEvent('progress', { message: 'Phase 3/3: Action plan complete', percent: 90 });

    // ── Merge & Return ────────────────────────────────────────────────────
    sendEvent('progress', { message: 'Rendering report...', percent: 95 });

    const rd = safeParseJSON(research);
    const rkd = safeParseJSON(riskAssessment);
    const acd = safeParseJSON(actionPlan);
    const sd = { ...rkd, ...acd };

    const reportData = {
      profile: { company: rd.company || rd, kpis: rd.kpis || {} },
      people: { key_people: rd.key_people || [], email_format: rd.email_format, phone: rd.company?.phone, org_insight: rd.org_insight, decision_path: rd.decision_path },
      digital: { social_media: rd.social_media || [], review_platforms: rd.review_platforms || [], domain_whois: rd.domain_whois || {}, complaint_analysis: { structural_weakness: rd.structural_weakness } },
      financial: { funding_rounds: rd.funding_rounds || [], revenue_sources: rd.revenue_sources || [], revenue_conclusion: rd.financial_health, supply_chain: rd.supply_chain || {}, legal_issues: rd.legal_issues || [], financial_health: rd.financial_health },
      synthesis: sd,
    };

    sendEvent('complete', { report: reportData, companyName, date: today });
    res.end();

  } catch (err) {
    console.error('Report generation error:', err);
    sendEvent('error', { message: err.message });
    res.end();
  }
});

// ── Claude API helper ────────────────────────────────────────────────────────

async function callClaude(messages, maxTokens = 4096, useSearch = false) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    system: "You are a professional business intelligence analyst. Output only valid JSON. No ```markdown fences. No explanatory text before or after. Escape quotes in string values with \\\". No trailing commas. Use null for unknown fields. Use web search for latest real-time data. Keep all string values concise, max 50 words each.",
    messages,
  };

  if (useSearch) {
    body.tools = [{ type: "web_search_20260209", name: "web_search" }];
  }

  const startTime = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Claude API call completed in ${elapsed}s (search: ${useSearch})`);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${errText.substring(0, 300)}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));

  const textParts = (data.content || [])
    .filter(item => item.type === "text")
    .map(item => item.text);
  return textParts.join("\n");
}

// ── JSON parser (ported from frontend) ───────────────────────────────────────

function safeParseJSON(text) {
  if (!text || typeof text !== 'string') return { _raw: String(text) };

  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```[\s\S]*?\n/i, '').replace(/\n?\s*```\s*$/i, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return { _raw: text };
  cleaned = cleaned.substring(start, end + 1);

  try { return JSON.parse(cleaned); } catch (e) { /* continue */ }

  let repaired = cleaned;
  repaired = repaired.replace(/\/\/[^\n]*/g, '');
  repaired = repaired.replace(/\/\*[\s\S]*?\*\//g, '');
  repaired = repaired.replace(/,\s*([\]}])/g, '$1');
  repaired = repaired.replace(/}\s*{/g, '},{');
  repaired = repaired.replace(/}\s*"/g, '}, "');
  repaired = repaired.replace(/]\s*"/g, '], "');
  repaired = repaired.replace(/:\s*'([^']*)'/g, ': "$1"');
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');

  try { return JSON.parse(repaired); } catch (e) { /* continue */ }

  let aggressive = repaired;
  aggressive = aggressive.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');

  try { return JSON.parse(aggressive); } catch (e) { /* continue */ }

  const partial = {};
  const kvPattern = /"([^"]+)"\s*:\s*("(?:[^"\\]|\\.)*"|[\d.]+|true|false|null|\[[^\]]*\])/g;
  let match;
  while ((match = kvPattern.exec(cleaned)) !== null) {
    try { partial[match[1]] = JSON.parse(match[2]); } catch { partial[match[1]] = match[2].replace(/^"|"$/g, ''); }
  }

  return Object.keys(partial).length > 0 ? partial : { _raw: text };
}

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
  console.log(`Stripe key: ${process.env.STRIPE_SECRET_KEY ? 'configured' : 'MISSING'}`);
  console.log(`Anthropic key: ${process.env.ANTHROPIC_API_KEY ? 'configured' : 'MISSING'}`);
});
