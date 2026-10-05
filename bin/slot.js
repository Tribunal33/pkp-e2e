#!/usr/bin/env node
/**
 * @file bin/slot.js
 *
 * Parallel sessions on one machine (harness.md "Slots"): each session works
 * in its own slot, a full clone of this repo with its own app checkouts
 * (PKP_E2E_SLOT in the clone's .env shifts its ports, DBs and Mailpit). This
 * script owns the slot registry the bot (claude-threads, patched) consults,
 * and the SessionStart hook that tells every Claude session where it is.
 *
 * The rules, all decided by state:
 * - A new session takes a free slot, the one used longest ago first.
 * - When a session pauses or ends, its slot is freed if it left a clean
 *   tree (nothing uncommitted, untracked, stashed or unpushed in this repo
 *   or in the shared private security repo beside it, ../pkp-e2e-sec; the
 *   app checkouts do not count). Otherwise the slot stays BLOCKED for
 *   that thread, and the bot mentions the owner in the thread.
 * - A resumed thread goes back to its own slot unless another session holds
 *   it right now; then it starts FRESH in a free slot (no --resume across
 *   slots: its transcript's paths point at the old one).
 *
 *   node bin/slot.js acquire --thread <id> --session <id> [--resume --dir <workingDir> --fresh-session <id>] [--title <text>]
 *                                                 prints {slot, dir, mode: new|resume|fresh}; a fresh start
 *                                                 registers --fresh-session, the new Claude session id
 *   node bin/slot.js release --thread <id> --lease <id>   pause/end: free or block (only the current lease counts)
 *   node bin/slot.js reconcile                    bot start: every live slot released
 *   node bin/slot.js free <n>                     manual: drop a block
 *   node bin/slot.js claim <U<nn>>                 this slot's session takes a feature (exit 1 when another holds it)
 *   node bin/slot.js unclaim <U<nn>> | claims
 *   node bin/slot.js status
 *   node bin/slot.js hook                         Claude Code SessionStart hook (stdin JSON)
 *
 * A release (free or blocked), reconcile and free also stop the slot's
 * `php -S` servers (stopSlotServers): the probe, validation and dataset
 * servers outlive their scripts on purpose, and nothing else stopped them.
 *
 * acquire, release, reconcile and free belong to the bot and the operator: a
 * Claude session (CLAUDECODE set) that runs one is refused, since a release
 * frees the slot under its own feet and an acquire replaces the lease the
 * bot holds, so the bot's own release is then ignored and the slot stays
 * live with nobody in it. A session drops a feature claim with `unclaim`.
 * PKP_E2E_SLOT_FORCE=1 overrides, for an operator who asks a session to do it.
 *
 * The bot-facing commands print one JSON line. State lives in
 * <PKP_E2E_SLOTS_HOME or ~/.pkp-e2e-slots>/: slots.json (the slot list, by
 * hand: {"slots": [{"n": 0, "dir": "/home/e2e/pkp-e2e"}, …]}) and
 * registry.json.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const crypto = require('crypto');

const SLOTS_HOME = process.env.PKP_E2E_SLOTS_HOME || path.join(os.homedir(), '.pkp-e2e-slots');
const SLOTS_FILE = path.join(SLOTS_HOME, 'slots.json');
const REGISTRY_FILE = path.join(SLOTS_HOME, 'registry.json');
const REGISTRY_LOCK = path.join(SLOTS_HOME, 'registry.lock');
const HISTORY_KEEP = 20;
const THREAD_KEEP_MS = 30 * 24 * 3600 * 1000;

// Ports as bin/apps.js derives them; kept literal so this file runs without a slot's .env.
const BASE_PORTS = {ojs: 8000, omp: 8100, ops: 8200};
const slotPortShift = (n) => (n % 3) * 300 + Math.floor(n / 3) * 4000;
const LINE_DIRS = [['main', ''], ['stable-3_5_0', 'stable-3_5_0']];

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const now = () => new Date().toISOString();
const short = (id) => (id ? String(id).slice(0, 8) : '?');
const pidAlive = (pid) => {
    try {
        process.kill(pid, 0);
        return true;
    } catch (e) {
        return e.code === 'EPERM';
    }
};

function readJson(file, fallback) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return fallback;
    }
}

function writeJsonAtomic(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n');
    fs.renameSync(tmp, file);
}

function slotList() {
    const cfg = readJson(SLOTS_FILE, null);
    if (!cfg || !Array.isArray(cfg.slots) || !cfg.slots.length) {
        throw new Error(`no slots configured — write ${SLOTS_FILE} ({"slots": [{"n": 0, "dir": "…"}]})`);
    }
    return cfg.slots.map((s) => ({n: Number(s.n), dir: path.resolve(s.dir)}));
}

/** The slot whose clone contains `dir`, or null. */
function slotOfDir(dir) {
    if (!dir) return null;
    const real = path.resolve(dir);
    return slotList().find((s) => real === s.dir || real.startsWith(s.dir + path.sep)) || null;
}

// ---------------------------------------------------------------------------
// Registry, under a mkdir mutex (a dead holder's lock is taken over)

function withRegistry(fn) {
    fs.mkdirSync(SLOTS_HOME, {recursive: true});
    const deadline = Date.now() + 15000;
    for (;;) {
        try {
            fs.mkdirSync(REGISTRY_LOCK);
            fs.writeFileSync(path.join(REGISTRY_LOCK, 'pid'), String(process.pid));
            break;
        } catch {
            const holder = Number(readJson(path.join(REGISTRY_LOCK, 'pid'), 0));
            let age = 0;
            try {
                age = Date.now() - fs.statSync(REGISTRY_LOCK).mtimeMs;
            } catch {}
            if ((holder && !pidAlive(holder)) || (!holder && age > 5000) || Date.now() > deadline) {
                fs.rmSync(REGISTRY_LOCK, {recursive: true, force: true});
                continue;
            }
            sleepSync(50);
        }
    }
    try {
        const reg = readJson(REGISTRY_FILE, {});
        reg.slots = reg.slots || {};
        reg.threads = reg.threads || {};
        reg.history = reg.history || {};
        reg.claims = reg.claims || {};
        const out = fn(reg);
        pruneThreads(reg);
        writeJsonAtomic(REGISTRY_FILE, reg);
        return out;
    } finally {
        fs.rmSync(REGISTRY_LOCK, {recursive: true, force: true});
    }
}

const readRegistry = () => {
    const reg = readJson(REGISTRY_FILE, {});
    return {slots: reg.slots || {}, threads: reg.threads || {}, history: reg.history || {}, claims: reg.claims || {}};
};

function pruneThreads(reg) {
    for (const [key, c] of Object.entries(reg.claims || {})) {
        if (!claimValid(reg, c)) delete reg.claims[key];
    }
    const blockedBy = new Set(Object.values(reg.slots).filter((e) => e.state !== 'free').map((e) => e.thread));
    for (const [t, rec] of Object.entries(reg.threads)) {
        const at = Date.parse(rec.pausedAt || rec.since || 0);
        if (!blockedBy.has(t) && Date.now() - at > THREAD_KEEP_MS) delete reg.threads[t];
    }
}

/** A slot entry that counts as occupied by a running session. */
function liveEntry(e) {
    if (!e || e.state !== 'live') return false;
    if (e.manualPid) return pidAlive(e.manualPid);
    return true;
}

function lastUsed(reg, n) {
    const e = reg.slots[n];
    return Date.parse((e && (e.releasedAt || e.since)) || 0) || 0;
}

function recordUse(reg, n, thread) {
    const h = (reg.history[n] = reg.history[n] || []);
    h.push({thread, from: now(), to: null});
    while (h.length > HISTORY_KEEP) h.shift();
}

function closeUse(reg, n, thread) {
    const h = reg.history[n] || [];
    for (let i = h.length - 1; i >= 0; i--) {
        if (h[i].thread === thread && !h[i].to) {
            h[i].to = now();
            break;
        }
    }
}

// ---------------------------------------------------------------------------
// Slot state read from disk

function git(dir, args) {
    try {
        return execFileSync('git', args, {cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    } catch {
        return null;
    }
}

/** Is this repo clone clean? Uncommitted, untracked, stashed or unpushed work is not. */
function checkClean(dir) {
    const reasons = [];
    const porcelain = git(dir, ['status', '--porcelain']);
    if (porcelain === null) return {clean: false, reasons: ['not a git clone']};
    const lines = porcelain.split('\n').filter(Boolean);
    if (lines.length) {
        const untracked = lines.filter((l) => l.startsWith('??')).length;
        reasons.push(`${lines.length - untracked} uncommitted, ${untracked} untracked file(s)`);
    }
    const stashes = (git(dir, ['stash', 'list']) || '').split('\n').filter(Boolean).length;
    if (stashes) reasons.push(`${stashes} stash(es)`);
    const branch = git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']);
    if (!branch) {
        reasons.push('detached HEAD');
    } else if (git(dir, ['rev-parse', '--abbrev-ref', '@{u}']) === null) {
        reasons.push(`branch ${branch} was never pushed`);
    } else {
        const ahead = Number(git(dir, ['rev-list', '--count', '@{u}..HEAD']) || 0);
        if (ahead) reasons.push(`${ahead} unpushed commit(s) on ${branch}`);
    }
    return {clean: reasons.length === 0, reasons};
}

/**
 * The private security repo (pkp-e2e-sec, `security_policy.md` there), one
 * clone beside the slots that they all share. A slot counts as clean only
 * when it is clean too, so security work is never left uncommitted.
 */
const SEC_REPO = 'pkp-e2e-sec';
const secDir = (dir) => path.resolve(dir, '..', SEC_REPO);

/** checkClean() of the slot's clone and of the security repo beside it. */
function checkSlotClean(dir) {
    const check = checkClean(dir);
    const sec = secDir(dir);
    if (!fs.existsSync(path.join(sec, '.git'))) return check;
    const c = checkClean(sec);
    return {clean: check.clean && c.clean, reasons: [...check.reasons, ...c.reasons.map((r) => `${SEC_REPO}: ${r}`)]};
}

/** Brings the security repo to its remote tip when it is clean; one line saying what it found. */
function syncSecRepo(dir) {
    const sec = secDir(dir);
    if (!fs.existsSync(path.join(sec, '.git'))) {
        return `The private security repo ${sec} is missing: clone it (\`git clone https://github.com/jardakotesovec/${SEC_REPO} ${sec}\`) before any security work.`;
    }
    const c = checkClean(sec);
    if (!c.clean) return `The private security repo ${sec} is not clean (${c.reasons.join('; ')}): another session may be writing there. Do not discard that work; \`git pull --rebase\` before you write.`;
    try {
        execFileSync('git', ['pull', '--ff-only', '-q'], {cwd: sec, stdio: 'ignore', timeout: 20000});
        return `The private security repo ${sec} is pulled, at ${git(sec, ['rev-parse', '--short', 'HEAD'])}.`;
    } catch {
        return `The private security repo ${sec} could not be pulled: run \`git -C ${sec} pull --rebase\` and check its access before any security work.`;
    }
}

/** What is checked out in a slot: the repo and every app checkout. */
function snapshot(dir) {
    const snap = {
        repo: {branch: git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']) || 'detached', head: git(dir, ['rev-parse', '--short', 'HEAD'])},
        apps: {},
    };
    for (const [line, sub] of LINE_DIRS) {
        for (const app of Object.keys(BASE_PORTS)) {
            const root = path.join(dir, 'checkouts', sub, app);
            if (!fs.existsSync(path.join(root, '.git'))) continue;
            const one = (d) => ({
                ref: git(d, ['symbolic-ref', '--short', '-q', 'HEAD']) || 'detached',
                head: git(d, ['rev-parse', '--short', 'HEAD']),
            });
            snap.apps[`${line === 'main' ? '' : `${line}/`}${app}`] = {
                ...one(root),
                'lib/pkp': one(path.join(root, 'lib', 'pkp')),
                'lib/ui-library': one(path.join(root, 'lib', 'ui-library')),
            };
        }
    }
    return snap;
}

const fmtRef = (r) => (r ? `${r.ref === 'detached' ? 'detached' : r.ref} @ ${r.head}` : '—');

/** Lines describing how `after` differs from `before`; empty when nothing moved. */
function diffSnapshots(before, after) {
    const out = [];
    if (!before) return out;
    if (before.repo.head !== after.repo.head || before.repo.branch !== after.repo.branch) {
        out.push(`- pkp-e2e: was ${before.repo.branch} @ ${before.repo.head}, now ${after.repo.branch} @ ${after.repo.head}`);
    }
    for (const key of Object.keys(after.apps)) {
        const a = after.apps[key];
        const b = before.apps[key];
        if (!b) continue;
        for (const part of ['', 'lib/pkp', 'lib/ui-library']) {
            const x = part ? b[part] : b;
            const y = part ? a[part] : a;
            if (x.head !== y.head || x.ref !== y.ref) {
                out.push(`- ${key}${part ? ` ${part}` : ''}: was ${fmtRef(x)}, now ${fmtRef(y)}`);
            }
        }
    }
    return out;
}

function describeSnapshot(snap) {
    const lines = [`- pkp-e2e: ${snap.repo.branch} @ ${snap.repo.head}`];
    for (const [key, a] of Object.entries(snap.apps)) {
        const off = [a, a['lib/pkp'], a['lib/ui-library']].some((r) => r.ref !== 'main' && r.ref !== 'stable-3_5_0');
        lines.push(`- ${key}: ${fmtRef(a)}; lib/pkp ${fmtRef(a['lib/pkp'])}${off ? '  ← not on a line tip' : ''}`);
    }
    return lines;
}

function portsLine(n) {
    const shift = slotPortShift(n);
    const main = Object.entries(BASE_PORTS).map(([a, p]) => `${a} ${p + shift}`).join(' / ');
    const stable = Object.entries(BASE_PORTS).map(([a, p]) => `${a} ${p + shift + 1000}`).join(' / ');
    return `ports ${main} (stable-3_5_0: ${stable}); DBs <app>_test${n ? `_s${n}` : ''}; Mailpit 127.0.0.1:${8025 + n} (SMTP ${1025 + n})`;
}

// ---------------------------------------------------------------------------
// Bot-facing commands

function acquire({thread, session, resume, dir, title, 'fresh-session': freshSession}) {
    if (!thread || !session) throw new Error('acquire needs --thread and --session');
    const slots = slotList();
    return withRegistry((reg) => {
        // A manual session that ended is released like a paused one.
        for (const s of slots) {
            const e = reg.slots[s.n];
            if (e && e.state === 'live' && e.manualPid && !pidAlive(e.manualPid)) releaseSlot(reg, s.n, null, s.dir);
        }
        const known = reg.threads[thread];
        let own = known ? slots.find((s) => s.n === known.slot) : null;
        if (!own && dir) own = slotOfDir(dir);
        const ownEntry = own ? reg.slots[own.n] : null;
        const ownHeldByOther = ownEntry && liveEntry(ownEntry) && ownEntry.thread !== thread;
        const blockedByOther = ownEntry && ownEntry.state === 'blocked' && ownEntry.thread !== thread;

        let chosen = null;
        let mode = resume ? 'resume' : 'new';
        if (own && !ownHeldByOther && !blockedByOther) {
            chosen = own;
        } else {
            const free = slots
                .filter((s) => !reg.slots[s.n] || reg.slots[s.n].state === 'free')
                .sort((a, b) => lastUsed(reg, a.n) - lastUsed(reg, b.n));
            chosen = free[0] || null;
            if (chosen && resume) mode = 'fresh';
        }
        if (!chosen) {
            return {ok: false, reason: 'busy', slots: slots.map((s) => describeEntry(reg, s.n))};
        }
        if (mode === 'fresh' && freshSession) session = freshSession;
        const prev = reg.slots[chosen.n];
        const sameThread = prev && prev.thread === thread;
        // A late release of an earlier session of this thread (the bot releases
        // asynchronously) must not free the slot this one now holds.
        const lease = crypto.randomBytes(6).toString('hex');
        reg.slots[chosen.n] = {
            state: 'live',
            thread,
            session,
            lease,
            title: title || (sameThread ? prev.title : undefined) || known?.title,
            since: now(),
            ...(mode === 'fresh' ? {movedFrom: own ? own.n : null} : {}),
        };
        if (!sameThread || !prev || prev.state === 'free') recordUse(reg, chosen.n, thread);
        reg.threads[thread] = {...(known || {}), slot: chosen.n, session, title: reg.slots[chosen.n].title, since: now()};
        return {ok: true, slot: chosen.n, dir: chosen.dir, mode, lease, movedFrom: mode === 'fresh' && own ? own.n : undefined};
    });
}

/**
 * Stop every `php -S` serving from this slot's clone: the probe, validation
 * and dataset servers (bin/probe-servers.js, detached and kept on purpose),
 * a kept check's own server and any run's left behind. Matched by argv, not
 * by text, so a shell that merely mentions a server is never hit: a `php`
 * binary with `-S 127.0.0.1:<port>` and `-t <path inside dir>`, or the
 * restart loop around one (php-server.js: `sh -c` carrying the
 * `[harness] php -S start` line and that `-t`). A matched process-group
 * leader takes its group down (the loop and `php -S` together: killing
 * `php -S` alone lets the loop start it again); anything else goes alone.
 * SIGTERM, then SIGKILL after 3 s. The probe servers' pid files go too.
 */
function stopSlotServers(dir) {
    const inSlot = (p) => typeof p === 'string' && p.replace(/^"/, '').startsWith(`${dir}/`);
    const isServer = (argv) => {
        const bin = path.basename(argv[0] || '');
        if (/^php/.test(bin)) {
            const s = argv.indexOf('-S');
            const t = argv.indexOf('-t');
            return s > 0 && /^127\.0\.0\.1:\d+$/.test(argv[s + 1] || '') && t > 0 && inSlot(argv[t + 1]);
        }
        if (bin === 'sh' && argv[1] === '-c') {
            const script = argv[2] || '';
            const t = script.match(/ -S 127\.0\.0\.1:\d+ -t "([^"]+)"/);
            return script.includes('[harness] php -S start') && Boolean(t) && inSlot(t[1]);
        }
        return false;
    };
    const matches = [];
    let entries = [];
    try {
        entries = fs.readdirSync('/proc').filter((e) => /^\d+$/.test(e));
    } catch {
        return {stopped: 0};
    }
    for (const e of entries) {
        const pid = Number(e);
        try {
            const argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0');
            if (!isServer(argv)) continue;
            const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
            matches.push({pid, pgid: Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[2])});
        } catch {
            // gone, or not ours to read
        }
    }
    const leaders = new Set(matches.filter((m) => m.pgid === m.pid).map((m) => m.pid));
    const targets = new Set(matches.map((m) => (leaders.has(m.pgid) ? -m.pgid : m.pid)));
    const signal = (sig) => {
        for (const t of targets) {
            try {
                process.kill(t, sig);
            } catch {
                // already gone
            }
        }
    };
    signal('SIGTERM');
    for (let i = 0; i < 30 && matches.some((m) => pidAlive(m.pid)); i++) sleepSync(100);
    if (matches.some((m) => pidAlive(m.pid))) signal('SIGKILL');
    try {
        for (const d of fs.readdirSync(path.join(dir, '.reports')).filter((x) => x.startsWith('servers'))) {
            for (const f of fs.readdirSync(path.join(dir, '.reports', d)).filter((x) => x.endsWith('.pid'))) {
                fs.rmSync(path.join(dir, '.reports', d, f), {force: true});
            }
        }
    } catch {
        // no pid files
    }
    return {stopped: matches.length};
}

function releaseSlot(reg, n, thread, dir) {
    stopSlotServers(dir);
    const check = checkSlotClean(dir);
    const snap = snapshot(dir);
    const entry = reg.slots[n] || {};
    closeUse(reg, n, thread);
    if (thread) {
        reg.threads[thread] = {
            ...(reg.threads[thread] || {}),
            slot: n,
            pausedAt: now(),
            snapshot: snap,
            clean: check.clean,
            reasons: check.reasons,
        };
    }
    reg.slots[n] = check.clean
        ? {state: 'free', releasedAt: now(), lastThread: thread || null}
        : {state: 'blocked', thread: thread || null, title: entry.title, since: entry.since, releasedAt: now(), reasons: check.reasons};
    return {slot: n, state: reg.slots[n].state, reasons: check.reasons, title: entry.title};
}

function release({thread, lease}) {
    if (!thread) throw new Error('release needs --thread');
    if (!lease) throw new Error('release needs --lease, the one acquire printed (the bot holds it); a feature claim is dropped with `unclaim <U<nn>>`');
    const slots = slotList();
    return withRegistry((reg) => {
        const s = slots.find((x) => reg.slots[x.n]?.state === 'live' && reg.slots[x.n].thread === thread && (!lease || reg.slots[x.n].lease === lease));
        if (!s) return {ok: true, slot: null, state: 'none'};
        return {ok: true, ...releaseSlot(reg, s.n, thread, s.dir)};
    });
}

/** Bot start: nothing is running yet, so every live slot is released (silently). */
function reconcile() {
    const slots = slotList();
    return withRegistry((reg) => {
        const out = [];
        for (const s of slots) {
            const e = reg.slots[s.n];
            if (e && e.state === 'live' && !(e.manualPid && pidAlive(e.manualPid))) {
                out.push(releaseSlot(reg, s.n, e.thread || null, s.dir));
            }
        }
        return {ok: true, released: out};
    });
}

function freeSlot(n) {
    const s = slotList().find((x) => x.n === Number(n));
    if (s) stopSlotServers(s.dir);
    return withRegistry((reg) => {
        reg.slots[n] = {state: 'free', releasedAt: now(), lastThread: reg.slots[n]?.thread || null};
        return {ok: true, slot: Number(n), state: 'free'};
    });
}

// ---------------------------------------------------------------------------
// Feature claims (RUNBOOK step 1): held by the thread (or manual session)
// holding the claimer's slot, valid while that holder still holds a slot
// (live or blocked), so a claim lapses by itself once its session is done.

function slotOwner(entry) {
    if (!entry || entry.state === 'free') return null;
    if (entry.manualPid) return pidAlive(entry.manualPid) ? `manual:${entry.manualPid}` : null;
    return entry.thread ? `thread:${entry.thread}` : null;
}

function claimValid(reg, claim) {
    return !!claim && Object.values(reg.slots).some((e) => slotOwner(e) === claim.owner);
}

function claim(key, cwd) {
    const s = slotOfDir(cwd);
    if (!s) throw new Error(`${cwd} is not inside a slot`);
    return withRegistry((reg) => {
        const owner = slotOwner(reg.slots[s.n]);
        if (!owner) throw new Error(`slot s${s.n} has no registered session`);
        const cur = reg.claims[key];
        if (claimValid(reg, cur) && cur.owner !== owner) {
            return {ok: false, key, heldBy: cur.owner, slot: cur.slot, since: cur.since};
        }
        reg.claims[key] = {owner, slot: s.n, since: cur && cur.owner === owner ? cur.since : now()};
        return {ok: true, key, slot: s.n};
    });
}

function unclaim(key) {
    return withRegistry((reg) => {
        delete reg.claims[key];
        return {ok: true, key};
    });
}

function listClaims() {
    const reg = readRegistry();
    return Object.entries(reg.claims)
        .filter(([, c]) => claimValid(reg, c))
        .map(([key, c]) => ({key, ...c}));
}

function describeEntry(reg, n) {
    const e = reg.slots[n];
    if (!e || e.state === 'free') return {slot: n, state: 'free'};
    if (e.state === 'live' && !liveEntry(e)) return {slot: n, state: 'free (stale)'};
    return {
        slot: n,
        state: e.manualPid ? 'live (manual session)' : e.state,
        thread: e.thread,
        title: e.title,
        since: e.since,
        reasons: e.reasons,
    };
}

function status() {
    const reg = readRegistry();
    const lines = [];
    for (const s of slotList()) {
        const d = describeEntry(reg, s.n);
        lines.push(`s${s.n}  ${d.state.padEnd(22)} ${d.thread ? `thread ${short(d.thread)} ` : ''}${d.title ? `"${String(d.title).slice(0, 50)}" ` : ''}${d.reasons ? `(${d.reasons.join('; ')})` : ''}  ${s.dir}`);
    }
    let lock = 'free';
    try {
        const {machineHolder, describeHolder} = require('../shared/playwright/test-lock.js');
        const h = machineHolder();
        if (h) lock = `held by ${describeHolder(h)}`;
    } catch {}
    lines.push(`test lock: ${lock}`);
    const claims = listClaims();
    if (claims.length) lines.push(`claims: ${claims.map((c) => `${c.key} (s${c.slot})`).join(', ')}`);
    return lines.join('\n');
}

// ---------------------------------------------------------------------------
// SessionStart hook

/**
 * The nearest ancestor process named `claude` (the hook runs under it) and
 * its argv: `-p` without stream-json is a one-shot (the bot's title, tag
 * and summary queries run `claude -p` in the slot), `--input-format
 * stream-json` a bot session, anything else an interactive session.
 */
function claudeProc() {
    let pid = process.ppid;
    for (let i = 0; i < 8 && pid > 1; i++) {
        try {
            const comm = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
            if (comm === 'claude' || comm.startsWith('claude')) {
                const argv = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').split('\0').filter(Boolean);
                const bot = argv.includes('stream-json');
                const oneShot = !bot && (argv.includes('-p') || argv.includes('--print'));
                return {pid, bot, oneShot};
            }
            const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
            pid = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[1]);
        } catch {
            break;
        }
    }
    return {pid: null, bot: false, oneShot: false};
}

const RULES = [
    'Working rules for parallel slots (harness.md "Slots"):',
    '- Work only inside this slot\'s clone. Other slots (/home/e2e/pkp-e2e*) belong to other sessions: never read, write, reset or kill anything there, and never pkill broadly (only processes whose command line names this slot\'s paths or ports).',
    '- Whole suites run on CI (`node bin/ci.js watch|dispatch`), not here. Every local Playwright run takes the machine-wide test lock (shared with your own parallel runs, exclusive against other slots, in request order). A run can wait behind another slot, so start fleet-prep, any run that may queue, and bin/ci.js with run_in_background, and keep the keepalive Monitor armed while anything is in flight, one tick every 6 minutes (the bot warns after 7 idle minutes and pauses after 10; RUNBOOK "Keep the thread ticking"); never stop the Monitor while a run, agent or CI job is still going. `node shared/playwright/test-lock.js status` shows who holds it.',
    '- Finish by committing and pushing (RUNBOOK step 10 / MAINTENANCE): the bot frees this slot only when this clone is clean (nothing uncommitted, untracked, stashed or unpushed). Anything left behind blocks the slot and pings the owner.',
    `- The private security repo ../${SEC_REPO} (one clone the slots share; its security_policy.md is the rule for anything security-shaped) is kept like this clone: pulled at session start (this hook does it when it is clean), \`git pull --rebase\` before writing there, committed and pushed before the session ends. The slot is freed only when it is clean too.`,
];

function hook(input) {
    const {session_id: sessionId, cwd, source} = input;
    let slots;
    try {
        slots = slotList();
    } catch {
        return null; // not a slotted machine
    }
    const s = slotOfDir(cwd || process.cwd());
    if (!s) return null;
    const proc = claudeProc();
    if (proc.oneShot) return null; // the bot's one-shot queries: no context, no registration
    const reg = readRegistry();
    const entry = reg.slots[s.n];
    const cur = snapshot(s.dir);
    const head = [];
    let body = [];

    const ownedByThis = entry && entry.session === sessionId;
    if (!ownedByThis) {
        // A session the bot did not place here (a manual `claude` in the slot).
        if (entry && liveEntry(entry) && !(entry.manualPid && entry.manualPid === proc.pid)) {
            head.push(`[slot s${s.n} · WARNING: this slot is in use by ${entry.manualPid ? `a manual session (pid ${entry.manualPid})` : `bot thread ${short(entry.thread)}${entry.title ? ` "${entry.title}"` : ''}`}]`);
            body.push('Do not run tests, resets, checkouts or git operations here; tell the user and pick a free slot (`node bin/slot.js status`).');
        } else if (entry && entry.state === 'blocked') {
            head.push(`[slot s${s.n} · manual session · slot BLOCKED by thread ${short(entry.thread)} (${(entry.reasons || []).join('; ')})]`);
            body.push('That thread left unfinished work here. Do not discard it unless the user says so.');
        } else if (proc.bot || !proc.pid) {
            // A bot session the registry does not know (the bot runs unpatched,
            // or its acquire failed): describe the slot, register nothing.
            head.push(`[slot s${s.n} · session not registered by the bot]`);
        } else {
            withRegistry((r) => {
                r.slots[s.n] = {state: 'live', manualPid: proc.pid, session: sessionId, since: now(), title: 'manual session'};
            });
            head.push(`[slot s${s.n} · manual session registered (pid ${proc.pid})]`);
        }
        body.push(...describeSnapshot(cur));
    } else {
        const thread = entry.thread;
        const trec = reg.threads[thread] || {};
        if (source === 'compact') {
            head.push(`[slot s${s.n} · reminder after compaction]`);
        } else if (entry.movedFrom !== undefined && entry.movedFrom !== null && source !== 'resume') {
            head.push(`[slot s${s.n} · FRESH START · this thread was in slot s${entry.movedFrom}, which another session holds now]`);
            body.push(
                'This is a new Claude session seeded with the thread\'s messages; you have no tool memory of the earlier work.',
                `The old slot's paths (under the s${entry.movedFrom} clone) are NOT yours: never read or write there.`,
                trec.clean === false
                    ? `Your earlier work there was left unfinished (${(trec.reasons || []).join('; ')}); it stays in slot s${entry.movedFrom} until its thread finishes it. Ask the user before redoing it here.`
                    : 'Your pause there was clean: everything was committed and pushed, so `git pull` gets it.',
            );
            if (trec.snapshot) body.push('What you had checked out there:', ...describeSnapshot(trec.snapshot));
            body.push('What is checked out here:', ...describeSnapshot(cur));
        } else if (source === 'resume') {
            const pausedAt = trec.pausedAt ? Date.parse(trec.pausedAt) : null;
            const others = (reg.history[s.n] || []).filter((h) => h.thread !== thread && pausedAt && Date.parse(h.to || now()) > pausedAt);
            head.push(`[slot s${s.n} · RESUMED${trec.pausedAt ? ` · paused ${trec.pausedAt.slice(0, 16).replace('T', ' ')} UTC` : ''}]`);
            if (!others.length) {
                const moved = diffSnapshots(trec.snapshot, cur);
                body.push(moved.length ? 'No other session used this slot while you were paused, but these moved:' : 'No other session used this slot while you were paused; checkouts are as you left them.', ...moved);
            } else {
                body.push(`Other threads used this slot while you were paused: ${others.map((h) => short(h.thread)).join(', ')}. Changes since your pause:`);
                const moved = diffSnapshots(trec.snapshot, cur);
                body.push(...(moved.length ? moved : ['- no checkout moved']));
                body.push('- the databases were probably reset or reseeded by them.');
                body.push('Restore what your task needs (a PR checkout: fetch + composer install + build + npm run mount), and reset the databases before probing or running tests.');
            }
        } else {
            head.push(`[slot s${s.n} · new session]`);
            body.push(...describeSnapshot(cur));
            body.push('Unless your task is a PR review, bring the checkouts to the line tips first when any is off them (`npm run fetch-apps -- --update`, then `npm run mount`), and reset the databases before a run.');
        }
    }
    const check = checkClean(s.dir);
    if (!check.clean) body.push(`This clone is not clean now: ${check.reasons.join('; ')}.`);
    if (source !== 'compact') body.push(syncSecRepo(s.dir));
    let lock = 'free';
    try {
        const {machineHolder, describeHolder} = require('../shared/playwright/test-lock.js');
        const h = machineHolder();
        if (h) lock = `held by ${describeHolder(h)}`;
    } catch {}
    const text = [
        ...head,
        `Slot s${s.n} = ${s.dir}; ${portsLine(s.n)}. Test lock: ${lock}.`,
        ...body,
        '',
        ...RULES,
    ].join('\n');
    return {hookSpecificOutput: {hookEventName: 'SessionStart', additionalContext: text}};
}

// ---------------------------------------------------------------------------

function parseFlags(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (!a.startsWith('--')) {
            (out._ = out._ || []).push(a);
            continue;
        }
        const key = a.slice(2);
        if (key === 'resume') out.resume = true;
        else out[key] = argv[++i];
    }
    return out;
}

/** The commands only the bot or the operator may run (the header says why). */
const BOT_ONLY = ['acquire', 'release', 'reconcile', 'free'];

function main() {
    const [cmd, ...rest] = process.argv.slice(2);
    const flags = parseFlags(rest);
    const print = (o) => process.stdout.write(JSON.stringify(o) + '\n');
    try {
        if (BOT_ONLY.includes(cmd) && process.env.CLAUDECODE && process.env.PKP_E2E_SLOT_FORCE !== '1') {
            throw new Error(
                `\`${cmd}\` is the bot's and the operator's command, refused inside a Claude session: ` +
                    'it would free or re-lease the slot this session runs in. To drop a feature claim: `node bin/slot.js unclaim <U<nn>>`'
            );
        }
        if (cmd === 'release' && (flags._ || []).length) {
            throw new Error(`release takes no \`${flags._[0]}\`: a feature claim is dropped with \`unclaim ${flags._[0]}\``);
        }
        switch (cmd) {
            case 'acquire':
                return print(acquire(flags));
            case 'release':
                return print(release(flags));
            case 'reconcile':
                return print(reconcile());
            case 'free':
                return print(freeSlot(Number((flags._ || [])[0])));
            case 'status':
                return console.log(status());
            case 'claim': {
                const out = claim((flags._ || [])[0], process.cwd());
                print(out);
                if (!out.ok) process.exit(1);
                return;
            }
            case 'unclaim':
                return print(unclaim((flags._ || [])[0]));
            case 'claims':
                return print(listClaims());
            case 'hook': {
                let raw = '';
                try {
                    raw = fs.readFileSync(0, 'utf8');
                } catch {}
                const out = hook(raw ? JSON.parse(raw) : {});
                if (out) print(out);
                return;
            }
            default:
                console.error('usage: node bin/slot.js claim <U<nn>>|unclaim <U<nn>>|claims|status|hook (bot and operator only: acquire|release|reconcile|free <n>)');
                process.exit(1);
        }
    } catch (e) {
        if (cmd === 'hook') return; // never break a session start
        print({ok: false, reason: 'error', error: String(e.message || e)});
        process.exit(1);
    }
}

module.exports = {acquire, release, reconcile, freeSlot, stopSlotServers, claim, unclaim, listClaims, status, hook, checkClean, checkSlotClean, syncSecRepo, snapshot, diffSnapshots};

if (require.main === module) main();
