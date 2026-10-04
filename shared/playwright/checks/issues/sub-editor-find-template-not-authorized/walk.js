// U34 A9: a sub-editor's "Find Template" in the email composer answers "You are not authorized to access the requested resource."
// The report's steps through the screens, on PKP's default dataset:
//   decision  as dbuskins (Section Editor; press: Series Editor; server: Moderator): the assigned submission (OJS 4, OMP 1,
//             OPS 1) › its decision ("Send for Review", "Send To Production", "Decline Submission") › "Find Template",
//             `declined` typed and Enter pressed; the "Error" window read and answered "OK"; the list read.
//   response  (OJS main only, the page is new on main) as dbuskins: submission 10 › Review › "Author Response" ›
//             "Request Response" › "Request Author Response" › "Find Template", `declined` typed.
//   control   as dbarnes (Journal Editor, a manager-level group): the decision steps again.
//   nb        (the fix's neighbour, run alone with the fix in and out) as dbarnes: Settings › Workflow › Emails,
//             search `declined`, open the first email, change nothing but the subject's end (" u34b") and "Save" (or
//             "Add Template" "u34b neighbour" when the email holds several): the write must still pass; then as dbuskins
//             the Emails page's address typed: it must stay refused.
//   nbmgr     (the fix's second neighbour, run alone with the fix in and out; the case pkp/pkp-lib#5504 protects) every app:
//             the context's template count (SQL, as the API's collector counts) and, as dbarnes, the decision's own
//             list before any search. OJS, OMP: rvaca (Journal/Press manager) › Settings › Users & Roles › "Roles" ›
//             "Journal editor" / "Press editor" › "Edit", "Permit changes to Settings" unticked, "OK"; then dbarnes (that
//             role) on the decision: "Find Template" `declined` + Enter, then from that page, with its CSRF token as the
//             ui-library's useFetch sends it: GET emailTemplates/{key}, POST emailTemplates (an alternate template),
//             PUT and DELETE emailTemplates/{key} (POST with X-Http-Method-Override). Writes must stay refused; reads
//             answer with the fix. OPS: the dataset's only manager role has no "Edit" (U54 A11), so counts only.
//
//   PROBE_FEATURE=issues-u34b PROBE_AGENT=u34b node bin/probe.js all shared/playwright/checks/issues/sub-editor-find-template-not-authorized/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u34b-3_5 in front; the fix trial:
//   node bin/try-fix.js apply shared/playwright/checks/issues/sub-editor-find-template-not-authorized/fix.diff, PROBE_RUN=fix.)
//   STEPS=decision,response,control is the default; STEPS=nb or STEPS=nbmgr runs a neighbour alone.
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const R = require('../own-role-ok-removes-settings-access/lib.js');

const PHRASE = 'declined';
const DECISION = {
    ojs: {id: 4, button: 'Send for Review'},
    omp: {id: 1, button: 'Send To Production'},
    ops: {id: 1, button: 'Decline Submission'},
};
const RESPONSE = {ojs: {id: 10}};
const MGR_ROLE = {ojs: 'Journal editor', omp: 'Press editor'};
const KEY = 'EDITOR_DECISION_INITIAL_DECLINE';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Type `phrase` into the composer's "Find Template" and read what follows. */
async function findTemplate(page, label) {
    const calls = [];
    const onResponse = (r) => {
        if (/\/api\/v1\/emailTemplates(\?|\/|$)/.test(r.url())) calls.push({method: r.request().method(), status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')});
    };
    page.on('response', onResponse);
    const box = page.locator('.composer__templates__search input').first();
    await box.waitFor({timeout: 30_000});
    const answered = page.waitForResponse((r) => /\/api\/v1\/emailTemplates\?/.test(r.url()), {timeout: 15_000}).catch(() => null);
    await box.fill(PHRASE);
    await box.press('Enter');
    await answered;
    await idle(page);
    await sleep(800);
    const errorDialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
    let error = null;
    if (await errorDialog.isVisible().catch(() => false)) error = flat(await errorDialog.innerText());
    record(`${label}-searched`, await screen(page));
    if (error) {
        await errorDialog.getByRole('button', {name: 'OK', exact: true}).click();
        await idle(page);
        await sleep(400);
    }
    const templates = page.locator('.composer__templates');
    const results = await templates.locator('li button').allInnerTexts().then((t) => t.map((x) => flat(x, 80)));
    const boxValue = await box.inputValue().catch(() => null);
    record(`${label}-after-ok`, await screen(page));
    page.off('response', onResponse);
    return {phrase: PHRASE, calls, error, boxAfter: boxValue, results: results.slice(0, 12), resultCount: results.length};
}

/** Submission `id`'s workflow, the decision `button`, through to the step that holds the composer. */
async function openDecision(page, app, id, button) {
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page);
    const b = page.getByRole('button', {name: button, exact: true});
    await b.waitFor({timeout: 30_000});
    await b.click();
    await page.getByRole('heading', {name: new RegExp(`^${button}(:|$)`), level: 1}).waitFor({timeout: 30_000});
    const composer = page.locator('.composer').first();
    for (let i = 0; i < 6 && !(await composer.isVisible().catch(() => false)); i++) {
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await sleep(800);
    }
    await page.locator('.composer__loadingTemplateMask').waitFor({state: 'detached', timeout: 30_000}).catch(() => {});
    await idle(page);
    const s = await screen(page);
    return {url: s.url.replace(/^https?:\/\/[^/]+/, ''), heading: flat(await page.locator('h1').first().innerText(), 80), step: flat(await page.locator('.decision__stepHeader, h2').first().innerText().catch(() => ''), 80)};
}

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const only = (process.env.STEPS || 'decision,response,control').split(',').filter(Boolean);
    const step = async (name, fn) => {
        if (!only.includes(name)) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        log(name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    try {
        await step('decision', async () => {
            const d = DECISION[app.name];
            await signIn(page, 'dbuskins');
            const out = {submission: d.id, opened: await openDecision(page, app, d.id, d.button)};
            out.search = await findTemplate(page, 'decision-dbuskins');
            await signOut(page);
            return out;
        });

        await step('response', async () => {
            const r = RESPONSE[app.name];
            if (!r || (app.line && app.line !== 'main')) return {skipped: 'no "Request Author Response" page here'};
            await signIn(page, 'dbuskins');
            await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${r.id}`));
            await idle(page);
            const btn = page.getByRole('button', {name: 'Request Response', exact: true});
            await btn.waitFor({timeout: 30_000});
            const out = {submission: r.id, enabled: await btn.isEnabled()};
            await btn.click();
            await page.getByRole('heading', {name: 'Request Author Response', level: 1}).waitFor({timeout: 30_000});
            await idle(page);
            out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
            out.search = await findTemplate(page, 'response-dbuskins');
            await signOut(page);
            return out;
        });

        await step('control', async () => {
            const d = DECISION[app.name];
            await signIn(page, 'dbarnes');
            const out = {submission: d.id, opened: await openDecision(page, app, d.id, d.button)};
            out.search = await findTemplate(page, 'decision-dbarnes');
            await signOut(page);
            return out;
        });

        await step('nb', async () => {
            const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
            const out = {};
            const writes = [];
            const onResponse = (r) => {
                const m = r.request().method();
                if (/\/api\/v1\/emailTemplates/.test(r.url()) && m !== 'GET') writes.push({method: m, override: r.request().headers()['x-http-method-override'] || null, status: r.status()});
            };
            page.on('response', onResponse);
            await signIn(page, 'dbarnes');
            const emails = new ManageEmailsPage(page, app.contextPath);
            try {
                await emails.goto();
                await emails.search(PHRASE);
                const names = await emails.rowNames();
                out.first = names[0];
                const {kind, window} = await emails.openEmail(names[0], {search: false});
                out.kind = kind;
                let form = window;
                if (kind === 'several') {
                    form = await emails.openAddTemplate(window);
                    await emails.nameBox().fill('u34b neighbour');
                    await emails.subjectBox().fill('u34b neighbour subject');
                    await emails.typeBody('u34b neighbour body');
                } else {
                    const subj = emails.subjectBox();
                    await subj.fill(`${await subj.inputValue()} u34b`);
                }
                await emails.templateSaveButton().click();
                await sleep(2000);
                await idle(page);
                out.footer = flat(await emails.templateFooter().innerText().catch(() => ''), 120);
                record('nb-dbarnes-saved', await screen(page));
            } catch (e) {
                out.dbarnesFailed = String(e.message || e).split('\n')[0];
            }
            out.writes = writes.slice();
            await signOut(page);
            await signIn(page, 'dbuskins');
            const resp = await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/manageEmails`));
            await idle(page);
            const s = await screen(page);
            record('nb-dbuskins-manageEmails', s);
            out.dbuskinsEmailsPage = {status: resp && resp.status(), title: s.title, main: flat(s.text && (s.text.main || s.text.body), 200)};
            await signOut(page);
            page.off('response', onResponse);
            return out;
        });
        await step('nbmgr', async () => {
            const d = DECISION[app.name];
            const t = app.contextTables;
            const ctx = `(select ${t.id} from ${t.table} where path = '${app.contextPath}')`;
            const out = {
                contextTemplates: sql(app, `select (select count(distinct email_key) from email_templates_default_data where email_key not in (select email_key from email_templates where context_id = ${ctx})) + (select count(*) from email_templates where context_id = ${ctx})`).trim(),
            };
            const role = MGR_ROLE[app.name];
            if (role) {
                await signIn(page, 'rvaca');
                const tab = await R.rolesTab(page, app);
                const win = await tab.openEdit(role);
                out.boxBefore = await R.boxState(win);
                await win.optionBox(R.BOX).uncheck();
                out.roleSave = await R.saveWindow(page, win);
                out.storedPermitSettings = R.stored(app, role);
                await signOut(page);
            }
            await signIn(page, 'dbarnes');
            out.opened = await openDecision(page, app, d.id, d.button);
            out.listed = await page.locator('.composer__templates li button').allInnerTexts().then((x) => x.map((y) => flat(y, 60)));
            out.search = await findTemplate(page, 'nbmgr-dbarnes');
            if (role) {
                const api = app.url(`/index.php/${app.contextPath}/api/v1/emailTemplates`);
                out.api = await page.evaluate(async ({api, key}) => {
                    const token = window.pkp && pkp.currentUser && pkp.currentUser.csrfToken;
                    const send = async (label, url, method, body) => {
                        const headers = {'X-Csrf-Token': token, 'Content-Type': 'application/json'};
                        if (method !== 'GET' && method !== 'POST') headers['X-Http-Method-Override'] = method;
                        const r = await fetch(url, {method: method === 'GET' ? 'GET' : 'POST', headers, body: body ? JSON.stringify(body) : undefined});
                        return {label, status: r.status, body: (await r.text()).slice(0, 160)};
                    };
                    return [
                        await send('GET one', `${api}/${key}`, 'GET'),
                        await send('POST add', api, 'POST', {alternateTo: key, name: {en: 'u34b nbmgr'}, subject: {en: 'u34b nbmgr'}, body: {en: 'u34b nbmgr'}}),
                        await send('PUT edit', `${api}/${key}`, 'PUT', {subject: {en: 'u34b nbmgr edited'}}),
                        await send('DELETE', `${api}/${key}`, 'DELETE'),
                    ];
                }, {api, key: KEY});
                out.afterWrites = sql(app, `select count(*) from email_templates where context_id = ${ctx}`).trim();
            }
            await signOut(page);
            return out;
        });
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('walk', facts);
        log(JSON.stringify(facts));
        await close();
    }
});
