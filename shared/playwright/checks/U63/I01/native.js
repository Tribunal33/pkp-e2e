// U63 I01, row 21 (all three apps; OJS also on stable-3_5_0): a title with a prefix through a Native XML round trip.
// A submission's "Prefix" set to "The" on Publication › "Title & Abstract" (read on the page after "Save" and after a
// reload), exported with a prefix-less control, the file's <title>/<prefix> read, and the file imported into a second
// context and into the same one; the imported titles read on the results tab, the workflow and "Title & Abstract".
const fs = require('fs');
const {signIn, signOut, idle, tag, outFile, settled} = require('../../../probe');
const {T, sleep, flat, rel, openTool, importFile, toolTabs, panelText} = require('./lib');

const LABELS = {
    ojs: {exportTab: 'Export Articles', exportButton: 'Export Articles', el: 'article'},
    omp: {exportTab: 'Export', exportButton: 'Export Submissions', el: 'monograph'},
    ops: {exportTab: 'Export Preprints', exportButton: 'Export Preprints', el: 'preprint'},
};
const TITLE = 'Signalling Theory Dividends: A Review Of The Literature';
const CONTROL = 'Okapi forest census';

async function seed(c) {
    const {app, S, save, fact} = c;
    if (S.R21) return S.R21;
    const mk = async (k) => {
        const t = tag(`u63i01${c.RUN}${k}`);
        await app.api.createContext({tag: t, context: {name: `U63 I01 ${k} ${t}`, acronym: `I01${k}`.toUpperCase().slice(0, 8), contactName: 'I01 Contact', contactEmail: `${t}c@mail.test`, country: 'CA'},
            users: [{username: `${t}m`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}, {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Lovelace'}]});
        return {path: t, m: `${t}m`, au: `${t}au`};
    };
    const R = {S: await mk('s'), T: await mk('t'), subs: {}};
    for (const [k, title] of [['p', TITLE], ['k', CONTROL]]) {
        const r = await app.api.createSubmission({tag: `${R.S.path}${k}`.slice(0, 32), context: R.S.path, submitter: R.S.au, title});
        R.subs[k] = {id: r.submissionId, pub: r.publicationId, title};
    }
    S.R21 = R; save();
    fact(`seed21-${app.name}-${app.line || 'main'}`, R);
    return R;
}

/** The workflow's "Title & Abstract": the side menu entry, then the form's boxes. */
async function openTitleAbstract(c, ctx, sid) {
    const {page} = c;
    await c.go(c.cu(ctx, `/en/dashboard/editorial?workflowSubmissionId=${sid}`));
    await page.locator('[role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(1200);
    const entry = page.getByRole('dialog').getByRole('link', {name: 'Title & Abstract', exact: true}).last();
    if (!(await entry.isVisible().catch(() => false))) await page.getByRole('dialog').getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
    await entry.click();
    const prefix = page.getByRole('dialog').getByRole('textbox', {name: /^Prefix/}).first();
    await prefix.waitFor({timeout: T});
    await settled(page, page.getByRole('dialog').getByRole('textbox', {name: /^Title/}).first()).catch(() => {});
    return prefix;
}
async function readTitleAbstract(c) {
    const {page} = c;
    const d = page.getByRole('dialog');
    const heading = flat(await d.getByRole('heading').first().innerText().catch(() => null), 200);
    const prefix = await d.getByRole('textbox', {name: /^Prefix/}).first().inputValue().catch(() => null);
    // the title box is a rich-text field on main; read its visible text
    // the title box is the first rich-text box after "Prefix" (no textbox role)
    const title = flat(await d.locator('[contenteditable="true"]').first().innerText({timeout: 3000}).catch(() => null), 200);
    const dialogTitle = flat(await page.locator('[role="dialog"] h1, [role="dialog"] h2').allInnerTexts().catch(() => []), 400);
    return {heading, prefix, title, dialogHeadings: dialogTitle};
}


/** stable-3_5_0 only: the seed leaves the contributor without a role, which the export refuses; "Contributors" › "Edit" › role "Author" › "Save". */
async function giveContributorRole(c, ctx, sid, label) {
    const {page} = c;
    const o = {};
    await c.go(c.cu(ctx, `/en/dashboard/editorial?workflowSubmissionId=${sid}`));
    await page.locator('[role="dialog"]').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(1200);
    await page.getByRole('dialog').getByRole('link', {name: 'Contributors', exact: true}).last().click();
    await idle(page).catch(() => {}); await sleep(1000);
    const edit = page.getByRole('dialog').getByRole('button', {name: /^Edit/}).first();
    if (await edit.count()) await edit.click();
    else {
        await page.getByRole('dialog').getByRole('button', {name: /More Actions|Actions/}).first().click().catch(() => {});
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click().catch(() => {});
    }
    const radio = page.locator('input[type=radio][name="userGroupId"]');
    await radio.first().waitFor({timeout: T}).catch(() => {});
    o.radios = await radio.evaluateAll((rs) => rs.map((r) => `${r.value}=${(r.closest('label') || r.parentElement).innerText.trim()}${r.checked ? '*' : ''}`)).catch(() => []);
    await page.getByRole('radio', {name: 'Author', exact: true}).check().catch((e) => { o.radioError = flat(e.message, 120); });
    // the seeded contributor has no country, which this form requires
    await page.getByRole('combobox', {name: /^Country/}).last().selectOption('CA').catch((e) => { o.countryError = flat(e.message, 120); });
    await sleep(500);
    const w = page.waitForResponse((r) => /contributors/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.locator('[data-cy="active-modal"], [role="dialog"]').last().getByRole('button', {name: 'Save', exact: true}).last().click().catch((e) => { o.saveError = flat(e.message, 120); });
    const r = await w;
    o.save = r ? r.status() : null;
    await idle(page).catch(() => {}); await sleep(800);
    o.snap = (await c.snap(`r21-35-${label}-contributor-role`)).label;
    return o;
}

async function row21(c) {
    const {page, fact, snap, app} = c;
    const L = LABELS[app.name];
    const R = await seed(c);
    const o = {line: app.line || 'main'};
    await signIn(page, R.S.m, {contextPath: R.S.path});
    // 1. "Prefix" "The" on the submission's Title & Abstract, saved; read on the page and after a reload
    const box = await openTitleAbstract(c, R.S.path, R.subs.p.id);
    o.before = await readTitleAbstract(c);
    await box.fill('The');
    const w = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await page.getByRole('dialog').getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    o.save = r ? r.status() : null;
    await idle(page).catch(() => {}); await sleep(1500);
    o.afterSaveSamePage = await readTitleAbstract(c);
    o.afterSaveSnap = (await snap('r21-01-prefix-saved')).label;
    await page.reload(); await idle(page).catch(() => {});
    await openTitleAbstract(c, R.S.path, R.subs.p.id);
    o.afterReload = await readTitleAbstract(c);
    o.afterReloadSnap = (await snap('r21-02-prefix-after-reload')).label;
    o.db = c.q(`select setting_name || '=' || setting_value from publication_settings where publication_id=${R.subs.p.pub} and setting_name in ('title','prefix') order by 1`);
    if ((app.line || 'main') === 'stable-3_5_0') {
        o.roleFix = {};
        for (const k of ['p', 'k']) o.roleFix[k] = await giveContributorRole(c, R.S.path, R.subs[k].id, k);
        o.roleFix.db = c.q(`select author_id || ' ' || coalesce(user_group_id::text,'null') from authors where publication_id in (${R.subs.p.pub},${R.subs.k.pub})`);
    }
    // 2. Tools › Native XML Plugin: the export of both
    await openTool(c, R.S.path, 'Native XML Plugin');
    await page.getByRole('tab', {name: L.exportTab, exact: true}).first().click();
    const list = page.locator('#exportXmlForm');
    await list.locator('.listPanel__item').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {}); await sleep(800);
    o.exportList = await list.locator('.listPanel__item').allInnerTexts().then((x) => x.map((y) => flat(y, 150))).catch(() => []);
    o.exportListSnap = (await snap('r21-03-export-list')).label;
    for (const k of ['p', 'k']) await list.locator(`input[type=checkbox][value="${R.subs[k].id}"]`).check().catch((e) => c.log('tick', flat(e.message, 100)));
    const before = (await toolTabs(page)).length;
    await list.getByRole('button', {name: L.exportButton, exact: true}).click();
    for (let i = 0; i < 60 && (await toolTabs(page)).length === before; i++) await sleep(500);
    await idle(page).catch(() => {}); await sleep(800);
    const btn = page.getByRole('button', {name: 'Download Exported File'}).filter({visible: true}).last();
    await btn.waitFor({timeout: T}).catch(() => {});
    o.exportResults = {tabs: await toolTabs(page), text: await panelText(page, 400), snap: (await snap('r21-03b-export-results')).label};
    const dl = page.waitForEvent('download', {timeout: 60_000}).catch(() => null);
    await btn.click().catch((e) => { o.downloadError = flat(e.message, 150); });
    const d = await dl;
    const file = outFile('i01-r21-export.xml');
    if (d) await d.saveAs(file);
    const xml = d ? fs.readFileSync(file, 'utf8') : '';
    o.file = {name: d ? d.suggestedFilename() : null, titles: [...xml.matchAll(/<title locale="([^"]+)">([^<]*)<\/title>/g)].map((m) => `${m[1]}: ${m[2]}`), prefixes: [...xml.matchAll(/<prefix locale="([^"]+)">([^<]*)<\/prefix>/g)].map((m) => `${m[1]}: ${m[2]}`)};
    await signOut(page).catch(() => {});
    // 3. the file imported into the second context (T) and into the same one (S)
    for (const [k, ctx] of [['other', R.T], ['same', R.S]]) {
        if (!xml) break;
        await signIn(page, ctx.m, {contextPath: ctx.path});
        await openTool(c, ctx.path, 'Native XML Plugin');
        await page.getByRole('tab', {name: 'Import', exact: true}).first().click().catch(() => {});
        const res = await importFile(c, file, 'Import');
        for (let i = 0; i < 40 && !/completed|failed/.test(res.resultsText || ''); i++) { await sleep(500); res.resultsText = await panelText(page); }
        res.items = await page.locator('#importExportTabs > [role="tabpanel"]:visible li').allInnerTexts().catch(() => []);
        res.snap = (await snap(`r21-04-import-${k}`)).label;
        const ids = [...(res.resultsText || '').matchAll(/"(\d+)" - "([^"]*)"/g)].map((m) => ({id: m[1], title: m[2]}));
        res.imported = ids;
        res.workflow = [];
        for (const it of ids) {
            await openTitleAbstract(c, ctx.path, it.id).catch((e) => c.log('ta', flat(e.message, 120)));
            const ta = await readTitleAbstract(c);
            ta.snap = (await snap(`r21-05-${k}-${it.id}-title-abstract`)).label;
            ta.db = c.q(`select setting_name || '=' || setting_value from publication_settings ps join submissions s on s.current_publication_id=ps.publication_id where s.submission_id=${it.id} and setting_name in ('title','prefix') order by 1`);
            res.workflow.push({id: it.id, ...ta});
        }
        // the dashboard row's title for the imported copy of the prefixed submission
        await c.go(c.cu(ctx.path, '/en/dashboard/editorial'));
        await page.locator('table tbody tr').first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        const ds = await snap(`r21-06-${k}-dashboard`);
        res.dashboard = ((ds.text && ds.text.main) || '').split('\n').filter((y) => /Signalling/.test(y)).map((y) => flat(y, 200));
        res.dashboardSnap = ds.label;
        o[`import-${k}`] = res;
        await signOut(page).catch(() => {});
    }
    fact(`r21-${app.name}-${app.line || 'main'}`, o);
}

module.exports = {row21};
