# On a preprint server's PDF reader, the return arrow is announced as the code "##article.return##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** no PR · [7d407550d4](https://github.com/pkp/ops/commit/7d407550d4ede539c8be2386ccb7722f30f71465) · 2020-02-06 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The return arrow at the top left of the PDF reader page has no visible
text; on a preprint server a screen reader announces it as the code
"##article.return##". On a journal the same arrow is announced "Return
to Issue Details" or "Return to Article Details".

A blind reader cannot tell where the arrow leads. The arrow works and
opens the preprint's page. It has no hover tooltip, so sighted readers
never see the code.

The code is announced on every preprint's PDF, in every language the
server offers, English included. OPS's language files lack the
`article.return` text that the PDF viewer template, shared with OJS,
reads; the fix is in OPS.

## Impact

- **Lost.** No data or work. The arrow's only name is a code, so a
  screen-reader user is not told where it leads.
- **Who.** Screen-reader users, on the PDF reader of every preprint.
- **Way round.** The title link beside the arrow opens the same page
  and is announced by the preprint's title.

Low: a link named by a code on every PDF reader page is an
accessibility failure, but the page keeps a correctly named link to the
same place, the PDF opens and downloads as before, and no content is
hidden. It would rise if the arrow were the only way back.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the server
  `publicknowledge`, whose published preprint 2, "The Facets Of Job
  Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence", has a "PDF" galley.
- Not signed in.

Steps:

1. Open the server's home page, `/index.php/publicknowledge`.
2. In the list of preprints, open "The Facets Of Job Satisfaction: A
   Nine-Nation Comparative Study Of Construct Equivalence".
3. Press "PDF".
4. Read the name of the arrow at the top left of the reader. It has no
   visible text: listen with a screen reader, or inspect the link (its
   hidden text is the `span.pkp_screen_reader` inside `a.return`).
5. Press the arrow.

**Expected.** Step 4 names the arrow's destination, such as "Return to
Preprint Details". Step 5 opens the preprint's page.

**Observed.**

```
Step 4: ##article.return##
Step 5: /index.php/publicknowledge/en/preprint/view/2   (the preprint's page)
```

In French: start step 1 at `/index.php/publicknowledge/fr_CA` (the
dataset's pages show no language menu); the reader then opens in French
("Télécharger") and step 4 gives the same code.

Control: the same steps on a journal (the OJS default dataset, article
17, "Antimicrobial, heavy metal resistance and plasmid profile of
coliforms isolated from nosocomial infections in a hospital in Isfahan,
Iran") read "Return to Issue Details" at step 4, in French "Retourner
aux renseignements sur le numéro".

## Cause

The PDF reader page is the pdf.js viewer plugin's
[`templates/display.tpl`](https://github.com/pkp/pdfJsViewer/blob/e69bf97/templates/display.tpl#L34-L42),
which OJS and OPS share. For a preprint it prints
`{translate key="article.return"}` as the arrow's hidden text.

`article.return` is an application key: OJS defines it in its own
`locale/*/locale.po` ("Return to Article Details"). OPS defines it in
none of its 18 locale folders, and neither pkp-lib nor the plugin has
it, so `Locale::translate()` prints the key between `##` marks.

OPS had the text once, at a time when it shipped no PDF viewer plugin.
[3d318e9b1c](https://github.com/pkp/ops/commit/3d318e9b1c2504feb042ea0e5b997c8b69ce0784)
("Remove unused locale keys", 2019-11-24) then removed
`article.return` "Return to Preprint Details" with the other keys
nothing read. 7d407550d4 ("Add PDF.js viewer plugin submodule") then added
the viewer to OPS without the key its template reads.

Reach:

- Every language (code; English and French (Canada) on screen): no OPS
  locale file has the key.
- The other texts of the reader page (on screen): "Download" and
  "Download PDF" come from pkp-lib and show. The browser tab's
  `article.pageTitle` shows in English and is a code in French, for
  another reason (OPS renamed that key), reported in
  `jardakotesovec/pkp-e2e#207`.
- `issue.return`, the template's other text (code): OPS lacks it too,
  but a preprint server has no issues and the plugin sets `issue` to
  null there, so nothing reads it.
- OJS (on screen): has both keys. Its arrow names the wrong page for an
  article in an issue, a fault in the template's test, reported apart
  (U13 OJS6).
- OMP (code): its viewer template is its own and reads
  `catalog.viewableFile.return`, which OMP defines. The press's HTML
  view page reads `monograph.return`, which nothing defines (U69 A10):
  the same kind of gap in another plugin, with its own fix.

## Proposed fix

Give OPS the key the shared template reads, in OPS's locale files
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/fix.diff)):

```diff
 # locale/en/locale.po
+msgid "article.return"
+msgstr "Return to Preprint Details"

 # locale/fr_CA/locale.po
+msgid "article.return"
+msgstr "Retourner aux renseignements sur la prépublication"
```

The English text is the one 3d318e9b1c removed. The French one is a
suggestion, modelled on OJS's "Retourner aux renseignements sur
l'article" and OPS's own word "prépublication"; a translator should
confirm it.

How this was settled:

- **Where the rule lives.** The template is shared with OJS, so
  `article.return` is the name it relies on, and each application
  supplies the text. OPS is the one that does not.
- **How the code base does it.** On `main` and 3.5 OPS already
  supplies the template's other application key, `article.pageTitle`,
  under the `article.` name, in seven of its locale files (en, bg, cs,
  de, mk, pt_BR, uk). 3.4 has only `preprint.pageTitle`, so the
  precedent does not hold there.
- **Every instance.** The plugin's template and PHP read three
  application keys: `article.pageTitle` (in seven OPS locale files on
  `main`),
  `article.return` (this report) and `issue.return` (never reached on
  OPS).
- **What the introducing changes were for.** Removing unused keys, then
  adding the PDF reader. Both stay; the one key the reader needs
  comes back with it.
- **What it touches.** The arrow's hidden text only. No stored data, no
  API, no other caller.
- **The guard.** An e2e check in the U13 spec that the PDF reader page
  of a preprint shows no `##` code, in English and in French.

Tried on `main`: with the diff applied, step 4 read "Return to Preprint
Details" in English and "Retourner aux renseignements sur la
prépublication" in French, and step 5 opened the preprint. The
neighbour check, every code on the reader page and its "Download" texts
in both languages, changed in nothing else: the French tab still read
"##article.pageTitle##".

**Alternatives**

- Move the text into the plugin's own locale files under a plugin key:
  one place for both applications, but "article" and "preprint" need
  two texts anyway, and every existing OJS translation would have to be
  copied over.
- Have the plugin read `preprint.return` on OPS: an application
  branch in the shared template for the same result.

**What goes with it**

- French and the other languages. OPS's non-English locale files are
  filled through Weblate, so the commit can carry the English entry
  alone and leave `fr_CA` and the other 16 languages to the
  translators; until each is translated it keeps the code. The diff's
  `fr_CA` hunk was added to try the fix in French and can be dropped.
- A guard against the next sweep. The key was removed once as unused,
  and it still looks unused inside OPS's own tree: its only reader is
  `plugins/generic/pdfJsViewer/templates/display.tpl`, a submodule. A
  comment above the entry naming that file (the same for
  `article.pageTitle`), and a sweep that searches the plugin submodules
  too, keep it from going again.
- Backport. `stable-3_5_0` takes the diff as written. On
  `stable-3_4_0` the file is `locale/en/locale.po` too, but the hunk's
  anchor is missing (there is no `article.pageTitle` entry): put the
  entry beside `preprint.pageTitle`. On `stable-3_3_0` the file is
  `locale/en_US/locale.po`, where `article.pageTitle` is the anchor.
- It can ship with the fix of `jardakotesovec/pkp-e2e#207`, which
  edits the same files for the tab's key.

Small: two locale entries, tried, with no data to repair.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/walk.js)
  takes the Steps on OPS in English and in French, and the same steps on
  the journal (OJS article 17) as the control; it records every `##`
  code on each reader page, which is the neighbour check. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It uses the
  helper file of
  [`pdf-reader-return-arrow-names-issue/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/lib.js).
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets 38ab955 (2026-09-30). No request failed and no script
  error showed. A database plays no part (locale files).
- Tips: OPS `main` c8af945bb7, its `lib/pkp` 3dc90c81a6, pdfJsViewer
  e69bf97; OJS `main` bade233f73 (the control). OPS `stable-3_5_0`
  cf4fce69bd, `lib/pkp` a9c76aed62, pdfJsViewer 6d80e45. OPS
  `stable-3_4_0` acd8ae704b, `lib/pkp` df13621c2d, pdfJsViewer
  7c80542. OPS `stable-3_3_0` c5532e2161, `lib/pkp` d446601ebe,
  pdfJsViewer 32334cb.
- Code reads: on each branch the pinned pdfJsViewer's
  `templates/display.tpl` (the arrow reads `article.return` for a
  preprint on all four: `{if $issue}` on `main` and 3.5,
  `{if $parent instanceOf Issue}`, never true, on 3.4 and 3.3) and a
  search of OPS's `locale/` for `msgid "article.return"` (none on any
  of the four); on `main` also `lib/pkp/locale/en` and the plugin's
  `locale/` (none), and `PdfJsViewerPlugin::submissionCallback()`
  (`issue` null on OPS).
- Introduced: `git log -S'article.return' -- locale` in OPS ends at
  3d318e9b1c, whose parent had the English text; at that commit
  `.gitmodules` names no pdfJsViewer. `git log -S'pdfJsViewer' --
  .gitmodules` gives 7d407550d4 as the commit that added it; the
  plugin's own 5194aff ("Prepare for OPS support", same day) made it
  serve preprints. 7d407550d4 is on `stable-3_2_0`, `stable-3_2_1` and
  every later branch, and was committed without a PR.
- Why not part of `jardakotesovec/pkp-e2e#207`: that report's tab key
  was renamed in 2021 and its texts exist under the new name, so it
  shows in some languages only and its fix renames the key back. This
  key was removed in 2019, has no text in any language, and shows in
  English too.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/pdfJsViewer searched by
  `article.return`, `issue.return`, "Return to Article Details", and
  "pdf viewer return screen reader". Read: `pkp/pdfJsViewer#75`
  (`pkp/pkp-lib#10559`, a missing key on issue galleys, another key),
  `pkp/pkp-lib#10781` (galley buttons' accessibility, another
  element).
- Not driven: 3.4 and 3.3 (code only); the languages other than
  English and French (Canada) (code only); a real screen reader (the
  walk read the link's hidden text and its accessible name).
- The arrow's link has no `title` attribute on any of the four
  branches' templates, so no tooltip.
- Unverified: the suggested French text's wording; how the 2019 sweep
  found its unused keys (no tool for it is in the repositories).
