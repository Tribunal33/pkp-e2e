// U29 OMP3 issue walk (docs/issues/U29-OMP3-press-internal-guidelines-no-list-buttons.md): on a
// press, Settings › Workflow › "Review" › "Reviewer Guidance" gives "Internal Review Guidelines" a
// smaller rich-text toolbar (no Blockquote, Bullet list, Numbered list) than "External Review
// Guidelines" and "Competing Interests". On PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), `publicknowledge`, as `dbarnes`; the kit builds nothing. Only a press has the
// internal box: on another app the script says so and stops. Every step is recorded and none
// throws, so the same script reads the state a fix brings.
//
// MODE=walk (default): the steps. Read each box's toolbar; in "External Review Guidelines" press
//   "Bullet list" and type two lines; in "Internal Review Guidelines" look for the button and type
//   the same two lines; then paste a bulleted list (the way round) into the internal box; "Save",
//   reload, read both boxes and the stored values.
// MODE=nb, the neighbour alone (with a fix in and out): the two shared boxes keep their eight
//   buttons, the three boxes keep their screen order, and plain text typed into each of the three
//   is saved to its own setting and nowhere else.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/press-internal-guidelines-no-list-buttons/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/omp3-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');

const MODE = process.env.MODE || 'walk';
const TAG = 'u29w4';
const BOXES = {
    internalReviewGuidelines: 'Internal Review Guidelines',
    reviewGuidelines: 'External Review Guidelines',
    competingInterests: 'Competing Interests',
};
const flat = (s, n = 800) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Every rich-text box of the form: its heading and its toolbar buttons' names, in screen order. */
async function toolbars(page) {
    return page.locator('#reviewerGuidance').evaluate((form) =>
        [...form.querySelectorAll('.pkpFormField--richTextarea')]
            .filter((f) => f.offsetParent !== null)
            .map((f) => ({
                heading: (f.querySelector('.pkpFormField__heading') || {}).innerText?.replace(/\s+/g, ' ').trim(),
                buttons: [...f.querySelectorAll('.tox-toolbar button[aria-label], .tox-toolbar__primary button[aria-label]')]
                    .map((b) => b.getAttribute('aria-label')),
            })));
}

/** The visible field of one box (the primary language's). */
function field(page, setting) {
    return page.locator('#reviewerGuidance .pkpFormField--richTextarea')
        .filter({has: page.locator(`iframe[id^="reviewerGuidance-${setting}-control"]`)}).first();
}

/** The box's editable body. */
function body(page, setting) {
    return page.frameLocator(`iframe[id^="reviewerGuidance-${setting}-control"]`).first().locator('body');
}

/** The box's content as its editable body holds it (the bundled TinyMCE is not on `window`). */
async function content(page, setting) {
    return body(page, setting).evaluate((el) => el.innerHTML).catch(() => null);
}

/** A toolbar button of one box by its name (count 0 when the box has none). */
function button(page, setting, name) {
    return field(page, setting).locator(`.tox-toolbar button[aria-label="${name}"], .tox-toolbar__primary button[aria-label="${name}"]`);
}

/** Paste HTML into a box, as copying a list from a word processor and pasting it does. */
async function pasteHtml(page, setting, html, text) {
    const b = body(page, setting);
    await b.click();
    await b.evaluate((el, d) => {
        const dt = new DataTransfer();
        dt.setData('text/html', d.html);
        dt.setData('text/plain', d.text);
        el.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
    }, {html, text});
    await sleep(500);
}

/** Empty a box and type lines into it, Enter between them. */
async function typeLines(page, setting, lines) {
    const b = body(page, setting);
    await b.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Delete');
    for (let i = 0; i < lines.length; i++) {
        if (i) await page.keyboard.press('Enter');
        await page.keyboard.type(lines[i]);
    }
    await sleep(300);
}

/** The stored English value of each setting. */
function stored(app) {
    const t = app.contextTables || {table: 'presses', id: 'press_id', settings: 'press_settings'};
    const out = {};
    for (const s of Object.keys(BOXES)) {
        out[s] = sql(app, `select coalesce(string_agg(setting_value, ' || '), '<no row>') from ${t.settings} s join ${t.table} c on c.${t.id} = s.${t.id} where c.path = '${app.contextPath}' and s.setting_name = '${s}' and s.locale = 'en'`);
    }
    return out;
}

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: flat(e.message, 500)}; }
        console.log(`[omp3 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`omp3-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `omp3-${MODE}-${key}`).catch(() => {});
        record(`omp3-facts-${MODE}`, o);
        return o[key];
    };
    const open = async () => {
        const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
        const settings = new ReviewSettingsPage(page, app.contextPath);
        await settings.goto('Reviewer Guidance');
        await idle(page);
        await page.locator('#reviewerGuidance .tox-toolbar, #reviewerGuidance .tox-toolbar__primary').first().waitFor({timeout: 30_000});
        await sleep(500);
        return settings;
    };
    try {
        // Steps 1-3
        const opened = await step('open', async () => {
            await signIn(page, 'dbarnes');
            await open();
            const hasInternal = await page.locator('iframe[id^="reviewerGuidance-internalReviewGuidelines-control"]').count();
            return {url: page.url(), hasInternal};
        });
        if (!opened || opened.threw || !opened.hasInternal) {
            console.log(`[omp3 ${app.name}] no "Internal Review Guidelines" box: not walked`);
            return;
        }
        if (MODE === 'nb') {
            await step('nbToolbars', async () => toolbars(page));
            await step('nbSave', async () => {
                const typed = {};
                for (const [s, label] of Object.entries(BOXES)) {
                    typed[s] = `${TAG} ${label} only`;
                    await typeLines(page, s, [typed[s]]);
                }
                const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
                await new ReviewSettingsPage(page, app.contextPath).guidance.save();
                return {typed};
            });
            await step('nbAfterReload', async () => {
                await open();
                const after = {};
                for (const s of Object.keys(BOXES)) after[s] = await content(page, s);
                return {toolbars: await toolbars(page), content: after, stored: stored(app)};
            });
            return;
        }
        // Steps 4-5
        await step('toolbars', async () => toolbars(page));
        // Step 6
        await step('externalList', async () => {
            const b = body(page, 'reviewGuidelines');
            await b.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            const btn = button(page, 'reviewGuidelines', 'Bullet list');
            const offered = await btn.count();
            if (offered) await btn.first().click();
            await page.keyboard.type(`${TAG} external one`);
            await page.keyboard.press('Enter');
            await page.keyboard.type(`${TAG} external two`);
            await sleep(300);
            return {bulletListButton: offered, content: await content(page, 'reviewGuidelines')};
        });
        // Step 7
        await step('internalList', async () => {
            const b = body(page, 'internalReviewGuidelines');
            await b.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            const btn = button(page, 'internalReviewGuidelines', 'Bullet list');
            const offered = await btn.count();
            if (offered) await btn.first().click();
            await page.keyboard.type(`${TAG} internal one`);
            await page.keyboard.press('Enter');
            await page.keyboard.type(`${TAG} internal two`);
            await sleep(300);
            return {bulletListButton: offered, content: await content(page, 'internalReviewGuidelines')};
        });
        // Step 8: the way round, a pasted list
        await step('internalPaste', async () => {
            const b = body(page, 'internalReviewGuidelines');
            await b.click();
            await page.keyboard.press('Control+A');
            await page.keyboard.press('Delete');
            await pasteHtml(page, 'internalReviewGuidelines',
                `<ul><li>${TAG} pasted one</li><li>${TAG} pasted two</li></ul>`,
                `${TAG} pasted one\n${TAG} pasted two`);
            return {content: await content(page, 'internalReviewGuidelines')};
        });
        // Step 9
        await step('save', async () => {
            const {ReviewSettingsPage} = require('../../../pages/ReviewSettingsPages.js');
            await new ReviewSettingsPage(page, app.contextPath).guidance.save();
            return {saved: true};
        });
        await step('afterReload', async () => {
            await open();
            return {
                toolbars: await toolbars(page),
                internal: await content(page, 'internalReviewGuidelines'),
                external: await content(page, 'reviewGuidelines'),
                stored: stored(app),
            };
        });
    } finally {
        await close();
    }
});
