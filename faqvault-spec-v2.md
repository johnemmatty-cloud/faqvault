# FAQVault — Project Spec v2

## Goal

A clean, professional public-facing website where visitors can browse AI-focused FAQ
collections updated automatically every day. Content is generated daily by a Claude
subagent that researches the latest AI news, writes 5 sourced Q&A pairs per topic, and
deploys to GitHub Pages — with zero manual effort after initial setup.

---

## What changed from v1

| Area | v1 | v2 |
|---|---|---|
| Content | Any topic, admin adds manually | AI topics only, generated automatically |
| Content source | Admin edits JSON by hand | Claude subagent researches live AI news |
| Publishing | Manual git push | GitHub Actions runs daily at 8am UTC |
| Category filter | Multi-category | AI sub-topics (Models, Research, Policy, Tools) |
| Admin page | Simple form | Replaced by automated pipeline |

---

## Pages & screens

| Page | Route | Description |
|---|---|---|
| Homepage | `/` | Logo, tagline, 10 most recent AI FAQ collections as cards with sub-topic badges. Category filter bar. |
| FAQ detail | `/faq.html?slug=...` | Full title, sub-topic badge, all 5 Q&A pairs in accordion layout. Source link under every answer. |

> Admin page removed — content is now fully automated via GitHub Actions + Claude API.

---

## Features

**Must-have**

- Claude-designed SVG logo (inline, no image assets)
- Homepage listing 10 most recent FAQ collections
- Sub-topic badges: Models, Research, Policy, Tools, Other
- FAQ detail page with accordion Q&A
- Source citation under every answer
- Clean professional dark/neutral theme
- Fully mobile responsive
- Daily automated content generation via GitHub Actions
- Auto-deploy to GitHub Pages on every content update

**Nice-to-have**

- Filter homepage by AI sub-topic
- "Copy link" button on FAQ detail page
- Smooth accordion animation
- Show publication date on each card

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Markup | Plain HTML | No build step, works on GitHub Pages |
| Styling | Plain CSS with custom properties | Simple, no dependencies |
| Logic | Vanilla JavaScript | Reads JSON, renders content dynamically |
| Data | `data/faqs.json` | Single file, updated by automation |
| Logo | Inline SVG | No image assets needed |
| Hosting | GitHub Pages | Free, static, auto-deploys on push |
| Automation | GitHub Actions + Python | Runs in cloud, no machine needed |
| AI generation | Anthropic API (`claude-sonnet-4-6`) | Generates FAQ content daily |
| Web research | Anthropic API web search tool | Finds latest AI news at generation time |

---

## Automation architecture

```
GitHub Actions (8am UTC daily)
        │
        ▼
generate_faqs.py
        │
        ├── calls Anthropic API (claude-sonnet-4-6)
        │       │
        │       └── searches latest AI news
        │               researches 2 topics
        │               writes 5 Q&As each with sources
        │               returns JSON
        │
        ├── prepends 2 new collections to data/faqs.json
        ├── trims to 50 most recent
        │
        └── git commit + git push
                │
                ▼
        GitHub Pages rebuilds (~60 seconds)
        Site is live with fresh content
```

**Trigger options:**

- Automatic: daily at 8am UTC via cron schedule
- Manual: GitHub Actions → Run workflow button

---

## Subagent definition

File location: `.claude/agents/faqvault-daily-generator.md`

```markdown
---
name: faqvault-daily-generator
description: Researches latest AI news daily, generates 2 AI FAQ pages with
  sourced answers, saves to FAQVault JSON, and deploys to GitHub Pages.
tools: Read, Write, Edit, Bash, WebSearch, WebFetch
model: sonnet
---

Research the 2 most interesting AI topics from the last 24-48 hours.
Good topics: new model releases, research breakthroughs, policy updates,
viral AI tools. Generate 5 Q&As per topic. Include source under every answer.
Save to data/faqs.json, prepend new collections, keep newest 50.
Then: git add data/faqs.json && git commit -m "feat: AI daily update [date]"
&& git push
```

For use with Claude Code locally. The GitHub Actions pipeline uses the same
logic via `generate_faqs.py` — no Claude Code installation needed for daily runs.

---

## GitHub Actions workflow

File location: `.github/workflows/daily-faq.yml`

```yaml
name: Daily AI FAQ Generator

on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - run: pip install anthropic
      - run: python generate_faqs.py
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
      - run: |
          git config user.name "FAQVault Bot"
          git config user.email "bot@faqvault"
          git add data/faqs.json
          git diff --cached --quiet || git commit -m "feat: AI daily FAQ update $(date +%Y-%m-%d)"
          git push
```

**Required GitHub secret:** `ANTHROPIC_API_KEY`
Set at: repo → Settings → Secrets and variables → Actions → New repository secret

---

## Generator script

File location: `generate_faqs.py`

Key behaviour:

- Calls `claude-sonnet-4-6` with a system prompt instructing it to research
  today's top 2 AI topics and return a JSON array of 2 FAQ collections
- Each collection has exactly 5 Q&A pairs
- Every answer ends with `Source: [publication — article title]`
- Strips markdown fences from response before parsing JSON
- Loads `data/faqs.json`, prepends new collections, keeps newest 50, writes back
- Prints a summary of what was generated for the Actions log

**System prompt instructs Claude to:**

- Pick topics from the last 24–48 hours only
- Follow a natural curiosity question pattern per topic:
  Q1 What happened / what is it, Q2 How does it work, Q3 Why does it matter,
  Q4 How does it compare to before, Q5 What are the concerns or limitations
- Never invent sources — only cite real publications
- Return raw JSON only, no markdown wrapping

---

## Data model

All content lives in `data/faqs.json` — a JSON array sorted newest-first,
capped at 50 collections.

```json
[
  {
    "id": "1714900000000",
    "slug": "gpt-5-release-what-changed",
    "title": "GPT-5 Release: What Changed",
    "category": "AI",
    "sub_topic": "Models",
    "created_at": "2026-05-03",
    "faqs": [
      {
        "q": "What is GPT-5 and what was announced?",
        "a": "GPT-5 is OpenAI's latest large language model, announced on May 2026 with significant improvements in reasoning, coding, and multimodal understanding compared to GPT-4o.\n\nSource: The Verge — OpenAI announces GPT-5 with improved reasoning capabilities"
      }
    ]
  }
]
```

**Sub-topic values:** `Models` | `Research` | `Policy` | `Tools` | `Other`

---

## File structure

```
/
├── index.html              ← homepage (logo, cards, filter bar)
├── faq.html                ← FAQ detail page (accordion, sources)
├── css/
│   └── style.css           ← theme, layout, cards, accordion, responsive
├── js/
│   └── main.js             ← homepage: loads JSON, renders cards, filters
│   └── faq.js              ← detail: reads slug from URL, renders accordion
├── data/
│   └── faqs.json           ← all content — updated daily by automation
├── assets/
│   └── logo.svg            ← Claude-designed logo (also inline in HTML)
├── generate_faqs.py        ← daily content generator script
├── .github/
│   └── workflows/
│       └── daily-faq.yml   ← GitHub Actions schedule
└── .claude/
    └── agents/
        └── faqvault-daily-generator.md  ← Claude Code subagent
```

---

## Out of scope

- User registration or login
- Real backend, server, or database
- Comments or user-submitted content
- PHP backend (static-only, GitHub Pages constraint)
- Admin UI (replaced by automation)
- Search engine optimisation
- Analytics
- Dark/light toggle
- Payment or monetisation

---

## Build order

| Session | Files | Est. tokens |
|---|---|---|
| 1 | `faqs.json` sample data (10 AI collections) + `style.css` | 4,000–5,000 |
| 2 | `index.html` + `main.js` + inline logo SVG | 5,000–7,000 |
| 3 | `faq.html` + `faq.js` (accordion + source display) | 6,000–8,000 |
| 4 | `generate_faqs.py` + `daily-faq.yml` + test run | 4,000–6,000 |
| 5 | Polish, mobile fixes, deploy to GitHub Pages | 3,000–5,000 |
| **Total** | | **~22,000–31,000 tokens** |

---

## Token budget notes

- Total estimate fits within **one day's Pro allocation** (44,000 tokens per 5-hour window)
- Build one session per conversation — fresh context = zero history overhead
- The GitHub Actions runner uses Anthropic API tokens separately from your
  Claude Pro plan — budget ~2,000–3,000 API tokens per daily run
- At `claude-sonnet-4-6` pricing, daily generation costs approximately $0.003–0.006 USD
  per day (~$1–2/month) — essentially free

---

## Setup checklist

- [ ] Create GitHub repo and push initial files
- [ ] Enable GitHub Pages (Settings → Pages → main branch)
- [ ] Generate Anthropic API key at console.anthropic.com
- [ ] Add `ANTHROPIC_API_KEY` to repo secrets
- [ ] Push `generate_faqs.py` and `.github/workflows/daily-faq.yml`
- [ ] Trigger first run manually (Actions → Run workflow) to verify
- [ ] Check site is live at `yourusername.github.io/faqvault`
- [ ] Confirm next morning's automatic run adds 2 new collections

---

*FAQVault spec v2 · Generated with Claude Pro · May 2026*
