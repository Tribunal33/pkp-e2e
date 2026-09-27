#!/usr/bin/env node
/**
 * @file bin/fleet-prep.js
 *
 * Get the fleets ready for a feature's probe phase in one command:
 *
 *   npm run fleet-prep -- --feature U03 [--reset] [--apps ojs,omp]
 *
 * Per app, sequentially: optional `npm run reset:<app>`; the runner's setup
 * project (`playwright test -c configs/<app>.config.js --project=setup`),
 * which installs and seeds a cold DB and is a sub-second no-op on a warm
 * one; then `probe-servers --start --app <app>`. Logs go to
 * .reports/<feature>/{reset,setup}-<app>.log and the result to
 * .reports/<feature>/fleet.json (apps, ports, probe ports, dates).
 *
 * The setup project brings the runner's own servers up and down (worker
 * ports and the validation variant), so nothing must be listening on those
 * ports first: a leftover manual server would be adopted through
 * reuseExistingServer. A start race right after a reset is known
 * (harness.md "Running"), so the setup project is retried once.
 */
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {APPS, REPO_ROOT} = require('./apps.js');
const {resolveProbeApp} = require('../shared/playwright/probe/index.js');

const USAGE = 'usage: node bin/fleet-prep.js --feature <id> [--reset] [--apps ojs,omp,ops]';

function parseArgs(argv) {
    const options = {feature: null, reset: false, apps: Object.keys(APPS)};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--feature') {
            options.feature = argv[++i];
        } else if (arg === '--reset') {
            options.reset = true;
        } else if (arg === '--apps') {
            options.apps = String(argv[++i] || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        } else {
            console.error(`fleet-prep: unknown argument "${arg}"\n${USAGE}`);
            process.exit(1);
        }
    }
    if (!options.feature || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(options.feature)) {
        console.error(`fleet-prep: --feature <id> is required (a plain token, e.g. U03)\n${USAGE}`);
        process.exit(1);
    }
    for (const name of options.apps) {
        if (!APPS[name]) {
            console.error(`fleet-prep: unknown app "${name}" — one of ${Object.keys(APPS).join(', ')}`);
            process.exit(1);
        }
    }
    return options;
}

/** Run a command with stdout+stderr appended to logFile; returns the exit code. */
function runLogged(label, command, args, logFile) {
    const started = Date.now();
    const result = spawnSync(command, args, {
        cwd: REPO_ROOT,
        env: process.env,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
    });
    fs.appendFileSync(
        logFile,
        `# ${new Date().toISOString()} ${label}: ${command} ${args.join(' ')}\n` +
            (result.stdout || '') +
            (result.stderr || '') +
            `# exit ${result.status} after ${((Date.now() - started) / 1000).toFixed(1)} s\n`,
    );
    const code = result.status ?? 1;
    console.log(
        `fleet-prep: ${label} → ${code === 0 ? 'ok' : `FAILED (exit ${code})`} in ${((Date.now() - started) / 1000).toFixed(1)} s` +
            ` (log ${path.relative(REPO_ROOT, logFile)})`,
    );
    return code;
}

const {feature, reset, apps} = parseArgs(process.argv.slice(2));
// Resets and setup runs under one hold of the machine's test lock
// (shared/playwright/test-lock.js).
require('../shared/playwright/test-lock.js').acquire(`fleet-prep ${process.argv.slice(2).join(' ')}`);
const reportDir = path.join(REPO_ROOT, '.reports', feature);
fs.mkdirSync(reportDir, {recursive: true});
const fleetFile = path.join(reportDir, 'fleet.json');
const fleet = {
    feature,
    startedAt: new Date().toISOString(),
    reset,
    workers: process.env.PLAYWRIGHT_WORKERS || 'auto',
    apps: {},
};
// A run for a subset of the apps keeps the other apps' entries from the
// previous fleet.json, so a single-app re-prep never drops fleets that are
// still up (a probe agent reads this file for every app's ports).
if (fs.existsSync(fleetFile)) {
    try {
        const previous = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
        for (const [name, entry] of Object.entries(previous.apps || {})) {
            if (!apps.includes(name)) fleet.apps[name] = entry;
        }
    } catch (e) {
        // unreadable or malformed: start fresh
    }
}

let ok = true;
for (const name of apps) {
    const app = resolveProbeApp(name);
    const entry = {
        root: path.relative(REPO_ROOT, app.root),
        basePort: app.basePort,
        probePort: app.port,
        probeURL: app.baseURL,
        validationURL: app.variant('validation'),
        contextPath: app.contextPath,
        keySource: app.keySource,
        steps: {},
    };
    fleet.apps[name] = entry;

    if (reset) {
        const code = runLogged(`${name} reset`, 'npm', ['run', `reset:${name}`], path.join(reportDir, `reset-${name}.log`));
        entry.steps.reset = code === 0 ? 'ok' : `failed (${code})`;
        if (code !== 0) {
            ok = false;
            continue;
        }
    }

    const setupLog = path.join(reportDir, `setup-${name}.log`);
    const setupArgs = ['playwright', 'test', '-c', `configs/${name}.config.js`, '--project=setup', '--reporter=list'];
    let code = runLogged(`${name} setup`, 'npx', setupArgs, setupLog);
    if (code !== 0) {
        console.log(`fleet-prep: ${name} setup: retrying once (webServer start race after a reset is known)`);
        code = runLogged(`${name} setup (retry)`, 'npx', setupArgs, setupLog);
    }
    entry.steps.setup = code === 0 ? 'ok' : `failed (${code})`;
    if (code !== 0) {
        ok = false;
        continue;
    }

    code = runLogged(
        `${name} probe server`,
        'node',
        [path.join('bin', 'probe-servers.js'), '--start', '--app', name],
        path.join(reportDir, `setup-${name}.log`),
    );
    entry.steps.probeServer = code === 0 ? 'ok' : `failed (${code})`;
    if (code !== 0) {
        ok = false;
    }
    entry.readyAt = new Date().toISOString();
}

fleet.endedAt = new Date().toISOString();
fleet.ok = ok;
fs.writeFileSync(fleetFile, JSON.stringify(fleet, null, 2));
console.log(`fleet-prep: ${ok ? 'all ready' : 'NOT ready'} — ${path.relative(REPO_ROOT, fleetFile)}`);
for (const [name, entry] of Object.entries(fleet.apps)) {
    console.log(
        `fleet-prep:   ${name}: probe ${entry.probeURL}, validation ${entry.validationURL}, workers from ${entry.basePort}` +
            ` — ${Object.entries(entry.steps)
                .map(([step, state]) => `${step} ${state}`)
                .join(', ')}`,
    );
}
process.exit(ok ? 0 : 1);
