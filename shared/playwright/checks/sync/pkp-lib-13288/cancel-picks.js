// Regression check for pkp/pkp-lib#13288 (issue #13286, merge f38c4a4a10), kept from the
// 2026-09-27 sync (docs/tracking/ci-triage.md "Open regressions",
// docs/reports/2026-09-27-pkp-lib-13288.md). One scratch journal per run:
//   MODE=s1   the editor revises article.pdf in the upload wizard, picks a second file
//             on step 1 (rev-one.pdf, then rev-two.pdf), presses "Cancel" (OJS, OMP)
//   MODE=s1g  the same through a galley's "Change File" (OJS, OPS)
//   MODE=s2   the same editor revises the file in two tabs (A: rev-a.pdf, then B: rev-b.pdf
//             as a revision of it), "Cancel" in B, then "Cancel" in A
//   PROBE_FEATURE=sync PROBE_AGENT=<agent> MODE=s1|s1g|s2 node bin/probe.js ojs|omp|ops shared/playwright/checks/sync/pkp-lib-13288/cancel-picks.js
// Verdict from result-<MODE>-<app>.json:
//   fixed  → s1: afterCancel.items[0] is the original fileId, "article.pdf";
//            s2: cancelA.body status:true and afterCancel back to "article.pdf"
//   broken → s1: afterCancel reads "rev-one.pdf" (the abandoned first pick);
//            s2: cancelA answers status:false, the file stays "rev-a.pdf"
//            (pkp-lib 26ae6431b5; at 1ad4a14bb2, before #13288, both restored article.pdf)
// No assertions: the script records, the reader judges.
// rr13286 S1 (MODE=s1: two picks in one wizard step 1, then Cancel) and
// S2 (MODE=s2: two wizards on the same file in two tabs, cancel B then A).
// Records only; the reader judges.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, tag, outDir} = require('../../../probe');

const MODE = process.env.MODE || 's1';
const log = (...a) => console.log(...a);
const wizardDialog = (page) => page.getByRole('dialog').filter({has: page.locator('input[type="file"]')});

async function openUploadWizard(page) {
    const btn = page.getByRole('button', {name: /^Upload/}).first();
    await btn.waitFor({state: 'visible', timeout: 30_000});
    await btn.click();
    await wizardDialog(page).locator('input[type="file"]').waitFor({state: 'attached', timeout: 30_000});
}

async function pickRevision(page, match) {
    const dialog = wizardDialog(page);
    const revise = dialog.locator('select[id^="revisedFileId"]');
    const options = await revise.locator('option').allTextContents();
    const idx = options.findIndex((t) => t.includes(match));
    if (idx >= 0) await revise.selectOption({index: idx});
    return {options, idx};
}

async function uploadPick(page, file) {
    const dialog = wizardDialog(page);
    const resp = page.waitForResponse((r) => /upload-file|uploadFile/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    await dialog.locator('input[type="file"]').setInputFiles(file);
    const r = await resp;
    let body = null;
    try { body = JSON.parse(await r.text()); } catch (e) { body = 'unparsed'; }
    await page.waitForTimeout(800);
    return {status: r.status(), uploadedFile: body && body.uploadedFile ? body.uploadedFile : body};
}

async function cancelWizard(page) {
    const dialog = wizardDialog(page);
    const resp = page.waitForResponse((r) => /cancel-file-upload|cancelFileUpload/.test(r.url()), {timeout: 30_000}).catch(() => null);
    await dialog.getByRole('link', {name: 'Cancel', exact: true}).or(dialog.getByRole('button', {name: 'Cancel', exact: true})).first().click();
    const r = await resp;
    const out = r ? {status: r.status(), body: (await r.text()).slice(0, 300)} : {none: true};
    await page.waitForTimeout(1500);
    out.wizardStillOpen = await dialog.isVisible().catch(() => false);
    return out;
}

async function filesViaApi(app, T, sid, page) {
    const r = await page.request.get(app.url(`/index.php/${T}/api/v1/submissions/${sid}/files` + (MODE === 's1g' ? '?fileStages[]=10' : '')), {failOnStatusCode: false});
    const j = await r.json().catch(() => ({}));
    return {status: r.status(), items: (j.items || []).map((f) => ({id: f.id, fileId: f.fileId, name: f.name, uploaderUserId: f.uploaderUserId, revisions: (f.revisions || []).map((x) => x.fileId)}))};
}

async function downloadLinks(scope) {
    return scope.evaluate((root) => [...root.querySelectorAll('a')]
        .filter((a) => /download/i.test(a.textContent) || /download-file|downloadFile/.test(a.getAttribute('href') || ''))
        .map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})));
}

forEachApp(async (app) => {
    const T = tag('rr13286' + MODE);
    const ed = `${T}ed`, au = `${T}au`;
    const fixtures = path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files`);
    const base = fs.existsSync(path.join(fixtures, 'article.pdf')) ? 'article.pdf' : 'preprint.pdf';
    const mk = (n) => { const p = path.join(outDir(), n); fs.copyFileSync(path.join(fixtures, base), p); return p; };
    const [one, two] = MODE === 's1' ? [mk('rev-one.pdf'), mk('rev-two.pdf')] : [mk('rev-a.pdf'), mk('rev-b.pdf')];

    await app.api.createContext({tag: T, users: [
        {username: ed, roles: [app.name === 'ops' ? 'manager' : 'editor'], givenName: 'Ed', familyName: 'Itor'},
        {username: au, roles: ['author'], givenName: 'Au', familyName: 'Thor'},
    ]});
    const GALLEY = MODE === 's1g';
    const sub = await app.api.createSubmission(GALLEY
        ? {tag: T, context: T, submitter: au, title: `RR13286 ${T}`, galleys: [{label: 'PDF', locale: 'en', file: base}]}
        : {tag: T, context: T, submitter: au, title: `RR13286 ${T}`, files: [{file: base}]});
    const sid = sub.submissionId;
    const wf = app.url(`/index.php/${T}/dashboard/editorial?workflowSubmissionId=${sid}` + (GALLEY ? `&workflowMenuKey=publication_${sub.publicationId}_galleys` : ''));
    const result = {T, sid, MODE, base};
    const {page, close} = await launch(app);
    const reqs = [];
    const watch = (p, label) => p.on('request', (r) => { if (/manage-file-api|file-upload-wizard/.test(r.url())) reqs.push({tab: label, m: r.method(), url: r.url().replace(/^.*index.php/, '').slice(0, 200), post: /cancel|delete/.test(r.url()) ? (r.postData() || '').slice(0, 400) : undefined}); });
    watch(page, 'A');
    page.on('response', async (r) => { if (/delete-file|deleteFile/.test(r.url())) reqs.push({deleteResp: r.status(), body: (await r.text().catch(() => '')).slice(0, 200)}); });
    try {
        await signIn(page, ed, {contextPath: T});
        await page.goto(wf); await idle(page);
        result.before = await filesViaApi(app, T, sid, page);
        if (GALLEY) {
            const row = page.locator('[data-cy="galley-manager"] tbody tr').filter({hasText: 'PDF'}).first();
            await row.locator('button[aria-label="More Actions"]').click();
            await page.getByRole('menuitem', {name: 'Change File', exact: true}).click();
            await wizardDialog(page).locator('input[type="file"]').waitFor({state: 'attached', timeout: 30_000});
        } else {
            await openUploadWizard(page);
            result.pickA = await pickRevision(page, base);
        }
        if (MODE === 's1' || GALLEY) {
            result.upload1 = await uploadPick(page, one);
            result.afterUpload1 = await filesViaApi(app, T, sid, page);
            result.upload2 = await uploadPick(page, two);
            result.afterUpload2 = await filesViaApi(app, T, sid, page);
            record('step1-two-picks', {text: (await wizardDialog(page).innerText()).slice(0, 1500)});
            await shot(page, 'step1-two-picks');
            result.cancel = await cancelWizard(page);
        } else {
            result.uploadA = await uploadPick(page, one);
            const pageB = await page.context().newPage();
            watch(pageB, 'B');
            await pageB.goto(wf); await idle(pageB);
            await openUploadWizard(pageB);
            result.pickB = await pickRevision(pageB, 'rev-a');
            result.uploadB = await uploadPick(pageB, two);
            result.afterBoth = await filesViaApi(app, T, sid, page);
            result.cancelB = await cancelWizard(pageB);
            result.afterCancelB = await filesViaApi(app, T, sid, page);
            result.cancelA = await cancelWizard(page);
            await shot(page, 'tabA-after-cancel');
            await pageB.close();
        }
        await page.goto(wf); await idle(page);
        result.afterCancel = await filesViaApi(app, T, sid, page);
        await shot(page, 'after-cancel-workflow');
        if (GALLEY) { await shot(page, 'galleys-after-cancel'); record('galleys-after-cancel', await screen(page)); return; }
        // Activity Log & Notes
        await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
        const logDialog = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
        await logDialog.getByText('Event', {exact: true}).first().waitFor({state: 'visible', timeout: 30_000});
        await idle(page);
        const logText = await logDialog.innerText();
        const links = await downloadLinks(logDialog);
        const fetched = [];
        for (const l of links.filter((x) => x.href).slice(0, 6)) {
            const r = await page.request.get(l.href, {failOnStatusCode: false, maxRedirects: 0});
            fetched.push({fileId: (l.href.match(/fileId=(\d+)/) || [])[1], status: r.status(), disposition: r.headers()['content-disposition']});
        }
        result.activityLog = {rows: logText.split('\n').filter((s) => /\.pdf|file/i.test(s)).slice(0, 30), links: links.length, fetched};
        await shot(page, 'activity-log');
    } catch (e) {
        result.error = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
        await shot(page, 'zz-failure').catch(() => {});
    } finally {
        result.reqs = reqs;
        record(`result-${MODE}`, result);
        log(JSON.stringify(result, null, 1));
        await close();
    }
});
