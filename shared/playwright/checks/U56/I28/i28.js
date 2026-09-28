// U56 claim check I28 (housekeeping 2026-09-28): the incidental row for U56 in
// docs/tracking/incidentals.md (L136: on a preprint server the French body of
// "Submission Acknowledgement (Pending Moderation)" speaks of "la revue").
// Chunk: .reports/hk28/chunks/U56.md. Spec: docs/specs/U56-emails-management.md
// Rules 18 and 20, register A1 (the neighbouring wording entry).
//
// Run twice, each run seeding its own scratch context and writing its own facts file:
//   RUN=1 PROBE_FEATURE=U56 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U56/I28/i28.js
//   RUN=2 PROBE_FEATURE=U56 PROBE_AGENT=ccI28 node bin/probe.js all shared/playwright/checks/U56/I28/i28.js
//
// Per app: one scratch context (tag prefix u56i28) with en + fr_CA under "UI" and "Forms"
// (with "Forms" alone the French boxes are empty, U57 A13) and a throwaway manager.
// The manager opens Settings › Workflow › Emails › "Add and edit templates", the
// submission acknowledgement ("Submission Acknowledgement (Pending Moderation)" on a
// preprint server, "Submission Confirmation" on a journal and a press), reads the English
// body (the control), presses "French" and reads the French subject and body; then the
// sweep: the window's controls, an unsaved French change left by the back arrow and by a
// page change, the window reopened; and the list row read with the French interface.
// No assertions: every screen is recorded with screen()/shot(); i28-facts-run<N>-<app>.json
// carries the structured reads.
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || '1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const SELECT_ALL = process.platform === 'darwin' ? 'Meta+A' : 'Control+A';
const BODY_EN = 'editEmailTemplate-body-control-en';
const BODY_FR = 'editEmailTemplate-body-control-fr_CA';
// the words a body uses for the context, per language
const WORDS_EN = /\b(journal|press|server|preprint server|preprints?|moderators?|editorial team|venue)\b/gi;
const WORDS_FR = /\b(la revue|notre revue|revue|presse|maison d'édition|serveur|prépublications?|modérat\w+|équipe éditorial\w*)\b/gi;
const sentencesWith = (text, re) => flat(text).split(/(?<=[.!?:])\s+/).filter((s) => { re.lastIndex = 0; return re.test(s); });

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const fact = (k, v) => { record(`i28-facts-run${RUN}`, {[k]: v}, {merge: true}); console.log(`[i28 ${app.name} run${RUN} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const t = tag('u56i28');
    await app.api.createContext({tag: t, context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        users: [{username: `${t}mg`, givenName: 'Mara', familyName: 'Manager', email: `${t}mg@mail.test`, roles: ['manager']}]});
    fact('context', {path: t, manager: `${t}mg`});
    const NAME = ops ? 'Submission Acknowledgement (Pending Moderation)' : 'Submission Confirmation';

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message().slice(0, 300), url: page.url()}); await d.accept().catch(() => {}); });
    const cu = (p) => app.url(`/index.php/${t}${p}`);
    const snap = async (label, extra) => { const s = await screen(page); record(`i28-run${RUN}-${label}`, extra ? {...s, extra} : s); await shot(page, `i28-run${RUN}-${label}`).catch(() => {}); return s; };
    const tplDlg = () => page.getByRole('dialog', {name: 'Edit Template'}).last();
    const waitBody = (id) => page.waitForFunction((i) => window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized, id, {timeout: 20000}).catch(() => {});
    const editor = (id) => page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent() : null), id);
    async function openManage(prefix = '') {
        await page.goto(app.url(`/index.php/${t}${prefix}/management/settings/manageEmails`));
        await idle(page);
        await page.locator('.manageEmails__listPanel .listPanel__item').first().waitFor({timeout: 30000});
    }
    async function openTemplate() {
        const btn = page.locator('main').getByRole('button', {name: `Edit ${NAME}`, exact: true});
        const respP = page.waitForResponse((r) => /api\/v1\/(mailables|emailTemplates)\//.test(r.url()) && r.request().method() === 'GET', {timeout: 20000}).catch(() => null);
        await btn.click();
        const r = await respP;
        const got = r ? {status: r.status(), url: r.url().replace(/^.*api\/v1\//, '')} : null;
        // a several-template email opens its own window first: then the default row's "Edit"
        if (got && /mailables/.test(got.url)) {
            const d = page.getByRole('dialog', {name: NAME, exact: true}).last();
            await d.waitFor({timeout: 15000});
            await d.locator('.listPanel__item').first().getByRole('button', {name: 'Edit', exact: true}).click();
        }
        await tplDlg().waitFor({timeout: 20000});
        await idle(page);
        await waitBody(BODY_EN);
        return got;
    }
    async function readWindow() {
        return tplDlg().evaluate((el) => {
            const vis = (e) => !!e.getClientRects().length;
            return {
                inputs: [...el.querySelectorAll('input')].filter((e) => e.type !== 'hidden').map((e) => ({name: e.name, value: e.value, visible: vis(e)})),
                counts: [...el.querySelectorAll('.pkpFormField__localeCount, [class*=localeCount]')].filter(vis).map((e) => e.innerText.trim()),
                localeButtons: [...el.querySelectorAll('.pkpFormLocales button')].filter(vis).map((b) => b.innerText.trim()),
                buttons: [...el.querySelectorAll('button, a')].filter(vis).map((b) => (b.innerText.trim() || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ')).filter(Boolean),
                labels: [...el.querySelectorAll('label, .pkpFormFieldLabel')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
            };
        });
    }
    const TOOLBAR = /^(Bold|Italic|Superscript|Subscript|Insert\/edit link|Blockquote|Bullet list|Numbered list|Remove link|Undo|Redo|Source code|Upload image|Insert\/edit image|Formats|Paragraph|Rich Text Area.*)$/;
    async function closeTpl() {
        await tplDlg().getByRole('button', {name: 'Close', exact: true}).first().click();
        await tplDlg().waitFor({state: 'hidden', timeout: 10000}).catch(() => {});
        await sleep(800); // the modal store's 450 ms slot
    }
    const frBtn = () => tplDlg().getByRole('button', {name: 'French', exact: true});
    const frSubject = () => tplDlg().locator('input[name="subject-fr_CA"]');
    async function showFrench() { if (await frBtn().count() && !(await frSubject().isVisible().catch(() => false))) { await frBtn().click(); await sleep(600); } }

    try {
        await signIn(page, `${t}mg`, {contextPath: t});

        // the "Emails" tab: the context's word in the tab's own lines (the manager's route in)
        await page.goto(cu('/management/settings/workflow#emails'));
        await idle(page);
        const tab = await snap('01-emails-tab');
        fact('emailsTab', {manageEmailsLine: flat(tab.text && tab.text.main).match(/[^.]*Manage Emails[^.]*\.?|[^.]*templates[^.]*\./i)?.[0] || null});

        // Manage Emails: the row, then the template window in English
        await openManage();
        const rowText = await page.locator('.manageEmails__listPanel .listPanel__item').filter({has: page.getByRole('button', {name: `Edit ${NAME}`, exact: true})}).first().innerText().catch(() => null);
        await snap('02-manage-emails');
        await loc(page, `Manage Emails: the "Edit ${NAME}" button`, page.locator('main').getByRole('button', {name: `Edit ${NAME}`, exact: true}));
        const opened = await openTemplate();
        const w0 = await readWindow();
        const en = await editor(BODY_EN);
        const s1 = await snap('03-template-english');
        fact('english', {
            opened, rowText: flat(rowText, 400),
            subject: (w0.inputs.find((i) => i.name === 'subject-en') || {}).value,
            name: (w0.inputs.find((i) => i.name === 'name-en') || {}).value,
            counts: w0.counts, localeButtons: w0.localeButtons, labels: w0.labels,
            buttons: w0.buttons.filter((b) => !TOOLBAR.test(b)),
            body: flat(en), contextSentences: sentencesWith(en, WORDS_EN),
            dialogText: flat(s1.text && s1.text.dialog, 600),
        });
        await loc(page, 'Edit Template: the "French" language button', frBtn());

        // French
        await showFrench();
        await waitBody(BODY_FR);
        const w1 = await readWindow();
        const fr = await editor(BODY_FR);
        await snap('04-template-french');
        fact('french', {
            subject: (w1.inputs.find((i) => i.name === 'subject-fr_CA') || {}).value,
            name: (w1.inputs.find((i) => i.name === 'name-fr_CA') || {}).value,
            counts: w1.counts, localeButtons: w1.localeButtons,
            body: flat(fr), contextSentences: sentencesWith(fr, WORDS_FR),
            revue: (flat(fr).match(/[^.:]*revue[^.:]*[.:]?/gi) || []),
        });
        await loc(page, 'Edit Template: the French subject box', frSubject());

        // sweep: an unsaved French change, left by the back arrow ("Close")
        await frSubject().fill(`u56i28 sujet non enregistré ${RUN}`);
        await frSubject().blur();
        const d0 = dialogs.length;
        await closeTpl();
        const closedByArrow = !(await tplDlg().isVisible().catch(() => false));
        fact('leaveByArrow', {closed: closedByArrow, dialogs: dialogs.slice(d0)});
        await openTemplate();
        await showFrench();
        const w2 = await readWindow();
        await snap('05-reopened-after-arrow');
        fact('reopenedAfterArrow', {frSubject: (w2.inputs.find((i) => i.name === 'subject-fr_CA') || {}).value, frenchShownOnOpen: (w2.inputs.find((i) => i.name === 'subject-fr_CA') || {}).visible});

        // sweep: an unsaved French body change, left by a page change
        await waitBody(BODY_FR);
        const body = page.frameLocator(`#${BODY_FR}_ifr`).locator('body');
        await body.click();
        await page.keyboard.press('End');
        await body.pressSequentially(' u56i28 non enregistré.', {delay: 5});
        await frSubject().click(); // blur the editor
        const d1 = dialogs.length;
        await page.goto(cu('/management/settings/workflow')).catch((e) => fact('leaveByPageError', String(e.message).slice(0, 200)));
        await idle(page);
        fact('leaveByPage', {url: page.url().replace(/^.*index\.php/, ''), dialogs: dialogs.slice(d1)});
        await openManage();
        await openTemplate();
        await showFrench();
        await waitBody(BODY_FR);
        const fr2 = await editor(BODY_FR);
        await snap('06-reopened-after-page-change');
        fact('reopenedAfterPage', {unchanged: flat(fr2) === flat(fr), hasTyped: /u56i28/.test(fr2 || '')});
        await closeTpl();

        // after a reload: the French body as stored (nothing was saved)
        await page.reload(); await idle(page);
        await page.locator('.manageEmails__listPanel .listPanel__item').first().waitFor({timeout: 30000});
        await openTemplate();
        await showFrench();
        await waitBody(BODY_FR);
        const fr3 = await editor(BODY_FR);
        await snap('07-after-reload-french');
        fact('afterReload', {sameAsFirstRead: flat(fr3) === flat(fr), revue: (flat(fr3).match(/[^.:]*revue[^.:]*[.:]?/gi) || [])});
        await closeTpl();

        // the list with the French interface: the row's name and description
        await openManage('/fr_CA');
        const rowsFr = await page.locator('.manageEmails__listPanel .listPanel__item').evaluateAll((li) => li.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
        const sFr = await snap('08-manage-emails-fr-ui');
        const filtersFr = await page.locator('.manageEmails__listPanel .listPanel__header, .manageEmails__listPanel .pkpFilter, .manageEmails__listPanel [class*=filter]').allInnerTexts().catch(() => []);
        fact('frenchUiRows', {
            count: rowsFr.length,
            ack: rowsFr.filter((r) => /^Confirmation de soumission |Accusé|Pending Moderation/.test(r)),
            rawKeyRows: rowsFr.filter((r) => /##/.test(r)),
            revueRows: rowsFr.filter((r) => /revue/i.test(r)).map((r) => r.slice(0, 300)),
            filters: [...new Set(filtersFr.map((f) => flat(f, 600)))].slice(0, 4),
            main: flat(sFr.text && sFr.text.main, 1500),
        });
        await openManage('/en');
        const rowsEn = await page.locator('.manageEmails__listPanel .listPanel__item').evaluateAll((li) => li.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
        fact('englishUiRows', {count: rowsEn.length, rawKeyRows: rowsEn.filter((r) => /##/.test(r)), journalRows: rowsEn.filter((r) => /journal/i.test(r)).map((r) => r.slice(0, 300))});
        // back to English for the session
        await page.goto(cu('/en/management/settings/workflow')); await idle(page);
        await signOut(page);
    } catch (e) {
        fact('error', String(e.stack || e).split('\n').slice(0, 6).join(' | '));
        await snap('zz-error').catch(() => {});
    } finally {
        fact('dialogsAll', dialogs);
        await close();
    }
    if (RUN === '1' && ops) note('Manage Emails (OPS, en+fr_CA UI and Forms): "Edit Submission Acknowledgement (Pending Moderation)" opens "Edit Template" straight away (GET emailTemplates/SUBMISSION_ACK); "French" is getByRole(button, {name: "French", exact: true}) in the dialog; the French body is TinyMCE editEmailTemplate-body-control-fr_CA, read via tinymce.get(id).getContent() after its initialized flag (I28).');
});
