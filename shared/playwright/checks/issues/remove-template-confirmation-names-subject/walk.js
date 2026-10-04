// U56 A5: on "Manage Emails", "Remove" on an added template asks "Are you sure you want to delete the template
// {subject}?", quoting the template's subject where the row the manager pressed shows its name.
// Report: docs/issues/U56-A5-remove-template-confirmation-names-subject.md
// The report's steps through the screens, on PKP's default dataset (every app):
//   steps  as rvaca (the context's manager): Settings › Workflow › "Emails" › "Add and edit templates"; search
//          "Submission Declined (Pre-Review)" (on a preprint server "Submission Declined") (Enter), its "Edit"; "Add Template": Name "Short decline u56d",
//          Subject "Your submission to {$contextName}", Body "Dear author", "Save"; "Remove" on the new row: the
//          confirmation read (title, text, markup), then "Cancel".
//   nb     (the fix's neighbour, run alone with the fix in and out): in the same email's window, two added templates
//          with the same subject ("Short decline u56d", "Long decline u56d"); "Remove" on the second, its confirmation
//          read, "Remove Template": which rows stay; then the default template's name edited and "Reset" on it: the
//          Reset confirmation read, "Cancel". Each sub-step records its outcome rather than throwing.
//
//   PROBE_FEATURE=issues-u56d PROBE_AGENT=u56d node bin/probe.js all shared/playwright/checks/issues/remove-template-confirmation-names-subject/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u56d-3_5 in front; STEPS=nb runs the neighbour alone.)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const E = require('../preprint-emails-list-misses-sent-emails/lib.js');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** The email the steps open: a preprint server names its decline email "Submission Declined". */
const EMAIL = (app) => (app.name === 'ops' ? 'Submission Declined' : 'Submission Declined (Pre-Review)');
const SUBJECT = 'Your submission to {$contextName}';

/** Search the email and open its window (the email takes several templates). */
async function openEmailWindow(page, app) {
    const {m, via} = await E.openManageEmails(page, app);
    const win = await m.openMailable(EMAIL(app));
    await idle(page);
    return {m, via, win};
}

/** "Add Template", the three boxes typed, "Save"; returns the save's answer and the rows after. */
async function addTemplate(page, m, win, name) {
    await m.openAddTemplate(win);
    await m.nameBox('en').fill(name);
    await m.subjectBox('en').fill(SUBJECT);
    await m.typeBody('Dear author');
    const saved = await m.pressTemplateSave();
    const out = {status: saved.status, sawSaved: await saved.sawSaved()};
    await m.templateWindow().waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
    await m.pastSideModalCloseWindow();
    await idle(page);
    out.rows = await m.templateRowsRead(win);
    return out;
}

/** Press a row's button that opens a confirmation, and read that confirmation (title, text, the message's markup). */
async function openConfirmation(page, m, win, rowName, button, title) {
    await m.pastSideModalCloseWindow();
    await m.rowButton(m.templateRow(win, rowName), button).click();
    const d = m.confirmation(title);
    await d.waitFor({timeout: 30_000});
    const read = await d.evaluate((el) => {
        const t = (n) => (n ? n.innerText || n.textContent || '' : '').replace(/\s+/g, ' ').trim();
        const msg = [...el.querySelectorAll('div, p')].reverse().find((n) => /^Are you sure/.test(t(n)));
        return {
            heading: t(el.querySelector('h1, h2, h3')),
            message: msg ? t(msg) : null,
            messageHtml: msg ? msg.innerHTML.replace(/\s+/g, ' ').trim() : null,
            buttons: [...el.querySelectorAll('button')].map(t).filter(Boolean),
        };
    });
    return {dialog: d, read};
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
        log(name, JSON.stringify(facts[name]).slice(0, 3000));
    };
    const {page, close} = await launch(app);
    try {
        await step('steps', async () => {
            const out = {};
            // 1–3
            await signIn(page, 'rvaca');
            const {m, via, win} = await openEmailWindow(page, app);
            out.via = via;
            out.rowsBefore = await m.templateRowsRead(win);
            record('steps-3-email-window', await screen(page));
            // 4
            out.add = await addTemplate(page, m, win, 'Short decline u56d');
            record('steps-4-after-save', await screen(page));
            // 5
            const {dialog, read} = await openConfirmation(page, m, win, 'Short decline u56d', 'Remove', 'Remove Template');
            out.removeConfirmation = read;
            record('steps-5-remove-confirmation', await screen(page));
            await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
            await dialog.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
            await m.pastSideModalCloseWindow();
            out.rowsAfterCancel = await m.templateRowsRead(win);
            await signOut(page);
            return out;
        });

        await step('nb', async () => {
            const out = {};
            const sub = async (label, fn) => {
                try {
                    out[label] = await fn();
                } catch (e) {
                    out[label] = {...(out[label] || {}), failed: flat(e.message, 300)};
                }
            };
            await signIn(page, 'rvaca');
            const {m, win} = await openEmailWindow(page, app);
            const defaultName = (await m.templateRowsRead(win))[0].name;
            out.defaultName = defaultName;
            await sub('addShort', () => addTemplate(page, m, win, 'Short decline u56d'));
            await sub('addLong', () => addTemplate(page, m, win, 'Long decline u56d'));
            await sub('removeLong', async () => {
                const {dialog, read} = await openConfirmation(page, m, win, 'Long decline u56d', 'Remove', 'Remove Template');
                record('nb-remove-confirmation', await screen(page));
                const answered = page.waitForResponse((r) => /\/api\/v1\/emailTemplates\//.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000});
                await dialog.getByRole('button', {name: 'Remove Template', exact: true}).click();
                const r = await answered;
                await dialog.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                await m.pastSideModalCloseWindow();
                await idle(page);
                return {...read, deleteStatus: r.status(), deleteUrl: r.url().replace(/^.*\/api\//, '/api/'), rowsAfter: await m.templateRowsRead(win)};
            });
            await sub('editDefaultName', async () => {
                await m.openTemplate(win, defaultName);
                await m.nameBox('en').fill(`${defaultName}, edited u56d`);
                const saved = await m.pressTemplateSave();
                const o = {status: saved.status, sawSaved: await saved.sawSaved()};
                await m.templateWindow().waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                await m.pastSideModalCloseWindow();
                await idle(page);
                o.rows = await m.templateRowsRead(win);
                return o;
            });
            await sub('resetConfirmation', async () => {
                const {dialog, read} = await openConfirmation(page, m, win, `${defaultName}, edited u56d`, 'Reset', 'Reset Template');
                record('nb-reset-confirmation', await screen(page));
                await dialog.getByRole('button', {name: 'Cancel', exact: true}).click();
                await dialog.waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
                return read;
            });
            await signOut(page).catch(() => {});
            return out;
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
