# "OK" on "Assign Participant" with nobody chosen, or with a person from the previous role's list, assigns nobody and gives no reason

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** pkp-lib commit without a PR (Bugzilla 8315) · [38d309b18d](https://github.com/pkp/pkp-lib/commit/38d309b18da2700e27a1452cd0c28a743e20afae) · 2013-08-06 · Jason Nugent (jnugent)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the "Assign Participant" window, an editor who presses "OK" with
nobody chosen in the list of people expects to be told that a person is
needed. Instead the window shows its form again, emptied: the role list
is back on its first role with that role's people, and a predefined
message chosen and a message typed for the participant are gone. There
is no message, and nobody is assigned.

"OK" gives the same result in a second case, with a person chosen. The
role list does not reload the list of people until "Search" is pressed,
and nothing in the window says so. An editor who chooses a person and
then another role still sees the earlier role's people with that person
chosen, and "OK" assigns nobody, because the person does not hold the
role now chosen.

Nothing is stored wrong. The window staying open, where it closes after
an assignment, is the only sign that nobody was assigned.

## Impact

- **Lost**: everything entered in the window: the role, the person, the
  predefined message chosen and the message typed for the participant.
  Nobody is told why, or that the message was discarded.
- **Who**: anyone who presses "Assign" in the "Participants" panel of a
  workflow stage.
- **Way round**: choose the role, press "Search", choose a person from
  the list shown, type the message again, then "OK".

Medium: the task fails without a reason and discards a typed message,
but a second try in the same window gets it done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (pkp/datasets, 2026-10-01),
  nothing else; the `stable-3_5_0` dataset holds the same people and
  submissions, and the steps are the same there. The steps name OJS. On
  OMP use submission 3 ("The Political Economy of Workplace Injury in
  Canada") and the role "Series editor"; on OPS submission 1 ("The
  influence of lactation on the quantity and quality of cashmere
  production") and the role "Moderator".

Nobody chosen:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. On the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) press "View" on
   submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice".
3. In the "Participants" panel press "Assign". The "Assign Participant"
   window opens on the first role of its list, "Journal editor", whose
   list of people is empty, since Daniel Barnes is already assigned (OMP:
   "Press editor", listing Daniel Barnes; OPS: "Preprint Server manager",
   listing admin admin, Ramiro Vaca and Daniel Barnes). Roles of the
   same level come in no fixed order, so another install may open on
   another role; the steps do not depend on it.
4. Under "Choose a predefined message to use, or fill out the form
   below." choose "Discussion (Submission)" and type a sentence into
   "Message" (taken on OJS).
5. Choose nobody in the list of people and press "OK".

A person from the previous role's list:

6. In the same window choose "Section editor" in the role list and press
   "Search". The list shows Minoti Inoue (on OMP also David Buskins and
   Stephanie Berardo).
7. Choose "Minoti Inoue".
8. Choose "Author" in the role list (the role has this name in the
   three apps) and do not press "Search". The list still shows the
   section editors, with Minoti Inoue chosen.
9. Press "OK".

**Expected**: after step 5 and after step 9 the page says why nobody was
assigned (pkp-lib has the sentence, unused: "You must select a user for
the specified user group."), and the window keeps the role, the person
and the message as they were entered.

**Observed**: after step 5 and after step 9 the window shows its form
again with the role list back on the role it opened with, that role's
people in the list and nobody chosen. After step 5 the predefined
message list is back on its blank entry and "Message" is empty. There
is no message in the window and no notice, and the "Participants" panel
gains no row. The save request answers 200 with the form's HTML:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/save-participant
step 5: userGroupId=3 (Journal editor), no userId
step 9: userGroupId=14 (Author), userId=6 (Minoti Inoue)
200 {"status":true,"content":"<form class=\"pkp_form\" id=\"addParticipantForm\" …"}
```

Control: with "Section editor" chosen again and "Search" pressed before
Minoti Inoue is chosen, "OK" closes the window with the notice "User
added as a stage participant.".

## Cause

`AddParticipantForm::validate()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php`,
line 254 on `main`) tests the posted person against the posted role
before it lets the form's own checks run:

```php
return Repo::userGroup()->userInGroup($userId, $userGroupId) && Repo::userGroup()->get($userGroupId) && parent::validate($callHooks);
```

With no person posted, or a person who does not hold the posted role,
the first test is false and `parent::validate()` never runs.
`Form::validate()` is what records each failed check's message and
creates the form-error notification the page shows, so the refusal has
no message at all: `validate()` returns false with the form's error list
empty.

`StageParticipantGridHandler::saveParticipant()` then answers the
refusal with `new JSONMessage(true, $form->fetch($request))`, a newly
drawn form. `fetch()` starts from the first role, an empty `userGroupId`
and none of the posted values, which is why the role, the person and
the message are gone.

That answer is a second fault of its own: it keeps a notice from
showing even when `validate()` records one.
`AjaxFormHandler.handleResponse()` replaces the form with the returned
HTML and then triggers `notifyUser` on the element it has just removed,
so the event never reaches the page and no notice is fetched. In a trial
with only `validate()` repaired, the two refusals showed no notice;
their notices appeared after the following successful save, beside that
save's own (Evidence).

The case of a person from the previous role's list arises in the script
of the search filter inside the window.
`templates/controllers/grid/users/userSelect/searchUserFilter.tpl`
attaches `AddParticipantFormHandler` to the filter form of the people
grid (the window's own form, `#addParticipantForm`, uses
`StageParticipantNotifyHandler`). Its `addUserGroupId()` runs once from
the constructor and on every change of the role list, and copies the
list's value into the outer form's hidden `userGroupId` through a
page-wide `$('input[name=\'userGroupId\']')`. The list of people is
reloaded only by "Search". Between the two the form holds a role and a
person that do not belong together, and "OK" posts them.

The order in `validate()` dates from 2013. The form first called
`parent::validate()` and then tested the person, and had its own check
with the message "You must select a user for the specified user group."
(`editor.submission.addStageParticipant.form.userRequired`). 38d309b18d,
which made the form a child of the Notify form, dropped the parent
call.
`pkp/pkp-lib#2965` (2017) removed the check, leaving the locale key
unused, and `pkp/pkp-lib#9395` (2023) put the parent call back at the
end of the line, for its CSRF check, where a missing or mismatched
person still stops before it.

Reach:

- Both cases, in the "Assign Participant" window of every stage
  (walked on the stage of the submissions named in the Steps).
- "Edit Assignment" uses the same form and the same `validate()`. It
  posts the assignment's own person and role, so it passes (walked: a
  manager's change to an Author's "Permissions" box saves).
- `saveParticipant()` also returns the redrawn form, with no reason,
  when `Validation::canEditParticipant()` refuses an "Edit Assignment"
  save. That branch is inside `if ($form->validate())` (line 340) and is
  the subject of the report on spec U35's entry A1 (code).
- No other form in pkp-lib or the three apps puts a test in front of
  `parent::validate()` in one `&&` line (searched, Evidence).

## Proposed fix

Record the reason in `validate()` and always run the parent's checks,
and answer a refused save the way the same handler's
`sendNotification()` answers a refused "Notify": `new JSONMessage(false)`,
which leaves the form as the person filled it and lets the page fetch
the notice. The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/fix.diff).

```diff
--- a/lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php
+++ b/lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php
-        return Repo::userGroup()->userInGroup($userId, $userGroupId) && Repo::userGroup()->get($userGroupId) && parent::validate($callHooks);
+        if (!$userId || !Repo::userGroup()->get($userGroupId) || !Repo::userGroup()->userInGroup($userId, $userGroupId)) {
+            $this->addError('userId', __('editor.submission.addStageParticipant.form.userRequired'));
+        }
+
+        return parent::validate($callHooks);
--- a/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
+++ b/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
         } else {
-            return new JSONMessage(true, $form->fetch($request));
+            return new JSONMessage(false);
         }
```

Adding the error and then returning `parent::validate()` is how
`NavigationMenuForm`, `PKPNavigationMenuItemsForm` and `AddLanguageForm`
refuse. The error is recorded on `userId`, so the parent's own check of
that field, whose message is the Notify window's ("Please ensure that
you have filled out the message field …"), is skipped. The role is
looked up before the membership only so that an unknown role costs one
query. This replaces what the constructor's
`// FIXME: should use a custom validator to check that the userId belongs to this group.`
asks for, and the comment can go with it (the diff leaves it).

Tried on `main` on the three apps. After step 5 and after step 9 the
notice "You must select a user for the specified user group." shows at
the top right, the window stays as it was left (after step 9: "Author"
in the role list, Minoti Inoue chosen), and nobody is assigned. After
step 5 the predefined message chosen and the typed message are still
there (OJS). The control of the Steps still assigns Minoti Inoue. With
and without the fix, a manager's "Edit Assignment" saves with "The
stage assignment has been changed." and "Notify" with no message gives
its own notice.

**Alternatives**

- Only the `validate()` change: tried first. The notification is
  created, but the redrawn form keeps it from showing until the next
  save, and the window is still emptied.
- A `FormValidatorCustom` on `userId` in the constructor, as the FIXME
  suggests: the same test, but the parent's `userId` check would have to
  be ordered after it or removed, or its Notify message shows instead.
- Reload the list of people when the role list changes: submit the
  filter from the `change` binding in `AddParticipantFormHandler` (not
  from `addUserGroupId()` itself, which the constructor also calls), so
  that a role and a person that do not belong together cannot be posted.
  It closes the second case only and can go with the fix; not tried.
- Show the message inside the form, beside the list. The form's
  template has no field named `userId` to carry it, so it needs template
  work for the same information.

**What goes with it**

- The form's `addparticipantform::validate` hook and the POST and CSRF
  checks (both constructors add them) now run on every save, also on one
  that is refused for the person. A save with no role posted would
  record the form's `userGroupRequired` message beside the new one; the
  window always posts a role, so this was not seen.
- The `canEditParticipant()` refusal in `saveParticipant()` still
  answers with the redrawn form and no reason; it is left to the report
  on U35 A1.
- Backport: `validate()` and the refusal branch read the same on
  `stable-3_5_0` and `stable-3_4_0`; on `stable-3_3_0` the same two
  lines in the `.inc.php` files, with the DAO calls. Not tried there.
- Guard: an e2e scenario in U35 ("OK" with nobody chosen shows the
  notice, keeps the message and assigns nobody).

Small: the message alone, two places in one pkp-lib folder; the role
list reloading the people is the separate alternative above.

## Evidence

- Kept scripts (pkp-e2e's probe kit, on an install loaded from the
  default dataset; `<feature>` names that install's fleet file, `<id>`
  the output folder):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/walk.js)
  takes the steps and the control;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/neighbour.js)
  has `rvaca` change the Author's "Permissions" box in "Edit Assignment"
  and press "Notify" with no message;
  [message.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/message.js)
  takes steps 3 to 5 with the predefined message and the typed text and
  reads both after "OK" (OJS `main`, with the fix out and in). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/fix.diff ojs omp ops`,
  both scripts, then `revert`.
- Where the walk differed from the Steps: `walk.js` opens the workflow
  by address and takes the steps without step 4, on the three apps;
  step 4 was taken by `message.js` in a window of its own, on OJS. The
  scripts also read what each "OK" posted and the submission's
  `stage_assignments` rows: unchanged after steps 5 and 9, one row more
  after the control.
- The trial with only the `validate()` hunk of the diff (`main`, three
  apps): each refused save still answered the form's HTML and showed no
  notice; the control's "OK" then showed three notices at once, "You
  must select a user for the specified user group." twice and "User
  added as a stage participant.".
- The role order: the role list is ordered by role level alone, so
  roles of one level come as the database returns them. On the stages
  walked only one manager-level role is offered, so the window opened on
  it in every walk.
- Walked on `main`: OJS 4408b94def (lib/pkp f5bd392a69, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). Walked on `stable-3_5_0`: OJS 4fca1027f4, OMP
  c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491, ui-library d4e01883),
  where `validate()` and the refusal branch read the same as on `main`:
  the same result on every app. Dataset: pkp/datasets c657990
  (2026-10-01). PostgreSQL.
- Code read, 3.4 (pkp-lib `stable-3_4_0` df13621c2d; apps OJS
  9571d8fde7, OMP 0aec65441f, OPS acd8ae704b): `AddParticipantForm.php`
  line 258 is the same line; `saveParticipant()` answers the refusal
  with `new JSONMessage(true, $form->fetch($request))`;
  `AddParticipantFormHandler.js` copies the role on change. Not walked.
- Code read, 3.3 (pkp-lib `stable-3_3_0` d446601ebe; apps OJS
  9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161):
  `AddParticipantForm.inc.php` line 221 has the same order with
  `$userGroupDao->userInGroup(…) && $userGroupDao->getById(…) && parent::validate($callHooks)`
  (the parent call from 2d04e770d2, `pkp/pkp-lib#9395`); the handler's
  refusal branch and the script are the same. Not walked.
- Introduced: `git log -L` on the `validate()` line. 11b4561e4a
  (2013-05-02) has `parent::validate() && $userGroupDao->userInGroup(…)`
  and a `userId` check with the `userRequired` message; 38d309b18d
  (2013-08-06, "*8315* move Notify functionality to stage participants
  grid") drops the parent call; 9ea5729192 (2017-11-03,
  `pkp/pkp-lib#2965`) removes the `userId` check; ceb3c96dba
  (2023-10-10, `pkp/pkp-lib#9395`) adds the parent call at the end.
  Kind is "defect", not
  "regression": whether the 2013 screen showed the message before that
  change was not established, and no 3.x release has shown one.
- Other instances: `grep` for `&& parent::validate` and
  `parent::validate(…) &&` over pkp-lib and the three apps' `classes`,
  `controllers`, `pages` and `plugins` finds this line alone.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by assign participant, no user
  selected, "select a user", error message, and by `AddParticipantForm`,
  `userRequired` and `filterUserGroupId`. Read and not this fault:
  `pkp/pkp-lib#9395` (the missing CSRF check), `pkp/pkp-lib#4900` (the
  list's count), `pkp/pkp-lib#7894` (the recommend-only box).
- Not driven: a Section Editor as the person assigning; the message
  check on OMP, OPS and 3.5 (the redrawn form is the same code); the fix
  on `stable-3_5_0`; 3.4 and 3.3 on screen.
