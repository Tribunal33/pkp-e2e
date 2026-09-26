# Users & Roles Reference

Everything about signing in: which user to log in as, what the passwords
are, how login caching works, and what the seeded journal contains.

Display names read "Firstname Role" (`admin` is "admin admin" on
screens and as a mail sender; "Site Admin" is only a scratch context's
default principal contact name). Emails are
`<username>@mail.test`.

**Three different role vocabularies appear in this work. Don't mix them.**

1. **PHP role constants** (`ROLE_ID_*` in
   `lib/pkp/classes/security/Role.php`). This is what the backend checks.
2. **Scenario role keys** (`users[].roles` in scenario POSTs). The seeder
   (`UserSeeder::resolveUserGroup()`) matches them against the app's default
   user groups.
3. **Roster labels** (the "Role" column below). Informal names for the
   seeded accounts.

## 1. PHP role constants

| Constant | ID | Notes |
|---|---|---|
| `ROLE_ID_SITE_ADMIN` | 1 | Site-wide. The group has a null context id |
| `ROLE_ID_MANAGER` | 16 | Journal manager: settings, users, plugins |
| `ROLE_ID_SUB_EDITOR` | 17 | Editor / section editor |
| `ROLE_ID_ASSISTANT` | 4097 | Copyeditor, layout editor, proofreader, funding coordinator, editorial board member |
| `ROLE_ID_REVIEWER` | 4096 | Peer reviewer |
| `ROLE_ID_AUTHOR` | 65536 | Author (also granted implicitly on submit) |
| `ROLE_ID_READER` | 1048576 | Any registered user |
| `ROLE_ID_SUBSCRIPTION_MANAGER` | 2097152 | OJS only. Not seeded in the roster |

## 2. Scenario role keys (per app)

Each app accepts only the keys of the user groups it ships. An unknown key
gets a 400 response that lists the whole set. That error is the cheapest way
to re-check these lists.

| App | Keys |
|---|---|
| OJS | `manager`, `editor`, `productionEditor`, `sectionEditor`, `guestEditor`, `copyeditor`, `designer`, `funding`, `indexer`, `layoutEditor`, `marketing`, `proofreader`, `author`, `translator`, `externalReviewer`, `reader`, `subscriptionManager`, `editorialBoardMember` |
| OMP | The OJS list without `guestEditor` and `subscriptionManager`, plus `volumeEditor`, `chapterAuthor`, `internalReviewer` |
| OPS | `manager`, `sectionEditor`, `author`, `reader`, `editorialBoardMember` only. No `funding`, no reviewer keys, no production assistants |

Traps:

- **There is no `reviewer` key.** Use `externalReviewer` (OMP also has
  `internalReviewer`).
- **`editor` is a manager-level role, not a sub-editor.** On the default user
  groups of a scratch journal, `editor` resolves to "Journal editor", which
  carries `ROLE_ID_MANAGER` (see `registry/userGroups.xml`). A throwaway
  user seeded with `roles: ['editor']` therefore passes manager-level gates
  such as canPublish and settings access. For a non-manager editorial role,
  use `sectionEditor`.
- **The site administrator has no scenario key.** The installer's `admin` is
  the only administrator; every suite depends on it.
- **Screens show the app's own label.** `sectionEditor` appears as "Section
  editor" in OJS, "Series editor" in OMP and "Moderator" in OPS.

## 3. The seeded roster

Per-app roles and permission levels for every account, generated from the
seed fixtures, plus the install defaults: `seed-facts.md`.

Home: `shared/playwright/data/users.js`. All 18 users are enrolled in
`publicknowledge`. `admin` is site-level and created by the installer. The
other 17 are created by the bootstrap seed. Usernames follow the pattern
`role.firstname`, with one account per permission archetype. The first
listed account for a role is the one the suites use.

OMP and OPS enrol only a subset of the roster; `seed-facts.md` "Users" has
the per-app enrolment.

| Username | Roster label | Use when you need… |
|---|---|---|
| `admin` | site admin | Admin console, multi-journal operations, plugins |
| `manager.maya` | manager | Journal settings, managing users |
| `editor.diana` | editor | A senior editor (also a section editor of both sections) |
| `sectioneditor.ana` | sectionEditor | Section editor for Articles (`ART`). The default pick |
| `sectioneditor.ravi` | sectionEditor | Section editor for Reviews (`REV`) |
| `sectioneditor.omar` | sectionEditor | Another Articles section editor. The designated account for recommend-only assignments (the flag itself is set per assignment). On OPS, deliberately assigned to no section, as a visibility control |
| `reviewer.julia` | reviewer | The default reviewer |
| `reviewer.paul` | reviewer | A second reviewer |
| `reviewer.amara` | reviewer | A third reviewer (Internal on OMP) |
| `reviewer.adam` | reviewer | A fourth reviewer (Internal on OMP) |
| `copyeditor.carla` | copyeditor | Copyediting actions |
| `copyeditor.sam` | copyeditor | A second copyeditor |
| `layouteditor.leo` | layoutEditor | Layout / galley production |
| `proofreader.pia` | proofreader | Proofreading actions |
| `author.alex` | author | A non-privileged author, for author-only permission gates |
| `author.bea` | author | A second author, for co-author and foreign-submission cases |
| `assistant.rita` | assistant | OJS/OMP: Funding coordinator, the one default assistant group WITH review-stage access (stages 1 and 3). OPS: Editorial Board Member, with NO stage access |
| `reader.rosa` | reader | A registered user with no role beyond reader |

**Why `author.alex` matters.** Every other seeded user with workflow access
also holds a manager or editor role, and those roles short-circuit
`canEditPublication`. Only the two author-only accounts make author-side
permission tests meaningful.

There is no pre-seeded subscription manager (an OJS-only role).
`reader.rosa` covers the plain-reader case.

## Password rule

`getPassword()` in `users.js`: `admin` has the password `admin`. Everyone
else has their username repeated twice (`editor.diana` becomes
`editor.dianaeditor.diana`). No seeded account is flagged
`mustChangePassword`.

**Maxlength trap.** The login form's password input carries
`maxlength="32"`, and the `sectioneditor.*` passwords are longer than that.
`LoginPage.fillPassword()` removes the attribute before filling, so tests
never hit the limit. Profile › Password's three boxes carry the same
`maxlength="32"`, and a scratch user's default password (the username
twice) can be longer: fill them the same way (U60 claim check K1).

## Login flow internals

`ensureAuthStateFor(browser, username, {baseURL})` in
`shared/playwright/support/auth.js` returns a storage state (cookies) for
`browser.newContext()`, minted fresh on every call:

1. `POST /api/v1/_test/session` with `{username}` (the test API key in
   `X-Test-Key`). The app registers the session server-side and answers
   with its cookie: one request, about 40 ms. Unknown users answer 404,
   disabled accounts 403, and the helper falls through.
2. Fallback: the login form posted over HTTP (the login page for its CSRF
   token, then `login/signIn`), and as a last resort the form driven in a
   browser page. Both cost a bcrypt verify at cost 12, which is why the
   endpoint exists.

A fresh session per test means impersonation flows (`signInAs`/
`signOutAs`), which migrate the session id and destroy the previous session
row, can never strand another test's cookies. Until 2026-09-14 the state
was cached in `.auth/<username>.json` and probed before every use.

How tests use it: `test.use({user: 'editor.diana'})` sets the default
identity (the `storageState` fixture in `base-test.js` wires it up).
`asUser()` opens extra authenticated contexts for additional actors.

## Bootstrap prerequisite

Auth only works after the setup project has run. It probes
`GET /api/v1/_test/bootstrap?context=publicknowledge`. When the install is
warm, that is a no-op. When it is cold, it runs `tools/installTest.php`,
which installs the schema on an empty DB, drops all tables and reinstalls
when it finds leftover install debris, and refuses any DB whose name lacks
"test". It then seeds `publicknowledge` and the 17 non-admin users from
`apps/<app>/playwright/fixtures/bootstrap.js`.

`npm run reset:<app>` forces a full cold bootstrap.

## The `publicknowledge` context

Its locales, sections, categories and issues per app are in
`seed-facts.md`. On OJS, Vol 2 No 1 (2015) is the unpublished issue; Vol 1
No 2 (2014) is the published back issue.
