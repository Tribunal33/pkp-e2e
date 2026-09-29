# Playwright Patterns

How we write tests, and the pitfalls that have already cost someone time.
Each entry says why, so you can judge the edge cases yourself. Everything
here describes the current harness. Anything that is only an idea, not code,
is marked **Not built yet**.

Where the rest lives: harness layout, config and how to run things in
`harness.md`; seeding and Mailpit in `scenarios.md`; the seeded accounts in
`users.md`; the test-authoring rules in `PRINCIPLES.md`.

## Locator priority

Pick the first that works:

1. **`getByRole`** — the default. It is resilient, reflects accessibility and
   matches what the user sees. `page.getByRole('button', {name: 'Submit'})`
2. **`getByLabel`** — form fields with a visible label.
3. **Stable IDs** — where the form is anchored by id. Login is the canonical
   case: `input#username`, `form#login button`.
4. **`data-cy` hooks** — the legacy Cypress markers still in the DOM, such as
   `[data-cy="workflow-controls-right"]`. Fine when role and label are
   ambiguous on a complex Vue view.
5. **CSS** — last resort. Wrap it in a role or data attribute when you can.

Avoid: `nth-child` and `:first-child` (they break when rows reorder); long
class-name chains; `waitForLoadState('networkidle')`
on Vue pages (they poll, so it may never resolve — wait on a visible landmark
instead).

## Locator pitfalls

Each of these has bitten at least once.

1. **OJS tabs are `role="tab"`, not `button`.** Top-level tabs have a stable
   hook: `#{name}-button` (`#review-button`, `#setup-button`).
2. **Nested tab groups.** The top-level *Setup* tab and Appearance → Setup are
   different tabs. Reach the outer one via `#setup-button` (`.first()` on Administration ›
   Site Settings, where the inner tab carries the same id) and the inner one
   via the visible-tab role. An address hash opens only its top tab, and a
   reload reopens on the top tab the address holds, so a side tab is
   pressed after its top tab (`#setup-button`, then `#settings-button` or
   `#info-button`); a side tab's form is `[id="<tab>"] form`
   (`[id="indexing"] form`), never a visible-tabpanel query, which also
   matches the outer panel holding every side tab's form (U55, U59, U60
   claim checks). The sidebar ("Site Navigation") is a PrimeVue
   panelmenu: every group's entries are in the DOM, the closed groups'
   regions `display:none`; only the open group header carries
   `aria-expanded`, the others carry none, so read a group by its header's
   `aria-controls` region and open it by pressing the header (U14 claim
   check K1, 2026-09-16).
3. **Headlessui menus (More Actions).** Items are `role="menuitem"`, and the
   menu portals to the document root. Scope to `page`, not to the row.
   Close one with `closeMenu(page)` (`shared/playwright/support/menus.js`),
   never a page-level Escape: focus enters the menu two animation frames
   after the click, and an Escape before that closes whatever encloses the
   menu, the workflow panel included (U01 S7, U30 S4; `npm run lint:suite`
   flags page-level Escapes). A ui-library `Dropdown` (`.pkpDropdown__content`,
   the DOIs page's "Bulk Actions") closes only by a timer on its button's
   blur (100 ms, then once a second), and a window one of its items opens
   hands the focus back to that item when it closes: answered within that
   second, the window leaves the menu open over the list for good. The page
   object that chooses such an item waits for the menu's items to be gone
   once the window is visible, before anything answers it
   (`DoisPage.chooseBulkAction`; U45 S6/S8, 2026-09-28, app-changes row 21).
4. **Side modals.** Scope via `[data-cy="active-modal"]`. When modals stack,
   filter by a distinctive inner element, never `.first()` or `.last()`.
   A legacy side window's content loads by AJAX after the dialog opens and
   `idle()` returns before it: use the kit's `settled()` on a field of its
   form. The page has one jQuery UI calendar (`#ui-datepicker-div`); opened
   from a second legacy window on the same page it sits under that window
   and the day click hangs its full timeout, so land the page afresh before
   the second window's date. `fill()` on a jQuery UI date box changes only
   the visible text, not the field the form posts, so the date saves as
   empty: type it from the keyboard (select all, Delete, the date, Tab)
   into the visible box, `[name="<field>-removed"]`, since the input
   named `<field>` is the hidden one the form posts (lib/pkp
   FormHandler; U13 PFL settings, U50 Issues forms, U72 chapters). A closed Vue side modal (and a legacy one closed
   by its own "Cancel", U32 ccK3) leaves a hidden shell in the DOM until the
   next navigation, so `getByRole` on the table behind it returns nothing
   until then; and a Vue form's "Save" is disabled after a refused save
   until the flagged boxes change (a click on it hangs). A page opened at
   an address that lands a side modal on top at once (the Comments page with `?commentId=N`) is hidden from role queries
   behind that modal: read the page's own heading by CSS (`main h1`), never
   `getByRole('heading')`, or the read races the modal and loses on CI (U14
   S5 OJS, red on both attempts of two push runs, 2026-09-17). The modal
   store keeps a closed side modal's slot for 450 ms on a timer and its
   `isSideModalOpened()` reads the slot, not the open flag, so an action
   that branches on it right after a close takes the wrong branch (the
   Comments page's "Delete Report" from a row, confirmed inside the window,
   closes "the report panel" again instead of refetching and keeps the
   deleted row: red in five of five untraced local full runs on the three
   apps, green alone, on CI and under tracing). Wait the window out with a
   page timer longer than the app's (`pastSideModalCloseWindow()` in the
   U14 page objects): it is due after the app's timer, so it fires after
   it whatever the load. The workflow dialog behind an inner window stays
   aria-hidden through that same slot after the window closes, so a
   dialog-scoped role read taken at once finds no row ("no row menu"):
   wait on the row locator itself or read through page-level role queries
   (U35 ccK3, 2026-09-20). The same slot follows every window close, a
   legacy window's and a confirmation's "Cancel" included: an opener
   pressed again within it opens nothing, so wait it out the same way
   before reopening (U38, U39 test authors).

5. **The side-modal outer wrapper reports `visibility: hidden`** while it
   opens, and permanently on some wrappers. Anchor `toBeVisible()` on inner
   content, never on the wrapper. The reverse holds inside `.-screenReader`,
   the app's visually hidden class (clipped to 1px): Playwright calls it
   visible, but a pointer click on it hangs its timeout (a refused Vue
   form's "Go to {field}: …" buttons, the "Editorial Activity" page's
   `h1`), so reach such a control by `focus()` and Enter, and click outside
   on something shown (U59, U64, U66, U06 claim checks).
6. **The workflow modal's rows disappear while a Vue dialog is stacked over
   them.** The underlying panel is unmounted or aria-hidden beneath the open
   dialog, so a reviewer row's state can only be asserted AFTER the dialog
   closes. Role-based reads of anything behind an open window return
   nothing for the same reason; read the page behind through text or CSS
   locators (U31, 2026-09-06). Anchor these dialogs by role and title
   (`getByRole('dialog', {name: /^Review Details:/})`), never by
   `[data-cy="active-modal"]` (that is pitfall 5's wrapper).
7. **The workflow page itself is a reka-ui dialog.** When it opens another
   modal, both are `[role="dialog"]`. Disambiguate by accessible name:
   `getByRole('dialog', {name: /Add Reviewer/i})`. Read its text from the
   dialog (the kit's `screen().text.dialog`; `text.main` is the dashboard
   list behind it), and close an inner window with its own "Close" or
   "Cancel", never Escape, which closes the workflow dialog too. The same
   goes for any widget open inside it (a row's "More Actions" menu, an
   editor toolbar's menu, a listbox): close a menu by pressing its own
   button again; and Escape in a legacy side window (a TinyMCE menu, a
   date box) closes the window through its "form has changed" confirm
   (U42, U48, U09, U50 claim checks and test authors). On a
   legacy (FBV) form the bottom "Cancel" is an `<a>` link, not a button, so
   a `getByRole('button')` Cancel never matches; use `getByRole('link')`
   or `a:visible` (U31, 2026-09-06).
8. **Confirmation dialogs.** Use `[role="dialog"]:has-text(...)` or the legacy
   `[data-cy="dialog"]`. Button labels vary (OK/Yes/No) between reka-ui and
   jQuery UI.
9. **fbvElement ids are runtime-suffixed** (`$FBV_uniqId`). Select by `name=`,
   not `#id`.
10. **Legacy pkp jQuery grids.** Row controls stay hidden until `a.show_extras`
    is clicked (its class flips to `hide_extras`). Rows are
    `tr.gridRow#component-grid-...`, and a row's action links live in the
    NEXT `tr` after it, not inside it; the arrow clicked a second time to
    close the controls hangs the click. A listbuilder's "Add Item" renders
    its new row after the click returns, so `.last()` on the visible boxes
    fills the previous row, and a grid redraw swallows the next click on it.
    A row's text and accessible name can open with its row control's
    label (the Plugins and Components grids read "Settings <name> …") or
    with padding, so match a row by a name it contains, never a
    start-anchored one; the "No items" line is a `tbody.empty` that stays
    in the DOM, hidden, once a row exists, so a row count or a sibling read
    skips it (U09, U13, U46). A grid's filter form (`form.filter`) is
    hidden until the header's "Search" link is pressed and folds away
    again after each search and redraw; the header links are reached by
    their class (`a.pkp_linkaction_search`, `a.pkp_linkaction_exportAllUsers`),
    which a grid-scoped `getByRole('link')` misses (U53, U54, U62, U63).
11. **PkpButton accessible names include row context.** The Edit button in a
    mailables list is named `Edit Discussion (Production)`. Use a row-scoped
    regex.
12. **AJAX-loaded email templates** (decision Composer steps). Wait for
    `.composer__loadingTemplateMask` to be gone before submitting, or the POST
    validates against an empty body.
13. **fbv plupload uploads.** The native `<input type=file>` sits at
    `opacity: 0` under a styled button. `setInputFiles()` on the input works;
    clicking the button opens a real OS dialog.
14. **`[role="status"]:has-text("Saved")`** is the canonical form-save
    confirmation. Wait on it before reloading or asserting persistence.
    "Saving" and "Saved" coexist for a beat as two `.pkpFormPage__status`
    spans, so filter by text, never a bare `toHaveText`. A successful Vue
    settings save shows only that inline status for about five seconds and
    no page notice; a refusal raises the page notice "The form was not
    saved because…" (or the 401/403 answer's error text), and its field
    errors carry class `pkpFieldError` (a `[class*=error]` sweep misses
    them). Page notices, these and a legacy window's save and refusal
    alike, are toasts in `.app__notifications .pkpNotification`, top
    right and outside every dialog: they stack downward, each expires
    five seconds after it shows but none while the pointer rests on the
    stack (ui-library `Page.vue`), and while shown they cover the controls
    under them. A probe reads them in `screen().notices`, a test as
    parallel lesson 2 says (U17, U55, U61, U62, U70, U72). One exception: Settings › Website
    › Content › "Comments" shows "Saving" and then reloads the whole
    Website Settings page onto Appearance › Theme, and "Saved" never
    appears; wait for the reload, not the status (U14 claim check K1,
    2026-09-16).
15. **`getByRole` name strings are substring matches.** `{name: 'View'}`
    matches "Assign Re**view**ers". Use `exact: true` or an anchored regex for
    short common words. The wizard rail is the standing trap: a "wait until
    step X is current" idiom on `'Review'` also matches "Reviewer
    Suggestions" and silently stays there; anchor the end
    (`SubmissionWizardPage`'s `endAnchored`) (U31, 2026-09-06).
16. **Legacy grid control links carry padding in their text.** A row's
    "Edit" link reads " Edit " to `hasText`, so an anchored regex
    (`filter({hasText: /^Edit$/})`) never matches. Read them by role and
    exact accessible name: `getByRole('link', {name: 'Edit', exact: true})`.
17. **A `page.goto()` that changes only the hash** of the page already open
    (`…/workflow#review/reviewForms` from `…/workflow`) is a same-document
    navigation: it returns null, nothing reloads, an open window stays open.
    Leave the page first (goto another address) or assert on the tab strip,
    not the response.

## Fixture selection

- One default user: `test.use({user: 'editor.diana'})` at file or describe
  level. Storage state is cached across runs.
- Several actors: the `asUser` fixture opens extra authenticated contexts.
  They close themselves at teardown. Do not `ctx.close()` by hand unless the
  test is about a closed session. Never combine it with a describe-level
  `test.use({user})`: that mints the default user's session at test setup
  and strands the later `asUser` contexts on the same worker server (both
  land on `/login`, even when the test never touches `page`), so a
  multi-actor test sets no default user and opens every actor through
  `asUser` (U32 tojs on OJS, 2026-09-19; the U33 and U35 suites re-learned
  it).
- Anonymous: omit `user`. But read parallel lesson 8 before trusting a context
  to be anonymous.

## Waiting strategy

Playwright auto-waits on every interaction. Explicit waits are only for
**arrival**: a navigation or DOM transition has completed. The harness
disables animations globally (see `harness.md`), so nothing waits on a modal
slide. Durations are 0.01ms rather than 0 because presence helpers wait on
`animationend`, and a true 0 can mean the event never fires.

- **Wait on a landmark, not the network**:
  `await expect(page.getByRole('heading', {name: 'Dashboard'})).toBeVisible()`.
- **Auth-style redirects**: `page.waitForURL(url => !url.pathname.includes('/login'),
  {waitUntil: 'commit'})`. The default `'load'` is fragile under parallel load
  because Vue dashboards fan out XHRs. `'commit'` fires on the URL change.
- **API-triggered updates**: arm `page.waitForResponse(...)` before the click
  and await it after. Prefer this over toast assertions (parallel lesson 2).
- **A form that fills a required field from its own fetch** refuses a
  submit pressed before the answer, in the page and silently ("This field
  is required.", no request); the page object that opens such a form
  returns it settled, the fetch's `waitForResponse` armed before the press
  and its value awaited (the OJS publish panel's "Issue Assignment",
  `PublicationScreen.pressPublish()`; U13 S3).
- **Legacy jQuery flows** (AjaxModal saves, Smarty grid refreshes, tab-handler
  clicks): call `waitForJQueryIdle(page)`. It lives in
  `shared/playwright/support/legacy.js`; the OJS and OPS trees re-export it
  from `apps/<app>/playwright/support/legacy.js`, so a spec imports
  `../support/legacy.js`. It waits until jQuery is absent or `jQuery.active`
  reaches 0. It is a no-op on Vue-only surfaces; prefer `waitForResponse`
  there. The symptom that points here: a spec passes at `--workers=1` but
  flakes at 2 with timeouts right after a legacy form save.
- **A cancel read under a network throttle** (CDP
  `Network.emulateNetworkConditions`): lifting the throttle releases every
  held byte at once, ahead of the page's abort, so the throttle stays on
  until the read that checks the cancel is done (after the reload), and it
  holds the body for seconds, sized by the body (64 bytes/s for a fixture
  under 1 KB), since a press under load misses a 0.3 s window. The page's
  upload progress reaches 100% when the browser has taken the body, so it
  is no clock for the wire (U36 S9, 2026-09-28).

## Parallel-load lessons

The suite runs in parallel by default. Shared seed data is what tests contend
over.

1. `waitForURL` needs `waitUntil: 'commit'` (above).
2. **`/notification/fetchNotification` drains ALL pending notifications for a
   user.** Two parallel tests running as the same user race for the toast
   queue. Assert on the save endpoint via `waitForResponse`, not on toasts.
   The drain runs on every backend page load of that user, in every
   context, and legacy form refusals are such notices too; so a legacy
   notice (or its absence) is read only by a user no concurrent test signs
   in as (a throwaway, a scratch context's own), or in an `@solo` test
   when it must be `admin`. Nor does a test leave state on a roster
   persona (a discussion opened as `manager.maya` on `publicknowledge`
   raises her tasks for every later reader).
3. **`searchPhrase=` OR-joins on whitespace.** Search by the tag alone, a
   single whitespace-free token. Never `'Published article {tag}'`.
4. **Mailpit is shared across workers AND fleets.** The rules and the
   `pkpMail` API are in `scenarios.md` "Mailpit" (PRINCIPLES A8).
5. **Sessions are minted per test through `POST _test/session`**, so
   `signInAs`/`signOutAs` migrating a session never strands another test's
   cookies. Specs do nothing special. A change to a user's password hash
   signs out every session of that user (Laravel's `AuthenticateSession`),
   and a form login rehashes a hash the app would not write, so the shared
   roster is seeded with the app's own hash (`UserSeeder`, `appHash`); a
   test that changes a roster persona's password would sign out every
   other worker's session of it.
6. **Server-side outbound HTTP fails fast at the dead-port `[proxy]`**
   (the config contract in `harness.md`); a test never depends on the app
   reaching an external service.
7. **Runners are invoked explicitly, in the serial project only.** A spec
   that needs a scheduled task invokes
   `php lib/pkp/tools/scheduler.php run`. One that needs a queued job's side
   effect (job-dispatched mail: ORCID mailables, deposits) invokes `runJobs()`
   from `shared/playwright/support/jobs.js`. Both belong in the serial project
   ONLY. An explicit runner drains the SHARED queue and can pop other tests'
   pending jobs, even inside a `Mail::fake()` seeding window, committing side
   effects while swallowing the message. Never run either while parallel
   workers are seeding. The project chain guarantees this in normal runs.
   Inside the serial project several workers drain at once, so a test may
   find its job already run by another test's drain; that is fine for a
   test that looks for the effect after its own drain (which also waits for
   jobs other runners are still executing), and wrong for a test that
   asserts "not yet, until the jobs run": tag that one `@solo` and it runs
   alone in the `<app>-solo` project after the serial one.
8. **"Anonymous" contexts are not anonymous under `test.use({user})`.**
   `browser.newContext()` inherits the file's storageState, and editors can
   *preview* unpublished articles, so an expected 404 becomes a 200. Pass an
   explicit empty state: `browser.newContext({storageState: {cookies: [],
   origins: []}})`.
9. **Bare front-end URLs 302 to the locale-prefixed form** on multilingual
   contexts (`/article/...` → `/en/article/...`). `page.goto` hides this, but
   `maxRedirects: 0` probes must use the prefixed URL. **The rule inverts on
   single-locale journals** (most scratch journals): the bare URL serves
   directly and the `/en/` form 302s back. Probe scratch journals bare and
   `publicknowledge` prefixed. A visit under another segment (`/fr_CA/…`)
   switches the session's language for every later request, so a French
   read is followed by `/en/` addresses or a fresh context; the site's own
   pages follow the site's languages, prefixed on the bilingual test site,
   bare on a one-language scratch context.
10. **Tags behind COUNT assertions need a per-run random component**, because
    long-lived DBs accumulate leftovers. **Tags behind SEARCH must be single
    hyphenless alphanumeric tokens.** Postgres splits `edd7-w0-x` into tokens
    and the search OR-matches them, so a `-w0-` tag matches every other
    worker-0 submission.
11. **Component-router URLs are kebab-cased** (`saveSequence` →
    `.../save-sequence`). A `waitForResponse` predicate on the camelCase op
    name never matches.
12. **Scratch journals auto-enrol `admin` as Manager** (this mirrors
    `PKPContextService::add()`). Every participant or user count on a scratch
    journal is one more than the seeded `users[]`.
13. **Legacy forms that embed a sub-grid contain that grid's own `<form>` and
    submit buttons.** Subscription forms, for example, embed SubscriberSelect,
    whose nested `form#userSearchForm` puts a "Search" submit first in DOM
    order. `form.locator('button[type=submit]').first()` clicks Search and
    silently clears your picked radio. Click Save by accessible name.
14. **A one-shot read of an XHR-loaded table races the fetch.**
    `expect(await grid.rows().evaluateAll(…)).toEqual([…])` reads whatever the
    legacy grid or list panel holds the instant the page object returns, and
    under a full run at auto workers that is `[]` (U12 S3 on OPS, 2026-09-17,
    the types grid right after `goto()`; green alone and in every lighter
    run). Read rows through a locator assertion (`toHaveCount`, `toHaveText`)
    or wrap the read in `await expect.poll(() => …)`; a plain
    `expect(await …)` is settled only on a server-rendered page after its
    navigation, a mail-catcher read after the drain, or an already-open panel.
    The same holds for a page-object reader that returns a value
    (`evaluate`, `allInnerTexts`, `boundingBox`, `count`): it waits inside
    for the state it reads, or has an `expect…` twin that polls; and
    `isVisible({timeout})` ignores its timeout (`npm run lint:suite`).
    A list the app does not order (no ORDER BY, or ties on a non-unique
    key) is compared as a set whatever the spec's wording, and a spec that
    claims an order such a query does not give is a spec correction. That
    holds for a second read of the same list too (a report downloaded twice,
    an export against an earlier one): its ties move between two requests
    on a busy database (U65 S7 OJS, five CI reds 2026-09-28).
15. **A file chooser opened from the keyboard needs interception already on.**
    `page.waitForEvent('filechooser')` switches Playwright's chooser
    interception on without waiting for the browser, and switches it off again
    when its listener goes, so an Enter pressed right after it can open the
    native dialog unseen: U10 S3 on OPS lost the event in 5 of 8 loaded runs
    (2026-09-24). Keep one `page.on('filechooser', () => {})` for the page's
    life, armed when the page object is built (`AppearancePages.js`
    `armFileChooser`), and make one round trip to the page before the key.
16. **A computed style is settled only once the page's stylesheets are in.**
    On a reader-facing page the theme's stylesheet is a PHP request
    (`css?name=stylesheet`) fetched again on every page, and the scripts sit
    in the footer, so the body is visible while that request is still out; a
    `getComputedStyle` or position read then answers without the theme (a
    marked link has no bar, an indented one no indent). `page.goto()` and
    `reload()` wait for it; a link's `click()`, a heading assertion and
    `toHaveURL` do not. A page-object reader of styles or geometry calls
    `BasePage.stylesApplied()` (the `load` state) before it reads (OMP U16
    S8, 10 of 10 red with the stylesheet held 3 s, 2026-09-29).

## Tag conventions

A test that seeds through the scenario API needs a unique tag so parallel
tests stay isolated:

- **At most 32 characters** (`journals.urlPath` is varchar(32); longer 500s).
- **A single hyphenless alphanumeric token** (lesson 10).
- Pattern: `{prefix}w{parallelIndex}{suffix}`, for example `subw0k3f9qa`. Give
  the suffix a per-run random component whenever the tag backs a COUNT
  assertion.

## Test tags

One tag is in use: `@smoke`, for the tests that must pass on every PR.
Filter with `--grep @smoke`. Apply it like this:
`test('name', {tag: ['@smoke']}, async ({page}) => {...})`.

## Page Object Model

Inherit from `BasePage` (`shared/playwright/pages/BasePage.js`). A POM holds
`page` and its locators as instance properties. A page object shared by the
three app suites stays app-neutral: role names, fold labels and other
per-app strings are passed in by the suite, never hard-coded from one app. Placement: shared mechanics go
in `shared/playwright/pages/` (today `BasePage`, `LoginPage`, `DashboardPage`,
`EditorialDashboardPage`, `MySubmissionsPage`, `ProfilePage` and `WorkflowPage`, the
workflow panel's frame: opening by address or from a row, header readouts,
the side menu with its stages, rounds, version nodes and pages, the status
and no-access boxes, the Delete / Return-to-Workflow / Return-to-Done
dialogs; app vocabulary comes from `appContext` capabilities or a `labels`
option); app-specific POMs go in
`apps/<app>/playwright/pages/`. The OJS tree has `ContributorPages.js`,
`FundingPages.js`, `OrcidPages.js`, `PublicationMetadataPages.js`,
`PublishSchedulePages.js`, `ReviewStagePages.js`, `UserInvitationPages.js` and
`SubmissionWizardPage.js` (the start form plus the wizard: collapse-aware
`gotoStep`/`expectStep`, dropzone `uploadFile`, TinyMCE fill, the submit and
cancel dialogs). OMP and OPS keep their own counterparts under their trees.

The workflow panel is split on purpose: the shared `WorkflowPage` owns the
frame (what U24 describes), while what a stage or page shows once open —
decisions, files, reviewers, publish, galleys — stays app-side in the
feature's own page object (`ReviewStagePages.js`, `PublishSchedulePages.js`,
…), because those surfaces differ per app.

**Not built yet**: an `IssuePage.js`. Build it at the shape a suite needs; no
code exists.

## Decision flow

Button labels do not always match the legacy Cypress names:

| Decision | Button label |
|---|---|
| sendExternalReview | `Send for Review` |
| acceptFromReview | `Accept Submission` |
| acceptInitial | `Accept and Skip Review` |
| sendToProduction | `Send To Production` |
| requestRevisions | `Request Revisions` |
| decline | `Decline` |

`Request Revisions` is the only primary decision that does NOT navigate
straight to `decision/record/{id}`. It first opens a side modal
(`WorkflowSelectRevisionFormModal`) with a radio for PENDING_REVISIONS (the
default) versus RESUBMIT (a new round). Only after Next does the page
navigate. Decision-constant and round-status gotchas: `scenarios.md`.

## Data seeding

The setup project runs the bootstrap once per DB
lifetime. Composite state comes from the scenario endpoints via
`pkpApi.createContext()`/`createSubmission()`; one-off mutations use the
app's api fixture. The full surface and its quirks: `scenarios.md`. There is
no cleanup fixture.

## Things to avoid

- **A stray server on a worker port** is adopted by a Playwright run
  (`reuseExistingServer`) instead of it starting its own, so nothing else
  may listen on the worker band (`harness.md` "The fleets").
- **A wait for an answer the server never sent.** A red with
  `ERR_EMPTY_RESPONSE`, `ERR_CONNECTION_RESET`, a `chrome-error://` page or
  `socket hang up` means the worker's `php -S` died under the test; read
  its `server-crash` annotation or the `[harness] php -S died` line in
  `.server-logs/` first, and never add a wait or a re-navigation for it
  (U01 S4 on CI, 2026-09-29).

## UI realities learned the hard way

- **There is no `queries` table.** Discussions live in `edit_tasks`, and
  `Repo::submission()->submit()` auto-creates editorial tasks. Any older doc
  or SQL that mentions `queries` or `query_participants` is stale.
- **Every pkp Search box commits on Enter only** (the dashboard's and the
  list panels' share `Search.vue`, `@keydown.enter.prevent`). `fill()` alone never filters. The two search
  boxes differ. The IN-PAGE box (accessible name `/Search submissions, ID/`)
  narrows the CURRENT view: the heading keeps the view's name and count. Only
  the SIDE-NAV global box (name prefix `Search submissions`; its accessible
  name grows once a phrase is typed, so never match it `exact`) flips to the
  cross-status "Search Results" view (`currentViewId=search`), which removes
  the in-page box. A row outside the current view is invisible to the in-page
  search. Switch view first, or search globally.
- **Paginated lists accumulate state across runs** on a long-lived DB. Never
  assert presence on an unscoped first page. Search by the test's tag first.
  Seeded drafts and drafts started on screen both carry a submission date on
  the current build (U45 claim check K3, 2026-09-26), so a date-ordered list
  places them by that date, not last.
- **A legacy jQuery UI tab is selected before its panel is on screen.**
  The reviewer wizard's steps (and any other remote-panel tab set) set
  `aria-selected="true"` when the panel's fetch starts; the panel is empty,
  or still shows the previous form on a re-activation, marked
  `aria-busy="true"` with the tab `ui-tabs-loading`, until the answer is
  in. A "step N is current" wait also waits for those marks to clear
  (`ReviewWizardPage.expectStep`), and nothing in the panel is counted,
  read or pressed before: a count reads 0, a press on the stale form loses
  its answer, and a "press again" retry covers neither (U28 S10,
  2026-09-29).
- **Server-rendered TinyMCE values never reach the backing textarea.** There
  is deliberately no helper. Read the editor directly:
  `page.evaluate((id) => window.tinymce?.get(id)?.getContent(), fieldId)`.
- **The wizard Steps rail collapses when it overflows.** Non-current pills are
  clipped to 1px, and `force: true` clicks are silent no-ops. Use
  `SubmissionWizardPage.gotoStep()`/`expectStep()`
  (`apps/ojs/playwright/pages/SubmissionWizardPage.js`). The pattern handles
  expansion, end-anchored name matching and clicks swallowed by a re-render.
  It reaches only a step already reached: an unreached pill does nothing
  (a draft never saved for later reopens, after a reload or a return, on
  "Upload Files" with the later pills unreached, on all three apps), so a
  later step is reached by "Continue" (`continueTo()`) (U17, U72, U75
  claim checks; U42 claim check I29).
- **`useFetch` tunnels DELETE and PUT via POST + `X-Http-Method-Override`, and
  unauthorized API calls return 401**, not 403. Match `waitForResponse` method
  predicates and status assertions accordingly.
- **The reviewer dashboard endpoint (`_submissions/reviewerAssignments`)
  ignores `searchPhrase` AND pagination.** Reviewer-side list assertions need
  scratch-journal scoping or a bounded full-list assertion.
- **The submission GET's `reviewAssignments` is a hand-rolled summary**:
  `statusId` plus Y-m-d dates only, with no `cancelled`, `declined` or
  `dateReminded` fields. Assert via `statusId` constants or the row's History
  modal.
- **Review files are grant-based.** Seeded in-review submissions carry no
  review-round files. The Add Reviewer modal's file selection writes the
  `review_files` grant. Mirror that flow; do not expect seeded files to be
  visible to the reviewer.
- **Reviewer-select copies the email template into TinyMCE client-side.** An
  uninitialized editor loses the body, and the save 500s on a null message.
  Wait for the editor's `initialized` before selecting. `ReviewStagePages`'s
  `addReviewer` does this; the 450ms modal slide used to mask the problem.
  Any TinyMCE box, in a Vue form or a legacy one (the reviewer's step-3
  comments, U27 S16 2026-09-29), must be `initialized` before typing (text
  typed earlier is wiped, or the save posts nothing for it), through
  `waitForEditorReady(page, id)` (`shared/playwright/support/richtext.js`):
  a read-back right after an early fill passes while the old value is
  still to come back, and every wizard step's and hidden tab's editors
  start with the page, not when shown (U21 S3, 2026-09-28); the shared
  `ReviewSettingsPages.typeRichText` and `ReviewerPages.typeInto` do it, and
  the legacy multilingual box's French twin opens only while the English box
  is focused (the globe icon is decorative). A legacy form's box too: its
  editable body shows before the editor has fetched its content style
  sheets, whose arrival loads the empty start content over what was typed,
  and the form then refuses the empty field with a 200 whose JSON reads
  `"status": false` and an `alert()` Playwright dismisses unseen. So wait
  for the editor inside the open form to report `initialized`, and judge a
  legacy send by that `status`, never by the 200 or a count on the window
  (`EmailUserWindow.expectOpen()`, `sendAndExpectSent()`; U14 S5,
  2026-09-28). And `initialized` alone is no proof a legacy box takes
  input: in a window with a second form language, a box can stay under
  TinyMCE's "Loading..." throbber for good (an app defect, U09's
  register), so a helper whose click, focus or read into a legacy box
  fails checks the box's own `.tox-throbber` and fails naming the stuck
  editor (`RichTextBox.failIfStuck()`; U09 S6, 2026-09-28).

- **Settings › Users & Roles › Users is a Vue table** (`<user-access-manager>`),
  not a legacy grid: each row has an ellipsis menu ("Edit", "Email", "Remove
  User", "Disable User"); "Edit" leaves the modal for
  `management/settings/user/{id}`, whose role rows carry "Remove Role". A
  journal manager may not administer `admin`, a user's last role cannot be
  removed there, and ending your own current role answers 401 until a
  fresh sign-in (sync rr3, 2026-09-09).

## Probe kit

`shared/playwright/probe/index.js` is what a live-probe script imports
instead of rebuilding a `lib.js`. It is a thin wrapper over the modules the
suites already use (`LoginPage`, `users.js`, `PkpApi`, `PkpMail`,
`waitForJQueryIdle`, `disableMotion`, `bin/apps.js`), so ports and keys are
environment-correct and nothing is hard-coded. Two environment variables
name the output folder, `.reports/<PROBE_FEATURE>/<PROBE_AGENT>/`:
`PROBE_FEATURE` is the spec id, `PROBE_AGENT` a short id for the agent.
Scripts run through `bin/probe.js`:

```bash
npm run probe-servers -- --start                    # once per session: php -S per app at base+50, and +90
npm run fleet-prep -- --feature sync --apps ojs [--reset]   # instead, on a cold (just reset) database: the probe server answers 500 to `bootstrapProbe()` until the runner's setup project has installed it (sync 2026-09-10)
PROBE_FEATURE=U03 PROBE_AGENT=g1 node bin/probe.js all my-probe.js   # or ojs|omp|ops; ONLY=ojs,omp narrows
```

A script calls `forEachApp(fn)`; `fn` receives one app's bag: `{app,
name, root, baseURL, port, api, mail, users, contextPath, url(path),
variant('validation')}`. `api` is the `_test` client with that app's own
key, `mail` the shared Mailpit, `baseURL` the probe server (base port + 50),
`variant('validation')` the +90 server with email validation and ALTCHA on.
Everything per app travels in the bag, never in `process.env`, so one
process holds all three apps. The exception is `PKP_APP_ROOT` and
`PKP_SUITE_DIR`, which `withApp` exports for the app while `fn` runs
because `base-test.js` reads them: a suite page object is required inside
`fn`, never at the top of the script (U21 tops, 2026-09-07).

The run record (`run-<app>-<HHMMSS>.json`) keeps every response of 400 or
more and the console's errors; its `crashes` list is the subset that means
the app itself failed (a response of 500 or more, an uncaught page error),
and the kit prints their count when the process ends. Each one is a
finding in its own right, reported on the digest block's `Crash:` line
even when the screen showed nothing.

```js
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} =
    require('../../shared/playwright/probe');

forEachApp(async (app) => {
    const scratch = tag('u03reg');
    await app.api.createContext({tag: scratch, users: [{username: `${scratch}mgr`, roles: ['manager']}]});
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'manager.maya');
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
        await idle(page);
        record(`website-${app.name}`, await screen(page));   // {url, title, aria, text}
        await shot(page, `website-${app.name}`);            // full-page PNG
        await loc(page, 'the Save button', page.getByRole('button', {name: 'Save', exact: true}));
        await signOut(page);
    } finally {
        await close();
    }
});
```

What each helper gives you: `launch(app)` is a 1280×900 Chromium with
animations off and a response listener that records URL, method, status and
size (never a body) of every `/api/` call and every status ≥ 400 into
`run-<app>-<HHMMSS>.json`, one record per process (HHMMSS from its start,
`-<pid>` added when another process of that second took the name),
which also carries the browser's console errors and warnings and uncaught
page errors (`console`, capped at 200), every browser dialog
(`dialogs`: type and message) and every page notice as it appears
(`notices`, pitfall 14); a browser `fn` leaves open when it ends or
throws is closed by `forEachApp`; `launch(app, {record: false})`
keeps the record empty for a check that must leave nothing behind. `screen(page)` is the screen as data: the aria snapshot of
the main region (the body when the page has no `main`) and of every open
dialog, plus the verbatim `innerText` of header and main, because aria
snapshots normalise punctuation, and `text.dialog`, the innerText of the
last visible dialog (null when none is open), because the workflow page is
itself a dialog over the dashboard and `text.main` reads the list behind
it, and `notices`, the page notices shown since the page's last
`screen()`, which have expired by the time a settled read is taken. `settled(page, locator)` waits, after `idle()`, until the locator's
text (an input's value) is non-empty and the same across two reads and
returns it, for a Composer page, a legacy side window loaded by AJAX or a
Vue side window built from a fetched publication, which fill after
`idle()` returns; on timeout it returns what is there and adds `{settled:
false}` to the run record's `warnings`, never a throw. The workflow's
Publication forms (Title & Abstract and its siblings) are such Vue windows:
the form and its footer's "Save" render after `screen()` and `idle()`
return, so read them through `settled()` on the form's footer or an editor
field, never straight after the click; and a preprint server heads these
pages "Preprint: …" where a journal or press reads "Publication: …", so a
heading wait keyed on "Publication" burns its timeout on OPS (U40 K1,
2026-09-09). `rawKeys(page, {scope})` lists every raw locale key
(`##key##`) on a translated page, in text, `<option>`s and attributes,
with where each sits and whether it is rendered; `screen().text` follows
CSS `text-transform`, so an upper-cased heading there is no code (U07,
U08, U11, U24 claim checks). `record(name, data)` writes JSON and
`shot(page, name)` a PNG, both as `<name>-<app>` inside `forEachApp`, so a
script on two apps never overwrites one app's snapshot with the other's;
a script run in phases, one process each, writes its facts with
`record(name, data, {merge: true})`, which folds the object into the
file's earlier one instead of overwriting it (U07, U08, U38, sync);
`loc(page, description, locator)` a row in
`locators.md` (selector, match count, visibility) for the test author,
appended under a dated heading when the process exits, so several
processes of one agent keep every row; the
same rows are appended to the feature-level `.reports/<feature>/screen-locators.md`
under the agent's id when the process exits, a file to grep by screen or
element, never to read whole. `note(text)` appends one line to
`.reports/<feature>/screen-notes.md` at once, for what a locator row cannot
carry: a dialog that appears on the way out of a screen, a premise that
proved wrong, a wait that hangs. Kept claim-check scripts live in
`shared/playwright/checks/<feature>/<chunk>/` and import the kit as
`require('../../../probe')`.
`idle(page)` is `waitForJQueryIdle` plus a bounded network-quiet wait, so a
Vue panel that fetches its own data on landing (a dashboard tab, a workflow
step's discussions panel) is on screen before `screen()` reads, and after
a press on a page already landed it waits out the requests the press
started (a pager's debounced fetch, a Reviewer Files grid's, a save's
"Refreshing data"), which Playwright's `networkidle`, fired once per page
load, does not (U23, U26, U27 claim checks). It does not wait out a
closed side window's page-leave handler: with animations off the closed
form keeps it for about half a second, so a leave-page prompt read right
after a close is real only if it is still there 2 s later (U37 I29
withdrew A22 on that); `tag(prefix)`
makes a scratch tag that follows the tag conventions above. `signIn` uses
the roster password rule, so it works for scratch users too; `signIn(page,
user, {contextPath})` goes through that journal's own login page (which
decides where the user lands), and any open session is signed out first.

`npm run lint:probe-imports` fails when `playwright/probe` appears under
`apps/` or `shared/playwright/{tests,pages,support}`.

`screen()` waits for the page's outstanding requests before it records.
Two kit gotchas every screen-driving agent meets: `idle(page)` hangs in a
session the server has just ended (after a password change or a sign-out
elsewhere), so use a bounded wait there; and the kit dismisses a browser
`confirm()` or `alert()`, as Playwright does, so a screen that may ask (a
tab switch with unsaved changes, a refused upload) needs `page.on('dialog',
…)` before the action, or the script silently takes the Cancel branch;
the run record's `dialogs` shows what asked. The kit accepts a page-leave
question (`beforeunload`) while its listener is the page's only one,
because dismissing it cancels the navigation and the next `goto()` or
`signOut()` fails with `ERR_ABORTED`; a script's own dialog listener
decides alone, so it accepts `beforeunload` itself (U37, U38, U08 claim
checks). A page-leave
probe on a legacy window blurs the box first: the form notices a change on
blur, so `page.goto()` with the box still focused raises no "Leave site?".
The run record
carries the browser's console errors and warnings and uncaught page errors
from `launch()` on; a script that needs every level (info, log) attaches
its own `page.on('console')` listener.
A download is awaited on `page.waitForEvent('download')` alone, never
raced against a `waitForURL` (the link's navigation aborts and settles the
race first, with nothing), and settled by the response's
`Content-Disposition: attachment`, never by a 200 or a popup (a refused
download answers 200 with JSON); a re-download after a change is also
read in a fresh `launch(app)`, because the browser revalidates by ETag and
keeps the earlier file name (U13, U47, U48 claim checks).
A probe run that outlasts the Bash tool's 600 s cap runs detached, `nohup
node bin/probe.js omp k3.js > k3-omp.log 2>&1 & echo $! > k3-omp.pid`, and
the wait polls that pid (`while kill -0 $(cat k3-omp.pid) 2>/dev/null; do
sleep 30; done`), never `pgrep -f "<script>"`: the waiting shell's own
command line carries the pattern, so the loop never ends (U07, U08, U38,
U39).
Two premises that cost a smoke run: a scratch context has no technical
support contact, and the validation email's sender is that contact, so a
registration on the +90 server 500s until a manager sets it (Settings ›
Contact); and the frontend has no `main` landmark, so `screen()` gives you
the body there.
A probe that needs a queued job's outcome (a DOI deposit, job-sent mail,
the search index, a usage chain) calls `await drainJobs(app)`, never
`support/jobs.js` `runJobs()`, which polls worker 0, down outside a run:
it runs `php lib/pkp/tools/jobs.php work --stop-when-empty` under the
fleet's test config and passes again while the probe server still counts
a queued job six seconds on (a failed attempt is retried after five
seconds and `--stop-when-empty` exits while it waits). `jobs.php run`
stops at the first failing job of any feature and returns between two
jobs of a chain; either one runs other features' queued jobs on that
fleet (U45 claim check K3, K5; U51, U17, U55, U56, U64).
