// Issue report walk: docs/issues/U52-A1-fees-promised-on-about-page-shown-nowhere.md
// (spec U52 register A1). OJS only: OMP and OPS have no "Payment Types" tab.
//
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset, freshly reset):
//   1-2  as rvaca, Settings › Distribution › "Payments" (Enable, USD, Manual
//        Fee Payment, instructions, Save);
//   3-4  side menu "Payments" › "Payment Types": the sentences under the three
//        headings; APC 50, Purchase Issue 7, Purchase Article 5, Association
//        Membership 20, Save;
//   5-6  signed out: "About" › "About the Journal", then "About" › "Submissions";
//   7    as amwandenga: "About the Journal" again.
// Neighbour (for the fix): the same tab read in French (fr_CA, the dataset's
// second language), whose translations an English-only fix leaves alone, and
// the "Author Fees" sentence, which the fix must not change.
// Records every screen with screen(), and for each public page whether it
// holds "Policies", "fee", "USD" or one of the four amounts.
//
// Run from pkp-e2e (reset first, the walk changes the journal's settings):
//   npm run fleet-prep -- --feature issues-w46 --dataset 2 --reset
//   PROBE_FEATURE=issues-w46 PROBE_AGENT=w46 node bin/probe.js ojs shared/playwright/checks/issues/fees-promised-on-about-page-shown-nowhere/walk.js
// On 3.5, PKP_E2E_LINE=stable-3_5_0 in front of both, --feature issues-w46-3_5,
// PROBE_FEATURE=issues-w46-3_5 and PROBE_RUN=r35.
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/[\s ]+/g, ' ').trim().slice(0, n));
const MANAGER = 'rvaca';
const READER = 'amwandenga';
const FEES = {apc: '50', purchaseIssue: '7', purchaseArticle: '5', membership: '20'};

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no "Payment Types" tab on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const {PaymentSettingsTab, JournalPaymentsPage, PAYMENTS_TEXT: TEXT} = require('../../../pages/PaymentsPages.js');
    const home = `/index.php/${app.contextPath}/en`;
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`); };

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };

    /** The "Payment Types" tab's three headings and the sentence under each. */
    async function readTab(types) {
        const out = {};
        for (const h of [TEXT.authorFees, TEXT.readerFees, TEXT.generalFees]) {
            out[h] = flat(await types.sectionSentence(h).first().innerText({timeout: 5000}).catch(() => null));
        }
        return out;
    }

    /** All the sentences of the tab's form, whatever the language (the neighbour in French). */
    async function readTabAnyLanguage(pp) {
        await pp.showTab(await pp.tabs().nth(await pp.tabs().count() - 2).innerText().then((t) => t.trim()));
        const form = page.locator('#paymentTypesForm');
        await form.waitFor({timeout: T});
        return {
            headings: (await form.locator('div.section > label').allInnerTexts()).map((x) => flat(x)),
            sentences: (await form.locator('div.section > p').allInnerTexts()).map((x) => flat(x)),
        };
    }

    /** A public page as a person reads it: heading, text, and any fee on it. */
    async function readPublic(name) {
        await idle(page);
        const main = flat(await page.locator('.pkp_structure_main').first().innerText({timeout: 5000}).catch(() => ''), 4000);
        const out = {
            url: page.url().replace(app.baseURL, ''),
            h1: flat(await page.locator('.pkp_structure_main h1').first().innerText({timeout: 3000}).catch(() => null)),
            mainChars: main.length,
            hasPolicies: /polic/i.test(main),
            hasFee: /\bfees?\b|charge/i.test(main),
            hasCurrency: /USD|\$|US Dollar/.test(main),
            amounts: Object.values(FEES).filter((v) => new RegExp(`(^|[^0-9.])${v}(\\.00)?([^0-9]|$)`).test(main)),
            main: main.slice(0, 600),
        };
        await snap(name, {walk: out});
        fact(name, out);
        return out;
    }

    /** Open an entry of the journal's "About" menu as a person does, from the home page. */
    async function openAbout(entry) {
        await page.goto(app.url(home)); await idle(page);
        const nav = page.locator('#navigationPrimary');
        await nav.getByRole('link', {name: 'About', exact: true}).first().hover();
        const link = nav.getByRole('link', {name: entry, exact: true}).first();
        await link.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
        if (await link.isVisible().catch(() => false)) await link.click();
        else await nav.getByRole('link', {name: entry, exact: true}).first().click({force: true});
        await page.waitForLoadState('load');
    }

    try {
        // ------------------------------------------------ 1-2: payments set up
        await signIn(page, MANAGER);                                                       // 1
        const settings = new PaymentSettingsTab(page, app.contextPath);                    // 2
        await settings.goto();
        await settings.enableBox().check();
        await settings.currencySelect().selectOption('USD');
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.instructionsBox().fill('Pay by bank transfer.');
        await settings.save();
        await snap('step2-payments-saved');

        // ------------------------------------------------ 3-4: the "Payment Types" tab
        await page.reload(); await idle(page);
        const pp = new JournalPaymentsPage(page, app.contextPath);
        const menuPayments = page.getByRole('navigation').getByRole('link', {name: 'Payments', exact: true}).first();
        const viaMenu = await menuPayments.isVisible().catch(() => false);
        if (viaMenu) { await menuPayments.click(); await page.waitForLoadState('load'); await idle(page); } else await pp.goto();
        fact('step3-payments-via-side-menu', viaMenu);
        const types = await pp.showPaymentTypes();                                         // 3
        fact('step3-tab-sentences', await readTab(types));
        await snap('step3-payment-types');
        await types.type(TEXT.apc, FEES.apc);                                              // 4
        await types.type(TEXT.purchaseIssue, FEES.purchaseIssue);
        await types.type(TEXT.purchaseArticle, FEES.purchaseArticle);
        await types.type(TEXT.membership, FEES.membership);
        await types.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await snap('step4-fees-saved');
        await page.reload(); await idle(page);
        const kept = await pp.showPaymentTypes();
        fact('step4-fees-after-reload', {
            apc: await kept.box(TEXT.apc).inputValue(), purchaseIssue: await kept.box(TEXT.purchaseIssue).inputValue(),
            purchaseArticle: await kept.box(TEXT.purchaseArticle).inputValue(), membership: await kept.box(TEXT.membership).inputValue(),
        });

        // ------------------------------------------------ neighbour: the same tab in French
        await page.goto(app.url(`/index.php/${app.contextPath}/fr_CA/payments`)); await idle(page);
        fact('neighbour-tab-fr_CA', await readTabAnyLanguage(pp));
        await snap('neighbour-tab-fr_CA');

        // ------------------------------------------------ 5-6: the public pages, signed out
        await signOut(page);
        await openAbout('About the Journal');                                              // 5
        await readPublic('step5-about-signed-out');
        await openAbout('Submissions');                                                    // 6
        await readPublic('step6-submissions-signed-out');

        // ------------------------------------------------ 7: About the Journal as a reader
        await signIn(page, READER);                                                        // 7
        await openAbout('About the Journal');
        await readPublic('step7-about-reader');
    } finally {
        record('facts', facts);
        await close();
    }
});
