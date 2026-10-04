// Issue report docs/issues/U56-A10-french-submission-confirmation-names-journal.md (U56 A10): on a press and a
// preprint server the French submission confirmation is a journal's text ("à la revue", "notre revue"; on a
// server nothing of the moderator), and the French "Manage Emails" describes it, and "Création de
// l'utilisateur-trice", with "la revue".
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default test dataset,
// all three apps (the journal is the control):
//   author   (steps 1-6) the dataset's author account (OJS and OPS `ccorino`, OMP `aclark`) switches to
//            "Français", makes a submission in French ("u56e Soumission en français") and submits it; the newest
//            email to the author's address is read.
//   manager  (steps 7-10) `rvaca`: Settings › Workflow › "Emails" › "Add and edit templates"; "Edit" on
//            "Submission Confirmation" (OPS "Submission Acknowledgement (Pending Moderation)"), "French",
//            the French name, subject and body; then "Change Language" › "Français" and the list's rows.
//   nb       the fix's neighbour, run alone with the fix in and out: the same email's English template, every
//            row of the French and the English list, and every stored default template (key, locale, name,
//            hashes of subject and body), so the two runs show what the fix changes and nothing else.
// STEPS=author,manager (default) or STEPS=nb.
//
// Reset first:  PATH=<psql 16+>:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-submission-confirmation-names-journal/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trial:    fix.diff applied, the fleet reset, then the stored French template replayed from the patched
//               files as an install writes it, in each app root:
//               PKP_CONFIG_FILE=$PWD/config.test.ds<n>.inc.php php lib/pkp/tools/installEmailTemplate.php SUBMISSION_ACK fr_CA
//               then PROBE_RUN=fix (steps), nb-in / nb-out (STEPS=nb) with the fix in and out.
// Records each screen and the facts (facts[-<run>]-<app>.json); asserts nothing.
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, drainJobs} = require('../../../probe');
const E = require('../preprint-emails-list-misses-sent-emails/lib.js');
const L = require('./lib.js');

const {flat} = L;
const ACK = {ojs: 'Submission Confirmation', omp: 'Submission Confirmation', ops: 'Submission Acknowledgement (Pending Moderation)'};
const FR_ROWS = [/^Confirmation de soumission$/, /^Création de l'utilisateur-trice$/];

/** "Edit" on the confirmation's row, the window's English and (after "French") French fields, then the back arrow. */
async function readTemplate(page, app, m, label) {
    const name = ACK[app.name];
    const {kind, window} = await m.openEmail(name);
    const out = {row: name, kind, window: flat(await window.getByRole('heading').first().innerText().catch(() => ''), 80)};
    out.en = {name: await m.nameBox('en').inputValue(), subject: await m.subjectBox('en').inputValue(), body: flat(await m.bodyHtml('en'), 3000)};
    const fr = m.languageButton('French');
    out.languageButton = await fr.isVisible().catch(() => false);
    if (out.languageButton) {
        await fr.click();
        await m.nameBox('fr_CA').waitFor({timeout: L.T});
        out.fr = {name: await m.nameBox('fr_CA').inputValue(), subject: await m.subjectBox('fr_CA').inputValue(), body: flat(await m.bodyHtml('fr_CA'), 3000)};
    }
    record(`${label}-template`, await screen(page));
    await m.closeWindow(window);
    return out;
}

/** The list's rows, all of them (name and description). */
async function listRows(m) {
    await m.waitForList();
    return (await m.rowsRead()).map((r) => ({name: r.name, description: flat(r.description, 600)}));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'main'};
    const only = (process.env.STEPS || 'author,manager').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (!only.includes(name)) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {...(facts[name] || {}), failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
            await L.snap(page, `${name}-error`);
        }
        console.log(`[${app.name}] ${name}: ${JSON.stringify(facts[name]).slice(0, 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // Steps 1-6.
        await step('author', async () => {
            const user = L.AUTHOR[app.name];
            const out = {user};
            await signIn(page, user);
            await page.goto(app.url(`/index.php/${app.contextPath}${L.seg(app, 'en')}/dashboard/mySubmissions`)).catch(() => {});
            await idle(page);
            await L.changeLanguage(page, 'français', 'fr_CA');
            out.language = {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            const begun = await L.beginSubmission(page, app, {title: 'u56e Soumission en français', locale: 'fr_CA', ui: 'fr_CA'});
            out.id = begun.id;
            out.offered = begun.offered;
            out.wizard = await L.toLastStep(page, app, {locale: 'fr_CA'});
            await L.snap(page, 'author-last-step');
            const since = new Date();
            out.submitted = await L.submitAndConfirm(page);
            await L.snap(page, 'author-complete');
            const to = `${user}@mailinator.com`;
            let msg = await app.mail.find({to, since, timeoutMs: 20_000}).catch(() => null);
            if (!msg) {
                await drainJobs(app).catch(() => {});
                msg = await app.mail.find({to, since, timeoutMs: 20_000}).catch(() => null);
            }
            out.mail = msg ? await L.readMail(app, msg) : null;
            out.revue = out.mail ? (out.mail.text.match(/[^.:]*\brevue\b[^.:]*/g) || []).map((s) => flat(s, 200)) : null;
            out.log = sql(app, `select subject from email_log where assoc_id = ${Number(out.id) || 0} order by log_id`).split('\n');
            record('author-mail', out.mail || {none: true});
            await signOut(page);
            return out;
        });

        // Steps 7-10.
        await step('manager', async () => {
            await signIn(page, 'rvaca');
            const {m, via} = await E.openManageEmails(page, app);
            const out = {via};
            out.template = await readTemplate(page, app, m, 'manager');
            await L.changeLanguage(page, 'français', 'fr_CA');
            out.frUrl = page.url().replace(/^https?:\/\/[^/]+/, '');
            const rows = await listRows(m);
            record('manager-fr-list', await screen(page));
            out.frRows = FR_ROWS.map((re) => rows.find((r) => re.test(r.name)) || {missing: String(re)});
            out.frRowsWithRevue = rows.filter((r) => /\brevue\b/.test(`${r.name} ${r.description}`)).map((r) => r.name);
            out.frCount = rows.length;
            await signOut(page);
            return out;
        });

        // The neighbour (STEPS=nb, alone).
        await step('nb', async () => {
            await signIn(page, 'rvaca');
            const {m} = await E.openManageEmails(page, app);
            const out = {};
            out.enRows = await listRows(m);
            out.template = await readTemplate(page, app, m, 'nb');
            await L.changeLanguage(page, 'français', 'fr_CA');
            out.frRows = await listRows(m);
            out.stored = sql(app, 'select email_key, locale, name, md5(subject), md5(body) from email_templates_default_data order by 1, 2').split('\n');
            record('nb-facts', out);
            await signOut(page);
            return {enCount: out.enRows.length, frCount: out.frRows.length, storedCount: out.stored.length, template: out.template};
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
