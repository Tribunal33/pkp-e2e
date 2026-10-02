// U48 OMP1: a press's file lists offer "Send to Text Editor", whose window creates a version or does
// nothing, since a press has no "Body Text" page to send to. Report:
// docs/issues/U48-OMP1-press-send-to-text-editor-leads-nowhere.md
//
// Runs on a dataset fleet (PKP's default test dataset), freshly reset, OMP and OJS (the control):
//   npm run fleet-prep -- --feature <f> --dataset <n> --apps ojs,omp --reset
//   PROBE_FEATURE=<f> PROBE_AGENT=<a> node bin/probe.js all shared/playwright/checks/issues/press-send-to-text-editor-leads-nowhere/walk.js
// MODE=walk (default): the report's steps. MODE=nb: the neighbour check for the fix, alone: the same upload,
// the row's menu read, and on a journal the send to the existing version, which must still open "Body Text"
// with the file imported. Every screen is recorded with screen(); nothing throws on a missing control.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const FILE = 'u48r6-notes.md';
const MD = {name: FILE, mimeType: 'text/markdown', buffer: Buffer.from('# u48r6 heading\n\nA u48r6 paragraph sent to the text editor.\n')};
const PER_APP = {
    omp: {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', component: 'Book Manuscript'},
    ojs: {id: 5, title: 'Genetic transformation of forest trees', component: 'Article Text'},
};
const LIST = 'Production Ready Files';
const SEND = 'Send to Text Editor';

forEachApp(async (app) => {
    const S = PER_APP[app.name];
    if (!S) return;
    const key = MODE === 'nb' ? 'u48omp1-nb' : 'u48omp1-walk';
    const fact = (k, v) => { record(key, {[k]: v}, {merge: true}); console.log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 1500)); };
    const pubs = () => sql(app, `select publication_id, coalesce(version_stage, '-'), status from publications where submission_id = ${S.id} order by 1`);
    const {page, close} = await launch(app);
    const writes = [];
    page.on('response', (r) => {
        const m = r.request().method();
        const u = r.url();
        if (m !== 'GET' || r.status() >= 400 || /\/bodyText|\/version|importFile|pandoc/i.test(u)) writes.push({at: Date.now(), m, override: r.request().headers()['x-http-method-override'] || null, s: r.status(), url: u.replace(/^.*\/index\.php/, '').slice(0, 220)});
    });
    const since = (t0) => writes.filter((w) => w.at >= t0).map(({at, ...w}) => w);
    async function snap(name, extra = {}) {
        let sc;
        try { sc = await screen(page); } catch (e) { sc = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(sc, extra);
        record(`${key}-${name}`, sc);
        await shot(page, `${key}-${name}`).catch(() => {});
        return sc;
    }
    // After a "Confirm": where the page is, what the side menu lists, and whether a Body Text editor shows the file.
    async function afterConfirm(t0) {
        await page.waitForTimeout(1500);
        await idle(page);
        const editor = page.locator('sciflow-editor .ProseMirror').first();
        await editor.waitFor({state: 'visible', timeout: 8_000}).catch(() => {});
        let editorText = null;
        if (await editor.count()) {
            for (let i = 0; i < 40; i++) {
                editorText = L.flat(await editor.innerText().catch(() => null), 300);
                if (editorText && editorText.includes('u48r6')) break;
                await page.waitForTimeout(500);
            }
        }
        return {url: page.url().replace(/^.*\/index\.php/, ''), headings: await L.pageHeading(page), sideMenu: await L.sideMenu(page), bodyTextEditor: !!(await editor.count()), editorText, requests: since(t0), dialogsOpen: await page.locator(L.VIS).count()};
    }
    // Choose "Send to Text Editor" on the row (the menu open), read the window, pick `choice` ('existing' | 'create'), "Confirm".
    async function send(row, choice, n) {
        const out = {};
        await page.getByRole('menuitem', {name: SEND, exact: true}).first().click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="sendToVersion"]')}).last();
        await w.waitFor({timeout: L.T}).catch(() => {});
        await idle(page);
        out.window = L.flat(await w.innerText().catch(() => null), 600);
        const sel = w.locator('select[name="sendToVersion"]');
        out.options = await sel.locator('option').evaluateAll((os) => os.map((o) => ({label: o.textContent.replace(/\s+/g, ' ').trim(), value: o.value}))).catch(() => []);
        const opt = choice === 'create' ? out.options.find((o) => o.value === 'create') : out.options.find((o) => o.value && o.value !== 'create');
        if (opt) await sel.selectOption(opt.value).catch((e) => { out.selectErr = L.flat(e.message, 200); });
        out.chosen = opt ? opt.label : null;
        await page.waitForTimeout(400);
        out.fieldsAfterChoice = await w.evaluate((d) => [...d.querySelectorAll('label, legend')].filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        await snap(`${n}-window-${choice}`, {window: out});
        const t0 = Date.now();
        await w.getByRole('button', {name: 'Confirm', exact: true}).click().catch((e) => { out.confirmErr = L.flat(e.message, 200); });
        out.after = await afterConfirm(t0);
        out.publicationsAfter = pubs();
        await snap(`${n}-after-${choice}`, {after: out.after});
        return out;
    }

    try {
        // 1. Sign in as dbarnes.
        await signIn(page, 'dbarnes');
        fact('publicationsBefore', pubs());
        // 2. The submission's Production stage.
        await L.openWorkflow(page, app, S.id, 'workflow_5');
        await snap('02-production', {submission: S});
        // 3. Upload the Markdown file to "Production Ready Files".
        fact('upload', await L.uploadToList(page, LIST, MD, S.component));
        const row = L.fileRow(page, LIST, FILE);
        await row.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
        fact('rowShown', !!(await row.count()));
        await snap('03-uploaded');
        // 4. The row's "More Actions".
        const entries = await L.openRowMenu(page, row);
        fact('menu', entries);
        await snap('04-menu', {entries});
        if (!entries.includes(SEND)) {
            fact('sendOffered', false);
            await L.closeRowMenu(page, row);
            return;
        }
        fact('sendOffered', true);
        if (MODE === 'nb') {
            if (app.name === 'ojs') fact('nbSendExisting', await send(row, 'existing', '05'));
            else await L.closeRowMenu(page, row);
            return;
        }
        // 5–6. "Send to Text Editor", the existing version, "Confirm".
        fact('sendExisting', await send(row, 'existing', '05'));
        // 7. Again, "Create New Version" (back on the stage first when the send left it).
        if (!(await row.isVisible().catch(() => false))) await L.openWorkflow(page, app, S.id, 'workflow_5');
        await row.waitFor({state: 'visible', timeout: L.T}).catch(() => {});
        await L.openRowMenu(page, row);
        fact('sendCreate', await send(row, 'create', '07'));
        // 8. The side menu once the page is opened afresh.
        await L.openWorkflow(page, app, S.id, 'workflow_5');
        fact('sideMenuAfter', await L.sideMenu(page));
        await snap('08-reopened');
    } finally {
        await close();
    }
});
