# A reference's web address written inside parentheses links with the ")" and leads nowhere

- **Severity** low
- **Effort** small
- **Kind** regression (for ")." and for ")" before a space or the end; the other shapes never worked)
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5120` · [3f0fd99fa6](https://github.com/pkp/pkp-lib/commit/3f0fd99fa6006fb1db56f3e9de37013837f8016b) · 2019-10-02 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In "References" on an article's, a book's or a preprint's page, a web
address written inside parentheses, such as "(https://doi.org/10.1017/CBO9780511807763)."
or "(ftp://files.example.org/ridge/data.csv)", becomes a link whose
address and text end in ")". A reader who follows it reaches a page that
does not exist.

The reference's text is shown in full and right, so a reader can still
copy the address from it. It happens wherever an address ends right
before a closing ")", whether a space, the end of the reference or a
".", ",", ";", ":", "!" or "?" follows.

## Impact

- **Lost**: the reference's working link. The page looks right, and
  nobody is told that the link is broken.
- **Who**: every reader who follows such a link. APA 7 ends a reference
  with its DOI or URL outside any parentheses
  ([APA Style](https://apastyle.apa.org/style-grammar-guidelines/references/elements-list-entry)),
  so references written in APA style do not meet it.
- **Way round**: an editor can rewrite the reference with a space
  between the address and the ")".

Low: the reference's text stays complete and right, only its link is
wrong, and APA-style references are not hit.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP and OPS). It holds no
  references, so the steps add three to a published item.

The three references, one per line:

```
Ostrom, E. (1990). Governing the Commons. Cambridge University Press (https://doi.org/10.1017/CBO9780511807763).
Tide gauge records (ftp://files.example.org/ridge/data.csv)
Hardin, G. (1968). The tragedy of the commons. Science, 162. https://doi.org/10.1126/science.162.3859.1243.
```

OJS (submission 1, "Signalling Theory Dividends", whose second version,
"Version of Record 1.1", is not yet published):

1. Sign in as `dbarnes`.
2. Open submission 1, and in the side menu open "References" under
   "Version of Record 1.1".
3. Paste the three references into the "References" box and press
   "Add".
4. Press "Publish". In "Review Publishing Details" keep what is filled
   in and press "Confirm" (3.5: no such window opens). In "Are you sure
   you want to publish this?" press "Publish".
5. Sign out and open the article's page
   (`/index.php/publicknowledge/article/view/1`).

OMP (submission 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots") and OPS (submission 2, "The Facets Of Job
Satisfaction: A Nine-Nation Comparative Study Of Construct
Equivalence"):

1. Sign in as `dbarnes` and open the submission.
2. Press "Unpublish" (OPS: "Unpost") and confirm.
3. Open "References", paste the three references into the
   "References" box and press "Add".
4. Press "Publish" and "Publish" in the window (OPS: "Post" and "Post").
5. Sign out and open the book's page
   (`/index.php/publicknowledge/catalog/book/14`) or the preprint's page
   (`/index.php/publicknowledge/preprint/view/2`).

[3.5: the "References" page is a form; the references go into its
"References" box and "Save".]

**Expected**: under "References", each address is a link that ends
where the address ends; the ")" and "." around it stay outside the
link.

```
https://doi.org/10.1017/CBO9780511807763
ftp://files.example.org/ridge/data.csv
https://doi.org/10.1126/science.162.3859.1243
```

**Observed**: the first two links take the closing ")" into both their
address and their text. Following the first one, doi.org answers 404,
"Error: DOI Not Found".

```
https://doi.org/10.1017/CBO9780511807763)
ftp://files.example.org/ridge/data.csv)
https://doi.org/10.1126/science.162.3859.1243
```

The third reference's link correctly leaves out the trailing ".". The
same happens to an address that carries its own parentheses inside
parentheses: "(see https://en.wikipedia.org/wiki/Commons_(disambiguation))."
links `…Commons_(disambiguation))`.

## Cause

The public pages print each reference through
`Citation::getRawCitationWithLinks()` in
`lib/pkp/classes/citation/Citation.php`, which turns the addresses in
the text into links (`templates/frontend/objects/article_details.tpl`,
OMP's `monograph_full.tpl`, OPS's `preprint_details.tpl`, each piped
through `strip_unsafe_html`).

Its pattern, `#(http|https|ftp)://[\d\w\.-]+\.[\w\.]{2,6}[^\s\]\[\<\>]*/?#`,
runs an address on to the next space, square bracket or angle bracket,
so it takes a ")" right after the address with it. The callback then
trims only a trailing "." or "," (`rtrim($matches[0], '.,')`). A ")"
that closes a parenthesis opened before the address is punctuation of
the reference, but nothing takes it back out.

This came in with [3f0fd99fa6](https://github.com/pkp/pkp-lib/commit/3f0fd99fa6006fb1db56f3e9de37013837f8016b)
for `pkp/pkp-lib#5120` ("Citation URLs do not extract well with
trailing periods"), which brought in the current pattern so that an
address stops at "<" and leaves a trailing "." out.

The pattern it replaced was
`#((https?|ftp)://(\S*?\.\S*?))(([\s)\[\]{},;"\':<>])?(\.)?(\s|$))#i`.
It ended an address at the first point where at most one delimiter
(")" among them) and an optional "." were followed by a space or the end
of the text. So it left the ")" out of the link for ")." and for ")"
before a space or the end, the steps' shapes. When ",", ";", ":" or "?"
followed the ")", it linked the ")" as well: those shapes never worked.

Reach:

- The three public pages above, the only template callers (checked in
  the code; walked on all three apps).
- The citations API's `rawCitationWithLinks` property
  (`classes/citation/maps/Schema.php`, `main` only) returns the same
  string; no screen of the editorial workflow renders it (checked in
  the code).
- Stored data is unaffected: the reference is stored as typed and the
  links are built on every page view.
- No other code links addresses in text this way (searched across the
  three apps, pkp-lib and ui-library).

## Proposed fix

Keep the pattern and widen the callback's trim. While the match ends in
sentence punctuation (".", ",", ";", ":", "!" or "?"), or in a ")" that
has no "(" to pair with inside the match, move that character out of
the link and print it after the link. An address with its own balanced
parentheses (`…/wiki/Commons_(disambiguation)`, `…/0011-2275(82)90084-4`)
keeps them. [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/fix.diff):

```diff
                 function ($matches) {
-                    $trailingDot = in_array($char = substr($matches[0], -1), ['.', ',']);
-                    $url = rtrim($matches[0], '.,');
-                    return "<a href='{$url}' target='_blank'>{$url}</a>" . ($trailingDot ? $char : '');
+                    $url = $matches[0];
+                    $trailing = '';
+                    while (in_array($char = substr($url, -1), ['.', ',', ';', ':', '!', '?'])
+                        || ($char === ')' && substr_count($url, ')') > substr_count($url, '('))) {
+                        $trailing = $char . $trailing;
+                        $url = substr($url, 0, -1);
+                    }
+                    return "<a href='{$url}' target='_blank'>{$url}</a>" . $trailing;
                 },
```

The trim stays in the one shared method that every app and the API
call. It keeps what `pkp/pkp-lib#5120` was for: the pattern still stops
at "<" and still leaves a trailing "." out. Every trimmed character is
printed after the link. Today the callback prints back only the last
one, so a reference ending in "https://example.org/a.," shows only the
"," after the link and loses the ".".

Tried on `main` on every app: the steps' links ended at the address,
with ")." and ")" printed after them as text. A neighbour set linked
each address whole and nothing more: addresses ending in their own
"(…)", the same inside parentheses, a DOI with "(82)" inside it, an
address with a trailing ".", and addresses inside parentheses followed
by ";", ":" and "?". Without the fix, the address with its own "(…)"
inside parentheses took the outer ")" into the link, and the three
followed by ";", ":" or "?" took the ")" and that character.

**Alternatives**:

- Exclude ")" in the pattern's character class: breaks every address
  that carries parentheses, DOIs among them.
- Go back to the pre-2019 pattern: brings back the faults
  `pkp/pkp-lib#5120` fixed, and still links the ")" before ",", ";",
  ":" or "?".

**What goes with it**:

- A unit test in pkp-lib (`tests/classes/citation/`, beside
  `CitationListTokenizerFilterTest.php`) with the steps' references and
  the neighbour set.
- Backport: 3.5 and 3.4 (`getCitationWithLinks()`) have the same
  callback with a double-quoted `href` and no `target`; the same lines
  apply there with that context. 3.3 (`classes/citation/Citation.inc.php`)
  writes the callback with tabs, `array('.', ',')` and
  `"<a href=\"$url\">$url</a>"`, so the diff does not apply as written
  there; the same change has to be written in that form.

Small: a few lines in one method, following its own trim, and a unit
test.

## Evidence

- Walk script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js),
  on installs freshly loaded from PKP's default test dataset
  (pkp/datasets 38ab955, 2026-09-30; PostgreSQL):
  `node bin/probe.js all shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js`;
  `PHASE=neighbour` in front types the neighbour set instead. The fix
  was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/fix.diff ojs omp ops`.
- Tips on `main`: OJS bade233f73 (2026-09-30) with pkp-lib 2e377d27fc;
  OMP 3b0ecf794 and OPS c8af945bb7 (2026-09-29) with pkp-lib
  3dc90c81a6, whose `Citation.php` is the same as OJS's.
- 3.5, walked with the same script on the 3.5 dataset: OJS 92b9a16b48,
  OMP 3081c9b00, OPS cf4fce69bd, pkp-lib a9c76aed62 (2026-09-30). Its
  `Citation::getCitationWithLinks()` has the same pattern and trim.
- 3.4 (code): pkp-lib `origin/stable-3_4_0` (df13621c2d),
  `classes/citation/Citation.php`, `getCitationWithLinks()`: the same
  pattern and trim; OJS 9571d8fde7, OMP 0aec65441 and OPS acd8ae704b
  (`upstream/stable-3_4_0`) print it in the same three templates.
- 3.3 (code): pkp-lib `origin/stable-3_3_0` (d446601ebe),
  `classes/citation/Citation.inc.php`: the same pattern and trim; OJS
  9fdb9bcf9a, OMP 8e72fc883 and OPS c5532e2161 (`upstream/stable-3_3_0`)
  print it in the same three templates.
- Introduced: `git blame` on the pattern's line gives 4730f6707e
  (`pkp/pkp-lib#10692`, 2025), which moved the method;
  `git log -S` on the pattern finds 3f0fd99fa6 (master) and its twin
  6562e93ead on `stable-3_1_2`, both 2019-10-02, the two commits
  `pkp/pkp-lib#5120` lists. The parent's pattern was run in PHP: it
  left the ")" out of the link for the steps' references, for ")"
  before a space and for the "(…Commons_(disambiguation))." case, and
  linked it for "),", ");", "):" and ")?". Whether a pull request
  carried the commit is unverified.
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library: `pkp/pkp-lib#5120` (closed, the introducing change)
  and `pkp/pkp-lib#4549` (closed, escaping the address in the `href`)
  are about the same method but not this fault.
- Not walked: the citations API's `rawCitationWithLinks` (read in the
  code), 3.4 and 3.3. MySQL not checked; nothing here depends on the
  database.
