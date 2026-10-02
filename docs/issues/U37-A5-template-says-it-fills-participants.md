# Each template in the "Add" window says it fills "Participants", but choosing one never does

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Tasks and Discussions" templates)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#750` for `pkp/pkp-lib#11826` · [9b02262b](https://github.com/pkp/ui-library/commit/9b02262b9d2512d58bf3f258223788d840b13d27) · 2025-12-10 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In the "Add" window of a stage's "Tasks & Discussions", every
discussion template says "This discussion template pre-fills the name,
participants, and starting message." Choosing one fills the name and
the message and leaves "Participants" exactly as it was. That includes
a template limited to specific roles, whose limit decides who may use
the template, not who receives it. The task templates' line and the
line on the Settings screen for templates say they fill "roles".

The window stopped filling participants on purpose, when templates were
changed to carry none, and these three texts still promise it. So the
fix wanted is the wording, not the window.

## Impact

- **Lost:** an editor who trusts the line and saves leaves only
  themself ticked, so the people the item was meant for are not told
  of it.
- **Who:** every editor and manager who adds a task or discussion from a
  template, each time; and managers reading the Settings screen, who are
  told a template fills "roles".
- **Way round:** tick the participants by hand.

Low: "Participants" is in view, unchanged, before "Save".

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", in Copyediting, with
  Maria Fritz (`mfritz`) as its copyeditor. [Press: submission 7,
  "Accessible Elements: Teaching Science Online and at a Distance", in
  Copyediting, with Maria Fritz. Preprint server: submission 1, "The
  influence of lactation on the quantity and quality of cashmere
  production", in Production, with the moderators David Buskins and
  Stephanie Berardo.]

An installed template:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   3 at its "Copyediting" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3&workflowMenuKey=workflow_4`)
   [press: submission 7; preprint server: submission 1 at "Production"].
2. Under "Copyediting Tasks & Discussions" [preprint server: "Production
   Tasks & Discussions"] press "Add". Under "Participants" only "Daniel
   Barnes (dbarnes) (Me)" is ticked.
3. Under "Templates to get you started!", press "DISCUSSION - Discussion
   (Copyediting)" [preprint server: "DISCUSSION - Discussion
   (Production)"], whose line reads "This discussion template pre-fills
   the name, participants, and starting message. You can adjust the
   details before starting." This installed template is limited to no
   roles, so there is nobody it could fill; it shows the line only.
   Step 6 is the demonstration.

A template limited to a role:

4. Close the window. Open Settings › Workflow › "Tasks and Discussions"
   and read the line above the table.
5. Under "Copyediting Stage" [preprint server: "Production Stage"] press
   "Add template". Type "Copyedit check u37r10" in "Name", choose "Limit
   access to specific roles", tick "Copyeditor" [preprint server:
   "Moderator"], type "Please check the copyedit." as the message and
   press "Save".
6. Open submission 3 at "Copyediting" again, press "Add", and press
   "DISCUSSION - Copyedit check u37r10". Its button carries the same
   "pre-fills the name, participants, and starting message" line.

**Expected:** the template fills what its line names, or the line names
only what the template fills.

**Observed:** step 3 sets "Name" to "Discussion (Copyediting)" and the
message to "Please enter your message.", and "Participants" stays as in
step 2, only Daniel Barnes ticked. Step 4 reads "Use this space to
create templates for tasks and discussions. These templates
automatically fill in the task name, due date, description, and roles,
giving you a head start." Step 6 sets "Name" and the message and again
leaves "Participants" with Daniel Barnes alone. The window's request for
the template answers with Maria Fritz, the copyeditor, as a participant,
and the window does not tick her [preprint server: both moderators].

## Cause

`setValuesFromTemplate()` in ui-library's
`src/managers/DiscussionManager/useDiscussionManagerForm.js` sets
`title`, `taskInfoAdd`, `dateDue`, `taskInfoAssignee` and `description`
from the `…/stages/{stageId}/tasks/fromTemplate/{templateId}` answer and
never `participants`. That is deliberate:
[9b02262b](https://github.com/pkp/ui-library/commit/9b02262b9d2512d58bf3f258223788d840b13d27),
the squashed `pkp/ui-library#750`, lists among its commits "Remove
setting participants data from applying task template", and took out
the `setValue('participants', …)` call when the template's roles
became an access limit ("Limit access to specific roles", "Select the
roles that can access this template."). `pkp/pkp-lib#11826` records the
decision: the template's participants were "removed because automatic
task creation often happens before all stage participants are assigned,
making the auto-assignment unreliable. Better to let users handle it
manually."

The texts that describe a template were written before that decision
and were not changed with it. In `lib/pkp/locale/en/submission.po`:

- `discussion.template.discussionDescription`, the line under each
  discussion template in the "Add" window
  (`DiscussionManagerTemplates.vue`): "pre-fills the name,
  participants, and starting message".
- `discussion.template.taskDescription`, the line under each task
  template: "auto-fills the task name, due date, description, and
  roles". A task template fills no owner either: the window empties
  "Task Owner", under the code comment "there's no assignee data from
  the template".
- `taskTemplates.description`, the line above the Settings table
  (`TaskTemplateManager.vue`): "fill in the task name, due date,
  description, and roles".

Reach:

- The three texts are English only: no other locale of pkp-lib, OJS,
  OMP or OPS defines the keys (read in the code), so every language
  shows the English line.
- `EditorialTaskController::fromTemplate()` still calls
  `Template::promote($submission)` with its default
  `$includeParticipants = true`, so its answer names the people on the
  stage who hold one of the template's access roles (Maria Fritz in
  step 6, in the `fromTemplate` request the window sends). The window
  ignores them. The automatic path, `Repository::autoCreateFromTemplates()`,
  calls `promote($submission, false)` and adds nobody, as decided (read
  in the code).

## Proposed fix

Make the three texts say what a template fills, keeping the decision of
`pkp/pkp-lib#11826`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/template-participants-not-filled/fix.diff)):

```diff
 msgid "discussion.template.discussionDescription"
-msgstr "This discussion template pre-fills the name, participants, and starting message. You can adjust the details before starting."
+msgstr "This discussion template pre-fills the name and starting message. Choose the participants, and adjust any details before starting."
 
 msgid "discussion.template.taskDescription"
-msgstr "This task template auto-fills the task name, due date, description, and roles. After selecting the template, you can modify any details before saving the task."
+msgstr "This task template auto-fills the task name, due date and description. After selecting the template, choose the participants and the task owner, and modify any details before saving the task."
@@
 msgid "taskTemplates.description"
-msgstr "Use this space to create templates for tasks and discussions. These templates automatically fill in the task name, due date, description, and roles, giving you a head start."
+msgstr "Use this space to create templates for tasks and discussions. These templates automatically fill in the task name, due date and description, giving you a head start."
```

It was tried on the three apps: the "Add" window and the Settings screen
showed the new lines and nothing else on them changed, and the
templates filled "Name" and the message as before.

**Alternatives**

- Fill "Participants" again from the template's roles (put back the
  `setValue('participants', …)` call): it reverses `pkp/pkp-lib#11826`,
  turns an access limit into a recipient list ("Copyeditor" would mean
  "send to the copyeditor"). It would also untick the editor who opens
  the window whenever they hold none of the template's roles on the
  stage, since the template's list would replace the window's default.
  A product decision, not a fix.
- Have `fromTemplate()` call `promote($submission, false)` as well, so
  its answer no longer names people the window ignores: tidy, but a
  change to a REST answer that does not change what anyone sees; it can
  follow separately.

**What goes with it**

- No data repair, no backport (3.5 and older have no templates).
- The guard: an e2e check that a template's line names only what
  pressing it fills.

Small: three strings.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/template-participants-not-filled/walk.js)
  takes the Steps on each app and records the form before and after each
  press and the `fromTemplate` answer's participants;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/template-participants-not-filled/neighbour.js)
  is the second check (the panel's line, the "Details" and
  "Participants" hints, the template's line, the Settings line, raw
  keys on both screens, and the installed template's fill). On an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/template-participants-not-filled/walk.js`.
- Driven on screen on OJS, OMP and OPS `main`, on PostgreSQL; the fault
  does not depend on the database. Dataset: pkp/datasets c657990
  (2026-10-01).
- Not driven: `stable-3_5_0`, which has no templates in its discussions
  panel (below); a task template (no installed template is a task; its
  line read in the code).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `submission.po` and
  `setValuesFromTemplate()` are the same in the three. `stable-3_5_0`:
  OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e, OPS 8eaf899468
  (lib/pkp 1fb843f491), lib/ui-library d4e01883. `stable-3_4_0`: OJS
  75cc2d488b, pkp-lib 32b0f4b4af, ui-library ee684b34. `stable-3_3_0`:
  OJS ac77c9fb35, pkp-lib f6ab331645, ui-library 96959f9e.
- Code reads: on `main`, the files the Cause names, and every locale of
  pkp-lib and the three apps for the three keys. On `stable-3_5_0`: no `classes/editorialTask` in
  lib/pkp, ui-library's `DiscussionManager.vue` alone in its folder,
  and none of the three keys. On `stable-3_4_0` and `stable-3_3_0`: no
  `DiscussionManagerTemplates.vue` in ui-library and none of the keys in
  pkp-lib.
- The trace: `git log -L` on `setValuesFromTemplate()` shows the
  participants set from the `fromTemplate` answer by 243ead3f
  (`pkp/ui-library#719`, 2025-11-06) and removed by 9b02262b; the
  discussion and task lines came with 2ceea5cd28 (PR
  `pkp/pkp-lib#11804` for `pkp/pkp-lib#11825`, 2025-09-15) and the
  Settings line with df8f669327 (PR `pkp/pkp-lib#11879` for
  `pkp/pkp-lib#11826`, 2025-10-17, in `submission.po`), when templates still
  carried participants.
- Upstream searches (2026-10-02), pkp/pkp-lib and pkp/ui-library, by
  template participants, "pre-fills", "auto-fills", template pre-fill,
  `setValuesFromTemplate`, `discussionDescription`. Related:
  `pkp/pkp-lib#11826` (the Settings templates, closed; the decision
  quoted in the Cause).
