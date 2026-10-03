// Helpers of walk.js (U70 A6, U33 OMP2). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A dashboard address of the line ("/en" on main and 3.5). */
function dash(app, view, sid) {
    const lang = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    return app.url(`/index.php/publicknowledge${lang}/dashboard/${view}?workflowSubmissionId=${sid}`);
}

/** A book's workflow window from the editorial dashboard (it lands on the book's stage or a publication page). */
async function openWorkflow(page, app, sid) {
    await page.goto(dash(app, 'editorial', sid));
    await idle(page).catch(() => {});
    await page.getByRole('dialog').first().waitFor({timeout: T});
    await sleep(1500);
}

/** The workflow window's side-menu entry `name` ("Production"), pressed. */
async function openStage(page, name) {
    const dlg = page.getByRole('dialog').first();
    await dlg.waitFor({timeout: T});
    const entry = dlg.getByRole('link', {name, exact: true}).or(dlg.getByRole('button', {name, exact: true})).first();
    await entry.waitFor({state: 'visible', timeout: T});
    await entry.click();
    await idle(page).catch(() => {});
    await sleep(1500);
    await idle(page).catch(() => {});
}

/** The stage's notice boxes (WorkflowNotificationDisplay: a bordered box, a heading, a paragraph). */
async function noticeBoxes(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        return [...dlg.querySelectorAll('div.border-light.p-3')]
            .filter((d) => vis(d) && d.querySelector(':scope > h3'))
            .map((d) => ({
                heading: d.querySelector(':scope > h3').innerText.trim(),
                text: (d.querySelector(':scope > p') || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim(),
            }));
    });
}

/** The header's status line and publishing controls of the open workflow. */
async function header(page) {
    const c = page.locator('[data-cy="workflow-controls-right"]');
    return flat(await c.innerText().catch(() => null), 200);
}

module.exports = {T, sleep, flat, dash, openWorkflow, openStage, noticeBoxes, header};
