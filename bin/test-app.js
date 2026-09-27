#!/usr/bin/env node
/**
 * @file bin/test-app.js
 *
 * One app's full suite, run as the three passes CI runs (run-app.yml "Run
 * Playwright suite"):
 *
 *   node bin/test-app.js <ojs|omp|ops> [playwright args…]   # npm run test:<app> -- …
 *
 *   1. --project=shared --project=<app>                  (setup runs as their dependency)
 *   2. --project=<app>-serial --no-deps --pass-with-no-tests
 *   3. --project=<app>-solo --no-deps --pass-with-no-tests
 *
 * In one invocation the serial and solo projects depend on the parallel
 * ones, so a single red there skipped every serial and @solo test ("59 did
 * not run"). Here all three passes always run, in order, whatever the
 * earlier ones returned; the exit is non-zero if any pass failed.
 *
 * A whole-suite run starts from a fresh install, as a CI shard does: the
 * fleet is reset (reset.js) and bootstrapped (the setup project) before
 * pass 1, about 8 s, so what filtered runs, probes and claim checks left
 * since the last full run does not pile up. It is reset and bootstrapped
 * again between pass 1 and pass 2 (CI does this one too). The
 * site-level @solo tests re-save every context of the install: after an app
 * pass the fleet holds hundreds, and U57 alone took 20.7 of the OPS solo
 * pass's 29.8 min; on a fresh install its three tests take about 1.5 min
 * (.reports/site-variant/feasibility.md). The serial and solo specs seed
 * what they need, so nothing depends on what the app pass left. A run
 * with a filter (file or folder names, --grep, --grep-invert, --last-failed,
 * --only-changed) skips both resets and keeps the database: filtered runs are the ones that share
 * a fleet with another runner (a test author beside the harness agent), and
 * a reset would wipe that runner's seeds. --no-reset skips both on a
 * whole-suite run too. The app pass's database is gone afterwards; its
 * error contexts and traces stay in <out>/app.
 *
 * The caller's args (--reporter, --grep, --trace, --workers, file filters…)
 * go to every pass, so every pass takes --pass-with-no-tests; the run fails
 * when no pass ran a single test (a filter that matched nothing). Each pass
 * writes its own output folder, <out>/app, <out>/serial, <out>/solo, where
 * <out> is the caller's --output or the config's test-results/: a run
 * empties its output folder first, so with one folder a later pass wiped
 * an earlier pass's error contexts.
 *
 * A caller naming its own --project (or --ui, --list, --help) gets one
 * plain `playwright test` invocation, as before. The config still refuses a
 * --no-deps command that selects the solo project beside another.
 *
 * Output streams through unchanged (as a TTY when this runner's stdout is
 * one); a `test-app: pass n/3 …` line opens and closes each pass, which
 * bin/test-final.js uses to sum the passes' closing tallies.
 */
const path = require('path');
const {spawn} = require('child_process');
const {APPS, REPO_ROOT} = require('./apps.js');

const USAGE = 'usage: node bin/test-app.js <ojs|omp|ops> [playwright args…]';
const CLI = require.resolve('@playwright/test/cli');

const [appName, ...callerArgs] = process.argv.slice(2);
if (!appName || !APPS[appName]) {
    console.error(`test-app: ${appName ? `unknown app "${appName}"` : 'no app named'}\n${USAGE}`);
    process.exit(1);
}
// All three passes under one hold of the machine's test lock, so another
// slot never runs between them (shared/playwright/test-lock.js).
require('../shared/playwright/test-lock.js').acquire(`test:${appName} ${callerArgs.join(' ')}`);
const config = `configs/${appName}.config.js`;

// Ctrl-C reaches the running pass through the terminal's process group;
// the runner outlives it, so the pass shuts down with its output intact,
// and then stops instead of starting the next pass. A SIGTERM is passed on.
let current = null;
let interrupted = false;
process.on('SIGINT', () => {
    interrupted = true;
});
process.on('SIGTERM', () => {
    interrupted = true;
    current?.kill('SIGTERM');
});

/** Run `playwright test -c <config> …args`, streaming its output; resolves {code, signal, output}. */
function playwright(args) {
    return new Promise((resolve) => {
        const env = {...process.env};
        // Piped output keeps the list reporter's TTY form and colours when
        // this runner writes to a terminal.
        if (process.stdout.isTTY && !env.PLAYWRIGHT_FORCE_TTY) {
            env.PLAYWRIGHT_FORCE_TTY = `${process.stdout.columns || 100}x${process.stdout.rows || 40}`;
        }
        const child = spawn(process.execPath, [CLI, 'test', '-c', config, ...args], {
            cwd: REPO_ROOT,
            env,
            stdio: ['inherit', 'pipe', 'pipe'],
        });
        current = child;
        let output = '';
        child.stdout.on('data', (chunk) => {
            process.stdout.write(chunk);
            output += chunk;
        });
        child.stderr.on('data', (chunk) => {
            process.stderr.write(chunk);
            output += chunk;
        });
        child.on('close', (code, signal) => {
            current = null;
            resolve({code, signal, output});
        });
    });
}

const hasFlag = (names) => callerArgs.some((a) => names.some((n) => a === n || a.startsWith(`${n}=`)));

// Playwright options that take a separate value, so the value is not read as a file filter.
const VALUE_OPTIONS = new Set([
    '-c', '--config', '-g', '--grep', '--grep-invert', '-j', '--workers', '--reporter', '--output',
    '--retries', '--timeout', '--global-timeout', '--repeat-each', '--max-failures', '--shard',
    '--trace', '--project', '--tsconfig', '--update-snapshots', '-u',
]);

/** True when the caller narrows the run (file filters, grep, last failed, only changed). */
function isFiltered(args) {
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (['-g', '--grep', '--grep-invert', '--last-failed', '--only-changed'].some((n) => arg === n || arg.startsWith(`${n}=`))) {
            return true;
        }
        if (VALUE_OPTIONS.has(arg)) {
            i++;
        } else if (!arg.startsWith('-')) {
            return true;
        }
    }
    return false;
}

/** Run a harness command quietly; resolves {code, output}. */
function quiet(command, args) {
    return new Promise((resolve) => {
        const child = spawn(command, args, {cwd: REPO_ROOT, env: process.env, stdio: ['ignore', 'pipe', 'pipe']});
        current = child;
        let output = '';
        child.stdout.on('data', (chunk) => (output += chunk));
        child.stderr.on('data', (chunk) => (output += chunk));
        child.on('close', (code, signal) => {
            current = null;
            resolve({code: signal ? 1 : code, output});
        });
    });
}

/**
 * Reset the fleet and bootstrap it again. Quiet on success, so the setup
 * project's closing "1 passed" does not land in pass 1's segment of the log
 * (bin/test-final.js sums each segment's last tally).
 */
async function resetFleet(outRoot) {
    const started = Date.now();
    const reset = await quiet(process.execPath, [path.join('bin', 'with-app.js'), appName, 'shared/playwright/reset.js']);
    if (reset.code !== 0) {
        return {ok: false, output: reset.output};
    }
    const setup = await quiet(process.execPath, [
        CLI, 'test', '-c', config, '--project=setup', '--reporter=line', `--output=${path.join(outRoot, 'setup')}`,
    ]);
    return {ok: setup.code === 0, output: reset.output + setup.output, seconds: Math.round((Date.now() - started) / 1000)};
}

(async () => {
    if (hasFlag(['--project', '--ui', '--ui-host', '--ui-port', '--list', '--help', '-h'])) {
        console.log(`test-app: ${appName}: one invocation — playwright test -c ${config} ${callerArgs.join(' ')}`);
        const {code, signal} = await playwright(callerArgs.filter((a) => a !== '--no-reset'));
        process.exit(signal ? 1 : code ?? 1);
    }

    // The caller's --output becomes the root of the passes' folders; the
    // flags every pass sets itself are not repeated.
    let outRoot = path.join(REPO_ROOT, 'apps', appName, 'playwright', 'test-results');
    const rest = [];
    for (let i = 0; i < callerArgs.length; i++) {
        const arg = callerArgs[i];
        if (arg === '--output') {
            outRoot = callerArgs[++i];
        } else if (arg.startsWith('--output=')) {
            outRoot = arg.slice('--output='.length);
        } else if (arg !== '--no-deps' && arg !== '--pass-with-no-tests' && arg !== '--no-reset') {
            rest.push(arg);
        }
    }
    const resetFleetRun = !callerArgs.includes('--no-reset') && !isFiltered(rest);

    const passes = [
        {name: 'app', projects: ['shared', appName], deps: true},
        {name: 'serial', projects: [`${appName}-serial`], deps: false},
        {name: 'solo', projects: [`${appName}-solo`], deps: false},
    ];
    const failed = [];
    let ranTests = 0;
    for (const [i, pass] of passes.entries()) {
        if (resetFleetRun && (pass.name === 'app' || pass.name === 'serial')) {
            const {ok, output, seconds} = await resetFleet(outRoot);
            if (interrupted) {
                console.log(`test-app: ${appName}: interrupted, the remaining passes did not start`);
                process.exit(130);
            }
            if (!ok) {
                process.stdout.write(output);
                console.log(`test-app: ${appName}: the reset before the ${pass.name} pass failed; it and the passes after it did not start`);
                process.exit(1);
            }
            console.log(`test-app: ${appName}: fleet reset and bootstrapped before the ${pass.name} pass (${seconds} s)`);
        }
        const args = [
            ...pass.projects.map((p) => `--project=${p}`),
            ...(pass.deps && !callerArgs.includes('--no-deps') ? [] : ['--no-deps']),
            '--pass-with-no-tests',
            `--output=${path.join(outRoot, pass.name)}`,
            ...rest,
        ];
        const label = `test-app: pass ${i + 1}/${passes.length} (${pass.name})`;
        console.log(`${label}: playwright test -c ${config} ${args.join(' ')}`);
        const {code, signal, output} = await playwright(args);
        const running = output.match(/^\s*Running (\d+) tests? using/m);
        ranTests += running ? parseInt(running[1], 10) : 0;
        console.log(`${label}: ${signal ? `killed by ${signal}` : `exit ${code}`}`);
        if (interrupted) {
            console.log(`test-app: ${appName}: interrupted, the remaining passes did not start`);
            process.exit(130);
        }
        if (signal || code !== 0) {
            failed.push(pass.name);
        }
    }

    // The "Running n tests" line comes from the list, line and dot reporters.
    const reporter = callerArgs.find((a, i) => callerArgs[i - 1] === '--reporter' || a.startsWith('--reporter='));
    const countsTests = !reporter || /^(--reporter=)?(list|line|dot)(,|$)/.test(reporter);
    if (countsTests && ranTests === 0) {
        console.log(`test-app: ${appName}: no pass ran a test (nothing matched the filter)`);
        process.exit(1);
    }
    console.log(`test-app: ${appName}: ${failed.length ? `RED in pass ${failed.join(', ')}` : 'all three passes green'}`);
    process.exit(failed.length ? 1 : 0);
})().catch((error) => {
    console.error(`test-app: ${error.stack || error}`);
    process.exit(1);
});
