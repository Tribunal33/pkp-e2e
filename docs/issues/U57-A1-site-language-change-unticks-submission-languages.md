# Any change to the site's languages silently unticks each journal's submission languages the site has not enabled

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; a journal's submission languages come from the site's)
  - 3.3: none (code; a journal's submission languages come from the site's)
- **Introduced** `pkp/pkp-lib#9309` for `pkp/pkp-lib#9425` · [7781b8a799](https://github.com/pkp/pkp-lib/commit/7781b8a799b5e218e42b56d52235691b4f55dfba) · 2024-03-21 · jyhein (jyhein)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U57 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U57-languages-and-locales.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal can add any language on the full list of languages as a
submission language, through "Add/Remove Languages" on its Settings ›
Website › "Setup" › "Languages" tab, including one the site has not
enabled, such as German on a site with English and French. When the Site
Administrator then installs, enables, disables or removes any language on
the site's "Languages" list, each journal's submission languages that the
site has not enabled lose their "Submissions" and "Metadata" ticks on
that tab. The rows stay, with both boxes empty, "Make a Submission" stops
offering those languages, and no one is told. The Journal Manager expects
the site's interface languages and the journal's submission languages to
be independent, as the tab's two separate lists say.

Authors cannot start a submission in that language until a manager
notices and ticks the boxes again. Submissions that already hold text in
that language still show it and can still edit it; a submission without
any text in that language yet no longer offers boxes for it.

It needs a journal that takes a submission language the site has not
enabled.

## Impact

- **Lost**: no content, only the journal's setting. On the tab the emptied row
  looks the same as a language just added and never ticked; no notice,
  email or mark says that the ticks were taken away.
- **Who**: every journal on the site that takes a submission language
  the site has not enabled, at the moment an administrator changes the
  site's language list. How many journals take such a language was not
  measured.
- **Way round**: the manager ticks "Submissions" and "Metadata" again.

Medium: a submission task fails silently, with a way round on screen and
no content lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  OMP and OPS are the same with the press or the server. The site has
  English and French (Canada) installed and enabled, and the journal
  takes submissions in both.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website › "Setup" › "Languages".
3. Under "Submission Languages", press "Add/Remove Languages", tick
   "[ de ] German" and press "Save". The notice reads "Submission
   locales updated." and German's row appears with its boxes empty.
4. On German's row, tick "Submissions". The notice reads "Locale
   settings saved." and "Metadata" is ticked with it.
5. Open "Make a Submission"
   (`/index.php/publicknowledge/en/submission`). "Submission Language"
   offers "German", "English" and "French (Canada)".
6. Sign out and sign in as `admin`.
7. Open Administration › "Site Settings" › "Site Setup" › "Languages",
   press "Install Locale", tick "Spanish/español (es)" and press "Save".
   The notice reads "All selected locale(s) installed and activated."
8. Sign out, sign in as `rvaca` and open Settings › Website › "Setup" ›
   "Languages" again.
9. Open "Make a Submission" again.

**Expected:** in step 8, German's row still has "Submissions" and
"Metadata" ticked, and in step 9 "Submission Language" still offers
German.

**Observed:** in step 8, German's row is still in the "Submission
Languages" list with "Submissions" and "Metadata" both empty. English and
French (Canada) keep their ticks. In step 9, "Submission Language"
offers "English" and "French (Canada)" only. Nothing in step 7 or step 8
says that a journal's settings changed. [On 3.5, step 9 shows no
"Submission Language" question at all, although English and French are
still ticked; see Cause.]

Disabling a language works the same way: when the administrator disables
French (Canada) on the site's list, French loses its "Submissions" and
"Metadata" ticks as well as its "Website Languages" row.

## Cause

`PKP\controllers\grid\admin\languages\AdminLanguageGridHandler::_updateContextLocaleSettings()`
runs after every change on the site's list: from `saveInstallLocale()`,
`uninstallLocale()`, and `_updateLocaleSupportState()` (enable and
disable). For every context, it intersects four settings with the site's
enabled languages:

```php
foreach (['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales', 'supportedSubmissionMetadataLocales'] as $settingName) {
```

That is right for the two website lists ("UI" and "Forms"), which can
only hold languages the site offers. It is wrong for the two submission
lists. Since `pkp/pkp-lib#9425`, a journal picks its submission
languages from the full language list ("Add/Remove Languages",
`Locale::getSubmissionLocaleDisplayNames()`), not from the site's
languages; the issue says "The journal might publish using a language
not available as UI language". Before that change the handler already
trimmed `supportedSubmissionLocales`, which was right while that list
could only hold site languages. 7781b8a799, which made the submission
languages independent, kept that trim and added
`supportedSubmissionMetadataLocales` to it.

`PKPContextService::validate()` holds the same old rule: it refuses a
`supportedSubmissionLocales` value that holds a language the site has
not enabled (`api.contexts.400.localesNotSupported`). The screens never
send that setting through the API (the language lists save it through
`LanguageGridHandler::saveLanguageSetting()`, which does not validate),
so this rule only shows when the setting is sent to the REST API.

Reach:

- Every context on the site, in all three apps: one shared lib/pkp
  handler, with no app subclass (code; walked on OJS, OMP and OPS).
- All four kinds of change call the method: install (walked), disable
  (walked), enable and remove (code).
- Existing submissions keep their content. The metadata forms of the
  wizard, the author's view and the editorial workflow list the
  journal's `supportedSubmissionMetadataLocales` plus the submission's
  own languages: its submission language and every language that holds
  text in its publications or contributors
  (`PKPSubmission::getPublicationLanguageNames()`, used by
  `PKPSubmissionHandler`, `PKPAuthorDashboardHandler` and the apps'
  `WorkflowHandler`). A save accepts the same set
  (`publication\Repository::validate()` with
  `getPublicationLanguages()`). So German text already saved stays
  shown and editable; only a submission with no German text yet loses
  the German boxes (code; not walked).
- 3.5 makes it worse. Its copy of the method has no `array_values()`
  around the intersection, so a list that loses its first entry (German,
  `de`, sorts before `en`) is saved as a JSON object:
  `{"1":"en","2":"fr_CA"}` was stored in the walk.
  `Locale::getSubmissionLocaleDisplayNames()` reads such a list by its
  keys, finds no language, and the start page drops the "Submission
  Language" question. `main` saves a JSON array since 8a54582819, a
  commit titled "pkp/dev-team#322 [Edtiorial UI] | Review UI - "Author
  Response" button leads to page without an email form (#13206)". Its
  `AdminLanguageGridHandler` hunks ("Re-index locale lists so they are
  stored as JSON arrays") wrap this intersection, and the site's own
  lists, in `array_values()`. That commit is not on `stable-3_5_0`.

## Proposed fix

Keep the two submission lists out of the trim in
`_updateContextLocaleSettings()`:

```diff
--- a/lib/pkp/controllers/grid/admin/languages/AdminLanguageGridHandler.php
+++ b/lib/pkp/controllers/grid/admin/languages/AdminLanguageGridHandler.php
-            $params['supportedDefaultSubmissionLocale'] = $context->getData('supportedDefaultSubmissionLocale');
-            foreach (['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales', 'supportedSubmissionMetadataLocales'] as $settingName) {
+            // Only the website languages follow the site's; the submission
+            // languages are independent of them (pkp/pkp-lib#9425)
+            foreach (['supportedLocales', 'supportedFormLocales'] as $settingName) {
```

The handler then trims only the website lists. The
`supportedDefaultSubmissionLocale` line goes too: it only passed the
stored value back unchanged, for the submission lists the method no
longer touches. This change alone fixes the bug. `validate()` checks
only the settings it is given, and the method no longer gives it the
submission lists, so the old rule in `PKPContextService` never runs on
this path.

A separate consistency change, for the REST API: drop the same old rule
from `PKPContextService::validate()`, so `PUT /contexts/{id}` accepts the
submission languages the screens already store.

```diff
--- a/lib/pkp/classes/services/PKPContextService.php
+++ b/lib/pkp/classes/services/PKPContextService.php
-            $localeProps = ['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales'];
+            $localeProps = ['supportedLocales', 'supportedFormLocales'];
```

Both are in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-language-change-unticks-submission-languages/fix.diff),
which was tried as a whole on `main`, OJS, OMP and OPS. With it, step 8
kept German's "Submissions" and "Metadata" ticks and step 9 offered
"German", "English" and "French (Canada)". A second check had the
administrator disable French (Canada) on the site's list, with the fix in
and out. French left the journal's "Website Languages" both times, so
the website lists still follow the site. With the fix, French kept its
submission ticks and the start page still offered English and French.
Without it, both ticks were emptied, so only English was left and the
start page asked for no language, as it does for any journal with one
submission language.

**Alternatives:**

- Keep the trim but tell the manager what was removed: still breaks the
  independence `pkp/pkp-lib#9425` asked for.

**What goes with it:**

- No data repair is possible: the stored settings do not record which
  ticks a site change took away. Managers tick them again.
- Backport to 3.5: the diff applies there with fuzz (checked with
  `patch --dry-run`). Backport 8a54582819's `AdminLanguageGridHandler`
  hunks with it (recommended). With the fix alone, the submission lists
  are no longer rewritten on 3.5, but the website lists and the site's
  own lists can still be saved as JSON objects. A journal whose lists
  were already saved that way on 3.5 needs a manager to tick or untick
  a box in each such column, which saves that list as an array again
  (`LanguageGridHandler::saveLanguageSetting()`), or an upgrade step
  that re-indexes them.
- 3.4 and 3.3 need nothing: there a journal's language list holds only
  the site's enabled languages, so the trim was correct.

Small: the handler change is two lines in one lib/pkp file and was tried;
there is no data to repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js)
  takes the Steps through the screens on a freshly loaded default
  dataset and reads both language lists and the start page before and
  after. With the argument `neighbour` it takes the disable check of the
  Proposed fix instead. Run from pkp-e2e:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-language-change-unticks-submission-languages/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  with the datasets from pkp/datasets 38ab955 (2026-09-30). Steps and
  Observed were the same on all six, apart from the 3.5 start page in
  Observed's bracket. No request failed and no page script failed.
- Tips: OJS `main` bade233f73 (lib/pkp 2e377d27fc), OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7 (both lib/pkp 3dc90c81a6; the two
  files of the fix are the same as OJS's); `stable-3_5_0` OJS
  92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (all lib/pkp a9c76aed62);
  `stable-3_4_0` lib/pkp df13621c2d; `stable-3_3_0` lib/pkp d446601ebe.
- A search of lib/pkp, the apps and ui-library for
  `supportedSubmissionLocales`, for `array_intersect` on a language list
  and for `localesNotSupported` found only the two places the diff
  changes. No form sends the submission lists through the API.
- Code reads on 3.5: the same handler without `array_values()`, the same
  validator rule, and `Locale::getSubmissionLocaleDisplayNames()`, which
  reads a list that is not a JSON array by its keys.
- Code reads on 3.4 and 3.3: `AdminLanguageGridHandler` trims
  `supportedLocales`, `supportedFormLocales` and
  `supportedSubmissionLocales` (no metadata list), and the journal's
  language list (`ManageLanguageGridHandler::loadData()`) holds only the
  site's enabled languages. Neither branch has 7781b8a799 or
  `SubmissionLanguageGridHandler`.
- Introduced: `git blame` on the `foreach` line gives 7781b8a799. Its
  parent a2324e5bee trimmed `supportedLocales`, `supportedFormLocales`
  and `supportedSubmissionLocales`. The change was merged with
  `pkp/pkp-lib#9309` on 2024-03-21; its OJS, OMP and OPS PRs are
  `pkp/ojs#4040`, `pkp/omp#1461` and `pkp/ops#569`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched for the symptom's words and for `AdminLanguageGridHandler`,
  `_updateContextLocaleSettings`, `supportedSubmissionLocales` and
  `supportedSubmissionMetadataLocales`. `pkp/pkp-lib#12537` (the Settings
  wizard following the site's primary language) touches the same handler
  but is another fault.
- Unverified: what language a submission started on 3.5 gets when the
  start page asks none. Existing submissions' metadata, and the enable
  and remove changes, were read in the code only. The handler change
  alone was not tried apart from the validator change.
- MySQL not checked; nothing here depends on the database.
