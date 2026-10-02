// U47 A6 with U48 A20: each media file added, and each JATS "Upload", writes a
// PHP warning ("foreach() argument must be of type array|object, string given",
// PKPBaseController.php) to the server's log.
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet):
// `dbarnes` opens the dataset's Production submission, adds one media file
// on "Media" (OJS, OMP, OPS), and on OJS uploads a JATS XML file on "JATS
// XML"; the fleet's server log is read around each request.
//
// WALK=steps (default) takes the steps; WALK=nb is the neighbour check for a
// fix trial: it adds one media file (the precondition), then renames it
// through "Edit Metadata" (a multilingual name sent as a locale map, which
// the conversion must keep handling).
//
//   PROBE_FEATURE=issues-u47r5 PROBE_AGENT=u47r5 node bin/probe.js all \
//     shared/playwright/checks/issues/media-jats-upload-server-log-warning/walk.js
'use strict';
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog, note} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const fx = (app, f) => path.join(REPO, `apps/${app}/playwright/fixtures/files/${f}`);
const MODE = process.env.WALK || 'steps';
const T = 30000;
// The dataset's Production submission per app (docs/process/dataset.md).
const SUB = {ojs: 5, omp: 4, ops: 1};
const LOGRE = /warning|error|exception|fatal|\[5\d\d\]|mediaFiles|\/jats/i;

forEachApp(async (app) => {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const pubGroup = app.name === 'ops' ? 'Preprint' : 'Publication';
    const out = {mode: MODE, app: app.name, line: app.line, submission: SUB[app.name], steps: {}};
    const log = serverLog(app, {match: LOGRE});
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: pubGroup}});
    const sleep = (ms) => page.waitForTimeout(ms);
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        record(`u47r5-${MODE}-${name}`, {...s, ...extra});
        await shot(page, `u47r5-${MODE}-${name}`).catch(() => {});
        return s;
    };
    const rowsOf = () => page.locator('[role=dialog]:visible table').first().locator('tbody tr')
        .evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())).catch(() => []);
    // A version-node page: the 3.5 menu has no version nodes, so the entry is pressed directly there.
    const openPage = async (label) => {
        try { await frame.expandLatestVersionNode(); } catch (e) { out.steps[`expand-${label}`] = String(e.message).slice(0, 120); }
        const link = frame.menuLink(label).first();
        if (!(await link.isVisible().catch(() => false))) await frame.revealPublicationEntry(label).catch(() => {});
        await link.click();
        await idle(page); await sleep(800);
    };
    const uploadWin = () => page.getByRole('dialog').filter({hasText: /Upload Media File/}).last();

    async function addMediaFile(tagName) {
        // Steps 3-7: "Media", "Add Media File", choose the file, "Image", "Upload Files".
        await openPage('Media');
        await page.getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: T});
        const before = await rowsOf();
        await snap(`${tagName}-media-before`, {rows: before});
        await page.getByRole('button', {name: 'Add Media File', exact: true}).click();
        await uploadWin().waitFor({timeout: T}); await idle(page);
        const chooserP = page.waitForEvent('filechooser', {timeout: T});
        await uploadWin().getByRole('button', {name: 'Click to upload files', exact: true}).click();
        await (await chooserP).setFiles(fx(app.name, 'figure.png'));
        const typeSel = uploadWin().locator('select[id*="-genreId-"]').first();
        await typeSel.waitFor({timeout: 60000});
        await idle(page);
        await typeSel.selectOption({label: 'Image'});
        await snap(`${tagName}-upload-window`);
        const from = log.mark();
        const respP = page.waitForResponse((r) => /\/mediaFiles$/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await uploadWin().getByRole('button', {name: 'Upload Files', exact: true}).click();
        const resp = await respP;
        await uploadWin().waitFor({state: 'detached', timeout: 15000}).catch(() => {});
        await idle(page); await sleep(1500);
        const res = {
            post: resp ? `${resp.request().method()} ${resp.status()} ${resp.url().replace(/^.*\/index\.php/, '')}` : null,
            postBody: resp ? (resp.request().postData() || '').slice(0, 600) : null,
            answerHead: resp ? (await resp.text().catch(() => '')).slice(0, 300) : null,
            windowOpen: await uploadWin().isVisible().catch(() => false),
            rowsBefore: before,
            rowsAfter: await rowsOf(),
            log: log.since(from),
        };
        await snap(`${tagName}-media-after`, {result: res});
        return res;
    }

    try {
        await signIn(page, 'dbarnes');
        await idle(page);
        await frame.gotoEditorial(SUB[app.name]);
        await idle(page); await sleep(800);
        await snap('workflow');

        if (MODE === 'steps') {
            // 3.5 has no "Media" page: the menu is read and the JATS steps go on.
            try { await frame.expandLatestVersionNode(); } catch (e) { await frame.revealPublicationEntry('Title & Abstract').catch(() => {}); }
            out.menu = await frame.menuEntries().then((es) => es.map((e) => e.label)).catch(() => null);
            if (out.menu && !out.menu.includes('Media')) out.steps.media = {mediaPage: 'absent from the side menu'};
            else out.steps.media = await addMediaFile('m');
            console.log(`[${app.name}] media`, JSON.stringify(out.steps.media));
            if (app.name === 'ojs') {
                // Steps 9-11: "JATS XML", "Upload", choose the XML.
                await openPage('JATS XML');
                const panel = page.locator('.jatsPanel').first();
                await panel.getByRole('button', {name: 'Upload', exact: true}).waitFor({timeout: T});
                await snap('jats-before');
                const from = log.mark();
                const respP = page.waitForResponse((r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                const [chooser] = await Promise.all([
                    page.waitForEvent('filechooser', {timeout: T}),
                    panel.getByRole('button', {name: 'Upload', exact: true}).click(),
                ]);
                await chooser.setFiles(fx('ojs', 'article.xml'));
                const resp = await respP;
                await idle(page); await sleep(2000);
                const s = await snap('jats-after');
                out.steps.jats = {
                    post: resp ? `${resp.request().method()} ${resp.status()} ${resp.url().replace(/^.*\/index\.php/, '')}` : null,
                    answerHead: resp ? (await resp.text().catch(() => '')).slice(0, 300) : null,
                    notices: s.notices,
                    lastModified: (await panel.innerText().catch(() => '')).match(/Last Modification[^\n]*/)?.[0] || null,
                    log: log.since(from),
                };
                console.log(`[${app.name}] jats`, JSON.stringify(out.steps.jats));
            }
        } else {
            // Neighbour: rename through "Edit Metadata" (a locale map: the typed English
            // name and an empty French one, which the conversion turns into null).
            // An empty name is refused in the browser before any request, so it is not tried.
            out.steps.media = await addMediaFile('nb');
            const row = page.locator('[role=dialog]:visible table').first().locator('tbody tr').first();
            const edit = async (value) => {
                await row.getByRole('button', {name: /More Actions/}).first().click();
                await page.getByRole('menuitem', {name: 'Edit Metadata', exact: true}).click();
                const win = page.getByRole('dialog').filter({hasText: 'Edit Metadata'}).last();
                const box = win.getByRole('textbox', {name: /Name of the file/}).first();
                await box.waitFor({timeout: T});
                await box.fill(value);
                const from = log.mark();
                const respP = page.waitForResponse((r) => /\/mediaFiles\/\d+/.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()), {timeout: 15000}).catch(() => null);
                const reqP = page.waitForRequest((r) => /\/mediaFiles\/\d+/.test(r.url()) && ['PUT', 'POST'].includes(r.method()), {timeout: 15000}).catch(() => null);
                await win.getByRole('button', {name: 'Save', exact: true}).click();
                const resp = await respP;
                const req = await reqP;
                await idle(page); await sleep(1200);
                const body = req ? (req.postData() || '').slice(0, 400) : null;
                const errors = await win.locator('.pkpFormField__error, .pkpFieldError__message, [class*="FieldError"]').allInnerTexts().catch(() => []);
                const open = await win.isVisible().catch(() => false);
                const r = {value, save: resp ? `${resp.request().headers()['x-http-method-override'] || resp.request().method()} ${resp.status()}` : null,
                    body, errors: errors.map((e) => e.trim()).filter(Boolean), windowOpen: open, log: log.since(from)};
                await snap(`nb-edit-${value ? 'name' : 'empty'}`, {result: r});
                if (open) await win.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
                await sleep(600);
                const dlgYes = page.getByRole('button', {name: 'Yes', exact: true});
                if (await dlgYes.isVisible().catch(() => false)) await dlgYes.click();
                await idle(page);
                return r;
            };
            out.steps.rename = await edit('figure u47r5');
            // A fresh load of the page shows the stored name.
            await frame.gotoEditorial(SUB[app.name]);
            await idle(page);
            await openPage('Media');
            await page.getByRole('button', {name: 'Add Media File', exact: true}).waitFor({timeout: T});
            out.steps.rowsAfterReload = await rowsOf();
            await snap('nb-media-reloaded', {rows: out.steps.rowsAfterReload});
            console.log(`[${app.name}] nb`, JSON.stringify({rename: out.steps.rename, rows: out.steps.rowsAfterReload}));
        }
    } catch (e) {
        out.error = String(e.stack || e.message).slice(0, 800);
        note(`u47r5 ${app.name} ${MODE}: ${out.error.split('\n')[0]}`);
        await snap('error').catch(() => {});
        console.log(`[${app.name}] ERROR`, out.error);
    } finally {
        record(`u47r5-${MODE}-facts`, out);
        await close();
    }
});
