# URN settings: a suffix pattern of only spaces is refused with a raw text code instead of a message

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** [dba6c9d5](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) for `pkp/pkp-lib#1457` · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f4](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the URN plugin's settings window, with "Use the pattern entered
below…" chosen, a pattern box that holds only spaces is refused on
"Save", rightly. But the message under the box and at the top of the
window is a text code such as
"##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##"
instead of "Please enter the URN suffix pattern for articles." An empty
box is refused properly, with "This field is required."

Nothing is saved wrong, and the manager gets past it by typing a
pattern. The code shows in every interface language. OPS has no URN
plugin.

## Impact

- **Lost.** Nothing: the settings stay as they were. The manager reads
  a code where the message should say what to type.
- **Who.** A Journal manager or Press manager setting up the URN plugin
  with typed patterns, whose pattern box holds nothing but white space.
  That happens, for instance, when a manager blanks a pattern by typing
  spaces over it, or pastes a value that is only white space. It is rare.
- **Way round.** Type a pattern in the box, or choose another "URN
  Suffix" option.

Low: a raw text code on a rare input; nothing is lost and the task gets
done.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP `main` in brackets). The URN
  plugin is off in the dataset; turning it on is part of the steps.

Steps:

1. Sign in as `rvaca` (Journal manager) [Press manager].
2. Open Settings › Website, tab "Plugins".
3. In the "URN" row, tick the box to enable the plugin.
4. Open the row's "Settings". The window "URN" opens.
5. Under "Journal Content" ["Press Content"], tick "Issues", "Articles"
   and "Galleys" ["Monographs", "Chapters", "Publication Formats" and
   "Files"].
6. "URN Prefix": `urn:nbn:de:0000-`.
7. "URN Suffix": choose "Use the pattern entered below to generate URN
   suffixes…".
8. In each pattern box ("for issues", "for articles", "for galleys"
   ["for monographs", "for chapters", "for publication formats", "for
   files"]) type three spaces.
9. "Namespace": "urn:nbn:de"; "Resolver URL": `https://nbn-resolving.de/`.
10. "Save".

**Expected:** "Save" is refused. Under each box, and in the list at the
top of the window, the box's own message: "Please enter the URN suffix
pattern for issues.", "… for articles.", "… for galleys." ["… for
monographs.", "… for chapters.", "… for publication formats.", "… for
files."].

**Observed:** "Save" is refused and the window stays open with the
pattern boxes emptied. The list at the top of the window reads:

```
Errors occurred processing this form:
##plugins.pubIds.urn.manager.settings.form.urnIssueSuffixPatternRequired##
##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##
##plugins.pubIds.urn.manager.settings.form.urnRepresentationSuffixPatternRequired##
```

Under each box is the one code for that box ("for articles":
`##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##`).

[On a press the four codes are
`##plugins.pubIds.urn.manager.settings.form.urnPublicationSuffixPatternRequired##`,
`##plugins.pubIds.urn.manager.settings.form.urnChapterSuffixPatternRequired##`,
`##plugins.pubIds.urn.manager.settings.form.urnRepresentationSuffixPatternRequired##`
and
`##plugins.pubIds.urn.manager.settings.form.urnSubmissionFileSuffixPattern##`.]

Control: with the boxes left empty at step 8, "Save" sends nothing and
each box reads "This field is required."

## Cause

`URNSettingsForm::__construct()` (`plugins/pubIds/urn/classes/form/URNSettingsForm.php`,
OJS lines 76–93, OMP lines 74–97) gives each suffix pattern's
`FormValidatorCustom` a message key with a `.form.` segment:
`plugins.pubIds.urn.manager.settings.form.urn{Issue,Publication,Representation}SuffixPatternRequired`.
On a press it also uses `…form.urnChapterSuffixPatternRequired` and
`…form.urnSubmissionFileSuffixPattern`; the files key also lacks the
`Required` ending the locale has. The plugin's locale files define
these messages without `.form.`
(`plugins.pubIds.urn.manager.settings.urnPublicationSuffixPatternRequired`
and so on), and no locale file defines the `.form.` variant.
`Locale::get()` renders a key it cannot find as `##<key>##`, and the
form shows that under the box and in the error list.

Only white space reaches this check. The `'required'` type of the same
`FormValidatorCustom` makes `FormValidator::__construct()` add
`required` to the form's `cssValidation`. `FormBuilderVocabulary`
renders that as a class on the box, and the browser's jQuery Validate
then refuses an empty enabled box before anything is sent. Spaces pass
that check. The server trims the request's values
(`PKPRequest::getUserVars()`), and the box's own comparison
(`$urnIssueSuffixPattern != ''`, `$urnPublicationSuffixPattern != ''`
and so on) refuses the now-empty value with the missing key.

The keys broke when the OJS locale was reworked for the public
identifier refactoring (dba6c9d5, `pkp/pkp-lib#1457`), before OJS 3.0
was released. That change dropped `.form.` from the English messages,
and the form kept it. Before it, both used
`…settings.form.urnIssueSuffixPatternRequired`, as in OJS 2.4. Half a
year later the OMP plugin was written from the OJS one (825986f4) with
the same mismatch.

Reach:

- The window's other messages resolve. `…settings.urnObjectsRequired`,
  `…settings.form.urnPrefixPattern` and `…settings.form.urnResolverRequired`
  are defined under the keys the form uses: all three checked in the
  code, and the prefix refusal also seen in the browser.
- Other forms: a scan of every `addCheck()` message key in the three
  apps against their English `.po` files finds other keys with no text
  (`manager.setup.form.genre.nameRequired` in `GenreForm`,
  `manager.setup.form.section.nameRequired` in OJS and OPS
  `SectionForm`, `manager.setup.form.series.nameRequired` in OMP
  `SeriesForm`, `grid.catalogEntry.priceRequired` and `…typeRequired` in
  OMP `MarketForm` and `SalesRightsForm`,
  `editor.submissions.galleyLabelRequired` in OPS `PreprintGalleyForm`,
  `plugins.generic.staticPages.nameRequired` in `StaticPageForm`, and
  `reviewer.submission.reviewFormResponse.form.responseRequired` on OMP
  and OPS). Each is another form with its own key, left out of this fix;
  none was driven.
- In the same constructor, OMP's check that at least one kind is ticked
  ignores "Chapters" and "Files". That is a separate fault:
  [U44 OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp1).

## Proposed fix

In each app's `URNSettingsForm`, point the checks at the keys the
locale files define (tried on `main`):
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/fix-omp.diff).

```diff
-'plugins.pubIds.urn.manager.settings.form.urnIssueSuffixPatternRequired'
+'plugins.pubIds.urn.manager.settings.urnIssueSuffixPatternRequired'
 (the same for Publication, Representation and, on OMP, Chapter)
-'plugins.pubIds.urn.manager.settings.form.urnSubmissionFileSuffixPattern'
+'plugins.pubIds.urn.manager.settings.urnSubmissionFileSuffixPatternRequired'
```

The locale files are maintained through Weblate, so the form should
follow them rather than the other way round. With the fix in, each box
shows its own message under the box and in the list at the top. No
template change is needed: the browser's check comes from the same
validator.

**Alternatives:**

- Rename the messages in the locale files back to `.form.`: about 75
  files across the two plugins and their translations, for the same
  result.
- Refuse spaces in the browser too: the user would no longer see the
  server's message, but its key would still be wrong.

**What goes with it:**

- No stored data changes; the plugin's settings and API are untouched.
- Six OJS locales (`dsb`, `eu`, `hsb`, `mn`, `ps`, `zh_Hans`) and OMP's
  `fr_CA` do not translate these messages. `Locale::get()` on `main` has
  no English fallback, so those interfaces will show the corrected key
  until the messages are translated.
- The diffs apply as written to `stable-3_5_0` and `stable-3_4_0` (OMP
  3.4 at a one-line offset). On `stable-3_3_0` the same string edits go
  in `URNSettingsForm.inc.php`.
- A guard: a check in pkp-e2e's
  [identifiers spec](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md)
  scenario "Configure the URN plugin", which already covers the prefix
  refusal. It saves a pattern box of spaces and expects the box's
  message. A unit test in the app would have to build the form with a
  plugin object and a request, since the constructor calls
  `Application::get()->getRequest()` for its "Reassign URNs" action, and
  the URN plugin has no `tests/` folder yet.

Small: three string edits in one file per app (four on OMP).

## Evidence

- Kept scripts, in
  [urn-suffix-pattern-refusal-text-code/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/walk.js)
    first saves with the boxes empty (the control), then takes steps
    1–10, on a fresh load of the default dataset:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/neighbour.js),
    walked with the fix in and out, each on a fresh load. It saves real
    patterns with a prefix lacking `urn:`, which is refused with `The URN
    prefix pattern must be in the form "urn:"<NID>":"<NSS>.` at the top
    and nothing under the pattern boxes. With the prefix corrected, the
    window saves ("Your changes have been saved.") and reopens with the
    patterns. The result was the same with the fix in and out.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-suffix-pattern-refusal-text-code/fix-ojs.diff ojs`
    and `… fix-omp.diff omp`, then `walk.js` and `neighbour.js`, then
    `node bin/try-fix.js revert ojs omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS and
  OMP, every step. The fault is a message key, so the database plays no
  part. 3.4 and 3.3 were read in the code: the form and the English
  locale file on each branch, and the missing-key and trimming code in
  its pkp-lib (3.3: `PKPLocale::translate()` with `addOctothorpes()`).
- Tips: `main` OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 92b9a16b48 (lib/pkp
  a9c76aed62), OMP 3081c9b00; `stable-3_4_0` OJS 9571d8fde7, OMP
  0aec65441, lib/pkp df13621c2d; `stable-3_3_0` OJS 9fdb9bcf9a, OMP
  8e72fc883, lib/pkp d446601ebe.
- Introduced: `git log -S` on the keys. In OJS, dba6c9d5 ("pkp/pkp-lib#1457
  pub ids") replaces `…settings.form.urnIssueSuffixPatternRequired` and
  its siblings in `locale/en_US/locale.xml` with keys without `.form.`,
  while the form's checks keep `.form.`. ce8a2617 (`pkp/pkp-lib#5208`,
  2019) later renamed `…form.urnSubmissionSuffixPatternRequired` to
  `…form.urnPublicationSuffixPatternRequired` and kept the mismatch. In
  OMP, the plugin's first commit (825986f4) already has the mismatch.
- Kind: defect rather than regression. The keys matched in OJS 2.4
  (tag `ojs-2_4_8-0`), but dba6c9d5 was part of the unreleased 3.0
  rewrite and is in `ojs-3_0_0-0`, so no OJS 3.x release ever showed
  the message, and OMP never did. "Regression" would hold only for OJS
  against 2.4.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/omp searched for "URN suffix
  pattern", the key names, "URNSettingsForm" and "URN locale key".
  `pkp/pkp-lib#8811` (the window failing to open on 3.3) is another
  fault.
- Unverified: the spec's description of this fault also names a notice
  at the top right showing the code. The walks did not capture one
  within six seconds of the refusal. For the prefix refusal, the notice
  showed only after the next action.
- Under the pattern choice, ticking a box in the window raises a
  console error. It is not this fault but a separate one:
  [U44 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a11).
