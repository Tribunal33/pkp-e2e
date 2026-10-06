# On a press site's site-wide Register page, the two privacy consent refusals show raw codes

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#3964` and `pkp/ojs#2086` for `pkp/pkp-lib#3836` · [15c1290474](https://github.com/pkp/pkp-lib/commit/15c1290474b5597a0cb0e005d2ee313eaf139181), [e3c0072064](https://github.com/pkp/ojs/commit/e3c0072064d6fbcb68a618d633b17951d91a712f) · committed 2018-08-02, merged 2018-08-28 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U02 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#omp1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the site-wide Register page of a press installation, the two privacy
consent refusals print a bare code, such as
`##user.register.form.missingContextConsent##`, because the press
application lacks the two English sentences that the journal and
preprint server applications have. One refusal shows when a visitor
presses "Register" without ticking the site's privacy consent. The other
shows when a visitor ticks a role under a press but leaves that press's
own consent box unticked.

A journal site prints "You must consent to this site's privacy
statement." or "You must consent to the privacy statement for any
journal with which you are registering." A preprint server site prints
the same, with "server" in place of "journal". A press's own Register
page refuses an unticked consent with a proper sentence.

The refusal itself is right and nothing is stored. Only the reason is
lost: the visitor has to work out from the code which box to tick.

The press refusal can show on any press site. The site refusal shows
only when the site has a Privacy Statement, and the Site Administrator
can type one only when the site does not host exactly one press.

## Impact

- **Lost**: the reason for the refusal. The form keeps what was typed
  apart from the passwords, as it does after any refusal.
- **Who**: a visitor registering on a press install's site-wide Register
  page. On a site with several presses that page is the site's own
  "Register". On a one-press site the header's "Register" opens the
  press's own page, so only a typed address reaches the site-wide page.
- **Way round**: tick the consent boxes on the page and press "Register"
  again.

Low: a raw translation key, with a way round on the page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP.
- For steps 4 and 9: `sitewide_privacy_statement = Off` in the
  `[general]` section of `config.inc.php` (the default), and a press
  with its own privacy statement (the dataset's press has one).

One press (the dataset as loaded):

1. Signed out, type the site-wide Register page's address,
   `/index.php/index/en/user/register`.
2. Type "u02b" in "Given Name", "Visitor" in "Family Name", "u02b" in
   "Affiliation", choose "Canada" for "Country", and type
   "u02b.visitor@mailinator.com" in "Email", "u02bvisitor" in "Username"
   and "u02bvisitoru02bvisitor" in "Password" and "Repeat password".
3. Under "Public Knowledge Press", tick "Reader". Leave "Yes, I agree to
   have my data collected and stored according to this press's privacy
   statement." unticked.
4. Press "Register".

With a site privacy statement:

5. Sign in as `admin`. Open Administration › "Hosted Presses", press
   "Create Press", type "u02b Press" as the title, "U02B" as the
   initials, "u02b Press" and "u02b.press@mailinator.com" as the
   principal contact, choose "Canada", type "u02b" as the path, tick
   "English" as the language and the primary locale, tick "Enable this
   press to appear publicly on the site" and press "Save".
6. Open Administration › "Site Settings" › "Site Setup" › "Information",
   type "u02b site privacy statement." in "Privacy Statement" and press
   "Save". Sign out.
7. Signed out, type the site-wide Register page's address again and
   fill the form as in step 2, ticking nothing.
8. Press "Register".
9. Tick the site's "Yes, I agree to have my data collected and stored
   according to the privacy statement." and "Reader" under "Public
   Knowledge Press", leave the press's consent unticked, type both
   passwords again and press "Register".

**Expected**: steps 4 and 9 are refused with "You must consent to the
privacy statement for any press with which you are registering." Step 8
is refused with "You must consent to this site's privacy statement."

**Observed**: each step is refused with "Errors occurred processing this
form:" and one line. Steps 4 and 9 read:

```
##user.register.form.missingContextConsent##
```

Step 8 reads:

```
##user.register.form.missingSiteConsent##
```

Ticking the press's consent too and pressing "Register" ends on
"Registration complete".

Control: the same steps on OJS and OPS print the Expected sentences,
naming a journal or a server where OMP's would name a press.

## Cause

`RegistrationForm::validate()`
(`lib/pkp/classes/user/form/RegistrationForm.php`, lines 226 and 247)
refuses a site-wide registration with
`__('user.register.form.missingSiteConsent')` and
`__('user.register.form.missingContextConsent')`. The check is shared
code, but neither key is in lib/pkp's locale files: each app is expected
to define them. OJS and OPS do, in `locale/en/locale.po`. OMP's
`locale/en/locale.po` does not, and neither does any of OMP's other 33
languages. `Locale::translate()` (`lib/pkp/classes/i18n/Locale.php`) returns a key
it cannot find as `##key##`.

Both keys came with the site-wide privacy consent (`pkp/pkp-lib#3836`).
pkp-lib 15c1290474 added the checks, and OJS e3c0072064 added the three
English texts they and the page's per-journal consent line use
(`privacyConsentThisContext`, `missingContextConsent`,
`missingSiteConsent`). No OMP change followed. In 2020 `pkp/omp#862`
([58dadc3234](https://github.com/pkp/omp/commit/58dadc3234aac887d90b6839036dc740a8f39360),
"Add missing translate key") gave OMP the consent line's text, the one
the press saw on screen, and left these two out.

Reach:

- Both refusals on the site-wide Register page (walked). The site
  Privacy Statement's "Information" tab is limited by
  `AdminHandler::siteSettingsAvailability()` (`'siteInfo' =>
  $isMultiContextSite`, which is `getCount() !== 1`; walked: the tab is
  missing on the one-press dataset).
- A press's own Register page uses another key,
  `user.profile.form.privacyConsentRequired`, which pkp-lib defines: it
  reads "You must agree to the terms of the privacy statement." (walked).
- No other key is missing: every other locale key that
  `RegistrationForm`, `RegistrationHandler` and the Register page's
  templates name has an OMP or pkp-lib definition (code).

## Proposed fix

Add the two texts to OMP's `locale/en/locale.po`, beside the
`user.register.form.privacyConsentThisContext` text that OMP already
holds. OJS and OPS hold all three keys in their own `locale.po`, each
naming its kind of context
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-raw-codes/fix.diff)):

```diff
--- a/locale/en/locale.po
+++ b/locale/en/locale.po
@@ -944,6 +944,12 @@
 
 msgid "user.register.form.privacyConsentThisContext"
 msgstr "Yes, I agree to have my data collected and stored according to this press's <a href=\"{$privacyUrl}\" target=\"_blank\">privacy statement</a>."
+
+msgid "user.register.form.missingContextConsent"
+msgstr "You must consent to the privacy statement for any press with which you are registering."
+
+msgid "user.register.form.missingSiteConsent"
+msgstr "You must consent to this site's privacy statement."
 
 msgid "site.noPresses"
 msgstr "There are no presses available."
```

Tried on `main`, OMP: steps 4, 8 and 9 then show the Expected
sentences. The press's
own Register page still refuses an unticked consent with "You must agree
to the terms of the privacy statement.", with and without the fix.

The press refusal names the press, so it stays in each app, as the
consent line's text does. This is a proposal; the team decides.

**Alternatives**:

- Move `missingSiteConsent` into lib/pkp's `locale/en/user.po`. Its
  sentence names no journal, press or server, so lib/pkp could own it,
  but that is a change in lib/pkp, OJS and OPS together for the same
  result.
- Make `missingContextConsent` a shared text with the context's kind as
  a parameter: a new pattern for one sentence that each app already
  words for itself.

**What goes with it**:

- Translations: the fix covers English. A language without the keys
  does not fall back to English, so OMP's other languages show the raw
  codes until Weblate supplies them. OJS has `missingSiteConsent` in 63
  other locales, and that sentence can be copied as it stands.
- No data repair, and nothing changes for an API client or a plugin.
- Backport: the same lines apply to 3.5 and 3.4 (`locale/en/locale.po`)
  and to 3.3 (`locale/en_US/locale.po`).
- Test: an e2e scenario that reads both refusals on a press's site-wide
  Register page.

Small: two messages in one locale file.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-raw-codes/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-site-register-consent-raw-codes/lib.js))
  takes steps 1–9, then ticks every consent and registers, on OJS, OMP
  and OPS. With `neighbour` it presses "Register" on the press's
  (journal's, server's) own Register page with the consent unticked.
  Each run starts from an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-site-register-consent-raw-codes/walk.js [walk|neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The walks ran in Chromium on PostgreSQL, on pkp/datasets 566bb1f
  (2026-10-03). On `main` and 3.5, OMP showed both raw codes and OJS and
  OPS the sentences. The fix and the neighbour were walked on `main`,
  OMP only (the fix touches no other app).
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib 771474347e (OJS)
  and cf3f984335 (OMP, OPS). 3.4: OMP 0aec65441f; pkp-lib 767353f4fe.
  3.3: OMP 8e72fc8836; pkp-lib ac3fa73402.
- Code reads for 3.4 and 3.3: pkp-lib's
  `classes/user/form/RegistrationForm.php` (3.4) and
  `RegistrationForm.inc.php` (3.3) refuse with the same two keys. OMP's
  `locale/en/locale.po` (3.4) and `locale/en_US/locale.po` (3.3) do not
  define them, and pkp-lib's English files on those branches do not
  either; OJS's and OPS's do. The site's "Information" tab is limited to
  sites with more than one context on both branches as well
  (`AdminHandler::siteSettingsAvailability()`).
- Introduced: `git log -S` for the keys in pkp-lib leads to 15c1290474,
  and in OJS's locale files to e3c0072064; OMP's history holds neither
  key, and no OMP commit names `pkp/pkp-lib#3836`. The blamed lines
  today (3e103d4e3a, 2024, for `pkp/pkp-lib#10737`; e3f570bc37, 2021)
  cast the site check's field id and reformatted the file, not the keys.
- Upstream search: pkp/pkp-lib, pkp/omp and pkp/ui-library, by the two
  keys, "register privacy consent", "site's privacy statement",
  "registration missing translation" and "RegistrationForm validate
  privacyConsent". `pkp/pkp-lib#3870`, `#3827`, `#3836` and `#10737`
  concern whether the consent boxes show or validate, not their texts.
- Not walked: OMP in a language other than English, and the fix on 3.5.
