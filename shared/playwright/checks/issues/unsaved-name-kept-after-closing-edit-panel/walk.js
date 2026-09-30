// Issue report walk: docs/issues/4-unsaved-name-kept-after-closing-edit-panel.md
// (spec U66 register A2, U12 A11, U11 A4). Takes the report's Steps through
// the screens on a dataset fleet (PKP's default test dataset, harness.md
// "Dataset fleets"): signed in as the dataset's manager `rvaca` on
// `publicknowledge`; the kit builds nothing, the institution, the
// announcement and the highlight are created on screen. Fact labels carry
// the report's step numbers; the Control runs after step 11. Records every
// screen with screen(). Reset the fleet before each walk: the walk adds
// items and turns announcements on.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const path = app.contextPath; // publicknowledge
    fact('context', path);
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }
    const exactRe = (s) => new RegExp(`^\\s*${esc(s)}\\s*$`);
    async function closePanel(d, how) {
        if (how === 'control') await d.getByRole('button', {name: 'Close', exact: true}).first().click();
        else if (how === 'escape') await page.keyboard.press('Escape');
        else if (how === 'outside') await page.mouse.click(40, 500);
        await d.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        await pause(800); // the modal store's slot (patterns pitfall 4)
        return !(await d.isVisible().catch(() => false));
    }
    async function pressSave(d, re) {
        const resp = page.waitForResponse((r) => re.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await d.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await idle(page); await pause(900);
        return {status: r ? r.status() : null, panelOpen: await d.isVisible().catch(() => false)};
    }
    async function appendTo(box, text) {
        await box.click();
        await box.press('End');
        await box.pressSequentially(text, {delay: 40});
        await pause(300);
    }
    async function richBody(d, iframeSel) {
        const frame = d.locator(iframeSel).first();
        await frame.waitFor({timeout: T});
        const body = frame.contentFrame().locator('body');
        for (let i = 0; i < 40; i++) {
            if ((await body.getAttribute('contenteditable').catch(() => null)) === 'true') break;
            await pause(250);
        }
        return body;
    }
    async function readRich(d, iframeSel) {
        const body = await richBody(d, iframeSel);
        let v = '';
        for (let i = 0; i < 20; i++) { v = (await body.innerText()).trim(); if (v) break; await pause(250); }
        return v;
    }
    async function appendRich(d, iframeSel, text) {
        const body = await richBody(d, iframeSel);
        for (let i = 0; i < 20; i++) { if ((await body.innerText()).trim()) break; await pause(250); }
        await body.click();
        await page.keyboard.press('ControlOrMeta+End');
        await page.keyboard.type(text, {delay: 40});
        await pause(400);
    }
    async function setRich(d, iframeSel, text) {
        const body = await richBody(d, iframeSel);
        await body.click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('Delete');
        await page.keyboard.type(text, {delay: 30});
        await pause(400);
    }

    // ---------------------------------------------------------------- Institutions
    const iPanel = () => page.locator('.institutionsListPanel');
    const iRows = () => iPanel().locator('.listPanel__item span[id^="institution-"]').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const iRow = (name) => iPanel().locator('.listPanel__item').filter({has: page.locator('span[id^="institution-"]', {hasText: exactRe(name)})});
    const iDlg = (title) => page.getByRole('dialog', {name: title});
    async function iLand() {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/institutions`));
        await idle(page);
        await iPanel().first().waitFor({timeout: T});
        await idle(page);
    }
    async function iOpenEdit(name) {
        await iRow(name).getByRole('button', {name: 'Edit', exact: true}).click();
        const d = iDlg('Edit Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(300);
        return d;
    }
    const iRead = async (d) => ({name: await d.locator('input[name="name-en"]').inputValue(), ipRanges: await d.locator('textarea[name="ipRanges"]').inputValue()});
    const iSaveRe = /\/api\/v1\/institutions/;

    // ---------------------------------------------------------------- Announcements
    const aPanel = () => page.locator('main .listPanel').first();
    const aRows = () => aPanel().locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const aRow = (title) => aPanel().locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: exactRe(title)})});
    async function aLand() {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/announcements`));
        await idle(page);
        await aPanel().waitFor({timeout: T});
        await idle(page);
    }
    async function aOpenEdit(title) {
        await aRow(title).getByRole('button', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Edit Announcement'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(500);
        return d;
    }
    const aSaveRe = /\/api\/v1\/announcements/;
    const SHORT = '#announcement-descriptionShort-control-en_ifr';

    // ---------------------------------------------------------------- Highlights
    const hPanel = () => page.locator('.highlightsListPanel');
    const hRows = () => hPanel().locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const hRow = (title) => hPanel().locator('.listPanel__item').filter({has: page.locator('.listPanel__itemTitle', {hasText: exactRe(title)})});
    async function websiteSideTab(name) {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/website`));
        await idle(page);
        const setupTab = page.locator('#setup-button').first();
        await setupTab.waitFor({timeout: T});
        if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
        await page.locator('#setup').first().getByRole('tab', {name, exact: true}).click();
        await idle(page);
    }
    async function hOpenEdit(title) {
        await hRow(title).getByRole('button', {name: 'Edit', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Edit Highlight'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page); await pause(500);
        return d;
    }
    const hSaveRe = /\/api\/v1\/highlights/;
    const HTITLE = '#highlight-title-control-en_ifr';

    try {
        // 1
        await signIn(page, 'rvaca');

        // ===== Institutions
        // 2
        await iLand();
        await snap('inst-page');
        // 3
        await iPanel().getByRole('button', {name: 'Add Institution', exact: true}).click();
        let d = iDlg('Add Institution');
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="name-en"]').fill('Campus Library');
        await d.locator('textarea[name="ipRanges"]').fill('10.1.0.0/16');
        fact('3 add save', await pressSave(d, iSaveRe));
        fact('3 rows', await iRows());
        // 4
        d = await iOpenEdit('Campus Library');
        await appendTo(d.locator('input[name="name-en"]'), ' Draft');
        await snap('inst-edit-name-typed');
        // 5
        fact('5 closed by Close', await closePanel(d, 'control'));
        await snap('inst-after-close');
        await shot(page, 'inst-after-close');
        fact('5 rows', await iRows());
        // 6
        d = await iOpenEdit('Campus Library Draft').catch(() => null);
        if (!d) {
            fact('6 no row named Campus Library Draft', await iRows());
            d = await iOpenEdit('Campus Library');
        }
        fact('6 reopened', await iRead(d));
        await snap('inst-reopened');
        // 7
        await d.locator('textarea[name="ipRanges"]').fill('10.2.0.0/16');
        fact('7 save', await pressSave(d, iSaveRe));
        fact('7 rows', await iRows());
        // 8
        await page.reload(); await idle(page); await iPanel().first().waitFor({timeout: T}); await idle(page);
        let rows = await iRows();
        fact('8 rows after reload', rows);
        d = await iOpenEdit(rows[0]);
        fact('8 stored', await iRead(d));
        await snap('inst-stored-after-reload');
        await shot(page, 'inst-stored-after-reload');
        await closePanel(d, 'control');
        // 9
        const saved = rows[0];
        d = await iOpenEdit(saved);
        await appendTo(d.locator('input[name="name-en"]'), ' Esc');
        fact('9 closed by Escape', await closePanel(d, 'escape'));
        fact('9 rows', await iRows());
        await snap('inst-after-escape');
        // 10
        rows = await iRows();
        d = await iOpenEdit(rows[0]);
        fact('10 reopened name', (await iRead(d)).name);
        await appendTo(d.locator('input[name="name-en"]'), ' Out');
        fact('10 closed by click outside', await closePanel(d, 'outside'));
        fact('10 rows', await iRows());
        await snap('inst-after-outside');
        // 11
        await page.reload(); await idle(page); await iPanel().first().waitFor({timeout: T}); await idle(page);
        fact('11 rows after reload', await iRows());
        // Control (after step 11)
        d = await iOpenEdit(saved);
        await d.locator('textarea[name="ipRanges"]').fill('10.3.0.0/16');
        await closePanel(d, 'control');
        fact('control rows', await iRows());
        d = await iOpenEdit(saved);
        fact('control reopened', await iRead(d));
        await closePanel(d, 'control');

        // ===== Announcements
        // 12
        await websiteSideTab('Announcements');
        const enable = page.getByRole('checkbox', {name: 'Enable announcements', exact: true});
        await enable.waitFor({timeout: T});
        if (!(await enable.isChecked())) await enable.check();
        const settingsForm = page.locator('form').filter({has: enable});
        const sResp = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await settingsForm.getByRole('button', {name: 'Save', exact: true}).click();
        const sr = await sResp;
        await idle(page);
        fact('12 enable save', sr ? sr.status() : null);
        // 13
        await aLand();
        await snap('ann-page');
        await aPanel().getByRole('button', {name: 'Add Announcement', exact: true}).click();
        d = page.getByRole('dialog', {name: 'Add Announcement'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await d.locator('input[name="title-en"]').fill('Call for papers');
        fact('13 add save', await pressSave(d, aSaveRe));
        fact('13 rows', await aRows());
        // 14
        d = await aOpenEdit('Call for papers');
        await appendTo(d.locator('input[name="title-en"]'), ' Draft');
        fact('14 closed by Close', await closePanel(d, 'control'));
        fact('14 rows', await aRows());
        await snap('ann-after-close');
        // 15
        rows = await aRows();
        d = await aOpenEdit(rows[0]);
        fact('15 reopened title', await d.locator('input[name="title-en"]').inputValue());
        await setRich(d, SHORT, 'Deadline in May.');
        fact('15 save', await pressSave(d, aSaveRe));
        // 16
        await page.reload(); await idle(page); await aPanel().waitFor({timeout: T}); await idle(page);
        rows = await aRows();
        fact('16 rows after reload', rows);
        d = await aOpenEdit(rows[0]);
        fact('16 stored', {title: await d.locator('input[name="title-en"]').inputValue(), short: await readRich(d, SHORT)});
        await snap('ann-stored-after-reload');
        await closePanel(d, 'control');
        await page.goto(app.url(`/index.php/${path}/en/announcement`));
        await idle(page);
        fact('16 public announcements page titles', await page.locator('.obj_announcement_summary h2, .obj_announcement_summary h3, .cmp_announcements h2, .cmp_announcements h3').allInnerTexts().then((a) => a.map((x) => x.trim())));
        await snap('ann-public');

        // ===== Highlights
        // 17
        await websiteSideTab('Highlights');
        await hPanel().waitFor({timeout: T});
        await snap('hl-tab');
        await hPanel().getByRole('button', {name: 'Add Highlight', exact: true}).click();
        d = page.getByRole('dialog', {name: 'Add Highlight'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await setRich(d, HTITLE, 'Open call');
        await d.locator('#highlight-url-control').fill('https://example.org/call');
        await d.locator('#highlight-urlText-control-en').fill('Read more');
        fact('17 add save', await pressSave(d, hSaveRe));
        fact('17 rows', await hRows());
        // 18
        d = await hOpenEdit('Open call');
        await appendRich(d, HTITLE, ' Draft');
        fact('18 closed by Close', await closePanel(d, 'control'));
        fact('18 rows', await hRows());
        await snap('hl-after-close');
        // 19
        rows = await hRows();
        d = await hOpenEdit(rows[0]);
        fact('19 reopened title', await readRich(d, HTITLE));
        await d.locator('#highlight-url-control').fill('https://example.org/call2');
        fact('19 save', await pressSave(d, hSaveRe));
        // 20
        await page.reload(); await idle(page);
        const setupTab = page.locator('#setup-button').first();
        if ((await setupTab.getAttribute('aria-selected').catch(() => null)) !== 'true') await setupTab.click().catch(() => {});
        if (!(await hPanel().isVisible().catch(() => false))) await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
        await hPanel().waitFor({timeout: T}); await idle(page);
        rows = await hRows();
        fact('20 rows after reload', rows);
        d = await hOpenEdit(rows[0]);
        fact('20 stored', {title: await readRich(d, HTITLE), url: await d.locator('#highlight-url-control').inputValue()});
        await snap('hl-stored-after-reload');
        await closePanel(d, 'control');
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        await shot(page, 'ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
    }
});
