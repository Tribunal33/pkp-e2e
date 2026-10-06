# On the site-wide Profile page, every tab's "privacy statement" link opens "404 Not Found"

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3682` for `pkp/pkp-lib#3575` · [8235a21f27](https://github.com/pkp/pkp-lib/commit/8235a21f27b1299a0234aee6c761d6f491b0c68a) · 2018-05-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U03 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a14)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Every tab of the Profile page ends with "Your data is stored in
accordance with our privacy statement.". On the site-wide Profile page,
which a user with roles in several journals opens from the site's own
pages, the link opens a "404 Not Found" page, from every tab.

The link leads to the site's own Privacy Statement, which stays empty
until the Site Administrator writes one under Site Settings, so the
page promises a statement it cannot show.

## Impact

- **Lost**: nothing. The user who wants to read how their data is
  handled gets an error page instead, and is not pointed to any
  journal's statement.
- **Who**: users who hold roles in two or more journals (presses,
  servers), on the site-wide Profile page, on every site whose
  administrator has not written a site Privacy Statement. Neither a
  fresh install nor an upgrade writes one, so that is every
  multi-journal site until its administrator does (read in the code).
  The same page also serves users with no role in any journal and the
  Site Administrator of a site with two or more journals (read in the
  code).
- **Way round**: the Site Administrator writes a Privacy Statement
  under Administration › Site Settings › "Site Setup" ›
  "Information"; the link then opens it.

A journal's own Profile page has the same fault when the journal has no
Privacy Statement in any of its languages: the link then opens "404 Not
Found" too, and a site statement does not help there; only the
journal's manager writing one does (read in the code).

Low: the profile works, but a link on every tab leads to an error page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (OMP and OPS the same,
  with "Press" or "Server" in place of "Journal"). The site has no
  Privacy Statement; `publicknowledge` has one.
- A second journal and a role there for `dbarnes`, created in steps
  1–2, because the site-wide Profile page needs a user with roles in
  more than one journal (Cause).

Steps:

1. Sign in as `admin`. Administration › "Hosted Journals" › "Create
   Journal": "Journal title" "u03re Second Journal", "Journal initials"
   "U03RE", principal contact "u03re Second Journal" and
   "u03re@mailinator.com", "Country" "Canada", "Path" "u03re", "English"
   ticked and primary, "Enable this journal to appear publicly on the
   site" ticked, "Save".
2. On the "Settings Wizard" that opens, tab "Users": "Search" for
   "dbarnes" with "Include users with no roles in this journal" ticked,
   then on the row "dbarnes" › "Edit User", tick "Reader", "OK".
3. Sign out, and sign in as `dbarnes`.
4. Type the site-wide Profile page's address,
   `/index.php/index/en/user/profile` (the journal's Profile address with
   "index" in place of `publicknowledge`). The page stays there, and its
   "Roles" tab lists both journals.
5. On "Identity", press "privacy statement" in "Your data is stored in
   accordance with our privacy statement.".
6. Press each other tab ("Contact", "Roles", "Public", "Password",
   "Notifications", "API Key"): each ends with the same sentence and
   link. On "API Key", press "privacy statement".

**Expected**: while there is no statement to read, the tabs do not
promise one, as the site's Register page leaves out its privacy consent
when the site has no statement. Once the site has a statement, the link
opens it.

**Observed**: all seven tabs carry the sentence with a link to
`/index.php/index/en/about/privacy` (`target="_blank"`). Pressed on
"Identity" and on "API Key", it opens a new browser tab whose page reads
only:

```
404 Not Found
```

The way round:

7. Sign in as `admin`. Administration › "Site Settings" › "Site Setup" ›
   "Information" › "Privacy Statement": type "u03re site privacy
   statement.", "Save".
8. Sign in as `dbarnes`, open the site-wide Profile page again and press
   "privacy statement": a "Privacy Statement" page opens with that text.

On `dbarnes`'s own Profile page in `publicknowledge`
(`/index.php/publicknowledge/en/user/profile`) the same link opens the
journal's "Privacy Statement".

## Cause

The seven Profile tab templates in pkp-lib, `templates/user/identityForm.tpl`,
`contactForm.tpl`, `rolesForm.tpl`, `publicProfileForm.tpl`,
`changePassword.tpl`, `notificationSettingsForm.tpl` and
`apiProfileForm.tpl`, each print `user.privacyLink` with
`{url router=PKP\core\PKPApplication::ROUTE_PAGE page="about" op="privacy"}`
(split over three lines in `apiProfileForm.tpl`), whatever the statement
behind that address holds.

That address is answered by `PKP\pages\about\AboutSiteHandler::privacy()`.
It shows the journal's `privacyStatement`, or the site's when there is no
journal in the request or when `[general] sitewide_privacy_statement` is
On, and throws `NotFoundHttpException` when that statement is empty.
`ProfileHandler::profile()` forwards the site-wide Profile page to a
journal only when `ContextDAO::getAvailable()` returns exactly one for
the user (every journal, for the Site Administrator); otherwise it
serves the page without a journal, and the link asks for the site's
statement. The site schema gives `privacyStatement` no default, and no
install or upgrade step writes one, so the link leads to "404 Not Found"
until the administrator writes one.

Most places that link to the statement check it first: the Register
page (`frontend/pages/userRegister.tpl`, `$currentContext->getData('privacyStatement')`
and `$siteWidePrivacyStatement` from `RegistrationForm::fetch()`), the
reviewer's first step (`reviewer/review/step1.tpl`), the submission
wizard's consent (`StartSubmission::addPrivacyConsent()`), and the
"Privacy Statement" menu item (`PKPNavigationMenuService`,
`NMI_TYPE_PRIVACY`). The profile tabs do not, nor do the three pages in
the last bullet below.

Reach:

- The site-wide Profile page, all seven tabs: seen in the browser,
  three apps.
- A journal's Profile page when that journal has no Privacy Statement
  in any language (code). `getLocalizedData()` falls back to any
  language that has one.
- With `sitewide_privacy_statement = On` and no site statement, every
  Profile page, journal or site-wide (code).
- Three other pages link the same address unchecked (code):
  `templates/user/loginChangePassword.tpl` (the forced password change
  at sign-in), `templates/user/userPasswordReset.tpl` (the page a
  password reset email opens), and ui-library's
  `src/pages/acceptInvitation/AcceptInvitationUserAccountDetails.vue`
  (`useUrl('about/privacy')` in the required consent box of an
  accepted invitation). On the site, or for a journal without a
  statement, they lead to the same "404 Not Found".

## Proposed fix

Decide once, in the handler that serves the seven tabs, whether a
statement exists, and let the templates print the sentence only then.
Every tab and every save of `ProfileTabHandler`
(`controllers/tab/user/ProfileTabHandler.php`) calls `setupTemplate()`,
which the class does not override today. The fix adds that override,
with `use APP\template\TemplateManager;` and `use PKP\config\Config;`,
and chooses the statement exactly as `AboutSiteHandler::privacy()` does:

```php
public function setupTemplate($request)
{
    parent::setupTemplate($request);
    $context = $request->getContext();
    $privacyStatement = !Config::getVar('general', 'sitewide_privacy_statement') && $context
        ? $context->getLocalizedData('privacyStatement')
        : $request->getSite()->getLocalizedData('privacyStatement');
    TemplateManager::getManager($request)->assign(
        'privacyUrl',
        $privacyStatement
            ? $request->getDispatcher()->url($request, PKPApplication::ROUTE_PAGE, null, 'about', 'privacy')
            : null
    );
}
```

Each of the seven templates drops its `{capture assign="privacyUrl"}`
and prints the paragraph only with a link:

```smarty
{if $privacyUrl}
	<p>
		{translate key="user.privacyLink" privacyUrl=$privacyUrl}
	</p>
{/if}
```

The whole change is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-privacy-link-not-found/fix.diff)
(pkp-lib only). Its paths start at the app root (`lib/pkp/…`): it was
applied with `patch -p1` from the app root, and inside `lib/pkp` it
applies with `git apply -p3`. It was tried on the three apps: while the site had no statement, the
site-wide page showed no privacy sentence on any of the seven tabs, and
after step 7 the sentence came back and its link opened the site's
"Privacy Statement". `dbarnes`'s Profile page in `publicknowledge` kept
its link to the journal's "Privacy Statement", both patched and
unpatched.

**Alternatives**:

- Link the site-wide page to a journal's statement: a user with roles
  in several journals has several statements, and picking one would
  show the wrong terms.
- Let the site's Privacy Statement page show something when the
  statement is empty: the sentence would still promise a statement that
  does not exist.
- Check `$currentContext->getData('privacyStatement')` in each template,
  as the Register page does: it misses `sitewide_privacy_statement` and
  repeats the rule seven times.

**What goes with it**:

- Left out, each a separate change on another page:
  `loginChangePassword.tpl` and `userPasswordReset.tpl` are rendered by
  `LoginHandler` through `LoginChangePasswordForm` and
  `ResetPasswordForm`, which `ProfileTabHandler` does not reach; they
  need the same check in those forms' `display()`. The invitation page
  is ui-library code whose consent box is required, here and in
  `AcceptInvitationStep`'s validation; whether a newcomer must agree to
  a statement that does not exist is a product call before the link
  can be hidden.
- Whether the sentence is hidden or reworded when there is no statement
  is the team's call; the diff hides it, as the Register page does.
- No stored data changes.
- Backport: on `stable-3_5_0` the diff applies with offsets, and with
  fuzz 1 on `apiProfileForm.tpl`. On 3.4 the lines the diff removes read
  `router=\PKP\core\PKPApplication::ROUTE_PAGE` (a leading backslash),
  so the template hunks are regenerated; the handler hunk applies. On
  3.3 the removed lines read `router=$smarty.const.ROUTE_PAGE`, and the
  handler is `ProfileTabHandler.inc.php`, with no namespace or `use`
  lines and `ROUTE_PAGE` a global constant, so the method is rewritten
  in that style; that is the larger part of a 3.3 backport.
- The guard: an e2e scenario in spec U03 (a **Planned** item) in which
  the site-wide Profile page shows no privacy sentence while the site
  has no statement, and links to it once one is saved.

Medium, because the same edit goes into seven templates beside a new
handler method.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-privacy-link-not-found/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-privacy-link-not-found/lib.js)):
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/site-profile-privacy-link-not-found/walk.js [walk|neighbour|reach]`,
  where `neighbour` reads `dbarnes`'s Profile page in `publicknowledge`
  and `reach` does so after `rvaca` empties its English statement.
- With only the English statement emptied (`reach`), the journal's page
  falls back to the French one and the link works, patched and
  unpatched; a journal with no statement in any language was not
  driven.
- Walked 2026-10-03 on PostgreSQL (the fault does not depend on the
  database), each install freshly loaded from pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); the seven templates,
    `ProfileTabHandler.php` and `AboutSiteHandler.php` are the same
    files in the three.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246
    and OPS 38b61882d3 (lib/pkp cf3f984335).
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441,
  OPS at acd8ae704b, pkp-lib `stable-3_4_0` at 767353f4fe: the seven
  templates, `ProfileHandler.php`, `AboutSiteHandler.php`,
  `ProfileTabHandler.php`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc883,
  OPS at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402: the same
  files (`.inc.php`) and `pages/about/index.php`.
- Introduced: `git blame` on `identityForm.tpl`'s `user.privacyLink`
  line gives 8235a21f27 (`pkp/pkp-lib#3575`, merged in
  `pkp/pkp-lib#3682`), which added the notice to the seven tabs and the
  forced password change without a check. At that time the site had no
  statement of its own. 15c1290474 (`pkp/pkp-lib#3836`, merged in
  `pkp/pkp-lib#3964`, 2018-08-02, Nate Wright) added the site statement
  and its page, answering an empty one with a 404, and made the Register
  page check it, but left the profile notice as it was. So the link has
  never worked on the site-wide page without a site statement.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for the privacy statement on the profile, a 404 or
  "not found" on the privacy page, `privacyLink`, and
  `AboutSiteHandler` / `ProfileTabHandler` with privacy.
  `pkp/pkp-lib#11155` (the "Privacy Statement" menu item hidden with
  `sitewide_privacy_statement` On) and `pkp/pkp-lib#12768` (the
  Notifications tab's layout, quoting the template) concern other
  faults.
