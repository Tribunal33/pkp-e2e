// Kept verification probe for Crossref Cited-by (pkp/dev-team#316, pkp/pkp-lib#13221): crossref-ojs#108 adds the
// "Enable Cited-by" box, the public `api/v1/crossref/citedBy/{submissionId}` endpoint and the "Cited by" block in the
// article page's side column (templates/citedBy.blade on Templates::Article::Details, a Pinia store fed through
// pkp-lib#13292's TemplateManager::setPiniaStoreData(), ui-library#992's usePkpPageData()). Run at the PR heads:
//   PROBE_FEATURE=sync PROBE_AGENT=cb node bin/probe.js ojs shared/playwright/checks/sync/crossref-ojs-108/cited-by.js
// One OJS process on a scratch journal (one manager; A published with a DOI, B published without one, C published with
// a DOI and planted citations, D submitted and unpublished with a DOI):
//   e1        manager: the Crossref generic plugin enabled, DOIs on, Crossref chosen                        (e1-*)
//   v1        PUT registrationAgency citedBy=true without username/password, then with a username only      (v1-*)
//   e2        PUT registrationAgency citedBy=true with username and password (made up: Crossref answers 401) (e2-*)
//   e3        DOIs assigned to A, C and D                                                                  (e3-*)
//   a1        signed out: the endpoint for A (Crossref refuses), B, D, a missing id and C (planted cache)     (a1-*)
//   p1        signed out: A's page, the block, the count, the modal                                          (p1-*)
//   p2        signed out: B's page, no block                                                                 (p2-*)
//   p3        signed out: C's page with three planted citations, the modal and "Copy Citation Details"       (p3-*)
//   cm        Crossmark ticked as well: the order of the side column's blocks                            (cm-*)
//   off       citedBy unticked: A's page and the endpoint                                                    (off-*)
//   s1        manager: Settings › Distribution › DOIs › Registration, the box, ticked without credentials   (s1-*)
// No assertions: the session judges. The cache entry for C is planted through cache-driver.php and forgotten at the end.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag} = require('../../../probe');
const log = (...a) => console.log(...a);

const DEPOSITOR = {depositorName: 'Cb Depositor', depositorEmail: 'cb.depositor@mail.test'};
const AGENCY = (extra) => ({registrationAgency: 'crossrefplugin', automaticDoiDeposit: false, ...DEPOSITOR, testMode: true, crossmark: false, ...extra});

// Three citations shaped like CrossrefCitedByController::getCitationData(): a journal article with volume and issue,
// a book chapter with no volume but an issue, a dissertation with an institution and no DOI.
const PLANTED = [
    {title: 'Interactive Storytelling', journal: 'Lecture Notes in Computer Science', authors: 'Bitter Jessica L., Kräuter Noura',
        doi: '10.1007/978-3-031-47655-6_26', year: 2023, volume: '14383', issue: '2', firstPage: '312', citationType: 'journal_cite'},
    {title: 'Proceedings of Mobile Media', journal: null, authors: 'Kunzová Nikola',
        doi: '10.1145/3701571.3701601', year: 2024, volume: null, issue: '7', firstPage: null, citationType: 'conf_cite'},
    {title: 'A Thesis on Citations', institutionName: 'Simon Fraser University', authors: '',
        doi: null, year: 2026, volume: null, issue: null, firstPage: null, citationType: 'dissertation_cite'},
];

function cacheDriver(app, args) {
    return execFileSync('php', [path.resolve(__dirname, 'cache-driver.php'), ...args], {
        cwd: path.resolve(app.root),
        env: {...process.env, PKP_CONFIG_FILE: path.resolve(app.root, 'config.test.inc.php')},
        encoding: 'utf8',
    }).trim();
}

async function sessionApi(page, method, p, data, {form = false} = {}) {
    return page.evaluate(async ({method, p, data, form}) => {
        const token = window.pkp?.currentUser?.csrfToken || null;
        const headers = form
            ? {'Content-Type': 'application/x-www-form-urlencoded'}
            : {'Content-Type': 'application/json', 'X-Csrf-Token': token || ''};
        let body;
        if (data !== undefined) body = form ? new URLSearchParams({...data, csrfToken: token || ''}).toString() : JSON.stringify(data);
        const res = await fetch(p, {method, headers, body, credentials: 'same-origin'});
        const text = await res.text();
        let parsed;
        try { parsed = JSON.parse(text); } catch (e) { parsed = text.slice(0, 800); }
        return {status: res.status, body: parsed};
    }, {method, p, data, form});
}

// The block as the reader gets it once the count settled (the store fetches once, the count reads "--" while loading).
async function readBlock(page) {
    await page.waitForFunction(() => {
        const b = document.querySelector('.crossref-cited-by');
        return !b || !/^\s*$/.test(b.querySelector('.CrossrefCitedBy__label strong')?.innerText || '');
    }, undefined, {timeout: 20_000}).catch(() => {});
    await page.waitForTimeout(1500);
    return page.evaluate(() => {
        const b = document.querySelector('.crossref-cited-by');
        const sheets = [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => l.href.replace(/\?.*$/, ''));
        return {
            block: b ? b.innerText : null,
            blockHtml: b ? b.outerHTML.slice(0, 1500) : null,
            count: b ? (b.querySelector('.CrossrefCitedBy__label strong')?.innerText ?? null) : null,
            button: b ? [...b.querySelectorAll('button')].map((x) => x.innerText.trim()) : [],
            unresolved: document.querySelectorAll('crossref-cited-by-count, pkp-button').length,
            detailSections: [...document.querySelectorAll('.entry_details > .item, .entry_details > section')].map((e) => e.className),
            crossrefCss: sheets.filter((h) => /crossref/.test(h)),
            crossrefJs: [...document.scripts].filter((s) => /crossref/.test(s.src)).map((s) => s.src.replace(/\?.*$/, '')),
            piniaData: window.pkp?._piniaData ?? null,
        };
    });
}

async function openModal(page) {
    const btn = page.locator('.crossref-cited-by button', {hasText: 'View citing articles'});
    if (!(await btn.count())) return {opened: false};
    await btn.first().click();
    const dialog = page.getByRole('dialog');
    await dialog.first().waitFor({state: 'visible', timeout: 10_000}).catch(() => {});
    await page.waitForTimeout(800);
    const s = await screen(page);
    const buttons = await dialog.first().locator('button').evaluateAll((bs) => bs.map((b) => ({text: b.innerText.trim(), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'}))).catch(() => []);
    const links = await dialog.first().locator('a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.href, target: a.target}))).catch(() => []);
    return {opened: true, dialogText: s.text?.dialog ?? null, aria: s.aria?.dialogs ?? null, buttons, links};
}

forEachApp(async (app) => {
    await app.api.bootstrapProbe(app.contextPath);
    const T = tag('cb108');
    const mgr = `${T}mgr`;
    const ctx = await app.api.createContext({tag: T, users: [{username: mgr, roles: ['manager'], givenName: 'Cita', familyName: 'Tion'}]});
    const mk = (suffix, title, published) => app.api.createSubmission({tag: `${T}${suffix}`, context: T, submitter: mgr, title: `${title} ${T}`, submitted: true, published});
    const A = await mk('a', 'Cited-by with DOI', true);
    const B = await mk('b', 'Cited-by without DOI', true);
    const C = await mk('c', 'Cited-by planted', true);
    const D = await mk('d', 'Cited-by unpublished', false);
    const ctxId = ctx.id ?? ctx.contextId ?? ctx.context?.id ?? null;
    record('seed', {T, ctxId, A, B, C, D});
    const base = `/index.php/${T}/api/v1`;
    const dashboard = app.url(`/index.php/${T}/dashboard/editorial`);
    const articleUrl = (sid) => app.url(`/index.php/${T}/article/view/${sid}`);
    const endpoint = (sid) => app.url(`${base}/crossref/citedBy/${sid}`);

    const {page, close} = await launch(app);
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin: app.baseURL}).catch(() => {});
    let consoleLines = [];
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && consoleLines.length < 60) consoleLines.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
    page.on('pageerror', (e) => consoleLines.push(`pageerror: ${String(e.message).slice(0, 300)}`));
    const takeConsole = () => { const c = consoleLines; consoleLines = []; return c; };

    async function anon(key, sid, expect) {
        const t0 = Date.now();
        const res = await page.request.get(endpoint(sid), {failOnStatusCode: false});
        let body = await res.text();
        try { body = JSON.parse(body); } catch (e) { body = body.slice(0, 400); }
        const out = {expect, sid, status: res.status(), ms: Date.now() - t0, body};
        record(key, out);
        log(key, out.status, `${out.ms}ms`, JSON.stringify(body).slice(0, 240));
        return out;
    }

    async function pageLeg(key, sid, expect, {modal = false, copy = false} = {}) {
        takeConsole();
        const apiCalls = [];
        const onResp = (r) => { if (/crossref\/citedBy/.test(r.url())) apiCalls.push({url: r.url().replace(app.baseURL, ''), status: r.status()}); };
        page.on('response', onResp);
        const resp = await page.goto(articleUrl(sid), {waitUntil: 'load', timeout: 60_000});
        await idle(page).catch(() => {});
        const read = await readBlock(page);
        await shot(page, key).catch(() => {});
        let modalRead = null, clipboard = null;
        if (modal) {
            modalRead = await openModal(page);
            await shot(page, `${key}-modal`).catch(() => {});
            if (copy && modalRead.opened) {
                const copyBtn = page.getByRole('dialog').locator('button', {hasText: 'Copy Citation Details'});
                if (await copyBtn.count()) {
                    await copyBtn.first().click().catch((e) => { clipboard = {clickError: String(e.message).slice(0, 200)}; });
                    await page.waitForTimeout(400);
                    const label = await page.getByRole('dialog').locator('button').first().innerText().catch(() => null);
                    const text = await page.evaluate(() => navigator.clipboard.readText()).catch((e) => `unreadable: ${e.message}`);
                    clipboard = {...(clipboard || {}), labelAfterClick: label, text};
                }
            }
            const closeBtn = page.getByRole('dialog').locator('button', {hasText: 'Close'});
            if (await closeBtn.count()) { await closeBtn.first().click().catch(() => {}); await page.waitForTimeout(500); }
            modalRead.closedAfterClose = (await page.getByRole('dialog').count()) === 0;
        }
        page.off('response', onResp);
        const out = {expect, status: resp ? resp.status() : null, ...read, apiCalls, modal: modalRead, clipboard, console: takeConsole()};
        record(key, out);
        log(key, out.status, '| block:', JSON.stringify(out.block), '| count:', out.count, '| api:', JSON.stringify(apiCalls),
            '| css:', out.crossrefCss.length, '| modal:', modalRead ? JSON.stringify(modalRead.dialogText).slice(0, 300) : '-',
            clipboard ? `| clipboard: ${JSON.stringify(clipboard).slice(0, 400)}` : '', '| console:', out.console.length);
        return out;
    }

    try {
        await signIn(page, mgr, {contextPath: T});
        await page.goto(dashboard);
        await idle(page);

        // ---------- e1 ----------
        const enable = await sessionApi(page, 'POST',
            `/index.php/${T}/$$$call$$$/grid/settings/plugins/settings-plugin-grid/enable?plugin=crossrefplugin&category=generic`,
            {plugin: 'crossrefplugin', category: 'generic'}, {form: true});
        const doiPut = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}`,
            {enableDois: true, doiPrefix: '10.1234', enabledDoiTypes: ['publication'], doiCreationTime: 'copyEditCreationTime'});
        const agency0 = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({}));
        record('e1-setup', {enable: enable.status, doiPut: doiPut.status, agency0});
        log('e1 enable', enable.status, 'doi', doiPut.status, 'agency', agency0.status);

        // ---------- v1: the credentials rule ----------
        const v1a = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: true}));
        const v1b = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: true, username: 'cbuser'}));
        const v1c = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: true, username: '', password: ''}));
        record('v1-credentials-rule', {noCredentials: v1a, usernameOnly: v1b, emptyStrings: v1c});
        log('v1 none', v1a.status, JSON.stringify(v1a.body).slice(0, 300));
        log('v1 username only', v1b.status, JSON.stringify(v1b.body).slice(0, 300));
        log('v1 empty strings', v1c.status, JSON.stringify(v1c.body).slice(0, 300));

        // ---------- e2 ----------
        const e2 = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: true, username: 'cbuser', password: 'cbsecret-pw'}));
        record('e2-cited-by-on', {status: e2.status, citedBy: e2.body?.citedBy, username: e2.body?.username, passwordReturned: e2.body?.password !== undefined, body: e2.status >= 400 ? e2.body : undefined});
        log('e2 cited-by on', e2.status, 'citedBy', e2.body?.citedBy, 'password in response:', e2.body?.password !== undefined ? JSON.stringify(e2.body.password) : 'no');

        // ---------- e3 ----------
        const assign = await sessionApi(page, 'POST', `${base}/dois/submissions/assignDois`, {ids: [A.submissionId, C.submissionId, D.submissionId]});
        const dois = {};
        for (const [k, s] of Object.entries({A, B, C, D})) {
            const p = await sessionApi(page, 'GET', `${base}/submissions/${s.submissionId}/publications/${s.publicationId}`);
            dois[k] = {doi: p.body?.doiObject?.doi ?? null, status: p.body?.status};
        }
        record('e3-dois', {assign: assign.status, dois});
        log('e3 assign', assign.status, JSON.stringify(dois));

        cacheDriver(app, ['forget', String(A.submissionId)]);
        const citeFile = path.join(process.cwd(), '.reports', 'sync', `cb108-planted-${process.pid}.json`);
        fs.mkdirSync(path.dirname(citeFile), {recursive: true});
        fs.writeFileSync(citeFile, JSON.stringify(PLANTED));
        const planted = cacheDriver(app, ['put', String(C.submissionId), citeFile]);
        record('e3-planted', {planted});
        log('e3 planted', planted);

        // ---------- a1: the endpoint, signed out ----------
        await signOut(page);
        await anon('a1-A-crossref-refuses', A.submissionId, '502 {error: "An error occurred while retrieving Crossref citations for this article."}');
        await anon('a1-A-again', A.submissionId, 'the error is not cached: Crossref asked again');
        await anon('a1-B-no-doi', B.submissionId, '404 noPublishedDois');
        await anon('a1-D-unpublished', D.submissionId, '404 noPublishedDois (the DOI is not on a published version)');
        await anon('a1-missing', 999999, '404 api.404.resourceNotFound');
        await anon('a1-C-planted', C.submissionId, '200 {items: 3 planted, itemsMax: 3}');

        // ---------- p1-p3: the pages ----------
        await pageLeg('p1-A', A.submissionId, 'block "Cited by", count "--" after the 502, "View citing articles"; crossref.css (default theme). From crossref-ojs 9b10eb6 / ui-library d458b2e1: no TypeError, no error dialog on load, the modal opens with the plugin error text instead of the count', {modal: true});
        await pageLeg('p2-B', B.submissionId, 'no block, no call to the endpoint');
        await pageLeg('p3-C', C.submissionId, 'count 3; modal "3 citations", three entries, doi.org links; copy fills the clipboard (from 9b10eb6: no empty parts, no ", ," for the author-less entry, no trailing ", " without a DOI)', {modal: true, copy: true});
        await loc(page, 'the Cited by block (article page side column)', page.locator('.crossref-cited-by'));

        // ---------- cm: Crossmark ticked too, the side column's order ----------
        await signIn(page, mgr, {contextPath: T});
        await page.goto(dashboard);
        await idle(page);
        const cm = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: true, username: 'cbuser', password: 'cbsecret-pw', crossmark: true, updatePolicyDoi: '10.1234/policy'}));
        record('cm-put', {status: cm.status, crossmark: cm.body?.crossmark, citedBy: cm.body?.citedBy});
        await signOut(page);
        await pageLeg('cm-page-C', C.submissionId, 'both blocks; which one is last in the side column');
        await signIn(page, mgr, {contextPath: T});
        await page.goto(dashboard);
        await idle(page);

        // ---------- off ----------
        const off = await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: false, username: 'cbuser', password: 'cbsecret-pw'}));
        record('off-put', {status: off.status, citedBy: off.body?.citedBy});
        await signOut(page);
        await pageLeg('off-page-C', C.submissionId, 'no block');
        await anon('off-endpoint-C', C.submissionId, '403 citedByNotEnabled');

        // ---------- s1: the settings form ----------
        await signIn(page, mgr, {contextPath: T});
        await page.goto(dashboard);
        await idle(page);
        await sessionApi(page, 'PUT', `${base}/contexts/${ctxId}/registrationAgency`, AGENCY({citedBy: false, username: '', password: ''}));
        try {
            await page.goto(app.url(`/index.php/${T}/management/settings/distribution`));
            await idle(page);
            const doisTab = page.locator('#dois-button');
            if (await doisTab.count()) { await doisTab.first().click(); await idle(page); }
            const regTab = page.getByRole('tab', {name: 'Registration', exact: true});
            if (await regTab.count()) { await regTab.first().click(); await idle(page); }
            await page.locator('input[name="citedBy"]').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
            const readForm = () => page.evaluate(() => {
                const form = document.querySelector('input[name="citedBy"]')?.closest('form');
                const fs = document.querySelector('input[name="citedBy"]')?.closest('fieldset, .pkpFormField');
                return {
                    citedBy: [...document.querySelectorAll('input[name="citedBy"]')].map((i) => ({checked: i.checked, visible: i.offsetParent !== null})),
                    fieldText: fs ? fs.innerText.trim().slice(0, 400) : null,
                    errors: form ? [...form.querySelectorAll('.pkpFormFieldError, [id$="-error"], .pkpFormField__error')].map((e) => e.innerText.trim()).filter(Boolean) : [],
                    formNotice: form ? (form.querySelector('.pkpFormPage__status, .pkpForm__status, [role="alert"]')?.innerText ?? null) : null,
                    order: form ? [...form.querySelectorAll('.pkpFormField')].map((f) => (f.querySelector('legend, label')?.innerText || '').trim().split('\n')[0]).filter(Boolean) : [],
                };
            });
            const before = await readForm();
            record('s1-form', before);
            log('s1 form', JSON.stringify(before).slice(0, 700));
            await loc(page, 'the Enable Cited-by checkbox (Distribution › DOIs › Registration)', page.locator('input[name="citedBy"]'));
            await page.locator('input[name="citedBy"]').first().check();
            const save = page.locator('form:has(input[name="citedBy"])').getByRole('button', {name: 'Save', exact: true});
            await save.first().click();
            await page.waitForTimeout(2000);
            const after = await readForm();
            record('s1-save-no-credentials', after);
            await shot(page, 's1-save-no-credentials').catch(() => {});
            log('s1 saved ticked without credentials', JSON.stringify(after).slice(0, 700));
        } catch (e) {
            record('s1-error', {error: String(e.message).slice(0, 300)});
            log('s1 error', String(e.message).slice(0, 300));
        }
        cacheDriver(app, ['forget', String(C.submissionId)]);
    } finally {
        await close();
    }
});
