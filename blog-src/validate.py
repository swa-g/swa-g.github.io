"""Validate blog-src/<slug>.json files.  Usage: python blog-src/validate.py slug1 slug2 ...   (no args = all)"""
import json, os, re, sys, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE); BLOG = os.path.join(SITE, 'blog')
ALLOWED = {'b', 'i', 'a', 'sub', 'sup', 'code', 'em', 'strong'}
BLOCKS = {'h2', 'h3', 'p', 'ul', 'ol', 'figure', 'callout'}
def words(s): return len(re.findall(r"\w+", re.sub(r'<[^>]+>', '', s)))
def check(slug):
    errs, warns = [], []
    p = os.path.join(HERE, slug + '.json')
    try: d = json.load(open(p, encoding='utf8'))
    except Exception as e: return ['invalid JSON: %s' % e], []
    for k in ('slug', 'title', 'paper_title', 'date', 'venue', 'authors', 'tags', 'summary', 'kind', 'body', 'acknowledgements', 'links'):
        if k not in d: errs.append('missing key ' + k)
    if errs: return errs, warns
    if d['slug'] != slug: errs.append('slug field != filename')
    try: datetime.date.fromisoformat(d['date'])
    except Exception: errs.append('date must be YYYY-MM-DD')
    if d['kind'] not in ('article', 'explainer'): errs.append('kind must be article|explainer')
    if len(d['summary']) > 220: errs.append('summary > 220 chars (%d)' % len(d['summary']))
    n = 0; figs = 0
    for b in d['body']:
        keys = set(b) & BLOCKS
        if len(keys) != 1: errs.append('bad block %r' % list(b)[:3]); continue
        k = keys.pop(); v = b[k]
        txt = ' '.join(v) if k in ('ul', 'ol') else (v.get('caption', '') if k == 'figure' else v)
        if k == 'figure':
            figs += 1
            for f in ('src', 'alt', 'caption'):
                if f not in v: errs.append('figure missing ' + f)
            fp = os.path.join(BLOG, v.get('src', ''))
            if not os.path.isfile(fp): errs.append('figure file not found: ' + fp)
            elif os.path.getsize(fp) > 450_000: errs.append('figure > 450 KB: ' + v['src'])
            if not v.get('src', '').startswith('img/' + slug + '/'): errs.append('figure must live in img/%s/' % slug)
        else: n += words(txt)
        for t in re.findall(r'</?\s*([a-zA-Z0-9]+)', txt if isinstance(txt, str) else ''):
            if t.lower() not in ALLOWED: errs.append('disallowed html tag <%s>' % t)
    lo, hi = (500, 1100) if d['kind'] == 'article' else (120, 320)
    if not lo <= n <= hi: errs.append('body words %d outside %d-%d' % (n, lo, hi))
    if d['kind'] == 'article' and figs == 0: warns.append('no figures')
    if d['kind'] == 'article' and figs > 4: warns.append('more than 4 figures')
    print('%-40s words=%d figures=%d date=%s' % (slug, n, figs, d['date']))
    return errs, warns
if __name__ == '__main__':
    slugs = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(HERE) if f.endswith('.json'))
    bad = 0
    for s in slugs:
        e, w = check(s)
        for x in e: print('  ERROR', x); bad += 1
        for x in w: print('  warn ', x)
    print('OK' if not bad else '%d error(s)' % bad); sys.exit(1 if bad else 0)
