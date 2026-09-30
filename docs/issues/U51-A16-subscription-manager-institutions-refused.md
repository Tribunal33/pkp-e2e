# Subscription Manager is refused the Institutions page the menu offers, so cannot add a subscribing institution

- **Severity** medium
- **Effort** large
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the subscription window takes the institution's name and IP ranges itself)
- **Introduced** `pkp/ojs#3465` and `pkp/pkp-lib#8109` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U51 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a16)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On the "Payments" page, while payments are enabled, the Subscription
Manager's side menu offers "Institutions"; pressing it, or opening its
address, shows "The current role does not have access to this
operation.". The institutional subscription window offers only the
institutions already on that page, so a Subscription Manager cannot
subscribe an institution that is not on the list yet, and cannot change
an institution's name or IP ranges.

Subscriptions for institutions already on the list, and individual
subscriptions, still work for the Subscription Manager. A journal manager
has to add or change each institution for them.

## Impact

- **Lost.** No data. Each new subscribing institution, and each change
  to a subscriber's IP ranges, waits for a journal manager. The refusal
  is shown plainly.
- **Who.** Users who hold the Subscription Manager role without a
  journal manager role, on a journal with payments enabled. The role is
  meant for staff who run subscriptions without editorial or settings
  access; how many journals use it that way is not known. A user who
  also holds a journal manager role is let in.
- **Way round.** A journal manager adds or edits the institution; the
  Subscription Manager then picks it in the subscription window.

Medium: part of the Subscription Manager's own task fails every time,
and a journal manager can do that part instead.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (or `stable-3_5_0`), journal
  `publicknowledge`. It holds no institutions, no subscription types and
  nobody in the "Subscription Manager" role.
- Payments enabled: as `rvaca`, Settings › "Distribution" › "Payments",
  tick "Enable", "Currency" "US Dollar", "Payment Plugins" "Manual Fee
  Payment", "Save". The side menu offers "Payments" and "Institutions"
  only while payments are enabled.
- A Subscription Manager: as `rvaca`, Settings › "Users & Roles" ›
  "Users", "Invite to a role", search `jjanssen@mailinator.com`,
  "Search User", role "Subscription Manager" from today, "Save And
  Continue", "Invite user to the role". The invitation email goes out
  through the install's mail settings (on a development install, read it
  in the mail catcher the install sends to). Signed out, open "Accept
  Invitation" in it and press "Accept And Continue to OJS". `jjanssen`
  (Julie Janssen) is a Reviewer in the dataset, so she lands on a
  dashboard that has the side menu.

Steps:

1. Sign in as `jjanssen`.
2. Look at the side menu.
3. Press "Payments", open the "Institutional Subscriptions" tab and press
   "Create New Subscription". Close the window.
4. Press "Institutions" in the side menu.

**Expected:** "Institutions" opens the Institutions page with "Add
Institution", as it does for `rvaca`. An institution added there is
then offered in the subscription window's "Institution" list.

**Observed:** the side menu reads "My Assignments as Reviewer", "Start A
New Submission", "Institutions", "Payments". The subscription window
reads, under "Institution" (beside "A subscription type must be created
before new subscriptions can be made." under "Subscription type", since
the dataset has no types):

```
An institution must be created before new subscriptions can be made.
```

"Institutions" opens
`/index.php/publicknowledge/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
a page reading:

```
The current role does not have access to this operation.
```

Control: `rvaca`'s side menu shows the same "Institutions" entry, and it
opens the page with "Add Institution". After `rvaca` adds an individual
and an institutional subscription type and one institution, `jjanssen`
saves an individual subscription and an institutional subscription for
that institution, and both lists show them.

## Cause

OJS `TemplateManager::setupBackendPage()` (`classes/template/TemplateManager.php`,
lines 189–216) adds "Payments" to the side menu for the Site
Administrator, the journal manager and the Subscription Manager while
payments are enabled, and in the same block adds "Institutions"
(`management/settings/institutions`) for all three.

The page behind the entry is the `settings` operation with the argument
`institutions` (`ManagementHandler::institutions()`). OJS
`SettingsHandler::__construct()` (`pages/management/SettingsHandler.php`,
lines 48–63) has long assigned `settings` to `ROLE_ID_SITE_ADMIN` and
`ROLE_ID_MANAGER` alone, and the Institutions page took that assignment
over when pkp-lib's side of the change (bed0ee4c3b) put it under
`settings`. The page's list and form read and write through the
institutions API, which the same pkp-lib commit made manager-only; today
that is `PKPInstitutionController::getRouteGroupMiddleware()` (lib/pkp
`api/v1/institutions/PKPInstitutionController.php`, lines 54–62).

That change, `pkp/pkp-lib#6782` (the OJS side in `pkp/ojs#3465`), moved
the institution's name and IP ranges out of the institutional
subscription window into the new Institutions page, and put the page's
entry beside "Payments". The Subscription Manager still opens the window,
but it now only picks an existing institution
(`InstitutionalSubscriptionForm`). Entering a new institution moved to a
page the role cannot open.

Reach:

- The window's "Institution" list reads the institutions directly
  (`Repo::institution()` in `InstitutionalSubscriptionForm`), and
  "Payments" (`PaymentsHandler`) and the subscription lists
  (`SubscriptionsGridHandler` and its siblings) admit the Subscription
  Manager, so subscriptions for existing institutions and individual
  subscriptions keep working (checked in the code and on screen).
- A user holding the Subscription Manager and a journal manager role is
  admitted through the manager role (`ContextAccessPolicy` permits when
  any of the user's roles is assigned the operation; checked in the
  code).
- A journal manager without "Permit changes to Settings" is refused the
  same page for a different reason, `CanAccessSettingsPolicy` in
  `ManagementHandler::authorize()`, tracked as
  [U66-A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U66-A1-institutions-menu-without-settings-permission.md).
  That policy refuses the Subscription Manager too, so the fix below
  includes U66-A1's exemption.

## Proposed fix

A proposal, tried on `main` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-institutions-refused/fix.diff)).
Which fix is right is a product call first: whether the Subscription
Manager should keep the journal's institution list, or leave it to
journal managers.

Recommended, if the Subscription Manager is to keep the list: admit the
role to the Institutions page and its API.

```diff
 // OJS pages/management/SettingsHandler.php (a new method)
+    public function authorize($request, &$args, $roleAssignments)
+    {
+        // The Subscription Manager keeps the institutions that institutional subscriptions are made for.
+        if ($request->getRequestedOp() === 'settings' && $request->getRequestedArgs() === ['institutions']) {
+            $roleAssignments[Role::ROLE_ID_SUBSCRIPTION_MANAGER] = ['settings'];
+        }
+        return parent::authorize($request, $args, $roleAssignments);
+    }

 // lib/pkp api/v1/institutions/PKPInstitutionController.php, getRouteGroupMiddleware()
             self::roleAuthorizer([
                 Role::ROLE_ID_MANAGER,
+                Role::ROLE_ID_SUBSCRIPTION_MANAGER,
             ]),

 // lib/pkp pages/management/ManagementHandler.php, authorize(): U66-A1's exemption
-        if ($request->getRequestedOp() == 'settings' && $requestedArgs != ['announcements'] && $requestedArgs != ['userComments']) {
+        if ($request->getRequestedOp() == 'settings' && $requestedArgs != ['announcements'] && $requestedArgs != ['userComments'] && $requestedArgs != ['institutions']) {
```

- What it grants: the Subscription Manager sees the list and can add,
  edit and delete institutions, on the page and through all five
  institution API routes (list, read, add, edit, delete). That matches
  what the role could do in 3.3, where the institution's details lived
  on the subscription it could edit and delete. An institution's IP
  ranges also decide which institution the usage statistics count.
- The `SettingsHandler` method is a new pattern. Role assignments are
  made per operation, and no handler admits a role for one argument
  today; `ManagementHandler::authorize()` reads the argument only to
  decide whether to add `CanAccessSettingsPolicy`. It is used because
  the page lives inside the `settings` operation, and the existing
  pattern, an operation of its own, would change the page's address (see
  Alternatives).
- The API names an OJS role in pkp-lib, as
  `Repository::_roleCanPreview()` (lib/pkp
  `classes/submission/Repository.php`) already does. OMP and OPS have no
  Subscription Manager, so nothing changes there.

Tried on OJS: with it, `jjanssen` as Subscription Manager opens
"Institutions" from the side menu, "Add Institution" saves, and the
subscription window then offers the new institution. The same user is
still refused Settings › Website and the Announcements address, and
`sberardo` (Section editor) is still refused the Institutions page's
address, as without the fix.

**Alternatives:**

- If journal managers are to keep the list: offer the entry only to the
  roles that can open the page. In OJS
  `TemplateManager::setupBackendPage()`, add the `institutions` link only
  for `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER`. One condition; the
  Subscription Manager keeps depending on a journal manager, as since
  3.4.
- Add and edit without delete: the same fix, with the delete route given
  its own `roleAuthorizer([Role::ROLE_ID_MANAGER])`, as
  `PKPBackendSubmissionsController` sets roles per route. The page would
  still show "Delete", which then fails for the role, so the list panel
  would need to hide it too.
- An operation of its own: `ManagementHandler::institutions()` is
  already public, so assigning an `institutions` operation to the
  manager and the Subscription Manager in each app's `SettingsHandler`
  would open it at `management/institutions`, following the
  per-operation pattern, and outside `CanAccessSettingsPolicy`. It
  changes the page's address and both menu links, in three apps and
  pkp-lib.

**What goes with it:**

- API: a Subscription Manager's session or API token can read and write
  `/api/v1/institutions`. Nothing stored changes and no hook changes.
- Backport to 3.5: all three hunks. The `SettingsHandler` method and the
  API line apply unchanged; the exemption is written against 3.5's
  condition, which exempts `['announcements']` alone. To 3.4: the same
  `SettingsHandler` method; no exemption, since `ManagementHandler::authorize()`
  has no settings policy there; and the new role beside
  `Role::ROLE_ID_MANAGER` in each of `PKPInstitutionHandler`'s five
  endpoints.
- Guard: an e2e scenario in U51 (a Planned item) in which a Subscription
  Manager opens "Institutions" from the side menu, adds an institution
  and creates an institutional subscription for it.

Large: the fix cannot be chosen without the product call on who keeps
the institution list; once it is made, either fix is small to medium
(three hunks in two repos, or one condition in OJS).

## Evidence

- Kept script that runs the Steps in the browser on a fresh load of the
  default dataset, with `rvaca` as control and the neighbour check at the
  end (`jjanssen` types Settings › Website's and Announcements'
  addresses, `sberardo` the Institutions page's); where the page opens
  it adds an institution and reads the subscription window again:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-institutions-refused/walk.js),
  run with
  `PROBE_FEATURE=issues-w5 PROBE_AGENT=w5 node bin/probe.js ojs shared/playwright/checks/issues/subscription-manager-institutions-refused/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front).
- The control (existing institutions and individual subscriptions,
  without the fix, on main):
  [control.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-manager-institutions-refused/control.js),
  run the same way.
- The fix, tried 2026-09-30 on the main tips below: `node bin/try-fix.js
  apply shared/playwright/checks/issues/subscription-manager-institutions-refused/fix.diff ojs`,
  the dataset reloaded, the same `probe.js` command, then `node
  bin/try-fix.js revert ojs`.
- Walked 2026-09-30 on PostgreSQL, each install loaded from pkp/datasets
  38ab955 (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`:
  main OJS bade233f73 (lib/pkp 2e377d27fc); stable-3_5_0 OJS 92b9a16b48
  (lib/pkp a9c76aed62). Both showed the Observed above; on 3.5
  `jjanssen`'s side menu has no "Start A New Submission". No server
  error or script error was recorded.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7 (`TemplateManager`
  adds "Institutions" in the payments block for the same three roles;
  `SettingsHandler` as on main), pkp-lib `stable-3_4_0` at df13621c2d
  (`PKPInstitutionHandler`'s five endpoints admit `ROLE_ID_MANAGER`
  alone). 11f902f20f is on the branch.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib `stable-3_3_0`
  at d446601ebe. `TemplateManager` adds "Payments" alone; the window
  (`templates/payments/institutionalSubscriptionForm.tpl`) takes
  "Institution Name", mailing address, domain and IP ranges, and
  `SubscriptionsGridHandler` admits the Subscription Manager.
- Introduced: `git blame` on the institutions block of OJS
  `TemplateManager::setupBackendPage()` stops at 11f902f20f. The role
  condition above it is older (665ed1f925, 2021) and already named the
  Subscription Manager in 3.3. The API's manager-only roles come from
  pkp-lib bed0ee4c3b (2021-06-15, Bozana Bokan), which also added the
  `institutions` case under `settings`. It reached pkp-lib `main` in
  `pkp/pkp-lib#8109`, merged 2022-07-23, the same day as `pkp/ojs#3465`.
- The product question has one pkp statement: willinsky's comment on
  `pkp/pkp-lib#2676` (2020-05-23), "The journal manager (or
  subscription manager) creates institutional subscriptions."
- Not driven: a user holding only the Subscription Manager role (the
  spec's probe of 2026-09-25 saw the same entry and refusal on the
  "Payments" page of three scratch journals; such a user has no
  dashboard, and the side menu shows on
  `/index.php/publicknowledge/en/payments`); a user holding both the
  Subscription Manager and a journal manager role; editing and deleting
  an institution with the fix in; the control and the fix on 3.5.
