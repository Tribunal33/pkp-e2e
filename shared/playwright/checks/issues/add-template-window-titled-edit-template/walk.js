// U56 A4: on "Manage Emails", "Add Template" in an email's window opens an empty form titled "Edit Template",
// the title of the window that edits an existing template.
// The report's steps through the screens, on PKP's default dataset (every app):
//   steps  as rvaca (the context's manager): Settings › Workflow › "Emails" › "Add and edit templates"; search
//          "Submission Declined (Pre-Review)" (Enter); its "Edit"; "Add Template": the window's title (heading and the
//          dialog's accessible name), fields and buttons read; Name/Subject/Body typed, "Save"; then "Edit" on the
//          "Default" row (the control).
//   nb     (the fix's neighbour, run alone with the fix in and out): in the same email's window, "Edit" on "Default",
//          back, "Add Template", back, "Edit" on "Default" again. Each window's title is recorded; nothing is saved.
//   nb1    (the same, run alone): "Edit" on the one-template email "Submission Confirmation" ("Submission Acknowledgement (Pending
//          Moderation)" on a preprint server), which opens the
//          template window straight away.
//
//   PROBE_FEATURE=issues-u56c PROBE_AGENT=u56c node bin/probe.js all shared/playwright/checks/issues/add-template-window-titled-edit-template/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u56c-3_5 in front; STEPS=nb or STEPS=nb1 runs a neighbour alone.)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const E = require('../preprint-emails-list-misses-sent-emails/lib.js');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** The email searched in step 3: a preprint server names it "Submission Declined" (ops locale/en/manager.po). */
const EMAIL = (app) => (app.name === 'ops' ? 'Submission Declined' : 'Submission Declined (Pre-Review)');
/** The one-template email of the nb1 neighbour (a preprint server's name from ops locale/en/manager.po). */
const ONE = (app) => (app.name === 'ops' ? 'Submission Acknowledgement (Pending Moderation)' : 'Submission Confirmation');

/** The top window: its accessible name, its heading, its field labels and buttons, and its text. */
async function readWindow(page) {
    const d = page.getByRole('dialog').last();
    await d.waitFor({timeout: 30_000});
    return d.evaluate((el) => {
        const t = (n) => (n ? n.innerText || n.textContent || '' : '').replace(/\s+/g, ' ').trim();
        const ids = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
        return {
            accessibleName: ids.map((i) => t(document.getElementById(i))).join(' ') || el.getAttribute('aria-label'),
            heading: t(el.querySelector('h1, h2')),
            labels: [...el.querySelectorAll('label, legend')].map(t).filter(Boolean).slice(0, 12),
            values: [...el.querySelectorAll('input[type="text"], input:not([type])')].map((i) => `${i.name}=${i.value}`),
            buttons: [...el.querySelectorAll('button')].map(t).filter(Boolean).slice(0, 20),
            text: t(el).slice(0, 700),
        };
    });
}

/** Search the email and open its window (the email takes several templates). */
async function openEmailWindow(page, app) {
    const {m, via} = await E.openManageEmails(page, app);
    await m.search(EMAIL(app));
    await idle(page);
    const win = await m.openMailable(EMAIL(app));
    return {m, via, win};
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || 'main'};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const only = (process.env.STEPS || 'steps').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (!only.includes(name)) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {...(facts[name] || {}), failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        log(name, JSON.stringify(facts[name]).slice(0, 2500));
    };
    const {page, close} = await launch(app);
    try {
        await step('steps', async () => {
            const out = {};
            await signIn(page, 'rvaca');
            const {m, via, win} = await openEmailWindow(page, app);
            out.via = via;
            out.emailWindow = await readWindow(page);
            out.rowsBefore = await m.templateRowsRead(win);
            record('steps-4-email-window', await screen(page));
            // 5–6: "Add Template"
            await m.openAddTemplate(win);
            out.addWindow = await readWindow(page);
            out.addBodyEmpty = flat(await m.bodyHtml('en').catch(() => null), 100);
            record('steps-6-add-window', await screen(page));
            // 7: fill and save
            await m.nameBox('en').fill('Short decline u56c');
            await m.subjectBox('en').fill('A short decline');
            await m.typeBody('Dear author');
            const saved = await m.pressTemplateSave();
            out.save = {status: saved.status, sawSaved: await saved.sawSaved()};
            await m.templateWindow().waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
            await m.pastSideModalCloseWindow();
            await idle(page);
            out.rowsAfter = await m.templateRowsRead(win);
            record('steps-7-after-save', await screen(page));
            // 8: control, "Edit" on the default row
            const defaultName = out.rowsBefore[0] && out.rowsBefore[0].name;
            await m.openTemplate(win, defaultName);
            out.editDefault = await readWindow(page);
            record('steps-8-edit-default', await screen(page));
            await m.closeWindow(m.templateWindow());
            await signOut(page);
            return out;
        });

        await step('nb', async () => {
            const out = {};
            await signIn(page, 'rvaca');
            const {m, win} = await openEmailWindow(page, app);
            const defaultName = (await m.templateRowsRead(win))[0].name;
            const take = async (label, open) => {
                try {
                    await open();
                    out[label] = await readWindow(page);
                    out[label].nameValue = await m.nameBox('en').inputValue().catch(() => null);
                    record(`nb-${label}`, await screen(page));
                    await m.closeWindow(m.templateWindow());
                } catch (e) {
                    out[label] = {failed: flat(e.message, 300)};
                }
            };
            await take('editDefault1', () => m.openTemplate(win, defaultName));
            await take('add', () => m.openAddTemplate(win));
            await take('editDefault2', () => m.openTemplate(win, defaultName));
            await m.closeWindow(win).catch(() => {});
            await signOut(page);
            return out;
        });

        await step('nb1', async () => {
            const out = {};
            await signIn(page, 'rvaca');
            const {m} = await E.openManageEmails(page, app);
            await m.search(ONE(app));
            await idle(page);
            try {
                const {kind} = await m.openEmail(ONE(app), {search: false});
                out.oneTemplate = {kind, ...(await readWindow(page))};
                out.oneTemplate.nameValue = await m.nameBox('en').inputValue().catch(() => null);
                record('nb-one-template', await screen(page));
                await m.closeWindow(m.templateWindow());
            } catch (e) {
                out.oneTemplate = {failed: flat(e.message, 300)};
            }
            await signOut(page);
            return out;
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
