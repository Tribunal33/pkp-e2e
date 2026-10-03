# On a journal with one contributor role, adding or editing any contributor fails with an error

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no contributor roles)
  - 3.4: none (code; no contributor roles)
  - 3.3: none (code; no contributor roles)
- **Introduced** `pkp/pkp-lib#11765` for `pkp/pkp-lib#11378` · [52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90) · 2025-11-11 · jyhein (jyhein)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a14)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When a journal has exactly one contributor role, the contributor form
hides the "Contributor Roles" field, as designed. Every "Save" from that
form then fails on the server. An editor adding or editing a contributor
in the workflow, and an author adding a co-author in the submission
wizard, get "An unexpected error has occurred. Please reload the page and
try again.", and the window stays open.

A failed edit keeps the contributor's old name. A failed add still
creates the contributor, without a role, so each retry leaves another
role-less contributor in the list. A manager can get round it by adding
a second role back on the "Contributor Roles" screen.

It happens once a manager deletes the roles the journal does not use:
"Translator" on a journal or preprint server, or three of a press's four
roles.

## Impact

- **Lost:** no contributor can be added or edited correctly. A
  role-less contributor that stays until publication is shown on the
  article page without a role, and is left out of the Crossref deposit
  and of the "How to cite" citation (read in the code). An author can
  still submit, since the submit checks do not look at roles (read in
  the code). The co-author is then missing, or goes in without a role.
- **Who:** editors and managers on a submission's "Contributors", and
  authors on the wizard's "Contributors" step, on every save.
- **Way round:** a manager adds any second role on Settings › Workflow ›
  Submission › "Contributor Roles". The form then offers the role
  checkboxes, and saves work. Nothing on screen points to it, and
  authors and editors without settings access cannot take it.

Medium: adding and editing contributors fails with a server error for
everyone on such a journal, but a manager has a way round on screen. The
role-less rows a failed add writes do not raise it: they are listed,
without a role badge, on the screen that showed the error.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- [OMP only] The press has four contributor roles, and two of them are
  in use, so they cannot be deleted yet. As `rvaca`, edit each of these
  contributors so that "Author" is their only role (tick "Author",
  untick the other one, "Save"):
  - submission 2 "The West and Beyond: New Perspectives on an Imagined
    Region": Sarah Carter and Peter Fortna ("Volume editor"); Gerald
    Friesen, Lyle Dick, Winona Wheeler, Matt Dyce and James Opp
    ("Chapter Author");
  - submission 12 "Connecting ICTs to Development": Heloise Emdon
    ("Volume editor");
  - submission 18 "Transformative Impact of AI Tools on Modern
    Education…": Nargis Parvin ("Volume editor").

Making the journal a one-role journal:

1. Sign in as `rvaca`.
2. Go to Settings › Workflow › Submission › "Contributor Roles". The
   table lists "Author" and "Translator" (OMP also lists "Chapter Author"
   and "Volume editor").
3. On the "Translator" row, open "…" › "Delete Role", type `TRANSLATOR`
   and press the confirm button, then "Back to Contributor Roles". [OMP:
   do the same for "Volume editor" (`EDITOR`) and "Chapter Author"
   (`AUTHOR`; the dialog asks for the role identifier, and the press
   seeds "Chapter Author" with the same `AUTHOR` identifier as
   "Author").] The table now lists "Author" alone.

Adding, as an editor:

4. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (OMP: submission 3,
   "The Political Economy of Workplace Injury in Canada"; OPS: submission
   1, "The influence of lactation on the quantity and quality of cashmere
   production"), then Publication › "Contributors".
5. Press "Add Contributor". The form has no "Contributor Roles" field.
6. Enter Given Name `Ana u41h`, Family Name `Person`, Email
   `u41h@mailinator.com` and Country "Canada", then press "Save".
7. Press "Close" and reload the page.

Editing, as an editor:

8. On the same list, press "Edit" on Mark Irvine (OMP: Bob Barnetson;
   OPS: Carlo Corino). Change Given Name to `Mark u41h` (`Bob u41h`,
   `Carlo u41h`) and press "Save". Then "Close" and reload.

Submitting, as an author:

9. Sign in as `ccorino` (OMP: `aclark`). Start a new submission: title
   `u41h wizard`, Submission Language "English", Section "Articles" (OJS
   only; OMP and OPS ask for no section, and OMP's work type keeps its
   default). Tick the boxes, press "Begin Submission", then "Continue"
   until the "Contributors" step.
10. Press "Add Contributor", enter the same details as in step 6 with
    Given Name `Ben u41h`, and press "Save".

**Expected:** each save closes the window. The list shows "Ana u41h
Person" with the "Author" badge (the journal's one role, given without a
choice), "Mark u41h Irvine", and in the wizard "Ben u41h Person" with
"Author".

**Observed:** each "Save" shows "An unexpected error has occurred.
Please reload the page and try again." and the window stays open. The
request answers:

```
POST /index.php/publicknowledge/api/v1/submissions/4/publications/5/contributors
500 {"error":"PKP\\author\\Author::getContributorRoles(): Return value must be of type Traversable|array, string returned"}
```

The server log has the same `TypeError`, at
`lib/pkp/classes/author/Author.php:310`.

After the reload in step 7, "Ana u41h Person" is listed with no role
badge, and the database holds the contributor with no role. After step
8, the contributor is still "Mark Irvine". After step 10 the wizard
lists "Ben u41h Person" with no role badge.

## Cause

`ContributorForm::__construct()` in pkp-lib
(`classes/components/forms/publication/ContributorForm.php`, line 170)
collapses the role choice when the context has one role:

```php
$this->addHiddenField('contributorRoles', $contributorRoles[0]['value'] ?? []);
```

The hidden field holds that role's id as a single value, so the form
posts `contributorRoles=1`. Everywhere else `contributorRoles` is a list
of role ids: the checkbox field's value is `[]`, the edit window fills it
from `author.contributorRoles` mapped to ids (`ContributorsListPanel.vue`
`openEditModal()`), and the API turns the list into `ContributorRole`
objects.

`PKPSubmissionController::addContributor()` and `editContributor()`
(lines 1719 and 1873) do that conversion only `if
(is_array($params['contributorRoles']))`, so a single value goes on to
the model unchanged. The author schema marks `contributorRoles`
`readOnly`, so `PKPSchemaService::addPropValidationRules()` adds no rule
for it. `Repository::validate()` only checks that it is not empty, so
the value passes.

`author\DAO::insert()` then writes the `authors` row and the CRediT
roles (`addCreditRoles()`). Only after that does it read
`Author::getContributorRoles()` (`Author.php:310`), whose `iterable`
return type rejects the string with a `TypeError`. Nothing wraps these
writes in a transaction, so the row stays, without a contributor role
but with any CRediT roles picked in the form. Affiliations typed into a
failed add are lost: the controller saves them only after
`Repo::author()->add()` returns. `DAO::update()` fails the same way
before `parent::_update()`, so an edit's name and other fields are not
saved. Before the fault, `DAO::update()` has already saved the
affiliations and CRediT roles sent with the edit. These partial writes
are read in the code; the walk checked only the names and the roles.

At 52d3a0f8e7 the scalar did not crash: the DAO passed
`getContributorRoleIds()`, which turned it into `[null]`, and
`addContributorRoles()` returned silently. The contributor was saved
without its role, with no error (code read). Since
[c158d7fdd3](https://github.com/pkp/pkp-lib/commit/c158d7fdd3e21f08705318936a3a26fc1951656b)
(2025-11-27) the DAO passes `getContributorRoles()`, and the save fails
with a 500.

Reach:

- The workflow's "Contributors" for editors (add and edit; the form is
  built in `PKPDashboardHandler`), and the submission wizard's
  "Contributors" step for authors (`PKPSubmissionHandler`'s
  `ContributorsListPanel`): on screen, all three apps.
- The other builders of the same pkp-lib form: the
  `ContributorsListPanel` of `PKPWorkflowHandler` and
  `PKPAuthorDashboardHandler` (code).
- The REST API: a client that sends `contributorRoles` as a single id
  gets the same 500 and the same role-less row (code).

## Proposed fix

Send the hidden value as a list, as every other writer of
`contributorRoles` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-role-journal-contributor-save-fails/fix.diff)):

```diff
         } else {
-            $this->addHiddenField('contributorRoles', $contributorRoles[0]['value'] ?? []);
+            $this->addHiddenField('contributorRoles', array_column($contributorRoles, 'value'));
         }
```

With one role this is `[id]`. A context always keeps one AUTHOR role
(the last one cannot be deleted), so an empty list does not come from
the screens. No other hidden field in the three apps has this
list-versus-single-value problem: the only other one, `sectionId` in
OJS's and OPS's `StartSubmission`, is a single-value property.

Tried on `main` in all three apps. The walk then showed the Expected:
"Ana u41h Person" and "Ben u41h Person" saved with the "Author" role, and
"Mark u41h Irvine" renamed. As a neighbour check, on the unchanged
dataset with both roles, an add with only "Translator" ticked still
saved with that role alone, and an add with no role ticked was still
refused with "This field is required." The results were the same with
the fix in and out.

**Alternatives:**

- Wrap a single value into a list in the controller's `is_array` branch.
  This would also cover API clients, but it would accept a shape the API
  does not document. As a second step, the controller should rather
  answer 400 for a non-list `contributorRoles` than reach the model.
- Restore `getContributorRoleIds()` in the DAO. This would bring back the
  silent role-less save, which is worse.

**What goes with it:**

- A unit test that builds `ContributorForm` for a one-role context and
  checks that the hidden `contributorRoles` value is a list, or an e2e
  scenario that saves a contributor on a one-role journal.
- Optionally, the 400 for a non-list `contributorRoles` in
  `addContributor()` and `editContributor()`, and one transaction around
  the author's insert and its roles. Neither is needed for the screens.
- No data repair: role-less contributors from failed attempts are listed
  and can be deleted by hand.

Small: one line in the shared form and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-role-journal-contributor-save-fails/walk.js)
  (helpers in `lib.js` beside it), run on an install freshly loaded with
  the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/one-role-journal-contributor-save-fails/walk.js`.
  `MODE=neighbour` runs the neighbour check (no role deleted; one add
  with "Translator" alone, one add with no role) and reads the stored
  roles from the database.
- Walked on `main` (OJS, OMP, OPS) and `stable-3_5_0` (OJS, OMP, OPS) on
  PostgreSQL, with pkp/datasets 566bb1f (2026-10-03). The fault does not
  depend on the database. The 3.5 code agrees with the walk: lib/pkp's
  `ContributorForm` there collapses a single author user group into a
  hidden `userGroupId`, which the schema defines as an integer, so the
  single value is correct there.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  `ContributorForm.php` is byte-identical in both `main` lib/pkp commits.
- 3.4 and 3.3 (code): lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402. On 3.4, `ContributorForm.php` collapses a
  single author user group into `addHiddenField('userGroupId', …)`, an
  integer property, and there are no contributor roles. 3.3 has no
  `ContributorForm`; the legacy `PKPAuthorForm` picks a user group.
- Introduced: `git blame` on line 170 gives 52d3a0f8e7 (PR
  `pkp/pkp-lib#11765`, "Contributor Roles and Type", merged 2025-11-20;
  the PR's issue is `pkp/pkp-lib#11378`). That commit replaced the
  hidden `userGroupId` (a scalar, correct) with the hidden
  `contributorRoles`, keeping the scalar. The 500 came with c158d7fdd3
  (PR `pkp/pkp-lib#12072`), which made the DAO pass
  `getContributorRoles()`, then with an `array` return type.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  were searched by symptom words and by `getContributorRoles` and
  `ContributorForm`. `pkp/pkp-lib#13316` (OMP volume editor option) and
  `pkp/pkp-lib#12152` were read and are other problems.
- Read in the code, not walked: the CRediT roles kept and the
  affiliations lost on a failed add; the affiliations and CRediT roles
  saved by a failed edit; that the wizard submits with a role-less
  co-author (`submission\Repository::validateSubmit()`, whose contributor checks look at names and
  affiliations only); the role-less contributor on the article page
  (`article_details.tpl` prints its empty role list), in the Crossref
  deposit (`ArticleCrossrefXmlFilter` skips a contributor with no role)
  and in the citation (`CitationStyleLanguagePlugin::assignContributorRoles()`
  places it in no role).
