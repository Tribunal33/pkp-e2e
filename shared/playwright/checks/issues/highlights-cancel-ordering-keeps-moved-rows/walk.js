// Issue report walk: docs/issues/U11-A1-highlights-cancel-ordering-keeps-moved-rows.md
// (spec U11 register A1). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// signed in as the dataset's manager `rvaca` on `publicknowledge`; the kit
// builds nothing, the three highlights are added on screen. Fact labels carry
// the report's step numbers. Records every screen with screen(). Reset the
// fleet before each walk: the walk adds highlights and saves an order.
//
// Modes (first argument):
//   (none)      the Steps, 1-11
//   neighbour   the path a fix must leave alone: add the three highlights,
//               "Order", move "u11a Third" to the top, "Save Order"; a reload
//               and the home page show the moved order. Runs alone.
//   failed      a "Save Order" the server refuses: add the three highlights,
//               "Order", move "u11a Third" to the top; in a second window of
//               the same session delete "u11a Second"; back in the first,
//               "Save Order" (400, the generic error dialog), "OK"; record
//               the list. Then the home page. Runs alone.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues-u11a --dataset 1 --reset
//   PROBE_FEATURE=issues-u11a PROBE_AGENT=u11a node bin/probe.js all shared/playwright/checks/issues/highlights-cancel-ordering-keeps-moved-rows/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u11a-3_5 --dataset 1 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u11a-3_5 PROBE_AGENT=u11a node bin/probe.js all shared/playwright/checks/issues/highlights-cancel-ordering-keeps-moved-rows/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

const H = [
    {title: 'u11a First', url: 'https://example.org/first'},
    {title: 'u11a Second', url: 'https://example.org/second'},
    {title: 'u11a Third', url: 'https://example.org/third'},
];

forEachApp(async (app) => {
    const facts = {mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const path = app.contextPath; // publicknowledge
    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name) {
        const s = await screen(page);
        record(`${MODE === 'steps' ? '' : MODE + '-'}${String(++n).padStart(2, '0')}-${name}`, s);
        return s;
    }

    const panel = () => page.locator('.highlightsListPanel');
    const rows = () => panel().locator('.listPanel__itemTitle').allInnerTexts().then((a) => a.map((x) => x.trim()));
    const header = async () => ({
        order: await panel().getByRole('button', {name: 'Order', exact: true}).isVisible().catch(() => false),
        saveOrder: await panel().getByRole('button', {name: 'Save Order', exact: true}).isVisible().catch(() => false),
        cancel: await panel().getByRole('button', {name: 'Cancel', exact: true}).isVisible().catch(() => false),
        editButtons: await panel().getByRole('button', {name: /^Edit/}).count(),
        upArrows: await panel().getByRole('button', {name: /^Increase position of/}).count(),
    });
    const state = async () => ({rows: await rows(), ...(await header())});
    async function openHighlightsTab() {
        await page.goto(app.url(`/index.php/${path}/en/management/settings/website`));
        await idle(page);
        const setupTab = page.locator('#setup-button').first();
        await setupTab.waitFor({timeout: T});
        if ((await setupTab.getAttribute('aria-selected')) !== 'true') await setupTab.click();
        await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
        await panel().waitFor({timeout: T});
        await idle(page);
    }
    async function setRich(d, iframeSel, text) {
        const frame = d.locator(iframeSel).first();
        await frame.waitFor({timeout: T});
        const body = frame.contentFrame().locator('body');
        for (let i = 0; i < 40; i++) {
            if ((await body.getAttribute('contenteditable').catch(() => null)) === 'true') break;
            await pause(250);
        }
        await body.click();
        await page.keyboard.type(text, {delay: 20});
        await pause(300);
    }
    async function addHighlight(h) {
        await panel().getByRole('button', {name: 'Add Highlight', exact: true}).click();
        const d = page.getByRole('dialog', {name: 'Add Highlight'});
        await d.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await idle(page);
        await setRich(d, '#highlight-title-control-en_ifr', h.title);
        await d.locator('#highlight-url-control').fill(h.url);
        await d.locator('#highlight-urlText-control-en').fill('Read more');
        const resp = page.waitForResponse((r) => /\/api\/v1\/highlights/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15_000}).catch(() => null);
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await d.waitFor({state: 'hidden', timeout: 8000}).catch(() => {});
        await idle(page); await pause(600);
        return r ? r.status() : null;
    }
    async function press(name) {
        const b = panel().getByRole('button', {name, exact: true});
        if (!(await b.isVisible().catch(() => false))) return `no "${name}" button`;
        await b.click();
        await idle(page); await pause(400);
        return 'pressed';
    }
    async function up(title, times) {
        for (let i = 0; i < times; i++) {
            const b = panel().getByRole('button', {name: `Increase position of ${title}`, exact: true});
            if (!(await b.isVisible().catch(() => false))) return `no up arrow for ${title}`;
            await b.click();
            await pause(300);
        }
        return 'pressed';
    }
    async function saveOrder() {
        const resp = page.waitForResponse((r) => /\/api\/v1\/highlights\/order/.test(r.url()), {timeout: 15_000}).catch(() => null);
        const p = await press('Save Order');
        const r = await resp;
        await idle(page); await pause(400);
        return {press: p, status: r ? r.status() : null, sent: r ? r.request().postData() : null};
    }
    async function homeSlides() {
        const ctx = await page.context().browser().newContext();
        const p = await ctx.newPage();
        try {
            await p.goto(app.url(`/index.php/${path}/en`));
            await p.waitForLoadState('load');
            const slides = await p.locator('.highlights li.swiper-slide:not(.swiper-slide-duplicate) .swiper-slide-title').allInnerTexts().then((a) => a.map((x) => x.trim()));
            // where the carousel sits: its top on the page, the viewport's height, the blocks before it in its parent
            const where = await p.evaluate(() => {
                const b = document.querySelector('.highlights');
                if (!b) return null;
                const before = [];
                for (let e = b.previousElementSibling; e; e = e.previousElementSibling) before.unshift(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`);
                return {top: Math.round(b.getBoundingClientRect().top + window.scrollY), height: Math.round(b.getBoundingClientRect().height), viewport: window.innerHeight, parent: `${b.parentElement.tagName.toLowerCase()}.${[...b.parentElement.classList].join('.')}`, before};
            });
            if (MODE !== 'steps') {
                record(`${MODE}-home`, await screen(p));
                await shot(p, `${MODE}-home`);
            }
            return {slides, where};
        } finally {
            await ctx.close();
        }
    }

    try {
        // 1
        await signIn(page, 'rvaca');
        // 2
        await openHighlightsTab();
        await snap('highlights-tab');
        // 3-4
        for (const h of H) fact(`3-4 add ${h.title}`, await addHighlight(h));
        fact('4 list', await state());
        await snap('three-added');

        if (MODE === 'failed') {
            fact('f Order', await press('Order'));
            fact('f up x2', await up('u11a Third', 2));
            fact('f moved', await state());
            // a second window of the same session deletes "u11a Second"
            const page2 = await page.context().newPage();
            await page2.goto(app.url(`/index.php/${path}/en/management/settings/website`));
            await idle(page2);
            const st = page2.locator('#setup-button').first();
            await st.waitFor({timeout: T});
            if ((await st.getAttribute('aria-selected')) !== 'true') await st.click();
            await page2.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
            await idle(page2);
            const row = page2.locator('.highlightsListPanel .listPanel__item').filter({hasText: 'u11a Second'});
            await row.getByRole('button', {name: /^Delete/}).click();
            const dlg = page2.getByRole('dialog').filter({hasText: 'Are you sure'});
            await dlg.getByRole('button', {name: 'Yes', exact: true}).click();
            await idle(page2); await pause(500);
            fact('f second window rows after delete', await page2.locator('.highlightsListPanel .listPanel__itemTitle').allInnerTexts().then((a) => a.map((x) => x.trim())));
            await page2.close();
            // back in the first window
            fact('f Save Order', await saveOrder());
            const err = page.getByRole('dialog').filter({hasText: /unexpected error|Error/});
            await err.first().waitFor({timeout: 8000}).catch(() => {});
            const sErr = await snap('failed-save-dialog');
            fact('f dialog', sErr.text && sErr.text.dialog);
            fact('f list behind the dialog', await state());
            const ok = page.getByRole('button', {name: 'OK', exact: true});
            if (await ok.isVisible().catch(() => false)) { await ok.click(); await idle(page); await pause(400); }
            fact('f after OK', await state());
            await snap('failed-save-after-ok');
            await shot(page, 'failed-save-after-ok');
            await openHighlightsTab();
            fact('f after reload', await state());
            fact('f home page', await homeSlides());
            return;
        }

        if (MODE === 'neighbour') {
            fact('nb Order', await press('Order'));
            fact('nb up x2', await up('u11a Third', 2));
            fact('nb moved', await state());
            fact('nb Save Order', await saveOrder());
            fact('nb after save', await state());
            await snap('saved');
            await openHighlightsTab();
            fact('nb after reload', await state());
            await snap('reloaded');
            fact('nb home page slides', await homeSlides());
            return;
        }

        // 5
        fact('5 Order', await press('Order'));
        fact('5 ordering mode', await state());
        await snap('ordering-mode');
        // 6
        fact('6 up x2', await up('u11a Third', 2));
        fact('6 moved', await state());
        await snap('moved');
        // 7
        fact('7 Cancel', await press('Cancel'));
        fact('7 after cancel', await state());
        await snap('after-cancel');
        await shot(page, 'after-cancel');
        // 8
        await openHighlightsTab();
        fact('8 after reload', await state());
        await snap('reloaded');
        fact('8 home page slides', await homeSlides());
        // 9
        fact('9 Order', await press('Order'));
        fact('9 up x2', await up('u11a Third', 2));
        fact('9 Cancel', await press('Cancel'));
        fact('9 after cancel', await state());
        await snap('after-second-cancel');
        // 10
        fact('10 Order', await press('Order'));
        fact('10 ordering mode rows', await rows());
        fact('10 Save Order', await saveOrder());
        fact('10 after save', await state());
        await snap('after-save-order');
        // 11
        await openHighlightsTab();
        fact('11 after reload', await state());
        await snap('reloaded-after-save');
        await shot(page, 'reloaded-after-save');
        fact('11 home page slides', await homeSlides());
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
