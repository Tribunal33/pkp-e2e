# An email change asked for on the site-wide Profile page sends a message signed "Kind regards, Array"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no email-change message)
  - 3.3: none (code; no email-change message)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U03 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a10)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A user who asks for a new email address on the site-wide Profile page
gets the "Confirm account contact email change request" message at their
current address, and it closes "Kind regards," and then the word "Array".
The site's principal contact's name should be there. The same request
made on a journal's Profile page closes with the journal's contact name.

The confirm and reject links work and the change goes through; the
message only looks broken.

The site-wide Profile page opens from the site's own pages (its home
page, Administration) for a user with roles in two or more journals and
for the Site Administrator; on a site with one journal, only users with
no role in any journal are left on it.

## Impact

- **Lost**: nothing. The message looks broken at the moment the user is
  deciding whether to trust a link about their account.
- **Who**: on a site with two or more journals (presses, servers),
  users with roles in two or more of them, and the Site Administrator,
  when they open "View Profile" or "Edit Profile" from the site's own
  pages. From inside a journal the same links open that journal's
  Profile page, where the message is right. On a site with one journal,
  the site-wide page sends everyone with a role, the administrator
  included, on to the journal's Profile page, so only users with no
  role in any journal meet it there.
- **Way round**: a user with a role in a journal can ask for the change
  on that journal's Profile page instead, and the message then closes
  with the journal's contact name. A user with no role in any journal
  has no way round.

Low: only the wording of one message is wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (OMP and OPS the same, with
  "Press" or "Server" in place of "Journal"). Under Administration ›
  "Site Settings" › "Site Setup" › "Information", "Name of principal
  contact" is "Open Journal Systems" ("Open Monograph Press", "Open
  Preprint Systems"). `publicknowledge`'s contact is "Ramiro Vaca".
- A second journal, with a role there for `dbarnes`, created in steps
  1–2. The site-wide Profile page is shown only to a user with roles in
  more than one journal (or in none). A user with exactly one is
  forwarded to that journal's Profile page.

Steps:

1. Sign in as `admin`. Administration › "Hosted Journals" › "Create
   Journal": "Journal title" "u03rg Second Journal", "Journal initials"
   "U03RG", principal contact "u03rg Second Journal" and
   "u03rg@mailinator.com", "Country" "Canada", "Path" "u03rg",
   "English" ticked and primary, "Enable this journal to appear publicly
   on the site" ticked, "Save".
2. On the "Settings Wizard" that opens, tab "Users": "Search" for
   "dbarnes" with "Include users with no roles in this journal" ticked,
   then on the row "dbarnes" › "Edit User", tick "Reader", "OK". Sign
   out.
3. Sign in as `dbarnes` and type the site-wide Profile page's address,
   `/index.php/index/en/user/profile`. The page stays there.
4. On "Contact", replace "Email" with "dbarnes.u03rg@mailinator.com" and
   press "Save". The tab shows "You have requested a change of your
   email to "dbarnes.u03rg@mailinator.com". We have already sent you an
   email with directions on how to validate the changed email."
5. Open the message "Confirm account contact email change request" in
   the mailbox of `dbarnes@mailinator.com` (the current address) and read
   how it ends.

**Expected**: the message closes "Kind regards," and then the site's
principal contact, "Open Journal Systems".

**Observed**: the message closes:

```
Kind regards,

Array
```

(in its HTML part, `<p>Kind regards,</p>Array`). The server log has, at
the time of the save:

```
PHP Warning:  Array to string conversion in …/lib/pkp/classes/mail/Mailer.php on line 108
```

The same request from `dbarnes`'s Profile page in `publicknowledge`
(`/index.php/publicknowledge/en/user/profile`, no second journal needed)
closes "Kind regards, Ramiro Vaca".

## Cause

The message is built in
`PKP\invitation\invitations\changeProfileEmail\ChangeProfileEmailInvite::getMailable()`.
The mailable is created without a context or site, so it has no template
variables of its own. The method fills `{$siteContactName}`, the last
line of the `CHANGE_EMAIL` template, itself. With a journal in the
request it uses `$context->getContactName()`, a plain string. Without
one, on the site-wide Profile page, it uses:

```php
$contactName = $site->getData('contactName');
```

The site's `contactName` is a multilingual setting ("Name of principal
contact" is a per-language field under Site Settings), so `getData()`
returns the array of all languages (`['en' => 'Open Journal Systems',
'fr_CA' => …]`). `Mailer::compileParams()` puts that array into the
template as a string, and PHP turns it into the word "Array" with the
warning above. Every other reader of the site's contact name takes one
language: `SiteEmailVariable::values()` reads
`$this->site->getLocalizedData('contactName', $locale)`, and
`LoginHandler` and `ValidateRegisteredEmail` use
`$site->getLocalizedContactName()`.

The `{$siteContactName}` line has ended the template since 011ebb8c2e
(`pkp/pkp-lib#9887`, 2024-06-04), but `getMailable()` did not fill it
then, so the message would have ended with the placeholder itself (read
in the code). 7e3a26ea83 (`pkp/pkp-lib#10459`) moved the class into its
own folder and added the contact name, with `getData()` in the site
branch. The site-wide sign-off has not shown a name at any point.

Reach: no other `getData()` read of a multilingual site setting
reaches a message or a page as text (code). `PKPSiteInformationForm`,
`PKPSiteConfigForm` and `PKPSiteAppearanceForm` hand the whole array to
a multilingual field on purpose. `RegistrationForm` passes
`privacyStatement` to `userRegister.tpl`, which only tests it with
`{if}`, and tests it the same way in `validate()`. `CounterR5Report`
only tests `title` for emptiness.

## Proposed fix

Read the site's contact name in the message's language, as
`SiteEmailVariable` does:

```diff
         } else {
             $site = $request->getSite();
-            $contactName = $site->getData('contactName');
+            $contactName = $site->getLocalizedData('contactName', $locale);
         }
```

`$locale` there is the language the method already picks the template's
subject and body in, and `getLocalizedData()` falls back to another
language when that one is empty. The whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-email-change-signs-off-array/fix.diff)
(pkp-lib only). It was tried on the three apps: the site-wide request's
message closed "Kind regards, Open Journal Systems" ("Open Monograph
Press", "Open Preprint Systems"), and a journal's request still closed
with the journal's contact.

The fix leaves the name unescaped, as the journal branch leaves
`$context->getContactName()`, so the two branches stay alike.
`ContextEmailVariable` and `SiteEmailVariable` do pass the same names
through `htmlspecialchars()`, and both branches here print into the HTML
body. Escaping is therefore a change to both branches, under "What goes
with it", not a part of this fix.

**Alternatives**:

- In the site branch, build the mailable with the site (`new
  ChangeProfileEmailInvitationNotify([$site])`, since
  `Mailable::__construct()` takes an array of variables) and leave
  `siteContactName` out of the `buildViewDataUsing()` callback there, so
  that `SiteEmailVariable` fills it, escaped. The callback's value would
  otherwise win. It reshapes the site branch for the same result as one
  line.
- `$site->getLocalizedContactName()`: it picks the user's interface
  language rather than the message's `$locale`. Those are the same on the
  site-wide page today, but the explicit `$locale` keeps the sign-off in
  step with the subject and body if the method's language choice changes.

**What goes with it**:

- No stored data changes. The diff applies to `stable-3_5_0` as it
  stands (the file is the same).
- Optional hardening: `htmlspecialchars()` on `$contactName` after the
  `if`, covering both branches, as the variable classes do.
- The guard: a pkp-lib unit test of
  `ChangeProfileEmailInvite::getMailable()`. The method reads the
  context, site and user from `Application::get()->getRequest()`, so the
  test mocks a request with no context and a site whose `contactName` is
  `['en' => …, 'fr_CA' => …]`, and checks that the built view data's
  `siteContactName` is the English string. Or an e2e scenario in spec
  U03 (a **Planned** item) that reads the sign-off of a site-wide
  request.

Small: one line, and a unit test.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-email-change-signs-off-array/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-profile-email-change-signs-off-array/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/site-profile-email-change-signs-off-array/walk.js`.
  It records the Contact tab after the save, and the message's sender,
  recipient and the text and HTML from "Kind regards" on; `neighbour` as
  its last argument makes the request on `publicknowledge`'s Profile page.
- Walked 2026-10-03 on PostgreSQL (the fault does not depend on the
  database), each install freshly loaded from pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d) (2026-10-03):
  - main: OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). `ChangeProfileEmailInvite.php` is
    the same file in the three.
  - stable-3_5_0: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246
    and OPS 38b61882d3 (lib/pkp cf3f984335). Same result on the three
    apps, with the same warning; `ChangeProfileEmailInvite.php` is the
    same file as on `main`.
- 3.4, by code: OJS `stable-3_4_0` at d68934d0d1, OMP at 0aec65441, OPS
  at acd8ae704b, pkp-lib `stable-3_4_0` at 767353f4fe. There is no
  `classes/invitation/` and no `CHANGE_EMAIL` template;
  `ContactForm::execute()` saves the new address at once and sends no
  message.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc883, OPS
  at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402. The same as 3.4
  (`ContactForm.inc.php`).
- Introduced: `git blame` on the `getData('contactName')` line gives
  7e3a26ea83, merged in `pkp/pkp-lib#10472`. In its parent,
  `classes/invitation/invitations/ChangeProfileEmailInvite.php` set no
  `siteContactName`, while `locale/en/emails.po` already ended the body
  with it (since 011ebb8c2e); `Mailer::compileParams()` replaces only
  the keys it is given.
- Who reaches the site-wide page, by code: `ProfileHandler::profile()`
  forwards to a journal only when exactly one is available to the user,
  and `ContextDAO::getAvailable()` gives the Site Administrator every
  journal. The user menu's "View
  Profile" (`PKPNavigationMenuService`, `NMI_TYPE_USER_PROFILE`) and the
  back end's "Edit Profile" (ui-library `TopNavActions.vue`,
  `useUrl('user/profile')`) build the address with the current request's
  journal, or none on the site's own pages.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched 2026-10-03 for "Kind regards" with "Array", email change with
  "Array", `siteContactName`, `ChangeProfileEmailInvite`, and "Array to
  string conversion" with email. `pkp/pkp-lib#13183` names
  `ChangeProfileEmailInvite::getMailable()` but is about one request's
  mailables sharing a single context through a static callback, a
  different fault.
- Unverified on screen: users with no role in any journal, the Site
  Administrator on a multi-journal site, and where the two profile
  links lead.
