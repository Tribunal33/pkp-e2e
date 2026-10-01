// U63 I01, the DOAJ Export Plugin rows {OJS}: 13 (the Publications list: an issue column? the Articles list's issue
// window), 15 (the list search's letter case, PostgreSQL), 33 (the daily automatic deposit: (a) the versioning split,
// (b) older minor versions, (c) the Hosted Journals order). Workflow helpers after the U63 K4 kept check.
const {signIn, signOut, idle, tag, note} = require('../../../probe');
const {T, sleep, flat, rel, toolTabs} = require('./lib');
const {seedJ, ISSUE1} = require('./journal');

const TASK = 'APP\\plugins\\generic\\doaj\\DOAJInfoSender';
const LIST = '#submissionsListGridContainer .pkp_controllers_grid, #publicationsListGridContainer .pkp_controllers_grid';
const issues = [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}];
const inIssue1 = {published: true, issue: {volume: 1, number: 1, year: 2025}};

function helpers(c) {
    const {page, app} = c;
    const plug = (ctx) => c.cu(ctx, '/en/management/importexport/plugin/DOAJExportPlugin');
    async function readList() {
        const g = page.locator(LIST).first();
        await g.locator('tbody').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
        if (!(await g.count())) return {found: false};
        return g.evaluate((grid) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (el) => !!(el && el.offsetParent !== null);
            return {
                title: txt(grid.querySelector('.header h4')),
                cols: [...grid.querySelectorAll('thead th')].map(txt),
                rows: [...grid.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => ({
                    cells: [...tr.querySelectorAll('td')].map(txt),
                    links: [...tr.querySelectorAll('td a')].filter(vis).map((a) => `${txt(a)} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '').slice(0, 120)}`),
                    box: ((b) => (b ? b.value : null))(tr.querySelector('input[type=checkbox]')),
                })),
                empty: [...grid.querySelectorAll('tbody.empty')].filter(vis).map(txt),
                paging: txt(grid.querySelector('.gridPaging')),
            };
        });
    }
    const brief = (l) => (l && l.rows ? l.rows.map((r) => r.cells.slice(1).join(' | ')) : l);
    async function openDoaj(ctx, tabName) {
        const st = await c.go(plug(ctx));
        await page.locator('#importExportTabs [role=tab]').first().waitFor({timeout: T}).catch(() => {});
        const o = {status: st, tabs: await toolTabs(page)};
        if (tabName) {
            const t = page.locator('#importExportTabs [role=tab]').filter({hasText: new RegExp(`^\\s*${tabName}\\s*$`)}).first();
            if (await t.count()) { await t.click(); await idle(page).catch(() => {}); } else o.noTab = tabName;
            await page.locator(LIST).first().locator('tbody').first().waitFor({state: 'attached', timeout: T}).catch(() => {});
            await sleep(500);
            o.list = await readList();
        } else await page.locator('#doajSettingsForm').waitFor({timeout: T}).catch(() => {});
        return o;
    }
    async function tick(ids) {
        for (const id of ids) await page.locator(LIST).first().locator(`input[type=checkbox][value="${id}"]`).first().check({timeout: 10_000}).catch((e) => c.log('tick', id, flat(e.message, 100)));
    }
    /** "Mark registered" with the ticked rows; lands back on the page. */
    async function markRegistered() {
        const landed = page.waitForResponse((r) => r.request().isNavigationRequest() && r.request().method() === 'GET' && r.url().includes('DOAJExportPlugin'), {timeout: 90_000}).catch(() => null);
        await page.locator('form#exportSubmissionXmlForm button[name="markRegistered"], form#exportPublicationXmlForm button[name="markRegistered"]').first().click();
        const r = await landed; await idle(page).catch(() => {});
        return r ? r.status() : null;
    }
    async function saveSettings({key, auto}) {
        const f = page.locator('#doajSettingsForm');
        if (key !== undefined) await f.locator('input[name=apiKey]').fill(key);
        if (auto !== undefined) await f.locator('input[name=automaticRegistration]').setChecked(auto);
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /DOAJExportPlugin|manage/.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await idle(page).catch(() => {}); await sleep(500);
        return r ? r.status() : null;
    }
    // --- the workflow
    const wf = () => page.locator('[role="dialog"]:visible').first();
    const controls = () => page.locator('[data-cy="workflow-controls-right"]');
    async function openWf(ctx, sid, pub) {
        await page.goto(c.cu(ctx, `/en/dashboard/editorial?workflowSubmissionId=${sid}${pub ? `&workflowMenuKey=publication_${pub}_titleAbstract` : ''}`));
        await idle(page).catch(() => {});
        await wf().waitFor({timeout: T}).catch(() => {});
        await controls().waitFor({timeout: T}).catch(() => {});
        await sleep(1500);
    }
    async function fillVersion(scope, {minor = false} = {}) {
        const stage = scope.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) { if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {}); }
        const m = scope.locator('select[name="versionIsMinor"]');
        if (await m.isVisible().catch(() => false)) { if (!(await m.inputValue().catch(() => ''))) await m.selectOption(minor ? 'true' : 'false').catch(() => {}); }
    }
    async function unpublish(ctx, sid, pub) {
        await openWf(ctx, sid, pub);
        const o = {};
        await controls().getByRole('button', {name: 'Unpublish', exact: true}).click();
        const win = page.getByRole('dialog').filter({hasText: /Are you sure you don't want this to be/}).last();
        await win.waitFor({timeout: T});
        const w = page.waitForResponse((x) => /\/unpublish/.test(x.url()) && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await win.getByRole('button', {name: 'Unpublish', exact: true}).click();
        const r = await w;
        o.status = r ? r.status() : null;
        await controls().getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        return o;
    }
    async function publish(ctx, sid, pub) {
        await openWf(ctx, sid, pub);
        const out = {};
        const button = controls().getByRole('button', {name: /^(Schedule For Publication|Publish)$/}).first();
        await button.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await button.isVisible().catch(() => false))) { out.noButton = await controls().getByRole('button').allInnerTexts().catch(() => []); return out; }
        await sleep(800);
        await button.click();
        const pnl = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
        const which = () => Promise.race([
            pnl.getByRole('button', {name: 'Confirm', exact: true}).waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
            confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm'),
        ]).catch(() => null);
        let opened = await which();
        if (!opened) { await button.click({timeout: 5000}).catch(() => {}); opened = await which(); }
        out.opened = opened;
        await idle(page).catch(() => {}); await sleep(2000);
        if (opened === 'panel') {
            await fillVersion(pnl);
            await pnl.locator('input[name="assignment"]:checked').first().waitFor({timeout: 10_000}).catch(() => {});
            await pnl.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
            await confirm.waitFor({state: 'visible', timeout: T}).catch(() => {});
        }
        await idle(page).catch(() => {}); await sleep(800);
        await fillVersion(confirm);
        const w = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click().catch((e) => { out.clickErr = flat(e.message, 150); });
        const r = await w;
        out.status = r ? r.status() : null;
        if (r && r.status() >= 400) out.body = flat(await r.text().catch(() => ''), 400);
        await controls().getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {});
        return out;
    }
    async function newVersion(ctx, sid, pub) {
        await openWf(ctx, sid, pub);
        const link = wf().getByRole('link', {name: 'Create New Version', exact: true}).or(wf().getByRole('button', {name: 'Create New Version', exact: true})).first();
        await link.waitFor({state: 'visible', timeout: T}).catch(() => {});
        if (!(await link.isVisible().catch(() => false))) return {offered: false};
        await sleep(1000);
        await link.click();
        const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
        await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
        await idle(page).catch(() => {}); await sleep(1000);
        const o = {offered: true, dialog: flat(await w.innerText().catch(() => ''), 300)};
        await fillVersion(w, {minor: true});
        const m = w.locator('select[name="versionIsMinor"]');
        o.minorOptions = await m.evaluate((sel) => [...sel.options].map((x) => `${x.value}=${x.text.trim()}${x.selected ? '*' : ''}`)).catch(() => null);
        const want = await m.evaluate((sel) => { const x = [...sel.options].find((y) => /minor/i.test(y.text)); return x ? x.value : null; }).catch(() => null);
        if (want !== null) await m.selectOption(want).catch(() => {});
        const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
        await w.getByRole('button', {name: 'Confirm', exact: true}).click();
        const resp = await r;
        if (resp) { o.status = resp.status(); try { o.newPub = (await resp.json()).id; } catch { /* none */ } }
        await w.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        return o;
    }
    async function versioningNo(ctx) {
        await c.go(c.cu(ctx, '/en/management/settings/distribution'));
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
        await idle(page).catch(() => {});
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
        const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
        await setup.getByRole('radio', {name: 'No, all versions of an article should have the same DOI.'}).check();
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await setup.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        return r ? r.status() : null;
    }
    return {plug, readList, brief, openDoaj, tick, markRegistered, saveSettings, openWf, unpublish, publish, newVersion, versioningNo};
}

async function mkJournal(c, key, extra = {}) {
    const {app, S, save} = c;
    S.dj = S.dj || {};
    if (S.dj[key]) return S.dj[key];
    const t = tag(`u63i01${c.RUN}${key.toLowerCase()}`);
    const {subs = [], ...rest} = extra;
    await app.api.createContext({tag: t, context: {name: `U63 I01 ${key} ${t}`, acronym: `I${key}`.slice(0, 8), contactName: 'I01 Contact', contactEmail: `${t}c@mail.test`, country: 'CA'},
        users: [{username: `${t}m`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}, {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Lovelace'}], ...rest});
    const J = {path: t, m: `${t}m`, id: c.q(`select journal_id from journals where path='${t}'`)[0], subs: {}};
    for (const [k, title, spec] of subs) {
        const r = await app.api.createSubmission({tag: `${t}${k}`.slice(0, 32), context: t, submitter: `${t}au`, title, ...spec});
        J.subs[k] = {id: r.submissionId, pub: r.publicationId, title};
    }
    S.dj[key] = J; save();
    return J;
}

// ---------------------------------------------------------------------------------------------------------- row 15
async function row15(c) {
    const {page, fact, snap, app} = c;
    const J = await seedJ(c);
    const h = helpers(c);
    const o = {database: c.q('select version()')[0]};
    await signIn(page, J.m, {contextPath: J.path});
    const search = async (column, text, name) => {
        await h.openDoaj(J.path, 'Articles');
        const g = page.locator(LIST).first();
        const form = g.locator('form').first();
        if (!(await form.isVisible().catch(() => false))) { await g.locator('.header .actions a').filter({hasText: /Search/}).first().click(); await form.waitFor({state: 'visible', timeout: 10_000}).catch(() => {}); }
        await form.locator('select[name=column]').selectOption({label: column}).catch((e) => c.log('col', flat(e.message, 100)));
        await form.locator('input[name=search]').fill(text);
        const w = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()), {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Search', exact: true}).click();
        const r = await w; await idle(page).catch(() => {}); await sleep(500);
        const l = await h.readList();
        return {column, text, answer: r ? r.status() : null, rows: h.brief(l), empty: l.empty, snap: (await snap(name)).label};
    };
    o.titleAsWritten = await search('Article Title', 'Okapi', 'r15-title-Okapi');
    o.titleLower = await search('Article Title', 'okapi', 'r15-title-okapi');
    o.titleUpper = await search('Article Title', 'OKAPI', 'r15-title-OKAPI');
    o.authorAsWritten = await search('Authors', 'Lovelace', 'r15-author-Lovelace');
    o.authorLower = await search('Authors', 'lovelace', 'r15-author-lovelace');
    o.mysql = 'not checked: no MySQL install on the fleet';
    fact(`r15-${app.name}`, o);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 13
async function row13(c) {
    const {page, fact, snap, app} = c;
    const J = await seedJ(c);
    const h = helpers(c);
    const o = {};
    const V = await mkJournal(c, 'V13', {doiPrefix: '10.1234', doiVersioning: true, issues, subs: [['v1', 'Egret plume moult', inIssue1]]});
    try {
        await signIn(page, V.m, {contextPath: V.path});
        const p = await h.openDoaj(V.path, 'Publications');
        o.publications = {tabs: p.tabs, title: p.list.title, cols: p.list.cols, rows: p.list.rows, snap: (await snap('r13-01-publications')).label};
        // the row's every link and what the "Publication Stage" and "Author; Title" open
        o.publicationLinks = p.list.rows.flatMap((r) => r.links);
    } finally {
        o.versioningNo = await h.versioningNo(V.path).catch((e) => `ERR ${flat(e.message, 200)}`);
        const a = await h.openDoaj(V.path, 'Articles');
        o.afterNo = {tabs: a.tabs, cols: a.list && a.list.cols, rows: a.list && a.list.rows, snap: (await snap('r13-02-v-articles-after-no')).label};
        await signOut(page).catch(() => {});
    }
    // the other end: a journal without versioning, "Articles", the issue's name pressed
    await signIn(page, J.m, {contextPath: J.path});
    const a = await h.openDoaj(J.path, 'Articles');
    o.articles = {cols: a.list.cols, rows: a.list.rows};
    const link = page.locator(LIST).first().locator('tr.gridRow').first().getByRole('link', {name: ISSUE1, exact: true});
    if (await link.count()) {
        await link.click();
        const win = page.getByRole('dialog').filter({hasText: 'Table of Contents'}).last();
        await win.waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        const s = await snap('r13-03-articles-issue-window');
        o.issueWindow = {heading: flat(await win.locator('h1, h2').first().innerText().catch(() => null), 150), dialog: flat(s.text && s.text.dialog, 300), snap: s.label};
    } else o.issueWindow = 'no issue link';
    fact(`r13-${app.name}`, o);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 33
async function row33(c, dialogs) {
    const {page, fact, snap, app, S, save} = c;
    const h = helpers(c);
    const o = {};
    const one = (title) => [['a1', title, inIssue1]];
    // Created in this order, which is the Hosted Journals order (journals.seq).
    const Nv = await mkJournal(c, 'Nv', {issues, subs: one('Nv heron wading depth')});
    const Vv = await mkJournal(c, 'Vv', {doiPrefix: '10.1234', doiVersioning: true, issues, subs: one('Vv ibex cliff balance')});
    const Xn = await mkJournal(c, 'Xn', {});
    const Vb = await mkJournal(c, 'Vb', {doiPrefix: '10.1234', doiVersioning: true, issues, subs: one('Vb puffin burrow sharing')});
    const N1 = await mkJournal(c, 'N1', {issues, subs: one('N1 tapir seed dispersal')});
    const X1 = await mkJournal(c, 'X1', {});
    const X2 = await mkJournal(c, 'X2', {});
    const N2 = await mkJournal(c, 'N2', {issues, subs: one('N2 wombat burrow geometry')});
    const J = {Nv, Vv, Xn, Vb, N1, X1, X2, N2};
    note(`row 33 journals ${Object.entries(J).map(([k, v]) => `${k}=${v.path}`).join(', ')} (DOAJ automatic deposit; Vv and Vb "DOI Versioning" Yes until the phase ends).`);
    const pubsOf = (sid) => c.q(`select p.publication_id || ' v' || p.version_major || '.' || p.version_minor || ' status' || p.status || ' doaj=' || coalesce(ps.setting_value,'-') from publications p left join publication_settings ps on ps.publication_id=p.publication_id and ps.setting_name='doaj::status' where p.submission_id=${sid} order by 1`);
    const subStatus = (sid) => c.q(`select coalesce((select setting_value from submission_settings where submission_id=${sid} and setting_name='doaj::status'),'-')`)[0];
    const lastJob = () => Number(c.q("select coalesce(max(id),0) from jobs")[0] || 0);
    const jobsSince = (id) => c.q(`select id || '|' || replace(replace(payload, E'\\\\', ''), '|', '/') from jobs where id > ${id} and payload like '%DOAJ%' order by id`).map((l) => {
        const [jid, p] = [l.slice(0, l.indexOf('|')), l.slice(l.indexOf('|') + 1)];
        return {id: jid, job: (p.match(/DOAJ(Register|Delete)/) || [])[0], objectId: (p.match(/objectId";i:(\d+)/) || [])[1],
            journal: (p.match(/"journal":\{"title":"([^"]*)"/) || [])[1], link: (p.match(/index\.php\/[a-z0-9_]+\/article\/view\/[0-9]+(\/version\/[0-9]+)?/) || [])[0],
            title: (p.match(/"title":"([^"]*)","identifier/) || p.match(/"bibjson":\{"title":"([^"]*)"/) || [])[1]};
    });
    const fleetState = () => ({
        depositing: c.q("select j.path || ' ' || ps.setting_name || '=' || case when ps.setting_name='apiKey' then '(set)' else ps.setting_value end from plugin_settings ps join journals j on j.journal_id=ps.context_id where ps.plugin_name='doajexportplugin' and ps.setting_name in ('apiKey','automaticRegistration') and coalesce(ps.setting_value,'') not in ('','0') order by 1"),
        staleSubmissions: c.q("select s.context_id || ' sub' || ss.submission_id from submission_settings ss join submissions s on s.submission_id=ss.submission_id where ss.setting_name='doaj::status' and ss.setting_value='stale'"),
        stalePublications: c.q("select s.context_id || ' pub' || ps.publication_id from publication_settings ps join publications p on p.publication_id=ps.publication_id join submissions s on s.submission_id=p.submission_id where ps.setting_name='doaj::status' and ps.setting_value='stale'"),
    });
    /** Mark registered on the list, unpublish, publish again: "Needs Sync". */
    const needsSync = async (Jx, tab, label) => {
        const s = Jx.subs.a1;
        const r = {};
        await signIn(page, Jx.m, {contextPath: Jx.path});
        await h.openDoaj(Jx.path, tab);
        await h.tick([tab === 'Publications' ? s.pub : s.id]);
        r.mark = await h.markRegistered();
        r.unpublish = await h.unpublish(Jx.path, s.id, s.pub);
        r.publish = await h.publish(Jx.path, s.id, s.pub);
        const l = await h.openDoaj(Jx.path, tab);
        r.list = h.brief(l.list);
        r.snap = (await snap(`r33-${label}-needs-sync`)).label;
        return r;
    };
    const setAuto = async (Jx, on, label) => {
        await signIn(page, Jx.m, {contextPath: Jx.path});
        await h.openDoaj(Jx.path, null);
        const st = await h.saveSettings(on ? {key: `u63i01-dummy-key-${Jx.path.slice(-6)}`, auto: true} : {auto: false});
        if (label) await snap(label);
        return st;
    };
    const runTask = (label) => {
        const before = lastJob();
        const fleet = fleetState();
        const out = c.cli(['lib/pkp/tools/scheduler.php', 'test', `--name=${TASK}`], 180_000);
        return {label, fleetBefore: fleet, task: out.replace(/u63i01-dummy-key-[a-z0-9]+/g, '…'), jobs: jobsSince(before)};
    };
    const listOf = async (Jx, tab, label) => {
        await signIn(page, Jx.m, {contextPath: Jx.path});
        const l = await h.openDoaj(Jx.path, tab);
        return {rows: h.brief(l.list), snap: (await snap(label)).label};
    };

    try {
        // Hosted Journals, as the site administrator: the order the daily task follows
        await signIn(page, 'admin');
        await c.go(c.cu('index', '/en/admin/contexts'));
        await page.locator('table, .listPanel').first().waitFor({timeout: T}).catch(() => {});
        await idle(page).catch(() => {}); await sleep(800);
        const hs = await snap('r33-00-hosted-journals');
        o.hosted = Object.fromEntries(Object.entries(J).map(([k, v]) => [k, (hs.text && hs.text.main || '').indexOf(`U63 I01 ${k} `)]));

        // ---- run A: (a) the versioning split and (b) older minor versions
        if (!S.r33a) {
            const a = {};
            a.nv = await needsSync(Nv, 'Articles', 'a-nv');
            a.vv = await needsSync(Vv, 'Publications', 'a-vv');
            a.vb = await needsSync(Vb, 'Publications', 'a-vb-10');
            await signIn(page, Vb.m, {contextPath: Vb.path});
            a.vbVersion = await h.newVersion(Vb.path, Vb.subs.a1.id, Vb.subs.a1.pub);
            if (a.vbVersion.newPub) { Vb.subs.a1.pub11 = a.vbVersion.newPub; save(); a.vbPublish11 = await h.publish(Vb.path, Vb.subs.a1.id, a.vbVersion.newPub); }
            a.vbList = await listOf(Vb, 'Publications', 'r33-a-vb-11-published');
            a.xnAuto = await setAuto(Xn, true, 'r33-a-xn-settings');
            a.vbAuto = await setAuto(Vb, true, 'r33-a-vb-settings');
            a.db = {nv: subStatus(Nv.subs.a1.id), vv: pubsOf(Vv.subs.a1.id), vb: pubsOf(Vb.subs.a1.id)};
            a.run = runTask('A');
            a.dbAfter = {nv: subStatus(Nv.subs.a1.id), vv: pubsOf(Vv.subs.a1.id), vb: pubsOf(Vb.subs.a1.id)};
            a.lists = {Nv: await listOf(Nv, 'Articles', 'r33-a-nv-after'), Vv: await listOf(Vv, 'Publications', 'r33-a-vv-after'), Vb: await listOf(Vb, 'Publications', 'r33-a-vb-after'), Xn: await listOf(Xn, 'Articles', 'r33-a-xn-after')};
            a.untick = [await setAuto(Xn, false), await setAuto(Vb, false)];
            S.r33a = true; save();
            fact(`r33-A-${app.name}`, a);
        }
        // ---- run B: N1 listed before X1, both depositing; N1's own article "Needs Sync"
        if (!S.r33b) {
            const b = {};
            b.n1 = await needsSync(N1, 'Articles', 'b-n1');
            b.n1Auto = await setAuto(N1, true);
            b.x1Auto = await setAuto(X1, true);
            b.run = runTask('B');
            b.db = {n1: subStatus(N1.subs.a1.id)};
            b.lists = {N1: await listOf(N1, 'Articles', 'r33-b-n1-after'), X1: await listOf(X1, 'Articles', 'r33-b-x1-after')};
            b.untick = [await setAuto(N1, false), await setAuto(X1, false)];
            S.r33b = true; save();
            fact(`r33-B-${app.name}`, b);
        }
        // ---- run C: X2 listed before N2, both depositing; N2's own article "Needs Sync"
        if (!S.r33c) {
            const cc = {};
            cc.n2 = await needsSync(N2, 'Articles', 'c-n2');
            cc.n2Auto = await setAuto(N2, true);
            cc.x2Auto = await setAuto(X2, true);
            cc.run = runTask('C');
            cc.db = {n2: subStatus(N2.subs.a1.id)};
            cc.lists = {N2: await listOf(N2, 'Articles', 'r33-c-n2-after'), X2: await listOf(X2, 'Articles', 'r33-c-x2-after')};
            cc.untick = [await setAuto(N2, false), await setAuto(X2, false)];
            S.r33c = true; save();
            fact(`r33-C-${app.name}`, cc);
        }
    } finally {
        // "DOI Versioning" back to "No" on the versioning journals (an OJS journal left on "Yes" makes OAI answer 500)
        const restored = {};
        for (const [k, Jx] of [['Vv', Vv], ['Vb', Vb]]) {
            try { await signIn(page, Jx.m, {contextPath: Jx.path}); restored[k] = await h.versioningNo(Jx.path); } catch (e) { restored[k] = `ERR ${flat(e.message, 150)}`; }
        }
        restored.db = c.q(`select j.path || ' ' || coalesce(js.setting_value,'-') from journals j left join journal_settings js on js.journal_id=j.journal_id and js.setting_name='doiVersioning' where j.path in ('${Vv.path}','${Vb.path}')`);
        fact(`r33-restore-${app.name}`, restored);
        fact(`r33-hosted-${app.name}`, o);
        await signOut(page).catch(() => {});
    }
}

module.exports = {row13, row15, row33, helpers};
