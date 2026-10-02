#!/usr/bin/env node
/**
 * @file bin/ci.js
 *
 * Full suites run on CI, not on the VM (harness.md "CI"): nine parallel
 * jobs on fresh boxes finish all three apps in 20–35 min, while one app's
 * full run on the VM takes up to an hour and holds the test lock the other
 * slots wait on. This helper starts a run or waits for one, then says what
 * failed.
 *
 *   npm run ci -- watch [<run-id>] [--sha <commit>]
 *       the push run of HEAD (or of --sha, or that run id); waits for it
 *   npm run ci -- dispatch [--ref <branch>] [--apps ojs,omp] [--ojs-ref <ref>]
 *                          [--ojs-repo <owner/name>] (same for omp, ops)
 *                          [--pkp-lib-ref <sha|pull/<n>/head>] [--ui-library-ref <…>]
 *                          [--php-ini-values <a=b,c=d>] [--no-wait]
 *       e2e.yml's workflow_dispatch from --ref (default: the current branch,
 *       which must be pushed), then waits for it
 *   npm run ci -- summary <run-id>
 *
 * While waiting it prints one line when a job finishes; at the end the
 * failed and flaky tests per app (from the job logs) and the run's URL.
 * Exit 0 green, 1 red or cancelled, 2 when no run was found or the wait
 * timed out (--timeout <min>, default 120). Run it in the background under
 * the keepalive (RUNBOOK "Keep the thread ticking").
 */
const {execFileSync} = require('child_process');
const {REPO_ROOT} = require('./apps.js');

const WORKFLOW = 'e2e.yml';
const POLL_MS = 60 * 1000;
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function gh(args, {json = false} = {}) {
    const out = execFileSync('gh', args, {cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
    return json ? JSON.parse(out) : out;
}

function git(args) {
    return execFileSync('git', args, {cwd: REPO_ROOT, encoding: 'utf8'}).trim();
}

function parseArgs(argv) {
    const out = {_: []};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) out._.push(a);
        else if (a === '--no-wait') out.noWait = true;
        else out[a.slice(2)] = argv[++i];
    }
    return out;
}

// ---------------------------------------------------------------------------
// Finding the run

function findPushRun(sha) {
    const deadline = Date.now() + 5 * 60 * 1000;
    for (;;) {
        const runs = gh(['run', 'list', '--workflow', WORKFLOW, '--commit', sha, '--json', 'databaseId,event,url,createdAt'], {json: true})
            .filter((r) => r.event === 'push');
        if (runs.length) return runs[0];
        if (Date.now() > deadline) return null;
        sleep(15000);
    }
}

function dispatch(opts) {
    const ref = opts.ref || git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (ref === 'HEAD') throw new Error('detached HEAD: pass --ref <pushed branch>');
    const fields = [];
    const add = (key, value) => value && fields.push('-f', `${key}=${value}`);
    for (const app of ['ojs', 'omp', 'ops']) {
        add(`${app}_ref`, opts[`${app}-ref`]);
        add(`${app}_repo`, opts[`${app}-repo`]);
    }
    add('pkp_lib_ref', opts['pkp-lib-ref']);
    add('ui_library_ref', opts['ui-library-ref']);
    add('apps', opts.apps);
    add('php_ini_values', opts['php-ini-values']);
    const list = () => gh(['run', 'list', '--workflow', WORKFLOW, '--event', 'workflow_dispatch', '--branch', ref, '--limit', '20', '--json', 'databaseId,url,createdAt'], {json: true});
    const before = new Set(list().map((r) => r.databaseId));
    const out = gh(['workflow', 'run', WORKFLOW, '--ref', ref, ...fields]);
    const url = (out.match(/https:\/\/github\.com\/\S+\/actions\/runs\/(\d+)/) || [])[0];
    if (url) return {databaseId: Number(url.split('/').pop()), url};
    const deadline = Date.now() + 2 * 60 * 1000;
    while (Date.now() < deadline) {
        sleep(5000);
        const fresh = list().filter((r) => !before.has(r.databaseId)).sort((a, b) => a.databaseId - b.databaseId);
        if (fresh.length) return fresh[0];
    }
    return null;
}

// ---------------------------------------------------------------------------
// Waiting and reporting

function jobState(runId) {
    return gh(['run', 'view', String(runId), '--json', 'status,conclusion,url,jobs,displayTitle,headBranch,event'], {json: true});
}

function wait(runId, timeoutMin) {
    const deadline = Date.now() + timeoutMin * 60 * 1000;
    const seen = new Set();
    for (;;) {
        let run;
        try {
            run = jobState(runId);
        } catch (e) {
            console.log(`ci: run ${runId}: gh failed (${String(e.message).split('\n')[0]}), retrying`);
            sleep(POLL_MS);
            continue;
        }
        const jobs = (run.jobs || []).filter((j) => j.conclusion !== 'skipped'); // apps left out by --apps
        for (const job of jobs) {
            if (job.status === 'completed' && !seen.has(job.name)) {
                seen.add(job.name);
                console.log(`ci: ${job.name}: ${job.conclusion}  (${seen.size}/${jobs.length})`);
            }
        }
        if (run.status === 'completed') return run;
        if (Date.now() > deadline) return null;
        sleep(POLL_MS);
    }
}

const ANSI = /\x1b\[[0-9;]*m/g;

/** Failed and flaky test titles per job, from the run's logs. */
function failures(runId) {
    let log = '';
    try {
        log = gh(['run', 'view', String(runId), '--log']);
    } catch {
        return null;
    }
    const perJob = {};
    let mode = null;
    for (const raw of log.split('\n')) {
        const [job, , rest = ''] = raw.split('\t');
        if (!job) continue;
        const line = rest.replace(/^\S+Z /, '').replace(ANSI, '');
        const j = (perJob[job] = perJob[job] || {failed: new Set(), flaky: new Set(), errors: new Set()});
        const count = line.match(/^ {2}(\d+) (failed|flaky|passed|did not run|skipped|interrupted)\b/);
        if (count) {
            mode = count[2] === 'failed' || count[2] === 'flaky' ? count[2] : null;
            continue;
        }
        const title = line.match(/^ {4}(\[\w[\w-]*\] › .+)$/);
        if (mode && title) {
            j[mode].add(title[1].trim());
            continue;
        }
        if (!line.startsWith('    ')) mode = null;
        const err = line.match(/^##\[error\](.+)$/) || line.match(/^::error::(.+)$/);
        if (err && !/Process completed with exit code/.test(err[1])) j.errors.add(err[1].trim());
    }
    return perJob;
}

function report(run, runId) {
    console.log(`ci: run ${runId} ${run.conclusion} — ${run.url}`);
    const jobs = (run.jobs || []).filter((j) => j.conclusion !== 'skipped');
    const red = jobs.filter((j) => j.conclusion !== 'success');
    const perJob = failures(runId) || {};
    for (const job of jobs) {
        const f = perJob[job.name];
        const lines = [];
        if (f) {
            for (const t of f.failed) lines.push(`    failed  ${t}`);
            for (const t of f.flaky) lines.push(`    flaky   ${t}`);
            if (job.conclusion !== 'success') for (const e of f.errors) lines.push(`    error   ${e.slice(0, 200)}`);
        }
        if (job.conclusion !== 'success' || lines.length) {
            console.log(`  ${job.name}: ${job.conclusion}`);
            lines.forEach((l) => console.log(l));
        }
    }
    if (!red.length) console.log(`ci: all ${jobs.filter((j) => j.conclusion === 'success').length} jobs green`);
    return run.conclusion === 'success' ? 0 : 1;
}

function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const opts = parseArgs(rest);
    const timeout = Number(opts.timeout || 120);
    let run = null;
    if (cmd === 'watch') {
        if (opts._[0]) {
            run = {databaseId: Number(opts._[0])};
        } else {
            const sha = git(['rev-parse', opts.sha || 'HEAD']);
            run = findPushRun(sha);
            if (!run) {
                console.log(`ci: no push run of ${WORKFLOW} for ${sha.slice(0, 10)} (is it pushed? a branch name with "/" runs nothing)`);
                process.exit(2);
            }
        }
    } else if (cmd === 'dispatch') {
        run = dispatch(opts);
        if (!run) {
            console.log('ci: dispatched, but the run did not show up within 2 min');
            process.exit(2);
        }
        if (opts.noWait) {
            console.log(`ci: run ${run.databaseId} ${run.url}`);
            return;
        }
    } else if (cmd === 'summary') {
        const id = Number(opts._[0]);
        process.exit(report(jobState(id), id));
    } else {
        console.error('usage: npm run ci -- watch [<run-id>] [--sha <c>] | dispatch [--ref <b>] [--apps …] [--<app>-ref …] [--pkp-lib-ref …] [--no-wait] | summary <run-id>');
        process.exit(1);
    }
    console.log(`ci: waiting for run ${run.databaseId}${run.url ? ` ${run.url}` : ''}`);
    const done = wait(run.databaseId, timeout);
    if (!done) {
        console.log(`ci: run ${run.databaseId} still running after ${timeout} min`);
        process.exit(2);
    }
    process.exit(report(done, run.databaseId));
}

main();
