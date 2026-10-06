# A new user activating their account sees two pages with no heading and no Login link

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; only the thank-you page: no confirmation page there)
  - 3.3: OJS, OMP, OPS (code; only the thank-you page: no confirmation page there)
- **Introduced** Neither page ever had a title.
  - Confirmation page: `pkp/pkp-lib#11880` (issue `pkp/pkp-lib#11690`) · [87a1270c72](https://github.com/pkp/pkp-lib/commit/87a1270c7273f6e5eb9efc97647b4478c67d67d2) · 2025-09-30 · Touhidur Rahman (touhidurabir), which added the page without one.
  - Thank-you page: no title since at least [ef67dc76c4](https://github.com/pkp/pkp-lib/commit/ef67dc76c41912bed280a098fc643111e4f39a59) (2013-06-27, when the code moved into pkp-lib) · Alec Smecher (asmecher); [325751be21](https://github.com/pkp/pkp-lib/commit/325751be218d1d6fcb53bd929a37f373e07e363b) (2016-02-03) turned that into an empty heading.
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U02 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The page the emailed activation link opens ("Confirm and activate your
account") and the page after "Activate Account" (the thank-you
sentence) both have no heading. The title area and the current
breadcrumb are empty, and the browser tab shows only the journal's
name, where the other one-message pages (such as "Reset Password" or
"Registration awaiting verification") carry a title. The second page
says the user "may now log in" but offers no Login link; its only link
is the breadcrumb's "Home".

It happens only where an administrator has turned on email validation
for new accounts (`require_validation` in the install's configuration
file, off by default), on every journal, press or server of that
install.

## Impact

- **Lost.** Nothing done is lost: the account is activated. What is
  missing is the pages' names and the next step.
- **Who.** Every newcomer who registers there, once, at their first
  contact with the journal; most of all screen-reader users, who rely
  on the page title and heading to know where they are.
- **Way round.** The header's "Login" link opens the Login page, and
  signing in there works.

Low: the pages lack a title and a link while the outcome is right. It
would be medium if the team rates every page that fails WCAG 2.4.2 Page
Titled at that level.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`. The journal has a technical support contact
  (Ramiro Vaca), who sends the validation email.
- The install's `config.inc.php` reads `require_validation = On` under
  `[email]` (the dataset's own file has it Off), and its mail reaches a
  mailbox you can read.

Steps:

1. Signed out, open the journal's "Register" page. Type "u02c" in
   "Given Name", "Reader" in "Family Name", "u02c" in "Affiliation",
   choose "Canada" in "Country", type `u02creader@mailinator.com` in
   "Email", `u02creader` in "Username" and `u02creaderu02creader` in
   "Password" and "Repeat password", tick the privacy consent box and
   press "Register".
2. Open the email "Validate Your Account" sent to
   `u02creader@mailinator.com` and follow its link.
3. Press "Activate Account".

**Expected.** Both pages are named in the heading, the breadcrumb and
the browser tab, such as "Activate Account", "Home / Activate Account"
and "Activate Account | Journal of Public Knowledge". The page after
step 3 shows the thank-you sentence and a "Login" link under it, as the
"Reset Password" page does after a password reset request.

**Observed.** Step 1 lands on a page headed "Registration awaiting
verification", with the same breadcrumb and tab. Step 2's page,
`/index.php/publicknowledge/en/invitation/accept?id=…&key=…`, answers
200 and shows:

```
Home /
Confirm and activate your account
Activate Account
```

It has no level-one heading, and the browser tab reads "| Journal of
Public Knowledge" ("| Public Knowledge Press", "| Public Knowledge
Preprint Server"). Step 3's page,
`/index.php/publicknowledge/en/user/activateUser/u02creader?invitationId=…&invitationKey=…`,
answers 200 and shows:

```
Home /
Thank you for activating your account. You may now log in using the credentials you supplied when you created your account.
```

Its level-one heading is there but empty, the tab reads the same, and
the page body holds no link. The header still offers "Register" and
"Login".

## Cause

Both pages render the breadcrumb from the template variable
`pageTitle`, and neither page's code assigns it.

The page the link opens is
`lib/pkp/templates/frontend/pages/userConfirmActivation.tpl`, shown by
`PKP\invitation\invitations\registrationAccess\handlers\RegistrationAccessInviteRedirectController::acceptHandle()`,
which assigns only `activationUrl`. The template passes no title to
`frontend/components/header.tpl` (which builds the tab's title from
`pageTitle`), passes the unassigned `$pageTitle` to the breadcrumb, and
has no `<h1>`:

```smarty
 {include file="frontend/components/header.tpl"}

 <div class="page">
     {include file="frontend/components/breadcrumbs.tpl" currentTitleKey=$pageTitle}
```

The template and the confirmation step came with 87a1270c72
(`pkp/pkp-lib#11690`), so that a mail client's link scanner opening the
emailed link no longer activates the account by itself.

The page after "Activate Account" is the generic
`lib/pkp/templates/frontend/pages/message.tpl`, which prints
`pageTitle` in its `<h1>` and breadcrumb and a "back" link only when
`backLink` is assigned. `PKP\pages\user\RegistrationHandler::activateUser()`
(`lib/pkp/pages/user/RegistrationHandler.php`, line 185 on `main`)
assigns only the message:

```php
            if ($user->getDateValidated() != null) { // The user is activated
                $templateMgr = TemplateManager::getManager($request);
                $templateMgr->assign('message', 'user.login.activated');
                return $templateMgr->display('frontend/pages/message.tpl');
            }
```

The other pages of the same flows name themselves: the same handler's
`register()` assigns `pageTitle` for "Registration awaiting
verification", and `LoginHandler`'s password-reset pages assign
`pageTitle` together with `backLink` and `backLinkLabel` =
`user.login`, which gives them their "Login" link.

Reach:

- The journal's Register page: checked on screen on OJS, OMP and OPS.
- The site's Register page: the email links to the same two pages under
  `/index.php/index/`, through the same controller, handler and
  templates (checked in the code). There the browser tab's title is
  empty altogether: `frontend/components/headerHead.tpl` adds " | " and
  the context's name only when there is a context, so the browser shows
  the page's address instead.
- An activation link in the older form `user/activateUser/{username}/{key}`
  (sent before invitations handled activation) reaches the same
  confirmation page through `activateUser()`'s first branch, which calls
  `acceptHandle()` (checked in the code).
- 3.4 and 3.3 have no confirmation page: the emailed link activates the
  account at once and shows the thank-you page through the same
  `assign('message', 'user.login.activated')` (checked in the code).
- Other `message.tpl` pages without a title have reports of their own:
  [U08-A3-access-denied-page-no-heading.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U08-A3-access-denied-page-no-heading.md)
  and
  [U52-A10-paypal-error-page-no-heading.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U52-A10-paypal-error-page-no-heading.md).
  The two API-token messages of OJS's `ArticleHandler::authorize()`
  also have no title and are not covered here.

## Proposed fix

Name both pages with the existing key `user.login.activate` ("Activate
Account"), and give the thank-you page the "Login" link the
password-reset pages have. This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-pages-no-heading/fix.diff),
two files in pkp-lib that cover the three apps.

```diff
--- a/lib/pkp/pages/user/RegistrationHandler.php
+++ b/lib/pkp/pages/user/RegistrationHandler.php
                 $templateMgr = TemplateManager::getManager($request);
-                $templateMgr->assign('message', 'user.login.activated');
+                $templateMgr->assign([
+                    'pageTitle' => 'user.login.activate',
+                    'message' => 'user.login.activated',
+                    'backLink' => $request->url(null, 'login'),
+                    'backLinkLabel' => 'user.login',
+                ]);
                 return $templateMgr->display('frontend/pages/message.tpl');
--- a/lib/pkp/templates/frontend/pages/userConfirmActivation.tpl
+++ b/lib/pkp/templates/frontend/pages/userConfirmActivation.tpl
- {include file="frontend/components/header.tpl"}
+ {include file="frontend/components/header.tpl" pageTitle="user.login.activate"}
 
  <div class="page">
-     {include file="frontend/components/breadcrumbs.tpl" currentTitleKey=$pageTitle}
+     {include file="frontend/components/breadcrumbs.tpl" currentTitleKey="user.login.activate"}
+     <h1>
+         {translate key="user.login.activate"}
+     </h1>
```

The handler change follows `LoginHandler`'s password-reset pages
("Reset Password" after a reset request, after a new password is set,
and for a disabled account), which show the same `message.tpl`. The template change follows
`userLostPassword.tpl`, a single-purpose page that names itself in the
header include, the breadcrumb and an `<h1>`. The key is already
translated in 53 of the 71 languages pkp-lib ships. The confirmation
step that `pkp/pkp-lib#11690` added stays as it is.

Tried on `main`, OJS, OMP and OPS. Both pages are headed "Activate
Account" under "Home / Activate Account", in a tab titled "Activate
Account | Journal of Public Knowledge" (the press's and the server's
names on the other apps). The thank-you page ends with a "Login" link,
which opens the Login page, and signing in there works. The "Reset
Password" page and the access-denied page read the same with the fix in
and out.

**Alternatives**

- A key of its own for each page ("Account Activated" after the press):
  it reads better on the second page, but it is a new string that every
  language must translate first.
- Assign `pageTitle` in `acceptHandle()` instead of the template: it
  works too, but the template serves this one page, and pages like it
  name themselves in the template.
- Leave the heading out of `message.tpl` when `pageTitle` is empty: that
  hides the empty heading, but the tab and the breadcrumb stay unnamed
  and the Login link is still missing.

**What goes with it**

- Backport: the handler hunk applies as it stands to `stable-3_5_0`;
  the template there differs in indentation only and takes the same
  lines by hand. 3.4 and 3.3 have no confirmation page; their
  `activateUser()` (`RegistrationHandler.inc.php` on 3.3) takes the
  handler change by hand, and the key is there on both.
- Guard: a Planned item in spec U02 (Rule 13), reading both pages'
  heading, breadcrumb and tab title and the Login link.

Small: a few lines in one handler and one template of pkp-lib, using a
key that is already translated, tried on all three apps, with no stored
data involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-pages-no-heading/walk.js)
  (helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activation-pages-no-heading/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/activation-pages-no-heading/walk.js`.
  It serves the install with `require_validation = On` from a copy of
  its configuration file on a port of its own (the helper
  `validationServer()` of
  [register-no-support-contact-empty-page/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/register-no-support-contact-empty-page/lib.js)),
  reads the email's link from the mailbox, and records each page's
  answer, tab title, level-one headings, breadcrumb, text and links.
  `neighbour` as the script's argument runs the neighbour checks alone:
  signed out, Login › "Forgot your password?" for
  `dbarnes@mailinator.com` ("Reset Password", with its Login link), and
  `dbuskins` typing the journal's settings address (the access-denied
  page).
- Where the walk differs from the Steps: after step 3 it opens Login
  from the page's own "Login" link when there is one, otherwise from
  the header, and signs in as `u02creader`.
- No request in the walks answered an error and no page script failed.
- The fix, tried 2026-10-04 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/activation-pages-no-heading/fix.diff ojs omp ops`,
  then walk.js and walk.js `neighbour` with the same command, then
  `revert` and walk.js `neighbour` again.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c
    and OPS 38b61882d3 (lib/pkp cf3f984335): the same result on the
    three apps. The handler and the controller read as on `main`, and
    the template differs in indentation only. The confirmation page came
    to the branch as 1da516b65c, the backport of 87a1270c72.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib 767353f4fe. The validation email
  (`ValidateRegisteredEmail`) links to `user/activateUser/{username}/{key}`;
  each app routes it to pkp-lib's `RegistrationHandler`, whose
  `activateUser()` enables the account and shows `message.tpl` with
  `message` alone. The template prints `pageTitle` in its `h1`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib ac3fa73402. `RegistrationForm.inc.php` builds
  the same link, and `RegistrationHandler.inc.php`'s `activateUser()`
  does the same, with the same template.
- Introduced: `git log` on `userConfirmActivation.tpl` gives its one
  commit, 87a1270c72, merged through `pkp/pkp-lib#11880`. `git blame`
  on the `assign('message', 'user.login.activated')` line gives
  596057ddfb (2023-08-31, which moved activation onto invitations,
  `pkp/pkp-lib#9197`); `git log -S` traces the
  line to ef67dc76c4 (2013-06-27, "Move registration to PKP lib"), and
  it has never assigned a title. 325751be21 (2016-02-03) gave
  `message.tpl` the breadcrumb built from `pageTitle`, which then held
  the page's `h1`, so the missing title became an empty heading.
- Not driven: the site's Register page, the older form of the
  activation link, and the pages in another interface language.
- WCAG: the tab titles do not describe the pages (2.4.2), and the
  thank-you page's `h1` has no text (2.4.6).
- Upstream search 2026-10-04: pkp/pkp-lib by "activate account page
  title", "activation page heading", "Confirm and activate your
  account", "Thank you for activating your account", "activateUser",
  "userConfirmActivation", "account activated login link" and
  "RegistrationAccessInviteRedirectController"; pkp/ojs by "activate
  account heading OR title"; pkp/omp, pkp/ops and pkp/ui-library by
  "activate account". `pkp/pkp-lib#11151` (closed) is about the
  invitation's accept and decline addresses answering 404, and
  `pkp/pkp-lib#7881` (closed) about an activation link without the
  username; neither is about these pages' heading or link.
