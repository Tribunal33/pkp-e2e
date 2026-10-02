// U48 A13: "Upload" of an image on "JATS XML" answers a server error, yet the
// image is stored, and every later opening of the page fails ("Malformed UTF-8
// characters, possibly incorrectly encoded") until the file is deleted.
//
// Takes the report's steps on PKP's default test dataset (a dataset fleet), OJS:
// `dbarnes` opens the dataset's Production submissions and uses "Upload" on
// their "JATS XML" pages; the fleet's server log is read around each request.
//
// WALK=steps (default): the Steps. Submission 5: "Upload" an image, reopen the
//   page, "OK", "More Information", "Download", "Delete" › "Delete JATS File".
//   Submission 6: "Upload" a text file, then the image over it, reopen.
//   Submission 15: "Upload" a well-formed XML file saved as ISO-8859-1 with an
//   accented letter (the same cause reached by an XML file), reopen.
//   (3.5 offers "Upload" only on the generated XML, so the image over the text
//   file is recorded as not offered.) WALK=steps-c takes submission 15 alone.
// WALK=pre: the image's "Upload" on submission 5 only (run unpatched before a
//   fix is applied, so WALK=stored can read a file stored before the fix).
// WALK=stored: reopen submission 5's "JATS XML" page, record it, then "Delete".
// WALK=nb: the neighbour check for a fix trial, on submission 5: "Upload" a
//   UTF-8 JATS XML file (accented letters included), "Upload" it again (a
//   revision), a plain-text file (still taken: A10 is a separate question),
//   reopen, "Download", "Delete".
// WALK=pub: the published article 17: "Upload" the image, reopen, tick "Make
//   available with publication", "Confirm"; signed out, the article page's
//   "JATS XML" link (its answer's status, type and first bytes); then
//   "Delete" › "Delete JATS File" on the published version and the link again.
//
//   PROBE_FEATURE=issues-u48r1 PROBE_AGENT=u48r1 node bin/probe.js ojs \
//     shared/playwright/checks/issues/jats-image-upload-breaks-page/walk.js
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, serverLog, note} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const MODE = process.env.WALK || 'steps';
const RUN = process.env.PROBE_RUN || 'main';
const T = 30000;
const LOGRE = /warning|error|exception|fatal|\[5\d\d\]|\/jats|information-center/i;

// The files a person would choose, written once to a scratch folder.
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'u48r1-'));
const FILES = {
    image: path.join(REPO, 'apps/ojs/playwright/fixtures/files/figure.png'),
    text: path.join(DIR, 'notes-u48r1.txt'),
    latin1: path.join(DIR, 'article-u48r1-latin1.xml'),
    utf8: path.join(DIR, 'article-u48r1.xml'),
};
fs.writeFileSync(FILES.text, 'Notes for the production editor (u48r1).\n');
const xml = (enc) => `<?xml version="1.0" encoding="${enc}"?>\n<article article-type="research-article"><front><article-meta>` +
    `<title-group><article-title>Résumé of forest genetics (u48r1)</article-title></title-group></article-meta></front></article>\n`;
fs.writeFileSync(FILES.latin1, Buffer.from(xml('ISO-8859-1'), 'latin1'));
fs.writeFileSync(FILES.utf8, xml('UTF-8'), 'utf8');

forEachApp(async (app) => {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const out = {mode: MODE, run: RUN, app: app.name, line: app.line, steps: {}};
    const log = serverLog(app, {match: LOGRE});
    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
    const sleep = (ms) => page.waitForTimeout(ms);
    const panel = () => page.locator('.jatsPanel').first();
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        record(`u48r1-${MODE}-${name}`, {...s, ...extra});
        await shot(page, `u48r1-${MODE}-${name}`).catch(() => {});
        return s;
    };
    const short = (r) => r ? `${r.request().method()} ${r.status()} ${r.url().replace(/^.*\/index\.php/, '')}` : null;
    const panelState = async () => {
        const txt = await panel().innerText().catch(() => '');
        const buttons = await panel().getByRole('button').allInnerTexts().catch(() => []);
        return {
            buttons: buttons.map((b) => b.trim()).filter(Boolean),
            xmlHead: txt.replace(/\s+/g, ' ').slice(0, 160),
            line: txt.match(/(Last Modification[^\n]*|This JATS file is generated[^\n]*)/)?.[0] || null,
            uploader: (await page.locator('.jatsPanel').innerText().catch(() => '')).match(/Uploading[^\n]*/)?.[0] || null,
            tickBox: (await panel().getByText('Make available with publication', {exact: true}).isVisible().catch(() => false))
                ? (await panel().locator('input[type=checkbox]').first().isChecked().catch(() => null) ? 'ticked' : 'unticked') : 'absent',
        };
    };
    const dialogText = async () => {
        const d = page.getByRole('dialog').filter({hasNotText: /Publication|Workflow/}).last();
        return (await d.isVisible().catch(() => false)) ? (await d.innerText().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 300) : null;
    };

    // Steps 2-3: the submission's workflow, then "JATS XML" under "Publication".
    async function openJats(subId, tagName) {
        const from = log.mark();
        const getP = page.waitForResponse((r) => /\/jats$/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
        await frame.gotoEditorial(subId);
        await idle(page); await sleep(800);
        try { await frame.expandLatestVersionNode(); } catch (e) { await frame.revealPublicationEntry('JATS XML').catch(() => {}); }
        const link = frame.menuLink('JATS XML').first();
        if (!(await link.isVisible().catch(() => false))) await frame.revealPublicationEntry('JATS XML').catch(() => {});
        await link.click();
        const get = await getP;
        await idle(page); await sleep(1500);
        const s = await snap(`${tagName}-open`);
        const res = {get: short(get), getBody: get ? (await get.text().catch(() => '')).slice(0, 300) : null,
            dialog: s.text?.dialog || await dialogText(), panel: await panelState(), log: log.since(from)};
        record(`u48r1-${MODE}-${tagName}-open-facts`, res);
        return res;
    }

    // Step 4: "Upload" and choose the file.
    async function upload(file, tagName) {
        // 3.5 offers "Upload" only while the page shows the generated XML.
        if (!(await panel().getByRole('button', {name: 'Upload', exact: true}).isVisible().catch(() => false))) {
            const res = {file: path.basename(file), offered: false, panel: await panelState()};
            record(`u48r1-${MODE}-${tagName}-upload-facts`, res);
            return res;
        }
        const from = log.mark();
        const postP = page.waitForResponse((r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        const [chooser] = await Promise.all([
            page.waitForEvent('filechooser', {timeout: T}),
            panel().getByRole('button', {name: 'Upload', exact: true}).click(),
        ]);
        await chooser.setFiles(file);
        const post = await postP;
        await idle(page); await sleep(2000);
        const s = await snap(`${tagName}-upload`);
        const res = {file: path.basename(file), post: short(post), answerHead: post ? (await post.text().catch(() => '')).slice(0, 300) : null,
            notices: s.notices, dialog: s.text?.dialog || await dialogText(), panel: await panelState(), log: log.since(from)};
        record(`u48r1-${MODE}-${tagName}-upload-facts`, res);
        console.log(`[${app.name}] ${tagName} upload`, JSON.stringify({post: res.post, notices: res.notices, panel: res.panel, log: res.log}));
        return res;
    }

    async function pressOk() {
        const ok = page.getByRole('button', {name: 'OK', exact: true});
        if (await ok.isVisible().catch(() => false)) { await ok.click(); await idle(page); await sleep(500); return true; }
        return false;
    }

    async function moreInfo(tagName) {
        const btn = panel().getByRole('button', {name: 'More Information', exact: true});
        if (!(await btn.isVisible().catch(() => false))) return {offered: false};
        const from = log.mark();
        const reqP = page.waitForResponse((r) => /information-center/.test(r.url()), {timeout: 15000}).catch(() => null);
        await btn.click();
        const r = await reqP;
        await idle(page); await sleep(1500);
        const s = await snap(`${tagName}-moreinfo`);
        const res = {offered: true, request: short(r), dialog: s.text?.dialog || await dialogText(), log: log.since(from)};
        await page.keyboard.press('Escape').catch(() => {});
        const closeBtn = page.getByRole('button', {name: /^Close/}).last();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click().catch(() => {});
        await idle(page); await sleep(800);
        await pressOk();
        return res;
    }

    async function download(tagName) {
        const btn = panel().getByRole('button', {name: 'Download', exact: true});
        if (!(await btn.isVisible().catch(() => false))) return {offered: false};
        const dlP = page.waitForEvent('download', {timeout: 15000}).catch(() => null);
        await btn.click();
        const dl = await dlP;
        await sleep(800);
        let head = null;
        if (dl) { const p = await dl.path().catch(() => null); if (p) head = fs.readFileSync(p).subarray(0, 80).toString('latin1').replace(/[^\x20-\x7e]/g, '.'); }
        const res = {offered: true, filename: dl ? dl.suggestedFilename() : null, head};
        record(`u48r1-${MODE}-${tagName}-download-facts`, res);
        return res;
    }

    async function del(tagName) {
        const btn = panel().getByRole('button', {name: 'Delete', exact: true});
        if (!(await btn.isVisible().catch(() => false))) return {offered: false};
        await btn.click();
        const confirm = page.getByRole('button', {name: 'Delete JATS File', exact: true});
        await confirm.waitFor({timeout: T});
        const from = log.mark();
        const respP = page.waitForResponse((r) => /\/jats$/.test(r.url()) && ['DELETE', 'POST'].includes(r.request().method()), {timeout: T}).catch(() => null);
        await confirm.click();
        const r = await respP;
        await idle(page); await sleep(1500);
        await snap(`${tagName}-deleted`);
        return {offered: true, request: short(r), panel: await panelState(), log: log.since(from)};
    }

    try {
        await signIn(page, 'dbarnes');
        await idle(page);
        if (MODE === 'steps') {
            // First upload (submission 5).
            out.steps.a_before = await openJats(5, 'a');
            out.steps.a_upload = await upload(FILES.image, 'a');
            out.steps.a_reopen = await openJats(5, 'a2');
            out.steps.a_ok = await pressOk();
            out.steps.a_after_ok = await panelState();
            await snap('a2-after-ok');
            out.steps.a_moreinfo = await moreInfo('a2');
            out.steps.a_download = await download('a2');
            out.steps.a_delete = await del('a2');
            // Over a text file (submission 6).
            out.steps.b_before = await openJats(6, 'b');
            out.steps.b_text = await upload(FILES.text, 'b-text');
            out.steps.b_image = await upload(FILES.image, 'b-image');
            out.steps.b_reopen = await openJats(6, 'b2');
            await pressOk();
        }
        if (MODE === 'steps' || MODE === 'steps-c') {
            // An XML file saved as ISO-8859-1 (submission 15); WALK=steps-c takes this part alone.
            out.steps.c_before = await openJats(15, 'c');
            out.steps.c_upload = await upload(FILES.latin1, 'c');
            out.steps.c_reopen = await openJats(15, 'c2');
            await pressOk();
        }
        if (MODE === 'pre') {
            await openJats(5, 'p');
            out.steps.p_upload = await upload(FILES.image, 'p');
        } else if (MODE === 'stored') {
            out.steps.s_open = await openJats(5, 's');
            out.steps.s_ok = await pressOk();
            out.steps.s_moreinfo = await moreInfo('s');
            out.steps.s_download = await download('s');
            out.steps.s_delete = await del('s');
        } else if (MODE === 'pub') {
            const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
            const jp = new JatsPage(page, frame);
            const SUBP = 17;
            const link = async (tagName) => {
                await signOut(page).catch(() => {});
                const res = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/${SUBP}`));
                await idle(page);
                const a = page.locator('a.obj_galley_link.xml');
                const r = {article: res ? res.status() : null, linkShown: await a.isVisible().catch(() => false)};
                if (r.linkShown) {
                    r.linkText = (await a.innerText()).trim();
                    const href = await a.getAttribute('href');
                    r.href = href.replace(/^.*\/index\.php/, '');
                    const resp = await page.request.get(href);
                    const body = await resp.body();
                    const h = resp.headers();
                    r.status = resp.status(); r.type = h['content-type'] || null; r.disposition = h['content-disposition'] || null;
                    r.bytes = body.length; r.pngSignature = body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
                    r.head = body.subarray(0, 60).toString('latin1').replace(/[^\x20-\x7e]/g, '.');
                }
                await snap(`${tagName}-article`, {link: r});
                record(`u48r1-${MODE}-${tagName}-link-facts`, r);
                console.log(`[${app.name}] ${tagName} link`, JSON.stringify(r));
                await signIn(page, 'dbarnes');
                await idle(page);
                return r;
            };
            out.steps.u_before = await openJats(SUBP, 'u');
            out.steps.u_upload = await upload(FILES.image, 'u');
            out.steps.u_reopen = await openJats(SUBP, 'u2');
            out.steps.u_ok = await pressOk();
            out.steps.u_after_ok = await panelState();
            await snap('u2-after-ok', {panel: out.steps.u_after_ok});
            try {
                const r = await jp.setMakePublic(true);
                out.steps.u_tick = r ? `${r.status()}` : 'already ticked';
            } catch (e) { out.steps.u_tick = 'error: ' + String(e.message).slice(0, 200); }
            out.steps.u_after_tick = await panelState();
            await snap('u2-ticked', {panel: out.steps.u_after_tick});
            out.steps.u_link = await link('u3');
            await openJats(SUBP, 'u4');
            await pressOk();
            out.steps.u_delete = await del('u4');
            out.steps.u_link_after_delete = await link('u5');
        } else if (MODE === 'nb') {
            out.steps.n_before = await openJats(5, 'n');
            out.steps.n_xml = await upload(FILES.utf8, 'n-xml');
            out.steps.n_xml2 = await upload(FILES.utf8, 'n-xml2');
            out.steps.n_reopen = await openJats(5, 'n2');
            out.steps.n_download = await download('n2');
            out.steps.n_text = await upload(FILES.text, 'n-text');
            out.steps.n_delete = await del('n2');
        }
    } catch (e) {
        out.error = String(e.stack || e.message).slice(0, 800);
        note(`u48r1 ${app.name} ${MODE}: ${out.error.split('\n')[0]}`);
        await snap('error').catch(() => {});
        console.log(`[${app.name}] ERROR`, out.error);
    } finally {
        record(`u48r1-${MODE}-facts`, out);
        console.log(`[${app.name}] facts`, JSON.stringify(out).slice(0, 4000));
        await close();
    }
});
