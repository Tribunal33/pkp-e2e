# URN settings: a refused URN prefix's message shows "&lt;NID&gt;" codes under the box and in the notice

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** [dba6c9d5](https://github.com/pkp/ojs/commit/dba6c9d5978b12ecd65fae02ab34e0229d3d8272) for `pkp/pkp-lib#1457` · 2015-12-06 · Bozana Bokan (bozana); OMP: `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f4](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#10927` (open, no pull request): the same fault
- **Tracked in** spec U44 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In the URN plugin's settings window, a "URN Prefix" not shaped
"urn:…:" is refused on "Save", rightly. The message under the box reads
`The URN prefix pattern must be in the form "urn:"&lt;NID&gt;":"&lt;NSS&gt;.`:
the angle brackets of the notation show as the HTML codes `&lt;` and
`&gt;`. The notice at the top right of the page shows the same text,
but only after the manager's next successful save, next to "Your
changes have been saved.".

Nothing is lost: once the prefix is corrected, the settings save. The
fix is a text change in the plugin's message and its translations.

It shows only on a journal or press that has turned the URN plugin on
(OPS has no URN plugin), in English and in every language that
translates the message except Thai (OJS) and French (OMP): 45 of the
OJS plugin's translations and 20 of OMP's.

## Impact

- **Lost**: nothing, but a warning shows next to a success. After the
  corrected save the window closes with "Your changes have been saved."
  and, beside it, the earlier refusal. A manager who reads that warning
  as about this save can reopen the window to check; the settings are
  saved.
- **Who**: a journal or press manager setting up the URN plugin who
  types a prefix without "urn:" or without the second ":", once per
  setup at most.
- **Way round**: the box's help text gives an example of the form:
  "The URN prefix is the fix, never changing part of the URN (e.g.
  "urn:nbn:de:0000-").".

Low: wording on a setup screen, and the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP: the same, with "Press"
  for "Journal" and "Monographs" for "Articles").
- Nothing else: the steps turn the URN plugin on.

Steps:

1. Sign in as `rvaca` (Journal manager; on OMP, Press manager).
2. Open "Settings" › "Website", tab "Plugins".
3. Under "Public Identifier Plugins", tick the box on the "URN" row:
   "The plugin "URN" has been enabled.".
4. Open the row's arrow and press "Settings": the "URN" window opens.
5. Under "Journal Content", tick "Articles".
6. In "URN Prefix" type `nbn:de:0000-`.
7. In "Namespace" choose "urn:nbn:de", and in "Resolver URL" type
   `https://nbn-resolving.de/`.
8. Press "Save".
9. In "URN Prefix" type `urn:nbn:de:0000-` and press "Save" again.

**Expected**: at step 8 the window stays open, and the message under
"URN Prefix" reads:

```
The URN prefix pattern must be in the form "urn:"<NID>":"<NSS>.
```

This window shows a refusal's notice only at the next successful save,
not at the refused one; that does not change with the fix. So no notice
shows at step 8. At step 9 the window closes, and the notice shows the
same message, followed by "Your changes have been saved.".

**Observed** (OJS and OMP, `main` and `stable-3_5_0`): at step 8 the
window stays open, and the message under "URN Prefix" reads:

```
The URN prefix pattern must be in the form "urn:"&lt;NID&gt;":"&lt;NSS&gt;.
```

Its markup is `"urn:"&amp;lt;NID&amp;gt;":"&amp;lt;NSS&amp;gt;.`. No
notice shows. At step 9 the window closes and two notices show at the
top right: first
`The URN prefix pattern must be in the form "urn:"&lt;NID&gt;":"&lt;NSS&gt;.`,
then "Your changes have been saved.".

The window's other refusals read correctly under their boxes: "This
field is required." under an empty "URN Prefix", and "Please enter a
valid URL." under "Resolver URL".

## Cause

The message is written as HTML in the plugin's locale files:

```
msgid "plugins.pubIds.urn.manager.settings.form.urnPrefixPattern"
msgstr "The URN prefix pattern must be in the form \"urn:\"&lt;NID&gt;\":\"&lt;NSS&gt;."
```

The entities stand for the angle brackets of the notation
`"urn:" <NID> ":" <NSS>`. But a form's refusal messages are plain text,
and the places that show them as text escape them for display. The
message under the box is printed by `lib/pkp/templates/form/formSection.tpl`
as `<span class="error">{$FBV_error|escape}</span>`. The notice comes
from the form-error notification that `Form::validate()` creates, which
`backend.tpl` shows as `{{ notification.message }}`, Vue text. Both
escape `&lt;` once more, so the codes reach the screen.
`plugins/pubIds/urn/classes/form/URNSettingsForm.php` (OJS and OMP)
uses the message for its `FormValidatorRegExp` on `urnPrefix`.

The string dates from the OJS 2.4 plugin (1b7d1d62, 2012), whose window
had no message under each box. The OJS 3.0 rewrite of the window
(dba6c9d5, `pkp/pkp-lib#1457`) put each refusal under its box through
form sections and kept the string. The OMP plugin was written from the
OJS one (825986f4) with the same string.

Reach:

- One message only. No other English message in OJS, OMP, OPS or
  pkp-lib that serves as a form refusal holds HTML entities (checked in
  the code: every `.po` file of the three apps and their `lib/pkp`).
- Translations (checked in the code). OJS: 45 translations carry the
  entities, 4 of them malformed (fi `&lt;NSS &gt;`, gl `&lt;NSS&gt ;`,
  pt `&lt;NID gt;` and `& lt;NSS`, uz_Latn `& lt; NID & gt;`); Thai
  writes plain `<NID>`; 9 locales have no translation of it. OMP: 20
  translations carry the entities (fi malformed as in OJS); French
  writes `‹NID›`; 2 locales have no translation of it.

## Proposed fix

Write the message as plain text without angle brackets, in the English
locale and in every translation of the plugin, in each app. The
notation follows RFC 8141 (`"urn" ":" NID ":" NSS`):

```diff
 msgid "plugins.pubIds.urn.manager.settings.form.urnPrefixPattern"
-msgstr "The URN prefix pattern must be in the form \"urn:\"&lt;NID&gt;\":\"&lt;NSS&gt;."
+msgstr "The URN prefix pattern must be in the form \"urn:\" NID \":\" NSS."
```

Each translation gets the same notation and keeps its translator's
wording (de: `…in der Form \"urn:\" NID \":\" NSS angegeben werden.`).
The edit is generated by
[locale-edit.py](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/locale-edit.py).
It rewrites only this message, drops the brackets around `NID` and
`NSS`, and spaces them from the quotes. Its bracket pattern also
matches the four malformed variants above and Thai's plain brackets,
so that every language uses the same notation. A plain
`&lt;NID&gt;` to `NID` replacement would miss the malformed ones. The
full diffs are
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/fix-ojs.diff)
(English and 46 translations) and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/fix-omp.diff)
(English and 20 translations).

Tried on `main`, OJS and OMP, with the English text above. At step 8
the message under "URN Prefix" read
`The URN prefix pattern must be in the form "urn:" NID ":" NSS.`, and
no notice showed. At step 9 the notice read the same, followed by
"Your changes have been saved.". The window's other refusals and its
save read the same with the fix in and out. After the trial, the
translation hunks were generated again to add the spaces that English
has. Both diffs then applied cleanly to `main` and `stable-3_5_0` in a
dry run, but were not walked again.

**Alternatives**:

- Decode entities where the message is shown (`|unescape` in
  `formSection.tpl`, `v-html` in the notice). This changes shared
  display code for one string, and would make every message's text be
  read as markup.
- Change the English only. The other languages would keep showing the
  codes.

**What goes with it**:

- Translations: they reach the app branches as merges of a separate
  translations branch fed by PKP's translation platform (Weblate). The
  plugin's locale history is those merges ("Merge remote-tracking
  branch 'translations/stable-3_5_0'") and "Translated using Weblate"
  commits. Whether the platform takes in an edit made in the repository,
  or a later merge brings the old texts back, was not established. The
  English change is the part that must land. The translations can go in
  with it, or through the platform with `locale-edit.py`'s rule.
- Backport: both diffs apply to `stable-3_5_0` as written. On
  `stable-3_4_0` the English hunk applies, but the translation hunks
  must be generated again with `locale-edit.py`, because that branch
  has fewer locales. On `stable-3_3_0` the file is
  `locale/en_US/locale.po`, with the message split over two lines.
- Test: an e2e check that reads the message under "URN Prefix" after a
  refused prefix.

Small: one message in each app's copy of the plugin. The translations
come from one generated edit, reviewed as a diff, with no code change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js)
  takes the Steps on OJS and OMP and records each message under a box
  (text and markup) and the notices. Run it on an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The neighbour check
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/neighbour.js)
  covers the window's other refusals and a correct save.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/fix-ojs.diff ojs`
  and `… fix-omp.diff omp`. Then the walk, and the neighbour check with
  the fix in and out, each on a fresh dataset. Then
  `node bin/try-fix.js revert ojs omp`.
  The trial ran the earlier diffs, whose translation hunks had no
  spaces around `NID` and `NSS`. The English hunk was the same. The
  current diffs were checked with `patch -p1 --dry-run` on `main` and
  `stable-3_5_0` only.
- Tips walked: OJS `main` bade233f73 (lib/pkp 2e377d27fc, lib/ui-library
  280f98c5); OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); OJS `stable-3_5_0` 92b9a16b48 and OMP `stable-3_5_0`
  3081c9b00 (lib/pkp a9c76aed62, lib/ui-library 1a7a4750). Default
  dataset from pkp/datasets 38ab955, PostgreSQL. The fault does not
  depend on the database.
- 3.4 (code): OJS `upstream/stable-3_4_0` 9571d8fde7, OMP 0aec65441,
  pkp-lib `origin/stable-3_4_0` df13621c2d, ui-library ee684b34. The
  same English message in `plugins/pubIds/urn/locale/en/locale.po`, the
  same `urnPrefixFormArea` section in `settingsForm.tpl`, `formSection.tpl`
  with `{$FBV_error|escape}`, and `backend.tpl` with
  `{{ notification.message }}`.
- 3.3 (code): OJS 9fdb9bcf9a, OMP 8e72fc883, pkp-lib d446601ebe,
  ui-library 96959f9e. The same message in
  `plugins/pubIds/urn/locale/en_US/locale.po`, and the same templates.
  `Form::validate()` creates the same form-error notification.
- Introduced: `git blame` on the message line ends at the PO conversion
  (941b60f8 OJS, ef994f74 OMP, `pkp/pkp-lib#4779`). The XML before it
  held the same text.
- Upstream: `pkp/pkp-lib#10927` (Tribunal33, 2025-02-12, open, no
  comments, no linked pull request) reports this message unrendered
  under "URN Prefix" on OJS 3.3 to 3.5. This report adds the cause and
  a tried fix, so the team may comment there instead of tracking it
  twice.
- Not driven: 3.4 and 3.3; the translations, which were read in the
  files only.
- Unverified: whether in-repo edits to the translations survive the
  next merge from the translation platform.
