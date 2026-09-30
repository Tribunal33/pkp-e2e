#!/usr/bin/env node
/**
 * @file bin/probe-servers.js
 *
 * The detached probe servers: one `php -S` per app at basePort + 50, the
 * same command, config, key, log and restart loop as the runner's worker
 * servers (shared/playwright/php-server.js), kept alive between scripts so a
 * probe never starts a server of its own.
 *
 *   npm run probe-servers -- --start [--app ojs]   # start (skips a live one)
 *   npm run probe-servers -- --status              # pid, liveness, HTTP probe
 *   npm run probe-servers -- --stop  [--app ojs]   # stop what --start began
 *
 * The validation variant (basePort + 90, harness.md "The validation-variant
 * server") is the runner's server, not a probe one, but the runner only
 * serves it during a run. So --start also brings it up when nothing answers
 * there, from the runner's own generated config.test.validation.inc.php
 * and with the runner's log name; a later Playwright run adopts it
 * (reuseExistingServer) and leaves it up. An answering +90 is never
 * replaced.
 *
 * Pids live in .reports/servers/probe-<app>[-validation].pid; logs in
 * apps/<app>/playwright/.server-logs/. Only the pids this script wrote are
 * ever signalled; the runner's worker ports (basePort + 0 … + 19) are never
 * served or touched.
 */
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const {APPS, REPO_ROOT, resolveLine} = require('./apps.js');
const {resolveProbeApp, PROBE_PORT_OFFSET} = require('../shared/playwright/probe/index.js');
const {phpServerCommand, phpServerEnv, phpServerStatus} = require('../shared/playwright/php-server.js');
const {parseDatasetFlag, DATASET_PORT_OFFSET} = require('../shared/playwright/dataset.js');

// `--dataset [n]` (or PKP_E2E_DATASET=n): the dataset fleet's one server
// (basePort + 60 + n, harness.md "Dataset fleets") instead of the probe and
// validation pair.
{
    const {n, rest} = parseDatasetFlag(process.argv.slice(2));
    if (n) {
        process.env.PKP_E2E_DATASET = String(n);
    }
    process.argv = [...process.argv.slice(0, 2), ...rest];
}

// One pid dir per line (PKP_E2E_LINE), so both lines' probe servers stay up side by side.
const LINE = resolveLine();
const PID_DIR = path.join(REPO_ROOT, '.reports', LINE ? `servers-${LINE.name}` : 'servers');
const USAGE = 'usage: node bin/probe-servers.js --start|--stop|--status [--app ojs|omp|ops] [--dataset [n]]';

function parseArgs(argv) {
    const options = {action: null, apps: Object.keys(APPS)};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--start' || arg === '--stop' || arg === '--status') {
            options.action = arg.slice(2);
        } else if (arg === '--app') {
            const name = argv[++i];
            if (!APPS[name]) {
                console.error(`probe-servers: unknown app "${name}"\n${USAGE}`);
                process.exit(1);
            }
            options.apps = [name];
        } else {
            console.error(`probe-servers: unknown argument "${arg}"\n${USAGE}`);
            process.exit(1);
        }
    }
    if (!options.action) {
        console.error(USAGE);
        process.exit(1);
    }
    return options;
}

const pidFile = (name, kind) => path.join(PID_DIR, `probe-${name}${kind === 'probe' ? '' : `-${kind}`}.pid`);

function readPid(name, kind) {
    try {
        const pid = parseInt(fs.readFileSync(pidFile(name, kind), 'utf8').trim(), 10);
        return Number.isInteger(pid) && pid > 1 ? pid : null;
    } catch {
        return null;
    }
}

function alive(pid) {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(check, timeoutMs, poll = 250) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (await check()) {
            return true;
        }
        if (Date.now() > deadline) {
            return false;
        }
        await sleep(poll);
    }
}

/** The two servers --start manages for an app. */
function servers(app) {
    const logDir = path.join(app.suiteDir, '.server-logs');
    if (app.dataset) {
        return [
            {
                kind: `ds${app.dataset}`,
                port: app.port,
                configFile: app.configFile,
                logFile: path.join(logDir, `server-${app.port}-ds${app.dataset}.log`),
                label: `dataset fleet ${app.dataset} (base ${app.basePort} + ${DATASET_PORT_OFFSET + app.dataset})`,
            },
        ];
    }
    return [
        {
            kind: 'probe',
            port: app.port,
            configFile: app.configFile,
            logFile: path.join(logDir, `server-${app.port}-probe.log`),
            label: `probe server (base ${app.basePort} + ${PROBE_PORT_OFFSET})`,
        },
        {
            kind: 'validation',
            port: app.validationPort,
            configFile: app.validationConfigFile,
            logFile: path.join(logDir, `server-${app.validationPort}-validation.log`),
            label: "validation variant (the runner's +90; adopted by the next run)",
        },
    ];
}

async function startOne(app, server) {
    const {kind, port, configFile, logFile, label} = server;
    const existing = readPid(app.name, kind);
    if (existing && alive(existing)) {
        console.log(`probe-servers: ${app.name} ${kind}: already running (pid ${existing}, port ${port})`);
        return true;
    }
    if ((await phpServerStatus(port)) !== null) {
        if (kind === 'validation') {
            console.log(`probe-servers: ${app.name} ${kind}: something already serves ${port} — using it as is`);
            return true;
        }
        console.error(
            `probe-servers: ${app.name} ${kind}: something else already listens on ${port} — not started, not touched ` +
                `(lsof -nP -iTCP:${port} shows it)`,
        );
        return false;
    }
    if (!fs.existsSync(configFile)) {
        console.error(
            `probe-servers: ${app.name} ${kind}: config file not found: ${configFile}` +
                (kind === 'validation' ? ' — run the setup project once (npm run fleet-prep) to generate it' : '') +
                (kind.startsWith('ds') ? ' — reset the dataset fleet first (npm run reset:<app> -- --dataset)' : ''),
        );
        return false;
    }
    fs.mkdirSync(path.dirname(logFile), {recursive: true});
    fs.mkdirSync(PID_DIR, {recursive: true});
    const command = phpServerCommand({appRoot: app.root, port, logFile});
    const child = spawn('sh', ['-c', command], {
        detached: true,
        stdio: 'ignore',
        env: {
            ...process.env,
            ...phpServerEnv({configFile, testApiKey: app.testApiKey}),
        },
    });
    child.unref();
    fs.writeFileSync(pidFile(app.name, kind), `${child.pid}\n`);
    const up = await waitFor(async () => (await phpServerStatus(port)) !== null, 30_000);
    if (!up) {
        console.error(`probe-servers: ${app.name} ${kind}: no answer on ${port} after 30 s — see ${logFile}`);
        return false;
    }
    console.log(
        `probe-servers: ${app.name} ${label}: up on http://127.0.0.1:${port} (pid ${child.pid}, key from ${app.keySource}, log ${path.relative(REPO_ROOT, logFile)})`,
    );
    return true;
}

async function start(name) {
    const app = resolveProbeApp(name);
    let ok = true;
    for (const server of servers(app)) {
        ok = (await startOne(app, server)) && ok;
    }
    return ok;
}

async function stopOne(app, {kind, port}) {
    const pid = readPid(app.name, kind);
    if (!pid) {
        return true;
    }
    if (alive(pid)) {
        // The shell is a group leader (detached spawn); the group holds the
        // restart loop and the php -S child.
        try {
            process.kill(-pid, 'SIGTERM');
        } catch {
            process.kill(pid, 'SIGTERM');
        }
        const gone = await waitFor(async () => !alive(pid) && (await phpServerStatus(port)) === null, 10_000);
        if (!gone) {
            try {
                process.kill(-pid, 'SIGKILL');
            } catch {
                // already gone
            }
        }
    }
    fs.rmSync(pidFile(app.name, kind), {force: true});
    if ((await phpServerStatus(port)) !== null) {
        console.error(
            `probe-servers: ${app.name} ${kind}: pid ${pid} stopped but port ${port} still answers — a server this script did not start; left alone`,
        );
        return false;
    }
    console.log(`probe-servers: ${app.name} ${kind}: stopped (pid ${pid}, port ${port})`);
    return true;
}

async function stop(name) {
    const app = resolveProbeApp(name);
    let ok = true;
    let any = false;
    for (const server of servers(app)) {
        any = any || readPid(app.name, server.kind) !== null;
        ok = (await stopOne(app, server)) && ok;
    }
    if (!any) {
        console.log(`probe-servers: ${name}: no pid files (nothing to stop)`);
    }
    return ok;
}

async function status(name) {
    const app = resolveProbeApp(name);
    let ok = true;
    for (const {kind, port} of servers(app)) {
        const pid = readPid(app.name, kind);
        const running = pid ? alive(pid) : false;
        const code = await phpServerStatus(port);
        const http = code === null ? 'no answer' : `HTTP ${code} on /README.md`;
        const state = running
            ? `running (pid ${pid})`
            : pid
              ? `stale pid file (${pid})`
              : code !== null
                ? 'not ours'
                : 'stopped';
        console.log(`probe-servers: ${name} ${kind.padEnd(10)} port ${port}  ${state.padEnd(22)} ${http}`);
        ok = ok && (code !== null || !pid);
    }
    return ok;
}

(async () => {
    const {action, apps} = parseArgs(process.argv.slice(2));
    const run = {start, stop, status}[action];
    let ok = true;
    for (const name of apps) {
        ok = (await run(name)) && ok;
    }
    process.exit(ok ? 0 : 1);
})().catch((error) => {
    console.error(`probe-servers: ${error.stack || error}`);
    process.exit(1);
});
