// Neighbour check for fix.diff (docs/issues/U35-OJS1-editor-assigned-email-names-send-to-review.md):
// the fix rewrites only the English label in the editor assignment letter.
// dbarnes opens Settings › Workflow › Emails › "Editor Assigned (Auto)" › the
// template "Editor Assigned" › "Edit" and reads its body in English and in
// French (Canada): with the fix in, English names "Send for Review" and the
// French body is the same as with the fix out ("Envoyer en évaluation").
// OJS only (the fix touches OJS only). Run after walk.js, on the same fleet:
//   PROBE_FEATURE=issues-w40 PROBE_AGENT=w40 PROBE_RUN=<fixin|fixout> node bin/probe.js ojs shared/playwright/checks/issues/editor-assigned-email-names-send-to-review/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, shot} = require('../../../probe');

const RUN = process.env.PROBE_RUN || 'main';
const flat = (s, n = 5000) => (s == null ? s : String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n));
const sentence = (s) => ((flat(s) || '').match(/[^.]*(Send [a-z]+ Review|Envoyer[^"]*)"[^.]*\./) || [null])[0];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    const facts = {app: app.name, line: app.line, run: RUN};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const emails = new ManageEmailsPage(page, app.contextPath);
        await emails.goto();
        const {kind, window} = await emails.openEmail('Editor Assigned (Auto)');
        facts.kind = kind;
        if (kind === 'several') {
            facts.templates = (await emails.templateRowsRead(window)).map((r) => r.name);
            await emails.openTemplate(window, facts.templates[0]);
        }
        for (const locale of ['en', 'fr_CA']) {
            const html = await emails.bodyHtml(locale).catch((e) => `error: ${e.message}`);
            facts[`body.${locale}`] = sentence(html);
            console.log(`[fact] ojs ${RUN} ${locale}: ${facts[`body.${locale}`]}`);
        }
        record(`neighbour-${RUN}`, await screen(page));
        await shot(page, `neighbour-${RUN}`);
        await signOut(page);
    } finally {
        record(`neighbour-facts-${RUN}`, facts);
        await close();
    }
});
