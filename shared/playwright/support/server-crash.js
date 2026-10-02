/**
 * @file shared/playwright/support/server-crash.js
 *
 * A failed test whose worker server died while it ran says so in its own
 * report. The worker's `php -S` runs inside the restart loop of
 * `php-server.js`, which appends `[harness] php -S died <UTC> (exit N)` to
 * the server's log and brings a fresh process up within a second. The
 * request the dead process was serving gets no answer at all, which the
 * browser reports as `net::ERR_EMPTY_RESPONSE`, `net::ERR_CONNECTION_RESET`
 * or a `chrome-error://chromewebdata/` page, and the API client as `socket
 * hang up`; the test then fails on whatever step it was, with nothing in
 * the error that names the server. On CI those deaths cluster in the first
 * tests a fresh server serves (U01 S1/S4/S5/S7, U03 S1/S11, 2026-09-22..28;
 * `.reports/flake-2026-09-29/u01s4/diagnosis.md`).
 *
 * `serverCrashWatch` (an auto fixture in base-test.js) notes the size of
 * the worker's log when the test starts; when the test ends in a status
 * other than the expected one it reads what the log gained meanwhile and,
 * for every death line in it, adds a `server-crash` annotation, attaches
 * the log lines around it (the `Accepted` line with no status after it is
 * the request that took the process down) and prints one line to stderr,
 * so the CI job log carries it beside the failure. It asserts nothing and
 * retries nothing.
 *
 * The test sees a dying process's connection drop a moment before the
 * restart loop writes the death line (the kernel closes the process's
 * sockets before its shell's `wait` returns, and a saturated CI runner
 * schedules that shell late), so a test that fails on the drop itself
 * (`socket hang up`, `ERR_EMPTY_RESPONSE`, `ERR_CONNECTION_RESET`) read the
 * log too early and carried no annotation (OJS U03 S6 ojs 36672771134, OJS
 * U12 S4 pkp-e2e 36872303797). For such a failure the watch first waits up
 * to DEATH_LINE_WAIT_MS for a death line (`waitForDeathLine`).
 *
 * The worker servers log a `[harness] begin … pid <pid> <client> <method>
 * <uri>` line as each PHP request starts (`request-begin.php`), so a death
 * names the request it died on, the process's pid (a CI core dump's name)
 * and how long the process had lived (`.reports/flake-1002/segv/`).
 */
const fs = require('fs');
const path = require('path');

const SIGNALS = {134: 'SIGABRT', 135: 'SIGBUS', 137: 'SIGKILL, often the OOM killer', 139: 'SIGSEGV, segfault'};
const DIED = /^\[harness\] php -S died (\S+ )?\(exit (\d+)\)/;
const CONTEXT_LINES = 8;
// A test that starts in the restart loop's one-second gap after a death
// is refused at once; the death line predates it, so the watch also reads
// back this far and keeps the deaths stamped within LOOKBACK_MS of its
// start (CI run 36534260026, OMP: a retry and the next test, both refused
// 0.6 s after a segfault, carried no annotation).
const LOOKBACK_BYTES = 256 * 1024;
const LOOKBACK_MS = 5_000;
// The errors a request gets when its server process dies serving it.
const DROPPED = /socket hang up|ECONNRESET|ERR_EMPTY_RESPONSE|ERR_CONNECTION_RESET|ERR_CONNECTION_CLOSED|chrome-error:\/\/chromewebdata/;
const DEATH_LINE_WAIT_MS = 5_000;
const BEGIN = /^\[harness\] begin (\S+) pid (\d+) (\S+) (\S+) (.*)$/;
const START = /^\[harness\] php -S start (\S+)/;

/** The worker server's log (config-factory.js names it by port). */
function workerLogFile(suiteDir, port) {
    return path.join(suiteDir, '.server-logs', `server-${port}.log`);
}

/** Where the log ends now; a missing log counts as empty. */
function logOffset(file) {
    try {
        return fs.statSync(file).size;
    } catch {
        return 0;
    }
}

/** What the log gained since `offset` (all of it if it was rotated since). */
function readSince(file, offset) {
    let fd;
    try {
        fd = fs.openSync(file, 'r');
        const size = fs.fstatSync(fd).size;
        const from = size < offset ? 0 : offset;
        const buffer = Buffer.alloc(size - from);
        fs.readSync(fd, buffer, 0, buffer.length, from);
        return buffer.toString('utf8');
    } catch {
        return '';
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
}

/**
 * The deaths in a stretch of log: exit code, time, and the lines before
 * the death, plus the client ports accepted and never answered (the
 * request that crashed the process, and any it held behind), each with
 * its `[harness] begin` line when the server logs them (the method and
 * address it died on). When the stretch holds the process's start (the
 * `php -S start` line or the death before it; a restart follows a death
 * by a second), `startedAt` and `answered` say how long and how many
 * requests it lived; `pid` comes from its begin lines.
 *
 * @param {string} text
 * @returns {{exit: number, at: string, unanswered: string[], requests: string[], pid: number|null,
 *     startedAt: string|null, answered: number|null, context: string, beforeStart?: boolean}[]}
 */
function deathsIn(text) {
    const lines = text.split('\n');
    const deaths = [];
    let open = new Map();
    let begins = new Map();
    let pid = null;
    let startedAt = null;
    let answeredCount = null;
    lines.forEach((line, index) => {
        const accepted = line.match(/ (127\.0\.0\.1:\d+) Accepted$/);
        if (accepted) {
            open.set(accepted[1], line);
            begins.delete(accepted[1]);
            return;
        }
        const begin = line.match(BEGIN);
        if (begin) {
            pid = Number(begin[2]);
            begins.set(begin[3], `${begin[4]} ${begin[5]}`);
            return;
        }
        const answered = line.match(/ (127\.0\.0\.1:\d+) (\[\d{3}\]:|Closing$)/);
        if (answered) {
            if (open.delete(answered[1]) && answeredCount !== null && answered[2] !== 'Closing') answeredCount++;
            begins.delete(answered[1]);
            return;
        }
        const start = line.match(START);
        if (start) {
            // A new server command (a new run or pass): the deaths before
            // it belong to a server no later test talked to.
            deaths.forEach((death) => {
                death.beforeStart = true;
            });
            open = new Map();
            begins = new Map();
            pid = null;
            startedAt = start[1];
            answeredCount = 0;
            return;
        }
        const died = line.match(DIED);
        if (died) {
            const at = (died[1] || '').trim();
            deaths.push({
                exit: Number(died[2]),
                at,
                unanswered: [...open.values()],
                requests: [...open.keys()].map((client) => begins.get(client)).filter(Boolean),
                pid,
                startedAt,
                answered: answeredCount,
                context: lines.slice(Math.max(0, index - CONTEXT_LINES), index + 1).join('\n'),
            });
            open = new Map();
            begins = new Map();
            pid = null;
            // The loop restarts the server a second after the death line.
            startedAt = at ? new Date(Date.parse(at) + 1_000).toISOString().replace(/\.\d+Z$/, 'Z') : null;
            answeredCount = at ? 0 : null;
        }
    });
    return deaths;
}

/** "37 s and 212 answers into its life", when the stretch held the start. */
function lifeOf(death) {
    if (!death.startedAt || !death.at) return '';
    const seconds = Math.round((Date.parse(death.at) - Date.parse(death.startedAt)) / 1000);
    return `${seconds} s and ${death.answered} answers into its life`;
}

/** Whether a failed test's errors are a request its server never answered. */
function failedOnDroppedConnection(testInfo) {
    return (testInfo.errors || []).some((error) => DROPPED.test(`${error.message || ''}\n${error.stack || ''}`));
}

/**
 * Wait up to `timeoutMs` for a death line after `offset` (the restart
 * loop writes it a moment after the test saw the connection drop).
 */
async function waitForDeathLine(file, offset, timeoutMs = DEATH_LINE_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        if (readSince(file, offset).split('\n').some((line) => DIED.test(line))) return true;
        if (Date.now() >= deadline) return false;
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
}

/**
 * Record the deaths of the worker's server during a failed test.
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {{file: string, offset: number, port: number}} watch
 */
async function reportServerDeaths(testInfo, {file, offset, port, startedAt = Date.now()}) {
    const since = startedAt - LOOKBACK_MS;
    const deaths = deathsIn(readSince(file, Math.max(0, offset - LOOKBACK_BYTES))).filter(
        (death) => !death.beforeStart && (!death.at || Date.parse(death.at) >= since - 1_000),
    );
    for (const death of deaths) {
        const signal = SIGNALS[death.exit] ? `, ${SIGNALS[death.exit]}` : '';
        const when = death.at && Date.parse(death.at) < startedAt ? 'just before this test (a second-precision stamp)' : 'during this test';
        const life = lifeOf(death);
        const serving = death.requests.length ? `; it died serving ${death.requests.join(', ')}` : '';
        const description =
            `php -S on :${port} died${death.at ? ` at ${death.at}` : ''} (exit ${death.exit}${signal}) ` +
            `${when}${life ? `, ${life}` : ''}${death.pid ? ` (pid ${death.pid})` : ''}, and was restarted; ` +
            `the request it was serving got no answer (${death.unanswered.length} accepted and unanswered)${serving}`;
        testInfo.annotations.push({type: 'server-crash', description});
        // eslint-disable-next-line no-console
        console.error(`[server-crash] ${testInfo.title}: ${description} (${path.basename(file)})`);
        await testInfo.attach(`server-crash-${port}`, {
            // The unanswered lines first: a reporter shows only the head.
            body: `${description}\n${death.unanswered.join('\n')}\n\n${death.context}\n`,
            contentType: 'text/plain',
        });
    }
    if (deaths.length) {
        fs.writeFileSync(
            testInfo.outputPath('server-crash.txt'),
            deaths.map((death) => death.context).join('\n----\n') + '\n',
        );
    }
}

module.exports = {
    workerLogFile,
    logOffset,
    readSince,
    deathsIn,
    lifeOf,
    reportServerDeaths,
    failedOnDroppedConnection,
    waitForDeathLine,
    DROPPED,
};
