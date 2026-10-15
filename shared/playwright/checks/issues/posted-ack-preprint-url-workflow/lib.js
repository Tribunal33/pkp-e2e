// Helpers for walk.js (issue report U49-OPS6). Requiring this file runs nothing.
// Self-contained: openTitleAbstract() and post() follow the U49 OPS4 walk's
// helpers, newVersion() the U44/U45 walks' version helpers.
const {expect} = require('@playwright/test');
const {idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The workflow page object, with a preprint server's publication labels. */
function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Preprint', publicationHeading: 'Preprint'}});
}

/**
 * Open the submission's newest version's "Title & Abstract" page in the
 * editorial workflow (3.5 opens a Production submission on its files).
 */
async function openTitleAbstract(page, app, sid) {
    const frame = workflow(page, app);
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
 * "Create New Version" on the submission: on main the Preprint menu's entry,
 * "Minor Revision" under "Revision Significance", "Confirm"; on 3.5 the
 * header's button and "Yes". Returns the answer, with the new version.
 */
async function newVersion(page, app, sid) {
    // The labels the U44 walk's newVersion() drove OPS with.
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: 'Preprint'}});
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const created = () => page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    const out = {};
    if (app.line === 'stable-3_5_0') {
        await frame.menuLink('Title & Abstract').first().click();
        await idle(page);
        const button = page.getByRole('button', {name: 'Create New Version', exact: true}).first();
        await expect(button).toBeVisible({timeout: T});
        await button.click();
        const w = page.getByRole('dialog').filter({hasText: 'Are you sure you want to create a new version?'}).last();
        await expect(w).toBeVisible({timeout: T});
        const answer = created();
        await w.getByRole('button', {name: 'Yes', exact: true}).click();
        const r = await answer;
        out.status = r.status();
        if (r.ok()) out.version = (await r.json()).version;
        await idle(page);
        return out;
    }
    const item = await frame.revealPublicationEntry('Create New Version');
    await frame.expectVersionLoaded().catch(() => {});
    await item.click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="versionIsMinor"]')}).last();
    await expect(dialog.locator('select[name="versionIsMinor"]')).toBeVisible({timeout: T});
    await dialog.getByLabel('Revision Significance').selectOption({label: 'Minor Revision'});
    const answer = created();
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await answer;
    out.status = r.status();
    if (r.ok()) {
        const j = await r.json();
        out.id = j.id;
        out.version = `${j.versionStage} ${j.versionMajor}.${j.versionMinor}`;
    }
    await expect(dialog).toHaveCount(0, {timeout: T});
    return out;
}

/**
 * Every email this fleet sent to `to` since `since` (waiting up to a minute
 * for the first), newest first: subject, text, and each link with its words
 * and address. A dataset user's address is mailed by every fleet of the slot,
 * so a message counts only when it names this fleet's own address.
 */
async function mailsWithLinks(app, to, since) {
    const read = async () => {
        const res = await app.mail._search({to, since});
        const out = [];
        for (const m of res.messages || []) {
            const full = await app.mail.fullMessage(m.ID);
            const html = full.HTML || '';
            if (!`${html}${full.Text || ''}`.includes(app.baseURL)) continue;
            const links = [...html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((x) => ({
                words: flat(x[2].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&'), 200),
                href: x[1].replace(/&amp;/g, '&'),
            }));
            out.push({subject: full.Subject, to: (full.To || []).map((x) => x.Address), text: flat(full.Text, 3000), links});
        }
        return out;
    };
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline && (await read()).length === 0) await new Promise((r) => setTimeout(r, 1000));
    await new Promise((r) => setTimeout(r, 3000));
    return read();
}

module.exports = {T, flat, workflow, openTitleAbstract, post, newVersion, mailsWithLinks};
