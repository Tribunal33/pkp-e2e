// Helpers of walk.js here (U41 A28). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const L = require('../affiliation-error-list-object-object/lib.js');

/**
 * The languages an open contributor form offers: the language buttons at its top, and the
 * per-language boxes of "Given Name" and of the Affiliations rows (label and value).
 */
async function formLanguages(dlg) {
    const f = (s) => L.flat(s, 200);
    return {
        localeButtons: (await dlg.locator('.pkpFormLocales__locale, .pkpFormLocales button').allInnerTexts().catch(() => [])).map(f),
        givenNameBoxes: await dlg.locator('input[name^="givenName"]').evaluateAll((bs) => bs.map((b) => b.name)).catch(() => []),
    };
}

/** The open form's institution name boxes after "Edit institution name": label and value each. */
async function nameBoxes(dlg) {
    return dlg
        .locator('.pkpFormField--affiliations tbody input.pkpFormField--text__input')
        .evaluateAll((bs) =>
            bs.map((b) => {
                const id = b.getAttribute('id');
                const own = b.labels && b.labels.length ? b.labels[0] : null;
                const near = b.closest('td, div') ? b.closest('td, div').querySelector('label') : null;
                const lab = own || near;
                return {
                    label: (lab ? lab.innerText : b.getAttribute('aria-label') || b.getAttribute('placeholder') || b.name || '').replace(/\s+/g, ' ').trim(),
                    id,
                    sameIdCount: id ? document.querySelectorAll(`[id="${id}"]`).length : 0,
                    value: b.value,
                };
            })
        );
}

/**
 * Settings > Website > Setup > Languages, "Submission Languages": untick `code`'s "Metadata".
 * When that is refused while "Submissions" is still ticked, untick "Submissions" first, then
 * "Metadata" (each press recorded). Returns the row before, the presses and the row after.
 */
async function untickMetadata(page, app, code) {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const tab = new JournalLanguagesTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    const out = {before: await L.submissionLanguageRow(tab, code), presses: []};
    out.presses.push({Metadata: await L.pressBox(tab, code, 'submissionMetadataLocale')});
    let row = await L.submissionLanguageRow(tab, code);
    if (row.metadata && row.submissions) {
        out.presses.push({Submissions: await L.pressBox(tab, code, 'submissionLocale')});
        out.presses.push({Metadata: await L.pressBox(tab, code, 'submissionMetadataLocale')});
        row = await L.submissionLanguageRow(tab, code);
    }
    out.after = row;
    await idle(page);
    return out;
}

/** The messages the open form shows under its fields (drawn ones only). */
async function fieldMessages(dlg) {
    return dlg
        .locator('.pkpFormFieldError, [id$="-error"]')
        .evaluateAll((es) => es.filter((e) => e.getClientRects().length).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
}

/** Answer the "Are you sure?" window that "Remove institution" opens. */
async function confirmYes(page) {
    const dlg = page.getByRole('dialog').filter({hasText: 'Are you sure?'}).last();
    await dlg.waitFor({timeout: L.T});
    const text = L.flat(await dlg.innerText(), 300);
    await dlg.getByRole('button', {name: 'Yes', exact: true}).click();
    await L.sleep(500);
    await idle(page);
    return text;
}

module.exports = {formLanguages, nameBoxes, untickMetadata, fieldMessages, confirmYes};
