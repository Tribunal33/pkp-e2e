// Kept walk for docs/issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md
// (spec U63 register OJS2). Takes the report's Steps on a fresh load of PKP's
// default test dataset, through the screens, as `rvaca` (Journal manager):
//   Settings › Website › Plugins: "DOAJ Plugin" and "DOAJ Export Plugin" rows;
//   untick "DOAJ Plugin", "OK"; Tools › Import/Export list; Plugins list again;
//   "DOAJ Export Plugin" row's arrow › "Import/Export Data" and what it answers.
// Control: tick "DOAJ Plugin" again; Tools list and "Import/Export Data" again.
// Only OJS has "DOAJ Plugin"; on an app or line without it the script records
// the Plugins list and stops.
// Records every screen with screen(). No assertions: the script records.
// Run (main): flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs2 node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {T, sleep, flat, rel, snap: snapRaw, readGrid, brief, openWebsitePlugins, pressBox, rowLinks, rowLoc} = require('../../U62/K1/grid');

const byName = (g, name) => {
    if (!g || !g.found) return null;
    for (const c of g.cats) for (const r of c.rows) if (r.name === name) return {cat: c.heading, ...r};
    return null;
};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}${['stable-3_4_0', 'stable-3_3_0'].includes(app.line) ? '' : '/en'}${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = (name) => snapRaw(page, `w-${String(++n).padStart(2, '0')}-${name}`);

    const plugins = async (label) => {
        const o = await openWebsitePlugins(page, app, app.contextPath);
        const g = await readGrid(page);
        await snap(label);
        const doaj = byName(g, 'DOAJ Plugin');
        const tool = byName(g, 'DOAJ Export Plugin');
        const ie = g.found ? g.cats.find((c) => /Import\/Export/.test(c.heading || '')) : null;
        fact(`${label}: Plugins list`, {status: o.status, doajPlugin: doaj, doajExportPlugin: tool, importExportRows: ie ? ie.rows.map((r) => `${r.name}${r.checked ? '[x]' : '[ ]'}${r.disabled ? 'L' : ''}${r.arrow ? '>' : ''}`) : null});
        return {g, doaj, tool};
    };
    const tools = async (label) => {
        await page.goto(cu('/management/tools'));
        await idle(page);
        const list = page.locator('.pkp_page_importexport_plugins');
        await list.first().waitFor({timeout: T}).catch(() => {});
        await snap(label);
        fact(`${label}: Tools › Import/Export`, (await list.locator('li a').allInnerTexts().catch(() => [])).map((x) => x.trim()));
    };
    const importExportData = async (label, tool) => {
        const links = await rowLinks(page, tool.id, {close: false});
        fact(`${label}: row links`, links);
        const link = rowLoc(page, tool.id).locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Import/Export Data'}).first();
        if (!(await link.count())) { fact(`${label}: Import/Export Data`, 'no such link'); return; }
        const respP = page.waitForResponse((r) => /importexport\/plugin\/DOAJExportPlugin/.test(r.url()) && r.request().resourceType() === 'document', {timeout: T}).catch(() => null);
        await link.click();
        const r = await respP;
        await page.waitForLoadState('load').catch(() => {});
        await idle(page).catch(() => {}); await sleep(400);
        const body = r ? (await r.body().catch(() => Buffer.alloc(0))).toString('utf8') : '';
        await snap(label);
        fact(`${label}: Import/Export Data`, {
            url: rel(page.url()),
            status: r ? r.status() : null,
            contentType: r ? r.headers()['content-type'] || null : null,
            bodyStart: body.slice(0, 160),
            bodyEnd: body.slice(-40),
            h1: await page.locator('h1').first().innerText({timeout: 1500}).catch(() => null),
            nav: await page.locator('nav, .app__nav').count(),
            text: flat(await page.locator('body').innerText().catch(() => ''), 240),
        });
    };

    try {
        // 1. Sign in as rvaca.
        await signIn(page, 'rvaca');
        // 2. Settings › Website › Plugins.
        const before = await plugins('step2-plugins-doaj-on');
        if (!before.doaj) {
            fact('surface', 'no "DOAJ Plugin" row on the Plugins list: nothing to walk');
            fact('grid', brief(before.g));
            return;
        }
        // 3. Untick "DOAJ Plugin", "OK".
        const off = await pressBox(page, before.doaj.id, {answer: 'OK'});
        await snap('step3-doaj-plugin-unticked');
        fact('step3: untick DOAJ Plugin', off);
        // 4. Tools › Import/Export.
        await tools('step4-tools-doaj-off');
        // 5. Plugins list again.
        const after = await plugins('step5-plugins-doaj-off');
        // 6. "DOAJ Export Plugin" › arrow › "Import/Export Data".
        if (after.tool) await importExportData('step6-doaj-off', after.tool);
        else fact('step6', 'no "DOAJ Export Plugin" row: nothing to press');

        // Control: tick "DOAJ Plugin" again.
        const back = await plugins('control-plugins-before-tick');
        const on = await pressBox(page, back.doaj.id, {answer: 'OK'});
        await snap('control-doaj-plugin-ticked');
        fact('control: tick DOAJ Plugin', on);
        await tools('control-tools-doaj-on');
        const again = await plugins('control-plugins-doaj-on');
        if (again.tool) await importExportData('control-doaj-on', again.tool);
        await signOut(page);
    } finally {
        record('walk-facts', facts);
        await close();
    }
});
