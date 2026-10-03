# On a preprint server, the contributor form labels "Competing Interests" with raw link markup

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code; a "CI Policy" link with a broken address, not raw markup)
- **Introduced** `pkp/pkp-lib#9574` (pushed without a PR on `main`) · [fc42763d00](https://github.com/pkp/pkp-lib/commit/fc42763d007e094e66cb539c494169b733dab8d9) · 2024-01-02 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** U41 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#ops2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a preprint server that requires competing-interest statements, the
contributor form's "Competing Interests" field is labelled with raw
code-like text instead of the plain "Competing Interests" a journal or
press shows. The label reads `Competing interests <a target="_new"
class="action" href="{$competingInterestGuidelinesUrl}">CI Policy</a>`,
with an unfilled placeholder and visible link markup. It is an old
label that OPS's own language files still carry for this field.

The field's guidance, its required mark and saving all work, so the
statement is filled in and saved as usual; only the field's name is
wrong. A French interface shows the same markup in French. Readers never
see it: the public preprint page shows no competing-interests
statement.

## Impact

- **Lost**: nothing; the statement saves.
- **Who**: authors filling in contributors in the submission wizard, and
  moderators and managers editing them in the workflow, on every
  preprint server that ticks "Require submitting Authors to file a
  Competing Interest (CI) statement with their submission." That
  setting is off by default; how many servers turn it on is not known.
- **Way round**: no OPS setting changes the label. A manager can replace
  it before a fix ships with the Custom Locale plugin from the Plugin
  Gallery, setting `author.competingInterests` to "Competing Interests"
  (read in the plugin's code, not tried).

Low: only the field's name is wrong; nothing is lost and the form is
filled in and saved as usual.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (server `publicknowledge`).

Steps:

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Competing Interests" tick "Require submitting Authors to file a
   Competing Interest (CI) statement with their submission." and press
   "Save".
3. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production", and choose "Contributors" under
   "Preprint".
4. Press "Add Contributor" and look at the field after "Homepage URL".

**Expected.** The field is labelled "Competing Interests", as on a
journal (OJS submission 7) or a press (OMP submission 1) after the same
steps.

**Observed.** The label reads, verbatim:

```
Competing interests <a target="_new" class="action" href="{$competingInterestGuidelinesUrl}">CI Policy</a> * Required
```

"Edit" on Carlo Corino's row shows the same label. With the interface switched to
"français" (the initials menu › "Change Language"), the label reads
`Conflits d'intérêts <a target="_new" class="action"
href="{$competingInterestGuidelinesUrl}">Politique de conflits
d'intérêts</a>`.

## Cause

The form takes its label from `author.competingInterests`
(`lib/pkp/classes/components/forms/publication/ContributorForm.php`,
`'label' => __('author.competingInterests')`). pkp-lib defines that key
as "Competing Interests" in `locale/en/submission.po`, but OPS's own
`locale/en/author.po` still defines it, and an app's locale files win
over pkp-lib's. OPS's string is the pre-3.0 OJS label, copied when OPS's
locale files were created
([93c92c3f71](https://github.com/pkp/ops/commit/93c92c3f7151e05e0aea25fdf33db32c4331fad6)).
It is HTML with a placeholder, `{$competingInterestGuidelinesUrl}`,
that an old template filled with the policy's address.
`ContributorForm` passes no such parameter, and ui-library's
`FormFieldLabel.vue` prints the label as text (`{{ label }}`), so the
markup and the placeholder show.

pkp-lib [fc42763d00](https://github.com/pkp/pkp-lib/commit/fc42763d007e094e66cb539c494169b733dab8d9)
(`pkp/pkp-lib#9574`, author competing-interest statements) defined the
key in pkp-lib and gave it to the shared form. Its OJS half,
[d970b3a5ba](https://github.com/pkp/ojs/commit/d970b3a5bad0da6a583ed8553dbcc74018bacf91),
deleted OJS's old copy of the key from every `locale/*/author.po`; OMP
had none. OPS got no matching change, so its copy has shadowed pkp-lib's
since.

Reach:

- The workflow's "Add Contributor" and "Edit", for editors and authors
  alike (the form `PKPDashboardHandler::index()` builds, line 148):
  walked.
- The submission wizard's contributors step (`ContributorsListPanel`,
  from `PKPSubmissionHandler`, line 227): code.
- The form's error list names a field by its label (`FormErrors.vue`),
  so an empty required statement is listed under the same raw text:
  code.
- Other languages: OPS carries the key in 12 `locale/*/author.po`
  files. Nine of them (bg, cs, de, es, fi, fr_CA, mk, pt_BR, uk) hold
  a translated copy with the same markup; French walked, the rest code.
  The other two (ca, nb_NO) are empty and skipped by the loader (`LocaleFile::loadArray()`, `includeEmpty => false`).
- No other OPS key overrides a pkp-lib key with markup or a placeholder
  that pkp-lib's version lacks (a comparison of every key both
  `locale/en` trees define, on OJS, OMP and OPS): this is the only one.
- `author.competingInterests` has no other reader in OPS, its plugins
  or pkp-lib (searched), and no OPS template, the theme's included,
  prints an author's competing interests: readers never meet it.

## Proposed fix

Delete the `author.competingInterests` entry from every OPS
`locale/*/author.po`, as d970b3a5ba did for OJS, so pkp-lib's "Competing
Interests" and its translations apply. For English:

```diff
--- a/locale/en/author.po
+++ b/locale/en/author.po
@@ -18,9 +18,6 @@
 msgid "author.submit"
 msgstr "New Submission"
 
-msgid "author.competingInterests"
-msgstr "Competing interests <a target=\"_new\" class=\"action\" href=\"{$competingInterestGuidelinesUrl}\">CI Policy</a>"
-
 msgid "author.submit.startHereLink"
 msgstr "<a href=\"{$submitUrl}\" class=\"action\">Click here</a> to go to step one of the five-step submission process."
```

The whole change, 12 files, is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/competing-interests-label-raw-markup/fix.diff).
Tried on OPS `main`: the Steps then show
"Competing Interests" on "Add Contributor" and "Edit", and the French
interface shows pkp-lib's "Conflit d'intérêts", with the guidance, the
required mark and the "Competing Interests" setting on the Metadata
tab unchanged.

**Alternatives**

- Rewrite OPS's string to "Competing Interests": fixes English, but
  keeps a duplicate that drifts from pkp-lib and leaves the translated
  copies broken.
- Pass the guideline URL into `__()` in `ContributorForm`: the label
  would still be HTML, which the Vue label prints as text.

**What goes with it**

- No data, API or plugin change: locale files only.
- Backport: the same deletion applies to OPS `stable-3_5_0` and
  `stable-3_4_0` (the same entry and the same form). On `stable-3_3_0`
  the key is in `locale/*_*/author.po`, and the label comes from the
  older `authorForm.tpl`, which renders the HTML: the field reads
  "Competing interests" followed by a real "CI Policy" link, whose
  address is the unfilled placeholder. Deleting the entry there gives
  pkp-lib's plain label as well.
- Guard: an e2e assertion on the field's label on OPS (the
  "Competing Interests" setting is already driven there); a pkp-lib
  check that flags an app locale key shadowing a key pkp-lib owns would
  catch the next such copy.

Small: locale files only, following the OJS change, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/competing-interests-label-raw-markup/walk.js)
  (helpers in `lib.js` beside it), on an install reset to the dataset:
  `PROBE_FEATURE=<feature> node bin/probe.js all
  shared/playwright/checks/issues/competing-interests-label-raw-markup/walk.js`
  (`steps`, the Steps on OJS, OMP and OPS; `french`, the same form in
  the French interface on OPS). OJS and OMP, walked as the control,
  label the field "Competing Interests" on `main` and 3.5.
- Fix tried on OPS `main` with `fix.diff` applied: the Steps and the
  French walk; the French walk again without it gave the raw French
  label above.
- Walked on PostgreSQL, PKP datasets `566bb1f`. Tips: `main` ops
  `c8af945bb7` (lib/pkp `3dc90c81a6`, lib/ui-library `280f98c5`), ojs
  `ff004d0973` (lib/pkp `987776cd04`, lib/ui-library `64d67363`), omp
  `3b0ecf794c` (lib/pkp `3dc90c81a6`); `stable-3_5_0` ops `38b61882d3`
  (lib/pkp `cf3f984335`), ojs `c1cee76b95`, omp `9c5e24246c`.
- 3.5 code read: OPS `locale/en/author.po` and pkp-lib
  `ContributorForm.php`, as on `main`.
- 3.4 (code): OPS `stable-3_4_0` `acd8ae704b` keeps the entry in
  `locale/en/author.po`; pkp-lib `stable-3_4_0` `767353f4fe` has the
  `#9574` backport (`cea6470f5f`) and builds the form from
  `ContributorsListPanel`.
- 3.3 (code): OPS `stable-3_3_0` `c5532e2161` keeps the entry in
  `locale/en_US/author.po`; pkp-lib `stable-3_3_0` `ac3fa73402` has the
  backport (`c50bf91dbd`, `pkp/pkp-lib#9576`), and OPS's `AuthorForm`
  extends `PKPAuthorForm`, whose `authorForm.tpl` titles the section
  `{fbvFormSection title="author.competingInterests"}`; `formSection.tpl`
  prints `{translate}` unescaped, so the label renders as "Competing
  interests" and a "CI Policy" link to the unfilled address. Not walked.
- Introduced: `git log -L` on the entry in OPS `locale/en/author.po`
  (added in 93c92c3f71, 2019; reformatted in 3e78126159); the key's use
  in `ContributorForm.php` from `git log -S` (fc42763d00). The GitHub
  API lists no PR for fc42763d00 or d970b3a5ba; the issue's comments
  name the 3.3 PRs `pkp/pkp-lib#9576` and `pkp/ojs#4124`. No commit on
  any OPS line names `#9574`.
- Upstream: pkp/pkp-lib, pkp/ops and pkp/ui-library searched for
  `competingInterestGuidelinesUrl`, "CI Policy", `author.competingInterests`
  and "competing interests" with label/contributor; `pkp/pkp-lib#13212`
  (reader-page display) and `pkp/pkp-lib#11796` (required in all
  locales) are other faults.
- Way round: pkp/customLocale `main` (release 1.4.0.0)
  `CustomLocalePlugin::setupLocalizationOverriding()` registers its
  files with `Locale::registerPath($path, PHP_INT_MAX)`, above the
  app's; the Plugin Gallery list (`https://pkp.sfu.ca/ojs/xml/plugins.xml`)
  offers it for OPS 3.3, 3.4 and 3.5. Not tried: the test installs
  cannot reach the gallery.
- Readers: OPS `templates/`, `plugins/themes/` and pkp-lib
  `templates/frontend/` searched for "competing": no match.
- Unverified: the eight translated copies other than French, the
  submission wizard, the error list and the Custom Locale way round
  (read in the code only).
