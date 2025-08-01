#!/usr/bin/env python3
"""
Generate a weekly branding and visual identity news roundup.

This script reads the list of articles and bookmarks from JSON files,
summarizes the bookmarked articles, and assembles a digest in markdown
format. If an OpenAI API key is provided (via the OPENAI_API_KEY
environment variable), it can use the OpenAI ChatGPT API to produce
concise summaries. Otherwise, it falls back to a simple heuristic
summarization that extracts the first sentence of each article
description.

The resulting digest is written to a file named `weekly_digest.md` in
the project root. You can then use the Ghost Admin API or Blogger API
to publish the digest; see the README for instructions.

Usage:
    python weekly_digest.py
"""
import json
import os
from datetime import datetime
from pathlib import Path
try:
    import openai  # type: ignore
except ImportError:
    openai = None  # OpenAI is optional

DATA_DIR = Path(__file__).resolve().parent / 'data'
NEWS_FILE = DATA_DIR / 'news.json'
BOOKMARKS_FILE = DATA_DIR / 'bookmarks.json'

def load_json(path):
    return json.loads(Path(path).read_text())

def naive_summary(text, sentences=2):
    # Split on periods and take the first `sentences` parts
    parts = text.split('.')
    summary = '.'.join(parts[:sentences]).strip()
    if not summary.endswith('.'):
        summary += '.'
    return summary

def summarise_with_openai(text, max_tokens=60):
    api_key = os.environ.get('OPENAI_API_KEY')
    if not api_key:
        return naive_summary(text)
    if openai is None:
        return naive_summary(text)
    openai.api_key = api_key
    prompt = (
        "Summarize the following branding article in one or two sentences. "
        "Focus on the core branding or visual identity changes and avoid any fluff.\n\n"
        f"Article:\n{text}\n\nSummary:"
    )
    try:
        response = openai.Completion.create(
            engine="text-davinci-003",
            prompt=prompt,
            max_tokens=max_tokens,
            temperature=0.5,
        )
        return response.choices[0].text.strip()
    except Exception:
        return naive_summary(text)

def build_digest(articles):
    lines = []
    lines.append(f"# Weekly Branding & Visual Identity News Roundup – {datetime.utcnow().strftime('%Y-%m-%d')}\n")
    for article in articles:
        summary = summarise_with_openai(article['description'])
        lines.append(f"## {article['title']}")
        lines.append(f"**Source:** {article['source']} | **Published:** {article['published_at']}\n")
        lines.append(f"{summary}\n")
        lines.append(f"[Read more]({article['url']})\n")
        lines.append('\n')
    return '\n'.join(lines)

def main():
    articles = load_json(NEWS_FILE)
    bookmarks = load_json(BOOKMARKS_FILE)
    bookmarked_articles = [a for a in articles if a['id'] in bookmarks]
    if not bookmarked_articles:
        print("No bookmarked articles to include in the digest.")
        return
    digest_md = build_digest(bookmarked_articles)
    output_file = Path(__file__).resolve().parent / 'weekly_digest.md'
    output_file.write_text(digest_md)
    print(f"Digest generated and saved to {output_file}")

if __name__ == '__main__':
    main()