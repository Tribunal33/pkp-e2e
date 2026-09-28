#!/usr/bin/env node
/**
 * @file bin/test-final.js
 *
 * The feature's final full-suite run, the three apps one after another
 * (never overlapping: Mailpit is shared and the machine has one CPU budget):
 *
 *   npm run test:final -- --feature U03 [--apps ojs,omp] [--grep @smoke]
 *
 * Each app runs `npm run test:<app> -- --reporter=list --output
 * .reports/<feature>/pw-out-final-<app>`, with its console in
 * .reports/<feature>/final-run-<app>.log. test:<app> is bin/test-app.js,
 * the three passes CI runs (app, serial, solo; each writes its own
 * pw-out-final-<app>/{app,serial,solo}). PLAYWRIGHT_WORKERS is left to the
 * environment (unset auto-detects, 8 on the VM). One summary line per app,
 * the passes' tallies summed, exit 1 if any suite fails.
 *
 * A server already answering on an app's base port would be adopted by the
 * run (reuseExistingServer) and keep logging elsewhere, so it is reported
 * before the run starts; the probe servers at basePort + 50 are unaffected
 * and can stay up.
 *
 * After each app's run, one line compares the spec's canonical scenarios
 * with the suite's test titles (`S<n>: …`, RUNBOOK step 9) and names the
 * scenarios without a test; a suite's header declares the ones it skips
 * on purpose, so the line is information, never a failure.
 */
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {APPS, REPO_ROOT, resolveApp} = require('./apps.js');
const {phpServerStatus} = require('../shared/playwright/php-server.js');

const USAGE = 'usage: node bin/test-final.js --feature <id> [--apps ojs,omp,ops] [--grep <pattern>]';
// Every app's run under one hold of the machine's test lock
// (shared/playwright/test-lock.js).
require('../shared/playwright/test-lock.js').acquire(`test:final ${process.argv.slice(2).join(' ')}`);

function parseArgs(argv) {
    const options = {feature: null, apps: Object.keys(APPS), grep: null};
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--feature') {
            options.feature = argv[++i];
        } else if (arg === '--apps') {
            options.apps = String(argv[++i] || '')
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
        } else if (arg === '--grep') {
            options.grep = argv[++i];
        } else {
            console.error(`test-final: unknown argument "${arg}"\n${USAGE}`);
            process.exit(1);
        }
    }
    if (!options.feature || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(options.feature)) {
        console.error(`test-final: --feature <id> is required (a plain token, e.g. U03)\n${USAGE}`);
        process.exit(1);
    }
    for (const name of options.apps) {
        if (!APPS[name]) {
            console.error(`test-final: unknown app "${name}" — one of ${Object.keys(APPS).join(', ')}`);
            process.exit(1);
        }
    }
    return options;
}

/** Scenario numbers of the feature's spec (the numbered items under "## Canonical scenarios"). */
function specScenarios(feature) {
    const dir = path.join(REPO_ROOT, 'docs', 'specs');
    const file = fs.readdirSync(dir).find((f) => f.startsWith(`${feature}-`) && f.endsWith('.md'));
    if (!file) return null;
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
    const start = lines.findIndex((l) => /^##\s+Canonical scenarios/.test(l));
    if (start === -1) return null;
    const numbers = [];
    for (let i = start + 1; i < lines.length && !/^##\s/.test(lines[i]); i++) {
        const m = lines[i].match(/^(\d+)\.\s+\*\*/);
        if (m) numbers.push(parseInt(m[1], 10));
    }
    return numbers;
}

/** Scenario numbers the app's suite files for the feature carry in their test titles. */
function suiteScenarios(feature, app) {
    const base = path.join(REPO_ROOT, 'apps', app, 'playwright', 'tests');
    const found = new Set();
    // A feature's suite may sit in tests/ or, when it changes site-wide state, in tests/serial/.
    for (const dir of [base, path.join(base, 'serial')]) {
        if (!fs.existsSync(dir)) continue;
        for (const f of fs.readdirSync(dir)) {
            if (!f.startsWith(`${feature}-`) || !f.endsWith('.spec.js')) continue;
            const text = fs.readFileSync(path.join(dir, f), 'utf8');
            for (const m of text.matchAll(/test\s*\(\s*['"\`]S(\d+)\b/g)) found.add(parseInt(m[1], 10));
        }
    }
    return [...found].sort((a, b) => a - b);
}

function scenarioLine(feature, app) {
    const spec = specScenarios(feature);
    if (!spec) return `test-final: ${app}: no spec scenarios found for ${feature}`;
    const have = new Set(suiteScenarios(feature, app));
    const missing = spec.filter((n) => !have.has(n));
    return `test-final: ${app}: ${have.size} of ${spec.length} scenarios have a test` +
        (missing.length ? ` — without one: ${missing.map((n) => `S${n}`).join(', ')} (the suite header says why)` : '');
}

/**
 * The list reporter's closing tallies ("12 passed", "1 failed", "3 skipped",
 * "2 flaky", "5 did not run"), summed over the passes of bin/test-app.js:
 * the output splits at its `test-app: pass n/3` lines and each segment
 * counts its last tally (a pass that ran no test prints none).
 */
function tally(text) {
    const segments = text.split(/^test-app: pass \d+\/\d+ \([^)]*\): playwright /m);
    const passes = Math.max(segments.length - 1, 1);
    const pick = (segment, word) => {
        const matches = [...segment.matchAll(new RegExp(`^\\s*(\\d+) ${word}\\b`, 'gm'))];
        return matches.length ? parseInt(matches[matches.length - 1][1], 10) : 0;
    };
    const sum = (word) => segments.reduce((total, segment) => total + pick(segment, word), 0);
    return {
        passes,
        passed: sum('passed'),
        failed: sum('failed'),
        flaky: sum('flaky'),
        skipped: sum('skipped'),
        didNotRun: sum('did not run'),
    };
}

(async () => {
    const {feature, apps, grep} = parseArgs(process.argv.slice(2));
    const reportDir = path.join(REPO_ROOT, '.reports', feature);
    fs.mkdirSync(reportDir, {recursive: true});
    const summary = [];
    let ok = true;

    for (const name of apps) {
        const app = resolveApp(name);
        if ((await phpServerStatus(app.basePort, {timeoutMs: 1500})) !== null) {
            console.log(
                `test-final: WARNING ${name}: a server already answers on ${app.basePort}; the run will adopt it ` +
                    `(kill any manual server first — lsof -nP -iTCP:${app.basePort})`,
            );
        }
        const logFile = path.join(reportDir, `final-run-${name}.log`);
        const outDir = path.join(reportDir, `pw-out-final-${name}`);
        const args = ['run', `test:${name}`, '--', '--reporter=list', '--output', outDir];
        if (grep) {
            args.push('--grep', grep);
        }
        const started = Date.now();
        console.log(`test-final: ${name}: npm ${args.join(' ')} (workers ${process.env.PLAYWRIGHT_WORKERS || 'auto'})`);
        const result = spawnSync('npm', args, {
            cwd: REPO_ROOT,
            env: process.env,
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 256 * 1024 * 1024,
        });
        const output = (result.stdout || '') + (result.stderr || '');
        fs.writeFileSync(
            logFile,
            `# ${new Date().toISOString()} npm ${args.join(' ')}\n${output}# exit ${result.status}\n`,
        );
        const seconds = ((Date.now() - started) / 1000).toFixed(0);
        const counts = tally(output);
        const code = result.status ?? 1;
        const line =
            `test-final: ${name}: ${code === 0 ? 'GREEN' : 'RED'} — ${counts.passed} passed, ${counts.failed} failed, ` +
            `${counts.flaky} flaky, ${counts.skipped} skipped` +
            (counts.didNotRun ? `, ${counts.didNotRun} did not run` : '') +
            ` in ${counts.passes} pass${counts.passes === 1 ? '' : 'es'}, ${seconds} s ` +
            `(exit ${code}, log ${path.relative(REPO_ROOT, logFile)})`;
        console.log(line);
        summary.push(line);
        console.log(scenarioLine(feature, name));
        if (code !== 0) {
            ok = false;
        }
    }

    console.log(`test-final: ${ok ? 'all suites green' : 'FAILED'}`);
    process.exit(ok ? 0 : 1);
})().catch((error) => {
    console.error(`test-final: ${error.stack || error}`);
    process.exit(1);
});
