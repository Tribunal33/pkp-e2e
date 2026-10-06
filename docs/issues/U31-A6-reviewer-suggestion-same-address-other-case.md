# A reviewer suggested twice in other capitals stays pending after being added, and adding them again fails

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP (on PostgreSQL; OPS has no reviewer suggestions)
  - 3.5: OJS, OMP (on PostgreSQL; OPS has no reviewer suggestions)
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/pkp-lib#10497` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849) · 2025-02-26 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U31 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author suggesting reviewers while submitting adds a person, then adds
them again with the address typed in other capitals
("Kay.Suggested@Mailinator.com" after "kay.suggested@mailinator.com").
The same address typed exactly is refused with "The email has already
been taken."; this one is accepted as a second entry for the same
person.

The editors then see the person twice in "Reviewers Suggested by
Author", with nothing to tell the two apart. Once an editor adds the
person as a reviewer from one entry, the other stays in the panel as a
pending suggestion for good: its "Add Reviewer" opens on the person's
new account, and pressing "Add Reviewer" there fails on the server
with no message and the window left open. No screen removes the entry.

It happens on journals and presses whose database is PostgreSQL. The
same stuck entry follows from a single suggestion whose address
differs only in capitals from a reviewer's existing account, once the
editor adds that reviewer through the Add Reviewer window's list of
suggestions.

## Impact

- **Lost**: no data; the reviewer is on the round. The panel keeps
  offering a suggestion that was already taken up, and its action fails
  without a word.
- **Who**: editors of a journal or press that has turned on "Reviewer
  Suggestion at Submission" (off by default), on a PostgreSQL
  installation, whenever an author has retyped a suggested address in
  other capitals, or typed a reviewer's address in other capitals than
  their account holds.
- **Way round**: the author can delete the extra entry before
  submitting. After that, none: editors can only ignore the entry, for
  the life of the submission.

Medium: an action the screen offers fails silently with a server error,
and the entry behind it can never be cleared, though only in the rarely
met case of an address retyped in other capitals. It would be low if
the second entry left the panel with the first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"), on PostgreSQL; the same on OMP `main`
  (press `publicknowledge`, "Public Knowledge Press").
- "Reviewer Suggestion at Submission" is off in the dataset; steps 1-3
  turn it on.

Turning the feature on:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP).
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), tab
   "Review", side tab "Setup".
3. Tick "Allow authors to suggest potential reviewers at submission
   process" and press "Save". Sign out.

Suggesting the same person twice:

4. Sign in as the author `ccorino` [OMP: `aclark`].
5. Open "New Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u31q2 Suggested twice", choose the section "Articles"
   [OMP: no section to choose] and English, tick the requirements and
   privacy boxes, and press "Begin Submission".
6. On "Upload Files" upload any file as "Article Text" [OMP: "Book
   Manuscript"], on "Details" type an abstract, and press "Continue"
   until "Reviewer Suggestions" is the current step (after "For the
   Editors"). [3.5: the form opens on "Details", then "Upload Files".]
7. Press "Add Reviewer Suggestion" and fill in "Given Name" Kay,
   "Family Name" Suggested, "Email address"
   kay.suggested@mailinator.com, "Affiliation" Public Knowledge
   University and "Reasons for suggesting reviewer" "Expert in open
   access publishing; no conflict of interest." Press "Save": the panel
   lists "Kay Suggested".
8. Press "Add Reviewer Suggestion" again, fill in the same, with
   "Email address" Kay.Suggested@Mailinator.com, and press "Save".

What the editors see:

9. Press "Continue", then "Submit", and confirm with "Submit". Sign out.
10. Sign in as `dbarnes` and open "u31q2 Suggested twice" from the
    dashboard's "Active submissions".
11. Press "Send for Review" [OMP: "Send to External Review"], "Continue"
    through the decision's pages and "Record Decision". Open the
    submission again: the Review stage's "Reviewers Suggested by
    Author" lists Kay Suggested twice.
12. On a Kay Suggested row press "…" › "Add Reviewer". The "Create New
    Reviewer" form it opens is filled with that entry's address; take
    the one filled with "Kay.Suggested@Mailinator.com" (the second row;
    "Cancel" the first). Type the username kaysuggested and press "Add
    Reviewer": Kay Suggested is added to the round.
13. On the Kay Suggested row still in the panel press "…" › "Add
    Reviewer", then "Add Reviewer" in the window.
14. Open the submission again; then press "Add Reviewer" in "Reviewers"
    and read "Select a Reviewer from Reviewer Suggestions".

A reviewer the journal already has, suggested in other capitals (on a
freshly loaded dataset):

15. Take steps 1-6 with the title "u31q2 Known reviewer".
16. Press "Add Reviewer Suggestion" and fill in "Given Name" Adela,
    "Family Name" Gallego, "Email address" AGallego@Mailinator.com (the
    dataset's reviewer `agallego` holds agallego@mailinator.com),
    "Affiliation" Public Knowledge University and "Reasons for
    suggesting reviewer" "Reviewed for the journal before."; press
    "Save".
17. Press "Continue", then "Submit", and confirm with "Submit". Sign
    out.
18. Sign in as `dbarnes`, open "u31q2 Known reviewer" and record "Send
    for Review" [OMP: "Send to External Review"] as in step 11. Open the
    submission again: the panel lists Adela Gallego.
19. In "Reviewers" press "Add Reviewer"; under "Select a Reviewer from
    Reviewer Suggestions" press "Select Reviewer" on Adela Gallego, and
    in the form that opens on her press "Add Reviewer".
20. Open the submission again; on Adela Gallego's row in "Reviewers
    Suggested by Author" press "…" › "Add Reviewer", then "Add
    Reviewer".

**Expected** (8): "The email has already been taken." under "Email
address"; the window stays open and the panel keeps one entry. (11):
Kay Suggested listed once. (12): once Kay is added, no Kay Suggested
entry is left pending. (19): once Adela is added, her suggestion leaves
the panel.

**Observed** (8): the window closes and the panel lists both:

```
Kay Suggested  Public Knowledge University  kay.suggested@mailinator.com   Edit  Delete
Kay Suggested  Public Knowledge University  Kay.Suggested@Mailinator.com   Edit  Delete
```

(10), (11): "Reviewers Suggested by Author" lists "Kay Suggested ·
Public Knowledge University · Expert in open access publishing; no
conflict of interest." twice, with no address. (12): Kay is added, and
one Kay Suggested row stays in the panel. (13): the window opens as
"Selected Reviewer: Kay Suggested" (her new account), not "Create New
Reviewer". "Add Reviewer" answers a server error; no message shows and
the window stays open:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/reviewer/reviewer-grid/update-reviewer  500
PHP Fatal error:  Uncaught Exception: Invalid reviewer id. in lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php:343
```

(14): the row is still in the panel. In "Select a Reviewer from
Reviewer Suggestions" the entry reads "This reviewer has already been
assigned to this review round." and has no "Select Reviewer".

(19): Adela is added to the round, and the panel still lists Adela
Gallego. (20): the window opens on "Selected Reviewer: Adela Gallego",
and "Add Reviewer" answers the same 500 as step 13, with the same log
line.

Control: a third "Add Reviewer Suggestion" with the address typed
exactly as in step 7 is refused with "The email has already been
taken." under "Email address" and "Please correct one error." at the
top of the window. Only one account is made: the twin never offers
"Create New Reviewer" once the account exists, and that form refuses an
address an account holds in any capitals.

## Cause

The address check is `Rule::unique('reviewer_suggestions')` scoped to
the submission, in
`PKP\API\v1\reviewers\suggestions\formRequests\AddReviewerSuggestion::rules()`
(lines 84-85 on `main`), and the same rule with `->ignore()` of the
entry being edited in `EditReviewerSuggestion::rules()` (lines 42-44).
Laravel's presence verifier turns it into `WHERE email = ?`. On
PostgreSQL that comparison is case-sensitive, so a stored
"kay.suggested@mailinator.com" does not match "Kay.Suggested@…" and the
second row is written. Nothing lowercases the input either.

The rest of pkp-lib treats an address as case-insensitive: users'
addresses are looked up with `LOWER(email) = LOWER(?)`
(`PKP\user\DAO::getByEmail()`, line 181) and, on PostgreSQL, are kept
unique by an index on `LOWER(email)` (`CommonMigration`, line 108).
Both came in with `pkp/pkp-lib#7249`, which fixed this same fault for
user registration. The suggestions feature
(`pkp/pkp-lib#4787`, 08d4cf9c89) brought the suggestion's check in
without that, and it has not changed since.

On MySQL and MariaDB, PKP's connection collation defaults to
`utf8_general_ci`, which compares without case, so the same rule
refuses the second address there.

Why the twin stays: adding a reviewer from a suggestion approves that
one row. `ReviewerForm::execute()` (lines 407-421) takes the suggestion
the "Add Reviewer" action passed (or else the first pending row
`withEmail()` matches) and calls `approveAndAttachReviewer()` on it
alone, so the twin keeps `approved_at` and `reviewer_id` empty and the
panel, which lists pending rows, keeps it. Its `existingUser` finds the
new account through the case-insensitive `getByEmail()`, so its "Add
Reviewer" opens on that account; saving reaches `_isValidReviewer()`,
which is false for a reviewer already on the round, and `execute()`
throws `Exception('Invalid reviewer id.')` (line 343). The panel's only
action on a row is "Add Reviewer", so nothing removes it.

That 500 is a separate fault showing here: the panel offers "Add
Reviewer" on a pending suggestion whose person is already on the round
(the Add Reviewer window's list guards it, the panel does not), and
`execute()` throws instead of returning a form error. It is reachable
without any duplicate, and is out of scope for this report.

The "Select Reviewer" path of steps 15-20 misses for the same reason:
the window's list sends no suggestion id, so `ReviewerForm::execute()`
looks the suggestion up with `withEmail()` (line 410), which compares
"agallego@mailinator.com" with "AGallego@Mailinator.com" letter for
letter, finds nothing and approves nothing.

Reach:

- "Edit" on an entry, changing its address to another entry's in other
  capitals, saves too (checked on screen on `main`); the same rule in
  `EditReviewerSuggestion`.
- `ReviewerSuggestion::scopeWithEmail()` (line 277) is that
  letter-for-letter comparison, and it serves every path that adds a
  reviewer without a suggestion id: the window list's "Select
  Reviewer" (checked on screen, steps 15-20) and the ordinary search
  (checked in the code).
- The upgrade step `I11673_AddMissingApprovalToReviewerSuggestion`
  (`pkp/pkp-lib#11673`, in `classes/migration/upgrade/v3_5_0/`), which
  approves suggestions whose person is already a reviewer of the
  submission, joins `reviewer_suggestions.email = users.email` letter
  for letter, so on PostgreSQL it skipped every row whose capitals
  differ (checked in the code).
- Creating a second account from the twin cannot happen:
  `CreateReviewerForm` refuses an address any account holds, compared
  through `getByEmail()` (line 68; checked in the code, and on screen
  the twin opened on the existing account).
- The "Add Reviewer" window's suggestions list already guards the twin
  ("already assigned", no button; checked on screen).

## Proposed fix

Compare suggestion addresses the way users' addresses are compared, and
approve every pending suggestion of a person when they are added
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/fix.diff);
its paths start at the app root, so `git apply -p3` in a pkp-lib
clone). This is a proposal; the team decides.

- `ReviewerSuggestion::scopeWithEmail()` compares without case, as
  `PKP\user\DAO::getByEmail()` does:

  ```diff
       public function scopeWithEmail(Builder $query, string $email): Builder
       {
  -        return $query->where('email', $email);
  +        return $query->whereRaw('LOWER(email) = LOWER(?)', [$email]);
       }
  ```

- `AddReviewerSuggestion` replaces `Rule::unique(...)` with a closure
  rule that fails with the same message,
  `__('validator.unique', ['attribute' => $attribute])`, when
  `ReviewerSuggestion::query()->withSubmissionIds($submissionId)->withEmail($value)->exists()`;
  `EditReviewerSuggestion` reuses it, leaving out the entry being
  edited, so an entry may keep its own address.
- `ReviewerForm::execute()`, where it now approves the one suggestion,
  approves every pending suggestion on the submission with that address
  (the same `withEmail()` query, which returns the suggestion passed in
  too). Twins stored before the fix then clear when an editor adds the
  person, and the window list's "Select Reviewer" finds the suggestion.
- A repair of stored rows, as an upgrade step modelled on
  `I11673_AddMissingApprovalToReviewerSuggestion`, joining on
  `LOWER(reviewer_suggestions.email) = LOWER(users.email)`: it approves
  the pending suggestions whose person is already a reviewer of the
  submission. Without it, every suggestion already stuck (a twin whose
  person was added before the fix, or a capitals suggestion added
  through "Select Reviewer") stays in the panel with its failing "Add
  Reviewer", since the code change runs only when a reviewer is added.
  It touches only `reviewer_suggestions` rows that are pending, and
  needs a version bump to run. Not tried: an upgrade step runs only on
  an upgrade.

Tried on OJS and OMP `main`:

- With the fix, step 8 is refused with "The email has already been
  taken." under "Email address" and the editors see Kay Suggested once.
- Twins stored without the fix (steps 1-9 walked without it, steps
  10-14 with it): step 12 approves both rows and no Kay Suggested entry
  is left in the panel.
- Steps 15-20 with the fix: adding Adela through "Select Reviewer"
  approves her suggestion and the panel is gone; without it the row
  stays and step 20 answers the 500.
- Unchanged with the fix in and out, on a draft beside the dataset's
  "Transformative Impact of AI Tools on Modern Education…" (OJS
  submission 20, OMP 18), whose suggestions include
  `jdoe@mailinator.com`: that address still saves on the draft; a
  different address still saves; an entry's own "Edit" to its own
  address in capitals still saves; an "Edit" to another entry's
  address typed exactly is still refused; and once submitted and sent
  to review, adding Kay Suggested leaves Jhon Doe's and Lee Second's
  entries pending.
- The one change: an "Edit" to another entry's address in other
  capitals, saved without the fix, is refused with it.

**Alternatives**:

- Lowercase the address before validating and storing it
  (`prepareForValidation()`): covers new entries only, since rows
  stored with capitals would still not match, and it changes what the
  author typed. pkp-lib keeps users' addresses as typed.
- A unique index on `(submission_id, LOWER(email))`: a schema change
  and an upgrade that fails where duplicates already exist; the form
  check is still needed for the message.
- Deleting stored twins instead of approving them: it drops what the
  author wrote, and the single capitals suggestions are no twins.
- Correcting `I11673` in place: installs that already ran it would
  never run it again.

**What goes with it**:

- The REST endpoints `POST` and `PUT
  /submissions/{id}/reviewers/suggestions` now refuse (422) an address
  that differs from another entry's only in case, where they accepted
  it before.
- 3.5: the diff applies to `stable-3_5_0` with offsets
  (`ReviewerSuggestion.php` -2 lines, `ReviewerForm.php` -8); the
  form requests are the same.
- Guard: a pkp-lib test of `AddReviewerSuggestion` with an address in
  other capitals, of `ReviewerForm` approving both rows and a capitals
  suggestion added without its id, and of the upgrade step; or an e2e
  step in spec U31.

Medium: four files in pkp-lib's reviewer-suggestion code (two form
requests, the model's scope, `ReviewerForm`), an upgrade step for the
stored rows, and their tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/lib.js);
  it takes the steps above, plus the control, on an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens the
  submission by its address
  (`/dashboard/editorial?workflowSubmissionId=<id>`), where "Active
  submissions" leads. `WALK_MODE=known` runs steps 15-20 alone;
  `WALK_MODE=nb` runs the unchanged cases of the fix trial;
  `PHASE=author` and `PHASE=editor` split the walk after step 9, for
  the stored-twins trial.
- Walked on OJS and OMP, `main` and 3.5, on the default dataset
  (pkp/datasets `566bb1f`, 2026-10-03) on PostgreSQL. Step 8's
  `POST …/submissions/{id}/reviewers/suggestions` answered 200 and both
  rows are in `reviewer_suggestions`; the exact address answered 422.
  Step 13's `update-reviewer` answered 500 with the log line quoted,
  on every app and version; no other server or script error. After the
  walk `users` holds one account for the address (`kaysuggested`,
  "Kay.Suggested@Mailinator.com"), and the twin row is still unapproved.
- On these installs the box is labelled "Email address".
- OPS: no Review settings and no `reviewerSuggestionEnabled` in its
  context schema, so it was not driven.
- MySQL and MariaDB were not driven (no such install). PKP sets the
  connection collation from `[database] collation`, default
  `utf8_general_ci` (`PKPContainer`), and the migration sets none of
  its own, so the default compares without case; an install set to a
  `_bin` collation would behave as PostgreSQL does.
- Branch tips: OJS `main` ff004d0973 (pkp-lib 987776cd04), OMP `main`
  3b0ecf794c (pkp-lib 3dc90c81a6); OJS `stable-3_5_0` c1cee76b95
  (pkp-lib 771474347e), OMP `stable-3_5_0` 9c5e24246c (pkp-lib
  cf3f984335); pkp-lib `stable-3_4_0` 767353f4fe and `stable-3_3_0`
  ac3fa73402.
- Code reads: on `stable-3_5_0` the two form requests are as on `main`;
  `ReviewerSuggestion.php` differs in formatting only, and
  `scopeWithEmail()` and `ReviewerForm::execute()` do the same there.
  `stable-3_4_0` and `stable-3_3_0` have no reviewer suggestions: no
  `api/v1/reviewers/suggestions`, no `ReviewerSuggestion` class, no
  `reviewerSuggestionEnabled` setting.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for reviewer suggestion with email, duplicate, case and unique,
  `AddReviewerSuggestion`, `withEmail` and "already been taken".
- Steps 15-20 walked on OJS and OMP, `main` (with the fix and without)
  and 3.5 (without): the same on each. After the walk without the fix,
  Adela's suggestion row is still unapproved while she holds a review
  assignment on the submission.
- The unchanged cases of the fix trial ran with an earlier form of the
  `ReviewerForm` change, which selected the same rows; steps 1-14 and
  15-20 ran with the diff as linked.
- `I11673`: read on `main` (`classes/migration/upgrade/v3_5_0/`, run
  from `dbscripts/xml/upgrade.xml`); the proposed repair step was not
  written into the diff or run.
- Not driven: the `ReviewerForm` lookup through the ordinary search in
  the Cause's reach.
