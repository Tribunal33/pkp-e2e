/**
 * @file shared/playwright/mailpit.js
 *
 * Each slot's own Mailpit (harness.md "Slots"). Slot 0's is the systemd
 * service on 8025 / SMTP 1025 (and CI's service container); slot n > 0
 * uses 8025+n / 1025+n and is started here, detached, the first time a run
 * or a probe finds it silent, with its own database under
 * ~/.local/state/mailpit/. Recipients are app-scoped, not slot-scoped
 * (the roster's fixed addresses), so two slots on one Mailpit would read
 * each other's mail.
 *
 *   ensureMailpit()   synchronous; a no-op on CI, for slot 0 and when it answers
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn, spawnSync} = require('child_process');

function answers(url) {
    const probe = spawnSync(process.execPath, ['-e', `
        fetch(${JSON.stringify(`${url}/api/v1/info`)}, {signal: AbortSignal.timeout(1500)})
            .then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1));
    `], {stdio: 'ignore'});
    return probe.status === 0;
}

function ensureMailpit() {
    if (process.env.CI) return;
    const {resolveSlot} = require('../../bin/apps.js');
    const slot = resolveSlot();
    if (slot.n === 0 || answers(slot.mailpitUrl)) return;
    const stateDir = path.join(os.homedir(), '.local', 'state', 'mailpit');
    fs.mkdirSync(stateDir, {recursive: true});
    const httpPort = new URL(slot.mailpitUrl).port;
    const child = spawn('mailpit', [
        '--listen', `127.0.0.1:${httpPort}`,
        '--smtp', `127.0.0.1:${slot.smtpPort}`,
        '--db-file', path.join(stateDir, `mailpit-s${slot.n}.db`),
    ], {
        detached: true,
        stdio: ['ignore', 'ignore', fs.openSync(path.join(stateDir, `mailpit-s${slot.n}.log`), 'a')],
    });
    child.on('error', () => {});
    child.unref();
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        if (answers(slot.mailpitUrl)) return;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
    console.error(`mailpit: slot ${slot.n}'s Mailpit did not come up on ${slot.mailpitUrl} (see ${stateDir}/mailpit-s${slot.n}.log)`);
}

module.exports = {ensureMailpit};
