// Issue report walk: docs/issues/U35-OPS3-ops-moderator-assigned-email-never-sent.md
// (spec U35 register OPS3). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// an author submits a new item through the wizard into the section (series)
// whose "Editorial Assignments" list editors; then `dbarnes` opens it
// (Participants, Activity Log) and the editors' mailboxes are read.
// The kit builds nothing; every change is made on screen.
//
//   OPS  the finding: `ccorino` into "Preprints" (dbuskins, sberardo)
//   OJS  control / neighbour: `ccorino` into "Articles" (dbarnes, dbuskins, sberardo)
//   OMP  control / neighbour: `aclark` into "Library & Information Studies" (dbuskins),
//        the series picked on "For the Editors"
// OPS adds its file as a galley ("Add File", label "PDF", "Preprint Text").
//
// The title carries the run and a time stamp so the shared Mailpit tells
// walks apart. Reset the fleet before each walk.
//
// Run (main, then stable-3_5_0):
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w31 --dataset 2 --reset
//   PROBE_FEATURE=issues-w31 PROBE_AGENT=w31 node bin/probe.js all shared/playwright/checks/issues/ops-moderator-assigned-email-never-sent/walk.js
//   PKP_E2E_LINE=stable-3_5_0 ... fleet-prep -- --feature issues-w31-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w31-3_5 PROBE_AGENT=w31 node bin/probe.js all <this file>
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const RUN = process.env.PROBE_RUN || 'main';
const REPO = path.resolve(__dirname, '../../../../..');
const PDF = path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};
const GROUP = {ojs: 'Articles', omp: 'Library & Information Studies', ops: 'Preprints'};
const EDITORS = {ojs: ['dbarnes', 'dbuskins', 'sberardo'], omp: ['dbuskins'], ops: ['dbuskins', 'sberardo']};

forEachApp(async (app) => {
    const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
    const ctx = app.contextPath;
    const loc = app.line === 'main' || app.line === 'stable-3_5_0' ? '/en' : '';
    const cu = (p) => app.url(`/index.php/${ctx}${loc}${p}`);
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const TITLE = `u35w31 Moderator email check ${app.name} ${RUN} ${stamp}`;
    const facts = {app: app.name, line: app.line, run: RUN, title: TITLE};
    const save = () => record('facts', facts);

    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    async function snap(name, extra) {
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message), text: {}}));
        const id = `${String(++n).padStart(2, '0')}-${name}`;
        record(id, extra ? {...s, extra} : s);
        await shot(page, id).catch(() => {});
        return s;
    }

    try {
        // Steps 1-2: the author starts a submission.
        await signIn(page, AUTHOR[app.name]);
        await page.goto(cu('/submission'));
        await idle(page);
        const iframe = page.locator('iframe.tox-edit-area__iframe').first();
        await waitForEditorReady(page, await editorIdOf(iframe));
        const body = iframe.contentFrame().locator('body');
        await body.click();
        await body.fill(TITLE);
        const groupRadio = page.getByRole('radio', {name: GROUP[app.name], exact: true});
        facts.groupRadio = await groupRadio.count();
        if (facts.groupRadio) await groupRadio.check();
        const english = page.getByRole('radio', {name: 'English', exact: true});
        if (await english.count()) await english.check();
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
        }
        await snap('start');
        const t0 = Date.now();
        facts.startedAt = new Date(t0).toISOString();
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        facts.submissionId = Number(new URL(page.url()).searchParams.get('id'));
        await idle(page);

        // Steps 3-4: a file, an abstract, through to Review.
        let genreName = null;
        const current = page.locator('.pkpSteps__step__label--current');
        const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
        facts.path = [];
        for (let i = 0; i < 10; i++) {
            const step = flat(await current.innerText().catch(() => ''));
            facts.path.push(step);
            if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
            // A press picks its series on "For the Editors".
            const stepGroup = page.getByRole('radio', {name: GROUP[app.name], exact: true});
            if ((await stepGroup.count()) && !(await stepGroup.first().isChecked())) {
                await stepGroup.first().check();
                facts.groupPickedOn = step;
                await snap('group-picked');
            }
            // A preprint server's files are galleys: "Add File", label, then the upload wizard.
            if (/Upload Files$/.test(step) && !genreName && app.name === 'ops') {
                const {addGalleyFile} = require(path.join(REPO, 'apps/ops/playwright/pages/SubmissionWizardPages.js'));
                await addGalleyFile(page, {label: 'PDF', genre: 'Preprint Text', file: PDF});
                genreName = 'Preprint Text';
                await snap('upload-files');
            }
            if (/Upload Files$/.test(step) && !genreName) {
                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                await genre.waitFor({timeout: T});
                genreName = flat(await genre.innerText());
                await genre.click();
                await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: genreName}).first().waitFor({timeout: T});
                await snap('upload-files');
            }
            if (/Details$/.test(step)) {
                const abs = page.locator('iframe[id^="titleAbstract-abstract-control-en"]').first();
                if (await abs.count()) {
                    await waitForEditorReady(page, 'titleAbstract-abstract-control-en');
                    const b = page.frameLocator('#titleAbstract-abstract-control-en_ifr').locator('body');
                    await b.click();
                    await b.fill('Tides follow the moon.');
                }
                await snap('details');
            }
            await cont.click();
            await page.waitForFunction((prev) => {
                const el = document.querySelector('.pkpSteps__step__label--current');
                return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
            }, step, {timeout: T}).catch(() => {});
            await idle(page);
        }
        facts.genre = genreName;
        await pause(1000);
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
        }
        await snap('review');

        // Step 5: Submit.
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
        await confirm.waitFor({timeout: T});
        await confirm.getByRole('button', {name: 'Submit', exact: true}).click();
        await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
        await snap('complete');
        facts.submittedAt = new Date().toISOString();
        await signOut(page);

        // Step 7 first (mail is time-bounded): the author's acknowledgement bounds the wait.
        const authorAddr = `${AUTHOR[app.name]}@mailinator.com`;
        const ack = await app.mail.find({to: authorAddr, contains: TITLE, timeoutMs: 45_000}).catch((e) => ({error: flat(e.message, 200)}));
        facts.authorAck = ack.error ? ack : {subject: ack.Subject, created: ack.Created};
        await pause(3000);
        facts.mail = {};
        for (const u of EDITORS[app.name]) {
            const addr = `${u}@mailinator.com`;
            const hit = await app.mail.find({to: addr, contains: TITLE, timeoutMs: 10_000}).catch(() => null);
            const all = await app.mail._search({to: addr}).catch(() => ({messages: []}));
            facts.mail[u] = {
                aboutThisSubmission: (await app.mail._search({to: addr, contains: TITLE})).messages.map((m) => ({subject: m.Subject, from: m.From && m.From.Address, created: m.Created})),
                sinceWalkStart: (all.messages || []).filter((m) => Date.parse(m.Created) >= t0).map((m) => ({subject: m.Subject, created: m.Created})),
                found: !!hit,
            };
        }
        // Neighbours: the managers who are not assigned (only "needs an editor", if
        // anything) and the author (only the acknowledgement): never the assignment email.
        for (const u of ['rvaca', 'dbarnes', AUTHOR[app.name]].filter((x) => !EDITORS[app.name].includes(x))) {
            const r = await app.mail._search({to: `${u}@mailinator.com`, contains: TITLE}).catch(() => ({messages: []}));
            facts.mail[u] = {aboutThisSubmission: (r.messages || []).map((m) => ({subject: m.Subject, created: m.Created}))};
        }
        save();

        // Step 6: dbarnes opens it: Participants, Activity Log.
        await signIn(page, 'dbarnes');
        await page.goto(cu(`/dashboard/editorial?workflowSubmissionId=${facts.submissionId}`));
        await idle(page);
        const wf = page.getByRole('dialog').first();
        await wf.getByText('Participants').first().waitFor({timeout: T}).catch(() => {});
        await pause(1000);
        const s = await snap('workflow');
        facts.workflowText = flat(s.text && s.text.dialog, 1500);
        const btn = wf.locator('[data-cy="sidemodal-header"]').getByRole('button', {name: 'Activity Log', exact: true}).first();
        if (await btn.count()) {
            await btn.click();
            const d = page.getByRole('dialog').filter({hasText: 'Activity Log'}).last();
            await d.locator('tr.gridRow, td:has-text("No Items")').first().waitFor({timeout: 45_000}).catch(() => {});
            await idle(page); await pause(500);
            facts.activityLog = await d.locator('tr.gridRow').evaluateAll((trs) => trs.map((tr) =>
                [...tr.querySelectorAll('td')].map((td) => td.innerText.replace(/\s+/g, ' ').trim()).join(' | '))).catch(() => []);
            await snap('activity-log');
            const tabs = await d.getByRole('tab').allInnerTexts().catch(() => []);
            facts.activityTabs = tabs.map((x) => flat(x));
        } else {
            facts.activityLog = 'no Activity Log button';
        }
        save();
        await signOut(page);
    } catch (e) {
        facts.error = flat(e.stack, 1500);
        await snap('error').catch(() => {});
        save();
        throw e;
    } finally {
        await close();
    }
});
