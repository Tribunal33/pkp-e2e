# A Section or Guest Editor's "Dashboard" on the journal's public pages opens the Profile page, with no task count

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS (Section and Guest Editor), OMP, OPS
  - 3.5: OJS (Section and Guest Editor), OMP, OPS
  - 3.4: OJS (Section and Guest Editor), OMP, OPS (code)
  - 3.3: OJS (Section and Guest Editor), OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#2917` for `pkp/pkp-lib#2910` · [39912fe](https://github.com/pkp/pkp-lib/commit/39912fe17912b83edfedb7897fb28a686a85e1c4) (the Profile address) and [03f1cbe](https://github.com/pkp/pkp-lib/commit/03f1cbea007f65c59ebf8812c66f3287ce46dd38) (the count) · 2017-10-23 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-20)
- **Tracked in** U08 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a2), U05 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a3)
- **Checked** 2026-10-20, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-20: a Guest Editor on OJS meets the same fault, and the
report now covers them.

Update 2026-10-14: the report now says where the task count shows, and
the Steps take French out of the journal's "Forms" languages first.

## Summary

On a journal's public pages, "Dashboard" in the menu under the signed-in
user's name takes a Journal Manager, a Journal editor, an assistant, a
Reviewer or an Author to the page they work from. A Section Editor
(Series Editor on a press, Moderator on a preprint server), or on OJS a
Guest Editor, who holds none of those roles is taken to their Profile page
instead, although signing in put them on the Dashboard.

They never see their number of unread tasks on the public pages either.
It is missing beside their name in the header. In a narrow window or on a
phone, the header collapses into an "Open Menu" list, and its "Dashboard"
entry has no number either. The other roles see theirs in both places (beside the name only when English
is the journal's one "Forms" language, [U05 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a15)).

The Profile page's side menu leads back to the Dashboard in one press. It
worked in 3.0 and broke in 3.1.

## Impact

- **Lost**: nothing.
- **Who**: a Section Editor, or on OJS a Guest Editor, who holds no
  Author, Reviewer, assistant or manager role in the journal, using the
  menu under their name on its public pages. One who holds one of those
  roles too gets the Dashboard and the count through it. Walked with the
  default theme.
- **Way round**: "Editor Dashboard" in the Profile page's side menu. The bell
  on every editorial page counts their tasks.

Low: a misleading link and a missing count, with nothing lost and the
Dashboard one press away.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same).
- The journal's languages are English and French, both ticked in the
  "Forms" column of Settings › Website › "Setup" › "Languages". With French
  there, no user's name in the header carries the count, whatever their
  role. That is a separate fault
  ([U05 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a15)),
  so step 1 takes French out of "Forms".
- `dbuskins` (David Buskins) is a Section editor of `publicknowledge`
  (a Series editor on OMP, a Moderator on OPS), holds no other role there,
  and has unread tasks. `dbarnes` (Daniel Barnes, Journal editor; Press
  editor on OMP, Preprint Server manager on OPS) is compared with them.
- The dataset holds no Guest Editor, so steps 7 to 9 invite one on OJS
  (a press and a preprint server have no such role) and give them a task.
- The dataset's `config.inc.php` sends mail by SMTP to `localhost` port
  1025, a local mail catcher such as Mailpit; step 8 reads the invitation
  there.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open "Settings" ›
   "Website" › "Setup" › "Languages" and untick the box in the "Forms"
   column of the French row; the change saves at once. Then "Logout".
2. Sign in as `dbuskins` (password `dbuskinsdbuskins`) on the journal's
   login page. The Dashboard opens
   (`/index.php/publicknowledge/en/dashboard/editorial`), and the bell at the
   top right reads "Tasks 2" (OMP and OPS: "Tasks 1").
3. Open the journal's home page (`/index.php/publicknowledge/en`) and read
   the name at the top right.
4. Make the browser window narrower than 992 px (or open the page on a
   phone), press "Open Menu" and read the list under "dbuskins".
5. Back at full width, press "dbuskins" at the top right, then "Dashboard".
6. "Logout", sign in as `dbarnes` and repeat steps 3 to 5.

Guest Editor (OJS):

7. Still as `dbarnes`, open "Settings" › "Users & Roles" and press
   "Invite to a role". Search `u08h20d@example.com`, type Given Name
   "Gwen" and Family Name "Guest-u08h20d", pick the role "Guest editor"
   with today as its start, press "Save And Continue", then "Invite user
   to the role". "Logout".
8. In the mail catcher, open the email "You are invited to new roles" and
   its accept link. Choose the username `u08h20d` and a password, tick the
   privacy box, "Save and continue"; pick a country, "Save and continue";
   press "Accept And Continue to …".
9. Sign in as `dbarnes` and open submission 2, "The influence of lactation
   on the quantity and quality of cashmere production", at its review
   round. Under "Participants" press "Assign", pick "Guest editor", search
   "Guest-u08h20d", choose Gwen Guest-u08h20d and press "OK". Under "Review
   Tasks & Discussions" press "Add", type the Name "u08h20d question", tick
   "Gwen Guest-u08h20d (u08h20d) Guest editor", type a message and press
   "Save". "Logout".
10. Sign in as `u08h20d`. The Dashboard opens, and the bell reads
    "Tasks 1". Repeat steps 3 to 5.

**Expected:** the name reads "dbuskins 2" (OMP and OPS: "dbuskins 1"), the
number the bell shows, and the list in the narrow window reads
"Dashboard 2" ("Dashboard 1"); for the Guest Editor "u08h20d 1" and
"Dashboard 1". "Dashboard" opens the Dashboard, the page they landed on
after signing in.

**Observed:** the name reads "dbuskins", with no number, and the list reads
"Dashboard", "View Profile", "Logout", with no number. "Dashboard" opens the
Profile page:

```
/index.php/publicknowledge/en/user/profile
Profile | Journal of Public Knowledge
```

The same happens on OMP ("Profile | Public Knowledge Press") and OPS
("Profile | Public Knowledge Preprint Server"), and to the Guest Editor:
"u08h20d", the list "Dashboard", "View Profile", "Logout", and the Profile
page, while their bell reads "Tasks 1". For `dbarnes` the name reads
"dbarnes 2" (OMP "dbarnes 13", OPS "dbarnes 0"), the list in the narrow
window "Dashboard 2" ("Dashboard 13", "Dashboard 0"), and "Dashboard" opens
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

`Role::ROLE_ID_SUB_EDITOR` is missing from the list. It is stored for every
role whose "Permission level" in Settings › Users & Roles › "Roles" reads
"Section Editor" ("Series Editor" on OMP, "Moderator" on OPS). The default
roles with that permission level are the Section editor (Series editor,
Moderator) and, on OJS only, the Guest editor (`registry/userGroups.xml`,
`roleId="0x00000011"`). A user whose roles in the journal all have that
permission level, Reader aside, fails both checks. Their title
stays the bare name or "Dashboard", and their address falls through to
`user/profile`. For the roles in the list, line 215 replaces the title with
`dashboardMenuItem.tpl`, which writes the title and then the count in a
`span.task_count`. The default theme shows the count beside the name in a
window 992 px or wider. In a narrower window it hides that count and shows
the one after "Dashboard" instead. Yet `PKPPageRouter::getHomeUrl()`, which picks the page a
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

- On a journal with French under "Forms", the roles in the list see the
  count only after "Dashboard" in a narrow window, since the theme hides
  that entry's count at full width (on screen; the name's count is the
  separate fault in the Preconditions).
- A role a journal adds in Settings › Users & Roles › "Roles" with the
  "Permission level" "Section Editor" (read in the code, not walked).
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

With the fix in, the walk showed the Expected on all three apps. On OJS
it did the same for a Guest Editor who had no task yet: their name and
"Dashboard" carried "0", and "Dashboard" opened the Dashboard. In a
neighbour check with the same diff, an Author and a Reviewer kept their count and their pages (My Submissions, the review
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
  `ROLE_ID_SUB_EDITOR` and `array()` syntax). There `getHomeUrl()` sends
  every role but Reader to the `submissions` page, with no split by role,
  so the method's comment should not name `getHomeUrl()`; the role set is
  still the right one.
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
  It takes the Steps as `dbarnes` and `dbuskins`, and on OJS as the
  invited Guest Editor `u08h20d` (the accept link read from the install's
  mail catcher), on an install freshly loaded from the default dataset
  (pkp/datasets 35759b4c, 2026-10-19, PostgreSQL). From a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-dashboard-opens-profile/walk.js`.
  `GUEST_TASK=1` adds step 9 (the assignment and the discussion);
  `WALK_ONLY=guest` (OJS) takes steps 1 and 7 to 10 alone;
  `WALK_MODE=neighbour` walks the Author (`ccorino`, `aclark` on OMP), the
  Reviewer (`jjanssen`; the OPS dataset has none) and the site-level page,
  with French left under "Forms" (walked 2026-10-03 with the fix in and
  out; the diff has not changed since).
- Walks on 2026-10-20, each on a freshly loaded install:
  - `main`: the Steps on all three apps, and on OJS the Guest Editor
    with step 9 (`WALK_ONLY=guest GUEST_TASK=1`): bell "Tasks 1", the
    name and "Dashboard" bare, the Profile page.
  - 3.5: the same command with `PKP_E2E_LINE=stable-3_5_0` in front, on
    that line's dataset (`ojs/stable-3_5_0/pgsql` and the others), with
    the same result as `main`. The Guest Editor there was walked without
    step 9 (bell "Tasks", the name and "Dashboard" bare, the Profile page)
    and invited at `u08h20d@mailinator.com`, an address the mail catcher
    receives like any other.
  - The fix: `main` OJS with
    [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-dashboard-opens-profile/fix.diff)
    applied (`node bin/try-fix.js apply <fix.diff> ojs`, `WALK_ONLY=guest`
    without step 9, reverted after). Not walked: the fix for a Guest
    Editor who holds a task. The count comes from the same
    `dashboardMenuItem.tpl` that printed `dbuskins`'s "2" with the fix in
    (2026-10-14, all three apps, the same diff).
  - No request failed and no page script failed, with the fix in or out.
- Tips (2026-10-20): `main` OJS 6b4323ced7, OMP 5777025be and OPS
  f048e747b4 (lib/pkp 042726ebf6); `stable-3_5_0` OJS b56f8b74ff, OMP
  722d3e661 and OPS 110effdd6e (lib/pkp cd82be0528); `stable-3_4_0` OJS
  0012bd1022 (lib/pkp a71d6bd2ca); `stable-3_3_0` OJS d7d9dd14ec (lib/pkp
  5e84acd11b).
- Code reads: `PKPNavigationMenuService.php` on `main` (lines 215 and 305)
  and on 3.5 (213 and 303), the same lists; 3.4
  `classes/services/PKPNavigationMenuService.php` lines 210 and 300 and 3.3
  `classes/services/PKPNavigationMenuService.inc.php` lines 190 and 280, the
  same lists, with the `submissions` page as the address. `getHomeUrl()` in
  `PKPPageRouter.php` on `main`. The file is shared by the three apps through
  pkp-lib, and no app overrides it. `dashboardMenuItem.tpl` and the
  `{$loggedInUsername}` item in each app's `registry/navigationMenus.xml`
  on `main`. All re-read on the 2026-10-20 tips: the lines and lists are
  unchanged. OJS `registry/userGroups.xml` on `main`, 3.5, 3.4 and 3.3:
  the Guest editor group has `roleId="0x00000011"` (`ROLE_ID_SUB_EDITOR`)
  on every line; OMP's and OPS's registries hold no group with that role id
  besides the Series editor and the Moderator.
- Not driven: a custom role with the permission level "Section Editor"
  (in the code), a user holding only Reader (the dataset has none; in the code
  Reader is not in the list, before or after the fix), a Section Editor who
  also holds Author or Reviewer (in the code), and themes other than the
  default.
- Not walked: the fix on a journal with French under "Forms".
- Upstream: `pkp/pkp-lib#8971` ("Dashboard link goes to user Profile",
  closed) is the same link, but for an Author signed in at the site's
  address, not a Section Editor; not this fault. `pkp/pkp-lib#4340`
  (closed) is about links to contexts the user has no role in; not this
  fault. Searched again on 2026-10-20, with "guest editor" added.
- Unverified: how many Guest Editors hold no other role in their journal.
  A Guest Editor is often invited for one special issue, which suggests
  many do; that is a reading of the role's purpose, not a count.
