# Page previews fail blank for non-managers and signed-out users, and "Preview" goes silent once signed out

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; blank page signed out, a bare line of error text signed in)
  - 3.3: OJS, OMP, OPS (code; as 3.4 on PHP 8; on PHP 7 the bare line both ways)
- **Introduced** `pkp/pkp-lib#2813` for `pkp/pkp-lib#2178` · [46c4132edd](https://github.com/pkp/pkp-lib/commit/46c4132edd9f2f80313d74fd82e1cc810167a555) · 2017-06-15 · Dimitris Efstathiou (defstat); static pages: [cfb2a67](https://github.com/pkp/staticPages/commit/cfb2a6756721e1d32ba29f0a1dce96dea656d9c2) · 2014-09-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a7)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A preview address is {journal address}/navigationMenu/preview for a
custom page, or {journal address}/pages/preview for a static page when
"Static Pages Plugin" is on. When a Section Editor, Assistant, Author,
Reviewer or Reader opens one, the application fails on the server and
the browser shows a blank page; they expect the access-denied page. A
signed-out visitor gets the same blank page where Login is expected.

A manager meets the same failure when their session ends while a
Custom Page or static page window is open, for instance after signing
out in another tab. Pressing "Preview" then does nothing at all: no tab
opens and no message says they must sign in again.

The preview is rightly withheld from all of them. Only the answer is
wrong, and each such request writes a fatal error to the server's log.

## Impact

- **Lost.** Nothing. The manager's typed text stays in the open window.
- **Who.** Managers whose session ends while they edit a custom page or
  static page, each time they press "Preview". Below manager level and
  signed out, only someone who types a preview address or opens a
  bookmark of one: the addresses sit only in the scripts of
  manager-only windows, so crawlers do not reach them, and the log
  entries come from these typed requests and presses alone.
- **Way round.** The manager signs in again, then presses "Preview".

Low: nothing is lost and the preview is correctly withheld, but a
manager who has been signed out gets a dead button instead of Login.
It would be medium if "Preview" failed this way while still signed in.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), in
  OJS, OMP or OPS, context `publicknowledge`.
- For the static page cases (OJS and OMP; OPS does not ship "Static
  Pages Plugin"): the dataset leaves the plugin off. Sign in as `rvaca`
  (the manager), open Settings › Website › "Plugins", tick "Static Pages
  Plugin" ("The plugin "Static Pages Plugin" has been enabled."), sign
  out.

Signed in below manager level:

1. Sign in as `dbuskins` (a Section editor in OJS, Series editor in
   OMP, Moderator in OPS).
2. Type the address `/index.php/publicknowledge/navigationMenu/preview`.
3. (OJS, OMP) Type the address `/index.php/publicknowledge/pages/preview`.

Signed out:

4. Sign out.
5. Type `/index.php/publicknowledge/navigationMenu/preview`.
6. (OJS, OMP) Type `/index.php/publicknowledge/pages/preview`.

A manager whose session has ended:

7. Sign in as `rvaca`. Open Settings › Website › "Setup" › "Navigation"
   and press "Add item".
8. Type "Title" "About u09a7", pick "Custom Page" as the type, type
   "Path" "u09a7-page" and some "Content".
9. Press "Preview". A new tab shows "About u09a7" with the content.
10. In another tab of the same browser, open
    `/index.php/index/login/signOut`.
11. Back in the "Add item" window, press "Preview" again.
12. (OJS, OMP) Repeat steps 7 to 11 from Settings › Website › "Static
    Pages" › "Add Static Page", with "Path" "u09a7-static" and "Title"
    "Static u09a7".

**Expected.** Steps 2 and 3 open the access-denied page, which reads
"The current role does not have access to this operation.". Steps 5
and 6 open Login, which keeps the address to return to after signing
in. Steps 11 and 12 open a tab showing Login.

**Observed.** Steps 2, 3, 5 and 6 each show an empty page. The browser
is sent on to the same address with `/en` inserted after
`publicknowledge`, which answers HTTP 500 with an empty body. In steps
11 and 12 no tab opens and the window shows nothing; the preview
request (`POST …/navigationMenu/preview`, `POST …/pages/preview`)
answers HTTP 500. The server log, signed in (steps 2 and 3):

```
PHP Fatal error:  Uncaught Exception: The current user is not permitted to preview. in lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php:60
PHP Fatal error:  Uncaught Exception: The current user is not permitted to preview. in plugins/generic/staticPages/StaticPagesHandler.php:64
```

and signed out (steps 5, 6, 11 and 12):

```
PHP Fatal error:  Uncaught TypeError: array_intersect(): Argument #2 must be of type array, null given in lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php:59
PHP Fatal error:  Uncaught TypeError: array_intersect(): Argument #2 must be of type array, null given in plugins/generic/staticPages/StaticPagesHandler.php:63
```

Control: `rvaca`, signed in, at the addresses of steps 2 and 3 gets the
journal's page with an empty heading (a preview of nothing), status
200. Reloading the preview tab of step 9 after step 10 turns it blank
without asking the server, since the tab's page was written by the
window's script.

## Cause

`NavigationMenuItemHandler::preview()`
([NavigationMenuItemHandler.php](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/pages/navigationMenu/NavigationMenuItemHandler.php#L54-L61))
checks the user's roles inside the operation and, when they hold
neither the manager nor the site administrator role, throws a plain
`\Exception`, which nothing catches. For `pages/preview`,
`StaticPagesPlugin::callbackHandleContent()` hands an unsaved
`StaticPage` to `StaticPagesHandler::view()`, which does the same
([StaticPagesHandler.php](https://github.com/pkp/staticPages/blob/45d02c085ee125bf390f89e5bff1f0833838a647/StaticPagesHandler.php#L61-L65)).

Signed out, neither check reaches its throw. `PKPHandler::authorize()`
adds `UserRolesRequiredPolicy`, which sets the user's roles, only for a
signed-in user, so `getAuthorizedContextObject(ASSOC_TYPE_USER_ROLES)`
returns null and `array_intersect()` throws a `TypeError`. The
"Preview" buttons (`NavigationMenuItemsFormHandler.js` and the plugin's
`StaticPageFormHandler.js`, `showPreview_()`) post the form with
`$.post()` and open the tab only in the success callback, so a 500
leaves the manager with nothing.

The rule this breaks: a page handler refuses a user through an
authorization policy added in `authorize()`. When a policy denies,
`PKPPageRouter::handleAuthorizationFailure()` sends a signed-out user to
Login and anyone else to `user/authorizationDenied` with the policy's
message. These two checks refuse from inside the operation instead.
Both were written that way with `fatalError()` (a bare line of text,
then `die()`): in the static pages plugin in cfb2a67 ("Add preview
option", 2014) and in pkp-lib in 46c4132edd (`pkp/pkp-lib#2178`,
custom pages, 2017). In 2024,
[ac0e09ebe2](https://github.com/pkp/pkp-lib/commit/ac0e09ebe29714409fa58191e827f09ab8322d77)
and
[9ad23c8a](https://github.com/pkp/staticPages/commit/9ad23c8abc85eb1abf63df20b4ae65435f3e2435)
("Use exceptions instead of fatalError") replaced `fatalError()` with
exceptions across the code, which turned the bare line into a blank
500 for signed-in users. The `TypeError` for signed-out users comes from
PHP 8, where `array_intersect()` no longer accepts null.

The same fault reaches the site's own custom page preview
(`/index.php/index/navigationMenu/preview`), served by the same handler;
checked in the code, not walked.

## Proposed fix

A proposal; the team decides. Move each check into the handler's
`authorize()` as a `RoleBasedHandlerOperationPolicy` for the preview,
as `LoginHandler::authorize()` already does for `signInAsUser`, and
drop the in-operation check. In pkp-lib's
`pages/navigationMenu/NavigationMenuItemHandler.php`:

```diff
-use APP\core\Application;
 use APP\handler\Handler;
@@
 use PKP\navigationMenu\NavigationMenuItemDAO;
+use PKP\security\authorization\RoleBasedHandlerOperationPolicy;
 use PKP\security\Role;
@@ public function authorize($request, &$args, $roleAssignments)
     {
+        // Only managers and administrators may preview an unsaved item.
+        if (!isset($this->nmi) && $request->getRequestedOp() == 'preview') {
+            $this->addPolicy(new RoleBasedHandlerOperationPolicy($request, [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN], ['preview']));
+        }
         return parent::authorize($request, $args, $roleAssignments);
     }
@@ public function preview($args, $request)
         $context = $request->getContext();
-        // Ensure that if we're previewing, the current user is a manager or admin.
-        $roles = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES);
-        if (count(array_intersect([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN], $roles)) == 0) {
-            throw new \Exception('The current user is not permitted to preview.');
-        }
```

In the static pages plugin's `StaticPagesHandler.php`, a new
`authorize()` adds the same policy when `!$this->staticPage->getId()`,
`view()` loses its check, and the `use` lines change the same way. The
full change for both repositories is in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-address-blank-server-error/fix.diff).

Two details:

- The static pages policy lists `['preview']`, though the plugin's hook
  rewrites `$op` to `'view'` before the router calls the handler.
  `HandlerOperationPolicy::_checkOperationWhitelist()` compares the
  list with `PKPPageRouter::getRequestedOp()`, the operation from the
  address, which stays `preview`.
- The conditions (`!isset($this->nmi)`, `!getId()`) keep the policy off
  saved pages, so a saved custom page or static page whose path ends in
  `/preview` stays public.

Tried on `main`. With the fix in, steps 2 and 3 opened
`user/authorizationDenied` ("The current role does not have access to
this operation."), steps 5 and 6 opened Login with the address as its
`source`, and in steps 11 and 12 "Preview" opened a tab showing Login.
These kept working the same with the fix in and out: a signed-in
manager's "Preview" in both windows, the saved pages for a signed-out
visitor and for `dbuskins`, and the site administrator's typed preview.

**Alternatives**

- Keep the check in the operation and call
  `handleAuthorizationFailure()` there: the same answer, but it repeats
  by hand in each operation what the policy framework does, null
  guard included.
- Guard the null (`(array)`) and throw an HTTP 403 exception: no crash,
  but a signed-out user still gets no Login.

**What goes with it**

- No stored data, REST API or plugin hook changes. The error string
  "The current user is not permitted to preview." goes; the
  access-denied page shows `user.authorization.roleBasedAccessDenied`.
- OPS ships no static pages plugin, so it takes the pkp-lib part alone.
- Backport: the diff applies to `stable-3_5_0` without edits. 3.4 has
  the same classes with `fatalError()` in place of the throw, so the
  same change applies with that line differing. On 3.3 the files are
  `NavigationMenuItemHandler.inc.php` and `StaticPagesHandler.inc.php`,
  which load classes with `import()` rather than `use`, so the patch
  is rewritten for them.
- Test: an e2e check that opens both addresses signed out and as a
  Section Editor, and presses "Preview" after signing out.

Medium, because the fix spans two repositories (pkp-lib and
pkp/staticPages), though each part is a few lines following
`LoginHandler`'s pattern.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-address-blank-server-error/walk.js)
  takes steps 1 to 6 on a fresh load of the default dataset; with
  `session` it takes steps 7 to 12, and with `neighbour` the paths the
  fix must leave alone:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preview-address-blank-server-error/walk.js [session|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs omp`
  and, for OPS, the diff's pkp-lib part alone, then
  `node bin/try-fix.js revert ojs omp ops`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): steps 1 to 6 on `main` and
  `stable-3_5_0`, steps 7 to 12 on `main`, OJS, OMP and OPS. The fault
  does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2);
    pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    (OJS) and
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (OMP, OPS), the same `NavigationMenuItemHandler.php`; staticPages
    [45d02c085e](https://github.com/pkp/staticPages/commit/45d02c085ee125bf390f89e5bff1f0833838a647).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994);
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
    staticPages
    [fb9b499e6f](https://github.com/pkp/staticPages/commit/fb9b499e6f16b0a7f01ca130776bb993a0ec443b).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833);
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
    staticPages
    [9568981e8c](https://github.com/pkp/staticPages/commit/9568981e8c664a007735e0a2e11617c272793f56)
    (the pointer OJS and OMP record).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144);
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072);
    staticPages
    [8c97bd09d4](https://github.com/pkp/staticPages/commit/8c97bd09d4a732f6eb572ecc9237c9cde57efd40)
    (the pointer OJS and OMP record).
- Code read on 3.4: `fatalError()` prints the reason as an `<h1>` and
  calls `die()`. `RoleBasedHandlerOperationPolicy` and
  `PKPPageRouter::handleAuthorizationFailure()` exist there as on
  `main`.
- Code read on 3.3: signed out, PHP 7.3 and 7.4 only warn at
  `array_intersect()` and `count()`, then print the same bare line.
- Introduced: the GitHub API lists `pkp/pkp-lib#2813` for 46c4132edd
  and no pull request for cfb2a67, ac0e09ebe2 or 9ad23c8a.
  5acb705924 (`pkp/pkp-lib#2899`) later removed the same check from
  `view()`, leaving it on `preview()`.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops, pkp/ui-library and pkp/staticPages, by the symptom's words
  and by "not permitted to preview", `NavigationMenuItemHandler`,
  `StaticPagesHandler` and `pages/preview`. `pkp/pkp-lib#2899` (closed,
  2017) reported the same message on a saved custom page's address; its
  fix took the check out of `view()`, a different fault.
- Not driven: steps 7 to 12 on `stable-3_5_0` (the same code as
  `main`); a session ending by timeout rather than by signing out in
  another tab (both leave the request without a user); PHP 7 for 3.3.
