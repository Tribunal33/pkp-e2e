# "Articles Report" writes article titles holding "&", an apostrophe or italics with web codes ("&amp;")

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; titles are plain text)
- **Introduced** `pkp/ojs#3731` for `pkp/pkp-lib#2564` · [ea10661a46](https://github.com/pkp/ojs/commit/ea10661a46496957d1c395f8b377b6fe5eff7a84) · 2023-02-07 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U65 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#ojs2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" writes article titles with web codes in place of
"&", "<", ">", quotes, apostrophes and formatting. "Fogelin's" reads
"Fogelin&#039;s", and a word put in italics reads
"&lt;i&gt;Commons&lt;/i&gt;". Only the "Title" column is affected; the
titles are stored and shown correctly everywhere else.

How often "&" is coded depends on how the title was saved. The "Title"
box on the "Title & Abstract" page stores "&" as "&amp;", so a title
saved there reads "&amp;amp;" in the file. A title stored with a bare
"&" (carried over from 3.3, saved through the API, or as in PKP's test
data, "Hansen & Pinto") reads "&amp;" once.

Whoever uses the file has to find and replace the codes by hand, and
nothing says they are there. The report has done this since OJS 3.4.0;
3.3 stored titles as plain text and wrote them as stored. The fix is
one line: the report codes the title a second time on export.

## Impact

- **Lost**: the correct title in the report's file, for every such
  article.
- **Who**: journal managers and editors, each time they download the
  "Articles Report". Ordinary titles meet it: two of the 20 submissions
  in PKP's test journal, and any title with a species name in italics or
  a formula with subscripts.
- **Way round**: replace the codes in a spreadsheet, or copy each title
  from its workflow.

Medium: a secondary output is wrong in one field for many ordinary
titles, silently; it would be high if another system read the file
without a person checking it.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main`. It holds
submission 9, "Hansen & Pinto: Reason Reclaimed", and submission 6,
"Investigating the Shared Background Required for Argument: A Critique
of Fogelin's Thesis on Deep Disagreement". Steps 5–7 add a title
formatted on screen, which the dataset lacks.

A title from the dataset:

1. Sign in as `dbarnes`.
2. Open "Statistics" › "Reports" (`/index.php/publicknowledge/en/stats/reports`).
3. Press "Articles Report". The browser downloads
   `articles-JPKJPK-<date>.csv`.
4. Open the file and read the "Title" cells of submissions 9 and 6.

A title formatted on screen:

5. Open submission 8, "Traditions and Trends in the Study of the
   Commons"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=8`),
   then "Publication" › "Title & Abstract".
6. In "Title", replace the text with "Traditions & Trends in the Study
   of the Commons", select "Commons" and press Ctrl+I (or "Formatting" ›
   "Italic"). Press "Save".
7. Back on "Statistics" › "Reports", press "Articles Report" again and
   read the "Title" cell of submission 8.

**Expected**: the titles as typed, in plain text, as the "Abstract"
column is:

```
9  Hansen & Pinto: Reason Reclaimed
6  Investigating the Shared Background Required for Argument: A Critique of Fogelin's Thesis on Deep Disagreement
8  Traditions & Trends in the Study of the Commons
```

**Observed**: the "Title" cells hold web codes. The save in step 6
answered 200 and stored `Traditions &amp; Trends in the Study of the
<i>Commons</i>`.

```
9  Hansen &amp; Pinto: Reason Reclaimed
6  Investigating the Shared Background Required for Argument: A Critique of Fogelin&#039;s Thesis on Deep Disagreement
8  Traditions &amp;amp; Trends in the Study of the &lt;i&gt;Commons&lt;/i&gt;
```

The other 18 titles, including submission 1's prefix "The" and its
subtitle, come out as typed.

## Cause

`ArticleReportPlugin::display()` builds the "Title" cell at
[`plugins/reports/articles/ArticleReportPlugin.php` line 187](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/plugins/reports/articles/ArticleReportPlugin.php#L187):

```php
'title' => htmlspecialchars($publication->getLocalizedFullTitle(null, 'html')),
```

Since `pkp/pkp-lib#2564` a publication's title is stored as HTML. The
"Title" box keeps `b`, `i`, `u`, `sup` and `sub` (`allowed_title_html`)
and stores "&" as `&amp;`. `getLocalizedFullTitle(null, 'html')` returns
that HTML, and `htmlspecialchars()` encodes it a second time. The cell
goes into a CSV file that nothing renders as HTML, so tags come out as
`&lt;i&gt;`, a stored `&amp;` as `&amp;amp;`, and a plain "&", "<", ">",
quote or apostrophe (titles saved through the API or an import, as the
dataset's are) as `&amp;`, `&lt;`, `&gt;`, `&quot;` or `&#039;`.

The rule it breaks: a CSV cell holds plain text. `PKPPublication`
already gives that form: `getLocalizedFullTitle(null, 'text')` strips
the tags and decodes the entities of the title and subtitle
(`htmlspecialchars_decode(strip_tags())`) and adds the prefix as typed.
Before ea10661a46 the line called `getLocalizedFullTitle()`, whose
default is still that text form. The commit changed this caller to the
`'html'` form the HTML pages use and wrapped it in `htmlspecialchars()`.

Reach:

- The other columns of the "Articles Report" (code): "Abstract" and each author's
  "Biography" go through `html_entity_decode(strip_tags())` and come out
  plain; section titles and names are plain-text fields.
- OMP's "Monograph Report" (`plugins/reports/monographReport/Report.php`)
  calls `getLocalizedFullTitle()`, the text form: not affected (code).
  OPS has no such report.
- The "Review Report" of OJS and OMP (`ReviewReportDAO::getReviewReport()`)
  reads the title straight from `publication_settings`, so a title
  edited on screen comes out with its stored HTML (`&amp;`, `<i>`)
  there. Same kind of fault by another path; checked in the code only,
  left out of this fix.
- The same `htmlspecialchars()` around an `'html'` title, from the same
  `pkp/pkp-lib#2564` work, in lib/pkp:
  `classes/mail/mailables/EditorialReminder.php` (line 91, the editorial
  reminder email's task list, which is HTML) and
  `controllers/review/linkAction/ReviewNotesLinkAction.php` (line 58, a
  window title). Checked in the code only, not walked; left out
  (pkp-lib, other screens).
- Stored data: none is wrong, so nothing needs repair. No upgrade step
  recodes titles, which is why titles carried over from 3.3 keep a bare
  "&" until edited.

## Proposed fix

A proposal: ask the publication for its plain-text title, as OMP's
"Monograph Report" does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-title-html-codes/fix.diff)):

```diff
--- a/plugins/reports/articles/ArticleReportPlugin.php
+++ b/plugins/reports/articles/ArticleReportPlugin.php
@@ -184,7 +184,7 @@
             $results[] = [
                 'submissionId' => $submission->getId(),
-                'title' => htmlspecialchars($publication->getLocalizedFullTitle(null, 'html')),
+                'title' => $publication->getLocalizedFullTitle(null, 'text'),
                 'abstract' => html_entity_decode(strip_tags($publication->getLocalizedData('abstract'))),
```

It keeps what `pkp/pkp-lib#2564` was for: titles stay HTML where they
are shown as HTML, and the call names its format. Tried on `main`: with
the fix in, the walk's file showed all three titles as Expected. The report of the
untouched dataset, downloaded with the fix in and out, differed only in
the "Title" cells of submissions 6 and 9.

**Alternatives**:

- `html_entity_decode(strip_tags(…'html'))`, as the "Abstract" column
  does: it decodes every entity, where the 'text' form decodes only
  `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#039;`. Titles typed on screen
  come out the same either way (the editor stores other characters
  raw); an imported title carrying `&eacute;` or `&nbsp;` would differ.
  It also repeats in the plugin what `PKPPublication` owns.
- Dropping only `htmlspecialchars()`: plain "&" and apostrophes come
  out right, but tags and the stored `&amp;` of titles typed on screen
  stay.

**What goes with it**:

- The line is the same on 3.5 and 3.4, so the diff applies as written
  to both.
- The guard: an e2e check that downloads the "Articles Report" for a
  title holding "&", an apostrophe and an italic word (a **Planned**
  item in spec U65). The plugin has no unit tests.

Small: one line in the plugin, following OMP's report.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/articles-report-title-html-codes/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-title-html-codes/walk.js)
  (helpers in `lib.js` beside it; the report download and CSV reading
  from
  [`articles-report-supporting-agencies-empty/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-supporting-agencies-empty/lib.js)).
  It takes steps 1–7 on an install freshly loaded from the default
  dataset, OJS only (3.5: with `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/articles-report-title-html-codes/walk.js`.
  With the argument `neighbour`, it downloads the report of the
  unchanged dataset only. Step 6 is typed with the keyboard: the whole
  title, then Ctrl+Shift+Left from the end to select "Commons", then
  Ctrl+I.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/articles-report-title-html-codes/fix.diff ojs`.
- Tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0` OJS
  [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6)
  (lib/pkp cf3f984335); `stable-3_4_0` OJS
  [c1827e3527](https://github.com/pkp/ojs/commit/c1827e3527df2f402ba130af0ce82e6ed61cc33e)
  (lib/pkp 9e41f10273); `stable-3_3_0` OJS
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL. The fault does not depend on the database.
- 3.5's `ArticleReportPlugin.php` is identical to `main`'s.
- Code reads: 3.4, `upstream/stable-3_4_0:plugins/reports/articles/ArticleReportPlugin.php`
  line 169, and lib/pkp's `PKPPublication` there has
  the same `'html'` and `'text'` forms; ea10661a46 is on that branch.
  3.3, `ArticleReportPlugin.inc.php` line 140 calls
  `getLocalizedFullTitle()` with no format, and `PKPTitleAbstractForm`
  offers "Title" as a plain `FieldText`, so titles are stored and
  written as typed. OMP `main`: `plugins/reports/monographReport/Report.php`
  line 156. The other instances: `grep` for `htmlspecialchars(` around a
  `'html'` title in OJS, OMP and OPS and their lib/pkp.
- Introduced: `git blame` on line 187 gives ea10661a46
  ("pkp/pkp-lib#2564 Update tag configs for HTML title and use of
  PKPPublication::********Title()"), which replaced
  `$publication->getLocalizedFullTitle()` with the current line. GitHub
  names its PR `pkp/ojs#3731` ("pkp/pkp-lib#2564 Minimal HTML editor for
  submission title", touhidurabir, merged 2023-02-16). `git tag
  --contains ea10661a46` in the OJS checkout: first in `3_4_0rc1`, first
  release `3_4_0-0` (3.4.0).
- Stored forms: the dataset dump stores submission 9's title as
  `Hansen & Pinto: Reason Reclaimed`; the step-6 save answered with
  `Traditions &amp; Trends in the Study of the <i>Commons</i>`
  (`FieldRichTextarea.vue` line 235, `entity_encoding: 'raw'`, which
  still codes `&`, `<`, `>`). lib/pkp `classes/migration/upgrade/` has no
  step that recodes titles (`grep` for `title` and `htmlspecialchars`).
- Upstream searches (2026-10-03), pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs: "articles report" with amp, ampersand,
  htmlspecialchars, html entities, italic; "&amp;" with title, report,
  csv; "ArticleReportPlugin". None is this fault.
- Unverified: the "Review Report", `EditorialReminder` and
  `ReviewNotesLinkAction` instances were read in the code, not walked.
  A "<" or ">" typed in the "Title" box (stored as `&lt;`, `&gt;`) was
  not walked; by the code it comes out as `&amp;lt;`, `&amp;gt;`.
