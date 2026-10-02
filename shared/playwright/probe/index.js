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
const {execFileSync} = require('child_process');
const {chromium} = require('@playwright/test');
const {request} = require('@playwright/test');
const {APPS, REPO_ROOT, resolveApp, resolveLine, resolveSlot} = require('../../../bin/apps.js');
const {PkpApi, API_BASE} = require('../support/api.js');
const {PkpMail} = require('../support/mail.js');
const {waitForJQueryIdle} = require('../support/legacy.js');
const {disableMotion} = require('../support/motion.js');
const {LoginPage} = require('../pages/LoginPage.js');
const {readEnvFile} = require('../support/env.js');
const users = require('../data/users.js');
const {VALIDATION_PORT_OFFSET} = require('../config-factory.js');
const {datasetNumber, datasetFleet} = require('../dataset.js');

const PROBE_PORT_OFFSET = 50;
const CONTEXT_TABLES = {
    ojs: {table: 'journals', id: 'journal_id', settings: 'journal_settings'},
    omp: {table: 'presses', id: 'press_id', settings: 'press_settings'},
    ops: {table: 'servers', id: 'server_id', settings: 'server_settings'},
};
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
 * in play) the name is returned unchanged. With PROBE_RUN set (r1, r2) the
 * run goes before the app, `<name>-<run>-<app>`, so two runs of one script
 * started at once into one folder never share a file.
 */
function appSuffixed(name) {
    const app = process.env.PKP_APP_NAME;
    const run = process.env.PROBE_RUN ? requireEnv('PROBE_RUN', 'a run id, e.g. PROBE_RUN=r1') : '';
    let base = safeName(name);
    if (app && base.endsWith(`-${app}`)) {
        base = base.slice(0, -app.length - 1);
    }
    if (run && !base.endsWith(`-${run}`)) {
        base = `${base}-${run}`;
    }
    return app ? `${base}-${app}` : base;
}

/**
 * A path in the output folder for a file the script writes itself (a state
 * file, a download, an upload): `outFile('users-main.xml')` is
 * `<outDir>/users-main[-<PROBE_RUN>]-<app>.xml`, named as record() and
 * shot() name theirs.
 *
 * @param {string} name a file name with its extension
 */
function outFile(name) {
    const ext = path.extname(String(name));
    return path.join(outDir(), `${appSuffixed(String(name).slice(0, String(name).length - ext.length))}${ext}`);
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
    // A dataset fleet (PKP_E2E_DATASET=n; harness.md "Dataset fleets"): the
    // install loaded from PKP's default test dataset, on its own port,
    // config and database beside the campaign's.
    const datasetN = datasetNumber();
    const dataset = datasetN ? datasetFleet(name, datasetN) : null;
    const port = dataset ? dataset.port : basePort + PROBE_PORT_OFFSET;
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
    const configFile = dataset ? dataset.configFile : env.PKP_CONFIG_FILE || path.join(app.root, 'config.test.inc.php');
    // The runner generates this one next to the default config on every
    // config load (config-factory.js); the kit only reads its location.
    const validationConfigFile = path.join(path.dirname(configFile), 'config.test.validation.inc.php');
    // eslint-disable-next-line import/no-dynamic-require
    const appContext = require(path.join(app.suiteDir, 'support', 'app.context.js'));
    const baseURL = `http://127.0.0.1:${port}`;
    const line = resolveLine();
    return {
        app: name,
        name,
        // The line this process drives (PKP_E2E_LINE; harness.md "The stable
        // lines"): 'main', 'stable-3_5_0', 'stable-3_4_0', 'stable-3_3_0'.
        line: app.line,
        // False on the lines without the `_test` API (3.4, 3.3): no seed, no
        // app.api; lineScratchContext() and lineUser() stand in.
        testApi: !line || line.overlays !== 'install',
        // The dataset fleet number (1–9) when this bag drives a dataset
        // fleet, else null. Sign in as the dataset's users (docs/process/
        // dataset.md): the password is the username twice, `admin`/`admin`.
        dataset: datasetN,
        // The site's primary locale: `en`, `en_US` on 3.3.
        primaryLocale: line && line.locales ? line.locales.split(',')[0] : 'en',
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
        db: dataset ? dataset.db : app.db,
        // The context's own tables, for sql(): the one name set that differs per app.
        contextTables: CONTEXT_TABLES[name],
        contextPath: appContext.contextPath,
        appContext,
        /** Absolute URL on the probe server: url('/index.php/publicknowledge/user/register'). */
        url: (pathname) => `${baseURL}${pathname}`,
        /**
         * Base URL of a fixed alternate server that the runner also uses.
         * 'validation' = basePort + 90: email validation and ALTCHA on.
         */
        variant: (kind) => {
            if (dataset) {
                throw new Error('probe: a dataset fleet has no variant servers (harness.md "Dataset fleets")');
            }
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
// A console error that opens with a JavaScript error's name: a script
// failure caught and logged (Vue's error handler), not a message.
// A legacy handler request ($$$call$$$, as typed or percent-encoded): its saves
// answer 200 even when refused, so the record keeps it like an /api/ call.
const LEGACY_CALL = /\$\$\$call\$\$\$|%24%24%24call%24%24%24/;
// Server errors the test installs give on every visit, not findings: the
// dead [proxy] (seed-facts.md "Install defaults"). A crash matching one is
// kept with `known` and left out of the "each is a finding" count.
const KNOWN_ENVIRONMENT = [
    {url: /plugin-gallery-grid\/fetch-grid/, known: 'the Plugin Gallery list behind the dead [proxy] (seed-facts.md "Install defaults")'},
];
const JS_ERROR = /^(?:Uncaught (?:\(in promise\) )?)?(?:TypeError|ReferenceError|RangeError|SyntaxError|URIError|EvalError|AggregateError)\b/;
const consoleTallies = new WeakMap(); // run record → {types: {type: n}, lines: Map(warning line → n)}
function consoleTally(record) {
    if (!consoleTallies.has(record)) {
        consoleTallies.set(record, {types: {}, lines: new Map()});
    }
    return consoleTallies.get(record);
}

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
            // Every page notice (the top-right toasts in
            // `.app__notifications`) as it appears: they expire after 5 s,
            // before a settled screen() can read them.
            notices: [],
            warnings: [],
            // Every response of 500 or more, every uncaught page error and
            // every console error naming a JavaScript error (`caught: true`,
            // one Vue's error handler logged): the app failing, a finding
            // on its own (GLOSSARY "crash").
            crashes: [],
        });
    }
    return runs.get(app.name);
}

/** The record of the app in play (withApp sets PKP_APP_NAME), or null. */
function currentRecord() {
    return runs.get(process.env.PKP_APP_NAME) || null;
}

const runFiles = new Map(); // app name → this process's run-record file

/**
 * Every process of an agent keeps its own files: the run record is
 * `run-<app>-<HHMMSS>.json` (HHMMSS from startedAt; `-<pid>` added when
 * another process of the same second wrote that name first) and the
 * locator rows are appended to locators.md under a dated heading, so a
 * script run in phases, one process each, loses nothing from the earlier
 * phases.
 */
function flush() {
    if (runs.size === 0 && locatorRows.length === 0) {
        return; // nothing ran (a tool merely required the kit)
    }
    try {
        const dir = outDir();
        for (const record of runs.values()) {
            record.endedAt = new Date().toISOString();
            if (!runFiles.has(record.app)) {
                const stamp = record.startedAt.slice(11, 19).replace(/:/g, '');
                const taken = path.join(dir, `run-${record.app}-${stamp}.json`);
                runFiles.set(
                    record.app,
                    fs.existsSync(taken) ? path.join(dir, `run-${record.app}-${stamp}-${process.pid}.json`) : taken,
                );
            }
            const file = runFiles.get(record.app);
            fs.writeFileSync(file, JSON.stringify(record, null, 2));
            const findings = record.crashes.filter((c) => !c.known);
            const known = record.crashes.length - findings.length;
            if (findings.length > 0) {
                const server = findings.filter((c) => c.kind === 'server').length;
                const script = findings.length - server;
                console.error(
                    `[probe] ${record.app}: the app failed ${findings.length} time(s) during this run ` +
                        `(${server} server error(s), ${script} page script error(s)); each is a finding — ` +
                        `see "crashes" in ${path.basename(file)}`,
                );
            }
            if (known > 0) {
                console.error(`[probe] ${record.app}: ${known} known test-install failure(s), not findings ("known" in "crashes")`);
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
    const openBefore = new Set(openBrowsers);
    try {
        return await fn(app);
    } finally {
        // A browser `fn` launched and never closed (a throw before its
        // `finally`, a `finally` that threw) would keep the process alive.
        for (const close of [...openBrowsers].filter((c) => !openBefore.has(c))) {
            await close();
        }
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

const openBrowsers = new Set(); // the close() of every launch() not closed yet
const pageNotices = new WeakMap(); // page → notice texts screen() has not returned yet

/**
 * Init script: report each page notice (a toast in `.app__notifications`,
 * the Vue pages' and the legacy forms' saves and refusals) once, as it
 * appears, without its close button's words.
 */
function watchNotices() {
    const seen = new WeakSet();
    const report = (element) => {
        if (seen.has(element) || !window.__probeNotice) {
            return;
        }
        const closeButton = element.querySelector('.pkpNotification__closeButton');
        let text = element.textContent || '';
        if (closeButton) {
            text = text.replace(closeButton.textContent || '', '');
        }
        text = text.replace(/\s+/g, ' ').trim();
        if (text) {
            seen.add(element);
            window.__probeNotice(text);
        }
    };
    new MutationObserver(() => {
        document.querySelectorAll('.app__notifications .pkpNotification').forEach(report);
    }).observe(document, {childList: true, subtree: true, characterData: true});
}

/**
 * A headless Chromium at 1280×900 with animations off, baseURL on the probe
 * server, and a response listener that records URL, method, status and size
 * (never a body) for `/api/` and `$$$call$$$` calls and every status ≥ 400 into the run
 * record. A status ≥ 500, an uncaught page error and a console error
 * opening with a JavaScript error's name (a failure Vue caught and logged)
 * also go into the record's `crashes` list (kind `server` | `script`), counted on the
 * console when the process ends; every page notice goes into its
 * `notices` as it appears (screen() returns the page's new ones).
 * Returns {browser, context, page, close}; a browser still open when
 * withApp's `fn` ends is closed there.
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
    if (keepRecord) {
        await context.exposeBinding('__probeNotice', ({page: source}, text) => {
            const entry = {at: new Date().toISOString(), text: String(text).slice(0, 300), url: source ? source.url() : null};
            if (record.notices.length < CONSOLE_CAP) {
                record.notices.push(entry);
            }
            if (source) {
                pageNotices.set(source, [...(pageNotices.get(source) || []), entry.text]);
            }
        });
        await context.addInitScript(watchNotices);
    }
    if (keepRecord) context.on('response', (response) => {
        const url = response.url();
        const status = response.status();
        if (!url.includes('/api/') && !LEGACY_CALL.test(url) && status < 400) {
            return;
        }
        const entry = {
            at: new Date().toISOString(),
            method: response.request().method(),
            url,
            status,
            size: null,
        };
        // The Vue forms send PUT and DELETE as a POST with this header
        // (patterns.md "UI realities"): a listener keyed on PUT misses them.
        const override = response.request().headers()['x-http-method-override'];
        if (override) {
            entry.override = override;
        }
        record.responses.push(entry);
        if (status >= 500 && record.crashes.length < CONSOLE_CAP) {
            const env = KNOWN_ENVIRONMENT.find((k) => k.url.test(url));
            record.crashes.push({at: entry.at, kind: 'server', status, method: entry.method, url, ...(env ? {known: env.known} : {})});
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
    context.on('page', trackTraffic); // idle() waits out a press's requests
    const page = await context.newPage();
    // Console errors and warnings and uncaught page errors go into the run
    // record, each type under its own cap, and a warning whose first line
    // is already kept three times is only counted (`consoleRepeats`):
    // TinyMCE's "fire" deprecation warning, logged at every editor mount,
    // filled one shared cap within a minute and hid every later error (U29
    // I30). A script that needs every level attaches its own listener.
    const logConsole = (type, text, url) => {
        const tally = consoleTally(record);
        if (type === 'warning') {
            const line = String(text).split('\n')[0].slice(0, 200);
            const seen = (tally.lines.get(line) || 0) + 1;
            tally.lines.set(line, seen);
            if (seen > 3) {
                record.consoleRepeats = record.consoleRepeats || {};
                record.consoleRepeats[line] = seen - 3;
                return;
            }
        }
        if ((tally.types[type] || 0) >= CONSOLE_CAP) {
            return;
        }
        tally.types[type] = (tally.types[type] || 0) + 1;
        record.console.push({at: new Date().toISOString(), type, text: String(text).slice(0, 300), url});
    };
    if (keepRecord) page.on('console', (message) => {
        const type = message.type();
        if (type === 'error' || type === 'warning') {
            const text = message.text();
            logConsole(type, text, (message.location() || {}).url || page.url());
            // Vue's error handler catches a component's script failure and
            // logs it as a console error ("TypeError: …") instead of
            // throwing, so no pageerror fires: it is a crash all the same
            // (U28 I30, the OPS home-made reviewer list).
            if (type === 'error' && JS_ERROR.test(text) && record.crashes.length < CONSOLE_CAP) {
                record.crashes.push({at: new Date().toISOString(), kind: 'script', caught: true, text: String(text).split('\n')[0].slice(0, 300), url: page.url()});
            }
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
    const close = async () => {
        openBrowsers.delete(close);
        await context.close().catch(() => {});
        await browser.close().catch(() => {});
    };
    openBrowsers.add(close);
    return {browser, context, page, close};
}

/**
 * Sign in through the real login form on the page's own server (the probe
 * server unless `origin` names another, e.g. app.variant('validation')).
 * `contextPath` uses that journal's own login page instead of the site's,
 * which is what decides where the user lands afterwards. An open session is
 * signed out first (the login page would otherwise send it home silently).
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} username a roster username (users.md), a dataset user on a dataset fleet (dataset.md) or a scratch user
 * @param {{password?: string, origin?: string, contextPath?: string}} [options]
 */
async function signIn(page, username, {password, origin = '', contextPath} = {}) {
    const loginPage = new LoginPage(page);
    const open = async () => {
        await page.goto(`${origin}/index.php/${contextPath || 'index'}${urlLocale()}/login`);
    };
    await open();
    if ((await loginPage.usernameInput.count()) === 0) {
        await signOut(page, {origin});
        await open();
    }
    await loginPage.signIn(username, password || users.getPassword(username));
}

/**
 * The locale segment of a page address: `/en` from 3.5 on, none on 3.4 and
 * 3.3, whose page addresses carry no locale (`/index.php/index/login`).
 */
function urlLocale() {
    const line = resolveLine();
    return line && line.overlays === 'install' ? '' : '/en';
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
 * request is on screen before it is recorded. `notices` lists the page
 * notices shown on this page since its previous screen() (or launch), in
 * order: a toast lives 5 s, so the settled read would miss it.
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
        notices: takeNotices(page),
    };
}

/** The notice texts shown on the page since the last call, oldest first. */
function takeNotices(page) {
    const texts = pageNotices.get(page) || [];
    pageNotices.delete(page);
    return texts;
}

/**
 * Every raw locale key (`##key##`) left on the page, for a translated-page
 * sweep: text nodes (`<option>` labels and screen-reader-only text
 * included) and every attribute, plus the document title. One string per
 * key and place, `"##key## @ <landmark> > <element> (<text|attribute>)"`,
 * with ", hidden" when the element is not rendered; `[]` when there are
 * none. `scope` (a CSS selector) narrows the read to the first match, and
 * returns null when nothing matches. Read the raw text, never
 * `screen().text`: innerText follows CSS `text-transform`, so an
 * upper-cased heading reads like a code (U08 K1, U11 K1, U24 and U07 I29).
 *
 * @param {import('@playwright/test').Page} page
 * @param {{scope?: string}} [options]
 * @returns {Promise<string[]|null>}
 */
async function rawKeys(page, {scope} = {}) {
    return page.evaluate((selector) => {
        const root = selector ? document.querySelector(selector) : document.body;
        if (!root) {
            return null;
        }
        const re = /##[^#\s]+##/g;
        const visible = (el) => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
        const name = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${
            typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''
        }`;
        const where = (el) => {
            const land = el.closest('nav[aria-label], [role="dialog"], header, main, aside, footer, [role="tabpanel"]');
            const label = land && land.getAttribute('aria-label') ? `[${land.getAttribute('aria-label')}]` : '';
            return `${land ? `${land.tagName.toLowerCase()}${land.id ? `#${land.id}` : ''}${label}` : 'body'} > ${name(el)}`;
        };
        const found = new Set();
        const add = (text, el, how) => {
            for (const key of String(text).match(re) || []) {
                found.add(`${key} @ ${where(el)} (${how}${visible(el) ? '' : ', hidden'})`);
            }
        };
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const parent = node.parentElement;
            if (parent && !['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
                add(node.nodeValue, parent, 'text');
            }
        }
        for (const el of [root, ...root.querySelectorAll('*')]) {
            for (const attr of el.attributes) {
                if (!attr.name.startsWith('data-v-')) {
                    add(attr.value, el, attr.name);
                }
            }
        }
        if (!selector) {
            for (const key of document.title.match(re) || []) {
                found.add(`${key} @ <title>`);
            }
        }
        return [...found];
    }, scope || null);
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

// The page's requests in flight, for idle(). Playwright's 'networkidle' fires
// once per document, so after a press on a page already landed it resolves at
// once; these sets are what idle() waits out then.
const pageTraffic = new WeakMap();

function trackTraffic(page) {
    let traffic = pageTraffic.get(page);
    if (!traffic) {
        traffic = {inflight: new Set(), last: 0};
        const start = (req) => {
            traffic.inflight.add(req);
            traffic.last = Date.now();
        };
        const end = (req) => {
            if (traffic.inflight.delete(req)) {
                traffic.last = Date.now();
            }
        };
        page.on('request', start);
        page.on('requestfinished', end);
        page.on('requestfailed', end);
        // A request the previous document left unfinished never reports its
        // end once the page has moved on, so a navigation drops it.
        page.on('framenavigated', (frame) => {
            if (frame !== page.mainFrame()) {
                return;
            }
            for (const req of traffic.inflight) {
                if (!req.isNavigationRequest()) {
                    traffic.inflight.delete(req);
                }
            }
        });
        pageTraffic.set(page, traffic);
    }
    return traffic;
}

/**
 * Wait until jQuery has no in-flight requests (legacy grids, AjaxModals)
 * and the network has been quiet for half a second, which is when a Vue
 * panel that fetches its own data on landing (a dashboard tab, a workflow
 * step's discussions panel) is actually on screen. After a press on a page
 * already landed, it also waits out the requests the press started (a
 * list's debounced fetch after a pager press, a file grid's own fetch, the
 * workflow's refresh after a save): when one is out, or starts within
 * 100 ms, it waits until the page has had none for half a second. Each
 * quiet wait gives up silently after five seconds, so a page that keeps
 * polling cannot hang a script. A script error inside a jQuery ajax
 * callback (a non-JSON answer to a legacy upload or form) leaves
 * `jQuery.active` above 0 for good: after the 30 s jQuery wait the read
 * goes on and the run record's `warnings` gets `{jqueryIdle: false}`,
 * never a throw (U09, U21 issue walks).
 */
async function idle(page) {
    await waitForJQueryIdle(page).catch((error) => {
        if (page.isClosed()) {
            throw error;
        }
        const record = currentRecord();
        if (record) {
            record.warnings.push({at: new Date().toISOString(), jqueryIdle: false, url: page.url()});
        }
        console.warn(`[probe] idle: jQuery.active stayed above 0 for 30 s on ${page.url()}; reading on`);
    });
    await page.waitForLoadState('networkidle', {timeout: 5_000}).catch(() => {});
    const traffic = trackTraffic(page);
    const began = Date.now();
    await pause(100);
    if (traffic.inflight.size === 0 && traffic.last < began) {
        return;
    }
    const deadline = began + 5_000;
    while (Date.now() < deadline && !page.isClosed()) {
        if (traffic.inflight.size === 0 && Date.now() - traffic.last >= 500) {
            return;
        }
        await pause(100);
    }
}

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One SQL statement on the app's own fleet database (`app.db`, slot and
 * line aware), through psql: the rows as text, one per line, columns
 * joined by `|`, trimmed. It throws on an SQL error. The context tables
 * differ per app; `app.contextTables` names them ({table, id, settings}:
 * journals / journal_id / journal_settings on OJS, presses and servers on
 * OMP and OPS).
 *
 * @param {object} app the bag from withApp (or resolveProbeApp)
 * @param {string} query
 */
function sql(app, query) {
    return execFileSync('psql', ['-X', '-d', app.db, '-tA', '-F', '|', '-c', query], {encoding: 'utf8'}).trim();
}

/**
 * The server log of the fleet the bag drives (harness.md "Server output"):
 * a dataset fleet's `server-<port>-ds<n>.log`, which also holds its PHP
 * errors and exceptions (the dataset's config logs to `errorlog`), else
 * the probe server's `server-<port>-probe.log`. The log is the fleet's,
 * written for every agent driving it. `mark()` is its size now;
 * `since(mark)` the lines written after it that match `match` (by default
 * an error, exception, fatal, warning or a 5xx request line).
 *
 * @param {object} app the bag from withApp
 * @param {{match?: RegExp}} [options]
 * @returns {{file: string, mark: () => number, since: (from?: number) => string[]}}
 */
function serverLog(app, {match = /error|exception|fatal|warning|\[5\d\d\]/i} = {}) {
    const kind = app.dataset ? `ds${app.dataset}` : 'probe';
    const file = path.join(app.suiteDir, '.server-logs', `server-${app.port}-${kind}.log`);
    const mark = () => (fs.existsSync(file) ? fs.statSync(file).size : 0);
    const since = (from = 0) =>
        fs.existsSync(file)
            ? fs.readFileSync(file).subarray(from).toString('utf8').split('\n').filter((line) => line && match.test(line))
            : [];
    return {file, mark, since};
}

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
 * Drain the fleet's queued jobs from a probe (a DOI deposit, job-sent
 * mail, a search-index or usage chain). Not `support/jobs.js` `runJobs()`,
 * which is the serial project's and polls worker 0, down outside a run.
 * Runs the app's own worker, `php lib/pkp/tools/jobs.php work
 * --stop-when-empty` under the fleet's test config (a chain's next job is
 * taken in the same pass, where `jobs.php run` returns between two), and
 * passes again while the probe server's `_test/jobs` still counts queued
 * or reserved jobs six seconds later (a failed attempt is back after five,
 * and `--stop-when-empty` exits while it waits). It runs every feature's
 * queued jobs on the fleet, and it never throws for a job that fails:
 * the caller reads the outcome on screen or in Mailpit.
 *
 * @param {object} app the bag from withApp
 * @param {{passes?: number, timeoutMs?: number}} [options] timeoutMs per pass
 * @returns {Promise<{passes: number, counts: object|null, output: string}>}
 *   `counts` is the last {queued, reserved}; `output` the worker's output
 */
async function drainJobs(app, {passes = 6, timeoutMs = 300_000} = {}) {
    const work = () => {
        try {
            return execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {
                cwd: app.root,
                env: {...process.env, PKP_CONFIG_FILE: app.configFile},
                encoding: 'utf8',
                timeout: timeoutMs,
                maxBuffer: 16 * 1024 * 1024,
            });
        } catch (error) {
            if (error && typeof error.stdout === 'string') {
                return `${error.stdout}${error.stderr || ''}`;
            }
            throw error;
        }
    };
    const counts = async () => {
        const response = await app.api.context.get(`${API_BASE}/jobs`, {failOnStatusCode: false});
        return response.ok() ? response.json() : null;
    };
    const output = [];
    let last = null;
    for (let pass = 1; pass <= passes; pass++) {
        output.push(work());
        await pause(6_000);
        last = await counts();
        if (last && last.queued === 0 && last.reserved === 0) {
            return {passes: pass, counts: last, output: output.join('')};
        }
    }
    return {passes, counts: last, output: output.join('')};
}

// ---------------------------------------------------------------------------
// The lines without the `_test` API (3.4, 3.3; harness.md "The stable lines")

/**
 * Create a user on a 3.4 or 3.3 install through the app's own classes
 * (the line's tools/lineUser.php, mounted by `npm run mount`), optionally
 * with a role in a context. The password defaults to the roster rule
 * (users.getPassword: the username twice).
 *
 * @param {object} app the withApp bag
 * @param {{username: string, password?: string, email?: string, givenName?: string, familyName?: string, contextPath?: string, role?: string}} options
 *   role: manager (default with a contextPath) | subeditor | assistant | author | reviewer | reader
 * @returns {{userId: number, contextId: number|null, userGroupId: number|null, username: string, password: string}}
 */
function lineUser(app, {username, password, email, givenName, familyName, contextPath, role} = {}) {
    if (!username) {
        throw new Error('probe: lineUser needs a username');
    }
    password = password || users.getPassword(username);
    const args = [
        path.join('tools', 'lineUser.php'),
        '--username', username,
        '--password', password,
        '--email', email || `${username}@mail.test`,
        ...(givenName ? ['--given', givenName] : []),
        ...(familyName ? ['--family', familyName] : []),
        ...(contextPath ? ['--context', contextPath, '--role', role || 'manager'] : []),
    ];
    const out = execFileSync('php', args, {
        cwd: app.root,
        encoding: 'utf8',
        env: {...process.env, PKP_CONFIG_FILE: app.configFile},
    });
    const json = out.trim().split('\n').pop();
    return {...JSON.parse(json), username, password};
}

/**
 * A scratch journal / press / server on a 3.4 or 3.3 install, with a manager
 * who can sign in: the context goes through `POST /api/v1/contexts` in the
 * admin's session (what Administration › Hosted Journals › Create posts;
 * the admin becomes one of its managers, as through the screens), the
 * manager through lineUser(). `page` must be signed in as `admin`. The
 * context is enabled and speaks the site's primary locale.
 *
 * @param {object} app the withApp bag
 * @param {import('@playwright/test').Page} page signed in as admin
 * @param {{path?: string, name?: string, manager?: string}} [options]
 *   path defaults to a fresh tag('ctx'); manager (a username) to `<path>mgr`
 * @returns {Promise<{contextId: number, path: string, name: string, manager: {username: string, password: string, userId: number}}>}
 */
async function lineScratchContext(app, page, {path: urlPath, name, manager} = {}) {
    urlPath = urlPath || tag('ctx');
    name = name || `Scratch ${urlPath}`;
    const locale = app.primaryLocale;
    await page.goto(`${app.baseURL}/index.php/index/admin`);
    const csrfToken = await page.evaluate(() => {
        const pkp = window.pkp || ((window.$ || {}).pkp);
        return (pkp && pkp.currentUser && pkp.currentUser.csrfToken) || null;
    });
    if (!csrfToken) {
        throw new Error('probe: lineScratchContext found no CSRF token on the admin page — is the page signed in as admin?');
    }
    const response = await page.request.post(`${app.baseURL}/index.php/index/api/v1/contexts`, {
        headers: {'X-Csrf-Token': csrfToken},
        data: {
            name: {[locale]: name},
            acronym: {[locale]: urlPath.slice(0, 8).toUpperCase()},
            urlPath,
            primaryLocale: locale,
            supportedLocales: [locale],
            contactName: 'Scratch Contact',
            contactEmail: `${urlPath}@mail.test`,
            enabled: true,
        },
    });
    const body = await response.text();
    if (!response.ok()) {
        throw new Error(`probe: POST /api/v1/contexts answered ${response.status()}: ${body.slice(0, 500)}`);
    }
    const context = JSON.parse(body);
    const username = manager || `${urlPath}mgr`.slice(0, 32);
    const created = lineUser(app, {username, contextPath: urlPath, role: 'manager', givenName: 'Scratch', familyName: 'Manager'});
    return {
        contextId: context.id,
        path: urlPath,
        name,
        manager: {username, password: created.password, userId: created.userId},
    };
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
    rawKeys,
    shot,
    record,
    loc,
    note,
    idle,
    settled,
    drainJobs,
    sql,
    serverLog,
    tag,
    lineUser,
    lineScratchContext,
    outDir,
    outFile,
    users,
};
