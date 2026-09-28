# Scenario API & Mailpit

The `/api/v1/_test/*` endpoints build realistic application state in one
POST. This file documents what
the endpoints accept today, the facts tests rely on, and how to assert on
email through Mailpit. Builders follow PRINCIPLES A2 and A3.

## How the endpoints work

The routes are site-wide: `/index.php/index/api/v1/_test/…`. They are gated
by the `X-Test-Key` header, which must match the `TEST_API_KEY` environment
variable of the PHP server. Without the variable the whole namespace answers
404. With a wrong header it answers 403. See `harness.md` for the variable
and for `bin/mount.js`, which copies the PHP code into the app checkouts.

Every mutating request but `scenarios/job` and `scenarios/task` (below)
runs inside one database transaction and under a mail fake. A failed build rolls back, so it never leaves half-created
state, with one exception seen: a `scenarios/context` request refused on
`sidebar` (a 400) left its context behind on all three apps, path taken
(U18 claim check K1, K3, 2026-09-26), so a retry takes a new path. Mail sent while seeding is dropped, but each mailable is still built
the way the app's mailer builds it before sending, so the `email_log` rows
the app writes next to a send carry the compiled subject and body, as they
do after a real send. Only mail sent by the test's own
actions reaches Mailpit. The acting user during a build is the installer's
`admin` account.

Validation is strict. There is no JSON schema. The builders read the request
through the `Spec` reader (`shared/php/classes/testing/Spec.php`), and any
key no builder consumes fails the request with a 400 that names the key in
dotted form (`specKey`). The builder code is therefore the authoritative list
of accepted keys. The lists below are kept in step with it.

Multilingual fields (`name`, section `title` and `abbrev`, publication
`title`, `abstract`, `subtitle`, `plainLanguageSummary`) accept a locale map such as `{"en": "…"}`. A bare
string is wrapped under the context's primary locale. Pass a locale map when
the test needs a specific locale.
One exception, OJS and OPS: a locale-map `abbrev` on the context
scenario's first section (the one that renames the default section) is
stored as the string "Array", so that section's OAI set reads
`{path}:Array` until its window is saved on screen; pass `abbrev` there as
a bare string (U19 claim check K3, 2026-09-26).

## `POST` / `GET bootstrap`

The base seed for a fresh database. The setup project posts the app's
`apps/<app>/playwright/fixtures/bootstrap.js` payload. A warm call (context
already present) does nothing and answers `{seeded: true, warm: true}`. The
`GET` form is the warm/cold probe and answers `{installed, seeded}`.

Payload keys:

- `context` with `path` (required), `name`, `acronym`, `description`,
  `primaryLocale`, `supportedLocales`, `supportedSubmissionLocales`,
  `contactName`, `contactEmail`, `enabled`. An empty `contactName` is
  not refused and is stored as "Site Admin", so a context without a
  principal contact name cannot be seeded (U20 claim check K2,
  2026-09-26, three apps).
- `sections[]` (OJS, OPS) or `series[]` (OMP). The first declared section
  renames the default section the app creates on context creation (OJS
  "Articles", OPS "Preprints") instead of adding a second one. OMP creates no
  default series. Section fields, OJS: `abbrev` (required), `title`,
  `policy`, `wordCount`, `abstractsNotRequired`, `identifyType`,
  `hideTitle` (U50, below). OPS: `abbrev`
  (required), `path`, `title`, `policy`, `wordCount`, `abstractsNotRequired`.
  OMP series: `path` (required), `title`, `description`.
- `categories[]` with `path` (required), `title`, and nested `children[]`,
  seeded by the same code as the context scenario's `categories[]` below.
- `issues[]` (OJS only) with `volume`, `number`, `year` (all required) and
  `published`.
- `users[]` with roles and sub-editor assignments. Same shape as the context
  scenario's `users[]` below.

## `POST scenarios/context`

Creates a scratch journal, press or preprint server.

Keys:

- `tag` (required). At most 32 characters, a single alphanumeric token with
  no hyphens (see `patterns.md` for tag conventions). It becomes the context
  `path` unless you set one, and a second context with the same path fails
  with a 400.
- `context`: `path` (defaults to the tag), `name` (defaults to "Scratch
  context {tag}"), `acronym`, `description`, `primaryLocale`,
  `supportedLocales`, `supportedSubmissionLocales`, `supportedFormLocales`,
  `contactName`, `contactEmail`, `country`, `enabled`.
  `supportedSubmissionLocales`
  mirrors the Languages settings grid's submission toggles and keeps the
  metadata locales in step, exactly as the grid does. A scratch context
  needs `supportedLocales` to include a locale before that locale's URL
  segment (`/fr_CA/`) works there; the seeded journals already carry it as
  a UI language. `supportedFormLocales` mirrors the same grid's "Forms"
  column: a list of locale codes, each already in `supportedLocales`, the
  primary locale among them (the grid refuses to untick it; anything else
  is a 400). Each listed locale is ticked the way the grid ticks it (that
  locale's default settings texts restored, the reviewer recommendations'
  titles added in it on a journal or press, then the list saved through
  the context service), so every settings form and the Highlights panel
  carry one field set per listed locale: "Add Highlight" shows the
  "French" and "English" toggles and "Title in French" beside "Title". A
  context created without the key has the primary locale alone under
  "Forms", and its forms are single-language even with French under "UI".
  `context.country` is the "Country" list of Settings › Journal (Press,
  Server) › "Masthead" and of the Administration › Hosted Journals
  (Presses, Servers) "Edit" window: the option value, a two-letter code
  (`CA` for "Canada"), stored as the one `country` row either window's
  "Save" stores. A code the list lacks (`XX`, lower-case `ca`, the name
  "Canada") or a non-string is a 400 before the context exists; an empty
  string reads as absent. Without the key a scratch context has no
  country, and both windows refuse their first "Save" until one is
  picked; with it both open on the seeded country. The Masthead also
  requires "Journal initials" (`context.acronym`), which a scratch
  context has only when given (U19 harness, 2026-09-26, three apps).
- `sections[]` (OJS, OPS): same shape as in the bootstrap payload. The first
  entry renames the default section.
- `series[]` (OMP; OJS and OPS answer 400): each `{path, title?,
  description?}` is Settings › Press › "Series" › "Add Series" with
  "Title" and "Path" typed (and "Description" when given), "Save", run
  through the window's own form, so the rows are the screen's: the
  series row (order 0, not featured, not restricted, active, no image),
  a `title` row, an empty `prefix`, `subtitle`, `description`,
  `onlineIssn` and `printIssn` row, and the "Order of monographs" list
  as it arrives, `sortOption` "title-ASC" ("Title (A-Z)"); no category
  and no editor ticked. `title` is a string (the primary locale) or a
  locale map over the press's form languages, default the path;
  `description` the same, stored as the rich-text box stores typed text
  (`<p>…</p>`). Refusals (400, before the press exists): a missing
  path, a path with anything but letters, digits, `/`, `.`, `_` and `-`
  ("The series path must consist of only letters and numbers."), longer
  than the box's 32 characters, or named twice ("The series path
  already exists. Please enter a unique path."), a title or
  description locale the press's forms lack. Series are added in list
  order before `categories[]` and `users[]`, whose `series` sub-editor
  assignments name them by path, and the submission scenario's `series`
  key places a book in one. Every seeded series is stored at order 0,
  as one added through "Add Series" is, so until the Series tab's "Order"
  is used the tab and the Catalog Entry "Series" list come in database
  order (on Postgres an edited row, such as one made inactive, moves
  last; U70 claim check K5, 2026-09-27); the Catalog page's "Filters" offers a "Series" group once one
  exists; a series' public page is `catalog/series/{path}`. Without the
  key a scratch press has no series (U70 harness, 2026-09-27, parity
  ledger).
  An OJS entry's `hideTitle` (boolean) is the section form's "Omit the
  title of this section from issues' table of contents." ticked (`true`)
  or unticked, as its "Save" stores it (`hide_title` 1 / 0); without the
  key the box is unticked. On the renamed default section it is saved
  with the rename; the form's "Save" also re-saves the window's other
  fields (the policy wrapped in `<p>`, the word count as 0), which the
  key does not, and nothing on screen differs. With it on, an issue's
  page lists the section's articles with no section heading. A
  non-boolean is a 400; OPS answers 400 on the key, its section form has
  no such box (U50 harness, 2026-09-25).
- `categories[]` (the three apps): the bootstrap payload's shape and
  seeding code, each `{path, title?, children[]?}`, `children` a nested
  list of the same shape (subcategories, to any depth). Each category is
  created the way Settings › Journal (Press, Server) › "Categories" ›
  "Add Category" › "Save" creates it with "Name" and "Path" filled and
  the rest of the window left as it opens (no description, no cover
  image, no "Editorial Assignments", the "Order of …" list on
  "Publication date (newest first)"); a child the way the parent row's
  "More Actions" › "Add" does. `title` is a string (under the primary
  locale) or a locale map, default the path; an empty string reads as
  absent. Refusals (400, before the context exists): a path with
  anything but letters, digits, `/`, `.`, `_` and `-`, a path used twice
  anywhere in the list, a title locale the context's forms lack (add it
  to `context.supportedFormLocales` first), a missing path. Seeded after
  the sections, before `users[]`. The response lists every category as
  `categories` (`id`, `path`, `parentId`), depth first. The visitor's
  page of one is `catalog/category/{path}` (OPS
  `preprints/category/{path}`), and the Categories tab lists only the
  top-level ones until a row's "Expand sub-categories" is pressed (U10
  harness, 2026-09-24, three apps driven). A scratch context created
  without the key has no category: the submission lists' "Filters"
  window then offers no "Categories" (the U22, U23 and U28 suites rely on
  it on a scratch context), and on a journal the home page's "Include a
  listing of categories" row has nothing to list.
- `issues[]` (OJS only; OMP and OPS answer 400 on the key): the bootstrap
  payload's shape, each `{volume, number, year, published?}` (`volume`
  and `year` whole numbers, `number` a string or a whole number, all three
  required; `published` a boolean, default false). Each issue is created
  the way Issues › Future Issues › "Create Issue" › "Save" creates it with
  those three boxes filled and the form's "Title" box unticked (the form
  arrives with it ticked and then refuses an empty title): shown as "Vol.
  {volume} No. {number} ({year})", no title, its access status derived
  from the journal's publishing mode as the form derives it (open on a
  fresh journal), an empty title and description row in each form locale
  (the bootstrap's issues have neither row; nothing on screen differs). A `published` issue is then
  published the way the row's "Publish Issue" › "OK" publishes it with
  "Send an email about this to all registered users." unticked (the box
  arrives ticked; ticked, the screen also queues an email job per batch
  of the journal's users, which the seed does not): published today and
  made the journal's current issue, so with
  several the last published entry is "Current". Issues are created in
  list order after `users[]`. A published submission lands in one through
  the submission scenario's `issue` key below (U08 harness, 2026-09-24).
  The response lists the created `issues` (`id`, `volume`, `number`,
  `year`, `published`, and `galleys` (`id`, `label`, `locale`, `fileId`)
  when the entry seeds any); an issue's page is `issue/view/{id}`.
  An entry's `coverImage`, `{file, altText?}` (U13 harness, 2026-09-24),
  is the form's "Cover image": `file` an image fixture basename (as for
  the submission's `files[]`, e.g. `profile-image-400.png`; anything but
  an image is a 400, as the form refuses it), uploaded before "Save" and
  stored as the form stores it, `cover_issue_{id}_{locale}.png` under the
  journal's public files, set for the primary locale (the manager's
  interface language). The create form has no alt-text box: `altText` is
  the box the issue's "Edit" › "Issue Data" tab shows beside the stored
  cover, saved there. The key is the context scenario's alone (the
  bootstrap payload answers 400 on it). A published article with no cover
  of its own shows its issue's cover on its page.
  An entry's `datePublished` (`YYYY-MM-DD`, U50) is the form's "Date
  Published" box, typed before "Save" (stored as that day at midnight);
  "Publish Issue" keeps it and stamps today only when the box is empty,
  so issues seeded `published` carry the dates given (the last published
  entry is still the current issue, whatever its date). An unpublished
  entry may carry one too, as the box allows. Any other shape is a 400.
  An entry's `galleys[]` (U50), each `{label, file, locale?}`, is the
  issue's "Issue Management" › "Issue Galleys" › "Create Issue Galley" ›
  "Save", run through the grid's own form as `admin`, after the issue is
  created and before it is published: `file` a fixture basename as for
  the submission's `galleys[]` (`article.pdf`), stored as the window's
  upload stores it (the issue file `{issueId}-{fileId}-PB.pdf`, public);
  `label` the required "Galley Label"; `locale` the "Language", default
  the journal's primary language (what the list arrives on), and one of
  its form languages (the window refuses any other). The "URL Path" box
  is saved empty (''), as a window saved with it empty stores it; the key
  has no `urlPath`. Galleys join the tab's list in the order given. A
  missing label or file, another locale, a missing fixture and an
  unknown entry key are 400s. The issue page's "Full Issue" link opens
  `issue/view/{issueId}/{galleyId}`, the PDF reader for a PDF; on a
  journal that requires subscriptions the link reads "Requires
  Subscription PDF" (U50 harness, 2026-09-25). Like `coverImage`, both
  keys are the context scenario's alone (the bootstrap answers 400).
  An entry's `accessStatus` (`open` "Open access" or `subscription`
  "Subscription") and `openAccessDate` (`YYYY-MM-DD`, a past date
  allowed, as the box allows it) are the issue's "Issue Management" ›
  "Access" tab › "Save" (U51), run through the grid's own form after the
  issue is created and published. The tab arrives with the issue's
  stored status and date, and what the entry does not name is saved as
  the tab shows it: `accessStatus: 'open'` on an issue published under
  "Delayed Open Access" keeps its open access date, as on screen. Saved
  after "Publish Issue", so the entry wins over "Delayed Open Access".
  The tab exists only on a journal that requires subscriptions, so
  either key without `publishingMode: subscription` in the same request
  is a 400, and so is another word or date shape. With
  `delayedOpenAccessDuration` set (below), a `published` entry is
  published as "Publish Issue" publishes it: "Subscription" with the
  open access date that many months from today (U51 harness,
  2026-09-25).
  An entry's `usage[]` (U64, the context scenario alone) is readers'
  visits of past days to the issue, for the "Issues" Statistics page and
  its files: each entry `{daysAgo | date, views?, galleyDownloads?}`,
  `views` the issue's table of contents and `galleyDownloads` a list
  with one count per entry of the issue's `galleys[]`, in order, each a
  download of that galley's file. The issue must be `published` (the
  listener records visits to a published issue only). Built and refused
  as the submission scenario's `usage[]` below, without the place keys.
- `usage[]` (U64, the three apps): readers' visits of past days to the
  context's home page, the "Journal" ("Press", "Server") Statistics
  page's one row: each entry `{daysAgo | date, views}`. Built with the
  OJS issues' visits, after everything but `bulkEmails`, and refused as
  the submission scenario's `usage[]` below, without the place keys.
- `users[]`: throwaway accounts. Each entry takes `username` and `roles`
  (both required; roles empty only beside `pastRoles`, below), `givenName`, `familyName`, `email`
  (default `<username>@mail.test`), `password` (default: the username
  twice), `sections` or `series` (sub-editor assignments, by section abbrev
  or series path), and `orcid` plus `orcidIsVerified` for a pre-set ORCID
  iD, stored the way the submission key `author` below stores it
  (`orcidIsVerified: true` carries the sign-in completion's live
  permission, `false` the iD alone). Role keys are the app's default
  user-group keys, plus the `key` of each `customRoles[]` entry of the
  same request (below). An unknown key in `roles` or `pastRoles` fails
  with a 400 that lists the app's whole set, before the context is
  created. An entry naming an account
  that already exists (`admin`, a roster user) adds the roles to that
  account instead of creating one: the one way to give the site
  administrator a non-manager role in a scratch context, after which
  their manager role can be ended on their own edit page (U14 claim
  check K1, 2026-09-16); the screens never end a site administrator's
  last role in a context ("Remove User" fails on their row, and the
  "Edit" page keeps a last role), so a site administrator with no role
  there is unreachable (U42 claim check, 2026-09-24). See `users.md` for the keys and
  their traps. A scratch context's reviewer is created here too: the seeded
  reviewers are not enrolled on a scratch context, so they are absent from
  its Add Reviewer search and refused the wizard.
  Three more per-entry keys feed the About pages (U07 harness, 2026-09-23,
  three apps):
  - `affiliation` (a string, or a locale map; a bare string lands under
    the context's primary locale): the Profile › Contact "Affiliation",
    the line "Editorial Masthead" and "Editorial History" print under the
    name. The Contact tab cannot save it without "Country*", so a by-hand
    affiliation always comes with a country; the seeded account has none
    (nothing on the About pages reads it).
  - `masthead`: a map from a role key of the entry (`roles` or
    `pastRoles`) to `true`, "Appear on the masthead" (every role's
    default), or `false`, "Does not appear on the masthead": the per-role
    choice of the invitation and of the users list's "Edit" page (its
    roles table's "Journal Masthead" select). A member seeded `false` is
    left off "Editorial Masthead" (and "Editorial History") for that
    role; the choice is per role. `false` on a reviewer role is a
    400: the table prints "Appear on the masthead" there and offers no
    choice. The screen's change sends the member an email the seed does
    not, and on OMP and OPS answers 500 after saving the choice (U06's
    register: the `USER_ROLE_MASTHEAD_UPDATE` template is missing there);
    the seeded row equals the saved one.
  - `pastRoles[]`, each `{role, dateStart?, dateEnd?}` (`YYYY-MM-DD`,
    start ≤ end ≤ today; both default to today): a role period that has
    ended, given and then ended the way the "Edit" page's "Remove Role"
    ends it (`endAssignments`: the end stamped now, the masthead and
    history lists refreshed). "Editorial History" lists the member under
    the role with "<start year> – <end year>" ("2026 – 2026" with the
    defaults, all a screen can make), and "Editorial Masthead" no longer
    does. An earlier start or end is a state no screen makes (the
    invitation moves a past start to today, and "Remove Role" ends now):
    the builder passes the start through the role service and writes the
    end onto the ended row (D9). The screen's "Remove Role" emails the
    member; the seed does not.
    `roles: []` beside a non-empty `pastRoles` is the state the Users
    list's "Remove User" › "OK" leaves: every role in the context ended
    today, the account still listed with nothing under "Roles" and
    "Start Date" and still counted in "Current Users (n)", its "Edit"
    page listing each role with today as start and end and "User
    Removed From Role", its menu without "Remove User", "Editorial
    History" listing a masthead role "<year> – <year>" and "Editorial
    Masthead" not (U53 harness, 2026-09-25, three apps). An account
    ended here and holding a role in another context is the "outside
    the manager's reach" user of U53 scenario 4: create this context
    first, then name the account again with `roles` in the second (the
    roles are added to the existing account). "Remove User" sends no
    email (U53 A8) and the seed none either. `roles: []` without `pastRoles`
    is a 400, and so are `sections`/`series` with it (no role to carry
    the assignment).
  `affiliation` and `pastRoles` are 400s on an account that already
  exists (the roster, `admin`): only a new account takes them, so
  `roles: []` does too.
  `disabled: true` disables the new account the way Settings › Users &
  Roles does (the row menu's "Disable User", the reason box left empty,
  "OK": `disabled` 1 and an empty reason, as on screen; U37 harness,
  2026-09-23, three apps). It is refused on an account that already
  exists, since a roster account is shared by every worker. The account
  is disabled when the context is created, before any submission seed,
  so a disabled participant seeded into `participants[]` or `tasks[]`
  gets none of the "Discussion added." rows or emails a seeded item
  sends: that is the state after an item saved while they were
  disabled, and it differs from "disabled after the item" only in the
  first message's row and email they would have had.
  `notifications` (U65) is the account's own Profile › "Notifications"
  tab in this context, saved by the account: a map from a row's setting
  name (the tab's field name: `notificationEditorialReport` is
  "Statistics report summary.", `notificationEditorialReminder` "Weekly
  email of outstanding tasks", `notificationNewQuery` "Discussion
  added.", and so on; a 400 lists the app's names) to `{enabled?,
  email?}`. `enabled: false` is "Enable these types of notifications."
  unticked (a `blocked_notification` row); `email: false` is "Do not
  send me an email for these types of notifications." ticked (a
  `blocked_emailed_notification` row). A new account's tab has every
  "Enable" ticked and every "Do not send…" unticked, and an absent half
  keeps that. `{enabled: false, email: false}` is a 400: unticking
  "Enable" disables the email box, which then posts nothing, so the tab
  cannot save that pair. The save is the tab's own
  (NotificationSettingsForm as the account in the context): it posts
  every row the tab shows, so the rows equal a by-hand save. The tab
  shows every setting but "Statistics report summary." on a context
  with `editorialStatsEmail: false`, and there the save (the key's and
  the tab's alike) stores that setting blocked for the account, since
  nothing posts its box. The tab's "Saved" toast is not made. Seeded after the roles and before
  `disabled`. With `notificationEditorialReport` `{enabled: false}` the
  account gets neither the monthly email nor its Tasks entry; with
  `{email: false}` it gets the Tasks entry alone (U65 harness,
  2026-09-28, three apps).
  For a Users XML import test {OJS OMP}: the file's `<user>` needs
  `<user_groups>`, `<masthead>` and `<date_registered>`, or the import
  fails with a server error; the registration email goes out only for a
  password the site must replace (`encryption` set, a cost-10 bcrypt or
  an md5 hash). A `users[]` account keeps its cost-4 seed hash until it
  first signs in on screen (seed-facts.md), so moving it to another context (U63 Rule 28) adds
  the "new password" line and a move after one sign-in does not: seed
  the state the case names (U63 claim check, 2026-09-27).
- `orcid`: the state of the ORCID settings tab, saved through the same
  service the tab's form uses. The defaults below apply only when the
  `orcid` key is given at all; a context created without it arrives with
  ORCID off (seed-facts.md "Install defaults", 2026-09-04). Keys `enabled`
  (default true), `apiType`
  (default Public Sandbox), `clientId` and `clientSecret` (dummy defaults),
  `city`, `sendMailToAuthorsOnPublication`. The OAuth exchange can never
  complete on a test install, because outbound HTTP fails fast at the
  dead-port proxy in `config.test.inc.php`, so dummy credentials are as good
  as real ones for every screen this state gates.
- `review` (OJS, OMP): the fields of Settings › Workflow › Review › "Setup"
  and "Reviewer Guidance", validated and saved the way those forms' save
  is. Keys, named as the forms name them: `defaultReviewMode`
  (`anonymous`, `doubleAnonymous`, `open`, or the form's 1/2/3),
  `defaultReviewPublicVisibility`, `restrictReviewerFileAccess`,
  `reviewerAccessKeysEnabled`, `reviewerSuggestionEnabled`,
  `numWeeksPerResponse`, `numWeeksPerReview`, `numReviewsPerSubmission`, the
  four reminder thresholds (`numDaysBeforeReviewResponseReminderDue`,
  `numDaysAfterReviewResponseReminderDue`,
  `numDaysBeforeReviewSubmitReminderDue`,
  `numDaysAfterReviewSubmitReminderDue`, whole days 0–14), `showEnsuringLink`,
  and the localized `reviewGuidelines`, `competingInterests` and, on OMP
  only, `internalReviewGuidelines`. A key the app's forms lack is a 400.
  OPS has no Review tab and answers 400 on the whole key, like
  `reviewRounds[]`.
- `reviewForms[]` (OJS, OMP): review forms created and activated the way
  the "Review Forms" grid does. Each entry: `title` (required, localized),
  `description` (localized), `active` (default true), and `elements[]` of
  `question` (required, localized), `description`, `type`, `required`
  (default false), `included` (the item's "Included in message to author"
  box, default true) and `options`. `type` is one of the grid's item types,
  `smalltextfield`, `textfield`, `textarea`, `checkboxes`, `radiobuttons`,
  `dropdownbox` (or its number 1–6); the last three need `options`, a list
  of response labels (or a locale map of lists). OPS answers 400.
- `copyrightNotice` (localized): the Copyright Notice of Settings ›
  Workflow › Submission › "Author Guidance", saved the way that form's
  save is. A scratch context has none until it is set. With one set, the
  wizard's "Review" step ends in a "Confirmation" section whose "Yes, I
  agree to the copyright statement." box must be ticked before "Submit"
  enables.
- `metadata`: the items of Settings › Workflow › Submission › "Metadata",
  each set to one of the words `off` (the item's box unticked), `enable`
  ("Do not request … during submission"), `request` ("Ask the author …")
  or `require`, exactly as that screen saves them. Items: `keywords`,
  `subjects`, `disciplines`, `agencies`, `coverage`, `rights`, `source`,
  `type`, `citations`, `fundingStatement`, `funders`, `dataAvailability`,
  `dataCitations`, `plainLanguageSummary`; an item the app's context
  schema lacks is a 400, and so is any other word. A fresh context has
  `keywords`, `citations` and `funders` at `request` and the rest off. An item at
  `require` is a submit blocker: the wizard's "Details" step shows its
  field and "Review" reports it until it is filled.
- `citationsMetadataLookup` (boolean): the same screen's "References
  Metadata Lookup" box, "Enable references structuring and metadata
  lookup", saved as that form saves (the screen posts the whole form,
  `citationsMetadataLookup=true` among it; stored as `1` / `0`). A fresh
  context has no row, which reads as off, so `publicknowledge` has lookup
  off. The form posts the box whether or not "Enable references metadata"
  is ticked, so the key does not read `metadata.citations` either. With
  it on, every reference added afterwards, typed or seeded, queues the
  lookup's job chain (one row in the `jobs` table per reference, first
  job `ExtractPidsJob`); the test install runs no job runner, so the
  chain never runs and the reference stays at processing status 0, not
  processed. Applies to the three apps alike; a non-boolean is a 400 (U42
  harness, 2026-09-24).
- `enablePublisherId`: the same screen's "Publisher ID" boxes, a list of
  the values of the boxes to tick, saved as that form saves (the screen
  posts `enablePublisherId[]=…` per ticked box, `enablePublisherId=` with
  none; stored as a JSON list, `[]` for none). The values are the app's
  own boxes, read from its form: a journal `publication` ("Enable for
  Publications"), `galley` ("Enable for Galleys"), `issue` ("Enable for
  Issues"), `issueGalley` ("Enable for Issue Galleys"); a press
  `publication` ("Enable for Monographs"), `chapter` ("Enable for
  Chapters"), `representation` ("Enable for Publication Formats"),
  `file` ("Enable for Files"); a preprint server `publication` ("Enable
  for Preprints") and `galley` ("Enable for Galleys"). Another app's
  value (OPS `issue`, which the preprint server's context schema allows
  but its screen does not offer), an unknown one, a value named twice
  and anything but a list of strings are 400s. A fresh context has no
  row, which reads as every box unticked, so `publicknowledge` has
  publisher IDs off; `[]` is the state after a manager unticks every box
  and saves. The list is stored in the order given (the screen stores
  the order the boxes were ticked; nothing reads the order). The screen's
  "Save" also writes every other item of the form; the key writes this
  row alone (U44 harness, 2026-09-24, three apps).
- `submissionAcknowledgement`: who gets the "Submission Confirmation"
  email of Settings › Workflow › Emails, `allAuthors` (the default),
  `submittingAuthor` or `off`; with it `copySubmissionAckPrimaryContact`
  (boolean, "Notify Primary Contact") and `copySubmissionAckAddress` (a
  string, "Notify Anyone", comma-separated as the box is typed; on OMP
  the press schema allows a single address, so a list is a 400 there as
  on the screen). Saved as that form saves: `off` and an empty address
  store no row, and a context saved at `off` reopens the Emails screen
  with no "Submission Confirmation" option selected, as it does after a
  by-hand save (U21's register).
- `postedAcknowledgement` (OPS only, boolean): the "Preprint Posted"
  option of Settings › Workflow › Emails, `true` "Send an email to all
  authors." (the install default) or `false` "Do not send an email.",
  saved as that form saves (the OPS `EmailSetupForm`'s own field, stored
  as `1` / `0`). It is what `SendPostedAcknowledgement` reads when a
  preprint is posted, so at `false` the "Preprint Posted Acknowledgement"
  is not sent while the version notice still is (U49 scenario 15). A
  non-boolean is a 400; OJS and OMP answer 400 on the key, as on any key
  their context schema lacks.
- `editorialStatsEmail` (boolean, three apps): the "Editorial statistics"
  radio of Settings › Workflow › Emails, group "For Editors", `true`
  "Send a monthly email to editors." (every new context stores `1`) or
  `false` "Do not send the email to editors.", stored `1` / `0` as the
  tab's "Save" stores it (a form-encoded PUT of the whole tab,
  `…&editorialStatsEmail=false`; the key writes this row alone). At
  `false` the radio reopens on "Do not send the email to editors.",
  Profile › Notifications drops its "Statistics report summary." row
  for every account of the context, and `scenarios/task`
  `statisticsReport` (below) queues nothing for the context (`notified`
  and `mailed` empty). A non-boolean is a 400. Naming
  `users[].notifications.notificationEditorialReport` beside `false` is
  a 400 before the context exists (the tab has no such row; U65
  harness, 2026-09-28, three apps).
- `enablePublicComments` (boolean): the "Enable Public Comments" box of
  Settings › Website › the "Content" tab › the "Comments" side tab, saved
  as that form saves (its whole request is `enablePublicComments=true`, a
  form-encoded POST to `contexts/{id}`; stored as `1` / `0`). The tab is
  lib/pkp's, so the key applies to the three apps alike. Every fresh
  context carries the row at `0`, so `publicknowledge` and a scratch
  context without the key have comments off, and every comments scenario
  runs on a scratch context seeded `true`. With it on, a published
  article's landing page carries the two comments blocks (OJS only; a
  press's or preprint server's landing page has none) and every
  moderator's side menu the Content › Comments entry. A non-boolean is a
  400 (U14 harness, 2026-09-16).
- `restrictSiteAccess` (boolean): the first box of Settings › Users &
  Roles › the "Site Access Options" tab, "Users must be registered and
  log in to view the journal site." ("…press site." on OMP, "…server
  site." on OPS), saved as that form saves (one form-encoded POST to
  `contexts/{id}` with `X-Http-Method-Override: PUT`, carrying every box
  of the tab; stored as `1` / `0`). The form is lib/pkp's, so the key
  applies to the three apps alike. A fresh context has no row, which reads
  as unticked (seed-facts). The key writes the `restrictSiteAccess` row
  alone and leaves the tab's other boxes as the context has them.
  With it on, a signed-out visitor who opens the context's home page, a
  published article's (preprint's) page or its galley's address
  (`…/view/{id}/pdf`) lands on `{context}/login?source=…`; the context's
  own Login page stays open, and a Reader who signs in there reads the
  page and opens the galley. Seeding into such a context is unaffected
  (the scenario endpoint is site-wide), so a `published` submission is
  seeded after the key as on any context. A non-boolean is a 400 (U13
  harness, 2026-09-25).
- `restrictArticleAccess` (OJS only, boolean): the "View Article
  Content" box of Settings › Users & Roles › the "Site Access Options"
  tab, "Users must be registered and log in to view open access
  content.", saved as that form saves (stored as `1` / `0`). The form's
  "Save" posts all three of its fields
  (`restrictSiteAccess=…&restrictArticleAccess=…&disableUserReg=…`, a
  form-encoded POST to `contexts/{id}` with the PUT override) and so also
  writes the other two rows at their shown values; the key writes this
  row alone, and nothing reads an absent row differently from `0`. A
  fresh journal has none of the three rows, so `publicknowledge` and a
  scratch journal without the key have the box unticked. A non-boolean
  is a 400; OMP and OPS answer 400 on the key, as on any key their
  context schema lacks (U48 harness, 2026-09-25), although their "Site
  Access Options" tab carries the same box under "View Monograph
  Content" and "View Preprint Content" (U48 claim check K2, 2026-09-25).
- `restrictMonographAccess` (OMP only, boolean): the press's same box,
  "View Monograph Content", "Users must be registered and log in to view
  open access content.", saved as that form saves (stored as `1` /
  `0`). As on a journal, the tab's "Save" posts all three boxes
  (`restrictSiteAccess=false&restrictMonographAccess=true&disableUserReg=false`)
  and so also writes the other two rows at their shown values; the key
  writes this row alone. With it on, a signed-out visitor who presses a
  free file's link on a published book lands on
  `{press}/login?source=…catalog/view/…`, by screen and by seed alike;
  the book's page itself stays open. A non-boolean is a 400; OJS and OPS
  answer 400 (U69 harness, 2026-09-28). The preprint server's box ("View
  Preprint Content") has no key.
- `publishingMode` (OJS only): the "Publishing Mode" radio of Settings ›
  Distribution › "Access", one of `open` ("The journal will provide open
  access to its contents."), `subscription` ("The journal will require
  subscriptions to access some or all of its contents.") or `none` ("OJS
  will not be used to publish the journal's contents online."), saved as
  that form saves (stored as `0`, `1`, `2`). The tab's "Save" posts
  `publishingMode=…&delayedOpenAccessDuration=&enableOai=true`; the
  empty "Delayed Open Access" stores no row, and the key writes the mode
  alone. A fresh journal has no row, which the app reads as open access,
  and its tab opens with no radio selected. The mode is saved before
  `issues[]`, so a seeded issue is born with the access status the
  "Create Issue" form gives it under the mode: "Subscription" under
  `subscription` and `none`, "Open access" under `open`. Any other value
  (an integer included) is a 400; OMP and OPS answer 400 on the key
  (U50 harness, 2026-09-25).
- `delayedOpenAccessDuration` (OJS only, a whole number 0–60): the same
  tab's "Delayed Open Access" list, `0` "Disabled", `6` "6 Months", saved
  as that form saves (the tab posts
  `publishingMode=1&delayedOpenAccessDuration=6&enableOai=true`; the key
  writes this row alone). The list shows only while the subscription
  radio is selected, so the key needs `publishingMode: subscription` in
  the same request (400 otherwise). It is saved before `issues[]`, and
  every issue seeded `published` is then published the way "Publish
  Issue" publishes it: "Subscription" with the open access date that
  many months from today at midnight (`issues[]` above). A fresh journal
  has no row, which reads as "Disabled". Out of range or not a whole
  number: 400. OMP and OPS answer 400 (U51 harness, 2026-09-25).
- `enableOai` (OJS, OPS; boolean): the "Enable OAI" radio of Settings ›
  Distribution › "Access", `true` "Enable", `false` "Disable" (stored as
  `1` / `0`). Every new journal and preprint server stores `1`
  (`publicknowledge` included), so the key matters at `false`: the
  repository then lists none of the context's records, while the tab
  opens with "Disable" selected. The tab's "Save" posts
  `publishingMode=&delayedOpenAccessDuration=&enableOai=false` (OPS
  without the list); the empty fields store no row, so the screen and
  the key both write this row alone. A non-boolean is a 400; OMP answers
  400, a press has no such radio (U19 harness, 2026-09-26).
- `enableDois`, `doiPrefix`, `doiVersioning`, `enabledDoiTypes`,
  `doiCreationTime`, `doiSuffixType` and the pattern keys (U19 on the
  journal, U45 on the press and the preprint server, the format and
  patterns U45 on all three): Settings › Distribution › "DOIs" ›
  "Setup". `enableDois` (boolean) is the "DOIs" box "Allow Digital
  Object Identifiers (DOIs) to be assigned to work published in this
  journal." ("…published by this press.", "…to assigned to works
  published on this server."); `doiPrefix` the "DOI Prefix" box (`10.`
  then four to seven digits; `null` is the emptied box);
  `enabledDoiTypes` the "Items with DOIs" boxes, each app's own: a
  journal `publication` ("Articles"), `issue` ("Issues"),
  `representation` ("Article galleys, such as a published PDF") and
  `peerReview` ("Peer Review"); a press `publication` ("Monographs"),
  `chapter` ("Chapters"), `representation` ("Publication Formats") and
  `file` ("Files"); a preprint server `publication` ("Preprints") and
  `representation` ("Preprint galleys, such as a published PDF"); another
  app's value is a 400. `doiCreationTime` is the "Automatic DOI
  Assignment" list: `copyediting` ("Upon reaching the copyediting
  stage"; on a preprint server the word is `production`, "Upon reaching
  the production stage", and `copyediting` is a 400 there),
  `publication` ("Upon publication") or `never`. `doiVersioning`
  (boolean) is the "DOI Versioning" radios, `true` "Yes, assign a unique
  DOI to every version of an article." ("…of a monograph/chapter.",
  "…of a preprint."), `false` "No, all versions of … should have the
  same DOI.". `doiSuffixType` is the "DOI Format" radios: `default`
  ("Default - Automatically generates a unique eight-character
  suffix"), `none` ("None - Suffixes must be entered manually on the DOI
  management page…", stored as `customId`) or `customPattern` ("Custom
  pattern - (not recommended)"). The pattern keys are the boxes of the
  "Custom DOI Suffix Pattern" group, each app's own, a non-empty string
  as typed: `doiPublicationSuffixPattern` ("Submissions", every app),
  `doiRepresentationSuffixPattern` ("Article Galleys", "Publication
  Formats", "Preprint Galleys"), a journal's `doiIssueSuffixPattern`
  ("Issues"), a press's `doiChapterSuffixPattern` ("Chapters") and
  `doiSubmissionFileSuffixPattern` ("Files"); another app's box is a 400
  naming this app's. The group shows only under "Custom pattern", so a
  pattern needs `doiSuffixType: 'customPattern'` in the same request, and
  with it every ticked kind that has a box needs its pattern (the save
  refuses it empty with "A DOI suffix pattern is required."; a new
  context ticks `publication` alone); the journal's "Peer Review" has no
  box. A new context stores DOIs on, the first kind ticked, the first
  "Automatic DOI Assignment" option, "Default", versioning "No" ("Yes"
  on a preprint server) and no prefix, and the form refuses a save with
  DOIs on and no prefix: so any of these keys with DOIs on needs
  `doiPrefix` (400 otherwise), and with `enableDois: false` the others
  are 400s (the form hides them). The tab's "Save" posts every field,
  the pattern boxes empty unless typed
  (`enableDois=true&enabledDoiTypes[]=publication&doiPrefix=10.1234&doiCreationTime=copyEditCreationTime&doiSuffixType=default&doiPublicationSuffixPattern=&…&doiVersioning=true`),
  which on a new context writes exactly the rows the keys write (an
  empty box stores no row). The settings are saved before `issues[]` and
  before any submission, so an item seeded `published` into such a
  context carries the DOI the settings make: under "Default" `10.1234/`
  and an eight-character suffix, "Unregistered"; under "None" the bare
  `10.1234/` (the made DOI the spec's A2 describes); under "Custom
  pattern" the pattern's value (`%j.%a` gives `pk.{id}` on a context
  seeded `context.acronym: 'PK'`, `%p.%m` on a press the same); under
  "Never" none. A journal article whose pattern uses the issue's
  symbols (`%j.v%vi%i.%a`) and is seeded `published` without an issue
  carries no DOI, as by hand. The row "Per-version records" seeds
  `{doiPrefix: '10.1234', doiVersioning: true}`; a later version then
  gets a DOI of its own when it is published on screen. A journal left
  with DOIs on and `doiVersioning: true` makes every OJS OAI list request
  of the install answer 500 (U19's A22), which reds the OJS U19 suite on
  that fleet: a probe or test that seeds it on a journal sets "DOI
  Versioning" back to "No" on screen before it ends (U19 harness,
  2026-09-26, journal; U45 harness, 2026-09-26, three apps).
- `registrationAgency`, `automaticDoiDeposit` (OJS, OPS; U45): Settings
  › Distribution › "DOIs" › "Registration". `registrationAgency` is the
  "Registration Agency" list's option value, the agency plugin's name:
  `crossrefplugin` ("Crossref", journal and preprint server) or
  `dataciteplugin` ("DataCite", journal); anything else, the label
  included, is a 400 naming this app's. The list offers an agency only
  while its plugin is enabled, and every agency plugin is off on a new
  journal and preprint server (the Plugins grid's "Crossref Manager
  Plugin" and "DataCite Manager Plugin" rows unticked, no row at all),
  so the key needs `plugins: {<agency>: {enabled: true}}` in the same
  request (400 otherwise). `automaticDoiDeposit` (boolean, "Enable
  automatic depositing") shows only once an agency is chosen, so it
  needs `registrationAgency` (400 otherwise); without it the box is
  unticked. The agency block's fields are the plugin's settings and ride
  in `plugins.<agency>.settings`, each as the block shows it: Crossref
  `depositorName` ("Depositor name") and `depositorEmail` ("Depositor
  email"), both required by the tab's "Save" (a 400 without them, or
  with an address it refuses), a journal's `crossmark` (boolean, the
  "Crossmark" box) and `updatePolicyDoi` ("Update Policy DOI", shown
  while "Crossmark" is ticked or "DOI Versioning" is "Yes"), `username`,
  `password`, `testMode` (boolean, "Testing"); DataCite `username`
  ("Username (symbol)"), `password`, `testMode`, `testUsername`,
  `testPassword`, `testDOIPrefix`. A box is a string, a tick box a
  boolean; a field the block lacks is a 400, and so is an agency's
  `settings` without `registrationAgency` naming it (the plugin has no
  settings window of its own). Saved as the tab's "Save" saves (PUT
  `contexts/{id}/registrationAgency`, run through its controller): the
  body carries every field of the block, those not given as the block
  shows them (empty, unticked), so the context stores
  `registrationAgency`, `automaticDoiDeposit` and one plugin row per
  field (`password` `''`, `testMode` `0`, …), as by hand. A kind the
  agency does not accept (Crossref on a journal: `publication`,
  `issue`, `peerReview`; DataCite: `publication`, `issue`,
  `representation`; Crossref on a preprint server: `publication`) among
  `enabledDoiTypes`, or the new context's `publication` alone when the
  key is not given, is a 400: the tab's "Save" would untick it without a
  word, so that path is driven on screen. Saved after `plugins` and the
  "Setup" keys. Parity fact: with `doiPrefix`, Crossref's two depositor
  fields and, on a journal, `publisherInstitution` and an ISSN (below),
  Crossref counts as configured, so the DOIs page offers "Deposit All"
  and the block opens without "Plugin requirements not met"; without the
  journal's publisher and ISSN it opens with that notice and the DOIs
  page has no "Deposit All". The Registration tab's block and the kind
  narrowing are the tab's, so disabling the agency's plugin (which sets
  the agency back to "None") is driven on screen: `enabled: false` on
  the plugins key does not run the plugin's own disable. OMP ships no
  agency plugin: both keys are 400s there (its tab reads "No
  Registration Agency Enabled") (U45 harness, 2026-09-26).
- `publisherInstitution`, `onlineIssn`, `printIssn` (OJS only; U45):
  Settings › Journal › "Masthead", the "Publisher", "Online ISSN" and
  "Print ISSN" boxes, a non-empty string as typed (an empty box is the
  key left out; an ISSN the box refuses, "This is not a valid ISSN.",
  check digit included, is a 400). The Masthead's "Save" posts the whole
  form; each key writes its row alone. Crossref reads them (the
  requirements notice, "counts as configured", the publish warnings).
  OMP and OPS answer 400: a press's and a preprint server's Masthead
  have no such boxes (U45 harness, 2026-09-26).
- `publisher`, `location`, `codeType`, `codeValue` (OMP only; U74): the
  press's ONIX details, Settings › Press › "Masthead", group "Publisher
  Identity": "Press Publisher Name", "Geographical Location" and
  "Publisher Code" each a non-empty string as typed (an empty box is the
  key left out), "Publisher Code Type" by the label its list shows
  (`"Proprietary (01)"`, stored as `01`; a label the list lacks is a 400
  listing what it offers). Saved as the Masthead's "Save" saves them (the
  context's edit), after `users[]`; the Masthead posts its whole form, the
  keys write their own rows alone. A new press has none of the four; with
  all four the ONIX tool's page (Tools › "ONIX 3.0 Monograph Export
  Plugin") opens on its "Export" tab and its list, as after a by-hand
  save (U74 harness, 2026-09-28, driven equal). OJS and OPS answer 400.
  The Masthead cannot empty "Publisher Code Type" once saved (its list has
  no empty choice), so a press missing only the code type is a seed with
  the other three keys, never a by-hand state (U74 claim check K5, K5-5).
- `submitWithCategories` (boolean): the "Categories" radios of Settings ›
  Workflow › Submission › "Metadata", under "Should the submitting author
  be asked to select a category when they make a new submission?": `true`
  "Yes, add a categories field to the submission wizard.", `false` "No, do
  not show authors this field." (the schema default), saved as that form
  saves (stored as `1` / `0`). The screen's "Save" posts the whole
  Metadata form (one form-encoded POST to `contexts/{id}`, PUT override,
  `submitWithCategories=true` among every item), so it also stores a row
  for each item at its shown value (`subjects 0`, `enablePublisherId []`,
  …) where a fresh context has none; the key writes this row alone, and
  nothing reads an absent item differently from its shown value. Every
  fresh context carries the row at `0`, "No", so `publicknowledge` and a
  scratch context without the key offer authors no category field. With
  it on, the wizard's "For the Editors" step ("For Readers" on OPS)
  offers the "Categories" picker ("Select Categories") while the context
  has a category (seed `categories[]` in the same request), and its
  "Review" step lists "Categories"; without it the step shows neither
  (driven on seeded drafts, three apps). The key only sets the wizard's
  field; the submission scenario's `categories` is the editor's placement
  after the submit (below), so a submission that must arrive with a
  category is submitted through the wizard on screen with the category
  picked there. On a scratch context the category's "Editorial
  Assignments" assign nobody at that submit (the positional user-group
  fault, `app-changes.md` row 3; only `publicknowledge` gets automatic
  assignments, `seed-facts.md`), so such a submission arrives with the
  author alone. A non-boolean is a 400; the three apps alike (U16 harness,
  2026-09-25; the caveat U16 claim check K1-3, K3).
- `enableAnnouncements` (boolean), `announcementsIntroduction` (localized
  text) and `numAnnouncementsHomepage` (a whole number of zero or more, or
  null for the box emptied): the three fields of Settings › Website › Setup
  › the "Announcements" tab ("Enable announcements", "Introduction", called
  "Additional Information" on a press, and "Display on Homepage"), saved as
  that form saves (one form-encoded POST to `contexts/{id}`, the Vue form
  sending PUT as a POST with an `X-Http-Method-Override` header, so a
  `waitForResponse` on method PUT never matches; stored as `1` /
  `0`, the text per locale, the number as typed). The tab is lib/pkp's, so
  the keys apply to the three apps alike, and it shows the text and the
  number only while the box is ticked. A fresh context has no row for any
  of the three: announcements off, no introduction, no home page block.
  A non-boolean, a non-string text, a negative number or text in the
  number are 400s (U12 harness, 2026-09-17).
- `itemsPerPage` (a whole number of 1 or more): the "Items per page" box of
  Settings › Website › Setup › the "Lists" tab, saved as that form saves
  (one form-encoded POST to `contexts/{id}`, PUT override, carrying both
  boxes, `itemsPerPage=3&numPageLinks=10`; stored as the number). Every
  fresh context carries the rows at 25 and 10 ("Page links"), so the key
  changes the one row and leaves "Page links" as it is; `publicknowledge`
  keeps 25. The box is required on screen, so null, 0 and anything but a
  whole number are 400s. The OJS archive, the OMP catalog and the OPS
  preprint lists follow it at once (seed-facts); a category page's
  paging is the U16 spec's Rule 9. The seeded context's tab reads the
  number back ("Items per page" 3, "Page links" 10). The three apps alike
  (U16 harness, 2026-09-25).
- `catalogSortOption` (OMP only; OJS and OPS answer 400): the "Order of
  monographs" radios of Settings › Website › Appearance › "Setup", one
  of `title-ASC` "Title (A-Z)", `title-DESC` "Title (Z-A)",
  `datePublished-ASC` "Publication date (oldest first)",
  `datePublished-DESC` "Publication date (newest first)",
  `seriesPosition-ASC` "Series position (lowest first)",
  `seriesPosition-DESC` "Series position (highest first)", saved as
  that form saves (one form-encoded POST to `contexts/{id}`, PUT
  override, `…&displayFeaturedBooks=false&displayNewReleases=false&catalogSortOption=title-ASC`;
  stored as the word). The key writes this row alone. A new press has no
  row and no radio marked (it lists by publication date, newest first);
  the form offers no way back to none, so null and any other word are
  400s. The tab reopens with the seeded radio marked (U70 harness,
  2026-09-27).
- `displayFeaturedBooks`, `displayNewReleases` (OMP only; OJS and OPS
  answer 400): the "Featured Books" and "New Releases" boxes ("Display
  featured books on the home page", "Display new releases on the home
  page") of Settings › Website › Appearance › "Setup", each `true`
  (ticked) or `false`, saved as that form saves (the same PUT, the boxes
  posted as `displayFeaturedBooks=true&displayNewReleases=true`; stored
  as `1` / `0`). Each key writes its row alone. A new press has no row
  for either, both boxes unticked and no "Featured" or "New Releases"
  list on its home page; ticked, the home page shows the list's heading.
  The form has no way back to no row, so null and anything but a boolean
  are 400s. The tab reopens with the seeded boxes (U68 harness,
  2026-09-27).
- `sidebar`: the "Sidebar" list of Settings › Website › Appearance ›
  "Setup", a list of block plugin names in the order the sidebar shows
  them, saved as that form saves (the same PUT; stored as a JSON list). The
  names are what the form posts, the plugin's registry name: the
  lowercased class name for a stand-alone block (`informationblockplugin`,
  `languagetoggleblockplugin`, `browseblockplugin`, `subscriptionblockplugin`)
  and `AnnouncementFeedBlockPlugin` for the block the OJS Announcement Feed
  plugin provides. The form offers only the blocks of plugins enabled in
  the context, and the builder refuses the rest the way the save does
  (a 400 naming `sidebar` with the form's own message), so on OJS the feed
  block needs `plugins: {announcementfeedplugin: {enabled: true}}` in the
  same request. The Web Feed block (`WebFeedBlockPlugin`) likewise needs
  `plugins: {webfeedplugin: {enabled: true}}` alongside, although the
  plugin arrives enabled (U18 claim check K1, K3). Not every disabled
  block is refused: `makesubmissionblockplugin` is accepted with the plugin
  still off and then renders nothing, so seed it with
  `plugins: {makesubmissionblockplugin: {enabled: true}}` (U58 claim check
  K1, 2026-09-27). Applies to the three apps alike; a fresh context has no
  block placed. Not a list of strings: a 400.
- `roles`: a map from a role key (the keys of `users[].roles`, e.g.
  `sectionEditor`) to `{recommendOnly?, permitMetadataEdit?,
  permitSettings?, masthead?, stages?}` (at least one; the first four are
  booleans, `stages` a map, below):
  the "Role Options" boxes of Settings › Users & Roles › Roles, the role's
  "Settings" › "Edit" window ("This role is only allowed to recommend a
  review decision and will require an authorised editor to record a final
  decision.", "Permit submission metadata edit.", "Consider role in
  masthead list" and "Permit changes to Settings"). Saved
  by running that window's own form, so the save is the screen's: the
  role's flags, the audit-log line, and the role's stages saved again from
  the boxes the window shows. That last part is a parity fact: the window
  has a box for each workflow stage but none for the Done stage (6) the
  installer gives most roles, so a role saved through the key, as by the
  screen, loses its Done-stage row (OJS Section editor `1,3,4,5,6` becomes
  `1,3,4,5`, OPS Moderator `5,6` becomes `5`; U35 harness, 2026-09-22,
  three apps), and a manager-level role is saved with every workflow stage,
  as the form always saves it, so seed `roles.manager` only once a screen
  that saves the Journal Manager role has been driven. The roles the key
  names are saved before `components`, `taskTemplates[]` and `users[]`, so a
  context seeded with it has no assignment the metadata change could
  rewrite; the rewrite of existing assignments is a screen action. With
  `recommendOnly: true` the "Assign" window pre-ticks "Assignment
  privileges" for that role and `participants[]` defaults to it; with
  `permitMetadataEdit: false` it leaves "Permissions" unticked. Refusals
  follow the window: an unknown role key, `recommendOnly: true` on a role
  below sub-editor level (the window offers the box for the Journal
  Manager's and the Section Editor's levels only), `permitMetadataEdit:
  false` on a manager-level role (the form saves it on whatever is posted)
  and a non-boolean are 400s. The three apps alike.
  `masthead` (U07): `true` lists the role's members who chose to appear
  on "Editorial Masthead" under the role's name, `false` leaves the role
  off it and off "Editorial History"; any role takes it (on a reviewer
  role it changes nothing: reviewers are listed by their completed
  reviews). Install defaults: ticked on `editor`, `sectionEditor`,
  `externalReviewer` and `editorialBoardMember` (OPS: `sectionEditor`,
  "Moderator", and `editorialBoardMember`). A role ticked or unticked on
  screen after the masthead was last read shows so on the next load, three
  apps (driven 2026-09-23). `permitSettings` (U07): `false` on a
  manager-level role other than the Journal Manager (OJS and OMP `editor`
  and `productionEditor`) takes the Settings pages from its members: no
  "Settings" in the side menu, and a Settings address redirects to a page
  reading "The current role does not have access to this operation.".
  `true` below manager level is a 400 (the window disables the box there),
  and so is `false` on `manager`: its row has no "Settings" link, and the
  window disables the box on the acting user's only settings role, which
  `manager` is for the seeding admin. OPS has no manager-level role but
  `manager`, so the key cannot remove the Settings pages there.
  `stages` (U39): the same window's "Stage Assignment" boxes, a map from
  a stage word (those of `taskTemplates[].stage`: `submission`,
  `internalReview` on OMP only, `review`, `copyediting`, `production`,
  the only one on OPS) to `true` (ticked) or `false` (unticked); a box
  the map does not name keeps the state the installer gave it, so
  `roles: {copyeditor: {stages: {submission: true}}}` saves a
  journal's or a press's Copyeditor with Submission and Copyediting
  (`1,4`, the Done stage dropped as above), which the Roles list then
  shows ticked under both columns. Refusals follow the window: another
  app's stage word, a box the window disables for the role (a
  manager-level role shows no box, since its save always stores every
  stage; a reviewer role only its review boxes; a reader none), a
  non-boolean, an empty map, and a map that leaves no box ticked (the
  form's save then keeps the stored stages rather than clearing them)
  are 400s. Saved before `taskTemplates[]`, so a template's `roles`
  offers the role on the stage it gained. The three apps alike (U39
  harness, 2026-09-24: OJS and OMP Copyeditor with Submission, OPS
  Editorial Board Member with Production).
- `customRoles[]` (the three apps; U54): roles the context is not
  created with, each `{key, level, name, abbrev, stages?}`, made the way
  Settings › Users & Roles › "Roles" › "Create New Role" › "OK" makes
  one: the window's own form run on the POST it sends, as `admin`.
  `level` is the "Permission level": `manager` (Journal Manager, Press
  Manager, Manager), `subEditor` (Section Editor, Series Editor,
  Moderator), `assistant`, `author`, `reviewer`, `reader`, and on a
  journal `subscriptionManager`. `name` and `abbrev` are "Role Name" and
  "Abbreviation" (a string, under the primary language, or a locale
  map over the context's form languages). `stages` is a list of the
  "Stage Assignment" boxes ticked, by the stage words of `roles` above;
  without it no box is ticked, which the window allows. The "Role
  Options" boxes are left as the window leaves them once a level is
  chosen: "Permit submission metadata edit." ticked (a level change
  enables the box but does not untick it, so the window posts it on
  every level; greyed on `manager`, whose save forces it), every other
  box unticked (stored with the masthead and self-registration off).
  `key` is the name the same request's `users[].roles`,
  `pastRoles[].role` and `masthead` give the role; it is the request's
  own word, not stored anywhere. The role is listed on "Roles" with its
  name, level and ticked boxes, at no fixed place (the list has no fixed
  order and pages at 25, so on a press it can land on page 2; U54 ccK3),
  and "Invite to a role"
  lists it after the installed roles. A member named in `roles` holds
  it from today with "Appear on the masthead", as an accepted
  invitation leaves it; one named in `pastRoles` held it and has had it
  ended, as the "Edit" page's "Remove Role" leaves it. Either way the
  role's "Remove" › "OK" answers "Can't remove {name} role. Currently
  {n} user(s) is/are assigned to it." and the role stays; a custom role
  nobody was named in is removed ("{name} role removed.", its row gone
  from the database). U54 harness, 2026-09-26, three apps: an Assistant
  role with Copyediting (OPS Production), an Author role with none, an
  unheld Reviewer role. Refusals (400, before the
  context exists): a missing or empty `key`, `level`, `name` or
  `abbrev`, another level word, a `key` an installed role has or two
  entries share, a language the context's forms lack, `stages` on
  `manager` or `reader` (the window hides the boxes) or on `reviewer`
  on a preprint server, a box the level disables (a reviewer role's
  non-review stages), and any other entry key (the key sets no "Role
  Options" box). Created after `roles`, before `taskTemplates[]` and
  `users[]`; a template's `roles` cannot name a custom role, and neither
  can `participants[]` (400 "Unknown role key"; U54 ccK3). The
  response lists `customRoles` as `{key, id}`.
- `bulkEmails` (boolean; the three apps; U55): `true` is the new
  context's box ticked under Administration › Site Settings › "Site
  Setup" › "Bulk Emails" and "Save", as the Site Administrator does it
  (the site form's save, `PUT index/api/v1/site`, through the site
  service's own validate and edit). The list is site-wide: the key adds
  the new context's id and touches no other id, reading the list under
  a lock so seeds in parallel keep each other's ids (eight at once over
  two servers, U55 harness). `false` is a new context's own state and
  writes nothing. With it on, the context's Settings › Users & Roles has
  the "Notify" tab and its Settings Wizard's "Restrict Bulk Emails"
  holds "Disable Roles". Facts a suite meets: every context seeded with
  the key stays listed and ticked on the "Bulk Emails" tab until the
  fleet is reset (the list names each scratch context, "Scratch context
  {tag}"), and `publicknowledge` is never ticked. The screen's "Save"
  posts the whole list as its page loaded it, so a Bulk Emails save
  from a page opened before a parallel seed writes that seed's id out:
  a test that saves the form belongs in the serial project (A9).
- `disableBulkEmailRoles` (list of role keys; the three apps; U55): the
  Settings Wizard's "Journal Settings" › "Restrict Bulk Emails" ›
  "Disable Roles" boxes ticked and "Save" (`PUT contexts/{id}` with
  `disableBulkEmailUserGroups`, the ids, through the context service's
  validate, whose Site-Administrator-only check the seeding `admin`
  passes, and edit). Keys are those of `users[].roles`, `customRoles[]`
  keys included; stored ascending, as ticking the boxes top to bottom
  posts them. A ticked role is not offered on the "Notify" tab's
  "Roles" and stays offered everywhere else. Refusals (400, before the
  context exists): the key without `bulkEmails: true` (the side tab
  shows no boxes then), an empty list (omit the key: none ticked is a
  new context's state), an unknown key, a key named twice. Both keys
  are applied last in the build (U55 harness, 2026-09-26, three apps:
  "Author", "Reader" and a custom role).
- `plugins`: a map from a plugin's lowercased class name (the Plugins
  grid's `plugin` id, e.g. `announcementfeedplugin`) to `{enabled,
  settings?}`. `enabled` (boolean, required) is the grid's "Enabled" box
  for that context, written as the grid writes it (the plugin's `enabled`
  setting for the context and the audit-log line; the grid's toast is
  not mirrored); `settings` is a map of setting name to scalar value,
  each written as the plugin's own settings window writes it
  (`Plugin::updateSetting`; the Announcement Feed window's are
  `displayPage`, one of `all`, `homepage`, `announcement`, and
  `recentItems`, a whole number above zero). A name that matches no
  installed plugin, a plugin the grid cannot enable or disable, a site-wide
  plugin (its state is global) or a non-boolean `enabled` are 400s. The
  Announcement Feed plugin is OFF on every fresh journal, `publicknowledge`
  included: its `settings.xml` is never installed (the plugin does not
  declare it as a context settings file), so a fresh journal has no
  `enabled` row, the Plugins grid lists it unticked, the feeds answer 404
  and the Appearance "Sidebar" list lacks the block until a manager ticks
  the plugin. Every feed scenario therefore seeds the plugin on (U12
  harness, 2026-09-17). "Site-wide" is asked the way the context's grid
  asks it, inside the context: the Custom Block Manager counts as
  site-wide only on Administration › Site Settings, so
  `plugins: {customblockmanagerplugin: {enabled: true}}` enables it for
  the scratch context on the three apps (the grid's "Custom Block
  Manager" row ticked, its "Settings" link offering "Manage Custom
  Blocks", whose window opens on "No custom blocks have been created.").
  The Google Analytics window's number is
  `plugins: {googleanalyticsplugin: {enabled: true, settings:
  {googleAnalyticsSiteId: "…"}}}`, read back in the window and in the
  pages' script on all three apps (U20 claim check K4, 2026-09-26).
  The key seeds no block: `settings` on it is a 400, and blocks are added
  in that window. It is OFF on every fresh context, `publicknowledge`
  included (no `enabled` row). The Usage Event plugin stays refused as
  site-wide (U09 harness, 2026-09-24).
  The URN plugin (`urnpubidplugin`) is off on every
  fresh journal and press too, and its settings window always stores
  every one of its keys, so a seed gives every key the window writes,
  `urnCheckNo` at least: without it the article's "Identifiers" page
  renders empty (its form arrives with no fields), while `urnCheckNo:
  false` shows the URN box. On OPS `urnpubidplugin` is a 400, since a
  preprint server has no URN plugin (U44 claim check K1, K2, 2026-09-24).
  The "JATS Metadata Format" plugin (OJS, `oaimetadataformatplugin_jats`,
  listed under "OAI Metadata Format Plugins") is off on every fresh
  journal, `publicknowledge` included (no row at all, not even a site
  one). Its own enable writes the row of the journal the request is in,
  so the grid's tick and the key both write the scratch journal's
  `enabled` row (`1`, `bool`), and no site row. Its "Settings" window has
  one box, "Ignore uploaded JATS XML documents", which "OK" posts as
  `forceJatsTemplate=1` when ticked and stores as the string `'1'`: seed
  it as `settings: {forceJatsTemplate: '1'}`, the string, so the row
  matches the window's (a boolean would store the type `bool`). Unticked
  is the fresh state (no row). OMP and OPS answer 400 on the name (U19
  harness, 2026-09-26).
  The registration agency plugins (`crossrefplugin`, `dataciteplugin`)
  are off on every fresh journal and preprint server; their `settings`
  are the DOIs "Registration" tab's agency block and go with
  `registrationAgency` (above), never alone (U45 harness, 2026-09-26).
  The OMP "Browse Block" (`browseblockplugin`, enabled on every fresh
  press) has a "Settings" window, group "Browse Possibilities", with
  three boxes: "New releases" `browseNewReleases`, "Categories"
  `browseCategories`, "Series" `browseSeries`. A fresh press carries all
  three rows as `1` (type `bool`), all ticked. The window's "Save" posts
  only the ticked boxes (`browseCategories=1`) and writes all three rows,
  an unticked one as `0` (`bool`); seed them as booleans,
  `settings: {browseNewReleases: false, browseSeries: false}`, which
  writes the same `0` / `bool` rows (a string would store type
  `string`), and the rows a seed leaves out keep the fresh `1`, which is
  what the window stores for a ticked box. The window reopens with the
  seeded boxes, and the placed block (`sidebar: ['browseblockplugin']`)
  drops its "New Releases" link or its "Series" line. The key writes the
  `enabled` row and the audit-log line too, which the window does not
  (U68 harness, 2026-09-27).
- `themeOptions` (U13 harness, 2026-09-24, three apps): Settings ›
  Website › Appearance › "Theme", a map from an option of the context's
  theme (a scratch context always has the "Default Theme") to its value,
  e.g. `{displayStats: 'bar'}` ("Usage statistics display options": `none`
  "Do not display submission usage statistics chart for reader.", the
  default, `bar` "Use bar type of the chart for usage statistics
  display.", `line` "Use line type of the chart for usage statistics
  display."). A choice list takes one of its values, a group of boxes a
  list of them, a single box (`useHomepageImageAsHeader`, the summary box)
  `true` or `false`, a text box a string; an option the theme lacks and
  any other value are 400s naming the theme's options. Saved as the tab's
  "Save" saves: the tab posts every option of the theme as it shows them,
  the changed ones replaced (a box as `"true"` / `"false"`), so the
  options the seed does not name are stored at their shown value too
  (`typography notoSans`, `baseColour #1E6292`, …), as after a by-hand
  save; applied last in the build. Parity fact: a journal's "Journal
  Content Organization" shows (and so stores) "Include the current issue's
  table of contents" once the journal has an issue and "Include recent
  most published articles" before, so a seed with `issues[]` stores the
  first, as a manager saving the tab after creating them would. A fresh
  context has no row for any option: the tab shows the defaults
  (`displayStats` none, no chart), so every chart scenario seeds
  `themeOptions` on a scratch context.
- `components`: Settings › Workflow › Submission › the "Components" tab
  (its list "Article Components", "Monograph Components" on a press,
  "Preprint Components" on a preprint server), a map from a component's
  name to `false` or `{metadata?, dependent?, supplementary?, required?}`.
  A name among the components every new context gets, as the list shows
  it in the primary locale ("Article Text", "Research Instrument", …,
  "Other"; a press's "Book Manuscript", "Glossary", …), is that row's
  "Settings" › "Delete" with `false` (refused while a file uses it, as the
  grid refuses; in the database the row is disabled, not dropped, and on
  screen the Components list no longer shows it and no upload list offers
  it) or its "Settings" ›
  "Edit" › "Save" with an object; any other name is "Add a Component" ›
  "Save" with the name in the primary locale. `metadata` is the window's
  "File Metadata" list, `document`, `artwork` or `supplementary`
  ("Supplementary Content"); `dependent` and `supplementary` its two "File
  Type" boxes; `fileVariants` its "File Variants" box ("These files
  support file variants types, such as 'web' or 'high resolution'
  images."; ticked at install on "Image" alone, and `{Multimedia:
  {fileVariants: true}}` is U47's Settings bullet 2 state, "HTML
  Stylesheet" on a press, which has no Multimedia); `required` its
  "Require with Submissions" (`true` is "Yes,
  require submitting authors to upload one or more of these files.").
  Unset, an edit keeps the stored value and an added component gets the
  window's own start: Document, every box unticked, "No", an empty
  "Key". Both saves run the grid's own form, so the rows are the
  screen's (U36 harness, 2026-09-23, three apps; `fileVariants` U47
  harness, 2026-09-24, three apps). An unknown name with
  `false`, an edit that sets nothing, another word for `metadata` and a
  non-boolean box are 400s. Parity fact: "Add a Component" saves the new
  component at position 0, the first default's own position, so the list
  and the upload lists show the two in no fixed order (the grid and the
  wizard's list of one context differed; the same on screen and seeded).
- `taskTemplates[]`: templates of Settings › Workflow › "Tasks and
  Discussions", each `{stage, title, type?, dueInterval?, roles?,
  include?, message?}`. `stage` (required) is a stage word, `submission`,
  `review` (the external review), `internalReview` (OMP only),
  `copyediting` or `production` (the only one on OPS); another word is a
  400 naming the app's own. A `title` matching a template the new context
  already holds on that stage (the installed ones, named in the primary
  locale: "Discussion (Submission)", "Assign Editor", "Request Copyedit",
  …) is that row's "More Actions" › "Edit" › "Save", keeping what the
  entry does not set; any other title is the stage's "Add template" ›
  "Save". `type` `task` is "Enter task information" ticked, and a task
  needs `dueInterval`, the "Due Date" list's value: `P1W` ("1 week from
  the creation date"), `P2W`, `P3W`, `P4W`, `P1M`, `P1M15D` ("1.5
  months"), `P2M`, `P2M15D` or `P3M`; a discussion refuses it. `roles`, a
  list of role keys (those of `users[].roles`), is "Limit access to
  specific roles" with those boxes ticked; the window offers only the
  roles that work on the stage, so another is a 400. `include` (boolean)
  is "Automatically add this task and/or discussion when a submission
  reaches the stage", the list's "Auto-add at stage". `message` is the
  "Discussion" box (a bare string posted as a paragraph); a new template
  without one gets "Seeded template text for {title}.", since the box is
  required. The body the window posts goes through the templates API's own
  rules and controller, so every row is the screen's (U37 harness,
  2026-09-23, three apps). With `include` on, every later
  seeded submission that reaches the stage gets the item the application
  makes by itself, at the submit for the first stage and at the decision
  for a later one: "Created by: system", no participants (so only
  manager-level people see it), a task due after the interval with an
  empty "Task Owner:", its first message the template's text.
- `libraryFiles[]`: files of the context's Publisher Library (Settings ›
  Workflow › "Publisher Library", "Press Library" on OMP, "Preprint
  Server Library" on OPS), each `{name, type, description?,
  publicAccess?, file?}`, added the way the tab's "Add a file" window
  adds one (its upload, then "OK"), acting as `admin`. `name` (required,
  localized, at most 255 characters, not empty in the primary locale) is
  "Name"; `type` (required) a label of the "Type" list: `Marketing`,
  `Permissions`, `Reports` or `Other`, and on OMP also `Contracts`
  (another label is a 400 naming the app's list); `description`
  (localized) the "Description" box, empty by default; `publicAccess`
  (boolean, default false) the "Public Access" box; `file` a fixture
  basename as for the submission's `files[]`, default the app's PDF
  fixture (`article.pdf`, OPS `preprint.pdf`). The stored file is named
  after the uploaded one with the type code (`article-PER.pdf`; `-1`, `-2`
  after the code when the context already holds that name), and the
  response's `libraryFiles` gives it as `fileName` with the file's `id`,
  the number of the public address
  (`<context>/libraryFiles/downloadPublic/<id>`). The rows, their settings
  and the stored file are the screen's (U39 harness, 2026-09-24, three
  apps driven). On OMP the type codes are the positions of the press's
  own "Type" list (Contracts 0, Marketing 1, … Other 4), not lib/pkp's
  `LibraryFile` constants; the screen stores the same.
- `announcementTypes[]`: the "Announcement Types" tab's types, each
  `{name}` (localized, required in the primary locale), created the way the
  tab's "Add Announcement Type" window saves. `announcements[]`: the
  Announcements page's announcements, each `title` (localized, required
  in the primary locale), `descriptionShort` and `description`
  (localized rich text, as the panel's "Short Description" and
  "Announcement" boxes hold it: `<p>…</p>`), `dateExpire` (`YYYY-MM-DD`
  as the "Expiry Date" box is typed; any other shape is the panel's own
  refusal as a 400; a past date is accepted, so an expired announcement is
  seedable) and `type` (the primary-locale name of an entry of
  `announcementTypes[]`). Each is created the way the panel's "Save" is
  (the announcements API's add: the same validation against the context's
  form locales, the same model write, then the same queued notification
  for every user of the context with "Send an email…" unticked, so the
  job queue holds one job per seeded announcement until a test drains it;
  no email). Seeded after `users[]`, so the scratch users are among those
  notified, as they would be after a by-hand add. The image is not
  seedable (the panel builds it). The response lists the created
  `announcementTypes` and `announcements` with their ids, which the
  announcement's page address (`announcement/view/{id}`) needs. A
  scratch context's announcements page needs `enableAnnouncements: true`
  in the same request to be reachable (U12 harness, 2026-09-17).
  Announcements seeded in one request share a posted-date second, so
  their order on the public list and in the panel is arbitrary (it
  differed between OJS and OMP for one seed): a test that asserts order
  seeds distinct titles it finds by search, or adds the newest by hand
  (U12 claim check K4, 2026-09-17).

The subscription keys (OJS only; OMP and OPS answer 400 on each, but
for `payments`, which OMP takes too, below). Each
is the save of the screen that makes the state, run through that
screen's own code as `admin`, in this order after `users[]` and before
`issues[]`: the two payment screens, "Subscription Policies", the
institutions, the types, the subscriptions (U51 harness, 2026-09-25,
driven against the screens with every row equal). A refusal that only
the window itself can make (a malformed email or domain, a second
subscription for one user, dates on a non-expiring type, a missing
membership, an institution with neither IP range nor domain, an invalid
currency or IP range) is a 400 with the window's own message, but it
comes after the journal row exists, so the bare journal stays behind
under the tag; every other refusal comes first and leaves nothing.

- `payments`: `{enabled?, currency?, paymentPluginName?,
  manualInstructions?}` is Settings › Distribution › "Payments" ›
  "Save" (`enabled` the "Enable" box, default `true`; `currency` a code
  of the "Currency" list, e.g. `USD`; `paymentPluginName`
  `ManualPayment` "Manual Fee Payment" or `PaypalPayment`;
  `manualInstructions` the "Manual Payment Instructions" box). The key
  sends what the form sends, the PayPal boxes as they arrive (empty,
  "Test Mode" unticked), so the PayPal plugin stores its empty settings
  too, as after a by-hand save. `{publicationFee?, purchaseArticleFee?,
  purchaseIssueFee?, membershipFee?}` (numbers of 0 or more) and
  `restrictOnlyPdf` (boolean) are the "Payments" page › "Payment Types"
  tab ("Article Processing Charge", "Purchase Article", "Purchase
  Issue", "Association Membership", "Only Restrict Access to PDF version
  of issues and articles"); that tab is saved only when one of them is
  given, and it stores every fee box, the unnamed ones at 0. "Payments
  set up" (the "Subscriptions" page, buying) is `{currency: 'USD',
  paymentPluginName: 'ManualPayment', manualInstructions: '…'}`: the
  manual method counts as set up only with instructions (seed-facts).
  A submission's `published: true` is refused (400,
  `publicationFeeStatus` "Publication Fee not paid…") on a journal whose
  `payments` key set a `publicationFee` above 0: seed the published
  article first, then set the APC (U52 claim check K2, 2026-09-27).
  OMP (U73) takes the same "Payments" tab fields `{enabled?, currency?,
  paymentPluginName?, manualInstructions?}` and nothing else: a press
  has no "Payment Types" page, so a fee key or `restrictOnlyPdf` is a
  400 naming it. It is the same save (`PaymentSettingsSeeder`), as
  `admin` after `users[]`; the rows, the reopened tab and the terms
  window's "Price (USD)" equal a by-hand save (U73 harness, 2026-09-28).
  A new press already stores `paymentPluginName` ManualPayment but no
  `currency` and no `paymentsEnabled`. OPS answers 400: a preprint server's Distribution settings have no
  "Payments" tab.
- `subscriptionName`, `subscriptionEmail`, `subscriptionPhone`,
  `subscriptionMailingAddress` (strings), `subscriptionAdditionalInformation`
  (a string or a locale map, the rich text as stored, `<p>…</p>`),
  `subscriptionExpiryPartial` (`true` "Partial expiry", `false` "Full
  expiry") and the four "Subscription Expiry Reminders" lists
  (`numMonthsBeforeSubscriptionExpiryReminder` and
  `numMonthsAfterSubscriptionExpiryReminder` 0–12,
  `numWeeksBeforeSubscriptionExpiryReminder` and
  `numWeeksAfterSubscriptionExpiryReminder` 0–3; 0 is "Disabled"): the
  "Payments" page › "Subscription Policies" tab › "Save", one save for
  all given keys. The tab saves every field it shows, so the unnamed
  ones are stored as they arrive (empty, "Full expiry", "Disabled", the
  boxes unticked: `0` rows), as after a by-hand save. A malformed email
  is the tab's own refusal ("Please enter a valid email.").
  The tab's own "Save" refuses an empty contact "Name", "Email" or
  "Mailing Address", but the keys can store one, so a script that later
  saves the tab on screen seeds or types all three (U51 claim check K1,
  2026-09-25).
- `institutions[]`, each `{name, ipRanges?, ror?}`: Settings ›
  "Institutions" › "Add Institution" › "Save" (the institutions API's
  own add). `name` in the primary language; `ipRanges` a list, one line
  of the "IP ranges" box each (`127.0.0.1`, `10.0.0.0/8`, `142.58.*.*`,
  `142.58.103.1 - 142.58.103.4`); `ror` the "ROR" box. An invalid range
  is the form's refusal ("Invalid IP range"). Names are unique in a seed,
  since a subscription names its institution. The response lists
  `institutions` (`id`, `name`).
- `subscriptionTypes[]`, each `{name, cost, currency, duration?,
  format?, institutional?, membership?, hidden?, description?}`: the
  "Payments" page › "Subscription Types" › "Create New Subscription
  Type" › "Save". `name` is "Name of Type" (primary language); `cost` a
  number (stored with two decimals); `currency` a code; `duration` whole
  months, absent for a non-expiring type ("Non-expiring"); `format`
  `online` (the default, what the list arrives on), `print` or
  `printOnline`; `institutional` the "Institutional" radio (default
  "Individual"); `membership` "Subscriptions require membership
  information…"; `hidden` "Do not make this subscription type publicly
  available or visible on the website."; `description` the rich text.
  Types join the list in the order given. The response lists
  `subscriptionTypes` (`id`, `name`, `institutional`).
- `subscriptions[]`, each `{user, type, status?, dateStart?, dateEnd?,
  referenceNumber?, notes?}` plus `membership?` on an individual one,
  or `institution`, `mailingAddress?` and `domain?` on an institutional
  one: "Individual Subscriptions" (or, with `institution`, "Institutional
  Subscriptions") › "Create New Subscription" › "Save", with the email
  box unticked. `user` is `admin` or a username of `users[]` in the same
  request (the window's "Locate a User" lists the journal's users only;
  seed a throwaway reader, never a roster account); `type` and
  `institution` name entries of this request's lists, and the type's
  kind must match. `status` is `active` (the default),
  `needsInformation`, `needsApproval`, `awaitingManualPayment`,
  `awaitingOnlinePayment` or `other`. Dates are `YYYY-MM-DD`, their year no
  more than ten from this year's, as the window requires; on an expiring type they
  default to today and today plus the type's duration, and a
  non-expiring type takes none. The end date is stored as the end of
  that day (`23:59:59`). There is no "expired" word: an expired
  subscription is `status: 'active'` with a past `dateEnd`, which the
  window itself accepts. An institutional subscription on an "Online"
  or "Print and Online" type needs a `domain` or IP ranges on its
  institution. A `domain` must contain a dot: "localhost" is refused
  ("Please enter a valid domain.") (U51 claim check K1, 2026-09-25).
  The response lists `subscriptions` (`id`, `user`, `type`,
  `institution`).

Users are created here and nowhere else. The submission scenario resolves
usernames but never creates them. The response returns `tag`, `contextId`,
`path`, the created `users` (id and username), `announcementTypes` (id and
name), `announcements` (id and title), `components` (`id`, `name`,
`action`: `added`, `edited` or `removed`, in the order seeded),
`taskTemplates` (`id`, `title`, `stage`, `action`: `added` or `edited`),
`libraryFiles` (`id`, `name`, `type`, `fileName`, `originalFileName`,
`publicAccess`, in the order seeded), `categories` (see `categories[]`)
and on OJS `issues` (see `issues[]`) and, when seeded, `institutions`,
`subscriptionTypes` and `subscriptions`.

## `POST scenarios/submission`

Walks a submission to a declared end state through the same services the
wizard and the workflow screens use.

Keys:

- `tag` (required), `context` (required, the context's url path),
  `submitter` (required, an existing username).
- `title` (default "Submission {tag}"), `abstract` (default "Seeded abstract
  for {tag}."; sections that require an abstract need one, and the default
  satisfies them; an empty string is read as absent and gets the default,
  so an abstract-less submission is made on screen by emptying the
  abstract, U17 claim check K3), `locale` (default: the context's primary
  locale).
- `submitted` (default true). An explicit `false` produces a true
  wizard-resumable draft: no `dateSubmitted`, `submissionProgress` set, and
  the author keeps metadata editing rights. It appears in the author's
  Incomplete list.
- `dateSubmitted` (`YYYY-MM-DD`, today or earlier; U65): the day the
  submission was received. The build runs as without it; then the
  three dates the editorial statistics count by move back by the same
  whole number of days, read back from what the app wrote, each keeping
  its time of day: the submission's date submitted, every seeded
  decision's date, and (with `published: true`) the publication's date
  published, unless `datePublished` is given, which stays as given. The
  submission reads as received on that day and decided and published
  moments later ("Days to First Editorial Decision" 0). Nothing else
  moves: the last activity, the activity log, review assignments,
  notifications and tasks keep today (D9: no screen receives a
  submission on another day). The response adds `dateSubmitted` (the
  stored date and time) and `daysShifted` (negative, 0 for today, which
  leaves the rows as without the key). Refused (400): another format, a
  day after today, `submitted: false` (a draft has no submission date).
  On "Editorial Activity" a Custom Range around the day counts the seed
  under "Submissions Received", its decline under "Submissions
  Declined" and a publish under "Submissions Published", and the
  monthly email (`scenarios/task` `statisticsReport`) counts a seed
  dated in the previous month. The stored time is the build's, so a
  seed dated on a range's last day sits after that day's midnight (U65
  harness, 2026-09-28, three apps). For the statistics' decline rows:
  the decision name `decline` is the Review stage's "Decline
  Submission" even on a submission still at the Submission stage, so it
  counts under "Submissions Declined (After Review)"; the Submission
  stage's desk reject is `initialDecline` (OJS, OMP; a preprint server
  has `decline` alone).
- `decisions[]`: real decision names, resolved per app (`sendExternalReview`,
  `accept`, `requestRevisions`, …: the lowercased class name of the app's
  decision type). An unknown name fails with a 400 that lists the app's
  roster. A decision that moves the submission into a review stage
  (`sendExternalReview`, OMP's `sendInternalReview`) creates that round and
  seeds the next `reviewRounds[]` entry into it; `newExternalReviewRound`
  (and OMP's `newInternalReviewRound`) creates its round but consumes no
  entry, so that round gets no reviewers, and every entry left after the
  decisions builds a further round of its own.
  `cancelReviewRound`, like the screen, records no decision of its own and
  removes the cancelled round's decisions. On OMP the chain
  `sendInternalReview`, `acceptFromInternal`, `requestRevisions` answers
  500 ("Call to a member function getId() on null", `Repository.php`),
  where `sendExternalReview`, `requestRevisions` seeds (U65 claim check
  K4; not yet traced).
- `reviewRounds[]`, each with `files[]` (see `files[]` below) and
  `reviewers[]` of `{username, status, reviewForm, recommendation,
  comments}` where `status` is `invited`
  (default), `accepted`, `declined` or `completed`, and `reviewForm` is the
  exact title of one of the context's active review forms (seeded through
  `reviewForms[]`), attached the way the reviewer row's "Edit" window
  attaches it; a missing or inactive title fails with a 400 that names the
  active titles. A form becomes uneditable on screen the moment a request
  carries it, so text to type on the form (a second language, a renamed
  item) is typed before the reviewer is seeded. A reviewer named here
  leaves the Add Reviewer search, so a script that both seeds a request and
  opens Add Reviewer seeds a spare `externalReviewer` in the context's
  `users[]`. `completed` is a review accepted and submitted through the
  reviewer wizard's own step forms: the editor's row reads "Review
  Submitted" with "Read Review", and the reviewer's list shows it under
  "Completed". Its two optional inputs are step 3's: `recommendation` (OJS
  only: `accept`, the default, `pendingRevisions`, `resubmitHere`,
  `resubmitElsewhere`, `decline` or `seeComments`, resolved against the
  journal's active recommendations; a 400 on OMP, whose step 3 has no such
  list) and `comments` (the "For author and editor" text, default "Seeded
  review comments for {tag}.", stored as the paragraph TinyMCE posts). Both
  are a 400 on any other status, and `completed` refuses a review form with
  required questions, as the wizard does. On a context with
  `review.competingInterests` set, a `completed` review records the "I do
  not have any competing interests" answer, and Review Details shows "No
  competing interests were disclosed." (U27 claim check I28,
  2026-09-28); a declared statement has no key. A third, `dateCompleted`
  (`YYYY-MM-DD`, today or earlier; `completed` only, a 400 otherwise),
  backdates the submitted review: the wizard completes it today, then
  every date of the assignment (requested, notified, accepted, completed,
  both due dates) moves by the same number of days, so it reads as a
  review requested, accepted and submitted around that day; the
  submission, round, notifications and activity log keep today's dates
  (D9: no screen submits a review on another day). A review submitted
  last calendar year is what lists its reviewer under "Peer Reviewers in
  Previous Year" on "Editorial Masthead" (OJS and OMP; on OMP only an
  external-review round counts), with the sentence naming that year
  (U07 harness, 2026-09-23). A seeded `accepted` assignment
  opens the wizard on step 1 (the on-screen accept lands on step 2). These
  are the only per-reviewer keys. Due dates and the review method are not
  parameters:
  the builder stamps them exactly as the Add Reviewer form does, from the
  context's `numWeeksPerResponse` and `numWeeksPerReview` and its
  `defaultReviewMode` (double-anonymous when unset). Any other key fails
  with a 400.
- `participants[]` of `{username, role, recommendOnly, canChangeMetadata}`:
  extra stage assignments for people other than the submitter, the same
  row the workflow's Assign Participant form writes, without that form's
  email and notification. `recommendOnly` and `canChangeMetadata`
  (booleans) are that window's "Assignment privileges" and "Permissions"
  boxes; each defaults to the role's own setting, as the window pre-ticks
  it (the context key `roles`), so an install-default Section Editor is
  seeded with the permission and without the limit. A seeded
  `recommendOnly: true` row reads "Only allowed to recommend an editorial
  decision" under the person's role in the Participants panel. Refusals
  follow the window: `recommendOnly: true` on a role below sub-editor level
  and `canChangeMetadata: false` on a manager-level role are 400s (U35
  harness, 2026-09-22, three apps). Because the row skips the form's
  notification step, the managers' header Tasks entry "A new monograph
  (article) has been submitted to which an editor needs to be assigned."
  stays up even with an editor seeded in; read the Tasks panel by the
  driven submission's title, never by count (OMP and OJS, 2026-09-27, U71
  claim check K6).
- `published` (default false). Requires `submitted: true`.
  A published seed records no accepting decision, so it never counts
  under "Editorial Activity"'s "Submissions Accepted", and after
  "Unpublish" it stands at the Submission stage (U65 claim check K2).
- `author`: `{orcid, orcidIsVerified}` on the submitter's contributor record.
  `orcidIsVerified: true` stores what ORCID's own sign-in leaves when the
  emailed link completes, the verified mark plus a live permission: a
  fixture access token (`test-orcid-access-token-<tag>`, a fixture like the
  dummy client credentials, since ORCID's service is unreachable), the
  scope the app requests for the context's API type (`/authenticate`
  public, `/activities/update` member), a refresh token and an expiry
  twenty years out, the lifetime ORCID's tokens carry. `false` stores the
  iD alone, the typed-in, unauthenticated state. The app's own gates read
  the token, not the mark, so the two states differ on screen: with the
  ORCID tab's author-email toggle on, recording Accept queues the
  "Submission ORCID" request for the unauthenticated contributor and
  nothing for the verified one (U04 scenario 8; read from the queue table
  after seeded Accepts, 2026-09-13, OJS and OMP), and the contributor form
  shows the verified one's solid-icon iD with Delete and no "Request
  verification" (the Contributors list itself shows no iD). A verified iD
  whose token the app has since dropped as expired, a state a deposit
  produces, has no key.
- `contributors[]` (U72, the three apps): people with no account on the
  version's Contributors list, each `{givenName, familyName?, email,
  country?}`, added after the submitter's own entry in list order, the
  way the wizard's "Contributors" step adds them: "Add Contributor", a
  "Person" with "Given Name", "Family Name", "Email", "Country" (default
  `CA`, "Canada") and "Contributor Roles" › "Author" ticked, "Save", as
  the submitter, before the submit (the panel's body through the
  contributors API's own add), so a draft carries them too. Every other
  box is left as the window opens it: no affiliation, no bio, "Include
  this contributor when identifying authors in lists of publications."
  ticked. The names are strings under the submission's language. The
  window's refusals are the seed's 400s (an invalid address or country
  code, a missing given name or address). The list reads as a by-hand
  one: "{given} {family}" (the given name alone without a family name),
  the "Author" badge, "Set Primary Contact"; the rows (the contributor,
  its settings, its role, its CRediT rows) equal the screen's, the
  Activity Log unchanged (U72 harness, 2026-09-28, three apps driven).
  The response lists `contributors` (`id`, `email`, in the order
  seeded). An address is what `chapters[].authors` (OMP) names a
  contributor by.
- `reviewerSuggestions[]` (OJS, OMP): the entries of the wizard's "Reviewer
  Suggestions" step, each `{givenName, familyName, email, affiliation,
  suggestionReason}`, created the way the step's "Add Reviewer Suggestion"
  window creates them, before the submit. `givenName` and `email` are
  required and `familyName` is optional; `affiliation` (default "Seeded
  affiliation for {tag}") and `suggestionReason` (default "Seeded suggestion
  reason for {tag}.", stored as the paragraph the rich-text box posts) are
  required on the window, so the seed fills them. The name, affiliation and
  reason boxes are multilingual: a bare string lands under the context's
  primary locale; a locale map must carry that locale and may name only the
  context's form locales. The window's refusals are the seed's: an invalid
  address or a second entry with the same address is a 400. The context's
  `review.reviewerSuggestionEnabled` must be on, because the step exists
  only then (a 400 otherwise); OPS answers 400. The address is what the
  editor's panel matches against accounts, so an entry carrying a seeded
  user's address (`<username>@mail.test`) is "a person with an account".
  No entry is ever marked approved or turned into a reviewer: that is the
  panel's "Add Reviewer", driven on screen.
  An address once turned into a reviewer through "Create New Reviewer" or
  "Enroll Existing User" is an account with the Reviewer role for every
  other submission of the context, so a scenario that needs the Create or
  Enroll path seeds a fresh address per submission. Live-driven 2026-09-06,
  OJS and OMP (`.reports/U31/cc-K3.md`).
- `userComments[]`: reader comments on the published publication, each
  `{user, text, approved, reports}`. `user` (required) is an existing
  username, the writer; `text` (required) the comment; `approved` (default
  `false`) leaves it pending or marks it approved the way the Comments
  page's "Approve Comment" does (`approvedAt` now, `approvedByUserId` the
  seeding admin, a manager of every scratch context); `reports[]`, each
  `{user, note}` (both required), the reports the landing page's "…" ›
  "Report" dialog files. The comment is created as the landing page's
  "Submit" creates it (`POST comments`) and the report as the dialog's
  "Submit" does (`POST comments/{id}/reports`), and each fires the
  moderators' task the screens fire: one "A comment has been submitted and
  is pending review by a moderator." row per manager and site admin of the
  context, one "A report was submitted for a comment and requires review by
  a moderator." row per report (the controller's own fan-out; no email).
  Refusals follow the screens: the key needs `published: true` (a 400
  otherwise; the box exists on a published landing page only), a report
  needs `approved: true` (nobody but the writer sees a pending comment, so
  only an approved one can be reported) and a reporter other than the
  writer (one's own menu has no "Report"); an unknown username, an empty
  text or note and a non-boolean `approved` are 400s. Text and note are
  stripped as posted text is (`stripUnsafeHtml`), so a `<script>` tag in
  either is dropped. The key applies wherever the Comments page exists,
  so OMP and OPS accept it too, with the seeded rows listed on their
  Comments page; the landing-page blocks are OJS's alone. The key does not
  read the context's `enablePublicComments` (the API does not either):
  seeded comments on a comments-off context exist and list on the Comments
  page, which is the "switched off with comments kept" state.
  A batch seeded in one call is created within the same second and the
  Comments page (newest first) lists it in no fixed order, and past
  "Items per page" rows the older ones land on page 2: seed a comment a
  test must find by row in its own later call, or open it by its
  address `?commentId=N` (U14 claim check K3, 2026-09-16).

- `files[]` (OJS, OMP): files on the Submission stage's "Submission
  Files" list, each `{file, genre?, uploader?, note?}`. `file` is a
  fixture basename, as for `galleys[]` below (`article.pdf`, `notes.md`,
  `article.html` for an HTML file with "Dependent Files"); the list shows
  the fixture's own name. `genre` is the component, by the name the
  upload lists show ("Article Text", "Book Manuscript", "Other", …, or one
  a `components` seed added); it must be one they offer (enabled, not a
  dependent one such as "Image": that is offered only by "Upload a
  Dependent File"), and it defaults to the first main-work component
  ("Article Text", a press's "Book Manuscript"). `uploader` (default the
  submitter) decides the path: the submitter's file is the submission
  wizard's "Files" panel ("Add File", then the component's button),
  uploaded before the submit, so a `submitted: false` draft carries it
  too; anyone else's is the workflow's "Submission Files" › "Upload"
  wizard after the submit, acting as that person, who must be offered it
  (the site admin, a manager of the context, or a sub-editor or assistant
  in this request's `participants[]`; anyone else, or any other uploader
  on a draft, is a 400). `note` is a note on the file, the file's "More
  Actions" › "More Information" › "Notes" › "Add Note", written by `admin`
  (the Notes tab reads "admin admin" as its writer); a draft has no
  "More Information", so a note there is a 400. Each
  `reviewRounds[].files[]` entry, `{file, genre?}`, is a file on that
  round's "Files for Review": "Upload/Select Files" › "Upload Review
  File" by `admin`, then the window's "OK" with the new row ticked (the
  file is marked viewable), before the round's reviewers are added; each
  seeded reviewer is then given every file of the round, as the "Add
  Reviewer" form's file list, all ticked, gives them, so the reviewer's
  step 1 lists them under "Review Files". Every file is written as its
  screen writes it (U36 harness, 2026-09-23, OJS and OMP driven), the
  files' uploader aside: a round file's uploader and its log rows name
  `admin`, where a screen upload names the editor. OPS answers 400 on
  both: a preprint server shows no workflow file list.
  `list` (U73) names the root entry's list: `submission` ("Submission
  Files", the default) or `productionReady`, the Production stage's
  "Production Ready Files" › "Upload" (the wizard "Upload a Production
  Ready File": the same steps, the file at the production-ready file
  stage, no assoc). Its `uploader`
  defaults to `admin` and must be offered that list's upload (the site
  admin, a manager of the context, or a sub-editor or assistant in
  `participants[]` whose role is assigned to Production; the submitter
  as Author is a 400). The file is uploaded once the decisions have run,
  before the galleys and formats, so the request needs `submitted: true`
  and decisions that reach Production (`['skipExternalReview',
  'sendToProduction']`); a draft is a 400 before anything is written,
  and a submission short of Production a 400 once the decisions ran
  (rolled back). An unknown word is a 400. The response's `files`
  entries carry `list`. A chapter's `files.N` counts every root entry in
  request order, whatever its list. The rows, log lines, notifications
  and the list equal a by-hand upload by `admin` (U73 harness,
  2026-09-28, OJS and OMP); on a press the format's "Select Files"
  window lists the file under "Page Proofs". Since the seed uploads it
  before the `publicationFormats[]` proof files, its id comes before
  theirs.
- `galleys[]` (OJS, OPS): galleys on the submission's current publication,
  each `{label, locale, file}` or `{label, locale, urlRemote}`, created the
  way the workflow's "Galleys" page creates them, after the decisions and
  before a publish (an editor builds the galleys, then publishes, so a
  `published: true` seed carries them published); on OPS a
  `submitted: false` draft takes them too, and opens with the galley on
  "Upload Files" (U21 claim check I28, 2026-09-28). `label` is required (the
  "Create New Galley" window's own rule); `locale` defaults to the
  submission's locale and must be one the window's list offers (the
  context's submission locales); the window itself preselects the
  context's primary language instead, so a seeded galley on a submission
  in another language differs from a by-hand one left at the window's
  default (U46 ccK2, 2026-09-24); exactly one
  of `file` or `urlRemote` is named (a 400 otherwise). A seeded galley's file reads
  back only through the publication's "Preview" › galley link ›
  "Download" (its suggested file name); the Galleys page shows only
  "<label> <language>" (U36 K5, 2026-09-23). On OPS a seeded galley's file
  is what gives a preprint its "More Information" window ("Information
  Center: <label>", with "History" and "Notes"; U38 claim check,
  2026-09-23). `file` is a basename
  under `apps/<app>/playwright/fixtures/files/` (`article.pdf` on OJS,
  `preprint.pdf` on OPS; `bin/mount.js` copies the folder into the
  checkout, so a new fixture needs a re-mount) and is stored as the
  wizard "Upload a File Ready for Publication" stores it: a real file in
  the submission's directory, a submission file at the proof stage hung on
  the galley, named after the fixture, of the genre the wizard's list
  offers first ("Article Text" / "Preprint Text"; the list preselects
  nothing, and the seed has no `genre` key), and the wizard's four
  activity-log rows. `urlRemote` is the window's "Remotely hosted content"
  galley, with no file. Each galley is created acting as `admin`, so the
  file's uploader and the log rows' user are `admin`, where a screen
  upload names the editor; everything else, the notification rows
  included, is what the screen leaves (parity ledger 2026-09-19); on OPS
  the Author's "Change File" is refused on a file someone else uploaded,
  so it is always refused on a seeded galley (U46 OPS3). Seeded galleys,
  like by-hand ones, are all stored at position 0, so the page's order is
  loose until an order is saved (U46 A7). No key makes a second version:
  a test uses the header's "Create New Version". OMP
  answers 400: a press has publication formats, not galleys.
  Two more per-entry keys (U13 harness, 2026-09-24, OJS and OPS driven):
  `urlPath`, the window's "URL Path", refused as the window refuses it
  (letters, digits and single `.`, `-`, `_` between them; not a number;
  not a URL Path a galley listed before it has), so the galley's link
  reads `…/view/{article}/{urlPath}`; and `genre`, the upload wizard's
  component, by the name its list shows ("Data Set", "Other", …), one of
  those the list offers (enabled, not dependent: "Image", "HTML
  Stylesheet" and "Multimedia" are 400s, the wizard never offers them);
  without it the first the list offers ("Article Text", "Preprint
  Text"). A galley of a supplementary component ("Research Instrument" to
  "Source Texts", "Other") is listed under the landing page's "Additional
  Files". A `urlRemote` galley takes neither (the window hides "URL Path"
  once the remote box is ticked and opens no wizard): both are 400s there.
  OJS has `article.xml` too, a small JATS article ("A JATS fixture
  article", an abstract, one section, one reference) for an XML galley,
  which the "eLife Lens Article Viewer" lays out on the journal's page;
  a preprint server has no XML reader, so OPS has no XML fixture, and no
  `notes.md` either (its text fixture is `not-an-image.txt`).

- `tasks[]`: discussions and tasks on a stage's "Tasks & Discussions"
  panel, each `{title, creator, participants, type?, stage?, owner?,
  dateDue?, started?, message?}`, saved after everything else in the
  request (decisions, rounds, galleys, publish) as the panel's "Add" ›
  "Save" saves them. `title` is "Name"; `creator` (required) the username
  of the person who pressed "Add"; `participants` (required) the usernames
  ticked under "Participants", the creator included when they are ticked
  (the window pre-ticks them). `type` is `discussion` (the default) or
  `task`; a task needs `owner` (one of `participants`, the "Task owner"
  radio) and `dateDue` (`YYYY-MM-DD`), and `started` is the drop-down,
  `true` (the default) "Begin Task Upon Saving", `false` "Create Task
  (Do Not Start)"; a discussion refuses all three. `stage` is a stage word
  as for the context's `taskTemplates[]`, default the submission's
  current stage, and must be one the submission has reached (a later
  panel is not on screen yet). `message` is the first message (default
  "Seeded message for {tag}.", a bare string posted as a paragraph). The
  window's JSON body goes through the tasks API's own rules and
  controller, acting as the creator, so the refusals are the window's
  (Rule 8: participants assigned to that stage or manager-level, the
  creator among them unless manager-level, two for a discussion, one
  owner for a task, the anonymous-review rules; a 400 with the app's
  text) and every row is the screen's: the item, its participants, the
  head note, the History's "created" (and "initiated") line, one
  "Discussion added." Tasks row and one email-log row per participant and
  the creator (mail is faked), and on Copyediting and Production the
  stage notices' update (U37 harness, 2026-09-23, three apps driven). The
  one lifted rule: the window refuses a due date before today, so a past
  `dateDue` stands for a task whose due date has passed since it was
  saved; the item's other dates are the seed's time, so its History says
  it was created after its due date. A draft (`submitted: false`) refuses
  the key. The three apps alike.
- `libraryFiles[]`: files of the submission's Submission Library (the
  workflow header's "Library"), each `{name, type, description?, file?}`,
  the same values as the context's `libraryFiles[]`, added after
  everything but `tasks[]` the way the "Submission Library" window's "Add
  a file" adds one (its upload, then "OK"), acting as `admin`. The
  window has no "Public Access" box, so `publicAccess` is a 400, and a
  draft (`submitted: false`) refuses the key (no workflow, no "Library").
  The response's `libraryFiles` has the same fields as the context's. The
  rows, their settings and the stored file are the screen's, and the
  window lists a seeded file as it lists a by-hand one (U39 harness,
  2026-09-24, three apps driven). The key works on `publicknowledge`
  submissions too: a Submission Library file belongs to its submission.
  The stored name, though, is picked from the whole context's library
  (both libraries, every submission), so on `publicknowledge`, where
  other workers seed the same fixture, it is not predictable
  (`article-MAR.pdf` or `article-MAR-3.pdf`), and a test that asserts
  the downloaded name (U39 Rule 8a) seeds its submission in a scratch
  context, or reads `fileName` from the response. Two workers seeding at
  once can even get the same stored name (neither sees the other's
  uncommitted row) and share one stored file, so a test that deletes a
  library file seeds it in a scratch context.
- `citationsRaw`: the wizard's "Details" step "References" box, a string
  (one reference per line, as typed) or a list of lines (joined with
  newlines; a null or empty entry is a blank line). Saved the way the
  step's save sends the box (its PUT to the publication, whose save
  rebuilds the version's reference list from the text), before the submit
  and as the submitter, so a draft carries it too. The rows are the
  screen's: one reference per non-blank line in line order, ends trimmed
  and inner runs of spaces shrunk to one, a repeated line kept as a
  second reference (the wizard's rule, not the References page's "Add",
  which drops a repeat); with lookup off no DOI is kept from the text
  (the wizard path's own behavior, U42 A7), with lookup on each reference
  queues the chain (`citationsMetadataLookup` above). The key does not
  read the context's References setting: references seeded on a context
  with `metadata.citations: 'off'` are the "switched off with references
  kept" state. A string that is not
  text is a 400. The three apps alike (U42 harness, 2026-09-24).
- `dataCitations[]`: data citations on the current publication, each
  `{title, relationshipType, identifierType?, identifier?, repository?,
  year?, authors?, url?}`, added the way the Data Citations table's "Add
  Data Citation" › "Save" adds one (the panel's body through the data
  citations API's own add), in list order, before the submit and as the
  submitter (the wizard's "Data" section and the workflow's "Data" page
  post the same body). `title` (required) is "Title";
  `relationshipType` (required) the "Relationship type" list's value,
  `supporting`, `generated`, `analyzed` or `non-analyzed`;
  `identifierType` the "Identifier type" list's label, `DOI`,
  `Accession`, `PURL`, `ARK`, `URI`, `ARXIV`, `ECLI`, `Handle`, `ISSN`,
  `ISBN`, `PMID`, `PMCID` or `UUID`, and `identifier` the "Identifier"
  box (each needs the other); `repository` "Repository"; `year` a
  whole number, "Year" (four digits); `authors[]` the "Creators" rows,
  each `{givenName?, familyName?, orcid?}`; `url` "URL". The panel's
  refusals are the seed's 400s (a missing title or relationship type,
  another word for either list, an identifier invalid for its type, a
  year not four digits, a malformed address), and an identifier typed as
  an address is stored bare, as on screen (`https://doi.org/10.1234/xyz`
  becomes `10.1234/xyz`). Every row has the order 0 a panel save gives
  it, so the table lists them in the order seeded until someone saves an
  order. The key does not read the context's Data Citations setting
  (stored data citations outlive the setting being switched off). The
  response lists `dataCitations` (`id`, `title`, in the order seeded).
  The three apps alike (U42 harness, 2026-09-24).
- `mediaFiles[]`: media files on the current publication's "Media" page,
  each `{file, genre?, resolution?, name?, pair?}`, added the way the
  page adds them, acting as `admin`, after the galleys and before a
  publish (so a `published: true` seed carries them on the published
  version): every entry is a card of one "Add Media File" › "Upload Media
  File" window (its upload, then one "Upload Files" for all of them),
  then each `name` is that row's "Edit Metadata" › "Save", then, if any
  entry has a `pair`, one "Batch Link Media" › "Link Media". Each step
  runs the media files API's own action on the body the window sends.
  `file` (required) is a fixture basename, as for `galleys[]`
  (`figure.png`, a 120×80 PNG, is the image `article.html` and
  `preprint.html` name). `genre` is "What kind of media is this?", a
  component name as the list shows it (every component marked as a
  dependent file: "Multimedia", "Image", "HTML Stylesheet" on a new
  journal or preprint server, "Image" and "HTML Stylesheet" on a new
  press, or one a `components` seed ticked `dependent` on); it defaults
  to "Image". `resolution` is "File resolution type", `web` (the
  default, "Web resolution") or `high_resolution` ("High resolution"),
  the latter only for a component with "File Variants" ticked.
  `name` is "Name of the file" (default the fixture's own name, as the
  upload names it): it is what an HTML galley's `src` or `href` has to
  match for a reader to see the file. `pair` is a label two entries
  share, one `web` and one `high_resolution` of the same component: the
  two are linked as the web file's "Batch Link Media" row set to the
  other links them, the shared details copied from the web file. The
  window's refusals are the seed's 400s (a component the list does not
  offer, a `high_resolution` it greys out, an empty name, a `pair` that
  is not one file of each resolution in one component), and a draft
  (`submitted: false`) refuses the key: the page is on the workflow.
  The rows, the stored files, the Activity Log lines and the page's list
  are the screen's, the uploader included, since the screen was driven
  as `admin` (U47 harness, 2026-09-24, three apps driven; parity
  ledger). All entries of one seed are one "Upload Files", so they share
  their upload second, and the page's newest-first list shows them in
  no fixed order among themselves (a pair stays together). The response
  lists `mediaFiles` (`submissionFileId`, `file`, `name`, `genre`,
  `resolution`, `variantGroupId`, null for a file with no counterpart,
  in the order seeded). No key makes a second version: a test uses the
  header's "Create New Version", which copies them (U47 Rule 9). A reader
  fact for the published side: the HTML galley plugin serves a reader who
  is not signed in a copy of the galley's page cached for 24 hours under
  the galley's id, built at the first such view and dropped only by
  Administration › "Delete Data Caches" (rebuilt at the next signed-out
  view; OJS, 2026-09-27, `.reports/U61/cc-K2.md`) or `reset:<app>` (not
  by a media change); `reset:<app>` since 2026-09-24
  clears the app's Laravel store under `checkouts/<app>/cache/` (before
  that a new galley could inherit an old install's cached page with the
  images unresolved); a signed-in reader always gets a fresh page (U47
  harness, 2026-09-24).
- `publicationFormats[]` (OMP): publication formats on the current
  publication, each `{name, file?}`, every one built through to the state
  a reader sees, the way the "Publication Formats" page builds it, acting
  as `admin`, after the media files and before a publish: "Add
  publication format" with `name` in "Name" (the "Publication Format"
  list left on its preselected "Digital (on physical carrier) (DA)", the
  other boxes empty) and "OK"; for a `file`, the format row's "Change
  File" upload (the proof stage, the component the wizard's list offers
  first, "Appendix" on a new press, as for `galleys[]`), then the file
  row's "Set Terms", "Open Access", "Save"; then the format row's
  "Awaiting Approval" › "OK"; and, after the publish (at the end of the
  build on an unpublished seed), its "Not Available" › "OK". So the format
  reads "Approved" and "Available", and its file "Open Access", while the
  file's own "Awaiting Approval" stays (the reader does not need it).
  `name` is required, a string (the submission's language) or a locale
  map over the press's submission languages that fills the submission's
  one; `genre` (U64, needs `file`) is the upload's component by the name
  its list shows, as `galleys[].genre` (`Book Manuscript`); without it
  the first the list offers, "Appendix", a supplementary component;
  `file` is a fixture basename, as for `galleys[]` (`article.html`
  names `figure.png`, so with `mediaFiles: [{file: 'figure.png'}]` and
  `published: true` the book page lists the format and its "HTML" link
  opens the file with the image resolved, "HTML Monograph File" being on
  in a new press). A draft (`submitted: false`) refuses the key. A press
  with a public-identifier plugin (URN) enabled for publication formats
  ticks an "Assign" box in the approval window that the seed cannot
  honour, so that seed is a 400: build such a format on screen. A new
  press can be such a press without anyone enabling URN: plugin settings
  are cached for 24 hours per context id, so a scratch press whose id an
  earlier install used could inherit that install's URN settings (seen on
  context 297, U47 harness pass 2) until `reset:<app>` began clearing the
  app's Laravel store under `checkouts/<app>/cache/` (2026-09-24). The
  rows (the format, its file, the Activity Log lines, the notifications)
  and the book page are the screen's (U47 harness pass 2, 2026-09-25,
  parity ledger). The response lists `publicationFormats` (`id`, `name`
  in the submission's language, `submissionFileId`, null with no
  `file`). OJS and OPS answer 400: a journal and a preprint server have
  galleys (`galleys[]`).
  Per format, also (U69 harness, 2026-09-28, driven equal on screen):
  - `physical: true`: the "Edit" tab's "Physical format" box ticked (the
    "Publication Format" list stays on "Digital (on physical carrier)
    (DA)").
  - `urlRemote` (a string): "This format will be available at a separate
    website." ticked and "URL of remotely-hosted content" typed; the
    format holds no file, so `file`, `genre` and `price` beside it are a
    400. It is approved and made available like any other; the book's
    page lists it as a link reading the format's name that opens the
    address in a new tab, and the Publication Formats row reads "This
    item is remotely hosted.". Nothing checks the address's form.
  - `price` (needs `file`; a string as typed, `"25"`, or a whole
    number): the file row's terms link, "Direct Sales" with "Price"
    typed, "Save" (`salesType=directSales&price=25`), instead of "Open
    Access". The window's own check refuses what it refuses ("10.5",
    "-5": a 400 with "A valid price is required."); `"0"` is saved as
    "Direct Sales" at 0, as on screen. The link then reads "Direct
    Sales", the window reopens on it with the price, and on a press with
    `payments` the book page's link reads "25 Purchase {format} (25
    USD)" (the price as typed). The file's Activity Log gains the one
    "fileEdited" line of that save, as by hand.
  - The format window's "Metadata" tab, right after the format's "OK":
    `identificationCodes[]` `{type, value}` ("Product Identification" ›
    "Add Code": "ONIX Code Type" by the label its list shows, such as
    `"ISBN-13 (15)"`, and "Code Value"); `publicationDates[]` `{role,
    date, dateFormat?}` ("Add publication date": "Role" by its label,
    such as `"Publication date (01)"`, "Date" as typed, "Date Format" by
    its label as the list shows it, which carries no code (`"YYYYMMDD"`,
    `"YYYYMMDD (H)"`, `"YYYY"`; `"YYYYMMDD (00)"` is a 400), left on the
    preselected "YYYYMMDD (H)" without the key);
    `metadata` `{productComposition, height?, width?, thickness?,
    weight?}` (the tab's "Save": "Product Composition" by its label, such
    as `"Single-component retail product (00)"`, required as on the tab;
    the sizes typed in the preselected units, mm and gr; every other
    field as the tab shows it: "Available (20)", "Yes, returnable, full
    copies only (Y)", "Canada (CA)"). A type or role the window would not
    offer (unknown, or already used by the format; "DOI (06)" while the
    press assigns DOIs) is a 400 listing what it offers; a date whose
    length does not fit its format is the window's refusal. The
    preselected date format is the Hijri one: a seeded or typed date left
    on it shows on the book page as "2024-03-05" with "Hijri Calendar"
    under it. On a published book an approved, available format with
    such data gets its details block ("Details about the available
    publication format: {format}", the code, the date, "Physical
    Dimensions" "130mm x 200mm").
  - The same tab's two lists (U74, driven equal on screen), each entry
    one window's "OK", built with the book's "Marketing" pages below
    (after every format, before a publish), so a market can name the
    book's representatives. The territory of either window is
    `countriesIncluded`, `countriesExcluded`, `regionsIncluded`,
    `regionsExcluded`, each a list of labels as the multiple-choice
    lists show them (`"Canada (CA)"`, `"World (WORLD)"`), empty when
    absent.
    - `salesRights[]` `{type, restOfWorld?, territory}`: "Add Sales
      Rights", "Sales Rights Type" by its label (required; each type
      once per format, as the list offers it), "Rest of World?" ticked
      with `true`. A second `restOfWorld: true` on a format is the
      window's refusal (400, "There is already a ROW sales type defined
      for this publication format.").
    - `markets[]` `{date, price, dateFormat?, dateRole?, agent?,
      supplier?, currency?, priceType?, taxRate?, taxType?, discount?,
      territory}`: "Add Market". `date` and `price` are required and
      stored as typed (nothing checks their form: `"abc"`, `"ten"`);
      the lists by their labels, left where the window arrives without
      the key: "Date Format" on "YYYYMMDD (H)" (the Hijri one; the
      Gregorian is `"YYYYMMDD"`, code 00), "Role" on "Publication date
      (01)", the currency on "Canadian Dollar (CAD)" (`currency: "US
      Dollar (USD)"`), "Price Type", "Taxation Rate" and "Taxation Type"
      on their empty choice (stored empty); `discount` as typed. `agent`
      and `supplier` are the "Agent" and "Supplier" lists' choice: the
      name of a `representatives[]` entry of that type in the same
      request (another name, or one two entries share, is a 400); left
      out, the empty choice (stored as 0).
    The rows, the lists' texts ("Included: CA, Excluded: GB", "Agent
    Ada, Supplier Sam", "25USD") and the log (none) equal a by-hand
    build; the windows' "added" toasts are not mirrored.
- `jats` (OJS): the current publication's "JATS XML" page, `{file?,
  makePublic?}` (at least one), used the way the page is used, acting as
  `admin`, after the media files and before a publish. `file` is a
  fixture basename, as for `galleys[]` (`article.xml`, a small JATS
  article titled "A JATS fixture article"), uploaded as the page's
  "Upload" uploads it (the JATS API's own upload action on the file);
  `makePublic` is the page's "Make available with publication" box,
  `true` ticked and "Confirm"ed in "Enable JATS XML Download", `false`
  unticked and confirmed (the API's own visibility action). The file is
  what a screen upload leaves: a submission file at the JATS stage on
  the publication, named after the fixture, with no component, one
  revision, and the History's "uploaded" and "revised" lines. So the page
  opens with the fixture's XML, "Last Modification at {date} by admin",
  and "Upload", "More Information", "Delete" and "Download", the box as
  seeded, exactly as after a by-hand upload by `admin` (U48 harness,
  2026-09-25, parity ledger). With `published: true` the file and the
  box are on the published version (the upload comes first, as on
  screen); that page, seeded, still offers "Upload" and "Delete" beside
  "Unpublish", because its guard compares the version's status with a
  `STATUS_PUBLISHED` constant the workflow page does not define; a
  version published through the screens shows the same, so it is not a
  seed difference (U48 claim check, 2026-09-25, spec Rule 8). A draft (`submitted:
  false`) refuses the key: the page is on the workflow. The response
  lists `jats` (`submissionFileId`, null without `file`; `file`;
  `makePublic`, the box as the build leaves it), null without the key.
  No key makes a second version: a test uses the header's "Create New
  Version", which copies the file and the box. OMP and OPS answer 400: a
  press and a preprint server have no "JATS XML" page.

- `usage[]` (U64, the three apps): readers' visits of past days to the
  published version, turned into the figures the Statistics pages
  ("Articles", "Monographs", "Preprints"), their "Download Report" files
  and the COUNTER tables read. Each entry is one day,
  `{daysAgo | date, abstractViews?, fileViews?, jatsViews?, country?,
  region?, city?}`:
  - The day: exactly one of `daysAgo` (a whole number from 1; 1 is
    yesterday, the last day of the pages' "Last 30 days") or `date`
    (`YYYY-MM-DD`, before today, from 2001-01-01). Today is refused: a
    day's visits become figures the next day. Days count from the
    server's today (the fleets run PHP in UTC).
  - The counts, each a whole number from 0 to 5000, one visit per count:
    `abstractViews` (the work's page: the table's "Abstract Views", the
    chart's "Abstracts", on a press "Catalog Entries"); `fileViews`, a list with one count per entry of
    the same request's `galleys[]` (OJS, OPS) or `publicationFormats[]`
    (OMP), in order, each a download of that entry's file; `jatsViews`
    (OJS alone, a 400 elsewhere), the landing page's "JATS XML" link. An
    entry names at least one visit. A file download is sorted as the
    download handler sorts it: by the file's type into "PDF", "HTML" or
    "Other" (a Word file counts as "Other" on the page), and a file of a
    supplementary or non-document component ("Data Set", a press's
    "Appendix") is a "Supplementary File" in "Download Files" and not in
    the page's "File Views".
  - The place, only while the context collects geographical data (the
    site's `enableGeoUsageStats` under `POST site`, and the journal's own
    level, which a scratch context leaves at the site's): `country` (a
    two-letter code in capitals, `CA`), `region` (the subdivision part of
    an ISO 3166-2 code, up to three letters or digits, `BC`) and `city`
    (a name). A region needs the country, a city the region, and a part
    deeper than the context collects is a 400, as the visit would not
    record it. Without them the visits have no place. Two places on one
    day are two entries.
  - Refusals (400): `usage` without `published: true`, or on an OJS
    version an unpublished issue schedules instead of publishing; a
    `fileViews` count past the list's end, or above zero for a remote
    galley or a format without file; `jatsViews` on a version whose JATS
    XML is not public (`jats.makePublic: true`) or has no body; any other
    key.
  - How it is built: each visit is one line of the day's usage log in
    the shape the usage event listener writes when a reader opens the
    page or file (`LogUsageEvent`), then the app's own loader jobs run on
    those lines at once (`UsageStatsLoader::getFileJobs`: robots and
    double clicks dropped, unique visitors counted, the `metrics_*`
    tables compiled, the file archived), then the monthly rebuild. The
    visits land on the day's figures beside every other seed's: nothing
    is replaced. The deliberate differences from a real day's log, the
    visitor model and the monthly rebuild are the parity ledger's
    (`PKPUsageStatsSeeder`).
  - Facts a suite meets: every visit comes from a visitor of its own, so
    a "Unique" column ("Download Geographic") and the COUNTER unique
    counts equal the totals; a single reader driving the pages on screen
    is one visitor, whose repeat views of one work count once as unique.
    The Statistics pages show the figures on their next load; the
    figures live in site-wide tables but belong to the context, so a
    scratch context's pages show its seeds alone, and `publicknowledge`
    (never seeded) shows none. The test installs have no location
    database, so a visit driven on screen records no place: geographical
    figures exist only through this key, and a test that seeds them sets
    the site's level first (serial, `@solo`, `POST site` below). On OMP,
    `publicationFormats[].file` without `genre` is an "Appendix" file,
    whose downloads are "Supplementary File" ones: give `genre: 'Book
    Manuscript'` for the book's "File Views". "Counter R5" offers no
    month on a fleet as reset: COUNTER figures need `POST site`
    `counterR5StartDate` and visits in whole past months after both that
    day and the context's first publication date. The seed takes the site row
    lock for its last step (as `bulkEmails` and `POST site` do), so
    parallel seeds with `usage` finish one after another (U64 harness,
    2026-09-27, three apps).

- The version's display values (U13 harness, 2026-09-24, OJS and OPS
  driven), typed by the editor (`admin`) on the workflow's publication
  pages after everything but the galleys and the publish, each page's
  fields saved in that page's own "Save" (a PUT to the publication), in
  the shape the page posts them:
  - "Title & Abstract": `subtitle` (a string or a locale map; posted as
    typed) and `plainLanguageSummary` (the same; typed text posted as a
    paragraph, `<p>…</p>`, markup kept).
  - "Metadata": the term lists `keywords`, `subjects`, `disciplines` and
    `supportingAgencies` ("Supporting Agencies"), each a list of terms
    under the submission's locale or a locale map of lists, one chip per
    term (stored as the chips store them, in order); on OJS
    `articleNumber` ("Article Number", a string).
  - "Publication Settings" (OPS "Preprint entry"): `categories`, a list
    of category paths of the context (seed them with the context's
    `categories[]`), selected in that order; `coverImage` `{file,
    altText?}`, "Cover Image" and its alt-text box under the submission's
    locale (an image fixture, e.g. `profile-image-400.png`, uploaded as
    the box uploads it and moved to the context's public files as
    `submission_{id}_{publicationId}_coverImage_{locale}.png`); `urlPath`,
    "URL Path"; `datePublished` (`YYYY-MM-DD`, U17), the page's date box
    under "Publication Timing" (OJS "Publication Date", OPS "Date
    Posted"; OMP "Date Published" on "Catalog Entry", below).
  Every refusal is the page's own, a 400 naming the key: a URL Path that
  is a number, has other characters, or is another submission's; a locale
  the submission's metadata languages lack; an unknown or repeated
  category path; a cover that is not an image; a date not written
  `YYYY-MM-DD` or not in the calendar (`2024-3-5`, `2024-02-30`, a
  number). The keys need
  `submitted: true` (a draft has no publication pages) and do not read
  the context's Metadata items or its "Article Number" setting, which
  only decide what the pages offer: the landing page shows what is
  stored, so a term list seeded on a context with the item off is the
  "switched off, terms kept" state (seed `metadata` too for the offered
  one). With `published: true` the values are the published version's.
  A seeded version reads as a typed one on each page (the same chips,
  categories, cover preview and alt text, URL Path) and in the rows,
  which equal the screen's, the Activity Log's one "metadata updated"
  line per page saved included. OMP takes `categories` (U16
  harness, 2026-09-25), `datePublished` (U17) and `urlPath` (U70) alone: a press keeps its categories on the workflow's
  "Catalog Entry" page, whose "Categories" field is the same picker, and
  the seed saves it as that page's "Save" does (the same PUT to the
  publication; the page posts its whole form, `seriesId`,
  `updateType=new_version` and the other boxes as shown, and the stored
  rows equal the seed's, its one "metadata updated" line included), so
  the page reopens with one chip per category, a sub-category named by
  its line of parents ("Parity Top > Parity Child"), and "Date
  Published" is saved in the same PUT. OMP's `urlPath` is the same
  page's "URL Path" box, saved in the same PUT (the page posts its
  whole form, `…&updateType=new_version&summaryOfChanges[en]=&coverImage[en]=&urlPath=…`;
  the stored version and its one "metadata updated" line equal the
  seed's), and refused as the page refuses it: a path another book of
  the press has is a 400 carrying the field's own "The URL path has
  already been used and can not be used again.", the page's notice
  "Go to URL Path: …" (U70 harness, 2026-09-27). A test of that
  refusal seeds the first book with the path and types it on the
  second. OMP also takes `subtitle`, `plainLanguageSummary` and
  `keywords` (U69 harness, 2026-09-28): the press's "Title & Abstract"
  and "Metadata" pages are the journal's (the same lib/pkp forms and
  PUT; the screen posts `prefix[en]=&title[en]=…&subtitle[en]=…&abstract[en]=…&plainLanguageSummary[en]=<p>…</p>`
  and `keywords[en][0][name]=…&type[en]=`), and the stored values, the
  keyword entries, the two "metadata updated" lines and the reopened
  pages equal a by-hand save. "Plain Language Summary" is on the page
  only with the press's `metadata.plainLanguageSummary` on, which the
  key does not read, as on a journal. On the book's page the subtitle
  follows the title after a colon, the keywords read "Keywords: alpha,
  beta gamma" and the summary sits under "Plain Language Summary". OMP
  answers 400 on every other key of this list (the cover on the
  "Catalog Entry" page, `subjects`, `disciplines`,
  `supportingAgencies`), which no parity drive has read there. On all three apps the placement is typed after the submit,
  so it is a category added after arrival, after the submit's editor
  assignment has run. Right after a seed of two books `published` with
  `categories`, the press's category page reads "0 Titles"; the U16
  spec's Rule 8 puts the listing after the queued jobs have run.

  `datePublished` is the publication date a published item carries
  (U17 harness, 2026-09-25, three apps driven): without it a publish
  stamps today; with it, `published: true` keeps the typed date, as the
  screen's publish keeps a date saved on the page first (each app's
  `setStatusOnPublish` stamps today only on an empty date). So a list
  ordered by publication date (OPS "Archives", a section's page) is
  seeded by giving each item its own day. The seeded version reads as the
  typed one: the date box reopens with the date, the status reads
  "Published" (OPS "Posted"), and the landing page shows it (OJS and OPS
  "2024-03-05", OMP "March 5, 2024"; each with "2024-03-05 (Version of
  Record 1.0)", OPS "(Author Original 1.0)"). Without `published` the
  date sits on the unpublished version, as a saved but unpublished box
  leaves it. The version's `copyrightYear` is the publish year, not the
  date's (a scratch context's copyright-year basis), on the seed and the
  screen alike. A date after today with `published: true` gives a
  scheduled version on OMP and OPS (`status` 5; the app's own publish
  schedules it, not driven on screen; the response's `stageId` stays
  the stage before the publish, OMP 1, OPS 5); on OJS a seed without
  `issue` publishes at once whatever the date.

App-specific keys:

- OJS: `section` (abbrev; defaults to the journal's first section) and
  `issue` (`{volume, number, year}` matching a seeded issue, used when
  `published` is true). `published: true` into an issue not yet published
  gives a scheduled article (status 5, the workflow's "Assign To Future
  Issue and Schedule Only"), not a published one; an article published at
  once into a future issue comes only from the workflow's "Assign To
  Future Issue and Publish Immediately" (U10 claim check K2, 2026-09-24).
  Such a seeded scheduled article is stored at the Submission stage (with
  a DOI when DOIs are on), where the workflow's own scheduling leaves it
  in Production: the DOIs page lists it only through its DOI and drops it
  once the DOI is cleared (U45 claim check K3, 2026-09-26).
  When "Publish Issue" publishes that issue later, the article keeps
  today as its own publication date, not the issue's "Date Published"
  (U51 claim check K1, 2026-09-25).
  `accessStatus` (U51): `open` is the article's "Open Access" box ticked
  on its issue's "Table of Contents" tab after the publish
  (`issueDefault`, unticked, is how every article arrives). The column
  is there only on a journal that requires subscriptions, in an issue
  whose "Access status" is "Subscription", so the key needs `issue`,
  `published: true` and both of those, or it is a 400.
- OMP: `series` (path) and `seriesPosition`, both optional; `workType`
  (`monograph`, the default, or `editedVolume`); and per review round
  `stage: internal | external` (default external).
- OMP: `featured[]` and `newRelease[]` (U70), the Catalog page's
  "Featured" and "New release" boxes of this book, pressed after the
  publish by the press manager, one entry per press, in the order given
  (`featured[]` first): `{in: 'catalog'}` with no filter, `{in:
  'category', path}` with that category chosen under "Filters" ("Featured
  in category"), `{in: 'series', path}` with that series chosen
  ("Featured in series"). Each press is the box's own post
  (`_submissions/saveDisplayFlags` with the book's stored lists plus the
  new one at `seq` 1), run through the controller's action, which
  rewrites the book's rows and renumbers the list from 1. A `featured[]`
  entry may add `position` (1 = first): then "Order Features", the book
  moved to that place among the list's featured books as the page lists
  them, "Save Order" (`saveFeaturedOrder`, the list renumbered from 0).
  Without `position` a newly featured book's place is not fixed, as with
  a press of the box: first or second while the list was last renumbered
  by a box press (the new row and the first one share `seq` 1), second or
  third once a `position` or a "Save Order" has renumbered it from 0
  (spec Rule 11; U70 claim check K3-8). A test that needs a fixed
  featured order gives each book its `position` (seeded one after the
  other: 1, then 1 or 2, …).
  Refusals (400): either key without `published: true`, or on a book
  whose "Date Published" lies after today (scheduled, off the list); an
  unknown `in`; a `path` on `catalog`; a category `path` not among the
  book's `categories`, a series `path` other than its `series` (the
  filter lists the book only once it is placed there); two categories
  or two series in one key (the box cannot hold that, spec A4); a
  `position` on `newRelease[]`, below 1, or past the list's featured
  books. The seeded rows, the Catalog page's boxes and order, the
  public catalog's order and "New Releases" equal a by-hand run of the
  same presses in the same order (U70 harness, 2026-09-27). To test
  "flags kept" after an unpublish, seed the flags on a published book and
  unpublish on screen.
- OMP: `enableChapterPublicationDates` and `chapters[]` (U72), built by
  `admin` on the version after the publication formats and before a
  publish (publishing fills chapter licenses and makes chapter DOIs, so
  a `published: true` seed carries both, as a screen publish does).
  - `enableChapterPublicationDates` is the editorial view's "Marketing" ›
    "Publication Dates" choice saved: `true` "Each chapter may have its
    own publication date.", `false` "All chapters will use the
    publication date of the monograph." (the page's PUT to the
    submission). It needs `submitted: true`. A new book stores no choice
    and the page opens with neither option selected.
  - Each `chapters[]` entry is one "Add Chapter" window on the Chapters
    page, "Save", in list order, so the chapters are numbered in that
    order: `title` (required), `subtitle` and `abstract` (a string under
    the submission's language, or a locale map over the press's form
    languages; typed abstract text is posted as a paragraph), `pages`,
    `datePublished` (`YYYY-MM-DD`; the box shows only with
    `enableChapterPublicationDates: true` in the same request),
    `licenseUrl` (the box shows on `workType: 'editedVolume'` only),
    `page` (the "Chapter Page" box, default unticked), `authors` and
    `files`. `authors` are the "Add Contributor" boxes ticked: the
    submitter's username (their own entry, which exists when they submit
    as an Author) or a `contributors[]` address. The window lists the
    contributors in their list order and saves the ticked ones in it, so
    `authors` names them in that order (the submitter first); another
    order is a 400, since only the page's "Order" makes it. `files` are
    the "Files" boxes ticked: `files.N` (a root `files[]` entry, such as
    one of `genre: 'Chapter Manuscript'`) or `publicationFormats.N` (that
    format's proof file); a file names one chapter at most, as the
    window offers a held file to no other chapter. On the book page a
    format file a chapter holds is listed under that chapter in the table
    of contents and left out of the side column's formats.
  - The window's other boxes are posted as it posts them: every language
    box, an untyped one empty; "Date Published" and "License URL" empty
    where shown and not given. So a seeded chapter has the same rows as
    a by-hand one (U72 harness, 2026-09-28, driven): its settings (an
    empty box stores an empty row), its author links numbered from 0 in
    the ticked order, its file links, and no Activity Log line, no email
    and no Tasks entry. It reads the same on the Chapters page and in its
    reopened window. After a publish the chapter with an empty "License
    URL" carries the version's "Default Chapter License URL", itself
    filled from the version's own license (the press's) when empty (a new
    or scratch press has no license and the context scenario refuses
    `licenseUrl`, so the license is saved on screen first, seed-facts.md), and
    a chapter with "Chapter Page"
    ticked on a press with chapter DOIs has its DOI and the note "(This
    chapter will always be shown on its own page because it has a DOI.)".
  - Refusals (400): a missing title; `datePublished` without
    `enableChapterPublicationDates: true`, or not a calendar day;
    `licenseUrl` on a Monograph; `enableChapterPublicationDates` on a
    draft; an author that is neither the submitter nor a
    `contributors[]` address, one named twice or out of list order; a
    `files` entry past its list, a format without `file`, or a file
    named by two chapters. OJS and OPS answer 400 on both keys.
  - Facts: the window's "Files" list is ordered newest first by upload
    time, and files seeded in one request share their upload second, so
    their order among themselves in that list is not fixed; read the
    boxes by file name. The response lists `chapters` (`id`, `title`, in
    the order seeded), OMP only.
- OMP: `audience` and `representatives[]` (U74), the editorial view's
  "Marketing" › "Audience" and "Representatives" pages, which belong to
  the book, not to a version. Built by `admin` after the publication
  formats, with the formats' `salesRights[]` and `markets[]` (above),
  before a publish. Both need `submitted: true`. OJS and OPS answer 400.
  - `audience` `{audience?, rangeQualifier?, rangeFrom?, rangeTo?,
    rangeExact?}`, at least one: the page's lists "Audience", "Audience
    Range Qualifier", "Audience Range (from)", "(to)", "(exact)", each by
    the label it shows (`"Children (02)"`, `"US school grade range
    (11)"`, `"Kindergarten (K)"`), then "Save": the page's PUT to the
    submission with all five, an unchosen one empty (stored as no row).
    A new book has none; the page reopens on the seeded choices.
  - Each `representatives[]` entry `{type, role, name, idType?,
    idValue?, phone?, email?, website?}` is "Add Representative", "OK":
    `type` `'agent'` or `'supplier'` ("Representative Type"), `role` by
    the label of that type's list (`"Exclusive sales agent (05)"`,
    `"Distributor to end-customers (12)"`; the other type's roles are a
    400), `name` required; `idType` by its label, the window's "GLN
    (06)" when absent; `idValue`, `phone` as typed; `email` and
    `website` ("Email Address", "Website") refused (400) when the box
    would refuse them (not an address; a website not starting
    `http://`, `https://` or `ftp://`). The page lists them under
    "Agents" and "Suppliers" in request order. The response lists
    `representatives` (`id`, `name`, `type`).
  - Parity fact (U74 harness, 2026-09-28): the window arrives on
    "Supplier" with both "Role" lists shown and the Agent one required,
    so "OK" on a Supplier refuses "This field is required." until
    "Agent" and then "Supplier" are chosen; a test adding a supplier on
    screen chooses them in that order.
- OPS: `section` (abbrev or path; defaults to the server's first section).
  `reviewRounds` is rejected with a 400, because OPS has no review stage,
  and so is `reviewerSuggestions`, because OPS mounts no reviewer
  suggestions and its wizard has no such step, and `files`, because a
  preprint server shows no workflow file list.
- OMP: `galleys` is rejected with a 400, because a press has publication
  formats and no "Galleys" page (`publicationFormats[]` above is the
  press's counterpart; OJS and OPS reject that key the same way).
- OMP and OPS: `jats` is rejected with a 400, because only a journal has
  the "JATS XML" page.

Facts tests rely on, all parity-checked against the UI path:

- A submitted seed carries the same notifications the real submit endpoint
  creates, and the submitter is the publication's primary contact.
- Seeded submissions carry no files unless `files[]` or
  `reviewRounds[].files[]` names them (a `galleys[].file` or
  `publicationFormats[].file` proof file, `mediaFiles[]` and `jats.file`
  aside). A test whose behavior under test is the upload itself uploads
  through the panel under test. The wizard's required-genre check blocks a
  seeded draft's submit until a file of the required component is on it.
  Review-round files are also grant-based; see `patterns.md`: a reviewer
  seeded on a round before the file existed is not given it.
- A real wizard submit auto-assigns the section's editors on
  `publicknowledge` only (the install's first context; a scratch context
  gets none, `seed-facts.md`), so `participants` on a submitted seed is
  additive there. Seeding `participants: []` together with
  `submitted: false` is what produces a genuine needs-editor state.
- A seeded participant is not everything the screen's "Assign" leaves
  (U35 harness, 2026-09-22, three apps): the submission's Activity Log has
  no "participantAdded" line for it, and an editor seeded on a submitted
  seed leaves the "needs an editor" task rows
  (`NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED`, one per manager) in
  place, where the screen's "Assign" of an editor deletes them. A test
  about the task, the log line or the "Needs editor" state assigns the
  editor on screen.
- An author-editor state needs a user enrolled in both groups who is also
  the submitter; a bare stage assignment without the global author role
  does not trip author checks. A second `participants` entry for the same
  user rides on `build()`'s firstOr semantics ("Decision behaviour worth
  knowing" below). On a scratch context, such a user in `participants[]` as
  `sectionEditor` with throwaway `externalReviewer`s in
  `reviewRounds[].reviewers[]` reaches U38 Rule 9's state on OJS and OMP
  (U38 claim check, 2026-09-23).
- Seeded reviewer suggestions sit where the wizard's do: the editor's
  workflow lists them under "Reviewers Suggested by Author" on the
  Submission stage with no row action, and on a review round with a
  "<name> More Actions" menu on each row. On a seeded draft the wizard
  still opens on "Upload Files"; its "Reviewer Suggestions" step is the
  fifth, four "Continue"s on.
- Seeded comments read on screen as by-hand ones do (U14 harness,
  2026-09-16, OJS driven, OMP and OPS read): the writer sees a pending one
  under "Your comment will be visible when the editor approves it" and
  everyone the approved ones, the sidebar's "All Comments (N)" counting the
  approved ones only; the Comments page lists each with its Status cell
  ("Hidden/Needs Approval", "Approved", "Approved, Reported"), and the
  moderators' Tasks panels carry the rows. Two timing facts: every comment
  of one seed shares its `created_at` second, so the on-screen order among
  them (newest first) is not fixed, and a seeded approval is stamped in
  the comment's own second where a by-hand one lands later.
- Seeded discussions and tasks read on screen as by-hand ones do (U37
  harness, 2026-09-23, three apps): the rows under "Yet to begin" or "In
  progress", "Created by: {username}" or "Task Owner: {username}", the
  Due Date. A task seeded with a past `dateDue` reads as overdue: the
  row stays in its group with "This task is overdue. Remind the task
  owner to complete it as soon as possible" first in "Activity", and its
  window's badge reads "Overdue". Items seeded in one request share their
  `created_at` second, so the panel's oldest-first order among them is
  not fixed: a test that asserts order seeds them in separate calls.
- A seeded galley reads on screen as a by-hand one does (U33 harness,
  2026-09-19, OJS and OPS driven): the "Galleys" page lists it as
  "<label> <language>" with the row's menu, and on OJS the assigned
  editor's "Assign a user to create galleys…" / "Awaiting Galleys." notice
  is gone from the Production entry, the galley row being what the notice
  logic counts (a remote galley counts too). A seeded submission with no
  `galleys` keeps the notice, as before.

The response returns `tag`, `submissionId`, `publicationId`, `stageId`,
`status`, `submissionProgress`, `reviewRounds[]` (`id`, `round`, `stageId`),
`reviewAssignments[]`, `reviewerSuggestions[]` (`id`, `email`), `dataCitations[]` (`id`, `title`),
`userComments[]` (`id`, `user`, `approved`, `reports[]` of report ids, in
the order seeded), `galleys[]` (`id`, `label`, `submissionFileId`, null
for a remote galley), `files[]` (`submissionFileId`, `file`,
`fileStage`, `reviewRoundId`, null on "Submission Files", and `uploader`;
the root entries in order, then each round's), `tasks[]` (`id`,
`title`, `type`, `stage`, in the order seeded), `libraryFiles[]` (as
the context's), `mediaFiles[]`, `publicationFormats[]`, `jats`,
`contributors[]` and, on OMP with the key, `chapters[]` (above). `stageId`
is the submission's stored stage after the build, not the stage the screen
names: on OPS `published: true` leaves it at 6 (`WORKFLOW_STAGE_ID_DONE`,
the posted state), while an unposted preprint reads the Production stage's
5 (U31, 2026-09-06). It does not echo the title: a test that matches
the submission by title keeps the value it sent. On a scratch context the
seeded submission sits in no editor's `assigned-to-me` view (the default
Editor Dashboard view) until someone is assigned; list it under the "active"
view or assign a participant.

Implementation: `shared/php/api/v1/_test/PKPTestController.php` and the
builders in `shared/php/classes/testing/` (`PKPBootstrapSeeder`,
`PKPContextScenarioBuilder`, `PKPSubmissionScenarioBuilder`, `Spec`,
`UserSeeder`, `ContextFactory`, `LibraryFileSeeder` (both `libraryFiles[]`
keys), `SiteSettingsSeeder` (`POST site`, app-neutral, no subclass),
`PKPUsageStatsSeeder` (every `usage[]` key; each app's
`UsageStatsSeeder` adds its line fields, its work page and, on OJS, the
issue and JATS visits), and
`ApiCall`, which runs an app API
controller's own action on the JSON body a screen sends, for the keys
that save through one). Each app subclasses them under
`apps/<app>/php/api/v1/_test/` and `apps/<app>/php/classes/testing/`. The
JavaScript client is `pkpApi` in `shared/playwright/support/api.js`
(`bootstrapProbe`, `bootstrap`, `createContext`, `createSubmission`,
`setSite`).

## `POST site`

Sets the site's own settings, the one record every context, worker and
fleet shares, the way Administration › Site Settings saves them: the
tab's "Save" sends `PUT index/api/v1/site`, whose request turns each empty
string into null before the site service's own validate and edit, and a
locale left null has its row deleted. The client is
`pkpApi.setSite(spec)`. The body names at least one key (`{}` is a 400);
any other key is a 400.

- `title` (U60): "Site Setup" › "Settings" › "Site Name". A locale map
  (`{en: "…", fr_CA: "…"}`) or a bare string for the site's primary
  locale (`en`). The map is the whole field: a site locale it does not
  name is emptied, as the tab's other language box left empty is (the
  tab posts `title[en]=…&title[fr_CA]=` with the French box empty), and
  `""` or null empties a locale. `title: ""` is the install state, no
  `title` row at all, which the tab itself cannot return to: its "Save"
  refuses an empty Site Name ("This field is required.", nothing sent),
  while the service does not check the site's own required fields (U60
  A4). A French-only map is stored for the same reason. Refusals (400):
  a locale the site lacks (`title.de`), a number, a list, a non-string
  locale value. The response is `{title: {locale: text}}`, `{}` when
  empty.
- `enableGeoUsageStats`, `enableInstitutionUsageStats`,
  `isSushiApiPublic` (U64): "Site Setup" › "Statistics": "Geographical
  Statistics", the radio's value (`disabled` "Do not collect any
  geographical data", `country`, `country+region`,
  `country+region+city` "Collect the visitor's country, region and
  city"); "Institutional Statistics" › "Enable institutional statistics"
  (`true` ticked); "Public API" (`true` "Make the COUNTER SUSHI
  statistics publicly available", `false` "Restrict access to the
  COUNTER SUSHI statistics API to managers and admins"). The install
  values are `disabled`, `false` and `true`. The tab's "Save" posts its
  seven fields together (form-encoded, the boxes as `true`/`false`); the
  key saves the named ones and leaves the others as stored, which is
  what the tab posts for them. Anything else (another radio value, a
  string for a boolean) is a 400. The response adds each named key with
  its stored value. Parity-checked on the three apps (U64 harness,
  2026-09-27): the rows equal the screen's, the tab reopens the same, and
  the journal's Settings › Distribution › "Statistics" tab shows the same
  fields.
- `counterR5StartDate` (U64): no screen sets it. It is the site setting
  the upgrade from 3.3 to 3.4 writes (its own day); a fresh install has
  no row, and the app then counts from the day 3.4 was installed, the
  fleet's reset day. A `YYYY-MM-DD` day from 2001-01-01 to today, or
  `""` / null for no row (the install state). "Counter R5" and the SUSHI
  API offer the whole months from the month after the later of this day
  and the context's first publication date, up to last month. So on a
  fleet as reset, every context shows "There are no COUNTER R5 usage
  statistics available yet." and every "Download" is refused; with
  `counterR5StartDate: '2026-05-01'` and a work published before it, the
  "PR" window opens on 2026-06-01 to the end of last month and downloads
  the figures of those months. A COUNTER figure therefore needs `usage[]`
  visits in a whole past month after both dates. Refusals (400): an
  impossible or badly shaped day (`2026-02-30`, `2026-05`), a number, a
  day after today or before 2001-01-01. The response adds
  `counterR5StartDate`, the stored day or null. Parity-checked on the
  three apps (U64 harness, 2026-09-27) against the upgrade's own insert:
  the same row, page, window and download.
- `isSiteSushiPlatform`, `sushiPlatformID` (U64): "Site Setup" ›
  "Statistics" › "Sushi Protocol": the "Platform" box ("Use the site as
  the platform for all journals.", "…presses.", "…servers."; `true`
  ticked) and the "Platform ID" text box (a string; `""` or null for
  none, no row). The install values are `false` and null (an
  `isSiteSushiPlatform` row `0`, no `sushiPlatformID` row). The tab posts
  both fields on every "Save", the hidden "Platform ID" too, so naming
  one sends the other's stored value beside it: `isSiteSushiPlatform:
  false` alone keeps a stored ID, which the next tick shows, as the tab
  does. The site service refuses (400, `specKey: sushiPlatformID`) what
  the tab's "Save" refuses: "Platform" ticked with no ID ("A platform ID
  must be required when the site will be identified as the SUSHI
  platform."), and an ID other than 1–17 letters, digits, "_", "." and
  "/" ("This is not formatted correctly."), ticked or not. A refused
  request stores nothing, as a refused "Save" does. A non-boolean box or a non-string ID is a 400 too. The response
  adds both keys, the ID null when absent. COUNTER reports name the site
  as their platform only while the site has a `title`; without one they
  keep the context's name. Parity-checked on the three apps (U64 harness,
  2026-09-27): the rows, the tab as it reopens and a "PR" download equal
  the screen's, both ways.

- Every fleet starts with no Site Name, and every shipped suite reads
  the site that way: the site's home page has an empty browser title and
  an empty hidden heading, its header shows the application's logo (alt
  "Open Journal Systems", "Open Monograph Press", "Open Preprint
  Systems") linked to the site's home, and the Administration screens'
  editorial header reads the application's name as plain text, their
  browser tabs "Site Settings | Open Journal Systems". U19 asserts the
  site-wide OAI "Repository Name" is empty, and the site's own emails
  print the name where `{$siteTitle}` stands. With a name, all of these
  show it (the editorial header as a link).
- The site's address opens the only context while the install has one
  (a freshly reset fleet has `publicknowledge` alone): a test that reads
  the site's own home page seeds a scratch context first.
- A test that sets `title` changes what every test reading a site page
  sees, and the serial project runs up to four workers: it carries
  `@solo` (harness.md "Project chain", as U08 S8 does) and puts back
  `title: ""` in a `finally`, even when it fails midway. The same holds
  for the "Statistics" keys: every context reads them (a geographical
  level decides what every journal's Settings › Distribution ›
  "Statistics" tab and "Download Report" window show, and `usage[]`
  refuses a place without one; `isSushiApiPublic: false` closes every
  journal's SUSHI address), so a test that sets one is `@solo` and puts
  back `enableGeoUsageStats: 'disabled'`, `enableInstitutionUsageStats:
  false`, `isSushiApiPublic: true` in a `finally`. So is a test that
  sets `counterR5StartDate` (every context's "Counter R5" months follow
  it): it puts back `counterR5StartDate: null`, no row. So is a test
  that ticks "Platform" or types a "Platform ID", on screen or by key
  (every context's COUNTER reports read them): it puts back
  `isSiteSushiPlatform: false, sushiPlatformID: null` in one request,
  by key rather than by the tab: a malformed ID left in the hidden box
  refuses every later "Save" of that page (U64 A10), and a request never
  meets that page state. The request
  reads the site row under the same lock as the context scenario's
  `bulkEmails`, so the two never write each other's value out (four of
  each at once over two servers, U60 harness).

## `POST scenarios/job`

One job of the test's own on Administration › "View Jobs" or "View Failed
Jobs" (U61). The client is `pkpApi.createJob(spec)`. The job is lib/pkp's
own queue smoke-test job, `PKP\jobs\testJobs\TestJobFailure`, which waits
on its own queue, `queuedTestJob`, and fails for good on its one try. Its
two states are the two steps of the app's own smoke test:

- `state` (required): `'queued'` is `php lib/pkp/tools/jobs.php test
  --only=failed`, the job dispatched and left waiting; `'failed'` is that
  step, then `jobs.php run --test` for that one job: the app's queue
  worker reserves it, runs it and fails it, and the app stores the failed
  job. Any other value, or any other key, is a 400.

The response is `{state, id, uuid, queue, connection, displayName}`. `id`
is the number in the page's "ID" column: the waiting job's on Jobs, the
failed job's on Failed Jobs, where the "Details" page's address ends in it
(`index/admin/failedJobDetails/{id}`). The two pages then show the row the
command line's job shows, cell for cell: "Job"
`PKP\jobs\testJobs\TestJobFailure`, "Queue" `queuedTestJob`, "Attempts"
`0` or "Connection" `database`, and the Details page's payload and error
("Test failure job") the same (U61 harness, three apps).

Facts a suite meets:

- No drain runs the testing queue: the fleets' job runner is off,
  `runJobs()` runs the default queue only, and `GET _test/jobs`, the count
  `runJobs()` waits on, leaves `queuedTestJob` out. A waiting test job
  (seeded, or put back by "Try Again" or "Requeue All Failed Jobs") stays
  on the Jobs page for good and never holds up another suite's drain.
- The Jobs and Failed Jobs pages list every job of the install (all
  tests, all workers), 50 to a page in no set order. A test finds its row
  by the returned `id`, never by position or by a total.
- "Requeue All Failed Jobs" puts back every failed job of the fleet,
  other suites' included (a deposit that failed on the dead proxy goes
  back on the default queue, and a later `runJobs()` fails it again). A
  test that presses it, or reads an empty Failed Jobs page, runs in the
  serial project with `@solo`.
- A key call does not wait for a runner and needs none: the builder runs
  outside the seeding transaction and mail fake (the queue inserts a job
  only after a transaction commits), and a failed build deletes its job.

## `POST scenarios/task`

One run of a routine ("scheduled") task. The client is
`pkpApi.runTask(spec)`. `task` names it: `'updateIPGeoDB'` (the
default, U61, the next paragraphs) or `'statisticsReport'` (U65, the
monthly editorial statistics email, below); any other value is a 400.

`updateIPGeoDB`: a run that ends in error, with its log file and its
report email (U61).
The task is lib/pkp's `PKP\task\UpdateIPGeoDB`, "Update DB-IP city lite
database", registered in all three apps. It ends in error at its first
step on every test install, because its download goes through the dead
local proxy (`harness.md`), and it writes nothing but its log. The run is
the one `php lib/pkp/tools/scheduler.php test
--name='PKP\task\UpdateIPGeoDB'` makes.

- `result` (required): `'error'`. Any other value, or any other key, is
  a 400 (a run that ends well sends no email under the install default).

The response is `{result, task, name, processId, logFile}`. Unlike every
other key, the email is sent for real, so it reaches Mailpit: to and from
the site's principal contact (`admin@mail.test`, named after the
application, "Open Journal Systems"), subject
"Update DB-IP city lite database - {processId} - Error", body "Your Open
Journal Systems installation automatically executed and finished this task
and you can download the log file here: {link}" (a press and a preprint
server name their own application). The link is
`…/index.php/index/en/admin/downloadScheduledTaskLogFile?file={logFile}`
on the server the seed request went to (a suite's own worker server); the
command line's run names the config's `base_url` there instead. Opened as
`admin` it downloads the log file, four lines: the base URL, "Task process
started.", the cURL error for the db-ip.com address, "Task process
stopped." (U61 harness, three apps, equal to the command line's run).

Facts a suite meets:

- The report goes to the site's principal contact, the same address for
  every test and fleet, so a test finds its email by the `processId` in
  the subject (`mail.find({to: 'admin@mail.test', subject: processId})`),
  never by recipient alone (PRINCIPLES A8).
- The log files live in `{files_dir}/scheduledTaskLogs`, which
  Administration › "Delete Task Logs" empties for every test at once: a
  test that presses it runs in the serial project with `@solo`, which
  runs alone, after every test that reads a log link.

`statisticsReport` (U65): lib/pkp's `PKP\task\StatisticsReport`,
"Editorial Report Notification", which the scheduler runs on the first
of each month and no screen starts, for ONE context, with the jobs it
queues run, so its emails reach Mailpit and its Tasks entries exist.

- `context` (required): the context's path. Any other key (`result`
  included) is a 400, as is an unknown path.

The task's own run goes over every enabled context of the install
(unchanged, so the recipients, the opt-outs and the date range are its
own), with its one job batch captured instead of queued; the named
context's jobs (StatisticsReportNotify, the Tasks entries, and
StatisticsReportMail, the emails) are then queued as one real batch on
the default queue and each is run by the app's queue worker, reserved by
id, inside the request. The other contexts' jobs are dropped: no other
context's editors are notified or emailed. A failed job fails the
request (500) and its rows are removed. The response is `{task, name,
context, contextId, dateStart, dateEnd, notified, mailed, jobs, batch,
processId, logFile}`: `notified` and `mailed` the usernames the task
chose for the Tasks entry and the email, sorted; `dateStart` and
`dateEnd` the first days of the previous and of this month (the range
the task passes to the figures).

What a run leaves, equal to the command line's run narrowed to the
context (`StatisticsReport::execute()` in a CommandLineTool, then `php
lib/pkp/tools/jobs.php run`; U65 harness, 2026-09-28, three apps):

- Recipients: every account of the context holding a manager-level or
  Section Editor (Moderator) role, `admin` among them (every scratch
  context enrols it as a manager), unless its Profile › Notifications
  "Statistics report summary." says otherwise (`users[].notifications`
  above): "Enable…" unticked gets nothing, "Do not send me an email…"
  ticked the Tasks entry alone. Authors get nothing. At
  `editorialStatsEmail: false` nobody (`jobs` 0). A disabled account
  is listed in `notified` and `mailed` (the task picks it) but gets
  neither, since both jobs skip it (U65 claim check K5, three apps).
- The email, one per recipient, from the context's principal contact:
  subject "Editorial activity for {Month}, {year}" (the previous month;
  "Preprint Server activity for {Month}, {year}" on a preprint server),
  the lines "New submissions this month: n", "Declined submissions this
  month: n", "Accepted submissions this month: n" (blank on a preprint
  server) and "Total submissions in the system: n", links to the
  context's `stats/editorial` and `stats/publications`, an Unsubscribe
  footer, and the attachment `editorial-report.csv`. Its links name the
  server the request went to (the command line's name the config's
  `base_url`, as for `updateIPGeoDB`). `admin@mail.test` receives one
  per run of every test, so a test reads its own throwaway recipients.
- Two `notifications` rows of type EDITORIAL_REPORT per emailed
  recipient (the Tasks entry, level task, and the email's unsubscribe
  row, level normal) and the Tasks row alone for a "Do not send me an
  email…" recipient. The Tasks panel lists "This is a kind reminder for
  you to check your publication's health through the editorial report."
  with no submission title.
- A finished `job_batches` row (2 jobs, 0 failed) and an empty queue.
- Its command-line twin (`.reports/`-style `StatisticsReport::execute()`
  then `php lib/pkp/tools/jobs.php run`) runs every job waiting on the
  install's queue, not only the report's (U65 claim check K5).

Facts a suite meets:

- Seed the figures first: a submission counts in the email's month
  only if dated there (`dateSubmitted` above, a day of the previous
  month).
- The run is scoped to its context and waits for no drain, so it may
  run in a parallel test. It reads every context of the install, so it
  takes longer as a fleet fills (0.45 s on a fleet of 19 journals).
- A serial test's `runJobs()` drain running at the same moment can
  reserve one of the run's jobs first; the request then waits for that
  job to finish (at most 120 s), and the side effects are the same.

## The base context has plain defaults

`publicknowledge` is seeded with the fixture data above (sections,
categories, issues, users) on top of the app's own install defaults, and
stays that way: no settings passthrough enriches it, and no test changes a
setting there. What those defaults are, screen by screen and dated:
`seed-facts.md`.

## Configuring a scratch context

A scenario that runs with a setting at its non-default end (TEMPLATE
"Coverage", its decision rule) gets a scratch context
from `POST scenarios/context` created with that setting through a
passthrough key, the way `orcid` works today. A passthrough saves what the
settings form's form-encoded POST would (values as strings, an emptied text
box as null: the app's schema refuses the PHP constants the form config
carries), and `psql <app>_test` is the parity ground truth (U21 harness
run, 2026-09-07). A key family the API does
not have yet is recorded in the list below with its shape, so it is built
once, the same way, for every feature that needs it; a built family leaves
the list.

## Field shapes not built yet

These keys do not exist. They are ideas recorded from an earlier harness.

- Submission: `reviewRounds[].reviewers[].files[]` (a reviewer's uploaded file, the
  "Attach Review Files" source, U30; U38 uploads it on screen at the
  reviewer's step 3); `reviewRounds[].reviewers[].status:
  'cancelled'` (U30, the readiness question); `reviewRounds[].revisionsUploaded`
  (the author's "Upload" is refused on a round where revisions were not
  requested, U30); `reviewRounds[].reviewers[].status: 'complete'` (the
  editor-confirmed "Mark as Complete" state the minimum-reviews count needs;
  `completed` is the reviewer's submit, U34); the remaining `files[].list`
  words, "Draft Files" and "Copyedited Files" (Copyediting; `list`
  seeds "Submission Files" and "Production Ready Files" only, U36, U73);
  `commentsForEditor`.
- Submission: OJS `issue` without `published` (the Publication Settings
  issue assignment of an unpublished article; the key applies only with
  `published: true`, so an unpublished article in an issue, or one whose
  Publication Settings must save on a journal with a published issue, is
  assigned on screen; U44, U13, U16 claim checks).
- Decision: `toAuthor`, `toReviewers`, `toEditor`.
- Context: an option to skip `admin`'s manager enrolment in the new context
  (every `createContext` enrols the site administrator as a manager; the
  "site admin with no manager role" state is reachable only through the
  screens: `admin` seeded in `users[]` with one more role ends its manager
  role on its own Users & Roles › Edit page and signs in again, seed-facts,
  U38 claim check 2026-09-23).
- Context passthroughs: `notifyAllAuthors` (Settings › Workflow › Emails
  "Notify All Authors", U30), `reviewerRecommendations[]` (Settings ›
  Workflow › Review "Reviewer Recommendations", U29), the remaining
  submission-intake settings (the checklist and the privacy statement,
  U58), `licenseUrl` (copied
  into a publication when it is published, so it must be set before a
  `published` seed; sync rr14, 2026-09-22), and an OJS issue's title or
  description (`issues[]` itself is built, U08, its cover too, U13).
- Context passthrough: `enableArticleNumber` (Settings › Workflow ›
  Submission › "Metadata", "Enable article number metadata"): the
  "Metadata" publication page offers "Article Number" only with it
  ticked; the submission key `articleNumber` does not read it (U13).
- Section: `sections[].hideAuthor` (OJS), the section form's "Omit author
  names for section items from issues' table of contents."; it is ticked
  on screen (U13 claim check K5, 2026-09-25).
- Galley of a dependent component: `galleys[].genre` refuses "Image" and
  "HTML Stylesheet" (400) as the galley upload wizard does not offer them,
  so no galley of either is seeded or uploaded (U13 claim check K2,
  2026-09-25).
- Named scenario fixtures (`submission-draft`, `submission-in-review`,
  `submission-in-round-2`, `submission-published`) and a typed scenario
  client. Until a suite shows the need, tests call
  `pkpApi.createContext()` and `createSubmission()` directly.
- An enriched second journal in the bootstrap fixture for the first
  reader-facing feature (article landing page, issues, catalog browse),
  rather than touching `publicknowledge` (maintainer, 2026-09-04).

## Decision behaviour worth knowing

- Decision constants are easy to misread. `Decision::PENDING_REVISIONS = 4`
  (not 1) and `ReviewRound::REVIEW_ROUND_STATUS_REVISIONS_REQUESTED = 1`
  (not 8). Grep before quoting.
- `requestRevisions` followed by `newExternalRound` overwrites round 1's
  status (reset to `PENDING_REVIEWERS` by `runAdditionalActions`). Read
  "round 1 closed with revisions" from the decision history, not from
  `review_rounds.status`.
- `NewExternalReviewRound` has two wizard steps (notifyAuthors and
  PromoteFiles), not one.
- The Copyediting notice ("Assign a copyeditor using the Assign link in the
  Participants list." / "Awaiting Copyedits.") shows only on a submission
  that reached Copyediting through `accept` from a review round; a
  `skipExternalReview` seed (or an on-screen "Accept and Skip Review")
  never shows it, so a notice scenario seeds `accept`. The box is read by
  its level-3 "Notification" heading, not by a `notices` selector. Seeded
  submissions carry no Copyediting files (`files[]` seeds "Submission
  Files" and "Production Ready Files" only), so a copyediting decision or list scenario
  uploads through the lists' own "Upload/Select Files" window or the
  Submission stage's "Upload" first. U32 claim check, 2026-09-18/19. On
  OMP an Internal Review acceptance (`acceptFromInternal` seeded, or
  "Accept Submission" on an internal round) shows none either; on either
  path without it, an "Assign" with the "Request Copyedit" message still
  brings "Awaiting Copyedits." (U32 claim check I28, 2026-09-28).
- The Production notice ("Assign a user to create galleys using the Assign
  link in the Participants list." on OJS; "Awaiting approval." on OMP)
  shows for an assigned editor after `sendToProduction` on both the
  `accept` and the `skipExternalReview` path, unlike the Copyediting
  notice above. U33 claim check, 2026-09-19.
- A user seeded in `participants[]` is not offered by that submission's
  "Assign" form (the form lists only users not yet assigned to the stage),
  so a scenario that assigns through the form seeds the user in the
  context and leaves them out of `participants[]`. U33 claim check,
  2026-09-19.
- `participants[]` with `role: 'sectionEditor'` seeds a Moderator on OPS.
  U33 claim check, 2026-09-19.
- On the Postgres test database a Participants "Assign" or "Notify" with a
  message typed and no predefined message chosen answers 500, so a script
  that types a message picks a template first. U35 claim check,
  2026-09-22.
- `Repo::stageAssignment()->build()` uses `firstOr`. Re-assigning the same
  user and role silently keeps the existing row and drops new flags such as
  `canChangeMetadata`. If a participant needs different flags from the
  automatic author assignment, use a different user as the submitter.
- A second `reviewRounds[]` entry builds round 2 with its reviewer, which
  is the one way to reach "Cancel Review Round" with a reviewer on it. A
  declined preprint (OPS) opens on its publication tab ("Title & Abstract"),
  with "Revert Decline" on the Production entry. A decision wizard opened
  by a hand-typed address without `ret` closes on "View Submission" and
  "View All Submissions". U34 claim check, 2026-09-20.
- "Request Revisions", "Resubmit for Review", "Accept Submission" and
  "Decline Submission" on a round with completed reviews carry a "Notify
  Reviewers" page, so a one-page read of them misses "Record Decision".
  The OJS reviewer wizard's step 3 needs `select[name="reviewerRecommendationId"]`
  set before "Submit Review" completes (silent otherwise; OMP has no list).
  The press's Production notice "Awaiting approval." is a level-3 heading
  of its own, not under a "Notification" heading. U34 claim check,
  2026-09-20.


## Mailpit

`pkpMail` (`shared/playwright/support/mail.js`, available as a fixture)
wraps Mailpit's HTTP API. Start Mailpit locally with
`brew services start mailpit`. The URL comes from `MAILPIT_URL` (default
`http://127.0.0.1:8025`).

Mailpit is one shared instance. Every parallel worker and all three fleets
write into the same inbox. The rules below follow from that.

- **Scope every read by a unique throwaway recipient** that names the app
  and the test, for example `u53top-omp@mail.test`. This is the only scoping
  the install supports: Mailpit tags do not exist here, because nothing sets
  `X-Tags`. `pkpMail` refuses any read without a recipient. Mailpit's
  `to:` search matches the To header only: a Cc or Bcc recipient is not
  found by it (U30 claim check K2).
- **`contains` is a content marker, not a scope.** It searches a substring
  in subject and body. Use it when the test controls some text in the
  message. It supplements the recipient scope and never replaces it. On a
  scratch context whose path is the seed tag, every mail carries the tag
  (the context name, the throwaway addresses), so `contains: tag` matches
  everything; use a phrase the test controls, such as the seeded title.
- **Pair every absence claim with a positive control.** Wait for a message
  you expect to arrive the same way, then assert that the target message did
  not. The control also bounds the wait, so the test never waits on
  silence. `expectNone` does this for you. The inbox-wide message count is
  no evidence of silence: at Mailpit's 500-message cap it never moves,
  so only a recipient-scoped read with a sent control proves that nothing
  went out (U14 claim check K4, 2026-09-16).
- **The cheapest positive control is a discussion.** It needs the opener's
  box plus one more of the stage's participants (one alone is refused with
  "At least two participants are required for a discussion."), and it
  mails every ticked box, the opener's included, so a no-mail control on an
  account never sends that control itself.

Note on the word "tag": everywhere else in these docs it means the seed tag
from `patterns.md`. Mailpit tags are a different thing and are not used.

The API:

- `find({to, contains, subject?, timeoutMs?, poll?})`: the canonical
  assertion. Polls Mailpit search scoped by recipient and content marker
  until a message matches, and returns the newest match. Default timeout
  20 s, poll 500 ms. `subject` goes into the query quoted whole, so a
  subject that itself carries quotes (`Your review for "{title}" has been
  cancelled`) matches nothing: pass a quote-free fragment or use `contains`
  (U34 tojs, 2026-09-20).
- `expectNone({to, contains, afterControl: {to, contains}})`: the negative
  assertion done right. Waits for the control message first, then asserts
  zero matches for the target.
- `count({to, contains, subject})`: number of matches for a recipient-scoped
  search. Use it for exactly-N claims after a bounding `find()`. An
  unbounded count proves nothing about silence.
- `inboxFor(email)`: a polling read of one recipient's inbox; prefer
  `find` for an assertion.
- `messageCount()`: total messages in the inbox, any recipient. Useful to
  assert that seeding produced no mail.
- `fullMessage(id)` and `extractLink(html, linkText)`: body access and
  click-the-link flows. `extractLink` handles single- and double-quoted
  hrefs.
