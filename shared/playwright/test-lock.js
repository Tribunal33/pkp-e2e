/**
 * @file shared/playwright/test-lock.js
 *
 * The machine-wide test lock (harness.md "Slots"): parallel slot clones
 * on one machine never run Playwright at the same time, because
 * concurrent fleets fight over the cores and the suites turn flaky. The lock
 * is exclusive BETWEEN slots and shared WITHIN one: a session's own
 * concurrent runs (one test author per app, RUNBOOK step 8) run side by
 * side as before, while a run from another slot waits until the holding
 * slot's last run has ended.
 *
 *   acquire()                      block until this slot holds the machine
 *                                  (config-factory.js, test-app.js,
 *                                  test-final.js, fleet-prep.js call it)
 *   node shared/playwright/test-lock.js status
 *   node shared/playwright/test-lock.js --hold <slot>   (internal: the holder)
 *
 * Fair between slots: a run joins its slot's hold only while no other
 * slot has a run that asked earlier, so a busy slot cannot keep the lock
 * by starting run after run; slots take turns in request order.
 *
 * Mechanics: one holder process per slot owns a kernel flock on
 * <home>/test-lock/machine.lock (via flock(1), whose child dies with the
 * holder's stdin pipe, so a killed holder can never leave the lock
 * behind). Every run registers its pid under slot-<n>/owners/, queued
 * until it may run, then active; the holder lets go once none of its
 * slot's runs is active. Children inherit
 * PKP_E2E_LOCK_OWNER and never register again (Playwright workers load the
 * config too). Skipped on CI, where flock(1) is missing (macOS), and with
 * PKP_E2E_LOCK=off.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

const SLOTS_HOME = process.env.PKP_E2E_SLOTS_HOME || path.join(os.homedir(), '.pkp-e2e-slots');
const LOCK_DIR = path.join(SLOTS_HOME, 'test-lock');
const MACHINE_LOCK = path.join(LOCK_DIR, 'machine.lock');
const HOLDER_FILE = path.join(LOCK_DIR, 'holder.json');
const WAIT_REPORT_MS = 60 * 1000;
const RELEASE_GRACE_TICKS = 3; // × 1 s with no live owner before letting go

const slotDir = (slot) => path.join(LOCK_DIR, `slot-${slot}`);
const ownersDir = (slot) => path.join(slotDir(slot), 'owners');
const holderPidFile = (slot) => path.join(slotDir(slot), 'holder.pid');
const spawnGuard = (slot) => path.join(slotDir(slot), 'spawn');

const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Linux start time of a pid (field 22 of /proc/<pid>/stat), null when the pid is gone. */
function startTime(pid) {
    try {
        const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        return stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
    } catch {
        return null;
    }
}

/** A {pid, start} record is alive when the pid exists and was not reused. */
const alive = (rec) => !!rec && startTime(rec.pid) !== null && startTime(rec.pid) === rec.start;

function readJson(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        return null;
    }
}

function writeJsonAtomic(file, data) {
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
}

/** Live owners of a slot; dead owners' files are removed on the way. */
function liveOwners(slot) {
    let names = [];
    try {
        names = fs.readdirSync(ownersDir(slot));
    } catch {
        return [];
    }
    const out = [];
    for (const name of names) {
        const file = path.join(ownersDir(slot), name);
        const rec = readJson(file);
        if (alive(rec)) out.push(rec);
        else fs.rmSync(file, {force: true});
    }
    return out;
}

const activeOwners = (slot) => liveOwners(slot).filter((o) => o.state !== 'queued');

/** Does another slot have a queued run that asked before `since`? */
function earlierWaiter(slot, since) {
    let dirs = [];
    try {
        dirs = fs.readdirSync(LOCK_DIR).filter((d) => d.startsWith('slot-'));
    } catch {}
    return dirs.some((d) => {
        const other = Number(d.slice(5));
        return other !== slot && liveOwners(other).some((o) => o.state === 'queued' && o.since < since);
    });
}

/** The slot's holder process record if it is alive (waiting or holding). */
function slotHolder(slot) {
    const rec = readJson(holderPidFile(slot));
    return alive(rec) ? rec : null;
}

/** Who holds the machine now: {slot, pid, since, owners} or null. */
function machineHolder() {
    const rec = readJson(HOLDER_FILE);
    return rec && alive(rec) ? rec : null;
}

function describeHolder(h) {
    const owners = (h.owners || []).map((o) => `pid ${o.pid} ${o.cmd}`.slice(0, 140)).join('; ');
    const mins = Math.round((Date.now() - Date.parse(h.since)) / 60000);
    return `slot ${h.slot} (for ${mins} min${owners ? `: ${owners}` : ''})`;
}

function lockDisabled() {
    if (process.env.CI || process.env.PKP_E2E_LOCK === 'off') return true;
    return spawnSync('flock', ['--version'], {stdio: 'ignore'}).status !== 0;
}

/**
 * Block until this clone's slot holds the machine's test lock, and keep it
 * for as long as this process lives. No-op when an ancestor already
 * registered (PKP_E2E_LOCK_OWNER), on CI and without flock(1).
 *
 * @param {string} label what is running, for the status line other slots see
 */
function acquire(label = process.argv.slice(1).join(' ')) {
    if (process.env.PKP_E2E_LOCK_OWNER || lockDisabled()) return;
    const {resolveSlot} = require('../../bin/apps.js');
    const slot = resolveSlot().n;
    fs.mkdirSync(ownersDir(slot), {recursive: true});
    // Register BEFORE looking at the holder: a holder that is letting go
    // re-reads the owners after withdrawing, so it sees us (see hold()).
    const ownerFile = path.join(ownersDir(slot), `${process.pid}.json`);
    const me = {
        pid: process.pid,
        start: startTime(process.pid),
        cmd: label.replace(/\s+/g, ' ').slice(0, 200),
        since: new Date().toISOString(),
        state: 'queued',
    };
    writeJsonAtomic(ownerFile, me);
    process.env.PKP_E2E_LOCK_OWNER = String(process.pid);

    // First report after 3 s: an uncontended acquire takes about a second.
    let lastReport = Date.now() - WAIT_REPORT_MS + 3000;
    for (;;) {
        const h = machineHolder();
        if (h && h.slot === slot && alive(slotHolder(slot)) && !earlierWaiter(slot, me.since)) {
            // Active BEFORE the second look: a holder letting go withdraws
            // first and then counts active runs, so either it sees us, or we
            // see it gone and queue again.
            writeJsonAtomic(ownerFile, {...me, state: 'active'});
            const again = machineHolder();
            if (again && again.pid === h.pid && alive(slotHolder(slot))) return;
            writeJsonAtomic(ownerFile, me);
        }
        if (!slotHolder(slot)) spawnHolder(slot);
        if (Date.now() - lastReport >= WAIT_REPORT_MS) {
            const who = h ? describeHolder(h) : 'nobody yet (the lock is being taken)';
            console.error(`test-lock: slot ${slot} waiting for the machine's test lock, held by ${who}`);
            lastReport = Date.now();
        }
        sleepSync(250);
    }
}

function spawnHolder(slot) {
    const guard = spawnGuard(slot);
    try {
        fs.mkdirSync(guard);
    } catch {
        // Another run of this slot is spawning one; a guard older than 10 s
        // belongs to a spawn that died before it wrote holder.pid.
        try {
            if (Date.now() - fs.statSync(guard).mtimeMs > 10000) fs.rmSync(guard, {recursive: true, force: true});
        } catch {}
        return;
    }
    const child = spawn(process.execPath, [__filename, '--hold', String(slot)], {
        detached: true,
        stdio: 'ignore',
        env: {...process.env, PKP_E2E_LOCK_OWNER: ''},
    });
    child.unref();
}

/** The holder: take the machine lock for `slot`, keep it while owners live. */
function hold(slot) {
    fs.mkdirSync(slotDir(slot), {recursive: true});
    writeJsonAtomic(holderPidFile(slot), {pid: process.pid, start: startTime(process.pid)});
    fs.rmSync(spawnGuard(slot), {recursive: true, force: true});
    const flock = spawn('flock', ['-x', MACHINE_LOCK, 'sh', '-c', 'echo held; exec cat >/dev/null'], {
        stdio: ['pipe', 'pipe', 'inherit'],
    });
    const me = {slot, pid: process.pid, start: startTime(process.pid), since: new Date().toISOString()};
    const publish = () => writeJsonAtomic(HOLDER_FILE, {...me, owners: activeOwners(slot)});
    const letGo = () => {
        const cur = readJson(HOLDER_FILE);
        if (cur && cur.pid === process.pid) fs.rmSync(HOLDER_FILE, {force: true});
        const pidRec = readJson(holderPidFile(slot));
        if (pidRec && pidRec.pid === process.pid) fs.rmSync(holderPidFile(slot), {force: true});
        flock.stdin.end();
        // A flock(1) still WAITING ignores its stdin: kill it, or it lingers
        // in the queue after we are gone.
        try {
            flock.kill('SIGTERM');
        } catch {}
        process.exit(0);
    };
    for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, letGo);
    flock.on('exit', () => process.exit(1));
    flock.stdout.once('data', () => {
        me.since = new Date().toISOString(); // held from now, not from when we started waiting
        publish();
        let empty = 0;
        setInterval(() => {
            if (activeOwners(slot).length) {
                empty = 0;
                publish();
                return;
            }
            if (++empty < RELEASE_GRACE_TICKS) return;
            // Withdraw first, then look again: a run that saw us holding had
            // registered before it looked, so it shows up here.
            fs.rmSync(HOLDER_FILE, {force: true});
            if (activeOwners(slot).length) {
                empty = 0;
                publish();
                return;
            }
            letGo();
        }, 1000);
    });
    // While still waiting for the lock: give up if every owner is gone.
    const waitCheck = setInterval(() => {
        if (machineHolder()?.pid === process.pid) return clearInterval(waitCheck);
        if (!liveOwners(slot).length) letGo();
    }, 2000);
}

function status() {
    const h = machineHolder();
    console.log(h ? `held by ${describeHolder(h)}` : 'free');
    let slots = [];
    try {
        slots = fs.readdirSync(LOCK_DIR).filter((d) => d.startsWith('slot-')).map((d) => Number(d.slice(5)));
    } catch {}
    for (const slot of slots.sort()) {
        const queued = liveOwners(slot).filter((o) => o.state === 'queued' || !(h && h.slot === slot));
        if (queued.length) console.log(`slot ${slot} waiting: ${queued.map((o) => `pid ${o.pid} ${o.cmd} (since ${o.since.slice(11, 16)})`).join('; ')}`);
    }
}

module.exports = {acquire, machineHolder, describeHolder, status, LOCK_DIR, SLOTS_HOME};

if (require.main === module) {
    const [cmd, arg] = process.argv.slice(2);
    if (cmd === '--hold') hold(Number(arg));
    else if (cmd === 'status' || !cmd) status();
    else {
        console.error('usage: node shared/playwright/test-lock.js status');
        process.exit(1);
    }
}
