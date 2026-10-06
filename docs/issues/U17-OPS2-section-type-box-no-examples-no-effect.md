# Preprint server sections: the "Identify items posted in this section as a(n)" box has no examples and no effect

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** no PR (before OPS's first release) · [ce9ab889af](https://github.com/pkp/ops/commit/ce9ab889aff298268af1c4f76bc3ce1a465ca921) (2019-08-06), which emptied the help's examples, and [512707bc6d](https://github.com/pkp/ops/commit/512707bc6d26887cac5f82ccf945c89f28326171) (2019-11-21), which stopped OPS from using the box's value · both Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U17 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#ops2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A preprint server manager who edits a section sees the box "Identify
items posted in this section as a(n)". The help under it reads "(For
example etc.)" and gives no example. A journal's section window gives
three.

What the manager enters in the box is saved, but nothing on a preprint
server uses it. No page shows it, and the records the server gives to
harvesters (OAI-PMH) list every preprint as a preprint, whatever the box
holds. The manager is not told.

The report recommends removing the box from the server's section window,
since nothing on a preprint server uses a section's item type. Values
already saved stay in the database and in the REST API, so nothing saved
is lost.

## Impact

- **Lost**: nothing. A manager may spend time filling in a box that has
  no effect.
- **Who**: a preprint server manager, each time they create or edit a
  section.
- **Way round**: none needed. Leaving the box empty changes nothing.

Low: misleading help on a box that has no effect; the section saves and
nothing breaks.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`, freshly loaded. Nothing
  else. The `stable-3_5_0` dataset takes the same steps.

1. Sign in as `rvaca` (password `rvacarvaca`), the Preprint Server
   manager.
2. Go to Settings › Server and open the "Sections" tab.
3. Open the arrow beside "Preprints" and press "Edit".
4. Read the help under "Identify items posted in this section as a(n)".
5. Type "Working Paper" in the box under that heading and press "Save".
6. Sign out and open the server's harvesting address,
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   Read the `dc:type` lines of the posted preprints' records.

**Expected:** the window does not offer a box that nothing uses. If it
keeps the box, the help gives examples, and what is entered shows
somewhere, as on a journal.

**Observed:** step 4 reads:

```
Identify items posted in this section as a(n)
(For example etc.)
```

The second line is the label under the empty box.

Step 5 answers "Your changes have been saved.", and the reopened window
holds "Working Paper". In step 6, all 17 records list the same two
`dc:type` values, and none lists "Working Paper":

```xml
<dc:type>info:eu-repo/semantics/preprint</dc:type>
<dc:type>info:eu-repo/semantics/draft</dc:type>
```

For comparison, on a journal (OJS `main` dataset, Settings › Journal ›
"Sections", "Articles"), the same steps show "(For example, "Peer-reviewed Article",
"Non-refereed Book Review", "Invited Commentary", etc.)". The records of
submissions 1 and 17 then carry `<dc:type>Working Paper</dc:type>`.

## Cause

OPS's section window still offers the journal's "Identify items" box,
which OPS stopped using before its first release. The box is in
`templates/controllers/grid/settings/sections/form/sectionForm.tpl`,
lines 61–63, and `controllers/grid/settings/sections/form/SectionForm.php`
loads and saves it (lines 70, 130, 138, 165).

In OJS, the box's value becomes an extra `dc:type` in each article's
Dublin Core record (`Dc11SchemaArticleAdapter`). OPS's
`plugins/metadata/dc11/filter/Dc11SchemaPreprintAdapter.php` writes two
fixed values instead (lines 132–136) and reads nothing from the
section. Nothing else in OPS or its pkp-lib reads `identifyType`. Its
only uses are its declaration in OPS's `schemas/section.json` (line 36),
`Section`'s accessors, the form and a unit test's fixture.

ce9ab889af ("Rename Sections to Series, but hold back code changes
before the big merge") replaced OJS's examples, which name journal
article kinds, with "(For example etc.)". Then 512707bc6d ("Additional
changes to OAI in PPS") took the section's value out of the Dublin Core
record, so that every record says "preprint", and did not remove the box.

Where else this applies (checked in the code, and on screen where
marked):

- OJS: the box is used, and its help has three examples (on screen, the
  journal comparison under Observed).
- OMP: no such box.
- Other languages: 12 of OPS's 18 languages carry the help's key. Ten
  repeat the empty example ("(Zum Beispiel usw.)", "(Par exemple etc.)",
  and others); `ca` and `nb_NO` leave it untranslated (empty).
- REST API: `GET /sections` (pkp-lib `SectionController`, from
  `pkp/pkp-lib#9938`) returns the stored `identifyType`, because OPS's
  `schemas/section.json` declares it with `apiSummary: true`. No screen
  reads it.

## Proposed fix

Remove the box from OPS's section window. OPS has already left out
OJS's other journal-only options there ("Review Form", "Will not be
peer-reviewed", and the two table-of-contents boxes). Keep the
`identifyType` property in OPS's `schemas/section.json`, so stored
values and the REST API stay as they are. The template's part of the
diff:

```diff
--- a/templates/controllers/grid/settings/sections/form/sectionForm.tpl
+++ b/templates/controllers/grid/settings/sections/form/sectionForm.tpl
@@ -57,10 +57,6 @@
 			{fbvElement type="checkbox" id="metaIndexed" checked=$metaIndexed label="manager.sections.submissionIndexing"}
 			{fbvElement type="checkbox" id="editorRestriction" checked=$editorRestriction label="manager.sections.editorRestriction"}
 		{/fbvFormSection}
-
-		{fbvFormSection for="identifyType" title="manager.sections.identifyType"}
-			{fbvElement type="text" id="identifyType" label="manager.sections.identifyTypeExamples" value=$identifyType multilingual=true size=$fbvStyles.size.MEDIUM}
-		{/fbvFormSection}
 	{/fbvFormArea}
 
 	{fbvFormSection list=true title="manager.sections.form.assignEditors"}
```

`SectionForm` stops loading, reading and saving `identifyType`. It must
stop saving it, because `setIdentifyType()` takes no null. The two
English keys go with the box. The whole diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-type-box-no-examples-no-effect/fix.diff).

This fix was tried on `main`. The window no longer shows the box, "Save"
still answers "Your changes have been saved.", and the harvested records
are unchanged. A field the fix leaves alone kept working, with the fix
in and out: a changed "Abbreviation" saved, stayed after reopening, and
still named the section's OAI set ("publicknowledge:PREu17k").

This is a proposal; the team decides.

**Alternatives**:

- Write preprint examples into the help ("Working Paper", "Data
  Paper"): the words get fixed, but managers are still asked to fill a
  box that does nothing.
- Let OPS's Dublin Core records use the box's value again, as OJS's
  do: not recommended. 512707bc6d chose the fixed OpenAIRE values
  ("preprint", "draft") for harvesters on purpose, so adding a free-text
  value would change what every server sends them, a product decision
  rather than a fix. OJS's own use of the value has an open question
  (`pkp/pkp-lib#10839`).

**What goes with it**:

- No data repair. Values already stored stay, unread, and the API still
  returns them.
- Translations: the fix changes the English file only, as pkp's code
  changes do. The other languages' entries for the two keys are left to
  Weblate; they show nowhere once the box is gone.
- Backport: the diff applies to `stable-3_5_0` as it stands. On
  `stable-3_4_0` the same lines sit in slightly different context. On
  `stable-3_3_0` the form is `SectionForm.inc.php` and the keys are in
  `locale/en_US/manager.po`.
- Test: an e2e check in spec U17 (a **Planned** item) that a server's
  section window has no such box.

Small: one form and its template in one app, tried as written, with
nothing stored to repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-type-box-no-examples-no-effect/walk.js)
  takes the Steps on OPS, and the same steps on OJS's "Articles" for
  comparison. It records the help, the save, the reopened box and each
  record's `dc:type` list.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/section-type-box-no-examples-no-effect/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Check of a field the fix leaves alone:** `WALK=neighbour` in front (OPS) lists the
    window's fields, changes "Abbreviation" to "PREu17k", saves, reopens
    and reads the harvesting sets (`verb=ListSets`).
- Walks: OPS and OJS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets c657990 (2026-10-01). No request failed on
  the server and no page script failed.
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/section-type-box-no-examples-no-effect/fix.diff ops`,
  then the walk, and the check of the untouched field with the fix in and out, each
  on a freshly loaded dataset, then reverted.
- Not driven: 3.4 and 3.3. Other interface languages (read in the
  locale files). MySQL not checked (the fault does not depend on the
  database).
- Tips:
  - **`main`:** OPS c8af945bb7, its pkp-lib 3dc90c81a6; OJS b84f8e2e44.
  - **`stable-3_5_0`:** OPS 38b61882d3, its pkp-lib cf3f984335; OJS
    091fb65453.
  - **`stable-3_4_0`:** OPS acd8ae704b, its pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OPS c5532e2161, its pkp-lib f6ab331645.
- Code reads:
  - `main` and 3.5: `git grep identifyType` over OPS and its pkp-lib
    (classes, plugins, templates, controllers, api, schemas). The help
    key in each of the 18 `locale/*/manager.po`. `Dc11SchemaPreprintAdapter::extractMetadataFromDataObject()`'s
    types. The 3.5 form, template and adapter match `main`.
  - 3.4: the same box in `sectionForm.tpl` and `SectionForm.php`, the
    help "(For example etc.)" in `locale/en/manager.po`, and the
    adapter's two fixed types. No other use in OPS or pkp-lib
    `stable-3_4_0`.
  - 3.3: the same box (`SectionForm.inc.php`), the help in
    `locale/en_US/manager.po`, and the two fixed types in
    `Dc11SchemaArticleAdapter.inc.php`. No other use in OPS or pkp-lib
    `stable-3_3_0`.
- The trace: `git blame` on `locale/en/manager.po` lines 105–106 gives
  93c92c3f71 (2019, XML to PO). `git log -S "(For example etc.)"` gives
  ce9ab889af. `git log -S IdentifyType -- plugins/metadata` gives
  512707bc6d, which removed `$section->getIdentifyType(null)` from the
  Dublin Core adapter. The GitHub API lists no PR for either commit.
- Upstream searches (2026-10-02, pkp/pkp-lib, pkp/ops, pkp/ui-library):
  "For example etc", "Identify items", `identifyType`,
  `identifyTypeExamples`, "section type dc:type". No match.
