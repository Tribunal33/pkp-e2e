// Helpers for walk.js (issue reports U49-OPS4). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Open the submission's newest version's "Title & Abstract" page in the
 * editorial workflow (3.5 opens a Production submission on its files).
 */
async function openTitleAbstract(page, app, sid) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint', publicationHeading: 'Preprint'}});
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const link = frame.menuLink('Title & Abstract');
    if (!(await link.last().isVisible().catch(() => false))) {
        if (app.line !== 'stable-3_5_0' && (await frame.latestVersionNode().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        else await frame.publicationGroup().click().catch(() => {});
    }
    await expect(link.last()).toBeVisible({timeout: T});
    await link.last().click();
    await idle(page);
    return frame;
}

/** The header's "Post", then the window's own "Post". Returns the window's words and the publish answer's status. */
async function post(page) {
    const button = page.getByRole('button', {name: 'Post', exact: true}).first();
    await expect(button).toBeVisible({timeout: T});
    await button.click();
    const w = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Post', exact: true})}).last();
    await expect(w).toBeVisible({timeout: T});
    const window = flat(await w.innerText(), 600);
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await w.getByRole('button', {name: 'Post', exact: true}).last().click();
    const r = await answered;
    await page.getByRole('button', {name: 'Unpost', exact: true}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {window, status: r.status()};
}

/**
 * Every email this install sent to `to` since `since` (waiting for the first
 * one), each with its sender, subject and text, newest first. The dataset
 * users' addresses are the same on every install mailing the one mailbox, so
 * a message counts only when it links to this install (`app.baseURL`).
 */
async function mailsTo(app, to, since) {
    const read = async () => {
        const res = await app.mail._search({to, since});
        const out = [];
        for (const m of res.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            if (!`${full.HTML || ''}${full.Text || ''}`.includes(app.baseURL)) continue;
            out.push({
                subject: full.Subject,
                from: (full.From && full.From.Address) || null,
                to: (full.To || []).map((x) => x.Address),
                text: flat(full.Text, 3000),
                rawSignature: /\{\$signature\}/.test(full.HTML || '') || /\{\$signature\}/.test(full.Text || ''),
            });
        }
        return out;
    };
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline && (await read()).length === 0) await new Promise((r) => setTimeout(r, 1000));
    await new Promise((r) => setTimeout(r, 3000));
    return read();
}

module.exports = {T, flat, openTitleAbstract, post, mailsTo};
