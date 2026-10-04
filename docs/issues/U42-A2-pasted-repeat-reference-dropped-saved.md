# Pasting a reference already in the list drops it silently, and the References page still says "Saved"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; one free-text References box, no "Add")
  - 3.4: none (code; one free-text References box, no "Add")
  - 3.3: none (code; one free-text References box, no "Add")
- **Introduced** `pkp/ui-library#716` for `pkp/pkp-lib#10692` · [00fc98d6](https://github.com/pkp/ui-library/commit/00fc98d6327b0c6e46283b916654b46eef86d2db) · 2025-10-01 · pull request by Božana Bokan (bozana), commit by Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor who pastes several references into "Add" expects each to be
added, or to be told why not. A line whose text matches an existing
reference, or an earlier line of the same paste, is dropped. The box
empties and "Saved" shows beside "Add" exactly as after a full success,
even when every line was dropped, and nothing says that anything was
skipped.

The app ships a message for exactly this case ("The citations above are
duplicates. All other citations are added to the list below.") that the
page never shows.

The server tidies each pasted line (spaces and tabs at its ends removed,
runs of them inside shrunk to one space) and compares it with the stored
references as they stand: only the same text, capitals included, counts
as a repeat on PostgreSQL, while on MySQL the comparison also ignores
capitals and accents (read in the code, not walked).

## Impact

- **Lost** The skipped line, and nobody is told. Its text is already
  in the list, so in an ordinary list nothing is missing; a list that
  repeats a line on purpose loses the repeat.
- **Who** Anyone who may edit the publication's metadata, on the
  workflow's "References" page, whenever a paste holds a line already
  listed (re-pasting a whole list after an earlier "Add", for one).
- **Way round** The table under the box shows every reference, so an
  editor who compares it with the paste sees what was skipped. A
  repeat, or a reference wrongly taken for one, can be kept by adding
  the line with a small change and then using the row's "Edit" to save
  the intended text, which "Edit" accepts.

Low: only true repeats are skipped and the table shows the result,
so only the word that lines were skipped is missing. What would raise
it: on MySQL the repeat check also ignores capitals and accents, so a
different reference ("Muller 2020" beside "Müller 2020") would drop out
silently (code read, MySQL not walked).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. The workflow
  offers "References" because references are on in Settings › Workflow
  › Submission › Metadata ("request" is the setting a new journal,
  press or server starts with). No submission has a reference.

Steps:

1. Sign in as `dbarnes` and open submission 8, "Traditions and Trends in
   the Study of the Commons" (OJS), 3, "The Political Economy of
   Workplace Injury in Canada" (OMP), or 1, "The influence of lactation
   on the quantity and quality of cashmere production" (OPS).
2. Open "Publication" ("Preprint" on OPS) › "References".
3. Type these two lines into the "References" box and press "Add":

   ```
   Alpha study 2020
   Beta trial 2021
   ```

4. Type these three lines into the box and press "Add":

   ```
   Alpha study 2020
   Gamma report 2022
   Gamma report 2022
   ```

5. Type `Beta trial 2021` into the box and press "Add".

**Expected.** After step 4 the table gains "Gamma report 2022" once, and
the page says that the other two lines were not added because they are
already listed, for instance by keeping them in the box with the app's
own "The citations above are duplicates. All other citations are added
to the list below." After step 5 nothing is added, and the page says
why.

**Observed.** After step 4 the box empties and "✓ Saved" shows beside
"Add". The table reads "Alpha study 2020", "Beta trial 2021", "Gamma
report 2022", and nothing on the page mentions the two skipped lines.
After step 5 the box empties and "✓ Saved" shows again; nothing is
added and nothing is said.

The browser's request after step 4 (OMP; the submission and publication
numbers differ per app) answers with the skipped lines, which the page
does not use:

```
POST /index.php/publicknowledge/api/v1/submissions/3/publications/3/citations/importAdditionalCitations
200 "Alpha study 2020\nGamma report 2022"
```

Control: on PostgreSQL, "ALPHA STUDY 2020" pasted beside "Alpha study
2020" is added, since capitals count there.

## Cause

`PKP\citation\Repository::importAdditionalCitations()`
(`lib/pkp/classes/citation/Repository.php`, lines 280 to 317) skips a
line for which `existsRawCitation()` finds the same text in the
publication's list, and returns the skipped lines, one per line, in
paste order. `PKPCitationController::importAdditionalCitations()` sends
that string as the answer.

The page drops that answer. `useCitationManagerFormAddRawCitation()`
(`lib/ui-library/src/managers/CitationManager/useCitationManagerFormAddRawCitation.js`,
lines 21 to 24) empties the box in the form's `onSuccess` without
reading what the request returned, and the form shows its usual "Saved".

The first version of the page did read it. In `pkp/ui-library#716`, its
first commit
([c2f8e07d](https://github.com/pkp/ui-library/commit/c2f8e07d19caa0f6b2385d1ca48fc716d85d07c0))
put the returned lines back in the box and showed
`submission.citations.structured.addRaw.partialSuccess` beside the
button. A later commit in the same pull request (00fc98d6) moved the box
into a standard form and dropped that handling, leaving the string and
its three siblings (`.success`, `.empty`, `.errors`) without a caller.
The pull request was merged with both commits, so no `main` build showed
the message.

Reach:

- MySQL (code read, not walked): `PKP\citation\DAO::existsRawCitation()`
  (`lib/pkp/classes/citation/DAO.php`, line 139) compares with SQL `=`
  on `raw_citation`. `PKPInstall` creates the tables with charset `utf8`
  and collation `utf8_general_ci` (`lib/pkp/classes/install/PKPInstall.php`,
  lines 104 and 105; `PKPContainer` uses the same default when
  `config.inc.php` names none), which ignores capitals and accents, so
  there "Muller 2020" counts as a repeat of "Müller 2020".
- A line reading just `0` is dropped without a word and is not among
  the returned lines: the loop's `!empty($rawCitationString)` treats
  "0" as empty.
- A text saved through "Edit citation" is stored as typed, not tidied,
  so a tidied paste of the same text does not match it and is added.
- The page's "Add" is the only caller of `importAdditionalCitations`
  (checked in the code).

## Proposed fix

Read the answer in the form's `onSuccess`: keep the skipped lines in the
box, as the first version of the page did, and show the shipped string
under the box as the field's message, where "The citations above" reads
right. The form's footer summary is turned off, so "Please correct one
error." does not stand beside "Saved"; the message goes when the box is
changed. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pasted-repeat-reference-dropped-saved/fix.diff):

```diff
-	const {form, initEmptyForm, setValue, addPage, addGroup, addFieldTextArea} =
+	const {form, initEmptyForm, set, setValue, addPage, addGroup, addFieldTextArea} =
 		useForm({});
 
 	initEmptyForm('addCitations', {
 		action: actionUrl.value,
 		spacingVariant: 'fullWidth',
-		onSuccess: () => {
-			setValue('rawCitations', '');
+		// The one field's message sits under the box; a footer summary
+		// ("Please correct one error.") would sit beside "Saved".
+		showErrorFooter: false,
+		onSuccess: (rejectedCitations) => {
+			// The API answers with the lines it did not add because the list
+			// already holds them: keep those in the box, with the message under it.
+			const duplicates =
+				typeof rejectedCitations === 'string' ? rejectedCitations.trim() : '';
+			setValue('rawCitations', duplicates);
+			set('addCitations', {
+				errors: duplicates
+					? {rawCitations: [t('submission.citations.structured.addRaw.partialSuccess')]}
+					: {},
+			});
 			onSuccess();
 		},
```

"Saved" still shows after a paste with skipped lines: the other lines
were saved, and the message under the box names what was not. Hiding it
when every line was skipped needs a change to the shared `Form.vue`, left
out.

Tried on `main` for OMP (an earlier version showing the string as a
toast, on OJS, OMP and OPS, kept the same lines): after step 4 the box
keeps "Alpha study 2020" and "Gamma report 2022" with the message under
it; after step 5 the box keeps "Beta trial 2021" with the same message.
A paste with no repeat ("ALPHA STUDY 2020", "Theta paper 2024") still
empties the box with "Saved" and no message, and a new line typed over
a kept repeat is added and the message goes. "Add" on an empty box still
answers "This field is required." under the box; the footer summary
that shows today beside it ("Please correct one error.", "Go to
References: This field is required.", "Jump to next error") goes, which
for a form of one field loses nothing. The app's own build
(its `vite.config.js` collects the strings the JavaScript uses) sends
the string to the browser with no other change.

**Alternatives**

- A warning toast (`useNotify()`, as `useReviewContent` does for a
  refused review): it works, but "The citations above" then points at
  nothing, and the toast stands beside "Saved".
- Answer an "Add" that skipped lines with a 4xx validation error: the
  lines that were added are saved, so an error answer would misstate
  the outcome and change the endpoint's contract for its API clients.
- Compare strictly in `existsRawCitation()` here as well: that is a
  separate fault in a separate repository (the check, not the page),
  not walked, since no MySQL install was at hand. With this fix alone a
  line MySQL wrongly takes for a repeat at least stays in the box with
  the message. It should be its own report once walked on MySQL.

**What goes with it**

- The three other `addRaw` strings (`.success`, `.empty`, `.errors`)
  stay without a caller: the form's "Saved" and its required check
  cover them, so they can be removed from `lib/pkp/locale`.
- A guard: a Planned e2e item in the spec, or a ui-library unit test of
  the composable's `onSuccess`.

Small: a few lines in one ui-library composable, using a string and
form errors the code base already has, tried as written.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pasted-repeat-reference-dropped-saved/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on PKP's default test
  dataset, freshly loaded:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/pasted-repeat-reference-dropped-saved/walk.js`;
  `MODE=nb` runs the control checks alone (an empty "Add", a paste
  differing only in capitals, a new line after a kept repeat).
- Walked on `main`, PostgreSQL, pkp/datasets 566bb1f (2026-10-03), at
  OJS ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363), OMP
  3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6, ui-library
  280f98c5). The files of the Cause are the same in the three
  checkouts. No server error or script error was logged during the
  walks.
- MySQL not walked: the collation reach is a code read of
  `PKPInstall.php`, `PKPContainer.php` and `config.TEMPLATE.inc.php`
  (`; collation = utf8_general_ci`).
- The "Edit" way round rests on spec U42 Rule 6 (probed 2026-09-24), not
  on this walk.
- 3.5 (code): `stable-3_5_0` at OJS c1cee76b95, lib/pkp 771474347e,
  ui-library d4e01883: the References page is one "References" box
  (`PKPCitationsForm`, field `citationsRaw`) saved with the
  publication; `CitationDAO::importCitations()` replaces the whole list
  and keeps a repeated line.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` (OJS d68934d0d1, lib/pkp
  767353f4fe, ui-library ee684b34) and `stable-3_3_0` (OJS ac77c9fb35,
  lib/pkp ac3fa73402, ui-library 96959f9e): the same free-text
  `citationsRaw` box.
- Trackers searched on 2026-10-04: `pkp/pkp-lib`, `pkp/ui-library` and
  `pkp/ojs`.
