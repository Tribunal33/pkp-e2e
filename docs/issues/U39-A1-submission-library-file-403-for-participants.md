# Assistants, and a preprint's moderator and author, get a bare "403 Forbidden" page for Submission Library files

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced; present since at least [669d0aba9b](https://github.com/pkp/pkp-lib/commit/669d0aba9b7caaffe6df4acebaa9580394ed4e14) (2013-03-11). On a preprint server since `pkp/ops#858` for `pkp/pkp-lib#10874`, which moved OPS's roles off stage 1 · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-03 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03). `pkp/pkp-lib#13432` (open, "Ensure
  consistent library file policy checks") reworks the same method and keeps
  this check: merged and reverted on 2026-10-02 on `main` and
  `stable-3_5_0`, live on `stable-3_4_0`
- **Tracked in** spec U39 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "Submission Library" window opens for every workflow participant and
lets each of them add, edit and delete its files. But an assigned person
whose role has "Submission" unticked under "Stage Assignment" (Settings ›
Users & Roles › Roles) is sent from the workflow screen to a bare page
reading "403 Forbidden" when they press a file's name, even for a file they
added themselves. By default that is the Copyeditor, Layout Editor,
Proofreader, Designer, Indexer and Marketing and sales coordinator, and on
a press also the Chapter Author.

No preprint server role can be given the Submission stage: the box is not
there. So on a preprint server the Moderator and the preprint's own Author
are refused every Submission Library file, and only the Preprint Server
manager can read them. A Moderator's "Download" under "Library Files" on a
decision email opens a new tab reading "403 Forbidden".

Nothing is lost. The file has to reach these people some other way, such
as a discussion.

## Impact

- **Lost**: no data. The person loses their place on the workflow screen
  to a page that does not explain the refusal.
- **Who**: on a journal or press, the assistants assigned to a submission
  in copyediting and production, whenever an editor uses the Submission
  Library to share a contract, permission or report with them. On a
  preprint server, every Moderator and every Author, on every preprint.
- **Way round**: on a journal or press the editor or Section editor, who
  can read the file, attaches a copy to a discussion; or a manager ticks
  "Submission" for the role, which also opens the Submission stage to that
  role and offers it there under "Assign Participant". On a preprint server
  only the Preprint Server manager can read the file, so the manager has to
  do it. The Moderator cannot hand the file on, and is refused even the
  files they uploaded to the window themselves.

Medium: reading Submission Library files fails for whole roles, with a
visible refusal and a way round on screen. On a preprint server it fails
for everyone but the manager, which is close to "fails for everyone"; it
stays medium because the manager can still hand files over in a
discussion and the Submission Library is an optional way to share files.
It would be high if preprint servers relied on it to exchange files with
authors.

## Steps to reproduce

Preconditions:

- The default dataset, OJS, OMP or OPS `main`. Nothing else is needed. The
  steps use one submission in Production, with the people already assigned
  to it:
  - OJS: submission 5, "Genetic transformation of forest trees". Maria
    Fritz (`mfritz`, Copyeditor) and Graham Cox (`gcox`, Layout Editor) are
    assigned; so are the author Diaga Diouf (`ddiouf`) and the Section
    editor David Buskins (`dbuskins`).
  - OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
    Popular Culture". `mfritz` (Copyeditor) and `gcox` (Layout Editor) are
    assigned, and the author Bart Beaty (`bbeaty`).
  - OPS: preprint 1, "The influence of lactation on the quantity and
    quality of cashmere production". David Buskins (`dbuskins`, Moderator)
    and the author Carlo Corino (`ccorino`) are assigned.
- A PDF named "article.pdf" ("preprint.pdf" on OPS) to upload.

The editor adds a file:

1. Sign in as `dbarnes` and open the submission from the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`;
   4 on OMP, 1 on OPS).
2. Press "Library" in the workflow header.
3. In "Submission Library" press "Add a file". Name "u39a agreement", Type
   "Permissions", upload the PDF, "OK".
4. Press "u39a agreement". Sign out.

An assigned assistant (OJS, OMP) or the Moderator (OPS):

5. Sign in as `mfritz` (OPS: `dbuskins`), open the same submission, press
   "Library".
6. Press "u39a agreement".
7. Open the submission again, "Library", "Add a file": Name "u39a own
   note", Type "Other", upload the PDF, "OK". Press "u39a own note".
8. OJS, OMP: sign in as `gcox`, open the submission, "Library", press
   "u39a agreement".

The author of a preprint (OPS):

9. Sign in as `ccorino`, open preprint 1 from My Submissions
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=1`),
   "Library", press "u39a agreement".

The Moderator's decision email (OPS):

10. Sign in as `dbuskins`, open preprint 1 and press "Decline Submission".
    In the email press "Attach Files", then "Attach Library Files", and
    press "Download" on the "u39a agreement" row.

**Expected.** Each person sees the window list "u39a agreement" (and,
after step 7, "u39a own note") with "Add a file" and each row's "Edit" and
"Delete". Each press downloads the file ("article-PER.pdf",
"article-OTH.pdf"; "preprint-…" on OPS) and the page stays where it was.

**Observed.** Steps 4 and the window reads of steps 5, 8 and 9 are as
expected: "Add a file" works for everyone and every row offers "Edit" and
"Delete". `dbarnes` downloads. In steps 6, 7, 8 and 9 the workflow screen
is replaced by a page whose whole text is:

```
403 Forbidden
```

at `/index.php/publicknowledge/$$$call$$$/api/file/file-api/download-library-file?libraryFileId=1&submissionId=5`
(`libraryFileId=2` for the person's own file in step 7). In step 10 a new
tab opens with the same page while the email stays open.

Control: on OJS the author `ddiouf` and the Section editor `dbuskins`, and
on OMP the author `bbeaty`, take steps 5 and 6 and the file downloads.

## Cause

Both download links, the file's name in the list
(`DownloadLibraryFileLinkAction`) and "Download" in the email's "Library
Files" (`PKPLibraryController::fileToResponse()`), go to
`FileApiHandler::downloadLibraryFile()`, which hands over to
`PKP\pages\libraryFiles\LibraryFileHandler::downloadLibraryFile()`
(lib/pkp `pages/libraryFiles/LibraryFileHandler.php`). For a file that
belongs to a submission, that method lets through a manager or site
administrator, and otherwise only a user returned by this query (line 99):

```php
$assignedUsers = Repo::user()->getCollector()
    ->assignedTo($libraryFile->getSubmissionId(), WORKFLOW_STAGE_ID_SUBMISSION)
    ->getMany();
```

`assignedTo()` with a stage keeps a user only when their assignment's user
group is linked to that stage in `user_group_stage`
(`Collector::buildSubmissionAssignmentsFilter()`). The default groups of
the Copyeditor and Marketing and sales coordinator work on Copyediting
only; the Layout Editor, Proofreader, Designer and Indexer on Production
(and the Done state); OMP's Chapter Author on Copyediting and Production
(`registry/userGroups.xml`). On OPS the manager, Moderator and Author
groups have `stages="5,6"` (Production and Done) since `pkp/ops#858`
removed stage 1, which a preprint server does not have.

The window itself follows another rule. `DocumentLibraryHandler` (the
"Library" window) and `SubmissionDocumentsFilesGridDataProvider` (its
list, "Add a file", "Edit", "Delete") authorize through
`SubmissionAccessPolicy`, which admits anyone assigned to the submission
in any stage.

The check came with the Submission Library's download in 2013 (669d0aba9b)
and was moved, unchanged in meaning, into `LibraryFileHandler` in 2018
(`pkp/pkp-lib#520`, 56773e14d6). On a preprint server the Moderator and the
Author passed it on 3.4 and earlier, and are refused since 3.5.

The two preprint-server reports that name this line in their reach
([U35 OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS3-moderator-assigned-email-never-sent.md),
[U21 OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-OPS3-author-cancel-draft-does-nothing.md))
have another cause: their queries are right on a journal or press, where
this one is not.

Reach:

- Both download links (walked: the list on all three apps, the email's
  "Library Files" on OPS).
- Publisher Library files are not affected: they have no submission and
  skip the check (walked: "View Document Library" downloads for the Layout
  Editor and the Moderator).
- No other `assignedTo(…, WORKFLOW_STAGE_ID_SUBMISSION)` exists in lib/pkp
  or the three apps (search on `main`).

## Proposed fix

Proposed: ask for an assignment on the submission in any stage, close to
the rule the window's own `SubmissionAccessPolicy` applies.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submission-library-file-403-for-participants/fix.diff),
one diff for all three apps:

```diff
-                // Check for specific assignments.
+                // Anyone assigned to the submission, in any stage, as for the
+                // Submission Library list itself (SubmissionAccessPolicy).
                 $assignedUsers = Repo::user()->getCollector()
-                    ->assignedTo($libraryFile->getSubmissionId(), WORKFLOW_STAGE_ID_SUBMISSION)
+                    ->assignedTo($libraryFile->getSubmissionId())
                     ->getMany();
```

The method's comment says what it guards: "ensure that the current user
has access to that submission". An assignment in any stage is that access,
and it is what lets the same people add, edit and delete these files
today. Reviewers have no stage assignment and stay refused, as do people
removed from the submission. One difference from the policy remains: the
policy ignores an assignment in a role the user no longer holds in the
journal (`Repo::user()->getAccessibleWorkflowStages()`), and
`assignedTo()` does not, as today's check does not either.

Tried on OJS, OMP and OPS `main`. With the fix, every press in steps 4 to
10 downloads the file and the page stays. Removing a person from the
submission still takes the download away: with the fix, a Layout Editor
(OPS: the Moderator) removed under "Participants" while their "Submission
Library" window was open got "403 Forbidden" on "u39a agreement", and
Publisher Library files under "View Document Library" still downloaded.

**Alternatives**

- The application's first stage, as `pkp/pkp-lib#10883` did elsewhere:
  this fixes the preprint server only, and journal and press assistants
  stay refused files the window lets them add, edit and delete.
- Authorize the download with `SubmissionAccessPolicy` in
  `FileApiHandler::authorize()` when a `submissionId` is sent, and have
  `LibraryFileHandler` check that the file belongs to that submission. That
  leaves one rule in one place, but it is a larger change to a handler
  that other file downloads share. It is the better choice if the team
  wants no second rule here.
- Allow when `Repo::user()->getAccessibleWorkflowStages()` returns any
  stage for the user, which matches the policy exactly, the revoked-role
  case included; a few more lines, and the submission has to be loaded.
- Tick the Submission stage for these roles in `registry/userGroups.xml`:
  this would list assistants as Submission-stage participants, and is not
  possible on OPS.

**What goes with it**

- No stored data is wrong and no API changes. More people can download,
  but only people who can already open the window and edit its files.
- Backport: the diff applies as written to `stable-3_5_0`. On
  `stable-3_4_0`, `pkp/pkp-lib#13432` (034fd831b2) moved the block one
  indent level out, so the same two lines change at line 103 with four
  spaces less indent. On 3.3 the same change drops the stage argument of
  `UserStageAssignmentDAO::getUsersBySubmissionAndStageId()`, which
  accepts none.
- `pkp/pkp-lib#13432` aims at consistent policy checks in this method and
  touches these lines, so the change fits there when it returns to `main`
  and `stable-3_5_0`; on `stable-3_4_0` it would be a follow-up.
- The guard: an e2e check in spec U39 that an assigned Copyeditor and, on
  OPS, the Moderator and the Author download a Submission Library file.

Small: one line in one pkp-lib method, tried on the three apps, and an e2e
check.

## Evidence

- The kept script takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submission-library-file-403-for-participants/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submission-library-file-403-for-participants/lib.js).
  `neighbour` as its argument runs the removal check alone. It runs from
  a pkp-e2e checkout against installs freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/submission-library-file-403-for-participants/walk.js [neighbour]`.
  The fix was tried by applying fix.diff to the three apps and running the
  same command, with and without `neighbour`.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets e8dafbc
  (2026-10-02).
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363),
  OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library
  280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246 and OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS
  d68934d0d1, OMP 0aec65441, OPS acd8ae704b (lib/pkp 767353f4fe);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads:
  - `main`: `LibraryFileHandler::downloadLibraryFile()`,
    `FileApiHandler::authorize()` and `downloadLibraryFile()`,
    `Collector::assignedTo()` and `buildSubmissionAssignmentsFilter()`,
    `DocumentLibraryHandler::authorize()`,
    `SubmissionDocumentsFilesGridDataProvider::getAuthorizationPolicy()`,
    `PKPLibraryController` (the email's "Download" address), the three
    apps' `registry/userGroups.xml`, and a search of lib/pkp and the apps
    for `assignedTo(` with `WORKFLOW_STAGE_ID_SUBMISSION`.
  - Introduced: `git blame` on line 99 gives bf20528ed1, the revert of
    c530748391 (`pkp/pkp-lib#13432`); b08f469765 (`pkp/pkp-lib#7127`) and
    858b24f31f (`pkp/pkp-lib#8092`) only rewrote the call. 669d0aba9b is
    Jason Nugent's `PKPFileApiHandler::downloadLibraryFile()`. OPS
    012e900283 changed the groups from `stages="1,5"` to `stages="5"`.
  - `pkp/pkp-lib#13432` per branch, from GitHub's commit lists for the
    file: `main` c530748391 reverted by bf20528ed1, `stable-3_5_0`
    3f26cd7b1e reverted by 5af94e3ff6, `stable-3_4_0` 034fd831b2 not
    reverted; the issue is open.
  - 3.5 (walked): the same method and line in both lib/pkp tips; OJS
    copyeditor `stages="4"`, layoutEditor `"5"`; OPS manager, sectionEditor
    and author `stages="5"`.
  - 3.4 (code): lib/pkp `origin/stable-3_4_0` has the same query at line
    103. OJS and OMP give the Copyeditor and Marketing `stages="4"` and the
    Layout Editor, Proofreader, Designer and Indexer `"5"` (OMP Chapter
    Author `"4,5"`), so they are refused. OPS gives its three groups
    `stages="1,5"`, so its Moderator and Author pass. The Submission
    Library grid admits `ROLE_ID_ASSISTANT`, and the workflow page shows
    "Library" to everyone (OJS `templates/workflow/workflow.tpl`).
  - 3.3 (code): lib/pkp `origin/stable-3_3_0`'s
    `LibraryFileHandler.inc.php` calls
    `getUsersBySubmissionAndStageId(…, WORKFLOW_STAGE_ID_SUBMISSION)`; the
    stage sets and the grid's roles are as on 3.4.
- Upstream searches (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by symptom words ("submission library 403", "library
  file forbidden") and by `LibraryFileHandler` and `downloadLibraryFile`.
- Not driven: the Proofreader, Designer, Indexer, Marketing and sales
  coordinator and OMP's Chapter Author (refused by the same stage sets,
  read in the code); attaching a library file to an email. Ticking
  "Submission" was not driven here; spec U39's own probe (footnote d,
  2026-09-24) drove it on OJS and OMP, and the assigned Copyeditor then
  downloaded.
- Unverified: MySQL; 3.4 and 3.3 rest on the code read.
