# A discussion template limited to some roles fills nothing in "Notify" or "Assign", and sending it fails

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no discussion templates)
  - 3.4: none (code; no discussion templates)
  - 3.3: none (code; no discussion templates)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · 2026-06-01 (merged 2026-08-21) · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open). Its follow-up PR `pkp/pkp-lib#13385` (open, read at head cf72cc78d8 on 2026-10-01, not yet in main) fixes this crash. It disagrees with this report only on a recipient who lacks the template's roles: the PR sends that person the stage's default discussion template, while this report proposes checking the sender's roles instead
- **Tracked in** spec U35 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The app fails on the server when an editor sends a message from a
submission's "Participants" panel with a discussion template that a
manager has limited to some roles. The limit is set in Settings ›
Workflow › "Tasks and Discussions" with "Limit access to specific
roles". The "Notify" and "Assign" windows still list the template.
Choosing it leaves "Message" as it was. Pressing "Notify" leaves the
window open and shows no error. No email goes out and no discussion is
added. In "Assign" the person is assigned all the same, but the message
is lost and the window stays open.

This happens even when the sender and the recipient both hold one of
the allowed roles. It happens for templates that came with the install
as well as templates added in Settings. For example, once "Discussion
(Production)" is limited to authors, it cannot be sent to an author.

## Impact

- **Lost.** The message, with no reason given. In "Assign", the
  assignment is saved while the screen reports nothing.
- **Who.** Every editor or assistant who picks a limited template in
  the Participants panel. A journal that limits its templates loses all
  of them in this panel.
- **Way round.** Yes: mark the template as unrestricted again, or
  choose another template and type the text.

Medium: talking to the others on a submission is a core task, and it
fails with nothing shown for every limited template. It is not higher
because there are ways round on screen and a manager must set the limit
on purpose. It would be high if templates came limited by default.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`. Per app, the
submission at Production, its author, and a participant who is not a
manager:

| App | Submission | Author | Participant (role) |
|---|---|---|---|
| OJS | 5, "Genetic transformation of forest trees" | Diaga Diouf (`ddiouf`) | David Buskins (`dbuskins`, "Section editor") |
| OMP | 4, "How Canadians Communicate: Contexts of Canadian Popular Culture" | Bart Beaty (`bbeaty`) | Graham Cox (`gcox`, "Layout Editor") |
| OPS | 1, "The influence of lactation on the quantity and quality of cashmere production" | Carlo Corino (`ccorino`) | David Buskins (`dbuskins`, "Moderator") |

A manager-level editor sends to the author:

1. Sign in as `dbarnes`.
2. Open Settings › Workflow › "Tasks and Discussions".
3. In the "Production Stage" section, open "Discussion (Production)"'s
   "More Actions" menu and choose "Edit".
4. Choose "Limit access to specific roles", tick "Author", and press
   "Save".
5. Open the submission at its Production stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`
   on OJS).
6. In "Participants", open the author's "More Actions" menu and choose
   "Notify".
7. In "Choose a predefined message to use, or fill out the form below.",
   choose "Discussion (Production)".
8. If "Message" is still empty, type "Hello" in it. If it holds text,
   leave that text as it is. Press "Notify".
9. Reload the page and look at "Production Tasks & Discussions".

A participant who holds one of the roles sends to the author:

10. As in step 4, tick the participant's role from the table as well as
    "Author", and press "Save".
11. Sign in as the participant, then repeat steps 5–8.

**Expected:** after step 7, "Message" reads "Please enter your
message.", so step 8 sends that text. The window closes with
"Notification sent to users.". The author receives an email with the
subject "Discussion (Production)", and the discussion is listed with the
text. Step 11 gives the same result, sent by the participant.

**Observed:** after step 7, "Message" stays empty. After step 8 (with
"Hello" typed) the window stays open, and no notice or error appears.
No email is sent, and after step 9 no discussion is listed. Step 11
fails the same way. Both requests answer 500 with an empty body:

```
POST …/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=5   500
POST …/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=5&submissionId=5     500
```

The PHP error log has, for each:

```
Illuminate\Database\QueryException: SQLSTATE[42702]: Ambiguous column: 7 ERROR:  column reference "user_group_id" is ambiguous
(SQL: select exists(select * from "user_groups" inner join "edit_task_template_user_groups" on "user_groups"."user_group_id" = "edit_task_template_user_groups"."user_group_id" where "edit_task_template_user_groups"."edit_task_template_id" = 4 and "user_group_id" in (14, 17)) as "exists")
#8 lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php(185): PKP\editorialTask\Repository->isTemplateAccessibleToUser(…)
```

## Cause

`PKP\editorialTask\Repository::isTemplateAccessibleToUser()` decides
whether a user may use a limited template. It filters the template's
`userGroups()` relation with `->whereIn('user_group_id', $userGroupIds)`.
That relation joins `user_groups` to `edit_task_template_user_groups`,
and both tables have a `user_group_id` column. PostgreSQL therefore
refuses the bare column name as ambiguous. MySQL also refuses an
ambiguous column (error 1052), but this was not tried on MySQL.
Unrestricted templates return before the query, which is why they work.

Three requests reach this method:

- **Choosing the template:** `StageParticipantGridHandler::fetchTemplateBody()`
  asks about the signed-in user. This is the same in "Notify" and
  "Assign".
- **"Notify":** `send-notification` runs
  `PKPStageParticipantNotifyForm::sendMessage()`. It asks about the
  recipient, which it loads with `Repo::user()->get($userId)` into a
  variable also named `$user`.
- **"OK" in "Assign":** `saveParticipant` runs
  `AddParticipantForm::execute()`. That method saves the stage
  assignment first, then calls the parent form, which reaches
  `sendMessage()` only when "Message" is not empty. That call throws.
  The person is therefore assigned while the request answers 500, the
  window stays open and the participant list is not refreshed. Pressing
  "OK" again does no harm, because the assignment is reused.

Fixing the query alone does not make the template usable, because the
method would then disagree with the list in two ways:

- **Managers.** `PKPStageParticipantNotifyForm::fetch()` offers every
  template to a user with a manager-level role in the journal (Journal
  manager, Editor, Production editor). Users with a sub-editor or
  assistant role see only the templates for their own roles, and
  everyone else gets no list. The method has no such exemption for
  managers. A manager-level editor such as `dbarnes`, who is not an
  Author, would be offered the Author-limited template, but
  `fetchTemplateBody()` would answer with nothing.
- **Recipients.** The setting's note reads "Select the roles that can
  access this template.", which means the person who uses the template.
  `sendMessage()` checks the recipient instead. When the recipient holds
  none of the roles, it returns without sending, and `execute()` still
  logs and shows "Notification sent to users.". With only the query
  fixed, that would become a silent loss. That the recipient check is
  accidental is a reading of the code, not something verified: the
  variable has the same name as the sender's in the handler.

How it came in: b3b882bec9 (pkp/pkp-lib#12593, which moved the panel's
predefined messages to discussion templates) wrote the method and the
calls. dfe1a5a675 ("Fix template filter by user groups", same PR) fixed
the same ambiguity in `Template::scopeWithUserGroupsAccess()` but not in
this method.

Reach:

- "Assign", as above. This report's walk covered "Notify" only. The code
  shows what "Assign" does, and it was seen on screen on 2026-09-22, as
  recorded in the
  [register entry](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10).
- A template that a manager adds in Settings and limits fails here
  first. Once this is fixed, it fails on a separate fault, described in
  [U35-A10-added-discussion-template-fills-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A10-added-discussion-template-fills-nothing.md).
- The other bare `whereIn('user_group_id', …)` calls in pkp-lib query
  only one table, so they are not ambiguous (code):
  - `Template::promote()`, inside a `whereHas` on `user_groups`
  - `UserGroup`'s scope
  - two migrations

  This is the only query on the `userGroups()` relation that is
  filtered this way.

## Proposed fix

In `isTemplateAccessibleToUser()`, qualify the column and add the
manager exemption that `fetch()` uses. Then have `sendMessage()` ask
about the sender, as `fetchTemplateBody()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-discussion-template-fails/fix.diff)):

```diff
         if (!$template->restrictToUserGroups) {
             return true;
         }
 
+        // Managers are offered every template (PKPStageParticipantNotifyForm::fetch())
+        if ($user->hasRole([Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER], $template->contextId)) {
+            return true;
+        }
+
 …
         return $template->userGroups()
-            ->whereIn('user_group_id', $userGroupIds)
+            ->whereIn('edit_task_template_user_groups.user_group_id', $userGroupIds)
             ->exists();
```

```diff
-        if (!Repo::editorialTask()->isTemplateAccessibleToUser($template, $user)) {
+        // The template's roles limit who may use it: the sender, as in fetch() and fetchTemplateBody()
+        if (!Repo::editorialTask()->isTemplateAccessibleToUser($template, $request->getUser())) {
```

The `hasRole()` call is copied from `fetch()`. Its `ROLE_ID_SITE_ADMIN`
half never matches inside a journal, because a site administrator's role
belongs to the site, not to the journal. It does no harm, and it can be
dropped in both places. The column is qualified the same way
dfe1a5a675 qualified it in `scopeWithUserGroupsAccess()`.

Tried on `main` in OJS, OMP and OPS:

- **Steps 1–9:** the template filled "Please enter your message.".
  "Notify" closed the window, the author received the email from
  `dbarnes`, and the discussion was listed with the text.
- **Steps 10–11:** before the fix both requests answered 500. With the
  fix, the template filled and the author received it.
- **Checks that the fix goes no further, with the fix applied and
  without it:**
  - A participant who holds none of the roles (`dbuskins`, `gcox`, with
    only "Author" ticked) is still not offered the template.
  - `dbarnes` sending the template to that participant failed without
    the fix. With the fix, the message is sent.

**Alternatives**

- **Qualify the column only.** This is small: one line and a unit test.
  It removes the crash, but it leaves two faults. Manager-level editors
  are offered templates whose text then never fills. A recipient outside
  the roles is not sent the message while the window says "Notification
  sent to users.".
- **PR `pkp/pkp-lib#13385`.** It adds the same manager exemption, and it
  removes the ambiguity by filtering the already loaded relation in
  memory instead of querying. That also makes the
  `loadMissing('userGroups')` line useful again. It keeps the recipient
  check: when the recipient lacks the roles, it sends the stage's
  default discussion template instead of the chosen one, under a title
  the sender did not pick.
- **Refuse the send with a message.** This keeps the recipient check as
  intended, but it needs the product to decide that limits apply to
  recipients, which the setting's note does not say.

**What goes with it**

- The product decision on recipients: whether "Limit access to specific
  roles" governs only who may send a template (this fix) or also who
  may receive it.
- After this fix, `sendMessage()` still returns silently when the
  sender fails the check, while "Notification sent to users." shows.
  The screens never offer such a template to such a sender, so only a
  crafted request reaches this path. It should still return an error
  rather than a success.
- A unit test on `isTemplateAccessibleToUser()` for a limited template,
  covering a holder, a non-holder and a manager.

Medium, because the fix decides who may receive a limited template,
which the team must agree on first. The code itself is a few lines in
two pkp-lib files. Qualifying the column alone would be small, but it
would leave the two faults described above.

## Evidence

- Kept scripts, in
  [role-limited-discussion-template-fails/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-discussion-template-fails/),
  with shared helpers in
  [common.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-discussion-template-fills-nothing/common.js).
  Each runs on a fresh load of the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-discussion-template-fails/walk.js)
    takes steps 1–9:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-limited-discussion-template-fails/walk.js`.
  - [holder.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-discussion-template-fails/holder.js)
    takes steps 10–11.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-discussion-template-fails/neighbour.js)
    checks the non-holder's list and `dbarnes` sending to the
    non-holder.

  All three were run with the fix applied and without it.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), OJS, OMP and OPS on `main`.
- Branch tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc), OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7 (both lib/pkp 3dc90c81a6). 3.5:
  OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp a9c76aed62).
- 3.5 was read in the code, not walked. It has no discussion templates
  (no `classes/editorialTask/`), and its Participants list, the stage's
  email template and its alternates, has no role check.
- Introduced: `git blame` on `isTemplateAccessibleToUser()` (lines
  272–287) and on both calls gives b3b882bec9, in PR
  `pkp/pkp-lib#12842` (merged 2026-08-21).
- Upstream: the fault was reported in a comment on `pkp/pkp-lib#12593`
  on 2026-09-24. `pkp/pkp-lib#10403` (closed, its code reverted on
  2026-08-10) once limited email templates by sender and receiver role.
  It is the only sign that recipients were ever meant to be checked.
- Not walked: "Assign" (see Reach), and a limited template in the
  stage's "Tasks & Discussions" "Add" window. That path does not call
  `isTemplateAccessibleToUser()` (code).
