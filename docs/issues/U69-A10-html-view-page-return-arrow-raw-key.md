# On a press, the return arrow of a book's HTML view page is announced as the code "##monograph.return##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** no PR, for `pkp/pkp-lib#1825` · [fafaddb4d](https://github.com/pkp/omp/commit/fafaddb4d7ed50004cfd4f0c05ebe56bc0be3a0d) · 2016-10-17 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The return arrow at the top left of a book's HTML view page has no
visible text, and a screen reader announces it as the code
"##monograph.return##". On the PDF view page the same arrow is
announced "Return to view details about" and the book's title.

A blind reader cannot tell where the arrow leads. The arrow works and
opens the book's page, and the link beside it, read out as the book's
title, opens the same page. The arrow has no hover tooltip, so sighted
readers never see the code.

The code is announced on every HTML book file, in every language the
press offers, English included. The page is the one the "HTML Monograph
File" plugin shows, and the plugin is on by default.

## Impact

- **Lost.** No data or work; one link's name.
- **Who.** Screen-reader users, on every HTML book file.
- **Way round.** The link beside the arrow, read out as the book's
  title, opens the book's page too.

Low: a link named by a code is an accessibility failure, but the page
keeps a correctly named link to the same place, the HTML file shows,
and no content is hidden. It would rise if the arrow were the only way
back.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`: the press
  `publicknowledge`, whose published book 5, "Bomb Canada and Other
  Unkind Remarks in the American Media", has a free "PDF" file. "HTML
  Monograph File" is on, as the dataset has it.
- The dataset has no HTML book file, so steps 1 to 6 add one. Any HTML
  file serves, as long as the press stores it as `text/html` (only
  such a file gets the view page); the walk used `u69r7.html`, a
  heading and a paragraph.

Adding the HTML file:

1. Sign in as `dbarnes` and open the workflow of "Bomb Canada and
   Other Unkind Remarks in the American Media" by its address,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`
   (`dbarnes` is not assigned to this published book, so the view the
   dashboard opens on does not list it). Press "Publication Formats"
   in the side menu.
2. Press "Add publication format", type the name "HTML u69r7" and press
   "OK".
3. In the row "HTML u69r7" press "Change File". Choose the component
   "Appendix" (any serves), upload `u69r7.html`, and press "Continue",
   "Continue" and "Complete".
4. In the row of `u69r7.html` press "Set Terms", choose "Open Access"
   and press "Save".
5. In the format's row, "HTML u69r7", press "Awaiting Approval", then
   "OK". The file's own row under it has an "Awaiting Approval" too;
   leave that one.
6. In the same row press "Not Available", then "OK". Sign out.

Reading the arrow:

7. Open the press's "Catalog",
   `/index.php/publicknowledge/en/catalog`, and the book's title.
8. Press "HTML u69r7".
9. Read the name of the arrow at the top left of the page. It has no
   visible text: listen with a screen reader, or inspect the link (its
   hidden text is the `span.pkp_screen_reader` inside `a.return`).
10. Press the arrow.

**Expected.** Step 9 names the arrow's destination, as the PDF view
page does: "Return to view details about Bomb Canada and Other Unkind
Remarks in the American Media". Step 10 opens the book's page.

**Observed.**

```
Step 9:  ##monograph.return##
Step 10: /index.php/publicknowledge/en/catalog/book/5   (the book's page)
```

On the French pages (step 7 at
`/index.php/publicknowledge/fr_CA/catalog`) step 9 gives the same code.

Control: with "PDF" pressed at step 8, step 9 reads "Return to view
details about Bomb Canada and Other Unkind Remarks in the American
Media".

## Cause

The HTML view page is the "HTML Monograph File" plugin's template,
[`plugins/generic/htmlMonographFile/templates/display.tpl`](https://github.com/pkp/omp/blob/3b0ecf794/plugins/generic/htmlMonographFile/templates/display.tpl#L30-L34),
which is part of the OMP repository. It prints
`{translate key="monograph.return"}` as the arrow's hidden text.

No locale file defines `monograph.return`: none of OMP's 32 locale
folders, none of pkp-lib's, none of the plugin's own. So
`Locale::translate()` prints the key between `##` marks.

The key never had a text. fafaddb4d ("Move HTML view to iframe view")
gave the page its bar and arrow. OJS's HTML reader has the same bar,
and its arrow reads `article.return`, which OJS defines; the commit
named the OMP key `monograph.return` and added no locale entry for it.

The PDF view page's template,
[`plugins/generic/pdfJsViewer/templates/display.tpl`](https://github.com/pkp/omp/blob/3b0ecf794/plugins/generic/pdfJsViewer/templates/display.tpl#L30-L34),
has the same arrow and reads `catalog.viewableFile.return`, "Return to
view details about {$monographTitle}", which OMP's own locale files
define.

Reach:

- The PDF view page (on screen): its arrow does not show
  "##monograph.return##"; in English it has its text.
- The other texts of the HTML view page (on screen): the tab reads
  "HTML u69r7 view of the file u69r7.html" in English, and the page
  shows no other raw code.
- OJS (code): not affected. Its HTML reader is another plugin,
  `htmlArticleGalley`, whose arrow reads `article.return`, and OJS
  defines that text.
- OPS (code): not affected. It ships no HTML reader plugin, only the
  PDF reader, whose arrow shows a raw code of its own
  ([U13 OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OPS5-preprint-pdf-reader-return-arrow-raw-key.md),
  a missing `article.return`). On OJS that PDF reader's arrow names the
  wrong page
  ([U13 OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OJS6-pdf-reader-return-arrow-names-issue.md)).

## Proposed fix

Have the HTML view page read the text the PDF view page already reads,
in the plugin's template
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/fix.diff)):

```diff
 # plugins/generic/htmlMonographFile/templates/display.tpl
-				{translate key="monograph.return"}
+				{translate key="catalog.viewableFile.return" monographTitle=$filePublication->getLocalizedTitle()|escape}
```

The title comes from `filePublication`, the version the file belongs
to, which the plugin's own `viewCallback()` assigns and the template
already uses for its title link two lines below. The PDF template
passes the handler's `$publication` instead. On the view page that is
the same version (`CatalogBookHandler::download()` refuses an address
whose format is not that publication's), so both arrows name the same
title, also on an older version's file. `filePublication` is chosen
because it does not depend on what the handler assigns, which differs
between branches.

`monograph.return` is read in this one line and nowhere else in OMP,
pkp-lib or the plugins OMP ships. The change touches the arrow's hidden
text only: no stored data, no API. A theme that overrides this template
keeps its own copy. The guard is an e2e check in the U69 spec that a
book's HTML view page shows no `##` code and that its arrow is named by
the book's title.

Tried on `main`: with the diff applied, step 9 read "Return to view
details about Bomb Canada and Other Unkind Remarks in the American
Media" and step 10 opened the book's page. The neighbour check compared
both view pages, in English and in French, with the fix out and in: the
arrow's name, the browser tab and every raw code on the page. Only the
HTML view page's arrow changed.

**Alternatives**

- Add a `monograph.return` entry to OMP's locale files: a second text
  for the same arrow, starting untranslated in every language, while
  `catalog.viewableFile.return` is translated in 28 of the 32.
- Move the bar into one template that both plugins include: the right
  shape if the two pages are to stay alike, but more than this fault
  needs.

**What goes with it**

- No data repair and no new text. Four of OMP's languages (ar, el,
  fr_CA, vi) hold `catalog.viewableFile.return` with an empty text, so
  there the arrow of both view pages shows
  "##catalog.viewableFile.return##" until that is fixed (spec U69
  [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a15)); the walk saw it in French (Canada), with the fix in on
  the HTML page and either way on the PDF page.
- Backport. The diff applies as written to `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`: the plugin assigns
  `filePublication` on all of them.

Small: one line in one template, tried, with an e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/walk.js)
  takes the Steps, then steps 7 to 10 on the French pages, then the
  same four steps with "PDF" pressed in both languages (the control and
  the neighbour check); it records every `##` code on each view page.
  It uploads
  [`u69r7.html`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/u69r7.html)
  beside it. Run it on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/html-view-page-return-arrow-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It was run on
  `main` with the fix out and in, and on 3.5.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets 92050d9 (2026-10-01). The steps and the screens' words
  were the same on both. A database plays no part (a template and
  locale files).
- The HTML view page made no failed request and no script error. On
  `main` the control's PDF view page did (its file request answers
  500, and "PDFJS is not defined"; on 3.5 the script error alone):
  these are `jardakotesovec/pkp-e2e#282` and
  `jardakotesovec/pkp-e2e#283`, not this fault.
- Step 4 sets the file's terms only. The file's own "Awaiting
  Approval" was left as it was, and the book's page offered the file
  all the same.
- Tips: OMP `main` 3b0ecf794, its `lib/pkp` 3dc90c81a6; OMP
  `stable-3_5_0` b24879c3d, `lib/pkp` 1fb843f491; OMP `stable-3_4_0`
  0aec65441, `lib/pkp` df13621c2d; OMP `stable-3_3_0` 8e72fc883,
  `lib/pkp` d446601ebe.
- Code reads: on each of the four branches,
  `plugins/generic/htmlMonographFile/templates/display.tpl` (the arrow
  reads `monograph.return` on all four) and a search of the whole OMP
  tree for `monograph.return` (the template alone on all four); in
  pkp-lib a search for `"monograph.return"` on each of the four
  (none). On `main` also the pdfJsViewer template,
  `HtmlMonographFilePlugin::viewCallback()` (what it assigns),
  `CatalogBookHandler::download()` (how `publication` is chosen and
  checked against the format), the 32 `locale/*/locale.po` entries of
  `catalog.viewableFile.return`, OJS's
  `plugins/generic/htmlArticleGalley/templates/display.tpl` and
  `locale/en/locale.po`, and OPS's `plugins/generic` folder. For the
  backport note, the plugin's `viewCallback()` on 3.5, 3.4 and 3.3
  (`filePublication` assigned on each); the diff was dry-run against
  the template of each of the three (it applies, two lines higher on
  3.4 and 3.3).
- An older version's file was not walked: that both templates name the
  same title there is read from the code.
- Introduced: `git log -S'monograph.return'` on the plugin's template
  ends at fafaddb4d, the commit that wrote the line; a search of the
  whole OMP tree at that commit finds the key in the template alone.
  The commit is on `stable-3_3_0` and every later branch and has no PR
  (GitHub lists none for it); its message names `pkp/pkp-lib#1825`.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched by
  `monograph.return`, `htmlMonographFile`, `catalog.viewableFile.return`
  and "html monograph file screen reader return". Read:
  `pkp/pkp-lib#5977` (a fatal error on the HTML view page, closed,
  another fault).
- The way round: the title link's address
  (`/index.php/publicknowledge/en/catalog/book/5/4/145`) was requested
  once and answered the book's page; the walk did not press it.
- Not driven: 3.4 and 3.3 (code only); the languages other than
  English and French (Canada) (code only); a real screen reader (the
  walk read the link's hidden text and its accessible name).
