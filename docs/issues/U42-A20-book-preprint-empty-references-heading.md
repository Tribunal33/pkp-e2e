# On a press or a preprint server, a book or preprint with no references shows an empty "References" heading

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11715` (3.5: `pkp/pkp-lib#11714`) for `pkp/pkp-lib#11682` · [c5c583d415](https://github.com/pkp/pkp-lib/commit/c5c583d415163dbadf60926aa84f0dd2c9776fd6) · 2025-08-20 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#13189` (open), the same symptom on OMP, with no cause or fix; `pkp/pkp-lib#12184` (closed), whose fix reached OJS whole but OPS only in its `count()` half
- **Tracked in** spec U42 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a20)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An item's page is expected to show "References" only when the item has
references, as an article page does. On a press and on a preprint server
every published item's page carries the "References" heading, with
nothing under it when the item has none.

Readers see an empty section on the book's or preprint's page, and a
screen reader announces a heading with no content.

## Impact

- **Lost**: nothing.
- **Who**: every reader of a published book or preprint that has no
  references, on every press and preprint server using the default
  theme (walked). A book's chapter pages are not affected: they use
  `chapter.tpl`, which prints no references.
- **Way round**: none on screen. Read in the code, not walked: switching
  the References setting off leaves the heading in place.

Low: an empty heading on a public page, with everything the page is for
still there.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP or OPS `main` (press or server
  `publicknowledge`). None of its published items has references.

Steps:

1. Signed out, open the page of OMP submission 5, "Bomb Canada and
   Other Unkind Remarks in the American Media",
   `/index.php/publicknowledge/catalog/book/5` (OPS: submission 2, "The
   Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
   Construct Equivalence", `/index.php/publicknowledge/preprint/view/2`).
2. Read the main column below the abstract.

**Expected**: no "References" section, as on an article with no
references.

**Observed**: on both, a "References" heading with an empty block under
it. The book page's markup:

```html
<div class="item references"> <h2 class="label"> References </h2> <div class="value"> </div> </div>
```

The preprint page has the same block as a `<section>`. On OJS the same
read of submission 17, "Antimicrobial, heavy metal resistance and
plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran" (`/index.php/publicknowledge/article/view/17`),
shows no "References" section.

## Cause

The landing templates decide whether to print the section from two
publication values, and both stopped being falsy when empty.
`pkp/pkp-lib#11682` (c5c583d415, "Optimize the software") changed
lib/pkp `classes/publication/DAO.php` so that a publication's
`citations` is a `LazyCollection` instead of an array, and its
`citationsRaw` is a `Stringable` object that loads the text on demand
instead of a string. An object is always true in a template condition.

The templates were adapted unevenly:

- OMP `templates/frontend/objects/monograph_full.tpl` line 286:
  `{if $citations || (string) $publication->getData('citationsRaw')}`.
  The same change cast `citationsRaw` to a string there (OMP 4f3ca0fd10,
  PR `pkp/omp#2095`). It left `$citations` as it was:
  `CatalogBookHandler::book()` assigns it from `getData('citations')`,
  the always-true collection, and line 292's `{if $citations}` has the
  same test.
- OPS `templates/frontend/objects/preprint_details.tpl` line 295:
  `{if count($parsedCitations) || $publication->getData('citationsRaw')}`.
  `pkp/pkp-lib#12184`'s fix (OPS dd9c527479) counted the collection but
  never cast `citationsRaw`, so the object keeps the condition true.
- OJS `templates/frontend/objects/article_details.tpl` line 277 has both
  fixes, `count($parsedCitations) || (string) …`, and shows no section:
  ac23bd0073 (`pkp/pkp-lib#11682`) added the `(string)` cast, and
  ebdbae26fd (`pkp/ojs#5249`, for `pkp/pkp-lib#12184`) the `count()`.

Before `pkp/pkp-lib#11682`, `citations` was an array (empty when there
were no references) and `citationsRaw` a string, so both tests were false
for an item with no references.

Reach:

- Screens: the book page and the preprint page, for every published
  version without references (walked with the References setting at
  its default). Neither `CatalogBookHandler` nor `PreprintHandler` reads
  the setting, so with it switched off an item's existing references are
  still listed and the empty heading stays (checked in the code, not
  walked).
- Other readers of the same values in the apps: the JATS, Crossref,
  PubMed and Google Scholar outputs and the REST API test the collection
  with `isEmpty()`, `isNotEmpty()` or a loop (checked in the code). On
  `main` the publication DAO passes `citationsRaw` to
  `Repo::citation()->importCitations()`, whose `?string` parameter
  converts it at the call (DAO lines 253 and 274); on 3.5 the DAO casts
  it before testing it (lines 209 and 228). None repeats the mistake.
- Themes: a third-party theme that copies these templates carries the
  same condition; the default themes in the apps are the ones above.

## Proposed fix

Test the values the way OJS's template already does: count the
collection and cast `citationsRaw` to a string. Two template lines in
OMP, one in OPS:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-preprint-empty-references-heading/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-preprint-empty-references-heading/fix-ops.diff),
each against its app's root:

```diff
--- a/templates/frontend/objects/monograph_full.tpl
-			{if $citations || (string) $publication->getData('citationsRaw')}
+			{if count($citations) || (string) $publication->getData('citationsRaw')}
@@
-						{if $citations}
+						{if count($citations)}
--- a/templates/frontend/objects/preprint_details.tpl
-			{if count($parsedCitations) || $publication->getData('citationsRaw')}
+			{if count($parsedCitations) || (string) $publication->getData('citationsRaw')}
```

Tried on OMP and OPS `main`: the book and preprint pages of Steps 1–2
then show no "References" section. A book (OMP submission 14) and a
preprint (OPS submission 3) given one reference in a new published
version showed "References" with that reference, with the fix and
without it.

**Alternatives**

- Assign the template variables only when there are references, as 3.4
  did (`if ($publication->getData('citationsRaw'))` around the assign in
  the handlers). It also covers a theme that copies the old condition,
  but changes what every theme receives, and OJS's fix already set the
  pattern in the template.
- Make `citations` an array again in the publication DAO. That undoes
  the purpose of `pkp/pkp-lib#11682`, which loads the references only
  when a page reads them.

**What goes with it**

- Backport: `fix-ops.diff` applies to `stable-3_5_0` with a line
  offset. `fix-omp.diff` does not, because one context line differs
  there (`getCitationWithLinks()` where `main` has
  `getRawCitationWithLinks()`), so OMP 3.5 has its own
  [fix-omp-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-preprint-empty-references-heading/fix-omp-3_5.diff),
  with the same two changes (checked with `git apply --check`, not
  walked).
- Test: the U42 e2e scenario that opens a book and a preprint page with
  no references and asserts no "References" section (a Planned item in
  the spec).

Small: three template lines in two apps, following OJS's.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-preprint-empty-references-heading/walk.js),
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-preprint-empty-references-heading/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/book-preprint-empty-references-heading/walk.js`
  takes the Steps on all three apps, OJS as the control, and changes
  nothing. With `NB=1` in front, on OMP and OPS, `dbarnes` publishes a
  new version of OMP submission 14 or OPS submission 3 with one
  reference, as a control, and the page is read signed out.
- Tips: `main` OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  987776cd04 for OJS, 3dc90c81a6 for OMP and OPS; the publication DAO
  reads the same at both). `stable-3_5_0`: OJS c1cee76b95, OMP
  9c5e24246c, OPS 38b61882d3 (lib/pkp 771474347e for OJS, cf3f984335
  for OMP and OPS). `stable-3_4_0`: OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 767353f4fe (the branch tip, read for all three).
  `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161, lib/pkp
  ac3fa73402 (the branch tip, read for all three).
- 3.5 code: the conditions sit at OMP line 275 and OPS line 262;
  `pkp/pkp-lib#11714` (cdf6d04bc8) made the same DAO change there, and
  the 3.5 handlers assign the collections the same way.
- 3.4 and 3.3 (code): `citationsRaw` is a string (lib/pkp
  `schemas/publication.json`), and `CatalogBookHandler` and
  `PreprintHandler` assign the citations only inside
  `if ($publication->getData('citationsRaw'))`, as arrays, so the
  templates' `{if $citations || …}` and `{if $parsedCitations || …}` are
  false for an item with no references.
- Introduced: `git blame` on OMP `monograph_full.tpl` line 286 gives
  4f3ca0fd10 (`pkp/omp#2095`, `pkp/pkp-lib#11682`), on OPS
  `preprint_details.tpl` line 295 dd9c527479 (`pkp/pkp-lib#12184`, which
  kept the uncast `citationsRaw` from 2019); the values became objects in
  lib/pkp c5c583d415 (`git show` of `classes/publication/DAO.php`:
  `->toArray()` and the string dropped). The handlers' unconditional
  assign came earlier with `pkp/pkp-lib#11238` (OMP d671a33d73, OPS
  cf64e1f533, 2025-04) while the values were still an array and a string.
- Upstream: `pkp/pkp-lib#13189` gives the symptom on a book page (OMP
  3.5.0-5 and `main`) with steps, and asks to "apply similar fix found
  on OJS and OPS" from `pkp/pkp-lib#12184`; it names no cause, and no PR
  is linked. `pkp/pkp-lib#12184` reported the empty heading on an
  article and was closed after two template changes: OJS's `count()`
  (`pkp/ojs#5249`, beside the cast OJS already had) and OPS's `count()`
  (dd9c527479), without the `(string)` cast, so OPS still shows the
  heading. This report adds OPS, 3.5, the cause in lib/pkp and a fix
  tried on both apps. Searched 2026-10-04 in pkp/pkp-lib, pkp/omp and
  pkp/ops.
