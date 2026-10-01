// U63 I01, OJS journal rows: 16 (PubMed exports with NLM unreachable: each POST's status, three times each) and
// 54 (the "Export Issues" list's order over pages and reloads, Native XML and PubMed; main and stable-3_5_0).
const {signIn, signOut, idle, tag, note} = require('../../../probe');
const {T, sleep, flat, rel, openTool, toolTabs} = require('./lib');

const ISSUE1 = 'Vol. 1 No. 1 (2025)';

/** Journal J: two issues, two published articles by "Ada Lovelace" in Vol. 1 No. 1, one unpublished. */
async function seedJ(c) {
    const {app, S, save, fact} = c;
    if (S.J) return S.J;
    const t = tag(`u63i01${c.RUN}j`);
    const roles = [['m', ['manager'], 'Mona', 'Manager'], ['au', ['author'], 'Ada', 'Lovelace'], ['se', ['sectionEditor'], 'Sami', 'Section']];
    await app.api.createContext({tag: t, context: {name: `U63 I01 J ${t}`, acronym: 'I01J', contactName: 'I01 Contact', contactEmail: `${t}c@mail.test`, country: 'CA'},
        issues: [{volume: 1, number: 1, year: 2025, published: true}, {volume: 1, number: 2, year: 2026}],
        users: roles.map(([u, r, g, f]) => ({username: `${t}${u}`, roles: r, givenName: g, familyName: f}))});
    const J = {path: t, m: `${t}m`, subs: {}};
    for (const [k, title, extra] of [['p1', 'Okapi forest census', {published: true, issue: {volume: 1, number: 1, year: 2025}}], ['p2', 'Axolotl limb memory', {published: true, issue: {volume: 1, number: 1, year: 2025}}], ['u1', 'Narwhal tusk acoustics', {}]]) {
        const r = await app.api.createSubmission({tag: `${t}${k}`.slice(0, 32), context: t, submitter: `${t}au`, title, ...extra});
        J.subs[k] = {id: r.submissionId, pub: r.publicationId, title};
    }
    S.J = J; save();
    fact('seedJ', J);
    note(`scratch journal J ${t} (manager ${t}m; ${ISSUE1} published with "Okapi forest census" and "Axolotl limb memory" by Ada Lovelace; "Narwhal tusk acoustics" unpublished).`);
    return J;
}

// ---------------------------------------------------------------------------------------------------------- row 16
async function row16(c) {
    const {page, fact, snap, app} = c;
    const J = await seedJ(c);
    const o = {nlmHost: 'dtd.nlm.nih.gov (the fleet: [proxy] 127.0.0.1:9, nothing answers)'};
    await signIn(page, J.m, {contextPath: J.path});
    const press = async (label, tabName, formSel, tick, buttonName, urlPart) => {
        await openTool(c, J.path, 'PubMed XML Export Plugin');
        await page.locator('.ui-tabs-nav').getByRole('link', {name: tabName, exact: true}).first().click();
        await idle(page).catch(() => {}); await sleep(800);
        await tick();
        const from = c.logSize();
        const w = page.waitForResponse((x) => x.url().includes(urlPart) && x.request().method() === 'POST', {timeout: 90_000}).catch(() => null);
        const dl = page.waitForEvent('download', {timeout: 15_000}).catch(() => null);
        const t0 = Date.now();
        await page.locator(formSel).getByRole('button', {name: buttonName, exact: true}).click();
        const r = await w;
        const h = r ? r.headers() : {};
        const out = {post: r ? `POST ${r.status()} ${rel(r.url()).slice(0, 120)}` : null, status: r ? r.status() : null, contentDisposition: h['content-disposition'] || null, ms: Date.now() - t0};
        if (out.contentDisposition) { const d = await dl; out.download = d ? d.suggestedFilename() : 'no event'; }
        await page.waitForLoadState('load').catch(() => {}); await sleep(800);
        out.urlAfter = rel(page.url());
        out.headings = await page.locator('h1, h2, h3').allInnerTexts().catch(() => []);
        out.bodyStart = flat(await page.locator('body').innerText().catch(() => ''), 400);
        out.phpLog = c.logSince(from);
        out.snap = (await snap(label)).label;
        return out;
    };
    for (let i = 1; i <= 3; i++) {
        o[`exportIssues${i}`] = await press(`r16-export-issues-${i}`, 'Export Issues', '#exportIssuesXmlForm', async () => {
            const row = page.locator('#exportIssuesXmlForm tr.gridRow').filter({hasText: ISSUE1}).first();
            await row.waitFor({timeout: T}); await row.locator('input[type="checkbox"]').check();
        }, 'Export Issues', '/exportIssues');
        o[`exportArticles${i}`] = await press(`r16-export-articles-${i}`, 'Export Articles', '#exportXmlForm', async () => {
            const box = page.locator('#exportXmlForm label').filter({hasText: 'Okapi forest census'}).locator('input[name="selectedSubmissions[]"]').first();
            await box.waitFor({timeout: T}); await box.check();
        }, 'Export Articles', '/exportSubmissions');
    }
    fact(`r16-${app.name}`, o);
    await signOut(page).catch(() => {});
}

// ---------------------------------------------------------------------------------------------------------- row 54
/** Journal I: 30 issues in mixed order of volume and year, every third one unpublished. */
async function seedI(c) {
    const {app, S, save, fact} = c;
    if (S.I54) return S.I54;
    const t = tag(`u63i01${c.RUN}i`);
    const issues = [];
    for (let i = 1; i <= 30; i++) issues.push({volume: ((i * 7) % 30) + 1, number: 1 + (i % 3), year: 1995 + ((i * 11) % 30), ...(i % 3 ? {published: true} : {})});
    await app.api.createContext({tag: t, context: {name: `U63 I01 I ${t}`, acronym: 'I01I', contactName: 'I01 Contact', contactEmail: `${t}c@mail.test`, country: 'CA'},
        issues, users: [{username: `${t}m`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'}]});
    S.I54 = {path: t, m: `${t}m`, issues: issues.map((x) => `Vol. ${x.volume} No. ${x.number} (${x.year})${x.published ? '' : ' [unpublished]'}`)};
    save();
    fact('seedI54', S.I54);
    return S.I54;
}

/** The issue grid on the open tab: rows (name | items), paging line, page links. */
async function readIssueGrid(page) {
    const g = page.locator('#exportIssues-tab .pkp_controllers_grid, #exportIssuesXmlForm .pkp_controllers_grid').first();
    await g.locator('tr.gridRow, tbody.empty').first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return g.evaluate((grid) => {
        const vis = (el) => !!(el && el.offsetParent !== null);
        const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        return {
            cols: [...grid.querySelectorAll('thead th')].map(txt),
            rows: [...grid.querySelectorAll('tr.gridRow')].filter(vis).map((tr) => [...tr.querySelectorAll('td')].slice(1).map(txt).join(' | ')),
            paging: txt(grid.querySelector('.gridPaging')),
            pageLinks: [...grid.querySelectorAll('.gridPaging a')].filter(vis).map(txt),
            perPage: [...grid.querySelectorAll('.gridPaging select option')].map((o) => `${o.text.trim()}${o.selected ? '*' : ''}`),
        };
    }).catch((e) => ({error: String(e.message).slice(0, 200)}));
}

async function row54(c) {
    const {page, fact, snap, app} = c;
    const I = await seedI(c);
    const o = {seeded: I.issues, db: c.q(`select i.issue_id || ' v' || i.volume || ' n' || i.number || ' y' || i.year || ' pub' || i.published || ' ctid' || i.ctid from issues i join journals j on j.journal_id=i.journal_id where j.path='${I.path}' order by i.ctid`)};
    await signIn(page, I.m, {contextPath: I.path});
    const pages = async (tool, label) => {
        const out = [];
        for (let k = 1; k <= 3; k++) {
            await openTool(c, I.path, tool);
            await page.locator('.ui-tabs-nav').getByRole('link', {name: 'Export Issues', exact: true}).first().click();
            await idle(page).catch(() => {}); await sleep(800);
            const p1 = await readIssueGrid(page);
            const s1 = (await snap(`${label}-load${k}-page1`)).label;
            let p2 = null; let s2 = null;
            const next = page.locator('#exportIssues-tab .gridPaging a, #exportIssuesXmlForm .gridPaging a').filter({hasText: /^\s*2\s*$/}).first();
            if (await next.count()) {
                await next.click(); await idle(page).catch(() => {}); await sleep(1000);
                p2 = await readIssueGrid(page);
                s2 = (await snap(`${label}-load${k}-page2`)).label;
            }
            const names = [...(p1.rows || []), ...((p2 && p2.rows) || [])].map((r) => r.split(' | ')[0]);
            const dup = names.filter((x, i) => names.indexOf(x) !== i);
            out.push({page1: p1, page2: p2, snaps: [s1, s2], listed: names.length, distinct: new Set(names).size, repeated: dup, missing: I.issues.map((x) => x.replace(' [unpublished]', '')).filter((x) => !names.includes(x))});
        }
        return out;
    };
    o.native = await pages('Native XML Plugin', 'r54-native');
    o.pubmed = await pages('PubMed XML Export Plugin', 'r54-pubmed');
    // An issue's "Issue Data" saved unchanged from the list's own issue link ("Issue Management"), then the list again.
    if ((app.line || 'main') === 'main' || process.env.R54_EDIT === '1') {
        try {
            await openTool(c, I.path, 'Native XML Plugin');
            await page.locator('.ui-tabs-nav').getByRole('link', {name: 'Export Issues', exact: true}).first().click();
            await idle(page).catch(() => {}); await sleep(800);
            const first = await readIssueGrid(page);
            const name = first.rows[0].split(' | ')[0];
            o.edited = name;
            await page.locator('#exportIssues-tab tr.gridRow').first().getByRole('link', {name, exact: true}).click();
            const win = page.getByRole('dialog').filter({hasText: 'Issue Data'}).last();
            await win.waitFor({timeout: T});
            o.windowTitle = flat(await win.locator('h1, h2, .pkp_modal_title, [class*="header"]').first().innerText().catch(() => null), 150);
            await idle(page).catch(() => {}); await sleep(800);
            await win.getByRole('tab', {name: 'Issue Data', exact: true}).click();
            const form = win.locator('form#issueForm');
            await form.waitFor({timeout: T}); await idle(page).catch(() => {}); await sleep(800);
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /issue/i.test(r.url()), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await w;
            o.saveAnswer = r ? `${r.status()} ${rel(r.url()).slice(0, 140)}` : null;
            await idle(page).catch(() => {}); await sleep(1000);
            o.afterSaveSnap = (await snap('r54-issue-data-saved')).label;
            o.afterEdit = await pages('Native XML Plugin', 'r54-native-after-edit');
            o.dbAfter = c.q(`select i.issue_id || ' v' || i.volume || ' n' || i.number || ' y' || i.year || ' ctid' || i.ctid from issues i join journals j on j.journal_id=i.journal_id where j.path='${I.path}' order by i.ctid`);
        } catch (e) { o.editError = flat(e.message, 400); await snap('r54-edit-error'); }
    }
    fact(`r54-${app.name}-${app.line || 'main'}`, o);
    await signOut(page).catch(() => {});
}

module.exports = {seedJ, row16, row54, readIssueGrid, ISSUE1};
