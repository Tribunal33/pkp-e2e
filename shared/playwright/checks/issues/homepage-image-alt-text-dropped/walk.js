// Issue report for U10 A1: a press's and a preprint server's homepage image never carries the "Alternate text" the
// manager typed (docs/issues/U10-A1-homepage-image-alt-text-dropped.md). Takes the report's Steps on PKP's default
// test dataset (a dataset fleet), as `rvaca`, on every app (the journal is the control):
//   WALK=steps (default)  Settings › Website › "Appearance" › "Setup": "Homepage Image" › "Upload File" u10a-home.png
//                         (300 × 100), "Alternate text" "Our building", "Save"; the tab reloaded (the stored text);
//                         the home page: the picture's alt attribute and its name to a screen reader.
//   WALK=nb               the neighbour (fix in and out): the same upload with "Alternate text"
//                         `Our "big" building & yard` (the text is escaped into the attribute, nothing else of the
//                         page changes), then the box emptied and saved (an empty alt stays, the picture is still
//                         marked decorative), then "Theme" › "Show the homepage image as the header background."
//                         ticked and saved (the body shows no picture), all read on the home page.
// Each step records what it saw and never throws on a state the fix changes.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u10a --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u10a PROBE_AGENT=u10a node bin/probe.js all shared/playwright/checks/issues/homepage-image-alt-text-dropped/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u10a-3_5 PROBE_AGENT=u10a node bin/probe.js all shared/playwright/checks/issues/homepage-image-alt-text-dropped/walk.js
// Neighbour:    WALK=nb PROBE_RUN=nb-in|nb-out … (same command)
const {forEachApp, launch, signIn, screen, record, shot, idle} = require('../../../probe');
const {png} = require('../picture-over-upload-limit-server-error/lib');

const MODE = process.env.WALK || 'steps';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {WebsiteSettings, PublicLook} = require('../../../pages/AppearancePages.js');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `a1-${MODE}-${s}${run}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };
    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'ok' : out);
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const file = {name: 'u10a-home.png', mimeType: 'image/png', buffer: png(300, 100)};
    const settings = new WebsiteSettings(page, app.contextPath);
    const home = new PublicLook(page, app.contextPath);

    /** The home page's picture as a browser and a screen reader get it. */
    const readHome = async (label) => {
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page);
        const out = await page.evaluate(() => [...document.querySelectorAll('img')]
            .filter((i) => /homepageImage/.test(i.getAttribute('src') || ''))
            .map((i) => ({outerHTML: i.outerHTML, hasAlt: i.hasAttribute('alt'), alt: i.getAttribute('alt'), parent: i.parentElement.className})));
        const inBody = await home.homepageImage.count();
        const aria = await home.root.ariaSnapshot().catch((e) => `no root: ${String(e.message).split('\n')[0]}`);
        const header = await page.evaluate(() => {
            const h = document.querySelector('.pkp_structure_head');
            return h ? getComputedStyle(h).backgroundImage : null;
        });
        const imgLines = String(aria).split('\n').filter((l) => /\bimg\b/.test(l));
        record(name(`home-${label}`), await screen(page));
        await shot(page, name(`home-${label}`));
        return {images: out, inBody, ariaImgLines: imgLines, headerBackground: header};
    };

    /** Settings › Website › "Appearance" › "Setup", ready. */
    const openSetup = async () => {
        await settings.goto();
        return settings.open('appearance-setup');
    };

    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return {url: page.url()}; });
        let setup = null;
        await step('2 Appearance › Setup', async () => {
            setup = await openSetup();
            await setup.homepageImage('en').uploadButton.waitFor({timeout: 30_000});
            return {url: page.url()};
        });
        const box = () => setup.homepageImage('en');
        const typeAlt = async (text) => {
            await box().altText.fill(text);
            await box().altText.blur();
            return {value: await box().altText.inputValue()};
        };
        const save = async () => {
            const r = await setup.pressSave();
            await setup.savedStatus.waitFor({timeout: 30_000}).catch(() => null);
            return {status: r.status(), saved: await setup.savedStatus.isVisible()};
        };
        const reread = async () => {
            setup = await openSetup();
            return {
                preview: await box().thumbnail.first().getAttribute('src', {timeout: 5000}).catch(() => null),
                altText: await box().altText.inputValue().catch(() => null),
                label: await box().altTextLabel.innerText().catch(() => null),
            };
        };

        await step('3 Homepage Image › Upload File, u10a-home.png', async () => ({upload: await box().choose(file)}));
        if (MODE === 'steps') {
            await step('4 Alternate text "Our building"', () => typeAlt('Our building'));
            record(name('setup-before-save'), await screen(page));
            await step('5 Save', save);
            await step('6 tab reloaded', reread);
            await shot(page, name('setup-after-reload'));
            await step('7–8 home page, the picture', () => readHome('typed'));
        } else if (MODE === 'nb') {
            await step('nb1 Alternate text with quotes and an ampersand', () => typeAlt('Our "big" building & yard'));
            await step('nb1 Save', save);
            await step('nb1 home page', () => readHome('quoted'));
            await step('nb2 Setup again', async () => { await reread(); return {altText: await box().altText.inputValue()}; });
            await step('nb2 Alternate text emptied', () => typeAlt(''));
            await step('nb2 Save', save);
            await step('nb2 tab reloaded', reread);
            await step('nb2 home page', () => readHome('empty'));
            await step('nb3 Theme › header background ticked, Save', async () => {
                await settings.goto();
                const theme = await settings.open('theme');
                const box3 = page.getByRole('checkbox', {name: 'Show the homepage image as the header background.'});
                await box3.check();
                const r = await theme.pressSave();
                await theme.savedStatus.waitFor({timeout: 30_000}).catch(() => null);
                return {status: r.status(), checked: await box3.isChecked()};
            });
            await step('nb3 home page', () => readHome('as-header'));
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
