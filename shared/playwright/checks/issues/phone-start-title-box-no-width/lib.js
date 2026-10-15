// Helpers for walk.js (U21 A22). Requiring this file runs nothing.

const TITLE_ID = 'startSubmission-title-control';

/**
 * The "Make a Submission" screen's widths: the side menu, the main area, the Title box (TinyMCE's iframe and its
 * container), the page's sideways scroll, and the width chain from the iframe up to <body> with the CSS that sizes
 * each box (what decides how narrow the box may get).
 */
function readStart(page, id = TITLE_ID) {
    return page.evaluate((id) => {
        const box = (el) => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {x: Math.round(r.x), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right)};
        };
        const iframe = document.getElementById(`${id}_ifr`);
        const chain = [];
        for (let e = iframe; e && e !== document.documentElement; e = e.parentElement) {
            const cs = getComputedStyle(e);
            chain.push({
                el: e.tagName.toLowerCase() + (e.id ? `#${e.id}` : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.') : ''),
                w: Math.round(e.getBoundingClientRect().width), scrollWidth: e.scrollWidth, display: cs.display,
                width: e.style.width || null, minWidth: cs.minWidth, maxWidth: cs.maxWidth, flex: cs.flex,
                overflowX: cs.overflowX, gridTemplateColumns: cs.display.includes('grid') ? cs.gridTemplateColumns : undefined,
            });
        }
        const begin = [...document.querySelectorAll('button')].find((b) => /Begin Submission/.test(b.textContent));
        return {
            viewport: window.innerWidth,
            docScrollWidth: document.documentElement.scrollWidth,
            scrollsSideways: document.documentElement.scrollWidth > window.innerWidth,
            sideNav: box(document.querySelector('.app__body > nav')),
            main: box(document.getElementById('app-main')),
            titleEditor: box(iframe),
            titleContainer: box(iframe && iframe.closest('.tox-tinymce')),
            beginButton: box(begin),
            chain,
        };
    }, id);
}

/** Tap the Title box and type; record whether the text landed in the editor. Never throws. */
async function tapAndType(page, text, {waitForEditorReady, id = TITLE_ID} = {}) {
    const r = {};
    try {
        await page.locator(`#${id}_ifr`).waitFor({state: 'attached', timeout: 30_000});
        if (waitForEditorReady) await waitForEditorReady(page, id);
        await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000});
        r.tap = 'ok';
        await page.keyboard.type(text);
    } catch (e) {
        r.tap = `failed: ${String(e.message).split('\n')[0].slice(0, 200)}`;
    }
    r.content = await page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id).catch(() => null);
    r.landed = r.content === text;
    return r;
}

/**
 * Every visible field of the first visible form inside `scope` (a CSS selector): its label and the width of its
 * control (text box, text area, rich-text editor, select), the form's own box, and what in `scope` runs past the
 * scope's right edge (its sideways overflow), outermost first.
 */
function readFields(page, scope = '#app-main') {
    return page.evaluate((scope) => {
        const root = [...document.querySelectorAll(scope)].filter((e) => e.offsetParent || e.getClientRects().length).pop();
        if (!root) return {found: false};
        const form = [...root.querySelectorAll('.pkpForm')].find((f) => f.getClientRects().length);
        const w = (el) => (el ? Math.round(el.getBoundingClientRect().width) : null);
        const fields = form ? [...form.querySelectorAll('.pkpFormField')].filter((f) => f.getClientRects().length).map((f) => {
            const label = f.querySelector('.pkpFormFieldLabel, legend, label');
            const ctl = f.querySelector('iframe.tox-edit-area__iframe, input[type="text"], input[type="email"], input[type="url"], textarea:not([aria-hidden="true"]), select');
            return {label: label ? label.innerText.replace(/\s+/g, ' ').trim().slice(0, 60) : null, control: ctl ? ctl.tagName.toLowerCase() : null, controlWidth: w(ctl), fieldWidth: w(f)};
        }) : [];
        const groups = form ? [...form.querySelectorAll('.pkpFormGroup')].filter((g) => g.getClientRects().length).map((g) => ({w: w(g), scrollWidth: g.scrollWidth, minWidth: getComputedStyle(g).minWidth})) : [];
        const rr = root.getBoundingClientRect();
        const over = [];
        for (const el of root.querySelectorAll('*')) {
            const r = el.getBoundingClientRect();
            if (r.width && r.right > rr.right + 1 && !over.some((o) => o.el.contains(el))) over.push({el, right: Math.round(r.right)});
            if (over.length >= 5) break;
        }
        return {
            found: true, viewport: window.innerWidth, docScrollWidth: document.documentElement.scrollWidth,
            scope: {w: Math.round(rr.width), right: Math.round(rr.right), scrollWidth: root.scrollWidth, clientWidth: root.clientWidth},
            form: form ? {w: w(form), scrollWidth: form.scrollWidth} : null, groups,
            zeroWidthControls: fields.filter((f) => f.control && !f.controlWidth).length, fields,
            overflow: over.map((o) => ({el: o.el.tagName.toLowerCase() + '.' + String(o.el.className || '').trim().split(/\s+/).slice(0, 3).join('.'), right: o.right})),
        };
    }, scope);
}

/** Click the first visible text box and the first visible rich-text editor of the form in `scope` and type into each. Never throws. */
async function tryControls(page, text, scope = '#app-main') {
    const out = {};
    const input = page.locator(`${scope} .pkpForm input[type="text"]:visible`).first();
    try {
        await input.click({timeout: 5000});
        await page.keyboard.type(text);
        out.textBox = {tap: 'ok', value: await input.inputValue()};
    } catch (e) {
        out.textBox = {tap: `failed: ${String(e.message).split('\n')[0].slice(0, 160)}`};
    }
    const ifr = page.locator(`${scope} .pkpForm iframe.tox-edit-area__iframe`).first();
    try {
        const id = (await ifr.getAttribute('id', {timeout: 5000})).replace(/_ifr$/, '');
        await page.frameLocator(`#${id}_ifr`).locator('body').click({timeout: 5000});
        await page.keyboard.type(text);
        out.richText = {id, tap: 'ok', value: await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), id)};
    } catch (e) {
        out.richText = {tap: `failed: ${String(e.message).split('\n')[0].slice(0, 160)}`};
    }
    return out;
}

module.exports = {TITLE_ID, readStart, tapAndType, readFields, tryControls};
