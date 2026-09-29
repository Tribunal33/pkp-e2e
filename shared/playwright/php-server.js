/**
 * @file shared/playwright/php-server.js
 *
 * The one place that knows how a fleet's `php -S` server is spawned. The
 * Playwright config (config-factory.js, one server per worker plus the
 * validation variant) and the detached probe servers (bin/probe-servers.js,
 * one per app at basePort + 50) build their command and environment here,
 * so a server started either way is the same process with the same limits,
 * log and restart loop.
 *
 * The restart loop is crash resilience: a `php -S` process death (observed
 * in CI: segfault; locally: a 30 s execution-limit fatal inside a DB call)
 * otherwise strands its port — Playwright never restarts a webServer, so
 * every remaining test on that worker fails in milliseconds (ci-triage.md
 * "dead-worker cascade"). The loop respawns within a second, bounded so a
 * port conflict cannot spin forever. max_execution_time=120 keeps a merely
 * slow request (seeding under load hits the default 30 s ceiling) from
 * becoming a fatal at all; genuinely hung requests are already bounded by
 * the dead-proxy config and the test timeout.
 *
 * `php -S` logs every request to stderr, which Playwright would pipe into
 * the reporter output — the command redirects it to the log file instead.
 * The log is appended to, never truncated: every start writes a
 * `[harness] php -S start` line and every death a dated `[harness] php -S
 * died (exit N)` line, so one file holds every pass of a run in order. A
 * CI shard starts its servers four times (the app pass, the setup before
 * the serial pass, the serial and the solo pass), and a truncating start
 * emptied the app pass's log before the artifact step, so a dropped answer
 * there left no exit code to read (ci-triage "CI worker server refusing
 * connections", flake u01s4 2026-09-29). A log over LOG_ROTATE_BYTES at a
 * start is moved to `<name>-prev.log` first, so local logs stay bounded.
 * A crash leaves an `Accepted` line with no status line after it: the
 * request that took the process down (`server-crash.js` reads these).
 */
const http = require('http');

const RESTART_LIMIT = 20;
const LOG_ROTATE_BYTES = 20 * 1024 * 1024;

/**
 * The shell command (for `sh -c` or Playwright's webServer.command) that
 * serves `appRoot` on 127.0.0.1:`port`, logging to `logFile`.
 *
 * @param {{appRoot: string, port: number, logFile: string}} options
 * @returns {string}
 */
function phpServerCommand({appRoot, port, logFile}) {
    const serve = `php -d max_execution_time=120 -S 127.0.0.1:${port} -t "${appRoot}" >> "${logFile}" 2>&1`;
    const prevFile = logFile.replace(/(\.log)?$/, '-prev.log');
    const rotate = `if [ -f "${logFile}" ] && [ "$(wc -c < "${logFile}")" -gt ${LOG_ROTATE_BYTES} ]; then mv -f "${logFile}" "${prevFile}"; fi`;
    const stamp = '$(date -u +%Y-%m-%dT%H:%M:%SZ)';
    return `${rotate}; echo "[harness] php -S start ${stamp} on 127.0.0.1:${port}" >> "${logFile}"; n=0; until ${serve}; do s=$?; n=$((n+1)); [ "$n" -ge ${RESTART_LIMIT} ] && exit 1; echo "[harness] php -S died ${stamp} (exit $s); restart $n" >> "${logFile}"; sleep 1; done`;
}

/**
 * The environment the server needs on top of the caller's: the config file
 * the app reads (the whole switch between the dev and the test install) and
 * the key that enables and gates `/api/v1/_test/*`.
 *
 * @param {{configFile: string, testApiKey?: string}} options
 * @returns {{PKP_CONFIG_FILE: string, TEST_API_KEY: string}}
 */
function phpServerEnv({configFile, testApiKey}) {
    return {
        PKP_CONFIG_FILE: configFile,
        TEST_API_KEY: testApiKey || '',
    };
}

/** The static ready probe: answers before the DB is installed. */
function phpServerReadyUrl(port) {
    return `http://127.0.0.1:${port}/README.md`;
}

/**
 * HTTP status of the ready probe on `port`, or null when nothing answers
 * within `timeoutMs`.
 *
 * @param {number} port
 * @param {{timeoutMs?: number}} [options]
 * @returns {Promise<number|null>}
 */
function phpServerStatus(port, {timeoutMs = 2000} = {}) {
    return new Promise((resolve) => {
        const req = http.get(phpServerReadyUrl(port), (res) => {
            res.resume();
            resolve(res.statusCode);
        });
        req.setTimeout(timeoutMs, () => {
            req.destroy();
            resolve(null);
        });
        req.on('error', () => resolve(null));
    });
}

module.exports = {phpServerCommand, phpServerEnv, phpServerReadyUrl, phpServerStatus, RESTART_LIMIT};
