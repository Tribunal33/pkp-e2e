# "Articles Report" leaves "Supporting Agencies" empty for every submission, though the agencies are filled in

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#5266` for `pkp/pkp-lib#11557` · [07a47a4117](https://github.com/pkp/ojs/commit/07a47a41178a34431c49fce1422165249f1cf0e0) · 2026-01-12 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U65 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#ojs1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" has an empty "Supporting Agencies" column for
every submission, published or not. The agencies entered on each
submission's Publication › "Metadata" page are saved and shown there,
and the columns beside it, such as "Keywords", are filled as expected.
Nothing in the file or on the page says the column is missing data.

Live journals meet it today: the released OJS 3.5.0-4 (April 2026)
and 3.5.0-5 both have the fault. Only journals that turn on "Supporting
Agencies" (Settings › Workflow › Metadata, off by default) collect
agencies, so only they are affected. Nothing in the app reads the
file; it is for the journal's own use, such as listing who funded its
articles. The fix is one variable name.

## Impact

- **Lost**: the funding information in the report's export; the
  agencies themselves are unaffected.
- **Who**: journal managers and editors on journals that collect
  supporting agencies, each time they download the report.
- **Way round**: copy the agencies by hand from each submission's
  Publication › "Metadata" page, one submission at a time.

Medium: one field of a secondary export is silently empty, with a slow
way round on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, context `publicknowledge`.
  "Supporting Agencies" is off for the journal and no submission holds
  an agency, so steps 2–4 turn the field on and fill it in.

1. Sign in as `dbarnes`.
2. Open Settings › Workflow › "Submission" › "Metadata", tick "Enable
   supporting agencies metadata" and press "Save".
3. Open submission 7, "Developing efficacy beliefs in the classroom",
   and go to Publication › "Metadata".
4. In "Supporting Agencies", type "u65ir10 Agency One" and press Enter,
   then type "u65ir10 Agency Two" and press Enter. Press "Save". Both
   agencies stay on the form after a reload.
5. Open Statistics › "Reports"
   (`/index.php/publicknowledge/en/stats/reports`) and press "Articles
   Report".
6. In the downloaded "articles-JPKJPK-<date>.csv", read the line whose
   "Submission ID" is 7.

**Expected**: "Supporting Agencies" reads "u65ir10 Agency One, u65ir10
Agency Two", joined in the same way as "Keywords".

**Observed**: "Supporting Agencies" is empty. On the same line,
"Keywords" reads "education, citizenship". No line of the file has an
agency.

The download answered normally, and neither the browser nor the server
recorded an error.

## Cause

`ArticleReportPlugin::display()` (OJS
`plugins/reports/articles/ArticleReportPlugin.php`) collects each
publication's agencies into `$supportingAgencies` (line 176), but the
line that fills the column (line 210) still reads `$agencies`:

```php
'agencies' => join(', ', $agencies[Locale::getLocale()] ?? $agencies[$submission->getData('locale')] ?? []),
```

`$agencies` is never defined in the method. `??` tests with `isset`, so
PHP raises no warning. Both lookups fall through to `[]`, and the cell
is written as an empty string for every submission.

Commit 07a47a4117 (`pkp/pkp-lib#11557`, "Use single format for keywords
in publication object") brought this in. It replaced the four
`Repo::controlledVocab()->getBySymbolic()` calls with reads of the
publication's own data, and renamed the agencies variable from
`$agencies` to `$supportingAgencies`. The line that uses it was not
renamed. Before that commit, `getBySymbolic()` returned the names keyed
by locale and the column was filled. The same change reached
`stable-3_5_0` as e4c2e79cca, first released in 3.5.0-4.

Reach:

- Only this column is affected. Subjects, disciplines and keywords kept
  their variable names in the same commit and are read correctly ("Keywords"
  was also seen filled in the downloaded file).
- The stored agencies are right (step 4), so no data needs repair.
- OMP's "Monograph Report" reads `supportingAgencies` through its own
  `Report::getAgencies()` and is not affected. OPS has no report
  plugins.
- The other readers of `supportingAgencies` that the commit touched
  (`DublinCoreMetaPlugin` among them) use the right variable.

## Proposed fix

Read the variable that the method actually fills
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-supporting-agencies-empty/fix.diff),
against the OJS root):

```diff
-                'agencies' => join(', ', $agencies[Locale::getLocale()] ?? $agencies[$submission->getData('locale')] ?? []),
+                'agencies' => join(', ', $supportingAgencies[Locale::getLocale()] ?? $supportingAgencies[$submission->getData('locale')] ?? []),
```

This keeps what 07a47a4117 was for (every vocabulary read from the
publication object in one format) and the name it chose.

Tried on `main`: after step 6, "Supporting Agencies" reads "u65ir10
Agency One, u65ir10 Agency Two", and no other cell of the file changes.
As a control, the report downloaded from the unchanged dataset, which
holds no agencies, is the same file, byte for byte, with the fix in and
out.

**Alternatives**

- Rename `$supportingAgencies` back to `$agencies`: this works the same
  way, but `$subjects`, `$disciplines` and `$keywords` are each named
  after their publication property, and `$agencies` would not be.
- Move the four blocks into a helper, as OMP's `Report` does with
  `flattenKeywords()`: this would remove the copy-paste that let the
  names drift apart, but it is a larger change than the fault needs.

**What goes with it**

- No API, hook or other screen changes. The column's header and
  position stay the same.
- Backport: the diff applies as it stands to `stable-3_5_0`. 3.4 and
  3.3 do not need it.
- Test: the plugin has no unit tests; an end-to-end check that reads
  the "Supporting Agencies" cell of a submission with agencies would
  have caught it.

Small: one line in one OJS file.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/articles-report-supporting-agencies-empty/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-supporting-agencies-empty/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–6 on an install
  freshly loaded from the default dataset, on OJS only (3.5: with
  `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=issues-ir10 PROBE_AGENT=ir10 node bin/probe.js ojs shared/playwright/checks/issues/articles-report-supporting-agencies-empty/walk.js`.
  With the argument `neighbour`, it only downloads the report from the
  unchanged dataset (the control above).
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/articles-report-supporting-agencies-empty/fix.diff ojs`.
- Branch tip commits checked: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0` OJS
  [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6)
  (lib/pkp cf3f984335); `stable-3_4_0` OJS
  [c1827e3527](https://github.com/pkp/ojs/commit/c1827e3527df2f402ba130af0ce82e6ed61cc33e)
  (lib/pkp 9e41f10273); `stable-3_3_0` OJS
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL. The fault does not depend on the database.
- Walked: `main` and 3.5, OJS, on 2026-10-03, with the same result on
  both.
- Code reads: `ArticleReportPlugin::display()` on the four branches.
  3.5's file is identical to `main`'s. On 3.4, `$agencies` comes from
  `SubmissionAgencyDAO::getAgencies()`, which returns plain names keyed
  by locale (lib/pkp `classes/submission/SubmissionAgencyDAO.php`). On
  3.3 the same holds in `ArticleReportPlugin.inc.php` and
  `SubmissionAgencyDAO.inc.php`. OMP `main`:
  `plugins/reports/monographReport/Report.php` `getAgencies()`.
- Introduced: `git blame` on line 210 gives a200614c74 (2024, unchanged
  since then). The definition on line 176 comes from 07a47a4117. At
  that commit's parent, lib/pkp is 18fd524ed0. There, `getBySymbolic()`
  defaults to `$asEntryData = false`, so it returned plain names keyed by
  locale, which `$agencies` held. `pkp/ojs#5266` was closed without a
  GitHub merge; Alec Smecher committed its change on 2026-01-15.
  Releases: `git tag --contains e4c2e79cca` gives 3_5_0-4 (2026-04-10)
  and 3_5_0-5; 3_5_0-3 does not have it.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-03, using the words "supporting agencies", "articles report"
  and "agencies empty", and the names `ArticleReportPlugin` and
  `supportingAgencies`. `pkp/pkp-lib#12604` (closed) is a fatal error
  in `DublinCoreMetaPlugin` with `supportingAgencies`, which is a
  different fault.
