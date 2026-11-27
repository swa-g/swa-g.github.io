"""Build blog/index.html and blog/<slug>.html from blog-src/*.json, update sitemap.xml and the `blog:` links in assets/data.js.
Run from anywhere:  python blog-src/build.py"""
import html, io, json, os, re, subprocess, datetime
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE); BLOG = os.path.join(SITE, 'blog')
BASE = 'https://swarnendughosh.com'
TODAY = datetime.date.today().isoformat()
E = lambda s: html.escape(s, quote=True)


def long_date(iso):
    d = datetime.date.fromisoformat(iso); return '%d %s %d' % (d.day, d.strftime('%B'), d.year)


def authors_html(a):
    return E(a).replace('Swarnendu Ghosh', '<b>Swarnendu Ghosh</b>').replace('S Ghosh', '<b>S Ghosh</b>')


# ---------- data.js (for the paper type / pages)
def load_pubs():
    js = "global.window={};eval(require('fs').readFileSync(%s,'utf8'));console.log(JSON.stringify(window.PUBLICATIONS))" % json.dumps(os.path.join(SITE, 'assets', 'data.js'))
    return json.loads(subprocess.check_output(['node', '-e', js]).decode('utf8'))


# ---------- shared pieces
CHEV = '<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.5 4.5 6 8l3.5-3.5"/></svg>'


def nav(index_page):
    def grp(label, items):
        s = '<div class="nav-group"><button class="nav-btn" type="button" aria-haspopup="true" aria-expanded="false">%s%s</button><div class="nav-sub">' % (label, CHEV)
        for h, t in items:
            cur = ' aria-current="true"' if (h == 'index.html' and index_page) else ''
            s += '<a href="%s"%s>%s</a>' % (h, cur, t)
        return s + '</div></div>'
    return ('<nav id="nav-links" class="nav-links" aria-label="Primary">'
            + grp('About', [('../#about', 'About me'), ('../#experience', 'Experience'), ('../#education', 'Education')])
            + grp('Research', [('../#research', 'Research areas'), ('../#projects', 'Projects'), ('../#publications', 'Publications'), ('index.html', 'Blog')])
            + grp('People', [('../#people', 'Collaborators'), ('../#testimonials', 'Testimonials')])
            + '<a href="../#contact">Contact</a></nav>')


def page(title, desc, canon, body, jsonld='', og_image='/assets/og-image.jpg', og_type='website', index_page=False, extra_head=''):
    return '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="author" content="Swarnendu Ghosh">
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
  <link rel="canonical" href="{canon}">
  <meta property="og:site_name" content="Swarnendu Ghosh">
  <meta property="og:type" content="{og_type}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{canon}">
  <meta property="og:image" content="{base}{og_image}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#fbfaf8" media="(prefers-color-scheme: light)">
  <meta name="theme-color" content="#0e1013" media="(prefers-color-scheme: dark)">
  <link rel="icon" href="/favicon.ico?v=2" sizes="48x48">
  <link rel="icon" href="/assets/favicon.svg?v=2" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon-192.png?v=2" type="image/png" sizes="192x192">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png?v=2">
  <script>
    (function () {{
      var d = document.documentElement, t = null;
      try {{ t = localStorage.getItem("theme"); }} catch (e) {{}}
      if (t !== "light" && t !== "dark") t = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      d.setAttribute("data-theme", t);
    }})();
  </script>
  <link rel="stylesheet" href="../assets/style.css">
  <link rel="stylesheet" href="../assets/blog.css">
{jsonld}{extra_head}</head>
<body>
  <a class="skip" href="#main">Skip to content</a>
  <header class="nav">
    <div class="wrap">
      <a class="brand" href="../" aria-label="Swarnendu Ghosh, home"><img class="mark" src="../assets/brand/signature-nav.svg?v=2" alt="" width="62" height="36">Swarnendu Ghosh</a>
      <div class="nav-right">
        {nav}
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="Switch theme">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
        </button>
        <button id="menu-toggle" class="icon-btn menu-btn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-links">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
        </button>
      </div>
    </div>
  </header>
  <main id="main" class="blog-main">
    <div class="wrap">
{body}
    </div>
  </main>
  <footer>
    <div class="wrap">
      <div class="row">
        <span>© 2026 Swarnendu Ghosh</span>
        <span>Faculty of Computer and Information Science, University of Ljubljana</span>
      </div>
    </div>
  </footer>
  <script src="../assets/blog.js"></script>
</body>
</html>
'''.format(title=E(title), desc=E(desc), canon=canon, body=body, jsonld=jsonld, og_image=og_image, og_type=og_type,
           base=BASE, nav=nav(index_page), extra_head=extra_head)


def render_block(b, d):
    if 'h2' in b: return '<h2>%s</h2>' % E(b['h2'])
    if 'h3' in b: return '<h3>%s</h3>' % E(b['h3'])
    if 'p' in b: return '<p>%s</p>' % b['p']
    if 'ul' in b: return '<ul>%s</ul>' % ''.join('<li>%s</li>' % x for x in b['ul'])
    if 'ol' in b: return '<ol>%s</ol>' % ''.join('<li>%s</li>' % x for x in b['ol'])
    if 'callout' in b: return '<div class="callout">%s</div>' % b['callout']
    if 'figure' in b:
        f = b['figure']; im = Image.open(os.path.join(BLOG, f['src'])); w, h = im.size
        return ('<figure><div class="frame"><img src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async"></div>'
                '<figcaption>%s<span class="src">Source: %s of the paper.</span></figcaption></figure>') % (f['src'], E(f['alt']), w, h, f['caption'], E(f['source']))
    raise ValueError(b)


def reading_minutes(d):
    n = 0
    for b in d['body']:
        for k, v in b.items():
            if k in ('p', 'h2', 'h3', 'callout'): n += len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', v)))
            elif k in ('ul', 'ol'): n += sum(len(re.findall(r'\w+', re.sub(r'<[^>]+>', '', x))) for x in v)
    return max(1, round(n / 200))


def citation(d, pub):
    detail = d.get('detail') or (pub or {}).get('detail', '')
    s = '%s (%s). %s. %s%s.' % (d['authors'], d['date'][:4], d['paper_title'].rstrip('.'), d['venue'], (', ' + detail) if detail else '')
    return s


def build_article(d, prev, nxt, pub):
    slug = d['slug']; mins = reading_minutes(d)
    tags = ''.join('<span>%s</span>' % E(t) for t in d['tags'])
    links = ''.join('<a href="%s"%s>%s</a>' % (E(l['url']), '' if (not l['url'].startswith('http')) or 'swarnendughosh.com' in l['url'] else ' target="_blank" rel="noopener"', E(l['label'])) for l in d['links'])
    if d['kind'] == 'explainer' and d['links']:
        cta = '<div class="cta"><a href="%s">%s</a></div>' % (E(d['links'][0]['url']), E(d.get('cta', 'Read the full write-up on the LANCER page')))
    else:
        cta = ''
    box = ('<aside class="paper-box" aria-label="The paper"><div class="lbl">The paper</div><div class="pt">%s</div>'
           '<div class="pa">%s</div><div class="pv">%s%s · %s</div>%s</aside>') % (
        E(d['paper_title']), authors_html(d['authors']), E(d['venue']), (', ' + E(d['detail'])) if d.get('detail') else '', d['date'][:4],
        ('<div class="paper-links">%s</div>' % links) if links else '')
    body = ''.join(render_block(b, d) for b in d['body'])
    ack = ''
    if d['acknowledgements'].strip():
        ack = '<section class="ack"><h2>Acknowledgements</h2><p>%s</p></section>' % d['acknowledgements']
    figs = [b['figure']['source'] for b in d['body'] if 'figure' in b]
    src = ''
    if figs or d['tables_used']:
        rows = ''
        if figs: rows += '<li><b>Figures:</b> %s</li>' % ', '.join(E(x) for x in figs)
        if d['tables_used']: rows += '<li><b>Tables:</b> %s</li>' % '; '.join(E(x) for x in d['tables_used'])
        src = '<section class="sources"><h2>Sources</h2><p>The figures and tables listed here are taken from the paper cited at the top of this page; the numbers quoted in the text come from the paper too.</p><ul>%s</ul></section>' % rows
    cite = '<details class="cite-box"><summary>How to cite the paper</summary><pre>%s</pre></details>' % E(citation(d, pub))
    pager = '<nav class="pager" aria-label="More articles">'
    pager += ('<a href="%s.html"><small>Newer</small>%s</a>' % (nxt['slug'], E(nxt['title']))) if nxt else '<span></span>'
    pager += ('<a class="next" href="%s.html"><small>Older</small>%s</a>' % (prev['slug'], E(prev['title']))) if prev else '<span></span>'
    pager += '</nav>'
    first_fig = next((b['figure']['src'] for b in d['body'] if 'figure' in b), None)
    og_img = ('/blog/' + first_fig) if first_fig else '/assets/og-image.jpg'
    ld = {'@context': 'https://schema.org', '@type': 'BlogPosting', 'headline': d['title'], 'description': d['summary'],
          'datePublished': d['date'], 'dateModified': d['date'], 'inLanguage': 'en',
          'author': {'@type': 'Person', 'name': 'Swarnendu Ghosh', 'url': BASE + '/'},
          'mainEntityOfPage': '%s/blog/%s.html' % (BASE, slug), 'image': BASE + og_img, 'keywords': ', '.join(d['tags']),
          'about': {'@type': 'ScholarlyArticle', 'name': d['paper_title'], 'author': d['authors'], **({'url': d['url']} if d.get('url') else {})}}
    jsonld = '  <script type="application/ld+json">%s</script>\n' % json.dumps(ld, ensure_ascii=False)
    main = ('<article class="article"><p class="crumbs"><a href="index.html">← All articles</a></p>'
            '<div class="tags">%s</div><h1>%s</h1>'
            '<p class="byline"><span>By Swarnendu Ghosh</span><time datetime="%s">%s</time><span>%d min read</span></p>%s'
            '<div class="prose">%s</div>%s%s%s%s</article>%s') % (
        tags, E(d['title']), d['date'], long_date(d['date']), mins, box, body, cta, src, ack, cite, pager)
    out = page(d['title'] + ' | Swarnendu Ghosh', d['summary'], '%s/blog/%s.html' % (BASE, slug), main, jsonld, og_img, 'article')
    io.open(os.path.join(BLOG, slug + '.html'), 'w', encoding='utf8', newline='\n').write(out)


def build_index(posts):
    from collections import Counter
    cnt = Counter(t.lower() for p in posts for t in p['tags'])
    top = [t for t, c in cnt.most_common() if c >= 2][:14]
    chips = '<button class="tag-chip" type="button" data-tag="all" aria-pressed="true">All</button>' + ''.join(
        '<button class="tag-chip" type="button" data-tag="%s" aria-pressed="false">%s</button>' % (E(t), E(t)) for t in top)
    years = {}
    for p in posts: years.setdefault(p['date'][:4], []).append(p)
    blocks = ''
    for y in sorted(years, reverse=True):
        cards = ''
        for p in years[y]:
            badge = '<span class="badge">LANCER</span>' if p['kind'] == 'explainer' else ''
            cards += ('<a class="post-card" href="%s.html" data-tags="%s"><div class="meta">%s%s</div><h3>%s</h3><p>%s</p><div class="venue">%s</div></a>') % (
                p['slug'], E('|'.join(t.lower() for t in p['tags'])), long_date(p['date']), badge, E(p['title']), E(p['summary']), E(p['venue']))
        blocks += '<section class="year-block"><h2>%s</h2><div class="posts">%s</div></section>' % (y, cards)
    body = ('<div class="blog-head"><div class="eyebrow">Blog</div><h1>My papers, in plain language</h1>'
            '<p class="lead">One short article for each of my papers: what problem we tackled, what we did, what we found. '
            'No background in machine learning needed.</p></div>'
            '<div class="tag-row" role="group" aria-label="Filter by topic">%s</div><p class="post-count" id="post-count" aria-live="polite">%d articles</p>%s'
            '<p class="blog-note">Each article is dated to when its paper appeared, not to the day it was written here. The papers themselves are listed, with links, on the <a href="../#publications">publications</a> section of the home page.</p>') % (chips, len(posts), blocks)
    ld = {'@context': 'https://schema.org', '@type': 'Blog', 'name': 'Swarnendu Ghosh: my papers, in plain language', 'url': BASE + '/blog/',
          'author': {'@type': 'Person', 'name': 'Swarnendu Ghosh', 'url': BASE + '/'},
          'blogPost': [{'@type': 'BlogPosting', 'headline': p['title'], 'datePublished': p['date'], 'url': '%s/blog/%s.html' % (BASE, p['slug'])} for p in posts]}
    jsonld = '  <script type="application/ld+json">%s</script>\n' % json.dumps(ld, ensure_ascii=False)
    out = page('Blog | Swarnendu Ghosh', 'Plain-language articles about the research papers of Swarnendu Ghosh: reinforcement learning, autonomous driving, computer vision, medical imaging and more.',
               BASE + '/blog/', body, jsonld, index_page=True)
    io.open(os.path.join(BLOG, 'index.html'), 'w', encoding='utf8', newline='\n').write(out)


def update_sitemap(posts):
    urls = [(BASE + '/', '1.0', 'weekly', TODAY), (BASE + '/blog/', '0.8', 'weekly', TODAY)]
    urls += [('%s/blog/%s.html' % (BASE, p['slug']), '0.6', 'yearly', TODAY) for p in posts]
    s = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    for u, pr, cf, lm in urls:
        s += '  <url>\n    <loc>%s</loc>\n    <lastmod>%s</lastmod>\n    <changefreq>%s</changefreq>\n    <priority>%s</priority>\n  </url>\n' % (u, lm, cf, pr)
    io.open(os.path.join(SITE, 'sitemap.xml'), 'w', encoding='utf8', newline='\n').write(s + '</urlset>\n')


def update_data_js(posts):
    """add/refresh a `blog: "blog/<slug>.html"` field on each matching publication entry"""
    p = os.path.join(SITE, 'assets', 'data.js'); s = io.open(p, encoding='utf8').read()
    by_title = {x['paper_title'].strip(): x['slug'] for x in posts}
    miss = []
    for title, slug in by_title.items():
        # find the entry's title line; replace any existing blog field, then add after the title/url line
        key = 'title: ' + json.dumps(title, ensure_ascii=False)
        i = s.find(key)
        if i < 0: miss.append(title); continue
        j = s.index('\n', i)                              # end of the title line
        # entry end = next "\n  }," or "}," boundary; we put the field on its own line after the title line
        seg_end = s.index('},', i) if '},' in s[i:i + 900] else j
        entry = s[i:seg_end]
        entry2 = re.sub(r'\s*blog: "[^"]*",', '', entry)
        k = entry2.index('\n')
        entry2 = entry2[:k] + ' blog: "blog/%s.html",' % slug + entry2[k:]
        s = s[:i] + entry2 + s[seg_end:]
    io.open(p, 'w', encoding='utf8', newline='\n').write(s)
    return miss


def main():
    os.makedirs(BLOG, exist_ok=True)
    posts = []
    for f in sorted(os.listdir(HERE)):
        if f.endswith('.json'): posts.append(json.load(io.open(os.path.join(HERE, f), encoding='utf8')))
    posts.sort(key=lambda p: (p['date'], p['slug']), reverse=True)
    pubs = {x['title'].strip(): x for x in load_pubs()}
    for i, d in enumerate(posts):
        newer = posts[i - 1] if i > 0 else None; older = posts[i + 1] if i + 1 < len(posts) else None
        build_article(d, older, newer, pubs.get(d['paper_title'].strip()))
    build_index(posts); update_sitemap(posts)
    miss = update_data_js(posts)
    print('built %d articles' % len(posts))
    if miss: print('data.js title not found for:', miss)


if __name__ == '__main__':
    main()
