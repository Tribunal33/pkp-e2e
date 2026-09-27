const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U54 claim check K1: the "Roles" list as a manager finds it (spec lines
// 10-109, 150-181, 342-344, register A1), plus the Actors table's rows as
// each permission level reaches them.
//
// Run: PROBE_FEATURE=U54 PROBE_AGENT=ccK1 node bin/probe.js all shared/playwright/checks/U54/K1/k1.js
//      PH=seed,land,grid,...  runs only those phases (default: all, in order;
//      "create" before "reorder", "actions" before "removes", "cmps" after "removes").
//      Seeds live in .reports/U54/ccK1/state-<app>.json; delete it to reseed.
//
// Contexts per app (tag prefix u54k1):
//   A  fresh, French as a UI language; manager `<A>m`. Read-only until the
//      last phases (create a role, edit Copyeditor, French view).
//   B  one account per permission level + custom roles (held, past, unheld,
//      a manager-level one with no "Permit changes to Settings").
//   C  (OJS, OMP) "Journal editor" with "Permit changes to Settings" off.
//   P  paging: OPS with five custom roles (10 rows); every app's manager
//      sets "Items per page" on screen.
//   R  admin with Reader + manager; the manager role ended on screen.
//   O  (OMP) a published monograph with a PDF format (Site Access Options).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag} = require('../../../probe');

const T = 20_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const PHASES = (process.env.PH || 'seed,land,grid,filters,edits,paging10,createwin,createwin2,create,reorder,french,siteaccess,lists,levels,actions,removes,nops,pag,adm,ompaccess,cmps,pag2,sweep,admnav').split(',');
const on = (p) => PHASES.includes(p);
const outDir = path.join(__dirname, '../../../../../.reports/U54/ccK1');
const stateFile = (app) => path.join(outDir, `state-${app.name}.json`);

// ---------------------------------------------------------------- seeding
async function seed(app) {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    const t = tag('u54k1');
    const S = {t, A: `${t}a`, B: `${t}b`, C: isOps ? null : `${t}c`, P: `${t}p`, R: `${t}r`, O: isOmp ? `${t}o` : null};
    const ctx = (p, extra = {}) => ({tag: p, ...extra, context: {name: `U54 K1 ${p}`, acronym: 'KONE', contactName: 'K1 Contact', contactEmail: `${p}c@mail.test`, ...(extra.context || {})}});
    const U = (p, k, roles, g, f, more = {}) => ({username: `${p}${k}`, roles, givenName: g, familyName: f, ...more});
    // A: fresh, French as a UI language.
    await app.api.createContext(ctx(S.A, {context: {supportedLocales: ['en', 'fr_CA']}, users: [U(S.A, 'm', ['manager'], 'Mira', 'Manager')]}));
    // B: one account per level.
    const lv = isOps
        ? [['mgr', 'manager'], ['se', 'sectionEditor'], ['ebm', 'editorialBoardMember'], ['au', 'author'], ['rd', 'reader']]
        : [['mgr', 'manager'], ['ed', 'editor'], ['pe', 'productionEditor'], ['se', 'sectionEditor'], ['ce', 'copyeditor'], ['au', 'author'], ['rv', 'externalReviewer'], ['rd', 'reader'], ...(isOjs ? [['sm', 'subscriptionManager']] : [])];
    const usersB = lv.map(([k, r]) => U(S.B, k, [r], k.toUpperCase(), 'Level'));
    usersB.push(U(S.B, 'cm', ['cmgr'], 'Cmg', 'Custom'));
    usersB.push(U(S.B, 'hd', ['held'], 'Hed', 'Holder'));
    usersB.push({username: `${S.B}pt`, roles: ['reader'], pastRoles: [{role: 'pastr'}], givenName: 'Pat', familyName: 'Past'});
    const resB = await app.api.createContext(ctx(S.B, {
        customRoles: [
            {key: 'cmgr', level: 'manager', name: 'K1 manager role', abbrev: 'KMR'},
            {key: 'held', level: 'assistant', name: 'K1 held role', abbrev: 'KHR'},
            {key: 'pastr', level: 'author', name: 'K1 past role', abbrev: 'KPR'},
            {key: 'unheld', level: 'assistant', name: 'K1 unheld role', abbrev: 'KUR'},
            {key: 'unheld2', level: 'reader', name: 'K1 second unheld', abbrev: 'KSU'},
        ],
        users: usersB,
    }));
    S.Bkeys = lv.map(([k]) => k).concat(['cm', 'hd', 'pt']);
    S.Bcustom = resB.customRoles;
    if (S.C) await app.api.createContext(ctx(S.C, {roles: {editor: {permitSettings: false}}, users: [U(S.C, 'ed', ['editor'], 'Eno', 'Nosettings'), U(S.C, 'mgr', ['manager'], 'Mira', 'Manager')]}));
    // P: paging. OPS gets five custom roles (5 + 5 = 10 rows).
    const pc = isOps ? {customRoles: [1, 2, 3, 4, 5].map((i) => ({key: `pr${i}`, level: 'assistant', name: `K1 paging role ${i}`, abbrev: `KP${i}`}))} : {};
    await app.api.createContext(ctx(S.P, {...pc, users: [U(S.P, 'm', ['manager'], 'Mira', 'Manager')]}));
    // R: admin with Reader beside the manager role.
    await app.api.createContext(ctx(S.R, {users: [{username: 'admin', roles: ['reader']}]}));
    // O: a published monograph with a PDF format.
    if (S.O) {
        await app.api.createContext(ctx(S.O, {users: [U(S.O, 'm', ['manager'], 'Mira', 'Manager'), U(S.O, 'au', ['author'], 'Ava', 'Author')]}));
        const r = await app.api.createSubmission({tag: `${S.O}s`, context: S.O, submitter: `${S.O}au`, title: `K1 access monograph ${t}`,
            files: [{file: 'article.pdf'}], decisions: ['skipExternalReview', 'sendToProduction'], published: true,
            publicationFormats: [{name: 'PDF', file: 'article.pdf'}]});
        S.Osub = {id: r.submissionId, pub: r.publicationId, formats: r.publicationFormats};
    }
    fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
    return S;
}

// ---------------------------------------------------------------- helpers
const accessUrl = (app, ctx, loc = 'en', p = 'management/settings/access') => app.url(`/index.php/${ctx}/${loc}/${p}`);

async function gotoRoles(page, app, ctx, loc = 'en') {
    await page.goto(accessUrl(app, ctx, loc));
    await idle(page);
    await page.locator('#roles-button').first().click();
    await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
    await idle(page);
}

const grid = (page) => page.locator('#roleGridContainer');

async function readGrid(page) {
    return grid(page).evaluate((g) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const cols = [...g.querySelectorAll('thead th')].map((th) => th.innerText.trim());
        const rows = [...g.querySelectorAll('tbody tr.gridRow')].filter(vis).map((tr) => {
            const tds = [...tr.children];
            return {
                id: tr.id.replace(/^.*-row-/, ''),
                name: (tr.querySelector('[id$="-name"] .label') || {}).innerText?.trim(),
                level: (tr.querySelector('[id$="-roleId"] .label') || {}).innerText?.trim(),
                boxes: [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '),
                arrow: !!tr.querySelector('a.show_extras, a.hide_extras'),
            };
        });
        const paging = g.querySelector('.gridPaging');
        const ipp = g.querySelector('.gridItemsPerPage');
        const sel = g.querySelector('select.itemsPerPage');
        const header = [...g.querySelectorAll('.header a')].filter(vis).map((a) => a.innerText.trim());
        const h4 = (g.querySelector('.header h4') || {}).innerText?.trim();
        const form = g.querySelector('#userGroupSearchForm');
        return {
            heading: h4, header, cols, rows,
            pagingText: paging ? paging.innerText.replace(/\s+/g, ' ').trim() : null,
            pagesText: (g.querySelector('.gridPages') || {}).innerText?.replace(/\s+/g, ' ').trim(),
            pageLinks: [...g.querySelectorAll('.gridPages a')].filter(vis).map((a) => a.innerText.trim()),
            itemsPerPageVisible: vis(ipp),
            itemsPerPageOptions: sel ? [...sel.options].map((o) => o.text.trim()) : null,
            itemsPerPageSelected: sel ? sel.options[sel.selectedIndex]?.text.trim() : null,
            filterFormVisible: vis(form),
        };
    });
}

const rowsLine = (g) => g.rows.map((r) => `${r.name} | ${r.level} | ${r.boxes}${r.arrow ? '' : ' | NO ARROW'}`);

async function snap(page, name, extra) {
    const s = await screen(page);
    record(name, {...s, ...(extra ? {extra} : {})});
    await shot(page, name).catch(() => {});
    return s;
}

async function notices(page, ms = 4000) {
    const end = Date.now() + ms;
    let seen = [];
    while (Date.now() < end) {
        seen = await page.locator('.app__notifications, .ui-pnotify, [role=status], [role=alert]').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        if (seen.some((x) => x.length > 3 && !/^Saving/.test(x))) break;
        await sleep(250);
    }
    return seen;
}

function rowLoc(page, name) {
    return grid(page).locator('tr.gridRow').filter({has: page.locator('[id$="-name"] .label', {hasText: new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`)})}).first();
}

async function openRowActions(page, name) {
    const row = rowLoc(page, name);
    const arrow = row.locator('a.show_extras');
    if (!(await arrow.count())) return null;
    await arrow.click();
    const ctl = row.locator('xpath=following-sibling::tr[1]');
    await ctl.getByRole('link', {name: 'Edit', exact: true}).waitFor({timeout: 5000}).catch(() => {});
    return ctl;
}

async function readForm(form) {
    return form.evaluate((el) => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const lab = (i) => {
            const l = el.querySelector(`label[for="${i.id}"]`) || i.closest('label');
            return l ? l.innerText.replace(/\s+/g, ' ').trim() : i.name;
        };
        const st = (i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}${vis(i) ? '' : 'h'}`;
        const sel = el.querySelector('select[name="roleId"]');
        const stagesBox = el.querySelector('input[name="assignedStages[]"]');
        return {
            level: sel ? sel.options[sel.selectedIndex].text.trim() : null,
            levelDisabled: sel ? sel.disabled : null,
            levelOptions: sel ? [...sel.options].map((o) => o.text.trim()) : null,
            names: [...el.querySelectorAll('input[name^="name["]')].map((i) => `${i.name}=${i.value}`),
            abbrevs: [...el.querySelectorAll('input[name^="abbrev["]')].map((i) => `${i.name}=${i.value}`),
            stages: [...el.querySelectorAll('input[name="assignedStages[]"]')].map((i) => `${lab(i)}:${st(i)}`),
            stageSectionVisible: stagesBox ? vis(stagesBox.closest('.section') || stagesBox) : null,
            options: ['permitSelfRegistration', 'recommendOnly', 'permitMetadataEdit', 'masthead', 'permitSettings'].map((n) => {
                const i = el.querySelector(`input[name="${n}"]`);
                return i ? `${n}:${st(i)}` : `${n}:absent`;
            }),
            buttons: [...el.querySelectorAll('button, a')].filter(vis).map((b) => b.innerText.trim()).filter(Boolean),
            text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 1500),
        };
    });
}

async function openEdit(page, name) {
    const ctl = await openRowActions(page, name);
    if (!ctl) return null;
    await ctl.getByRole('link', {name: 'Edit', exact: true}).click();
    const form = page.locator('form#userGroupForm');
    await form.waitFor({state: 'visible', timeout: T});
    await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T}).catch(() => {});
    await idle(page);
    await sleep(300);
    return form;
}

async function cancelForm(page) {
    const form = page.locator('form#userGroupForm');
    await form.getByRole('link', {name: 'Cancel', exact: true}).or(form.getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {});
    await form.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
    await sleep(600);
}

async function classify(page) {
    return page.evaluate(() => {
        const vis = (e) => !!(e && (e.offsetWidth || e.offsetHeight || e.getClientRects().length));
        const h1 = [...document.querySelectorAll('h1')].filter(vis).map((h) => h.innerText.trim());
        const tabs = [...document.querySelectorAll('[role=tab]')].filter(vis).map((t) => t.innerText.trim());
        const dialogs = [...document.querySelectorAll('[role=dialog]')].filter(vis).map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300));
        const main = (document.querySelector('main') || document.body).innerText.replace(/\s+/g, ' ').trim().slice(0, 600);
        return {url: location.href, h1, tabs, dialogs, main};
    });
}

async function openFilters(page) {
    const form = grid(page).locator('#userGroupSearchForm');
    if (!(await form.isVisible())) {
        await grid(page).locator('.header a').filter({hasText: /^\s*Search\s*$/}).first().click();
        await form.waitFor({state: 'visible', timeout: 5000}).catch(() => {});
    }
    return form;
}

async function chooseFilter(page, name, label) {
    const form = await openFilters(page);
    const w = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
    await form.locator(`select[name="${name}"]`).selectOption({label});
    const resp = await w;
    await idle(page);
    await sleep(400);
    return resp ? resp.status() : null;
}

// ---------------------------------------------------------------- main
forEachApp(async (app) => {
    const isOjs = app.name === 'ojs', isOmp = app.name === 'omp', isOps = app.name === 'ops';
    let S = fs.existsSync(stateFile(app)) ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    if (!S || on('reseed')) S = await seed(app);
    const F = {};
    const fact = (k, v) => { F[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}:`, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const as = async (u, ctx) => signIn(page, u, {contextPath: ctx});
    const step = async (name, fn) => {
        if (!on(name)) return;
        try { await fn(); } catch (e) { fact(`${name}-ERROR`, String(e.stack || e).slice(0, 800)); await shot(page, `err-${name}`).catch(() => {}); }
    };
    try {
        // ---- land: Settings › Users & Roles as the manager of A (Rule 1)
        await step('land', async () => {
            await as(`${S.A}m`, S.A);
            await page.goto(accessUrl(app, S.A));
            await idle(page);
            await snap(page, 'k1-01-landing');
            fact('landing', await classify(page));
            fact('sideMenuUsersRoles', await page.locator('nav a, aside a').filter({hasText: /Users & Roles/}).evaluateAll((as) => as.map((a) => a.getAttribute('href'))).catch(() => []));
            await loc(page, 'Users & Roles › "Roles" tab', page.locator('#roles-button'));
            await loc(page, 'Users & Roles › "Site Access Options" tab', page.getByRole('tab', {name: 'Site Access Options'}));
        });

        // ---- grid: the "Roles" list of a new context (Fields, Rules 2, 4, 5)
        await step('grid', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            await snap(page, 'k1-02-roles-fresh');
            const g = await readGrid(page);
            fact('grid', {heading: g.heading, header: g.header, cols: g.cols, pagingText: g.pagingText, pageLinks: g.pageLinks, ipp: [g.itemsPerPageVisible, g.itemsPerPageOptions, g.itemsPerPageSelected], filterFormVisible: g.filterFormVisible, rows: rowsLine(g)});
            // "Create New Role" position (top right) and the header's other links.
            const pos = await grid(page).locator('.header').evaluate((h) => {
                const r = h.getBoundingClientRect();
                return [...h.querySelectorAll('a, h4')].map((a) => ({t: a.innerText.trim(), x: Math.round(a.getBoundingClientRect().left - r.left), w: Math.round(r.width)}));
            });
            fact('headerPos', pos);
            // Stage boxes: accessible names.
            fact('boxNames', await grid(page).locator('tbody tr.gridRow').nth(3).evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => ({label: i.labels ? i.labels.length : 0, aria: i.getAttribute('aria-label'), title: i.title}))));
            await loc(page, 'Roles › list container', grid(page));
            await loc(page, 'Roles › rows', grid(page).locator('tbody tr.gridRow'));
            await loc(page, 'Roles › row "Settings" arrow', grid(page).locator('a.show_extras'));
            await loc(page, 'Roles › "Create New Role"', grid(page).getByRole('link', {name: 'Create New Role', exact: true}));
            await loc(page, 'Roles › header "Search" link (shows the filters)', grid(page).locator('.header a').filter({hasText: /^\s*Search\s*$/}));
            // Stored options of the first row (no screen shows them): database read, secondary evidence.
            try {
                const {execFileSync} = require('child_process');
                const q = `select ug.user_group_id, ug.role_id, ug.permit_self_registration, ug.permit_metadata_edit, ug.permit_settings, (select setting_value from user_group_settings s where s.user_group_id=ug.user_group_id and s.setting_name='recommendOnly' limit 1) as rec, ug.masthead, (select setting_value from user_group_settings s where s.user_group_id=ug.user_group_id and s.setting_name='name' and s.locale='en' limit 1) from user_groups ug join ${isOjs ? 'journals' : isOmp ? 'presses' : 'servers'} c on c.${isOjs ? 'journal_id' : isOmp ? 'press_id' : 'server_id'}=ug.context_id where c.path='${S.A}' order by ug.user_group_id`;
                fact('dbFlags', execFileSync('psql', ['-d', `${dbName(app.name)}`, '-tA', '-c', q], {encoding: 'utf8'}).trim().split('\n'));
            } catch (e) { fact('dbFlags', String(e.message).slice(0, 300)); }
        });

        // ---- filters (Rule 3, fn-d; Rule 5 with a filter, fn-f)
        await step('filters', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            const form = await openFilters(page);
            await snap(page, 'k1-03-filters-open');
            const opts = await form.evaluate((f) => ({
                labels: [...f.querySelectorAll('label')].map((l) => l.innerText.trim()),
                stage: [...f.querySelectorAll('select[name=selectedStageId] option')].map((o) => o.text.trim()),
                level: [...f.querySelectorAll('select[name=selectedRoleId] option')].map((o) => o.text.trim()),
                buttons: [...f.querySelectorAll('button, input[type=submit]')].map((b) => b.innerText || b.value),
            }));
            fact('filterOptions', opts);
            await loc(page, 'Roles › filter "List roles assigned to"', form.locator('select[name="selectedStageId"]'));
            await loc(page, 'Roles › filter "With permission level set to"', form.locator('select[name="selectedRoleId"]'));
            const res = {};
            for (const st of opts.stage.slice(1)) {
                res[`stage:${st}`] = {status: await chooseFilter(page, 'selectedStageId', st)};
                const g = await readGrid(page);
                res[`stage:${st}`].rows = rowsLine(g);
                res[`stage:${st}`].paging = g.pagesText;
                if (st === 'Copyediting') await snap(page, 'k1-04-filter-copyediting');
            }
            await chooseFilter(page, 'selectedStageId', opts.stage[0]);
            for (const lv of opts.level.slice(1)) {
                res[`level:${lv}`] = {status: await chooseFilter(page, 'selectedRoleId', lv)};
                const g = await readGrid(page);
                res[`level:${lv}`].rows = rowsLine(g);
                if (lv === 'Assistant') await snap(page, 'k1-05-filter-assistant');
            }
            // Both at once: Copyediting (OPS Production) + Assistant.
            await chooseFilter(page, 'selectedRoleId', 'Assistant');
            res.assistantFirst = (await readGrid(page)).rows[0];
            await chooseFilter(page, 'selectedStageId', opts.stage.find((s) => /Copyediting|Production/.test(s)) || opts.stage[1]);
            res.both = {rows: rowsLine(await readGrid(page))};
            await snap(page, 'k1-06-filter-both');
            await chooseFilter(page, 'selectedStageId', opts.stage[0]);
            await chooseFilter(page, 'selectedRoleId', opts.level[0]);
            res.backToAll = (await readGrid(page)).rows.length;
            // Hide the filters again with "Search": does the choice stay?
            await grid(page).locator('.header a').filter({hasText: /^\s*Search\s*$/}).first().click();
            await sleep(600);
            res.afterSearchToggle = {formVisible: (await readGrid(page)).filterFormVisible, rows: rowsLine(await readGrid(page)).length};
            // Reload: filter kept?
            await gotoRoles(page, app, S.A);
            const g2 = await readGrid(page);
            res.afterReload = {rows: g2.rows.length, formVisible: g2.filterFormVisible};
            fact('filters', res);
        });

        // ---- edits: each row's "Edit" window (the roles table's options, fn-c; fn-f)
        await step('edits', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            const g = await readGrid(page);
            const out = [];
            for (const r of g.rows) {
                if (!r.arrow) { out.push(`${r.name}: NO ARROW`); continue; }
                const form = await openEdit(page, r.name);
                if (!form) { out.push(`${r.name}: no edit`); continue; }
                const f = await readForm(form);
                const title = await page.getByRole('dialog').last().evaluate((d) => (d.querySelector('h2, h1, .pkp_modal_panel > .header, [id$=title]') || {}).innerText || '').catch(() => '');
                out.push(`${r.name} | title ${flat(title, 40)} | level ${f.level}${f.levelDisabled ? ' (greyed)' : ''} | ${f.options.join(' ')} | stages ${f.stages.join(' ')}`);
                if (r.name === 'Copyeditor') {
                    await snap(page, 'k1-07-edit-copyeditor', {form: f});
                    fact('editCopyeditorFull', f);
                }
                await cancelForm(page);
                await gotoRoles(page, app, S.A);
            }
            fact('edits', out);
        });

        // ---- paging10: "Items per page:" "10" on A (Rule 4, fn-e, fn-f)
        await step('paging10', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            const g = await readGrid(page);
            const res = {before: {text: g.pagesText, ipp: g.itemsPerPageVisible}};
            if (g.itemsPerPageVisible) {
                const w = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
                await grid(page).locator('select.itemsPerPage').selectOption({label: '10'});
                await w; await idle(page); await sleep(400);
                const g1 = await readGrid(page);
                res.p1 = {text: g1.pagesText, links: g1.pageLinks, rows: rowsLine(g1)};
                await snap(page, 'k1-08-ipp10-page1');
                const next = grid(page).locator('.gridPages a').filter({hasText: /^\s*(2|>)\s*$/}).first();
                if (await next.count()) {
                    const w2 = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
                    await next.click(); await w2; await idle(page); await sleep(400);
                    const g2 = await readGrid(page);
                    res.p2 = {text: g2.pagesText, links: g2.pageLinks, rows: rowsLine(g2)};
                    await snap(page, 'k1-09-ipp10-page2');
                    // The second page's first row: open the second row's actions to compare.
                    await loc(page, 'Roles › page links', grid(page).locator('.gridPages a'));
                }
                // Reload: does the choice stay?
                await gotoRoles(page, app, S.A);
                const g3 = await readGrid(page);
                res.afterReload = {text: g3.pagesText, sel: g3.itemsPerPageSelected, rows: g3.rows.length};
                // Back to 25.
                if (g3.itemsPerPageSelected !== '25') {
                    const w3 = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
                    await grid(page).locator('select.itemsPerPage').selectOption({label: '25'}); await w3; await idle(page);
                }
            }
            fact('paging10', res);
        });

        // ---- createwin: "Create New Role" window, level by level (fn-k, Actors row 3)
        await step('createwin', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            await grid(page).getByRole('link', {name: 'Create New Role', exact: true}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T});
            await idle(page); await sleep(300);
            await snap(page, 'k1-10-create-window');
            const f0 = await readForm(form);
            const res = {open: f0, levels: {}};
            for (const lv of f0.levelOptions) {
                await form.locator('select[name="roleId"]').selectOption({label: lv});
                await sleep(300);
                const f = await readForm(form);
                res.levels[lv] = `stagesVisible ${f.stageSectionVisible} | ${f.stages.join(' ')} | ${f.options.join(' ')}`;
            }
            fact('createWindow', res);
            await cancelForm(page);
        });

        // ---- createwin2: the window's level list driven in another order (Reader first)
        await step('createwin2', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            await grid(page).getByRole('link', {name: 'Create New Role', exact: true}).click();
            const form = page.locator('form#userGroupForm');
            await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T});
            await idle(page); await sleep(300);
            const seq = [];
            const mgrLevel = (await readForm(form)).levelOptions[0];
            for (const lv of ['Reader', mgrLevel, 'Reader', 'Assistant', 'Reviewer', 'Reader']) {
                await form.locator('select[name="roleId"]').selectOption({label: lv});
                await sleep(400);
                const f = await readForm(form);
                const box = form.locator('input[name="assignedStages[]"]').first();
                const shown = await box.evaluate((i) => { let e = i; const out = []; while (e && e.tagName !== 'FORM') { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') out.push(`${e.tagName}.${e.className}#${e.id}:${cs.display}`); e = e.parentElement; } return out; });
                seq.push(`${lv}: ${f.stages.join(' ')} | hiddenBy ${JSON.stringify(shown)} | ${f.options.join(' ')}`);
                if (lv === 'Reader' && seq.length === 1) await snap(page, 'k1-10b-create-reader-first');
            }
            fact('createWindow2', seq);
            await cancelForm(page);
        });

        // ---- create: a created role joins the end of the list (Rule 2, fn-b)
        await step('create', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            await grid(page).getByRole('link', {name: 'Create New Role', exact: true}).click();
            const form = page.locator('form#userGroupForm');
            await form.waitFor({state: 'visible', timeout: T});
            await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T});
            await idle(page); await sleep(300);
            await form.locator('select[name="roleId"]').selectOption({label: 'Assistant'});
            await form.locator('input[name="name[en]"]').fill('K1 created role');
            await form.locator('input[name="abbrev[en]"]').fill('KCR');
            const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            const resp = await w;
            const n = await notices(page);
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            const same = await readGrid(page);
            await snap(page, 'k1-11-after-create');
            await gotoRoles(page, app, S.A);
            const re = await readGrid(page);
            fact('create', {status: resp && resp.status(), notices: n, samePage: rowsLine(same).slice(-3), reload: rowsLine(re).slice(-3), reloadText: re.pagesText});
        });

        // ---- reorder: Copyeditor's "Edit" › masthead ticked › OK; does the row move? (fn-b)
        await step('reorder', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            const before = rowsLine(await readGrid(page)).map((r) => r.split(' | ')[0]);
            const form = await openEdit(page, isOps ? 'Author' : 'Copyeditor');
            await form.locator('input[name="masthead"]').check();
            const w = page.waitForResponse((r) => r.url().includes('update-user-group'), {timeout: T}).catch(() => null);
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            const resp = await w;
            const n = await notices(page);
            await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await sleep(500);
            const same = rowsLine(await readGrid(page)).map((r) => r.split(' | ')[0]);
            await gotoRoles(page, app, S.A);
            const after = rowsLine(await readGrid(page)).map((r) => r.split(' | ')[0]);
            await snap(page, 'k1-12-after-copyeditor-edit');
            fact('reorder', {status: resp && resp.status(), notices: n, before, same, after});
        });

        // ---- french: the list in French (fn-w, Fields "Role Name")
        await step('french', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A, 'fr_CA');
            await snap(page, 'k1-13-roles-french');
            const g = await readGrid(page);
            fact('french', {heading: g.heading, header: g.header, cols: g.cols, pages: g.pagesText, rows: g.rows.map((r) => `${r.name} | ${r.level}`)});
        });

        // ---- siteaccess: the tab, an unsaved change across tabs and on leaving (Rule 1)
        await step('siteaccess', async () => {
            await as(`${S.A}m`, S.A);
            await page.goto(accessUrl(app, S.A));
            await idle(page);
            await page.getByRole('tab', {name: 'Site Access Options'}).click();
            const box = page.getByRole('checkbox', {name: /log in to view the (journal|press|server) site/});
            await box.waitFor({timeout: T});
            await idle(page);
            await snap(page, 'k1-14-site-access');
            const panel = page.locator('[role=tabpanel]:visible').filter({has: box});
            const read = async () => panel.evaluate((p) => [...p.querySelectorAll('input')].filter((i) => i.type === 'checkbox' || i.type === 'radio').map((i) => `${(i.closest('label') || {}).innerText?.trim() || i.name}:${i.checked ? 'x' : 'o'}`));
            const res = {start: await read()};
            await box.check();
            res.ticked = await read();
            await page.locator('#roles-button').first().click();
            await sleep(800);
            await page.getByRole('tab', {name: 'Site Access Options'}).click();
            await sleep(500);
            res.afterTabSwitch = await read();
            const dialogs = [];
            const h = (d) => { dialogs.push(`${d.type()}: ${d.message()}`); d.accept().catch(() => {}); };
            page.on('dialog', h);
            await page.goto(app.url(`/index.php/${S.A}/en/submissions`));
            await idle(page);
            page.off('dialog', h);
            res.leaveDialogs = dialogs;
            await page.goto(accessUrl(app, S.A));
            await idle(page);
            await page.getByRole('tab', {name: 'Site Access Options'}).click();
            await box.waitFor({timeout: T}); await idle(page);
            res.afterReturn = await read();
            fact('siteaccess', res);
            await loc(page, 'Site Access Options › "Site Access" box', box);
        });

        // ---- lists: Settings › Website › Setup › "Lists" "Items per page" (Settings bullet 1)
        await step('lists', async () => {
            await as(`${S.A}m`, S.A);
            await page.goto(app.url(`/index.php/${S.A}/en/management/settings/website`));
            await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.getByRole('tab', {name: 'Lists', exact: true}).click();
            const ipp = page.getByRole('spinbutton', {name: /Items per page/}).or(page.getByLabel(/Items per page/)).first();
            await ipp.waitFor({timeout: T});
            await snap(page, 'k1-15-website-lists');
            fact('lists', {itemsPerPage: await ipp.inputValue()});
            await loc(page, 'Website › Setup › Lists › "Items per page"', ipp);
        });

        // ---- levels: who opens Users & Roles, and what the tabs offer (Actors)
        await step('levels', async () => {
            const res = {};
            const accounts = [...S.Bkeys.map((k) => `${S.B}${k}`), 'admin'];
            for (const u of accounts) {
                await as(u, S.B);
                const r = {};
                for (const [k, p] of [['settingsAccess', 'management/settings/access'], ['access', 'management/access']]) {
                    const resp = await page.goto(accessUrl(app, S.B, 'en', p)).catch(() => null);
                    await idle(page).catch(() => {}); await sleep(600);
                    r[k] = {status: resp ? resp.status() : null, ...(await classify(page))};
                    r[k].main = flat(r[k].main, 250);
                }
                if ((r.settingsAccess.tabs || []).includes('Roles')) {
                    await page.goto(accessUrl(app, S.B)); await idle(page);
                    await page.locator('#roles-button').first().click();
                    await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T});
                    await idle(page);
                    const g = await readGrid(page);
                    r.roles = {header: g.header, rows: g.rows.length, arrows: g.rows.filter((x) => x.arrow).length, openBoxes: g.rows.reduce((a, x) => a + (x.boxes.match(/[xo](?!d)/g) || []).length, 0), noArrow: g.rows.filter((x) => !x.arrow).map((x) => x.name)};
                    await page.getByRole('tab', {name: 'Site Access Options'}).click();
                    await page.getByRole('checkbox', {name: /log in to view the (journal|press|server) site/}).waitFor({timeout: T}).catch(() => {});
                    await idle(page);
                    r.siteAccess = await page.locator('[role=tabpanel]:visible').last().evaluate((p) => ({
                        fields: [...p.querySelectorAll('input')].filter((i) => ['checkbox', 'radio'].includes(i.type)).map((i) => `${(i.closest('label') || {}).innerText?.trim()}:${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`),
                        legends: [...p.querySelectorAll('legend, .pkpFormFieldLabel')].map((l) => l.innerText.trim()),
                        buttons: [...p.querySelectorAll('button')].map((b) => b.innerText.trim()).filter(Boolean),
                    })).catch((e) => String(e.message).slice(0, 200));
                }
                const short = u.replace(S.B, '');
                if (['mgr', 'se', 'rd'].includes(short) || u === 'admin') await snap(page, `k1-16-level-${short}`);
                res[short] = r;
            }
            fact('levels', res);
        });

        // ---- actions: each manager-level account ticks a box, opens the windows, saves Site Access (Actors rows 2-7)
        await step('actions', async () => {
            const res = {};
            const mgrs = isOps ? [['mgr', 'Author'], ['admin', 'Editorial Board Member']]
                : [['mgr', 'Designer'], ['ed', 'Indexer'], ['pe', 'Proofreader'], ['admin', 'Marketing and sales coordinator']];
            let reg = 0;
            for (const [k, rowName] of mgrs) {
                const u = k === 'admin' ? 'admin' : `${S.B}${k}`;
                await as(u, S.B);
                const r = {};
                await gotoRoles(page, app, S.B);
                // A stage box press (the first open box of the row).
                const row = rowLoc(page, rowName);
                const before = await row.evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '));
                const box = row.locator('input[type=checkbox]:not([disabled])').first();
                const w = page.waitForResponse((x) => /assign-stage|unassign-stage/.test(x.url()), {timeout: T}).catch(() => null);
                await box.click();
                const resp = await w;
                r.box = {before, status: resp && resp.status(), url: resp && resp.url().replace(/^.*user-group-grid\//, '').slice(0, 80), notices: await notices(page)};
                await sleep(500);
                r.box.samePage = await row.evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' ')).catch(() => null);
                await gotoRoles(page, app, S.B);
                r.box.reload = await rowLoc(page, rowName).evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '));
                // "Create New Role" opens.
                await grid(page).getByRole('link', {name: 'Create New Role', exact: true}).click();
                const cf = page.locator('form#userGroupForm');
                await cf.waitFor({state: 'visible', timeout: T}).catch(() => {});
                await cf.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T}).catch(() => {});
                r.create = (await cf.count()) ? (await readForm(cf)).level : 'no window';
                await cancelForm(page);
                await gotoRoles(page, app, S.B);
                // Row actions offered on Copyeditor (OPS: Author).
                const ctl = await openRowActions(page, isOps ? 'Moderator' : 'Copyeditor');
                r.rowActions = ctl ? (await ctl.getByRole('link').allInnerTexts()).map((x) => x.trim()) : 'no arrow';
                await gotoRoles(page, app, S.B);
                // "Permit changes to Settings" in the windows of the manager-level roles (fn-o).
                r.ps = {};
                for (const nm of (isOps ? ['K1 manager role'] : ['Journal editor', 'Production editor', 'K1 manager role'].map((x) => (isOmp ? x.replace('Journal editor', 'Press editor') : x)))) {
                    const f = await openEdit(page, nm);
                    if (!f) { r.ps[nm] = 'no edit'; continue; }
                    const ff = await readForm(f);
                    r.ps[nm] = ff.options.find((o) => o.startsWith('permitSettings'));
                    if (k === 'ed' && /editor/.test(nm) && !/Production/.test(nm)) await snap(page, `k1-17-ed-own-window`, {form: ff});
                    await cancelForm(page);
                    await gotoRoles(page, app, S.B);
                }
                // Site Access Options: switch "User Registration" and "Save".
                await page.getByRole('tab', {name: 'Site Access Options'}).click();
                const radios = page.getByRole('radio');
                await radios.first().waitFor({timeout: T});
                await idle(page);
                const target = radios.nth(reg % 2 === 0 ? 1 : 0);
                const label = flat(await target.evaluate((i) => (i.closest('label') || {}).innerText || ''), 90);
                await target.check();
                const ws = page.waitForResponse((x) => x.url().includes('/api/v1/contexts/') && x.request().method() !== 'GET', {timeout: T}).catch(() => null);
                const panel = page.locator('[role=tabpanel]:visible').filter({has: radios.first()});
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                const sresp = await ws;
                const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await page.goto(accessUrl(app, S.B)); await idle(page);
                await page.getByRole('tab', {name: 'Site Access Options'}).click();
                await radios.first().waitFor({timeout: T}); await idle(page);
                const chosen = flat(await page.getByRole('radio', {checked: true}).evaluate((i) => (i.closest('label') || {}).innerText || ''), 90);
                r.siteSave = {chose: label, status: sresp && sresp.status(), saved, reloadChosen: chosen};
                if (k === 'mgr') await snap(page, 'k1-18-site-access-saved');
                reg++;
                res[k] = r;
            }
            fact('actions', res);
        });

        // ---- removes: "Remove" on default, held, past and unheld roles (Actors row 5, fn-q)
        await step('removes', async () => {
            await as(`${S.B}mgr`, S.B);
            const res = {};
            await gotoRoles(page, app, S.B);
            const first = isOps ? 'Moderator' : 'Copyeditor';
            let ctl = await openRowActions(page, first);
            await ctl.getByRole('link', {name: 'Remove', exact: true}).click();
            const dlg = page.getByRole('dialog').last();
            await dlg.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
            await snap(page, 'k1-19-remove-confirm');
            res.confirm = {text: flat(await dlg.innerText(), 400), buttons: (await dlg.getByRole('button').allInnerTexts()).map((x) => x.trim())};
            await dlg.getByRole('button', {name: 'Cancel', exact: true}).click();
            await sleep(700);
            res.afterCancel = rowsLine(await readGrid(page)).filter((x) => x.startsWith(first));
            const tryRemove = async (nm, cx = S.B) => {
                await gotoRoles(page, app, cx);
                const c = await openRowActions(page, nm);
                if (!c) return 'no arrow';
                await c.getByRole('link', {name: 'Remove', exact: true}).click();
                const d = page.getByRole('dialog').last();
                await d.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
                const w = page.waitForResponse((x) => x.url().includes('remove-user-group'), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'OK', exact: true}).click();
                const resp = await w;
                const n = await notices(page);
                await sleep(600);
                const same = rowsLine(await readGrid(page)).filter((x) => x.startsWith(nm));
                await gotoRoles(page, app, cx);
                const re = rowsLine(await readGrid(page)).filter((x) => x.startsWith(nm));
                return {status: resp && resp.status(), notices: n, samePage: same, reload: re};
            };
            res.defaultHeld = await tryRemove(first);
            // OPS: every default role of B is held; the unheld default is A's Moderator (A's manager signs in).
            if (isOps) { await as(`${S.A}m`, S.A); res.defaultUnheld = await tryRemove('Moderator', S.A); await as(`${S.B}mgr`, S.B); }
            else res.defaultUnheld = await tryRemove('Indexer');
            res.customHeld = await tryRemove('K1 held role');
            res.customPast = await tryRemove('K1 past role');
            res.customUnheld = await tryRemove('K1 unheld role');
            await snap(page, 'k1-20-after-removes');
            if (!isOps) {
                await as(`${S.B}ed`, S.B);
                res.customUnheldByEditor = await tryRemove('K1 second unheld');
            } else {
                await as('admin', S.B);
                res.customUnheldByAdmin = await tryRemove('K1 second unheld');
            }
            fact('removes', res);
        });

        // ---- nops: "Journal editor" with "Permit changes to Settings" off (Actors lead-in)
        await step('nops', async () => {
            if (!S.C) return;
            await as(`${S.C}ed`, S.C);
            const r = {};
            for (const [k, p] of [['settingsAccess', 'management/settings/access'], ['access', 'management/access']]) {
                const resp = await page.goto(accessUrl(app, S.C, 'en', p)).catch(() => null);
                await idle(page).catch(() => {}); await sleep(600);
                r[k] = {status: resp ? resp.status() : null, ...(await classify(page))};
                r[k].main = flat(r[k].main, 250);
            }
            await snap(page, 'k1-21-editor-no-ps');
            await as(`${S.C}mgr`, S.C);
            await gotoRoles(page, app, S.C);
            const f = await openEdit(page, isOmp ? 'Press editor' : 'Journal editor');
            r.mgrSeesWindow = f ? (await readForm(f)).options : 'no edit';
            fact('nops', r);
        });

        // ---- pag: paging axis (Rule 4, Settings bullet 1; fn-e, fn-f)
        await step('pag', async () => {
            await as(`${S.P}m`, S.P);
            await gotoRoles(page, app, S.P);
            const res = {};
            let g = await readGrid(page);
            res.start = {text: g.pagingText, ipp: g.itemsPerPageVisible, rows: g.rows.length};
            await snap(page, 'k1-22-pag-start');
            if (isOps) {
                // 10 rows: create an 11th on screen.
                await grid(page).getByRole('link', {name: 'Create New Role', exact: true}).click();
                const form = page.locator('form#userGroupForm');
                await form.locator('input[name="permitMetadataEdit"]').waitFor({timeout: T});
                await idle(page);
                await form.locator('select[name="roleId"]').selectOption({label: 'Assistant'});
                await form.locator('input[name="name[en]"]').fill('K1 paging role 6');
                await form.locator('input[name="abbrev[en]"]').fill('KP6');
                await form.getByRole('button', {name: 'OK', exact: true}).click();
                await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page); await sleep(500);
                g = await readGrid(page);
                res.elevenSamePage = {text: g.pagingText, ipp: g.itemsPerPageVisible, rows: g.rows.length};
                await gotoRoles(page, app, S.P);
                g = await readGrid(page);
                res.elevenReload = {text: g.pagingText, ipp: g.itemsPerPageVisible, rows: g.rows.length};
                await snap(page, 'k1-23-pag-eleven');
            }
            // "Items per page" 5 on Settings › Website › Setup › Lists.
            await page.goto(app.url(`/index.php/${S.P}/en/management/settings/website`));
            await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.getByRole('tab', {name: 'Lists', exact: true}).click();
            const ipp = page.getByLabel(/Items per page/).first();
            await ipp.waitFor({timeout: T});
            await ipp.fill('5');
            const lp = page.locator('[role=tabpanel]:visible').filter({has: ipp});
            await lp.getByRole('button', {name: 'Save', exact: true}).click();
            res.listsSaved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            await gotoRoles(page, app, S.P);
            g = await readGrid(page);
            res.at5 = {text: g.pagingText, links: g.pageLinks, ipp: [g.itemsPerPageVisible, g.itemsPerPageOptions, g.itemsPerPageSelected], rows: rowsLine(g)};
            await snap(page, 'k1-24-pag-at5');
            const two = grid(page).locator('.gridPages a').filter({hasText: /^\s*2\s*$/}).first();
            if (await two.count()) {
                const w2 = page.waitForResponse((r) => r.url().includes('user-group-grid/fetch-grid'), {timeout: T}).catch(() => null);
                await two.click(); await w2; await idle(page); await sleep(400);
                g = await readGrid(page);
                res.at5p2 = {text: g.pagesText, links: g.pageLinks, rows: rowsLine(g)};
                await snap(page, 'k1-25-pag-at5-page2');
                // The second row's arrow on page 2 opens Edit for which role?
                const second = g.rows.find((x) => x.arrow);
                if (second) {
                    const f = await openEdit(page, second.name);
                    res.at5p2EditOf = f ? (await readForm(f)).names : null;
                    await cancelForm(page);
                }
            }
            // Restore 25 on the list? leave the setting at 5 (scratch).
            fact('pag', res);
        });

        // ---- adm: the Site Administrator without a manager role (Actors lead-in)
        await step('adm', async () => {
            const r = {};
            await as('admin', S.R);
            if (!S.admEnded) {
                await page.goto(accessUrl(app, S.R)); await idle(page);
                const table = page.getByRole('table', {name: /Current Users \(/});
                await table.waitFor({timeout: T});
                const row = table.locator('tbody tr').filter({hasText: 'admin admin'}).first();
                await row.locator('button').last().click();
                await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
                await page.waitForURL(/management\/settings\/user\/\d+/, {timeout: T});
                await idle(page);
                await page.getByRole('button', {name: /Remove Role/}).first().waitFor({timeout: T});
                const mrow = page.locator('tr').filter({hasText: /manager/i}).filter({has: page.getByRole('button', {name: /Remove Role/})}).first();
                await mrow.getByRole('button', {name: /Remove Role/}).click();
                const dlg = page.getByRole('dialog').filter({hasText: /Remove Role/}).last();
                await dlg.waitFor({timeout: T});
                await dlg.getByRole('button', {name: /^Remove Role$/}).click();
                await sleep(1500); await idle(page).catch(() => {});
                r.rowsAfter = await page.locator('tr').filter({has: page.getByRole('button', {name: /Remove Role/})}).allInnerTexts().catch(() => []);
                S.admEnded = true; fs.writeFileSync(stateFile(app), JSON.stringify(S, null, 2));
                await signOut(page).catch(() => {});
                await as('admin', S.R);
            }
            for (const [k, p] of [['settingsAccess', 'management/settings/access'], ['access', 'management/access']]) {
                const resp = await page.goto(accessUrl(app, S.R, 'en', p)).catch(() => null);
                await idle(page).catch(() => {}); await sleep(1500);
                r[k] = {status: resp ? resp.status() : null, ...(await classify(page))};
                r[k].main = flat(r[k].main, 250);
                await snap(page, `k1-26-adm-${k}`);
                const ok = page.getByRole('dialog').getByRole('button', {name: 'OK', exact: true});
                if (await ok.count()) { await ok.first().click(); await sleep(600); }
                if ((await page.locator('#roles-button').count())) {
                    await page.locator('#roles-button').first().click();
                    const ok2 = await page.locator('#roleGridContainer tr.gridRow').first().waitFor({timeout: T}).then(() => true).catch(() => false);
                    if (ok2) {
                        const g = await readGrid(page);
                        r[k].roles = {rows: g.rows.length, arrows: g.rows.filter((x) => x.arrow).length, header: g.header};
                    } else r[k].roles = 'no list';
                    await page.getByRole('tab', {name: 'Site Access Options'}).click().catch(() => {});
                    await sleep(1500);
                    r[k].siteAccessButtons = await page.locator('[role=tabpanel]:visible').last().getByRole('button').allInnerTexts().catch(() => []);
                    await snap(page, `k1-27-adm-${k}-tabs`);
                }
            }
            fact('adm', r);
        });


        // ---- cmps: a created manager-level role with "Permit changes to Settings" ticked (Actors lead-in, fn-o); fn-g boxes
        await step('cmps', async () => {
            const r = {};
            await as(`${S.B}mgr`, S.B);
            await gotoRoles(page, app, S.B);
            r.rowBefore = rowsLine(await readGrid(page)).find((x) => x.startsWith('K1 manager role'));
            let f = await openEdit(page, 'K1 manager role');
            r.windowBefore = (await readForm(f)).options;
            await f.locator('input[name="permitSettings"]').check();
            const w = page.waitForResponse((x) => x.url().includes('update-user-group'), {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'OK', exact: true}).click();
            r.saveStatus = (await w)?.status();
            r.saveNotices = await notices(page);
            await f.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await gotoRoles(page, app, S.B);
            r.rowAfter = rowsLine(await readGrid(page)).find((x) => x.startsWith('K1 manager role'));
            f = await openEdit(page, 'K1 manager role');
            r.windowAfterReload = (await readForm(f)).options;
            await cancelForm(page);
            // fn-g: the boxes the spec asks about.
            const press = async (rowName, idx) => {
                await gotoRoles(page, app, S.B);
                const row = rowLoc(page, rowName);
                const read = () => row.evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '));
                const before = await read();
                const ww = page.waitForResponse((x) => /assign-stage|unassign-stage/.test(x.url()), {timeout: 8000}).catch(() => null);
                await row.locator('input[type=checkbox]').nth(idx).click({timeout: 5000}).catch((e) => String(e.message).slice(0, 80));
                const resp = await ww;
                const n = resp ? await notices(page) : [];
                await gotoRoles(page, app, S.B);
                return {before, status: resp && resp.status(), notices: n, reload: await rowLoc(page, rowName).evaluate((tr) => [...tr.querySelectorAll('input[type=checkbox]')].map((i) => `${i.checked ? 'x' : 'o'}${i.disabled ? 'd' : ''}`).join(' '))};
            };
            if (isOjs) r.subscriptionManagerBox = await press('Subscription Manager', 0);
            if (isOmp) { r.internalReviewerExternalBox = await press('Internal Reviewer', 2); r.externalReviewerInternalBox = await press('External Reviewer', 1); }
            // The member of the created manager-level role.
            await as(`${S.B}cm`, S.B);
            const resp = await page.goto(accessUrl(app, S.B)).catch(() => null);
            await idle(page); await sleep(600);
            r.cmAccess = {status: resp && resp.status(), ...(await classify(page))};
            r.cmAccess.main = flat(r.cmAccess.main, 200);
            await snap(page, 'k1-30-custom-manager-access');
            if ((r.cmAccess.tabs || []).includes('Roles')) {
                await gotoRoles(page, app, S.B);
                f = await openEdit(page, 'K1 manager role');
                r.cmOwnWindow = f ? (await readForm(f)).options : 'no edit';
                await snap(page, 'k1-31-custom-manager-own-window');
                await cancelForm(page);
            }
            fact('cmps', r);
        });

        // ---- pag2: "Items per page" 5 with fewer than 10 roles (Fields line under the rows, Rule 4)
        await step('pag2', async () => {
            if (!isOps) return;
            await as(`${S.B}mgr`, S.B);
            await gotoRoles(page, app, S.B);
            const g0 = await readGrid(page);
            const r = {before: {rows: g0.rows.length, text: g0.pagingText, ipp: g0.itemsPerPageVisible}};
            await page.goto(app.url(`/index.php/${S.B}/en/management/settings/website`));
            await idle(page);
            await page.locator('#setup-button').first().click().catch(() => {});
            await page.getByRole('tab', {name: 'Lists', exact: true}).click();
            const ipp = page.getByLabel(/Items per page/).first();
            await ipp.waitFor({timeout: T});
            await ipp.fill('5');
            await page.locator('[role=tabpanel]:visible').filter({has: ipp}).getByRole('button', {name: 'Save', exact: true}).click();
            r.saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
            await gotoRoles(page, app, S.B);
            const g = await readGrid(page);
            r.at5 = {rows: g.rows.length, text: g.pagingText, ipp: [g.itemsPerPageVisible, g.itemsPerPageOptions]};
            await snap(page, 'k1-32-ops-eight-roles-at5');
            fact('pag2', r);
        });

        // ---- sweep: the "Search" link twice; a filter across a tab switch
        await step('sweep', async () => {
            await as(`${S.A}m`, S.A);
            await gotoRoles(page, app, S.A);
            const r = {};
            const form = grid(page).locator('#userGroupSearchForm');
            const search = grid(page).locator('.header a').filter({hasText: /^\s*Search\s*$/}).first();
            await search.click(); await sleep(1000);
            r.afterOne = await form.isVisible();
            await search.click(); await sleep(1000);
            r.afterTwo = await form.isVisible();
            await search.click(); await sleep(1000);
            r.afterThree = await form.isVisible();
            await chooseFilter(page, 'selectedRoleId', 'Assistant');
            r.filtered = (await readGrid(page)).rows.length;
            await sleep(1000);
            r.formVisibleRightAfterChoice = await form.isVisible();
            r.pagingAfterChoice = (await readGrid(page)).pagesText;
            await snap(page, 'k1-33a-filter-just-chosen');
            await page.getByRole('tab', {name: 'Site Access Options'}).click(); await sleep(800);
            await page.locator('#roles-button').first().click(); await sleep(800);
            const g = await readGrid(page);
            r.afterTabSwitch = {rows: g.rows.length, formVisible: g.filterFormVisible, level: await grid(page).locator('select[name="selectedRoleId"]').evaluate((s) => s.options[s.selectedIndex].text)};
            await snap(page, 'k1-33-filter-after-tab-switch');
            fact('sweep', r);
        });

        // ---- admnav: what the side menu offers a Site Administrator with Reader only
        await step('admnav', async () => {
            await as('admin', S.R);
            await page.goto(app.url(`/index.php/${S.R}/en/submissions`)).catch(() => {});
            await idle(page).catch(() => {}); await sleep(1500);
            const links = await page.locator('nav a, aside a, [role=navigation] a').evaluateAll((as) => as.map((a) => `${a.innerText.trim()} -> ${(a.getAttribute('href') || '').replace(/^https?:\/\/[^/]+/, '')}`).filter((x) => /Settings|Users|Roles/i.test(x))).catch(() => []);
            await snap(page, 'k1-34-admin-reader-nav');
            fact('admnav', links);
        });

        // ---- ompaccess: "View Monograph Content" ticked and unticked, signed out (fn-t)
        await step('ompaccess', async () => {
            if (!S.O) return;
            const r = {};
            const book = app.url(`/index.php/${S.O}/en/catalog/book/${S.Osub.id}`);
            const setBox = async (v) => {
                await as(`${S.O}m`, S.O);
                await page.goto(accessUrl(app, S.O)); await idle(page);
                await page.getByRole('tab', {name: 'Site Access Options'}).click();
                const box = page.getByRole('checkbox', {name: /log in to view open access content/});
                await box.waitFor({timeout: T}); await idle(page);
                if (v) await box.check(); else await box.uncheck();
                const panel = page.locator('[role=tabpanel]:visible').filter({has: box});
                await panel.getByRole('button', {name: 'Save', exact: true}).click();
                const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
                await page.reload(); await idle(page);
                await page.getByRole('tab', {name: 'Site Access Options'}).click();
                await box.waitFor({timeout: T}); await idle(page);
                const kept = await box.isChecked();
                await signOut(page);
                return {saved, kept};
            };
            const visit = async (k) => {
                await page.goto(book); await idle(page);
                const o = {bookUrl: page.url(), h1: flat(await page.locator('h1').first().innerText().catch(() => ''), 120)};
                const link = page.locator('a[href*="/catalog/view/"], a[href*="/catalog/download/"]').first();
                o.link = (await link.count()) ? {text: flat(await link.innerText()), href: await link.getAttribute('href')} : null;
                await snap(page, `k1-28-omp-book-${k}`);
                if (o.link) {
                    const resp = await page.goto(app.url(o.link.href.replace(/^https?:\/\/[^/]+/, ''))).catch((e) => ({err: String(e.message).slice(0, 100)}));
                    await idle(page).catch(() => {});
                    o.landed = {url: page.url(), status: resp && resp.status ? resp.status() : resp, title: await page.title().catch(() => '')};
                    await snap(page, `k1-29-omp-file-${k}`);
                }
                return o;
            };
            await signOut(page).catch(() => {});
            r.open = await visit('open');
            r.tick = await setBox(true);
            r.restricted = await visit('restricted');
            r.untick = await setBox(false);
            r.reopened = await visit('reopened');
            fact('ompaccess', r);
        });
    } finally {
        await close();
    }
});
