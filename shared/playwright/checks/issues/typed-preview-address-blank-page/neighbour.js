// U09 A7 neighbour: what the fix must leave alone. The manager's "Preview"
// from the "Custom Page" item window and (OJS, OMP) the static page window,
// the saved pages opened by a signed-out visitor, and the site administrator's
// typed preview address on the site. Walked with the fix in and out.
// Run: PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/typed-preview-address-blank-page/neighbour.js
const {forEachApp, launch, signIn, signOut, record, shot, idle} = require('../../../probe');
const {flat, hasStaticPages, typeAddress, enableStaticPages} = require('./lib');

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages');
    const {CustomPageWindow, StaticPagesTab, PublicContent} = require('../../../pages/CustomContentPages');
    const {page, close} = await launch(app);
    const facts = {app: app.name, line: app.line};
    const run = (process.env.PROBE_RUN || 'r0').replace(/[^a-z0-9]/gi, '').toLowerCase();
    const slug = `u09ir4${run}`;
    const readPreview = async (popup, name) => {
        await shot(popup, name).catch(() => {});
        const shown = new PublicContent(popup);
        const out = {url: popup.url(), h1: flat(await shown.pageTitle.innerText({timeout: 5000}).catch(() => null)), text: flat(await shown.main.innerText().catch(() => null), 200)};
        await popup.close();
        return out;
    };
    try {
        await signIn(page, 'rvaca');
        if (hasStaticPages(app)) facts.plugin = await enableStaticPages(app, page);

        // The "Custom Page" item window's "Preview", then "Save".
        const nav = new NavigationTab(page, app.contextPath);
        await nav.goto();
        await nav.addItem();
        const item = new CustomPageWindow(page);
        await item.titleInput('en').fill(`${slug} page`);
        await item.chooseType('Custom Page');
        await item.pathInput.fill(`${slug}-page`);
        await item.content('en').type('Custom page text.');
        facts.itemPreview = await readPreview(await item.preview(), 'item-preview');
        facts.itemSave = (await item.save()).status;

        // {OJS OMP} The static page window's "Preview", then "Save".
        if (hasStaticPages(app)) {
            const tab = new StaticPagesTab(page, app.contextPath);
            await tab.goto();
            const win = await tab.addPage();
            await win.pathInput.fill(`${slug}-static`);
            await win.titleInput('en').fill(`${slug} static`);
            await win.content('en').type('Static page text.');
            facts.staticPreview = await readPreview(await win.preview(), 'static-preview');
            facts.staticSave = await win.save();
        }
        await signOut(page);

        // The saved pages, for a signed-out visitor.
        facts.visitorItem = await typeAddress(app, page, `/${slug}-page`, 'visitor-item');
        if (hasStaticPages(app)) facts.visitorStatic = await typeAddress(app, page, `/${slug}-static`, 'visitor-static');

        // The site administrator's typed preview address on the site.
        await signIn(page, 'admin');
        const resp = await page.goto(app.url('/index.php/index/navigationMenu/preview'));
        await idle(page).catch(() => {});
        facts.adminSitePreview = {status: resp.status(), landed: new URL(page.url()).pathname, title: await page.title()};
        await signOut(page);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
