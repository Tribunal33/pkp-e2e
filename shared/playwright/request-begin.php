<?php
/**
 * @file shared/playwright/request-begin.php
 *
 * The `auto_prepend_file` of the suite's `php -S` worker servers
 * (php-server.js `requestLog`): one `[harness] begin` line per PHP request,
 * written to the server's log before the app runs. `php -S` logs a request's
 * path only once it is answered, so a process that dies serving one left a
 * bare `Accepted` line and no way to say which request killed it (ci-triage
 * "A `php -S` worker segfault"; `.reports/flake-1002/segv/diagnosis.md`).
 * `server-crash.js` pairs the line with the unanswered `Accepted` by the
 * client port, and the pid with a core dump on CI.
 *
 * It must not change what it watches: no class is named or loaded (the
 * GH-20469 crashes depend on the order classes are linked in), no variable
 * is left in the app's global scope, nothing is sent to the client.
 */
file_put_contents('php://stderr', sprintf(
    "[harness] begin %s pid %d %s:%s %s %s\n",
    gmdate('Y-m-d\TH:i:s') . sprintf('.%03dZ', (int) (fmod(microtime(true), 1) * 1000)),
    getmypid(),
    $_SERVER['REMOTE_ADDR'] ?? '-',
    $_SERVER['REMOTE_PORT'] ?? '-',
    $_SERVER['REQUEST_METHOD'] ?? '-',
    $_SERVER['REQUEST_URI'] ?? '-'
));
