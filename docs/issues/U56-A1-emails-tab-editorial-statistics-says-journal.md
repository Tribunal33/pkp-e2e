# On a press or a preprint server, the "Emails" settings call editorial statistics the journal's

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: none (code; no "Editorial statistics" choice)
- **Introduced** `pkp/pkp-lib#8407`, `pkp/omp#1242` and `pkp/ops#387` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · 2022-11-03 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U56 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U56-emails-management.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a press and a preprint server, Settings › Workflow › "Emails"
describes the "Editorial statistics" choice as "Whether or not to send a
monthly email to editors with the editorial statistics of the journal,
…". It should say "of the press" or "of the preprint server".

English shows it on both apps. So do the languages that translate the
shared text (French reads "…de la revue…"), until translators add each
app's own wording.

## Impact

- **Lost**: nothing; the choice saves and works as described.
- **Who**: managers of every press and preprint server who open the
  "Emails" tab of the workflow settings.
- **Way round**: none on screen. Off screen, the site's administrator
  can edit the string in the installed locale file on the server, and
  the next upgrade overwrites the edit.

Low: a wording that names the wrong kind of publication.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press"), or OPS `main` (preprint server
  `publicknowledge`, "Public Knowledge Preprint Server"). Nothing else.

Steps:

1. Sign in as `rvaca` (Press manager; on OPS Preprint Server manager).
2. Open Settings › Workflow and press the "Emails" tab
   (`/index.php/publicknowledge/en/management/settings/workflow#emails`).
3. Under "For Editors", read the description of "Editorial statistics".

**Expected**: "Whether or not to send a monthly email to editors with the
editorial statistics of the press, such as accept and decline rates.
Editors can unsubscribe from this email from their user profile." ("of
the preprint server" on OPS).

**Observed**, on both:

```
Whether or not to send a monthly email to editors with the editorial statistics of the journal, such as accept and decline rates. Editors can unsubscribe from this email from their user profile.
```

The tab's other lines that name a context name the right one. On the
press they read "Edit the messages sent in emails from this press.",
"Emails sent automatically on behalf of the press will have the
following signature added." and "Send a copy of the submission
acknowledgement email to this press's primary contact." (on OPS
"preprint server" in each). On OJS the same steps show the same
description, which is right for a journal.

## Cause

`PKP\components\forms\context\PKPEmailSetupForm::addStatisticsReportField()`
(lib/pkp `classes/components/forms/context/PKPEmailSetupForm.php`, line
218) describes the field with `manager.editorialStatistics.description`.
That string is defined only in lib/pkp `locale/en/manager.po` (line
3812 on OMP's and OPS's lib/pkp), where it reads "…editorial statistics
of the journal…". Neither OMP's nor OPS's `locale/en/manager.po`
defines the key, so a press and a preprint server show the shared,
journal-worded text.

The three keys behind the tab's other context-naming lines
(`manager.manageEmails.description`,
`manager.setup.emailSignature.description`,
`manager.setup.notifications.copySubmissionAckPrimaryContact.description`)
are each app's own, with no copy in lib/pkp. The change that built the
tab put this one in lib/pkp only. Its OMP and OPS companions
(`pkp/omp#1242`, `pkp/ops#387`) each gave the app its own
`manager.manageEmails.description`, but neither added this key.

Reach:

- Screens: only this description. The monthly email itself
  (`emails.statisticsReportNotification.*`) is each app's own string
  (checked in the code).
- Languages: the French tab of all three apps reads "…les statistiques
  éditoriales de la revue…", from lib/pkp's `fr_CA` string (on screen).
  33 of lib/pkp's 64 other languages translate the key, and no OMP or
  OPS locale file defines it (checked in the code).

## Proposed fix

Give OMP and OPS their own English string for the key, beside each
app's `manager.manageEmails.description` in `locale/en/manager.po`.
Both apps already override a shared string that names a journal this
way: `admin.settings.statistics.sushiPlatform.isSiteSushiPlatform`
reads "…for all presses." in OMP's `locale/en/admin.po` and "…for all
servers." in OPS's. One diff per app:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/fix-ops.diff).
OMP's:

```diff
--- a/locale/en/manager.po
+++ b/locale/en/manager.po
@@ -1409,6 +1409,12 @@
 
 msgid "manager.manageEmails.description"
 msgstr "Edit the messages sent in emails from this press."
+
+msgid "manager.editorialStatistics.description"
+msgstr ""
+"Whether or not to send a monthly email to editors with the editorial "
+"statistics of the press, such as accept and decline rates. Editors can "
+"unsubscribe from this email from their user profile."
 
 msgid "mailable.decision.sendInternalReview.notifyAuthor.name"
```

OPS's is the same with "of the preprint server".

Tried on OMP and OPS `main`: the Steps then showed "…editorial
statistics of the press, …" and "…of the preprint server, …". Every
other line of the English tab on the three apps, and the whole French
tab, read the same with and without the fix.

**Alternatives**

- Neutral wording in lib/pkp ("…with the editorial statistics, such
  as…"). It fixes both apps in one place, but changes OJS's text and
  sends the 33 translations back to the translators.
- Moving the key out of lib/pkp into each app, as the tab's sibling
  strings are. That touches three repositories and drops the existing
  translations of the shared key.

**What goes with it**

- Translations: the other languages are left to the translators, who
  add OMP's and OPS's string in their language through Weblate.
- Backport: both diffs apply as they stand to `stable-3_5_0` and
  `stable-3_4_0` (`patch` accepts them).
- Neighbour: a press's Statistics › "Editorial Activity" help text has
  the same kind of mistake in another shared string
  (`stats.description.daysToDecision`, "…your journal…"), reported
  apart because its fix is another string, on OMP only:
  [U65 OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U65-OMP2-press-days-to-decision-text-your-journal.md).
  That report names a third, `admin.settings.statistics.sushiPlatform.description`
  ("By default, the journal will be designated as the platform…", on an
  OMP site's statistics settings). A team that wants one change can add
  these strings to the apps' English files together; each is a separate
  string with its own reach.

Small: two locale entries and no code, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/walk.js`
  takes the Steps. Run with the argument `neighbour` at the end, the
  script reads the French tab instead; that run was taken with and
  without the fix. Walked on `main` and `stable-3_5_0`, the three apps
  each; no failed request and no script error on any walk.
- Fix applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/emails-tab-editorial-statistics-says-journal/fix-omp.diff omp`
  and `… fix-ops.diff ops`.
- Tips:
  - `main`: OJS ff004d0973 with lib/pkp 987776cd04; OMP 3b0ecf794c and
    OPS c8af945bb7, both with lib/pkp 3dc90c81a6.
  - `stable-3_5_0`: OJS c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3, all
    with lib/pkp cf3f984335.
  - `stable-3_4_0`: OMP 0aec65441f, OPS acd8ae704b; lib/pkp branch tip
    767353f4fe.
  - `stable-3_3_0`: OMP 8e72fc8836, OPS c5532e2161; lib/pkp branch tip
    ac3fa73402.
- Not walked: 3.4 and 3.3. Code reads:
  - On `main`, 3.5 and 3.4: lib/pkp `locale/en/manager.po` and
    `PKPEmailSetupForm::addStatisticsReportField()` (the same string
    and field), and OMP's and OPS's `locale/en/manager.po` (no
    definition of the key).
  - On 3.3: `PKPEmailSetupForm.inc.php` (only the signature and bounce
    address fields) and lib/pkp `locale/en_US` (no such string).
  - On `main`: every field of `PKPEmailSetupForm` and OPS's
    `EmailSetupForm`; every lib/pkp English string about statistics
    that names a journal, in `manager.po` and `admin.po`
    (`manager.editorialStatistics.description`,
    `stats.description.daysToDecision`,
    `admin.settings.statistics.sushiPlatform.description`, and
    `…isSiteSushiPlatform`, which OMP and OPS override); every lib/pkp,
    OMP and OPS translation of the key.
- Introduced: `git log -S` and `git blame` on the string in lib/pkp
  give only 1a7fbb216f, which added the field and its strings with the
  new "Emails" tab (`pkp/pkp-lib#8407`, merged 2022-11-30). The app
  sides of the same change, OMP 807511e244 (`pkp/omp#1242`) and OPS
  864f177d21 (`pkp/ops#387`), each added the app's own
  `manager.manageEmails.description` and not this key. Later commits
  only moved `en_US` to `en`.
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ops, pkp/ui-library;
  issues and PRs) by "editorial statistics" with journal and press,
  "editorial statistics of the journal", `editorialStatistics`,
  `PKPEmailSetupForm`, and journal wording on a press or a preprint
  server: nothing about this text.
