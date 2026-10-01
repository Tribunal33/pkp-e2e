// Helpers for walk.js (U13 A6, U69 A5). Requiring this file runs nothing.
const {expect} = require('@playwright/test');
const {screen, record, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** The workflow frame, with the publication group's label per app ("Preprint" on a server). */
function workflowFrame(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
}

/**
 * On an open workflow: "Create New Version" from the publication group's
 * menu, its window confirmed untouched (3.5 may create it at once). Resolves
 * with the new publication's id from the version call's answer.
 */
async function createNewVersion(page, app) {
    const frame = workflowFrame(page, app);
    await frame.expectVersionLoaded().catch(() => {});
    // main: an entry of the publication group's menu; 3.5: a button in the
    // publication page's header, confirmed with "Yes".
    const item = app.line === 'stable-3_5_0'
        ? page.getByRole('button', {name: 'Create New Version', exact: true}).first()
        : await frame.revealPublicationEntry('Create New Version');
    await expect(item).toBeVisible({timeout: T});
    const created = page.waitForResponse(
        (r) => /\/publications\/\d+\/version$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST',
        {timeout: 60_000}
    );
    await item.click();
    const confirm = page.getByRole('dialog').getByRole('button', {name: /^(Confirm|Yes|OK)$/}).last();
    const first = await Promise.race([
        created.then(() => 'created'),
        confirm.waitFor({state: 'visible', timeout: T}).then(() => 'dialog').catch(() => 'none'),
    ]);
    let window = null;
    if (first === 'dialog') {
        await sleep(800);
        window = flat(await page.getByRole('dialog').last().innerText().catch(() => null), 600);
        record('step2-new-version-window', await screen(page));
        await confirm.click();
    }
    const r = await created;
    const body = await r.json().catch(() => ({}));
    await idle(page);
    return {status: r.status(), id: body.id, window};
}

/**
 * The given version's "Title & Abstract" (by the workflow address with its
 * menu key, as the menu's entry opens it): the "Title" editor set to
 * `title`, then "Save", bounded by the publication's write and "Saved".
 */
async function retitleVersion(page, app, submissionId, publicationId, title) {
    const frame = workflowFrame(page, app);
    if (app.line === 'stable-3_5_0') {
        // 3.5 lists one version's pages; after "Create New Version" it shows the new one.
        await frame.menuLink('Title & Abstract').last().click();
        await idle(page);
        await expect(page.getByText(/Version:\s*\d+/).first()).toBeVisible({timeout: T}).catch(() => {});
    } else {
        await frame.gotoEditorial(submissionId, {menuKey: `publication_${publicationId}_titleAbstract`});
    }
    const editorId = 'titleAbstract-title-control-en';
    await page.waitForFunction((id) => !!window.tinymce?.get(id)?.initialized, editorId, {timeout: T});
    const before = await page.evaluate((id) => window.tinymce.get(id).getContent({format: 'text'}), editorId);
    await page.evaluate(([id, value]) => {
        const editor = window.tinymce.get(id);
        editor.setContent(value);
        editor.fire('change');
    }, [editorId, title]);
    const saved = page.waitForResponse(
        (r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
        {timeout: T}
    );
    await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    await expect(page.locator('.pkpFormPage__status', {hasText: 'Saved'})).toBeVisible({timeout: T}).catch(() => {});
    record('step3-title-saved', await screen(page));
    return {before, after: title, save: r.status(), savedUrl: rel(r.url())};
}

/**
 * Publish (post) the version the open workflow shows: the header's
 * "Publish" / "Post", then whatever confirms it ("Confirm" in "Review
 * Publishing Details", "Publish" / "Post" in the window or question that
 * follows), until the publish call answers.
 */
async function publishShownVersion(page) {
    const published = page.waitForResponse(
        (r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET',
        {timeout: 60_000}
    );
    let done = false;
    published.then(() => { done = true; }).catch(() => { done = true; });
    const header = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/});
    await expect(header.first()).toBeVisible({timeout: T});
    const out = {button: flat(await header.first().innerText()), windows: []};
    await header.first().click();
    for (let i = 0; i < 4 && !done; i++) {
        const btn = page.getByRole('dialog').last().getByRole('button', {name: /^(Confirm|Publish|Post)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(600);
        out.windows.push(flat(await page.getByRole('dialog').last().innerText().catch(() => null), 500));
        await btn.click();
        await sleep(1200);
    }
    const r = await published;
    out.publish = r ? r.status() : null;
    await idle(page);
    await sleep(1000);
    record('step4-published', await screen(page));
    return out;
}

/** A landing page as a reader sees it: tab title, heading, outdated notice, version links. */
async function readVersionPage(page) {
    const body = (await page.locator('body').innerText().catch(() => '')) || '';
    const heading = await page.locator('.page h1').first().innerText().catch(() => null);
    const versions = await page.locator('a[href*="/version/"]').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
    return {
        url: rel(page.url()),
        tab: await page.title(),
        heading: flat(heading),
        outdated: (body.match(/This is an outdated version[^\n]*/) || [null])[0],
        versionsBlock: flat((body.match(/Versions?\n[\s\S]{0,400}/) || [null])[0], 400),
        versionLinks: versions.map((v) => ({...v, href: rel(v.href)})),
    };
}

module.exports = {T, sleep, flat, rel, workflowFrame, createNewVersion, retitleVersion, publishShownVersion, readVersionPage};
