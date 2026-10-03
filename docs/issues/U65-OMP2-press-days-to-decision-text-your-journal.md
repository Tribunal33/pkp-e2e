# A press's "Days to First Editorial Decision" help text says "authors submitting to your journal"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#5342` for `pkp/pkp-lib#4844` · [3c69fb4](https://github.com/pkp/pkp-lib/commit/3c69fb482e271fd248fab9bc206dd6dffd90f2ef) · 2019-12-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** U65 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, Statistics › "Editorial Activity" has an information icon
after "Days to First Editorial Decision". Its text ends "…when the
majority of authors submitting to your journal can expect a decision."
It should read "your press".

Nothing else on the page is wrong, and the figures are right.

Most translations name a journal too: in French the text reads
"…soumettant à votre revue…" on a press.

## Impact

- **Lost**: nothing.
- **Who**: managers and editors of every press who open "Editorial
  Activity" and point at that icon.
- **Way round**: none on screen. Off screen, the site's administrator
  can edit the string in the installed locale file on the server, and
  the next upgrade overwrites the edit.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press"). Nothing else.

Steps:

1. Sign in as `dbarnes` (Press editor).
2. Open Statistics › "Editorial Activity"
   (`/index.php/publicknowledge/en/stats/editorial/editorial`).
3. In the "Trends" table, rest the mouse pointer on the information icon
   after "Days to First Editorial Decision" (a screen reader names it
   "Description for Days to First Editorial Decision").
4. Read the text that shows.

**Expected**: the last paragraph reads "This statistic attempts to
describe when the majority of authors submitting to your press can
expect a decision."

**Observed**:

```
The number of days it takes for most submissions to receive the first editorial decision, such as desk rejection or send for review.

These figures indicate that 80% of submissions reach the decision within the given number of days.

This statistic attempts to describe when the majority of authors submitting to your journal can expect a decision.
```

On OJS the same steps show the same text, which is right for a journal.
A preprint server's "Editorial Activity" has no "Days to First Editorial
Decision" row.

## Cause

`PKP\pages\stats\PKPStatsHandler::_getStatDescription()` (lib/pkp
`pages/stats/PKPStatsHandler.php`, line 566) gives the
`daysToDecision` row the text of
`stats.description.daysToDecision`. That string lives in lib/pkp
`locale/en/manager.po` (lines 2920–2926) and ends "…submitting to your
journal can expect a decision." OMP's `locale/en/manager.po` does not
define the key, so a press shows the shared, journal-worded text.

OMP already overrides shared strings where it needs press wording, but
never got this one.

Reach:

- Screens: only "Editorial Activity"'s "Days to First Editorial
  Decision" icon, on a press (on screen, `main` and 3.5). OPS's
  `APP\services\StatsEditorialService::getOverview()` leaves the row
  out, so a preprint server never shows the text (on screen and in the
  code).
- Languages: lib/pkp's `locale/*/manager.po` carry the key in 58
  languages besides English. 37 translate it with a word for journal
  (`fr_CA` "votre revue", `de` "dieser Zeitschrift", `es` "su revista",
  `pt_BR` "seu periódico" among them), 6 name no publication (`fi`,
  `hu`, `is`, `it`, `mk`, `th`) and 15 leave it untranslated. No OMP
  locale file defines the key (checked in the code).

## Proposed fix

Give OMP its own English string for the key, worded for a press, beside
OMP's other statistics strings in `locale/en/manager.po`. This follows
how OMP already handles shared strings that name the context: OMP's
`locale/en/admin.po` gives
`admin.settings.statistics.sushiPlatform.isSiteSushiPlatform` "…for all
presses.", over lib/pkp's "…for all journals.". The fix covers English
only.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-days-to-decision-text-your-journal/fix.diff),
against OMP's root:

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -1125,6 +1125,14 @@
 msgid "stats.context.downloadReport.downloadContext"
 msgstr "Download Press"
 
+msgid "stats.description.daysToDecision"
+msgstr ""
+"The number of days it takes for most submissions to receive the first "
+"editorial decision, such as desk rejection or send for review.<br><br>These "
+"figures indicate that 80% of submissions reach the decision within the given "
+"number of days.<br><br>This statistic attempts to describe when the majority "
+"of authors submitting to your press can expect a decision."
+
 msgid "stats.publications.downloadReport.description"
```

Tried on OMP `main`: the Steps then showed "…submitting to your press
can expect a decision." The page's other information texts in English,
and every French text, read the same with and without the fix.

**Alternatives**

- Neutral wording in lib/pkp ("…authors submitting here…"). It fixes
  every app at once, but changes OJS's text and sends all 58
  translations back to the translators, for an app (OPS) that never
  shows it.
- Moving the key out of lib/pkp into OJS and OMP, as the apps' own
  `stats.context.*` strings are. That touches three repositories and
  drops the existing translations of the shared key.

**What goes with it**

- Translations: the other languages are left to the translators, who
  add OMP's string in their language through Weblate. Until then a press
  in one of the 37 languages above keeps lib/pkp's journal wording.
- Backport: the diff applies to `stable-3_5_0` with an 11-line offset
  (`patch` accepts it), and the same lines are in `stable-3_4_0`. On 3.3
  the string goes in OMP's `locale/en_US/manager.po`.
- Not fixed by this diff, the same mistake in two other shared
  statistics strings: `manager.editorialStatistics.description`
  ("…editorial statistics of the journal…", on a press's Settings ›
  Workflow › "Emails";
  [U56 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a1))
  and `admin.settings.statistics.sushiPlatform.description` ("By
  default, the journal will be designated as the platform…", on the
  site administrator's statistics settings of an OMP site). Each needs
  its own OMP (and OPS) string.
- Test: an e2e check that reads the icon's text on a press.

Small.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-days-to-decision-text-your-journal/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-days-to-decision-text-your-journal/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/press-days-to-decision-text-your-journal/walk.js`
  (the Steps; with `neighbour` after it, the same page in French, read
  with and without the fix). No failed request and no script error on
  any walk.
- Fix applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/press-days-to-decision-text-your-journal/fix.diff omp`.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  3dc90c81a6); `stable-3_5_0` OMP 9c5e24246c (lib/pkp cf3f984335);
  `stable-3_4_0` OMP 0aec65441 (lib/pkp 9e41f10273); `stable-3_3_0` OMP
  8e72fc883 (lib/pkp ac3fa73402).
- Not walked: 3.4 and 3.3. Code reads: lib/pkp `locale/en/manager.po`
  (3.3: `locale/en_US/manager.po`) and
  `PKPStatsHandler::_getStatDescription()` (3.3:
  `PKPStatsHandler.inc.php`) on each line. OMP's English `manager.po` on each line,
  none defining the key. lib/pkp `PKPStatsEditorialService::getOverview()`
  on 3.4 and 3.3 (the row is there) and OMP's `classes/` (no override).
  OPS `StatsEditorialService::getOverview()` on `main` and 3.5 (no row).
  On `main`: every lib/pkp key that OMP's English locale overrides,
  every lib/pkp English string about statistics that names a journal,
  and every lib/pkp and OMP translation of the key.
- Introduced: `git log -S 'submitting to your journal'` in lib/pkp finds
  3c69fb482e, which replaced the earlier neutral text ("The average
  number of days…") while the statistics page was still being built in
  `pkp/pkp-lib#5342` (merged 2019-12-16), before any release. Later
  commits only rewrapped the lines (08fd12645a, Weblate) and moved
  `en_US` to `en`.
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ui-library; issues and PRs)
  by "your journal" press, "days to first editorial decision",
  "submitting to your journal", `daysToDecision`, and editorial
  statistics wording: nothing about this text. The closest,
  `pkp/pkp-lib#1734` ("[OMP] new user registration mentions journals"),
  is about another screen.
- MySQL not checked; the fault is in a locale string, not a query.
