// Issue report walk: docs/issues/U35-OJS1-editor-assigned-email-names-send-to-review.md
// (spec U35 register OJS1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
//   1-5  an author submits a new item through the wizard into the section
//        (series) whose "Editorial Assignments" list editors;
//   6    dbuskins's email "You have been assigned as an editor on a submission
//        to …" is read: the sentence naming the button;
//   7    dbuskins follows the email's link: the Submission stage's buttons;
//   8    dbarnes, "Assign" on a Submission-stage item, Section (Series) editor,
//        Minoti Inoue, the message "Assign Editor": its text; "Cancel".
//   OJS  the finding: `ccorino` into "Articles"; step 8 on submission 4.
//   OMP  control: `aclark` into "Library & Information Studies" (dbuskins),
//        the series picked on "For the Editors"; step 8 on submission 3.
//   OPS  has no review stage (and sends this email to nobody, U35 OPS3): skipped.
// The kit builds nothing; every change is made on screen. Reset the fleet first.
//
// Run (main; 3.5 with PKP_E2E_LINE=stable-3_5_0, --feature issues-w40-3_5, PROBE_RUN=r35):
//   PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w40 --dataset 2 --reset
//   PROBE_FEATURE=issues-w40 PROBE_AGENT=w40 node bin/probe.js all shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const RUN = process.env.PROBE_RUN || 'main';
const REPO = path.resolve(__dirname, '../../../../..');
const PDF = path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf');
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const AUTHOR = {ojs: 'ccorino', omp: 'aclark'};
const GROUP = {ojs: 'Articles', omp: 'Library & Information Studies'};
const ASSIGN = {ojs: {sid: 4, role: 'Section editor'}, omp: {sid: 3, role: 'Series editor'}};

forEachApp(async (app) => {
    if (!AUTHOR[app.name]) {
        console.log(`[fact] ${app.name} skipped: no review stage`);
        return;
    }
    const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
    const ctx = app.contextPath;
    const cu = (p) => app.url(`/index.php/${ctx}/en${p}`);
    const stamp = new Date().toISOString().slice(11, 19).replace(/:/g, '');
    const TITLE = `u35w40 Editor email wording ${app.name} ${RUN} ${stamp}`;
    const facts = {app: app.name, line: app.line, run: RUN, title: TITLE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const save = () => record(`facts-${RUN}`, facts);

    const {page, close} = await launch(app);
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    async function snap(name) {
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message), text: {}}));
        const id = `${RUN}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
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
        if (await groupRadio.count()) await groupRadio.check();
        const english = page.getByRole('radio', {name: 'English', exact: true});
        if (await english.count()) await english.check();
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
        }
        await snap('start');
        const t0 = Date.now();
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        fact('submissionId', Number(new URL(page.url()).searchParams.get('id')));
        await idle(page);

        // Steps 3-4: a file, an abstract, through to Review.
        let genreName = null;
        const current = page.locator('.pkpSteps__step__label--current');
        const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 10; i++) {
            const step = flat(await current.innerText().catch(() => ''));
            if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
            const stepGroup = page.getByRole('radio', {name: GROUP[app.name], exact: true});
            if ((await stepGroup.count()) && !(await stepGroup.first().isChecked())) await stepGroup.first().check();
            if (/Upload Files$/.test(step) && !genreName) {
                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                await genre.waitFor({timeout: T});
                genreName = flat(await genre.innerText());
                await genre.click();
                await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: genreName}).first().waitFor({timeout: T});
            }
            if (/Details$/.test(step)) {
                const abs = page.locator('iframe[id^="titleAbstract-abstract-control-en"]').first();
                if (await abs.count()) {
                    await waitForEditorReady(page, 'titleAbstract-abstract-control-en');
                    const b = page.frameLocator('#titleAbstract-abstract-control-en_ifr').locator('body');
                    await b.click();
                    await b.fill('Tides follow the moon.');
                }
            }
            await cont.click();
            await page.waitForFunction((prev) => {
                const el = document.querySelector('.pkpSteps__step__label--current');
                return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
            }, step, {timeout: T}).catch(() => {});
            await idle(page);
        }
        fact('genre', genreName);
        await pause(1000);
        for (const box of await page.getByRole('checkbox').all()) {
            if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
        }

        // Step 5: Submit.
        await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
        const confirm = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
        await confirm.waitFor({timeout: T});
        await confirm.getByRole('button', {name: 'Submit', exact: true}).click();
        await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
        await snap('complete');
        await signOut(page);

        // Step 6: dbuskins's email.
        const hit = await app.mail.find({to: 'dbuskins@mailinator.com', contains: TITLE, timeoutMs: 45_000}).catch((e) => ({error: flat(e.message, 200)}));
        if (hit.error) {
            fact('mail', hit);
            save();
            return;
        }
        const all = await app.mail._search({to: 'dbuskins@mailinator.com', contains: TITLE});
        fact('mailSubjects', (all.messages || []).filter((m) => Date.parse(m.Created) >= t0 - 2000).map((m) => m.Subject));
        const assigned = (all.messages || []).find((m) => /You have been assigned as an editor/.test(m.Subject)) || hit;
        const full = await app.mail.fullMessage(assigned.ID);
        const text = flat(full.Text, 20000);
        fact('mail', {subject: assigned.Subject, from: assigned.From && assigned.From.Name});
        fact('mail.sentence', (text.match(/If you find the submission[^.]*\.[^.]*\./) || [null])[0]);
        const link = (String(full.HTML).match(/href="([^"]*workflow[^"]*|[^"]*dashboard[^"]*)"/) || [])[1] || null;
        fact('mail.link', link);
        record(`${RUN}-mail`, {subject: assigned.Subject, text: full.Text, html: full.HTML});

        // Step 7: dbuskins follows the link; the Submission stage's buttons.
        await signIn(page, 'dbuskins');
        await page.goto(link ? link.replace(/&amp;/g, '&') : cu(`/dashboard/editorial?workflowSubmissionId=${facts.submissionId}`));
        await idle(page);
        const wf = page.getByRole('dialog').first();
        await wf.getByRole('button', {name: /^(Send for Review|Send to Review|Send to Internal Review|Decline Submission)$/}).first().waitFor({timeout: T}).catch(() => {});
        await pause(500);
        const s = await snap('workflow');
        fact('workflow.url', s.url);
        const names = await wf.getByRole('button').allInnerTexts().catch(() => []);
        fact('workflow.decisionButtons', names.map((x) => flat(x)).filter((x) => /^(Send|Accept|Decline)/.test(x)));
        fact('workflow.hasSendToReview', await wf.getByRole('button', {name: 'Send to Review', exact: true}).count());
        await signOut(page);

        // Step 8: the "Assign Editor" message on the Submission stage.
        const SP = require('../../../pages/StageParticipantsPages.js');
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, ctx);
        await panel.goto(ASSIGN[app.name].sid);
        const win = await panel.openAssign();
        await win.chooseRole(ASSIGN[app.name].role);
        await win.search('Inoue');
        await win.choosePerson('Minoti Inoue');
        const options = await win.templateOptions();
        fact('assign.templates', options);
        const template = options.find((o) => /^(Assign Editor|Editor Assigned)$/.test(o));
        if (template) {
            await win.chooseTemplate(template);
            let message = '';
            for (let i = 0; i < 20; i++) {
                const now = await win.messageText();
                if (now && now === message) break;
                message = now;
                await pause(250);
            }
            fact('assign.sentence', (flat(message, 5000).match(/If you find the submission[^.]*\.[^.]*\./) || [null])[0]);
        }
        await snap('assign-message');
        await win.cancel();
        await signOut(page);
        save();
    } catch (e) {
        facts.error = flat(e.stack, 1500);
        await snap('error').catch(() => {});
        save();
        throw e;
    } finally {
        await close();
    }
});
