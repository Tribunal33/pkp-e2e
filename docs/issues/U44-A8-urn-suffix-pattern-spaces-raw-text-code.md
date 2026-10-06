# URN settings: a suffix pattern of spaces is refused with a raw text code instead of a message

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** OJS: `pkp/pkp-lib#1457` · [dba6c9d597](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a8)
- **Checked** 2026-10-02, each branch's latest commit (listed in Evidence)
- **Model** claude-opus-5-5

## Summary

In the URN plugin's settings window, a manager can choose "Use the
pattern entered below…" and type a suffix pattern for each content type
that gets URNs (issues, articles and galleys on a journal; monographs,
chapters, publication formats and files on a press). When a ticked
type's pattern box holds only spaces, "Save" is refused, rightly. But
the message under each such box and in the list at the top of the
window is a raw text code, such as
"##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##",
instead of "Please enter the URN suffix pattern for articles."

Every content type shows its own code. The cause is that the form asks
for message keys that no locale file defines, so the fix is to name the
right keys.

## Impact

- **Lost**: nothing.
- **Who**: a journal or press manager setting up URN suffix patterns,
  only when a pattern box holds nothing but spaces. The URN plugin is
  off until a manager turns it on.
- **Way round**: type a pattern into the box the code sits under. An
  empty box is refused with a proper message, "This field is required."

Low: a wrong message on a narrow input, while the refusal itself is
right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP the same, with the
  differences in brackets). The "URN" plugin is off in the dataset.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins".
3. Under "Public Identifier Plugins", tick "Enabled" on the "URN" row.
4. Click the "URN" row's arrow, then "Settings". The "URN" window opens.
5. Under "Journal Content", tick "Issues", "Articles" and "Galleys"
   [OMP: under "Press Content", "Monographs", "Chapters", "Publication
   Formats" and "Files"].
6. Fill "URN Prefix" with `urn:nbn:de:0000-`, choose `urn:nbn:de` as
   "Namespace" and fill "Resolver URL" with `https://nbn-resolving.de/`.
7. Under "URN Suffix", select "Use the pattern entered below to generate
   URN suffixes. …".
8. Type one space into each box under it: "for issues", "for articles",
   "for galleys" [OMP: "for monographs", "for chapters", "for
   publication formats", "for files"].
9. Click "Save".
10. Click "Save" again.

**Expected**: in step 9 the window stays open, and under each box and
in the list at the top reads "Please enter the URN suffix pattern for
issues." ("… for articles.", "… for galleys."; OMP "… for monographs.",
"… for chapters.", "… for publication formats.", "… for files.").

**Observed**: in step 9 the window stays open with the boxes emptied.
Under each box, and in the list under "Errors occurred processing this
form:" at the top, reads a text code:

```
##plugins.pubIds.urn.manager.settings.form.urnIssueSuffixPatternRequired##
##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##
##plugins.pubIds.urn.manager.settings.form.urnRepresentationSuffixPatternRequired##
```

OMP shows `…form.urnPublicationSuffixPatternRequired##`,
`…form.urnChapterSuffixPatternRequired##`,
`…form.urnRepresentationSuffixPatternRequired##` and
`…form.urnSubmissionFileSuffixPattern##`.

In step 10 the boxes are empty, and the page refuses "Save" without
sending it: "This field is required." under each box.

## Cause

`URNSettingsForm::__construct()` in
`plugins/pubIds/urn/classes/form/URNSettingsForm.php` (OJS and OMP)
gives each content type's pattern check a message key with a `.form`
segment, `plugins.pubIds.urn.manager.settings.form.urn{Type}SuffixPatternRequired`
(OJS lines 76, 82, 88; OMP lines 74, 80, 86, 92). The plugin's locale
files define these messages without it,
`plugins.pubIds.urn.manager.settings.urn{Type}SuffixPatternRequired`.
OMP's file check also drops `Required`
(`…form.urnSubmissionFileSuffixPattern`). `Locale::get()` renders a key
it cannot find as `##key##`.

Only a box of spaces reaches these messages. The checks are created as
`'required'`, so `FormBuilderVocabulary::_addClientSideValidation()`
gives the pattern boxes a `required` class, and jQuery Validation
(wired in `FormHandler.js`) refuses an empty box with its default "This
field is required." before anything is sent. Its `required` rule does
not trim, so a box of spaces gets through. The server then trims the
value to empty (`PKPRequest::getUserVar()`), and the check fails with
the missing key.

In OJS the split began with dba6c9d597 (the 3.0 public identifiers
rewrite). It renamed the English messages from
`…settings.form.urn…SuffixPatternRequired` to
`…settings.urn…SuffixPatternRequired`, and left the form's keys on
`.form`. A follow-up, 6472291f8d (`pkp/ojs#918`), brought eight
translations into line with the English. OMP's plugin, added in
825986f471, had the same split from its first commit.

Reach:

- OJS: issues, articles and galleys. OMP: monographs, chapters,
  publication formats and files.
- The window's other checks use keys that exist (`…form.urnPrefixPattern`,
  `…form.urnResolverRequired`, `…urnObjectsRequired`). Every other
  `plugins.pubIds.urn.*` key used in the plugin's PHP, templates and
  script is defined (checked in the code, both apps).
- A separate translation gap: the OJS locales dsb, eu, hsb, mn, ps and
  zh_Hans, and OMP's fr_CA, hold no URN suffix messages at all.
  `Locale::translate()` has no fallback to English, so in those
  languages even the fixed keys show a raw key.

## Proposed fix

Point the form's checks at the keys the locale files define, in
`URNSettingsForm::__construct()`, one diff per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-spaces-raw-text-code/fix-ojs.diff)
and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-spaces-raw-text-code/fix-omp.diff).

```diff
-        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'urnPublicationSuffixPattern', 'required', 'plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired', function ($urnPublicationSuffixPattern) use ($form) {
+        $this->addCheck(new \PKP\form\validation\FormValidatorCustom($this, 'urnPublicationSuffixPattern', 'required', 'plugins.pubIds.urn.manager.settings.urnPublicationSuffixPatternRequired', function ($urnPublicationSuffixPattern) use ($form) {
```

The same for the issue and galley checks (OMP: chapter, publication
format, and the file check, whose key becomes
`plugins.pubIds.urn.manager.settings.urnSubmissionFileSuffixPatternRequired`).
Tried on `main` in OJS and OMP: step 9 showed each "Please enter the URN
suffix pattern for …" message under its box and at the top. A save
with real patterns in every box worked the same with the fix in and
out.

**Alternatives**:

- Rename the messages back to `…settings.form.…` in the locale files:
  it touches every translation in both apps, and the translation
  platform's history, for the same result.
- Trim in the browser so a box of spaces is refused as empty: it hides
  the server's message rather than fixing it, and the server check
  would still name a missing key.

**What goes with it**:

- Backport: the diffs apply as written to `stable-3_5_0` and
  `stable-3_4_0` (OMP 3.4 one line lower). On `stable-3_3_0` the file
  is `URNSettingsForm.inc.php`, with tab indentation and unqualified
  validator classes, so the same keys change by hand.
- Test: an e2e check in the spec (a **Planned** item) that saves a box
  of spaces and reads the message under it.

Small: three or four keys in one file per app, and a check.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-spaces-raw-text-code/walk.js),
  run on an install freshly loaded from the default dataset
  (pkp/datasets c657990, 2026-10-01, PostgreSQL), on `main` and
  `stable-3_5_0`, OJS and OMP. It records the messages under each box,
  the list at the top, any text outside the window, and the save
  requests each "Save" sends (one in step 9, none in step 10).
  `WALK=neighbour` runs the control save with real patterns.
- Branch commits walked or read: `main` OJS b84f8e2e44, OMP 3b0ecf794;
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246; `stable-3_4_0` OJS
  75cc2d488b, OMP 0aec65441; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883.
- 3.5, 3.4 and 3.3 (code), both apps: `URNSettingsForm.php`
  (`.inc.php` on 3.3) holds the same `…settings.form.…` keys, and the
  English locale file (`locale/en_US/locale.po` on 3.3) defines only
  the keys without `.form`. `PKPRequest` trims request values and the
  locale class renders a missing key as `##key##` on each branch.
- Introduced: `git log -S` on the form's keys and the locale's keys.
  dba6c9d597 changed `locale/en_US/locale.xml` from `.form` keys to
  keys without it, and kept `.form` in `URNSettingsForm.inc.php`; no PR
  was found for it on GitHub. 6472291f8d (`pkp/ojs#918`) touched only
  eight translation files (de_DE, id_ID, it_IT, nl_NL, pt_BR, sr_SR,
  tr_TR, uk_UA). OJS 2.x had `.form` on both sides, but the split
  predates the 3.0 release, so no 3.x release showed the right message.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp, issues and PRs,
  for "URN suffix pattern required", "URN suffix pattern message",
  "URN plugin locale key missing", "URN settings form message",
  `urnPublicationSuffixPatternRequired` and `SuffixPatternRequired`.
  `pkp/pkp-lib#10927` is about the prefix message in the same window,
  a different fault.
