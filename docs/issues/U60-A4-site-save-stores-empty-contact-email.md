# A site save sent outside Site Settings stores an empty contact email, and password resets then fail

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5501` for `pkp/pkp-lib#5487` · [e7385784e5](https://github.com/pkp/pkp-lib/commit/e7385784e5de7ee996fd02630dfbe7157390e017) · 2020-02-11 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U60 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The site's save request, `PUT /index.php/index/api/v1/site` (the
request every Site Settings form sends), stores an empty "Site Name",
"Name of principal contact" and "Email of principal contact". The
Site Settings page refuses these empty fields before it sends anything,
so only the same request sent another way gets them through: by a Site
Administrator from the browser's console, or by a REST API client with
a Site Administrator's API token where the installation turns API
tokens on.

On an installation whose mail settings set no default envelope sender
(the configuration template's default), every "Forgot your password?"
request on any journal of the site then fails on the server once the
contact email is empty: the user gets an empty page and no email, and
nobody is told why.

On a site with two or more journals the Site Administrator can type the
address back on Site Settings › "Information". A site with one journal
does not show that tab, so its Site Administrator has to send the
request again with the address, or create a second journal to reach
the tab.

## Impact

- **Lost**: the password-reset email for every user, with an empty
  page instead of the confirmation. An empty Site Name costs what spec
  U60 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U60-site-settings.md#a1)
  describes for a fresh installation (an empty title on the site's
  home page, the application's name or logo in its place elsewhere);
  the default test dataset already has no Site Name.
- **Who**: every user who asks for a new password, after a Site
  Administrator has sent the save with the contact email empty.
- **Way round**: the Site Administrator puts the address back, as the
  Summary says; read in the code, a default envelope sender in the
  mail settings also lets the reset email go out.

Low: the fields are emptied only by a request the page itself would
refuse, sent by a Site Administrator.

## Steps to reproduce

The defect is in steps 4 and 6, which reproduce on the stock one-journal
dataset (read in the code: the request does not depend on the number
of journals). The second journal of the preconditions only serves steps
2, 3 and 5, which show the values on screen.

Preconditions:

- PKP's default test dataset for `main`, with its own `[email]`
  settings: `default_envelope_sender` is not set (`allow_envelope_sender`
  and `force_default_envelope_sender` Off, as in
  `config.TEMPLATE.inc.php`).
- A second journal, because a site with one journal shows neither
  "Settings" nor "Information" under "Site Setup": as `admin`,
  Administration › "Hosted Journals" › "Create Journal" ("Hosted
  Presses" › "Create Press" on OMP, "Hosted Servers" › "Create Server"
  on OPS); name "u60c Journal", initials "U60C", contact "u60c Journal"
  and `u60c@mailinator.com`, country Canada, path `u60c`, English,
  enabled; "Save".

Steps:

1. Sign in as `admin`.
2. Administration › "Site Settings" › "Site Setup" › "Information"
   (`/index.php/index/en/admin/settings`). "Name of principal contact"
   reads "Open Journal Systems" ("Open Monograph Press", "Open Preprint
   Systems"), "Email of principal contact" `pkpadmin@mailinator.com`.
3. Clear "Email of principal contact" and press "Save".
4. Reload the page, open the browser's developer tools › Console and
   run:

   ```js
   await fetch(pkp.context.apiBaseUrl + 'site', {
     method: 'PUT',
     headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
     body: JSON.stringify({title: {en: ''}, contactName: {en: ''}, contactEmail: {en: ''}}),
   }).then((r) => r.status)
   ```

5. Reload the page; open "Settings", then "Information".
6. Sign out. On the journal's login page
   (`/index.php/publicknowledge/en/login`), press "Forgot your
   password?", type `dbarnes@mailinator.com` and press "Reset
   Password".

**Expected**: step 4 is refused as step 3 is: the request answers 400
with "You must complete this field in English." for `title`,
`contactName` and `contactEmail` (the dataset's site has two languages;
with one, the message is "This field is required."), and nothing is
stored. At step 6 the page "A confirmation has been sent to your email
address if a matching account was found." and a "Password Reset
Confirmation" email to Daniel Barnes.

**Observed**: step 3 is refused before anything is sent: "This field is
required." under the box, and beside "Save" "Please correct one error.
Go to Email of principal contact: This field is required.". Step 4
answers 200 and the site returns (OJS; OMP and OPS the same with their
own names):

```json
{"title": {"en": "", "fr_CA": ""}, "contactName": {"en": "", "fr_CA": "Open Journal Systems"}, "contactEmail": {"en": "", "fr_CA": ""}}
```

At step 5 "Site Name", "Name of principal contact" and "Email of
principal contact" are empty. At step 6 the browser shows an empty
page; the request answers 500 and no email is sent. The server log:

```
PHP Fatal error:  Uncaught Symfony\Component\Mime\Exception\LogicException: An email must have a "From" or a "Sender" header. in lib/pkp/lib/vendor/symfony/mime/Message.php:132
127.0.0.1:59482 [500]: POST /index.php/publicknowledge/en/login/requestResetPassword - Uncaught Symfony\Component\Mime\Exception\LogicException: An email must have a "From" or a "Sender" header.
```

The dataset stores no Site Name to begin with, so the request leaves it
empty rather than emptying it; the two contact fields go from filled to
empty.

## Cause

`PKP\services\PKPSiteService::validate()` checks the required fields
against the wrong schema
([lib/pkp/classes/services/PKPSiteService.php](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/services/PKPSiteService.php#L118-L125),
lines 118 to 125):

```php
ValidatorFactory::required(
    $validator,
    EntityWriteInterface::VALIDATE_ACTION_EDIT,
    $schemaService->getRequiredProps(PKPSchemaService::SCHEMA_PUBLICATION),
    $schemaService->getMultilingualProps(PKPSchemaService::SCHEMA_PUBLICATION),
    ...
```

The publication schema requires `submissionId` and `version`, which a
site save never sends, so nothing is ever required. The site's own
schema, `schemas/site.json`, lists `title`, `contactName` and
`contactEmail` as required, and that list is never read.
`PKPSiteController::edit()` stores whatever passes `validate()`. The
page refuses the empty fields only because ui-library's `Form.vue`
`validateRequired()` checks them before it sends.

The `SCHEMA_PUBLICATION` reference came in with
[e7385784e5](https://github.com/pkp/pkp-lib/commit/e7385784e5de7ee996fd02630dfbe7157390e017)
(`pkp/pkp-lib#5501`, for `pkp/pkp-lib#5487`, which stopped the forms
requiring multilingual fields in every language). That change added
the `required` list to `site.json` and, in the site service, replaced
`ValidatorFactory::requirePrimaryLocale($validator, ['title',
'contactName', 'contactEmail'], …)`, which refused these three fields
empty in the primary language, with the generic `required()` call
pointed at `SCHEMA_PUBLICATION`. In `PKPContextService::validate()` the
same commit kept `SCHEMA_CONTEXT`, which the context service already
used on an add, and made the check run on every action.

The empty address then breaks mail. `LoginHandler::requestResetPassword()`
sends the reset email from `$site->getLocalizedContactEmail()` for every
journal, not only for the site. Laravel's `Mailable::from()` sets no
From address when the address is empty (`setAddress()` returns at
once). `Mailer::setEnvelopeSenderDefault()` adds a `Sender` header only
when `default_envelope_sender` is set together with
`force_default_envelope_sender` or `allow_envelope_sender`; Symfony then
uses that header as the From, and the email goes out (read in the
code, not walked). Without it, Symfony refuses a message with neither
header, and `Mailer::sendSymfonyMessage()` catches only
`TransportException`, so the request ends in the uncaught
`LogicException` above.

Reach:

- The three fields on OJS, OMP and OPS, `main` and 3.5 (walked).
- Password reset from any journal's login page (walked). Read in the
  code, not walked: the email-validation message of a registration on
  the site itself (`ValidateRegisteredEmail::manageEmail()`, sent from
  the site contact when `require_validation` is on), which depends on
  the same mail settings; the scheduled-task reports addressed to the
  site contact (`ScheduledTaskHelper`); the `adminEmail` of the
  site-wide OAI-PMH "Identify" answer (`JournalOAI`, `PressOAI`,
  `ServerOAI` `repositoryInfo()`).
- `PKPSiteController::edit()` and `editTheme()` are the only callers of
  `validate()`. `editTheme()` sends `themePluginPath` alone and is
  unaffected, since a field not sent is not required on an edit.
  `PKPSiteService::edit()` does not call `validate()`, so a plugin
  calling it directly gets no check, with or without this fault.
- Every other `ValidatorFactory::required()` call in pkp-lib and in the
  OJS, OMP and OPS classes passes its own entity's schema (checked in the
  code); this is the only one that does not.

## Proposed fix

Validate against the site's own schema
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-save-stores-empty-contact-email/fix.diff)):

```diff
         ValidatorFactory::required(
             $validator,
             EntityWriteInterface::VALIDATE_ACTION_EDIT,
-            $schemaService->getRequiredProps(PKPSchemaService::SCHEMA_PUBLICATION),
-            $schemaService->getMultilingualProps(PKPSchemaService::SCHEMA_PUBLICATION),
+            $schemaService->getRequiredProps(PKPSchemaService::SCHEMA_SITE),
+            $schemaService->getMultilingualProps(PKPSchemaService::SCHEMA_SITE),
             $allowedLocales,
             $primaryLocale
         );
```

This is what `PKPContextService::validate()` does with `SCHEMA_CONTEXT`,
and it keeps what `pkp/pkp-lib#5487` was for: on an edit, a multilingual
field is required only in the primary language, and only when the
request sends it. It covers the site's save request, whether the page,
the console or an API client sends it.

It was tried on `main` on all three apps: the request of step 4 answers
400 with "You must complete this field in English." for `title`,
`contactName` and `contactEmail`, nothing is stored, and the reset of
step 6 sends its email. Ordinary saves behave the same with the fix
and without it: a request sending only a new contact email, and one
sending a Site Name in English with French left empty, are stored, and
"Save" on "Information" and "Settings" shows "Saved".

**Alternatives**:

- Bring back the `requirePrimaryLocale()` list: that helper no longer
  exists, and the list would repeat what `site.json` already says.
- A guard in `Mailer` for a message without a From address, falling
  back to a configured one. That would keep password resets working
  (the same crash `pkp/pkp-lib#13130` reports for a journal without a
  technical support contact), but it leaves the empty contact stored
  for every other reader. It is worth having on its own, not instead
  of this fix.

**What goes with it**:

- A REST API client that sends an empty primary-language value for one
  of the three fields now gets 400. That is what the schema already
  declares.
- No data repair: a site that already stores an empty contact keeps it
  until the Site Administrator puts one back.
- Backport: the same two lines on 3.5 and 3.4
  (`classes/services/PKPSiteService.php`) and on 3.3
  (`classes/services/PKPSiteService.inc.php`, with the unprefixed
  `SCHEMA_SITE` constant).
- Guard: the e2e check here, proposed as a Planned item for spec U60
  (the site's save sent with an empty "Email of principal contact" is
  refused with 400). lib/pkp/tests has no test of a service's
  `validate()` to build a unit test on: `validate()` reads the request's
  user and loads plugin categories, so one would need a request mock
  first.

Small: two lines in one shared class.

## Evidence

- Kept script, taking the Steps through the screens on an install loaded
  from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-save-stores-empty-contact-email/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-save-stores-empty-contact-email/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-save-stores-empty-contact-email/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` takes the
  ordinary saves the Proposed fix lists. The fix was tried with
  `node bin/try-fix.js apply … fix.diff ojs omp ops`, then reverted.
- Walked 2026-10-04 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [566bb1f](https://github.com/pkp/datasets/commit/566bb1fb7af773fe500f7630170f7cd872fba88d)
  (2026-10-03); nothing here depends on the database.
  - main: OJS [ff004d0973](https://github.com/pkp/ojs/commit/ff004d097321cd5ae94ba8ce1659cc5230226720)
    (lib/pkp [987776cd04](https://github.com/pkp/pkp-lib/commit/987776cd043efac8c4a1693560a6d7737d174210),
    lib/ui-library 64d67363), OMP 3b0ecf794c and OPS c8af945bb7
    (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - 3.5: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS
    38b61882d3 (lib/pkp cf3f984335); lib/ui-library d4e01883. The same
    Steps, with the same answers at every step.
- Code reads beyond the Cause's names: on `main`,
  `Mailer::setEnvelopeSenderDefault()` and `setDmarcCompliantFrom()`,
  Symfony `Message::getPreparedHeaders()` and `ensureValidity()`, the
  `[email]` section of `config.TEMPLATE.inc.php`, and
  `AdminHandler::siteSettingsAvailability()` (the tabs a one-journal
  site hides).
  - 3.5: the same `validate()` lines and `site.json` list in lib/pkp
    771474347e and cf3f984335.
  - 3.4 (code): OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b, lib/pkp
    767353f4fe: the same `SCHEMA_PUBLICATION` lines in
    `PKPSiteService::validate()`, the same `site.json` list,
    `PKPSiteHandler::edit()` calling `validate()`, and the reset email
    sent from the site contact in `LoginHandler::requestResetPassword()`.
  - 3.3 (code): OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp
    ac3fa73402: the same lines with the unprefixed constants in
    `PKPSiteService.inc.php`, the same `site.json` list, and
    `PKPSiteHandler::edit()` calling `validate()`.
- Introduced: first released in 3.2.0; the `SCHEMA_PUBLICATION` lines
  were since only reformatted (e3f570bc37) and had their constants
  moved into `PKPSchemaService` (4a46a35069).
- Not verified: steps 4 and 6 on the one-journal dataset without the
  second journal; step 6 with a default envelope sender configured; the
  3.4 and 3.3 password-reset crash (3.4 sends the email the same way,
  read in the code, not walked; 3.3 sends through its older
  `MailTemplate`, not read); the mail paths named under Reach other than
  the password reset; the REST API with an API token, which the
  dataset's configuration leaves off (`api_key_secret` is empty).
