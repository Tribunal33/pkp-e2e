# A press's URN settings give a pattern example with "%r", which stays in every URN made from it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U44 [OMP8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp8)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5


## Summary

In a press's URN settings window, the choice "Use the pattern entered
below to generate URN suffixes." names its placeholders (%p, %m, %c, %f,
%s and %x). The line under it reads "For example, press%ppub%r would
create the URN suffix "pressESPpub100"." The list has no "%r", nothing
fills it, and the press initials always come out in lower case, not in
capitals as the example shows.

A manager who copies the example gets URNs that end in "%r": "Assign"
on a monograph's "Identifiers" page fills the box with
`urn:nbn:de:0000-pressjpkpub%r`, and "Save" keeps it. Once the book is
published, that URN goes out in the book page's metadata and the
press's OAI-PMH records. A pattern typed from the listed placeholders
gives correct URNs.

## Impact

- **Lost**: a correct URN for every monograph (or chapter, format or
  file) whose URN comes from the copied pattern. The published URN is
  wrong in the book page's `DC.Identifier.URN` meta tag and in the
  OAI-PMH Dublin Core records; a format's URN also shows on the book
  page. OMP does not deposit URNs anywhere itself.
- **Who**: a press manager who turns the "URN" plugin on (it is off by
  default) and sets up suffix patterns starting from the example.
- **Way round**: the URN is shown in the box before "Save", so a manager
  who reads it can correct the pattern, clear the box and assign again.

Medium: the help text leads to a wrong persistent identifier that is
published without a warning, but only for presses that copy the
example, and the result is on screen before it is saved.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` ("Public Knowledge Press",
  acronym JPK). The "URN" plugin is off in the dataset; step 2 turns it
  on.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website › "Plugins" and, under "Public Identifier
   Plugins", tick "Enabled" on the "URN" row.
3. Click the "URN" row's arrow, then "Settings". The "URN" window opens.
4. Under "URN Suffix", read the choice "Use the pattern entered below to
   generate URN suffixes. …" and the line under it.
5. Under "Press Content", tick "Monographs".
6. Fill "URN Prefix" with `urn:nbn:de:0000-`.
7. Select "Use the pattern entered below …" and fill "for monographs"
   with `press%ppub%r`, the example's pattern.
8. Choose `urn:nbn:de` as "Namespace", fill "Resolver URL" with
   `https://nbn-resolving.de/`, leave "Check Number" unticked, and click
   "Save".
9. Open Submissions › "Accessible Elements: Teaching Science Online and
   at a Distance" (ID 7) › Publication › "Identifiers".
10. Under "URN", click "Assign".
11. Click "Save", then reload the page.

**Expected**: the example uses only the placeholders the choice lists,
and shows the suffix it really makes. A pattern copied from it gives a
URN with no "%" left in it.

**Observed**: step 4 shows:

```
Use the pattern entered below to generate URN suffixes. Use %p for press initials, %m for the monograph id, %c for the chapter id, %f for the publication format id, %s for the file id and %x for "Custom Identifier".
For example, press%ppub%r would create the URN suffix "pressESPpub100".
```

In step 10 "Assign" fills the box with `urn:nbn:de:0000-pressjpkpub%r`.
After step 11 the box still holds `urn:nbn:de:0000-pressjpkpub%r`.

With `press%ppub%m` typed in step 7 instead, step 10 gives
`urn:nbn:de:0000-pressjpkpub7`.

## Cause

The example is a translation string with a placeholder no code fills.
OMP's `plugins/pubIds/urn/locale/en/locale.po`, key
`plugins.pubIds.urn.manager.settings.urnSuffixPattern.example`
(lines 66-67), reads "For example, press%ppub%r would create the URN
suffix "pressESPpub100"." The settings window prints it under the
pattern choice, above the pattern boxes of all four kinds
(`plugins/pubIds/urn/templates/settingsForm.tpl`, line 55).
`URNSettingsForm` only checks that a pattern is filled.

"Assign" on the monograph's "Identifiers" page builds the URN in the
browser. `URNPubIdPlugin::addPublicationFormFields()`
(`plugins/pubIds/urn/URNPubIdPlugin.php`, lines 301-349) hands the
stored pattern and the press acronym, lower-cased (line 330), to the
`FieldPubIdUrn` field. `plugins/pubIds/urn/js/FieldPubIdUrn.js` extends
ui-library's `FieldPubId`, whose `generateId()`
(`src/components/Form/fields/FieldPubId.vue`, lines 217-237) replaces
`%i`, `%v`, `%x`, `%Y` and, for a press, `%p` and `%m`. Anything else
stays as typed.

Chapters, formats and files get their URNs on the server: their
"Identifiers" tabs go through `PKPPubIdPluginHelper` to
`PubIdPlugin::getPubId()`, which calls `generateCustomPattern()`
(`classes/plugins/PubIdPlugin.php`, lines 173-211) for `%p`
(lower-cased), `%x`, `%m`, `%c`, `%f` and `%s`. Neither path knows
`%r`.

The lower case is deliberate, so the example's capitals are part of the
same wrong text, not a second fault. `generateCustomPattern()` has
always lower-cased the initials, and the monograph's "Assign" has done
the same since f23b96c73 (`pkp/pkp-lib#11260`, "fix context abbrev in
publication URN to be lower case, as it is for all other objects").

The example came in with the URN plugin (825986f471), which copied the
DOI plugin's example. A month earlier, 773825db3b had changed that DOI
example from `press%ppub%f` to `press%ppub%r`. No version of either
plugin has filled `%r`. It presumably stands for "representation", the
code's name for a publication format, which the list calls `%f`.

Reach:

- The 21 translations of the key carry `%r` and the capitals too
  (`plugins/pubIds/urn/locale/*/locale.po`); `vi` is empty, and `fr_CA`
  has no such key.
- OMP's DOI example (`doi.manager.settings.doiSuffixPattern.example` in
  `locale/*/manager.po`) has the same `press%ppub%r` in English and 21
  translations; `de`, `es` and `pt_BR` have the older `%f`. No screen
  reads that key in any app on `main`, nor in OMP on 3.5 (checked in
  the code; OJS and OPS keep their own copy).
- Where a saved URN goes (checked in the code): the monograph's URN
  into the book page's `DC.Identifier.URN` meta tag
  (`plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`, lines
  132-135; the plugin is on in the default dataset) and into each
  format's OAI-PMH record as `dc:relation`; a format's URN onto the
  book page (`templates/frontend/objects/monograph_full.tpl`, lines
  579-590) and into its OAI-PMH record as `dc:identifier`
  (`plugins/metadata/dc11/filter/Dc11SchemaPublicationFormatAdapter.php`,
  lines 175-184).
- OJS's URN example, "vol%viss%ipp%p", uses only listed placeholders
  (checked in the code). OPS has no URN plugin.

## Proposed fix

Correct the example in the `.po` files: the pattern uses a listed
placeholder and the result is what the code makes. In English:

```diff
 msgid "plugins.pubIds.urn.manager.settings.urnSuffixPattern.example"
-msgstr "For example, press%ppub%r would create the URN suffix \"pressESPpub100\"."
+msgstr "For example, press%ppub%m would create the URN suffix \"pressesppub100\"."
```

In each translation, change `%r` to `%m` and lower-case the example's
result ("pressesppub100", "editoraesppub100"). Both are values the code
makes, not wording, so they need no translator. Correct the unused DOI
example the same way rather than remove it, because OJS and OPS keep
the same key; removing it from all three apps is a separate clean-up.
The whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-pattern-example-unknown-placeholder/fix.diff)
(47 `.po` files, nothing else).

Tried on `main`: with the fix in, the window's example reads
`press%ppub%m … "pressesppub100"`, and the same steps give
`urn:nbn:de:0000-pressjpkpub7`. A pattern of listed placeholders gives
the same URN with the fix in and out.

**Alternatives**:

- Refuse a pattern holding an unlisted placeholder in the settings form.
  This would also catch typos, but it changes what the form accepts for
  presses that already store such patterns, so it is a product decision
  of its own.
- Make `%r` a placeholder for the format's ID. That adds a second name
  for `%f` only to match an example.

**What goes with it**:

- No data repair: a URN already saved with "%r" can be cleared and
  assigned again on screen.
- The diff applies to `stable-3_5_0` as written (`patch --dry-run`). On
  3.4 and 3.3 "Assign" keeps the acronym's case, so a backport there
  would take the `%m` change and leave the result's case alone.
- No unit test fits a help text. An e2e check that the example's
  placeholders are all listed would guard it.

Small: text changes in `.po` files only, no code or data change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-pattern-example-unknown-placeholder/walk.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp
  shared/playwright/checks/issues/urn-pattern-example-unknown-placeholder/walk.js`
  on an install reset to the default dataset (its header gives the reset
  and the 3.5 commands). It takes Steps 1 to 11; `WALK=neighbour` types
  `press%ppub%m` in step 7. The fix was tried with
  `node bin/try-fix.js apply …/fix.diff omp`, then reverted.
- Walked on `main` and `stable-3_5_0`, OMP, on PostgreSQL, the default
  dataset from pkp/datasets eaf024c5 (2026-10-18): the same text and
  the same URN on both. The page script error that comes with choosing
  the pattern in step 7 is spec U44's
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a11);
  no server error came with any step. MySQL not checked (nothing here
  depends on the database).
- Not driven: publishing a book with such a URN. The meta tag and
  OAI-PMH output above are from the code.
- Tips: OMP `main` 5777025bec (lib/pkp 042726ebf6, lib/ui-library
  99abe25290); OMP `stable-3_5_0` 2d575f2506 (lib/pkp 092ec34b0f,
  lib/ui-library 2576e00afd); OMP `stable-3_4_0` e30fa7e38c
  (lib/ui-library ee684b341b); OMP `stable-3_3_0` 8e72fc8836
  (lib/ui-library 96959f9ed4).
- Code reads on the older lines: `stable-3_4_0` has the same string in
  `plugins/pubIds/urn/locale/en/locale.po` (66-67) and the same
  template line. Its "Assign" passes the acronym as typed
  (`URNPubIdPlugin.php`, line 333), and its ui-library `FieldPubId.vue`
  `generateId()` (lines 200-220) fills the same placeholders as `main`.
  Its `PubIdPlugin.php` (182-207) fills the same six on the server.
  `stable-3_3_0` has the same string in
  `plugins/pubIds/urn/locale/en_US/locale.po` (76-77), the acronym as
  typed in `URNPubIdPlugin.inc.php` (line 356), the same
  `generateId()` (200-220), and `PubIdPlugin.inc.php` (98-123) filling
  the same six. No line fills `%r`.
- Introduced: `git log -S'press%ppub%r'` on the URN locale leads to
  825986f471 (`pkp/omp#306`); the DOI example's change from `%f` to
  `%r` is 773825db3b (`pkp/omp#300`).
- Upstream search 2026-10-19, pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs: "URN suffix pattern example", "pressESPpub100",
  "URN pattern %r", "press%ppub%r", "URN suffix example", "suffix
  pattern example", "suffix pattern placeholder not replaced",
  "urnSuffixPattern", "suffix pattern placeholder", "doiSuffixPattern
  example". No hit is this fault.
