// U64 housekeeping chunk I29: how the date range list ("Change date range")
// closes on the usage statistics pages — Escape, the button pressed again,
// a click outside, focus leaving the control — and what an unapplied
// Custom Range typed into it leaves behind (Fields "The date range", Rule 7).
//
// Run: PROBE_FEATURE=U64 PROBE_AGENT=ccI29 RUN=r1 node bin/probe.js ojs shared/playwright/checks/U64/I29/i29.js
//   (one app per process: about 4 min on OJS, 3 on OMP and OPS; `all` outlasts a 10-minute shell cap)
//   RUN names the facts file (facts-<RUN>-<app>.json); each run seeds its own scratch context
//   (manager, section editor), so two runs are independent. ONLY_EA=1 runs the "Editorial Activity"
//   control alone (facts-<RUN>-ea-<app>.json); SKIP_EA=1 leaves it out.
// Scratch contexts only; publicknowledge is never touched.
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const PAGES = (app) => [
    ['articles', 'stats/publications/publications'],
    ['journal', 'stats/context/context'],
    ...(app.name === 'ojs' ? [['issues', 'stats/issues/issues']] : []),
];

forEachApp(async (app) => {
    const T = tag(`u64i29${RUN}`);
    const ctx = await app.api.createContext({
        tag: T,
        context: {name: {en: `I29 Context ${T}`}},
        users: [
            {username: `${T}mgr`, givenName: 'MGR', familyName: 'Ieight', roles: ['manager']},
            {username: `${T}se`, givenName: 'SE', familyName: 'Ieight', roles: ['sectionEditor']},
        ],
    });
    const P = ctx.path || T;
    const facts = {run: RUN, context: P};
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        await d.accept().catch(() => {});
    });
    const btn = () => page.getByRole('button', {name: 'Change date range'});
    const list = () => page.locator('.pkpDateRange__options');
    const isOpen = async () => (await list().count()) > 0 && (await list().first().isVisible().catch(() => false));
    const state = () => page.evaluate(() => ({
        range: (document.querySelector('.pkpDateRange__current') || {}).innerText || null,
        focus: document.activeElement ? `${document.activeElement.tagName}.${[...document.activeElement.classList].join('.')}` : null,
        start: (document.querySelector('.pkpDateRange__input--start') || {}).value ?? null,
        end: (document.querySelector('.pkpDateRange__input--end') || {}).value ?? null,
    }));
    const snap = async (name) => {
        const s = await screen(page);
        record(`${RUN}-${name}`, s);
        return s;
    };
    // after any action, read at once and again after the control's 1 s blur poll
    const read = async (name) => {
        const now = await isOpen();
        await sleep(1600);
        await idle(page);
        const later = await isOpen();
        await snap(name);
        return {openAtOnce: now, openAfter1600ms: later, ...(await state())};
    };
    const ensureOpen = async () => {
        if (!(await isOpen())) await btn().click();
        await list().first().waitFor({timeout: 10_000});
    };

    try {
        for (const who of (process.env.ONLY_EA ? [] : ['mgr', 'se'])) {
            await signIn(page, `${T}${who}`, {contextPath: P});
            for (const [key, pth] of PAGES(app)) {
                const n = `${who}-${key}`;
                const f = {};
                const resp = await page.goto(app.url(`/index.php/${P}/en/${pth}`));
                await idle(page);
                const a = await snap(`${n}-arrive`);
                f.arrive = {status: resp && resp.status(), heading: flat(await page.locator('main h1').first().innerText().catch(() => null)), open: await isOpen(), ...(await state())};
                f.arriveTextHead = flat(a.text && a.text.main, 200);

                // 1. the button opens the list
                await btn().click();
                f.open = await read(`${n}-01-open`);
                f.open.listText = flat(await list().first().innerText().catch(() => null));
                if (who === 'mgr' && key === 'articles') {
                    await shot(page, `${RUN}-${n}-01-open`);
                    await loc(page, 'Date range: "Change date range" toggle button', btn());
                    await loc(page, 'Date range: open list', list());
                }

                // 2. Escape with the focus on the button
                await page.keyboard.press('Escape');
                f.escOnButton = await read(`${n}-02-esc-button`);

                // 3. the button pressed again
                await ensureOpen();
                await btn().click();
                f.buttonAgain = await read(`${n}-03-button-again`);

                // 4. Escape with the focus in the Custom Range start box
                await ensureOpen();
                await page.locator('.pkpDateRange__input--start').click();
                await page.keyboard.press('Escape');
                f.escInBox = await read(`${n}-04-esc-in-box`);

                // 5. the button pressed while the focus is in the list
                await ensureOpen();
                await page.locator('.pkpDateRange__input--start').click();
                await btn().click();
                f.buttonFromBox = await read(`${n}-05-button-from-box`);

                // 6. a click outside (the page heading), focus on the button
                await ensureOpen();
                await page.locator('main h1').first().click();
                f.clickOutside = await read(`${n}-06-click-outside`);

                // 7. a click outside with the focus in the start box
                await ensureOpen();
                await page.locator('.pkpDateRange__input--start').click();
                await page.locator('main h1').first().click();
                f.clickOutsideFromBox = await read(`${n}-07-click-outside-from-box`);

                // 8. Shift+Tab off the button (focus leaves the control backwards)
                await ensureOpen();
                await btn().focus();
                await page.keyboard.press('Shift+Tab');
                f.shiftTab = await read(`${n}-08-shift-tab`);

                // 9. a preset chosen (control for "choosing one closes the list")
                await ensureOpen();
                await page.locator('.pkpDateRange__option').filter({hasText: 'Last 90 days'}).first().click();
                f.preset90 = await read(`${n}-09-preset-90`);
                // 9b. reopened after the preset: what the Custom Range boxes hold; then "Apply" untouched
                await btn().click();
                f.reopenedAfterPreset = await read(`${n}-09b-reopened-after-preset`);
                await ensureOpen();
                await page.locator('.pkpDateRange__form').getByRole('button', {name: 'Apply'}).click();
                await idle(page);
                f.applyUntouched = await read(`${n}-09c-apply-untouched`);
                // 9d. "All dates", reopened: the boxes
                await ensureOpen();
                await page.locator('.pkpDateRange__option').filter({hasText: 'All dates'}).first().click();
                await idle(page);
                // on a context with nothing published "All dates" on "Articles" raises an "Error" window (Rule 9, A1)
                const errWin = page.getByRole('dialog').filter({hasText: 'Error'});
                await errWin.first().waitFor({timeout: 3000}).catch(() => {});
                if (await errWin.count()) {
                    f.allDatesError = flat(await errWin.first().innerText().catch(() => null));
                    await snap(`${n}-09d0-alldates-error`);
                    await errWin.first().getByRole('button', {name: 'OK'}).click();
                    await errWin.first().waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
                    await sleep(600);
                }
                await btn().click();
                f.reopenedAfterAllDates = await read(`${n}-09d-reopened-after-alldates`);
                await ensureOpen();
                await page.locator('.pkpDateRange__option').filter({hasText: 'Last 90 days'}).first().click();
                await idle(page);

                // 10. unapplied Custom Range: typed, list closed with the button, reopened
                await ensureOpen();
                await page.locator('.pkpDateRange__input--start').fill('2025-01-01');
                await page.locator('.pkpDateRange__input--end').fill('2025-02-01');
                await btn().click();
                f.typedThenButton = await read(`${n}-10-typed-then-button`);
                await btn().click();
                f.typedReopened = await read(`${n}-11-typed-reopened`);
                // 11. leave the page with it typed and unapplied (a side menu entry via address)
                const other = PAGES(app).find(([k]) => k !== key)[1];
                const before = dialogs.length;
                await page.goto(app.url(`/index.php/${P}/en/${other}`));
                await idle(page);
                await snap(`${n}-12-left`);
                f.leftTyped = {dialogs: dialogs.slice(before), url: page.url().replace(/^.*index\.php/, ''), ...(await state())};
                await page.goBack().catch(() => {});
                await idle(page);
                f.back = {open: await isOpen(), ...(await state())};
                // reload after a preset: what range does the page reopen on
                await ensureOpen();
                await page.locator('.pkpDateRange__option').filter({hasText: 'Last 12 months'}).first().click();
                await idle(page);
                const r12 = await state();
                await page.reload();
                await idle(page);
                await snap(`${n}-13-reloaded`);
                f.reloadAfterPreset = {afterPreset: r12.range, afterReload: (await state()).range, url: page.url().replace(/^.*index\.php/, '')};
                facts[n] = f;
            }
        }
        // Control on the other page that uses the same control (Statistics › "Editorial Activity",
        // U65's page; U64 owns the date range): Escape, the button again, a click outside.
        if (!process.env.SKIP_EA) {
            await signIn(page, `${T}mgr`, {contextPath: P});
            const f = {};
            await page.goto(app.url(`/index.php/${P}/en/stats/editorial/editorial`));
            await idle(page);
            await snap('mgr-editorial-arrive');
            f.arrive = {heading: flat(await page.locator('main h1').first().innerText().catch(() => null)), open: await isOpen(), ...(await state())};
            await btn().click();
            f.open = await read('mgr-editorial-01-open');
            f.open.listText = flat(await list().first().innerText().catch(() => null));
            await page.keyboard.press('Escape');
            f.escOnButton = await read('mgr-editorial-02-esc-button');
            await ensureOpen();
            await page.locator('.pkpDateRange__input--start').click();
            await page.keyboard.press('Escape');
            f.escInBox = await read('mgr-editorial-04-esc-in-box');
            await ensureOpen();
            await btn().click();
            f.buttonAgain = await read('mgr-editorial-03-button-again');
            await ensureOpen();
            // the page's h1 is screen-reader only here: click a blank spot of the page instead
            await page.mouse.click(1270, 890);
            f.clickOutside = await read('mgr-editorial-06-click-outside');
            facts['editorial-control'] = f;
        }
        facts.dialogs = dialogs;
        record(`facts-${RUN}${process.env.ONLY_EA ? '-ea' : ''}`, facts);
        if (RUN === 'r1') {
            note(`I29 (date range list, ${app.name}): toggle is getByRole('button', {name: 'Change date range'}); the open list is .pkpDateRange__options (absent from the DOM when closed, v-if); the list closes on the button's blur through a 10 ms timer, or a 1 s poll while the focus is inside the list, so read "closed" 1.5 s after the action.`);
        }
    } finally {
        await close();
    }
});
