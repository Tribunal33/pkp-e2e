/**
 * @file sandbox/drive-guard.js
 *
 * A plugin review's drive runs its browser as the bot, outside the
 * sandbox's egress wall (harness.md "The plugin sandbox"). This keeps the
 * browser on the pod's two ports: every request a page makes to any other
 * host is aborted and written to the given log, which the drive reports
 * as the plugin's outside contacts from the browser. Create the context
 * with `serviceWorkers: 'block'`, then guard it before its first page:
 *
 *   const {guard} = require('<repo>/sandbox/drive-guard.js');
 *   const context = await browser.newContext({serviceWorkers: 'block'});
 *   await guard(context, '<repo>/.reports/plugin-review/pg-<PR>/drive/outside.log');
 *
 * `allow` adds hosts the review's request allowed (host or host:port).
 */
const fs = require('fs');

const POD = ['127.0.0.1:19000', '127.0.0.1:19025'];

async function guard(context, logFile, {allow = []} = {}) {
    const open = new Set([...POD, ...allow]);
    await context.route('**/*', (route) => {
        const request = route.request();
        const url = new URL(request.url());
        if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol) || open.has(url.host) || open.has(url.hostname)) {
            return route.continue();
        }
        let page = '?';
        try {
            page = request.frame().page().url();
        } catch {
            // a request with no frame (a worker's)
        }
        fs.appendFileSync(logFile, `${new Date().toISOString()} ${request.resourceType()} ${request.method()} ${url.href.slice(0, 500)} (page ${page})\n`);
        return route.abort('blockedbyclient');
    });
}

module.exports = {guard};
