// Issue report for U10 A7: a file refused by an upload box of the settings forms locks the box's "Upload File"
// and the form's "Save". Takes the report's Steps on PKP's default test dataset (a dataset fleet), as `rvaca`:
//   WALK=steps (default)  Settings › Website › "Appearance" › "Setup": "Logo" › "Upload File" u10e-logo.pdf (step 3);
//                         "Upload File" again, choosing u10e-logo.png (step 4); a click on the box's drop area
//                         (step 5); the control: u10e-logo.png dragged onto the box. Then "Appearance" › "Advanced",
//                         "Journal style sheet" (a plain upload box): "Upload File" u10e-logo.pdf, "Upload File"
//                         again choosing u10e-style.css. Nothing is saved.
//   WALK=remove           steps 1–3, then the pointer over the empty frame: what the frame shows (its "Remove file"
//                         link: drawn size, colours, whether it is on top), a click on that link, the box after it.
//   WALK=css              the style sheet alone: "Appearance" › "Advanced", "Journal style sheet" › "Upload File"
//                         u10e-logo.pdf, then "Upload File" again choosing u10e-style.css. Nothing is saved.
//   WALK=favicon          "Appearance" › "Advanced", "Favicon" (a picture box taking .ico, .png and .gif) › "Upload
//                         File" u10e-icon.jpg (a real JPEG), then "Upload File" again choosing u10e-logo.png.
//   WALK=nb               the neighbour (fix in and out): "Logo" › "Upload File" u10e-logo.png, "Alternate text"
//                         "u10e logo", "Save"; the page reloaded: the saved logo in the box. Then "Journal style
//                         sheet" › "Upload File" u10e-style.css, "Save".
// Each step records the box as it stands (the field's text, "Upload File", "Remove", the drop area, "Save", the
// form's foot) and the uploads sent, and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10e --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u10e PROBE_AGENT=u10e node bin/probe.js all shared/playwright/checks/issues/refused-upload-locks-box/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10e-3_5 PROBE_AGENT=u10e node bin/probe.js all shared/playwright/checks/issues/refused-upload-locks-box/walk.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle, outFile} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a7-${MODE}-${s}${run}`;
    const files = L.makeFiles(path.dirname(outFile('files.txt')));
    const facts = {app: app.name, line, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    page.on('dialog', (d) => {
        fact(`dialog ${Object.keys(facts.steps).length}`, {type: d.type(), message: d.message()});
        d.accept().catch(() => null);
    });
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
        if (MODE === 'steps') {
            const logo = L.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
            await step('2 Appearance › Setup', async () => {
                await L.openAppearance(page, app, 'setup');
                await logo.button.waitFor({timeout: L.T});
                return {state: await L.boxState(page, logo)};
            });
            record(name('setup-before'), await screen(page));
            await step('3 Logo › Upload File, u10e-logo.pdf', async () => {
                const press = await L.pressUploadFile(page, logo, files.pdf);
                return {press, state: await L.boxState(page, logo)};
            });
            record(name('after-refusal'), await screen(page));
            await shot(page, name('after-refusal'));
            await step('4 Upload File again, u10e-logo.png', async () => {
                const press = await L.pressUploadFile(page, logo, files.png);
                return {press, state: await L.boxState(page, logo)};
            });
            await step('5 click the drop area', async () => {
                const click = await L.clickFrame(page, logo);
                return {click, state: await L.boxState(page, logo)};
            });
            record(name('after-step5'), await screen(page));
            await shot(page, name('after-step5'));
            await step('control: drag u10e-logo.png onto the box', async () => {
                await L.dropFile(page, logo, files.png, 'image/png');
                return {state: await L.boxState(page, logo)};
            });
            record(name('after-drop'), await screen(page));
        }
        if (MODE === 'steps' || MODE === 'css') {
            const css = L.box(page, 'appearanceAdvanced', 'styleSheet', null);
            await step('reach: Appearance › Advanced', async () => {
                await L.openAppearance(page, app, 'advanced');
                await css.button.waitFor({timeout: L.T});
                return {state: await L.boxState(page, css)};
            });
            await step('reach: style sheet › Upload File, u10e-logo.pdf', async () => {
                const press = await L.pressUploadFile(page, css, files.pdf);
                return {press, state: await L.boxState(page, css)};
            });
            record(name('stylesheet-after-refusal'), await screen(page));
            await shot(page, name('stylesheet-after-refusal'));
            await step('reach: style sheet › Upload File again, u10e-style.css', async () => {
                const press = await L.pressUploadFile(page, css, files.css);
                return {press, state: await L.boxState(page, css)};
            });
        } else if (MODE === 'remove') {
            const logo = L.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
            await step('2 Appearance › Setup', async () => {
                await L.openAppearance(page, app, 'setup');
                await logo.button.waitFor({timeout: L.T});
                return {};
            });
            await step('3 Logo › Upload File, u10e-logo.pdf', async () => ({press: await L.pressUploadFile(page, logo, files.pdf)}));
            await step('pointer over the frame', async () => {
                await logo.dropzone.locator('.dz-preview').first().hover();
                await L.sleep(800);
                await shot(page, name('hover'));
                return {link: await L.removeLink(page, logo)};
            });
            await step('click "Remove file" in the frame', async () => {
                const link = logo.dropzone.locator('a.dz-remove').first();
                const clicked = await link.click({timeout: 5000}).then(() => true).catch((e) => String(e.message).split('\n')[0]);
                await L.sleep(800);
                return {clicked, state: await L.boxState(page, logo)};
            });
            record(name('after-remove'), await screen(page));
            await shot(page, name('after-remove'));
        } else if (MODE === 'favicon') {
            const fav = L.box(page, 'appearanceAdvanced', 'favicon', 'en');
            await step('favicon: Appearance › Advanced', async () => {
                await L.openAppearance(page, app, 'advanced');
                await fav.button.waitFor({timeout: L.T});
                return {state: await L.boxState(page, fav)};
            });
            const jpg = await L.makeJpeg(page, path.dirname(files.png).replace(/[/]files$/, ''));
            await step('favicon: Upload File, u10e-icon.jpg', async () => {
                const press = await L.pressUploadFile(page, fav, jpg);
                await L.sleep(1000);
                return {press, state: await L.boxState(page, fav)};
            });
            await shot(page, name('favicon-after-refusal'));
            await step('favicon: Upload File again, u10e-logo.png', async () => {
                const press = await L.pressUploadFile(page, fav, files.png);
                return {press, state: await L.boxState(page, fav)};
            });
            record(name('favicon-end'), await screen(page));
        } else if (MODE === 'nb') {
            const logo = L.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');
            await step('nb Appearance › Setup', async () => {
                await L.openAppearance(page, app, 'setup');
                await logo.button.waitFor({timeout: L.T});
                return {state: await L.boxState(page, logo)};
            });
            await step('nb Logo › Upload File, u10e-logo.png', async () => {
                const press = await L.pressUploadFile(page, logo, files.png);
                return {press, state: await L.boxState(page, logo)};
            });
            await step('nb Alternate text, Save', async () => {
                await logo.field.locator('.pkpFormField--uploadImage__altTextInput').fill('u10e logo');
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: L.T}).catch(() => null);
                await logo.save.click();
                const r = await saved;
                await L.sleep(1000);
                return {saveStatus: r ? r.status() : null, state: await L.boxState(page, logo)};
            });
            await step('nb reload: the saved logo', async () => {
                await L.openAppearance(page, app, 'setup');
                await logo.button.waitFor({state: 'attached', timeout: L.T});
                return {state: await L.boxState(page, logo)};
            });
            record(name('logo-saved'), await screen(page));
            const css = L.box(page, 'appearanceAdvanced', 'styleSheet', null);
            await step('nb Advanced › style sheet › Upload File, u10e-style.css, Save', async () => {
                await L.openAppearance(page, app, 'advanced');
                await css.button.waitFor({timeout: L.T});
                const press = await L.pressUploadFile(page, css, files.css);
                const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: L.T}).catch(() => null);
                await css.save.click();
                const r = await saved;
                await L.sleep(1000);
                return {press, saveStatus: r ? r.status() : null, state: await L.boxState(page, css)};
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
