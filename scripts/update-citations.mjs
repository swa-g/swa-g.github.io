// Fetches citation data for a Google Scholar profile through SerpAPI and writes data/citations.json.
// Runs in GitHub Actions (see .github/workflows/citations.yml). Needs Node 18+ (built-in fetch), no dependencies.
//
//   SERPAPI_KEY        required, stored as a GitHub secret (never put it in the site's code)
//   SCHOLAR_AUTHOR_ID  required, the "user=" value in your Scholar profile URL
//
// Cost: one SerpAPI search per run (the profile page returns up to 100 papers at once).
// Safety: if anything looks wrong the script exits non-zero WITHOUT touching the existing file,
// so the site keeps showing the last good numbers.

import { writeFile, mkdir } from "node:fs/promises";

const key = process.env.SERPAPI_KEY;
const author = process.env.SCHOLAR_AUTHOR_ID;
if (!key || !author) {
  console.error("Missing SERPAPI_KEY or SCHOLAR_AUTHOR_ID.");
  process.exit(1);
}

const MAX_PAGES = 3; // 100 papers per page; each extra page costs one more search

async function fetchPage(start) {
  const url = new URL(process.env.SERPAPI_URL ?? "https://serpapi.com/search.json"); // override is for local testing only
  url.searchParams.set("engine", "google_scholar_author");
  url.searchParams.set("author_id", author);
  url.searchParams.set("hl", "en");
  url.searchParams.set("num", "100");
  url.searchParams.set("start", String(start));
  url.searchParams.set("api_key", key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SerpAPI HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(`SerpAPI error: ${json.error}`);
  return json;
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "");

try {
  const first = await fetchPage(0);
  const table = first.cited_by?.table;
  if (!Array.isArray(table) || table.length < 3) throw new Error("Response had no citation table.");

  const pick = (name) => table.find((r) => r[name])?.[name] ?? {};
  const citations = pick("citations");
  const hIndex = pick("h_index");
  const i10 = pick("i10_index");
  if (typeof citations.all !== "number") throw new Error("Could not read total citations.");

  let articles = first.articles ?? [];
  for (let page = 1; page < MAX_PAGES && articles.length === page * 100; page++) {
    const next = await fetchPage(page * 100);
    if (!next.articles?.length) break;
    articles = articles.concat(next.articles);
  }

  const papers = {};
  for (const a of articles) {
    if (!a.title) continue;
    papers[norm(a.title)] = a.cited_by?.value ?? 0;
  }

  const out = {
    updated: new Date().toISOString(),
    source: "Google Scholar via SerpAPI",
    total: citations.all,
    h_index: hIndex.all ?? null,
    i10_index: i10.all ?? null,
    graph: (first.cited_by?.graph ?? []).map((g) => ({ year: g.year, citations: g.citations })),
    papers,
  };

  await mkdir("data", { recursive: true });
  await writeFile("data/citations.json", JSON.stringify(out, null, 2) + "\n");
  console.log(`OK: ${out.total} citations, h-index ${out.h_index}, ${Object.keys(papers).length} papers.`);
} catch (err) {
  console.error("Citation update failed:", err.message);
  process.exit(1);
}
