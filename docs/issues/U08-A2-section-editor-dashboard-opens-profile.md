# A Section Editor's "Dashboard" on the journal's public pages opens the Profile page, with no task count

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#2917` for `pkp/pkp-lib#2910` · [39912fe](https://github.com/pkp/pkp-lib/commit/39912fe17912b83edfedb7897fb28a686a85e1c4) (the Profile address) and [03f1cbe](https://github.com/pkp/pkp-lib/commit/03f1cbea007f65c59ebf8812c66f3287ce46dd38) (the count) · 2017-10-23 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-03)
- **Tracked in** U08 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a2), U05 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal's public pages, "Dashboard" in the menu under the signed-in
user's name takes a Journal Manager, a Journal editor, an assistant, a
Reviewer or an Author to the page they work from. A Section Editor is taken
to their Profile page instead, although signing in put them on the
Dashboard.

The same menu never shows a Section Editor their number of unread tasks.
The other roles see theirs after "Dashboard" when the menu is opened in a
narrow window or on a phone.

The Profile page's side menu leads back to the Dashboard in one press. It
happens to every Section Editor (Series Editor on a press, Moderator on a
preprint server) who holds no Author, Reviewer, assistant or manager role in
the journal. It worked in 3.0 and broke in 3.1.

## Impact

- **Lost**: nothing. The Section Editor reaches the wrong page and sees no
  task count in that menu.
- **Who**: a Section Editor who holds no other working role in the journal,
  using the menu under their name on its public pages. One who is also an
  Author or a Reviewer there gets the Dashboard and the count through that
  role. Walked with the default theme.
- **Way round**: "Editor Dashboard" in the Profile page's side menu. The bell
  on every editorial page counts their tasks.

Low: a link that misleads one role while the task still gets done, with the
Dashboard one press away.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same). Nothing is
  created.
- `dbuskins` (David Buskins) is a Section editor of `publicknowledge`
  (a Series editor on OMP, a Moderator on OPS), holds no other role there,
  and has unread tasks. The control is `dbarnes` (Daniel Barnes, Journal
  editor).

Steps:

1. Sign in as `dbuskins` (password `dbuskinsdbuskins`) on the journal's login
   page. The Dashboard opens
   (`/index.php/publicknowledge/en/dashboard/editorial`), and the bell at the
   top right reads "Tasks 2" (OMP and OPS: "Tasks 1").
2. Open the journal's home page (`/index.php/publicknowledge/en`).
3. Make the browser window narrower than 992 px (or open the page on a
   phone), press "Open Menu" and read the list under "dbuskins".
4. Back at full width, press "dbuskins" at the top right, then "Dashboard".
5. Control: sign in as `dbarnes` and repeat steps 2 to 4.

**Expected:** the list under "dbuskins" reads "Dashboard 2" (OMP and OPS:
"Dashboard 1"), the Section Editor's own count, the number the bell shows.
"Dashboard" opens the Dashboard, the page they landed on after signing in.

**Observed:** the list reads "Dashboard", "View Profile", "Logout", with no
number. "Dashboard" opens the Profile page:

```
/index.php/publicknowledge/en/user/profile
Profile | Journal of Public Knowledge
```

The same happens on OMP ("Profile | Public Knowledge Press") and OPS
("Profile | Public Knowledge Preprint Server"). For `dbarnes` the list reads
"Dashboard 2" (OMP "Dashboard 13", OPS "Dashboard 0"), and "Dashboard" opens
the Dashboard.

## Cause

`PKPNavigationMenuService::getDisplayStatus()`
(`lib/pkp/classes/services/PKPNavigationMenuService.php`) sets the title and
the address of the `NMI_TYPE_USER_DASHBOARD` items. These are the
"Dashboard" entry and the username item above it, both installed with that
type by each app's `registry/navigationMenus.xml`. The same role check is
made twice:

```php
// line 215: the title with the unread count (dashboardMenuItem.tpl)
// line 305: the address, PKPPageRouter::getHomeUrl(), else user/profile
if ($currentUser->hasRole([Role::ROLE_ID_MANAGER, Role::ROLE_ID_ASSISTANT, Role::ROLE_ID_REVIEWER, Role::ROLE_ID_AUTHOR], $contextId)
    || $currentUser->hasRole([Role::ROLE_ID_SITE_ADMIN], PKPApplication::SITE_CONTEXT_ID)) {
```

`Role::ROLE_ID_SUB_EDITOR` is missing from the list. A user whose only
working role in the journal is Section Editor fails both checks. Their title
stays the bare name or "Dashboard", and their address falls through to
`user/profile`. Yet `PKPPageRouter::getHomeUrl()`, which picks the page a
user lands on after signing in, sends `ROLE_ID_SUB_EDITOR` to
`dashboard/editorial` with the managers and assistants. The editorial menu
built in `PKPTemplateManager` (line 1221) also counts Section Editors among
the roles with a dashboard.

In 3.0 the header template linked the name to the submissions page, with
the count, for every signed-in user. The same role list, without Section
Editors, decided only whether a separate "Dashboard" entry appeared. PR
`pkp/pkp-lib#2917` (for `pkp/pkp-lib#2910`, which restricted
"Administration" to site administrators) moved the user menu into the
navigation menu service, in three steps:

- [774c798](https://github.com/pkp/pkp-lib/commit/774c7988522b6ad5711c3e27ea7665985bb45594)
  used the list to hide both items, the name included, from other roles.
- [39912fe](https://github.com/pkp/pkp-lib/commit/39912fe17912b83edfedb7897fb28a686a85e1c4)
  showed both items again to every signed-in user and used the list for the
  address, with `user/profile` for everyone else: line 305's fault.
- [03f1cbe](https://github.com/pkp/pkp-lib/commit/03f1cbea007f65c59ebf8812c66f3287ce46dd38)
  used the list for the count in the title: line 215's fault.

The PR was merged on 2017-10-23 (da7ee3a3a2) and released in 3.1.

Reach:

- Any menu a journal adds with an item of type "Dashboard" follows the same
  check (in the code).
- A Section Editor who also holds Manager, an assistant role, Reviewer or
  Author in the journal passes the check through that role, and
  `getHomeUrl()` then sends them to the Dashboard (in the code).
- Site-level public pages: `$contextId` is the site's, which holds no
  Section Editor group, so only the site administrator passes there, by
  design (in the code; on screen, a Section Editor and the Journal editor
  both reach the Profile page from there).
- No other copy of this list exists in pkp-lib or the three apps (a search
  for the role list and for `NMI_TYPE_USER_DASHBOARD`).

## Proposed fix

Put the rule in one place and use the role set that `getHomeUrl()` uses:
one protected method on the service that returns whether the user works from
a dashboard in this context, called by both checks. The context id is
nullable because on site-level pages it is `PKPApplication::SITE_CONTEXT_ID`,
which is `null` on `main` and 3.5, and `User::hasRole()` takes `?int`.
Tried on `main` in all three apps:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-dashboard-opens-profile/fix.diff).

```diff
-                    if ($currentUser->hasRole([Role::ROLE_ID_MANAGER, Role::ROLE_ID_ASSISTANT, Role::ROLE_ID_REVIEWER, Role::ROLE_ID_AUTHOR], $contextId) || $currentUser->hasRole([Role::ROLE_ID_SITE_ADMIN], PKPApplication::SITE_CONTEXT_ID)) {
+                    if ($this->hasDashboard($currentUser, $contextId)) {
 (both places)
+    /**
+     * Whether the user works from a dashboard in this context: the roles
+     * PKPPageRouter::getHomeUrl() sends to one, and the site administrator.
+     */
+    protected function hasDashboard(\PKP\user\User $user, ?int $contextId): bool
+    {
+        return $user->hasRole([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT, Role::ROLE_ID_REVIEWER, Role::ROLE_ID_AUTHOR], $contextId)
+            || $user->hasRole([Role::ROLE_ID_SITE_ADMIN], PKPApplication::SITE_CONTEXT_ID);
+    }
```

With the fix in, the walk showed the Expected on all three apps. An Author
and a Reviewer kept their count and their pages (My Submissions, the review
assignments). A site-level public page ("About this Publishing System" at
`/index.php/index/en/about/aboutThisPublishingSystem`) loaded for the
Section Editor and the Journal editor, whose "Dashboard" still opened the
Profile page. All of it was the same with the fix in and out.

**Alternatives**

- Add `Role::ROLE_ID_SUB_EDITOR` to the two lists only: the same result, but
  two identical lists stay separate from `getHomeUrl()`'s role set and can
  drift apart from it again.
- Take the address from `getHomeUrl()` for everyone and send a user to the
  Profile page only when it returns the journal's home page: one source for
  the address, but the count still needs its own role test, so the list
  stays.

**What goes with it**

- No stored data changes. The `NavigationMenus::displaySettings` hook still
  runs after the decision.
- Backport: on 3.5 the diff applies as it stands. 3.4 and 3.3 need
  `PKPApplication::CONTEXT_SITE` (3.3: the global `CONTEXT_SITE`,
  `ROLE_ID_SUB_EDITOR` and `array()` syntax). Both send the qualifying roles
  to the `submissions` page.
- Guard: an end-to-end check that a Section Editor's "Dashboard" on the
  journal's home page opens the Dashboard and carries the count, or a unit
  test of the service's display status per role, the site-level case
  included.

This is a proposal; the team decides. Small: one method and two calls in one
shared class, following the role set `getHomeUrl()` already uses, and one
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-dashboard-opens-profile/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-dashboard-opens-profile/lib.js).
  It takes the Steps as `dbuskins` and `dbarnes` on an install freshly
  loaded from the default dataset (pkp/datasets e8dafbc, 2026-10-02,
  PostgreSQL). From a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-dashboard-opens-profile/walk.js`;
  `WALK_MODE=neighbour` walks the Author (`ccorino`, `aclark` on OMP), the
  Reviewer (`jjanssen`; the OPS dataset has none) and the site-level page.
  No request failed and no page script failed, with the fix in or out.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c and OPS
  c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` lib/pkp
  9e41f10273; `stable-3_3_0` lib/pkp ac3fa73402.
- Code reads: `PKPNavigationMenuService.php` on `main` (lines 215 and 305)
  and on 3.5 (213 and 303), the same lists; 3.4
  `classes/services/PKPNavigationMenuService.php` lines 210 and 300 and 3.3
  `classes/services/PKPNavigationMenuService.inc.php` lines 190 and 280, the
  same lists, with the `submissions` page as the address. `getHomeUrl()` in
  `PKPPageRouter.php` on `main`. The file is shared by the three apps through
  pkp-lib, and no app overrides it.
- Not driven: a user holding only Reader (the dataset has none; in the code
  Reader is not in the list, before or after the fix), a Section Editor who
  also holds Author or Reviewer (in the code), and themes other than the
  default.
- Seen on the way, a separate fault: at full width on the default dataset
  no user's name carries the task count, the Journal editor's included.
- Upstream: `pkp/pkp-lib#8971` ("Dashboard link goes to user Profile",
  closed) is the same link, but for an Author signed in at the site's
  address, not a Section Editor; not this fault.
