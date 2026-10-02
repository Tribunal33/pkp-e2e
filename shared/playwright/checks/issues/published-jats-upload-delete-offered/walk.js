// U48 A12: on a published version's "JATS XML" page, "Upload" and "Delete"
// stay offered to the editor and both work, although the page withdraws them
// on a published version (its test reads pkp.const.STATUS_PUBLISHED, which
// the workflow page no longer defines).
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet):
// `dbarnes` opens published submission 17, its version's "JATS XML", reads
// the buttons, presses "Upload" with article.xml, then "Delete" › "Delete
// JATS File". A step whose button is not offered is recorded, not forced.
//
// WALK=steps (default) takes the steps; WALK=nb is the neighbour check for a
// fix trial: unpublished submission 5 (Production) still offers "Upload", and
// after an upload "Delete" (the upload is then deleted again).
//
//   PROBE_FEATURE=issues-u48r2 PROBE_AGENT=u48r2 node bin/probe.js ojs \
//     shared/playwright/checks/issues/published-jats-upload-delete-offered/walk.js
'use strict';
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const XML = path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.xml');
const MODE = process.env.WALK || 'steps';
const T = 30000;
const SUB = MODE === 'nb' ? 5 : 17;
const KEY = `pjud-${MODE}`;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const out = {mode: MODE, line: app.line, submission: SUB, steps: {}};
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath);
    const sleep = (ms) => page.waitForTimeout(ms);
    const panel = page.locator('.jatsPanel').first();
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        record(`${KEY}-${name}`, {...s, ...extra});
        await shot(page, `${KEY}-${name}`).catch(() => {});
        return s;
    };
    const buttons = () => panel.locator('.filePanel__header button').evaluateAll((bs) =>
        bs.map((b) => (b.innerText || '').trim()).filter(Boolean)).catch(() => []);
    const boxText = async () => (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ');
    const footer = async () => {
        const t = await boxText();
        return (t.match(/Last Modification at [^A-Z<]*by \S+/) || t.match(/This JATS file is generated automatically[^.]*/) || [null])[0];
    };
    const has = async (name) => (await buttons()).includes(name);
    const watch = (re, method) => page.waitForResponse((r) => re.test(r.url()) && r.request().method() === method, {timeout: T}).catch(() => null);
    const res = async (r) => r ? `${r.request().method()} ${r.status()} ${r.url().replace(/^.*\/index\.php/, '')}` : null;

    try {
        // Steps 1-3.
        await signIn(page, 'dbarnes');
        await idle(page);
        await frame.gotoEditorial(SUB);
        await idle(page); await sleep(800);
        try { await frame.expandLatestVersionNode(); } catch (e) { await frame.revealPublicationEntry('JATS XML').catch(() => {}); }
        out.menu = await frame.menuEntries().then((es) => es.map((e) => `${e.level}:${e.label}`)).catch(() => null);
        await frame.menuLink('JATS XML').first().click();
        await idle(page);
        await panel.locator('.filePanel__header').waitFor({timeout: T});
        await page.getByRole('button', {name: 'Download', exact: true}).waitFor({timeout: T}).catch(() => {});
        await sleep(800);
        const s0 = await snap('page');
        // Step 4.
        out.steps.page = {
            heading: (s0.text?.dialog || s0.text?.main || '').match(/Publication: JATS XML/)?.[0] || null,
            warning: (s0.text?.dialog || s0.text?.main || '').match(/Warning: This version has been published[^\n]*/)?.[0] || null,
            buttons: await buttons(),
            footer: await footer(),
        };
        console.log('[ojs] page', JSON.stringify(out.steps.page));

        // Step 5: "Upload".
        if (await has('Upload')) {
            const respP = watch(/\/jats(\?|$)/, 'POST');
            const [chooser] = await Promise.all([
                page.waitForEvent('filechooser', {timeout: T}),
                panel.getByRole('button', {name: 'Upload', exact: true}).click(),
            ]);
            await chooser.setFiles(XML);
            const resp = await respP;
            await idle(page); await sleep(2000);
            const s = await snap('uploaded');
            out.steps.upload = {
                request: await res(resp),
                notices: s.notices,
                buttons: await buttons(),
                footer: await footer(),
                showsFile: /A JATS fixture article/.test(await boxText()),
            };
        } else {
            out.steps.upload = {offered: false, buttons: await buttons()};
        }
        console.log('[ojs] upload', JSON.stringify(out.steps.upload));

        // Step 6: "Delete" › "Delete JATS File".
        if (await has('Delete')) {
            await panel.getByRole('button', {name: 'Delete', exact: true}).click();
            const win = page.getByRole('dialog').filter({hasText: 'Confirm deleting JATS XML'}).last();
            await win.waitFor({timeout: T});
            const winText = (await win.innerText().catch(() => '')).replace(/\s+/g, ' ');
            await snap('delete-window');
            const respP = watch(/\/jats(\?|$)/, 'DELETE');
            await win.getByRole('button', {name: 'Delete JATS File', exact: true}).click();
            const resp = await respP;
            await idle(page); await sleep(2000);
            await snap('deleted');
            out.steps.delete = {
                window: winText.slice(0, 200),
                request: await res(resp),
                buttons: await buttons(),
                footer: await footer(),
            };
        } else {
            out.steps.delete = {offered: false, buttons: await buttons()};
        }
        console.log('[ojs] delete', JSON.stringify(out.steps.delete));
    } catch (e) {
        out.error = String(e.message).slice(0, 400);
        await snap('error').catch(() => {});
        console.log('[ojs] error', out.error);
    } finally {
        record(`${KEY}-facts`, out);
        await close();
    }
});
