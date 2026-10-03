# Production assistants are refused a format's availability, "Set Terms" and "Select Files"; Series editors are refused the "Metadata" tab's lists

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; on unpublished versions only, the only ones that offer the controls there)
  - 3.3: OMP (code; on unpublished versions only, the only ones that offer the controls there)
- **Introduced** not traced as one change. For the Series editor present since at least [93b335f8d](https://github.com/pkp/omp/commit/93b335f8d1f0b0c93e680902b364a6a469049ad5) (2012-01-12). For the production assistants: [8c85273d53](https://github.com/pkp/pkp-lib/commit/8c85273d53c622fa503c0c1679bb12247092c908) for `pkp/pkp-lib#1478`, without a pull request · 2016-04-21 · Alec Smecher (asmecher); the "Metadata" tab by `pkp/omp#700` · [ce205d583](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U73 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a1), [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a book's "Publication Formats" page, the production assistants
assigned to the book (Layout Editor, Designer, Indexer, Proofreader)
are refused four controls the page offers them: a format's availability
link ("Not Available"), a file's "Set Terms", "Select Files", and the
four lists of a format's "Metadata" tab. Each one answers with the alert
"The current role does not have access to this operation." and changes
nothing, or stays on "Loading". The assigned Series editor is refused
the four lists the same way.

So the production assistants cannot make a format available, set a
file's price or choose its files, and neither they nor the Series editor
can enter a format's ONIX codes, sales rights, markets or publication
dates, though the rest of the page and of the tab is theirs to use.
Nothing stored is lost.

## Impact

- **Lost**: the change the person set out to make, and the time spent.
- **Who**: the production assistants assigned to a book in Production,
  on every visit to the page; the assigned Series editor whenever they
  fill a format's catalog data. These roles are meant to do this work:
  `pkp/pkp-lib#1478` ("Permit Layout Editors (assistants) to access
  Publication Formats grid") opened the page to the production
  assistants, and the Series editor may use the same tab's fields, its
  "Save" and the "Edit" tab's ISBN boxes, which write to the refused
  "Product Identification" list.
- **Way round**: a Press manager, Press editor or Production editor
  makes the change. Giving the person a manager-level role in the press
  (Press editor or Production editor) also gets round it, since the
  server tests the roles held in the press, not the assignment; but that
  opens every book and the press's settings to them (code). No setting
  or assignment option helps.

Medium: tasks the page offers to the roles meant to do them fail, with
a way round only through another person or a wider role. A ruling that
these roles should not do them would make it low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), OMP, the
  press `publicknowledge`.
- Book 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture", is in Production with `gcox` (Graham Cox) assigned as
  Layout Editor.
- Book 1, "The ABCs of Human Survival: A Paradigm for Global
  Citizenship", is in Copyediting with `dbuskins` (David Buskins)
  assigned as Series editor.
- Any PDF file, here `article.pdf`.

The Layout Editor:

1. Sign in as `gcox`. On the dashboard press "View" on book 4.
2. In the side menu open "Publication" › "Publication Formats".
3. Press "Add publication format", type the Name `EPUB u73a` and press
   "OK".
4. In the row of `EPUB u73a` press "Change File": choose the component
   "Book Manuscript" and `article.pdf`, then "Continue", "Continue",
   "Complete".
5. Press the format's "Not Available"; in "Format Availability" press
   "OK".
6. Accept the alert and press "Cancel" [3.5: "OK" and "Cancel" stay
   greyed out; the Escape key closes the window, and the book's
   workflow stays open]. Reload the page: it opens again on book 4's
   "Publication Formats".
7. Press the file's "Set Terms".
8. Close the window. Press the format's "Select Files" and accept the
   alerts.
9. Close the window. Press the arrow before `EPUB u73a`, then "Edit",
   then the "Metadata" tab, and accept the alerts.

The Series editor:

10. Sign in as `dbuskins`, press "View" on book 1 and open
    "Publication" › "Publication Formats".
11. Press "Add publication format", type `EPUB u73a`, press "OK".
12. Press the arrow before `EPUB u73a`, "Edit", "Metadata", and accept
    the alerts.

**Expected**: each control works for the role it is offered to. Step 5
makes the format "Available". Step 7 opens the terms form with "Open
Access", "Direct Sales" and "Not Available". Step 8 lists the files to
choose from. Steps 9 and 12 show the four lists with "Add Code", "Add
Sales Rights", "Add Market" and "Add publication date".

**Observed**: steps 3 and 4 work: the format is listed with "Change
File", "Select Files", "Awaiting Approval" and "Not Available", and the
file under it with "Set Terms".

- Step 5: a browser alert, "The current role does not have access to
  this operation.". "Format Availability" stays open, and after the
  reload in step 6 the format still reads "Not Available".
- Step 7: the window "Set Terms for Downloading" holds only "The current
  role does not have access to this operation.".
- Step 8: two alerts, "The current role does not have access to this
  operation." and "undefined". The window shows its introduction,
  "Loading" where the list belongs, and "Cancel", "OK".
- Steps 9 and 12: the same two alerts four times, and each of the four
  lists reads "Loading". The tab's fields and "Save" are there.

Each refused request answers 200 with the refusal:

```
POST …/$$$call$$$/grid/catalog-entry/publication-format-grid/set-available?representationId=4&newAvailableState=1&submissionId=4&publicationId=4
GET  …/$$$call$$$/grid/catalog-entry/publication-format-grid/edit-approved-proof?submissionFileId=145&submissionId=4&publicationId=4&representationId=4
GET  …/$$$call$$$/grid/files/proof/manage-proof-files-grid/fetch-grid?submissionId=4&publicationId=4&representationId=4
GET  …/$$$call$$$/grid/catalog-entry/identification-code-grid/fetch-grid?submissionId=4&publicationId=4&representationId=4
     (and sales-rights-grid, markets-grid, publication-date-grid)
{"status":false,"content":"The current role does not have access to this operation.", …}
```

Controls: the Series editor's "Not Available" › "OK" on book 1 makes
the format "Available"; and `dbarnes` (Press editor) opening the same
"Metadata" tab on book 4 gets the four lists with their "Add" links.

## Cause

Each control on the page sends its request to a handler with its own
role list, and six of those handlers admit fewer roles than the page
offers the control to.

The page decides which controls to show from a single flag. OMP
`controllers/grid/catalogEntry/PublicationFormatGridHandler.php`
`initialize()` sets `_canManage` for `ROLE_ID_MANAGER`,
`ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUB_EDITOR` and `ROLE_ID_ASSISTANT`
(lines 165–168). With it the grid adds the "Availability" column, and
`PublicationFormatGridCellProvider::getCellActions()` draws the
availability link, each file's terms link and "Select Files". The
format window's "Metadata" tab (`editFormatMetadata`) is open to the
same four roles (line 82).

The handlers behind those controls admit fewer:

- `PublicationFormatGridHandler::__construct()` (lines 75–80) gives
  `setAvailable`, `editApprovedProof` and `saveApprovedProof` to
  Manager, Sub editor and Site admin only, while the grid's other
  operations (line 82) include `ROLE_ID_ASSISTANT`.
- lib/pkp `controllers/grid/files/proof/ManageProofFilesGridHandler.php`
  (lines 43–50), the list inside "Select Files", admits Sub editor,
  Manager and Site admin, while `selectFiles` admits assistants.
- OMP `IdentificationCodeGridHandler`, `SalesRightsGridHandler`,
  `MarketsGridHandler` and `PublicationDateGridHandler` (lines 57–61),
  the four lists the "Metadata" tab loads with `load_url_in_div`, admit Manager and Site admin only: neither the
  Series editor nor the assistants.

The role check (`RoleBasedHandlerOperationPolicy`) refuses with
`user.authorization.roleBasedAccessDenied` as a 200 answer with
`status: false`. The legacy loader shows it as the first alert
(`Handler::handleJson()`), and `UrlInDivHandler::handleLoadedContent_()`
then alerts the `content` of the `false` that call returned, hence
"undefined".

The format
lists ([13e1e9808](https://github.com/pkp/omp/commit/13e1e9808494b59f3707d86d07a8cf0f2915d5c0),
2012-01-04) admitted the press manager alone, and
[93b335f8d](https://github.com/pkp/omp/commit/93b335f8d1f0b0c93e680902b364a6a469049ad5)
opened the catalog tab holding them to the Series editor. Then
[8c85273d53](https://github.com/pkp/pkp-lib/commit/8c85273d53c622fa503c0c1679bb12247092c908)
("Grant assistant roles access to the representations grid", for
`pkp/pkp-lib#1478` "Permit Layout Editors (assistants) to access
Publication Formats grid") added `ROLE_ID_ASSISTANT` to the grid's
shared operations, but not to OMP's own three or to the "Select Files"
list. `pkp/omp#700`
([ce205d583](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c))
moved the format's catalog data into the "Metadata" tab, open to
assistants, without touching the four lists.

Reach:

- All four assistant roles that take part in Production (Layout Editor,
  Designer, Indexer, Proofreader) carry `ROLE_ID_ASSISTANT` (code; the
  Layout Editor walked).
- The other requests the page's controls send are admitted for these
  roles: add, edit, delete and approve a format, approve a file,
  "Identifiers", "Dependent Files" (the same handler's line 82), and a
  file's "Edit" and "Delete" (code; "Add", "Change File" walked). A
  file's "More Information" › "History" is refused to assistants by
  another handler, reported in
  [U36 A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A3-assistant-file-history-keeps-loading.md).
- A published version (code): on `main` and 3.5 the page offers the
  same controls there. On 3.4 and 3.3 `_canManage` is set only while
  the version is unpublished.

## Proposed fix

Let each handler behind the page admit the roles the page offers its
control to, the way the grid's other operations already do. For the
production assistants that completes what `pkp/pkp-lib#1478` set out
to do; for the Series editor it lets the four lists follow the tab that
holds them. The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-controls-offered-then-refused/fix.diff),
in three parts:

- OMP `PublicationFormatGridHandler::__construct()` (below).
- OMP `IdentificationCodeGridHandler`, `SalesRightsGridHandler`,
  `MarketsGridHandler`, `PublicationDateGridHandler`: the roles of
  `editFormatMetadata`, the tab that loads them (Manager, Sub editor,
  Assistant, Site admin).
- lib/pkp `ManageProofFilesGridHandler`: `ROLE_ID_ASSISTANT` added, as
  `selectFiles` has it.

The first part:

```diff
-        $this->addRoleAssignment(
-            [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_SITE_ADMIN],
-            [
-                'setAvailable', 'editApprovedProof', 'saveApprovedProof',
-            ]
-        );
+        // Every role that gets `_canManage` (initialize()) is offered every
+        // control of the list, availability and terms included.
         $this->addRoleAssignment(
             [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT, Role::ROLE_ID_SITE_ADMIN],
             [
                 'addFormat', 'editFormat', 'editFormatTab', 'updateFormat', 'deleteFormat',
                 'setApproved', 'setProofFileCompletion', 'selectFiles',
+                'setAvailable', 'editApprovedProof', 'saveApprovedProof',
```

The added roles pass the same authorization as the grid's own
operations (`PublicationAccessPolicy`), so the fix grants nothing beyond
this book's formats to anyone the grid does not already admit.
"Marketing" › "Representatives", served from the same folder
(`RepresentativesGridHandler`), already admits these four roles, and OJS
gives assistants every galley operation (`ArticleGalleyGridHandler`).

The fix was tried on `main` with the Steps. The Layout Editor's "OK"
closed "Format Availability" and the format read "Available" after a
reload; "Set Terms" opened its form; "Select Files" drew its list (book
4 has no production-ready file, so "No Items"); and the four lists
loaded for the Layout Editor and the Series editor, with no alert. A
neighbour check gave the same result with the fix in and out: the
book's author `bbeaty` still saw only the "Name" column, with no
availability or terms link and no "Add publication format", and
`dbarnes` still loaded the four lists of the format "PDF" and made it
available.

**Alternatives**:

- Keep a format's availability and its files' prices with the editors,
  and stop offering those links and "Select Files" to assistants: a
  second flag beside `_canManage` in the grid, the cell provider and
  the category row. The four lists would still need the Sub editor
  role, since the Series editor saves the rest of the tab and types
  ISBNs on the "Edit" tab, which land in the same "Product
  Identification" list. Take this if the team rules that pricing is an
  editor's decision.
- Take `ROLE_ID_ASSISTANT` out of `_canManage`: undoes
  `pkp/pkp-lib#1478`, so assistants could no longer add formats or
  upload their files.

**What goes with it**:

- No stored data, REST API or plugin hook changes. Assistants and Series
  editors gain the ability to set a format's availability, a file's
  terms and price, and the format's ONIX lists.
- The `ManageProofFilesGridHandler` change grants assistants every
  operation of that grid: listing the files, saving a selection
  (`updateProofFiles`, the window's "OK", not driven), and its
  `addFile`, `downloadFile` and `deleteFile`. Only OMP's `selectFiles`
  reaches that lib/pkp handler (it alone builds `ManageProofFilesForm`,
  whose template loads the grid; OJS and OPS have no caller), so
  nothing changes outside the press.
- Backport: 3.5 has the same lines and takes the diff as it stands; 3.4
  has the same role lists (namespaced `Role::` constants, the same
  files); 3.3 has them in `.inc.php` files with the global `ROLE_ID_*`
  constants, so the diff needs rewriting there. Not tried on the older
  versions.
- Guard: the e2e scenario in spec U73 for the assigned Layout Editor,
  extended to the availability, terms and "Metadata" tab, and one for
  the Series editor's "Metadata" tab.

Medium: six role lists in two repositories (OMP and pkp-lib), each a
one-line change following the grid's own list, and a test; the
alternative needs a decision first.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-controls-offered-then-refused/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-controls-offered-then-refused/lib.js).
  It takes the Steps on an install loaded from the default dataset,
  then the Press editor's control, and records every alert and the
  answer of each request named above:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-controls-offered-then-refused/walk.js`;
  `WALK_MODE=neighbour` runs the neighbour check alone.
- Walked on `main` and 3.5, on PostgreSQL, with pkp/datasets 566bb1f
  (2026-10-03). No page script failed and no request failed on the
  server; the refusals answered 200 with `status: false`. Tips: OMP
  `main` 3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6; OMP
  `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib cf3f984335.
- The fix was tried on `main` only:
  `node bin/try-fix.js apply shared/playwright/checks/issues/format-controls-offered-then-refused/fix.diff omp`,
  then the walk and the neighbour check, then the neighbour check again
  after `revert`.
- 3.4 and 3.3 (code): OMP `upstream/stable-3_4_0` 0aec65441
  (2026-09-25) with pkp-lib `stable-3_4_0` 767353f4fe, and
  `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) with pkp-lib
  `stable-3_3_0` ac3fa73402. Read on each: the role lists of
  `PublicationFormatGridHandler` (the three operations without the
  assistant), the four list handlers (Manager and Site admin on 3.4,
  Manager alone on 3.3), `ManageProofFilesGridHandler` (no assistant),
  `_canManage`, and `publicationMetadataFormFields.tpl` (the four lists
  loaded in the tab).
- Introduced: `git log -G` on the role lists of
  `PublicationFormatGridHandler` and the four list handlers, and
  `git log -S` on the catalog tab's role list; the history is told in
  the Cause.
- Not driven: the Designer, Indexer and Proofreader (the same role,
  by code); a published version; "OK" in the refused "Select Files"
  window; the "Metadata" tab's "Save" and the "Edit" tab's ISBN boxes
  for these roles (admitted by `updateFormatMetadata` and
  `updateFormat`, whose `PublicationFormatForm` writes the ISBNs as
  identification codes; code); 3.4 and 3.3; MySQL (nothing here
  depends on the database).
- Upstream: pkp/pkp-lib and pkp/omp searched 2026-10-03, issues and pull
  requests, by the symptom's words and the handlers' names; nothing
  matched. `pkp/pkp-lib#12826` (remove grid code) would replace these
  handlers but has no fix for this.
