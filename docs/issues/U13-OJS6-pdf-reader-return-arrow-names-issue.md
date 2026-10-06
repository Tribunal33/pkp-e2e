# On a journal article's PDF reader, the return arrow is announced "Return to Issue Details" but opens the article

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pdfJsViewer#73` for `pkp/pkp-lib#10208` · [8e0a905](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6) · 2024-08-19 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal article in an issue, a screen reader announces the PDF
reader's return arrow as "Return to Issue Details", but pressing it
opens the article's page. The destination is right and the label is
wrong: the arrow should announce "Return to Article Details", as it does
for an article in no issue and as the HTML reader's arrow always does.

The arrow announced "Return to Article Details" on these pages until a
2024 change to the reader. The arrow has no visible text and no hover
tooltip, so only screen-reader users meet the wording.

The reader is the page of the "PDF.JS PDF Viewer" plugin, which is on by
default in every journal.

## Impact

- **Lost.** No data or work. The label names a page the arrow does not
  open, in every language the journal offers.
- **Who.** Screen-reader users, on the PDF reader of every article
  published in an issue.
- **Way round.** The title link beside the arrow opens the same page
  and is announced by the article's title.

Low: a hidden label that misleads while the link does the right thing;
it would rise only if the arrow led somewhere the reader could not
return from.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: the journal
  `publicknowledge`, whose current issue "Vol. 1 No. 2 (2014)" holds
  article 17, "Antimicrobial, heavy metal resistance and plasmid profile
  of coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", with a "PDF" galley.
- Not signed in.

Steps:

1. Open the journal's home page, `/index.php/publicknowledge`.
2. Under "Current Issue", open "Antimicrobial, heavy metal resistance
   and plasmid profile of coliforms …".
3. Press "PDF".
4. Read the name of the arrow at the top left of the reader. It has no
   visible text: listen with a screen reader, or inspect the link (its
   hidden text is the `span.pkp_screen_reader` inside `a.return`).
5. Press the arrow.

**Expected.** Step 4 reads "Return to Article Details", since step 5
opens the article's page.

**Observed.**

```
Step 4: Return to Issue Details
Step 5: /index.php/publicknowledge/en/article/view/17   (the article's page)
```

On the French pages (`/index.php/publicknowledge/fr_CA`) step 4 reads
"Retourner aux renseignements sur le numéro" and step 5 opens the
article's page too.

Control, the case a fix must not break: an issue's own PDF. The dataset
has none, so add one first:

1. Sign in as `dbarnes` and open "Issues" in the side menu, then the
   "Back Issues" tab.
2. Open the arrow beside "Vol. 1 No. 2 (2014)" and press "Edit".
3. On the "Issue Galleys" tab press "Create Issue Galley", type the
   label "PDF u13ir21", upload a PDF file and press "Save".
4. Sign out, open `/index.php/publicknowledge/issue/view/1` and press
   "PDF u13ir21" under "Full Issue".

There the arrow reads "Return to Issue Details" and opens the issue's
page, which is right.

An article in no issue was not walked: the dataset has none. By the
code its arrow reads "Return to Article Details" (see Cause).

## Cause

The PDF reader page is the pdf.js viewer plugin's
[`templates/display.tpl`](https://github.com/pkp/pdfJsViewer/blob/e69bf97/templates/display.tpl#L34-L42),
used for an article's PDF (`PdfJsViewerPlugin::submissionCallback()`)
and for an issue's PDF (`issueCallback()`). Each callback sets the
arrow's address, `parentUrl`: the article's page for an article, the
issue's page for an issue galley.

The arrow's hidden text is chosen in the template by another test:

```smarty
{if $issue}
	{translate key="issue.return"}
{else}
	{translate key="article.return"}
{/if}
```

On a journal `submissionCallback()` assigns `issue` too: the issue the
article is published in, which `ArticleHandler` passes to the hook. So
the test is true for every article in an issue, and the text names the
issue while the address is the article's.

Until 8e0a905 the test was `{if $parent instanceOf Issue}`. Nothing
assigned `parent`, so every reader said "Return to Article Details":
right for articles, wrong for issue galleys. 8e0a905 (rich-text titles
in the reader) changed the test to `{if $issue}`, which made issue
galleys right and articles in an issue wrong.

Reach:

- An article in no issue (code): `ArticleHandler` reads the issue from
  the publication's `issueId` and passes null when there is none, so
  the text is "Return to Article Details".
- An issue galley (on screen): correct, as the control shows.
- A preprint server (code): `submissionCallback()` sets `issue` to
  null there, so this fault does not show; its arrow has another fault,
  a missing text, reported apart (U13 OPS5).
- The HTML reader (`plugins/generic/htmlArticleGalley/templates/display.tpl`,
  code): always `article.return`, and it serves articles only. Correct.
- 3.4 and 3.3 (code): the plugin there still has
  `{if $parent instanceOf Issue}`, so an article reads "Return to
  Article Details"; the issue galley's reader reads it too, though it
  opens the issue.

## Proposed fix

Name the issue only when the page is an issue galley's, in the plugin's
template
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/fix.diff)):

```diff
-				{if $issue}
+				{if $issue && !$submission}
```

`submissionCallback()` assigns `submission`; `issueCallback()` does
not, and `IssueHandler` assigns none. Reading the unassigned
`$submission` on the issue galley's page is safe: `PKPTemplateManager`
sets Smarty's `error_reporting` to `E_ALL & ~E_NOTICE & ~E_WARNING`, and
the walk of that page with the fix in met no failed request.

How this was settled:

- **Where the rule lives.** The plugin's two callbacks decide where the
  arrow leads; its one template decides the text. The fix is in that
  template, which OJS and OPS share.
- **How the code base does it.** The template already branches on what
  the callbacks assign (`isTitleHtml`, `isLatestPublication`).
- **Every instance.** `issue.return` is read only here; the HTML
  reader reads `article.return` alone.
- **What the introducing change was for.** Rich-text titles, and with
  them a working test for issue galleys. Both are kept.
- **What it touches.** The hidden text on article PDF readers, nothing
  else; no stored data. A theme that overrides this template keeps its
  own copy.
- **The guard.** An e2e check in the U13 spec that the arrow's name
  matches the page it opens, on an article's PDF and on an issue
  galley's.

Tried on `main`: with the diff applied, step 4 read "Return to Article
Details" ("Retourner aux renseignements sur l'article" in French). The
issue-galley control and a preprint server's reader read the same with
the fix out and in.

**Alternatives**

- Have each callback assign the text's key (or a flag such as
  `isIssueGalley`) and the template print it: more explicit, a few more
  lines in two methods, the same result.
- Go back to `{if $parent instanceOf Issue}`: it turns the article
  right and the issue galley wrong again.

**What goes with it**

- A backport to `stable-3_5_0`, which takes the diff as written.
- No data repair and no new translations: both texts exist.

Small: one line in one template, tried, with an e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/walk.js)
  takes the Steps in English and in French. Run it on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-return-arrow-names-issue/neighbour.js)
  beside it takes the control's steps; it was run with the fix out and
  in.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets 38ab955 (2026-09-30). On `main` without the fix the
  Steps were taken by the journal control of
  [`preprint-pdf-reader-return-arrow-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-pdf-reader-return-arrow-raw-key/walk.js),
  which takes the same five steps on article 17; `walk.js` itself ran
  on `main` with the fix in and on 3.5. No request failed and no script
  error showed. A database plays no part (a template).
- Tips: OJS `main` bade233f73, pdfJsViewer e69bf97; OJS
  `stable-3_5_0` 92b9a16b48, pdfJsViewer 6d80e45; OJS `stable-3_4_0`
  9571d8fde7, pdfJsViewer 7c80542; OJS `stable-3_3_0` 9fdb9bcf9a,
  pdfJsViewer 32334cb.
- Code reads: on each branch the pinned pdfJsViewer's
  `templates/display.tpl` (`{if $issue}` on `main` and 3.5,
  `{if $parent instanceOf Issue}` on 3.4 and 3.3) and, on `main`,
  `PdfJsViewerPlugin.php` (both callbacks' assigns),
  `pages/issue/IssueHandler.php` (no `submission` assigned),
  `pages/article/ArticleHandler.php` (the issue passed to the hook),
  `lib/pkp/classes/template/PKPTemplateManager.php` (`error_reporting`)
  and the HTML reader's template. The arrow's link has no `title`
  attribute, so no tooltip.
- Introduced: `git log -S'{if $issue}'` in the plugin gives 8e0a905
  alone; it is on the plugin's `main` and `stable-3_5_0`, not on
  `stable-3_4_0`. The arrow's address became the article's in 91c4a0d
  (2016-06-27, `pkp/pkp-lib#1546`, "Back links on PDF view go to issue
  page"), which left the text's test as it was.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/pdfJsViewer searched by
  "Return to Issue Details", "Return to Article Details",
  `issue.return`, `article.return`, and "pdf viewer return screen
  reader". Read: `pkp/pkp-lib#1546` (the address, fixed 2016),
  `pkp/pkp-lib#2372` (the HTML reader's arrow address, closed),
  `pkp/pkp-lib#10208` (rich titles), `pkp/pkp-lib#10781` (galley
  buttons' accessibility, another element).
- Not driven: 3.4 and 3.3 (code only); the article in no issue (code
  only); a real screen reader (the
  walk read the link's hidden text and its accessible name).
