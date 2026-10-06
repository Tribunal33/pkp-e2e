# A Section Editor's "Find Template" in a decision's email answers "You are not authorized to access the requested resource."

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the template search is open to section editors)
  - 3.3: none (code; no template search in the decision forms)
- **Introduced** `pkp/pkp-lib#10380` for `pkp/pkp-lib#5504` · [1330ac1283](https://github.com/pkp/pkp-lib/commit/1330ac128326a8ee735549bb33f22ee7c9f019e6) · 2024-11-18 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U34 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U34-editorial-decision-recording.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Section Editor recording a decision types a phrase into "Find Template"
above the email to the authors and presses Enter to search. Instead of
the matching templates, a window "Error" opens reading "You are not
authorized to access the requested resource.". After "OK" the phrase
stays in the box and no templates are listed under it.

The decision's own template comes back only after "Clear search phrase",
and every other template of the journal, press or server stays out of
reach. The decision can still be recorded with that template or with a
letter typed by hand.

A Series Editor on a press and a Moderator on a preprint server meet the
same error. On a journal, a Section Editor also meets it on the "Request
Author Response" page. So does a Journal Manager or Editor whose role has
"Permit changes to Settings" turned off.

## Impact

- **Lost**: no data. On a newly installed journal the decision's list
  holds one template, its own, and the search is the only way to the
  other 66 (55 of 56 on a press, 26 of 27 on a preprint server).
- **Who**: every Section Editor, Series Editor and Moderator who searches
  the templates while recording a decision (on a journal, also while
  requesting an author response), on every install; and any manager-level
  role with "Permit changes to Settings" off.
- **Way round**: press "Clear search phrase" to get the decision's own
  template back, or type the letter by hand. There is no way to search.

Medium: a feature of a core task fails for a whole role with an error,
while the decision itself is recorded with its own template. It would be
high for a journal whose decision letters are kept as templates of other
emails rather than added to the decision's own email under Settings ›
Emails, since its sub-editors would have to retype each one.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. `dbuskins` is a
  Section Editor there (press: Series Editor; preprint server: Moderator)
  and is assigned to the submissions below.

Recording a decision:

1. Sign in as `dbuskins` (password `dbuskinsdbuskins`).
2. From "Assigned to me", open submission 4, "Computer Skill Requirements
   for New and Existing Teachers: Implications for Policy and Practice"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`)
   [press: submission 1, "The ABCs of Human Survival: A Paradigm for
   Global Citizenship"; preprint server: submission 1, "The influence of
   lactation on the quantity and quality of cashmere production"].
3. Press "Send for Review" [press: "Send To Production"; preprint server:
   "Decline Submission"].
4. On the "Notify Authors" step, type `declined` into "Find Template" and
   press Enter.
5. Press "OK" in the window that opens.

Requesting an author response (journal, `main` only; 3.5 has no such page):

6. Open submission 10, "Condensing Water Availability Models to Focus on
   Specific Water Management Systems", at its Review stage. Its round has
   both reviews completed. Under "Author Response" press "Request
   Response".
7. On "Request Author Response", type `declined` into "Find Template",
   press Enter, then "OK".

**Expected:** step 4 and step 7 list the templates whose name or text
holds "declined":

- journal and press: "Submission Declined", "Submission Declined
  (Pre-Review)", "Resend Review Request to Reviewer" and "Statistics
  Report Notification";
- preprint server: "Submission Declined" and "Statistics Report
  Notification".

**Observed:** after step 4, and again after step 7, a window "Error"
opens:

```
Error
You are not authorized to access the requested resource.
OK
```

The request behind it:

```
GET /index.php/publicknowledge/api/v1/emailTemplates?searchPhrase=declined
401 Unauthorized
```

After "OK", "declined" stays in "Find Template" and nothing is listed
under it, with no message.

Control: signed in as `dbarnes` (Journal Editor, a manager-level role),
steps 3 and 4 list the Expected templates. He is not assigned on the
press or the preprint server, so there he opens the submission from "All
Active" or by its address.

## Cause

`PKPEmailTemplateController::getGroupRoutes()` (pkp-lib,
`api/v1/emailTemplates/PKPEmailTemplateController.php`) opens the two
read routes, `GET emailTemplates` (`getMany()`) and `GET
emailTemplates/{key}` (`get()`), to the site admin, manager, sub-editor
and assistant roles. The write routes (add, edit, delete, restore
defaults) are kept to the site admin and manager.

The route's role check passes the Section Editor. Then `authorize()`
adds `CanAccessSettingsPolicy` to every route (line 106). That policy
permits only a site administrator or a manager group with "Permit
changes to Settings" on, and does not look at the route's roles, so the
read is refused with 401. The policy came in with pkp-lib commit
1330ac1283, "Control access to settings by user group"
(`pkp/pkp-lib#5504`). Its aim was to keep editors without settings
access from changing settings, email templates among them, but the
policy was put on the reads as well.

The composer in the ui-library (`Composer.vue`, `search()`) calls `GET
emailTemplates?searchPhrase=…` when Enter is pressed in "Find Template".
It shows the 401's message through `ajaxErrorCallback` and leaves the
results empty. The decision's own templates are rendered with the page,
which is why they still load.

Reach:

- The decision wizard (`DecisionHandler`, all three apps), checked on screen.
- The "Request Author Response" page (`ReviewResponseHandler`, open to
  sub-editors, `main` only), checked on screen on the journal. A press
  shows no "Request Response" button.
- A manager-level role with "Permit changes to Settings" off: refused in
  the decision wizard the same way, checked on screen on the journal and
  the press.
- Clicking a search result that is not among the decision's own
  templates calls `GET emailTemplates/{key}` (`Composer.vue`
  `loadTemplate()`), which sits behind the same policy (code). Today the
  search fails first, so this is never reached.
- The user invitation page also mounts the searching composer. Everyone
  who can open it already passes `CanAccessSettingsPolicy`
  (`InitializeInvitationUIHandler`), so the API never refuses them there
  (code).
- The other controllers that add the policy to every route
  (`PKPContextController`, `CategoryCategoryController`,
  `ContributorRoleController`) open their routes to managers and admins
  only, so no role list there is contradicted (code).

## Proposed fix

Require settings access only for the actions that change templates, and
leave the reads to the role list the routes already declare. This is the
pattern `PKPEditTaskTemplateController::authorize()` uses for the task
templates (`pkp/pkp-lib#11912`), which every role reads and only
settings managers change. Proposed patch
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sub-editor-find-template-not-authorized/fix.diff)):

```diff
         $this->addPolicy(new UserRolesRequiredPolicy($request), true);
-        $this->addPolicy(new CanAccessSettingsPolicy());

+        // Reading templates serves the email composer of editorial screens (decisions,
+        // author response requests), so only the actions that change them require
+        // access to the settings area.
+        $illuminateRequest = $args[0]; /** @var \Illuminate\Http\Request $illuminateRequest */
+        if (!in_array(static::getRouteActionName($illuminateRequest), ['getMany', 'get'])) {
+            $this->addPolicy(new CanAccessSettingsPolicy());
+        }
+
```

The condition names the reads rather than the writes, so a route added
later is gated by default.

With the patch, three groups can read templates who cannot today:
sub-editors, assistants, and managers whose role has "Permit changes to
Settings" off. We read this as intended:

- The read routes have listed sub-editors and assistants since 3.4, which
  served them without the policy. No screen of an assistant's offers the
  search today, so for assistants the patch only restores what the route
  declares.
- `pkp/pkp-lib#5504` asked for a way to keep editors out of Settings,
  that is, out of changing them. A manager without settings access still
  records decisions and sends their letters, and reading a template
  changes nothing.

The team should confirm this reading.

The patch was tried on `main` on all three apps. With it, the Steps show
the Expected: `dbuskins` gets the same list as `dbarnes`, in the decision
wizard and on "Request Author Response". Template changes stay with
settings managers, the same with the patch in and out:

- A Journal or Press Editor whose role had "Permit changes to Settings"
  turned off (on the journal and the press) sent `POST emailTemplates`,
  and `PUT` and `DELETE emailTemplates/EDITOR_DECISION_INITIAL_DECLINE`,
  from the decision page with its CSRF token. All three got 401 and
  nothing was stored. Their "Find Template" and `GET
  emailTemplates/{key}` answered 200 with the patch and 401 without it.
- `dbarnes`, with settings access, added a template under Settings ›
  Workflow › Emails ("Add Template", `POST emailTemplates` 200).
  `dbuskins` typing that page's address still got "The current role does
  not have access to this operation.".

**Alternatives:**

- Revert the line from 1330ac1283. That lets a manager without settings
  access change templates through the API again, which `pkp/pkp-lib#5504`
  set out to stop.
- Render more templates with the page, so the composer needs no search.
  The search exists because the full set (67 on a new journal) is too
  long for that.
- Hide "Find Template" from users the API refuses. That turns the error
  into a missing feature without restoring it.

**What goes with it:**

- No stored data to repair. The REST API's contract doesn't change: the
  reads answer the roles their routes already list.
- Backport: the same hunk applies to `stable-3_5_0`, whose controller
  differs from `main` only in blank lines elsewhere in the file.
- The guard: an e2e check that a Section Editor's "Find Template" in the
  decision wizard lists templates. pkp-lib has no API controller tests to
  extend.

Small: one condition in one controller, with no data repair and no API
change.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sub-editor-find-template-not-authorized/walk.js),
  run on an install loaded from PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL) with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sub-editor-find-template-not-authorized/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Its default steps are
  the report's, plus the `dbarnes` control. `STEPS=nb` runs the Settings ›
  Emails check, and `STEPS=nbmgr` runs the template counts and the
  manager-without-settings check, each with `fix.diff` applied to the app
  root and again without it.
- Tips walked: `main` OJS ff004d0973 (pkp-lib 987776cd04, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (pkp-lib
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (pkp-lib cf3f984335).
  Both lines showed the Observed above on all three apps.
- Template counts: the decision's list was read on screen, one template
  on each app ("Sent to Review", "Sent to Production", "Submission
  Declined"). The context's total was counted as the API's collector
  counts it (`emailTemplate\Collector`: the default templates the
  context has not replaced, plus its own templates): 67 on the journal,
  56 on the press, 27 on the preprint server.
- Manager without settings access: rvaca (Journal or Press manager) opened
  "Journal editor" / "Press editor" under Settings › Users & Roles ›
  "Roles", unticked "Permit changes to Settings" and pressed "OK". The
  write requests went out with the method in `X-Http-Method-Override`, as
  the ui-library's `useFetch` sends them.
- Code reads: on `main` and 3.5, `PKPEmailTemplateController`
  (`getGroupRoutes()`, `authorize()`), `CanAccessSettingsPolicy::effect()`,
  `Composer.vue` (`search()`, `loadTemplate()`), and the handlers that
  pass `emailTemplatesApiUrl` (`DecisionHandler`, `RequestReviewResponsePage`,
  `UserRoleAssignmentInviteUIController`). 1330ac1283 is an ancestor of
  both 3.5 pkp-lib tips.
- 3.4 (code): pkp-lib `origin/stable-3_4_0` 767353f4fe
  (`api/v1/emailTemplates/PKPEmailTemplateHandler.php`): the reads are
  open to sub-editors and assistants, there is no `CanAccessSettingsPolicy`
  in that branch, and `DecisionHandler` passes the search URL to the
  composer, so the search works there. App tips OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b; ui-library ee684b34.
- 3.3 (code): pkp-lib `origin/stable-3_3_0` ac3fa73402 has no
  `pages/decision/DecisionHandler.php`, and ui-library 96959f9e has no
  `Composer.vue`: decisions there use the legacy forms, which have no
  template search. App tips OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161.
- Introduced: `git blame` on line 106 of the controller names 1330ac1283,
  a squash of `pkp/pkp-lib#10380`. One of its squashed changes and the
  `pkp/pkp-lib#5504` discussion add the check to this controller to stop
  template changes. The same commit added the policy to `PKPContextController`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for "find template", "not authorized", emailTemplates 401,
  `PKPEmailTemplateController` and `CanAccessSettingsPolicy`. The only
  related hit is `pkp/pkp-lib#5504` itself, which records no report of
  this.
- Unverified: the manager-without-settings check was not walked on the
  preprint server, whose only manager role in the dataset offers no
  "Edit". The controller is the same shared pkp-lib file. MySQL not
  checked (the fault is an authorization rule, not a query).
