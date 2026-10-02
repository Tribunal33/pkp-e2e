# A Subscription Manager's side menu offers "Institutions", and the page refuses them

- **Severity** medium
- **Effort** large
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions page)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 (merged 2022-07-23) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U51 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a16)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal with payments enabled, a Subscription Manager who is not
also a Journal Manager sees "Institutions" in the side menu above
"Payments". Pressing it, or typing its address, shows "The current role
does not have access to this operation.".

So the Subscription Manager can no longer create the first institutional
subscription alone. The "Create New Subscription" window on
"Institutional Subscriptions" reads "An institution must be created
before new subscriptions can be made.", and only a Journal Manager can
create one. Up to 3.3 the Subscription Manager typed the institution's
name and IP ranges into that window.

This reaches every subscription journal that gives someone the
Subscription Manager role without the Journal Manager role.

## Impact

- **Lost.** No data. The role cannot add or edit institutions, so it
  cannot set up an institutional subscription for an institution that is
  not on the list yet, or change an institution's IP ranges.
- **Who.** Every Subscription Manager without the Journal Manager role.
  The side menu offers the entry while payments are enabled; with them
  off, the role cannot reach the page either.
- **Way round.** The Subscription Manager asks a Journal Manager to
  create the institution and its IP ranges, then picks it in the
  subscription window. Nothing gets worse with time.

Medium: a secondary task fails for the role whose job it is, and the way
round on screen goes through another person. The refusal is shown
plainly and nothing is lost, so it is not high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (or `stable-3_5_0`), journal
  `publicknowledge`. Its payments are off, and its "Subscription
  Manager" role has no members.
- Payments enabled: as `rvaca` (the manager), Settings › Distribution ›
  "Payments", tick "Enable", "Save".
- A Subscription Manager. The steps give the role to the author
  `ccorino`. As `admin`: Administration › "Hosted Journals", the arrow at
  the start of the journal's row, "Settings wizard", the "Users" tab.
  Then the arrow at the start of `ccorino`'s row, "Edit User", tick
  "Subscription Manager" under "User Roles", "OK". (Settings › Users &
  Roles › "Invite to a role" does the same through an emailed link.)

Steps:

1. Sign in as `ccorino`.
2. Press "Payments" in the side menu.
3. Look at the side menu.
4. Press "Institutions".
5. Open "Payments" again, then the "Institutional Subscriptions" tab, and
   press "Create New Subscription".

**Expected.** "Institutions" opens the Institutions page with "Add
Institution", so the Subscription Manager can create the institution the
subscription needs.

**Observed.** Step 2 opens the "Subscriptions" page. In step 3 the side
menu reads "My Submissions as Author", "Start A New Submission",
"Institutions", "Payments" (on 3.5 "Start A New Submission" sits last).
Step 4 opens
`/index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
which reads:

```
The current role does not have access to this operation.
```

Typing `/index.php/publicknowledge/en/management/settings/institutions`
gives the same page. In step 5 the window's institution box is labelled
"An institution must be created before new subscriptions can be made."
and has no choices. Every request answered below 400 and no page script
failed.

Control: `rvaca`'s side menu on the same page shows "Institutions", and
it opens the Institutions page with "Add Institution".

## Cause

The Introduced commit brought in Institutions for subscriptions. It took
the institution's name and IP ranges out of the institutional
subscription window, made the window pick from the new list, and added
the "Institutions" entry to OJS's side menu. It placed the entry in
`APP\template\TemplateManager::setupBackendPage()`
(`classes/template/TemplateManager.php`, lines 189–216 on `main`), inside
the block that adds "Payments" while payments are enabled. That block
admits `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` and
`ROLE_ID_SUBSCRIPTION_MANAGER`.

The page and its API, from the pkp-lib side of the same work, admit
managers only:

- OJS `SettingsHandler::__construct()` assigns the `settings` operation
  to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER`.
  `ManagementHandler::authorize()` adds a `ContextAccessPolicy`, which
  builds the role-based policy from those assignments and refuses the
  Subscription Manager.
- `PKPInstitutionController::getRouteGroupMiddleware()` admits
  `ROLE_ID_MANAGER` only.

So the task the Subscription Manager did up to 3.3 moved to a page the
role is refused, while the menu still offers it the page. pkp-lib's own
"Institutions" entry, added for institutional statistics in
`PKPTemplateManager::setupBackendPage()` (lines 1310–1336), sits inside
its `[ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN]` block.

Reach:

- "Payments", the block's other entry, opens for the Subscription
  Manager (`PaymentsHandler` admits the role; checked on screen).
- The ui-library's `src/components/Container/SettingsPage.vue` adds
  "Institutions" after a payments save, but only on Settings ›
  Distribution, which a Subscription Manager cannot open (checked in the
  code).
- OMP and OPS have no Subscription Manager role and no such block
  (checked in the code).
- A user who also holds the Journal Manager role can open the page.
- Journal Manager roles without "Permit changes to Settings" are refused
  the same page for another reason, a separate fault:
  [An Editor without "Permit changes to Settings" is offered "Institutions" and refused the page](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U66-A1-institutions-menu-without-settings-permission.md).

## Proposed fix

A proposal. Two fixes fit, and which one is right depends on a product
call: should the Subscription Manager maintain institutions?

- **Recommended: let the Subscription Manager open the Institutions
  page and use its API.** This gives back the task the role had up to
  3.3 and keeps the Introduced change's menu entry. It was not tried,
  because the team must first agree to give the role a settings page
  and an API that only managers have today. Large.
- **The other: hide the entry from a Subscription Manager alone.** This
  is small and was tried
  ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/fix.diff)).
  It removes the dead entry, but the role still cannot create the first
  institutional subscription alone, so the regression stays as an
  accepted change.

The recommended fix has three parts:

1. OJS `SettingsHandler`: add a role assignment of `settings` for
   `ROLE_ID_SUBSCRIPTION_MANAGER`. Override `authorize()` so that it drops
   that assignment for any argument other than `institutions`, so the role
   reaches no other Settings page.
2. pkp-lib `ManagementHandler::authorize()`: today it requires "Permit
   changes to Settings" (`CanAccessSettingsPolicy`) for every
   `settings` page except `announcements` and `userComments`. The
   Subscription Manager role has no such permission. So `institutions`
   needs the same exemption, which the report linked under Cause proposes
   for its own fault.
3. pkp-lib `PKPInstitutionController::getRouteGroupMiddleware()`: add
   `ROLE_ID_SUBSCRIPTION_MANAGER` to the role list. OMP and OPS have no
   member of that role, so nothing changes there.

The other fix makes OJS's entry follow pkp-lib's own role check:

```diff
-            // add institutions menu if needed
-            $institutionsLink = [
+            // add institutions menu if needed: only for the roles the Institutions page admits,
+            // not a subscription manager alone
+            if (array_intersect([Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER], $userRoles)) {
+                $institutionsLink = [
                 …
+            }
```

The rest of the block is only indented. Tried on OJS `main`: with it,
`ccorino`'s side menu reads "My Submissions as Author", "Start A New
Submission", "Payments", and "Payments" still opens the "Subscriptions"
page. `rvaca` still sees "Institutions", and it opens the page.

**Alternatives:**

- Keep the entry and explain the refusal on the page it opens. The menu
  would still offer a page the role cannot use, and the task would still
  fail.

**What goes with it:**

- Recommended fix: the institutions API admits one more role, a change
  API clients see. Nothing stored changes.
- Backport: `stable-3_5_0` has the same block and role lists, and
  `stable-3_4_0` has them too (there the page's address takes
  `'institutions'` as a string). The changes apply with their context
  adjusted. 3.3 has no Institutions page.
- Guard: U51's scenario that signs in as the Subscription Manager
  creates an institution from "Institutions" and then an institutional
  subscription (or, with the other fix, checks that the menu has no
  "Institutions").

Large: a few lines in each of two repos, but a role admitted to a
manager-only page and API, after a product decision. The other fix is
small: one role check in one OJS method.

## Evidence

- A Playwright script that takes the Steps through the screens on an
  install loaded from PKP's default test dataset, with `rvaca` as the
  control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/lib.js).
  Run: `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/walk.js`.
- The other fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-manager-offered-institutions-refused/fix.diff ojs`,
  then the walk, then `revert`.
- The walk gave `ccorino` the role through "Invite to a role" and the
  emailed link. The "Edit User" path in the Steps grants a role at once,
  with no email, but was not walked for this report.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a).
  - stable-3_5_0: OJS c346ee00a5 (lib/pkp 3bb4450bea), with the same
    result at every step.
- 3.4, by code: OJS `stable-3_4_0` at 75cc2d488b, pkp-lib `stable-3_4_0`
  at 32b0f4b4af. 11f902f20f is on the branch. `SettingsHandler` assigns
  `settings` to the site administrator and manager only, and
  `PKPInstitutionHandler` gives every route `ROLE_ID_MANAGER` only.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, pkp-lib f6ab331645.
  `TemplateManager.inc.php` (line 132) adds "Payments" alone. The
  institutional subscription window has its own "Institution Name" and
  "IP Ranges" boxes, and `PaymentsHandler` and the subscription grids
  admit the Subscription Manager.
- Introduced: `git blame` on the institutions block of
  `TemplateManager.php` gives 11f902f20f ("pkp/pkp-lib#6782 Introduce
  Institutions (and integrate with subscriptions)"). The same commit
  replaced the window's "Institution Name" and "IP Ranges" boxes with the
  institution list. GitHub names `pkp/ojs#3465` for it, merged
  2022-07-23. Neither `pkp/pkp-lib#6782`'s comments nor the PR's mention
  the Subscription Manager or the menu entry.
- Upstream search 2026-10-02 in pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom's words and by `PKPInstitutionController`: nothing
  about this fault. `pkp/pkp-lib#6895` and `pkp/pkp-lib#6781` (the
  institutions and COUNTER design issues) mention subscription managers
  only as entering institution data.
- The dataset has no Subscription Manager, so the steps use `ccorino`,
  who also holds the Author role. That role adds "My Submissions as
  Author" to the menu. A user holding only the Subscription Manager role
  lands on an access-denied page with no side menu after signing in, and
  types the Payments page's address instead. That case was not walked.
- Not driven: either fix on 3.5; the recommended fix anywhere; a user
  holding the Subscription Manager and Journal Manager roles together.
