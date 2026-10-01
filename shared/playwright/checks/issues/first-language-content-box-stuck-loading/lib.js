// Helpers for walk.js (U09 A20). Requiring this file runs nothing.
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * The report's console snippet, verbatim: every "load" listener added from
 * now on to an iframe whose id holds "-fr_CA-" (a French TinyMCE editor of a
 * legacy form) is called 3 s late, so the French "Content" box finishes its
 * set-up after the English one, the order a busy computer gives now and then.
 * The event handed on late is wrapped, since its dispatch has ended by then.
 */
const HOLD_SNIPPET = `(() => {
  const add = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function (type, fn, opts) {
    if (type === 'load' && this instanceof HTMLIFrameElement && /-fr_CA-/.test(this.id) && typeof fn === 'function') {
      const frame = this;
      return add.call(this, type, (event) => {
        const late = new Proxy(event, {get: (e, k) => (k === 'composedPath' ? () => [frame]
          : k === 'target' || k === 'currentTarget' ? frame
          : typeof e[k] === 'function' ? e[k].bind(e) : e[k])});
        setTimeout(() => fn.call(frame, late), 3000);
      }, opts);
    }
    return add.call(this, type, fn, opts);
  };
})();`;

/** Step 3 / 7: paste the snippet into the page (the console's equivalent). */
async function pasteHold(page) {
    await page.evaluate(HOLD_SNIPPET);
}

/** Collect the page's uncaught errors and console errors from now on. */
function scriptErrors(page) {
    const errs = [];
    page.on('pageerror', (e) => errs.push(`pageerror: ${flat(e.message)}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${flat(m.text())}`); });
    return errs;
}

/** Wait until the French "Content" editor of the form has finished its set-up (or `ms` passed). */
async function waitFrench(page, frId, ms = 10_000) {
    const ok = await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), frId, {timeout: ms})
        .then(() => true).catch(() => false);
    await sleep(1500);
    await idle(page);
    return ok;
}

/** What the English box shows: the editor's state, its "Loading..." spinner, the focus. */
async function boxState(page, id) {
    return page.evaluate((i) => {
        const ed = window.tinymce && window.tinymce.get(i);
        const box = ed && ed.getContainer();
        const thr = box && box.querySelector('.tox-throbber');
        const shown = !!(thr && thr.offsetParent !== null && getComputedStyle(thr).display !== 'none');
        return {
            initialized: !!(ed && ed.initialized),
            spinnerShown: shown,
            spinnerBusy: thr ? thr.getAttribute('aria-busy') : null,
            spinnerLabel: thr ? (thr.innerText || thr.getAttribute('aria-label') || '').trim() || (thr.querySelector('[aria-label]') || {getAttribute: () => null}).getAttribute('aria-label') : null,
            focusInSpinner: !!(thr && thr.contains(document.activeElement)),
        };
    }, id);
}

/**
 * Steps 6 / 10: click into the English box's writing area and type. Returns
 * whether the click landed, what took it instead, and what the editor holds.
 */
async function clickAndType(page, id, text) {
    const body = page.locator(`[id="${id}_ifr"]`).contentFrame().locator('body');
    let clicked = true; let blockedBy = null;
    try {
        await body.click({timeout: 5000});
    } catch (e) {
        clicked = false;
        const m = /<[^>]+> (?:from <[^>]+> subtree )?intercepts pointer events/.exec(e.message);
        blockedBy = m ? flat(m[0], 200) : flat(e.message.split('\n')[0], 200);
    }
    if (clicked) await page.keyboard.type(text);
    else await page.keyboard.type(text).catch(() => {});
    await sleep(500);
    const holds = await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}).trim(), id).catch((e) => `read failed: ${e.message}`);
    return {clicked, blockedBy, holds};
}

/**
 * The neighbour: the language indicator beside the "Content" box after the
 * focus leaves it (pkp's MultilingualInputHandler marks a field whose
 * languages are filled only in part `localizationIncomplete`).
 */
async function indicator(page, id, leave) {
    await leave();
    await sleep(800);
    return page.evaluate((i) => {
        const ta = document.getElementById(i);
        const c = ta && ta.closest('.localization_popover_container, [class*="localization"]');
        return c ? c.className.split(/\s+/).filter((k) => /localization/.test(k)) : null;
    }, id);
}

module.exports = {sleep, flat, HOLD_SNIPPET, pasteHold, scriptErrors, waitFrench, boxState, clickAndType, indicator};
