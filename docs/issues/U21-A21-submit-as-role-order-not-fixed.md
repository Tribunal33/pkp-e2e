# "Submit As" preselects another role for an editor who is also an author once their editorial role is saved

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (OPS read in the code)
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; editorial roles listed first by rule)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · 2022-10-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U21 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U21-submission-wizard.md#a21)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Make a Submission" asks a user who holds more than one submitting role
to choose one under "Submit As", and selects the role it lists first.
No app decides that order: the roles come out as the database returns
them. An editor who is also an author sees "Journal editor" ("Press
editor", "Preprint Server manager") listed first and selected, until a
manager changes an option of that editorial role in Settings › Users &
Roles › "Roles", even if they change it straight back. From then on
"Author" is listed first and selected, for every user who holds both
roles.

The user can always choose the other role. But which role is selected
for them depends on the install's history, not on a rule: two installs
with the same roles can differ, and one install's default changes when
a manager saves a role option that has nothing to do with submitting.

This happens on PostgreSQL, which stores a saved role again at the end
of its table.

## Impact

- **Lost**: nothing is stored wrong. A user who accepts the preselection
  without reading it joins the submission in a role they did not mean.
  Under the editorial role they are one of its editors and are not added
  as a contributor; under "Author" they are its author, listed as the
  first contributor and the contact. The contributor list can be changed
  on the wizard's "Contributors" step, and the role an editor changes
  under "Participants" (read in the code).
- **Who**: every user who holds an editorial role and "Author" in the
  same journal, press or preprint server, each time they start a
  submission, on PostgreSQL installs where that editorial role's options
  were ever changed. On MySQL and MariaDB the roles should come in the
  order they were created and keep it after a save (by the engine's
  documented behaviour; not walked).
- **Way round**: choose the role in "Submit As" before pressing "Begin
  Submission".

Low: the task gets done and the role is chosen on screen. It would be
medium if the role selected could not be used. That happens to a
section editor who is also an author, whose "Section editor" is listed
and selected first on a freshly loaded dataset and refused by "Begin
Submission"; that refusal is its own report
([U21-A14-section-editor-submit-as-refused.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A14-section-editor-submit-as-refused.md)),
and the fix below selects "Author" for that user too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded on PostgreSQL,
  with no role saved since (OJS; OMP and OPS the same, differences in
  brackets). On an install where a manager has saved the editorial
  role's options, step 4 already lists "Author" first. MySQL is not
  expected to show it (Who).
- `dbarnes` (Daniel Barnes) holds only "Journal editor" ["Press editor";
  OPS "Preprint Server manager"]. The dataset has no editor who is also
  an author, so steps 1 to 3 give him "Author".

1. Sign in as `admin`. Administration › "Hosted Journals" ["Hosted
   Presses", "Hosted Servers"]. On the "publicknowledge" row: the arrow,
   "Settings wizard".
2. On the "Users" tab press "Search", search `dbarnes`. On Daniel
   Barnes's row: "Edit User".
3. Tick "Author", "OK". Sign out.
4. Sign in as `dbarnes` and open "Make a Submission"
   (`/index.php/publicknowledge/en/submission`). Read "Submit As". Sign
   out.

Steps 5 and 6 [OPS: on 3.5 only. On `main` the "Preprint Server
manager" row is the first of the list and has no "Settings" arrow,
([U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md))]:

5. Sign in as `rvaca` [OPS: `admin`. "Preprint Server manager" is
   `rvaca`'s only role, and "OK" in the window of a manager's only role
   takes their Settings pages away
   ([U54-A11-own-role-ok-removes-settings-access.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A11-own-role-ok-removes-settings-access.md));
   `admin` keeps them as Site Administrator]. Settings › Users & Roles,
   tab "Roles". On the "Journal editor" ["Press editor", "Preprint Server
   manager"] row: "Settings" › "Edit". Untick "Consider role in masthead
   list" [OPS: tick it; the dataset stores it off for that role], "OK".
6. On the same row: "Settings" › "Edit". Set "Consider role in masthead
   list" back as it was, "OK". The role is now as it was before step 5.
   Sign out.
7. Sign in as `dbarnes`, open "Make a Submission" again and read "Submit
   As".

**Expected.** Step 7 shows "Submit As" as step 4 did: the same roles in
the same order, with the same role selected.

**Observed.** Step 4 lists, with the first selected:

```
Submit As *
Select the role that best describes your contribution to this submission. Select an editorial role if you want to edit and publish this submission yourself.
(•) Journal editor
( ) Author
```

["Press editor", "Author"; OPS "Preprint Server manager", "Author"].
Step 7 lists "Author" first and selected, then "Journal editor"
["Author", "Press editor"; OPS "Author", "Preprint Server manager"].

## Cause

`StartSubmission::addUserGroups()` (lib/pkp
`classes/components/forms/submission/StartSubmission.php`) builds the
"Submit As" radio. It keeps the user groups it is given that have the
submission stage (on OPS, which has no such stage, all of them), in the
order given, and selects the first:

```php
'value' => $options->first()['value'],
```

The user groups come from `PKPSubmissionHandler::getSubmitUserGroups()`
(lib/pkp `pages/submission/PKPSubmissionHandler.php`; on OPS its
override in `pages/submission/SubmissionHandler.php`). Both read them
with `UserGroup::query()…->get()` and no `orderBy`. A query without
`ORDER BY` returns rows in whatever order the database reads them, so
the radio's order, and with it the selected role, is the database's.

PostgreSQL reads the small `user_groups` table in storage order. Saving
a change to a role's options updates its `user_groups` row, and
PostgreSQL writes the updated row at the end of the table. So once
"Journal editor" (stored third in the dataset) is saved, it is read
after "Author" (stored fourteenth), and "Author" becomes the first
option. On `main` and 3.5 an "OK" that changes no option leaves the row
in place; on 3.4 every "OK" rewrites it.

The API already has a rule for the same choice. When "Begin Submission"
sends no role (a user with one submitting role),
`PKPSubmissionController::add()` sorts the user's groups so that an
author group comes first, since `pkp/pkp-lib#11435`. The form follows
no rule.

3.3's form had one: `PKPSubmissionSubmitStep1Form::fetch()` listed the
user's manager-level roles first, then the author roles, and selected
the default manager role (or the default author role). The 3.4
submission wizard (e79fc21e20) replaced it with user groups read in no
order and `'value' => $options[0]['value']`.

Reach:

- A user's submission-stage roles (OJS, OMP) and OPS's override:
  walked. A site administrator's user groups (the other branch of
  `getSubmitUserGroups()`) reach the same form unordered: code read.
- A role made with "Create New Role" is stored after the installed ones,
  so on any database a manager-level role created later is listed after
  "Author" (code read).
- Three other unordered `first()` calls pick a role for a user who has
  no submitting role (code read, not walked):
  - the page's fallback in `getSubmitUserGroups()`, the first author
    role that allows self-registration ("Author" and "Chapter Author" as
    a press installs them; the dataset's press allows "Volume editor"
    too);
  - `PKPSubmissionController::add()`'s
    `UserGroup::withContextIds()->withRoleIds(Role::ROLE_ID_AUTHOR)->first()`,
    any author role, "Translator" included;
  - OPS's override,
    `Repo::userGroup()->getByRoleIds([Role::ROLE_ID_AUTHOR], …)->first()`,
    harmless while a server has one author role.

  They decide which role such a user is enrolled in, which this fix
  leaves alone.
- The "Roles" tab's own order has the same missing `ORDER BY` in another
  method
  ([U54-A13-roles-list-order-moves-and-pages-repeat.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A13-roles-list-order-moves-and-pages-repeat.md)).

## Proposed fix

Give the radio one fixed order where it is built, in
`StartSubmission::addUserGroups()`, after the stage filter: the author
roles first, then the others by their `role_id` number, each in the
order they were created (`user_group_id`).
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submit-as-role-order-not-fixed/fix.diff):

```diff
         if ($userGroups->count() < 2) {
             return;
         }
 
+        // The user groups come from the database in no fixed order, and the first one listed
+        // is selected. List the author roles first, as PKPSubmissionController::add() prefers
+        // them when no role is sent, then the others by role_id, each in the order created.
+        $sortKey = fn (UserGroup $userGroup) => [(int) $userGroup->roleId !== Role::ROLE_ID_AUTHOR, (int) $userGroup->roleId, (int) $userGroup->id];
+        $userGroups = $userGroups->sort(fn (UserGroup $a, UserGroup $b) => $sortKey($a) <=> $sortKey($b));
+
         $options = $userGroups->map(fn (UserGroup $userGroup) => [
```

Why "Author" first:

- It is the API's own rule for the same choice, so the page and the API
  agree.
- The field's description already treats the editorial role as the one
  to opt into: "Select an editorial role if you want to edit and
  publish this submission yourself."
- It never selects a role "Begin Submission" refuses. With editorial
  roles first, a section editor who is also an author would get the
  refused "Section editor" selected on every install (A14), until A14's
  fix, which stops offering that role, is in. "Author" first works with
  or without A14's fix.
- The form is shared, so the one change covers the three apps and every
  handler that passes user groups to it, OPS's override included.

It changes what editors who are also authors see today on most
installs: "Author" is selected instead of their editorial role.

The fix was tried on OJS, OMP and OPS `main`. Steps 4 and 7 then both
listed "Author" first and selected, then the editorial role, on all
three apps (on OPS, where steps 5 and 6 cannot be taken on `main`, steps
4 and 7 alike). A section editor who is also an author got "Author"
selected, and "Begin Submission" opened the wizard, where without the
fix "Section editor" ("Series editor") was selected and refused.

**Alternatives**

- Editorial roles first (`role_id` order, then `user_group_id`), as 3.3
  did and as most installs show today. It keeps editors' current
  default, but selects the refused "Section editor" for a section editor
  who is also an author until A14's fix is in.
- `orderByRoleId()->orderById()` on the queries in
  `PKPSubmissionHandler::getSubmitUserGroups()` and OPS's override. Two
  repositories, and a handler or plugin that passes its own user groups
  to the form stays unordered. (`Repository::getUserGroupsByStage()`
  orders by `role_id` alone, which leaves roles of one level unordered.)

**What goes with it**

- The three fallback `first()` calls under Reach could take `orderById()`
  in the same spirit; they are left out, since they choose an enrolment
  role, not the preselection.
- No data repair, no API change. The diff applies to 3.5 as written. On
  3.4 the same method takes the same sort, with `getRoleId()` and
  `getId()`.
- Guard: a unit test of `StartSubmission` given user groups out of
  order, and the e2e scenario that saves the editorial role and reads
  "Submit As" again (spec U21).

Small: one sort in the shared form, and its test.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submit-as-role-order-not-fixed/walk.js).
  It also reads the roles' storage positions (`ctid`) before and after
  steps 5 and 6: "Journal editor" moved from `(0,3)` to `(0,21)` on OJS
  `main` and 3.5, "Preprint Server manager" from `(0,2)` to `(0,8)` on
  OPS 3.5; "Author" stayed at `(0,14)` and `(0,4)`.
- [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/submit-as-role-order-not-fixed/neighbour.js)
  checks what the fix must leave working: Daniel Barnes (given "Author")
  and David Buskins (`dbuskins`, a section editor given "Author") press
  "Begin Submission" with the selection as it is, and an author-only
  user (`ccorino`, `aclark` on OMP) opens the page.
  Without the fix: the editorial role selected and accepted for Daniel
  Barnes, "Section editor" ("Series editor") selected and refused with
  "You are not allowed to submit in this user role." for David Buskins.
  With it: "Author" selected and accepted for both. On OPS David Buskins
  (a moderator) gets no "Submit As" either way and is accepted, and the
  author-only user gets no "Submit As" either way, on all three apps.
  The editorial-roles-first order (the first alternative) was tried as
  well, on the same three apps: on OJS and OMP it gave the Expected, and
  it kept the editorial role selected for Daniel Barnes.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL.
  Dataset: pkp/datasets 7912e09 (2026-10-14). OPS `main`: steps 1 to 4
  and 7 walked, both reading "Preprint Server manager", "Author", since
  steps 5 and 6 cannot be taken; OPS `main`'s
  `SubmissionHandler::getSubmitUserGroups()` and the shared form are the
  same as on 3.5, where the walk showed the fault.
- OPS steps 5 and 6: a first 3.5 drive as `rvaca` ended at step 5 with
  the alert "Access denied." (U54 A11); the walk was taken again as
  `admin`.
- Tips: `main` ojs 378eced941, omp f4836d4fb, ops 2ece50497f, lib/pkp
  b17fadae59; `stable-3_5_0` ojs ca763c91cd, omp a70bbb9c4, ops
  44aec6e131, lib/pkp 4045d9241e; `stable-3_4_0` (pkp's branch: the app
  repos' `upstream/stable-3_4_0`, lib/pkp `origin/stable-3_4_0`) ojs
  daf0ca971d, omp 0aec65441, ops acd8ae704b, lib/pkp 55c8e406b3;
  `stable-3_3_0` ojs d7d9dd14ec, omp 8e72fc883, ops c5532e2161, lib/pkp
  5e84acd11b.
- Code reads beyond the Cause: 3.4's `getSubmitUserGroups()` reads the
  `Collector` with no `orderBy` (it orders only when asked), its form
  selects `$options->first()`, `EntityDAO::_update()` writes the whole
  row on every save, and OPS 3.4 has no override; 3.3's `step1.tpl`
  checks `getDefaultByRoleId()`'s group. `UserGroupForm::execute()` on
  `main` writes the options as columns of the `user_groups` row.
  `PKPSubmissionController::add()` assigns the submitter in the chosen
  group and makes the contributor record only for an author group.
- Introduced: `git blame` on `main` gives e79fc21e20 (Nate Wright,
  "pkp/pkp-lib#7191 Implement new submission wizard", 2022-10-18,
  committed by Alec Smecher) for `getSubmitUserGroups()` and the
  preselection (`'value' => $options[0]['value']`, rewritten as
  `$options->first()` in 54cf365609). Nate Wright's own PR,
  `pkp/pkp-lib#8349`, is still open; the commits were merged with Alec
  Smecher's `pkp/pkp-lib#8495` ("Reimplement submission wizard",
  2022-12-14). The later rewrites of the query (714d5d5aa4, 24e9ca169e,
  51ec96c68d, af8f0d8d2f) added no order. 24e9ca169e also turned the
  API's default from preferring a non-author group to preferring an
  author group.
- MySQL and MariaDB not walked. InnoDB reads one context's roles in
  primary-key order and updates a row in place, so a save is not
  expected to move a role there (unverified).
- Upstream search (2026-10-15), issues and PRs in pkp/pkp-lib, pkp/ojs,
  pkp/omp, pkp/ops and pkp/ui-library. Nearest, not the same fault:
  `pkp/pkp-lib#12097` (open; which roles "Submit As" offers on 3.3 and
  3.5, not their order) and `pkp/pkp-lib#12967` (closed; a refused
  "Author" on some servers).
