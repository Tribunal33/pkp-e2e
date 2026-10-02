// Helpers for walk.js (U59 A7). Requiring this file runs nothing.

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * Collect the page's script failures from now on: uncaught page errors
 * and console errors, each with the time it came.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {{take: () => {at: number, kind: string, text: string, where: string}[]}} `take()`
 *   returns what came since the last call and empties the list
 */
function watchErrors(page) {
    let seen = [];
    page.on('pageerror', (e) => {
        const where = (String(e.stack || '').split('\n')[1] || '').trim().replace(/https?:\/\/[^/]+/, '');
        seen.push({at: Date.now(), kind: 'pageerror', text: flat(`${e.name}: ${e.message}`), where: flat(where, 160)});
    });
    page.on('console', (m) => {
        if (m.type() === 'error') seen.push({at: Date.now(), kind: 'console', text: flat(m.text()), where: ''});
    });
    return {
        take: () => {
            const out = seen;
            seen = [];
            return out;
        },
    };
}

/** The journal form's window: the dialog holding the "Path" box. */
function formWindow(page) {
    const root = page.getByRole('dialog').filter({has: page.locator('#context-urlPath-control')});
    return {
        root,
        path: root.locator('#context-urlPath-control'),
        prefix: root.locator('.pkpFormField__inputPrefix'),
        closeButton: root.getByRole('button', {name: 'Close', exact: true}).first(),
    };
}

/**
 * The "Path" box as drawn: the address shown in front of it, that
 * text's width, and the box's left padding (set once the field has
 * measured the address; empty before).
 *
 * @param {import('@playwright/test').Locator} scope the window or the page's form
 */
async function readPath(scope) {
    const box = scope.locator('#context-urlPath-control');
    const prefix = scope.locator('.pkpFormField__inputPrefix');
    if (!(await box.count())) return {box: false};
    return {
        box: true,
        prefix: (await prefix.count()) ? flat(await prefix.first().innerText()) : null,
        prefixWidth: (await prefix.count()) ? await prefix.first().evaluate((e) => e.clientWidth + e.offsetLeft) : null,
        padding: await box.evaluate((e) => e.style.paddingInlineStart || ''),
    };
}

/**
 * Wait until the "Path" box has taken its padding (the field's timer has
 * run), up to `ms`: true when it has.
 */
async function pathMeasured(scope, ms = 5_000) {
    return scope
        .locator('#context-urlPath-control')
        .evaluate(
            (e, limit) =>
                new Promise((resolve) => {
                    const start = Date.now();
                    const tick = () => {
                        if (e.style.paddingInlineStart) return resolve(true);
                        if (Date.now() - start > limit) return resolve(false);
                        setTimeout(tick, 50);
                    };
                    tick();
                }),
            ms,
        )
        .catch(() => false);
}

/**
 * Press "Close" on an open form window and watch what follows for 2 s:
 * when `quick`, at once after the form shows (or `delayMs` later);
 * otherwise once the "Path" box has taken its padding (the field's
 * 0.7 s timer has run).
 *
 * @returns {Promise<object>} how long the form had been showing, whether
 *   the window went, and each script failure with its delay after "Close"
 */
async function closeAndWatch(page, errors, {quick, delayMs = 0}) {
    const win = formWindow(page);
    await win.path.waitFor({state: 'visible', timeout: T});
    const shown = Date.now();
    let measured = null;
    if (!quick) measured = await pathMeasured(win.root);
    if (delayMs) await page.evaluate((ms) => new Promise((resolve) => setTimeout(resolve, ms)), delayMs);
    const before = errors.take();
    await win.closeButton.click();
    const closed = Date.now();
    const gone = await win.root
        .waitFor({state: 'detached', timeout: T})
        .then(() => true)
        .catch(() => false);
    await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 2_000)));
    return {
        shownForMs: closed - shown,
        pathMeasuredBeforeClose: measured,
        windowGone: gone,
        errorsBeforeClose: before.map((e) => e.text),
        errorsAfterClose: errors.take().map((e) => ({afterMs: e.at - closed, kind: e.kind, text: e.text, where: e.where})),
        heading: flat(await page.locator('main h1').first().innerText().catch(() => null)),
    };
}

/**
 * The console snippet the report gives a developer: pasted before "Edit"
 * or "Create Journal" is pressed, it presses the window's "Close" the
 * moment the "Path" box is added to the page. One use per paste.
 */
const CONSOLE_SNIPPET = `new MutationObserver((m, o) => {
  const box = document.querySelector('#context-urlPath-control');
  if (!box) return;
  o.disconnect();
  [...box.closest('[role="dialog"]').querySelectorAll('button')].find((b) => b.textContent.trim() === 'Close').click();
}).observe(document.body, {childList: true, subtree: true});`;

module.exports = {CONSOLE_SNIPPET, T, flat, WORDS, watchErrors, formWindow, readPath, pathMeasured, closeAndWatch};
