"""Validate blog-src/<slug>.json files.  Usage: python blog-src/validate.py slug1 slug2 ...   (no args = all)"""
import json, os, re, sys, datetime
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.dirname(HERE); BLOG = os.path.join(SITE, 'blog')
ALLOWED = {'b', 'i', 'a', 'sub', 'sup', 'code', 'em', 'strong'}
BLOCKS = {'h2', 'h3', 'p', 'ul', 'ol', 'figure', 'callout', 'table'}
def words(s): return len(re.findall(r"\w+", re.sub(r'<[^>]+>', '', s)))
def check(slug):
    errs, warns = [], []
    p = os.path.join(HERE, slug + '.json')
    try: d = json.load(open(p, encoding='utf8'))
    except Exception as e: return ['invalid JSON: %s' % e], []
    for k in ('slug', 'title', 'paper_title', 'date', 'venue', 'authors', 'tags', 'summary', 'kind', 'body', 'acknowledgements', 'links', 'tables_used'):
        if k not in d: errs.append('missing key ' + k)
    if errs: return errs, warns
    if d['slug'] != slug: errs.append('slug field != filename')
    try: datetime.date.fromisoformat(d['date'])
    except Exception: errs.append('date must be YYYY-MM-DD')
    if d['kind'] not in ('article', 'explainer'): errs.append('kind must be article|explainer')
    if len(d['summary']) > 220: errs.append('summary > 220 chars (%d)' % len(d['summary']))
    n = 0; figs = 0; tables_blocks = 0
    if not isinstance(d['tables_used'], list) or any(not re.match(r'^Table\s*[IVX\d]+', t) for t in d['tables_used']):
        errs.append('tables_used must be a list of strings like "Table 2: what it shows"')
    alltext = ' '.join((' '.join(v) if isinstance(v, list) else (v['caption'] if isinstance(v, dict) else v)) for b in d['body'] if 'table' not in b for v in b.values())
    cited = set(re.findall(r'Table\s*([IVX\d]+)', alltext))
    for b in d['body']:
        if 'table' in b and re.match(r'^Table\s*([IVX\d]+)', b['table'].get('source', '')): cited.add(re.match(r'^Table\s*([IVX\d]+)', b['table']['source']).group(1))
    listed = set(re.match(r'^Table\s*([IVX\d]+)', t).group(1) for t in d['tables_used'] if re.match(r'^Table\s*([IVX\d]+)', t))
    if listed - cited: warns.append('tables_used lists tables never cited inline: %s' % sorted(listed - cited))
    if cited - listed: errs.append('tables cited inline but missing from tables_used: %s' % sorted(cited - listed))
    for b in d['body']:
        keys = set(b) & BLOCKS
        if len(keys) != 1: errs.append('bad block %r' % list(b)[:3]); continue
        k = keys.pop(); v = b[k]
        if k == 'table':
            tf = ('caption', 'source', 'head', 'rows')
            for f in tf:
                if f not in v: errs.append('table missing ' + f)
            if all(f in v for f in tf):
                if not re.match(r'^Table\s*[IVX\d]+', v['source']): errs.append('table source must look like "Table 3": %r' % v['source'])
                if not (2 <= len(v['head']) <= 8): errs.append('table needs 2-8 columns')
                if not (1 <= len(v['rows']) <= 14): errs.append('table needs 1-14 rows')
                if any(len(r) != len(v['head']) for r in v['rows']): errs.append('table row length != head length')
                if any(not isinstance(c, str) for r in v['rows'] + [v['head']] for c in r): errs.append('table cells must be strings')
            tables_blocks += 1
            continue
        txt = ' '.join(v) if k in ('ul', 'ol') else (v.get('caption', '') if k == 'figure' else v)
        if k == 'figure':
            figs += 1
            for f in ('src', 'alt', 'caption', 'source'):
                if f not in v: errs.append('figure missing ' + f)
            if 'source' in v and not re.match(r'^(Fig\.|Figure)\s*\d+', v['source']): errs.append('figure source must look like "Fig. 3" or "Fig. 4(a)": %r' % v['source'])
            fp = os.path.join(BLOG, v.get('src', ''))
            if not os.path.isfile(fp): errs.append('figure file not found: ' + fp)
            elif os.path.getsize(fp) > 450_000: errs.append('figure > 450 KB: ' + v['src'])
            if not v.get('src', '').startswith('img/' + slug + '/'): errs.append('figure must live in img/%s/' % slug)
        else: n += words(txt)
        for t in re.findall(r'</?\s*([a-zA-Z0-9]+)', txt if isinstance(txt, str) else ''):
            if t.lower() not in ALLOWED: errs.append('disallowed html tag <%s>' % t)
    lo, hi = (750, 1600) if d['kind'] == 'article' else (120, 340)
    if not lo <= n <= hi: errs.append('body words %d outside %d-%d' % (n, lo, hi))
    if d['kind'] == 'article' and figs == 0: warns.append('no figures')
    if d['kind'] == 'article' and figs > 5: warns.append('more than 5 figures')
    if d['kind'] == 'article' and tables_blocks == 0: warns.append('no table block')
    print('%-40s words=%d figures=%d tables=%d date=%s' % (slug, n, figs, tables_blocks, d['date']))
    return errs, warns
if __name__ == '__main__':
    slugs = sys.argv[1:] or sorted(f[:-5] for f in os.listdir(HERE) if f.endswith('.json'))
    bad = 0
    for s in slugs:
        e, w = check(s)
        for x in e: print('  ERROR', x); bad += 1
        for x in w: print('  warn ', x)
    print('OK' if not bad else '%d error(s)' % bad); sys.exit(1 if bad else 0)
