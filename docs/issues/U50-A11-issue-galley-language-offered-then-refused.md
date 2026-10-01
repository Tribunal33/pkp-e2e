# "Create Issue Galley" offers a language that "Save" then refuses with "An issue galley locale is required."

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2686` for `pkp/pkp-lib#5643` · [8280863150](https://github.com/pkp/ojs/commit/82808631503348ab30edc5c62cca2f5cf9da24db) · 2020-03-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U50 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a11)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal whose "UI" and "Forms" languages differ, the "Language"
list of "Create Issue Galley" offers the interface ("UI") languages,
but "Save" accepts only the form languages. A Journal Manager who picks
a language the journal has under "UI" alone gets the notice "An issue
galley locale is required." The window stays open with nothing marked,
as if no language had been chosen.

The galley cannot be saved in that language. Neither can an existing
galley whose language has since been unticked under "Forms", even when
only its label is changed. A language ticked under "Forms" alone is
never offered. The manager gets round it only by changing the journal's
languages or the galley's.

## Impact

- **Lost:** nothing stored. The uploaded file stays in the open window
  and is saved once the manager chooses a language "Save" accepts. The
  manager cannot give the galley the language they wanted, and spends
  time working out what the notice means.
- **Who:** Journal Managers and editors adding or editing issue galleys
  (Issues › an issue's "Edit" › "Issue Galleys") on such journals. How
  many journals have different "UI" and "Forms" languages is not known.
  Nothing ties the two columns together, and the issue behind the
  change that brought this fault in (`pkp/pkp-lib#5643`) came from a
  journal with a language under "Forms" alone.
- **Way round:** tick the language under "Forms" (Settings › Website ›
  "Setup" › "Languages"), which adds it to every multilingual field of
  the journal's forms; or save the galley under another language. A
  galley saved under the wrong language shows that language in "Issue
  Galleys" and in the native XML export. Readers do not see it: the
  issue's page lists the galley by its label only.

Medium: a secondary task fails with a misleading notice, there is a way
round on screen, and only journals in this setup meet it.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`. The journal
`publicknowledge` has English and French under both "UI" and "Forms",
and the unpublished issue "Vol. 2 No. 1 (2015)" under "Future Issues".
Any PDF file.

1. Sign in as `dbarnes`.
2. Settings › Website › "Setup" › "Languages": under "Website
   Languages", untick "Forms" in the "French/français" row. French
   stays ticked under "UI".
3. Issues › "Future Issues": open "Vol. 2 No. 1 (2015)" ("Edit"), then
   the "Issue Galleys" tab.
4. "Create Issue Galley": upload the PDF, enter "Galley Label" `PDF`,
   and choose "French" under "Language". The list offers "English" and
   "French".
5. "Save".

**Expected:** the galley saves and is listed as "PDF", "French", or
the "Language" list offers only the languages "Save" accepts (here
"English").

**Observed:** the window stays open with no field marked, and a notice
at the top right reads:

```
An issue galley locale is required.
```

The request behind "Save" answers 200. After "Cancel", and after the
issue is closed and opened again, "Issue Galleys" still reads "No
Items".

The same window with "English" chosen saves, and the list shows "PDF",
"English".

## Cause

`IssueGalleyForm` (OJS `controllers/grid/issues/form/IssueGalleyForm.php`)
builds the "Language" list from one set of languages and checks the
choice against another. `fetch()` (line 90) passes
`$journal->getSupportedLocaleNames()`, the journal's interface ("UI")
languages, to the template's `galleyLocale` select
(`templates/controllers/grid/issueGalleys/form/issueGalleyForm.tpl` line
47). The constructor's `FormValidatorCustom` on `galleyLocale` (lines
61–69) accepts only `$journal->getSupportedFormLocales()`, the form
languages. It fails with `editor.issues.galleyLocaleRequired`, the
message meant for an empty choice.

The two sets agreed until 8280863150 (`pkp/pkp-lib#5643`, "Error in
journal settings form when locale active in Form but not UI"). That
change moved several checks from the interface languages to the form
languages, so that a language ticked under "Forms" only would be
accepted. In this form it changed the check and left the list on the
interface languages.

Nothing is marked on the form for a separate reason. `Form::validate()`
does mark the field (`errorFields['galleyLocale']`) and raises the
notice, but `IssueGalleyGridHandler::update()` (line 293) answers a
refused save with `new JSONMessage(false)` and never sends the form
back, so only the notice reaches the screen. `ArticleGalleyGridHandler::updateGalley()`
sends the refused form back (`new JSONMessage(true, $galleyForm->fetch($request))`,
line 446). This handler fault also leaves the form's other refusals
(a missing file, a refused "URL Path" or "Publisher ID") unmarked. It
is a fault of its own and the fix below leaves it out.

Reach:

- A new galley in a language ticked under "UI" but not under "Forms"
  is refused (walked).
- An existing galley whose language was later unticked under "Forms"
  is refused on "Save", with its language still shown and selected
  (walked).
- A language ticked under "Forms" but not under "UI" is accepted by the
  check but never offered (walked).
- The "Issue Galleys" list shows its "Language" column only when the
  journal has more than one interface language
  (`IssueGalleyGridHandler::initialize()`, line 163) (code).
- Article galleys (`ArticleGalleyForm`) check the choice (line 65)
  against the submission's own language, its publications' languages,
  the journal's "Submissions" languages and the galley's own
  languages, and list (line 95) the journal's "Submissions" languages,
  the publications' languages and the galley's own, so the two agree
  (code). A search of OJS and pkp-lib for `getSupportedLocaleNames()`
  and `getSupportedFormLocales()` found no other form that offers one
  set and checks another.

## Proposed fix

A proposal; the team decides. In `IssueGalleyForm`, build the list and the check from one helper:
the journal's form languages, plus the language an existing galley
already has. That keeps the intent of `pkp/pkp-lib#5643` (form-only
languages are accepted, and now also offered). It follows
`ArticleGalleyForm`, which adds the galley's own languages to both its
list and its check, so that an existing galley keeps its language.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-galley-language-offered-then-refused/fix.diff),
in full:

```diff
+use APP\journal\Journal;
 use APP\journal\JournalDAO;
 use APP\template\TemplateManager;
 use PKP\db\DAORegistry;
+use PKP\facades\Locale;
 use PKP\file\TemporaryFileDAO;
 use PKP\form\Form;
+use PKP\i18n\LocaleMetadata;
 ...
-            function ($galleyLocale) use ($journal) {
-                return in_array($galleyLocale, $journal->getSupportedFormLocales());
-            }
+            fn ($galleyLocale) => in_array($galleyLocale, $this->getGalleyLocales($journal))
 ...
+    /**
+     * The languages an issue galley may be in: the journal's form languages,
+     * and the language an existing galley already has.
+     */
+    protected function getGalleyLocales(Journal $journal): array
+    {
+        return array_values(array_unique(array_filter([
+            ...($journal->getSupportedFormLocales() ?? []),
+            $this->_issueGalley?->getLocale(),
+        ])));
+    }
 ...
-            'supportedLocales' => $journal->getSupportedLocaleNames(),
+            'supportedLocales' => Locale::getFormattedDisplayNames($this->getGalleyLocales($journal), null, LocaleMetadata::LANGUAGE_LOCALE_WITHOUT),
```

Tried on OJS `main`: with French unticked under "Forms" the list
offers only "English", which saves. An existing French galley saves,
still French, after French is unticked under "Forms". French under
"Forms" alone is offered and saves.

**Alternatives:**

- Check against the interface languages again (revert the one line of
  8280863150). This undoes what `pkp/pkp-lib#5643` asked for, and an
  existing galley whose language was unticked under "Forms" would still
  be refused once it is also unticked under "UI".
- Offer the form languages without the galley's own. An existing
  galley whose language was unticked under "Forms" would then open
  with "English" selected and be relabelled on "Save" without a word.
- Use the "Submissions" languages, as article galleys do. This is a
  product choice: the issue's own title and description are written in
  the form languages, so the fix stays with them.

**What goes with it:**

- No data repair: stored galleys keep their language.
- One case the helper does not cover: a galley whose language the
  administrator has uninstalled from the site.
  `getFormattedDisplayNames()` lists only installed languages, so the
  list opens with "English" selected and "Save" relabels the galley
  without a word. That is what happens today as well (the current list
  is also limited to installed languages, and English passes the
  check), it needs an uninstalled language that galleys still use, and
  the fix leaves it as it is.
- The "Language" column of "Issue Galleys" still follows the interface
  languages, so with French under "Forms" only, French galleys are
  listed without their language. Making the column follow the galley
  languages needs a rule for galleys whose language the journal no
  longer has, so that change is not part of this fix.
- The unmarked refusal (`IssueGalleyGridHandler::update()` not sending
  the form back) is a separate fix: return the form as
  `ArticleGalleyGridHandler::updateGalley()` does.
- Backport: the same two lines exist on 3.5 and 3.4, and the diff
  applies there. 3.3 runs on PHP 7.3, so the helper there needs a plain
  closure in place of `fn`, `array_merge()` in place of the spread and
  a null check in place of `?->`. The list there is
  `getSupportedFormLocaleNames()` plus the galley's own language with
  its display name.
- Guard: an e2e case in U50 (a French issue galley with French unticked
  under "Forms"), or a unit test of the form's check and list.

Small: one new method, two changed lines and three `use` lines in one
file, following the article galley form, with a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-galley-language-offered-then-refused/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-language-offered-then-refused/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no
  `PHASE` it takes steps 1–5 and then the English control.
  `PHASE=neighbour` takes the second and third Reach bullets of the
  Cause: a French galley saved, French unticked under "Forms", the
  galley's label edited and saved; then French ticked under "Forms" and
  unticked under "UI", and a new galley in French.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/issue-galley-language-offered-then-refused/fix.diff ojs`,
  the script in both phases, then `node bin/try-fix.js revert ojs`.
  `PHASE=neighbour` was also run without the fix. A dry run of
  `patch -p1` applies the diff cleanly to the `stable-3_5_0` and
  `stable-3_4_0` files; it was not tried there.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–5 and the control on `main` and
  `stable-3_5_0`, with the same result. OMP and OPS have no issue
  galleys.
- Seen on the way, not part of this finding and tracked elsewhere:
  each visit to Settings › Website answered 500 on the plugin gallery's
  `fetch-grid` (the test installs cannot reach pkp.sfu.ca), and
  unticking "UI" logged five `TypeError: Cannot read properties of
  undefined (reading 'filter')` in the browser.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads:
  - 3.5: `IssueGalleyForm.php` lines 61–69 and 90, as on `main`.
  - 3.4: `controllers/grid/issues/form/IssueGalleyForm.php` line 67
    checks `getSupportedFormLocales()`, line 90 lists
    `getSupportedLocaleNames()`; the template's line 47 is unchanged.
  - 3.3: `controllers/grid/issues/form/IssueGalleyForm.inc.php` line 48
    checks `getSupportedFormLocales()`, line 67 lists
    `getSupportedLocaleNames()`. pkp-lib's `Context::getSupportedFormLocaleNames()`
    exists on both branches.
  - 8280863150 is on all three stable branches; it first shipped in
    the tag `3_2_0-1`, and `3_2_0-0` still checked
    `getSupportedLocales()`.
  - `main`, for the Impact and the fix, not driven: the uploaded file's
    id sits in the window's hidden `temporaryFileId` field
    (`issueGalleyForm.tpl` line 32), which a refused save leaves in
    place, and `IssueGalleyForm::execute()` reads it on the next save.
    The issue's page lists issue galleys through
    `frontend/objects/galley_link.tpl`, which prints no language;
    `IssueGalleyNativeXmlFilter` (line 84) exports the stored one.
    `AdminLanguageGridHandler::uninstallLocale()` lets an administrator
    uninstall any language but the site's primary one, and
    `Locale::getFormattedDisplayNames()` keeps only installed languages.
    `LanguageGridHandler::saveLanguageSetting()` saves each "UI" and
    "Forms" box on its own.
- Introduced: `git blame` on line 67 gives 665ed1f925 (the PSR-12
  reformat, `pkp/pkp-lib#5678`). `git log -S'getSupportedFormLocales()'`
  on the file gives 8280863150, merged through `pkp/ojs#2686`
  (2020-03-20). Before it, `pkp/ojs#1917` and `pkp/ojs#1918` (for
  `pkp/pkp-lib#3593`, 2018) had changed the check from
  `getSupportedLocaleNames()` to `getSupportedLocales()`, matching the
  list.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for "issue
  galley locale required", "issue galley language", the notice's text,
  `IssueGalleyForm` and `galleyLocale`. `pkp/pkp-lib#3593` is the
  earlier mismatch, closed with its fix in 2018; nothing tracks this
  one.
- MySQL not checked; the fault does not depend on the database.
