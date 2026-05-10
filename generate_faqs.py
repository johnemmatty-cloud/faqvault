"""
FAQVault — Daily FAQ Generator
Calls claude-sonnet-4-6 with web search, generates 2 AI FAQ collections,
prepends them to data/faqs.json, and trims the array to 50 entries.
"""

import json
import os
import re
import time
from datetime import date
from pathlib import Path

import anthropic

# ── Config ──────────────────────────────────────────────────────────────────
MODEL       = "claude-sonnet-4-6"
DATA_FILE   = Path(__file__).parent / "data" / "faqs.json"
MAX_ENTRIES = 50
TODAY       = date.today().isoformat()

SYSTEM_PROMPT = f"""You are FAQVault's daily AI content generator.

Today's date is {TODAY}.

Your task: research the 2 most interesting / newsworthy AI topics from the LAST 24-48 HOURS only.
Good topics: new model releases, research breakthroughs, policy updates, viral AI tools.

For each topic generate exactly 5 Q&A pairs following this pattern:
  Q1 – What happened / what is it?
  Q2 – How does it work?
  Q3 – Why does it matter?
  Q4 – How does it compare to what came before?
  Q5 – What are the concerns or limitations?

Rules:
- Every answer MUST end with: Source: [Publication — Article title]
- NEVER invent sources. Only cite real articles you found while searching.
- Each answer should be 3-5 sentences.
- Return RAW JSON ONLY — no markdown, no code fences, no commentary.
- The JSON must be a valid array of exactly 2 objects.

JSON schema for each object:
{{
  "id": "<unix millisecond timestamp as string>",
  "slug": "<kebab-case-title>",
  "title": "<Human-readable title>",
  "category": "AI",
  "sub_topic": "<one of: Models | Research | Policy | Tools | Other>",
  "created_at": "{TODAY}",
  "faqs": [
    {{"q": "Question text", "a": "Answer text\\n\\nSource: Publication — Article title"}}
  ]
}}
"""

USER_PROMPT = (
    "Search for today's top 2 AI news stories from the last 24-48 hours, "
    "then generate the FAQ collections as instructed. Return raw JSON only."
)


def strip_fences(text: str) -> str:
    """Remove markdown code fences if the model wraps output in them."""
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def load_existing() -> list:
    if DATA_FILE.exists():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save(data: list) -> None:
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate() -> list:
    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    print(f"[FAQVault] Calling {MODEL} with web_search_20250305 tool…")
    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        tools=[{"type": "web_search_20250305", "name": "web_search"}],
        messages=[{"role": "user", "content": USER_PROMPT}],
    )

    # Extract the final text block from the response
    raw_text = ""
    for block in response.content:
        if block.type == "text":
            raw_text = block.text
            break

    if not raw_text:
        raise ValueError("No text content returned from the model")

    cleaned = strip_fences(raw_text)

    try:
        collections = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        print("[FAQVault] Raw response:\n", cleaned[:500])
        raise ValueError(f"Could not parse JSON from model response: {exc}") from exc

    if not isinstance(collections, list):
        raise ValueError("Expected a JSON array from the model")

    # Ensure IDs are unique timestamps
    ts = int(time.time() * 1000)
    for i, col in enumerate(collections):
        col["id"] = str(ts + i)
        col["created_at"] = TODAY

    return collections


def main():
    new_collections = generate()

    print(f"[FAQVault] Generated {len(new_collections)} new collection(s):")
    for col in new_collections:
        print(f"  • [{col['sub_topic']}] {col['title']}")

    existing = load_existing()
    updated  = new_collections + existing
    updated  = updated[:MAX_ENTRIES]

    save(updated)
    print(f"[FAQVault] data/faqs.json updated — {len(updated)} total collection(s) stored.")


if __name__ == "__main__":
    main()
