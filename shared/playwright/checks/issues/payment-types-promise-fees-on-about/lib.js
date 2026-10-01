// Helpers of walk.js and neighbour.js here, and of ../payment-types-required-note-no-required-field
// (issue reports docs/issues/U52-A1-… and U52-A4-…). Requiring this file runs nothing.
// Every helper presses what a person presses.
const {idle} = require('../../../probe');
const {flat} = require('../older-version-pdf-reader-empty/lib');
const {setUpPayments} = require('../priced-file-link-price-twice-or-missing/lib');

const T = 30_000;

/** The "Payment Types" boxes, by the label the tab gives them. */
const BOXES = ['Article Processing Charge', 'Purchase Issue', 'Purchase Article', 'Association Membership'];

/**
 * Reload the page (the side menu gains "Payments" only then), press "Payments" in the side menu and
 * the "Payment Types" tab. Returns the page object and the tab's.
 */
async function openPaymentTypes(page, app) {
    const {JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const payments = new JournalPaymentsPage(page, app.contextPath);
    await page.reload();
    await idle(page).catch(() => {});
    await payments.openFromSideMenu();
    const tabs = (await payments.tabs().allInnerTexts()).map((t) => flat(t, 60));
    const tab = await payments.showPaymentTypes();
    return {payments, tab, tabs};
}

/**
 * A legacy form as it stands: each section's heading and sentence, each field's label and value,
 * the buttons, every paragraph under the buttons, and what marks a field as required.
 */
async function readForm(form) {
    return form.evaluate((f) => {
        const flatten = (s) => (s || '').replace(/\s+/g, ' ').trim();
        const sections = [...f.querySelectorAll('div.section')].map((s) => ({
            heading: flatten(s.querySelector(':scope > label')?.textContent),
            sentence: flatten(s.querySelector(':scope > p')?.textContent),
        }));
        const fields = [...f.querySelectorAll('input[type="text"], input[type="email"], textarea, select, input[type="checkbox"]')]
            .filter((i) => i.offsetParent !== null)
            .map((i) => ({
                name: i.getAttribute('name'),
                label: flatten(f.querySelector(`label[for="${i.id}"]`)?.textContent),
                value: i.type === 'checkbox' ? i.checked : i.value,
                required: i.required || i.getAttribute('aria-required') === 'true' || /\brequired\b/.test(i.className),
            }));
        const buttons = [...f.querySelectorAll('button, .formButtons a')]
            .filter((b) => b.offsetParent !== null)
            .map((b) => flatten(b.textContent));
        const note = [...f.querySelectorAll('.formRequired')].map((n) => flatten(n.textContent));
        const asterisksOnFields = [...f.querySelectorAll('.req, label abbr.required')]
            .filter((n) => !n.closest('.formRequired'))
            .map((n) => flatten(n.closest('label, .section')?.textContent).slice(0, 80));
        return {
            sections,
            fields,
            buttons,
            note,
            asterisksOnFields,
            asterisksInFormText: (f.innerText.match(/\*/g) || []).length,
        };
    });
}

/** Type an amount into each box named in `fees` ({label: amount}). */
async function typeFees(tab, fees) {
    for (const [label, amount] of Object.entries(fees)) await tab.type(label, String(amount));
}

/** "Save" on the "Payment Types" tab: the answer's status, the passing notice, the refusal. */
async function saveTypes(page, tab) {
    const response = await tab.save();
    await idle(page).catch(() => {});
    const noticeShown = await tab
        .savedNotice()
        .first()
        .waitFor({timeout: 5000})
        .then(
            () => true,
            () => false
        );
    return {
        status: response.status(),
        notice: noticeShown ? flat(await tab.savedNotice().first().innerText(), 120) : null,
        refusal: flat(
            await tab
                .formError()
                .innerText()
                .catch(() => null),
            300
        ),
        underBoxes: (await tab.errorsUnderBoxes().allInnerTexts()).map((t) => flat(t, 160)),
    };
}

/** The boxes' values as the tab holds them. */
async function boxValues(tab) {
    const out = {};
    for (const label of BOXES) out[label] = await tab.box(label).inputValue();
    return out;
}

/** The reader site's "About" menu entries (name and address), as the page lists them. */
async function aboutMenu(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/index`));
    await idle(page).catch(() => {});
    return page.evaluate(() => {
        const out = [];
        for (const a of document.querySelectorAll('nav a[href], .pkp_navigation_primary a[href]')) {
            const name = (a.textContent || '').replace(/\s+/g, ' ').trim();
            const href = a.getAttribute('href');
            if (name && href && !href.startsWith('#') && !out.some((o) => o.href === href)) out.push({name, href});
        }
        return out;
    });
}

/**
 * A reader page by its address: status, title, headings, whether it says "Policies", and every
 * place its text names a fee word or one of the saved amounts.
 */
async function readPublic(page, url, amounts = []) {
    const response = await page.goto(url);
    await idle(page).catch(() => {});
    const read = await page.evaluate((nums) => {
        const main = document.querySelector('.pkp_structure_main, main') || document.body;
        const text = main.innerText.replace(/[ \t]+/g, ' ');
        const headings = [...main.querySelectorAll('h1, h2, h3')].map((h) => h.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        const hits = [];
        const words = /(fee|charge|membership|polic|USD|US Dollar|purchase|\$)/i;
        for (const line of text.split('\n')) {
            const l = line.trim();
            if (!l) continue;
            if (words.test(l) || nums.some((n) => new RegExp(`(^|[^0-9.])${n}([^0-9]|$)`).test(l))) hits.push(l.slice(0, 200));
        }
        return {
            headings,
            hits,
            length: text.length,
            policiesHeading: headings.some((h) => /polic/i.test(h)),
        };
    }, amounts.map(String));
    return {
        url: url.replace(/^https?:\/\/[^/]+/, ''),
        status: response ? response.status() : null,
        title: await page.title(),
        ...read,
    };
}

module.exports = {
    T,
    BOXES,
    flat,
    setUpPayments,
    openPaymentTypes,
    readForm,
    typeFees,
    saveTypes,
    boxValues,
    aboutMenu,
    readPublic,
};
