#!/usr/bin/env node
/**
 * @file bin/issues-loop.js
 *
 * Runs issues sessions back to back, one spec each, every one a fresh
 * headless Claude session (MAINTENANCE "The issues session"), so no one has
 * to open a new session and type "start issues session" for the next spec.
 * A fresh session per spec is the point: long sessions degraded the reports.
 *
 * Between sessions it checks what a person would: the tree is committed and
 * pushed, no queue row is left "Taken" by this slot, the session made
 * progress, and every agent ran on the session's model (bin/check-models.mjs).
 * Any failure stops the loop (a session limit included: never relaunch blind).
 * It also stops when no free row is left or after --max sessions.
 *
 *   node bin/issues-loop.js [--max <n>] [--model <id>] [--dry-run]
 *
 * Run it detached so it outlives the terminal:
 *   nohup node bin/issues-loop.js --max 5 > .reports/issues-loop/loop.out 2>&1 &
 * Each session's stream goes to .reports/issues-loop/<stamp>-<n>.jsonl; follow
 * one with `tail -f`. To stop after the running session, touch
 * .reports/issues-loop/STOP.
 */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync, spawn} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const QUEUE = path.join(ROOT, 'docs/tracking/issues-queue.md');
const LOGS = path.join(ROOT, '.reports/issues-loop');
const STOP = path.join(LOGS, 'STOP');

const args = process.argv.slice(2);
const opt = (name, dflt) => (args.includes(name) ? args[args.indexOf(name) + 1] : dflt);
const max = Number(opt('--max', Infinity));
const model = opt('--model', 'claude-opus-5-5');
const dryRun = args.includes('--dry-run');

const PROMPT = `start issues session, 1 spec

This session was started by bin/issues-loop.js and runs unattended: no one
reads questions until it ends. Where the process says to pause for the
maintainer, stop the way a stopping session does (remove the Taken marks,
commit, push, name what stays open) and end. End with the step 11 summary.

Headless, the session ends the moment a turn ends with only background shell
commands running, and they are killed: claude -p waits for background agents,
not for run_in_background Bash. Run fleet-prep, walks and other waits in the
foreground, or end a turn only while a background agent is still running.

After the session the loop runs bin/check-models.mjs: every agent must have
run on this session's model, the one exception being the security probe,
which it knows only by the description "U<nn> security verification"
(briefs/security-verify.md). Dispatch the probe with exactly that
description; any other name on a fallback model stops the loop.`;

const sh = (cmd, cmdArgs) => spawnSync(cmd, cmdArgs, {cwd: ROOT, encoding: 'utf8'});
const git = (...a) => sh('git', a).stdout.trim();

function slotMark() {
    const env = fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8') : '';
    const slot = env.match(/^PKP_E2E_SLOT=(\d)/m)?.[1] || '0';
    const machine = ROOT.startsWith('/home/e2e') ? 'VM' : 'workstation';
    return `${machine} s${slot}`;
}

/** Queue rows as {spec, note}. */
function queueRows() {
    return fs.readFileSync(QUEUE, 'utf8').split('\n')
        .filter((l) => l.startsWith('| ['))
        .map((l) => {
            const cells = l.split('|').slice(1, -1).map((c) => c.trim());
            return {spec: cells[0].match(/\[(U\d+)\]/)?.[1], note: cells[cells.length - 1]};
        });
}

/** Why the tree is not committed and pushed, or null. */
function dirtyTree() {
    if (git('status', '--porcelain')) return 'uncommitted changes';
    sh('git', ['fetch', '--quiet']);
    if (git('rev-list', '@{u}..HEAD')) return 'unpushed commits';
    return null;
}

function runSession(n) {
    const sessionId = crypto.randomUUID();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const logFile = path.join(LOGS, `${stamp}-${n}.jsonl`);
    const log = fs.openSync(logFile, 'w');
    console.log(`[${new Date().toISOString()}] session ${n}: ${sessionId}, log ${path.relative(ROOT, logFile)}`);
    return new Promise((resolve) => {
        const child = spawn('claude', ['-p', PROMPT, '--model', model, '--session-id', sessionId,
            '--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose'],
        // -p waits only 600s for background agents after the main turn ends,
        // then kills them; reporters run far longer, so wait up to 4h.
        {cwd: ROOT, stdio: ['ignore', log, log],
            env: {...process.env, CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: String(4 * 60 * 60 * 1000)}});
        child.on('close', (code) => {
            fs.closeSync(log);
            const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
            let result = null;
            for (const line of lines.reverse()) {
                try { const row = JSON.parse(line); if (row.type === 'result') { result = row; break; } } catch {}
            }
            resolve({code, result, sessionId});
        });
    });
}

async function main() {
    fs.mkdirSync(LOGS, {recursive: true});
    fs.rmSync(STOP, {force: true});
    const mark = slotMark();
    for (let n = 1; n <= max; n++) {
        if (fs.existsSync(STOP)) return console.log('STOP file found; ending.');
        const dirty = dirtyTree();
        if (dirty) return fail(`tree not clean before session ${n}: ${dirty}`);
        sh('git', ['pull', '--rebase', '--quiet']);
        const free = queueRows().filter((r) => !/taken/i.test(r.note));
        if (!free.length) return console.log('No free row left in the queue; done.');
        console.log(`Next free spec: ${free[0].spec}${free[0].note ? ` (${free[0].note})` : ''}`);
        if (dryRun) return;

        const head = git('rev-parse', 'HEAD');
        const {code, result, sessionId} = await runSession(n);
        if (result?.result) console.log(`--- summary ---\n${result.result}\n---------------`);
        if (code !== 0 || !result || result.is_error) {
            return fail(`session ${n} ended with exit ${code}${result ? `, ${result.subtype}` : ', no result'}`);
        }
        const models = sh('node', ['bin/check-models.mjs', '--session', sessionId]);
        if (models.status !== 0) return fail(`model gate (bin/check-models.mjs):\n${models.stdout}${models.stderr}`);
        const after = dirtyTree();
        if (after) return fail(`session ${n} left ${after}`);
        const left = queueRows().filter((r) => /taken/i.test(r.note) && r.note.includes(mark));
        if (left.length) return fail(`session ${n} left ${left.map((r) => r.spec).join(', ')} Taken by ${mark}`);
        if (git('rev-parse', 'HEAD') === head) return fail(`session ${n} made no commit`);
    }
    console.log(`Reached --max ${max}; done.`);
}

function fail(why) {
    console.error(`STOPPED: ${why}`);
    process.exitCode = 1;
}

main();
