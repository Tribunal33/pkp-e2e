# A component the manager deleted is still offered as a media type on the "Media" page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137ce](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-04)
- **Tracked in** U58 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U58-submission-intake-configuration.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager who deletes a dependent component (for example "Multimedia")
expects it to be gone everywhere, as it is from the submission's file
upload lists. On a publication's "Media" page, the "Upload Media File"
window does not leave deleted components out: it still offers the
deleted one under "What kind of media is this?".

An editor who picks it gets the file uploaded, and the "Media Files"
list shows the file with the deleted component as its type. The
deletion is ignored in this one list, and nothing on the screen says
the component was deleted. The file works as any other media file, and
its type cannot be changed afterwards.

## Impact

- **Lost**: nothing. A media file's type decides only what the "Media"
  page itself does with the file (its "Type" badge, the fields "Edit
  Metadata" asks for, whether it can be linked to a high-resolution
  version) and the type name a Native XML export writes. Readers see no
  difference: the HTML galley and the download link pick media files by
  publication and resolution, not by type.
- **Who**: whoever adds media files, where a manager has deleted
  "Multimedia", "Image" or "HTML Stylesheet", an uncommon setup. That is
  the Journal Manager, Editor, Production Editor and Site
  Administrator, and an assigned Section Editor or Guest Editor (Series
  Editor on a press, Moderator on a preprint server), Layout Editor,
  Designer, Indexer or Proofreader.
- **Way round**: pick another media type. No type is chosen in advance,
  so a file gets the deleted type only when someone picks it by hand. A
  file already saved under it keeps that type: "Edit Metadata" has no
  type field, so the file has to be deleted and uploaded again.

Low: every upload still works and readers see the same pages; the
deleted type only labels the file, on the "Media" page and in an
export, and the file is handled as under any other type.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A small image file, such as `figure.png`.

1. Sign in as `rvaca`.
2. Go to Settings › Workflow › "Submission" › "Components".
3. Press the arrow beside "Multimedia" (on OMP "HTML Stylesheet": a
   press has no "Multimedia"), then "Delete", then "OK" in the "Delete"
   window ("Are you sure you wish to delete this item? This action
   cannot be undone."). The row leaves the list.
4. Sign out and sign in as `dbarnes`.
5. Open submission 1: "Signalling Theory Dividends" (OJS); "The ABCs of
   Human Survival: A Paradigm for Global Citizenship" (OMP); "The
   influence of lactation on the quantity and quality of cashmere
   production" (OPS).
6. In the side menu, under "Publication" ("Preprint" on OPS), choose
   "Media" (on OJS, the one under "Version of Record 1.1", the
   unpublished version the menu opens on).
7. Press "Add Media File". The window "Upload Media File" opens.
8. Press "Click to upload files" and choose `figure.png`.
9. Open the file's "What kind of media is this? (Required)" list.
10. Choose "Multimedia" (OMP: "HTML Stylesheet") and press "Upload
    Files".

**Expected**: step 9 lists only the dependent components that are not
deleted: "Image" and "HTML Stylesheet" (OMP: "Image").

**Observed**: step 9 lists the deleted component too:

| App | "What kind of media is this? (Required)" |
|---|---|
| OJS, OPS | "Multimedia", "Image", "HTML Stylesheet" |
| OMP | "Image", "HTML Stylesheet" |

Step 10 uploads the file and closes the window. The "Media Files" list
then shows it with the deleted component as its type (OJS shown; OPS
reads the same, OMP with "HTML Stylesheet"):

```
ID   FILE NAME    TYPE         SIZE    DATE UPLOADED
28   figure.png   Multimedia   188 B   2026-10-04
```

The page's own request for the components, `GET
/index.php/publicknowledge/api/v1/genres`, answers 200 and lists the
deleted component with `"dependent": true, "enabled": false`.

## Cause

Deleting a component does not remove it.
`GenreGridHandler::deleteGenre()` (lib/pkp) refuses while any file
carries the component (`pkp/pkp-lib#3899`,
[9eefdcbb6f](https://github.com/pkp/pkp-lib/commit/9eefdcbb6fb9ec4694b8434c500e2ae654ca120b),
2022), and otherwise calls `GenreDAO::deleteObject()`, whose
`deleteById()` sets `enabled = 0` and keeps the row. The soft delete is
older than that refusal. So on today's code a file has a deleted type
only when it comes from data saved before the refusal, or when it was
uploaded through this fault. Every list that offers components for a
new file filters on `enabled`.

The "Media" page does not. Its store,
`src/managers/MediaFileManager/mediaFileManagerStore.js`
(lib/ui-library), fetches every component of the context through `GET
/genres` (`GenreController::getMany()` → `GenreDAO::getByContextId()`,
which returns every row and gives each its `enabled` flag through
`GenreResource`). It builds the window's choices from that list with
one filter, line 39:

```js
?.filter((genre) => genre.dependent)
```

So a deleted dependent component stays a choice. The server does not
stop the upload either. `AddMediaFiles::rules()` checks only
`temporaryFileId` and `variantType`, and `MediaFilesController::add()`
passes the chosen `genreId` to `Repo::submissionFile()->validate()`,
whose schema checks only that it is an integer. Nothing checks that the
component exists, belongs to the context, is enabled or is dependent.

Reach:

- The store is the only screen that reads the `genres` endpoint
  (checked in the code). Its unfiltered list also names each file's
  type in the "Media Files" table (`MediaFileManagerCellType.vue`). That
  list has to keep the deleted components, so that the files this fault
  has already filed under one, and older data, still show a type
  (checked in the code).
- When every dependent component is deleted, the window should show
  its empty-list text, "No media types are configured. Please contact
  the system administrator." (`MediaFileManagerAddFileModal.vue`). It
  shows the deleted components instead (checked in the code, not on
  screen).
- The other lists that offer a component for a new file read enabled
  rows only: the submission and workflow upload window
  (`SubmissionFilesUploadForm`, `GenreDAO::getByDependenceAndContextId()`),
  the submission wizard (`PKPSubmissionHandler`,
  `getEnabledByContextId()`) and the components list itself (checked in
  the code).
- What reads a media file's type (checked in the code): on the "Media"
  page, the "Type" badge, the "Edit Metadata" fields
  (`genreMetadataType`), "Manually Link Media" (`genreSupportsFileVariants`)
  and linking, which pairs only files of one type; outside it, the
  Native XML export, which writes the type's name. The reader side
  selects media files by publication, stage and resolution only: the
  HTML galley plugins' `HtmlGalleyHelper` (OJS, OMP) and the download
  routes in `ArticleHandler` (OJS), `CatalogBookHandler` (OMP) and
  `PreprintHandler` (OPS).

## Proposed fix

Offer only enabled components in the store's `genreOptions`, keeping
the unfiltered `genres` list for naming existing files' types, and give
the Storybook mock the `enabled` flag the filter now reads
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-page-offers-deleted-component/fix.diff)):

```diff
 		const genres = computed(() => genresList.value || []);
 
+		// The list holds deleted (disabled) components too, so that a file's type
+		// can still be named; only enabled ones are offered for a new file.
 		const genreOptions = computed(() =>
 			genres.value
-				?.filter((genre) => genre.dependent)
+				?.filter((genre) => genre.dependent && genre.enabled)
```

The endpoint already returns `enabled` for its clients to decide, and
the server-side upload lists apply the same rule. Tried on the three
apps: with it, step 9 lists "Image" and "HTML Stylesheet" (OMP:
"Image") and the deleted component cannot be chosen. With no component
deleted, the window offers every dependent component and an upload as
"Image" lands as "Image", with and without the fix.

**Alternatives**:

- Filter `enabled` in `GenreController::getMany()`: the "Media Files"
  table would show no type for the files this fault has already filed
  under a deleted component, nor for older data, and the endpoint's
  other clients would lose the deleted rows. An opt-in query parameter
  would do, but it is more than the client needs.
- A server guard that refuses a component that does not exist, belongs
  to another context, is deleted or is not dependent. It fits in
  `AddMediaFiles::rules()` (a rule on `files.*.genreId`) or its
  validation, before `add()` runs. Worth having for other clients of
  the endpoint, but alone it would leave the choice offered and turn
  it into an upload error.

**What goes with it**:

- `src/mocks/articleComponentGenres.js`, which feeds
  `MediaFileManager.stories.js` and `FileMediaUploader.stories.js`, has
  no `enabled` field. With the filter alone the MediaFileManager story's
  window would offer no media type, so the diff adds `enabled: true` to
  each of its components (Storybook only; not tried on screen).
- A Vitest unit test, or a Storybook case, for `genreOptions` with a
  disabled dependent component.
- No data repair. A file this fault has filed under a deleted component
  keeps a component row that still exists, with its name, metadata
  fields and resolution setting, so the "Media" page and the export go
  on handling it as before.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-page-offers-deleted-component/walk.js),
  run from the pkp-e2e repo root against an install loaded from the
  default dataset (PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/media-page-offers-deleted-component/walk.js`.
  It takes the Steps as written and records the choices, the upload's
  answer (`POST …/mediaFiles` 200), the "Media Files" rows and the
  page's own `GET /api/v1/genres`. `WALK=neighbour` runs the control
  alone: no delete, every dependent component offered, an upload as
  "Image".
- Tips: `main` OJS ff004d0973, OMP 3b0ecf794, OPS c8af945bb7;
  `stable-3_5_0` OJS c1cee76b95, OMP 9c5e24246, OPS 38b61882d3; the
  dataset from pkp/datasets 566bb1f.
- 3.5: submission 1's side menu has no "Media" on any of the three apps
  (read on screen, `WALK=where`). Dependent files are uploaded there,
  and on 3.4 and 3.3 (code), through `SubmissionFilesUploadForm`, whose
  list comes from `GenreDAO::getByDependenceAndContextId()` with
  `enabled = 1`.
- Introduced: `git blame` on line 39 of `mediaFileManagerStore.js` gives
  3f97137ce, the commit that created the file; 8e19a90b
  (`pkp/ui-library#892`) later moved `genreOptions` into the store's
  exports and kept the filter.
- Unverified: the case where every dependent component is deleted, read
  in the code only.
