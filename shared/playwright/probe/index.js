/**
 * @file shared/playwright/probe/index.js
 *
 * The probe kit: what a throwaway spec-verification script needs, as a thin
 * wrapper over the harness modules tests already use (LoginPage, users.js,
 * PkpApi, PkpMail, waitForJQueryIdle, disableMotion, bin/apps.js). It holds
 * no assertions and no test-runner coupling; tests never import it
 * (`npm run lint:probe-imports`). The rules and an example are in
 * docs/process/patterns.md "Probe kit".
 *
 * Every script runs through `bin/probe.js <app|all> <script>` with two
 * environment variables set: PROBE_FEATURE (the spec, e.g. U03) and
 * PROBE_AGENT (a short id for the agent, e.g. g1). Everything the kit
 * writes lands under .reports/<PROBE_FEATURE>/<PROBE_AGENT>/.
 *
 * Ports: a probe talks to the app's detached probe server at basePort + 50
 * (`npm run probe-servers -- --start`), never to a worker's port; the
 * validation variant at basePort + 90 is shared with the runner and reached
 * through `app.variant('validation')`.
 */
const fs = require('fs');
const path = require('path');
const {chromium} = require('@playwright/test');
const {request} = require('@playwright/test');
const {APPS, REPO_ROOT, resolveApp, resolveSlot} = require('../../../bin/apps.js');
const {PkpApi} = require('../support/api.js');
const {PkpMail} = require('../support/mail.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {disableMotion} = require('../support/motion.js');
const {LoginPage} = require('../pages/LoginPage.js');
const {readEnvFile} = require('../support/env.js');
const users = require('../data/users.js');
const {VALIDATION_PORT_OFFSET} = require('../config-factory.js');

const PROBE_PORT_OFFSET = 50;
const WORKER_PORT_SPAN = 20; // basePort + 0 … + 19 belong to the runner's workers

// ---------------------------------------------------------------------------
// Where output goes

function requireEnv(name, hint) {
    const value = (process.env[name] || '').trim();
    if (!value) {
        throw new Error(`probe: ${name} is not set — ${hint}`);
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(value)) {
        throw new Error(`probe: ${name}="${value}" must be a plain token (letters, digits, _ . -)`);
    }
    return value;
}

let outDirCache = null;
/** `.reports/<PROBE_FEATURE>/<PROBE_AGENT>/`, created on first use. */
function outDir() {
    if (!outDirCache) {
        const feature = requireEnv('PROBE_FEATURE', 'the spec id, e.g. PROBE_FEATURE=U03');
        const agent = requireEnv('PROBE_AGENT', 'a short id for this agent, e.g. PROBE_AGENT=g1');
        outDirCache = path.join(REPO_ROOT, '.reports', feature, agent);
        fs.mkdirSync(outDirCache, {recursive: true});
    }
    return outDirCache;
}

/** File-safe name: keeps letters, digits, `_ - .`; everything else becomes `_`. */
function safeName(name) {
    return String(name).replace(/[^A-Za-z0-9_.-]+/g, '_');
}

/**
 * `<name>-<app>` inside withApp, so a script that runs on two apps never
 * overwrites one app's snapshot with the other's. Outside withApp (no app
 * in play) the name is returned unchanged.
 */
function appSuffixed(name) {
    const app = process.env.PKP_APP_NAME;
    const base = safeName(name);
    return app && !base.endsWith(`-${app}`) ? `${base}-${app}` : base;
}

// ---------------------------------------------------------------------------
// Apps and their environment

/**
 * The static part of an app's bag: identity, ports, config, key. No browser,
 * no request context, so bin/probe-servers.js can use it too.
 *
 * The checkout's .env.playwright is read into a map, not process.env, so one
 * process can hold three apps with three keys and three ports. Shell exports
 * win for TEST_API_KEY and MAILPIT_URL only (the runner's rule); the port
 * always comes from the file, else the registry, so `PLAYWRIGHT_BASE_PORT`
 * in the shell cannot shift every app onto one fleet.
 *
 * @param {string} name ojs | omp | ops
 */
function resolveProbeApp(name) {
    const app = resolveApp(name);
    const env = readEnvFile(app.root);
    const basePort = parseInt(env.PLAYWRIGHT_BASE_PORT || String(app.basePort), 10);
    const port = basePort + PROBE_PORT_OFFSET;
    if (port < basePort + WORKER_PORT_SPAN || port === basePort + VALIDATION_PORT_OFFSET) {
        throw new Error(`probe: port ${port} for ${name} collides with the runner's bands`);
    }
    let testApiKey = env.TEST_API_KEY || '';
    let keySource = path.relative(REPO_ROOT, path.join(app.root, '.env.playwright'));
    if (process.env.TEST_API_KEY) {
        testApiKey = process.env.TEST_API_KEY;
        keySource = 'shell TEST_API_KEY';
    }
    if (!testApiKey) {
        keySource = 'NO KEY (the _test API will answer 404/403)';
    }
    const mailpitUrl = process.env.MAILPIT_URL || env.MAILPIT_URL || resolveSlot().mailpitUrl;
    const configFile = env.PKP_CONFIG_FILE || path.join(app.root, 'config.test.inc.php');
    // The runner generates this one next to the default config on every
    // config load (config-factory.js); the kit only reads its location.
    const validationConfigFile = path.join(path.dirname(configFile), 'config.test.validation.inc.php');
    // eslint-disable-next-line import/no-dynamic-require
    const appContext = require(path.join(app.suiteDir, 'support', 'app.context.js'));
    const baseURL = `http://127.0.0.1:${port}`;
    return {
        app: name,
        name,
        root: app.root,
        suiteDir: app.suiteDir,
        basePort,
        port,
        baseURL,
        configFile,
        validationConfigFile,
        validationPort: basePort + VALIDATION_PORT_OFFSET,
        testApiKey,
        keySource,
        mailpitUrl,
        // The fleet's own database (slot and line aware): kept checks query
        // it as `psql -d ${app.db}`, never a literal <app>_test.
        db: app.db,
        contextPath: appContext.contextPath,
        appContext,
        /** Absolute URL on the probe server: url('/index.php/publicknowledge/user/register'). */
        url: (pathname) => `${baseURL}${pathname}`,
        /**
         * Base URL of a fixed alternate server that the runner also uses.
         * 'validation' = basePort + 90: email validation and ALTCHA on.
         */
        variant: (kind) => {
            if (kind !== 'validation') {
                throw new Error(`probe: unknown variant "${kind}" (only "validation")`);
            }
            return `http://127.0.0.1:${basePort + VALIDATION_PORT_OFFSET}`;
        },
    };
}

/** The apps this process handles: PROBE_APPS from bin/probe.js, then ONLY=ojs,omp. */
function probeApps() {
    const all = Object.keys(APPS);
    const parse = (value) =>
        String(value)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    let list = process.env.PROBE_APPS ? parse(process.env.PROBE_APPS) : all;
    if (process.env.ONLY) {
        const only = parse(process.env.ONLY);
        list = list.filter((name) => only.includes(name));
    }
    for (const name of list) {
        if (!APPS[name]) {
            throw new Error(`probe: unknown app "${name}" — one of ${all.join(', ')}`);
        }
    }
    return list;
}

// ---------------------------------------------------------------------------
// The run record (per app): responses seen, written at the end

const runs = new Map(); // app name → record
const locatorRows = [];
let locatorsFlushed = 0; // how many of locatorRows are already in locators.md
const CONSOLE_CAP = 200;

function runRecord(app) {
    if (!runs.has(app.name)) {
        runs.set(app.name, {
            app: app.name,
            port: app.port,
            keySource: app.keySource,
            startedAt: new Date().toISOString(),
            responses: [],
            console: [],
            dialogs: [],
            warnings: [],
            // Every response of 500 or more and every uncaught page error:
            // the app failing, a finding on its own (GLOSSARY "crash").
            crashes: [],
        });
    }
    return runs.get(app.name);
}

/** The record of the app in play (withApp sets PKP_APP_NAME), or null. */
function currentRecord() {
    return runs.get(process.env.PKP_APP_NAME) || null;
}

/**
 * Every process of an agent keeps its own files: the run record is
 * `run-<app>-<HHMMSS>.json` (HHMMSS from startedAt) and the locator rows
 * are appended to locators.md under a dated heading, so a script run in
 * phases, one process each, loses nothing from the earlier phases.
 */
function flush() {
    if (runs.size === 0 && locatorRows.length === 0) {
        return; // nothing ran (a tool merely required the kit)
    }
    try {
        const dir = outDir();
        for (const record of runs.values()) {
            record.endedAt = new Date().toISOString();
            const stamp = record.startedAt.slice(11, 19).replace(/:/g, '');
            const file = path.join(dir, `run-${record.app}-${stamp}.json`);
            fs.writeFileSync(file, JSON.stringify(record, null, 2));
            if (record.crashes.length > 0) {
                const server = record.crashes.filter((c) => c.kind === 'server').length;
                const script = record.crashes.length - server;
                console.error(
                    `[probe] ${record.app}: the app failed ${record.crashes.length} time(s) during this run ` +
                        `(${server} server error(s), ${script} page script error(s)); each is a finding — ` +
                        `see "crashes" in ${path.basename(file)}`,
                );
            }
        }
        // flush() runs at the end of withApp and again on exit: append only
        // the rows not written yet.
        if (locatorRows.length > locatorsFlushed) {
            const now = new Date().toISOString();
            const heading = `Locators (${path.basename(dir)}, ${now.slice(0, 10)} ${now.slice(11, 19)})`;
            const table = locatorTable(locatorRows.slice(locatorsFlushed));
            locatorsFlushed = locatorRows.length;
            const file = path.join(dir, 'locators.md');
            fs.appendFileSync(file, `${fs.existsSync(file) ? '\n' : ''}## ${heading}\n\n${table}`);
            appendScreenLocators(heading, table);
        }
    } catch (error) {
        // Never mask the script's own failure with a bookkeeping error.
        console.error(`probe: could not write the run record: ${error.message}`);
    }
}
process.on('exit', flush);

// ---------------------------------------------------------------------------
// withApp / forEachApp

/**
 * Hand `fn` one app's bag: {app, name, root, baseURL, port, api, mail,
 * users, contextPath, url(), variant()}. `api` is a PkpApi on the probe
 * server with that app's own key; `mail` is a PkpMail on the shared Mailpit.
 * Sets the PKP_* process env for the app while `fn` runs (some harness
 * helpers read it).
 *
 * @param {string} name ojs | omp | ops
 * @param {(app: object) => Promise<any>} fn
 */
async function withApp(name, fn) {
    const app = resolveProbeApp(name);
    require('../mailpit.js').ensureMailpit();
    outDir();
    process.env.PKP_APP_NAME = app.name;
    process.env.PKP_APP_ROOT = app.root;
    process.env.PKP_SUITE_DIR = app.suiteDir;
    process.env.PLAYWRIGHT_BASE_PORT = String(app.basePort);
    const apiContext = await request.newContext({
        baseURL: app.baseURL,
        extraHTTPHeaders: {'X-Test-Key': app.testApiKey},
    });
    app.api = new PkpApi(apiContext);
    app.mail = new PkpMail({url: app.mailpitUrl});
    app.users = users;
    runRecord(app);
    try {
        return await fn(app);
    } finally {
        await app.api.dispose().catch(() => {});
        flush();
    }
}

/**
 * `withApp` for every app this process handles (bin/probe.js's <app|all>,
 * then the ONLY=ojs,omp filter), sequentially. A failure on one app is
 * reported and the next app still runs; the process exits 1 at the end.
 *
 * @param {(app: object) => Promise<any>} fn
 * @returns {Promise<Object<string, any>>} results by app name
 */
async function forEachApp(fn) {
    const results = {};
    let failed = false;
    for (const name of probeApps()) {
        try {
            results[name] = await withApp(name, fn);
        } catch (error) {
            failed = true;
            console.error(`[probe] ${name} FAILED: ${error.stack || error}`);
        }
    }
    if (failed) {
        process.exitCode = 1;
    }
    return results;
}

// ---------------------------------------------------------------------------
// Browser

/**
 * A headless Chromium at 1280×900 with animations off, baseURL on the probe
 * server, and a response listener that records URL, method, status and size
 * (never a body) for `/api/` calls and every status ≥ 400 into the run
 * record. A status ≥ 500 and an uncaught page error also go into the
 * record's `crashes` list (kind `server` | `script`), counted on the
 * console when the process ends. Returns {browser, context, page, close}.
 *
 * @param {object} app the bag from withApp
 * @param {{storageState?: object|string, headless?: boolean, record?: boolean}} [options]
 *   `record: false` attaches no response or console listener, so the run
 *   record stays empty for a check that must leave no address behind.
 */
async function launch(app, {storageState, headless = true, record: keepRecord = true} = {}) {
    if (!app || !app.baseURL) {
        throw new Error('probe: launch(app) needs the bag from withApp');
    }
    const record = runRecord(app);
    const browser = await chromium.launch({headless});
    const context = await browser.newContext({
        baseURL: app.baseURL,
        viewport: {width: 1280, height: 900},
        reducedMotion: 'reduce',
        storageState: storageState || {cookies: [], origins: []},
    });
    await disableMotion(context);
    if (keepRecord) context.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        if (!url.includes('/api/') && status < 400) {
            return;
        }
        const entry = {
            at: new Date().toISOString(),
            method: response.request().method(),
            url,
            status,
            size: null,
        };
        record.responses.push(entry);
        if (status >= 500 && record.crashes.length < CONSOLE_CAP) {
            record.crashes.push({at: entry.at, kind: 'server', status, method: entry.method, url});
        }
        const length = response.headers()['content-length'];
        if (length !== undefined) {
            entry.size = parseInt(length, 10);
        } else {
            response
                .body()
                .then((body) => {
                    entry.size = body.length;
                })
                .catch(() => {});
        }
    });
    const page = await context.newPage();
    // Console errors and warnings and uncaught page errors go into the run
    // record (capped); a script that needs every level attaches its own.
    const logConsole = (type, text, url) => {
        if (record.console.length >= CONSOLE_CAP) {
            return;
        }
        record.console.push({at: new Date().toISOString(), type, text: String(text).slice(0, 300), url});
    };
    if (keepRecord) page.on('console', (message) => {
        const type = message.type();
        if (type === 'error' || type === 'warning') {
            logConsole(type, message.text(), (message.location() || {}).url || page.url());
        }
    });
    if (keepRecord) page.on('pageerror', (error) => {
        logConsole('pageerror', error.message || String(error), page.url());
        if (record.crashes.length < CONSOLE_CAP) {
            record.crashes.push({at: new Date().toISOString(), kind: 'script', text: String(error.message || error).slice(0, 300), url: page.url()});
        }
    });
    // Browser dialogs: while the kit's is the page's only dialog listener it
    // accepts a page-leave question (dismissing it cancels the navigation,
    // and the next goto() or signOut() fails with ERR_ABORTED) and dismisses
    // the rest, Playwright's own default; a script that adds its own listener
    // decides alone. Every dialog goes into the run record.
    page.on('dialog', (dialog) => {
        if (keepRecord && record.dialogs.length < CONSOLE_CAP) {
            record.dialogs.push({at: new Date().toISOString(), type: dialog.type(), message: dialog.message().slice(0, 300), url: page.url()});
        }
        if (page.listenerCount('dialog') > 1) {
            return;
        }
        (dialog.type() === 'beforeunload' ? dialog.accept() : dialog.dismiss()).catch(() => {});
    });
    console.log(`[probe] ${app.name}: ${app.baseURL} (key from ${app.keySource})`);
    return {
        browser,
        context,
        page,
        close: async () => {
            await context.close().catch(() => {});
            await browser.close().catch(() => {});
        },
    };
}

/**
 * Sign in through the real login form on the page's own server (the probe
 * server unless `origin` names another, e.g. app.variant('validation')).
 * `contextPath` uses that journal's own login page instead of the site's,
 * which is what decides where the user lands afterwards. An open session is
 * signed out first (the login page would otherwise send it home silently).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} username a roster username (users.md) or a scratch user
 * @param {{password?: string, origin?: string, contextPath?: string}} [options]
 */
async function signIn(page, username, {password, origin = '', contextPath} = {}) {
    const loginPage = new LoginPage(page);
    const open = async () => {
        if (origin || contextPath) {
            await page.goto(`${origin}/index.php/${contextPath || 'index'}/en/login`);
        } else {
            await loginPage.goto();
        }
    };
    await open();
    if ((await loginPage.usernameInput.count()) === 0) {
        await signOut(page, {origin});
        await open();
    }
    await loginPage.signIn(username, password || users.getPassword(username));
}

/**
 * Sign out through the app's own sign-out URL (what the "Logout" link
 * points at) and wait for the redirect to land.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{origin?: string}} [options]
 */
async function signOut(page, {origin = ''} = {}) {
    await page.goto(`${origin}/index.php/index/login/signOut`);
    await page.waitForURL((url) => !url.pathname.endsWith('/signOut'), {
        timeout: 15_000,
        waitUntil: 'commit',
    });
}

// ---------------------------------------------------------------------------
// Reading a screen

async function innerTextOf(locator) {
    try {
        if ((await locator.count()) === 0) {
            return null;
        }
        return await locator.first().innerText();
    } catch {
        return null;
    }
}

/**
 * What the screen shows, as data: {url, title, aria, text}. `aria` is the
 * aria snapshot of the main region (body when the page has no `main`) plus
 * every open dialog; `text` is the verbatim innerText of the header, the
 * main region and the last visible dialog (`text.dialog`, null when none
 * is open) — aria snapshots normalise punctuation, innerText does not. The
 * dialog text matters because the workflow page is itself a dialog over
 * the dashboard, so `text.main` reads the list behind it.
 * The read is taken settled: it waits for jQuery and the network to go
 * quiet first (`idle`), so a panel or grid that renders after its own
 * request is on screen before it is recorded.
 *
 * @param {import('@playwright/test').Page} page
 */
async function screen(page) {
    await idle(page);
    const main = page.locator('main');
    const hasMain = (await main.count()) > 0;
    const region = hasMain ? main.first() : page.locator('body');
    const aria = {main: await region.ariaSnapshot(), dialogs: []};
    const dialogs = page.locator('[role="dialog"]:visible');
    let lastDialog = null;
    for (const dialog of await dialogs.all()) {
        // A dialog listed during its closing animation is gone by the
        // snapshot; without the short timeout the read waits 30 s and throws.
        try {
            aria.dialogs.push(await dialog.ariaSnapshot({timeout: 1000}));
            lastDialog = dialog;
        } catch {
            // closed between the list and the snapshot: not on screen
        }
    }
    return {
        url: page.url(),
        title: await page.title(),
        aria,
        text: {
            header: await innerTextOf(page.locator('header')),
            main: await innerTextOf(hasMain ? main : page.locator('body')),
            dialog: lastDialog ? await innerTextOf(lastDialog) : null,
        },
    };
}

/**
 * Full-page screenshot as <name>.png in the output dir. Returns the path.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function shot(page, name) {
    const file = path.join(outDir(), `${appSuffixed(name)}.png`);
    await page.screenshot({path: file, fullPage: true});
    return file;
}

/**
 * Write <name>-<app>.json in the output dir. Returns the path. `merge: true`
 * folds an object into the file's existing object (top-level keys, the new
 * ones winning), so a script run in phases, one process each, keeps the
 * earlier phases' facts under one name.
 *
 * @param {string} name
 * @param {any} data
 * @param {{merge?: boolean}} [options]
 */
function record(name, data, {merge = false} = {}) {
    const file = path.join(outDir(), `${appSuffixed(name)}.json`);
    const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (merge && isObject(data) && fs.existsSync(file)) {
        const earlier = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (isObject(earlier)) {
            data = {...earlier, ...data};
        }
    }
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    return file;
}

/**
 * Note a locator for the test author: how the script found an element,
 * described in words, with the selector and what it matched. The rows
 * become locators.md in the output dir when the process exits.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} description e.g. "the Register button"
 * @param {import('@playwright/test').Locator} locator
 */
async function loc(page, description, locator) {
    let count = null;
    let visible = null;
    try {
        count = await locator.count();
        visible = count > 0 ? await locator.first().isVisible() : false;
    } catch {
        // an invalid selector is still worth a row
    }
    locatorRows.push({
        app: process.env.PKP_APP_NAME || '',
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        description,
        locator: String(locator),
        count,
        visible,
    });
    return locator;
}

/** The rows collected by loc() (or the rows given) as a Markdown table. */
function locatorTable(rows = locatorRows) {
    const cell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
    const lines = [
        '| app | screen | element | locator | matches | visible |',
        '|---|---|---|---|---|---|',
    ];
    for (const row of rows) {
        lines.push(
            `| ${cell(row.app)} | ${cell(row.url)} | ${cell(row.description)} | \`${cell(row.locator)}\` | ${cell(row.count)} | ${cell(row.visible)} |`,
        );
    }
    return `${lines.join('\n')}\n`;
}

/**
 * The feature-level screen notes, `.reports/<feature>/screen-notes.md`: the
 * one file every agent that drives the feature's screens reads first and
 * appends to (docs/process/briefs/claim-check.md). Created on first write.
 */
function screenNotesPath() {
    const feature = requireEnv('PROBE_FEATURE', 'the spec id, e.g. PROBE_FEATURE=U03');
    const dir = path.join(REPO_ROOT, '.reports', feature);
    fs.mkdirSync(dir, {recursive: true});
    return path.join(dir, 'screen-notes.md');
}

/**
 * The locator tables the kit appends when a process exits go to the sibling
 * `.reports/<feature>/screen-locators.md`, so screen-notes.md stays the
 * hand-written file agents read whole (docs/process/briefs/claim-check.md).
 */
function appendScreenLocators(heading, body) {
    const file = path.join(path.dirname(screenNotesPath()), 'screen-locators.md');
    const header = fs.existsSync(file)
        ? ''
        : `# ${process.env.PROBE_FEATURE} screen locators\n\nEvery \`loc()\` row from every agent, appended when its process exits; grep it by screen or element. The notes are in screen-notes.md.\n`;
    fs.appendFileSync(file, `${header}\n## ${heading}\n\n${body.endsWith('\n') ? body : `${body}\n`}`);
}

/**
 * Append one line to the feature's screen notes at once, under this agent's
 * id: a dialog that appears on the way out of a screen, a premise that
 * proved wrong, a wait that hangs, anything a locator row cannot carry.
 *
 * @param {string} text one line, product words plus the selector if any
 */
function note(text) {
    const agent = process.env.PROBE_AGENT || 'unknown';
    const app = process.env.PKP_APP_NAME ? ` [${process.env.PKP_APP_NAME}]` : '';
    const file = screenNotesPath();
    const header = fs.existsSync(file)
        ? ''
        : `# ${process.env.PROBE_FEATURE} screen notes\n\nRead first, append as you learn (docs/process/briefs/claim-check.md).\n`;
    fs.appendFileSync(file, `${header}- ${agent}${app}: ${String(text).replace(/\s+/g, ' ').trim()}\n`);
}

/**
 * Wait until jQuery has no in-flight requests (legacy grids, AjaxModals)
 * and the network has been quiet for half a second, which is when a Vue
 * panel that fetches its own data on landing (a dashboard tab, a workflow
 * step's discussions panel) is actually on screen. The quiet wait gives up
 * silently after five seconds, so a page that keeps polling cannot hang a
 * script.
 */
async function idle(page) {
    await waitForJQueryIdle(page);
    await page.waitForLoadState('networkidle', {timeout: 5_000}).catch(() => {});
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait until a control has filled: `idle(page)`, then the locator visible
 * with a non-empty innerText (input value for a form control) that stays
 * the same across two reads 150 ms apart. Returns the text. For pages and
 * windows that fill after their own request (a Composer page, a legacy
 * side window loaded by AJAX, a Vue side window built from a fetched
 * publication), which `idle()` and `screen()` read before they fill. On
 * timeout it returns whatever text is there and records `{settled: false}`
 * in the run record's `warnings`; it never throws for the timeout.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} locator
 * @param {{timeout?: number}} [options] milliseconds, default 15000
 */
async function settled(page, locator, {timeout = 15_000} = {}) {
    await idle(page);
    const deadline = Date.now() + timeout;
    const read = async () => {
        const element = locator.first();
        if ((await element.count()) === 0 || !(await element.isVisible())) {
            return null;
        }
        const tagName = await element.evaluate((node) => node.tagName.toLowerCase());
        return ['input', 'textarea', 'select'].includes(tagName)
            ? element.inputValue()
            : element.innerText();
    };
    let last = null;
    while (Date.now() < deadline) {
        const first = await read().catch(() => null);
        await pause(150);
        if (first === null || first.trim() === '') {
            continue;
        }
        const second = await read().catch(() => null);
        if (second === first) {
            return first;
        }
        last = second ?? first;
    }
    const record = currentRecord();
    if (record) {
        record.warnings.push({
            at: new Date().toISOString(),
            settled: false,
            locator: String(locator),
            url: page.url(),
            timeout,
            text: String(last ?? '').slice(0, 300),
        });
    }
    return last ?? '';
}

/**
 * A unique scratch tag: `<prefix><agent><random>`, a single lowercase
 * alphanumeric token of at most 32 characters (patterns.md "Tag
 * conventions"), so it works as a context path, a username and a search
 * term.
 *
 * @param {string} prefix e.g. "u03reg"
 */
function tag(prefix) {
    const agent = (process.env.PROBE_AGENT || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const value = `${String(prefix).toLowerCase().replace(/[^a-z0-9]/g, '')}${agent}${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    if (value.length > 32) {
        throw new Error(`probe: tag "${value}" exceeds 32 characters — shorten the prefix`);
    }
    return value;
}

module.exports = {
    PROBE_PORT_OFFSET,
    requireEnv,
    resolveProbeApp,
    forEachApp,
    launch,
    signIn,
    signOut,
    screen,
    shot,
    record,
    loc,
    note,
    idle,
    settled,
    tag,
    outDir,
    users,
};
