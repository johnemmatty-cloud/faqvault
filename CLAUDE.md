# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**FAQVault** — a static website that publishes AI-focused FAQ collections updated daily via automated content generation. Zero build step; everything runs on GitHub Pages. The full specification is in [`faqvault-spec-v2.md`](faqvault-spec-v2.md).

## Running & deploying

This is a **no-build static site**. There is no `npm install`, no compilation step, and no local dev server required. Open HTML files directly in a browser or use any static file server (e.g. `python -m http.server`).

**Manual content generation (local):**
```bash
pip install anthropic
ANTHROPIC_API_KEY=<key> python generate_faqs.py
```

**Automated content generation:** GitHub Actions runs `generate_faqs.py` daily at 8am UTC. Trigger manually via Actions → Run workflow. Requires `ANTHROPIC_API_KEY` set as a repository secret.

**Deploy:** Push to `main` — GitHub Pages auto-deploys within ~60 seconds.

## Architecture

The site has two HTML pages; all content comes from a single JSON file fetched at runtime:

| File | Role |
|---|---|
| `index.html` + `js/main.js` | Homepage: fetches `data/faqs.json`, renders the 10 most recent FAQ cards, handles sub-topic filtering |
| `faq.html` + `js/faq.js` | Detail page: reads `?slug=` from the URL, renders an accordion of 5 Q&A pairs |
| `data/faqs.json` | Single source of truth — JSON array sorted newest-first, capped at 50 collections |
| `generate_faqs.py` | Calls `claude-sonnet-4-6` with web search to research 2 AI topics and prepend 2 new collections to `faqs.json` |
| `.github/workflows/daily-faq.yml` | Cron trigger (8am UTC) that runs the generator and pushes the updated JSON |
| `.claude/agents/faqvault-daily-generator.md` | Claude Code subagent equivalent for local use |

## Data model

`data/faqs.json` is a JSON array. Each collection object:
```json
{
  "id": "<unix-ms timestamp>",
  "slug": "kebab-case-title",
  "title": "Human-readable title",
  "category": "AI",
  "sub_topic": "Models",
  "created_at": "YYYY-MM-DD",
  "faqs": [
    { "q": "Question text", "a": "Answer text\n\nSource: Publication — Article title" }
  ]
}
```

`sub_topic` must be one of: `Models` | `Research` | `Policy` | `Tools` | `Other`. Every `a` field ends with `Source: [publication — article title]`. Each collection has exactly 5 Q&A pairs.

## Generator script behaviour

`generate_faqs.py` strips markdown fences from the API response before parsing JSON. It loads `faqs.json`, prepends the 2 new collections, trims the array to 50 entries, and writes it back. The system prompt constrains Claude to: pick topics from the last 24–48 hours only, follow a fixed question pattern (what/how/why/compare/concerns), never invent sources, and return raw JSON only.

## Constraints

- No backend, database, PHP, or server-side rendering — GitHub Pages is static-only.
- No admin UI — content pipeline is fully automated.
- Out of scope: auth, comments, search, analytics, dark/light toggle.
