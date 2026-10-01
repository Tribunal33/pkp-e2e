# Typing a page preview's address below manager level, or signed out, gives a blank page

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code). Signed in, the page holds only the
    sentence "The current user is not permitted to preview.", with no
    other detail. Signed out, the page is blank.
  - 3.3: OJS, OMP, OPS (code). Everyone gets that one-sentence page.
    The exception is a signed-out visitor on PHP 8, who gets a blank
    page.
- **Introduced** `pkp/pkp-lib#2813` for `pkp/pkp-lib#2178` · [46c4132edd](https://github.com/pkp/pkp-lib/commit/46c4132edd9f2f80313d74fd82e1cc810167a555) · 2017-06-15 · Dimitris Efstathiou (defstat), which copied the check from the static pages plugin's preview: [cfb2a67567](https://github.com/pkp/staticPages/commit/cfb2a6756721e1d32ba29f0a1dce96dea656d9c2) · 2014-09-26 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The application fails on the server when anyone below manager level (a
section editor, an assistant, an author, a reviewer, a reader) types the
address of a page preview, or when a signed-out visitor does: the
browser shows a blank page. The addresses are the custom page preview,
{journal address}/navigationMenu/preview, and, with "Static Pages
Plugin" on, the static page preview, {journal address}/pages/preview.
The person who types the address expects the access-denied page, or
Login when signed out.

Nothing is lost: only managers and the Site Administrator may preview,
and no link leads anyone else to these addresses. But the person gets no
page and no reason, and every such visit adds a server error to the
log. The fix is a few lines, but in two repositories (pkp-lib, and the
Static Pages plugin with its pointer in OJS and OMP), hence medium
effort; within one it would be small.

## Impact

- **Lost**: nothing; the person is not told why the page is empty.
- **Who**: anyone below manager level, or signed out, who opens one of
  the two addresses by hand, from a bookmark or from a link someone
  shared.
- **Way round**: none needed; the manager's own "Preview" buttons work.

Low: a refusal that shows the wrong page; it would rise only if a screen
led people to these addresses.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
- {OJS OMP} "Static Pages Plugin" turned on, since the dataset leaves
  it off: sign in as `rvaca` (password `rvacarvaca`), open Settings ›
  Website › "Plugins" › "Installed Plugins", tick "Static Pages Plugin"
  under "Generic Plugins", and sign out.

Steps:

1. Sign in as `dbuskins`, a section editor (series editor in OMP,
   moderator in OPS).
2. Type `/index.php/publicknowledge/navigationMenu/preview` in the
   browser's address bar.
3. {OJS OMP} Type `/index.php/publicknowledge/pages/preview`.
4. Sign out and sign in as an author (`amwandenga` in OJS, `aclark` in
   OMP, `ccorino` in OPS). Repeat steps 2 and 3.
5. Sign out. As a visitor, repeat steps 2 and 3.

**Expected**: signed in, the access-denied page; signed out, the Login
page.

**Observed**: every address shows a blank page, for the section
editor, the author and the visitor alike.
The address moves to `/index.php/publicknowledge/en/…/preview` and
answers status 500 with an empty body. The server log has, signed in:

```
PHP Fatal error:  Uncaught Exception: The current user is not permitted to preview. in …/lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php:60
PHP Fatal error:  Uncaught Exception: The current user is not permitted to preview. in …/plugins/generic/staticPages/StaticPagesHandler.php:64
```

and signed out:

```
PHP Fatal error:  Uncaught TypeError: array_intersect(): Argument #2 must be of type array, null given in …/lib/pkp/pages/navigationMenu/NavigationMenuItemHandler.php:59
PHP Fatal error:  Uncaught TypeError: array_intersect(): Argument #2 must be of type array, null given in …/plugins/generic/staticPages/StaticPagesHandler.php:63
```

Control: `rvaca`, the manager, at the same addresses gets the journal's
page with an empty heading, as expected for a preview with nothing
typed.

## Cause

Both previews test the user's roles inside the page operation itself,
after authorization has already let the request through, and end the
request when the test fails:

- `NavigationMenuItemHandler::preview()` (pkp-lib,
  `pages/navigationMenu/NavigationMenuItemHandler.php`, lines 58–61).
- `StaticPagesHandler::view()` for an unsaved page, which is what
  `StaticPagesPlugin::callbackHandleContent()` builds for `pages/preview`
  (pkp/staticPages, `StaticPagesHandler.php`, lines 62–65).

Each reads the roles with
`getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES)` and
throws `\Exception('The current user is not permitted to preview.')`
when neither the manager nor the site administrator role is among them.
Nothing catches that exception, so the request ends as a 500 with an
empty body. A signed-out request fails one step earlier:
`PKPHandler::authorize()` adds `UserRolesRequiredPolicy` only for a
signed-in user, so the roles are `null` and `array_intersect()` throws a
`TypeError`.

The rule the code breaks: a page that only some roles may open is
refused in `authorize()`, by a policy. When a policy refuses,
`PKPRouter::_authorizeInitializeAndCallRequest()` calls
`PKPPageRouter::handleAuthorizationFailure()`, which sends a signed-out
visitor to Login and anyone else to `user/authorizationDenied`.

The pkp-lib check was copied from the Static Pages plugin's preview
(cfb2a67567, 2014) when custom pages were added (46c4132edd). Both
called `fatalError()` until 2024. `fatalError()` printed the message
as a heading on an otherwise empty page and stopped. A signed-in user
got that page. So did a signed-out one on PHP 7, where
`array_intersect()` with `null` only warns instead of throwing. "Use
exceptions instead of fatalError" (pkp-lib
[ac0e09ebe2](https://github.com/pkp/pkp-lib/commit/ac0e09ebe29714409fa58191e827f09ab8322d77),
staticPages
[9ad23c8abc](https://github.com/pkp/staticPages/commit/9ad23c8abc85eb1abf63df20b4ae65435f3e2435),
2024-07-11, on main and 3.5) turned the message into an empty 500.

Reach:

- The custom page preview: all three apps (walked).
- The static page preview: OJS and OMP, which ship the plugin (walked).
- The site's own custom page preview, `/index.php/index/navigationMenu/preview`,
  goes through the same method (read in the code; only the site
  administrator was walked there, who gets the page).
- No other page handler in pkp-lib, the three apps or their bundled
  plugins ends the request on a role test like this (searched in the
  code).

## Proposed fix

Refuse the preview in `authorize()`, with the policy the code base
uses for role-limited operations, `RoleBasedHandlerOperationPolicy`, and
drop the test from the operations.

In pkp-lib, `NavigationMenuItemHandler`:

```diff
     public function authorize($request, &$args, $roleAssignments)
     {
+        // Only a manager or a site administrator may preview unsaved content;
+        // anyone else gets the access-denied page, or Login when signed out.
+        if (!isset($this->nmi) && $request->getRequestedOp() === 'preview') {
+            $this->addPolicy(new RoleBasedHandlerOperationPolicy($request, [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN], 'preview'));
+        }
+
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

In pkp/staticPages, `StaticPagesHandler` gets the same `authorize()`,
keyed on the unsaved page (`if (!$this->staticPage->getId())`), and
`view()` loses its test. The full diffs, relative to the app root:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/fix-omp.diff)
(both files),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/fix-ops.diff)
(pkp-lib only). The OJS and OMP files hold both repositories' changes,
so a PR applies them in two parts. For pkp-lib, apply `fix-ops.diff`
with `git apply -p3`; it is the same pkp-lib change the other two files
open with. For pkp/staticPages, cut the last file section of
`fix-ojs.diff` (the one under `plugins/generic/staticPages/`) into a
file of its own and apply that with `git apply -p4`.

The `!isset($this->nmi)` and `getId()` conditions keep the policy off
saved pages. A saved page is served by the same classes and must stay
public, including a custom page whose path happens to be
"navigationMenu/preview". The policy compares `'preview'` with the
operation named in the address (`getRequestedOp()`). For the static page
preview that is still `preview`, even though the plugin then serves the
request through `view()`.

`LoginHandler::authorize()` is the precedent: a switch on
`getRequestedOp()` that adds `RoleBasedHandlerOperationPolicy` with the
same two roles for `signInAsUser` alone, while the handler's other
operations stay public.

Tried on `main` on the three apps. With the fix, the walk's section
editors and authors got the access-denied page, "The current role does
not have access to this operation.", and the visitor got Login; the
manager still got the preview page. What the fix must leave alone
behaved the same with the fix in and out:

- "Preview" in the "Custom Page" item window and in the static page
  window showed the typed title and text.
- The saved pages opened for a signed-out visitor.
- The site administrator's typed site-level preview address opened.

**Alternatives**

- Keep the test in the method, cast the roles to an array and call
  `handleAuthorizationFailure()` by hand. The result is the same, but
  the rule stays inside the operation, where authorization is not
  meant to live, and in two copies.
- Answer 404 (`NotFoundHttpException`), as other pages do for content
  that is hidden. That hides the reason, and gives no Login to a
  manager whose session has ended.
- `addRoleAssignment()` for `preview`. With a role assignment declared,
  `PKPHandler::authorize()` requires a role policy to approve every
  operation of the handler, so the public `view` would be refused.

**What goes with it**

- No stored data, REST API or plugin hook changes. A manager whose
  session has ended and who presses "Preview" gets the Login page in
  the preview tab instead of a blank tab (by the code, not walked).
- Two repositories: pkp-lib, and pkp/staticPages with its submodule
  pointer in OJS and OMP.
- Backport: on 3.5 the files are the same, so the diffs apply as they
  stand (not tried there). 3.4 has the same classes with `fatalError()`
  in place of the `throw`. 3.3 has `.inc.php` files, unnamespaced
  constants and an
  `import('lib.pkp.classes.security.authorization.RoleBasedHandlerOperationPolicy')`.
- Guard: the e2e scenario "A preview's address typed by hand" in spec
  U09, which asserts the access-denied page and Login once fixed (a
  **Planned** item).

Medium: a few lines in each of two repositories, following an existing
pattern; it would be small within one.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/lib.js);
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-preview-address-blank-page/neighbour.js)
  walks what the fix must leave alone, with the fix in and out. On an
  install freshly loaded from the default dataset, from a pkp-e2e
  checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/typed-preview-address-blank-page/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix, per app:
  `node bin/try-fix.js apply shared/playwright/checks/issues/typed-preview-address-blank-page/fix-<app>.diff <app>`.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01).
- Walked on main and 3.5, the three apps; 3.5 showed the same 500s
  with the same log lines. Not driven here: the fix on 3.5; an Editor
  without "Permit changes to Settings" (a manager-level role, so the
  code lets it preview; the spec U09 walk saw the preview page); a
  journal closed to visitors (the spec U09 walk saw the signed-out
  request sent to Login first); a manager's session ending with a
  "Preview" pending.
- Code reads. main and 3.5: `NavigationMenuItemHandler::preview()`,
  `StaticPagesHandler::view()`, `StaticPagesPlugin::callbackHandleContent()`,
  `PKPHandler::authorize()` (the roles only for a signed-in user, the
  role-assignment rule), `PKPRouter::_authorizeInitializeAndCallRequest()`,
  `PKPPageRouter::route()` and `handleAuthorizationFailure()`,
  `RoleBasedHandlerOperationPolicy`, `HandlerOperationPolicy::_checkOperationWhitelist()`.
  3.4 (`git show origin/stable-3_4_0:` in lib/pkp; the plugin at OJS's
  and OMP's pointer 9568981e8c, read on raw.githubusercontent.com) and
  3.3 (`origin/stable-3_3_0`; plugin 8c97bd09d4): the same tests,
  calling `fatalError()`. It echoes the message in an `<h1>`, adds a
  stack trace only when `[debug] show_stacktrace` is On (Off in
  `config.TEMPLATE.inc.php` on both branches), and exits. On 3.4, which
  runs on PHP 8, a signed-out request's `null` roles throw the
  `TypeError`. On 3.3 they throw it on PHP 8; on PHP 7 they reach
  `fatalError()`.
- Introduced: `git blame` on the `throw` gives ac0e09ebe2 (pkp-lib) and
  9ad23c8abc (staticPages), which replaced `fatalError()`; `git log -S`
  on the message finds the test's first commit, 46c4132edd in pkp-lib
  (PR `pkp/pkp-lib#2813`, merged 2017-10-02) and cfb2a67567 in
  staticPages ("Add preview option", no PR).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/staticPages): "not
  permitted to preview", navigationMenu preview, preview 500,
  static pages preview, `NavigationMenuItemHandler`. Read and not the
  same fault: `pkp/pkp-lib#2899` (closed; a custom page's link pointed
  at the wrong address and reached this message), `pkp/pkp-lib#4468`
  (closed; the site-level `view`).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  staticPages 45d02c085e in OJS and OMP. `stable-3_5_0` OJS 3517e640f2
  with lib/pkp b1981810da; OMP c7b45f88ea and OPS 8eaf899468 with
  lib/pkp 1fb843f491; staticPages fb9b499e6f. `stable-3_4_0`: OJS
  75cc2d488b, OMP 0aec65441f, OPS acd8ae704b. `stable-3_3_0`: OJS
  ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161.
