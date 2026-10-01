// Helpers for walk.js and neighbour.js (U61 A6). Requiring this file runs nothing.
const {execFileSync} = require('child_process');
const {idle, sql} = require('../../../probe');

const FAILED_JOBS = '/index.php/index/en/admin/failedJobs';

/** A GET of the failed-jobs list (the landing load or a page link). */
const isListLoad = (r) => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/api/v1/jobs/failed/all');
/** "Requeue All Failed Jobs" sent. */
const isRequeueAll = (r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/api/v1/jobs/redispatch/all');

/**
 * The precondition, as the steps give it: the application's own job tool
 * queues its always-failing test job `n` times and runs the test queue once,
 * under the fleet's configuration. Returns the failed-job count after.
 */
function makeFailedJobs(app, n) {
    const run = (args) => execFileSync('php', ['lib/pkp/tools/jobs.php', ...args], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: app.configFile},
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    for (let i = 0; i < n; i++) {
        run(['test', '--only=failed']);
    }
    run(['run', '--test']);
    return Number(sql(app, 'select count(*) from failed_jobs') || 0);
}

/** Open Failed Jobs through Administration's "View Failed Jobs" and wait for its list. */
async function openFromAdministration(page, app) {
    await page.goto(app.url('/index.php/index/en/admin'));
    await idle(page);
    const loaded = page.waitForResponse(isListLoad, {timeout: 30_000});
    await page.getByRole('link', {name: 'View Failed Jobs', exact: true}).click();
    const r = await loaded;
    await idle(page);
    return r.status();
}

/** Type the page's address in a tab and wait for its list. */
async function openByAddress(page, app) {
    const loaded = page.waitForResponse(isListLoad, {timeout: 30_000});
    await page.goto(app.url(FAILED_JOBS));
    const r = await loaded;
    await idle(page);
    return r.status();
}

/**
 * What the page shows: the loading circles (beside "Requeue All Failed
 * Jobs", and in the page links in place of the current page number), the
 * total line, the rows, the page links, the button, an open "Error" window.
 */
async function state(page) {
    const main = page.locator('main');
    const shown = async (loc) => {
        const n = await loc.count();
        let visible = 0;
        for (let i = 0; i < n; i++) {
            const box = await loc.nth(i).boundingBox().catch(() => null);
            if (box && box.width > 0 && box.height > 0) visible++;
        }
        return visible;
    };
    const button = main.getByRole('button', {name: 'Requeue All Failed Jobs', exact: true});
    const nav = main.getByRole('navigation', {name: 'View additional pages'});
    const dialog = page.getByRole('dialog', {name: 'Error'});
    const total = await main.locator('p, span').filter({hasText: /There's a total of/}).last().innerText().catch(() => null);
    return {
        // The circle in the button's own row (the table's top controls); null when the button is gone.
        circleBesideButton: (await button.count()) ? await shown(button.locator('xpath=..').locator('.pkpSpinner')) : null,
        circleInPageLinks: await shown(main.locator('.pkpPagination__loading')),
        circleAnimation: await main.locator('.pkpSpinner').first().evaluate((el) => getComputedStyle(el, '::before').animationName).catch(() => null),
        pageLinks: (await nav.count()) ? (await nav.innerText()).replace(/\s+/g, ' ').trim() : null,
        total: total && total.replace(/\s+/g, ' ').trim(),
        rows: await main.locator('tbody tr').count(),
        noItems: (await main.getByRole('row', {name: 'No Items', exact: true}).count()) > 0,
        button: (await button.count()) ? {shown: await button.isVisible(), enabled: await button.isEnabled()} : null,
        errorWindow: (await dialog.count()) && (await dialog.isVisible()) ? (await dialog.innerText()).replace(/\s+/g, ' ').trim() : null,
    };
}

/** Press "Requeue All Failed Jobs" and return its answer ({status, body}). */
async function pressRequeueAll(page) {
    const answered = page.waitForResponse(isRequeueAll, {timeout: 30_000});
    await page.locator('main').getByRole('button', {name: 'Requeue All Failed Jobs', exact: true}).click();
    const r = await answered;
    return {status: r.status(), body: await r.json().catch(() => null)};
}

/** Press "OK" on the "Error" window and wait for it to close. */
async function pressOk(page) {
    const dialog = page.getByRole('dialog', {name: 'Error'});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    await dialog.waitFor({state: 'hidden', timeout: 10_000});
}

/** The page's notices (top right), text only. */
async function notices(page) {
    return (await page.locator('.pkpNotification').allInnerTexts().catch(() => [])).map((t) => t.replace(/\s+/g, ' ').trim());
}

/**
 * Hold the browser's own requests that match `test` until `release()` is
 * called, so a check can read the page while one is in flight. Nothing is
 * changed or added: the held request goes out as the page sent it.
 */
async function hold(page, test) {
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const handler = async (route) => {
        if (test(route.request())) {
            await gate;
        }
        await route.continue();
    };
    await page.route('**/api/v1/jobs/**', handler);
    return {
        release: () => release(),
        stop: () => page.unroute('**/api/v1/jobs/**', handler),
    };
}

module.exports = {FAILED_JOBS, isListLoad, isRequeueAll, makeFailedJobs, openFromAdministration, openByAddress, state, pressRequeueAll, pressOk, notices, hold};
