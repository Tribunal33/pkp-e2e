// Helpers of walk.js beside it (U45 A21). Runs nothing when required.
const fs = require('fs');
const path = require('path');

/** The PHP server log of the dataset fleet the bag drives. */
function logFile(app) {
    return path.resolve(__dirname, '../../../../../apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
}

/** The log's size now (a byte offset to read from later). */
function logSize(app) {
    const f = logFile(app);
    return fs.existsSync(f) ? fs.statSync(f).size : 0;
}

/**
 * The lines the server logged since `from` that are PHP's own messages
 * (warnings, notices, deprecations, errors, uncaught exceptions), without
 * the access lines `php -S` writes for every request.
 */
function phpMessagesSince(app, from) {
    const f = logFile(app);
    if (!fs.existsSync(f)) return [];
    return fs
        .readFileSync(f)
        .slice(from || 0)
        .toString()
        .split('\n')
        .filter((l) => /PHP (Warning|Notice|Deprecated|Fatal|Parse)|Undefined array key|Exception|Error:/.test(l))
        .map((l) => l.replace(/\s+/g, ' ').trim().slice(0, 400));
}

module.exports = {logFile, logSize, phpMessagesSince};
