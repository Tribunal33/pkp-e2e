# A press's "Disable Submissions" help speaks of "new articles", where a press takes monographs

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#851` for `pkp/pkp-lib#5702` · [dad0d4b316](https://github.com/pkp/omp/commit/dad0d4b3169de63c31337adf0764cddf77b558cf) · 2020-07-22 · Salman Murad (salmanm2003)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U58 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#omp1)
- **Checked** 2026-10-04, each branch's latest commit (OMP's in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Settings › Workflow › "Submission" › "Disable Submissions",
the help under the box reads "Prevent users from submitting new articles
to the press.", where a press takes monographs. A journal's help says
"new articles to the journal" and a preprint server's "new preprints to
the server".

Every press manager who opens Settings › Workflow with the interface in
English sees it, since the panel is the one the page opens on. Fourteen
of OMP's translations repeat "articles" (the Cause names them); the fix
is to the English text; the translations are for their translators to follow.

## Impact

- **Lost**: nothing; the box disables submissions as its heading says.
- **Who**: users with a manager-level role on a press (Press manager,
  Press editor) opening Settings › Workflow.
- **Way round**: none needed; the meaning is clear from the heading.

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press"). Nothing else.

Steps:

1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`):
   "Workflow Settings" opens on "Submission" with the side tab "Disable
   Submissions" open.
3. Read the help under the "Disable Submissions" heading.

**Expected**: "Prevent users from submitting new monographs to the press.
Submissions can be disabled for individual press series on the press
series settings page."

**Observed**:

```
Prevent users from submitting new articles to the press. Submissions can be disabled for individual press series on the press series settings page.
```

## Cause

The help is the locale key `manager.setup.disableSubmissions.description`,
which pkp-lib's `PKPDisableSubmissionsForm` reads and each app words in
its own `locale/en/manager.po`. OMP's reads (line 925):

```po
msgid "manager.setup.disableSubmissions.description"
msgstr "Prevent users from submitting new articles to the press. Submissions can be disabled for individual press series on the <a href=\"{$url}\">press series</a> settings page."
```

The string came with the feature itself (`pkp/pkp-lib#5702`, "Ability to
disable submissions"). OMP's copy adapted OJS's sentence ("journal" to
"press", "journal sections" to "press series") but kept "articles".
`pkp/pkp-lib#7425` (01e1b19f9b, 2021) later only escaped the quotes in
that line.

Reach:

- OMP's other English strings that a user sees: none says "article".
  `search.results.orderBy.article` ("Article Title") is defined, but no
  OMP or pkp-lib template or class reads it. Checked in the code.
- OMP's translations of the key, read in `locale/*/manager.po`: 14
  repeat "articles" (Catalan, Czech, Galician, Croatian, Hungarian,
  Indonesian, Macedonian, Polish, Portuguese, Portuguese (Brazil),
  Romanian, Russian, Spanish, Turkish); nine name submissions, works or
  manuscripts (Bulgarian, Danish, Finnish, French, German, Mongolian,
  Norwegian, Slovenian, Ukrainian); five are empty (Kurdish (Sorani),
  Greek, French (Canada), Swedish, Vietnamese). Empty French (Canada)
  shows a raw text code in place of the help (checked on screen), a
  missing translation and another fault. Checked in the code.

## Proposed fix

Name the press's kind of work in OMP's English string, as OPS's names
preprints. OMP calls a submission a monograph in its other messages ("A
new monograph has been submitted…")
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-disable-submissions-help-says-articles/fix.diff)):

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -923,7 +923,7 @@
 msgstr "This press is not accepting submissions at this time. Visit the workflow settings to allow submissions."
 
 msgid "manager.setup.disableSubmissions.description"
-msgstr "Prevent users from submitting new articles to the press. Submissions can be disabled for individual press series on the <a href=\"{$url}\">press series</a> settings page."
+msgstr "Prevent users from submitting new monographs to the press. Submissions can be disabled for individual press series on the <a href=\"{$url}\">press series</a> settings page."
 
 msgid "manager.setup.genres"
 msgstr "Genres"
```

Tried on OMP `main`: step 3 then shows "…new monographs to the press…",
and the help's "press series" link kept its address
(`…/management/settings/context#sections`).

**Alternatives**:

- "new books" or "new submissions": also right; "monographs" matches the
  word OMP uses for a submission elsewhere. The team's choice.

**What goes with it**:

- Backport: the string is the same on every branch but sits at other
  line numbers, so the diff applies with an offset: on `stable-3_5_0`
  at line 914, on `stable-3_4_0` at 920, and on `stable-3_3_0` at 914
  of `locale/en_US/manager.po` (the path changes there).
- Translations: the English change does not touch them. Translators
  revising the 14 that repeat "articles" through Weblate (the files'
  `X-Generator: Weblate` header) is the usual route; how PKP's Weblate
  flags a changed English text was not checked.
- Guard: an e2e check that each app's "Disable Submissions" help names
  its own kind of work (a **Planned** item in spec U58).

Small: one word in one OMP locale string.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-disable-submissions-help-says-articles/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-disable-submissions-help-says-articles/lib.js),
  on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/press-disable-submissions-help-says-articles/walk.js`.
  With `WALK_MODE=nb` it reads, instead of the steps, the help link's
  address in English and the same panel in French (Canada), which were
  compared with the fix in and out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, PostgreSQL, the
  default dataset from pkp/datasets 566bb1f (2026-10-03). No request
  failed and no page script failed.
- OMP's latest commits: `main` 3b0ecf794c, `stable-3_5_0` 9c5e24246c,
  `stable-3_4_0` 0aec65441f, `stable-3_3_0` 8e72fc8836.
- Code reads: OMP's English `manager.po` on the four branches (the same
  sentence on each); pkp-lib's `PKPDisableSubmissionsForm` (the key it
  reads) and `templates/management/workflow.tpl` (the "Disable
  Submissions" side tab shows the form) on the four branches; OMP's
  other `locale/*/manager.po` for the translations; `git log -S` on the
  sentence for the commit that added it.
