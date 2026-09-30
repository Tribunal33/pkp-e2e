// Issue report neighbour check for the proposed fix
// (docs/issues/4-unsaved-name-kept-after-closing-edit-panel.md, fix.diff):
// an ordinary edit still saves. In each panel the fix touches (Institutions,
// Announcements, Highlights, Categories, Contributor Roles, OJS Reviewer
// Recommendations) the first item gets a new English and French name or
// title and "Save"; after a reload "Edit" must show both. The same for a
// form that is not a list panel's: Settings › Journal (Press, Server) ›
// Masthead, the multilingual acronym. Run with the fix in and out. On a
// dataset fleet, signed in as `rvaca`; what the dataset lacks (an
// institution, announcements turned on and one announcement, a highlight)
// is created on screen first, names tagged u66rv4.
//
// Run:
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/neighbour.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    if (!app.dataset) throw new Error('neighbour.js drives a dataset fleet (fleet-prep --dataset)');
    const path = app.contextPath;
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const run = process.env.PROBE_RUN || 'x';

    async function go(p) { await page.goto(app.url(`/index.php/${path}/en/management/settings/${p}`)); await idle(page); }
    async function tabs(ids) {
        for (const id of ids) {
            const b = page.locator(`#${id}-button`).first();
            await b.waitFor({timeout: T});
            if ((await b.getAttribute('aria-selected')) !== 'true') await b.click();
            await idle(page);
        }
    }
    async function save(scope, re) {
        const resp = page.waitForResponse((r) => re.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await scope.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await resp;
        await idle(page); await pause(1200);
        return r ? r.status() : null;
    }
    async function showFrench(scope) {
        const b = scope.locator('button.pkpFormLocales__locale').first();
        if (await b.count()) {
            if (!/isActive/.test((await b.getAttribute('class')) || '')) await b.click();
            await pause(500);
        }
    }
    async function richBody(scope, sel) {
        const frame = scope.locator(sel).first();
        await frame.waitFor({timeout: T});
        const body = frame.contentFrame().locator('body');
        for (let i = 0; i < 40; i++) { if ((await body.getAttribute('contenteditable').catch(() => null)) === 'true') break; await pause(250); }
        return body;
    }
    async function setRich(scope, sel, text) {
        const body = await richBody(scope, sel);
        await body.click();
        await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.press('Delete');
        await page.keyboard.type(text, {delay: 20});
        await pause(400);
    }
    async function readRich(scope, sel) {
        const body = await richBody(scope, sel);
        let v = '';
        for (let i = 0; i < 20; i++) { v = (await body.innerText()).trim(); if (v) break; await pause(250); }
        return v;
    }
    const closeDlg = async (d) => { await d.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {}); await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {}); await pause(800); };

    // A box: input by name, or a rich-text iframe by id.
    const setBox = async (d, box, text) => (box.rich ? setRich(d, box.rich, text) : d.locator(`input[name="${box.name}"]`).fill(text));
    const readBox = async (d, box) => (box.rich ? readRich(d, box.rich) : d.locator(`input[name="${box.name}"]`).inputValue());

    // Edit the first item of a list, set en and fr, save, reload, read.
    async function editFirst(label, {land, openEdit, dialog, en, fr, saveRe}) {
        await land();
        let d = await openEdit();
        await showFrench(d);
        const want = {en: `u66rv4 ${label} ${run} en`, fr: `u66rv4 ${label} ${run} fr`};
        await setBox(d, en, want.en);
        await setBox(d, fr, want.fr);
        const status = await save(d, saveRe);
        await d.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await page.reload(); await idle(page);
        await land();
        d = await openEdit(want.en);
        await showFrench(d);
        const got = {en: await readBox(d, en), fr: await readBox(d, fr)};
        await snap(`${label}-stored`);
        await closeDlg(d);
        fact(label, {status, want, got, ok: got.en === want.en && got.fr === want.fr});
    }

    // Lists by list panel (row "Edit" button) and by manager (row "More Actions" › "Edit").
    // The first item, or after the save the item holding the new name (a list may re-sort).
    const pick = (rows, text) => (text ? rows.filter({hasText: text}) : rows).first();
    const listEdit = (panelSel, dialog) => async (text) => {
        await pick(page.locator(panelSel).first().locator('.listPanel__item'), text).getByRole('button', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: dialog}).last();
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}); await idle(page); await pause(500);
        return d;
    };
    const managerEdit = (panelSel, dialog) => async (text) => {
        const rows = page.locator(panelSel).first().locator('tbody tr').filter({has: page.getByRole('button', {name: 'More Actions'})});
        await pick(rows, text).getByRole('button', {name: 'More Actions'}).click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: dialog}).last();
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T}); await idle(page); await pause(500);
        return d;
    };

    try {
        await signIn(page, 'rvaca');

        // What the dataset lacks, created on screen when missing.
        await go('institutions');
        const iPanel = page.locator('.institutionsListPanel').first();
        await iPanel.waitFor({timeout: T}); await idle(page);
        if (!(await iPanel.locator('.listPanel__item').count())) {
            await iPanel.getByRole('button', {name: 'Add Institution', exact: true}).click();
            const d = page.getByRole('dialog', {name: 'Add Institution'});
            await d.locator('input[name="name-en"]').fill('u66rv4 Library');
            await d.locator('textarea[name="ipRanges"]').fill('10.1.0.0/16');
            fact('made institution', await save(d, /\/api\/v1\/institutions/));
        }
        await go('website'); await tabs(['setup', 'announcements']);
        const enable = page.getByRole('checkbox', {name: 'Enable announcements', exact: true});
        await enable.waitFor({timeout: T});
        if (!(await enable.isChecked())) {
            await enable.check();
            fact('enabled announcements', await save(page.locator('form').filter({has: enable}), /\/api\/v1\/contexts\//));
        }
        await go('announcements');
        const aPanel = page.locator('main .listPanel').first();
        await aPanel.waitFor({timeout: T}); await idle(page);
        if (!(await aPanel.locator('.listPanel__item').count())) {
            await aPanel.getByRole('button', {name: 'Add Announcement', exact: true}).click();
            const d = page.getByRole('dialog', {name: 'Add Announcement'});
            await d.locator('input[name="title-en"]').fill('u66rv4 news');
            fact('made announcement', await save(d, /\/api\/v1\/announcements/));
        }
        await go('website'); await tabs(['setup', 'highlights']);
        const hPanel = page.locator('.highlightsListPanel').first();
        await hPanel.waitFor({timeout: T}); await idle(page);
        if (!(await hPanel.locator('.listPanel__item').count())) {
            await hPanel.getByRole('button', {name: 'Add Highlight', exact: true}).click();
            const d = page.getByRole('dialog', {name: 'Add Highlight'});
            await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
            await setRich(d, '#highlight-title-control-en_ifr', 'u66rv4 call');
            await d.locator('#highlight-url-control').fill('https://example.org/u66rv4');
            await d.locator('#highlight-urlText-control-en').fill('Read more');
            fact('made highlight', await save(d, /\/api\/v1\/highlights/));
        }

        const checks = [
            ['institutions', {land: async () => { await go('institutions'); await page.locator('.institutionsListPanel .listPanel__item').first().waitFor({timeout: T}); }, openEdit: listEdit('.institutionsListPanel', 'Edit Institution'), en: {name: 'name-en'}, fr: {name: 'name-fr_CA'}, saveRe: /\/api\/v1\/institutions/}],
            ['announcements', {land: async () => { await go('announcements'); await page.locator('main .listPanel .listPanel__item').first().waitFor({timeout: T}); }, openEdit: listEdit('main .listPanel', 'Edit Announcement'), en: {name: 'title-en'}, fr: {name: 'title-fr_CA'}, saveRe: /\/api\/v1\/announcements/}],
            ['highlights', {land: async () => { await go('website'); await tabs(['setup', 'highlights']); await page.locator('.highlightsListPanel .listPanel__item').first().waitFor({timeout: T}); }, openEdit: listEdit('.highlightsListPanel', 'Edit Highlight'), en: {rich: '#highlight-title-control-en_ifr'}, fr: {rich: '#highlight-title-control-fr_CA_ifr'}, saveRe: /\/api\/v1\/highlights/}],
            ['categories', {land: async () => { await go('context'); await tabs(['categories']); await page.locator('#categories tbody tr').first().waitFor({timeout: T}); }, openEdit: managerEdit('#categories', 'Edit Category'), en: {name: 'title-en'}, fr: {name: 'title-fr_CA'}, saveRe: /\/api\/v1\/categories/}],
            ['contributorRoles', {land: async () => { await go('workflow'); await tabs(['submission', 'contributorRoles']); await page.locator('#contributorRoles tbody tr').first().waitFor({timeout: T}); }, openEdit: managerEdit('#contributorRoles', 'Edit Role'), en: {name: 'name-en'}, fr: {name: 'name-fr_CA'}, saveRe: /\/api\/v1\/contributorRoles/}],
        ];
        if (app.name === 'ojs') checks.push(['reviewerRecommendations', {land: async () => { await go('workflow'); await tabs(['review', 'reviewerRecommendations']); await page.locator('#reviewerRecommendations tbody tr').first().waitFor({timeout: T}); }, openEdit: managerEdit('#reviewerRecommendations', 'Edit Recommendation'), en: {name: 'title-en'}, fr: {name: 'title-fr_CA'}, saveRe: /\/api\/v1\/reviewers\/recommendations/}]);
        for (const [label, cfg] of checks) {
            await editFirst(label, cfg).catch(async (e) => { fact(`${label} ERROR`, String(e.message || e).slice(0, 400)); await snap(`${label}-ERROR`).catch(() => {}); });
        }

        // A form that is not a list panel's: Masthead, the acronym.
        try {
            await go('context'); await tabs(['masthead']);
            const form = page.locator('#masthead form').first();
            await form.locator('input[name="acronym-en"]').waitFor({timeout: T});
            await showFrench(form);
            const want = {en: `U66${run}`.toUpperCase(), fr: `U66${run}FR`.toUpperCase()};
            await form.locator('input[name="acronym-en"]').fill(want.en);
            await form.locator('input[name="acronym-fr_CA"]').fill(want.fr);
            const status = await save(form, /\/api\/v1\/contexts\//);
            await page.reload(); await idle(page); await tabs(['masthead']);
            await form.locator('input[name="acronym-en"]').waitFor({timeout: T});
            await showFrench(form);
            const got = {en: await form.locator('input[name="acronym-en"]').inputValue(), fr: await form.locator('input[name="acronym-fr_CA"]').inputValue()};
            await snap('masthead-stored');
            fact('masthead acronym', {status, want, got, ok: got.en === want.en && got.fr === want.fr});
        } catch (e) {
            fact('masthead ERROR', String(e.message || e).slice(0, 400));
            await snap('masthead-ERROR').catch(() => {});
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
