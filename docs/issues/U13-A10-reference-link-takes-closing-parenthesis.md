# A reference's web address written in parentheses becomes a link that includes the closing ")"

- **Severity** low
- **Effort** small
- **Kind** regression (up to 3.1 a ")" after the address stayed outside the link)
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** commit for `pkp/pkp-lib#5120` (no PR) · [3f0fd99fa6](https://github.com/pkp/pkp-lib/commit/3f0fd99fa6006fb1db56f3e9de37013837f8016b) · 2019-10-02 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Under "References" on an article's, preprint's or book's page, a web
address followed directly by ")" becomes a link whose address and text
end in ")". A reference that gives its DOI address in parentheses,
"(https://doi.org/10.1234/u13ir23).", is the usual case: its link leads
to "https://doi.org/10.1234/u13ir23)", which does not exist.

The reader expects the link to stop before the ")", as it does before a
"." or "," after an address.

It shows wherever a reference closes a parenthesis right after an
address, also when the ")" is followed by ".", "," or ";". A ";" or
":" right after an address is taken into the link in the same way.

## Impact

- **Lost** The link in the reference leads to a wrong address, and
  nobody is told. The reference's text is complete and correct.
- **Who** A reader of a published article, preprint or book, on each
  reference that puts an address in parentheses. Reference styles that
  end on the bare DOI address are not affected.
- **Way round** The reader copies the address without the ")". An
  editor can put a space before the ")" in the reference.

Low: a wrong link in a secondary list, with the right address readable
beside it and nothing downstream taking the link. It was weighed
against medium because the parenthesised DOI form is common; a
reference list deposited or exported with these links would raise it,
and none is (Cause, Reach).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. Its journal,
  press and server have "Enable references metadata" ticked (Settings ›
  Workflow › Metadata, "Ask the author to provide references during
  submission."), and the workflow offers "References".
- No submission in the dataset has a reference. A reader sees a
  version's references once the version is published, so the steps add
  them to an unpublished version and publish it.
- OJS: submission 1, "Signalling Theory Dividends", has a published
  version 1.0 and an unpublished version 1.1.
- OPS: preprint 3, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice", has two versions,
  both posted. OMP: book 14, "From Bricks to Brains: The Embodied
  Cognitive Science of LEGO Robots", has one version, published.
  Neither has an unpublished version, so step 2 creates one.

Steps:

1. Sign in as `dbarnes` and open submission 1 (OJS), 3 (OPS) or 14
   (OMP).
2. OPS and OMP only: press "Create New Version" in the "Preprint"
   ("Publication") menu and press "Confirm" without changing anything.
   [3.5: the "Create New Version" button in the page's header, then
   "Yes".]
3. Open the unpublished version's "References". Type these five lines
   into the "References" box and press "Add". [3.5: press "Save".]

   ```
   Ridge, A. (2021). Tide tables u13ir23 (ftp://files.example.org/ridge/data.csv)
   Ridge, A. (2022). Harbour notes u13ir23. Available at https://example.org/harbour.
   Ridge, A. (2023). Estuaries u13ir23. https://en.wikipedia.org/wiki/Estuary_(landform)
   Ridge, A. (2024). Deltas u13ir23. Shore Press. (https://doi.org/10.1234/u13ir23).
   Ridge, A. (2025). Marshes u13ir23 (https://example.org/marshes); second edition.
   ```

4. OJS: press "Publish", press "Confirm" in "Review Publishing Details"
   keeping what is preselected, then "Publish" under "Are you sure you
   want to publish this?". [3.5: "Publish", then "Publish" in the
   window.] OPS: press "Post", then "Post". OMP: press "Publish", then
   "Publish".
5. Sign out and open the article page
   (`/index.php/publicknowledge/article/view/mwandenga`), the preprint
   page (`/index.php/publicknowledge/preprint/view/3`) or the book page
   (`/index.php/publicknowledge/catalog/book/14`).
6. Under "References", read the link in the first, fourth and fifth
   reference.

**Expected.** Each link's text and address stop at the end of the
address, and the ")", ")." or ");" follows as plain text:

| Reference | Expected link |
|---|---|
| first | ftp://files.example.org/ridge/data.csv |
| fourth | https://doi.org/10.1234/u13ir23 |
| fifth | https://example.org/marshes |

**Observed.** Each link's text and address take the ")", and the fifth
also the ";":

| Reference | Observed link |
|---|---|
| first | ftp://files.example.org/ridge/data.csv) |
| fourth | https://doi.org/10.1234/u13ir23) |
| fifth | https://example.org/marshes); |

The first reference in the page's source:

```html
Ridge, A. (2021). Tide tables u13ir23 (<a href="ftp://files.example.org/ridge/data.csv)" target="_blank" rel="noreferrer noopener">ftp://files.example.org/ridge/data.csv)</a>
```

[3.5: the same link without `target` and `rel`.]

Controls: the second reference's link is "https://example.org/harbour"
with the "." after it as text. The third reference's link keeps the
parentheses that belong to its address,
"https://en.wikipedia.org/wiki/Estuary_(landform)".

## Cause

`PKP\citation\Citation::getRawCitationWithLinks()`
(`lib/pkp/classes/citation/Citation.php`, lines 88 to 96;
`getCitationWithLinks()` up to 3.5) wraps each address in a reference's
text in a link. Its pattern,
`#(http|https|ftp)://[\d\w\.-]+\.[\w\.]{2,6}[^\s\]\[\<\>]*/?#`, takes
everything up to the next white space, square bracket or angle bracket,
so a ")" right after the address is matched as part of it.

The callback then takes only a trailing "." or "," off the match
(`rtrim($matches[0], '.,')`). A ")", ";" or ":" stays in the link.

The method writes `<a href='…' target='_blank'>`. The templates print
it through `strip_unsafe_html`, which is why the page's source shows
double quotes and `rel="noreferrer noopener"`.

The pattern came with
[3f0fd99fa6](https://github.com/pkp/pkp-lib/commit/3f0fd99fa6006fb1db56f3e9de37013837f8016b)
for `pkp/pkp-lib#5120`, which was about a reference wrapped in
`<p>…</p>`: the earlier pattern took the ">" of `</p>` into the link.
The earlier pattern (up to 3.1),
`#((https?|ftp)://(\S*?\.\S*?))(([\s)\[\]{},;"\':<>])?(\.)?(\s|$))#i`,
ended the address at a ")" that stood before a space or the end of the
text. So it linked "(ftp://files.example.org/ridge/data.csv)"
correctly. For the same reason it cut "…/Estuary_(landform)" short at
"(landform". The new pattern is in every release from 3.2.0 on.

Reach:

- The "References" block of the three landing-page templates, each
  printing the method's result: OJS
  `templates/frontend/objects/article_details.tpl`, OPS
  `preprint_details.tpl`, OMP `monograph_full.tpl`. Seen on screen.
- The REST API's `rawCitationWithLinks` property of a citation
  (`lib/pkp/classes/citation/maps/Schema.php`, `main` only) carries the
  same link. No screen of the apps reads it (the ui-library uses it only
  in a story). Read in the code.
- Nothing is stored wrong: the link is built each time the page is
  shown, from the reference's text as typed.
- Not affected, read in the code: the method is the only place that
  turns addresses in text into links (no other pattern of this kind
  under `lib/pkp`, the apps' `classes`, `pages`, `templates`, `plugins`
  or `lib/ui-library/src`); the Crossref, JATS and other exports send
  the reference's text, not this link.
- Also in the callback: an address followed by ".," keeps only the ","
  after the link, since `rtrim()` removes both and one character is put
  back. Read in the code and run on the method's own pattern.

## Proposed fix

In the callback, take trailing punctuation off the match one character
at a time and put it back, whole, after the link:

- ".", ",", ";" or ":";
- a ")" when the address holds more ")" than "(", which means it closes
  a parenthesis opened before the address.

```diff
--- a/lib/pkp/classes/citation/Citation.php
+++ b/lib/pkp/classes/citation/Citation.php
@@ -88,9 +88,20 @@
             $rawCitationWithLinks = preg_replace_callback(
                 '#(http|https|ftp)://[\d\w\.-]+\.[\w\.]{2,6}[^\s\]\[\<\>]*/?#',
                 function ($matches) {
-                    $trailingDot = in_array($char = substr($matches[0], -1), ['.', ',']);
-                    $url = rtrim($matches[0], '.,');
-                    return "<a href='{$url}' target='_blank'>{$url}</a>" . ($trailingDot ? $char : '');
+                    // Punctuation that follows the address stays outside the link: ".", ",", ";" or ":",
+                    // and a ")" that closes a parenthesis opened before the address.
+                    $url = $matches[0];
+                    $trailing = '';
+                    while ($url !== '') {
+                        $char = substr($url, -1);
+                        $closesOuterParenthesis = $char === ')' && substr_count($url, ')') > substr_count($url, '(');
+                        if (!in_array($char, ['.', ',', ';', ':']) && !$closesOuterParenthesis) {
+                            break;
+                        }
+                        $trailing = $char . $trailing;
+                        $url = substr($url, 0, -1);
+                    }
+                    return "<a href='{$url}' target='_blank'>{$url}</a>" . $trailing;
                 },
                 $rawCitationWithLinks
             );
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/fix.diff).
Its paths are against an app's root (`lib/pkp/classes/…`); a pkp-lib
pull request drops the leading `lib/pkp/`.

The change sits in the one method that owns the rule, so the three
templates and the API property follow. The pattern is unchanged, so a
link still stops at "<", which is what `pkp/pkp-lib#5120` was for.

Tried on OJS, OMP and OPS `main`: the first, fourth and fifth
references show the Expected links, the second still leaves its "."
outside, and the third still holds "…/Estuary_(landform)".

Two limits:

- Counting parentheses is a heuristic. An address that really ends in a
  ")" it never opened would lose it; and a ";" or ":" that really ends
  an address is left out of the link, as a "." or "," already is.
- Other characters right after an address are still taken into the
  link: a closing quotation mark, a "}", a "!" or "?". The list of
  trailing characters is the team's call; nothing else in pkp-lib trims
  such a list that the callback could follow.

**Alternatives**

- Add ")" to the characters the pattern stops at: one character, but
  every address with a parenthesis of its own (a Wikipedia title, an
  older DOI) would be cut short, as it was up to 3.1.
- Add ")" to the `rtrim()` list: it would also take the ")" off
  "…/Estuary_(landform)".

**What goes with it**

- No data repair: the link is built when the page is shown.
- Backport: 3.5, 3.4 and 3.3 hold the same callback in
  `getCitationWithLinks()`, with `<a href="…">` and no `target`. The
  loop applies there with that `return` line kept.
- Guard: a unit test of the method in a new
  `lib/pkp/tests/classes/citation/CitationTest.php` (`tests/classes/citation/`
  holds only `CitationListTokenizerFilterTest.php` today), with the
  Steps' five lines and the inputs listed in Evidence. Here, a Planned
  item under the spec's Rule 18.

Small: one callback in one shared method, and a unit test. This is a
proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/lib.js).
  It takes the Steps on a freshly loaded default dataset and reads the
  five links; its neighbour checks are the second and third
  references. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Walked on `main` and on `stable-3_5_0`, OJS, OMP and OPS, on
  PostgreSQL (the fault does not depend on the database). Every walk
  showed the Observed link and both controls; no request failed and no
  page script failed.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/reference-link-takes-closing-parenthesis/fix.diff ojs omp ops`,
  the same walk on `main`, then `revert`. With the fix the walk showed
  the Expected links on the three apps and both neighbours unchanged.
- Run through the method's pattern with the new callback in PHP, not
  through the screens: "(see https://example.org/deltas), second",
  "(https://en.wikipedia.org/wiki/Estuary_(landform)).", "see
  https://example.org/b: it" and
  "https://doi.org/10.1016/S0140-6736(05)12345-6, and" give the right
  links; "https://example.org/x?a=1;b=2" keeps its inner ";"; a quoted
  address, `"https://example.org/q"`, still takes the closing quotation
  mark.
- Tips walked: `main` OJS `bade233f73` (pkp-lib `2e377d27fc`), OMP
  `3b0ecf794` and OPS `c8af945bb7` (pkp-lib `3dc90c81a6`);
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (pkp-lib `a9c76aed62`). Dataset: pkp/datasets `38ab955` (2026-09-30).
- 3.5 code read: `lib/pkp/classes/citation/Citation.php`
  `getCitationWithLinks()`, the same pattern and callback, printed by
  the three templates.
- 3.4 and 3.3, read in the code and not walked: pkp-lib
  `stable-3_4_0` `df13621c2d` (`classes/citation/Citation.php`) and
  `stable-3_3_0` `d446601ebe` (`classes/citation/Citation.inc.php`)
  hold the same pattern and callback; `article_details.tpl`,
  `preprint_details.tpl` and `monograph_full.tpl` print
  `getCitationWithLinks()` on OJS `9571d8fde7` / `9fdb9bcf9a`, OPS
  `acd8ae704b` / `c5532e2161` and OMP `0aec65441` / `8e72fc883`.
- Introduced: `git log -S` on the pattern in `classes/citation/` leads
  to 3f0fd99fa6, a commit without a PR, first tagged in 3.2.0 and on
  no `stable-3_1` branch;
  later commits (`pkp/pkp-lib#10692`, 2025-09) renamed the method and
  added `target='_blank'` and left the pattern alone. The earlier
  pattern was run in PHP on the Steps' first three lines to confirm what it
  linked.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/omp issues
  and PRs, open and closed, for the reference, link, address and
  parenthesis words and for `getCitationWithLinks` and
  `getRawCitationWithLinks`; only `pkp/pkp-lib#5120` (closed, the
  change that brought the pattern) concerns this method. pkp/ui-library
  was not searched: the fault is not in its code.
- Not driven: themes other than the default one, and plugins outside
  the apps' checkouts that may call the method.
- Unverified: whether the structured "URL" the reference lookup extracts
  (`PKP\pid\Url`, another pattern, shown to editors only) handles
  parentheses; it is not part of this report.
