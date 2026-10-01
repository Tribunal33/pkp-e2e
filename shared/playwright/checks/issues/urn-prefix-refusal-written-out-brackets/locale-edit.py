#!/usr/bin/env python3
# Generates the locale part of fix-ojs.diff / fix-omp.diff (docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md):
# in every plugins/pubIds/urn/locale/*/locale.po under the given directory, rewrite only the message
# plugins.pubIds.urn.manager.settings.form.urnPrefixPattern so its notation reads `"urn:" NID ":" NSS`, keeping each
# translator's wording. The bracket pattern is loose on purpose: fi, gl, pt and uz_Latn carry malformed entities
# (`&lt;NSS &gt;`, `&lt;NSS&gt ;`, `&lt;NID gt;` and `& lt;NSS`, `& lt; NID & gt;`), and Thai plain `<NID>`.
# Usage: python3 locale-edit.py <app root>/plugins/pubIds/urn/locale   (then diff against an untouched copy)
import glob
import re
import sys

KEY = 'msgid "plugins.pubIds.urn.manager.settings.form.urnPrefixPattern"\n'
BRACKETED = re.compile(r'(?:&\s*lt\s*;|<)\s*(NID|NSS)\s*(?:&?\s*gt\s*;|>)')
QUOTE = r'(\\"|[«»„“”])'

for f in sorted(glob.glob(sys.argv[1] + '/*/locale.po')):
    s = open(f, encoding='utf-8').read()
    i = s.find(KEY)
    if i < 0:
        continue
    j = i + len(KEY)
    m = re.match(r'msgstr ((?:".*"\n)+)', s[j:])
    v = ''.join(re.findall(r'"(.*)"', m.group(1)))
    nv = BRACKETED.sub(r'\1', v)
    nv = re.sub(QUOTE + r'(NID|NSS)\b', r'\1 \2', nv)
    nv = re.sub(r'\b(NID|NSS)' + QUOTE, r'\1 \2', nv)
    if nv != v:
        open(f, 'w', encoding='utf-8').write(s[:j] + 'msgstr "' + nv + '"\n' + s[j + m.end():])
        print(f.split('/')[-2], nv)
