// Issue walk for spec U40 OPS3, joined to docs/issues/U49-A10-ops-french-date-posted-raw-key.md:
// on a preprint server shown in French (Canada), the Author's banner on a posted version and the
// Copyright Holder / Copyright Year descriptions on "Permissions & Disclosure" read as codes.
// Steps, on PKP's default test dataset (OPS `main` or `stable-3_5_0`); nothing is created:
//   Author's banner:
//     1. Sign in as ckwantes (author of submission 2, posted).
//     2. The initials menu > "Change Language" > "français".
//     3. Open /index.php/publicknowledge/fr_CA/dashboard/mySubmissions?workflowSubmissionId=2
//     4. In the side menu, press "Titre et résumé".  5. Read the banner above the form.
//   Permissions & Disclosure:
//     1. Sign in as dbarnes.  2. "Change Language" > "français".
//     3. Open /index.php/publicknowledge/fr_CA/dashboard/editorial?workflowSubmissionId=1
//     4. Press "Autorisations et divulgation".  5. Read the Copyright Holder / Year descriptions.
//     6. The same page of submission 2.
//   On OJS and OMP (run with `all`) the same two paths are the control: OJS submissions 17
//   (author vkarbasizaed) and 5, OMP submissions 14 (author mdawson) and 4.
// Modes (MODE=…):
//   steps (default) the Steps above, then the same pages in English (OPS).
//   nb    the fix's neighbour, OPS only: the English pages and the French texts already
//         translated on the same pages (labels, the License description), which a fix to OPS's
//         French file must leave as they are; no language change by menu.
// Run on a freshly reset dataset fleet:
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> [MODE=nb] node bin/probe.js all shared/playwright/checks/issues/ops-french-author-banner-copyright-codes/walk.js
//   (PKP_E2E_LINE=stable-3_5_0 in front for 3.5)
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'steps';
const rel = (u) => u.replace(/^https?:\/\/[^/]+/, '');
const POSTED = {ojs: 17, omp: 14, ops: 2};
const UNPOSTED = {ojs: 5, omp: 4, ops: 1};
const AUTHOR = {ojs: 'vkarbasizaed', omp: 'mdawson', ops: 'ckwantes'};
const MENU = {
    fr_CA: {title: 'Titre et résumé', permissions: 'Autorisations et divulgation'},
    en: {title: 'Title & Abstract', permissions: 'Permissions & Disclosure'},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (MODE === 'nb' && app.name !== 'ops') return;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 2500)}`);
    };
    const step = async (k, fn) => {
        try { fact(k, await fn()); } catch (e) { fact(`${k} error`, L.flat(e.message, 400)); }
    };
    const {page, close} = await launch(app);
    const author = AUTHOR[app.name], posted = POSTED[app.name], unposted = UNPOSTED[app.name];
    try {
        if (MODE === 'steps') {
            // Author's banner. 1-2
            await signIn(page, author);
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
            await idle(page);
            await changeLanguage(page, 'français', 'fr_CA');
            fact('A2 language', {user: author, url: rel(page.url()), htmlLang: await page.locator('html').getAttribute('lang')});
            // 3-5
            await step('A4 menu', async () => {
                await L.openWorkflow(page, app, 'fr_CA', posted, 'mySubmissions');
                return L.pressMenu(page, MENU.fr_CA.title);
            });
            await step('A5 fr_CA', async () => ({submission: posted, ...(await L.readTitlePage(page))}));
            record('ops3-author-fr', await screen(page));
            if (app.name === 'ops') {
                await step('A control en', async () => {
                    await L.openWorkflow(page, app, 'en', posted, 'mySubmissions');
                    await L.pressMenu(page, MENU.en.title);
                    return L.readTitlePage(page);
                });
            }
            await signOut(page);
            // Permissions & Disclosure. 1-2
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page);
            await changeLanguage(page, 'français', 'fr_CA');
            fact('P2 language', {url: rel(page.url()), htmlLang: await page.locator('html').getAttribute('lang')});
            // 3-5, then 6
            for (const [k, id] of [['P5 unposted', unposted], ['P6 posted', posted]]) {
                await step(`${k} fr_CA`, async () => {
                    await L.openWorkflow(page, app, 'fr_CA', id);
                    const menu = await L.pressMenu(page, MENU.fr_CA.permissions);
                    return {submission: id, menu, ...(await L.readPermissionsPage(page))};
                });
                record(`ops3-perm-${id}-fr`, await screen(page));
            }
            if (app.name === 'ops') {
                await step('P control en', async () => {
                    await L.openWorkflow(page, app, 'en', unposted);
                    await L.pressMenu(page, MENU.en.permissions);
                    return L.readPermissionsPage(page);
                });
            }
        } else if (MODE === 'nb') {
            await signIn(page, author);
            await step('nb author en', async () => {
                await L.openWorkflow(page, app, 'en', posted, 'mySubmissions');
                await L.pressMenu(page, MENU.en.title);
                return L.readTitlePage(page);
            });
            await signOut(page);
            await signIn(page, 'dbarnes');
            await step('nb perm en', async () => {
                await L.openWorkflow(page, app, 'en', unposted);
                await L.pressMenu(page, MENU.en.permissions);
                return L.readPermissionsPage(page);
            });
            await step('nb perm fr_CA', async () => {
                await L.openWorkflow(page, app, 'fr_CA', posted);
                await L.pressMenu(page, MENU.fr_CA.permissions);
                return L.readPermissionsPage(page);
            });
            record('ops3-nb', await screen(page));
        }
    } catch (e) {
        fact('error', L.flat(e.message, 400));
        await record(`ops3-${MODE}-error`, await screen(page).catch(() => null));
        throw e;
    } finally {
        record(`ops3-${MODE}-facts`, facts);
        await close();
    }
});
