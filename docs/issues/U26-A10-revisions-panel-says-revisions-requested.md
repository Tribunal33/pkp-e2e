# The review round's "Revisions Uploaded" list says revisions were requested on rounds where none were

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the list is titled "Revisions", with no description)
  - 3.3: none (code; the list is titled "Revisions", with no description)
- **Introduced** `pkp/pkp-lib#9931` with `pkp/ui-library#364`, for `pkp/pkp-lib#7495` · [5c392d00](https://github.com/pkp/pkp-lib/commit/5c392d00ef4bd342c253e40a796e0cdbd6be8eaf) · 2024-06-18 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U26 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Every review round has a "Revisions Uploaded" list. Under its heading,
the list says "These files have been submitted by the author after
revisions were requested". It says this on every round, including rounds
where no revisions were ever requested.

The editors and the author see the same sentence above an empty list.
No file or decision is affected, and nothing else on the screen is
wrong. A reader who trusts the sentence is told that revisions were
asked for when they were not.

## Impact

- **Lost** Nothing. The round's status box gives the real state
  ("Awaiting responses from reviewers.").
- **Who** The editors and the author, on every review round where no
  revisions have been requested, a press's internal review rounds
  included. Until a request is made, that is every round. A round
  closed with no request (accepted or declined straight after review)
  keeps the sentence for as long as the round is shown.
- **Way round** None is needed.

Low: the wording misleads, but nothing is lost and no task is blocked.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning" (author `lchristopher`), is in review, round 1, waiting
  for reviews. No revisions have been requested on it.

Steps:

1. Sign in as `dbarnes` and open submission 12
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`).
   It opens on "Review (Round 1)", and the status box reads "Awaiting
   responses from reviewers.".
2. Read the "Revisions Uploaded" list at the top of the round.
3. Sign in as `lchristopher`. On "My Submissions", press "View" on the
   submission and read the same list.

**Expected** On a round where no revisions were requested, the list's
description makes no claim about a request. It says what the files are,
as the "Files for Review" list below it does ("These files will be sent
to the reviewers to review"), for instance "Revised files uploaded
during this review round".

**Observed** In steps 2 and 3, the list shows this text:

```
Revisions Uploaded
These files have been submitted by the author after revisions were requested
No Items
```

The default dataset for OMP `main` shows the same text on two
submissions:

- Submission 2, "The West and Beyond: New Perspectives on an Imagined
  Region", opens on "External Review (Round 1)". The text shows for
  `dbarnes` and for its author `afinkel`.
- Submission 17, "Open Development: Networked Innovations in
  International Development", opens on "Internal Review (Round 1)". The
  text shows for `dbarnes`.

## Cause

The list is the ui-library `FileManager` in the
`WORKFLOW_REVIEW_REVISIONS` configuration
(`src/managers/FileManager/useFileManagerConfig.js`). Its description is
a fixed locale key, `descriptionKey:
tk('fileManager.revisionsUploadedDescription')`. The configuration is
built from the stage alone (`getManagerConfig()` receives no review
round), so the same description shows in every state the round can be
in.

The review stage's editorial and author configurations add the list to
every round, with no condition. They are
`src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`
and `workflowConfigAuthorOJS.js`, and on a press also
`workflowConfigEditorialOMP.js` and `workflowConfigAuthorOMP.js` for the
internal review. That is intended: editors can file a revision on the
author's behalf through the list's own "Upload" at any time
([spec U26, Revisions Uploaded](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#revisions)).

The fault is the sentence in pkp-lib's `locale/en/submission.po`:

```
msgid "fileManager.revisionsUploadedDescription"
msgstr "These files have been submitted by the author after revisions were requested"
```

It reports an event ("after revisions were requested") instead of
saying what the list holds, so it is false on every round with no
revision request. It is also inexact when an editor uploads a file on
the author's behalf. The other file lists' descriptions in the same file
say what the list is for ("Files uploaded at the time of submission",
"These files will be sent to the reviewers to review").

Reach:

- External review rounds on a journal and a press, and a press's
  internal review rounds; the editorial and the author views (on
  screen).
- 16 translations of the key make the same claim in their own languages
  (`cs`, `fi`, `uk`, `vi` and others; code). The other locales leave it
  empty and fall back to English.
- The key is used nowhere else in pkp-lib or ui-library (code). The
  other `FileManager` descriptions describe their list's purpose and do
  not have this fault (code).

## Proposed fix

Change the English sentence so that it describes the list instead of an
event:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revisions-panel-says-revisions-requested/fix.diff).

```diff
 msgid "fileManager.revisionsUploadedDescription"
-msgstr "These files have been submitted by the author after revisions were requested"
+msgstr "Revised files uploaded during this review round"
```

This follows the noun-phrase style of "Files uploaded at the time of
submission": it says what the files are and names no request and no
uploader. So it holds on an empty round, after a request, and for a
file an editor uploads on the author's behalf. The exact wording is the
team's choice.

Tried on `main`, OJS and OMP. With the fix in, every view in the Steps
shows the new sentence (OJS 12 as `dbarnes` and `lchristopher`, OMP 2
as `dbarnes` and `afinkel`, OMP 17 as `dbarnes`). The other lists'
descriptions are unchanged ("Files for Review" on OJS 12 and OMP 2). On
OJS submission 13 (round 1 "Revisions have been requested.") only this
description changes.

**Alternatives**

- Show the present sentence only after revisions have been requested.
  This is a ui-library change on the data side: `FileManager` already
  takes `reviewRoundId`, and the page holds each round's `statusId` from
  the submission API; pkp-lib changes only for a second locale key, for
  the other states. "After revisions were requested" is not one
  `statusId`, though: the round moves on from "Revisions have been
  requested." once the author uploads, so the condition needs several
  statuses or the round's decisions. That is more code for the same
  result.
- Rename the key so that the 16 translations stop making the old claim
  and fall back to English until they are retranslated. This is cleaner
  for the translated sites, but it drops working translations. It is
  the team's call against their usual practice for a changed meaning.

**What goes with it**

- The 16 translations need updating on Weblate.
- The fix applies to `stable-3_5_0` as written: the key is at line 2744
  there, and GNU `patch` applies it with an offset.
- A guard in the e2e scenario for the review round's lists (spec U26,
  Rule 9): on a round with no revision request, the description makes
  no claim about a request.

Small: one English string in pkp-lib, with translations to follow.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revisions-panel-says-revisions-requested/walk.js),
  helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revisions-panel-says-revisions-requested/lib.js).
  It takes the Steps on PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, `pgsql`) with
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/revisions-panel-says-revisions-requested/walk.js`.
  `MODE=nb` runs the neighbour check alone. It reads each list's
  description from the element named by the table's
  `aria-describedby`, and it records the round's status (from the
  submission API the page loads) and the stored decisions. Submission
  12 holds only "Send to Review" (decision 3). OMP 2 holds only "Skip
  internal review" (18) and OMP 17 only "Send to internal review" (1).
  None holds a revision request.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp`, then a
  fresh dataset, then the walk and `MODE=nb` with the fix in. After
  `revert`, `MODE=nb` again. `try-fix status` was clean at the end.
- Walked on PostgreSQL.
- Tips walked or read:
  - main: OJS
    [ff004d0973](https://github.com/pkp/ojs/commit/ff004d097321cd5ae94ba8ce1659cc5230226720),
    pkp-lib
    [987776cd04](https://github.com/pkp/pkp-lib/commit/987776cd043efac8c4a1693560a6d7737d174210),
    ui-library
    [64d67363](https://github.com/pkp/ui-library/commit/64d673631817f14826a048a462e56d9ee0168b44);
    OMP
    [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8),
    ui-library
    [280f98c5](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - 3.5 (walked, same script and Steps, same result on OJS 12 and OMP 2
    and 17): OJS
    [c1cee76b95](https://github.com/pkp/ojs/commit/c1cee76b95463dd6fba7d2db93d9115bd9640d05),
    pkp-lib
    [771474347e](https://github.com/pkp/pkp-lib/commit/771474347eaba57d6ab1c04d85f7bf17f57b159d);
    OMP
    [9c5e24246](https://github.com/pkp/omp/commit/9c5e24246cbb18e7fdb261be7ddceffdc406ecc9),
    pkp-lib
    [cf3f984335](https://github.com/pkp/pkp-lib/commit/cf3f984335381e5794227e8079e56065052e2537);
    ui-library
    [d4e01883](https://github.com/pkp/ui-library/commit/d4e0188353a210d7e8aa3327a2448ec70309eefb)
    for both. Code read: the same key and sentence in
    `locale/en/submission.po`, and the same `descriptionKey` in
    `useFileManagerConfig.js`. Both introducing commits are ancestors of
    the 3.5 tips.
  - 3.4 (code): OJS `d68934d0d1`, pkp-lib `767353f4fe`, ui-library
    `ee684b34`. 3.3 (code): OJS `ac77c9fb35`, pkp-lib `ac3fa73402`,
    ui-library `96959f9e`. On both, the review round's revisions list is
    the legacy `WorkflowReviewRevisionsGridHandler`, titled
    `editor.submission.revisions` ("Revisions") with no description. The
    sentence is in no `en` / `en_US` locale file, and the key is in no
    ui-library source.
- Introduced, traced: `git blame` on the `msgstr` line gives
  [8055521d](https://github.com/pkp/pkp-lib/commit/8055521da5eb25a277810b6c6122bd70e82f7a47)
  (`pkp/pkp-lib#10685`, a move from `dashboard.po`).
  `git log -S` then gives
  [be3be14e](https://github.com/pkp/pkp-lib/commit/be3be14eff471d613a2c5509d5d605196fd83817)
  (`pkp/pkp-lib#10454`, with
  [f77229c3](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b),
  `pkp/ui-library#412`, 2024-09-19), which renamed the key from
  `dashboard.summary.revisionsSubmittedDescription` and fixed its typo
  ("after visions were requested"). That key and sentence came in with
  5c392d00 (`pkp/pkp-lib#9931`). Its ui-library side,
  [0034beaf](https://github.com/pkp/ui-library/commit/0034beaf8079b3c8ab2df0aba6ee5dac5cb8b28f)
  (`pkp/ui-library#364`, the same day), already put the sentence under
  the review round's revision files list with no round condition.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/ui-library, pkp/ojs
  and pkp/omp, for "Revisions Uploaded", "revisions were requested",
  "submitted by the author after" and `revisionsUploadedDescription`.
  The candidates read (`pkp/pkp-lib#4976`, `#10688`, `#13048`,
  `pkp/ui-library#981`) concern other faults.
- Not driven: OPS (a preprint server has no review rounds). A round
  opened after a revision request, on which no new request was made,
  shows the same list by the code but was not walked.
- Unverified: whether Weblate marks the 16 translations for review
  when the English sentence changes.
