# Friction — what made an agent's task harder than it needed to be

What cost a screen-driving agent calls, time or retries that a better
brief, doc, kit, seed or fixture would have saved; that agent appends a row
at the end of its task. The housekeeping session folds the rows and
deletes them under MAINTENANCE "The housekeeping session".

One line per entry, appended at the end, in this shape:

`YYYY-MM-DD · U<nn>, sync or issues · <role and agent id> · <what cost you calls, time or retries> · <what would have helped>`

Facts only, the same quarantine as everywhere else (nothing
security-shaped, no credentials).

## Entries
2026-10-07 · issues · issue reporter r2 (U04 A14) · no kit helper publishes a production submission through the screens on both lines and apps (OJS main panel, OJS 3.5 "Select an issue …" then "Publish", OPS "Post the preprint"); wrote one in the walk's lib.js from three page objects and two other issue libs · a shared `publishOnScreen(page, app, sid, {issue})` in the probe kit or a page object covering OJS/OPS on main and stable-3_5_0
2026-10-07 · issues · issue reporter r5 (U16 OMP5) · the unit was already fixed on main by pkp/pkp-lib#12915 (merged 2026-10-05, the `class_exists()` preloads in lib/pkp `includes/bootstrap.php`), which upstream-sync.md and app-changes row 18 record; found only after reading the register, the footnote and the sync log · `npm run backlog` skipping (or flagging) a register entry whose app-changes row or sync log names a merged fix
2026-10-07 · U75 · flake diagnostician (u75s2-relations-panel) · the CI error-context.md's "Test source" shows only the page-object frame of the failing read (PreprintRelationsPages.js open()), not the spec line that called it, so which of S2's four open() calls failed had to be inferred from the page snapshot; and the PLAYWRIGHT_LEVER hook gives only the context, so a release placed right after a page object's read needed the worker's Locator prototype wrapped · error-context (or the CI artifact) carrying the full call stack down to the spec line; a lever hook that also receives the test's step events (test.step / expect calls) so a lever can act between two of the test's reads
2026-10-07 · U39 · claim checker ccI07 (U39 I07, row 35) · the kept issue walk `checks/issues/library-add-file-refused-closes-unasked/lib.js` `openPublisherLibrary(page, app)` opens `app.contextPath` (publicknowledge, written for a dataset fleet), so reused from a feature fleet with a scratch manager it failed 30 s on "Workflow Settings" until the bag was spread with the scratch path; and fix trials of other issue walks (`orcid-*/fix.diff`) were applied to and removed from the slot's main checkouts during the run (the kit warned "FIX CHANGED DURING THE RUN") · a `contextPath` option on the walk libs' openers, and a claim-check brief line saying whether fix trials may run on the checkouts a checker drives
2026-10-07 · issues · issue reporter r6 (U20 OMP2 refresh) · no kit helper opens an address a page announces (a citation_* tag, a feed link) the way a signed-out browser or crawler does and records each redirect hop to the file or the Login page; my first `request.get(…, {maxRedirects: 0})` stopped at the locale redirect (`/catalog/download/…` → `/en/catalog/download/…`), so the 3.5 walk had to be reset and run again · a `followAddress(page, app, address)` in the probe kit returning every hop (status, content type, disposition, location) and stopping at a file, a page or `/login`
