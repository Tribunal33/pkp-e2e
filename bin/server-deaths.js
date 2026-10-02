#!/usr/bin/env node
/**
 * @file bin/server-deaths.js
 *
 * Every `php -S` death in a suite's worker server logs, one line each: the
 * log, the time, the exit code, how long the process had lived (seconds and
 * answers since its start), its pid, the request it died on (the
 * `[harness] begin` line, `request-begin.php`) and, when CI kept a core for
 * that pid, the top frames of its backtrace (`bin/ci-cores.sh`). CI runs it
 * after the suite on every job, so a run's job logs count the deaths of
 * green jobs too (`.reports/flake-1002/segv/diagnosis.md`: early-life
 * deaths against the in-family GH-20469 ones, per JIT arm).
 *
 *   node bin/server-deaths.js <dir with server-*.log> [--cores <dir>] [--early <s>]
 *
 * Prints `[server-deaths] …` lines and a total; on CI also a table in the
 * step summary and `count=` / `early=` step outputs. Exit 0 always.
 */
const fs = require('fs');
const path = require('path');
const {deathsIn, lifeOf} = require('../shared/playwright/support/server-crash.js');

function parseArgs(argv) {
    const out = {_: []};
    for (let i = 0; i < argv.length; i++) {
        if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
        else out._.push(argv[i]);
    }
    return out;
}

/** The first frames of a core's backtrace file, one line. */
function frames(file) {
    const text = fs.readFileSync(file, 'utf8');
    // The backtrace proper follows gdb's `p/x $pc` answer (`$1 = …`).
    const bt = text.split(/^\$1 = .*$/m).pop();
    const lines = bt.split('\n').filter((line) => /^#\d+ /.test(line)).slice(0, 6);
    const where = (text.match(/^frame-mappings: (.*)$/m) || text.match(/^pc-mapping: (.*)$/m) || [])[1];
    return `${where ? `[${where}] ` : ''}${lines.map((line) => line.replace(/\s+/g, ' ').replace(/ \(.*?\) at /, ' at ')).join(' | ')}`;
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    const dir = opts._[0];
    const early = Number(opts.early || 120);
    const coresDir = opts.cores || path.join(dir || '.', 'cores');
    if (!dir || !fs.existsSync(dir)) {
        console.log(`[server-deaths] no log folder ${dir || '(none given)'}`);
        return;
    }
    const cores = fs.existsSync(coresDir) ? fs.readdirSync(coresDir).filter((name) => name.endsWith('.txt')) : [];
    const rows = [];
    for (const name of fs.readdirSync(dir).filter((n) => /^server-.*\.log$/.test(n)).sort()) {
        for (const death of deathsIn(fs.readFileSync(path.join(dir, name), 'utf8'))) {
            const seconds = death.startedAt && death.at ? Math.round((Date.parse(death.at) - Date.parse(death.startedAt)) / 1000) : null;
            const core = death.pid ? cores.find((c) => c.endsWith(`.${death.pid}.txt`)) : null;
            rows.push({
                log: name,
                at: death.at,
                exit: death.exit,
                seconds,
                life: lifeOf(death),
                pid: death.pid,
                requests: death.requests.length ? death.requests.join(', ') : `${death.unanswered.length} unanswered, no begin line`,
                core: core ? frames(path.join(coresDir, core)) : '',
            });
        }
    }
    for (const row of rows) {
        console.log(
            `[server-deaths] ${row.log} ${row.at} exit ${row.exit}` +
                `${row.life ? `, ${row.life}` : ''}${row.pid ? `, pid ${row.pid}` : ''}: ${row.requests}` +
                `${row.core ? `\n[server-deaths]   core: ${row.core}` : ''}`,
        );
    }
    const earlyCount = rows.filter((row) => row.seconds !== null && row.seconds < early).length;
    const total = `[server-deaths] total ${rows.length} (exit 139: ${rows.filter((r) => r.exit === 139).length}; ` +
        `under ${early} s into the process's life: ${earlyCount}); cores ${cores.length}`;
    console.log(total);
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${rows.length}\nearly=${earlyCount}\n`);
    }
    if (process.env.GITHUB_STEP_SUMMARY && rows.length) {
        const cell = (text) => String(text).replace(/\|/g, '\\|');
        const table = [
            `### php -S deaths (${rows.length}, ${earlyCount} under ${early} s into the process)`,
            '',
            '| log | at | exit | life | died serving | core |',
            '|---|---|---|---|---|---|',
            ...rows.map((r) => `| ${r.log} | ${r.at} | ${r.exit} | ${cell(r.life)} | ${cell(r.requests)} | ${cell(r.core)} |`),
            '',
        ].join('\n');
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${table}\n`);
    }
}

main();
