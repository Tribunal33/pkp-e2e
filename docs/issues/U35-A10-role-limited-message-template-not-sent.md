# A message template limited to specific roles is offered on "Notify", but fills nothing and cannot be sent

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Tasks and Discussions" templates)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · committed 2026-06-01, merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open; fix in PR `pkp/pkp-lib#13385`, open without a GitHub review on 2026-10-01, not yet in main), covering the server error and the managers' access, not who the limit is tested against when sending
- **Tracked in** spec U35 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A discussion template that has "Limit access to specific roles" set
under Settings › Workflow › "Tasks and Discussions" cannot be used from
the Participants panel. The editor is shown no error, while the request
behind each action fails on the server. Choosing the template in
"Choose a predefined message…" on "Notify" leaves "Message" empty.
Pressing "Notify" with a typed message leaves the window open, sends
nothing and opens no discussion.

To get the message out, the editor chooses a template that is not
limited and types the text again.

It happens with every limited template, installed or added, whichever
roles are ticked, and also when the recipient holds one of those
roles.

## Impact

- **Lost**: the template's text never reaches "Message", and the typed
  message is not sent. It stays in the open window.
- **Who**: every editor, section editor or assistant who picks a
  role-limited template on "Notify", in a journal, press or preprint
  server where a manager has limited one. No template is limited on a
  new install. "Assign" offers the same list and sends through the same
  code; it was read in the code and not tried on screen.
- **Way round**: choose a template that is not limited and type the
  text again, or have a manager set the template back to "Mark as
  unrestricted".

Medium: a limited template always fails and nothing on screen says so,
but only where a manager has set a limit, and the editor can send the
retyped text under another template.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else.
- [OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", rows Bart Beaty (Author) and Graham Cox (Layout
  Editor). OPS: submission 1, "The influence of lactation on the
  quantity and quality of cashmere production", rows Carlo Corino
  (Author) and David Buskins (Moderator). The "Production Stage" group,
  the "Discussion (Production)" template and the "Production" stage
  carry the same names in the three apps.]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open Settings › Workflow and press the "Tasks and Discussions" tab.
3. In the "Production Stage" group open "More Actions" on "Discussion
   (Production)" and press "Edit".
4. Choose "Limit access to specific roles", tick "Author" and press
   "Save".
5. Open submission 5, "Genetic transformation of forest trees", and its
   "Production" stage.
6. Under "Participants", open "More Actions" on Diaga Diouf's row
   (Author) and press "Notify".
7. In "Choose a predefined message to use, or fill out the form below."
   choose "Discussion (Production)".
8. Type "u35r2 hello" into "Message" and press the "Notify" button at
   the bottom of the window.
9. Open the page again and repeat steps 6 to 8 on Graham Cox's row
   (Layout Editor, not an Author), typing "u35r2 other".

**Expected:** step 7 puts "Please enter your message." into "Message".
Step 8 closes the window with the notice "Notification sent to users.",
"Production Tasks & Discussions" lists a discussion "Discussion
(Production)" holding "u35r2 hello", and `ddiouf@mailinator.com` gets
the email. Step 9 does the same for Graham Cox: the Settings screen
describes the limit as "Select the roles that can access this
template.", and Daniel Barnes, a Journal editor, is offered it.

**Observed:** for both people the choice leaves "Message" empty, and
"Notify" leaves the window open with the choice and the typed text in
it and no notice. No email arrives and the panel gets no discussion.
Both requests answer 500 with an empty body; the PHP error log has the
reason:

```
POST …/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-template-body?stageId=5&submissionId=5  500
POST …/$$$call$$$/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=5&submissionId=5  500

PHP Fatal error:  Uncaught PDOException: SQLSTATE[42702]: Ambiguous column: 7 ERROR:  column reference "user_group_id" is ambiguous
LINE 1: ...ate_user_groups"."edit_task_template_id" = $1 and "user_grou...
```

Control: steps 5 to 8 taken before step 4, with the template as
installed, fill "Please enter your message.", close the window with
"Notification sent to users.", open the discussion and send the email.

## Cause

`editorialTask/Repository::isTemplateAccessibleToUser()` (lib/pkp
`classes/editorialTask/Repository.php`) decides whether a person may
use a role-limited template. Three things are wrong around it. The
first is the server error; the other two show only once it is gone.

**The query.** The method asks the template's `userGroups()` relation,
which joins `user_groups` to `edit_task_template_user_groups`, with an
unqualified column:

```php
return $template->userGroups()
    ->whereIn('user_group_id', $userGroupIds)
    ->exists();
```

Both tables have a `user_group_id`, so the database refuses the query.
A template that is not limited returns before the query, which is why
only limited ones fail. The query has been this way since the method
came in b3b882bec9. The list's own filter,
`Template::scopeWithUserGroupsAccess()`, had the same unqualified column
and was corrected in dfe1a5a675 ("Fix template filter by user groups");
this method was left as it was.

**Managers.** The list (`PKPStageParticipantNotifyForm::fetch()`) and
the templates API (`PKPEditTaskTemplateController::getMany()`) offer
every template to a Site Administrator or a manager-level role,
whatever its roles. The method has no such rule. With only the column
qualified, the Journal editor of the Steps, who is not an Author, chose
the template and "Message" stayed empty: the request answered 200 with
nothing in it (walked on OJS).

**Who is tested when sending.** The method has two callers.
`StageParticipantGridHandler::fetchTemplateBody()`, which runs when a
predefined message is chosen, passes the signed-in user.
`PKPStageParticipantNotifyForm::sendMessage()`, which runs on "Notify"
and on "OK" of "Assign", passes the recipient
(`$user = Repo::user()->get($userId)`), and returns without a word when
the test fails. `execute()` then logs "Notification sent to users." and
raises the notice all the same. With the column qualified and the
managers' rule added, step 9 closed the window with "Notification sent
to users." and sent nothing: no discussion, no email (walked on OJS).

Reach:

- "Notify" on the three apps, to a recipient who holds the ticked role
  and to one who does not: checked on screen.
- "Assign": `AddParticipantForm::execute()` inserts the assignment and
  then calls `PKPStageParticipantNotifyForm::execute()`, which calls
  `sendMessage()` when "Message" is not empty. With a limited template
  chosen and a message typed, the person is assigned, the server error
  follows, and `saveParticipant()` never reaches its own log entry and
  notice (read in the code).
- A template that is both added on the Settings screen and limited
  meets this server error first. With it fixed, the template meets the
  fault every added template has
  ([U35-A10-added-message-template-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A10-added-message-template-not-sent.md);
  read in the code).
- The "Add" window of a stage's "Tasks & Discussions" panel filters
  templates with `scopeWithUserGroupsAccess()` and does not call this
  method (read in the code).

## Proposed fix

Three small changes, one per part of the Cause
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-message-template-not-sent/fix.diff)).
In `isTemplateAccessibleToUser()`:

```diff
         if (!$template->restrictToUserGroups) {
             return true;
         }
 
+        // Managers are offered every template, whatever its roles
+        if ($user->hasRole([Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER], $template->contextId)) {
+            return true;
+        }
+
@@
         return $template->userGroups()
-            ->whereIn('user_group_id', $userGroupIds)
+            ->whereIn('user_groups.user_group_id', $userGroupIds)
             ->exists();
```

In `PKPStageParticipantNotifyForm::sendMessage()`, test the sender:

```diff
-        if (!Repo::editorialTask()->isTemplateAccessibleToUser($template, $user)) {
+        // A template's roles limit who may use it, not who may receive it
+        if (!Repo::editorialTask()->isTemplateAccessibleToUser($template, $request->getUser())) {
             return;
         }
```

The managers' rule goes into the method because both callers go through
it, and it is the test `fetch()` already uses for the list.
`Template::promote()` already names the column
`user_groups.user_group_id`. The third change makes the send ask the
question the choice asks: may the person using the template use it.
That is how the Settings screen words the limit, and it is the reading
the maintainer's review of the PR on `pkp/pkp-lib#12593` (2026-09-28)
links to.

It was tried on the three apps: every step then gave the Expected
result, for the Author and for the participant outside the template's
roles (the text filled in, the window closed, the discussion with its
message, the email). A Section editor [Series editor, Moderator] who is
not an Author was not offered the limited template, with the fix and
without it.

PR `pkp/pkp-lib#13385` makes the first two changes in its own form: the
manager test comes first, and the role test reads the loaded
`userGroups` collection instead of running a query. It keeps testing
the recipient. When that test fails, the PR replaces the chosen
template with the stage's installed "Discussion (…)" template and sends
the message under that name, and it has no answer for a stage without
one (read in the PR's diff, not run here). In the Steps the limited
template is itself the stage's "Discussion (…)" template, so the PR
would send step 9 under it. A limited "Ready for Production" sent to
someone outside its roles would go out as "Discussion (Production)".

**Alternatives**

- The first two changes without the third: the Steps' Author case
  works, but step 9 reports "Notification sent to users." and sends
  nothing (walked on OJS). That is worse than today's visible failure,
  so the first two should not go in alone.
- Qualify the column only: the server error goes, but a manager who
  does not hold one of the template's roles gets an empty "Message"
  (walked on OJS).
- Keep the limit as a limit on recipients: then the list, which is
  filtered by the sender's roles, and the send would still disagree,
  and the screen needs a refusal the editor can read. A product
  decision.

**What goes with it**

- `sendMessage()` still returns silently when its test fails, and
  `execute()` still reports success. With the sender tested, the screens
  no longer reach that: the list offers a person only templates they
  may use. Making the form refuse with an error is the lasting answer
  and a separate change.
- `$template->loadMissing('userGroups')` in the method loads a
  collection the query does not use; it can go, or the test can read
  the collection as the PR does. Either form passes the Steps' cases.
- No stored data is wrong, and nothing outside the Participants panel
  calls the method.
- Guard: an e2e scenario that limits a template to a role and sends it
  from "Notify" as a manager outside that role, to a recipient inside
  it and to one outside (a Planned item in spec U35).

Small: three few-line changes in two files of pkp-lib, two of them
already in the open PR.

## Evidence

- The kept script takes the Steps, with the control before step 4:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-message-template-not-sent/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/added-message-template-not-sent/lib.js).
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-message-template-not-sent/neighbour.js)
  checks that the fix does not widen the list: `dbuskins`, assigned to
  the submission and not an Author, reads the "Notify" list. On an
  install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the install's fleet, `<id>` the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-limited-message-template-not-sent/walk.js`
- `neighbour.js` runs on OJS submission 5 and OPS submission 1 in
  Production, and on OMP submission 1 in Copyediting with "Discussion
  (Copyediting)" limited the same way, since `dbuskins` is not assigned
  to OMP submission 4.
- Fix variants walked with `walk.js`: `fix.diff` on OJS, OMP and OPS
  `main` (with `neighbour.js`, which was also run without a fix);
  [without-sender.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-message-template-not-sent/without-sender.diff)
  (the first two changes) and
  [column-only.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-limited-message-template-not-sent/column-only.diff)
  on OJS `main`. The column-only walk was taken before step 9 was
  added to the script.
- On OPS the script did not catch the "Notification sent to users."
  notice in the control or with the fix; the window closed, the
  discussion opened and the email arrived there as on the other two.
- Taken on OJS, OMP and OPS `main`, on PostgreSQL. MySQL not checked:
  the unqualified column is ambiguous under its rules too, but the
  query was not run there. Datasets: pkp/datasets c657990 (2026-10-01).
- Not driven: "Assign"; a sender who is not a manager and holds a
  ticked role; PR `pkp/pkp-lib#13385` itself.
- Tips: OJS `main` 4408b94def with lib/pkp f5bd392a69; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6 (the
  files named here are identical on the two lib/pkp commits);
  `stable-3_5_0` lib/pkp 1fb843f491; `stable-3_4_0` lib/pkp df13621c2d;
  `stable-3_3_0` lib/pkp d446601ebe.
- Code reads:
  - `main`: `editorialTask/Repository::isTemplateAccessibleToUser()`,
    `editorialTask/Template` (`userGroups()`,
    `scopeWithUserGroupsAccess()`, `promote()`),
    `PKPStageParticipantNotifyForm::fetch()`, `execute()`,
    `sendMessage()` and `_logEventAndCreateNotification()`,
    `StageParticipantGridHandler::fetchTemplateBody()`,
    `sendNotification()` and `saveParticipant()`,
    `AddParticipantForm::execute()`,
    `PKPEditTaskTemplateController::getMany()`. Blame on the `whereIn`
    line leads to b3b882bec9.
  - 3.5, 3.4 and 3.3: no `classes/editorialTask/`; the list is built
    from email templates and no access check runs on the choice or the
    send.
- Upstream (searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library): `pkp/pkp-lib#12593` (open) carries this server error
  in a comment of 2026-09-24, seen from "Assign"; PR `pkp/pkp-lib#13385`
  (open, head cf72cc78d8, 2026-09-25) is the fix offered for it. A
  comment of 2026-09-28 on the issue says the PR resolves the reported
  failures, asks whether managers should keep their access to every
  template, and links a write-up of what the PR leaves, the recipient
  test among it.
