# An issue galley in an interface-only language is refused as if no language were chosen

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2686` for `pkp/pkp-lib#5643` · [8280863150](https://github.com/pkp/ojs/commit/82808631503348ab30edc5c62cca2f5cf9da24db) · 2020-03-19 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#3593` (closed, fixed in 2018 by [43bbd2f62e](https://github.com/pkp/ojs/commit/43bbd2f62ef0ca7c32f473c999e1d4145bd1919c); the change under Introduced undid that fix)
- **Tracked in** spec U50 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Journal Manager adds a galley to an issue and picks, in the "Language"
list of "Create Issue Galley", a language the journal offers as an
interface language but has not turned on for its forms. "Save" keeps the
window open with no box marked, and a notice reads "An issue galley locale
is required.". No galley is saved.

The same refusal blocks edits. A manager may turn a language off for forms
while keeping it for the interface. After that, every "Save" on a galley
already in that language is refused with the same notice. Readers still
see the galley on the issue's page; only the edit is blocked.

A second symptom has the same cause and the same fix. The save check
accepts a language that is turned on for forms but not for the interface,
but the "Language" list never offers it.

## Impact

- **Lost**: the galley the manager tried to add, or the edit to an existing
  one. The notice names the wrong problem, so nothing on screen points to
  the "Forms" box.
- **Who**: Journal Managers and editors who add or edit issue galleys (a
  full-issue PDF) on a journal whose "UI" and "Forms" languages differ, a
  setting a journal chooses rather than the default.
- **Way round**: the screen offers one: choose another language. The other
  is hidden: tick "Forms" for the language in Settings › Website › "Setup"
  › "Languages". That adds the language's boxes to every multilingual form
  of the journal, not only this one.

Medium: adding or editing a galley in such a language fails with a message
that misleads, and a galley already saved in it can no longer be edited
until the language is a form language again. The setup is not the default,
and choosing another language gets a new galley saved. It would be high if
issue galleys in such languages could not be added or kept by any means.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`): the journal
  `publicknowledge` has English and French as interface ("UI"), "Forms"
  and submission languages, and "Vol. 2 No. 1 (2015)" under "Future
  Issues", with no issue galleys.
- Any PDF file on your computer.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Website › "Setup" › "Languages". Under "Website
   Languages", untick "Forms" on the "French/français" row. Its "UI" box
   stays ticked, so French is now an interface-only language.
3. Open Issues (`/index.php/publicknowledge/manageIssues`), "Future
   Issues". On "Vol. 2 No. 1 (2015)" press the row's arrow, then "Edit".
4. Open the "Issue Galleys" tab and press "Create Issue Galley".
5. Upload the PDF under "Issue Galley", type "PDF" in "Galley Label", and
   choose "French" in "Language". The list offers "English" and "French".
6. Press "Save".

**Expected.** Either "Language" offers only languages that "Save" accepts,
or the galley saves: the window closes and "PDF" joins the list with
"French" under "Language".

**Observed.** The window stays open, no box is marked, and a notice at the
top right reads:

```
An issue galley locale is required.
```

The save request answered 200 with `"status": false` in its JSON. When the
window is cancelled, the list still shows no galley.

Control: the same galley with "English" chosen at step 5 saves, and the
list shows "PDF" with "English".

## Cause

`IssueGalleyForm` (OJS, `controllers/grid/issues/form/IssueGalleyForm.php`)
takes its "Language" list from one set of languages and checks the answer
against another. `fetch()` (line 90) fills the list with
`Context::getSupportedLocaleNames()`, the journal's interface languages.
The constructor's `FormValidatorCustom` on `galleyLocale` (line 67) accepts
only `Context::getSupportedFormLocales()`, the form languages, and fails
with `editor.issues.galleyLocaleRequired` ("An issue galley locale is
required."). A language that is an interface language but not a form
language is offered and refused; a form language that is not an interface
language is accepted but never offered.

The two used to agree. `pkp/pkp-lib#3593` (43bbd2f62e, 2018) met this very
notice and made the check use `getSupportedLocales()`, matching the list.
8280863150 (`pkp/pkp-lib#5643`, "Fix validation errors with some locale
configurations") moved the check to `getSupportedFormLocales()` so that a
language active for forms but not for the interface would validate, and
left the list on the interface languages.

`IssueGalleyGridHandler::update()` answers a refused form with
`JSONMessage(false)` (line 293) and does not draw the form again, so the
message shows only as a notice and no box is marked.

Reach:

- editing a stored galley: `initData()` selects its language, and the same
  check refuses it (on screen);
- the galley list's "Language" column (`IssueGalleyGridHandler::initialize()`,
  line 163) appears only when the journal has more than one interface
  language. With a forms-only second language, the column stays hidden even
  when the stored galleys are in two languages (on screen);
- galleys imported with the Native XML plugin take the `locale` the file
  names, unchecked (`NativeXmlIssueGalleyFilter`), so stored galleys can
  be in any language (code);
- readers are not affected: the issue's page lists every galley of the
  issue, whatever its language (`IssueHandler::setupIssueTemplate()` line 399,
  `IssueGalleyDAO::getByIssueId()`, no language filter) (code);
- article galleys are not affected: `ArticleGalleyForm` builds its list and
  its check from the same languages (code). OMP and OPS have no issues.

## Proposed fix

Offer the languages the check accepts, the form languages, plus the
language a galley being edited already has, and let the check accept that
language too. This is how `ArticleGalleyForm` treats an article galley's
own languages. Highlights pair the same two sets: `HighlightForm` offers
`getSupportedFormLocaleNames()`, and `PKP\highlight\Repository::validate()`
checks against `getSupportedFormLocales()`. The galley list's "Language"
column then shows whenever galleys can be in more than one language
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-galley-interface-language-refused/fix.diff)):

```diff
 use PKP\db\DAORegistry;
+use PKP\facades\Locale;
 use PKP\file\TemporaryFileDAO;
 …
-            function ($galleyLocale) use ($journal) {
-                return in_array($galleyLocale, $journal->getSupportedFormLocales());
+            function ($galleyLocale) use ($journal, $issueGalley) {
+                return in_array($galleyLocale, $journal->getSupportedFormLocales())
+                    || ($issueGalley && $galleyLocale === $issueGalley->getLocale());
             }
 …
+        // Offer the languages the validation accepts
+        $supportedLocales = $journal->getSupportedFormLocaleNames();
+        if ($galleyLocale = $this->_issueGalley?->getLocale()) {
+            $supportedLocales[$galleyLocale] ??= Locale::getMetadata($galleyLocale)?->getDisplayName() ?? $galleyLocale;
+        }
 …
-            'supportedLocales' => $journal->getSupportedLocaleNames(),
+            'supportedLocales' => $supportedLocales,
```

and in `IssueGalleyGridHandler::initialize()`:

```diff
-        if (count($journal->getSupportedLocaleNames()) > 1) {
+        if (count(array_unique(array_merge($journal->getSupportedLocales() ?? [], $journal->getSupportedFormLocales() ?? []))) > 1) {
```

This keeps the intent of `pkp/pkp-lib#5643`: what a galley is saved in is
checked against the form languages. The stored language stays in the list
so that an edit never moves a galley to another language unasked. If the
list lacked it, the browser would select the list's first language, and
"Save" would store that one.

Tried on `main`: with the fix in, step 5 offers only "English" and the
galley saves in English. A second walk checks the fix's reach, with the
fix in and out. A French galley saves either way while French is both an
interface and a form language. With the fix in, that galley keeps French
and saves after French is turned off for forms, and a forms-only French is
offered and saves, with the "Language" column shown.

**Alternatives**

- Check against the interface languages again (revert to 2018): reopens
  `pkp/pkp-lib#5643` for forms-only languages.
- Offer and accept the submission languages, as article galleys do: an
  issue galley is the issue's own file, and its other data (title,
  description) is in the form languages. That is a product choice.

**What goes with it**

- No API or plugin hook change; issue galleys have no REST endpoint. No
  stored data needs repair: galleys already saved keep their language.
- Backport: the diff applies to 3.5 and 3.4 as written. 3.3 (`.inc.php`
  files, PHP 7.3) needs the nullsafe `?->` and the `??=` written out, and
  `AppLocale::getAllLocales()` in place of `Locale::getMetadata()`.
- Guard: an e2e scenario on Issues (a journal with an interface-only
  language: "Language" offers only languages "Save" accepts), a **Planned**
  item in spec U50.

Small: two methods of one form and one condition in its grid, with no data
to repair.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-galley-interface-language-refused/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/issue-galley-interface-language-refused/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The same script with `neighbour` as its
  argument takes the second walk on a fresh load: a French galley while
  French is both languages; that galley edited after French "Forms" is
  unticked (refused without the fix); and French "Forms" ticked again with
  "UI" unticked (the forms-only symptom).
- Walked on `main` and `stable-3_5_0`, OJS, with the same observation on
  both. No request answered 500.
- Seen during the second walk: re-ticking French "Forms" logs a browser
  `TypeError`, with the fix in and out; reported as
  [U57 A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U57-A5-forms-language-tick-date-time-script-error.md).
- The `?? []` guards in the grid condition were added after the trial; the
  tried diff passed the two getters to `array_merge()` unguarded.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a); `stable-3_5_0` OJS
  c346ee00a5 (pkp-lib 3bb4450bea); `stable-3_4_0` OJS 75cc2d488b (pkp-lib
  32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib f6ab331645).
- 3.5 (walked), 3.4 and 3.3 (code): read
  `controllers/grid/issues/form/IssueGalleyForm.php` (3.3:
  `.inc.php`) constructor and `fetch()`,
  `controllers/grid/issueGalleys/IssueGalleyGridHandler.php` (3.3:
  `.inc.php`) column set-up, and
  `templates/controllers/grid/issueGalleys/form/issueGalleyForm.tpl`: the
  same list and check on every branch. `Context::getSupportedFormLocaleNames()`
  exists on all four.
- Introduced: `git blame` on the check's line gives 665ed1f925 (the 2021
  PSR-12 reformat); `git log -S getSupportedFormLocales` on the file gives
  8280863150, which changed `getSupportedLocales()` to
  `getSupportedFormLocales()` in the check only. It is in every release
  since 3.2.0-1.
- Upstream: searched pkp/pkp-lib and pkp/ojs, issues and PRs, for "issue
  galley locale required", "issue galley language", `IssueGalleyForm` and
  `galleyLocaleRequired`, and pkp/ui-library for "issue galley language".
  `pkp/pkp-lib#3593` is this fault as met in 2018. `pkp/pkp-lib#12826`
  (remove the grid code, open) would replace these screens but tracks no
  such fault.
- Not driven: the Native XML import of a galley in another language, and
  the reader's issue page with such a galley (code only).
