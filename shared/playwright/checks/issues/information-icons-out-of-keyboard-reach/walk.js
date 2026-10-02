// Issue report docs/issues/U64-A7-information-icons-out-of-keyboard-reach.md (U64 A7, U65 A5): the
// report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"). The kit builds nothing and the walk changes nothing.
//
// Default mode (OJS, OMP, OPS), as `dbarnes`:
//   Statistics › "Journal" ("Press", "Server"), OJS Statistics › "Issues", Statistics › "Editorial
//   Activity", and Settings › Distribution › "Search Indexing". On each: the information icons as the
//   page has them; the pointer rested on the first one (the text shows); then the page's heading
//   ("Trends" on Editorial Activity, the tab's name on the settings page) clicked and Tab pressed
//   through the page. WALK_PAGES=context,issues,editorial,indexing picks pages.
// `neighbour` as the argument (the fix in and out; runs alone): on "Search Indexing", the "Description"
//   icon given the focus, Enter and Space pressed, then clicked with the mouse: nothing may be saved;
//   the globe button of the same field still takes the focus and shows its text.
// `enter` as the argument (the fix in and out; runs alone): on "Search Indexing", Enter pressed inside
//   the "Description" box: no icon's text may show and nothing may be sent (pkp/pkp-lib#8801, where
//   Enter in a field opened a tooltip while the icon was a button with no type).
// Each step records the state it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u64e --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u64e PROBE_AGENT=u64e node bin/probe.js all shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/walk.js [neighbour|enter]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u64e-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u64e-3_5 PROBE_AGENT=u64e node bin/probe.js all shared/playwright/checks/issues/information-icons-out-of-keyboard-reach/walk.js
// Facts: .reports/<feature>/u64e/facts[-neighbour][-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const {flat, sleep, open, icons, hoverIcon, tabThrough, focusIt, shownText, writes} = require('./lib');

const MODE = process.argv.includes('neighbour') ? 'neighbour' : process.argv.includes('enter') ? 'enter' : 'steps';
const INDEXING = 'management/settings/distribution#indexing';

/** One page: its icons, the pointer on the first, then Tab through it from `start`. */
async function onePage(page, app, name, path, {waitFor, start, scope}, facts) {
    const out = {path, opened: await open(page, app, path, waitFor)};
    try {
        out.heading = flat(await page.locator('main h1').first().innerText().catch(() => null), 80);
        out.icons = await icons(page);
        record(name, await screen(page));
        if (out.icons.length) {
            out.pointer = await hoverIcon(page, 0);
            out.focusByScript = await focusIt(page, '.tooltipButton', 0);
            await page.evaluate(() => document.activeElement && document.activeElement.blur());
        }
        out.keyboard = await tabThrough(page, start(page), {scope: scope || 'main'});
        await shot(page, name);
    } catch (e) {
        out.error = flat(e.message, 300);
    }
    facts[name] = out;
}

const h1 = (page) => page.locator('main h1').first();
const trends = (page) => page.getByRole('heading', {name: 'Trends', exact: true}).first(); // the page's first h1 is for screen readers only
const PAGES = (process.env.WALK_PAGES || 'context,issues,editorial,indexing').split(',');
const indexingTab = (page) => page.getByRole('tab', {name: 'Search Indexing'}).first();

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line, dataset: app.dataset};
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'steps') {
            if (PAGES.includes('context')) await onePage(page, app, 'context', 'stats/context/context', {waitFor: '.pkpStats__panel', start: h1}, facts);
            if (PAGES.includes('issues') && app.name === 'ojs') await onePage(page, app, 'issues', 'stats/issues/issues', {waitFor: '.pkpStats__panel', start: h1}, facts);
            if (PAGES.includes('editorial')) await onePage(page, app, 'editorial', 'stats/editorial/editorial', {waitFor: '.pkpStats table', start: trends}, facts);
            if (PAGES.includes('indexing')) await onePage(page, app, 'indexing', INDEXING, {waitFor: '.tooltipButton', start: indexingTab}, facts);
        } else if (MODE === 'enter') {
            facts.opened = await open(page, app, INDEXING, '.tooltipButton');
            await indexingTab(page).click().catch(() => {});
            await sleep(500);
            const sent = writes(page);
            const box = page.locator('.pkpFormField--text input:visible').first();
            facts.box = flat(await box.inputValue(), 60);
            await box.click();
            await page.mouse.move(2, 2);
            await sleep(300);
            await page.keyboard.press('Enter');
            await sleep(400);
            facts.shownRightAfter = await shownText(page);
            await sleep(1500);
            const s = await screen(page);
            facts.afterEnter = {writes: sent.list(), shown: await shownText(page), notices: s.notices,
                focus: await page.evaluate(() => { const e = document.activeElement; return e ? `${e.tagName.toLowerCase()}${e.closest('.tooltipButton') ? ' (icon)' : ''}` : null; })};
            sent.stop();
            record('enter', s);
        } else {
            facts.opened = await open(page, app, INDEXING, '.tooltipButton');
            await indexingTab(page).click().catch(() => {});
            await sleep(500);
            facts.icons = await icons(page);
            const sent = writes(page);
            const urlBefore = page.url();
            facts.iconFocus = await focusIt(page, '.tooltipButton', 0);
            if (facts.iconFocus.took) {
                await page.keyboard.press('Enter');
                await sleep(700);
                facts.afterEnter = {writes: sent.list(), shown: await shownText(page)};
                await page.keyboard.press('Space');
                await sleep(700);
                facts.afterSpace = {writes: sent.list(), shown: await shownText(page)};
            }
            await page.locator('.tooltipButton:visible').first().click();
            await sleep(900);
            const s = await screen(page);
            facts.afterClick = {writes: sent.list(), shown: await shownText(page), notices: s.notices, sameAddress: page.url() === urlBefore,
                dialogs: await page.getByRole('dialog').count()};
            await page.mouse.move(2, 2);
            await page.evaluate(() => document.activeElement && document.activeElement.blur());
            facts.globe = await focusIt(page, '.multilingualProgress button', 0);
            sent.stop();
            record('neighbour', s);
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
        record(`threw-${MODE}`, await screen(page).catch(() => null));
    } finally {
        record(MODE === 'steps' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
