#!/usr/bin/env node
/**
 * @file bin/probe.js
 *
 * Run a probe script (docs/process/patterns.md "Probe kit") against one app
 * or all three:
 *
 *   PROBE_FEATURE=U03 PROBE_AGENT=g1 node bin/probe.js <ojs|omp|ops|all> <script> [args…]
 *
 * The script is loaded once. It calls the kit's `forEachApp(fn)`, which
 * runs `fn` for every app named here (`all` = ojs, omp, ops; narrow further
 * with ONLY=ojs,omp). Per-app identity, ports and keys travel in the bag
 * `fn` receives, never in process.env, so one process holds all three apps.
 *
 * Output lands under .reports/<PROBE_FEATURE>/<PROBE_AGENT>/; both variables
 * are required and checked here so the error is one line, not a stack.
 */
const path = require('path');
const fs = require('fs');
const {APPS, REPO_ROOT} = require('./apps.js');
const {requireEnv} = require('../shared/playwright/probe/index.js');

const USAGE =
    'usage: PROBE_FEATURE=<spec id> PROBE_AGENT=<agent id> node bin/probe.js <ojs|omp|ops|all> <script> [args…]';

const [target, script, ...rest] = process.argv.slice(2);
if (!target || !script) {
    console.error(USAGE);
    process.exit(1);
}

try {
    requireEnv('PROBE_FEATURE', 'the spec id the probe serves, e.g. U03');
    requireEnv('PROBE_AGENT', 'a short id for this agent, e.g. g1 — it names the output folder');
} catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    process.exit(1);
}

// A dataset fleet (harness.md "Dataset fleets") is chosen by its feature
// name: fleet-prep --dataset records `dataset` and `line` in
// .reports/<PROBE_FEATURE>/fleet.json, and the script drives that fleet
// (PKP_E2E_DATASET and, when unset, PKP_E2E_LINE follow it). A campaign
// fleet's fleet.json carries no `dataset`: nothing changes for it.
const fleetFile = path.join(REPO_ROOT, '.reports', process.env.PROBE_FEATURE, 'fleet.json');
if (fs.existsSync(fleetFile)) {
    let fleet = null;
    try {
        fleet = JSON.parse(fs.readFileSync(fleetFile, 'utf8'));
    } catch {
        // malformed: not a dataset fleet's
    }
    if (fleet && fleet.dataset) {
        const shellLine = process.env.PKP_E2E_LINE || 'main';
        if (process.env.PKP_E2E_LINE && shellLine !== fleet.line) {
            console.error(`probe: ${path.relative(REPO_ROOT, fleetFile)} is a ${fleet.line} dataset fleet, but PKP_E2E_LINE=${shellLine}`);
            process.exit(1);
        }
        if (process.env.PKP_E2E_DATASET && process.env.PKP_E2E_DATASET !== String(fleet.dataset)) {
            console.error(`probe: ${path.relative(REPO_ROOT, fleetFile)} is dataset fleet ${fleet.dataset}, but PKP_E2E_DATASET=${process.env.PKP_E2E_DATASET}`);
            process.exit(1);
        }
        process.env.PKP_E2E_DATASET = String(fleet.dataset);
        if (fleet.line && fleet.line !== 'main') {
            process.env.PKP_E2E_LINE = fleet.line;
        }
        console.log(`[probe] dataset fleet ${fleet.dataset} on ${fleet.line} (${path.relative(REPO_ROOT, fleetFile)})`);
    }
}

const apps = target === 'all' ? Object.keys(APPS) : [target];
for (const name of apps) {
    if (!APPS[name]) {
        console.error(`probe: unknown app "${name}" — one of ${Object.keys(APPS).join(', ')}, or all`);
        process.exit(1);
    }
}
process.env.PROBE_APPS = apps.join(',');

// The script path: as given (absolute or relative to the cwd), else
// relative to the repo root the way bin/with-app.js resolves.
let scriptPath = path.resolve(process.cwd(), script);
if (!fs.existsSync(scriptPath)) {
    scriptPath = path.resolve(REPO_ROOT, script);
}
if (!fs.existsSync(scriptPath)) {
    console.error(`probe: no such script: ${script}`);
    process.exit(1);
}

console.log(
    `[probe] feature ${process.env.PROBE_FEATURE}, agent ${process.env.PROBE_AGENT}, apps ${apps.join(', ')}` +
        `${process.env.ONLY ? ` (ONLY=${process.env.ONLY})` : ''} → .reports/${process.env.PROBE_FEATURE}/${process.env.PROBE_AGENT}/`,
);
process.argv = [process.argv[0], scriptPath, ...rest];
require(scriptPath);
