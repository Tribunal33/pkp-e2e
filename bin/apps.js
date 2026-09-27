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

// A second set of checkouts on a stable branch, beside the `main` ones
// (harness.md "The fleets"): checkouts/<line>/<app>, ports shifted, DBs
// suffixed, so both lines stay up side by side. PKP_E2E_LINE selects one for
// every script that resolves an app here; unset is `main`.
const LINES = {
    'stable-3_5_0': {branch: 'stable-3_5_0', portShift: 1000, dbSuffix: '_3_5'},
};

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

/** @returns {{name: string, branch: string, portShift: number, dbSuffix: string}|null} */
function resolveLine(name = process.env.PKP_E2E_LINE) {
    if (!name || name === 'main') {
        return null;
    }
    if (!LINES[name]) {
        console.error(`Unknown line "${name}" — one of: main, ${Object.keys(LINES).join(', ')}`);
        process.exit(1);
    }
    return {name, ...LINES[name]};
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

module.exports = {APPS, LINES, REPO_ROOT, SLOT_PORT_STEP, resolveApp, resolveLine, resolveSlot, dbName, configuredApps};
