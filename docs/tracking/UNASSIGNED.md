# UNASSIGNED — parked atoms & dead-code candidates

Atlas atoms no feature claims, parked here so every atom has exactly one
owner; the campaign is done when every entry is claimed by a spec,
confirmed dead (it stays here with its evidence) or ruled out of scope.

Sources (removed from the tip 2026-08-25, reachable in git history): the six crosswalks in `.reports/phase0-feature-map/` (their UNASSIGNED
lists, consistent with `synthesis.md` §4) + `RULINGS.md`'s probe-derived
dead-code additions. **18 parked atoms** + **43 noted dead-code/defect
candidates attached to claimed atoms**. (PLUG-028 moved to FEATURE-MAP's
Out-of-scope tail — see RULINGS.md. Two candidates that rested solely on
scratched pre-reset evidence were dropped 2026-08-21 per the reset doctrine —
if real, their specs' own probes will resurface them.)

## Parked atoms (18)

### AFFW-701, AFFW-703, AFFW-704 — legacy author-dashboard round surfaces
- What: the old author-dashboard templates' editor-message link, author
  reviewer grid, and review attachments + revisions grids (FEATURE-MAP had
  them under U26).
- Why parked: dead — the legacy author-dashboard round panel is unreachable
  (its URLs answer 404; the current author round view is the shared workflow
  screen, per the review-stage spec's retired-legacy-surfaces footnote.
  AFFW-702's email-modal body remains live via the Notifications panel and
  stays claimed by U26).
- Resolves: maintainer confirmation as dead code (removal candidates).

### GRID-011, GRID-024 — legacy author review-attachment / revisions grids
- What: author-view grids for review attachments and uploaded revision files,
  mounted only from the retired author-dashboard round panel (AFFW-703/704).
- Why parked: dead with their mount — no reachable screen loads them in the
  current UI (same evidence as above; the open-review attachment grid
  GRID-010 is live inside the read-review sheet and stays claimed).
- Resolves: maintainer confirmation as dead code (removal candidates).

### AFFW-076 — sectionPolicy.tpl start-submission block
- What: OJS template block offering "start a submission" from the section
  policy display; marked deprecated 3.4 — the current Start Submission is the
  Vue form.
- Why parked: liveness unknown; claiming it in U17 or U21 would document a
  possibly-dead surface.
- Resolves: Phase-1 liveness probe (is the block reachable in the current UI?).
- Evidence (U17 spec author, code read 2026-09-25, ojs `d9b567efec`): no
  template, handler, Vue component or JS file of OJS or its lib/pkp names
  `sectionPolicy.tpl`; its only reference is its own header. The live
  start form shows the section policy through `StartSubmission`'s
  `FieldHTML` instead (the Sections spec, Rule 11). Dead-code candidate;
  resolves on maintainer confirmation.

### AFFM-170 — OMP statisticsSettingsForm.tpl
- What: OMP-only settings template that posts to an op no PHP handler declares.
- Why parked: dead-code candidate — the post target does not exist.
- Resolves: Phase-1 probe (does the page render/submit at all?); if dead, stays
  here as confirmed; if live, claim in U64.

### NOTIF-011 — NOTIFICATION_TYPE_PLUGIN_BASE
- What: plugin-type base offset constant.
- Why parked: zero references outside its definition — nothing to specify.
- Resolves: maintainer ruling to confirm dead (grep evidence already in
  synthesis §4); no probe needed.

### ROUTE-043 — OJS legacy `manager` dispatcher stub
- What: legacy page-handler switch that returns no handler for any op.
- Why parked: dead routing stub, no reachable behavior.
- Resolves: maintainer confirmation as dead code (candidate for removal).

### VUE-004 — ExamplePage
- What: ui-library docs example fixture.
- Why parked: no app mount; not product behavior.
- Resolves: none needed — remains here as a permanent non-product atom unless
  the atlas convention adds a "fixture" marking.

### VUE-042 — NavigationMenuManager component
- What: Vue manager component for navigation menus.
- Why parked: unmounted in any app; only its form modal (VUE-066, claimed by
  U08) is wired.
- Resolves: settled at U08 spec time (2026-09-23): no `NavigationMenuManager.vue`
  exists in any app's ui-library (ojs 2034439a, omp 977e460c, ops 5d138aa9);
  `managers/NavigationMenuManager/` holds only the form modal (VUE-066, claimed
  by U08, opened from the legacy grid), its field, its composable and stories.
  Confirmed dead atlas row; retire candidate.

### API-030 — open-peer-review data API (+ unmounted display components)
- What: OJS-mounted API whose display components (`PkpCite`, `PkpOpenReview`,
  `PkpOrcidDisplay` — recorded in `atlas/affordances-reader.md`'s boundary
  notes, no atom IDs) grep to no mount.
- Why parked: emerging surface with no reachable UI.
- Resolves: Phase-1 liveness probe; if a UI exists, likely U13/U26 territory;
  else stays parked as pre-release machinery.

### API-062 — OMP `publicationPeerReviews` entry point
- What: API mount instantiating a controller class absent from lib/pkp at the
  swept SHA.
- Why parked: dangling mount (confirmed by task ruling in the crosswalk).
- Resolves: maintainer confirmation as dead code / upstream sync artifact.

### API-066 — OPS legacy non-versioned `api/genres/` entry
- What: legacy alias mount outside `/v1/`.
- Why parked: dead-code candidate pending liveness.
- Resolves: Phase-1 probe (does the alias respond?); if live, claim as a U58
  reference row.

### JOB-001 — abstract queued-job base class
- What: framework base, no feature-visible behavior.
- Why parked: nothing to specify.
- Resolves: none needed — permanent infra atom (mirrors the Q5 infra logic at
  job level).

### JOB-028, JOB-029 — TestJobFailure / TestJobSuccess
- What: queue smoke-test fixtures.
- Why parked: they assert nothing about the product (synthesis §4 park; R's
  claim-in-jobs reading rejected there).
- Resolves: none needed; optionally citable by U61 as a reference line if the
  jobs spec wants a smoke-test mention.

### JOB-047 — abstract staged-file-processing framework base
- What: framework base for staged file processing jobs.
- Why parked: no feature-visible behavior of its own.
- Resolves: none needed — permanent infra atom.

## Dead-code / defect candidates attached to claimed atoms (RULINGS + spec-time additions)

These atoms ARE claimed in FEATURE-MAP; the notes below travel with them to
spec time as register material. Listed here so the candidates have one home
until their specs exist. Do not force-claim the defects themselves.

1. **catalogCategory.tpl unassigned variables** — attached to **U68**
   (OMP-variant category page rows; seam with U16's shared category page).
   The template reads `$featuredMonographIds` / `$newReleasesMonographs`,
   never assigned by the shared handler that renders it
   (probe-omp-catalog.md §7). Resolves: U68/U16 spec-time register entry;
   probe confirms the display silently no-ops.
2. **Dangling `results` op** — attached to **U68** (ROUTE-056, OMP
   `pages/catalog/index.php`). The route map dispatches op `results` to a
   method that exists nowhere in the handler chain (probe-omp-catalog.md §7).
   Resolves: U68 spec-time register entry; dead-code candidate for removal.
3. **SectionController `filterByTypeIds()` dispatch** — resolved 2026-09-25: the Sections spec's register
   [A4](../specs/U17-sections.md#a4) carries it.
4. **Missing OMP dashboard series filter** — resolved 2026-09-25: the Submissions dashboard's
   register OMP1 carries it ([U23](../specs/U23-submissions-dashboard.md)); the Sections spec states it (Rule 3).
5. **`api/v1/sections` mount gap** — resolved 2026-09-25: the Sections spec's register
   [A5](../specs/U17-sections.md#a5) carries it.
6. **OMP "Request Revisions" author email invites a response OMP cannot
   collect** — attached to **U30** (author response) / mail templates. The
   press email asks the author to "submit your response" but OMP mounts no
   Author Response panel (the shipped review-stage spec's register documents
   the panel absence; the template mismatch is U30's / the mail templates').
   Resolves: U30 spec-time register entry; reconcile template with the press
   roster.
7. **AFFW-068 dead-in-context** — attached to **U21** (claimed; the
   submission-wizard spec's footnote a + Reference row document the verdict).
   The legacy `SubmissionsListPanel` "New Submission" button renders on none
   of its remaining mounts: the Native XML import/export screen is the
   panel's only server-side mount and blanks the panel's add URL by
   construction (`PKPNativeImportExportPlugin`); the button renders only when
   an add URL is set. Live-verified 2026-08-25 as manager on OJS, OMP and
   OPS. Resolves: maintainer confirmation as dead code (removal candidate).
8. **AFFW-711 dead-code candidate** — attached to **U40** (claimed; the
   publication-metadata spec's Reference table documents the waiver). The
   "View submission metadata" modal's template
   (`lib/pkp/templates/controllers/modals/submission/viewSubmissionMetadata.tpl`)
   does not exist in any of the session's pinned checkouts (ojs ac67a6dd76,
   omp 244a04311c, ops 94f6bbc59a, incl. lib/pkp submodules) — the atlas row
   describes a file a later refactor removed; no screen offers the modal.
   Code-verified 2026-08-28 (spec-author sweep of all three checkouts).
   Resolves: maintainer confirmation as dead atlas row (atom retire
   candidate).
9. **GRID-051 + AFFW-681..686 dead-surface candidates** — attached to
   **U41** (claimed; the contributors-and-affiliations spec's Reference
   table documents the waiver). The legacy pre-3.4 author grid
   (`PKP\controllers\grid\users\author\AuthorGridHandler` and its six row
   affordances) has no mount site in any of the session's pinned checkouts
   (ojs ac67a6dd76, omp 244a04311c, ops 94f6bbc59a): no template, page or
   plugin references the grid's component route — only the class files and
   autoloader entries remain — and OPS lacks the app-side form class the
   handler instantiates, so invoking it there would fatal. Code-verified
   2026-08-28 (spec-author sweep of templates/pages/plugins in all three
   checkouts). Resolves: maintainer confirmation as dead code (removal
   candidate).
10. **AFFW-243 dead-code candidate** — attached to **U33** (claimed; the
    production-stage spec's Reference table documents the waiver). The
    "Change decision" link (`WorkflowActionChangeDecision.vue`) is imported
    and registered in `WorkflowPageOPS.vue` and mounted by no workflow
    config in any app: a grep of the three `lib/ui-library/src` trees finds
    only the import and the `Components` entry, so no screen renders it.
    Code-verified 2026-09-19 (spec-author sweep; checkouts ojs 7c8d69af3e, omp
    0ec98a508, ops 9ce633ee1d). Resolves: maintainer confirmation as dead code
    (removal candidate).
11. **GRID-022 unmounted legacy grid** — attached to **U33** (claimed; the
    production-stage spec's Reference table documents the waiver). The
    legacy `ProductionReadyFilesGridHandler` is referenced by no template,
    config or page in the three checkouts; the Vue "Production Ready Files"
    list (`useFileManagerConfig.js` `PRODUCTION_READY_FILES`, listing
    through the submission-files API and uploading through the shared
    upload wizard) is the live surface. Code-verified 2026-09-19 (checkouts
    as above). Resolves: maintainer confirmation as dead code (removal
    candidate).
12. **GRID-023 unreachable outside OMP's publication formats** — attached to
    **U33** (claimed; the production-stage spec's Reference table documents
    the waiver). `ManageProofFilesGridHandler` is mounted only from
    `templates/controllers/grid/files/proof/manageProofFiles.tpl`, which
    only OMP's `PublicationFormatGridHandler` renders inside the
    publication-format window (outside the campaign per FEATURE-MAP's U46
    note); on a journal or preprint server no screen reaches it. The
    window's form, AFFW-612, is U36's atom and shares this verdict (the
    submission-files spec's Reference table, 2026-09-23).
    Code-verified 2026-09-19 (checkouts as above). Resolves: out of scope on
    OMP; dead on OJS and OPS pending maintainer confirmation.
13. **NOTIF-021..028 normal-level notices with no reader** — attached to
    **U34** (claimed; the decision-recording spec's register entry A5
    documents it). `EditorDecisionNotificationManager::updateNotification()`
    writes an author notice on every decision, but only the two revision
    types are task-level and reach the header Tasks panel; the normal-level
    ones ("Submission accepted.", "Production process started." and the
    rest) are fetched by no template or Vue component in lib/pkp, the
    ui-library or the three apps (`WorkflowNotificationDisplay.vue` asks for
    the copyediting and production notice types alone); the retired author
    dashboard was their surface. Code-verified 2026-09-20 (checkouts as
    above). Resolves: maintainer confirmation as dead display (the rows are
    still written; removal candidate for the message and URL branches).
14. **NOTIF-014, NOTIF-016..018 per-stage editor-assignment notices with no
    reader** — attached to **U35** (claimed; the stage-participants spec's
    note o and Reference table document it).
    `EditorAssignmentNotificationManager::updateNotification()` still
    creates and deletes the per-stage "An editor must be assigned before
    review is initiated…" rows (no user, task level) on every assignment and
    removal, but no template or Vue component in lib/pkp, the ui-library or
    the three apps fetches those types (`WorkflowNotificationDisplay.vue`
    asks for the copyediting and production types only), and
    `WorkflowHandler::getEditorAssignmentNotificationTypeByStageId()` has no
    caller. Code-verified 2026-09-22 (checkouts ojs 7c8d69af3e, omp
    c6a132892, ops 4bb66b1469). Resolves: maintainer confirmation as dead
    display (removal candidate; OMP's internal-review sibling NOTIF-015 is
    the same).
15. **NOTIF-046 editor-assign task never raised** — attached to **U35**
    (claimed; the spec's register entry A6 documents it).
    `PKPStageParticipantNotifyForm::sendMessage()` raises
    `NOTIFICATION_TYPE_EDITOR_ASSIGN` only for the template key
    `EDITOR_ASSIGN`, while every installed "Assign Editor" template carries
    `EDITOR_ASSIGN_SUBMISSION`, `_REVIEW` or `_PRODUCTION`
    (`registry/taskTemplates.xml` in all three apps); nothing else raises
    the type. Code-verified 2026-09-22 (checkouts as above). Resolves: a
    fix (match the per-stage keys) or maintainer confirmation as dead.
16. **GRID-054 legacy grid rendering ops unmounted** — attached to **U35**
    (claimed; the spec's note o documents the waiver). The
    `StageParticipantGridHandler` ops that render the old participants grid
    (`fetchGrid`, `fetchRow`, `fetchCategory`, with `StageParticipantGridRow`
    and its link actions) and `fetchUserList` are loaded by no template,
    page or Vue component; the Vue Participants panel (VUE-043) is the live
    surface and calls only `addParticipant`, `saveParticipant`,
    `deleteParticipant`, `viewNotify`, `sendNotification` and
    `fetchTemplateBody`, which stay claimed. Code-verified 2026-09-22
    (checkouts as above). Resolves: maintainer confirmation as dead code
    (removal candidate for the rendering ops and the row class).
17. **AFFW-599 proof-file "Edit Metadata" tabset unreachable outside OMP's
    publication formats** — attached to **U36** (claimed; the
    submission-files spec's Reference table documents the waiver).
    `PKPManageFileApiHandler::editMetadata()` renders the
    `editMetadata.tpl` tabset ("Edit Metadata", "Identifiers") only for a
    proof file; the Vue file lists never hold proof files, the galley
    rows (`GalleyManager`) offer no file-edit action, and the legacy
    selection windows list no proof stage
    (`SubmissionFilesCategoryGridDataProvider::_getFileStagesByStageId()`),
    so on a journal or preprint server no screen opens it; OMP overrides
    the op for its publication-format proof files (outside the campaign).
    Code-verified 2026-09-23 (U36 spec author; checkouts ojs `38781720df`,
    lib/pkp `f8bacd765`, ui-library `5d138aa9`). Resolves: out of scope on
    OMP; dead on OJS and OPS pending maintainer confirmation.
18. **AFFW-594 revision-only wizard with nothing to revise, liveness
    unknown** — attached to **U36** (claimed; the submission-files spec's
    Reference table notes it). The message "There are no files for you to
    revise at this time." renders only for a `revisionOnly` upload with no
    preset file and no revisable file. The only callers passing
    `revisionOnly` without a preset file are `AddRevisionLinkAction`, built
    by `PendingRevisionsNotificationManager::getNotificationContents()` and
    the legacy `ReviewRevisionsGridDataProvider`; the header Tasks grid
    shows the notice's message, not its contents
    (`NotificationsGridCellProvider`), and the galley "Change File" always
    presets the file. No current screen was found rendering that link.
    Code read 2026-09-23 (U36 spec author; checkouts as above). Resolves:
    a live probe of the pending-revisions notice's surfaces, then
    maintainer confirmation as dead or a claim in the spec.
19. **Unlinked information ops, OMP's `contentOnly`, the contact page's
    `contactTitle`** — attached to **U07** (claimed; the
    journal-identity spec's notes u and v document them). OJS
    `InformationHandler` answers `competingInterestGuidelines` (reading
    the context setting `competingInterestsPolicy`) and OMP's answers
    `competingInterestPolicy` (reading `competingInterestPolicy`); no
    context schema of the three apps defines either setting, so the page
    is always empty. Both apps' `sampleCopyrightWording` op prints
    `manager.setup.copyrightNotice.sample`. No template, menu type,
    email or Vue component in the three checkouts links any of these
    ops (`grep -rn` over `.tpl`, `.php`, `.js`, `.vue`, `.xml`, `.json`
    outside the page handlers and `pages/information/index.php`). OMP's
    `contentOnly` request parameter (hides the header and footer of an
    information page) is set by nothing. `contact.tpl` prints
    `contactTitle`, which no form, schema property or API writes.
    Code-verified 2026-09-23 (checkouts ojs 802202cb3e, omp 7f9455d5a,
    ops 15f0b6e0bd). Resolves: maintainer confirmation as dead code
    (removal candidates).
20. **API-044 note delete unreachable and always refused** — attached to
    **U37** (claimed; the tasks-and-discussions spec's Reference table
    lists the route). `DELETE submissions/{id}/tasks/{taskId}/notes/{noteId}`
    has no caller in the ui-library (no screen offers deleting a message),
    and it cannot succeed: `NoteAccessPolicy` (write) denies every note
    that is not the head note, and `EditorialTaskController::deleteNote()`
    refuses the head note. Code-verified 2026-09-23 (U37 spec author;
    checkouts ojs `802202cb3e`, lib/pkp `5af3b3933`, ui-library
    `2034439a`). Resolves: maintainer confirmation as dead (removal
    candidate), or a screen for deleting a reply with a policy that allows
    it.
21. **Unrendered discussions-manager pieces** — attached to **U37**
    (claimed). `useDiscussionManagerConfig.js` grants
    `TASKS_AND_DISCUSSIONS_SEARCH`, but nothing renders it and the store's
    `discussionSearch()` calls an action `useDiscussionManagerActions.js`
    does not define; the texts `task.reopenThisTask` /
    `task.confirmReopenTask` are reachable only through a box that is
    always disabled (the spec's register entry A13); and
    `editorialTask/Repository::countOpenPerStage()` has no caller.
    Code-verified 2026-09-23 (checkouts as above). Resolves: maintainer
    confirmation as dead code.
22. **Unreachable activity-log pieces** — attached to **U38** (claimed;
    the activity-log spec's Reference table lists them). A note's
    attached-file download link (AFFW-692): `note.tpl` renders
    `$noteFileDownloadLink`, which no handler or form assigns, so no note
    ever shows it. The submissions list item's "Activity Log & Notes"
    button (`SubmissionsListItem.vue::openInfoCenter()`): every mount of
    `SubmissionsListPanel` (the native, PubMed and ONIX export plugins)
    replaces the item through its `item` slot, so the expanded item that
    holds the button never renders; the workflow header's "Activity Log"
    is the one door. API-018's `GET emails/{emailId}`
    (`PKPEmailController::getEmail()`): no ui-library caller (the
    author's "Notifications" list reads `emails/authorEmails` only).
    Code-verified 2026-09-23 (U38 spec author; checkouts ojs
    `802202cb3e`, lib/pkp `5af3b3933`, ui-library `2034439a`; omp
    `7f9455d5a`; ops `15f0b6e0bd`). Resolves: maintainer confirmation as
    dead code (removal candidates).
23. **Unrendered fallback menus and the legacy menu form** — attached to
    **U08** (claimed; the navigation-menus spec's Reference table
    documents the waiver). Each app's
    `templates/frontend/components/primaryNavMenu.tpl` (AFFR-004, AFFR-005,
    AFFR-006: a hand-written primary menu for a journal with none
    configured) is included by no template, page or plugin in any
    checkout: `header.tpl` renders only `{load_menu name="primary"}`,
    which draws nothing when no menu fills the area. The legacy
    `PKP\controllers\grid\navigationMenus\form\NavigationMenuForm` and
    `templates/controllers/grid/navigationMenus/form/navigationMenuForm.tpl`
    (named by AFFM-031) are instantiated nowhere since the grid opens the
    Vue `NavigationMenuManagerFormModal` (pkp-lib#12177, 2026-01-22); the
    items grid's `saveSequence` op has no ordering feature behind it.
    Code-verified 2026-09-23 (U08 spec author; checkouts ojs `802202cb3e`,
    omp `7f9455d5a`, ops `15f0b6e0bd`). Resolves: maintainer confirmation
    as dead code (removal candidates).
24. **Unreached library pieces** — attached to **U39** (claimed; the
    libraries spec's Reference table lists them). GRID-030
    `SelectableLibraryFileGridHandler` (a tick-box list of Publisher
    Library files): no template, handler or ui-library code loads
    `grid.files.SelectableLibraryFileGridHandler` (the email composer's
    "Library Files" reads the `_library` API instead). The legacy author
    dashboard's `submissionLibraryUrl`
    (`PKPAuthorDashboardHandler::setupTemplate()`): the page's
    `submission()` forwards to My Submissions before anything renders,
    so no screen uses it; the workflow header's "Library" is the one
    door. Code-verified 2026-09-24 (U39 spec author; checkouts ojs
    `802202cb3e`, lib/pkp `5af3b3933`, ui-library `2034439a`; omp
    `7f9455d5a`; ops `15f0b6e0bd`). Resolves: maintainer confirmation as
    dead code (removal candidates).
25. **Unreached citation pieces** — attached to **U42** (claimed; the
    citations spec's Reference table lists them).
    `lib/ui-library/src/managers/CitationManager/CitationManagerMetadataLookup.vue`
    (a per-submission lookup switch) is imported by no component and binds
    `citationStore.formEnableLookup`, which the store never defines; the
    locale strings it would go with
    (`submission.citations.structured.enableModal.*`, `.disableModal.*`,
    `.enableCitationsMetadataLookup`) and the "Add" result messages
    (`submission.citations.structured.addRaw.*`) have no caller in
    ui-library or lib/pkp. The legacy author dashboard's references form
    (`PKPAuthorDashboardHandler::setupTemplate()`, `PKPCitationsForm` under
    `components.citations`): the page's `submission()` forwards to My
    Submissions before anything renders, so no screen shows it; the
    workflow's "References" page and the wizard's References box are the
    doors. Code-verified 2026-09-24 (U42 spec author; checkouts ojs
    `71bb244152`, omp `a36551804`, ops `07141ae4df`, lib/pkp
    `25182919bf`, ui-library `1afd40a9`). Resolves: maintainer
    confirmation as dead code (removal candidates).
26. **Unreached custom-page and static-page pieces** — attached to **U09**
    (claimed; the custom-pages spec's Reference table lists them). The
    `view` and `index` ops of `lib/pkp/pages/navigationMenu/` without a
    custom item (`NavigationMenuItemHandler::view()` returns `false` when
    no item was handed over; `index()` redirects there): no template,
    menu or JS links `navigationMenu/view`, the custom page being served
    at its own path through the `LoadHandler` hook. In the Static Pages
    plugin (OJS, OMP): `StaticPageGridHandler::index()` and
    `templates/staticPages.tpl` (the tab uses `staticPagesTab.tpl` and
    loads `fetchGrid` directly), and the locale strings `pageSaved`,
    `pageDeleted`, `editStaticPage`, `addNewPage`, `settingInstructions`,
    `editInstructions`, `noneExist` have no caller, while the form's
    `nameRequired` key has no string; in Custom Block Manager the
    `plugins.generic.customBlock.nameRegEx` string has no caller.
    Code-verified 2026-09-24 (U09 spec author; checkouts ojs
    `71bb244152`, omp `a36551804`, ops `07141ae4df`, lib/pkp
    `25182919bf`, staticPages `45d02c0`, customBlockManager `1f8d452`).
    Resolves: maintainer confirmation as dead code (removal candidates).
27. **Unreached identifier pieces** — attached to **U44** (claimed; the
    identifiers spec's Reference table lists them). OPS
    `controllers/grid/pubIds/form/AssignPublicIdentifiersForm.php` and
    `templates/controllers/grid/pubIds/form/assignPublicIdentifiersForm.tpl`
    (AFFW-607): no OPS handler builds the form. The OJS template's
    `PKPSubmission` branch posts to `tab.issueEntry.IssueEntryTabHandler`
    `assignPubIds`, a handler that exists in no app (AFFW-605's live
    half is the issue branch, "Publish Issue"). The submission branch of
    each app's `publicIdentifiersForm.tpl` (the article's identifiers
    moved to the Vue "Identifiers" page). OJS and OPS
    `ManageFileApiHandler` `identifiers` / `updateIdentifiers` /
    `clearPubId` (GRID-067, GRID-100): `editMetadata.tpl` shows its
    "Identifiers" tab only when `showIdentifierTab` is assigned, which only
    OMP's subclass does, so no OJS or OPS screen opens them (a typed
    address still reaches them). OJS `issueForm.tpl`'s `$pubIdPlugins`
    loop (`IssueForm` never assigns the variable) and the OJS
    `PubIdPlugin::manage()` verb `assignPubIds` (no URN screen posts
    it). Code-verified 2026-09-24 (U44 spec author; checkouts ojs
    `71bb244152`, omp `a365518044`, ops `07141ae4df`, lib/pkp
    `25182919bf`, ui-library `1afd40a911`). Resolves: maintainer
    confirmation as dead code (removal candidates).
28. **Unreached galley-grid pieces** — attached to **U46** (claimed; the
    galleys spec's Reference table notes them). OJS
    `ArticleGalleyGridHandler`'s rendering operations (`fetchGrid`,
    `fetchRow` with its `uploadFile` event), `ArticleGalleyGridRow`'s row
    actions ("Edit a Layout Galley" / "View Galley", the upload action,
    "Delete") and `ArticleGalleyGridCellProvider`, the grid's own "Add
    galley" link and `js/controllers/grid/articleGalleys/ArticleGalleyGridHandler.js`:
    loaded only through `representationsGridUrl`, which the retired
    author dashboard (`PKPAuthorDashboardHandler`) assigns and no current
    screen reads; the workflow's "Galleys" page (`GalleyManager`) calls
    only the edit, delete and ordering operations. OPS's copies stay live
    in the submission wizard's "Upload Files" step (`templates/submission/galleys.tpl`,
    U21); OPS `WorkflowHandler::_getRepresentationsGridUrl()` has no
    caller. The `galleyView` window's heading `submission.layout.viewGalley`
    is reached on OPS only (an OJS Author has no row menu). Code-verified
    2026-09-24 (U46 spec author; checkouts ojs `71bb244152`, ops
    `07141ae4df`, lib/pkp `25182919bf`, ui-library `1afd40a9`). Resolves:
    maintainer confirmation as dead code (removal candidates on OJS).
29. **Unreached media-file pieces** — attached to **U47** (claimed; the
    media-files spec's Reference table notes them). The
    `variantGroupIds` and `variantTypes` query filters of
    `MediaFilesController::getMany()` (API-041): the "Media" page fetches
    the whole list and no screen passes either. The `canEdit` value
    `workflowConfigEditorialOJS.js` passes to `MediaFileManager` (AFFW-420):
    the component declares no such prop, so it falls through as an
    attribute and nothing reads it (the root of the spec's A1). OPS
    `PreprintHandler::download()`'s admission of a publication's media
    file ids for a galley: OPS installs no HTML galley renderer, so no
    page produces such an address (the spec's OPS1; pending the claim
    check's drive). Code-verified 2026-09-24 (U47 spec author; checkouts
    ojs `71bb244152`, omp `a36551804`, ops `07141ae4df`, lib/pkp
    `25182919bf`, ui-library `1afd40a9`). Resolves: maintainer
    confirmation as dead code (removal candidates), or the OPS1 ruling.
30. **Unmounted landing-page display components** — attached to **U13**
    (AFFR-056, ROUTE-033; claimed). OJS `ArticleHandler::view()` builds an
    `OpenReviewComponent` configuration, locale keys and icons for every
    article page, but no template mounts an open-review display
    (`PkpOpenReview*` in ui-library `src/frontend/components/` is mounted
    by no OJS or OPS template, as API-030 above records for `PkpCite`
    too); the page's "Downloads" chart is drawn by
    `lib/pkp/js/usage-stats-chart.js`, and ui-library's
    `PkpUsageChart.vue` is mounted nowhere. Code-verified 2026-09-24 (U13
    spec author; checkouts ojs `d9b567efec`, ops `61cd158ce3`, lib/pkp
    `76a315591b`, ui-library `03d1cee2d2`). Resolves: maintainer
    confirmation as pre-release machinery or dead code.
31. **Unreached JATS and Body Text pieces** — attached to **U48**
    (claimed; the JATS & Body Text spec's Reference tables note them).
    `PKPWorkflowHandler::getJatsPanel()` and
    `PKP\components\PublicationSectionJats` (AFFW-403's legacy twin): OJS
    `WorkflowHandler` still builds the panel's config into the page's
    `components`, but no Vue component or template reads it; the page's
    "JATS XML" is `WorkflowPublicationJats`. The Body Text API's `DELETE`
    (API-009): no screen calls it (the page only reads and saves). The
    "JATS Template Plugin"'s `jatsTemplate/download` page operation
    (`JatsTemplateDownloadHandler`, PLUG-019; manager or subscription
    manager, Production-ready files): no screen links it, it serves
    API-key clients only. Code-verified 2026-09-25 (U48 spec author;
    checkouts ojs `71bb244152`, lib/pkp `76a315591`, ui-library
    `03d1cee2`). Resolves: maintainer confirmation as dead code (removal
    candidates), or a ruling that the download op is an external
    interface.
32. **Categories API form route with no method** — attached to **U16**
    (API-010; claimed; the Categories spec's Reference tables note it).
    `CategoryCategoryController::getGroupRoutes()` registers `GET
    categories/categoryFormComponent` to `$this->getCategoryFormComponent(...)`,
    a method no class in the chain defines (Laravel's `Controller::__call()`
    lets the route register and would answer a server error when called);
    no screen calls it, the tab gets its form from the page
    (`ManagementHandler::context()`). Also: the category `fullSize` page
    op (lib/pkp `PKPCatalogHandler`, OMP `CatalogHandler`) is linked from
    no page in any app (the category page's picture sits in a `div`, the
    Categories spec's A6). Code-verified
    2026-09-25 (U16 spec author; checkouts lib/pkp `76a315591b`, omp
    `187f0f40d`). Resolves: maintainer confirmation as dead code (removal
    candidate), or the route's method restored.
33. **Unused series fields** — attached to **U17** (SET-038, AFFM-009;
    claimed; the Sections spec's footnotes note them). OMP's
    `schemas/section.json` carries `featured` and `reviewFormId` for a
    series: `SeriesForm::readInputData()` reads `featured`, but no field
    of `seriesForm.tpl` posts it, so every save stores it off, and nothing
    in OMP reads `Section::getFeatured()`; no series field sets
    `reviewFormId`, which `ReviewerForm::initData()` would read for a
    press's default review form. Code-verified 2026-09-25 (U17 spec
    author; checkouts omp `187f0f40d`, lib/pkp `76a315591b`). Resolves:
    maintainer confirmation as dead code (removal candidates), or a field
    added to the series window.
34. **Unlinked users-list entry points** — attached to **U53** (VUE-051,
    GRID-050; claimed; the Users management spec's Reference tables note
    them). `ContextGridHandler::users()` (the Hosted Journals grid, site
    administrator only) returns `management/accessUsers.tpl`, the Vue
    users list, as a grid fragment; no row action of `ContextGridRow`
    ("Edit", "Settings wizard", "Remove") and no template calls it, and the
    administrator's per-journal users surface is the Settings wizard's
    "Users" tab (the legacy `UserGridHandler` grid). The page operation
    `management/access` (`ManagementHandler::access()`, granted to the site
    administrator alone in each app's `SettingsHandler`) renders the same
    Users & Roles page as `management/settings/access`, but no menu or link
    points at it. Code-verified 2026-09-25 (U53 spec author; checkouts ojs
    `71bb244152`, omp `187f0f40d2`, ops `61cd158ce3`, lib/pkp
    `76a315591b`, ui-library `03d1cee2`). Resolves: maintainer
    confirmation as dead code (removal candidates), or a ruling that the
    direct `management/access` address is an intended administrator
    entry.
35. **Unreachable roles-list pieces** — attached to **U54** (GRID-048,
    AFFM-109; claimed; the Roles configuration spec's Reference tables
    note them). `UserGroupGridHandler` grants and routes `fetchCategory`,
    but the roles list is not a category grid (no `GridCategoryRow`, no
    category data), so nothing calls it. In `UserGroupForm`,
    `settings.roles.roleIdRequired` ("You need to define a role permission
    level.") guards a select that always carries a value, and the
    template's hidden `settings.roles.stageIdRequired` label ("You need to
    define a stage to assign to.") belongs to no validator. Code-verified
    2026-09-26 (U54 spec author; checkouts ojs `71bb244152`, omp
    `187f0f40d`, ops `61cd158ce3`, lib/pkp `76a315591b`). Resolves:
    maintainer confirmation as dead code (removal candidates).
36. **OAI bearer-token read** — attached to **U19** (ROUTE-044,
    ROUTE-079; claimed; the OAI-PMH spec's footnote b names the
    handler). OJS and OPS `OAIHandler::validate()`, called from
    `index()` after the access decision, decode an `Authorization:
    Bearer` API key and store it with `setApiToken()` ("Permit the use
    of the Authorization header and an API key for access to unpublished
    content"), but every OAI records query serves published items only
    and no screen or client of the app sends the header; a token that
    fails to decode is not caught. OMP has no such code. Code-verified
    2026-09-26 (U19 spec author; checkouts ojs `71bb244152`, omp
    `187f0f40d`, ops `61cd158ce3`, lib/pkp `76a315591b`). Resolves:
    maintainer confirmation as dead code (removal candidate), or a
    ruling on what the token is meant to open.
37. **Unreachable email-setup pieces** — attached to **U56** (AFFM-085,
    AFFM-124; claimed; the Emails management spec's notes b and k name
    them). `PKPEmailSetupForm::addCopySubmissionAckPrimaryContactField()`
    falls back to a sentence ("No primary contact has been defined for
    this journal…", `…copySubmissionAckPrimaryContact.disabled.description`,
    which OPS's locale lacks) when the context has no contact email, but
    every screen that sets the contact (Settings › Journal › "Contact",
    the Hosted Journals create form) requires one. `Mailable::$canDisable`
    / `canDisable()` is set on eleven mailables and read by nothing; the
    switching-off the setup form does goes through
    `Repository::isMailableEnabled()` instead. `ManageEmailsPage`'s
    `closeMailableModal()` and `closeTemplateModal()` are wired to no
    event since the side windows moved to `useModal`. Code-verified
    2026-09-26 (U56 spec author; checkouts ojs `d9b567efec`, omp
    `187f0f40d`, ops `61cd158ce3`, lib/pkp `76a315591b`, ui-library
    `03d1cee2`). Resolves: maintainer confirmation as dead code (removal
    candidates).
38. **OMP's legacy site-setup form template** — attached to **U60**
    (AFFM-224; claimed; the Site settings spec's note f-omp1 names the
    commit). `omp/templates/controllers/tab/settings/siteSetup/form/siteSetupForm.tpl`
    posts to `tab.settings.AdminSettingsTabHandler`, which no longer
    exists in OMP or lib/pkp; no handler or template includes the file,
    and Administration › "Site Settings" › "Appearance" › "Setup" is the
    Vue `PKPSiteAppearanceForm` on all three apps. Last touched in the
    2024-05-29 template sweep (`78ed38462`). Code-verified 2026-09-26
    (U60 spec author; checkouts omp `72a01a026`, lib/pkp `1ad4a14bb2`).
    Resolves: maintainer confirmation as dead code (removal candidate).
39. **Unreachable DOI pieces** — attached to **U45** (API-001,
    AFFU-244, ROUTE-010, PLUG-009, PLUG-011; claimed). Author-response
    DOIs: the `authorResponse` kind is commented out of OJS
    `DoiSetupSettingsForm`, so no journal can tick it, yet
    `DoiListPanelOJS.vue` builds its rows, `_dois/authorResponses/{id}`
    is routed, and the collectors join its table. `PKPDoisHandler`
    role-assigns a `management` op with no method, and its `index()`
    builds the Setup and Registration forms into the DOIs page's state,
    which `dois.tpl` never mounts. The Crossref and DataCite export
    plugins' `manage` settings path calls `getSettingsFormClassName()`,
    which throws ("DOI settings no longer managed via plugin settings
    form."); the Plugins list links those rows to the Tools page instead,
    so nothing opens it. OMP `DoiSetupSettingsForm` removes an
    `automaticDoiDeposit` field it never has. Legacy locale keys
    (`doi.editor.*`, `doi.manager.settings.doiReassign*`,
    `doi.manager.settings.doiAssignJournalWide*`,
    `doi.manager.settings.doiSuffixLegacy`) are displayed nowhere.
    Code-verified 2026-09-26 (U45 spec author; checkouts ojs
    `3162c105bf`, omp `72a01a026`, ops `e9f6f4f550`, lib/pkp
    `1ad4a14bb2`, ui-library `03d1cee2`). Resolves: maintainer
    confirmation as dead code (removal candidates), author-response DOIs
    as pre-release machinery.
40. **Dangling Administration `saveSettings` op** — attached to **U61**
    (ROUTE-003; claimed; the System administration spec's Reference
    table lists the live ops). `lib/pkp/pages/admin/index.php` routes op
    `saveSettings` to `AdminHandler`, which has no such method and does
    not list it among its role assignments; no template or script links
    it, and lib/pkp's history of `AdminHandler.php` never had the
    method. Code-verified 2026-09-26 (U61 spec author; checkouts ojs
    `3162c105bf`, lib/pkp `1ad4a14bb2`). Resolves: maintainer
    confirmation as dead code (removal candidate).
41. **Unreached payment pieces** — attached to **U52** (AFFM-182,
    NOTIF-036, ROUTE-052's `payMembership`; claimed). The "Payments" tab's
    list (`PaymentsGridHandler`) role-assigns a `viewPayment` op whose body
    is `// FIXME` and no row links to it, so the payment "Details" window
    exists nowhere. `NOTIFICATION_TYPE_CONFIGURE_PAYMENT_METHOD` has its
    message and style in lib/pkp but nothing on a journal raises it (OMP
    raises it from the publication-format sale, out of scope). OJS
    `UserHandler::payMembership()` is routed but no template links to it,
    and `OJSPaymentManager::createQueuedPayment()` marks the membership
    type deprecated (`error_log` + `assert(false)`), so the "Association
    Membership" fee has no purchase path (the spec's A7); the locale keys
    `payment.membership.buyMembership`, `.renewMembership`,
    `payment.publication.payPublication`, `payment.payNow`,
    `payment.alreadyPaid*` and `about.authorFees*` are displayed nowhere.
    Code-verified 2026-09-26 (U52 spec author; checkouts ojs
    `3162c105bf`, omp `72a01a026`, lib/pkp `1ad4a14bb2`). Resolves:
    maintainer confirmation as dead code (removal candidates), or a
    ruling to restore the membership purchase.
42. **Unreachable plugin-management pieces** — attached to **U62**
    (AFFM-047, AFFM-048, AFFM-049; claimed). `PluginHelper::isGalleryAllowed()`
    always answers true (`getCapabilities()` sets `canSeeGallery` on every
    install mode), so the `{if $canSeePluginGallery}` guards in
    `website.tpl` and `contextSettings.tpl` never hide the Plugin Gallery;
    `PluginHelper::isPluginInstallDisabled()` has no caller.
    `PluginHelper::upgradePlugin()` throws with
    `manager.plugins.uploadDisabled`, a key no locale defines, on a path
    only a direct `saveUploadPlugin` request reaches (no screen offers
    "Upgrade" while uploads are off). `uploadPluginForm.tpl` tests
    `$function == 'install'`, a value the form never receives (the
    action is `upload`; the visible symptom is the Plugins management
    spec's A2). Locale keys displayed nowhere: `manager.plugins.delete`,
    `.deleteDescription`, `.description`, `.pluginManagement`,
    `.sitePlugin`, `.copyError`, `.fileSelectError`, `.action`,
    `manager.plugins.pluginGallery.overview`, `.installation`,
    `.maintainer`, `.homepage`, `.status`. Code-verified 2026-09-27
    (U62 spec author; checkouts ojs `3162c105bf`, omp `72a01a026`, ops
    `e9f6f4f550`, lib/pkp `1ad4a14bb`). Resolves: maintainer
    confirmation as dead code (removal candidates).
43. **Unmounted export grids** — attached to **U63** (GRID-073, GRID-074,
    GRID-075, GRID-102, GRID-103, GRID-105; claimed). The OJS
    `PubIdExportIssuesListGridHandler`, `PubIdExportRepresentationsListGridHandler`
    and `PubIdExportSubmissionsListGridHandler`, and the OPS
    `PubIdExportRepresentationsListGridHandler`,
    `PubIdExportSubmissionsListGridHandler` and
    `ExportPublishedSubmissionsListGridHandler`, are loaded by no template,
    component or script in any checkout: the DOI agencies' Tools pages
    now show only the "DOI management has moved" notice (the DOIs spec's
    Rule 44), and OPS has no DOAJ page. The OJS
    `ExportPublishedSubmissionsListGridHandler` and
    `ExportPublishedPublicationsListGridHandler` stay live on the DOAJ
    page. Locale keys the import/export pages display nowhere:
    `plugins.importexport.users.import.sendNotify`, `.continueOnError`,
    `.dataFile`, `.confirmUsers`, `.warning`, `.encryptionMismatch`,
    `.usersWereImported`, `.errorsOccurred`,
    `plugins.importexport.users.export.exportByRole`, `.exportAllUsers`
    (the grid's own "Export All Users" is used instead),
    `plugins.importexport.native.exportSubmissionsSelect`,
    `plugins.importexport.pubmed.export`, `.export.articles`,
    `.export.selectArticle`, `.export.issues`, `.export.selectIssue`. Code-verified 2026-09-27 (U63
    spec author; checkouts ojs `3162c105bf`, omp `72a01a0263`, ops
    `e9f6f4f550`, lib/pkp `1ad4a14bb2`). Resolves: maintainer
    confirmation as dead code (removal candidates).
