// U70 claim check K4: the Catalog page's "Add Entry" panel (spec fields
// table lines 78-85), Rule 12 (adding a book publishes it), its side
// effect, Settings 6 (ORCID) and register A5; footnotes g, td13, f-a5.
//
// OMP: every phase seeds its own scratch press (tag prefix u70k4) and signs
// in as that press's own staff; OJS and OPS get the read-only control
// (manager.maya typing the Catalog page's address on publicknowledge,
// multi-app rule 4).
//
// Phases (PHASES=a,b picks; default all):
//   controls  OJS/OPS: the Catalog page's address as manager.maya (no "Add Entry")
//   panel     press A: the panel, its suggestions (stage, status, other press,
//             title / author / id), "Save" with nothing, chosen and removed,
//             closed and left with a book chosen
//   add       press A: "Save" with one book (Press manager), two books
//             (Production editor), a Copyediting book (Press editor), a book
//             dated 2030-01-01 (scheduled), then that scheduled book again;
//             workflow status, Activity Log, emails, Tasks, DOI
//   orcid     press C (ORCID on, member sandbox): unverified iD, duplicated iD,
//             verified iD, an unverified book chosen with a plain one; the
//             workflow's "Publish" on the refused books; ORCID switched off on
//             screen, then the unverified book again; the ORCID tab's place
//             and its state on a new press
//   tasks     TASKS_PRESS=<an "add" press>: its two authors' Tasks windows, read once loaded
//   twice     press T: one book chosen twice (the box still offers it), then "Save"
//   wfpub     press D (ORCID on): the workflow's own "Publish" on an unverified
//             and a duplicated iD, for the "same requirements" comparison
//
// Run: PROBE_FEATURE=U70 PROBE_AGENT=ccK4 node bin/probe.js all shared/playwright/checks/U70/K4/k4.js
// (ONLY=omp narrows; PHASES=panel,add picks). OMP may outlast 600 s: run detached
// (patterns.md "Probe kit"). Outputs: .reports/U70/ccK4/.
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'controls,panel,add,twice,orcid,wfpub').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const BOX = 'Find monographs to add to the catalog';
const FORM_ERR = 'The form was not saved because 1 error(s) were encountered. Please fix the errors marked below and try again.';

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record('facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 900)}`);
}
/** Run a step with its fact object; the object is recorded even when the step throws. */
async function step(name, fn) {
    const out = {};
    try {
        return await fn(out);
    } catch (e) {
        out.ERR = String((e && e.message) || e).split('\n').slice(0, 4).join(' | ');
        return null;
    } finally {
        if (Object.keys(out).length) fact(name, out);
    }
}
async function snap(page, name, extra = {}) {
    const s = await screen(page).catch((e) => ({screenError: String(e.message || e)}));
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

async function post(app, route, body) {
    const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey},
        body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => null);
    return {status: r.status, json};
}
async function must(app, route, body) {
    const r = await post(app, route, body);
    if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`);
    return r.json;
}
const sql = (app, q) => {
    try {
        return execFileSync('psql', ['-d', app.db, '-tA', '-F', '|', '-c', q], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
    } catch (e) {
        return `SQL ERROR ${String(e.stderr).trim()}`;
    }
};
function runJobs(app) {
    const env = {...process.env, PKP_CONFIG_FILE: app.configFile};
    for (let i = 0; i < 3; i++) {
        try {
            execFileSync('php', ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty'], {cwd: app.root, env, stdio: 'ignore', timeout: 120_000});
        } catch (e) {
            /* another feature's failing job: carry on */
        }
    }
}
async function mails(app, email) {
    const r = await fetch(`${app.mailpitUrl.replace(/\/$/, '')}/api/v1/search?query=${encodeURIComponent(`to:"${email}"`)}`);
    const j = await r.json().catch(() => null);
    return j ? {total: j.messages_count ?? j.total, subjects: (j.messages || []).map((m) => m.Subject)} : null;
}
const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);

// ---------------------------------------------------------------- the Catalog page and the panel
async function openCatalog(page, app, P) {
    await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
}
async function listTitles(page) {
    return page.locator('.listPanel__item--catalog .listPanel__itemSubtitle').allInnerTexts().then((a) => a.map((t) => flat(t, 120)));
}
const panel = (page) => page.getByRole('dialog', {name: 'Add Entry'});
const box = (page) => panel(page).getByRole('combobox', {name: BOX});
async function openPanel(page) {
    await page.getByRole('button', {name: 'Add Entry', exact: true}).click();
    await box(page).waitFor({timeout: T});
    await idle(page);
}
/** What the panel shows: chosen chips, suggestions, notices, error marks, the Save button. */
async function panelState(page) {
    const d = panel(page);
    if (!(await d.isVisible().catch(() => false))) return {open: false};
    return d.evaluate((el) => {
        const vis = (n) => !!(n && n.offsetParent !== null);
        const txt = (n) => (n ? n.innerText.replace(/\s+/g, ' ').trim() : null);
        const form = el.querySelector('form') || el;
        return {
            open: true,
            chosen: [...el.querySelectorAll('.pkpAutosuggest__selection')].map(txt),
            selectedSr: txt(el.querySelector('#addEntry-submissionIds-selected')),
            options: [...el.querySelectorAll('[role="option"]')].filter(vis).map(txt),
            listbox: vis(el.querySelector('[role="listbox"]')),
            fieldErrors: [...el.querySelectorAll('.pkpFieldError, .pkpFormField__error, [class*="FieldError"]')].filter(vis).map(txt),
            invalid: [...el.querySelectorAll('[aria-invalid="true"]')].length,
            formErrorText: [...form.querySelectorAll('.pkpFormPage__status, .pkpFormPage__footer [role="alert"], .pkpForm__errors, [role="alert"], .pkpFormPage__errors, .pkpNotification')].filter(vis).map(txt).filter(Boolean),
            formText: txt(form).slice(0, 800),
            buttons: [...el.querySelectorAll('button')].filter(vis).map((b) => ({t: (b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim(), disabled: b.disabled})),
            description: txt(el.querySelector('.pkpFormField__description')),
            requiredMark: !!el.querySelector('.pkpFormFieldLabel__required, [class*="required"]'),
        };
    });
}
async function typeInBox(page, text) {
    const b = box(page);
    await b.click();
    await b.fill('');
    const got = page.waitForResponse((r) => /\/_?submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 10_000}).catch(() => null);
    await b.pressSequentially(text, {delay: 30});
    const r = await got;
    await idle(page);
    await sleep(700);
    return {request: r ? r.url().replace(/^.*\/api\/v1/, '') : null, status: r ? r.status() : null};
}
async function choose(page, title) {
    await typeInBox(page, title);
    await panel(page).getByRole('option', {name: title}).first().click();
    await idle(page);
    await sleep(300);
}
/** Press the panel's "Save"; returns the addToCatalog response, dialogs, and the page right after. */
async function savePanel(page, dialogs) {
    const d0 = dialogs.length;
    const got = page.waitForResponse((r) => /addToCatalog/.test(r.url()), {timeout: T}).catch(() => null);
    await panel(page).getByRole('button', {name: 'Save', exact: true}).click();
    const r = await got;
    let body = null;
    try { body = r ? await r.json() : null; } catch (e) { body = null; }
    await idle(page);
    await sleep(800);
    const toast = await page.locator('.app__notifications').evaluate((el) => el.innerText.replace(/\s+/g, ' ').trim()).catch(() => null);
    let posted = null;
    try { posted = r ? decodeURIComponent(r.request().postData() || '') : null; } catch (e) { posted = r ? r.request().postData() : null; }
    const reka = await page.locator('[role="alertdialog"], [role="dialog"]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null || getComputedStyle(e).display !== 'none').map((e) => (e.getAttribute('aria-label') || (e.querySelector('h1,h2') || {}).innerText || '').trim()));
    return {
        status: r ? r.status() : null,
        method: r ? r.request().method() : null,
        methodOverride: r ? r.request().headers()['x-http-method-override'] || null : null,
        posted,
        responseKeys: body && typeof body === 'object' ? Object.keys(body) : body,
        toast,
        browserDialogs: dialogs.slice(d0),
        dialogsOnPage: reka,
        panel: await panelState(page),
        listNow: await listTitles(page),
    };
}

// ---------------------------------------------------------------- workflow reads
async function openWorkflow(page, app, P, sid) {
    await page.goto(ctxUrl(app, P, `/dashboard/editorial?workflowSubmissionId=${sid}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(600);
}
async function workflowHead(page) {
    const d = page.getByRole('dialog').last();
    const t = flat(await d.innerText().catch(() => ''), 3000);
    const status = (t.match(/Status:?\s*(Published|Scheduled|Unpublished|Queued|Declined|Incomplete|[A-Z][a-z]+)/) || [])[0] || null;
    const right = flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200);
    return {status, right, head: t.slice(0, 600)};
}
async function activityLog(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
    await dlg.getByText('Event', {exact: true}).waitFor({timeout: T});
    await idle(page);
    const lines = (await dlg.getByRole('row').allInnerTexts()).map((s) => flat(s, 200));
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(600);
    return lines;
}
async function authorTasks(page, app, P) {
    await page.goto(ctxUrl(app, P, '/dashboard/mySubmissions'));
    await idle(page);
    const btn = page.getByRole('button', {name: /Tasks/});
    const label = flat(await btn.first().innerText().catch(() => ''), 60);
    await btn.first().click().catch(() => {});
    const dlg = page.getByRole('dialog').filter({hasText: 'Tasks'});
    await dlg.first().waitFor({timeout: 10_000}).catch(() => {});
    await idle(page);
    // the list loads after the window opens: wait until it holds more than its header
    let text = '';
    for (let i = 0; i < 20; i++) {
        text = flat(await dlg.first().innerText().catch(() => ''), 900);
        if (!/Close Tasks$/.test(text)) break;
        await sleep(500);
    }
    return {label, text};
}
/** The workflow's "Publish": what its window says; closed without publishing. */
async function tryWorkflowPublish(page) {
    await page.getByRole('link', {name: 'Title & Abstract', exact: true}).last().click().catch(() => {});
    await idle(page);
    await sleep(800);
    const btn = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true});
    if (!(await btn.isVisible().catch(() => false))) return {publishButton: false};
    await btn.click();
    const dlg = page.getByRole('dialog', {name: /Schedule For Publication|Publish/}).last();
    await dlg.waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(800);
    const text = flat(await dlg.innerText().catch(() => ''), 900);
    const buttons = (await dlg.getByRole('button').allInnerTexts().catch(() => [])).map((b) => flat(b, 60)).filter(Boolean);
    return {publishButton: true, text, buttons, dlg};
}

// ---------------------------------------------------------------- settings
async function orcidTab(page, app, P, want) {
    await page.goto(ctxUrl(app, P, '/management/settings/access'));
    await idle(page);
    const tabs = (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t, 40));
    const tab = page.getByRole('tab', {name: 'ORCID', exact: true});
    await tab.waitFor({timeout: T});
    await tab.click();
    await idle(page);
    const cb = page.getByRole('checkbox', {name: /Enable ORCID functionality/}).first();
    await cb.waitFor({timeout: T});
    const before = await cb.isChecked();
    let saved = null;
    if (want !== undefined && before !== want) {
        await cb.setChecked(want);
        const tp = page.getByRole('tabpanel', {name: 'ORCID', exact: true});
        const got = page.waitForResponse((r) => /^(PUT|POST)$/.test(r.request().method()) && /\/contexts\/\d+|orcid/i.test(r.url()), {timeout: T}).catch(() => null);
        await ((await tp.count()) ? tp : page).getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await got;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        saved = r ? r.status() : null;
    }
    return {accessTabs: tabs, before, saved, after: await cb.isChecked()};
}
async function distributionTabs(page, app, P) {
    await page.goto(ctxUrl(app, P, '/management/settings/distribution'));
    await idle(page);
    return (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t, 40));
}

// ---------------------------------------------------------------- seeding
async function seedBook(app, P, key, title, extra = {}) {
    const r = await must(app, 'scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, ...extra});
    return {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status};
}
const PROD = {decisions: ['skipExternalReview', 'sendToProduction']};

// ================================================================= the drive
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const mg = await launch(app);
    const page = mg.page;
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    try {
        // ------------------------------------------------ controls (multi-app rule 4)
        if (on('controls')) {
            await step(`controls-${app.name}`, async (out) => {
                await signIn(page, 'manager.maya');
                const r = await page.goto(app.url(`/index.php/${app.contextPath}/manageCatalog`));
                await idle(page);
                const s = await snap(page, 'ctl-manageCatalog');
                Object.assign(out, {status: r ? r.status() : null, url: s.url, title: s.title, main: flat(s.text && s.text.main, 200),
                    addEntry: await page.getByRole('button', {name: 'Add Entry', exact: true}).count()});
                await signOut(page);
            });
        }
        if (!isOmp) return;

        // ------------------------------------------------ panel (lines 78-85, td13 first half, A5 nothing chosen)
        const seedA = (name) => step(name, async (out) => {
                const P = `${tag('u70k4')}a`;
                await must(app, 'scenarios/context', {
                    tag: P,
                    context: {name: {en: `K4 Press ${P}`}},
                    enableDois: true, doiPrefix: '10.12345', enabledDoiTypes: ['publication'], doiCreationTime: 'publication',
                    users: [
                        {username: `${P}mg`, roles: ['manager']}, {username: `${P}ed`, roles: ['editor']},
                        {username: `${P}pe`, roles: ['productionEditor']},
                        {username: `${P}au`, roles: ['author']}, {username: `${P}au2`, roles: ['author']},
                    ],
                });
                const b = {};
                b.prod = await seedBook(app, P, 'b1', 'K4 Lantern Production', {...PROD, participants: [{username: `${P}au2`, role: 'author'}]});
                b.copy = await seedBook(app, P, 'b2', 'K4 Lantern Copyedit', {decisions: ['skipExternalReview']});
                b.subm = await seedBook(app, P, 'b3', 'K4 Lantern Submission');
                b.review = await seedBook(app, P, 'b4', 'K4 Lantern Review', {decisions: ['sendExternalReview']});
                b.pub = await seedBook(app, P, 'b5', 'K4 Lantern Published', {...PROD, published: true});
                b.future = await seedBook(app, P, 'b6', 'K4 Lantern Future', {...PROD, datePublished: '2030-01-01'});
                b.pair1 = await seedBook(app, P, 'b7', 'K4 Lantern Pair One', PROD);
                b.pair2 = await seedBook(app, P, 'b8', 'K4 Lantern Pair Two', PROD);
                // another press, same word in the title
                const Q = `${P}q`;
                await must(app, 'scenarios/context', {tag: Q, context: {name: {en: `K4 Other ${Q}`}}, users: [{username: `${Q}au`, roles: ['author']}]});
                const f = await must(app, 'scenarios/submission', {tag: `${Q}b1`, context: Q, submitter: `${Q}au`, title: 'K4 Lantern Foreign', ...PROD});
                b.foreign = {id: f.submissionId, stageId: f.stageId};
                note(`ccK4 [omp] press ${P} (other press ${Q}), books ${JSON.stringify(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.id])))}`);
                Object.assign(out, {P, Q, b});
                return {P, Q, b};
            });

        const A1 = on('panel') ? await seedA('seedA-panel') : null;
        if (A1) {
            const {P, b} = A1;
            await step('panel', async (out) => {
                await signIn(page, `${P}mg`);
                await openCatalog(page, app, P);
                out.list0 = await listTitles(page);
                await snap(page, 'p-catalog-0');
                await openPanel(page);
                await snap(page, 'p-panel-open');
                out.open = await panelState(page);
                out.panelBox = await panel(page).evaluate((el) => {
                    const r = el.getBoundingClientRect();
                    return {x: Math.round(r.x), w: Math.round(r.width), vw: window.innerWidth};
                }).catch(() => null);
                await loc(page, 'Add Entry panel', panel(page));
                await loc(page, 'Add Entry: the "Find monographs…" box', box(page));
                await loc(page, 'Add Entry: Save', panel(page).getByRole('button', {name: 'Save', exact: true}));
                await loc(page, 'Add Entry: Close', panel(page).getByRole('button', {name: 'Close', exact: true}));

                // click without typing
                await box(page).click();
                await idle(page);
                await sleep(1000);
                out.clickNoType = await panelState(page);
                await snap(page, 'p-click-no-type');

                // "Save" with nothing chosen (A5)
                out.saveNothing = await savePanel(page, dialogs);
                await snap(page, 'p-save-nothing');
                await openCatalog(page, app, P);
                out.saveNothingReload = await listTitles(page);

                // suggestions by a word of the titles
                await openPanel(page);
                out.typeWord = {req: await typeInBox(page, 'Lantern'), state: await panelState(page)};
                await snap(page, 'p-type-lantern');
                await loc(page, 'Add Entry: a suggestion', panel(page).getByRole('option', {name: 'K4 Lantern Production'}));
                out.typeLower = {req: await typeInBox(page, 'lantern pro'), state: await panelState(page)};
                // by author name, by id, by a word only in the abstract
                out.typeAuthor = {req: await typeInBox(page, `${P}au`), state: await panelState(page)};
                await snap(page, 'p-type-author');
                out.typeId = {req: await typeInBox(page, String(b.prod.id)), state: await panelState(page)};
                await snap(page, 'p-type-id');
                out.typeAbstract = {req: await typeInBox(page, 'Seeded abstract'), state: await panelState(page)};
                out.typeOneChar = {req: await typeInBox(page, 'K'), state: await panelState(page)};

                // choose one, then type again: is the chosen book still suggested?
                await choose(page, 'K4 Lantern Production');
                out.chosen1 = await panelState(page);
                await snap(page, 'p-chosen-one');
                await loc(page, 'Add Entry: a chosen book\'s remove control', panel(page).getByRole('button', {name: 'Remove K4 Lantern Production'}));
                out.retype = {req: await typeInBox(page, 'Lantern'), state: await panelState(page)};
                await snap(page, 'p-retype-after-choose');
                // choose it again if offered
                const again = panel(page).getByRole('option', {name: 'K4 Lantern Production'});
                if (await again.count()) {
                    await again.first().click();
                    await idle(page);
                    await sleep(400);
                    out.chosenTwice = await panelState(page);
                    await snap(page, 'p-chosen-twice');
                }
                // remove it (every chip)
                const rm = panel(page).getByRole('button', {name: 'Remove K4 Lantern Production'});
                out.removeCount = await rm.count();
                while (await rm.count()) {
                    await rm.first().click();
                    await sleep(300);
                }
                out.afterRemove = await panelState(page);
                await snap(page, 'p-after-remove');
                out.retypeAfterRemove = {req: await typeInBox(page, 'Lantern'), state: await panelState(page)};

                // suggestions open, nothing chosen: "Save" (the first suggestion is highlighted)
                out.beforeTypedSave = await panelState(page);
                await snap(page, 'p-typed-not-chosen-before-save');
                out.saveTypedNotChosen = await savePanel(page, dialogs);
                await snap(page, 'p-typed-not-chosen-after-save');
                await openCatalog(page, app, P);
                out.typedNotChosenReload = await listTitles(page);
                await snap(page, 'p-typed-not-chosen-reload');
                // the same with Tab away from the box first, then "Save"
                await openPanel(page);
                await typeInBox(page, 'Lantern Pair');
                out.beforeTab = await panelState(page);
                await box(page).press('Tab');
                await sleep(500);
                out.afterTab = await panelState(page);
                await snap(page, 'p-typed-tab');

                // left with a book chosen: "Close", then reopen
                await openCatalog(page, app, P);
                await openPanel(page);
                await choose(page, 'K4 Lantern Copyedit');
                const d0 = dialogs.length;
                await panel(page).getByRole('button', {name: 'Close', exact: true}).click();
                await sleep(900);
                out.closeDialogs = dialogs.slice(d0);
                out.afterClose = {panelOpen: await panel(page).isVisible().catch(() => false), list: await listTitles(page)};
                await snap(page, 'p-closed-with-choice');
                await sleep(600);
                await openPanel(page);
                out.reopen = await panelState(page);
                await snap(page, 'p-reopen-after-close');
                // left by leaving the page with a book chosen
                if (!out.reopen.chosen.length) await choose(page, 'K4 Lantern Copyedit');
                const d1 = dialogs.length;
                await page.goto(ctxUrl(app, P, '/dashboard/editorial'));
                await idle(page);
                out.leaveDialogs = dialogs.slice(d1);
                await openCatalog(page, app, P);
                out.backList = await listTitles(page);
                await openPanel(page);
                out.reopenAfterLeave = await panelState(page);
                await snap(page, 'p-reopen-after-leave');
                // Escape closes the panel?
                await page.keyboard.press('Escape');
                await sleep(800);
                out.escapeClosesPanel = !(await panel(page).isVisible().catch(() => false));
            });
        }

        // ------------------------------------------------ add (Rule 12, the side effect, td13)
        const A2 = on('add') ? await seedA('seedA-add') : null;
        if (A2) {
            const {P, b} = A2;
            await step('add-one', async (out) => {
                runJobs(app);
                const who = ['au', 'au2', 'mg', 'ed', 'pe'];
                out.mail0 = {};
                for (const w of who) out.mail0[w] = await mails(app, `${P}${w}@mail.test`);
                await signIn(page, `${P}au`);
                out.tasks0 = await authorTasks(page, app, P);
                await signIn(page, `${P}mg`);
                await openWorkflow(page, app, P, b.prod.id);
                out.wf0 = await workflowHead(page);
                out.log0 = await activityLog(page);
                out.doi0 = sql(app, `select coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${b.prod.id}`);

                await openCatalog(page, app, P);
                await openPanel(page);
                await choose(page, 'K4 Lantern Production');
                await snap(page, 'a-chosen-before-save');
                out.save = await savePanel(page, dialogs);
                await snap(page, 'a-after-save-at-once');
                await openCatalog(page, app, P);
                out.listReload = await listTitles(page);
                await snap(page, 'a-after-save-reload');

                await openWorkflow(page, app, P, b.prod.id);
                out.wf1 = await workflowHead(page);
                await snap(page, 'a-workflow-after');
                out.log1 = await activityLog(page);
                out.db1 = sql(app, `select s.status, s.stage_id, p.status, p.date_published, p.version_stage from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${b.prod.id}`);
                out.doi1 = sql(app, `select coalesce(d.doi,'-') from publications p left join dois d on d.doi_id=p.doi_id where p.submission_id=${b.prod.id}`);
                out.jobsQueued = sql(app, `select count(*) from jobs`);
                runJobs(app);
                await sleep(1500);
                out.mail1 = {};
                for (const w of who) out.mail1[w] = await mails(app, `${P}${w}@mail.test`);
                await signIn(page, `${P}au`);
                out.tasks1 = await authorTasks(page, app, P);
                await snap(page, 'a-author-tasks');
                await signIn(page, `${P}au2`);
                out.tasks1au2 = await authorTasks(page, app, P);
                // the DOIs page
                await signIn(page, `${P}mg`);
                await page.goto(ctxUrl(app, P, '/dois'));
                await idle(page);
                await sleep(1000);
                const ds = await snap(page, 'a-dois-page');
                out.doisPage = flat(ds.text && ds.text.main, 900);
                // the dashboard's views
                await page.goto(ctxUrl(app, P, '/dashboard/editorial'));
                await idle(page);
                const dash = await snap(page, 'a-dashboard');
                out.dashboard = flat(dash.text && dash.text.main, 700);
            });

            await step('add-two-production-editor', async (out) => {
                await signIn(page, `${P}pe`);
                await openCatalog(page, app, P);
                out.list0 = await listTitles(page);
                out.addEntryShown = await page.getByRole('button', {name: 'Add Entry', exact: true}).count();
                await openPanel(page);
                await choose(page, 'K4 Lantern Pair One');
                await choose(page, 'K4 Lantern Pair Two');
                out.chosen = await panelState(page);
                await snap(page, 'a-two-chosen');
                out.save = await savePanel(page, dialogs);
                await openCatalog(page, app, P);
                out.listReload = await listTitles(page);
                await snap(page, 'a-two-reload');
                out.db = sql(app, `select s.submission_id, s.status, p.status from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id in (${b.pair1.id},${b.pair2.id})`);
            });

            await step('add-copyediting-press-editor', async (out) => {
                await signIn(page, `${P}ed`);
                await openCatalog(page, app, P);
                await openPanel(page);
                await choose(page, 'K4 Lantern Copyedit');
                out.save = await savePanel(page, dialogs);
                await openCatalog(page, app, P);
                out.listReload = await listTitles(page);
                await openWorkflow(page, app, P, b.copy.id);
                out.wf = await workflowHead(page);
                await snap(page, 'a-copyedit-workflow');
                out.log = (await activityLog(page)).slice(0, 5);
                out.db = sql(app, `select s.status, s.stage_id, p.status, p.date_published from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${b.copy.id}`);
            });

            await step('add-future', async (out) => {
                await signIn(page, `${P}mg`);
                await openCatalog(page, app, P);
                await openPanel(page);
                await choose(page, 'K4 Lantern Future');
                out.save = await savePanel(page, dialogs);
                await snap(page, 'a-future-at-once');
                await openCatalog(page, app, P);
                out.listReload = await listTitles(page);
                await snap(page, 'a-future-reload');
                await openWorkflow(page, app, P, b.future.id);
                out.wf = await workflowHead(page);
                await snap(page, 'a-future-workflow');
                out.log = (await activityLog(page)).slice(0, 5);
                out.db = sql(app, `select s.status, s.stage_id, p.status, p.date_published from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${b.future.id}`);
                runJobs(app);
                out.mailAu = await mails(app, `${P}au@mail.test`);

                // the scheduled book offered again? chosen and saved again
                await openCatalog(page, app, P);
                await openPanel(page);
                out.suggestAfter = {req: await typeInBox(page, 'Lantern'), state: await panelState(page)};
                await snap(page, 'a-suggest-after-adds');
                const opt = panel(page).getByRole('option', {name: 'K4 Lantern Future'});
                if (await opt.count()) {
                    await opt.first().click();
                    await idle(page);
                    out.saveAgain = await savePanel(page, dialogs);
                    await snap(page, 'a-future-again');
                    await openCatalog(page, app, P);
                    out.listAgain = await listTitles(page);
                    await openWorkflow(page, app, P, b.future.id);
                    out.wfAgain = await workflowHead(page);
                    out.logAgain = (await activityLog(page)).slice(0, 6);
                    out.dbAgain = sql(app, `select s.status, s.stage_id, p.status, p.date_published from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${b.future.id}`);
                }
            });
        }

        // ------------------------------------------------ tasks: an author's Tasks after an earlier "add" run (TASKS_PRESS=<press path>)
        if (on('tasks') && process.env.TASKS_PRESS) {
            await step('tasks', async (out) => {
                const P = process.env.TASKS_PRESS;
                for (const w of ['au', 'au2']) {
                    await signIn(page, `${P}${w}`);
                    out[w] = await authorTasks(page, app, P);
                    await snap(page, `a-tasks-${w}`);
                }
            });
        }

        // ------------------------------------------------ twice: one book chosen twice, then "Save"
        if (on('twice')) {
            await step('twice', async (out) => {
                const P = `${tag('u70k4')}t`;
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K4 Twice ${P}`}}, users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}]});
                const bk = await seedBook(app, P, 't1', 'K4 Twice Book', PROD);
                out.P = P;
                out.id = bk.id;
                await signIn(page, `${P}mg`);
                await openCatalog(page, app, P);
                await openPanel(page);
                await choose(page, 'K4 Twice Book');
                await choose(page, 'K4 Twice Book');
                out.chosen = (await panelState(page)).chosen;
                await snap(page, 't-chosen-twice');
                out.save = await savePanel(page, dialogs);
                await openCatalog(page, app, P);
                out.listReload = await listTitles(page);
                await openWorkflow(page, app, P, bk.id);
                out.wf = await workflowHead(page);
                out.log = (await activityLog(page)).slice(0, 6);
                out.db = sql(app, `select s.status, count(p.publication_id) from submissions s join publications p on p.submission_id=s.submission_id where s.submission_id=${bk.id} group by s.status`);
                runJobs(app);
                await sleep(1500);
                out.mailAu = await mails(app, `${P}au@mail.test`);
            });
        }

        // ------------------------------------------------ orcid (Settings 6, Rule 12's refusal, A5)
        if (on('orcid') || on('wfpub')) {
            const C = !on('orcid') ? null : await step('seedC', async (out) => {
                const P = `${tag('u70k4')}c`;
                await must(app, 'scenarios/context', {
                    tag: P, context: {name: {en: `K4 Orcid ${P}`}},
                    orcid: {enabled: true, apiType: 'memberSandbox'},
                    users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}],
                });
                const b = {};
                b.unver = await seedBook(app, P, 'c1', 'K4 Orcid Unverified', {...PROD, author: {orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: false}});
                b.ver = await seedBook(app, P, 'c2', 'K4 Orcid Verified', {...PROD, author: {orcid: 'https://orcid.org/0000-0001-5109-3700', orcidIsVerified: true}});
                b.dup = await seedBook(app, P, 'c3', 'K4 Orcid Duplicate', {...PROD, author: {orcid: 'https://orcid.org/0000-0003-1419-2405', orcidIsVerified: true}});
                b.plain = await seedBook(app, P, 'c4', 'K4 Orcid Plain', PROD);
                // a second contributor with the first one's iD (no seed key: written to the rows an import leaves)
                const aid = sql(app, `insert into authors (email, include_in_browse, publication_id, seq) values ('${P}dup@mail.test', 1, ${b.dup.pub}, 1) returning author_id`).split('\n')[0];
                out.dupAuthor = aid;
                out.dupSettings = sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) values (${aid}, 'en', 'givenName', 'Second'), (${aid}, 'en', 'familyName', 'Contributor'), (${aid}, '', 'orcid', 'https://orcid.org/0000-0003-1419-2405')`);
                out.dupCheck = sql(app, `select a.author_id, s.setting_value from authors a join author_settings s on s.author_id=a.author_id and s.setting_name='orcid' where a.publication_id=${b.dup.pub}`);
                note(`ccK4 [omp] ORCID press ${P}, books ${JSON.stringify(Object.fromEntries(Object.entries(b).map(([k, v]) => [k, v.id])))}`);
                Object.assign(out, {P, b});
                return {P, b};
            });
            if (C) {
                const {P, b} = C;
                await step('orcid-settings', async (out) => {
                    await signIn(page, `${P}mg`);
                    out.distributionTabs = await distributionTabs(page, app, P);
                    await snap(page, 'o-distribution');
                    out.orcidTab = await orcidTab(page, app, P);
                    await snap(page, 'o-orcid-tab-on');
                    await loc(page, 'Users & Roles › ORCID: "Enable ORCID functionality"', page.getByRole('checkbox', {name: /Enable ORCID functionality/}).first());
                });
                const refused = async (name, titles) => step(name, async (out) => {
                    await signIn(page, `${P}mg`);
                    await openCatalog(page, app, P);
                    out.list0 = await listTitles(page);
                    await openPanel(page);
                    for (const t of titles) await choose(page, t);
                    out.save = await savePanel(page, dialogs);
                    await snap(page, `o-${name}-at-once`);
                    // pressed again with nothing changed
                    const saveBtn = panel(page).getByRole('button', {name: 'Save', exact: true});
                    out.saveEnabledAfter = await saveBtn.isEnabled().catch(() => null);
                    await openCatalog(page, app, P);
                    out.listReload = await listTitles(page);
                    out.db = sql(app, `select s.submission_id, s.status, p.status from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id=(select press_id from presses where path='${P}') order by 1`);
                });
                await refused('unverified', ['K4 Orcid Unverified']);
                await refused('duplicate', ['K4 Orcid Duplicate']);
                await refused('unverified-with-plain', ['K4 Orcid Plain', 'K4 Orcid Unverified']);
                await step('verified', async (out) => {
                    out.jobs0 = sql(app, `select count(*) from jobs where payload like '%DepositOrcid%'`);
                    await openCatalog(page, app, P);
                    await openPanel(page);
                    await choose(page, 'K4 Orcid Verified');
                    out.save = await savePanel(page, dialogs);
                    await openCatalog(page, app, P);
                    out.listReload = await listTitles(page);
                    out.jobs1 = sql(app, `select count(*) from jobs where payload like '%DepositOrcid%'`);
                    out.orcidLog = sql(app, `select count(*) from jobs where payload like '%Orcid%'`);
                    await snap(page, 'o-verified-reload');
                });
                await step('orcid-off', async (out) => {
                    out.tab = await orcidTab(page, app, P, false);
                    await snap(page, 'o-orcid-tab-off');
                    await openCatalog(page, app, P);
                    await openPanel(page);
                    await choose(page, 'K4 Orcid Unverified');
                    out.save = await savePanel(page, dialogs);
                    await openCatalog(page, app, P);
                    out.listReload = await listTitles(page);
                    await snap(page, 'o-off-unverified-reload');
                    await openPanel(page);
                    await choose(page, 'K4 Orcid Duplicate');
                    out.saveDup = await savePanel(page, dialogs);
                    await openCatalog(page, app, P);
                    out.listReload2 = await listTitles(page);
                });
            }
            // the workflow's own "Publish" on an unverified and a duplicated iD (ORCID on), beside "Add Entry"
            if (on('wfpub')) {
                const D = await step('seedD', async (out) => {
                    const P = `${tag('u70k4')}d`;
                    await must(app, 'scenarios/context', {
                        tag: P, context: {name: {en: `K4 Orcid W ${P}`}},
                        orcid: {enabled: true},
                        users: [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}],
                    });
                    const b = {};
                    b.unver = await seedBook(app, P, 'd1', 'K4 Orcid W Unverified', {...PROD, author: {orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: false}});
                    b.dup = await seedBook(app, P, 'd2', 'K4 Orcid W Duplicate', {...PROD, author: {orcid: 'https://orcid.org/0000-0003-1419-2405', orcidIsVerified: true}});
                    const aid = sql(app, `insert into authors (email, include_in_browse, publication_id, seq) values ('${P}dup@mail.test', 1, ${b.dup.pub}, 1) returning author_id`).split('\n')[0];
                    out.dupSettings = sql(app, `insert into author_settings (author_id, locale, setting_name, setting_value) values (${aid}, 'en', 'givenName', 'Second'), (${aid}, 'en', 'familyName', 'Contributor'), (${aid}, '', 'orcid', 'https://orcid.org/0000-0003-1419-2405')`);
                    Object.assign(out, {P, b});
                    return {P, b};
                });
                if (D) {
                    for (const [k, sid] of [['unver', D.b.unver.id], ['dup', D.b.dup.id]]) {
                        await step(`workflow-publish-${k}`, async (out) => {
                            await signIn(page, `${D.P}mg`);
                            await openWorkflow(page, app, D.P, sid);
                            const r = await tryWorkflowPublish(page);
                            await snap(page, `o-workflow-publish-${k}`);
                            out.publishButton = r.publishButton;
                            out.text = r.text;
                            out.buttons = r.buttons;
                            if (r.dlg) {
                                const c = r.dlg.getByRole('button', {name: /^(Cancel|Close)$/}).first();
                                if (await c.count()) await c.click().catch(() => {});
                                await sleep(800);
                            }
                            out.db = sql(app, `select status from submissions where submission_id=${sid}`);
                        });
                    }
                }
            }
            // ORCID on a new press (created without the key), and on press A if seeded
            if (on('orcid')) await step('orcid-new-press', async (out) => {
                const P = `${tag('u70k4')}n`;
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K4 New ${P}`}}, users: [{username: `${P}mg`, roles: ['manager']}]});
                await signIn(page, `${P}mg`);
                out.distributionTabs = await distributionTabs(page, app, P);
                out.orcidTab = await orcidTab(page, app, P);
                await snap(page, 'o-orcid-tab-new-press');
                out.siteOrcid = sql(app, `select setting_name, setting_value from site_settings where setting_name ilike '%orcid%'`);
            });
        }
    } finally {
        await mg.close();
        console.log(`[k4] browser dialogs: ${JSON.stringify(dialogs).slice(0, 600)}`);
    }
});
