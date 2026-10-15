// U35 claim check H15 (housekeeping 2026-10-15): two incidentals rows, driven on a DATASET fleet
// (PKP's default test dataset, docs/process/dataset.md; dataset users, never the campaign roster).
//
//   PHASE=assign  U35 Participants > "Assign" > role "Author": who the people grid offers.
//                 Per app, per signed-in level (dbarnes: manager-level editor; dbuskins: an
//                 assigned section/series editor or moderator), on one submission per case:
//                 the list the window opens on; "Author" chosen without "Search"; "Author" +
//                 "Search" with an empty name; the submission's own author by name (already
//                 assigned in that role); an author of another submission by name; a name that
//                 is no author (the incidental's "Inoue"); then a person chosen and the header
//                 "Close" pressed (the leave question recorded). Nothing is saved.
//   PHASE=galley  U46 Rules 3, 10 / OJS2: an HTML galley on a published (posted) version, read
//                 signed out, its file replaced through "Change File", read again signed out
//                 (fresh browser), signed in as the editor and as an author account. OJS adds a
//                 control galley B never read signed out before the change; the cache entry
//                 (Laravel file store under [cache] path) is read for its expiry; then Administration >
//                 "Delete Data Caches" and a last signed-out read. OPS is the
//                 control app (no HTML galley plugin). A press has no galleys.
//
//   PROBE_FEATURE=issues-cc35a PKP_E2E_DATASET=9 PROBE_AGENT=cc35a PROBE_RUN=r1 PHASE=assign \
//     bin/app-lock.sh shared ojs -- node bin/probe.js ojs shared/playwright/checks/U35/H15/h15.js
//   The galley phase changes the dataset (adds galleys): reset the fleet afterwards
//   (npm run fleet-prep -- --feature issues-cc35a --dataset 9 --reset). Labels carry PROBE_RUN,
//   so r1 and r2 add galleys of their own and never read each other's cache entry.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, sql, outFile} = require('../../../probe');

const PHASE = process.env.PHASE || 'assign';
const RUN = process.env.PROBE_RUN || 'r0';
const CTX = 'publicknowledge';
const log = (...a) => console.log('[h15]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// ------------------------------------------------------------------ assign
// own: the submission's own author account (assigned as Author); other: an author of another
// submission; none: a name holding no Author role (the incidental's search).
const ASSIGN = {
    ojs: [
        {user: 'dbarnes', id: 10, stage: 'Review', own: 'Novak', other: 'Mwandenga', none: 'Inoue'},
        {user: 'dbarnes', id: 4, stage: 'Submission', own: 'Montgomerie', other: 'Novak', none: 'Inoue'},
        {user: 'dbuskins', id: 10, stage: 'Review', own: 'Novak', other: 'Mwandenga', none: 'Inoue'},
        {user: 'dbarnes', id: 5, stage: 'Production', menuKey: 'workflow_5', own: 'Diouf', other: 'Novak', none: 'Inoue'},
    ],
    omp: [
        {user: 'dbarnes', id: 15, stage: 'External Review', own: 'Foran', other: 'Clark', none: 'Inoue'},
        {user: 'dbarnes', id: 3, stage: 'Submission', own: 'Barnetson', other: 'Foran', none: 'Inoue'},
        {user: 'dbuskins', id: 9, stage: 'Internal Review', own: 'Perini', other: 'Clark', none: 'Inoue'},
    ],
    ops: [
        {user: 'dbarnes', id: 1, stage: 'Production', menuKey: 'workflow_5', own: 'Corino', other: 'Novak', none: 'Inoue'},
        {user: 'dbuskins', id: 1, stage: 'Production', menuKey: 'workflow_5', own: 'Corino', other: 'Novak', none: 'Inoue'},
    ],
};

async function gridRead(win) {
    await idle(win.page);
    const names = await win.peopleNames();
    const noItems = await win.root.locator('tbody.empty:visible, tr.empty:visible').count();
    const items = await win.itemsLine().first().textContent({timeout: 1500}).catch(() => null);
    return {names, count: names.length, noItemsShown: noItems > 0, itemsLine: items ? flat(items) : null};
}

async function assignPhase(app) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const cases = ASSIGN[app.name] || [];
    const facts = {app: app.name, run: RUN, cases: []};
    const roleMembers = sql(
        app,
        `select count(*) from user_user_groups uug join user_group_settings s on s.user_group_id = uug.user_group_id and s.setting_name = 'name' and s.locale = 'en' and s.setting_value = 'Author'`
    );
    facts.authorRoleMembersInDb = Number(roleMembers);
    for (const c of cases) {
        const {page, close} = await launch(app);
        const dialogs = [];
        page.on('dialog', async (d) => {
            dialogs.push({type: d.type(), message: d.message()});
            await d.accept().catch(() => {});
        });
        const out = {...c};
        const nm = `assign-${c.user}-s${c.id}`;
        try {
            await signIn(page, c.user, {contextPath: CTX});
            const panel = new ParticipantsPanel(page, CTX);
            await panel.goto(c.id, {menuKey: c.menuKey || null});
            await idle(page);
            out.panelRows = await panel.rowLines().catch((e) => `ERR ${e.message}`);
            record(`${nm}-00-panel`, await screen(page));
            const assignShown = await panel.assignButton().isVisible();
            out.assignOffered = assignShown;
            if (!assignShown) {
                facts.cases.push(out);
                continue;
            }
            const win = await panel.openAssign();
            await idle(page);
            out.roles = await win.roleOptions();
            out.selectedAtOpen = await win.selectedRole();
            out.headings = await win.gridHeadings();
            out.atOpen = await gridRead(win);
            record(`${nm}-01-open`, await screen(page));
            await shot(page, `${nm}-01-open`);
            out.authorOffered = out.roles.includes('Author');
            if (!out.authorOffered) {
                await win.cancel();
                facts.cases.push(out);
                continue;
            }
            await win.chooseRole('Author');
            out.authorChosenNoSearch = await gridRead(win);
            record(`${nm}-02-author-nosearch`, await screen(page));
            await win.search('');
            out.authorSearchEmpty = await gridRead(win);
            record(`${nm}-03-author-search-empty`, await screen(page));
            await shot(page, `${nm}-03-author-search-empty`);
            for (const k of ['own', 'other', 'none']) {
                await win.search(c[k]);
                out[`authorSearch_${k}`] = {phrase: c[k], ...(await gridRead(win))};
                record(`${nm}-04-author-search-${k}`, await screen(page));
            }
            // the incidental's order: the role list's first role first, then a name search
            await win.chooseRole(out.roles[0]);
            await win.search('');
            out.firstRoleSearchEmpty = {role: out.roles[0], ...(await gridRead(win))};
            // sweep: a person chosen, then the header "Close" (the window counts as changed)
            await win.chooseRole('Author');
            await win.search('');
            const first = (await win.peopleNames())[0];
            if (first) {
                await win.choosePerson(first);
                out.chosen = first;
                out.boxesAfterChoose = {
                    permissions: await win.metadataBox().isVisible().catch(() => false),
                    privileges: await win.recommendOnlyBox().isVisible().catch(() => false),
                };
                record(`${nm}-05-person-chosen`, await screen(page));
            }
            const before = dialogs.length;
            await win.closeControl().click();
            await sleep(1500);
            await idle(page);
            out.closeDialogs = dialogs.slice(before);
            out.windowStillOpen = await win.root.count();
            record(`${nm}-06-after-close`, await screen(page));
            await loc(page, 'Assign Participant: role select', win.roleSelect());
            out.storedAuthorsOnSubmission = sql(
                app,
                `select u.username from stage_assignments sa join users u on u.user_id = sa.user_id join user_groups ug on ug.user_group_id = sa.user_group_id where sa.submission_id = ${Number(c.id)} and ug.role_id = 65536`
            ).split('\n').filter(Boolean);
        } catch (e) {
            out.error = String(e.message || e).slice(0, 800);
            await shot(page, `${nm}-error`).catch(() => {});
        } finally {
            out.dialogs = dialogs;
            facts.cases.push(out);
            log(app.name, JSON.stringify(out).slice(0, 2500));
            await close();
        }
    }
    record('h15-assign-facts', facts);
}

// ------------------------------------------------------------------ galley
const GALLEY = {
    ojs: {id: 17, pub: 18, component: 'Article Text', page: 'article', control: true},
    ops: {id: 10, pub: 11, component: 'Preprint Text', page: 'preprint', control: false},
};

function htmlFile(app, which, marker) {
    const f = outFile(`h15-${which}.html`);
    fs.writeFileSync(
        f,
        `<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>${marker}</title></head><body><h1>${marker}</h1><p>H15 galley body ${marker}.</p></body></html>\n`
    );
    return f;
}

function cachePath(app) {
    const cfg = fs.readFileSync(path.isAbsolute(app.configFile) ? app.configFile : path.join(process.cwd(), app.configFile), 'utf8');
    const m = cfg.match(/\[cache\][\s\S]*?\n\s*path\s*=\s*(.+)/);
    return m ? m[1].trim() : null;
}

/** The Laravel file store's entry for a key: <path>/<sha1[0:2]>/<sha1[2:4]>/<sha1>; 10-digit expiry, then the value. */
function cacheEntry(app, galleyId) {
    const dir = cachePath(app);
    const key = `htmlArticleGalley-${galleyId}`;
    const h = crypto.createHash('sha1').update(key).digest('hex');
    const f = path.join(dir || '', h.slice(0, 2), h.slice(2, 4), h);
    if (!dir || !fs.existsSync(f)) return {key, file: f, exists: false};
    const body = fs.readFileSync(f, 'utf8');
    const expires = Number(body.slice(0, 10));
    return {
        key,
        file: f,
        exists: true,
        expiresAt: new Date(expires * 1000).toISOString(),
        secondsLeft: expires - Math.floor(Date.now() / 1000),
        mtime: fs.statSync(f).mtime.toISOString(),
        holdsV1: /VERSION-ONE/.test(body),
        holdsV2: /VERSION-TWO/.test(body),
    };
}

/** A reader's visit: the landing page, the galley link pressed, the galley's text read (OJS frame; OPS download or page). */
async function readerRead(app, g, label, who, name) {
    const {page, close} = await launch(app);
    const out = {who: who || 'signed out'};
    try {
        if (who) await signIn(page, who, {contextPath: CTX});
        await page.goto(app.url(`/index.php/${CTX}/${g.page}/view/${g.id}`));
        await idle(page);
        const landing = await screen(page);
        record(`${name}-landing`, landing);
        const link = page.locator('a.obj_galley_link').filter({hasText: label}).first();
        out.linkShown = await link.count();
        out.linkHref = out.linkShown ? (await link.getAttribute('href')).replace(/^https?:\/\/[^/]+/, '') : null;
        if (!out.linkShown) return out;
        const dlP = page.waitForEvent('download', {timeout: 20_000}).catch(() => null);
        await link.click();
        const dl = await dlP;
        if (dl) {
            const f = outFile(`${name}.download.html`);
            await dl.saveAs(f);
            out.download = dl.suggestedFilename();
            out.text = flat(fs.readFileSync(f, 'utf8'), 600);
        } else {
            await idle(page);
            const frames = await page.locator('iframe').count();
            out.frames = frames;
            out.url = page.url().replace(/^https?:\/\/[^/]+/, '');
            if (frames) {
                const fr = page.frameLocator('iframe[name="htmlFrame"], iframe').first();
                out.text = flat(await fr.locator('body').innerText({timeout: 30_000}), 600);
                out.frameSrc = (await page.locator('iframe').first().getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, '');
            } else {
                out.text = flat(await page.locator('body').innerText(), 600);
            }
        }
        record(name, {...(await screen(page)), read: out});
        await shot(page, name);
    } catch (e) {
        out.error = String(e.message || e).slice(0, 800);
    } finally {
        out.version = /VERSION-TWO/.test(out.text || '') ? 'v2' : /VERSION-ONE/.test(out.text || '') ? 'v1' : 'none';
        log(app.name, name, JSON.stringify(out).slice(0, 800));
        await close();
    }
    return out;
}

async function galleyPhase(app) {
    const g = GALLEY[app.name];
    if (!g) {
        log(app.name, 'no galleys on this app (a press): skipped');
        return;
    }
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const {recordBrowserDialogs} = require('../../../pages/SubmissionFilesPages.js');
    const labels = {A: `H15${RUN}A`, B: `H15${RUN}B`};
    const which = g.control ? ['A', 'B'] : ['A'];
    const v1 = {}, v2 = {};
    for (const w of which) {
        v1[w] = htmlFile(app, `${w}-v1`, `VERSION-ONE ${labels[w]}`);
        v2[w] = htmlFile(app, `${w}-v2`, `VERSION-TWO ${labels[w]}`);
    }
    const facts = {app: app.name, run: RUN, submission: g.id, publication: g.pub, labels, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        record('h15-galley-facts', facts);
    };
    const editor = await launch(app);
    const page = editor.page;
    const dialogs = recordBrowserDialogs(page);
    try {
        await signIn(page, 'dbarnes', {contextPath: CTX});
        const frame = new WorkflowPage(page, CTX, app.name === 'ops' ? {labels: {publicationGroup: 'Preprint'}} : {});
        const galleys = new GalleyManager(page, frame);
        await galleys.open(g.id, g.pub);
        await idle(page);
        record('galley-00-page', await screen(page));
        fact('labelsBefore', await galleys.labels().catch((e) => `ERR ${e.message}`));
        // 1. add the galleys with v1
        for (const w of which) {
            await galleys.addGalley({label: labels[w], component: g.component, file: v1[w], name: path.basename(v1[w])});
            await idle(page);
        }
        record('galley-01-added', await screen(page));
        await shot(page, 'galley-01-added');
        fact('labelsAfterAdd', await galleys.labels().catch((e) => `ERR ${e.message}`));
        const ids = {};
        for (const w of which) {
            const row = sql(
                app,
                `select g.galley_id || '|' || g.submission_file_id || '|' || f.mimetype from publication_galleys g join submission_files sf on sf.submission_file_id = g.submission_file_id join files f on f.file_id = sf.file_id where g.publication_id = ${g.pub} and g.label = '${labels[w]}'`
            );
            const [gid, sfid, mime] = row.split('|');
            ids[w] = {galleyId: Number(gid), submissionFileId: Number(sfid), mimetype: mime};
        }
        fact('ids', ids);
        fact('menuOffersA', await galleys.menuOffers(labels.A).catch((e) => `ERR ${e.message}`));
        if (app.name === 'ojs') fact('cacheBeforeRead', cacheEntry(app, ids.A.galleyId));

        // 2. galley A read signed out (v1), and signed in as the editor (v1)
        fact('A-out-1', await readerRead(app, g, labels.A, null, 'galley-02-A-out-before'));
        fact('A-out-1b', await readerRead(app, g, labels.A, null, 'galley-02b-A-out-before-again'));
        if (app.name === 'ojs') fact('cacheAfterFirstRead', cacheEntry(app, ids.A.galleyId));

        // 3. "Change File" with v2 on every galley
        await galleys.open(g.id, g.pub);
        for (const w of which) {
            await galleys.openChangeFile(labels[w]);
            record(`galley-03-${w}-changefile-wizard`, await screen(page));
            await galleys.uploadInWizard({file: v2[w], name: path.basename(v2[w])});
            await idle(page);
        }
        record('galley-04-after-change', await screen(page));
        const changedAt = new Date();
        const idsAfter = {};
        for (const w of which) {
            idsAfter[w] = sql(
                app,
                `select g.galley_id || '|' || g.submission_file_id || '|' || sf.file_id || '|' || f.mimetype from publication_galleys g join submission_files sf on sf.submission_file_id = g.submission_file_id join files f on f.file_id = sf.file_id where g.publication_id = ${g.pub} and g.label = '${labels[w]}'`
            );
        }
        fact('idsAfterChange', {at: changedAt.toISOString(), rows: idsAfter});
        // the editor's own row link after the change (a download)
        try {
            const dl = await galleys.download(labels.A);
            const f = outFile('galley-04-A-rowlink.download.html');
            await dl.saveAs(f);
            fact('A-rowlink-after-change', {name: dl.suggestedFilename(), v2: /VERSION-TWO/.test(fs.readFileSync(f, 'utf8'))});
        } catch (e) {
            fact('A-rowlink-after-change', `ERR ${String(e.message).slice(0, 300)}`);
        }

        // 4. read again: signed out (fresh browser, twice), signed in as the editor and an author account
        fact('A-out-2', await readerRead(app, g, labels.A, null, 'galley-05-A-out-after'));
        fact('A-out-2b', await readerRead(app, g, labels.A, null, 'galley-05b-A-out-after-again'));
        fact('A-in-editor', await readerRead(app, g, labels.A, 'dbarnes', 'galley-06-A-in-dbarnes'));
        const authorUser = app.name === 'ojs' ? 'amwandenga' : 'ccorino';
        fact('A-in-author', await readerRead(app, g, labels.A, authorUser, `galley-07-A-in-${authorUser}`));
        if (g.control) {
            fact('B-out-after', await readerRead(app, g, labels.B, null, 'galley-08-B-out-after'));
        }
        if (app.name === 'ojs') {
            fact('cacheAfterChange', cacheEntry(app, ids.A.galleyId));
            if (g.control) fact('cacheB', cacheEntry(app, ids.B.galleyId));
            // 5. what else ends the copy: Administration > "Delete Data Caches" (site admin), then signed out again
            const adm = await launch(app);
            try {
                await signIn(adm.page, 'admin');
                await adm.page.goto(app.url('/index.php/index/en/admin'));
                await idle(adm.page);
                record('galley-09-admin', await screen(adm.page));
                const btn = adm.page.getByRole('button', {name: 'Delete Data Caches', exact: true});
                await loc(adm.page, 'Administration: Delete Data Caches', btn);
                await Promise.all([adm.page.waitForResponse((r) => r.url().includes('clearDataCache'), {timeout: 30_000}), btn.click()]);
                await adm.page.waitForLoadState('load');
                await idle(adm.page);
                record('galley-10-admin-after-clear', await screen(adm.page));
                fact('deleteDataCaches', {url: adm.page.url().replace(/^https?:\/\/[^/]+/, '')});
            } finally {
                await adm.close();
            }
            fact('cacheAfterClear', cacheEntry(app, ids.A.galleyId));
            fact('A-out-3-after-clear', await readerRead(app, g, labels.A, null, 'galley-11-A-out-after-clear'));
        }
    } catch (e) {
        fact('error', String(e.stack || e).slice(0, 1500));
        await shot(page, 'galley-error').catch(() => {});
    } finally {
        facts.dialogs = dialogs.messages || dialogs;
        record('h15-galley-facts', facts);
        log(app.name, JSON.stringify(facts).slice(0, 4000));
        await editor.close();
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('H15 drives a dataset fleet: set PROBE_FEATURE to a dataset fleet (issues-cc35a) and PKP_E2E_DATASET');
    if (PHASE === 'assign') await assignPhase(app);
    else if (PHASE === 'galley') await galleyPhase(app);
    else throw new Error(`unknown PHASE ${PHASE}`);
});
