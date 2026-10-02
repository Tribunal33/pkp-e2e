// U48 A11 walk (issue report docs/issues/U48-A11-jats-download-saves-refusal-json.md).
// On PKP's default test dataset, OJS, context `publicknowledge`: submission 3 (in Copyediting, with
// the Copyeditor mfritz assigned). OMP and OPS have no "JATS XML" page and are skipped. The kit
// builds nothing; the only thing the walk creates is the uploaded JATS file u48r9-jats.xml.
//
// MODE=walk (default):
//   1–2. dbarnes opens submission 3
//   3.   side menu "JATS XML" (the generated XML)
//   4.   "Upload" u48r9-jats.xml; control: dbarnes presses "Download"
//   5–6. mfritz opens submission 3
//   7.   side menu "JATS XML" (the uploaded XML)
//   8.   "Download"
// MODE=neighbour, alone (with the fix in and out): what a fix must leave as it is: dbarnes's
//   "Download" of the generated XML (its name and content), and of the uploaded file (its name and
//   its bytes); mfritz's "More Information" on the uploaded file.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --apps ojs --reset
// Run (main):   PROBE_FEATURE=issues-u48r9 PROBE_AGENT=u48r9 node bin/probe.js ojs shared/playwright/checks/issues/jats-download-saves-refusal-json/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u48r9-3_5 PROBE_AGENT=u48r9 node bin/probe.js ojs shared/playwright/checks/issues/jats-download-saves-refusal-json/walk.js
// Facts: .reports/<feature>/u48r9/a11-facts-<mode>[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const H = require('./lib.js');
const U = require('../change-file-keeps-first-upload/lib.js'); // the workflow by address

const MODE = process.env.MODE || 'walk';
const SUBMISSION = 3;

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`${app.name}: no "JATS XML" page, skipped`); return; }
    const file = H.theFile();
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: SUBMISSION,
        publicationId: H.currentPublicationId(app, SUBMISSION)};
    const {page, close} = await launch(app);
    const alerts = [];
    page.on('dialog', (d) => { alerts.push({type: d.type(), message: d.message()}); d.accept().catch(() => {}); });
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 800)}; record(`a11-${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        if (alerts.length) facts[`${key}Alerts`] = alerts.splice(0);
        const shown = {...facts[key]}; delete shown.raw;
        console.log('[a11]', app.name, MODE, key, JSON.stringify(shown).slice(0, 1200));
        return facts[key];
    };
    const open = async () => {
        await page.goto('about:blank');
        await U.openWorkflow(page, app, SUBMISSION, null, 'editorial');
        return H.chooseJats(page);
    };
    try {
        // 1–3
        await signIn(page, 'dbarnes');
        await step('editorJats', open);
        record(`a11-${MODE}-3-generated`, await screen(page));
        if (MODE === 'neighbour') {
            await step('editorGeneratedDownload', async () => {
                const d = await H.download(page);
                return {...d, looksGenerated: /^jats-\d+-\d{8}-\d{6}\.xml$/.test(d.name), isXml: /<article[\s>]/.test(d.raw)};
            });
        }
        // 4
        await step('upload', () => H.upload(page, file));
        await step('editorDownload', async () => {
            const d = await H.download(page);
            return {...d, sameAsUploaded: d.raw === file.text};
        });
        record(`a11-${MODE}-4-uploaded`, await screen(page));
        // 5–7
        await signOut(page);
        await signIn(page, 'mfritz');
        await step('copyeditorJats', open);
        record(`a11-${MODE}-7-copyeditor-jats`, await screen(page));
        await shot(page, `a11-${MODE}-7-copyeditor-jats`).catch(() => {});
        if (MODE === 'neighbour') {
            await step('copyeditorMoreInformation', () => H.moreInformation(page));
        } else {
            // 8
            await step('copyeditorDownload', async () => {
                const d = await H.download(page);
                let json = null;
                try { json = JSON.parse(d.raw); } catch (e) { /* not JSON */ }
                return {...d, sameAsUploaded: d.raw === file.text, json: json ? {status: json.status, content: H.flat(json.content, 200)} : null};
            });
            const after = await screen(page);
            facts.afterDownload = {notices: after.notices, dialog: H.flat(after.text && after.text.dialog, 300)};
            record(`a11-${MODE}-8-after-download`, after);
            await shot(page, `a11-${MODE}-8-after-download`).catch(() => {});
        }
        await signOut(page).catch(() => {});
    } finally {
        for (const k of Object.keys(facts)) if (facts[k] && facts[k].raw !== undefined) delete facts[k].raw;
        record(`a11-facts-${MODE}`, facts);
        await close();
    }
});
