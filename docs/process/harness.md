# Harness Guide

This file explains how the Playwright harness is laid out, configured and run.
One pkp-e2e repo covers OJS, OMP and OPS. Everything lives here and runs
against plain app checkouts named in the repo `.env`
(`OJS_ROOT`/`OMP_ROOT`/`OPS_ROOT`). `bin/mount.js` copies the few PHP overlays
into a checkout (see the README). Paths below are relative to the repo root.

Related files: test-authoring rules are in `PRINCIPLES.md`, coding
conventions and pitfalls in `patterns.md`, the seeding API and Mailpit rules
in `scenarios.md`, and the seeded identities in `users.md`.

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

### The stable line

A second set of checkouts on `stable-3_5_0` sits beside the `main` ones,
for the daily regression hunt on that branch (MAINTENANCE "The stable
line") and for driving 3.5 and `main` side by side. No suite is meant to
run there.

| App | Checkout | Base port | Test DB |
|---|---|---|---|
| OJS | `checkouts/stable-3_5_0/ojs` | 9000 | `ojs_test_3_5` |
| OMP | `checkouts/stable-3_5_0/omp` | 9100 | `omp_test_3_5` |
| OPS | `checkouts/stable-3_5_0/ops` | 9200 | `ops_test_3_5` |

- The registry is `LINES` in `bin/apps.js`. **`PKP_E2E_LINE=stable-3_5_0`
  in front of any harness command points it at the line** (`mount`,
  `reset:<app>`, `fleet-prep`, `probe-servers`, `bin/probe.js`, the
  Playwright configs); unset means `main`, and `.env` is not involved.
  The port bands, the files dirs (`checkouts/stable-3_5_0/files/`) and the
  probe servers' pid files (`.reports/servers-stable-3_5_0/`) are the
  line's own, so both lines' servers stay up together. The server logs
  share `apps/<app>/playwright/.server-logs/`, told apart by port.
- `npm run fetch-apps -- --line stable-3_5_0 [--update]` provisions and
  moves it, same remotes and push rules as `main`'s.
- `stable-3_5_0` has no `PKP_CONFIG_FILE` support, so `fetch-apps` makes
  that one-line change to `lib/pkp/classes/config/Config.php` in the
  line's working tree (the same line `main` carries) and re-applies it
  after every `--update`. `git status` in the line's `lib/pkp` shows that
  one file modified; nothing else under the line's checkouts is edited.
- The overlays are written for `main`. On the line the install, the
  bootstrap seed and the context, user and submission scenarios work
  (2026-09-17, all three apps); two seed steps for `main`-only features
  are skipped there behind `method_exists` / `class_exists` (the task
  templates in `ContextFactory`, the contributor type and roles in
  `PKPSubmissionScenarioBuilder`). A scenario key that reaches another
  `main`-only class answers 500 naming it.
- `bin/line-range.js` lists a line's commits since a baseline with each
  one's relation to `main` (same patch, adapted backport, stable-only).

Every fleet uses fixed port bands above its base port; nothing else may
listen there:

| offset | who | started by |
|---|---|---|
| +0 … +19 | the runner's workers, one `php -S` each | Playwright `webServer` |
| +50 | the probe server (`patterns.md` "Probe kit") | `npm run probe-servers -- --start` |
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

Up to three sessions work on the VM at once, each in its own **slot**: a
full clone of this repo with its own `checkouts/` (both lines), databases,
Mailpit and API key. Only Postgres, the cores and `origin` are shared.

| slot | clone | ports ojs/omp/ops (stable-3_5_0) | DBs | Mailpit (SMTP) | `TEST_API_KEY` |
|---|---|---|---|---|---|
| 0 | `/home/e2e/pkp-e2e` | 8000/8100/8200 (9000/9100/9200) | `<app>_test`, `<app>_test_3_5` | 8025 (1025), systemd | `playwright-test-key` |
| 1 | `/home/e2e/pkp-e2e-s1` | 8300/8400/8500 (9300/9400/9500) | `<app>_test_s1`, `<app>_test_s1_3_5` | 8026 (1026) | `playwright-test-key-s1` |
| 2 | `/home/e2e/pkp-e2e-s2` | 8600/8700/8800 (9600/9700/9800) | `<app>_test_s2`, `<app>_test_s2_3_5` | 8027 (1027) | `playwright-test-key-s2` |

- **Identity.** `PKP_E2E_SLOT=<n>` in the clone's `.env` makes it slot n
  (`resolveSlot()` in `bin/apps.js`): every port +n×300 (clear of the
  line's +1000 and of the +0…+90 bands), DB suffix `_s<n>`, Mailpit
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
  slot 0's objects), the same with `--line stable-3_5_0`, `npm run mount`
  for both lines, then add the clone to `~/.pkp-e2e-slots/slots.json`.

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
  PHP warnings); the probe servers' is `server-<port>-probe.log` beside it.
  Look there when debugging server-side errors (a 500 a probe's traffic
  shows). A server
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
  runs its main thread that many times slower (DevTools protocol, Chromium
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
  under the keepalive. A branch name with `/` gets no push run.
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
