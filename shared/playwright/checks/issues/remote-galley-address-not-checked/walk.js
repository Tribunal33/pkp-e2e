// Issue report docs/issues/U46-A6-remote-galley-address-not-checked.md (U46 A6):
// "URL of remotely-hosted content" in a journal's or a preprint server's
// galley window keeps any text, such as "www.example.org" without
// "https://", and the reader's link then lands on the site's own "404 Not
// Found". Takes the report's Steps through the screens on a dataset fleet
// freshly reset to PKP's default test dataset, as `dbarnes`.
//
// OJS, submission 1 "Signalling Theory Dividends" (its newest version
// unpublished); OPS, submission 1 "The influence of lactation …"
// (Production):
//   2.   Publication (Preprint) › the newest version › "Galleys"
//   3-5. "Add galley", "Web u46w4", tick the remote box, "www.example.org", "Save"
//        (the upload window is cancelled)
//   6.   "Web u46w4" › "Edit": the address box read, "Cancel"
//   7.   OJS: publish the version (preselected details, "Confirm", "Publish");
//        OPS: "Post", "Post"
//   8.   signed out: the item's page, press "Web u46w4"
// OMP (the control, a press's publication format window), submission 4
// "How Canadians Communicate" › "Publication Formats" › "Add publication
// format", "Web u46w4", the remote box, "www.example.org", "OK".
//
// W4_MODE=nb is the fix's neighbour check, run alone (with the fix in and
// out): the same windows with a full address "https://www.example.org/u46w4"
// must still save and (OJS, OPS) the reader's link must go there (the browser
// really opens example.org; a script error that page's own script raises is
// recorded and is not the app's); a galley with the remote box unticked
// ("Draft u46w4", no file) must still save.
//
// Reset first:  npm run fleet-prep -- --feature issues-w4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-w4 PROBE_AGENT=w4 node bin/probe.js all shared/playwright/checks/issues/remote-galley-address-not-checked/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both (and PROBE_RUN=r35), feature issues-w4-3_5.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const G = require('../listing-offers-galley-without-file/lib');
const V = require('../older-version-pdf-reader-empty/lib');

const NB = process.env.W4_MODE === 'nb';
const LABEL = 'Web u46w4';
const ADDRESS = NB ? 'https://www.example.org/u46w4' : 'www.example.org';
const FACTS = NB ? 'facts-nb' : 'facts';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode: NB ? 'nb' : 'walk', address: ADDRESS};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    const p = (s) => (NB ? `nb-${s}` : s);
    try {
        await signIn(page, 'dbarnes');
        if (app.name === 'omp') {
            const {PublicationFormatsPage} = require(require('path').join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
            const formats = new PublicationFormatsPage(page, ctx);
            await formats.frame.gotoEditorial(4);
            await formats.frame.expectVersionLoaded().catch(() => {});
            await idle(page);
            if (app.line === 'stable-3_5_0') {
                // 3.5's side menu has no version entries: "Publication" › "Publication Formats".
                const link = formats.frame.menuLink('Publication Formats');
                if (!(await link.last().isVisible().catch(() => false))) await formats.frame.publicationGroup().click();
                await L.expect(link.last()).toBeVisible({timeout: L.T});
                await link.last().click();
                await formats.expectLoaded();
            } else {
                await formats.openFromMenu();
            }
            const win = await formats.openAdd();
            await win.typeName(LABEL);
            await win.remoteBox().check();
            await win.type(win.remoteUrlBox(), ADDRESS);
            fact('2 address box type', await win.remoteUrlBox().getAttribute('type'));
            fact('2 address box class', await win.remoteUrlBox().getAttribute('class'));
            const res = await L.pressAndRead(page, {button: win.okButton(), dialog: win.dialog(), form: win.form(), saveRe: /publication-format-grid\/update-format/});
            record(p('omp-02-ok'), await screen(page));
            await shot(page, p('omp-02-ok')).catch(() => {});
            fact('2 OK', res);
            if (res.windowOpen) {
                await win.cancel().catch(() => {});
            }
            await idle(page);
            const list = await page.locator('[id^="component-grid-catalogentry-publicationformatgrid"] .gridRow, .pkp_controllers_grid tr.gridRow').allInnerTexts().catch(() => []);
            fact('2 formats listed', list.map((s) => L.flat(s, 120)));
            return;
        }
        const ID = 1;
        const galleys = await G.openGalleys(page, app, ID);
        fact('2 galleys before', await galleys.labels());
        if (NB) {
            // A galley with the remote box unticked still saves (no file uploaded).
            const plain = await galleys.openCreate();
            await plain.type(plain.labelBox(), 'Draft u46w4');
            const r0 = await L.pressAndRead(page, {button: plain.saveButton(), dialog: plain.dialog(), form: plain.form(), saveRe: /update-galley/});
            fact('nb unticked galley save', r0);
            if (!r0.windowOpen) await galleys.cancelWizard().catch((e) => fact('nb wizard cancel', e.message));
            else await plain.cancel().catch(() => {});
            await idle(page);
        }
        const win = await galleys.openCreate();
        await win.type(win.labelBox(), LABEL);
        await win.setRemote(true);
        await win.type(win.remoteUrlBox(), ADDRESS);
        fact('3-4 address box type', await win.remoteUrlBox().getAttribute('type'));
        fact('3-4 address box class', await win.remoteUrlBox().getAttribute('class'));
        record(p('04-window'), await screen(page));
        const res = await L.pressAndRead(page, {button: win.saveButton(), dialog: win.dialog(), form: win.form(), saveRe: /update-galley/});
        record(p('05-save'), await screen(page));
        await shot(page, p('05-save')).catch(() => {});
        fact('5 Save', res);
        if (res.windowOpen) {
            // The window refused the address: nothing more to walk.
            fact('5 window title', L.flat(await win.dialog().getAttribute('aria-label').catch(() => null)));
            await win.cancel().catch(() => {});
            await idle(page);
            fact('5 galleys after refusal', await galleys.labels());
            return;
        }
        await galleys.cancelWizard().catch((e) => fact('5 upload window cancel', e.message));
        await idle(page);
        fact('5 galleys after', await galleys.labels());
        const edit = await galleys.openEdit(LABEL);
        fact('6 Edit: remote box ticked', await edit.remoteBox().isChecked());
        fact('6 Edit: address kept', await edit.remoteUrlBox().inputValue());
        record(p('06-edit'), await screen(page));
        await edit.cancel();
        if (app.name === 'ops') {
            fact('7 post', await G.post(page));
        } else {
            fact('7 publish', await V.publishLatestVersion(page, app, ID));
        }
        await signOut(page);
        const kind = app.name === 'ops' ? 'preprint' : 'article';
        const landing = await page.goto(app.url(`/index.php/${ctx}/${kind}/view/${ID}`));
        await idle(page);
        record(p('08-landing'), await screen(page));
        fact('8 item page', {status: landing.status(), links: (await page.locator('a.obj_galley_link').allInnerTexts()).map((s) => L.flat(s))});
        const pressed = await L.pressLandingGalley(page, LABEL);
        record(p('08-pressed'), await screen(page));
        await shot(page, p('08-pressed')).catch(() => {});
        fact('8 pressed', pressed);
    } finally {
        record(FACTS, facts);
        await close();
    }
});
