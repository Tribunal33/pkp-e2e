#!/usr/bin/env node
/**
 * @file bin/ci-cores.js
 *
 * CI only (run-app.yml): turn the core dumps of dead `php -S` workers into
 * small backtrace files the artifact keeps, and delete the cores. The
 * runner writes a core as `<core dir>/core.<unix time>.<pid>` (the job sets
 * `kernel.core_pattern`; php-server.js lifts the size limit when
 * `PKP_E2E_CORE_DIR` is set); the pid is the one the server log's
 * `[harness] begin … pid <pid>` lines carry, so `bin/server-deaths.js`
 * puts each backtrace beside its death. A backtrace tells the
 * segfault classes apart (`.reports/flake-1002/segv/diagnosis.md`):
 * php-src GH-20469 dies in `instanceof_function_slow ←
 * zend_do_inheritance_ex`; a fault in JIT-compiled code has its pc in the
 * OPcache segment (`/dev/zero (deleted)`, the JIT buffer); OPcache's own
 * paths in `accel_*` / `zend_accel_*`.
 *
 *   node bin/ci-cores.js <core dir> <out dir> [--watch]
 *
 * --watch keeps going every 5 s until killed (it runs beside the suite, so
 * the cores never pile up on the runner's disk); without it, one pass.
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const MAX_BACKTRACES = 40;
const SETTLE_MS = 3000;

const [coreDir, outDir, mode] = process.argv.slice(2);
if (!coreDir || !outDir) {
    console.error('usage: node bin/ci-cores.js <core dir> <out dir> [--watch]');
    process.exit(1);
}

function which(cmd) {
    try {
        return execFileSync('sh', ['-c', `command -v ${cmd}`], {encoding: 'utf8'}).trim();
    } catch {
        return '';
    }
}

const gdb = which('gdb');
const php = (() => {
    const found = which('php');
    try {
        return found ? fs.realpathSync(found) : '';
    } catch {
        return found;
    }
})();
let done = 0;

/** The mapping (file and offset) that holds `pc`, from gdb's `info proc mappings`. */
function mappingOf(text, pc) {
    if (!pc) return 'unknown (no pc)';
    const at = BigInt(pc);
    for (const line of text.split('\n')) {
        const m = line.match(/^\s*(0x[0-9a-f]+)\s+(0x[0-9a-f]+)\s+0x[0-9a-f]+\s+(0x[0-9a-f]+)\s*(.*)$/);
        if (m && BigInt(m[1]) <= at && at < BigInt(m[2])) {
            // The file offset: in the OPcache segment (`/dev/zero (deleted)`),
            // one at or past opcache.memory_consumption is the JIT buffer.
            return `${m[4].trim() || '(anonymous)'} @0x${(at - BigInt(m[1]) + BigInt(m[3])).toString(16)}`;
        }
    }
    return 'no file mapping (private anonymous memory)';
}

function backtrace(core) {
    const name = path.basename(core);
    const out = path.join(outDir, `${name.replace(/^core\./, 'core-')}.txt`);
    const size = fs.statSync(core).size;
    let text;
    if (!gdb) {
        text = 'gdb is not installed; no backtrace\n';
    } else {
        try {
            text = execFileSync(
                gdb,
                ['-batch', '-nx', '-q', php, core,
                    '-ex', 'set pagination off',
                    '-ex', 'p/x $pc',
                    '-ex', 'bt 40',
                    '-ex', 'info proc mappings',
                    '-ex', 'info registers',
                    '-ex', 'x/8i $pc'],
                {encoding: 'utf8', timeout: 120_000, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']},
            );
        } catch (error) {
            text = `${error.stdout || ''}\n${error.stderr || ''}\ngdb failed: ${error.message}\n`;
        }
    }
    const pc = (text.match(/^\$1 = (0x[0-9a-f]+)$/m) || [])[1];
    // Where the first frames' addresses lie: a caller in the OPcache segment
    // past its 128 MB (`/dev/zero (deleted) @0x8000000` and up) is JIT code
    // (the local core of 2026-10-02: zend_objects_store_del called from it).
    const bt = text.split(/^\$1 = .*$/m).pop();
    const callers = [...bt.matchAll(/^#(\d+)\s+(0x[0-9a-f]+) in /gm)]
        .slice(0, 4)
        .map((m) => `#${m[1]} ${mappingOf(text, m[2])}`)
        .join('; ');
    const header =
        `core: ${name} (${size} bytes) exe: ${php}\npc: ${pc || '?'}\npc-mapping: ${mappingOf(text, pc)}\n` +
        `frame-mappings: ${callers}\n\n`;
    fs.writeFileSync(out, header + text);
    // eslint-disable-next-line no-console
    console.log(`[ci-cores] ${name}: pc ${pc || '?'} in ${mappingOf(text, pc)}; frames ${callers}; ${out}`);
}

function pass() {
    if (!fs.existsSync(coreDir)) return;
    fs.mkdirSync(outDir, {recursive: true});
    for (const name of fs.readdirSync(coreDir).filter((n) => n.startsWith('core.')).sort()) {
        const core = path.join(coreDir, name);
        let stat;
        try {
            stat = fs.statSync(core);
        } catch {
            continue;
        }
        if (mode === '--watch' && Date.now() - stat.mtimeMs < SETTLE_MS) continue;
        if (done < MAX_BACKTRACES) {
            backtrace(core);
            done++;
        }
        fs.rmSync(core, {force: true});
    }
}

if (mode === '--watch') {
    pass();
    setInterval(pass, 5000);
    process.on('SIGTERM', () => process.exit(0));
} else {
    pass();
}
