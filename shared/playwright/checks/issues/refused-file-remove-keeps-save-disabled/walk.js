// Issue report for U10 A15: after "Logo" refuses a file, the refused file's hidden "Remove file" link frees "Upload
// File" but leaves the tab's "Save" disabled ("Go to Logo: undefined"). Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), as `rvaca`:
//   WALK=steps (default)  Settings › Website › "Appearance" › "Setup"; "Logo" › "Upload File" u10r9-logo.pdf (step 3);
//                         the pointer over the empty frame (step 4); "Remove file" (step 5). Then the controls: "Upload
//                         File" u10r9-logo.png and "Remove" (the way round); "Appearance" › "Advanced", "Journal style
//                         sheet" (one file for every language): "Upload File" u10r9-logo.pdf, "Remove file". Nothing is saved.
//   WALK=nb               the neighbour (fix in and out), alone: "Setup" with the French fields shown ("French" at the
//                         form's top); "Logo" refuses u10r9-logo.pdf in English, then in French (the English message
//                         must stay); "Remove file" in English (the French message must stay and "Save" stay
//                         disabled); "Remove file" in French ("Save" back with the fix).
// Each step records the box as it stands (the field's text, "Upload File", the drop area, "Save", the form's foot)
// and never throws on a state the fix changes.
//
// Reset first:  npm run fleet-prep -- --feature issues-r9 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r9 PROBE_AGENT=r9 node bin/probe.js all shared/playwright/checks/issues/refused-file-remove-keeps-save-disabled/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r9-3_5 PROBE_AGENT=r9 node bin/probe.js all shared/playwright/checks/issues/refused-file-remove-keeps-save-disabled/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle, outFile} = require('../../../probe');
const A7 = require('../refused-upload-locks-box/lib');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a15-${MODE}-${app.name}-${s}${run}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const facts = {app: app.name, line, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    const uploads = [];
    page.on('response', (r) => {
        if (/temporaryFiles/.test(r.url()) && r.request().method() === 'POST') uploads.push(r.status());
    });
    const step = async (label, action) => {
        const before = uploads.length;
        try {
            const out = await action();
            fact(label, {...(out || {}), uploadsSent: uploads.slice(before)});
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        const logo = A7.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
        await step('2 Appearance › Setup', async () => {
            await A7.openAppearance(page, app, 'setup');
            await logo.button.waitFor({timeout: A7.T});
            return {state: await A7.boxState(page, logo)};
        });
        if (MODE === 'steps') {
            await step('3 Logo › Upload File, u10r9-logo.pdf', async () => ({
                press: await A7.pressUploadFile(page, logo, files.pdf),
                state: await A7.boxState(page, logo),
            }));
            record(name('after-refusal'), await screen(page));
            await step('4 pointer over the empty frame', async () => {
                const out = await L.hoverFrame(page, logo);
                await shot(page, name('hover'));
                return out;
            });
            await step('5 click "Remove file"', async () => ({
                ...(await L.clickRemoveFile(page, logo)),
                state: await A7.boxState(page, logo),
            }));
            record(name('after-remove'), await screen(page));
            await shot(page, name('after-remove'));
            await step('control: Upload File u10r9-logo.png', async () => ({
                press: await A7.pressUploadFile(page, logo, files.png),
                state: await A7.boxState(page, logo),
            }));
            await step('control: "Remove" the picture', async () => {
                await logo.field.getByRole('button', {name: 'Remove', exact: true}).first().click({timeout: 5000});
                await A7.sleep(800);
                return {state: await A7.boxState(page, logo)};
            });
            const css = A7.box(page, 'appearanceAdvanced', 'styleSheet', null);
            await step('control: Appearance › Advanced', async () => {
                await page.locator('[id="advanced-button"]').first().click();
                await idle(page);
                await css.button.waitFor({timeout: A7.T});
                return {state: await A7.boxState(page, css)};
            });
            await step('control: style sheet › Upload File, u10r9-logo.pdf', async () => ({
                press: await A7.pressUploadFile(page, css, files.pdf),
                state: await A7.boxState(page, css),
            }));
            await step('control: style sheet › "Remove file"', async () => ({
                hover: await L.hoverFrame(page, css),
                ...(await L.clickRemoveFile(page, css)),
                state: await A7.boxState(page, css),
            }));
            record(name('stylesheet-after-remove'), await screen(page));
        } else if (MODE === 'nb') {
            const fr = A7.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'fr_CA');
            await step('nb show the French fields', async () => {
                const sw = await L.showLocale(page, logo, /French|Fran/);
                await fr.button.waitFor({state: 'attached', timeout: A7.T});
                return {sw, state: await A7.boxState(page, fr)};
            });
            await step('nb Logo (English) › Upload File, u10r9-logo.pdf', async () => ({
                press: await A7.pressUploadFile(page, logo, files.pdf),
                state: await A7.boxState(page, logo),
            }));
            await step('nb Logo (French) › Upload File, u10r9-logo.pdf', async () => ({
                press: await A7.pressUploadFile(page, fr, files.pdf),
                state: await A7.boxState(page, fr),
                en: await A7.boxState(page, logo),
            }));
            await step('nb "Remove file" in English', async () => ({
                ...(await L.clickRemoveFile(page, logo)),
                en: await A7.boxState(page, logo),
                fr: await A7.boxState(page, fr),
            }));
            record(name('after-remove-en'), await screen(page));
            await step('nb "Remove file" in French', async () => ({
                ...(await L.clickRemoveFile(page, fr)),
                fr: await A7.boxState(page, fr),
            }));
            record(name('after-remove-fr'), await screen(page));
            await shot(page, name('after-remove-fr'));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
