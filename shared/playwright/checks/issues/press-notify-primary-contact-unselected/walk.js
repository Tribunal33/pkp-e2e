// Walk of U56 OMP2 (issue report docs/issues/U56-OMP2-press-notify-primary-contact-unselected.md):
// Settings › Workflow › "Emails", "Notify Primary Contact" read as it opens, on the dataset's context as
// `rvaca`, then after a "Save" with nothing changed; then on a context `admin` creates on screen.
// Run on all three apps (a journal and a preprint server are the comparison), on PKP's default test
// dataset, fleet reset first:
//   PROBE_FEATURE=issues-u56g PROBE_AGENT=u56g node bin/probe.js all shared/playwright/checks/issues/press-notify-primary-contact-unselected/walk.js
// MODE=neighbour (the fix's neighbour check, alone): as `rvaca`, pick "Yes, send a copy to …" and save;
// under PROBE_RUN=nb-in the proposed migration then runs (inapp.php migrate, fix applied); after a
// reload "Yes" must still be selected, with one stored row.
const {forEachApp, launch, signIn, signOut, screen, record, sql} = require('../../../probe');
const H = require('./lib.js');
const E = require('../emails-confirmation-off-shows-unselected/lib.js');

const MODE = process.env.MODE || 'walk';
const RUN = process.env.PROBE_RUN || 'main';

/** The stored rows of the setting for a context id, each value in brackets; none when there is no row. */
async function stored(app, contextId = 1) {
    const t = app.contextTables;
    const out = await sql(app, `SELECT '[' || COALESCE(setting_value, 'NULL') || ']' FROM ${t.settings} WHERE ${t.id} = ${contextId} AND setting_name = '${H.NAME}'`);
    return String(out || '').split('\n').map((l) => l.trim()).filter(Boolean);
}

/** What the form's save sends for the setting (the PUT's body), caught while `fn` runs. */
async function sentWith(page, fn) {
    let sent;
    const on = (req) => {
        if (/\/api\/v1\/contexts\/\d+/.test(req.url()) && req.method() !== 'GET') {
            // the form posts form-encoded fields
            const body = new URLSearchParams(req.postData() || '');
            sent = body.has(H.NAME) ? JSON.stringify(body.get(H.NAME)) : '(not sent)';
        }
    };
    page.on('request', on);
    const status = await fn();
    page.off('request', on);
    return {status, sent};
}

async function walk(app, page, facts) {
    // The context as the dataset holds it
    await signIn(page, 'rvaca');
    const p = E.emailsPage(page, app);
    await p.goto();
    facts.storedBefore = await stored(app);
    facts.opened = await H.readPrimaryContact(p);
    record('omp2-1-opened', await screen(page));

    // A "Save" with nothing changed
    facts.saveUnchanged = await sentWith(page, () => p.pressSave());
    await page.reload();
    await p.openTab();
    facts.afterSave = await H.readPrimaryContact(p);
    facts.storedAfterSave = await stored(app);
    record('omp2-2-after-save', await screen(page));
    await signOut(page);

    // A new context created on screen
    await signIn(page, 'admin');
    const ctx = {name: `u56g ${H.LABELS[app.name].noun}`, initials: 'u56g', path: `u56g${H.LABELS[app.name].noun.toLowerCase()}`, email: 'u56g@example.com'};
    facts.created = {...ctx, status: await H.createContext(page, app, ctx)};
    const id = String(await sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${ctx.path}'`)).trim();
    const L = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    const {WorkflowEmailsSettingsPage} = require('../../../pages/EmailsPages.js');
    const q = new WorkflowEmailsSettingsPage(page, `${ctx.path}${L}`);
    await q.goto();
    facts.newContext = {id, stored: await stored(app, id), ...(await H.readPrimaryContact(q))};
    record('omp2-3-new-context', await screen(page));
    await signOut(page);

    facts.observed = {
        datasetContextSelected: facts.opened.selected,
        afterSaveSelected: facts.afterSave.selected,
        newContextSelected: facts.newContext.selected,
    };
}

async function neighbour(app, page, facts) {
    await signIn(page, 'rvaca');
    const p = E.emailsPage(page, app);
    await p.goto();
    facts.opened = await H.readPrimaryContact(p);
    await H.pickPrimaryContact(p, 'Yes');
    facts.saveYes = await sentWith(page, () => p.pressSave());
    facts.storedAfterYes = await stored(app);
    if (RUN === 'nb-in') facts.migrate = H.inApp(app, 'migrate').trim();
    facts.storedAfterMigrate = await stored(app);
    await page.reload();
    await p.openTab();
    facts.afterReload = await H.readPrimaryContact(p);
    record('omp2-nb-after-reload', await screen(page));
    await signOut(page);
    facts.observed = {yesKept: /^Yes/.test(facts.afterReload.selected || ''), rows: facts.storedAfterMigrate.length};
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: RUN};
    const {page, close} = await launch(app);
    try {
        await (MODE === 'neighbour' ? neighbour : walk)(app, page, facts);
    } catch (e) {
        facts.error = String((e && e.stack) || e).slice(0, 1500);
        record(`omp2-${MODE}-error`, await screen(page).catch(() => null));
    } finally {
        record(`omp2-${MODE}-facts`, facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
