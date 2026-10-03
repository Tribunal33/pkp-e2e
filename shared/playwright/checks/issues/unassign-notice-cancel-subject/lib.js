// Helpers of walk.js (U27 A26, OMP3 and U34 OMP1: the reviewer removal and cancel notices;
// docs/issues/U27-A26-unassign-notice-cancel-subject.md and
// docs/issues/U27-OMP3-press-reviewer-notices-journal-placeholder.md). Requiring this file runs
// nothing. Every helper drives the screens a person uses: the workflow's "Reviewers" panel, its
// row menu ("More Actions") and the legacy windows it opens, and the decision pages.
const {idle, screen} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 900) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md): the submission and its reviewers. */
const CASES = {
    ojs: {id: 20, contextName: 'Journal of Public Knowledge'},
    omp: {id: 18, contextName: 'Public Knowledge Press'},
};
const TITLE = 'Transformative Impact of AI Tools';
const UNASSIGN = {name: 'Lisset Von', username: 'lvon'};
const NOTIFIED = {name: 'Rajek Sharif', username: 'rsharif'};

const workflowUrl = (app, id) => app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`);

/** Open the submission's workflow (it opens on its current stage, Review Round 1 here). */
async function openWorkflow(page, app, id) {
    await page.goto('about:blank');
    await page.goto(workflowUrl(app, id));
    await idle(page);
    await page.locator('[role="dialog"]:visible').first().waitFor({timeout: T}).catch(() => {});
    await page.getByText(UNASSIGN.name).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}

/** The reviewer's row in the open workflow's "Reviewers" panel. */
function reviewerRow(page, name) {
    return page.locator('[role="dialog"]:visible').first().getByRole('row').filter({hasText: name}).first();
}

/** The row's "More Actions" menu entries, then a press on `entry`. */
async function rowAction(page, name, entry) {
    const row = reviewerRow(page, name);
    await row.waitFor({timeout: T});
    const rowText = flat(await row.innerText());
    await row.getByRole('button', {name: 'More Actions'}).click();
    const menu = page.getByRole('menu').last();
    await menu.getByRole('menuitem').first().waitFor({timeout: T});
    const entries = (await menu.getByRole('menuitem').allInnerTexts()).map((t) => flat(t));
    await menu.getByRole('menuitem', {name: entry, exact: true}).click();
    return {rowText, entries};
}

/** A legacy window holding form#`formId`: its text, the template choice and the message box's text. */
async function readWindow(page, formId) {
    const form = page.locator(`form#${formId}`);
    await form.waitFor({timeout: T});
    await idle(page);
    await page.waitForFunction((id) => {
        const f = document.getElementById(id);
        const frame = f && f.querySelector('iframe');
        const body = frame && frame.contentDocument && frame.contentDocument.body;
        return !frame || (body && body.innerText.trim().length > 0);
    }, formId, {timeout: 15_000}).catch(() => {});
    return form.evaluate((f) => {
        const frame = f.querySelector('iframe');
        const select = f.querySelector('select[name="template"]');
        return {
            text: f.innerText.replace(/\s+/g, ' ').trim().slice(0, 900),
            templates: select ? [...select.options].map((o) => `${o.selected ? '*' : ''}${o.text.trim()}`) : null,
            message: frame && frame.contentDocument ? frame.contentDocument.body.innerText.replace(/\s+/g, ' ').trim() : null,
            buttons: [...f.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
        };
    });
}

/** Press the window's own submit button `label` and wait for it to close; the notices shown. */
async function submitWindow(page, formId, label) {
    const form = page.locator(`form#${formId}`);
    await form.getByRole('button', {name: label, exact: true}).click();
    await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    const s = await screen(page);
    return (s.notices || []).map((n) => flat(n.text || n, 200));
}

/**
 * The newest message to `username` received since `since` whose text holds `marker`: subject and
 * text. Reloads a page between polls, as the dataset's install sends queued mail on page loads.
 */
async function readMail(page, app, username, since, {marker = TITLE, subject = null, ms = 40_000} = {}) {
    const to = `${username}@mailinator.com`;
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: marker, since}).catch(() => ({messages: []}));
        let list = r.messages || [];
        if (subject) list = list.filter((m) => subject.test(m.Subject));
        if (list.length) {
            const m = list[0];
            const full = await app.mail.fullMessage(m.ID);
            const text = flat((full.Text || '') || String(full.HTML || '').replace(/<[^>]+>/g, ' '), 1500);
            return {to, count: list.length, subject: full.Subject, from: full.From && full.From.Address, created: m.Created, text};
        }
        if (Date.now() > end) return {to, count: 0, subject: null, text: null};
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

/** The decision page under the cursor: heading, the composer's subject and message, its buttons. */
async function readDecisionPage(page) {
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: T}).catch(() => {});
    await idle(page);
    await sleep(1200);
    return page.evaluate(() => {
        const main = document.querySelector('main') || document.body;
        const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const frames = [...main.querySelectorAll('iframe')].filter((f) => f.getClientRects().length);
        const subject = [...main.querySelectorAll('input')].filter((i) => i.getClientRects().length).map((i) => i.value).find((v) => v && v.length > 3) || null;
        return {
            h1: clean((main.querySelector('h1') || {}).innerText),
            h2: [...main.querySelectorAll('h2')].filter((h) => h.getClientRects().length).map((h) => clean(h.innerText)),
            subject,
            message: frames.map((f) => (f.contentDocument && f.contentDocument.body ? clean(f.contentDocument.body.innerText) : null)).filter(Boolean),
            buttons: [...main.querySelectorAll('button')].filter((b) => b.getClientRects().length).map((b) => clean(b.innerText)).filter(Boolean).slice(0, 30),
        };
    });
}

module.exports = {T, sleep, flat, CASES, TITLE, UNASSIGN, NOTIFIED, workflowUrl, openWorkflow, reviewerRow, rowAction, readWindow, submitWindow, readMail, readDecisionPage};
