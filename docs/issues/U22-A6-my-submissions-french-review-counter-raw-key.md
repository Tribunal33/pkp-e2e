# In French (Canada), "My Submissions" shows a code for the review counter and the editorial list for an accepted review

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the older lists, with a translated counter and no review indicators)
  - 3.3: none (code; the older lists, with a translated counter and no review indicators)
- **Introduced** not traced: a missing translation, no change broke it; present since [5c392d00ef](https://github.com/pkp/pkp-lib/commit/5c392d00ef4bd342c253e40a796e0cdbd6be8eaf) (2024-06-18), which added the English text (PR `pkp/pkp-lib#9931` and `pkp/ui-library#364` for `pkp/pkp-lib#7495`, Jarda Kotěšovec (jardakotesovec))
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U22 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U22-my-submissions.md#a6) (its review counter; the "…" button's name is in [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457)), spec U23 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a12) (an accepted reviewer's indicator on the editorial "Submissions" list; the list's other codes are reported apart)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author working in French (Canada) whose submission is under review
sees "##dashboard.reviewUpdateCounts##" in its "Activité éditoriale"
cell on "Mes soumissions", where English reads "Review update 2/2". The
code takes the place of the numbers, so the author no longer sees how
many of the round's reviews are in.

Editors working in French (Canada) meet the same kind of gap on the
editorial "Submissions" list: once a reviewer has accepted a request,
the window that reviewer's indicator opens is headed
"##dashboard.reviewAssignment.statusAccepted.title##" where English
reads "Ongoing review - request accepted". In the cell itself a sighted
editor sees only the indicator's circle and the days left; the code is
the indicator's name for a screen reader. The window's sentence below
the headline is French, so the editor can still work out the state.

Switching the interface to English shows the counter and the
headline. Every journal and
press that offers French (Canada) shows the counter's code on each
submission in review that is not waiting for the author's revisions,
and the headline's code for every accepted request still in progress.
This report proposes the two French (Canada) texts; 41 other languages
lack both and two more lack one, and wait on their translators on
Weblate.

## Impact

- **Lost.** The counter in the author's list and the name of an
  accepted request's state in the editor's list; the reviews themselves
  and the submission's stage are unaffected.
- **Who.** Authors using the interface in French (Canada), on each
  submission of theirs in review that is not waiting for their
  revisions, each time they open their list; editors and managers in
  French (Canada), on each reviewer who has accepted and not yet
  submitted.
- **Way round.** Switch the interface to English.

Low: two labels show as codes in French (Canada), and in the other
languages lacking the texts, while every task still gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OMP `main`: `publicknowledge`,
  which offers English and French (Canada). On OJS, `jnovak` is the
  author of submission 10 "Condensing Water Availability Models to Focus
  on Specific Water Management Systems" (review round 1, two reviews
  completed); on OMP, `mpower` is the author of submission 16 "A
  Designer's Log: Case Studies in Instructional Design" (external review
  round 1, one of three reviews completed).

1. Sign in as `jnovak` (OMP: `mpower`). "My Submissions" opens on
   "Active submissions".
2. Read the submission's "Editorial Activity" cell.
3. Open the menu under the initials at the top right and, under "Change
   Language", choose "français".
4. Read the same row's "Activité éditoriale" cell.

**Expected.** Step 4 shows the counter in French with the same numbers
as step 2 ("Review update 2/2" on OJS, "Review update 1/3" on OMP), as
the row's other texts are French: "Évaluation (Cycle 1)", "Afficher".

**Observed.** Step 4, on both applications:

```
ID   SOUMISSIONS                    ÉTAPE                  ACTIVITÉ ÉDITORIALE                 ACTIONS
10   Novak — Condensing Water …     Évaluation (Cycle 1)   ##dashboard.reviewUpdateCounts##    Afficher
```

(OMP: row 16, "Power — A Designer's Log: …".) No request failed and no
script error showed.

Editorial "Submissions" list:

Preconditions:

- The same dataset. On OJS, `phudson` has not answered the round-1
  request on submission 12 "Sodium butyrate improves growth performance
  of weaned piglets during the first period after weaning"; on OMP, on
  submission 17 "Open Development: Networked Innovations in
  International Development" (internal review round 1).
- Step 5 saves `phudson`'s acceptance, so the steps change the data:
  start them from a freshly loaded dataset.

5. Sign in as `phudson`. Under "Action Required by me", on submission
   12 (OMP: 17), press "Respond to request", then "Accept Review,
   Continue to Step #2". Sign out.
6. Sign in as `dbarnes` and open "Submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial`).
7. Open the menu under the initials and, under "Change Language",
   choose "français". In the side menu, choose "Soumissions actives".
8. On submission 12's row (OMP: 17), read the "Activité éditoriale"
   cell, then press the second indicator (Paul Hudson's) and read the
   window it opens.

**Expected.** The indicator and the window's headline read in French,
for example "Évaluation en cours - demande acceptée" as pkp-lib's
French (France) has it, as the first indicator reads "En attente d'une
réponse de l'évaluateur-trice".

**Observed.** Step 8, on both applications, `main` and 3.5:

```
Cell, as a screen reader names its two indicators (on screen, each is
a circle beside "27", the days left):
  En attente d'une réponse de l'évaluateur-trice  Afficher plus de details
  ##dashboard.reviewAssignment.statusAccepted.title##  Afficher plus de details
Window:
  ##dashboard.reviewAssignment.statusAccepted.title##
  Paul Hudson  Évaluateur-trice anonyme / Auteur-e anonyme
  L'évaluateur-trice a accepté la demande d'évaluation. Son évaluation doit être rendue …
  [Modifier la date d'échéance] [Voir les détails] [Retirer l'évaluateur-trice]
```

The indicator's code is its name for a screen reader, and the window's
headline shows it on screen. In English both read "Ongoing review -
request accepted". No request failed and no script error showed.

## Cause

pkp-lib's French (Canada) translation has no text for
`dashboard.reviewUpdateCounts`. The English text is in
`lib/pkp/locale/en/submission.po` ("Review update
{$reviewsCompletedCount}/{$reviewsTotalCount}"), French (France) has it
in `locale/fr/submission.po` ("Modifications récentes …"), and
`locale/fr_CA/submission.po` has no entry, while it holds the cell's
neighbours (`dashboard.reviewersAssigned`, `dashboard.revisionRequested`,
`dashboard.submitRevisions`). It has no text either for
`dashboard.reviewAssignment.statusAccepted.title` ("Ongoing review -
request accepted"; French (France) "Évaluation en cours - demande
acceptée"), while it holds the same state's description and every
other review state's title and description.

The code is made on the server. `UITranslator::getTranslationStrings()`
(`lib/pkp/classes/i18n/ui/UITranslator.php`) resolves each key listed in
`registry/uiLocaleKeysBackend.json`, this one included, through
`Locale::get()` and serves the result as `pkp.localeKeys` in
`api/v1/_i18n/ui.js`. For a text missing in the interface language,
`Locale::translate()` returns `##dashboard.reviewUpdateCounts##`: it does
not fall back to another language, by PKP's design (`pkp/pkp-lib#784`).
ui-library's `DashboardCellSubmissionActivityReviewsUpdate.vue` prints
the text through `t('dashboard.reviewUpdateCounts', {…})`, whose
`replaceLocaleParams` finds no placeholder in the code to put the
numbers in, so they go too. The editor's list reads the indicator's
title through `useDashboardConfigReviewActivity.js`
(`REVIEW_ASSIGNMENT_STATUS_ACCEPTED`'s `titleKey`), which
`ReviewActivityIndicator.vue` prints as the indicator's screen-reader
name and `ReviewActivityIndicatorPopover.vue` as the window's headline.

The text was added to pkp-lib's English `dashboard.po` with the new
dashboards (5c392d00ef, PR `pkp/pkp-lib#9931`, 2024-06-18) and moved to
`submission.po` by
[8055521da5](https://github.com/pkp/pkp-lib/commit/8055521da5eb25a277810b6c6122bd70e82f7a47)
(`pkp/pkp-lib#10685`, 2024-12-11). The indicator's title came with the
same change, 5c392d00ef, and moved with it. No French (Canada) file has
ever held either.

Reach:

- On screen (`main` and 3.5, OJS and OMP): the Editorial Activity cell
  of "My Submissions", the only place the text is used
  (`useDashboardConfigEditorialActivity`'s
  `getEditorialActivityForMySubmissions()`, for a submission in a review
  round that is not waiting for revisions). A preprint server has no
  review, so it never shows the counter.
- On screen (`main` and 3.5, OJS and OMP): the indicator of each
  reviewer who has accepted and not yet submitted, in the Editorial
  Activity cell of the editorial "Submissions" list (managers and
  editors), and the headline of the window it opens. The other review
  states' titles and descriptions
  (`dashboard.reviewAssignment.status*`) all have a French (Canada)
  text (code, `main` and 3.5; a completed review's indicator walked).
- The cell's other texts for an author are in French (Canada) (code:
  of the 27 texts the cell's components and configuration read, the only
  other one missing is `dashboard.recommendOnly.pendingRecommendations`,
  which only editors see, below).
- Other languages (code, `main`; a multi-line `msgstr` counts as
  present): the counter's text is missing in 43 of pkp-lib's 70 other
  languages, French (Canada), Catalan, Greek, Spanish (Mexico),
  Italian, Polish, Swedish and both Chinese among them; 27 have it,
  French (France) among them. The indicator's title is missing in 43 of
  the 70, French (Canada) among them, and present in French (France);
  41 languages besides French (Canada) lack both (Greek lacks only the
  counter's, Japanese only the title's).
- Not this fault:
  - The "…" button above the list, named "##common.moreActions##" for a
    screen reader: [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457).
  - The editorial "Submissions" list's other French (Canada) codes
    (spec U23
    [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a12)):
    the "…" button's name and the "Loaded" a screen reader hears
    ([pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457)),
    and a press's "Assigned To Editor" filter (the report "In French
    (Canada), a press's catalog, book and chapter pages and Roles list
    show codes, even for editors' names").
  - `dashboard.recommendOnly.pendingRecommendations`, the text the
    same cell shows editors there while a round awaits recommendations,
    also missing in French (Canada) (code; not walked; spec U23 A13).

## Proposed fix

Enter the two missing French (Canada) texts on PKP's Weblate
(translate.pkp.sfu.ca), component `submission` of the `pkp-lib`
project, rather than commit them. The tried texts are in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/fix.diff):

```diff
 msgid "dashboard.reviewersAssigned"
 msgstr "Évaluateur-trices assigné-es"
 
+msgid "dashboard.reviewUpdateCounts"
+msgstr "Évaluations complétées {$reviewsCompletedCount}/{$reviewsTotalCount}"
+
…
+msgid "dashboard.reviewAssignment.statusAccepted.title"
+msgstr "Évaluation en cours - demande acceptée"
+
```

The wording is a proposal for the translators. The counter follows
French (Canada)'s own text for the older list's counter, "Évaluations
assignées complétées"; French (France)'s "Modifications récentes"
("recent changes") does not say what the numbers count. The
indicator's title is French (France)'s.

Tried on `main` with the diff applied: "Mes soumissions" read
"Évaluations complétées 2/2" on OJS and "Évaluations complétées 1/3" on
OMP, and the English list read "Review update 2/2" and "Review update
1/3" with the diff in and out. With both texts in, the editorial
"Submissions" list read "Évaluation en cours - demande acceptée" for
Paul Hudson's indicator and as the window's headline on OJS and OMP,
while a completed review's indicator kept "Évaluation complétée le …"
and the English list kept "Ongoing review - request accepted".

**Alternatives**

- Commit the diff to pkp-lib: the same result at once, but Weblate's
  next sync may conflict with it or empty the entry again.
- Fall back from a regional language to its parent (French (Canada) to
  French) when a text is missing: a product decision beside PKP's
  choice not to fall back (`pkp/pkp-lib#784`).

**What goes with it**

- Older versions: Weblate commits to `translations/stable-3_5_0`, which
  pkp merges into `stable-3_5_0` and forward into `main`, so each entry
  reaches both. 3.4 and 3.3 have no such text.
- Left out: the other languages listed under Cause, for their
  translators.
- The guard: the U22 spec's French scenario, asserting that "Mes
  soumissions" holds no `##` code for a submission in review, and the
  U23 spec's, asserting the same of an accepted reviewer's indicator
  (Planned items).

Small: two texts entered on Weblate, no code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/lib.js).
  It takes the Steps on all three applications (OPS as `ccorino`,
  submission 1, for the "…" button only) and changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front reads
  the English row and button and every French row, the neighbour
  check). The fix was tried with `node bin/try-fix.js apply …/fix.diff
  ojs omp`, the script with and without `NB=1`, then `revert`, and
  `NB=1` again.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 1a5552c (2026-10-04). Both lines showed the code at
  step 4 on OJS and OMP and an empty cell for the OPS submission. The
  database plays no part (locale files).
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5). `stable-3_5_0`: OJS c1cee76b95 (`lib/pkp`
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (`lib/pkp` cf3f984335),
  `lib/ui-library` d4e01883. `stable-3_4_0`: `lib/pkp` 767353f4fe,
  `lib/ui-library` ee684b34. `stable-3_3_0`: `lib/pkp` ac3fa73402,
  `lib/ui-library` 96959f9e.
- Code reads: on `main` and 3.5, pkp-lib's `locale/en`, `locale/fr` and
  `locale/fr_CA` `submission.po`; every `locale/*/*.po` of pkp-lib for
  the language count (an empty `msgstr` counts as missing); ui-library's
  `DashboardCellSubmissionActivity*.vue` and
  `useDashboardConfigEditorialActivity.js`, with every text they read
  checked in pkp-lib's and the application's `fr_CA` files; on `main`,
  `UITranslator::getTranslationStrings()`, `registry/uiLocaleKeysBackend.json`,
  `Locale::translate()` and ui-library's `src/utils/i18n.js`. 3.4 and 3.3:
  no `dashboard.reviewUpdateCounts` in pkp-lib's `locale/en` or
  `locale/en_US`; the author's list there is ui-library's
  `SubmissionsListItem.vue`, whose counter reads
  `submission.list.reviewsCompleted`, which French (Canada) has
  ("Évaluations assignées complétées").
- Introduced: `git log -S` of the key on pkp-lib (5c392d00ef added it to
  `locale/en/dashboard.po`, 8055521da5 moved it to `submission.po`) and
  on ui-library
  ([0034beaf](https://github.com/pkp/ui-library/commit/0034beaf8079b3c8ab2df0aba6ee5dac5cb8b28f),
  PR `pkp/ui-library#364`, the component); `git log -S` on
  `locale/fr_CA` (no commit).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for `reviewUpdateCounts`, "Review update" (with French and
  translation), "Modifications récentes", "fr_CA dashboard",
  "French Canada missing translations",
  `DashboardCellSubmissionActivityReviewsUpdate` and
  `common.moreActions`; no hit is this fault.
- Kept script for the editorial "Submissions" list (spec U23 A12,
  steps 5 to 8):
  [`shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/lib.js),
  on an install freshly loaded from the default dataset (it saves
  `phudson`'s acceptance), then the same list in English:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=nb` in front
  reads a completed review's indicator, OJS 10 and OMP 16, in English
  and French and changes nothing, the neighbour check). Walked
  2026-10-04 on `main` (OJS ff004d0973, OMP 3b0ecf794c) and
  `stable-3_5_0` (OJS c1cee76b95, OMP 9c5e24246c), pkp/datasets
  1a5552c, with the same code on both lines. The fix was tried on
  `main` together with the diff of pkp-e2e#457 (on OMP also that of the
  press's French texts report), joined in one file and applied with
  `node bin/try-fix.js apply`, one application at a time: the script on
  a fresh install, `MODE=nb` with the diffs in, `revert`, and `MODE=nb`
  again. Code read: ui-library's `useDashboardConfigReviewActivity.js`,
  `ReviewActivityIndicator.vue` and `ReviewActivityIndicatorPopover.vue`
  on `main` and 3.5, and every `dashboard.reviewAssignment.*` entry of
  pkp-lib's `locale/en` and `locale/fr_CA` (a multi-line `msgstr` read
  as present); `git log -S` of the title on pkp-lib's `locale/en`.
  Upstream also searched for `statusAccepted`, "request accepted"
  French and "dashboard fr_CA translation" (pkp/pkp-lib,
  pkp/ui-library): nothing.
- Not driven: 3.4 and 3.3 (code only); the counter in a language other
  than French (Canada) and English (code only).
- Unverified: whether Weblate already holds a French (Canada) text for
  this key that has not reached the branches.
