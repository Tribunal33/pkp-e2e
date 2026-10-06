# The site administrator cannot add site highlights: "Save" leaves the panel open and "Save Order" shows an error

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older API has no such middleware)
  - 3.3: none (code; no highlights)
- **Introduced** `pkp/pkp-lib#10267` for `pkp/pkp-lib#10266` · [6f727bb567](https://github.com/pkp/pkp-lib/commit/6f727bb567c1b68d6efc5748b3ac6264389edce0) · 2024-08-02 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U11 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a5)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The application fails on the server when the Site Administrator saves
or orders the site's own highlights under Site Settings › "Site Setup"
› "Highlights". "Save" in the "Add Highlight" panel leaves the panel
open, and the page shows "An unexpected error has occurred. Please
reload the page and try again." for a few seconds; reloading does not
help. "Order" is offered on the empty list, and "Save Order" shows
"Error / Call to a member function getId() on null".

No site highlight can be created, so the list keeps reading "No items
found." and the site's home page shows no carousel.

The tab is offered only on a site that hosts two or more journals
(presses on OMP, preprint servers on OPS).

## Impact

- **Lost**: the site's highlights. A typed highlight stays only in the
  open panel, and is gone once the administrator closes it or leaves
  the page. The notice asks for a reload, which changes nothing.
- **Who**: the Site Administrator of every such site, each time they
  try to promote something on the site's home page. An OJS site
  upgraded from 3.4 that had site highlights switched on (the unlisted
  `[features] highlights` setting) keeps its old site highlights on the
  home page and in the tab, but its administrator cannot edit, reorder
  or delete them.
- **Way round**: none on screen. A journal's own highlights still work,
  but they show only on that journal's home page.

Medium: no site highlight can be added and the notice gives no usable
advice, but the task is optional and rarely done, and only an OJS site
that switched the unlisted setting on in 3.4 holds highlights it cannot
change. It would be high if many 3.4 sites had switched site highlights
on, since their home pages would then carry promotions nobody can
remove.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  with "Press" or "Server" for "Journal").
- A second journal, made in step 2. The dataset holds one journal, and
  Site Settings show "Highlights" only on a site with two or more.

Steps:

1. Sign in as `admin` (password `admin`).
2. Go to Administration › "Hosted Journals" › "Create Journal". Fill in
   "Journal title" "u11c Second Journal", "Journal initials" "U11C",
   the principal contact's name "u11c Second Journal" and email
   `u11csecond@mailinator.com`, "Country" "Canada", "Path" `u11csecond`,
   and English as a language and as the primary one. Tick "Enable this
   journal to appear publicly on the site". Press "Save".
3. Go to Administration › "Site Settings" › "Site Setup" ›
   "Highlights". The list reads "No items found.".
4. Press "Add Highlight". Fill in "Title" "u11c Site highlight", "URL"
   "https://example.org/u11c" and "Button Label" "Read more". Press
   "Save".
5. Reload the page and open "Site Setup" › "Highlights" again.
6. Press "Order", which is offered although the list is empty, then
   "Save Order".
7. In a signed-out browser, open the site's home page,
   `/index.php/index`.

**Expected**: step 4 closes the panel and lists "u11c Site highlight";
step 5 still lists it; step 6 saves the order without an error; step 7
shows the highlight as a carousel above the list of journals, its
button "Read more" leading to `https://example.org/u11c`.

**Observed**:

- Step 4: the panel stays open with the typed fields and nothing under
  them. The page shows "An unexpected error has occurred. Please reload
  the page and try again." at the top right, for about five seconds.

  ```
  POST /index.php/index/api/v1/highlights
  → 500 {"error":"Call to a member function getId() on null"}
  ```

- Step 5: the list reads "No items found.".
- Step 6: a window opens reading "Error", "Call to a member function
  getId() on null", with an "OK" button.

  ```
  PUT /index.php/index/api/v1/highlights/order
  → 500 {"error":"Call to a member function getId() on null"}
  ```

- Step 7: the page lists "Journal of Public Knowledge" and "u11c Second
  Journal", with no carousel.

The server log, for each of the two requests:

```
production.ERROR: Call to a member function getId() on null {"exception":"[object] (Error(code: 0): Call to a member function getId() on null at …/lib/pkp/classes/middleware/HasRoles.php:63)
```

The panel's list request, `GET /index.php/index/api/v1/highlights`,
answers the same 500 when its address is typed into the browser.

A control: the same "Add Highlight" on `publicknowledge`'s own Settings
› "Website" › "Setup" › "Highlights" closes the panel and lists the
highlight.

## Cause

The site's panel sends every request to the API at the site's address,
`/index.php/index/api/v1/highlights`. At that address the request has no
journal: `SetupContextBasedOnRequestUrl::handle()` sets the request's
`context` attribute to null for the `index` path on purpose (pkp-lib
`classes/middleware/SetupContextBasedOnRequestUrl.php`, lines 45–46).

`HighlightsController` is meant to work there. Its `authorize()` keeps
only the site administrator's operations when there is no journal
(lines 96–97, `getSiteRoleAssignments()`), and its methods choose the
site's highlights when `getContext()` is null. Its route group lists
the `has.roles` middleware with the manager role first and the site
administrator second (lines 57–60).

The fault is in `HasRoles::handle()` (pkp-lib
`classes/middleware/HasRoles.php`, line 63):

```php
$matcher = fn(int $roleId) => $user->hasRole($roleId, $roleId === Role::ROLE_ID_SITE_ADMIN ? Application::SITE_CONTEXT_ID : $context->getId());
```

Only the doc comment on line 57 types `$context` as nullable
(`@var ?\PKP\context\Context`); the code calls `$context->getId()`
for every role except the site administrator. With
`ROLES_MATCH_LOOSE` the roles are tried in the order the controller
lists them, so the manager role is tried first and the call fails on
null. Laravel's routing pipeline catches the error and
`PKPExceptionHandler::render()` answers it as a 500. The site
administrator role, which would match, is never reached.

The line came in with 6f727bb567, a clean-up commit in
`pkp/pkp-lib#10267`. That PR let a site administrator pass role checks
in any journal (`pkp/pkp-lib#10266`). The PR's first commit,
8f0583b1f6, read the journal's roles only when there was one
(`if ($context && …)`), and a review comment on the PR noted that
`getId()` on a request without a journal fails. The clean-up replaced
that block with the one-line matcher and dropped the check. Before the
PR, the middleware read the roles at
`$context?->getId() ?? Application::SITE_CONTEXT_ID`, which let the
site administrator through at the site's address (read in the code).
The constant was named `CONTEXT_SITE` until abc36ccdc1
(`pkp/pkp-lib#8333`, 2024-06-10) renamed it.

Reach:

- Every highlights route at the site's address: list, one highlight,
  add, edit, order and delete (add, order and list seen on screen; the
  others by code, since no site highlight exists to edit or delete).
- Site highlights already stored (read in the code). OJS 3.4 saved site
  highlights when `[features] highlights` was on, through an API
  without this middleware. The 3.5 upgrade keeps the tables
  (`I9262_Highlights` creates them only when missing). On `main`
  `PKPIndexHandler::getHighlights()` shows them on the site's home page,
  and `AdminHandler::getHighlightsListPanel()` lists them in the tab
  from the database, but editing, ordering and deleting go through the
  API and fail.
- The journals' highlights are unaffected: there the request has a
  journal (seen on screen).
- Other controllers (read in the code). The site announcements and the
  site navigation menus also work without a journal, but they list the
  site administrator first (`PKPAnnouncementController` lines 71–72,
  `PKPNavigationMenuController` lines 56–57), so the loose match stops
  before the null. Every other controller that lists a journal role
  before the site administrator also lists `has.context` or a context
  policy, which refuses a request without a journal before
  `HasRoles` runs. Highlights is the only route that reaches the null
  today.
- The sections endpoint at the site's address also answers "Call to a
  member function getId() on null", but from
  `SectionController::getMany()`, not from `HasRoles`. It is a separate
  fault with its own report,
  [U17-A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A10-sections-interface-site-address-server-error.md),
  and this fix leaves it as it is (seen on screen).
- Plugin routes get the same middleware (`pkp/pkp-lib#11357`), so a
  plugin route open at the site's address that lists a journal role
  first would fail the same way (read in the code; no shipped plugin
  does).
- The failed saves write nothing.

## Proposed fix

Restore the check that the PR's first commit had: in `HasRoles`, a role
other than the site administrator matches only when the request has a
journal
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-highlights-cannot-be-saved/fix.diff)):

```diff
--- a/lib/pkp/classes/middleware/HasRoles.php
+++ b/lib/pkp/classes/middleware/HasRoles.php
@@ -60,7 +60,11 @@
             ->explode('|')
             ->map(fn($role) => (int)$role);
 
-        $matcher = fn(int $roleId) => $user->hasRole($roleId, $roleId === Role::ROLE_ID_SITE_ADMIN ? Application::SITE_CONTEXT_ID : $context->getId());
+        // A site-level request (the site's own settings) carries no context: there only the
+        // site administrator role can match.
+        $matcher = fn(int $roleId) => $roleId === Role::ROLE_ID_SITE_ADMIN
+            ? $user->hasRole($roleId, Application::SITE_CONTEXT_ID)
+            : $context && $user->hasRole($roleId, $context->getId());
         $isAuthorized = match ($rolesMatchingCriteria) {
             static::ROLES_MATCH_LOOSE => $matchableRoles->some($matcher),
             static::ROLES_MATCH_STRICT => $matchableRoles->every($matcher)
```

The fix belongs in the middleware, because the middleware owns the rule
"a role is checked where the request is". The request's context is
nullable by design (`SetupContextBasedOnRequestUrl`), and `HasRoles`
already treats the site administrator role as a site-level role. The
fix also keeps what `pkp/pkp-lib#10266` asked for: a site administrator
still passes in every journal, and a journal role still needs that
journal. It works whatever order a controller lists its roles in.

Tried on `main` on OJS, OMP and OPS: with the fix every step showed
the Expected, and nothing was logged. These answers are the same with
the fix in and out:

- The journal manager `rvaca` adds and orders a highlight on
  `publicknowledge`'s own tab.
- `rvaca` gets "The current role does not have access to this
  operation." on the Site Settings' address, and 401 on the site's
  highlights list.
- The section editor `dbuskins` gets 401 on the journal's highlights
  list; `admin` gets the journal's list.
- OJS's sections list at the site's address still answers 500 (the
  separate fault above).

**Alternatives**

- List the site administrator first in `HighlightsController`, as the
  announcements and navigation menus controllers do. It fixes this
  screen, but leaves the null call in place for the next route that
  lists a journal role first, and for any `ROLES_MATCH_STRICT` check at
  the site's address. It is a workaround.
- `$context?->getId()` alone. On `main` `Application::SITE_CONTEXT_ID`
  is itself null, so this makes the same null-means-the-site call the
  fix makes for the site administrator, and it behaves the same today:
  nobody holds a journal role at the site level. The recommended form
  states the rule instead ("a journal role needs a journal"), so it
  does not depend on a journal role never being given at the site
  level.
- Revert 6f727bb567. That would also undo the clean-up's other
  changes (the check for a missing user, the `$matcher` closure that checks
  each role where it applies), which are sound.

**What goes with it**

- What it touches: at the site's address, a route whose `has.roles`
  list puts a journal role before the site administrator now passes for the site
  administrator instead of failing with a 500. A non-administrator is
  refused by the role policies before `HasRoles` runs, and still gets
  401. No REST API answer at a journal's address changes, and no hook
  or stored data is involved. No code in pkp-lib or the apps uses
  `ROLES_MATCH_STRICT` today.
- Backport: `stable-3_5_0` has the same `HasRoles.php`, and the diff
  applies there as written (a dry run; not walked there).
- Guard: a unit test for `HasRoles` in pkp-lib (none exists), with a
  request without a context and the roles in either order.

Small: one line in one shared middleware, and a unit test.

## Evidence

- The script saved in pkp-e2e walks the Steps, the control and the
  typed list address:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-highlights-cannot-be-saved/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-highlights-cannot-be-saved/lib.js).
  On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-highlights-cannot-be-saved/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The argument
  `neighbour` runs the checks the fix must leave alone (the last list
  of Proposed fix), with the fix in and out.
- Walked on OJS, OMP and OPS on `main` and `stable-3_5_0`, on
  PostgreSQL and PHP 8.4.11. The fault does not touch the database, so
  MySQL was not checked. Datasets: pkp/datasets 1a5552c (2026-10-04).
  The notice after "Save" is the page's own record of shown notices,
  timed with the 500.
- Code reads. `main`:
  - The lines the Cause names; `User::hasRole()` and
    `User::getRoles()` (a null context read as the site level);
    `PolicyAuthorizer::handle()` (the role policies run before the
    route's middleware); ui-library `Form.vue` `error()` (a 500 becomes
    `common.unknownError`, the notice in Observed).
  - `HighlightsController`'s methods' null-context branches;
    `PKPIndexHandler::getHighlights()` and each app's `indexSite.tpl`
    (the site's carousel); `AdminHandler::getHighlightsListPanel()`.
  - A scan of every `roleAuthorizer([...])` in lib/pkp `api/v1` and
    each app's `api/v1` and `plugins` for lists that put a journal role
    before the site administrator, then a check of each for
    `has.context` or a context policy. Only highlights has neither.
- 3.5: the same `HasRoles.php` (identical file in the three apps'
  `stable-3_5_0` lib/pkp) and the same `HighlightsController`
  middleware.
- 3.4 (`origin/stable-3_4_0` in lib/pkp, `upstream/stable-3_4_0` in
  the apps): no `HasRoles` middleware. The API runs on Slim
  (`APIHandler`), and `HighlightsHandler` checks roles through the
  same policies as `authorize()` on `main`, which keep the site
  administrator's operations at the site level. OJS 3.4 carries
  highlights behind a `[features] highlights` setting that
  `config.TEMPLATE.inc.php` does not list (`AdminHandler`,
  `PKPIndexHandler::getHighlights()`); OMP and OPS 3.4 do not mount the
  endpoint. The `main` upgrade `I9262_Highlights` creates the tables
  only when they are missing. 3.3 (`stable-3_3_0`, the same remotes):
  no highlights in pkp-lib or the apps.
- Introduced: `git blame` on `main`'s line 63 gives 6f727bb567
  ("Add exception handling and code cleanup", 2024-08-02); `git log`
  on the file gives its parent 8f0583b1f6 and, before the PR,
  71e79e31e3 (`pkp/pkp-lib#9176`, 2023-10-13), which added the
  middleware. The GitHub API's `commits/<sha>/pulls` gives `pkp/pkp-lib#10267` for
  both commits, merged 2024-08-03; its review comment on
  `HasRoles.php` (touhidurabir) names the null call.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library): "site highlights", "highlights admin site settings
  save", "highlights 500", "highlights order error", "highlights site
  level", "getId() on null" with highlights and with site, `HasRoles`,
  "HasRoles.php", open PRs on `HasRoles`. Read, and not the same fault:
  `pkp/pkp-lib#10714` (a theme option saved at the site level),
  `pkp/pkp-lib#10061` (the Highlights tab shown in 3.4 without its
  setting), `pkp/pkp-lib#11666` (an open PR that does not touch
  `HasRoles`). No commit after 6f727bb567 touches `HasRoles.php` on
  pkp-lib's `main` or `stable-3_5_0`.
- Tips. `main`: OJS ff004d0973 with lib/pkp 987776cd04; OMP 3b0ecf794c
  and OPS c8af945bb7, both with lib/pkp 3dc90c81a6. `stable-3_5_0`:
  OJS c1cee76b95 with lib/pkp 771474347e; OMP 9c5e24246c and OPS
  38b61882d3, both with lib/pkp cf3f984335. `stable-3_4_0`: lib/pkp
  767353f4fe; OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b.
  `stable-3_3_0`: lib/pkp ac3fa73402; OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161.
- Not verified: the stored-highlights case of an OJS site upgraded
  from 3.4 (read in the code only).
