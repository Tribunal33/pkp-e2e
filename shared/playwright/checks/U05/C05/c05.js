// U05 claim check C05 (housekeeping 2026-10-13; incidentals row 15): the unread-task count on the
// reader-side header (Rule 4, Actors row 3, A3, A13, note c), with French among the journal's "Forms"
// languages and without it.
//
// Per app, one process, its own scratch context (tag u05c05…), seeded with French a UI AND a "Forms"
// language (the default test dataset's journals have French under "Forms"; publicknowledge here has it
// under "UI" only), plus one submission whose discussion gives the manager, the Journal editor, the
// Section Editor and the Author one unread task each. Phases:
//   P  publicknowledge (French UI only), read-only: the seeded roles' header, desktop (1280) and narrow (800)
//   F  scratch context, French under "Forms" as seeded: every role's header, both widths
//   U  the manager unticks French under "Forms" on Settings › Website › Setup › Languages; the grid read
//      at once and after a reload; every role's header again
//   F2 the manager ticks it back; every role's header again (both ways)
//   B  the manager on a second scratch journal where they are Journal Manager too (their task is in the first)
//   S  the site's own home page (index/en): admin and the scratch manager, both widths (A13)
// Every header read records: the name as displayed (innerText) and in the page's source (textContent),
// each .task_count's text and computed display, the drop-down entries with theirs; then screen() and a PNG.
//
// Run (main, per app, under the slot's lock):
//   PROBE_RUN=r1 PROBE_FEATURE=U05 PROBE_AGENT=ccC05 bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U05/C05/c05.js
// Outputs: .reports/U05/ccC05/ (facts-<run>-<app>.json, one snapshot per read)
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, tag, loc} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

forEachApp(async (app) => {
    const isOps = app.name === 'ops';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, reads: {}};
    const fact = (k, v) => {
        facts.reads[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 700)}`);
    };

    // ---- scratch context: French a UI and a "Forms" language ----
    const t = tag('u05c05');
    const roleKeys = {
        mgr: ['manager'],
        ...(isOps ? {} : {ed: ['editor']}),
        se: ['sectionEditor'],
        ...(isOps ? {} : {rv: ['externalReviewer']}),
        au: ['author'],
        as: [isOps ? 'editorialBoardMember' : 'copyeditor'],
        rd: ['reader'],
    };
    const users = Object.entries(roleKeys).map(([k, roles]) => ({username: `${t}${k}`, roles}));
    await app.api.createContext({tag: t, users,
        context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']}});
    facts.scratch = {path: t, users: users.map((u) => `${u.username}:${u.roles[0]}`)};
    // One unread task each for the manager, the Journal editor, the Section Editor and the Author: a
    // discussion the manager opens on the Author's submission (Rule 6 "Discussion added.").
    const disc = [`${t}mgr`, ...(isOps ? [] : [`${t}ed`]), `${t}se`, `${t}au`];
    const sub = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `C05 count ${t}`,
        participants: [{username: `${t}se`, role: 'sectionEditor'}],
        tasks: [{title: `C05 discussion ${t}`, creator: `${t}mgr`, participants: disc}]});
    facts.submission = {id: sub && (sub.submissionId || sub.id), discussionParticipants: disc};
    // A second journal where the manager is also Journal Manager (no task there): "every journal's tasks counted".
    const t2 = `${t}b`;
    await app.api.createContext({tag: t2, users: [{username: `${t}mgr`, roles: ['manager']}],
        context: {supportedLocales: ['en', 'fr_CA']}});
    facts.second = t2;

    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: rel(page.url())});
        await d.accept().catch(() => {});
    });

    const snap = async (name, extra) => {
        const s = await screen(page);
        record(name, extra ? {...s, extra} : s);
        await shot(page, name).catch(() => {});
    };

    // The bell on the account's own Profile page (every role has it there), as "Tasks N".
    const readBell = async (ctx) => {
        await page.goto(app.url(`/index.php/${ctx}/en/user/profile`));
        await idle(page);
        const bell = page.getByRole('button', {name: /^Tasks/}).first();
        await bell.waitFor({timeout: T}).catch(() => {});
        return (await bell.count()) ? flat(await bell.innerText()) : null;
    };

    // The header's user menu as data, in a window of the given width.
    const readHeader = async (path, width, name) => {
        await page.setViewportSize({width, height: 900});
        const r = await page.goto(app.url(path));
        await page.locator('header.pkp_structure_head').waitFor({timeout: T});
        await idle(page);
        let openMenu = null;
        if (width < 992) {
            const toggle = page.locator('button.pkp_site_nav_toggle');
            openMenu = await toggle.isVisible().catch(() => false);
            if (openMenu) await toggle.click();
            await pause(400);
        } else {
            // open the drop-down the way a person does: press the name
            const top = page.locator('#navigationUser > li > a').first();
            if (await top.count()) {
                await top.hover().catch(() => {});
                await top.click().catch(() => {});
                await pause(400);
            }
        }
        const data = await page.evaluate(() => {
            const f = (s) => String(s || '').replace(/\s+/g, ' ').trim();
            const count = (el) => {
                const c = el.querySelector('.task_count');
                if (!c) return null;
                const st = getComputedStyle(c);
                return {text: f(c.textContent), display: st.display, visibility: st.visibility,
                    rendered: c.getClientRects().length > 0 && c.checkVisibility()};
            };
            const top = document.querySelector('#navigationUser > li > a');
            if (!top) return {top: null};
            const ul = document.querySelector('#navigationUser > li > ul');
            return {
                name: {displayed: f(top.innerText), source: f(top.textContent), count: count(top),
                    html: top.innerHTML.replace(/\s+/g, ' ').trim().slice(0, 300)},
                list: ul ? {display: getComputedStyle(ul).display, rendered: ul.checkVisibility()} : null,
                entries: [...document.querySelectorAll('#navigationUser > li > ul a')].map((a) => ({
                    displayed: f(a.innerText), source: f(a.textContent), count: count(a),
                    href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})),
            };
        });
        data.status = r ? r.status() : null;
        data.width = width;
        data.openMenu = openMenu;
        await snap(name, data);
        await page.setViewportSize({width: 1280, height: 900});
        return data;
    };

    const readRole = async (key, username, ctx, phase) => {
        await signIn(page, username, {contextPath: ctx});
        const bell = await readBell(ctx);
        const desk = await readHeader(`/index.php/${ctx}/en`, 1280, `${phase}-${key}-1280`);
        const narrow = await readHeader(`/index.php/${ctx}/en`, 800, `${phase}-${key}-800`);
        const brief = (d) => d.top === null ? 'no user menu' : {
            name: d.name.displayed, nameSource: d.name.source, nameCount: d.name.count,
            dashboard: (d.entries.find((e) => /^Dashboard/.test(e.source)) || {}),
        };
        fact(`${phase} ${key} (${username})`, {bell, desk: brief(desk), narrow: brief(narrow)});
    };

    // The Languages grid: French's "Forms" box pressed once; the grid read at once and after a reload.
    const languagesGrid = async () => {
        await page.goto(app.url(`/index.php/${t}/en/management/settings/website`));
        await idle(page);
        await page.locator('#setup-button').first().click();
        await idle(page);
        await page.getByRole('tab', {name: 'Languages', exact: true}).filter({visible: true}).first().click();
        await idle(page);
        await pause(800);
        const row = page.locator('tr.gridRow').filter({hasText: 'fr_CA'}).first();
        await row.waitFor({timeout: T});
        return row;
    };
    const readGrid = () => page.locator('#languageGridContainer').evaluate((c) => [...c.querySelectorAll('tbody tr.gridRow')]
        .filter((r) => /fr_CA|en\b|English|Fran/.test(r.innerText))
        .map((r) => ({text: r.innerText.trim().replace(/\s+/g, ' ').slice(0, 50),
            boxes: [...r.querySelectorAll('input[type=checkbox]')].map((b) => ({id: b.id.replace(/-[0-9a-f]{10,}$/, ''), checked: b.checked}))})))
        .catch((e) => ({failed: String(e).slice(0, 200)}));
    const pressFrenchForms = async (phase) => {
        const row = await languagesGrid();
        const before = await readGrid();
        await snap(`${phase}-languages-before`, {grid: before});
        const formsBox = row.locator('input[type="checkbox"][id*="formLocale"]').first();
        await loc(page, 'Languages grid: the French row\'s "Forms" box', formsBox);
        const w = page.waitForResponse((r) => /language/i.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await formsBox.click({noWaitAfter: true});
        const resp = await w;
        await pause(1500);
        await idle(page);
        const s = await screen(page);
        const after = await readGrid();
        await snap(`${phase}-languages-after`, {grid: after, status: resp ? resp.status() : null, notices: s.notices});
        await languagesGrid();
        const reloaded = await readGrid();
        await snap(`${phase}-languages-reloaded`, {grid: reloaded});
        fact(`${phase} languages grid`, {before, status: resp ? resp.status() : null, url: resp ? rel(resp.url()) : null,
            notices: s.notices, after, reloaded, dialogs: dialogs.slice()});
    };

    const scratchRoles = Object.keys(roleKeys);
    try {
        // ---- P: publicknowledge, French under "UI" only (read-only) ----
        const pk = app.contextPath;
        const seeded = isOps
            ? {mgr: 'manager.maya', se: 'sectioneditor.ana', au: 'author.alex', as: 'assistant.rita', rd: 'reader.rosa'}
            : {ed: 'editor.diana', mgr: 'manager.maya', se: 'sectioneditor.ana', rv: 'reviewer.julia', au: 'author.alex',
                as: 'copyeditor.carla', rd: 'reader.rosa'};
        for (const [k, u] of Object.entries(seeded)) await readRole(k, u, pk, 'P');

        // ---- F: the scratch context as seeded, French under "Forms" ----
        for (const k of scratchRoles) await readRole(k, `${t}${k}`, t, 'F');

        // ---- U: the manager unticks French under "Forms", on screen ----
        await signIn(page, `${t}mgr`, {contextPath: t});
        await pressFrenchForms('U');
        for (const k of scratchRoles) await readRole(k, `${t}${k}`, t, 'U');

        // ---- F2: ticked back ----
        await signIn(page, `${t}mgr`, {contextPath: t});
        await pressFrenchForms('F2');
        for (const k of ['mgr', ...(isOps ? [] : ['ed']), 'se', 'rd']) await readRole(k, `${t}${k}`, t, 'F2');

        // ---- B: the manager on the second journal's home page (its task is in the first) ----
        await readRole('mgr-second', `${t}mgr`, t2, 'B');

        // ---- S: the site's own home page ----
        for (const [k, u] of [['admin', 'admin'], ['mgr', `${t}mgr`]]) {
            await signIn(page, u);
            const bell = await readBell('index');
            const desk = await readHeader('/index.php/index/en', 1280, `S-${k}-1280`);
            const narrow = await readHeader('/index.php/index/en', 800, `S-${k}-800`);
            fact(`S ${k} site home`, {bell, desk, narrow});
        }
        await signOut(page).catch(() => {});
    } finally {
        facts.dialogs = dialogs;
        record('facts', facts);
        await close();
    }
});
