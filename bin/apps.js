/**
 * @file bin/apps.js
 *
 * The app registry: fleet identity per app plus checkout resolution.
 * Checkout paths come from the repo .env (<APP>_ROOT), e.g.
 *
 *   OJS_ROOT=/home/me/ojs
 *
 * PKP_E2E_SLOT=<n> in the repo .env marks this clone as parallel slot n
 * (harness.md "Slots"): every port, DB name, Mailpit and API key below is
 * shifted for it, so slot clones on one machine never share a fleet.
 */
const path = require('path');
const fs = require('fs');
const {loadEnv} = require('../shared/playwright/support/env.js');

const REPO_ROOT = path.resolve(__dirname, '..');

const APPS = {
    ojs: {basePort: 8000},
    omp: {basePort: 8100},
    ops: {basePort: 8200},
};

// Further sets of checkouts on the stable branches, beside the `main` ones
// (harness.md "The stable lines"): checkouts/<line>/<app>, ports shifted, DBs
// suffixed, so every line stays up side by side. PKP_E2E_LINE selects one for
// every script that resolves an app here; unset is `main`.
//
// `php` names the PHP a line runs on when it is not the system `php`: the
// binary php<version> on PATH (/usr/bin/php8.2 from the sury packages), else
// checkouts/runtimes/php<version>/bin/php. resolveLine() puts a shim dir
// holding `php` for it first on PATH, so every child the harness spawns (the
// php -S servers, installTest, jobs.php, composer) runs on it. `node` names
// the Node release fetch-apps builds the line's JS with (downloaded once to
// checkouts/runtimes/node-v<version>-linux-x64); the harness itself, Playwright
// included, stays on the system Node. `overlays` says which PHP overlays
// mount copies: 'main' (the full set, guarded for 3.5) or 'install' (only
// tools/installTest.php from shared/php-lines/<line>/, harness.md "The stable
// lines").
const LINES = {
    'stable-3_5_0': {branch: 'stable-3_5_0', portShift: 1000, dbSuffix: '_3_5', overlays: 'main'},
    'stable-3_4_0': {branch: 'stable-3_4_0', portShift: 2000, dbSuffix: '_3_4', overlays: 'install', php: '8.2', node: '16.20.2'},
    // 3.3 names its locales en_US-style (3.4 moved to `en`).
    'stable-3_3_0': {branch: 'stable-3_3_0', portShift: 3000, dbSuffix: '_3_3', overlays: 'install', php: '8.2', node: '12.22.12', locales: 'en_US,fr_CA'},
};
const RUNTIMES_DIR = path.join(REPO_ROOT, 'checkouts', 'runtimes');

// Parallel slots (harness.md "Slots"): slot n shifts every port by n × 300
// (clear of the +1000 line shift and of the +0…+90 fleet bands), suffixes
// the DBs with _s<n> and gets its own Mailpit (8025+n / SMTP 1025+n) and
// TEST_API_KEY. Slot 0 is the unshifted default, so CI and a lone clone see
// exactly the old values.
const SLOT_PORT_STEP = 300;

/** @returns {{n: number, portShift: number, dbSuffix: string, mailpitUrl: string, smtpPort: number, apiKey: string}} */
function resolveSlot() {
    loadEnv(REPO_ROOT, '.env');
    const raw = process.env.PKP_E2E_SLOT || '0';
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0 || n > 9) {
        console.error(`PKP_E2E_SLOT="${raw}" is not a slot number (0–9)`);
        process.exit(1);
    }
    return {
        n,
        portShift: n * SLOT_PORT_STEP,
        dbSuffix: n ? `_s${n}` : '',
        mailpitUrl: `http://127.0.0.1:${8025 + n}`,
        smtpPort: 1025 + n,
        apiKey: n ? `playwright-test-key-s${n}` : 'playwright-test-key',
    };
}

/** The test DB name of an app on this slot and line. */
function dbName(name, line = resolveLine()) {
    return `${name}_test${resolveSlot().dbSuffix}${line ? line.dbSuffix : ''}`;
}

/** @returns {{name: string, branch: string, portShift: number, dbSuffix: string, overlays: string, php?: string, node?: string}|null} */
function resolveLine(name = process.env.PKP_E2E_LINE) {
    if (!name || name === 'main') {
        return null;
    }
    if (!LINES[name]) {
        console.error(`Unknown line "${name}" — one of: main, ${Object.keys(LINES).join(', ')}`);
        process.exit(1);
    }
    const line = {name, ...LINES[name]};
    if (line.php) {
        usePhp(line);
    }
    return line;
}

/** Is `file` an executable file? */
function executable(file) {
    try {
        fs.accessSync(file, fs.constants.X_OK);
        return fs.statSync(file).isFile();
    } catch {
        return false;
    }
}

/**
 * The PHP binary a line runs on: PKP_E2E_PHP (a path or a name on PATH, for
 * trying another version), else php<version> on PATH, else the user-space
 * build under checkouts/runtimes/php<version>/bin/php. Null when none exists.
 */
function linePhpBinary(line) {
    const wanted = process.env.PKP_E2E_PHP || `php${line.php}`;
    if (wanted.includes('/')) {
        return executable(path.resolve(wanted)) ? path.resolve(wanted) : null;
    }
    const shimDir = path.join(RUNTIMES_DIR, 'shims');
    for (const dir of (process.env.PATH || '').split(path.delimiter)) {
        if (dir && !dir.startsWith(shimDir) && executable(path.join(dir, wanted))) {
            return path.join(dir, wanted);
        }
    }
    const local = path.join(RUNTIMES_DIR, `php${line.php}`, 'bin', 'php');
    return !process.env.PKP_E2E_PHP && executable(local) ? local : null;
}

/**
 * Put a shim dir holding `php` → the line's PHP first on PATH (idempotent),
 * so this process's children run on it. Exits with a hint when the line's
 * PHP is not installed.
 */
function usePhp(line) {
    const binary = linePhpBinary(line);
    if (!binary) {
        console.error(
            `${line.name} runs on PHP ${line.php}, which is not installed: no php${line.php} on PATH and no ` +
                `${path.relative(REPO_ROOT, path.join(RUNTIMES_DIR, `php${line.php}`, 'bin', 'php'))} ` +
                `(harness.md "The stable lines"; PKP_E2E_PHP=<binary> tries another one)`,
        );
        process.exit(1);
    }
    const shimDir = path.join(RUNTIMES_DIR, 'shims', path.basename(binary) === 'php' ? `php-${line.name}` : path.basename(binary));
    const shim = path.join(shimDir, 'php');
    let current = null;
    try {
        current = fs.readlinkSync(shim);
    } catch {
        // absent
    }
    if (current !== binary) {
        fs.mkdirSync(shimDir, {recursive: true});
        const tmp = `${shim}.${process.pid}.tmp`;
        fs.symlinkSync(binary, tmp);
        fs.renameSync(tmp, shim);
    }
    const parts = (process.env.PATH || '').split(path.delimiter).filter((dir) => dir !== shimDir);
    process.env.PATH = [shimDir, ...parts].join(path.delimiter);
    process.env.PKP_E2E_LINE_PHP = binary;
}

/** @returns {{name: string, root: string, suiteDir: string, basePort: number, line: string, slot: number, db: string}} */
function resolveApp(name) {
    if (!APPS[name]) {
        console.error(`Unknown app "${name}" — one of: ${Object.keys(APPS).join(', ')}`);
        process.exit(1);
    }
    loadEnv(REPO_ROOT, '.env');
    const line = resolveLine();
    const slot = resolveSlot();
    if (line) {
        const root = path.join(REPO_ROOT, 'checkouts', line.name, name);
        if (!fs.existsSync(path.join(root, 'config.TEMPLATE.inc.php'))) {
            console.error(`No ${line.name} checkout of ${name} — npm run fetch-apps -- --line ${line.name} ${name}`);
            process.exit(1);
        }
        return {
            name,
            root,
            suiteDir: path.join(REPO_ROOT, 'apps', name, 'playwright'),
            basePort: APPS[name].basePort + slot.portShift + line.portShift,
            line: line.name,
            slot: slot.n,
            db: dbName(name, line),
        };
    }
    // Relative <APP>_ROOT values (the self-contained checkouts/<app> default)
    // are anchored to the repo root, not the caller's cwd.
    const raw = process.env[`${name.toUpperCase()}_ROOT`];
    const root = raw && path.resolve(REPO_ROOT, raw);
    if (!root || !fs.existsSync(path.join(root, 'config.TEMPLATE.inc.php'))) {
        console.error(
            `${name.toUpperCase()}_ROOT is not set (or is not an app checkout). ` +
                `Set it in ${path.join(REPO_ROOT, '.env')} — see .env.example.`
        );
        process.exit(1);
    }
    return {
        name,
        root,
        suiteDir: path.join(REPO_ROOT, 'apps', name, 'playwright'),
        basePort: APPS[name].basePort + slot.portShift,
        line: 'main',
        slot: slot.n,
        db: dbName(name, null),
    };
}

/** The apps whose <APP>_ROOT the repo .env names (on a line: whose checkout exists), in registry order. */
function configuredApps() {
    loadEnv(REPO_ROOT, '.env');
    const line = resolveLine();
    if (line) {
        return Object.keys(APPS).filter((name) =>
            fs.existsSync(path.join(REPO_ROOT, 'checkouts', line.name, name, 'config.TEMPLATE.inc.php')));
    }
    return Object.keys(APPS).filter((name) => !!process.env[`${name.toUpperCase()}_ROOT`]);
}

module.exports = {APPS, LINES, REPO_ROOT, RUNTIMES_DIR, SLOT_PORT_STEP, resolveApp, resolveLine, resolveSlot, dbName, configuredApps};
