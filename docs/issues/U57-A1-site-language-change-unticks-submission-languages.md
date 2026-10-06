# Any change to the site's languages silently unticks journals' submission languages the site does not offer

- **Severity** high
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; a journal's submission languages are the site's own)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#9309` for `pkp/pkp-lib#9425` · [7781b8a799](https://github.com/pkp/pkp-lib/commit/7781b8a799b5e218e42b56d52235691b4f55dfba) · 2024-03-21 · jyhein (jyhein)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal can accept submissions in any language of the world, including
one the site has not enabled, such as German on a site with English and
French. Later the Site Administrator installs, enables, disables or
removes a language on the site's "Languages" list, any language at all.
After that, every submission language of every journal that the site
does not offer loses its "Submissions" and "Metadata" ticks. Its row stays
on "Submission Languages" with both boxes empty, even when it is the
"Default", and "Make a Submission" stops offering it. No one is told.

When a journal is left with a single ticked language, "Make a
Submission" asks for no language at all, and each new submission is
created in the journal's "Default". When the "Default" was one of the
stripped languages, submissions silently go in a language the journal
no longer offers, whatever their authors write in.

The Journal Manager expects the journal's submission languages to stay
as set. The settings page shows "Website Languages" and "Submission
Languages" as two separate lists, and only the first is tied to the
site's languages.

## Impact

- **Lost**: the journal's choice of submission and metadata languages,
  with two outcomes for authors:
  - While two or more ticked languages are left, authors still choose
    among them, and only the stripped languages are missing.
  - When the stripped language was the journal's "Default" and a single
    ticked language is left (on 3.5, also with more left when the list
    is stored with gaps; see Cause), "Make a Submission" asks for no
    language. Every new submission is filed in the "Default": the title
    typed on "Make a Submission" is stored as the text in that language,
    and the submission's forms treat it as its own.
- **Who**: for the wrong language, a journal whose default submission
  language the site does not offer, and which has one other language.
  An example is a Swahili journal on an English-only site, with English
  as its second language: after the change, its English-language
  submissions are filed as Swahili. A journal whose main language PKP
  does not translate meets the first condition whenever that language is its "Default":
  "Add/Remove Languages" offers 799 languages, while the site can only
  enable the 75 or so that PKP translates, and Swahili, Latin, Yoruba and
  Amharic are among those it cannot. One change on the site's list
  affects every such journal on the installation, and all their
  submissions from then on.
- **Way round**: a manager with the journal's Settings pages can tick
  the rows again, once someone notices; the next change on the site's
  list strips them again. On OJS and OPS, an editor who can edit the
  publication can correct each misfiled submission through "Change" next
  to its submission language, as long as it is unpublished and has one
  version. On OMP no screen offers that (both from the code).

High, for the journal whose default submission language the site does
not offer: authors' new submissions are filed in a language they did not
choose, and nobody is told. Each one can be corrected only once someone
notices, and the silence takes it one level above medium. Where two or
more languages are left, the fault is medium: the stripped languages are
missing, and a manager can tick them again.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (OMP and OPS the same, with
  "press" or "server" for "journal"), journal `publicknowledge`. The site
  carries English and French (Canada), both enabled; the journal's
  "Submission Languages" lists English ("Default") and French (Canada),
  both ticked. German, Italian and Spanish are not installed on the site.

Steps:

1. Sign in as `rvaca` (Journal Manager).
2. Open Settings › Website, tab "Setup", side tab "Languages".
3. Under "Submission Languages", press "Add/Remove Languages".
4. Tick "[ de ] German" and "[ it ] Italian", untick "[ fr_CA ] French
   (Canada)", and press "Save". The notice reads "Submission locales
   updated.". The French (Canada) row leaves the list, and the rows
   "German/Deutsch" and "Italian/italiano" join it with both boxes empty.
5. On the German row, tick "Submissions". "Metadata" is ticked with it.
6. On the Italian row, press "Default". Its "Submissions" and "Metadata"
   are ticked.
7. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`).
   "Submission Language" offers German, English and Italian.
8. Sign out, and sign in as `admin`.
9. Administration › "Site Settings" › "Site Setup" › "Languages": press
   "Install Locale", tick "Spanish/español (es)" and press "Save". The
   notice reads "All selected locale(s) installed and activated.", and
   Spanish is listed.
10. Sign out, sign in as `rvaca`, and open Settings › Website › "Setup" ›
    "Languages" again.
11. Sign out, and sign in as the author `ccorino` (OMP: `aclark`).
12. Open "Make a Submission".
13. Type the title "u57u1 language check", choose the section "Articles"
    (OPS: "Preprints"; OMP asks for none), choose "English" if a
    "Submission Language" is asked, tick "Yes, my submission meets all of
    these requirements." and "Yes, I agree to have my data collected and
    stored according to the privacy statement.", and press "Begin
    Submission".
14. Press "Continue" to reach "Details" [3.5: the wizard opens on
    "Details"], and look at the language bar above "Title".

**Expected**: at step 10, German is still ticked under "Submissions" and
"Metadata", and Italian is still the "Default" with both boxes ticked.
At step 12, "Submission Language" offers German, English and Italian. At
step 14, the bar shows English, the language chosen, as the
submission's own.

**Observed**: at step 10, "Submission Languages" lists German and Italian
with "Submissions" and "Metadata" both empty, and Italian's "Default"
radio is still selected; English keeps its ticks. No notice was shown at
step 9 or 10. At step 12, the start page asks for no "Submission
Language": only "Title", "Section", "Submission Checklist" and "Privacy
Consent". At step 14, the bar reads "English Italian" with Italian as
the submission's own language, and the title typed at step 13 is in the
Italian box: the submission was created in Italian.

Control:

15. Sign out, sign in as `admin`, and open Administration › "Site
    Settings" › "Site Setup" › "Languages". Untick "Enable" on French
    (Canada) and press "OK" in "Disable". The notice reads "Locale
    disabled.".
16. Sign out, sign in as `rvaca`, and open Settings › Website › "Setup" ›
    "Languages".
17. Look at "Website Languages": it no longer lists French, as it should
    (the journal's interface languages follow the site's).

## Cause

`AdminLanguageGridHandler::_updateContextLocaleSettings()`
(`lib/pkp/controllers/grid/admin/languages/AdminLanguageGridHandler.php`,
line 422) runs after every change on the site's list:
`saveInstallLocale()`, `uninstallLocale()`, and
`_updateLocaleSupportState()` behind `enableLocale()` and
`disableLocale()`. In the loop at line 434 it intersects four settings
of each context with the site's supported languages and saves the
result:

```php
foreach (['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales', 'supportedSubmissionMetadataLocales'] as $settingName) {
```

That was right while a journal's submission languages could only be the
site's. `7781b8a799` made them independent (`pkp/pkp-lib#9425`):
"Add/Remove Languages" (`AddLanguageForm`) now offers every language of
`Locale::getSubmissionLocaleDisplayNames()` and stores the rows in
`supportedAddedSubmissionLocales`. The same commit left
`supportedSubmissionLocales` in this intersection and added
`supportedSubmissionMetadataLocales` to it. So every site change drops
from both lists each language the site does not enable.
`supportedAddedSubmissionLocales` (the rows) and
`supportedDefaultSubmissionLocale` (passed through unchanged) keep it.
The list then shows the row with both boxes empty, and a "Default" whose
own boxes are empty. `LanguageGridHandler::saveLanguageSetting()` refuses
to save that state itself: it will not untick the default's
"Submissions" or "Metadata" box
(`notification.defaultLocaleSettingsCannotBeSaved`).

`StartSubmission::addLanguage()` asks for a language only when the
journal has two or more submission languages. With fewer, nothing is
sent, and `Repository::add()` (`classes/submission/Repository.php`) gives
the new submission `supportedDefaultSubmissionLocale`, the stripped
"Default".

Reach:

- All four actions on the site's list (install, enable, disable, remove)
  call it, and all contexts are rewritten at once (checked on screen for
  install and disable; enable and remove in the code).
- 3.5: the loop there has no `array_values()`, so a list that loses a
  language before another one is stored with gaps, as a JSON object
  (`{"1":"en"}`). `Locale::getSubmissionLocaleDisplayNames()` reads such
  an array by its keys and finds no names, so the start page asks for no
  language even when two or more are left, and every new submission takes
  the "Default" (checked on screen in an earlier walk, with English and
  French left).
- The "Change submission language" form
  (`ChangeSubmissionLanguageMetadataForm`) reads the stripped list too, so
  the stripped languages disappear from it (code).
- Existing metadata is not hidden: the publication forms and their
  validation offer the submission's own language and every language its
  metadata already holds, besides the journal's metadata languages
  (`PKPSubmission::getPublicationLanguages()`; code).
- `PKPContextService::validate()` still checks `supportedSubmissionLocales`
  against the site's languages (its check "Ensure that the supported
  locales are supported by the site", unchanged by `7781b8a799`). It
  runs when a context is created (`PKPContextController` add,
  `VALIDATE_ACTION_ADD`) and on `PUT /api/v1/contexts/{id}`. Such a request
  setting a submission language the site does not enable is refused,
  though the journal's own list accepts it (code only; no screen sends
  that property). It does not stand in the way of the fix below: the check
  runs only for a property present in the request, and the fixed loop no
  longer sends this one.

## Proposed fix

In `_updateContextLocaleSettings()`, intersect only the website
languages with the site's:

```diff
-            $params['supportedDefaultSubmissionLocale'] = $context->getData('supportedDefaultSubmissionLocale');
-            foreach (['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales', 'supportedSubmissionMetadataLocales'] as $settingName) {
+            // Only the website languages follow the site's; the submission and
+            // metadata languages are independent of it (pkp/pkp-lib#9425)
+            foreach (['supportedLocales', 'supportedFormLocales'] as $settingName) {
```

The diff against the app root is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-language-change-unticks-submission-languages/fix.diff).
It finishes what `pkp/pkp-lib#9425` set out to do. The website languages
("UI", "Forms") still follow the site, and the submission languages are
left to the journal, which `AddLanguageForm` already checks against the
full list of submission languages. The `supportedDefaultSubmissionLocale`
line goes because nothing in the loop touches that setting any more.

It was tried on `main` in all three apps. After step 9, German keeps
both ticks and Italian stays the "Default" with both ticked. Step 12
offers German, English and Italian, and the new submission is created
in English, the language chosen. The control still takes French off
"Website Languages" when the site disables it.

**Alternatives**

- Keep the intersection and skip the default submission language: every
  other language the site does not offer is still unticked.
- Unite the rows (`supportedAddedSubmissionLocales`) with the site's
  languages before intersecting: it keeps the dependency that
  `pkp/pkp-lib#9425` removed.

**What goes with it**

- Optional, a separate change: drop `supportedSubmissionLocales` from
  the site check in `PKPContextService::validate()`. That would let
  context creation and the REST API set submission languages the site
  does not enable, as the journal's own list already can. This report
  does not need it, and it was not tried.
- Stored data: journals already stripped keep their empty rows. The
  lost ticks cannot be recovered from the database, so the manager ticks
  them again on screen. An upgrade step could put
  `supportedDefaultSubmissionLocale` back into both lists where it is
  missing, which restores at least the "Default". Submissions already
  filed in the "Default" by mistake are not touched.
- Backport: the diff applies to `stable-3_5_0` with an offset and a
  fuzz of one line, but was not tried there. On 3.5 the backport should
  also add the `array_values()` that `main` has in this loop, so the
  website lists are not stored with gaps either. 3.4 and 3.3 need nothing.
- Test: an e2e check that installing a language on the site leaves a
  journal's submission languages ticked (pkp-e2e plans one in its
  languages spec).

Small: one line in one pkp-lib file, and a test.

## Evidence

- The kept script walks the Steps and the control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-language-change-unticks-submission-languages/lib.js).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the set of test installs, `<id>` the
  output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/site-language-change-unticks-submission-languages/fix.diff ojs omp ops`;
  the same script walked `main` with it in and out. With the fix in,
  "Details" was read from the wizard's form without pressing "Continue",
  a step added to the script afterwards. Its title box and the
  submission's record were English.
- The walks ran in Chromium on PostgreSQL (MySQL not checked; nothing in
  the cause depends on the database). Datasets: pkp/datasets c657990
  (2026-10-01). The script also reads the context's `supported…` settings
  and the new submission's `locale`. After step 10 on `main`,
  `supportedSubmissionLocales` and `supportedSubmissionMetadataLocales`
  were `["en"]`, `supportedAddedSubmissionLocales` `["de","en","it"]`
  and `supportedDefaultSubmissionLocale` `it`. The submission made at
  step 13 had `locale` `it`, on `main` and 3.5 alike.
- The 3.5 start page that asks for no language with two languages left
  (Reach) was seen in an earlier walk of the same script, before step 4
  unticked French (Canada). The lists were stored as
  `{"1":"en","2":"fr_CA"}`.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  c346ee00a5, OMP c7b45f88e, OPS 8eaf899468; pkp-lib 3bb4450bea (OJS)
  and 1fb843f491 (OMP, OPS). 3.4: OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b, pkp-lib 32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161, pkp-lib f6ab331645.
- Code reads. `main`: `AdminLanguageGridHandler` (the four callers and
  `_updateContextLocaleSettings()`), `PKPContextService::validate()`
  (the `isset()` guard on each locale property),
  `PKPContextController` (add and edit), `AddLanguageForm`,
  `LanguageGridHandler::saveLanguageSetting()`,
  `SubmissionLanguageGridHandler`, `Context`'s submission-language
  getters, `StartSubmission::addLanguage()`, `Repository::add()` and
  `validate()` for submissions and publications,
  `PKPSubmission::getPublicationLanguages()`,
  `PKPPublication::getLanguages()`,
  `ChangeSubmissionLanguageMetadataForm`, and
  `lib/weblateLanguages/languages.json` (799 languages) against the
  app's `locale/` folder. 3.5: the same handler (no `array_values()`) and
  `Locale::getSubmissionLocaleDisplayNames()` (`array_is_list()` decides
  between values and keys). 3.4 and 3.3: `AdminLanguageGridHandler`
  intersects `supportedSubmissionLocales` too, but there
  `ManageLanguageGridHandler` lists only the site's languages and
  `PKPContextService::validate()` requires submission languages to be the
  site's, so nothing the site does not offer can be ticked;
  `AddLanguageForm` does not exist.
- Introduced: `git blame` on the loop gives 7781b8a799, which added
  `supportedSubmissionMetadataLocales` and the default's pass-through to
  a loop that intersected `supportedSubmissionLocales` since
  e3f570bc37d (2021, correct then). PR `pkp/pkp-lib#9309` ("Submission
  and metadata languages separated from UI and form languages"). The
  `array_values()` on `main` came with 8a545828192 (`pkp/dev-team#322`,
  a change for another fault; only its hunk in this file matters here).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  submission languages unticked or removed after installing or disabling
  a site language, `supportedSubmissionLocales` with site,
  `AdminLanguageGridHandler` and `_updateContextLocaleSettings`.
  `pkp/pkp-lib#12537` (the Settings wizard's forms take the site's primary
  language) and `pkp/pkp-lib#11397` (errors creating a journal with
  Serbian locales) are other faults.
- Not driven: enable and remove on the site's list (code only; install
  and disable walked); 3.4 and 3.3; the fix on 3.5; an install with PHP
  assertions on; "Change" next to a submission's language (read in the
  code: `ChangeSubmissionLanguageMetadataForm`, `PKPSubmissionController::changeLocale()`
  and ui-library's `WorkflowChangeSubmissionLanguage` in the editorial
  workflow configs of OJS and OPS, offered by `useWorkflowPermissions`
  to a user who may publish or edit the publication; OMP's config does
  not include it).
