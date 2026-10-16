/**
 * @file playwright/support/legacy.js
 *
 * Helpers for the legacy jQuery-driven surfaces (grids, AjaxModals, the
 * file-upload wizard). Promoted from the OJS app-local helper when the OPS
 * suite became its second consumer (patterns.md: "promote it when a second
 * app suite needs it"); the app-local files re-export from here.
 */
const {expect} = require('@playwright/test');

/**
 * Wait until jQuery has no in-flight AJAX requests. The Playwright counterpart
 * of Cypress's cy.waitJQuery(); call it after interacting with legacy
 * jQuery-driven UI (AjaxModal saves, grid refreshes). No-op on pages without
 * jQuery.
 *
 * @param {import('@playwright/test').Page} page
 */
async function waitForJQueryIdle(page) {
    await page.waitForFunction(() => !window.jQuery || window.jQuery.active === 0);
}

/**
 * Wait until a legacy form has stopped moving, before a press on one of its
 * buttons: every part it loads by AJAX has arrived (a `load_url_in_div`
 * part, such as the reviewer forms' "Files To Be Reviewed" grid above "Add
 * Reviewer", renders its `.pkp_loading` placeholder until its answer lands
 * and then pushes the buttons down), no jQuery AJAX is in flight, no jQuery
 * animation runs (the "No Files Selected" warning then slides in over
 * 250 ms: the harness turns CSS motion off, not jQuery's timers) and every
 * web font is in (a late face reflows the text). Playwright checks a
 * click's target on the button-down only, so a shift between the down and
 * the up sends the up elsewhere and the press is lost without a sound: no
 * request, no error, the button merely focused (U31 S2/S4,
 * `.reports/flake-0930/u31s2s4/diagnosis.md`).
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} [scope] the window or form
 *   whose AJAX parts must have arrived (its placeholders are server-rendered,
 *   so this also holds before the form's own handler has bound)
 */
async function waitForLegacyFormSettled(page, scope) {
    if (scope) {
        await expect(scope.locator('.pkp_loading'), 'the form\'s AJAX-loaded parts arrive').toHaveCount(0, {
            timeout: 30_000,
        });
    }
    await page.waitForFunction(
        () => {
            const $ = window.jQuery;
            return (!$ || ($.active === 0 && $(':animated').length === 0)) && document.fonts.status === 'loaded';
        },
        undefined,
        {timeout: 30_000}
    );
}

/**
 * Wait until the page has applied the answer to a legacy AJAX form's
 * submit, after `waitForResponse` has seen it. Playwright's `response`
 * fires on the answer's headers; `AjaxFormHandler` applies the answer in
 * jQuery's callback once the body is read: a refusal answered 200 with the
 * form again (`JSONMessage(true, $form->fetch())`) swaps the pressed
 * `<form>` for a new one holding the posted values (`Handler.replaceWith`),
 * whose handler binds a tick later still (its inline `$(function () {…})`
 * runs from jQuery's ready promise). Between the answer and that swap the
 * old form is still on screen, so a box filled there is thrown away with it
 * and the next press posts the refused value again (OMP U73 S2 on CI,
 * `.reports/flake-2026-10-16/u73s2-pubdate/diagnosis.md`). Settled: no
 * jQuery request in flight (the callback runs before jQuery counts the
 * request done) and every shown form with `formId` has its handler bound.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} formId the form's id (`addPubDateForm`)
 */
async function legacyAnswerApplied(page, formId) {
    await page.waitForFunction(
        (id) => {
            const $ = window.jQuery;
            if (!$ || $.active !== 0) return false;
            return [...document.querySelectorAll(`form[id="${id}"]`)]
                .filter((form) => form.checkVisibility())
                .every((form) => $(form).data('pkp.handler') !== undefined);
        },
        formId,
        {timeout: 30_000}
    );
}

module.exports = {waitForJQueryIdle, waitForLegacyFormSettled, legacyAnswerApplied};
