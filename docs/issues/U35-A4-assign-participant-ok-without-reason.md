# "OK" on "Assign Participant" with nobody chosen, or with the previous role's person still chosen, resets the window without a reason

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [38d309b18d](https://github.com/pkp/pkp-lib/commit/38d309b18da2700e27a1452cd0c28a743e20afae) (2013-08-06)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In "Assign Participant", "OK" assigns nobody and gives no reason in two
cases:

- the editor presses "OK" with nobody chosen;
- the editor chooses a person, switches to another role without pressing
  "Search", and presses "OK" while the person from the old role's list
  is still chosen.

The editor expects the window to say that a person is needed. Instead it
shows its form again, reset to the first role and its people, with no
message, so the editor chooses again without knowing what went wrong.
The second case is easy to meet, because the list of people follows a
newly chosen role only after "Search".

## Impact

- **Lost:** the editor's time: the role and person chosen in the
  window are cleared, and the window never says why.
- **Who:** editors and managers assigning participants on any stage,
  when they press "OK" too early or change the role after choosing a
  person.
- **Way round:** choose the role, press "Search", choose a person from
  that list, then "OK".

Low: no stored data is affected and the assignment succeeds once the
editor chooses again; it would be medium if the window closed as though the
person had been assigned.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS. Nothing else.
- Submissions used: OJS 4, "Computer Skill Requirements for New and
  Existing Teachers: Implications for Policy and Practice" (Submission);
  OMP 8, "Editorial" (Submission); OPS 1, "The influence of lactation on
  the quantity and quality of cashmere production" (Production). Minoti
  Inoue (`minoue`) is not assigned to any of them.

Nobody chosen:
1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`.
2. In "Participants", press "Assign".
3. Without choosing anyone, press "OK".

A person from the previous role's list:
4. In the same window, choose the role "Section editor" (OMP "Series
   editor", OPS "Moderator") and press "Search".
5. Choose "Minoti Inoue".
6. Choose the role "Author", without pressing "Search". The list still
   shows the previous role's people, with "Minoti Inoue" chosen.
7. Press "OK".

**Expected:** after step 3 and after step 7 nobody is assigned, and the
window says that a person must be chosen for the role, for example:

```
You must select a user for the specified user group.
```

Keeping the editor's role and person in the window as well would be a
further, optional improvement; the proposed fix does not do it.

**Observed:** after step 3 and after step 7 the window shows its form
again on the first role ("Journal editor"; OMP "Press editor"; OPS
"Preprint Server manager") and its people (OJS and OMP "No Items", since
`dbarnes`, that role's only holder, is already assigned; OPS "admin
admin", "Ramiro Vaca", "Daniel Barnes"). Nobody is chosen, and no
message or notice appears. Nobody is assigned: the
Participants panel and the stored assignments are as before. The request
behind "OK" answers 200 with the redrawn form.

Control: choosing "Minoti Inoue" under "Section editor" (OMP "Series
editor", OPS "Moderator") and pressing "OK" assigns her, with "User added
as a stage participant.".

## Cause

`AddParticipantForm::validate()` (lib/pkp
`controllers/grid/users/stageParticipant/form/AddParticipantForm.php`,
line 254) is:

```php
return Repo::userGroup()->userInGroup($userId, $userGroupId) && Repo::userGroup()->get($userGroupId) && parent::validate($callHooks);
```

With nobody chosen (`userId` empty, cast to 0), or with a person who does
not hold the posted role, `userInGroup()` is false and the expression
stops there. No error is recorded, and `parent::validate()`, which runs
the form's own checks (the `userId` "required" check, CSRF), never runs.
`StageParticipantGridHandler::saveParticipant()` then redraws the same
form object (`$form->fetch()`), which carries no error to show.

The second case reaches the same line because the window posts a role
and a person that no longer belong together. On a role change,
`AddParticipantFormHandler.addUserGroupId()` (lib/pkp
`js/controllers/grid/users/stageParticipant/form/AddParticipantFormHandler.js`,
attached to the people grid's search form in
`templates/controllers/grid/users/userSelect/searchUserFilter.tpl`)
copies the new role into the window form's hidden `userGroupId` at once,
through a page-wide selector, while
the list of people, and the person chosen in it, stay those of the
previous role until "Search" is pressed.

Even a recorded error would not show. The person is chosen with radio
buttons in a grid loaded into the form, not in an FBV field
(`fbvElement`), which would print its own error, and
`addParticipantForm.tpl` prints no error of its own, so nothing places a
`userId` error on screen. The redrawn form also loads that grid anew,
with no role filter, and the search form's handler copies the grid's
first role back into `userGroupId`, which is why the window comes back
on the first role.

The form has had no `userId` check of its own since 2017: a
`FormValidator` with the message
`editor.submission.addStageParticipant.form.userRequired` ("You must
select a user for the specified user group.") was dropped in
`9ea5729192` (`pkp/pkp-lib#2965`), under a "FIXME: should use a custom
validator to check that the userId belongs to this group" that is still
there. That check could not have shown either, since `validate()` did not
call the parent at all from `38d309b18d` (2013) until `ceb3c96dba`
(`pkp/pkp-lib#9395`, 2023) added the call at the end of the chain, for
the CSRF check. The message key is still in the locale files, unused.

Reach:
- The "Edit Assignment" window posts through the same `validate()`, with
  the assigned person and role as hidden fields, so it always passes this
  test (checked on screen, with and without the fix).
- No other legacy form returns false from `validate()` without
  recording an error (code: the `validate()` methods under lib/pkp's and
  each app's `controllers/` and `classes/`; those that return false
  record an error first or follow a failed `parent::validate()`).

## Proposed fix

Record the refusal as a form error on `userId` and always run the parent
checks; print that error in the window, under the list of people
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-without-reason/fix.diff),
paths from the app root; in a pkp-lib checkout apply it with `-p3`).
The excerpt below is abridged: the linked fix.diff is the whole change,
with its hunk headers and the replaced FIXME comment.

```diff
--- a/lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php
-        return Repo::userGroup()->userInGroup($userId, $userGroupId) && Repo::userGroup()->get($userGroupId) && parent::validate($callHooks);
+        if (!Repo::userGroup()->userInGroup($userId, $userGroupId) || !Repo::userGroup()->get($userGroupId)) {
+            $this->addError('userId', __('editor.submission.addStageParticipant.form.userRequired'));
+            $this->addErrorField('userId');
+        }
+
+        return parent::validate($callHooks);
--- a/lib/pkp/templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl
 			{load_url_in_div id='userSelectGridContainer' url=$userSelectGridUrl}
+			{if $errors.userId}
+				<span class="error">{$errors.userId|escape}</span>
+			{/if}
```

This follows how other legacy forms add their own checks: record the
error with `addError()`, then `return parent::validate()`
(`PKPNavigationMenuItemsForm::validate()`). With nobody chosen the
parent's `userId` "required" check fails too, but its message is written
for the "Notify" window; `Form::getErrorsArray()` keeps the first error
per field, so recording this one before the parent runs is what the
window shows. The `<span class="error">` is the markup the form
framework uses for section errors (`templates/form/formSection.tpl`),
styled for legacy forms in `styles/form/form.less`.

Tried on OJS, OMP and OPS `main`: after steps 3 and 7 the window shows
"You must select a user for the specified user group." under the list,
and nobody is assigned. The window still comes back on the first role
with nobody chosen; it only gains the message. The paths that must keep
working, a successful "Assign" and an "Edit" of the new row, still save
with "User added as a stage participant." and "The stage assignment has
been changed.", with the fix in and out.

**Alternatives:**
- A check in the window's script (no "OK" without a person) is quicker
  for the user but leaves the server answering without a reason; it
  could come on top of this fix, not instead of it.
- Clearing the chosen person when the role changes
  (`AddParticipantFormHandler.addUserGroupId()`) would stop the second
  case from arising, but not the first.
- Keeping the window's role and person on a refusal, the further
  improvement Expected mentions, would need the people grid to load on
  the posted role; a larger change, optional on top of this fix.

**What goes with it:**
- A late notice, brought by this fix: every refusal now runs
  `parent::validate()`, and `Form::validate()` then stores a "form
  error" notice, as it does for any refused legacy form. In this window
  the notice shows only once the window closes: a refused "OK" followed
  by a successful one showed "You must select a user for the specified
  user group." beside "User added as a stage participant.". Whether to
  suppress it should be settled before the fix merges.
- The same change applies as written to `stable-3_5_0` and
  `stable-3_4_0`; on `stable-3_3_0` the line reads through
  `UserGroupDAO` (`userInGroup()`, `getById($userGroupId,
  $submission->getContextId())`) and the template line is the same.
- A test: an end-to-end walk of the two cases, expecting the message.

Small: a few lines in one pkp-lib form and its template.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-without-reason/walk.js)
  takes the Steps on OJS, OMP and OPS on an install freshly reset to the
  default dataset, and records each "OK"'s answer, the redrawn window
  (role, people, any error text) and the stored stage assignments:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-without-reason/walk.js`.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-without-reason/neighbour.js)
  checks the paths that must keep working (a refused "OK", then a
  successful "Assign", then "Edit" of the new row), run with the fix in
  and out.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; the refusal is decided before any
  query that could differ by database.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`; `AddParticipantForm.php` and
  `addParticipantForm.tpl` are the same in both lib/pkp commits); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`); `stable-3_4_0`
  OJS `9571d8fde7`, OMP `0aec65441f`, OPS `acd8ae704b` (lib/pkp
  `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`, OMP `8e72fc8836`, OPS
  `c5532e2161` (lib/pkp `d446601ebe`).
- 3.5, walked on all three apps; its `AddParticipantForm.php` and
  `addParticipantForm.tpl` match `main`'s, so the fix was not tried
  there separately.
- 3.4 and 3.3 (code): `validate()` has the same short-circuit (3.4
  `AddParticipantForm.php` line 258; 3.3 `AddParticipantForm.inc.php`
  line 221, through `UserGroupDAO`), `addParticipantForm.tpl` prints no
  error, and `AddParticipantFormHandler.js` copies a newly chosen role
  into `userGroupId` the same way.
- Introduced: `git log -L` on `validate()` gives `38d309b18d` (2013,
  `*8315*`) as the change that made `validate()` return without calling
  the parent; its predecessor `11b4561e4a` (2013-05) called the parent
  first, but whether that version showed the error in the window was not
  checked, so the start is left untraced.
- Upstream searched: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library, by symptom words and by `AddParticipantForm`,
  `saveParticipant` and `userRequired`. `pkp/pkp-lib#9395` (closed) is the
  CSRF change above, not this fault; `pkp/pkp-lib#11236` (closed) is the
  "Assignment privileges" box carrying over between roles.
- Not driven: 3.4 and 3.3 (code only, as above).
