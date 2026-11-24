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
