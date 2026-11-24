# swarnendughosh.com

Personal academic site. Static HTML/CSS/JS, hosted on GitHub Pages.

- Add a paper: edit the list in `assets/data.js`.
- Everything else lives in `index.html`.


## Citation tracker

A GitHub Action (`.github/workflows/citations.yml`) runs daily, asks SerpAPI for the Google Scholar profile
(1 search per run, ~30/month) and saves `data/citations.json`. The site reads that file; if it doesn't exist,
the citation panel stays hidden.

One-time setup: repo **Settings -> Secrets and variables -> Actions -> New repository secret**, name `SERPAPI_KEY`.
Run it by hand from the **Actions** tab (Update citations -> Run workflow).

## People and testimonials

- `assets/people.js`: supervisors, name overrides and students. Co-author counts are computed from `assets/data.js`.
- `assets/testimonials.js`: approved testimonials for the slider. Visitors use the "Write a testimonial" form, which opens an
  email draft to the site owner (no server involved). Review it, then add an entry to the file. Preview the layout with `?demo`.

## Publications stay in sync with Google Scholar

`assets/data.js` is the curated list (the source of truth for authors, venue and type). The daily Action also saves the
Scholar profile's article list in `data/citations.json`; any paper that is on Scholar but not in `data.js` shows up on the
site automatically with a small "Scholar" badge and a link. To polish one, copy it into `data.js` (the curated entry wins).

## SEO

Title, description, Open Graph/Twitter tags and JSON-LD live in the `<head>` of `index.html`. `robots.txt`, `sitemap.xml`
and `404.html` are in the repo root. Keep the canonical URL as `https://swarnendughosh.com/` (enable "Enforce HTTPS" in Pages).

## Testimonials

Submissions are saved to a private Google Sheet as "Unverified"; only rows you mark "Verified" appear on the site, and a small
asterisk note shows while any are pending. Setup (5 minutes): `scripts/testimonials-apps-script/README.md`.
