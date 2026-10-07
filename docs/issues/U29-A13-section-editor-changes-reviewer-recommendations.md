# A Section Editor, or an editor without settings access, can change and switch off a journal's reviewer recommendations

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (code; no reviewer-recommendations API)
  - 3.4: none (code; no reviewer-recommendations API)
  - 3.3: none (code; no reviewer-recommendations API)
- **Introduced** `pkp/pkp-lib#10583` and `pkp/ojs#4505` for `pkp/pkp-lib#1660` · [d4f7d18e50](https://github.com/pkp/pkp-lib/commit/d4f7d18e50126adfccf6fb1a89cecc3585543597), moved into OJS by [b14943ce19](https://github.com/pkp/ojs/commit/b14943ce19af5ff72bf1b65a85109fb76c63bd83) · merged 2025-04-29 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U29 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a13)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-07: re-verified end to end on today's code. The
recommended fix now gates only the four writes, and Introduced names the
pkp-lib change that wrote the role list.

## Summary

A Section Editor, and an editor whose role has "Permit changes to
Settings" unticked, are refused Settings › Workflow and its "Reviewer
Recommendations" tab. Yet the journal accepts the tab's requests from
them when they are sent directly: they can add recommendations, rename or
delete one no review has chosen, and deactivate or reactivate any of them.

A deactivated recommendation disappears from every reviewer's
"Recommendation" list. With all of them deactivated, the list is empty and
no reviewer who has not yet chosen can submit a review: "Submit Review"
answers "This field is required.". Nobody is told.

A review that already chose a deactivated recommendation keeps that
choice. The editor's "Read Review" window still names it at the top,
but the window's "Reviewer Recommendation" section shows "-" until
the recommendation is reactivated.

## Impact

- **Lost**: no stored data. The recommendations and the choices of
  submitted reviews stay in place; reviews are held up, not lost.
- **Who**: every Section Editor and Guest Editor, on any journal as it
  comes. An editor in a role at the Journal Manager level (such as
  "Journal editor") only once the journal unticks "Permit changes to
  Settings" for that role; the default roles at that level have it
  ticked. No screen leads there: it takes the editor's own signed-in
  browser and a few requests typed into its console, no API token.
- **Way round**: a manager reactivates the entries on the "Reviewer
  Recommendations" tab, once someone notices. Reviewers can "Save for
  Later" meanwhile.

Medium: trusted editorial roles barred from the settings can stop review
submission journal-wide, silently, but only on purpose, and the undo
loses nothing. It would be high if a screen led these roles to it or a
less trusted role could reach it.

The fix is small: one permission check the code base already uses, added
to the four routes that change the list.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded (journal
  `publicknowledge`). Its six reviewer recommendations are active. One of
  them, "Revisions Required" (id 2), is the recommendation of the
  submitted reviews on submission 10 (Aisla McCrae) and submission 13, so
  it cannot be renamed or deleted.
- As `rvaca`: Settings › "Users & Roles" › "Roles", open the "Journal
  editor" row's arrow, "Edit", untick "Permit changes to Settings", "OK".
  `dbarnes` holds that role.

The requests are the ones the "Reviewer Recommendations" tab sends. Paste
this into the browser console on any page of the journal the user can open
(the editorial dashboard, `/index.php/publicknowledge/en/dashboard/editorial`):

```js
const rec = (method, path = '', body) => fetch(
  pkp.context.apiBaseUrl + 'reviewers/recommendations' + path, {   // /index.php/publicknowledge/api/v1/…
    method: method === 'GET' ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Csrf-Token': pkp.currentUser.csrfToken,
      ...(['PUT', 'DELETE'].includes(method) ? {'X-Http-Method-Override': method} : {}),
    },
    body: body && JSON.stringify(body),
  }).then(async (r) => [r.status, await r.json()]);
```

Changing the list (as `dbuskins`, then again as `dbarnes`):

1. Sign in and type the address
   `/index.php/publicknowledge/en/management/settings/workflow`.
2. Open the editorial dashboard and paste the snippet.
3. `await rec('POST', '', {title: {en: 'Minor Revisions'}, type: 3, status: 1})`
   and note the `id` it returns.
4. `await rec('PUT', '/<id>', {title: {en: 'Minor Revisions (edited)'}, type: 3, status: 1})`
   (the three fields are all required).
5. `await rec('PUT', '/<id>/status', {status: 0})`, then the same with
   `{status: 1}`.
6. `await rec('DELETE', '/<id>')`.

Switching recommendations off:

7. As `dbarnes`, open submission 10, "Condensing Water Availability Models
   to Focus on Specific Water Management Systems", and press "Read Review"
   on Aisla McCrae's row.
8. Sign in again as `dbuskins`, open the editorial dashboard, paste the
   snippet and run `await rec('PUT', '/2/status', {status: 0})`.
9. Repeat step 7.
10. As `phudson`, open the review request for submission 12, "Sodium
    butyrate improves growth performance of weaned piglets during the first
    period after weaning", press "Accept Review, Continue to Step #2" and
    "Continue to Step #3", and open the "Recommendation" list.
11. Sign in again as `dbuskins`, open the editorial dashboard, paste the
    snippet and run the step-8 request for ids 1, 3, 4, 5 and 6.
12. Sign in again as `phudson`, open step 3 of the same review, type a comment for the author and editor,
    press "Submit Review" and "OK".

**Expected:** like the screen in step 1, every request in steps 3 to 6,
8 and 11 is refused.

**Observed:** step 1 opens a page reading "The current role does not have
access to this operation." for both users. Every request in steps 3 to 6
answers `200` for both users: the entry is added, renamed, deactivated,
reactivated and deleted. The step-8 and step-11 requests answer `200`.

- Step 7 reads "Recommendation: Revisions Required" at the top and, in the
  "Reviewer Recommendation" section, "Recommendation Revisions Required".
  Step 9 still reads "Recommendation: Revisions Required" at the top, but
  the section reads "Recommendation -". The row in the reviewers table
  still reads "Revisions Required".
- Step 10's list reads "Choose One", "Accept Submission", "Resubmit for
  Review", "Resubmit Elsewhere", "Decline Submission", "See Comments": no
  "Revisions Required".
- In step 12 the list holds only "Choose One", so nothing can be chosen.
  After "OK" the step stays open with "This field is required." under the
  list, and no review is sent.
- No email reaches `rvaca`, `dbarnes` or the administrator about any of
  the changes (the one email in that time is "Review accepted" from step
  10). `rvaca`'s tab shows all six entries switched off.

Control: renaming or deleting "Revisions Required" (`PUT /2`, `DELETE /2`)
answers `406`, because a review uses it.

## Cause

`api/v1/reviewers/recommendations/ReviewerRecommendationController.php`
(OJS) does not apply the settings-access rule of the screen it serves.

Its six routes are two reads (`get`, `getMany`) and four writes (`add`,
`edit`, `updateStatus`, `delete`). `getRouteGroupMiddleware()` (lines
48-59) admits `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` and
`ROLE_ID_SUB_EDITOR` on all of them, so a Section Editor passes.
`authorize()` (lines 64-82) adds `UserRolesRequiredPolicy`,
`ContextAccessPolicy` and, on the four routes that take an id,
`RecommendationAccessPolicy` (the entry exists and belongs to this
journal). It never adds `CanAccessSettingsPolicy`.

The controller came with `pkp/pkp-lib#1660` and reached `main` on
2025-04-29, five months after `pkp/pkp-lib#5504` had brought
`CanAccessSettingsPolicy` (2024-11-18) to gate the settings screens and
their APIs. The new controller missed that gate.

`CanAccessSettingsPolicy` permits a site administrator, or a user group
at the Manager level (`ROLE_ID_MANAGER`) whose `permitSettings` is set.
Without it, a Manager-level group with `permitSettings` false passes as
`ROLE_ID_MANAGER`. The settings page does add it
(`ManagementHandler::authorize()` for the `settings` operation), which is
why the screen refuses `dbarnes`; it refuses `dbuskins` already by role.

The `406` comes from the controller's own check: `edit` and `delete`
refuse an entry whose computed `removable` attribute is false, that is,
one some review assignment in the journal points to
(`ReviewerRecommendation::removable()`). `updateStatus` has no such check.

Reach:

- What a deactivation does follows from
  `Repo::reviewerRecommendation()->getRecommendationOptions()`, which
  returns the active entries (plus, when given a review assignment, that
  assignment's own choice). The reviewer's step 3
  (`PKPReviewerReviewStep3Form`) builds its list from it, so a reviewer
  who has not chosen loses the entry (walked), and with none active the
  required list blocks the submission (walked). A reviewer with a saved
  choice keeps it (code): the method keeps its first result in a
  `static` that ignores later arguments, but in the step's own request
  (`PKPReviewerHandler::step()`) the form's call is the first.
- `ReviewAssignment::getLocalizedRecommendation()` calls it without the
  assignment, so it answers "" for a deactivated entry. Among its callers:
  the "Read Review" section (walked), the review history's PDF and XML
  exports (`PKPReviewController`), the author's "Read Review"
  (`authorReadReview.tpl`), the reviewer comments in decision emails
  (`ReviewerComments`) and the public open-peer-review text
  (`SubmissionPeerReviewResource`) (code). The review's stored choice is
  never changed (walked), so reactivating restores each of them.
- The only screen that calls this API is the settings tab
  (`reviewerRecommendationManagerStore.js`). The reviewer's form, the
  "Read Review" window and the emails read the entries on the server
  (code).

## Proposed fix

Add `CanAccessSettingsPolicy` to `authorize()` for the four writes, the
way `PKPEditTaskTemplateController::authorize()` gates its own add,
update and delete
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/fix.diff)):

```diff
+use PKP\security\authorization\CanAccessSettingsPolicy;
 use PKP\security\authorization\ContextAccessPolicy;
@@ authorize()
         $this->addPolicy(new ContextAccessPolicy($request, $roleAssignments));
 
+        if (in_array($actionName, ['add', 'edit', 'updateStatus', 'delete'])) {
+            // Changing the list is a settings operation
+            $this->addPolicy(new CanAccessSettingsPolicy());
+        }
+
```

`CanAccessSettingsPolicy` reads the user groups that
`UserRolesRequiredPolicy` supplies, the site administrator's included.
The reads expose only the titles reviewers see anyway, and
`pkp/pkp-lib#13298` (open) plans to move the read route into a group of
its own and open it to reviewers for the new step 3 form; a gate on the
writes alone fits that plan.

Tried on `main`: with the fix, every request in the Steps answers `401`
for `dbuskins` and `dbarnes`, the in-use rename and delete included. The
"Read Review" section keeps "Revisions Required", and the reviewer's list
in steps 10 and 12 keeps all six entries. `rvaca` and `admin` still add,
rename, switch off, switch on and delete (`200`) and open the tab, and
`dbuskins` still reads the list and one entry (`200`), with and without
the fix.

**Alternatives:**

- Gate the whole controller and drop `ROLE_ID_SUB_EDITOR`, as
  `CategoryCategoryController` and `ContributorRoleController` do
  (`CanAccessSettingsPolicy` on every route). It closes the reads too,
  which nothing needs closed, and the reviewer read planned above would
  have to undo it.
- Split the routes into two `roleAuthorizer` groups, writes for the site
  administrator and managers only, as `PKPEditTaskTemplateController`
  also does. Worth doing along with that plan, but the role list
  alone still admits a Manager-level group without settings access, so
  the policy is needed either way.

**What goes with it:** a test that sends the four writes as a Section
Editor and as a Manager-level group without settings access and expects
them refused, and as a manager with settings access and expects them to
work. No data repair and no backport.

Small: one policy added for four routes in one controller, following an
existing pattern.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/walk.js),
  on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/walk.js`.
  It sends the snippet's requests with `fetch()` from the user's page.
  `MODE=nb` runs the neighbour check (`rvaca` and `admin` change the list
  and read it; `dbuskins` reads it); `fix-trial.sh` beside it runs the
  trial: the neighbour without the fix, then the Steps and the neighbour
  with it, and the revert.
- Request shape: `reviewerRecommendationManagerStore.js` and
  `useFetch.js` in `lib/ui-library` (PUT and DELETE are sent as POST with
  `X-Http-Method-Override`). Required fields: `AddReviewerRecommendation`
  and `EditReviewerRecommendation` (`title`, `type`, `status`).
- 3.5: the Steps cannot be taken there. The script ran on the 3.5
  dataset: `rvaca`'s `GET` answered `404`, and it stopped. Code read: no `api/v1/reviewers/recommendations`
  in the app or `lib/pkp`; recommendations are the fixed list of
  `ReviewAssignment::getReviewerRecommendationOptions()`. 3.4 and 3.3, code
  only: no such route or recommendation table in the app or `lib/pkp`, and
  neither `d4f7d18e50` nor `b14943ce19` is on any of the three branches.
- Branch tips: main OJS `92bc2bb467`, lib/pkp `e60013c77f`;
  `stable-3_5_0` OJS `b8f5e9a951`, lib/pkp `6d7f1540b6`; `stable-3_4_0`
  OJS `d68934d0d1`, lib/pkp `767353f4fe`; `stable-3_3_0` OJS `ac77c9fb35`,
  lib/pkp `ac3fa73402`. PostgreSQL.
- Introduced: `git blame` on the role list and `authorize()` gives
  `b14943ce19` ("app specific files into OJS structure", `pkp/ojs#4505`),
  which moved the file out of lib/pkp unchanged in these lines. They were
  written in lib/pkp `d4f7d18e50` (authored 2024-11-06, committed
  2025-04-28). `pkp/pkp-lib#10583` (merge `44a76bda8c`) and `pkp/ojs#4505`
  (merge `6a3ac4a043`) were merged on 2025-04-29.
  `CanAccessSettingsPolicy` came with `pkp/pkp-lib#5504` (`1330ac1283`),
  on lib/pkp `main`'s first-parent history since 2024-11-18.
- Who, code: `registry/userGroups.xml` gives the three default roles at
  the Journal Manager level ("Journal manager", "Journal editor",
  "Production editor") `permitSettings="true"`; "Section editor" and
  "Guest editor" are both `ROLE_ID_SUB_EDITOR` (the dataset holds both).
  Only the Section Editor was walked.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library; issues and PRs,
  open and closed): the symptom's words, `ReviewerRecommendationController`,
  `CanAccessSettingsPolicy`, `reviewers/recommendations`. Only
  `pkp/pkp-lib#13298` names this controller's shared role list, as a
  constraint on its own change; it does not report the fault.
- Code only, not walked: a reviewer with a saved choice keeps a
  deactivated entry; the decision emails' and the open-peer-review text's
  blank recommendation; a recommendation of another journal refused by
  `RecommendationContextPolicy` (the dataset has one journal). In the
  dataset `admin` also holds "Journal manager", so the neighbour walk does
  not separate the site-administrator branch of `CanAccessSettingsPolicy`.
