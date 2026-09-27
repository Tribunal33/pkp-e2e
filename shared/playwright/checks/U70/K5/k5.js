// U70 claim check K5: the "Catalog Entry" page (spec fields lines 86-98),
// Rules 13-14 (the page's save and its fields; the Production stage's
// "Catalog Management" notice), the page's side effect (Activity Log),
// Settings 4 (cover size) and 7 ("Permit submission metadata edit."), and
// register A2 and A6; footnotes h, d, e, td3, td14, td15, f-a2, f-a6.
//
// OMP: every phase seeds its own scratch press (tag prefix u70k5) and signs
// in as that press's own staff. OJS and OPS get the read-only control: a
// scratch journal / server with one published item, whose workflow lists no
// "Catalog Entry" and whose Production stage shows no "Catalog Management"
// (multi-app rule 4).
//
// Phases (PHASES=a,b picks; default all):
//   controls  OJS/OPS: the workflow's publication pages and Production notices
//   page      press A: the page's groups, fields, series list (order, inactive),
//             Update Type, Insert Content, Save (td3), Activity Log, date
//             refusals, leaving unsaved; 13a series on a published book (series
//             page, Catalog "Filters"), 13b Series Position and a series ordered
//             by it
//   order     press O: the "Series" list before and after the Series tab's
//             "Order"; the staff Catalog page and the readers' series page
//             under each series "Order of monographs"; "Insert Content" settled
//   again     press G: second runs of one-run facts (a saved date and the
//             Production notice; the cover on the book page; a size change's
//             effect on an existing small copy)
//   url       press B (no categories) + press B2: td14 URL Path refusals, the
//             accepted path, the public address
//   cover     press C: Cover Image upload / alt text / reload / public pages,
//             Settings 4 both ends, Remove; press D (two metadata languages)
//   notice    press N: td15, Rule 14, A2, A6, 13d (empty, past, future date)
//   roles     press R: who sees "Catalog Entry" and "Save" (td3's Layout
//             editor both ends, Series editor, Press editor, Production editor,
//             admin, Author); Settings 7 on screen
//   versions  press V: each version has its own Catalog Entry
//
// Run: PROBE_FEATURE=U70 PROBE_AGENT=ccK5 node bin/probe.js all shared/playwright/checks/U70/K5/k5.js
// (ONLY=omp narrows; PHASES=page,url picks). OMP outlasts 600 s: run detached
// (patterns.md "Probe kit"). Outputs: .reports/U70/ccK5/. Phases run in
// parallel processes set FACTS=<name> each, so their merged facts files do
// not overwrite one another.
const path = require('path');
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const PHASES = (process.env.PHASES || 'controls,page,order,again,url,cover,notice,roles,versions').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const REPO = path.join(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const SUCCESS = 'The catalog entry details have been updated.';

const facts = {};
function fact(key, value) {
    facts[key] = value;
    record(process.env.FACTS || 'facts', {[key]: value}, {merge: true});
    console.log(`[fact] ${key}: ${JSON.stringify(value).slice(0, 1500)}`);
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
const ctxUrl = (app, P, p = '') => app.url(`/index.php/${P}${p}`);
/** PNG width x height of a public file, read from the server (no browser cache). */
async function pngSize(url) {
    try {
        const r = await fetch(url);
        const b = Buffer.from(await r.arrayBuffer());
        if (r.status !== 200) return {status: r.status};
        if (b.slice(1, 4).toString() !== 'PNG') return {status: r.status, notPng: true, bytes: b.length};
        return {status: r.status, w: b.readUInt32BE(16), h: b.readUInt32BE(20)};
    } catch (e) {
        return {error: String(e.message || e)};
    }
}
function today() {
    const now = new Date();
    return {local: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, utc: now.toISOString().slice(0, 10)};
}

// ---------------------------------------------------------------- the workflow
async function openWorkflow(page, app, P, sid, {menuKey, author} = {}) {
    const dash = author ? 'mySubmissions' : 'editorial';
    await page.goto(ctxUrl(app, P, `/dashboard/${dash}?workflowSubmissionId=${sid}${menuKey ? `&workflowMenuKey=${menuKey}` : ''}`));
    await idle(page);
    await page.locator('[data-cy="workflow-controls-left"], [role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(500);
}
/** The workflow's side menu, entries in order with their levels (WorkflowPage.menuEntries). */
async function menu(page, P) {
    const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
    try {
        return (await new WorkflowPage(page, P).menuEntries()).map((e) => `${'  '.repeat((e.level || 1) - 1)}${e.label}${e.selected ? ' *' : ''}`);
    } catch (e) {
        return [`menu read failed: ${String(e.message).split('\n')[0]}`];
    }
}
async function heading(page) {
    return flat(await page.getByRole('heading', {name: /^(Publication|Preprint|Workflow): /}).first().innerText({timeout: 5000}).catch(() => null), 120);
}
async function workflowHead(page) {
    const right = flat(await page.locator('[data-cy="workflow-controls-right"]').innerText().catch(() => ''), 200);
    const left = flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''), 300);
    return {left, right};
}
async function activityLog(page) {
    await page.getByRole('button', {name: 'Activity Log', exact: true}).click();
    const dlg = page.getByRole('dialog').filter({hasText: 'Activity Log & Notes'});
    await dlg.getByText('Event', {exact: true}).waitFor({timeout: T});
    await idle(page);
    const lines = (await dlg.getByRole('row').allInnerTexts()).map((s) => flat(s, 200));
    await dlg.getByRole('button', {name: 'Close', exact: true}).first().click();
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(700);
    return lines;
}
const countLines = (lines, re) => lines.filter((l) => re.test(l)).length;
async function publish(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: /Schedule For Publication/}).last();
    await dlg.waitFor({timeout: T});
    await idle(page);
    const text = flat(await dlg.innerText(), 500);
    const done = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Publish', exact: true}).click();
    const r = await done;
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, text, head: await workflowHead(page)};
}
async function unpublish(page) {
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).click();
    const dlg = page.getByRole('dialog', {name: 'Unpublish', exact: true});
    await dlg.waitFor({timeout: T});
    const done = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
    await dlg.getByRole('button', {name: 'Unpublish', exact: true}).click();
    const r = await done;
    await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Publish', exact: true}).waitFor({timeout: T}).catch(() => {});
    await idle(page);
    return {status: r ? r.status() : null, head: await workflowHead(page)};
}

// ---------------------------------------------------------------- the Production stage's notice
const PRODUCTION = 'workflow_5';
async function production(page, app, P, sid, name, {author} = {}) {
    await openWorkflow(page, app, P, sid, {menuKey: PRODUCTION, author});
    await page.getByRole('heading', {name: 'Workflow: Production'}).first().waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(800);
    const s = await snap(page, name);
    const region = page.locator('[data-cy="workflow-primary-items"]').first();
    const data = await region.evaluate((r) => {
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        const heads = [...r.querySelectorAll('h1,h2,h3,h4')].map((h) => txt(h));
        const cm = [...r.querySelectorAll('h1,h2,h3,h4')].find((h) => /Catalog Management|Awaiting approval/.test(h.innerText));
        let before = [];
        if (cm) {
            // every link or button that comes before the notice box in the page order
            before = [...document.querySelectorAll('a, button')].filter((el) => el.getClientRects().length && (el.compareDocumentPosition(cm) & Node.DOCUMENT_POSITION_FOLLOWING) && r.contains(el)).map((el) => txt(el) || el.getAttribute('aria-label'));
        }
        return {headings: heads, notice: cm ? txt(cm.parentElement) : null, noticeLinks: cm ? [...cm.parentElement.querySelectorAll('a')].map((a) => ({t: txt(a), h: a.getAttribute('href')})) : [], linksAboveInRegion: before, regionText: txt(r).slice(0, 1200)};
    }).catch((e) => ({err: String(e.message || e)}));
    return {url: s.url, heading: await heading(page), ...data, head: await workflowHead(page)};
}

// ---------------------------------------------------------------- the Catalog Entry page
const entryKey = (pub) => `publication_${pub}_catalogEntry`;
const urlBox = (page) => page.locator('input[name="urlPath"]');
const entryForm = (page) => page.locator('form').filter({has: page.locator('input[name="urlPath"]')}).first();
async function openEntry(page, app, P, sid, pub, {author} = {}) {
    await openWorkflow(page, app, P, sid, {menuKey: entryKey(pub), author});
    await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(600);
}
/** The page as data: groups, fields, buttons, errors, top notices. */
async function readEntry(page) {
    return page.evaluate(() => {
        const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
        const vis = (e) => !!e.getClientRects().length;
        const input = document.querySelector('input[name="urlPath"]');
        const form = input ? input.closest('form') : null;
        if (!form) return {form: false};
        const field = (f) => ({
            label: txt(f.querySelector('.pkpFormFieldLabel, legend')),
            description: txt(f.querySelector('.pkpFormField__description')),
            inputs: [...f.querySelectorAll('input:not([type=hidden]), select, textarea')].map((i) => ({name: i.name, type: i.type, visible: vis(i), disabled: i.disabled || i.readOnly || undefined,
                value: i.tagName === 'SELECT' ? (i.options[i.selectedIndex] || {}).text : i.type === 'file' ? undefined : i.value,
                options: i.tagName === 'SELECT' ? [...i.options].map((o) => o.text) : undefined})),
            buttons: [...f.querySelectorAll('button')].filter(vis).map((b) => txt(b) || b.getAttribute('aria-label')),
            imgs: [...f.querySelectorAll('img')].filter(vis).map((i) => ({src: (i.getAttribute('src') || '').replace(/^.*\/public\//, 'public/'), alt: i.alt})),
            errors: [...f.querySelectorAll('.pkpFormFieldError, .pkpFieldError, [class*="FieldError"], [class*="field-error"]')].filter(vis).map(txt).filter(Boolean),
        });
        const groups = [...form.querySelectorAll('.pkpFormGroup')].filter(vis).map((g) => ({
            heading: txt(g.querySelector('.pkpFormGroup__heading, .pkpFormGroup__label, legend, h2, h3')),
            fields: [...g.querySelectorAll(':scope .pkpFormField')].filter((f) => vis(f) && !f.parentElement.closest('.pkpFormField')).map(field),
        }));
        const top = [...document.querySelectorAll('.pkpFormErrors, .pkpFormPage__errors, [role="alert"], .pkpFormPage__status, [role="status"]')].filter(vis).map(txt).filter(Boolean);
        return {
            groups,
            formButtons: [...form.querySelectorAll('button')].filter(vis).map((b) => ({t: txt(b) || b.getAttribute('aria-label'), disabled: b.disabled})),
            localeButtons: [...form.querySelectorAll('.pkpFormLocales button, [class*="Locales"] button')].filter(vis).map(txt),
            top,
            formTextTail: txt(form).slice(-400),
        };
    });
}
/** Press the page's "Save"; the response, and every message seen during the next 4 s. */
async function saveEntry(page) {
    const resp = page.waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await entryForm(page).getByRole('button', {name: 'Save', exact: true}).click();
    const r = await resp;
    const seen = new Set();
    let success = false;
    for (let i = 0; i < 16; i++) {
        const got = await page.evaluate((S) => {
            const txt = (e) => (e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null);
            const vis = (e) => !!e.getClientRects().length;
            const msgs = [...document.querySelectorAll('.pkpFormErrors, .pkpFormPage__errors, [role="alert"], .pkpFormPage__status, [role="status"], .app__notifications, .pkpNotification, [class*="toast"], [class*="Toast"]')].filter(vis).map(txt).filter(Boolean);
            return {msgs, success: document.body.innerText.includes(S)};
        }, SUCCESS);
        got.msgs.forEach((m) => seen.add(m.slice(0, 300)));
        success = success || got.success;
        await sleep(250);
    }
    await idle(page);
    let body = null;
    if (r) body = await r.json().catch(() => null);
    return {status: r ? r.status() : null, method: r ? r.request().method() : null, messages: [...seen], successTextSeen: success, errors: body && r.status() >= 400 ? body : undefined, dialogs: (await page.locator('[role="dialog"]:visible').allInnerTexts().catch(() => [])).map((d) => flat(d, 150)).slice(1)};
}
async function typeUrl(page, value) {
    await urlBox(page).fill(value);
    const s = await saveEntry(page);
    const f = await readEntry(page);
    const access = (f.groups || []).find((g) => /Access/.test(g.heading || '')) || null;
    return {value, save: s, fieldErrors: access ? access.fields.map((x) => x.errors).flat() : null, top: f.top};
}
/** The TinyMCE box of a field whose label starts with `label` (first = submission language). */
async function typeRich(page, label, text) {
    const f = page.locator('.pkpFormField').filter({has: page.locator('.pkpFormFieldLabel').filter({hasText: new RegExp(`^\\s*${label}`)})}).first();
    await page.waitForFunction(() => window.tinymce && window.tinymce.editors && window.tinymce.editors.length && window.tinymce.editors.every((e) => e.initialized), null, {timeout: 15_000}).catch(() => {});
    const body = f.frameLocator('iframe').first().locator('body');
    await body.click();
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text, {delay: 15});
    await body.blur().catch(() => {});
    await sleep(400);
}
async function richValue(page, fragment) {
    return page.evaluate((fr) => {
        const eds = (window.tinymce && window.tinymce.editors) || [];
        return eds.filter((e) => e.id.includes(fr)).map((e) => ({id: e.id, content: e.getContent()}));
    }, fragment);
}

// ---------------------------------------------------------------- public pages
async function visit(vis, url, name) {
    const r = await vis.goto(url);
    await idle(vis);
    await snap(vis, name);
    const data = await vis.evaluate(() => {
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            h1: txt(document.querySelector('h1')),
            titles: [...document.querySelectorAll('.obj_monograph_summary .title')].map(txt),
            covers: [...document.querySelectorAll('.obj_monograph_summary')].map((m) => ({t: txt(m.querySelector('.title')), img: m.querySelector('img') ? {src: m.querySelector('img').getAttribute('src'), alt: m.querySelector('img').alt, w: m.querySelector('img').naturalWidth, h: m.querySelector('img').naturalHeight} : null})),
            bookCover: document.querySelector('.obj_monograph_full .cover img, .cover img') ? (() => { const i = document.querySelector('.obj_monograph_full .cover img, .cover img'); return {src: i.getAttribute('src'), alt: i.alt, w: i.naturalWidth, h: i.naturalHeight}; })() : null,
            seriesItem: txt(document.querySelector('.item.series, .series')),
            links: [...document.querySelectorAll('.obj_monograph_summary a.title, .obj_monograph_summary .title a, .obj_monograph_summary a')].map((a) => a.getAttribute('href')).filter(Boolean).slice(0, 10),
            bodyStart: txt(document.body).slice(0, 600),
        };
    });
    return {status: r ? r.status() : null, url: vis.url(), ...data};
}

// ---------------------------------------------------------------- the Catalog page
async function catalogFilter(page, app, P, label) {
    await page.goto(ctxUrl(app, P, '/manageCatalog'));
    await idle(page);
    await page.locator('.listPanel__item--catalog, .listPanel__empty').first().waitFor({timeout: T}).catch(() => {});
    const out = {};
    if (label) {
        await page.getByRole('button', {name: 'Filters', exact: true}).click();
        const col = page.locator('button.pkpFilter__label').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});
        await col.first().waitFor({timeout: T}).catch(() => {});
        out.filterEntries = (await page.locator('button.pkpFilter__label').allInnerTexts()).map((t) => flat(t, 40));
        const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
        await col.first().click().catch(() => {});
        await got;
        await idle(page);
    }
    out.titles = (await page.locator('.listPanel__item--catalog .listPanel__itemSubtitle').allInnerTexts()).map((t) => flat(t, 80));
    out.rowImgs = await page.locator('.listPanel__item--catalog img').evaluateAll((els) => els.map((i) => (i.getAttribute('src') || '').replace(/^.*\/public\//, 'public/'))).catch(() => []);
    return out;
}

// ---------------------------------------------------------------- seeding
function users(P, extra = []) {
    return [{username: `${P}mg`, roles: ['manager']}, {username: `${P}au`, roles: ['author']}, ...extra];
}
async function seedBook(app, P, key, title, extra = {}) {
    const r = await must(app, 'scenarios/submission', {tag: `${P}${key}`, context: P, submitter: `${P}au`, title, ...extra});
    return {id: r.submissionId, pub: r.publicationId, stageId: r.stageId, status: r.status};
}
const PROD = ['skipExternalReview', 'sendToProduction'];

// ================================================================= the drive
forEachApp(async (app) => {
    const isOmp = app.name === 'omp';
    const A = await launch(app);
    const V = await launch(app);
    const page = A.page;
    const vis = V.page;
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        await d.accept().catch(() => {});
    });
    try {
        // ------------------------------------------------ controls (multi-app rule 4)
        if (on('controls') && !isOmp) {
            await step(`controls-${app.name}`, async (out) => {
                const P = `${tag('u70k5')}c`;
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Control ${P}`}}, users: users(P)});
                const b = await seedBook(app, P, 'b1', 'K5 Control Item', {published: true, ...(app.name === 'ojs' ? {decisions: PROD} : {})});
                out.book = b;
                await signIn(page, `${P}mg`);
                await openWorkflow(page, app, P, b.id);
                out.menu = await menu(page, P);
                await snap(page, 'ctl-workflow');
                out.production = await production(page, app, P, b.id, 'ctl-production');
                await openWorkflow(page, app, P, b.id, {menuKey: entryKey(b.pub)});
                const s = await snap(page, 'ctl-typed-catalogEntry-key');
                out.typedKey = {url: s.url, heading: await heading(page), urlPathBox: await urlBox(page).count(), menuSelected: (await menu(page, P)).filter((m) => m.endsWith('*'))};
                // the journal's "Publication Settings" / the server's "Preprint entry": its "Version and Updates" (line 96's comparison)
                await page.getByRole('link', {name: app.name === 'ojs' ? 'Publication Settings' : 'Preprint entry', exact: true}).last().click();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(800);
                out.entryPage = {heading: await heading(page), form: await readEntry(page)};
                await snap(page, 'ctl-entry-page');
                await signOut(page);
            });
        }
        if (!isOmp) return;
        const {SectionsTab} = require(path.join(REPO, 'shared/playwright/pages/SectionsPages.js'));

        // ------------------------------------------------ page (lines 86-98, Rule 13 opening, 13a, 13b, 13c, 13e; side effect; td3 first half)
        if (on('page')) {
            const P = `${tag('u70k5')}a`;
            const S = {};
            await step('page-seed', async (out) => {
                await must(app, 'scenarios/context', {
                    tag: P, context: {name: {en: `K5 Press ${P}`}},
                    categories: [{path: 'sci', title: 'Science'}],
                    series: [{path: 'zoo', title: 'Zoology'}, {path: 'anth', title: 'Anthropology'}, {path: 'hist', title: 'History'}],
                    users: users(P),
                });
                S.a1 = await seedBook(app, P, 'b1', 'K5 Harbour Page', {decisions: PROD});
                S.a2 = await seedBook(app, P, 'b2', 'K5 Anchor Published', {published: true, datePublished: '2024-01-10'});
                S.a3 = await seedBook(app, P, 'b3', 'K5 Zephyr Seeded', {published: true, datePublished: '2024-02-10', series: 'hist', seriesPosition: '1'});
                Object.assign(out, {P, ...S});
                note(`ccK5 [omp] page: press ${P}, books ${JSON.stringify(S)}`);
                await signIn(page, `${P}mg`);
                // Anthropology made inactive on screen (Settings › Press › Series, the row's "Inactive" box)
                const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                const win = await tab.pressInactive('Anthropology');
                out.inactive = (await tab.confirm(win)).status();
                out.seriesRows = (await tab.grid().locator('tr.gridRow').allInnerTexts()).map((t) => flat(t, 80));
            });
            await step('page-open', async (out) => {
                await openWorkflow(page, app, P, S.a1.id);
                out.menuDefault = await menu(page, P);
                await snap(page, 'p-workflow-default');
                // the side menu's "Catalog Entry" link, as a person reaches it
                const link = page.getByRole('link', {name: 'Catalog Entry', exact: true});
                out.catalogEntryLinks = await link.count();
                await loc(page, 'workflow side menu: "Catalog Entry" link', link.last());
                await link.last().click();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(800);
                out.url = page.url();
                out.heading = await heading(page);
                out.menu = await menu(page, P);
                out.head = await workflowHead(page);
                out.form = await readEntry(page);
                await snap(page, 'p-entry-landed');
                await loc(page, 'Catalog Entry: heading', page.getByRole('heading', {name: 'Publication: Catalog Entry'}));
                await loc(page, 'Catalog Entry: "Series" list', page.locator('select[name="seriesId"]'));
                await loc(page, 'Catalog Entry: "Series Position" box', page.locator('input[name="seriesPosition"]'));
                await loc(page, 'Catalog Entry: "Date Published" box', page.locator('input[name="datePublished"]'));
                await loc(page, 'Catalog Entry: "Update Type" list', page.locator('select[name="updateType"]'));
                await loc(page, 'Catalog Entry: "Cover Image" file input', entryForm(page).locator('input[type="file"]'));
                await loc(page, 'Catalog Entry: "Save"', entryForm(page).getByRole('button', {name: 'Save', exact: true}));
                await loc(page, 'Catalog Entry: "Insert Content"', entryForm(page).getByRole('button', {name: 'Insert Content', exact: true}));
            });
            await step('page-insert', async (out) => {
                const btns = entryForm(page).getByRole('button', {name: 'Insert Content', exact: true});
                out.count = await btns.count();
                if (out.count) {
                    await btns.first().click();
                    const dlg = page.getByRole('dialog', {name: /Insert Content/}).last();
                    await dlg.waitFor({timeout: T}).catch(() => {});
                    await idle(page);
                    out.panel = flat(await dlg.innerText().catch(() => ''), 400);
                    await snap(page, 'p-insert-content');
                    await dlg.getByRole('button', {name: /Close|Cancel/}).first().click().catch(() => {});
                    await dlg.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
                    await sleep(700);
                }
            });
            await step('page-save', async (out) => {
                out.logBefore = await activityLog(page);
                await openEntry(page, app, P, S.a1.id, S.a1.pub);
                await page.locator('select[name="seriesId"]').selectOption({label: 'History'});
                await page.locator('input[name="seriesPosition"]').fill('Book 2');
                out.save = await saveEntry(page);
                out.after = await readEntry(page);
                await snap(page, 'p-entry-saved');
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(800);
                out.reload = await readEntry(page);
                await snap(page, 'p-entry-reloaded');
                out.logAfter = await activityLog(page);
                out.metadataLines = {before: countLines(out.logBefore, /Submission metadata updated/), after: countLines(out.logAfter, /Submission metadata updated/)};
                out.db = sql(app, `select series_id, series_position from publications where publication_id=${S.a1.pub}`);
            });
            await step('page-save-unchanged', async (out) => {
                // a second Save with nothing changed: does it add another log line?
                await openEntry(page, app, P, S.a1.id, S.a1.pub);
                out.save = await saveEntry(page);
                out.log = countLines(await activityLog(page), /Submission metadata updated/);
            });
            await step('page-update-type', async (out) => {
                await openEntry(page, app, P, S.a1.id, S.a1.pub);
                const ut = page.locator('select[name="updateType"]');
                out.options = await ut.locator('option').allInnerTexts().catch(() => null);
                out.before = await ut.evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text).catch(() => null);
                await ut.selectOption({label: 'Correction'}).catch((e) => { out.selectErr = String(e.message).split('\n')[0]; });
                await typeRich(page, 'Summary of Changes', 'Figure 2 corrected.');
                out.save = await saveEntry(page);
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(1500);
                out.reloadType = await page.locator('select[name="updateType"]').evaluate((s) => s.options[s.selectedIndex] && s.options[s.selectedIndex].text).catch(() => null);
                out.reloadSummary = await richValue(page, 'summaryOfChanges');
                out.db = sql(app, `select update_type from publications where publication_id=${S.a1.pub}`);
                await snap(page, 'p-update-type-reloaded');
            });
            await step('page-dates', async (out) => {
                for (const v of ['05/05/2020', '2024-02-30']) {
                    await openEntry(page, app, P, S.a1.id, S.a1.pub);
                    await page.locator('input[name="datePublished"]').fill(v);
                    const s = await saveEntry(page);
                    const f = await readEntry(page);
                    const t = (f.groups || []).find((g) => /Timing/.test(g.heading || ''));
                    out[v] = {save: s, fieldErrors: t ? t.fields.map((x) => x.errors).flat() : null, top: f.top};
                    await snap(page, `p-date-${v.replace(/\W/g, '')}`);
                }
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(600);
                out.afterReload = await page.locator('input[name="datePublished"]').inputValue().catch(() => null);
            });
            await step('page-leave-unsaved', async (out) => {
                await openEntry(page, app, P, S.a1.id, S.a1.pub);
                await page.locator('input[name="seriesPosition"]').fill('Unsaved 9');
                await page.locator('input[name="seriesPosition"]').blur();
                const before = dialogs.length;
                await page.getByRole('link', {name: 'Title & Abstract', exact: true}).last().click();
                await idle(page);
                await sleep(1000);
                out.afterClick = {url: page.url(), heading: await heading(page), dialogs: dialogs.slice(before), visibleDialogs: (await page.locator('[role="dialog"]:visible').allInnerTexts()).map((d) => flat(d, 120)).slice(1)};
                await snap(page, 'p-left-unsaved');
                await page.getByRole('link', {name: 'Catalog Entry', exact: true}).last().click();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(600);
                out.backValue = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
                await page.locator('input[name="seriesPosition"]').fill('Unsaved 10');
                await page.locator('input[name="seriesPosition"]').blur();
                const b2 = dialogs.length;
                await page.goto(ctxUrl(app, P, '/dashboard/editorial')).catch((e) => { out.gotoErr = String(e.message).split('\n')[0]; });
                await idle(page);
                out.pageLeave = dialogs.slice(b2);
                await openEntry(page, app, P, S.a1.id, S.a1.pub);
                out.afterLeaveValue = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
            });
            await step('page-series-13a', async (out) => {
                // series chosen on a published book: its series page and the Catalog page's filter
                out.seriesPage0 = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-0');
                await openEntry(page, app, P, S.a2.id, S.a2.pub);
                out.optionsPublished = await page.locator('select[name="seriesId"] option').allInnerTexts();
                await page.locator('select[name="seriesId"]').selectOption({label: 'History'});
                await page.locator('input[name="seriesPosition"]').fill('2');
                out.save = await saveEntry(page);
                out.seriesPage1 = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-1');
                out.filter1 = await catalogFilter(page, app, P, 'History');
                await snap(page, 'p-catalog-filter-history-1');
                // the empty choice
                await openEntry(page, app, P, S.a2.id, S.a2.pub);
                await page.locator('select[name="seriesId"]').selectOption({index: 0});
                out.emptyLabel = await page.locator('select[name="seriesId"]').evaluate((s) => s.options[0].text);
                out.saveEmpty = await saveEntry(page);
                out.seriesPage2 = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-2');
                out.filter2 = await catalogFilter(page, app, P, 'History');
                out.filterZoo = await catalogFilter(page, app, P, 'Zoology');
                out.db = sql(app, `select series_id, series_position from publications where publication_id=${S.a2.pub}`);
                // back into History at position 2, for 13b
                await openEntry(page, app, P, S.a2.id, S.a2.pub);
                await page.locator('select[name="seriesId"]').selectOption({label: 'History'});
                await page.locator('input[name="seriesPosition"]').fill('2');
                out.saveBack = await saveEntry(page);
            });
            await step('page-position-13b', async (out) => {
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.a2.id}`), 'p-book-anchor');
                out.seriesDefault = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-default');
                const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                const win = await tab.openEdit('History');
                out.sortBefore = await win.selectedOption('sortOption').innerText().catch(() => null);
                out.sortOptions = await win.select('sortOption').locator('option').allInnerTexts().catch(() => null);
                await win.select('sortOption').selectOption({label: 'Series position (lowest first)'});
                await win.save();
                await idle(page);
                out.seriesByPosition = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-position');
                const win2 = await tab.openEdit('History');
                await win2.select('sortOption').selectOption({label: 'Series position (highest first)'});
                await win2.save();
                await idle(page);
                out.seriesByPositionDesc = await visit(vis, ctxUrl(app, P, '/catalog/series/hist'), 'p-series-hist-position-desc');
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ order (line 92 series order both ends; 13b staff order; Insert Content settled)
        if (on('order')) {
            const P = `${tag('u70k5')}o`;
            const S = {};
            const seriesOptions = async () => {
                await openEntry(page, app, P, S.o1.id, S.o1.pub);
                return (await page.locator('select[name="seriesId"] option').allInnerTexts()).map((t) => flat(t, 40));
            };
            await step('order-seed', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Order ${P}`}},
                    series: [{path: 'aa', title: 'Alpha Series'}, {path: 'bb', title: 'Beta Series'}, {path: 'cc', title: 'Gamma Series'}], users: users(P)});
                S.o1 = await seedBook(app, P, 'b1', 'K5 Order Entry', {decisions: PROD});
                S.o2 = await seedBook(app, P, 'b2', 'K5 Aardvark Pos Two', {published: true, datePublished: '2024-05-01', series: 'aa', seriesPosition: '2'});
                S.o3 = await seedBook(app, P, 'b3', 'K5 Zebra Pos One', {published: true, datePublished: '2024-01-01', series: 'aa', seriesPosition: '1'});
                S.o4 = await seedBook(app, P, 'b4', 'K5 Mango Pos Three', {published: true, datePublished: '2024-03-01', series: 'aa', seriesPosition: '3'});
                Object.assign(out, {P, ...S});
                out.seq0 = sql(app, `select s.path, s.seq from series s join presses p on p.press_id=s.press_id where p.path='${P}' order by s.series_id`);
                note(`ccK5 [omp] order: press ${P}, books ${JSON.stringify(S)}`);
                await signIn(page, `${P}mg`);
            });
            await step('order-series-list', async (out) => {
                const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
                await tab.goto();
                out.grid0 = (await tab.grid().locator('tr.gridRow').allInnerTexts()).map((t) => flat(t, 40));
                out.select0 = await seriesOptions();
                await tab.goto();
                await tab.startOrdering();
                await tab.drag('Gamma Series', 'Alpha Series');
                out.done = (await tab.done()).status();
                await tab.goto();
                out.grid1 = (await tab.grid().locator('tr.gridRow').allInnerTexts()).map((t) => flat(t, 40));
                out.seq1 = sql(app, `select s.path, s.seq from series s join presses p on p.press_id=s.press_id where p.path='${P}' order by s.series_id`);
                out.select1 = await seriesOptions();
                await snap(page, 'o-entry-series-ordered');
            });
            await step('order-position', async (out) => {
                // the staff Catalog page and the readers' series page, the series on each "Order of monographs"
                const tab = new SectionsTab(page, P, {tab: 'Series', addLabel: 'Add Series'});
                for (const label of ['Title (A-Z)', 'Series position (lowest first)', 'Series position (highest first)', 'Publication date (oldest first)']) {
                    await tab.goto();
                    const win = await tab.openEdit('Alpha Series');
                    await win.select('sortOption').selectOption({label});
                    await win.save();
                    await idle(page);
                    const got = page.waitForResponse((r) => /_submissions\?/.test(r.url()) && /seriesIds/.test(r.url()), {timeout: T}).catch(() => null);
                    const staff = await catalogFilter(page, app, P, 'Alpha Series');
                    const g = await got;
                    const readers = await visit(vis, ctxUrl(app, P, '/catalog/series/aa'), `o-series-${label.replace(/\W+/g, '-')}`);
                    out[label] = {staff: staff.titles, staffGet: g ? new URL(g.url()).search.slice(0, 300) : null, readers: readers.titles};
                }
            });
            await step('order-insert-content', async (out) => {
                await openEntry(page, app, P, S.o1.id, S.o1.pub);
                const btns = entryForm(page).getByRole('button', {name: 'Insert Content', exact: true});
                out.count = await btns.count();
                await btns.first().click();
                const dlg = page.getByRole('dialog', {name: /Insert Content/}).last();
                await dlg.waitFor({timeout: T}).catch(() => {});
                await dlg.getByText('Loading', {exact: true}).waitFor({state: 'hidden', timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(800);
                out.panel = flat(await dlg.innerText().catch(() => ''), 500);
                out.buttons = (await dlg.getByRole('button').allInnerTexts()).map((t) => flat(t, 40));
                await snap(page, 'o-insert-content-settled');
                await dlg.getByRole('button', {name: 'Close', exact: true}).last().click().catch(() => {});
                await dlg.waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
                await sleep(600);
                out.editors = await page.evaluate(() => ((window.tinymce && window.tinymce.editors) || []).map((e) => e.id));
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ again: second runs of the one-run facts (saved date vs the notice; the book page's cover; a resave's small copy)
        if (on('again')) {
            const P = `${tag('u70k5')}g`;
            const S = {};
            const FILES = path.join(REPO, 'apps/omp/playwright/fixtures/files');
            const pressId = () => sql(app, `select press_id from presses where path='${P}'`);
            const sizes = async (pub) => {
                const dir = path.join(app.root, 'public/presses', pressId());
                const out = {};
                for (const n of fs.readdirSync(dir).filter((x) => x.includes(`_${pub}_`))) out[n] = await pngSize(app.url(`/public/presses/${pressId()}/${n}`));
                return out;
            };
            await step('again', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Again ${P}`}}, users: users(P)});
                S.g1 = await seedBook(app, P, 'b1', 'K5 Again Dated', {decisions: PROD});
                S.g2 = await seedBook(app, P, 'b2', 'K5 Again Cover', {decisions: PROD});
                out.S = S;
                note(`ccK5 [omp] again: press ${P}, books ${JSON.stringify(S)}`);
                await signIn(page, `${P}mg`);
                // a date saved, not published: which box?
                await openEntry(page, app, P, S.g1.id, S.g1.pub);
                await page.locator('input[name="datePublished"]').fill('2019-03-03');
                out.pastSave = await saveEntry(page);
                out.pastSaved = await production(page, app, P, S.g1.id, 'g-prod-past-date-saved');
                await openEntry(page, app, P, S.g1.id, S.g1.pub);
                await page.locator('input[name="datePublished"]').fill('2031-06-06');
                out.futureSave = await saveEntry(page);
                out.futureSaved = await production(page, app, P, S.g1.id, 'g-prod-future-date-saved');
                // the cover on the book page; a resave after a size change
                await openEntry(page, app, P, S.g2.id, S.g2.pub);
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 20_000}).catch(() => null);
                await entryForm(page).locator('input[type="file"]').first().setInputFiles(path.join(FILES, 'figure.png'));
                await up;
                await sleep(1200);
                out.coverSave = await saveEntry(page);
                out.sizes1 = await sizes(S.g2.pub);
                out.publish = await publish(page);
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.g2.id}`), 'g-book-cover');
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'g-catalog-cover');
                await page.goto(ctxUrl(app, P, '/management/settings/website'));
                await idle(page);
                await page.locator('#appearance-button').first().click().catch(() => {});
                await idle(page);
                await page.locator('#advanced-button').first().click().catch(() => {});
                await idle(page);
                const panel = page.locator('[role="tabpanel"]#advanced').first();
                await panel.locator('input[name="coverThumbnailsMaxWidth"]').fill('30');
                await panel.locator('input[name="coverThumbnailsMaxHeight"]').fill('300');
                const resp = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
                out.settingsSave = ((await resp) || {status: () => null}).status();
                out.sizesAfterSettingOnly = await sizes(S.g2.pub);
                await openEntry(page, app, P, S.g2.id, S.g2.pub);
                await page.locator('input[name="seriesPosition"]').fill('Resaved');
                out.resave = await saveEntry(page);
                out.sizesAfterResave = await sizes(S.g2.pub);
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ url (13g, td14)
        if (on('url')) {
            const P = `${tag('u70k5')}b`;
            const Q = `${P}q`;
            const S = {};
            await step('url-seed', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Path ${P}`}}, users: users(P)});
                await must(app, 'scenarios/context', {tag: Q, context: {name: {en: `K5 Other ${Q}`}}, users: users(Q)});
                S.b0 = await seedBook(app, P, 'b0', 'K5 Harbour Taken', {published: true, urlPath: 'harbour'});
                S.b1 = await seedBook(app, P, 'b1', 'K5 Path Book', {decisions: PROD});
                const r = await must(app, 'scenarios/submission', {tag: `${Q}b0`, context: Q, submitter: `${Q}au`, title: 'K5 Elsewhere', published: true, urlPath: 'elsewhere'});
                S.q0 = {id: r.submissionId};
                Object.assign(out, {P, Q, ...S});
                note(`ccK5 [omp] url: press ${P} (other press ${Q}), books ${JSON.stringify(S)}`);
            });
            await step('url-refusals', async (out) => {
                await signIn(page, `${P}mg`);
                await openEntry(page, app, P, S.b1.id, S.b1.pub);
                out.form = await readEntry(page);
                await snap(page, 'u-entry-no-categories');
                for (const v of ['my book', '-lead', '12345', 'harbour']) {
                    out[v] = await typeUrl(page, v);
                    await snap(page, `u-refused-${v.replace(/\W/g, '') || 'x'}`);
                }
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(600);
                out.afterReload = await urlBox(page).inputValue();
                out.db = sql(app, `select coalesce(url_path,'(null)') from publications where publication_id=${S.b1.pub}`);
                // a path another PRESS uses (other end of "within the press")
                out.elsewhere = await typeUrl(page, 'elsewhere');
                out.harbour2 = await typeUrl(page, 'harbour-2');
                await snap(page, 'u-saved-harbour-2');
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(600);
                out.reloadValue = await urlBox(page).inputValue();
                // a dot and an underscore between letters (the accepted shape)
                out.dotted = await typeUrl(page, 'harbour.v2_b');
                out.harbour2Again = await typeUrl(page, 'harbour-2');
            });
            await step('url-public', async (out) => {
                await openEntry(page, app, P, S.b1.id, S.b1.pub);
                out.publish = await publish(page);
                out.byPath = await visit(vis, ctxUrl(app, P, '/catalog/book/harbour-2'), 'u-book-by-path');
                out.byId = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.b1.id}`), 'u-book-by-id');
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'u-catalog');
                out.otherPress = await visit(vis, ctxUrl(app, Q, '/catalog/book/elsewhere'), 'u-other-press-elsewhere');
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ cover (13f, Settings 4, fields line 97)
        if (on('cover')) {
            const P = `${tag('u70k5')}k`;
            const S = {};
            const FILES = path.join(REPO, 'apps/omp/playwright/fixtures/files');
            const upload = async (file) => {
                const up = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 20_000}).catch(() => null);
                await entryForm(page).locator('input[type="file"]').first().setInputFiles(path.join(FILES, file));
                const r = await up;
                await sleep(1200);
                return r ? r.status() : null;
            };
            const coverField = async () => {
                const f = await readEntry(page);
                const d = (f.groups || []).find((g) => /Display/.test(g.heading || ''));
                return d || f;
            };
            const thumbs = (pub) => {
                const dir = path.join(app.root, 'public/presses', sql(app, `select press_id from presses where path='${P}'`));
                try { return fs.readdirSync(dir).filter((n) => n.includes(`_${pub}_`)); } catch (e) { return String(e.message); }
            };
            const pubUrl = (name) => app.url(`/public/presses/${sql(app, `select press_id from presses where path='${P}'`)}/${name}`);
            await step('cover-seed', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Cover ${P}`}}, users: users(P)});
                S.c1 = await seedBook(app, P, 'b1', 'K5 Cover Book', {decisions: PROD});
                S.c2 = await seedBook(app, P, 'b2', 'K5 Cover Two', {published: true, datePublished: '2024-03-01'});
                Object.assign(out, {P, ...S});
                note(`ccK5 [omp] cover: press ${P}, books ${JSON.stringify(S)}`);
                await signIn(page, `${P}mg`);
            });
            await step('cover-settings-read', async (out) => {
                // where "Cover Image Max Width" / "Max Height" live (Settings › Website › Appearance)
                await page.goto(ctxUrl(app, P, '/management/settings/website'));
                await idle(page);
                const top = page.locator('#appearance-button').first();
                if ((await top.getAttribute('aria-selected').catch(() => null)) !== 'true') await top.click().catch(() => {});
                await idle(page);
                out.sideTabs = (await page.locator('[role="tabpanel"]#appearance [role="tab"], #appearance [role="tab"]').allInnerTexts().catch(() => [])).map((t) => flat(t, 40));
                for (const id of ['appearance-setup', 'advanced']) {
                    const b = page.locator(`#${id}-button`).first();
                    if (await b.count()) { await b.click(); await idle(page); await sleep(500); }
                    const panel = page.locator(`[role="tabpanel"]#${id}`).first();
                    out[id] = {
                        width: await panel.locator('input[name="coverThumbnailsMaxWidth"]').inputValue().catch(() => 'absent'),
                        height: await panel.locator('input[name="coverThumbnailsMaxHeight"]').inputValue().catch(() => 'absent'),
                        labels: (await panel.locator('.pkpFormFieldLabel').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).filter((t) => /Cover/i.test(t)),
                        descriptions: (await panel.locator('.pkpFormField').filter({hasText: /Cover Image Max/}).locator('.pkpFormField__description').allInnerTexts().catch(() => [])).map((t) => flat(t, 200)),
                    };
                    await snap(page, `k-settings-${id}`);
                }
                await loc(page, 'Website › Appearance › Advanced: "Cover Image Max Width"', page.locator('input[name="coverThumbnailsMaxWidth"]'));
            });
            await step('cover-upload', async (out) => {
                await openEntry(page, app, P, S.c1.id, S.c1.pub);
                out.empty = await coverField();
                out.upload = await upload('profile-image-400.png');
                out.afterUpload = await coverField();
                await snap(page, 'k-cover-uploaded-unsaved');
                const alt = entryForm(page).getByRole('textbox', {name: /Alternate text/i}).first();
                await loc(page, 'Catalog Entry: Cover Image "Alternate text" box', alt);
                if (await alt.count()) await alt.fill('Cover of the book');
                out.save = await saveEntry(page);
                out.afterSave = await coverField();
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(1000);
                out.reload = await coverField();
                out.altReload = await alt.inputValue().catch(() => null);
                await snap(page, 'k-cover-reloaded');
                out.files = thumbs(S.c1.pub);
                out.db = sql(app, `select setting_value from publication_settings where publication_id=${S.c1.pub} and setting_name='coverImage'`);
            });
            await step('cover-public', async (out) => {
                await openEntry(page, app, P, S.c1.id, S.c1.pub);
                out.publish = await publish(page);
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'k-catalog-cover');
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.c1.id}`), 'k-book-cover');
                out.manage = await catalogFilter(page, app, P, null);
                const files = thumbs(S.c1.pub);
                out.files = files;
                out.sizes = {};
                for (const n of Array.isArray(files) ? files : []) out.sizes[n] = await pngSize(pubUrl(n));
            });
            await step('cover-size-setting', async (out) => {
                // Settings 4's other end: 200 x 50, saved on screen
                await page.goto(ctxUrl(app, P, '/management/settings/website'));
                await idle(page);
                await page.locator('#appearance-button').first().click().catch(() => {});
                await idle(page);
                await page.locator('#advanced-button').first().click().catch(() => {});
                await idle(page);
                const panel = page.locator('[role="tabpanel"]#advanced').first();
                await panel.locator('input[name="coverThumbnailsMaxWidth"]').fill('200');
                await panel.locator('input[name="coverThumbnailsMaxHeight"]').fill('50');
                const resp = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await panel.getByRole('button', {name: 'Save', exact: true}).last().click();
                const r = await resp;
                out.settingsSave = r ? r.status() : null;
                await idle(page);
                // the saved cover of c1, saved again with no new image: its small copy
                await openEntry(page, app, P, S.c1.id, S.c1.pub);
                await page.locator('input[name="seriesPosition"]').fill('Resaved');
                out.resave = await saveEntry(page);
                out.c1Files = thumbs(S.c1.pub);
                out.c1Sizes = {};
                for (const n of Array.isArray(out.c1Files) ? out.c1Files : []) out.c1Sizes[n] = await pngSize(pubUrl(n));
                // a new image on c2 (published): 120 x 80
                await openEntry(page, app, P, S.c2.id, S.c2.pub);
                out.upload2 = await upload('figure.png');
                out.save2 = await saveEntry(page);
                out.c2Files = thumbs(S.c2.pub);
                out.c2Sizes = {};
                for (const n of Array.isArray(out.c2Files) ? out.c2Files : []) out.c2Sizes[n] = await pngSize(pubUrl(n));
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'k-catalog-after-setting');
            });
            await step('cover-remove', async (out) => {
                await openEntry(page, app, P, S.c1.id, S.c1.pub);
                const rm = entryForm(page).getByRole('button', {name: /^Remove/}).first();
                await loc(page, 'Catalog Entry: Cover Image "Remove"', rm);
                out.removeButtons = await entryForm(page).getByRole('button', {name: /Remove/}).allInnerTexts().catch(() => []);
                await rm.click();
                await sleep(800);
                out.afterRemoveUnsaved = await coverField();
                await snap(page, 'k-cover-removed-unsaved');
                out.save = await saveEntry(page);
                await page.reload();
                await urlBox(page).waitFor({timeout: 15_000}).catch(() => {});
                await idle(page);
                await sleep(800);
                out.reload = await coverField();
                await snap(page, 'k-cover-removed-reloaded');
                out.files = thumbs(S.c1.pub);
                out.catalog = await visit(vis, ctxUrl(app, P, '/catalog'), 'k-catalog-after-remove');
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.c1.id}`), 'k-book-after-remove');
            });
            await step('cover-two-languages', async (out) => {
                // "One image per language the book's metadata is kept in": a press with French metadata too
                const D = `${tag('u70k5')}d`;
                await must(app, 'scenarios/context', {tag: D, context: {name: {en: `K5 Bilingual ${D}`}, supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}, users: users(D)});
                const d1 = await seedBook(app, D, 'b1', 'K5 Two Languages', {decisions: PROD});
                out.D = D;
                out.d1 = d1;
                await signIn(page, `${D}mg`);
                await openEntry(page, app, D, d1.id, d1.pub);
                out.form = await readEntry(page);
                out.fileInputs = await entryForm(page).locator('input[type="file"]').count();
                await snap(page, 'k-bilingual-entry');
                const fr = entryForm(page).getByRole('button', {name: /French|Français/}).first();
                if (await fr.count()) {
                    await fr.click();
                    await sleep(800);
                    out.afterFrench = await readEntry(page);
                    out.fileInputsAfterFrench = await entryForm(page).locator('input[type="file"]').count();
                    await snap(page, 'k-bilingual-entry-french');
                }
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ notice (Rule 14, td15, A2, A6, 13d)
        if (on('notice')) {
            const P = `${tag('u70k5')}n`;
            const S = {};
            await step('notice-seed', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Notice ${P}`}}, users: users(P, [{username: `${P}se`, roles: ['sectionEditor']}, {username: `${P}le`, roles: ['layoutEditor']}])});
                const parts = [{username: `${P}se`, role: 'sectionEditor'}, {username: `${P}le`, role: 'layoutEditor'}];
                S.n1 = await seedBook(app, P, 'b1', 'K5 Notice Now', {decisions: PROD, participants: parts});
                S.n2 = await seedBook(app, P, 'b2', 'K5 Notice Future', {decisions: PROD});
                S.n3 = await seedBook(app, P, 'b3', 'K5 Notice Past', {decisions: PROD});
                Object.assign(out, {P, ...S});
                note(`ccK5 [omp] notice: press ${P}, books ${JSON.stringify(S)}`);
            });
            await step('notice-before', async (out) => {
                await signIn(page, `${P}mg`);
                out.mg = await production(page, app, P, S.n1.id, 'n-prod-before-mg');
                await signIn(page, `${P}au`);
                out.au = await production(page, app, P, S.n1.id, 'n-prod-before-au', {author: true});
            });
            await step('notice-publish', async (out) => {
                await signIn(page, `${P}mg`);
                await openEntry(page, app, P, S.n1.id, S.n1.pub);
                out.dateBefore = await page.locator('input[name="datePublished"]').inputValue();
                out.publish = await publish(page);
                await openEntry(page, app, P, S.n1.id, S.n1.pub);
                out.dateAfter = await page.locator('input[name="datePublished"]').inputValue();
                out.today = today();
                out.mg = await production(page, app, P, S.n1.id, 'n-prod-published-mg');
                await loc(page, 'Production stage: "Catalog Management" notice heading', page.locator('[data-cy="workflow-primary-items"]').getByRole('heading', {name: 'Catalog Management', exact: true}));
            });
            await step('notice-other-roles', async (out) => {
                await signIn(page, `${P}au`);
                out.au = await production(page, app, P, S.n1.id, 'n-prod-published-au', {author: true});
                out.auMenu = await menu(page, P);
                await openWorkflow(page, app, P, S.n1.id, {menuKey: entryKey(S.n1.pub), author: true});
                const s = await snap(page, 'n-author-typed-catalogEntry');
                out.auTypedEntry = {url: s.url, heading: await heading(page), urlPathBox: await urlBox(page).count(), save: await page.getByRole('button', {name: 'Save', exact: true}).count()};
                const r = await page.goto(ctxUrl(app, P, '/manageCatalog'));
                await idle(page);
                const c = await snap(page, 'n-author-manageCatalog');
                out.auCatalog = {status: r ? r.status() : null, url: c.url, title: c.title, main: flat(c.text && (c.text.main || c.text.body), 200)};
                await signIn(page, `${P}se`);
                out.se = await production(page, app, P, S.n1.id, 'n-prod-published-se');
                await signIn(page, `${P}le`);
                out.le = await production(page, app, P, S.n1.id, 'n-prod-published-le');
                out.leMenu = await menu(page, P);
            });
            await step('notice-unpublish', async (out) => {
                await signIn(page, `${P}mg`);
                await openEntry(page, app, P, S.n1.id, S.n1.pub);
                out.unpublish = await unpublish(page);
                out.mg = await production(page, app, P, S.n1.id, 'n-prod-unpublished-mg');
                await page.reload();
                await idle(page);
                await sleep(1000);
                out.mgReload = await production(page, app, P, S.n1.id, 'n-prod-unpublished-mg-reload');
                out.catalog = await catalogFilter(page, app, P, null);
                out.dateAfterUnpublish = sql(app, `select date_published, status from publications where publication_id=${S.n1.pub}`);
                await signIn(page, `${P}au`);
                out.au = await production(page, app, P, S.n1.id, 'n-prod-unpublished-au', {author: true});
            });
            await step('notice-future', async (out) => {
                await signIn(page, `${P}mg`);
                await openEntry(page, app, P, S.n2.id, S.n2.pub);
                await page.locator('input[name="datePublished"]').fill('2030-01-01');
                out.save = await saveEntry(page);
                out.beforePublish = await production(page, app, P, S.n2.id, 'n-prod-future-saved-unpublished');
                await openEntry(page, app, P, S.n2.id, S.n2.pub);
                out.publish = await publish(page);
                out.after = await production(page, app, P, S.n2.id, 'n-prod-future-scheduled');
                await openEntry(page, app, P, S.n2.id, S.n2.pub);
                out.dateAfter = await page.locator('input[name="datePublished"]').inputValue();
                out.catalog = await catalogFilter(page, app, P, null);
                out.db = sql(app, `select date_published, status from publications where publication_id=${S.n2.pub}`);
            });
            await step('notice-past', async (out) => {
                await openEntry(page, app, P, S.n3.id, S.n3.pub);
                await page.locator('input[name="datePublished"]').fill('2020-05-05');
                out.save = await saveEntry(page);
                out.publish = await publish(page);
                await openEntry(page, app, P, S.n3.id, S.n3.pub);
                out.dateAfter = await page.locator('input[name="datePublished"]').inputValue();
                out.head = await workflowHead(page);
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.n3.id}`), 'n-book-past');
                out.db = sql(app, `select date_published, status from publications where publication_id=${S.n3.pub}`);
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ roles (td3 second half, Settings 7)
        if (on('roles')) {
            const P = `${tag('u70k5')}r`;
            const S = {};
            await step('roles-seed', async (out) => {
                await must(app, 'scenarios/context', {
                    tag: P, context: {name: {en: `K5 Roles ${P}`}},
                    users: users(P, [
                        {username: `${P}ed`, roles: ['editor']}, {username: `${P}pe`, roles: ['productionEditor']},
                        {username: `${P}se`, roles: ['sectionEditor']}, {username: `${P}l1`, roles: ['layoutEditor']},
                        {username: `${P}l2`, roles: ['layoutEditor']}, {username: `${P}mk`, roles: ['marketing']},
                    ]),
                });
                S.r1 = await seedBook(app, P, 'b1', 'K5 Roles Book', {decisions: PROD, participants: [
                    {username: `${P}se`, role: 'sectionEditor'}, {username: `${P}l1`, role: 'layoutEditor'},
                    {username: `${P}l2`, role: 'layoutEditor', canChangeMetadata: true}, {username: `${P}mk`, role: 'marketing'},
                ]});
                Object.assign(out, {P, ...S});
                out.assignments = sql(app, `select u.username, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${S.r1.id} order by 1`);
                note(`ccK5 [omp] roles: press ${P}, books ${JSON.stringify(S)}`);
            });
            const probeUser = async (who, name) => {
                const o = {};
                await signIn(page, who);
                await openWorkflow(page, app, P, S.r1.id);
                o.menu = await menu(page, P);
                o.listsCatalogEntry = o.menu.some((m) => /Catalog Entry/.test(m));
                await openEntry(page, app, P, S.r1.id, S.r1.pub);
                o.heading = await heading(page);
                o.urlPathBox = await urlBox(page).count();
                const save = entryForm(page).getByRole('button', {name: 'Save', exact: true});
                o.save = await save.count();
                o.inputsDisabled = await entryForm(page).locator('input[name="seriesPosition"]').isDisabled().catch(() => null);
                o.saveDisabled = o.save ? await save.first().isDisabled() : null;
                o.fileInputs = await entryForm(page).locator('input[type="file"]').count();
                o.formButtons = o.urlPathBox ? (await readEntry(page)).formButtons : null;
                await snap(page, `r-entry-${name}`);
                if (o.save && o.saveDisabled) {
                    // type into the box: does anything enable "Save"?
                    await page.locator('input[name="seriesPosition"]').fill(`By ${name}`).catch((e) => { o.typeErr = String(e.message).split('\n')[0]; });
                    await sleep(500);
                    o.saveDisabledAfterTyping = await save.first().isDisabled();
                    o.typedValue = await page.locator('input[name="seriesPosition"]').inputValue().catch(() => null);
                }
                if (o.save && !o.saveDisabled) {
                    await page.locator('input[name="seriesPosition"]').fill(`By ${name}`);
                    o.saveResult = await saveEntry(page);
                }
                return o;
            };
            for (const [who, name] of [[`${P}mg`, 'manager'], [`${P}ed`, 'pressEditor'], [`${P}pe`, 'productionEditor'], [`${P}se`, 'seriesEditor'], [`${P}l1`, 'layoutDefault'], [`${P}l2`, 'layoutPermitted'], [`${P}mk`, 'marketing'], ['admin', 'admin']]) {
                await step(`roles-${name}`, async (out) => Object.assign(out, await probeUser(who, name)));
            }
            await step('roles-author', async (out) => {
                await signIn(page, `${P}au`);
                await openWorkflow(page, app, P, S.r1.id, {author: true});
                out.menu = await menu(page, P);
                await snap(page, 'r-author-workflow');
            });
            await step('roles-setting7', async (out) => {
                await signIn(page, `${P}mg`);
                const openRoles = async () => {
                    await page.goto(ctxUrl(app, P, '/management/settings/access'));
                    await idle(page);
                    const rolesTab = page.getByRole('tab', {name: 'Roles', exact: true}).or(page.locator('#roles-button')).first();
                    if (await rolesTab.count()) await rolesTab.click();
                    await idle(page);
                    await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                };
                const openRole = async (roleName) => {
                    await openRoles();
                    const cellRe = new RegExp(`^\\s*(Settings\\s+)?${roleName}\\s*$`, 'i');
                    const row = page.locator('tr.gridRow').filter({has: page.locator('td').filter({hasText: cellRe})}).first();
                    out[`${roleName}Row`] = flat(await row.innerText().catch(() => 'absent'), 200);
                    await row.locator('a.show_extras').click();
                    await idle(page);
                    await page.getByRole('link', {name: 'Edit', exact: true}).last().click();
                    const form = page.locator('form#userGroupForm');
                    await form.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    const box = form.locator('input[name="permitMetadataEdit"]');
                    await box.waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
                    return {form, box};
                };
                const {form, box} = await openRole('Layout Editor');
                out.label = await page.locator(`label[for="${await box.getAttribute('id')}"]`).innerText().catch(() => null)
                    || flat(await box.locator('xpath=ancestor::label[1] | ancestor::li[1]').first().innerText().catch(() => null), 200);
                out.boxesAround = (await form.locator('input[type="checkbox"]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked, text: ((e.closest('label') || e.parentElement || {}).innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160)})))).filter((b) => !/assignedStages/.test(b.name));
                out.before = await box.isChecked().catch(() => null);
                await snap(page, 'r-role-layout-editor');
                await loc(page, 'Roles › Edit › "Permit submission metadata edit." box', box);
                await box.check();
                const resp = page.waitForResponse((r) => /user-group/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: /^(OK|Save)$/}).first().click();
                const r = await resp;
                out.saveStatus = r ? r.status() : null;
                await idle(page);
                await sleep(800);
                const again = await openRole('Layout Editor');
                out.after = await again.box.isChecked().catch(() => null);
                out.assignmentsAfter = sql(app, `select u.username, sa.can_change_metadata from stage_assignments sa join users u on u.user_id=sa.user_id where sa.submission_id=${S.r1.id} order by 1`);
                out.layoutDefaultAfter = await probeUser(`${P}l1`, 'layoutDefault-after-setting');
            });
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------ versions (Rule 13 "each version has its own")
        if (on('versions')) {
            const P = `${tag('u70k5')}v`;
            const S = {};
            await step('versions', async (out) => {
                await must(app, 'scenarios/context', {tag: P, context: {name: {en: `K5 Versions ${P}`}}, series: [{path: 'hist', title: 'History'}, {path: 'phil', title: 'Philosophy'}], users: users(P)});
                S.v1 = await seedBook(app, P, 'b1', 'K5 Two Versions', {published: true, datePublished: '2024-04-01', series: 'hist', seriesPosition: '1'});
                out.S = S;
                note(`ccK5 [omp] versions: press ${P}, books ${JSON.stringify(S)}`);
                await signIn(page, `${P}mg`);
                await openEntry(page, app, P, S.v1.id, S.v1.pub);
                out.v1Before = await readEntry(page);
                const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
                const item = await new WorkflowPage(page, P).revealPublicationEntry('Create New Version');
                await item.click();
                const dlg = page.getByRole('dialog', {name: 'Create New Version'});
                await dlg.waitFor({timeout: T});
                await dlg.getByLabel('Publication Stage').waitFor({timeout: T}).catch(() => {});
                await idle(page);
                const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
                const cr = await created;
                const body = cr ? await cr.json().catch(() => null) : null;
                S.v2 = body ? body.id : null;
                out.v2 = S.v2;
                await sleep(1000);
                await openEntry(page, app, P, S.v1.id, S.v2);
                out.menu = await menu(page, P);
                out.v2Copied = await readEntry(page);
                await snap(page, 'v-entry-v2');
                await page.locator('select[name="seriesId"]').selectOption({label: 'Philosophy'});
                await page.locator('input[name="seriesPosition"]').fill('7');
                out.v2Save = await saveEntry(page);
                await openEntry(page, app, P, S.v1.id, S.v1.pub);
                out.v1After = await readEntry(page);
                await snap(page, 'v-entry-v1-after');
                out.db = sql(app, `select publication_id, series_id, series_position, status from publications where submission_id=${S.v1.id} order by 1`);
                out.book = await visit(vis, ctxUrl(app, P, `/catalog/book/${S.v1.id}`), 'v-book');
            });
            await signOut(page).catch(() => {});
        }
    } finally {
        if (dialogs.length) fact(`dialogs-${app.name}`, dialogs);
        await A.close();
        await V.close();
    }
});
