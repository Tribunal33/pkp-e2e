// U70 A8, the same fault on an email's "To" box {OJS}: in "Accept Submission" › "Notify Reviewers"
// on PKP's default test dataset (submission 10, "Condensing Water Availability Models to Focus on
// Specific Water Management Systems", review round 1, whose two reviewers both completed, as
// `dbarnes`), both reviewers removed from "To", then `a` typed and the box left without choosing:
// Tab, then (the chip removed again) a click on the page's heading each put the first matching reviewer back. The decision is then recorded and the reviewers' mailboxes read.
// Steps group "An email's recipients" of docs/issues/U70-A8-add-entry-publishes-book-nobody-chose.md.
//
// Run (reset the dataset fleet first):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs \
//     shared/playwright/checks/issues/add-entry-save-publishes-unchosen-book/composer.js
// MODE=neighbour runs the neighbour check alone: a suggestion clicked in "To" is added.
// The script opens the wizard by its address (the workflow's "Accept Submission" leads there).
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, record, shot, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const REVIEWERS = ['amccrae', 'agallego'];

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const W = require('../../../../../apps/ojs/playwright/pages/DecisionWizardPages.js');
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[composer ${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `c-${name}-error`).catch(() => {});
            return {error: L.flat(e.message, 600)};
        }
    };
    const since = new Date();
    try {
        await signIn(page, 'dbarnes');
        const wizard = new W.DecisionWizardPage(page);
        const composer = new W.ComposerPage(page);
        fact('c1-open', await step('c1', async () => {
            await page.goto(W.DecisionWizardPage.recordUrl(app.contextPath, 10, 2, 8));
            // The h1 opens with white space, which the page object's anchored match misses.
            await wizard.heading().filter({hasText: 'Notify Authors'}).waitFor({timeout: L.T});
            await wizard.continueStep(); // "Notify Authors" › "Continue"
            await wizard.heading().filter({hasText: 'Notify Reviewers'}).waitFor({timeout: L.T});
            await wizard.awaitComposerLoaded();
            await idle(page);
            return {heading: L.flat(await wizard.heading().innerText()), to: await composer.recipientNames()};
        }));
        fact('c2-removed', await step('c2', async () => {
            await composer.removeRecipient('Aisla McCrae');
            await composer.removeRecipient('Adela Gallego');
            return {to: await composer.recipientNames()};
        }));
        const typeA = async () => {
            const input = composer.recipientsInput();
            await input.click();
            await input.pressSequentially('a', {delay: 30});
            await composer.recipientOptions().first().waitFor({state: 'visible', timeout: L.T}).catch(() => {});
            return composer.recipientOptions().allInnerTexts();
        };
        if (MODE === 'walk') {
            fact('c3-tab', await step('c3', async () => {
                const options = await typeA();
                await composer.recipientsInput().press('Tab');
                await L.sleep(800);
                const to = await composer.recipientNames();
                await shot(page, 'c3-after-tab');
                return {options, to};
            }));
            fact('c4-click-heading', await step('c4', async () => {
                for (const n of ['Aisla McCrae', 'Adela Gallego']) {
                    if ((await composer.recipientNames()).includes(n)) await composer.removeRecipient(n);
                }
                const before = await composer.recipientNames();
                const options = await typeA();
                // The suggestions cover "Subject:", so the click goes to the page's heading.
                await wizard.heading().click();
                await L.sleep(800);
                const to = await composer.recipientNames();
                await shot(page, 'c4-after-heading-click');
                return {before, options, to};
            }));
            fact('c5-record', await step('c5', async () => {
                await wizard.continueStep(); // "Notify Reviewers" › "Continue"
                await L.sleep(1000);
                const heading = L.flat(await wizard.heading().innerText());
                const done = await wizard.recordDecision('Submission Accepted');
                const dialog = L.flat(await done.innerText(), 300);
                await idle(page);
                await shot(page, 'c5-recorded');
                return {headingBeforeRecord: heading, dialog};
            }));
            fact('c6-mail', await step('c6', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`)).catch(() => {});
                await L.sleep(5000);
                const out = {};
                for (const u of REVIEWERS) out[u] = await app.mail.count({to: `${u}@mailinator.com`, since});
                return out;
            }));
        } else {
            fact('cn1-click-option', await step('cn1', async () => {
                const options = await typeA();
                await composer.recipientOptions().filter({hasText: 'Adela Gallego'}).click();
                await L.sleep(800);
                return {options, to: await composer.recipientNames()};
            }));
        }
    } finally {
        record(`a8-composer-${MODE}`, facts);
        await close();
    }
});
