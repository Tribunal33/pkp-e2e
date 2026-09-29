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
 */
const fs = require('fs');
const path = require('path');

const SIGNALS = {134: 'SIGABRT', 135: 'SIGBUS', 137: 'SIGKILL, often the OOM killer', 139: 'SIGSEGV, segfault'};
const DIED = /^\[harness\] php -S died (\S+ )?\(exit (\d+)\)/;
const CONTEXT_LINES = 8;

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
 * request that crashed the process, and any it held behind).
 *
 * @param {string} text
 * @returns {{exit: number, at: string, unanswered: string[], context: string}[]}
 */
function deathsIn(text) {
    const lines = text.split('\n');
    const deaths = [];
    let open = new Map();
    lines.forEach((line, index) => {
        const accepted = line.match(/ (127\.0\.0\.1:\d+) Accepted$/);
        if (accepted) {
            open.set(accepted[1], line);
            return;
        }
        const answered = line.match(/ (127\.0\.0\.1:\d+) (\[\d{3}\]:|Closing$)/);
        if (answered) {
            open.delete(answered[1]);
            return;
        }
        const died = line.match(DIED);
        if (died) {
            deaths.push({
                exit: Number(died[2]),
                at: (died[1] || '').trim(),
                unanswered: [...open.values()],
                context: lines.slice(Math.max(0, index - CONTEXT_LINES), index + 1).join('\n'),
            });
            open = new Map();
        }
    });
    return deaths;
}

/**
 * Record the deaths of the worker's server during a failed test.
 *
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {{file: string, offset: number, port: number}} watch
 */
async function reportServerDeaths(testInfo, {file, offset, port}) {
    const deaths = deathsIn(readSince(file, offset));
    for (const death of deaths) {
        const signal = SIGNALS[death.exit] ? `, ${SIGNALS[death.exit]}` : '';
        const description =
            `php -S on :${port} died${death.at ? ` at ${death.at}` : ''} (exit ${death.exit}${signal}) ` +
            `during this test and was restarted; the request it was serving got no answer ` +
            `(${death.unanswered.length} accepted and unanswered)`;
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

module.exports = {workerLogFile, logOffset, readSince, deathsIn, reportServerDeaths};
