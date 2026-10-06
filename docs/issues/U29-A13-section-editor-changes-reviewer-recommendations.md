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
- **Introduced** `pkp/ojs#4505` for `pkp/pkp-lib#1660` · [b14943ce19](https://github.com/pkp/ojs/commit/b14943ce19) · 2025-03-03, merged 2025-04-29 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U29 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a13)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)
- **Model** claude-opus-4-8, parts on claude-opus-5-5

## Summary

A Section Editor, and an editor whose role has "Permit changes to
Settings" unticked, are refused Settings › Workflow and its "Reviewer
Recommendations" tab. Yet the journal accepts the tab's requests from
them when they are sent directly: they can add recommendations, rename or
delete one no review has chosen, and deactivate or reactivate any of them.

A deactivated recommendation disappears from every reviewer's
"Recommendation" list. With all of them deactivated, the list is empty and
no reviewer who has not yet chosen can submit a review: "Submit Review"
answers "This field is required.". Nobody is told. A manager sees the
change only by opening the tab, and can reactivate the entries there.

A review that already carries a deactivated recommendation keeps it, and
the editor's "Read Review" window still shows it at the top; only the
window's "Reviewer Recommendation" section reads "-" until it is
reactivated.

## Impact

- **Lost**: no stored data. While entries stay deactivated, reviewers
  cannot pick them, and with all deactivated no reviewer can submit a
  review on the journal.
- **Who**: any Section Editor, and any editor whose manager-level role has
  settings access switched off (the dataset's "Journal editor" with the box
  unticked, or a role created that way). It takes requests sent by hand.
  The reviewers are the ones who meet the result.
- **Way round**: a manager reactivates the entries on the "Reviewer
  Recommendations" tab, once someone notices. Reviewers can "Save for
  Later" meanwhile.

Medium: roles the journal barred from its settings can switch off review
submission for the whole journal, silently, but only by sending requests
deliberately, and a manager can undo it on screen without losing data. It
would be high if a screen led these roles to it or a less trusted role
could reach it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded (journal
  `publicknowledge`). Its six reviewer recommendations are active; one, "Revisions
  Required" (id 2), is the recommendation of the submitted reviews on
  submission 10 (Aisla McCrae) and submission 13, so it cannot be renamed
  or deleted.
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
8. As `dbuskins`, run `await rec('PUT', '/2/status', {status: 0})`.
9. Repeat step 7.
10. As `phudson`, open the review request for submission 12, "Sodium
    butyrate improves growth performance of weaned piglets during the first
    period after weaning", press "Accept Review, Continue to Step #2" and
    "Continue to Step #3", and open the "Recommendation" list.
11. As `dbuskins`, run the step-8 request for ids 1, 3, 4, 5 and 6.
12. As `phudson`, reload step 3, type a comment for the author and editor,
    press "Submit Review" and "OK".

**Expected:** like the screen in step 1, every request in steps 3 to 6,
8 and 11 is refused.

**Observed:** step 1 opens a page reading "The current role does not have
access to this operation." for both users. Every request in steps 3 to 6
answers `200`, for both users: the entry is added, renamed, deactivated,
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
  the changes. `rvaca`'s tab shows all six entries switched off.

Control: renaming or deleting "Revisions Required" (`PUT /2`, `DELETE /2`)
answers `406`, because a review uses it.

## Cause

`api/v1/reviewers/recommendations/ReviewerRecommendationController.php`
(OJS) does not apply the settings-access rule of the screen it serves.

Its six routes are two reads (`get`, `getMany`) and four writes (`add`,
`edit`, `updateStatus`, `delete`). `getRouteGroupMiddleware()` admits
`ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` on all of
them, so a Section Editor passes. `authorize()` adds
`UserRolesRequiredPolicy`, `ContextAccessPolicy` and, on the four routes
that take an id, `RecommendationAccessPolicy` (the entry belongs to this
journal). It never adds `CanAccessSettingsPolicy`, which permits a site
administrator, or a user group at the Manager level (`ROLE_ID_MANAGER`)
whose `permitSettings` is set. So a Manager-level group with
`permitSettings` false passes as `ROLE_ID_MANAGER`. The settings page
(`ManagementHandler`) does add `CanAccessSettingsPolicy`, which is why the
screen refuses both users.

The `406` comes from the controller's own check: `edit` and `delete`
refuse an entry whose computed `removable` attribute is false, that is,
one some review assignment in the journal points to
(`ReviewerRecommendation::removable()`). `updateStatus` has no such check.

Reach:

- What a deactivation does follows from
  `Repo::reviewerRecommendation()->getRecommendationOptions()`, which
  returns the active entries (plus, when given a review assignment, that
  assignment's own choice). The reviewer's step 3 (`ReviewerReviewStep3Form`)
  builds its list from it, so a reviewer who has not chosen loses the
  entry, and a reviewer with a saved choice keeps it (code). With none
  active, the required list blocks the submission (walked).
- `ReviewAssignment::getLocalizedRecommendation()` calls it without the
  assignment, so it answers "" for a deactivated entry: the "Read Review"
  section (walked; spec U29 A6 covers that display), the reviewer comments
  in decision emails (`ReviewerComments`) and the public open-peer-review
  text (`SubmissionPeerReviewResource`) (code).
- `review_assignments.reviewer_recommendation_id` is never changed, so
  reactivating restores every display (walked: the value stays 2).

## Proposed fix

Drop `Role::ROLE_ID_SUB_EDITOR` from the role list and add
`CanAccessSettingsPolicy` to `authorize()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/fix.diff)):

```diff
+use PKP\security\authorization\CanAccessSettingsPolicy;
 use PKP\security\authorization\ContextAccessPolicy;
@@ getRouteGroupMiddleware()
                 Role::ROLE_ID_SITE_ADMIN,
                 Role::ROLE_ID_MANAGER,
-                Role::ROLE_ID_SUB_EDITOR,
             ]),
@@ authorize()
         $this->addPolicy(new ContextAccessPolicy($request, $roleAssignments));
+        $this->addPolicy(new CanAccessSettingsPolicy());
```

This closes the reads too, which is what `CategoryCategoryController` and
`ContributorRoleController` do: site administrator and manager only,
`ContextAccessPolicy` plus `CanAccessSettingsPolicy` on every route. It
fits because the only client of the reads is the settings tab
(`reviewerRecommendationManagerStore.js`); the reviewer's form, the
"Read Review" window and the emails read the entries on the server.
`CanAccessSettingsPolicy` reads the user groups `UserRolesRequiredPolicy`
supplies, the site administrator's included.

Tried on `main`: with the fix, `dbuskins` and `dbarnes` get `401` for
every request in the Steps. The reviewer's list in steps 10 and 12 keeps
all six entries. `rvaca` and `admin` still add, rename, switch off, switch
on and delete (`200`), and the tab's list loads. In the dataset `admin` also
holds "Journal manager", so the walk does not separate the
site-administrator path; `CanAccessSettingsPolicy` permits it by its own
branch.

**Alternatives:**

- Gate the writes only and leave the reads open to Section Editors, as
  `PKPEditTaskTemplateController` does (`CanAccessSettingsPolicy` on add,
  update and delete; `getMany` open to more roles, because workflow screens
  list task templates). No Section Editor screen reads recommendations
  through the API, so this keeps an opening nothing uses. Should a workflow
  screen need the list later, reopening `getMany` that way is the
  pattern.

**What goes with it:** a test that sends the four writes as a Section
Editor and as a Manager-level group without settings access and expects
them refused. No data repair and no backport.

Small: one line removed and one added in one controller, following an
existing pattern.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/walk.js),
  on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/section-editor-changes-reviewer-recommendations/walk.js`.
  It sends the snippet's requests with `fetch()` from the user's page.
  `MODE=nb` runs the manager and site-administrator check; `fix-trial.sh`
  beside it runs the trial.
- Request shape: `reviewerRecommendationManagerStore.js` and
  `useFetch.js` in `lib/ui-library` (PUT and DELETE are sent as POST with
  `X-Http-Method-Override`). Required fields: `AddReviewerRecommendation`
  and `EditReviewerRecommendation` (`title`, `type`, `status`).
- Released lines, read in the code: no
  `api/v1/reviewers/recommendations` on `stable-3_5_0`, `stable-3_4_0` or
  `stable-3_3_0` (app and `lib/pkp`; only `reviewers/suggestions` exists on
  3.5). On the 3.5 dataset a manager's `GET` answered `404`.
- Branch tips: main OJS `1f4cef786f`, lib/pkp `a7f5e3081b`;
  `stable-3_5_0` OJS `4342473090`, lib/pkp `771474347e`; `stable-3_4_0`
  OJS `d68934d0d1`, lib/pkp `767353f4fe`; `stable-3_3_0` OJS `ac77c9fb35`,
  lib/pkp `ac3fa73402`. PostgreSQL.
- Introduced: the role list without the policy was written in lib/pkp
  `d4f7d18e50` (2024-11-06), before `pkp/pkp-lib#5504` brought
  `CanAccessSettingsPolicy` (`1330ac1283`, 2024-11-18); it moved into OJS
  in `b14943ce19` and reached `main` with `pkp/ojs#4505` and
  `pkp/pkp-lib#10583`, merged 2025-04-29.
- Code only, not walked: a reviewer with a saved choice keeps a
  deactivated entry; the decision emails' and the open-peer-review text's
  blank recommendation. A recommendation of another journal answers `401`
  (`RecommendationContextPolicy`); the dataset has one journal, so it was
  walked on a second journal the campaign's tooling built, not through the
  screens.
