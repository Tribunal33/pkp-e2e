// Issue report for U10 A12: in French (Canada) the settings upload boxes read Dropzone's own English texts
// (the drop area's "Drop files here to upload", a refused file's "You can't upload files of this type.")
// instead of the interface language's. Takes the report's Steps on PKP's default test dataset (a dataset
// fleet), all three apps, as `rvaca`:
//   WALK=steps (default)  1 sign in; 2 initials menu › "Change Language" › "Français (Canada)"; 3–4 Settings ›
//                         Website › "Apparence" › "Configuration": every upload box's drop area and button;
//                         5 "Avancé": the same; 6 "Configuration", "Logo" › "Téléverser un fichier" u10i-logo.pdf:
//                         the message under the box. Nothing is saved.
//   WALK=nb               the neighbour (fix in and out), in English: the drop areas of both side tabs, the refused
//                         PDF's message, then "Logo" › "Upload File" u10i-logo.png, "Alternate text" "u10i logo",
//                         "Save"; the page reloaded: the saved logo in the box. Saves one setting: reset first.
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-boxes-drop-text-english/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-boxes-drop-text-english/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle, outFile} = require('../../../probe');
const L = require('./lib');
const A7 = require('../refused-upload-locks-box/lib');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a12-${MODE}-${s}${run}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const locale = MODE === 'nb' ? 'en' : 'fr_CA';
    const facts = {app: app.name, line, mode: MODE, locale, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => {
        fact(`dialog ${Object.keys(facts.steps).length}`, {type: d.type(), message: d.message()});
        d.accept().catch(() => null);
    });
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out || {});
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const logo = A7.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        if (locale === 'fr_CA') {
            await step('2 Change Language › Français (Canada)', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`)).catch(() => null);
                await idle(page);
                await changeLanguage(page, 'Français', 'fr_CA');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            });
        }
        await step('3-4 Apparence › Configuration: upload boxes', async () => {
            const tab = await L.openAppearance(page, app, 'setup', locale);
            return {...tab, boxes: await L.readBoxes(page, 'appearance-setup')};
        });
        record(name('setup'), await screen(page));
        await shot(page, name('setup'));
        await step('5 Avancé: upload boxes', async () => {
            const tab = await L.openAppearance(page, app, 'advanced', locale);
            return {...tab, boxes: await L.readBoxes(page, 'advanced')};
        });
        record(name('advanced'), await screen(page));
        await step('6 Configuration, Logo › Upload File, u10i-logo.pdf', async () => {
            await L.openAppearance(page, app, 'setup', locale);
            await logo.button.waitFor({timeout: L.T});
            const press = await A7.pressUploadFile(page, logo, files.pdf);
            const error = await logo.field.locator('.pkpFieldError__message').allInnerTexts().catch(() => []);
            return {press, error: error.map((x) => x.replace(/\s+/g, ' ').trim()), state: await A7.boxState(page, logo)};
        });
        record(name('after-refusal'), await screen(page));
        await shot(page, name('after-refusal'));
        if (MODE === 'nb') {
            await step('nb Logo › Upload File, u10i-logo.png', async () => {
                await L.openAppearance(page, app, 'setup', locale);
                await logo.button.waitFor({timeout: L.T});
                const press = await A7.pressUploadFile(page, logo, files.png);
                return {press, state: await A7.boxState(page, logo)};
            });
            await step('nb Alternate text, Save', async () => {
                await logo.field.locator('.pkpFormField--uploadImage__altTextInput').fill('u10i logo');
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: L.T}).catch(() => null);
                await logo.save.click();
                const r = await saved;
                await page.waitForTimeout(1000);
                return {saveStatus: r ? r.status() : null, state: await A7.boxState(page, logo)};
            });
            await step('nb reload: the saved logo', async () => {
                await L.openAppearance(page, app, 'setup', locale);
                await logo.button.waitFor({state: 'attached', timeout: L.T});
                return {state: await A7.boxState(page, logo)};
            });
            record(name('logo-saved'), await screen(page));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
