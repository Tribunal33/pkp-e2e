# A galley's "Edit" window is headed "Upload a File Ready for Publication", though it uploads nothing

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS (a press has no galleys)
  - 3.5: OJS, OPS
  - 3.4: none (code; the older galley list)
  - 3.3: none (code; the older galley list)
- **Introduced** `pkp/ui-library#412` (no issue linked) · [f77229c3b](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b) · 2024-09-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal's or preprint server's "Galleys" page, a galley's "Edit"
opens a window headed "Upload a File Ready for Publication", the same
heading as the upload window that "Change File" opens. The window
edits the galley's label, language, address and URL Path and uploads
nothing, so the heading tells the editor they are in the wrong place.

The older galley list, which a preprint server's submission
wizard still shows, heads the same window "Edit a Layout Galley".

## Impact

- **Lost**: nothing. "Save" stores the galley's details as intended.
- **Who**: everyone who edits a galley on the "Galleys" page (Journal
  Manager, Editor, Section Editor, Layout Editor; on a preprint server
  also the Moderator and the Author), every time.
- **Way round**: none needed.

Low: only the heading is wrong; the window's fields and "Save" do what
the editor came to do.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OPS (the server `publicknowledge`).

On a journal:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 1, "Signalling Theory Dividends"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
   It opens on its unpublished version.
3. Press "Galleys" under that version in the side menu. The list holds
   the galley "PDF Version 2".
4. On the row "PDF Version 2" press "More Actions", then "Edit".
5. Read the window's heading and its contents, then press "Cancel".

On a preprint server: the same steps as `dbarnes` on preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production", whose "Galleys" (under "Preprint") lists the galley
"PDF".

**Expected**: the window is headed "Edit a Layout Galley", as the same
window is in the older galley list.

**Observed**: the window is headed "Upload a File Ready for
Publication". It has one tab, "Edit Metadata", holding "Galley Label",
"Language", "This galley will be available at a separate website.",
"URL of remotely-hosted content", "URL Path" and "Save"; it has no file
box and uploads nothing.

Unchanged: "Add galley" heads its window "Create New Galley", and the
row's "Change File" heads the upload window "Upload a File Ready for
Publication", which is right there.

## Cause

`galleyEdit()` in ui-library's
`src/managers/GalleyManager/useGalleyManagerActions.js` opens the
legacy `editGalley` operation of `ArticleGalleyGridHandler` (OJS) or
`PreprintGalleyGridHandler` (OPS) with the window title
`t('submission.upload.proof')`, "Upload a File Ready for Publication".
That is the upload wizard's title, the one `galleyChangeFile()` a few
lines above passes for `startWizard`. The operation itself renders
`editFormat.tpl`, the galley's metadata form, which has no title of its
own.

`ArticleGalleyGridRow` and `PreprintGalleyGridRow`, the rows of the
older galley list still used by a preprint server's submission wizard,
title the same operation `submission.layout.editGalley`, "Edit a Layout
Galley", or `submission.layout.viewGalley`, "View Galley", for a row
the user may not edit. `galleyEdit()` has had the upload title since
the Vue manager was written; `galleyView()`, added later, uses
`submission.layout.viewGalley` as the older list does.

Reach:

- Every "Edit" on the "Galleys" page, for every role offered it, OJS
  and OPS (on screen, `main` and 3.5).
- No other window of the workflow borrows the upload title: the other
  managers' `openLegacyModal()` calls in ui-library each name their own
  window (checked in the code).
- A press has no galleys.

## Proposed fix

A proposal: give `galleyEdit()` the title the older list gives the same
window. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-edit-window-upload-heading/fix.diff):

```diff
--- a/lib/ui-library/src/managers/GalleyManager/useGalleyManagerActions.js
+++ b/lib/ui-library/src/managers/GalleyManager/useGalleyManagerActions.js
@@ -79,7 +79,10 @@
 			},
 		});
 
-		openLegacyModal({title: t('submission.upload.proof')}, finishedCallback);
+		openLegacyModal(
+			{title: t('submission.layout.editGalley')},
+			finishedCallback,
+		);
 	}
```

The key has a translation in 50 of pkp-lib's locales (the current
title's key in 48), and the build's locale key extraction exposes it to
the page, as it does for `submission.layout.viewGalley`.

Tried on `main`, OJS and OPS: the
Steps' "Edit" is headed "Edit a Layout Galley"; "Add galley" ("Create
New Galley") and "Change File" ("Upload a File Ready for Publication")
keep their headings with the fix applied and with it reverted.

Out of scope here: a preprint server's Moderator whose assignment does
not allow changes would, before posting, see "Edit a Layout Galley" over
greyed-out fields where the older list says "View Galley"; that page is
the subject of
[pkp-e2e#613](https://github.com/jardakotesovec/pkp-e2e/issues/613),
which recommends letting that Moderator edit.

**Alternatives**

- None weighed: a new key would only duplicate this one.

**What goes with it**

- No data, API or hook change.
- Backport: on 3.5 the line is line 81 of the same file; the diff
  applies there with a one-line offset (checked with `patch --dry-run`,
  not walked).
- Guard: a ui-library story or Cypress step that reads the "Edit"
  window's heading.

Small: one existing, translated key swapped in one ui-library call; no
other code reads the title.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-edit-window-upload-heading/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-asked-for-file/lib.js))
  takes the Steps on OJS and OPS and records the window's heading, tabs
  and fields; `MODE=nb` records the headings of "Add galley" and
  "Change File". Each run starts from an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/galley-edit-window-upload-heading/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/galley-edit-window-upload-heading/fix.diff ojs ops`.
- The walks ran in Chromium on PostgreSQL (nothing here depends on the
  database). Datasets: pkp/datasets e8dafbc (2026-10-02). `main` and 3.5
  gave the same heading on both apps.
- Branch tips. `main`: OJS b84f8e2e44, OPS c8af945bb7; pkp-lib
  ddd8ab243a (OJS) and 3dc90c81a6 (OPS); ui-library 64d67363 (OJS) and
  280f98c5 (OPS). 3.5: OJS 091fb65453, OPS 38b61882d3; pkp-lib
  cf3f984335; ui-library d4e01883. 3.4: OJS c1827e3527, OPS acd8ae704b;
  pkp-lib 9e41f10273; ui-library ee684b34. 3.3: OJS ac77c9fb35, OPS
  c5532e2161; pkp-lib ac3fa73402; ui-library 96959f9e.
- Code reads. 3.4 and 3.3: ui-library has no `GalleyManager`; the
  workflow shows the older list, whose `ArticleGalleyGridRow` (OJS; OPS
  3.3) and `PreprintGalleyGridRow` (OPS 3.4) title "Edit"
  `submission.layout.editGalley`.
- Introduced: `git blame` on the title line gives f77229c3b, the file's
  first commit.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/ui-library):
  "Upload a File Ready for Publication", "Edit a Layout Galley", galley
  edit heading and title, `galleyEdit`, `useGalleyManagerActions`,
  `GalleyManager`. None is about this heading.
- Unverified: the Moderator's read-only window named in the Proposed
  fix was not opened in these walks; the spec's earlier walk saw it
  headed "Upload a File Ready for Publication".
