// Helpers for walk.js (U59 A6). Requiring this file runs nothing.

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * Where a refused form stands now: the scrolling box around it (the
 * window's, or the page), how far it is scrolled, and for each refused
 * field (in the form's order) its label and how far its first element
 * (the one Form.vue's `showField()` scrolls to) sits below the box's top.
 * `atTop` is the refused field the scroll stopped at (50 px below the
 * top, Form.vue's offset), null when the box is scrolled to its end or
 * elsewhere; `inView` lists the refused fields whose label is in view.
 * Waits first until the scroll has stopped moving.
 *
 * @param {import('@playwright/test').Locator} form the form
 * @param {string} formId the form's id ("context")
 */
async function readJump(form, formId = 'context') {
    return form.evaluate(async (formEl, id) => {
        const scrollBox = (() => {
            for (let el = formEl.parentElement; el && el !== document.body; el = el.parentElement) {
                const oy = getComputedStyle(el).overflowY;
                if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) return el;
            }
            return null;
        })();
        const pos = () => (scrollBox ? scrollBox.scrollTop : window.scrollY);
        // The scroll has stopped: the same position on three reads 150 ms apart (3 s at most).
        let last = pos();
        let same = 0;
        for (let i = 0; i < 20 && same < 2; i++) {
            await new Promise((r) => setTimeout(r, 150));
            const now = pos();
            same = now === last ? same + 1 : 0;
            last = now;
        }
        const boxTop = scrollBox ? scrollBox.getBoundingClientRect().top : 0;
        const boxHeight = scrollBox ? scrollBox.clientHeight : window.innerHeight;
        const names = [];
        formEl.querySelectorAll('.pkpFieldError, [id*="-error"]').forEach((e) => {
            const m = (e.id || '').match(new RegExp(`^${id}-(.+?)-error`));
            if (m && !names.includes(m[1])) names.push(m[1]);
        });
        const fields = names.map((name) => {
            const el = document.querySelector(`[id*="${id}-${name}"]`);
            const label = formEl.querySelector(`[id^="${id}-${name}-"] .pkpFormFieldLabel, [id^="${id}-${name}-"] legend, label[for^="${id}-${name}-"]`);
            const top = el ? Math.round(el.getBoundingClientRect().top - boxTop) : null;
            return {
                name,
                label: label ? label.textContent.replace(/\s+/g, ' ').replace(/\*.*$/, '').trim() : null,
                top,
                inView: top !== null && top >= 0 && top < boxHeight,
            };
        });
        const button = formEl.querySelector('.pkpFormErrors__goTo');
        const bTop = button ? button.getBoundingClientRect().top - boxTop : null;
        const active = document.activeElement;
        const at = fields.find((f) => f.top !== null && Math.abs(f.top - 50) <= 3);
        return {
            scrollBox: scrollBox ? scrollBox.className.split(/\s+/).slice(0, 2).join(' ') || scrollBox.tagName : 'window',
            scrollTop: Math.round(pos()),
            scrollMax: Math.round(scrollBox ? scrollBox.scrollHeight - scrollBox.clientHeight : document.documentElement.scrollHeight - window.innerHeight),
            atTop: at ? at.name : null,
            inView: fields.filter((f) => f.inView).map((f) => f.name),
            fields,
            jumpButtonInView: bTop !== null && bTop >= 0 && bTop < boxHeight,
            focus: active ? `${active.tagName.toLowerCase()}${active.id ? `#${active.id}` : ''}${active.className && typeof active.className === 'string' ? `.${active.className.split(/\s+/)[0]}` : ''}` : null,
        };
    }, formId);
}

/**
 * Press "Jump to next error" as a person would (brought into view first,
 * as a person scrolls back down to it) and read where the form stands.
 *
 * @param {import('@playwright/test').Locator} form
 * @param {import('@playwright/test').Locator} button
 */
async function pressJump(form, button) {
    await button.scrollIntoViewIfNeeded();
    const before = await readJump(form);
    await button.click();
    const after = await readJump(form);
    return {
        before: {scrollTop: before.scrollTop, atTop: before.atTop},
        scrollTop: after.scrollTop,
        scrollMax: after.scrollMax,
        atTop: after.atTop,
        inView: after.inView,
        jumpButtonInView: after.jumpButtonInView,
        focus: after.focus,
    };
}

module.exports = {T, flat, WORDS, readJump, pressJump};
