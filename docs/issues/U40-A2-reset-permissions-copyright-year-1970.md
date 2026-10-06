# Reset Permissions stamps Copyright Year 1970 on every unpublished article or preprint, and publishing keeps it

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS (on "Use the article's publication date"), OPS
  - 3.5: OJS (on "Use the article's publication date"), OPS
  - 3.4: OJS (on "Use the article's publication date"), OPS (code)
  - 3.3: OJS (on "Use the article's publication date"), OPS (code)
- **Introduced** `pkp/pkp-lib#4651` for `pkp/pkp-lib#4618` · [4571ea62c4](https://github.com/pkp/pkp-lib/commit/4571ea62c44b4354e6f5c1b8ebb7744bdf78851d) · 2019-04-08 · ajnyga (ajnyga), the reset to the current defaults; with `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-09-05 · Nate Wright (NateWr), the unguarded year; both first in 3.2.0. OPS inherited both: `pkp/ops#5` · [5746436953](https://github.com/pkp/ops/commit/57464369535d117c0a286a05ca82ef0c9ea7d4c3) · 2020-04-07 · ajnyga (ajnyga)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U40 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager runs Tools › Permissions › reset to apply a changed license or
copyright holder to the items already in the journal or server. On a
journal set to "Use the article's publication date", and on a preprint
server, the reset gives every unpublished item (in review, in production
or declined) the Copyright Year 1970. A press, and a journal on "Use the
issue's publication date", give such items the current year.

Publishing keeps a year that is already filled in, so these items go out
with "Copyright (c) 1970" in their public records unless an editor types
the right year by hand. Installs that ran the reset since 3.2.0 hold
1970 on the items it stamped then, and repairing them takes an editor
correcting each item, or the upgrade step proposed below.

## Impact

- **Lost**: a correct copyright statement on every item that was
  unpublished when the reset ran. Once published, its records say
  "Copyright (c) 1970": the OAI-PMH record that harvesters read, the
  feeds, and on a journal the article page's `DC.Rights` header and the
  JATS output. Nothing on screen says the year is wrong.
- **Who**: every preprint server, and every journal set to "Use the
  article's publication date", whose manager runs the reset.
- **Way round**: an editor types the right year into each item's
  Copyright Year on Permissions & Disclosure. A harvester re-reads a
  record only when its datestamp moves, on its own schedule: on a
  journal that edit moves it, on a preprint server it does not (the
  datestamp is the submission's last change, which a publication edit
  leaves alone; read in the code), so harvested copies keep 1970 there
  until a full re-harvest.

Medium: a public record goes wrong silently, for every unpublished item,
but only after a rarely used tool, and each item can be corrected on
screen.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, with its
`config.inc.php` (`time_zone = UTC`). The journal is on "Use the issue's
publication date" in that dataset, where the fault does not show, so
step 2 changes it; a preprint server has no such setting.

On the journal (OJS):

1. Sign in as `rvaca` (Journal manager).
2. Settings › Distribution › "License": under "Copyright Year" choose
   "Use the article's publication date" and press "Save".
3. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (Submission stage),
   and its Publication › "Permissions & Disclosure". Copyright Year is
   empty and locked, with "Override".
4. Tools › "Permissions" › "Reset Article Permissions", and OK in the
   browser's box ("Are you sure you wish to reset permissions data for
   all articles? This action can not be undone."). The page shows
   "Article permissions were successfully reset."
5. Open submission 4's "Permissions & Disclosure" again, then that of
   submission 18, "Self-Organization in Multi-Level Institutions in
   Networked Environments" (declined).

On the preprint server (OPS):

1. Sign in as `rvaca` (Preprint Server manager).
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production" (Production), and its Preprint ›
   "Permissions & Disclosure". Copyright Year is empty and locked.
3. Tools › "Permissions" › "Reset Preprint Permissions", and OK. The
   page shows "Preprint permissions were successfully reset."
4. Open submission 1's "Permissions & Disclosure" again, then that of
   submission 4, "Genetic transformation of forest trees" (declined).
5. On submission 1's Production stage press "Post the preprint". It
   opens Preprint › "Title & Abstract"; press "Post" in its header, and
   "Post" in the window that asks "Are you sure you want to post this?".
6. Open submission 1's "Permissions & Disclosure" again.
7. Open the server's OAI-PMH list,
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`,
   and find the record `…:preprint/1`.

**Expected**: the reset gives each unpublished item the current year,
"2026".

**Observed**: Copyright Year reads "1970", unlocked, on submissions 4
and 18 of the journal and on submissions 1 and 4 of the preprint server.
After posting, submission 1 still reads "1970", and its OAI-PMH record
says:

```xml
<dc:rights xml:lang="en">Copyright (c) 1970 Public Knowledge Preprint Server</dc:rights>
```

beside `<dc:date>2026-10-03</dc:date>`. Every request answered 200.

Control: on the press (OMP), Tools › "Permissions" › "Reset Monograph
Permissions" gives the unpublished submission 3, "The Political Economy
of Workplace Injury in Canada", "2026". The published items (journal
submission 17, preprint 2) read "2026" after the reset; in this dataset
their own year and the current year are the same.

## Cause

`Repo::submission()->resetPermissions()` (lib/pkp
`classes/submission/Repository.php`) asks each submission for the
default year with `_getContextLicenseFieldValue(null,
PERMISSIONS_FIELD_COPYRIGHT_YEAR)`. That method, in each app's
`classes/submission/Submission.php`, starts from `date('Y')` and then
overrides it with the year of the current publication's
`datePublished`:

- OJS, the `'submission'` case of `copyrightYearBasis` (line 94):
  `$fieldValue = date('Y', strtotime($publication->getData('datePublished')));`
- OPS, unconditionally (line 90): the same expression under
  `if ($publication)`.

An unpublished publication has no `datePublished`. `strtotime(null)`
returns `false`, `date('Y', false)` reads it as the timestamp 0, and the
year comes out as 1970. The override should apply only when there is a
date. OMP's twin checks `if ($publication->getData('datePublished'))`
first, and OJS's `'issue'` case checks the issue's date the same way.

Two 2019 changes, both first released in 3.2.0, brought it together:

- 4571ea62c4 (`pkp/pkp-lib#4618`) made the reset write the context's
  defaults through this method. Before it the tool emptied the three
  fields (`SubmissionDAO::deletePermissions()`), and publishing filled
  in the year, so 3.1.x gave the right year.
- 88aba9a0cb (versioning) replaced the method's "is this article
  published" check (a `published_submissions` row) with `if
  ($publication)`, which every submission passes.

OPS took the code from OJS and dropped the `copyrightYearBasis` switch in
5746436953; it never had a working state.

Reach:

- `Repo::publication()->publish()` calls the method only when the
  publication has no `copyrightYear` and after `datePublished` is set,
  so publishing alone gives the right year; it never overwrites a filled
  year, which is why the 1970 goes out (walked on OPS). No other caller
  in the three apps passes a publication without a date.
- The reset passes no publication, so every version of a submission gets
  the current version's values: a new, unpublished version of a
  published item gets the published year, not 1970 (read in the code).
- The other `date('Y', strtotime(…))` calls in the apps (SUSHI reports,
  OAI JATS, DataCite, PubMed, Google Scholar) read published items or
  check the date first.

## Proposed fix

Guard the date in both apps' `_getContextLicenseFieldValue()` the way
OMP does
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-copyright-year-1970/fix-ojs.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-copyright-year-1970/fix-ops.diff)):

```diff
--- a/classes/submission/Submission.php   (OJS)
+++ b/classes/submission/Submission.php
                         case 'submission':
                             // override to the submission's year if published as you go
-                            $fieldValue = date('Y', strtotime($publication->getData('datePublished')));
+                            if ($publication->getData('datePublished')) {
+                                $fieldValue = date('Y', strtotime($publication->getData('datePublished')));
+                            }
                             break;
```

```diff
--- a/classes/submission/Submission.php   (OPS)
+++ b/classes/submission/Submission.php
-                if ($publication) {
+                if ($publication && $publication->getData('datePublished')) {
                     $fieldValue = date('Y', strtotime($publication->getData('datePublished')));
                 }
```

The method decides the default year, so the guard covers every caller.
The reset then writes the current year on unpublished items, and
publishing keeps it even when the item is published in a later year.
OMP and a journal on the issue basis already behave this way.

Tried on OJS and OPS: the reset gave the unpublished items "2026",
posting kept it, and the preprint's OAI-PMH record read "Copyright (c)
2026 …". An unpublished item with a typed publication date of
2020-05-01 got "2020" with the fix and without it.

**Alternatives**:

- Leave `copyrightYear` empty on unpublished versions in
  `resetPermissions()`, so publishing fills in the year it happens in.
  The data would be better, but it is a product decision on what the
  reset should reach, and the method would stay wrong for the next
  caller.
- Pass each publication to the method in `resetPermissions()`. Each
  version would then get its own values, which is right for other
  reasons, but it does not stop the 1970.

**What goes with it**:

- Repair, optional: an upgrade step for installs that ran the reset.
  For each publication whose `copyrightYear` is "1970" or "1969" (an
  install west of UTC) and whose own date is not in that year: on a
  published one, set the year again through the fixed method with the
  publication passed (the year of its `datePublished`, or of its issue's
  date on the issue basis); on an unpublished one, empty it so publishing
  fills it in. Emptying a published item's year would remove its
  copyright statement altogether, because the OAI record and the
  `DC.Rights` header need both holder and year. The step should also
  touch the submission's `last_modified`, so harvesters see the changed
  records. Without the step, a manager can run the fixed reset again;
  that repairs the years but also overwrites every item's own holder and
  license.
- Backport: the same two lines apply to 3.5, 3.4 and 3.3 (in 3.3 the
  file is `classes/submission/Submission.inc.php`).
- Guard: a PHPUnit test of `_getContextLicenseFieldValue()` in OJS and
  OPS with a publication that has no `datePublished`. The method reads
  the context through `app()->get('context')`, so the test needs the
  test database or a mocked context.

Medium: one line in each of two app repos, with a unit test in each; the
repair step, if the team takes it, adds an upgrade migration to both.

## Evidence

- Kept script that takes the Steps on the three apps (the press as the
  control), on an install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-copyright-year-1970/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reset-permissions-copyright-year-1970/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/reset-permissions-copyright-year-1970/walk.js`.
  It records each "Permissions & Disclosure" box's value and whether it
  is locked, the reset request's status and the page's message, and on
  OPS the posting answer and the OAI-PMH record.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/reset-permissions-copyright-year-1970/fix-ojs.diff ojs`
  and `… fix-ops.diff ops`, walk.js with `ONLY=ojs,ops`, then
  `node bin/try-fix.js revert …` for each. The typed-date case is the
  same script with `R1_MODE=nb` in front, run with the fix in and out:
  it types "2020-05-01" into the unpublished item's "Publication Date"
  (OJS, Publication › "Publication Settings", with "Don't Assign To An
  Issue") or "Date Posted" (OPS, Preprint › "Preprint entry") before the
  reset.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets 566bb1f (`main` and `stable-3_5_0` dumps). Tips: OJS
  `main` ff004d0973 (pkp-lib 987776cd04), OMP `main` 3b0ecf794c and OPS
  `main` c8af945bb7 (pkp-lib 3dc90c81a6); OJS 3.5 c1cee76b95 (pkp-lib
  771474347e), OMP 3.5 9c5e24246c and OPS 3.5 38b61882d3 (pkp-lib
  cf3f984335). The same script ran on 3.5 with
  `PKP_E2E_LINE=stable-3_5_0` in front and saw the same values, posting
  included; the 3.5 OAI-PMH record was read by opening the list after
  the walk.
- 3.4 and 3.3 read in the code: OJS `stable-3_4_0` d68934d0d1 and
  `stable-3_3_0` ac77c9fb35 (`classes/submission/Submission[.inc].php`,
  the `'submission'` case unguarded); OPS `stable-3_4_0` acd8ae704b and
  `stable-3_3_0` c5532e2161 (unguarded); OMP `stable-3_4_0` 0aec65441f
  and `stable-3_3_0` 8e72fc8836 (guarded). The reset calls the method
  without a publication there too: pkp-lib `stable-3_4_0` 767353f4fe
  `Repository::resetPermissions()`, `stable-3_3_0` ac3fa73402
  `PKPSubmissionDAO::resetPermissions()`. pkp-lib `3_1_2-4`
  `SubmissionDAO::deletePermissions()` empties the three settings.
- Introduced: `git blame` puts OJS line 94 and OPS line 90 on the PSR-12
  reformat (665ed1f925, ee952a951d, 2021); `git log -S` on the
  expression leads to 88aba9a0cb (authored 2019-06-26, merged
  2019-09-05 in `pkp/ojs#2457`), whose parent read the date only for a
  published article, and to 5746436953 (OPS, `pkp/ops#5`). 4571ea62c4
  (authored 2019-04-03, merged 2019-04-08) replaced
  `deletePermissions()` with `resetPermissions()` in
  `PKPToolsHandler`. `git tag --contains` gives `3_2_0-0` as the first
  tag for both; OPS's change is first in `3_2_1rc1`.
- On PHP 8.1 and later, `strtotime(null)` also raises "Passing null to
  parameter #1 ($datetime) of type string is deprecated". It did not
  reach these installs' logs, whose PHP error reporting leaves out
  `E_DEPRECATED`; an install that logs it shows it there.
- Harvesting, read in the code: OJS's `OAIDAO` takes the datestamp as
  `GREATEST(a.last_modified, i.last_modified, p.last_modified)` over the
  submission, its issue and its current publication; OPS's takes
  `a.last_modified`, the submission's. `Repo::publication()->edit()`
  stamps only the publication.
- Unverified: on an install whose `time_zone` is west of UTC,
  `date('Y', 0)` gives 1969 rather than 1970 (not walked). MySQL not
  checked; the fault is in PHP, not in a query.
- Upstream searched 2026-10-03 in pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library ("copyright year 1970", "reset permissions copyright
  year", "_getContextLicenseFieldValue", "resetPermissions"): nothing
  reports the 1970. `pkp/pkp-lib#4618` (closed 2019) is the change that
  made the tool reset to the current defaults.
