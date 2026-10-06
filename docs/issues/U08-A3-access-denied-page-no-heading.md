# The access-denied page a signed-in user gets has an empty heading and an unnamed browser tab

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [325751be21](https://github.com/pkp/pkp-lib/commit/325751be218d1d6fcb53bd929a37f373e07e363b) (2016-02-03)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A signed-in user who opens a page their role may not see gets the
access-denied page. Its heading is empty, its breadcrumb ends "Home /"
with nothing after it, and the browser tab shows only the journal's
name, or nothing at all on the site's own pages. Below that, the page
reads "The current role does not have access to this operation.".

The page has no name anywhere, so a screen reader announces a heading
with no text and a list of tabs shows a tab without a name.

Most pages that refuse a signed-in user send them here: a settings or
administration address opened by a role without access, an old
bookmark, a link a colleague sent, a role that has since been removed.

## Impact

- **Lost.** The page's name, in the heading, the breadcrumb and the
  browser tab. The refusal itself is shown and is correct.
- **Who.** Any signed-in user refused a page, in any role, on the
  journal's, press's, server's or site's pages, now and then in
  ordinary use.
- **Way round.** None is needed: the sentence says what happened, and
  the header's menus and the breadcrumb's "Home" lead on.

Low: a page title is missing while the outcome is shown correctly. It
would be medium if the team rates every page that fails WCAG 2.4.2 Page
Titled at that level.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.

Steps:

1. Sign in as `dbuskins`, a section editor of the journal (a series
   editor on the press, a moderator on the preprint server). The role
   has no access to the context's settings or to the site's
   administration.
2. Type the address of the journal's settings,
   `/index.php/publicknowledge/en/management/settings/context` (the page
   a manager opens from Settings › "Journal").
3. Type the address of the site's administration,
   `/index.php/index/en/admin`.

**Expected.** In both steps, a page headed with its name, "Access
denied.", under the breadcrumb "Home / Access denied.", in a browser
tab titled "Access denied. | Journal of Public Knowledge" (step 3:
"Access denied."); then "The current role does not have access to this
operation.".

**Observed.** Both steps land on
`…/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
(step 2 under `/index.php/publicknowledge/en/`, step 3 under
`/index.php/index/en/`), which answers 200 and shows:

```
Home /
The current role does not have access to this operation.
```

Its level-one heading is there but empty. The browser tab reads "|
Journal of Public Knowledge" in step 2 ("| Public Knowledge Press", "|
Public Knowledge Preprint Server") and is empty in step 3.

Signed out, the step 2 address opens the Login page instead, headed
"Login".

## Cause

The generic message page, `lib/pkp/templates/frontend/pages/message.tpl`,
takes its name from the template variable `pageTitle`. It passes it to
the breadcrumb and prints it in the heading, and
`frontend/components/headerHead.tpl` prints it as the tab's title,
followed by " | " and the context's name on a context's pages:

```smarty
	{include file="frontend/components/breadcrumbs.tpl" currentTitleKey=$pageTitle}
	<h1>
		{translate key=$pageTitle}
	</h1>
```

`PKP\pages\user\PKPUserHandler::authorizationDenied()`
(`lib/pkp/pages/user/PKPUserHandler.php`, from line 40 on `main`)
shows the refusal through that page and assigns only the message, at
line 54:

```php
        $this->setupTemplate($request);
        $templateMgr = TemplateManager::getManager($request);
        $templateMgr->assign('message', $authorizationMessage);
        return $templateMgr->display('frontend/pages/message.tpl');
```

With no `pageTitle`, the heading, the breadcrumb's last part and the
tab's title before " | " are empty. On the site's pages there is no
context name to follow the " | ", so the tab is empty. OJS, OMP and OPS
all route `user/authorizationDenied` to this method (`pages/user/index.php`);
none of their `UserHandler` subclasses overrides it.

The heading went empty with the frontend redesign, 325751be21
(`pkp/pkp-lib#996`), which made `message.tpl` print `pageTitle` as the
page's heading. The template's callers that reset a password or
register a user assign a `pageTitle` (`LoginHandler`, and
`RegistrationHandler::register()` for a completed or pending
registration).

Reach:

- Every page refusal that goes through a handler's authorization
  policies. When `PKPRouter::_authorizeInitializeAndCallRequest()`
  finds a page handler's `authorize()` refusing,
  `PKPPageRouter::handleAuthorizationFailure()` (line 390) sends a
  signed-in user to `user/authorizationDenied` with the denying
  policy's message, and a signed-out visitor to Login. It is the only
  redirect to this page in the three apps and pkp-lib. Checked on
  screen for the role-based refusal of a context page and of a site
  page, and for the refusal without a message of its own (below);
  the other messages reach the same method, checked in the code.
- Not every refusal: a few handlers answer a bare "403 Forbidden"
  themselves and never reach this page (OJS `ArticleHandler`, line
  592, for a file download; pkp-lib `LibraryFileHandler`, lines 65 and
  116).
- A separate matter, not part of this fault: an address whose issue or
  book does not exist also gives a signed-in user this page rather than
  a "not found" page; the book side has its own report,
  [U69-A1-unknown-book-address-asks-sign-in.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A1-unknown-book-address-asks-sign-in.md).
- Other pages that use `message.tpl` without a `pageTitle`, not covered
  here (checked in the code, pkp-lib and the three apps on `main`):
  `RegistrationHandler::activateUser()` for an account already
  activated; the two API-token messages of OJS's
  `ArticleHandler::authorize()`; and the PayPal payment method's error
  page in OJS and OMP, which has its own report,
  [U52-A10-paypal-error-page-no-heading.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U52-A10-paypal-error-page-no-heading.md).
  Each names its page differently, so each is its own fix.

## Proposed fix

Assign the page's name where the handler assigns its message. This is
a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/access-denied-page-no-heading/fix.diff),
one change in pkp-lib that covers the three apps.

```diff
         $this->setupTemplate($request);
         $templateMgr = TemplateManager::getManager($request);
-        $templateMgr->assign('message', $authorizationMessage);
+        $templateMgr->assign([
+            'pageTitle' => 'user.authorization.accessDenied',
+            'message' => $authorizationMessage,
+        ]);
         return $templateMgr->display('frontend/pages/message.tpl');
```

This follows how the template's other callers name their pages
(`LoginHandler` assigns `pageTitle` beside the message). The key
`user.authorization.accessDenied` ("Access denied.") already exists in
pkp-lib's `user.po`, translated in 54 of the 71 languages pkp-lib
ships, so the page is named in most languages at once.

`user.authorization.accessDenied` is also the message
`PKPRouter::_authorizeInitializeAndCallRequest()` gives a refusal that
names none of its own. On such a refusal the page reads "Access
denied." twice, as its heading and as the sentence below it. That
happens, for example, when the site administrator opens
`/index.php/publicknowledge/en/admin`: `AdminHandler::authorize()`
refuses the site's Administration under a journal's address without a
message. The repeat is accepted here: the page is still correct and
named, while a key of its own would cost more (Alternatives, first
bullet).

Tried on `main`, OJS, OMP and OPS: both steps' pages are headed
"Access denied." under "Home / Access denied.", in a tab titled
"Access denied. | Journal of Public Knowledge" (the press's and the
server's names on the other apps; "Access denied." alone on the site's
page), with the refusal sentence unchanged. The administrator's
refusal above reads "Access denied." as heading and sentence. Signed
out, the same address still opens Login, and the "Reset Password"
message page keeps its own heading, breadcrumb and tab, with the fix in
and out.

**Alternatives**

- A new key without the full stop (such as "Access denied"): a cleaner
  heading and tab, and no repeat on a refusal without a message. But
  pkp-lib's `Locale::translate()` does not fall back to English, so
  every interface language without the new string, French in the
  default dataset among them, would show the raw `##key##` as the
  page's heading until translators add it.
- Leave the heading out of `message.tpl` when `pageTitle` is empty:
  that hides the empty heading on every such page, but the tab and the
  breadcrumb stay unnamed, and a caller that forgets its title is no
  longer noticed.
- Name the page in `PKPPageRouter::handleAuthorizationFailure()`: the
  redirect carries only the message in the address, so the title would
  have to travel there too, for no gain over the handler.

**What goes with it**

- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`, where the method reads the same (dry run).
  `stable-3_3_0` has the method in `PKPUserHandler.inc.php` with the
  same `assign` line and takes the same change by hand; it already
  loads the user locale file that holds the key.
- The other `message.tpl` callers without a title (Cause, last bullet)
  are not covered.
- Guard: a Planned item in spec U08 on the access-denied page (Rule
  26a), reading its heading, breadcrumb and tab title.

Small: one assignment in one shared pkp-lib method, using a key that
is already translated, tried on all three apps, with no stored data
involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/access-denied-page-no-heading/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/access-denied-page-no-heading/walk.js`.
  It records each page's answer, tab title, level-one headings,
  breadcrumb and text. `neighbour` as the script's argument runs the
  neighbour checks alone: signed out, the step 2 address (Login), and
  Login › "Forgot your password?" › "Reset Password" for
  `dbuskins@mailinator.com` (the "Reset Password" message page).
  `generic` runs the refusal without a message of its own alone: `admin`
  opens `/index.php/publicknowledge/en/admin`.
- No request in the walks answered an error and no page script failed.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/access-denied-page-no-heading/fix.diff ojs omp ops`,
  then walk.js, walk.js `neighbour` and walk.js `generic` with the same
  command, then `revert` and walk.js `neighbour` and `generic` again.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each): the same result on the three apps,
    and the same method and template as `main`.
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib 9e41f10273. `PKPUserHandler::authorizationDenied()`
  assigns `message` alone, `message.tpl` prints `pageTitle` in its `h1`,
  `PKPPageRouter` redirects a signed-in user there, and each app's
  `pages/user/index.php` routes the operation to it.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib ac3fa73402. `PKPUserHandler.inc.php` and
  `PKPPageRouter.inc.php` do the same, with the same template.
- Introduced: the method has never assigned a title. `git blame` on the
  `assign` line gives the PSR-12 reformat e3f570bc37; behind it the line
  arrives with b6f1183375 (2012-12-06, "Reconcile User code"), which
  moved the method from OJS's `UserHandler` into pkp-lib, and it is
  unchanged since. The `message.tpl` of that time printed no title.
  325751be21 (2016-02-03) gave `message.tpl` the breadcrumb with
  `currentTitleKey=$pageTitle`, and that breadcrumb then held the page's
  `h1`, so the empty title became an empty heading. 0fafa678a7 (2019)
  later moved the `h1` out of the breadcrumb into `message.tpl` itself.
- Not driven: the refusals with other messages (a submission the user
  is not assigned to, an issue or book that does not exist); the page in
  another interface language.
- WCAG: the tab title does not describe the page (2.4.2) and the `h1`
  has no text (2.4.6).
- Upstream search 2026-10-03: pkp/pkp-lib by "authorization denied page
  title", "access denied heading empty", "authorizationDenied", "current
  role does not have access" title, "message.tpl pageTitle", "empty h1
  message page", "PKPUserHandler", "Access denied" breadcrumb,
  "roleBasedAccessDenied page" and "page_message" heading; pkp/ojs by
  "authorizationDenied" and "access denied empty title"; pkp/omp and
  pkp/ops by "access denied page title"; pkp/ui-library by "access
  denied". `pkp/pkp-lib#6768` (closed) is about the Administration
  link refusing a journal manager, and `pkp/pkp-lib#10670` and
  `pkp/pkp-lib#10771` (closed) only name the page as where a refused
  workflow address lands; none is about its heading.
