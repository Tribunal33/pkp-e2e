# A book format's "Select Files" window tells the editor to tick an "Include checkbox" and press "Search", neither of which it has

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#125` for `pkp/pkp-lib#513` · [2af702de57](https://github.com/pkp/omp/commit/2af702de570d08bbbabb9ad3673b9563073d672c) · 2015-05-05 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a19)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Press managers, press and production editors, the assigned series
editor and the assigned production assistants can press "Select Files"
on a book's publication format to add files to that format. The window
says the files can be added "by checking the Include checkbox below and
clicking Search".

The window has neither. Its tick column is headed "Select". In place of
"Search", the box "Show files from all accessible workflow stages."
reloads the list at once when it is ticked.

The 25 languages that translate the sentence give the same instructions.

## Impact

- **Lost.** Nothing: the text misleads, the window works.
- **Who.** Everyone offered "Select Files", each time they open it on a
  book's "Publication Formats" page.
- **Way round.** None needed: the box's own label says what it does, and
  the tick column and "OK" are plain once the text is ignored.

Low: the help text is wrong, but the files are added as intended.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
  Book 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture", is in Production with `dbarnes` assigned and holds no
  publication format, so step 4 adds one.

Steps:

1. Sign in as `dbarnes` (the Press editor).
2. On the dashboard, press "View" on book 4, "How Canadians Communicate:
   Contexts of Canadian Popular Culture".
3. In the side menu choose "Publication" › "Publication Formats".
4. Press "Add publication format", type the name "PDF u73k" and press
   "OK".
5. In the row "PDF u73k" press "Select Files".
6. Read the window's text, its list and its buttons.
7. Tick "Show files from all accessible workflow stages.".

**Expected.** The window's text names the controls the window has (the
"Select" column, the box "Show files from all accessible workflow
stages." and "OK"), or the window has no text, like the workflow's other
file-selection windows.

**Observed.**

```
Select Files
Any files that have already been uploaded to any submission stage can be added to the Proof Files listing by checking the Include checkbox below and clicking Search: all available files will be listed and can be chosen for inclusion.
Page Proofs
[ ] Show files from all accessible workflow stages.
Select | Name | Component
Production
No Items
[Cancel] [OK]
```

At step 7 the list reloads at once and shows every stage's files
("Submission": intro.pdf, chapter3.pdf, chapter2.pdf, chapter1.pdf;
"Internal Review": the same four files; the other stages "No Items"),
each with an unticked box in the "Select" column.

## Cause

The sentence is OMP's
`editor.submission.proof.manageProofFilesDescription`
(`locale/en/editor.po`, lines 189 to 194), which pkp-lib's
`templates/controllers/grid/files/proof/manageProofFiles.tpl` prints
above the list (line 20). OMP's
`PublicationFormatGridHandler::selectFiles()` renders that template
through `ManageProofFilesForm` when "Select Files" is pressed.

The filter the sentence describes changed under it. The box stayed, but
its "Search" button was gone before this window existed, and its
"Include" label went a year after:

- In 2012 ([160837fee2](https://github.com/pkp/omp/commit/160837fee21951e399c6ed791b43939ec7034482))
  the same sentence was written for the review and final-draft windows.
  At that time their filter had a box labelled "Include all files from
  all accessible workflow stages." and a "Search" button.
- In January 2013 ([acdc1875da](https://github.com/pkp/omp/commit/acdc1875da3a345fa7fe4fa1823d916a568b75ff),
  "Remove button in favour of checkbox trigger") the "Search" button
  was dropped, and ticking the box reloads the list.
- In 2015, 2af702de57 added "Select Files" to publication formats and
  copied the sentence into this new window's text. [61ae1b5e9a](https://github.com/pkp/omp/commit/61ae1b5e9a66b52eddf98235e453be84c326ccab) later
  trimmed it, but neither change touched the "Include checkbox" and
  "Search" wording.

The sentence's "Proof Files listing" names nothing on screen either.
The window's list is headed "Page Proofs", and the chosen files are
listed under the format.

In 2016, for `pkp/pkp-lib#1212` ("Check for outdated language"),
[9f2aa18c0b](https://github.com/pkp/pkp-lib/commit/9f2aa18c0b71cf29f4d1d3eec3df203c9f4875d0)
("Remove help text in select/upload file modals in workflow") removed
this help text from the sibling windows (copyedit, final draft and
review). The same commit relabelled the box from "Include all files from
all accessible workflow stages." to "Show files from all accessible
workflow stages.". The proof window's template, by then in pkp-lib, was
missed.

Reach:

- Only OMP shows it. OJS and OPS ship the same template and their own
  copies of the key, but no screen there opens the window: a galley
  has no "Select Files" (read in the code).
- Every language: 28 of OMP's other locale files hold the key. 25
  translate it, and the translations repeat the wrong instructions.
  `el`, `fr_CA` and `vi` leave it empty and show the English sentence.
- The same stale sentence also sits in pkp-lib's
  `editor.submission.copyedit.manageCopyeditFilesDescription`, which
  no template has used since 9f2aa18c0b. The copyediting "Upload/Select
  Files" window shows no text (checked on screen).

## Proposed fix

Remove the paragraph from pkp-lib's template, as 9f2aa18c0b did for the
sibling windows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-text-names-missing-controls/fix.diff)).
The diff's paths start at the app root (`lib/pkp/templates/…`): apply
it to pkp-lib with that prefix stripped (`patch -p3`).

```diff
 <form class="pkp_form" id="manageProofFilesForm" action="{url component="grid.files.proof.ManageProofFilesGridHandler" op="updateProofFiles" submissionId=$submissionId}" method="post">
-	<!-- Current proof files -->
-	<p>{translate key="editor.submission.proof.manageProofFilesDescription"}</p>
-
 	<div id="existingFilesContainer">
```

The window then matches its siblings, and the box's label already says
what the old text tried to say.

This fix was tried on OMP `main`. With the diff applied, the window
opens on "Page Proofs" with no text above it, and the box still reloads
the list with every stage's files. The copyediting "Upload/Select Files"
window, which shares the list and the box, is unchanged with the diff in
and out.

**Alternatives**

- Rewrite the English sentence to name the window's own controls. Not
  recommended: the 25 translations would keep the old instructions until
  each is redone, and the window would differ from its siblings.

**What goes with it**

- On `main` only, remove the now-unused key from OMP (29 locale files),
  OJS (61) and OPS (12), and pkp-lib's unused
  `editor.submission.copyedit.manageCopyeditFilesDescription` (54).
  This is a mechanical deletion and can be a change of its own. The
  stable branches keep their keys: an unused key does no harm there.
- No test: a guard for a paragraph's absence costs more than it saves.
- Backport: the template line alone. It is the same on
  `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`, so the diff applies
  as written.

Small: one template line in pkp-lib; the optional key cleanup is a
mechanical deletion in four repositories.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/select-files-text-names-missing-controls/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-text-names-missing-controls/walk.js)
  takes steps 1 to 7:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/select-files-text-names-missing-controls/walk.js`.
  With `MODE=nb` in front, the same command runs the neighbour check
  (OMP book 7's "Draft Files" › "Upload/Select Files" window).
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/select-files-text-names-missing-controls/fix.diff omp`,
  then reverted.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets 566bb1f (2026-10-03). On 3.5 the steps and the window are
  the same as on `main`.
- Tips: `main` OMP 3b0ecf794c (`lib/pkp` 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246c (`lib/pkp` cf3f984335); `stable-3_4_0` OMP 0aec65441
  (`lib/pkp` 767353f4fe); `stable-3_3_0` OMP 8e72fc883 (`lib/pkp`
  ac3fa73402).
- 3.4 and 3.3 (code): OMP's `locale/en/editor.po` (3.4) and
  `locale/en_US/editor.po` (3.3) hold the same sentence. pkp-lib's
  `manageProofFiles.tpl` prints it. `selectableSubmissionFileListCategoryGridFilter.tpl`
  has the box with `ToggleFormHandler` and no "Search" button. OMP's
  `PublicationFormatGridHandler` (`.php` on 3.4, `.inc.php` on 3.3) has
  `selectFiles()`.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched for
  "Include checkbox", "clicking Search", "select files" with "search
  button" and with "text", "proof files" with "checkbox search", and the
  key name; no match.
