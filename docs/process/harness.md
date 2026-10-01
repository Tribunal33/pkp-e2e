# Harness Guide

This file explains how the Playwright harness is laid out, configured and run.
One pkp-e2e repo covers OJS, OMP and OPS. Everything lives here and runs
against plain app checkouts named in the repo `.env`
(`OJS_ROOT`/`OMP_ROOT`/`OPS_ROOT`). `bin/mount.js` copies the few PHP overlays
into a checkout (see the README). Paths below are relative to the repo root.

Related files: test-authoring rules are in `PRINCIPLES.md`, coding
conventions and pitfalls in `patterns.md`, the seeding API and Mailpit rules
in `scenarios.md`, and the seeded identities in `users.md`; PKP's default
test dataset, which the dataset fleets load for issue reports, in
`dataset.md`.

## The two playwright layers

Every app has two Playwright layers.

**`apps/<app>/playwright/` holds the app's feature suites.** Every feature
test lives here, even when the scenario is common to all three apps.

```
apps/<app>/playwright/
├── tests/             # Spec files — flat, no subfolder taxonomy
│   └── serial/        # <app>-serial project — globally-scanning specs (queue drains etc.)
├── support/
│   ├── fixtures.js    # App test extension (api alias; feature fixtures land here)
│   ├── legacy.js      # (OJS, OPS) re-exports the shared legacy-jQuery helper
│   └── app.context.js # Capability map + seed.actors archetype map
├── pages/             # App-only POMs
├── fixtures/
│   ├── bootstrap.js   # Static seed for the base context (journal/press/server, 18 users, sections, …)
│   └── files/         # Upload fixtures
```

**`shared/playwright/` holds shared infrastructure only.** Base fixtures,
shared POMs, and the bootstrap and login smoke specs. Two directories are
not infrastructure but live here because they span all three apps: `probe/`
(the probe kit) and `checks/` (the kept claim-check scripts, one directory
per feature, run on demand and never by CI; `briefs/claim-check.md`).

```
shared/playwright/
├── tests/                   # bootstrap.setup.js (setup project), login.spec.js (smoke)
├── support/
│   ├── base-test.js         # The extended `test` fixture — start here
│   ├── auth.js              # ensureAuthStateFor — a session per call via POST _test/session
│   ├── api.js               # pkpApi — test-API client (bootstrap, createContext, createSubmission)
│   ├── mail.js              # pkpMail — Mailpit HTTP API wrapper
│   ├── jobs.js              # runJobs — drain the fleet's queued jobs (serial project only)
│   ├── legacy.js            # waitForJQueryIdle — legacy jQuery surfaces (grids, AjaxModals)
│   ├── motion.js            # disableMotion — animations forced to 0.01ms in every context
│   └── env.js               # loadEnv(appRoot) — .env.playwright parser (shell exports win)
├── pages/                   # BasePage, LoginPage, DashboardPage, EditorialDashboardPage, MySubmissionsPage, WorkflowPage
├── probe/                   # The probe kit (patterns.md "Probe kit"); scripts import it, tests never do
├── checks/<feature>/<chunk>/ # Kept claim-check scripts, re-runnable by a maintenance session (briefs/claim-check.md)
├── data/users.js            # The 18 baseline identities + getPassword()/getEmail()
├── reset.js                 # reset:<app> — drop+recreate DB, wipe files dir and the app's data caches
├── make-test-config.js      # generate config.test.inc.php from the app template (run through bin/with-app.js)
└── config-factory.js        # definePkpConfig({appName, appRoot, basePort}) — all three apps
```

The PHP side has the same split. Shared builders live in
`shared/php/classes/testing/` with the gated controller
`shared/php/api/v1/_test/PKPTestController.php`. Each app adds
`api/v1/_test/{index.php,TestController.php}`, `classes/testing/*` subclasses
and `tools/installTest.php` under `apps/<app>/php/`. `bin/mount.js` copies
all of it into the app checkout at its runtime paths (`lib/pkp/…` and the app
root), and the suite's fixture files
(`apps/<app>/playwright/fixtures/files/`) to `classes/testing/fixtures/`,
where a builder that stores a file the way an upload does reads them
(the submission `galleys[].file` key). Edit here, then re-run mount.

## The fleets

| App | Checkout | Base port | Test DB |
|---|---|---|---|
| OJS | `checkouts/ojs` | 8000 | `ojs_test` |
| OMP | `checkouts/omp` | 8100 | `omp_test` |
| OPS | `checkouts/ops` | 8200 | `ops_test` |

The checkouts are **self-contained clones inside this repo** (gitignored),
provisioned by `npm run fetch-apps` (`bin/fetch-apps.js`) from the pkp
remotes' `main`. The pkp remote is named `upstream` with its push URL
disabled, submodule push URLs included; the `jardakotesovec` fork is
`origin` and the push default, so a branch, rarely needed, can only go to
the fork (RUNBOOK step 10). `fetch-apps --update` moves
an existing checkout to the current upstream `main` and rebuilds the UI
bundle (`js/build.js`) when `lib/ui-library` moved; a bundle older than the
submodule makes retired UI defects reappear (U43 A13, 2026-09-04).

### The stable lines

Three more sets of checkouts sit beside the `main` ones, one per stable
branch. `stable-3_5_0` serves the daily regression hunt on that branch
(MAINTENANCE "The stable line") and driving 3.5 and `main` side by side.
`stable-3_4_0` and `stable-3_3_0` are an on-request tool, for when the
maintainer asks to walk a particular issue on 3.4 or 3.3 ("walk this
issue on 3.3"); no session drives them as a standing step, and an issue
report's "Affects" for those versions is read from the code otherwise.
No suite is meant to run on any of the three lines.

| Line | Checkouts | Base ports ojs/omp/ops (slot 0) | Test DBs | PHP | Node (JS build) | Overlays |
|---|---|---|---|---|---|---|
| `stable-3_5_0` | `checkouts/stable-3_5_0/<app>` | 9000/9100/9200 | `<app>_test_3_5` | system `php` (8.3) | system (22) | the `main` set, guarded |
| `stable-3_4_0` | `checkouts/stable-3_4_0/<app>` | 10000/10100/10200 | `<app>_test_3_4` | `/usr/bin/php8.2` | 16.20.2 | install and user tools only |
| `stable-3_3_0` | `checkouts/stable-3_3_0/<app>` | 11000/11100/11200 | `<app>_test_3_3` | `/usr/bin/php8.2` | 12.22.12 | install and user tools only |

- The registry is `LINES` in `bin/apps.js`. **`PKP_E2E_LINE=<line>` in
  front of any harness command points it at the line** (`mount`,
  `reset:<app>`, `fleet-prep`, `probe-servers`, `bin/probe.js`, the
  Playwright configs); unset means `main`, and `.env` is not involved.
  The port bands (`main` +0, 3.5 +1000, 3.4 +2000, 3.3 +3000, each plus
  the slot's shift, "Slots"), the files dirs (`checkouts/<line>/files/`) and the
  probe servers' pid files (`.reports/servers-<line>/`) are the line's
  own, so every line's servers stay up together. The server logs share
  `apps/<app>/playwright/.server-logs/`, told apart by port.
- `npm run fetch-apps -- --line <line> [--update]` provisions and moves a
  line, same remotes and push rules as `main`'s: the app on the branch
  tip of its `upstream`, its submodules (`lib/pkp`, `lib/ui-library`, the
  plugins) at the pointers that tip records, as for `main`.
- **Runtimes.** pkp tests 3.4 on PHP 8.1 and 8.2 and 3.3 on 7.3 to 8.2
  (the branches' `.github/workflows/stable-3_*.yml`; 3.3's `docs/README.md`
  says "PHP 7.3.x … 8.2.x"), neither on 8.3, so both run on PHP 8.2: the
  sury packages `php8.2-{cli,common,bcmath,bz2,curl,gd,intl,mbstring,opcache,pgsql,readline,soap,xml,zip}`,
  installed system-wide on the VM (2026-09-30); `/usr/bin/php` stays 8.3.
  A line's `php` in LINES makes `resolveLine()` put
  `checkouts/runtimes/shims/php8.2/` (a `php` symlink to the binary) first
  on `PATH`, so every child the harness spawns runs on it: the `php -S`
  servers, `installTest.php`, `jobs.php`, composer, the kit's
  `lineUser()`. `PKP_E2E_PHP=php8.3` (a name or a path) tries another
  PHP; a missing binary stops the command with a hint. The JS builds use
  the Node release pkp's workflow for the branch names (16 for 3.4, 12
  for 3.3), which `fetch-apps` downloads once from nodejs.org into
  `checkouts/runtimes/node-v<version>-linux-x64/` and puts on `PATH` for
  `npm ci` and `npm run build` only; the harness and Playwright stay on
  the system Node. `checkouts/` is gitignored, runtimes included. A new
  machine or slot without `php8.2` needs those packages (or a PHP 8.2
  build at `checkouts/runtimes/php8.2/bin/php`, which the lookup takes
  when there is no `php8.2` on `PATH`).
- **`PKP_CONFIG_FILE`.** None of the three branches honours it, so
  `fetch-apps` makes the one-line change `main` carries in the line's
  working tree, re-applied after every `--update`: 3.5 and 3.4 in
  `lib/pkp/classes/config/Config.php`, 3.3 in
  `lib/pkp/classes/config/Config.inc.php` (unnamespaced `Core::`). `git
  status` in the line's `lib/pkp` shows that one file modified; nothing
  else under the line's checkouts is edited (docs/tracking/app-changes.md
  row 14).
- **3.5: the `main` overlays.** On the line the install, the bootstrap
  seed and the context, user and submission scenarios work (2026-09-17,
  all three apps); two seed steps for `main`-only features are skipped
  there behind `method_exists` / `class_exists` (the task templates in
  `ContextFactory`, the contributor type and roles in
  `PKPSubmissionScenarioBuilder`). A scenario key that reaches another
  `main`-only class answers 500 naming it.
- **3.4 and 3.3: no `_test` API, no seed.** The overlays are written for
  `main`'s Laravel-routed API, which 3.4 (Slim handlers) and 3.3
  (`import()`, `.inc.php`, no `Repo`) do not have, so `mount` copies only
  `shared/php-lines/<line>/tools/`: `installTest.php` (the `main` install
  tool in the line's shape: a no-op on an installed database, a refusal
  naming `reset:<app>` on a half-installed one where `main`'s drops the
  tables, the same `admin`/`admin` account, locales `en` and `fr_CA` on
  3.4, `en_US` and `fr_CA` on 3.3) and `lineUser.php`
  (one user through the app's own classes, optionally with a role in a
  context). The setup project (so `fleet-prep`) only installs there; the
  install holds `admin` and nothing else, no `publicknowledge`, no
  roster. In a probe script the bag says so (`app.testApi` false,
  `app.primaryLocale`, `app.line`); `signIn()` drops the `/en` locale
  segment the two lines' addresses do not have; `app.api` answers 404.
  The kit stands in with two helpers: `lineScratchContext(app, page)` (the
  page signed in as `admin`) creates an enabled journal, press or server
  through `POST /api/v1/contexts` in the admin's session, the endpoint
  Administration › Hosted Journals › Create posts, so the admin becomes
  one of its managers as through the screens, then a manager of its own
  through `lineUser()`; it returns the path and the manager's username
  and password (the roster rule, the username twice). `lineUser(app,
  {username, contextPath, role})` adds another user (`manager`,
  `subeditor`, `assistant`, `author`, `reviewer`, `reader`). Anything more
  (sections, submissions, a second language on the context) is driven
  through the screens. Proven 2026-09-30 on the three apps of both lines
  (install, reset, servers, admin sign-in, a scratch context, the
  manager's sign-in): `shared/playwright/checks/harness/lines/lines.js`.
- Known gaps on 3.4 and 3.3: no scenario keys, so every state a walk
  needs beyond a context and its users is built through the screens; the
  validation variant (+90) is served, but nothing was driven through it;
  `drainJobs()` and the other kit calls that go through `app.api` do not
  work; no mailbox checks were made (the SMTP settings are the generator's,
  untested there).
- `bin/line-range.js` lists a line's commits since a baseline with each
  one's relation to `main` (same patch, adapted backport, stable-only).
- Provisioning and a walk, 3.4 shown (3.3 the same with its own names):

  ```bash
  npm run fetch-apps -- --line stable-3_4_0 [--update]
  PKP_E2E_LINE=stable-3_4_0 npm run mount
  PKP_E2E_LINE=stable-3_4_0 npm run fleet-prep -- --feature issues-3_4 --reset
  PKP_E2E_LINE=stable-3_4_0 PROBE_FEATURE=issues-3_4 PROBE_AGENT=x node bin/probe.js all shared/playwright/checks/harness/lines/lines.js
  ```

### Trying a fix

An issue report's recommended fix is tried before the report goes out
(REPORT.md "Proposed fix"). `bin/try-fix.js` applies it to this slot's
checkouts for the length of a walk and takes it out again:

```bash
node bin/try-fix.js apply shared/playwright/checks/issues/<slug>/fix.diff [ojs] [omp] [ops]
node bin/try-fix.js revert shared/playwright/checks/issues/<slug>/fix.diff [ojs] [omp] [ops]
node bin/try-fix.js status                      # exits 1 while any app holds a fix
```

- The diff is relative to the app root with `a/` `b/` prefixes
  (`a/lib/pkp/classes/…`), applied with GNU `patch` because `lib/pkp` and
  `lib/ui-library` are submodules. A diff touching `lib/ui-library/` or
  `js/` runs `npm run build` on apply and on revert (the line's Node).
  `apply` applies the one diff whole to every app named, so a fix whose
  files differ per app (an app's own classes, a plugin one app does not
  ship) is one `fix-<app>.diff` per app root, each applied to its app
  alone. Write a diff from the committed files (`git show HEAD:<path>`
  copies, never the working tree, where another reporter's fix may be
  applied) with `diff -u --label a/<path> --label b/<path>`, whose
  headers carry no timestamps.
- A marker, `.pkp-e2e-fix.json` in the app root, records the diff and the
  files' hashes before and after; `revert` checks both and removes a
  file the diff created, and `mount` and `fetch-apps` refuse to run while
  a marker is there. `apply` refuses before patching any app when one of
  them holds a fix; `revert` given the diff reverts only that diff's
  marker (without it, whatever is applied), so a chained revert never
  takes out another reporter's fix; `status` exits 1 while a fix is
  applied, so `status && …` gates a chain, and `bin/probe.js` names an
  applied fix when it starts.
  `PKP_E2E_LINE=<line>` in front tries it on a stable line's checkouts.
- Every fleet of the slot, campaign and dataset alike, serves the patched
  code while it is applied: one fix at a time, and only while nothing
  else in the slot needs the unpatched code. PHP is read fresh on each
  request (`php -S`, no CLI opcache), so no server restart is needed.
  A fix to install-time data (a `registry/` file: email or task
  templates) does not show on a loaded dataset: replay its install step
  under the fleet's `PKP_CONFIG_FILE` (`lib/pkp/tools/installEmailTemplate.php`)
  or read it on a context created after the apply; a migration's fix
  shows on an older dataset loaded with `PKP_E2E_DATASET_BRANCH`, which
  runs the upgrade ("Dataset fleets", the reset).

### Dataset fleets

An issue report's steps start from PKP's default test dataset
(<https://github.com/pkp/datasets>), which every PKP developer's install
holds; the campaign's seed they do not have. A **dataset fleet** is an
install loaded from that dataset, served beside the campaign fleet of the
same checkout, so a kept walk drives exactly what the team's installs
hold. `docs/process/dataset.md` lists what the dataset contains (users,
roles, submissions), generated from the dumps. Opt-in: the suites, CI,
`reset:<app>` without the flag and the campaign's fleets are unchanged.

```bash
npm run fetch-datasets [-- --update]                     # checkouts/datasets/: main + stable-3_5_0, pgsql only
npm run fetch-datasets -- --line stable-3_4_0 [--line stable-3_3_0]   # add an old line's dumps (kept on later --update)
npm run fleet-prep -- --feature issues --dataset --reset            # main: load, then the server; .reports/issues/fleet.json
PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
PROBE_FEATURE=issues PROBE_AGENT=ir1 node bin/probe.js all my-walk.js   # fleet.json says dataset: the script drives it
npm run reset:ojs -- --dataset [n]                      # reload one app's dataset fleet (no server start)
npm run probe-servers -- --status --dataset [n]          # its server; --start / --stop as for the probe servers
npm run dataset-facts -- --write                         # regenerate dataset.md's tables from the dumps
```

- **The fetch.** A shallow (`--depth 1`), blobless, sparse clone of
  pkp/datasets into the gitignored `checkouts/datasets/`, holding only
  `tools/` and `<app>/<branch>/pgsql/`: 181 MB for `main` and
  `stable-3_5_0` (each dump about 27 MB, `.git` 12 MB), 190 MB with 3.4
  and 3.3 added (their dumps are under 1 MB). `--update` moves it to the
  datasets' current `main` (pkp's CI regenerates the dumps, the `main`
  one from the app tips) and prunes the old objects.
- **What a dataset fleet is.** Dataset fleet `n` (1–9; `--dataset` alone
  is 1) of an app on a slot and line has its own server at **base port +
  60 + n** (8061 for OJS on `main`, 9061 on 3.5, plus the slot's shift), database
  `<campaign db>_ds<n>` (`ojs_test_ds1`, `ojs_test_3_5_ds1`), files dir
  `checkouts[/<line>]/files/<app>-test-ds<n>`, public dir
  `<app root>/public-ds<n>` (relative in the config, since `php -S` serves
  it), Laravel cache `cache/opcache-ds<n>` and config
  `config.test.ds<n>.inc.php`. Only the checkout's code is shared with the
  campaign fleet.
- **The reset** (`shared/playwright/dataset.js`, about 3 s per app on
  `main`): the config is the dataset's own `config.inc.php` with the
  harness's keys patched in (`base_url`, `allowed_hosts`, a session
  cookie of its own, the campaign's DB role and the fleet's DB name,
  files and public dirs, the cache path, SMTP to this slot's Mailpit, the
  dead-port `[proxy]`); everything else stays the team's (`job_runner`
  and `task_runner` On, `enable_minified` Off, the dataset's `app_key`).
  `database.sql` is a `pg_dump --clean` dump owned by `<app>-ci`: the
  load leaves out the leading drops and the `OWNER TO` lines and runs the
  rest in one transaction with `ON_ERROR_STOP`, so it lands whole or
  stops naming the failing statement; the fleet's role owns everything.
  `files/` and `public/` are copied over emptied dirs, with the public
  subdirectories the installer makes (`site`, the context dir) added,
  since the dump's `public/` holds only `index.html`; the fleet's cache,
  its compiled stylesheets (named after its base URL) and the legacy
  `cache/fc-*.php` files are cleared. Then the schema: the loaded
  `versions` row against the checkout's `dbscripts/xml/version.xml`; a
  lagging dataset gets the app's own `php tools/upgrade.php upgrade`
  (logged to `.reports/datasets/upgrade-<line>-<app>-ds<n>.log`, said in
  the output), and the columns are compared with the campaign's fresh
  install of the tip, a note naming any difference (a schema change
  merged without a version bump). On 2026-09-30 every dataset (`main`,
  3.5, 3.4, 3.3; OJS, OMP, OPS) matched its checkout: no upgrade.
  `PKP_E2E_DATASET_BRANCH=stable-3_5_0` loads another branch's dataset
  (pkp's own `loaddb.sh <branch>`), which exercised the upgrade: 3.5.0.5
  to 3.6.0.0 on OJS `main` in 2 s.
- **The kit on a dataset fleet.** `bin/probe.js` reads
  `.reports/<PROBE_FEATURE>/fleet.json`: a dataset fleet's sets
  `PKP_E2E_DATASET` (and `PKP_E2E_LINE`, which may be left out), so the
  bag's `baseURL`, `port`, `configFile` and `db` (hence `sql()`) are the
  dataset fleet's and `app.dataset` is its number (null on a campaign
  fleet). `signIn(page, '<username>')` signs in a dataset user as it does
  a roster one: the password rule is the same (the username twice,
  `admin`/`admin`); proven as `dbarnes` and `admin` on the three apps of
  all four lines. `app.variant()` throws (no validation server); the
  runner's worker ports and the setup project are never involved, and
  `app.users` is still the campaign roster, which the dataset does not
  hold.
- **The overlays on a dataset fleet.** The server runs with the
  checkout's `TEST_API_KEY`, so on `main` and 3.5 the `_test` API
  answers there too: `app.api.createContext({tag, users})` builds a
  scratch context with its own manager beside `publicknowledge` (proven
  on the three apps of both lines), and `drainJobs()` reads its queue.
  The mounted files add an API namespace and builder classes; nothing
  the screens show changes. Never call `app.api.bootstrap()` or a
  scenario that names the roster (`manager.maya`, …) or the seed's
  sections on a dataset fleet: the first writes the campaign seed into
  the dataset, the others fail for want of it. 3.4 and 3.3 have no
  `_test` API; `lineScratchContext()` and `lineUser()` work there as on
  the campaign fleet.
- **Two reporters.** A walk changes the dataset (a decision, a new user),
  and the next walk's steps start from a freshly loaded one, so a walk
  resets its fleet first (`fleet-prep --dataset n --reset`, about 10 s
  for three apps; no test lock is taken, a load weighs what a probe
  does). Reporters never share a fleet number: the first uses `issues`
  (`--dataset 1`), a second `--feature issues-b --dataset 2`, and so on
  up to 9 per slot and line, each with its own database and server; a
  reset of fleet 1 never touches fleet 2. The dataset users' addresses
  (`<username>@mailinator.com`) are the same in the three apps and every
  fleet of the slot mails the one Mailpit, so a mailbox read filters by
  recipient and time.
- **Proof** (2026-09-30): `shared/playwright/checks/harness/dataset/dataset.js`
  signs in as `dbarnes`, records the dashboard and one submission's
  workflow, then `admin` on Administration (`scratch` as its argument
  adds the `_test` scratch context); green on OJS, OMP and OPS on `main`,
  3.5, 3.4 and 3.3, no crash recorded.

Every fleet uses fixed port bands above its base port; nothing else may
listen there:

| offset | who | started by |
|---|---|---|
| +0 … +19 | the runner's workers, one `php -S` each | Playwright `webServer` |
| +50 | the probe server (`patterns.md` "Probe kit") | `npm run probe-servers -- --start` |
| +61 … +69 | dataset fleet 1 … 9 ("Dataset fleets") | `npm run fleet-prep -- --dataset n` |
| +90 | the validation variant (below) | Playwright, or `probe-servers --start` when nothing answers |

Test DBs are **PostgreSQL** locally. The harness code itself is
DB-driver-agnostic (PRINCIPLES D8), so Postgres is a local choice, not a
dependency. Postgres-specific defects reproduce in this environment.

Two facts worth knowing before you write a test:

- PDF full-text is **not** indexed on the test installs. A search assertion
  on galley content needs its own indexing arrangements.
- All three apps use the same scenario endpoints and the same
  `publicknowledge` context path.

## Slots (parallel sessions)

Up to four sessions work on the VM at once, each in its own **slot**: a
full clone of this repo with its own `checkouts/` (every line), databases,
Mailpit and API key. Only Postgres, the cores and `origin` are shared.

| slot | clone | ports ojs/omp/ops (the stable lines: +1000 3.5, +2000 3.4, +3000 3.3) | DBs (plus `_3_5`, `_3_4`, `_3_3`) | Mailpit (SMTP) | `TEST_API_KEY` |
|---|---|---|---|---|---|
| 0 | `/home/e2e/pkp-e2e` | 8000/8100/8200 (9000…, 10000…, 11000…) | `<app>_test` | 8025 (1025), systemd | `playwright-test-key` |
| 1 | `/home/e2e/pkp-e2e-s1` | 8300/8400/8500 (9300…, 10300…, 11300…) | `<app>_test_s1` | 8026 (1026) | `playwright-test-key-s1` |
| 2 | `/home/e2e/pkp-e2e-s2` | 8600/8700/8800 (9600…, 10600…, 11600…) | `<app>_test_s2` | 8027 (1027) | `playwright-test-key-s2` |
| 3 | `/home/e2e/pkp-e2e-s3` | 12000/12100/12200 (13000…, 14000…, 15000…) | `<app>_test_s3` | 8028 (1028) | `playwright-test-key-s3` |

- **Identity.** `PKP_E2E_SLOT=<n>` in the clone's `.env` makes it slot n
  (`resolveSlot()` in `bin/apps.js`): every port shifted by
  `slotPortShift(n)`, +n×300 for slots 0–2 and the same again 4000 higher
  for slots 3–5 (clear of the lines' +1000, +2000, +3000 and of the
  +0…+90 bands; `slot.js` keeps a literal copy), DB suffix `_s<n>`, Mailpit
  8025+n / SMTP 1025+n, the key suffix `-s<n>`. `fetch-apps` bakes them
  into each checkout's `.env.playwright` and `config.test.inc.php`. Unset
  is slot 0, CI's values. The per-slot key is a tripwire: a run that adopts
  another slot's leftover server (`reuseExistingServer`) gets 401 on its
  first seed instead of writing into another slot's database.
- **Kept checks** name their database `dbName(app.name)` (`bin/apps.js`) or
  the probe kit's `app.db`, never a literal `<app>_test`, which is slot 0's.
- **Mailpit.** Slot 0's is the systemd service. Slot n's is started on
  demand, detached, by any Playwright config load or probe that finds it
  silent (`shared/playwright/mailpit.js`; its database is
  `~/.local/state/mailpit/mailpit-s<n>.db`). The roster's addresses are
  fixed, so two slots on one Mailpit would read each other's mail.
- **The test lock.** Every Playwright run (the config takes it at load),
  `test:<app>`, `test:final` and `fleet-prep` take one machine-wide lock
  (`shared/playwright/test-lock.js`): shared among one slot's runs, so a
  session's three test authors (RUNBOOK step 8) still run side by side,
  and exclusive against other slots, because concurrent fleets on these
  cores turn the suites flaky. Slots take turns in request order: a run
  joins its slot's hold only while no other slot has a run that asked
  earlier. Whole suites run on CI ("CI", `bin/ci.js`), so a hold lasts
  minutes, not the hour one app's full local run takes. A waiting run prints who holds it (`node
  shared/playwright/test-lock.js status`). It is a kernel `flock` owned by
  one small holder process per slot, released once the slot's last run
  exits, a crash or a kill included. Probes (`bin/probe.js`, the probe
  servers) take no lock. Off on CI, without `flock(1)` (macOS) and with
  `PKP_E2E_LOCK=off`. A run can wait behind another slot's final, so a
  session starts runs in the background with its keepalive armed (RUNBOOK
  "Keep the thread ticking").
- **The slot registry** (`bin/slot.js`; state in `~/.pkp-e2e-slots/`,
  `slots.json` lists the clones, `registry.json` the holders). The bot
  (claude-threads with a local patch, `~/.pkp-e2e-slots/claude-threads/`)
  calls `acquire` when a thread starts or resumes and `release` when its
  session pauses or ends. A new session takes the free slot used longest
  ago. A pausing session's slot is freed only when its clone is clean:
  nothing uncommitted, untracked, stashed or unpushed in this repo (the
  app checkouts do not count). Otherwise it stays **blocked** for that
  thread and the bot mentions the owner there; the slot frees when the
  thread resumes and finishes, or with `node bin/slot.js free <n>`. A
  resumed thread returns to its own slot, or, when another session holds
  it, starts fresh in a free one with the thread's messages. `node
  bin/slot.js status` shows all of it.
- **The SessionStart hook** (`.claude/settings.json` → `bin/slot.js hook`)
  tells every session its slot, ports and checkout state, and a resumed one
  what moved since its pause. A manual `claude` started in a free slot
  registers itself, so the bot does not place a thread on top of it.
- **Feature claims.** `node bin/slot.js claim U<nn>` (RUNBOOK step 1)
  refuses a feature another slot's session holds; a claim lapses when its
  session's slot is freed.
- **Cleanup is per slot.** Kill by this clone's paths or ports, never a
  broad `pkill php` or `pkill chrome`.
- **Provisioning a slot**: clone `origin` to `/home/e2e/pkp-e2e-s<n>`, write
  `.env` with `PKP_E2E_SLOT=<n>` and the relative `<APP>_ROOT`s (`.env.example`),
  `npm ci`, `npm run fetch-apps -- --reference /home/e2e/pkp-e2e` (borrows
  slot 0's objects), the same with `--line stable-3_5_0` (and
  `stable-3_4_0`, `stable-3_3_0` when the slot needs them), `npm run mount`
  for every line, then add the clone to `~/.pkp-e2e-slots/slots.json`.

## Runtime model

- **One `php -S` server per Playwright worker**, at `basePort +
  parallelIndex`. `php -S` serves one request at a time, so a single server
  would serialize the suite. Playwright's `webServer` array owns the servers'
  lifetime. The ready probe is a static file, so a server counts as up before
  the DB is installed. Each server runs with `max_execution_time=120` and
  inside a small restart loop, so a crashed `php -S` respawns within a second
  instead of stranding its worker for the rest of the run.
- **Worker count**: `PLAYWRIGHT_WORKERS`, or auto-detect when unset. The
  auto-detect uses the performance-core count where the OS exposes it (Apple
  Silicon sysctl, Intel hybrid sysfs), otherwise every CPU core, with a
  minimum of 2. The measured knee is one worker per fast core: the P-cores
  on the Mac, 8 on the 8-core VM (2026-09-23: OPS and OJS slower at 6, OPS
  no faster and redder at 10 and 12), 4 on CI's 4-vcpu runners, which pin
  the env var explicitly.
- **Server output** goes to
  `apps/<app>/playwright/.server-logs/server-<port>.log` (request log plus
  PHP warnings); the probe servers' is `server-<port>-probe.log` beside it,
  a dataset fleet's `server-<port>-ds<n>.log`.
  Look there when debugging server-side errors (a 500 a probe's traffic
  shows); it carries only the request line of a 500 (`[500]: POST …`),
  whose exception sits in the app's own log under the fleet's files dir,
  `logs/app-<date>.log` (`checkouts/files/<app>-test[-ds<n>]/` on `main`). A server
  adopted through `reuseExistingServer` (a stray one on a worker port)
  keeps logging wherever it was started.
- **Project chain**: `setup → {shared, <app>} → <app>-serial → <app>-solo`.
  The setup project probes `GET /api/v1/_test/bootstrap`. Warm, it is a no-op
  in under a second. Cold, it installs the schema through
  `tools/installTest.php` and seeds. The serial project runs after everything
  else and holds only globally-scanning specs and queue drains; it uses up to
  four workers, since its specs seed their own scratch contexts and
  `runJobs()` waits until the shared queue is empty, reserved jobs included
  (the U61 testing queue, `queuedTestJob`, which no drain runs, left out:
  scenarios.md "POST scenarios/job").
  A test that asserts "still nothing, until the jobs run" cannot share the
  queue with other tests' drains: it carries `@solo` in its title and runs
  alone in the solo project, last.
  In one invocation a single red in `shared` or `<app>` would skip every
  serial and solo test ("59 did not run"), so `npm run test:<app>`
  (`bin/test-app.js`) runs the chain as the three passes CI runs, always
  all three whatever the earlier ones returned: `--project=shared
  --project=<app>` (setup as their dependency), then
  `--project=<app>-serial --no-deps`, then `--project=<app>-solo
  --no-deps`, the last two `--pass-with-no-tests`. The order keeps the
  chain's guarantee; a red in any pass fails the run. Between the app
  pass and the serial pass the fleet is reset and bootstrapped again
  (about 10 s): site-level `@solo` tests re-save every context of the
  install, and on the hundreds an app pass leaves U57 took 20.7 of the
  OPS solo pass's 29.8 min (`.reports/site-variant/feasibility.md`). So
  serial and solo specs seed what they need and never read what the app
  pass left.
- **Animations are globally disabled** (`reducedMotion: 'reduce'` plus the
  `motion.js` CSS in every context). `trace: 'on-first-retry'` records nothing
  while retries are 0. Turn retries on when hunting a failure.
- **One shared DB and files dir per fleet** behind all its worker servers.
  Isolation comes from data namespacing with unique tags, not from separate
  databases. See `patterns.md` tag conventions.

### The validation-variant server

Some behaviors are config keys with no per-entity switch: email validation
(`[email] require_validation`) and the ALTCHA spam check on registration
(`[captcha] altcha`, `altcha_on_register`). PRINCIPLES.md D9 forbids editing
the running config, so each fleet also starts **one fixed extra server at
`basePort + 90`** (8090 for OJS, 8190 for OMP, 8290 for OPS; workers never
reach that offset) that serves the same install through a second config
file. It shares the fleet's DB, files dir and Mailpit; only the config
differs, so users, journals and mail created there are the ordinary seeded
ones.

- The file is `config.test.validation.inc.php` next to the default config.
  `config-factory.js` regenerates it on every Playwright config load from
  the default file, flipping `require_validation = On`, `altcha = on`,
  `altcha_hmackey` (a fixed test key) and `altcha_on_register = on`, and
  re-pointing `base_url` to the variant port. `base_url` matters: the app
  builds the activation link in the validation email from it, and a link to
  worker 0's server would land on a config that says validation is off.
  Never edit the file by hand; it follows the default config, which CI
  generates fresh each run.
- Tests reach it through the `variants` fixture:
  `await page.goto(`${variants.validation}/index.php/publicknowledge/user/register`)`.
  Only explicit navigation goes there. `baseURL`, `storageState`, `asUser`
  and `pkpApi` stay on the worker's own server, so a test on the variant
  logs in through the UI itself.
- Its log is `.server-logs/server-<port>-validation.log`. For poking around
  by hand, `npm run probe-servers -- --start` brings it up when nothing
  answers on its port.

## config.test.inc.php — the local test config

Each app has a local, gitignored `config.test.inc.php`. The app reads it
through the `PKP_CONFIG_FILE` env var, which is the whole switch between the
dev install and the test install. Generate it from the app's own template with
`node bin/with-app.js <app> shared/playwright/make-test-config.js >
"$APP_ROOT/config.test.inc.php"` (the env inputs are
documented in `shared/playwright/make-test-config.js`; CI uses the same
generator), or write it by hand. Besides its own Postgres `<app>_test` DB and
files dir it must carry:

- `allowed_hosts` pinned to `127.0.0.1` (plus the fleet's port)
- `installed_locales = en,fr_CA`. The bilingual base context needs it.
- `[schedule] task_runner = Off` and `[queues] job_runner = Off`. Nothing
  queued or scheduled runs on its own. Serial specs invoke the runners
  explicitly (see the parallel lesson on runners in `patterns.md`).
- `[proxy] http_proxy/https_proxy = http://127.0.0.1:9`, a dead local port.
  PKP wires `[proxy]` into Guzzle and Laravel HTTP, so every server-side
  outbound HTTP call fails fast. Tests never reach real external services,
  and a hung outbound call cannot stall a single-threaded worker server.
  SMTP to Mailpit and other 127.0.0.1 traffic are unaffected. Do not remove
  it, and re-add it by hand on new machines. There is no OS-level firewall
  and no DTD mirror.
- `[database] persistent = On` (the generator writes it since 2026-09-14;
  pkp-lib honours it since `77b76d7664`). The fleet's `php -S` servers then
  keep their PDO connection between requests, so `npm run reset:<app>`
  drops the database with `dropdb --force` (the idle backends are
  terminated; the servers reconnect). A `config.test.inc.php` generated
  before that date lacks the key: regenerate it with the command above
  (keep the old `app_key` through `TEST_APP_KEY`), then reset.
- `public_files_dir = public`, relative to the app root as the template
  says (the generator writes it since 2026-09-24 and refuses an absolute
  `TEST_PUBLIC_FILES_DIR`). `PKPUploadPublicFileController` prefixes the
  base directory, so an absolute value made every picture upload through
  a formatted-text box answer 500 and printed disk paths as public image
  addresses (U09 K5-6); the other readers resolve it from the base
  directory the app `chdir()`s to. A suite that reads the value from the
  config resolves it against `PKP_APP_ROOT`. A config generated before
  that date carries the absolute path: regenerate it (keep `app_key`
  through `TEST_APP_KEY`). CI generates it fresh on every run.
- `enable_minified = On`. Backend pages then load `js/pkp.min.js` instead of
  about 107 separate scripts. The bundle is committed in the app. When its
  sources change, recompile it with the Closure minify pass in
  `lib/pkp/tools/buildjs.sh`. That script's lint gate blocks on long-standing
  style nits, so run the final compile step directly.

Never delete `config.test.inc.php` on its own, because the template resets
`installed=Off`. `npm run reset:<app>` is the sanctioned way to wipe an
install, and it refuses any DB whose name lacks "test".

**Always drive the fleets through `127.0.0.1`, never `localhost`.** A page
request carrying `Host: localhost` ends in a bare 400. The 400 comes after the
locale 302, so the first response looks fine and only the followed redirect
fails. The `_test` API answers on either host, which makes the mistake harder
to spot: seeding succeeds and the browser step dies.

## Env vars (`.env.playwright`; shell exports win)

- `PKP_CONFIG_FILE`: absolute path to `config.test.inc.php`
- `PLAYWRIGHT_BASE_PORT` / `PLAYWRIGHT_WORKERS`: worker 0's port, and the
  worker count (unset = auto-detect, see above). A second runner beside
  the session's own takes a base that keeps its whole band clear, the
  validation server at base + 90 included: 8300, 8400, 8500 do; a base
  inside another fleet's band (8020, 8140) adopts or collides with that
  fleet's probe, validation or worker servers (2026-09-26)
- `PLAYWRIGHT_CPU_THROTTLE`: opt-in race amplifier for flake hunting
  (`shared/playwright/support/throttle.js`): every page of every context
  the fixtures open (`page`'s and `asUser()`'s; like every lever below,
  never a test's own `browser.newContext()`, so a fresh-login context
  is out of reach, U03 and U05 diagnoses) runs its main thread that many
  times slower (DevTools protocol, Chromium
  only). A short probe at 6 reproduces the main-thread jank a loaded CI
  runner shows; a long scenario at 2–4 only runs into its own timeouts
  (2026-09-15). Never in CI or a final. The same file's second lever,
  `PLAYWRIGHT_RAF_HOLD_MS=<ms>`, defers every `requestAnimationFrame`
  callback, for a race that lives in the frame or two after a click,
  which the throttle and `--trace on` both hide (U30 S4, 2026-09-26). The
  third, `PLAYWRIGHT_HOLD_URL=<regex>` with `PLAYWRIGHT_HOLD_MS=<ms>`, holds
  every request whose address matches before it goes out: the "hold one
  request" lever without editing a test (U14 S5, 2026-09-28). The fourth,
  `PLAYWRIGHT_IFRAME_HOLD=<regex>` with `PLAYWRIGHT_IFRAME_HOLD_MS=<ms>`,
  hands every "load" listener of an iframe whose id matches its event that
  much later, so one TinyMCE editor finishes its set-up after the others
  (`-fr_CA-` for a legacy form's second language; U09 S6, 2026-09-28).
  The fifth, `PLAYWRIGHT_LEVER=<module>`, calls that module's export
  (`async (context) => {}`) with every context the fixtures open, in every
  worker: a lever placed relative to the test's own actions (a request
  held until the next press) without editing a test or patching modules
  (U31, U39, U40 diagnoses, 2026-09-30).
- `TEST_API_KEY`: enables and gates `/api/v1/_test/*`. The namespace answers
  404 unless the var is in the server's environment, and 403 unless the
  request's `X-Test-Key` header matches.
- `MAILPIT_URL`: the Mailpit HTTP API (default `http://127.0.0.1:8025`).
  Mailpit is one shared instance across every worker and all three fleets
  (`brew services start mailpit`); its recipient addresses are scoped per
  app, so two runs of the same app must never overlap (MAINTENANCE
  "Session hygiene"). The instance keeps at most 500 messages, and on a
  busy day it sits at that cap, so a "no email was sent" reading counts the
  messages to a fresh recipient, never the total (seen 2026-09-06,
  `.reports/U31/cc-K3.md`).

## Running

All commands run from the pkp-e2e root. `ojs` below stands for any of
`ojs`/`omp`/`ops`:

```bash
npx playwright install chromium      # one-time, installs Chromium
npm run test:ojs -- --project=setup  # seed the test DB (cold ~1-3 min; warm <1s no-op)
npm run test:ojs                     # full run for one fleet: reset, the three passes (app, serial, solo), reset before serial
npm run test:ojs -- --project=ojs    # only the app project (name varies per app); a --project is one plain invocation
npm run test:ojs -- --ui             # Playwright UI mode — best for iterating (one plain invocation)
PWDEBUG=1 npm run test:ojs           # step-through
npm run reset:ojs                    # nuke the test DB and the app's data caches (forces cold bootstrap next run)
npm run probe-servers -- --start|--status|--stop [--app ojs]   # detached probe servers at base+50 (and +90)
npm run fleet-prep -- --feature U03 [--reset] [--apps ojs,omp]  # per app: reset?, setup project, probe server; .reports/U03/fleet.json (a subset run keeps the other apps' entries)
npm run test:final -- --feature U03 [--apps ojs] [--grep @smoke] # the suites one after another; logs in .reports/U03/final-run-<app>.log
npx playwright test -c configs/ojs.config.js apps/ojs/playwright/tests/U03-user-profile.spec.js   # one spec by path (an agent's green run)
npx playwright test -c configs/ojs.config.js --project=ojs-serial --no-deps apps/ojs/playwright/tests/serial/U05-notifications-center-and-email-preferences.spec.js   # one serial spec alone, on a warm install
```

`npm run test:<app>` without a `--project` (`bin/test-app.js`) runs three
Playwright passes, in order and always all three, and exits non-zero if
any failed (Project chain above). The caller's args (`--reporter`,
`--grep`, `--trace`, `--workers`, file filters) go to every pass, and
every pass takes `--pass-with-no-tests`; a run in which no pass ran a
test fails. Each pass writes its own output folder, `<out>/app`,
`<out>/serial` and `<out>/solo`, where `<out>` is the caller's
`--output` or `apps/<app>/playwright/test-results/`, because a run
empties its output folder first and one folder lost the earlier passes'
error contexts. A `test-app: pass n/3 (…)` line opens and closes each
pass in the console. A `--project`, `--ui` or `--list` makes it one plain
`playwright test` invocation, as before.

A whole-suite run resets the fleet before the app pass, so it starts
from a fresh install as a CI shard does and what filtered runs, probes
and claim checks left does not pile up, and again between the app pass
and the serial pass (`reset.js`, then the setup project, quietly; one
`test-app: … fleet reset` line each, about 8 s). So a whole-suite run
must not share its fleet with another runner. A run with a filter (file or folder names, `--grep`,
`--grep-invert`, `--last-failed`, `--only-changed`) skips both resets,
because filtered runs are the ones that share a fleet (a test author
beside the harness agent); `--no-reset` skips them on a whole-suite run
too. The app pass's database is gone after the run; its error contexts
and traces stay in `<out>/app`.

A run longer than about four minutes outlives the prompt cache of the agent
waiting on it, and whole-suite runs are CI's (`node bin/ci.js`, "CI"): the
VM's `npm run test:<app>` and `test:final` remain for work about the local
runtime itself (MAINTENANCE "Session hygiene").
In a plain `npx playwright test` command, selecting a serial spec by path
alone runs its dependency projects (`setup`, `shared`, the app project) in
full first; `--project=<app>-serial --no-deps` on a warm install runs the
spec alone, and its `@solo` tests need `--project=<app>-solo --no-deps`
beside it, as a second command; a serial file whose every test is `@solo`
(U60, U64 and others) answers "No tests found", exit 1, in the serial
command, so it runs in the solo command alone (U45 harness). A suite id as the
filter (`U12`) also matches `tests/serial/U12-…` and so pulls in the
whole chain: an app suite's regression run names `--project=<app>`; and
`--no-deps` also drops the solo project's wait on the serial one, so a
`@solo` test runs in its own `--project=<app>-solo --no-deps` command
after the serial one's (U09 harness, U16 tops); the config refuses a
`--no-deps` command that selects the solo project beside any other,
because every "red in `<app>-solo` after the final" sighting was one.

`fleet-prep` and `test:final` run the apps one after another and leave
`PLAYWRIGHT_WORKERS` to the environment. Probe servers may stay up during a
run; nothing else may listen on a worker port, because the run adopts a
server it finds there (`reuseExistingServer`).

Long-lived DBs accumulate state that pollutes COUNT assertions and tag
searches. After a reset, the first run can die on a webServer start race, so
relaunch it. After a killed run, kill orphan chromium and php
processes before re-running: only this slot's, the php servers whose
command line names this clone's path and the chromium under this run's
node process, never a broad `pkill` ("Slots": other slots run beside it).

## CI

- `.github/workflows/e2e.yml` runs the three-app matrix on every push and
  PR of this repo, and nightly against the apps' `main`. Its
  `workflow_dispatch` form takes `ojs_ref`, `omp_ref` and `ops_ref`, so a
  branch of this repo can be run against a pinned app commit:
  `gh workflow run e2e.yml --ref <branch> -f ojs_ref=<sha>`; a PR head on
  a contributor's fork needs `-f ojs_repo=<fork>/ojs` beside it, and `-f
  apps=ojs` runs only that app. Every dispatch is its own concurrency
  group (two slots dispatch from the same commit); a push cancels only
  the same branch's older push run, except on `main`, where every commit
  runs.
  `-f pkp_lib_ref=` and `-f ui_library_ref=` (a full sha or
  `pull/<n>/head`, fetched from pkp/pkp-lib and pkp/ui-library) pin every
  app's `lib/pkp` and `lib/ui-library` before the installs, whatever the
  app commit's pointers say: a PR review's merge result when an app PR
  carries no submodule bump or an app has no PR of its own (the job
  summary names the pinned commits). App repo checks never pin: their PRs
  carry the submodule bumps (@jarda.kotesovec, 2026-09-28).
  `gh` works on this repo and, since 2026-09-12, on the pkp org.
- **`node bin/ci.js` is how a session uses CI**, the home of every
  whole-suite run: `watch` waits for the push run of `HEAD` (or `--sha`,
  or a run id), `dispatch` starts `e2e.yml` from `--ref <branch>` with
  `--<app>-ref`, `--<app>-repo`, `--pkp-lib-ref`, `--ui-library-ref` and
  `--apps` and waits for it, `summary <run-id>` reports a finished one.
  It prints a line as each job ends, then every failed and flaky test per
  app from the job logs and the run's URL; exit 0 green, 1 red, 2 no run
  or timed out (`--timeout <min>`, default 120). Run it in the background
  under the keepalive. A branch name with `/` gets no push run, and
  neither does a push touching only `docs/`, `*.md` files or
  `shared/playwright/checks/` (`e2e.yml` `paths-ignore`): `dispatch` runs
  such a branch when a suite run is wanted.
- `.github/workflows/run-app.yml` is the reusable job. Each app repo's
  `e2e-tests.yml` calls it on every push and PR with `app_ref` set to the
  commit under test; it runs this repo's `main` unless `e2e_ref` is given.
  The hooks also pass `companion_branch`, the PR's branch name: when a
  pkp-e2e branch of the same name exists, the suite runs from it instead
  (MAINTENANCE "A developer's PR fails the suite").
- CI runs each app as three shards (one job each with its own services
  and install, check names `e2e (<app>) n/3`) at `PLAYWRIGHT_WORKERS=4`
  and `--retries=1`. A shard runs three passes, because Playwright shards
  only the projects named on the command line and runs their dependency
  projects in full on every shard: `--shard=n/3 --project=shared
  --project=<app>` (setup runs as their dependency), then `--project=<app>-serial
  --no-deps`, then `--project=<app>-solo --no-deps`, both sharded and
  `--pass-with-no-tests` (the passes `npm run test:<app>` runs locally,
  "Running"). Between the first and the second, `reset.js` and the setup
  project (unsharded) give the serial and solo passes a fresh install, as
  locally. The shard count is set in `run-app.yml` alone,
  and the app hooks follow it since they call that workflow at `main`.
- Each pass is split by time, not by count: the reporter
  `shared/playwright/timed-shards.js` packs the pass's tests longest-first
  onto the least-loaded shard by their CI duration in
  `shared/playwright/timings/<app>.json` (a test without one weighs the
  pass's median), and every shard excludes the tests that are not its own
  (a `timed shards:` line opens each pass in the log). Playwright's own
  split cut equal counts in file order, so OJS ran 7.8 · 10.3 · 14.0 min
  (2026-09-24). Every shard uploads its fresh durations as
  `timings-<app>-<n>`; `npm run shard-timings [-- <run-id> ...]` (default:
  the three latest green `main` runs) writes their median back into
  `timings/`. `PKP_E2E_TIMED_SHARDS=0` restores Playwright's split. A
  CLI `--reporter` drops the reporter, and with it both halves.
  Failure artifacts are per shard (`playwright-artifacts-<app>-<n>`) and
  include `.server-logs/`; each pass writes `test-results/{app,serial,solo}/`,
  and a green shard with a flaky test uploads them too, so a flake's failed
  attempt leaves its `error-context.md` (since 2026-09-26).
- The latest run of `e2e-tests.yml` on an app repo's `main` is the
  authoritative "is the app's tip red?" answer:
  `gh run list -R pkp/<app> --workflow e2e-tests.yml --branch main`, then
  `--log-failed` and `gh run download` on the run (ci-triage "Where to
  look"). Without a token
  `https://api.github.com/repos/pkp/<app>/actions/workflows/e2e-tests.yml/runs?branch=main&per_page=5`
  still lists the runs with their head SHAs.

## Verify before trusting

File paths, selectors and schema fields cited across these docs are
snapshots, verified on the date a line names, and UIs drift faster than
docs.
