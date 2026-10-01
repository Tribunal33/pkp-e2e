// Kept walk for docs/issues/U13-OPS1-preview-new-version-called-outdated.md (spec U13 register OPS1,
// spec U69 register A4). Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   OPS submission 11 / OMP submission 14, as `dbarnes`: open it on its "Title & Abstract"; "Create New Version"
//     (main: keep the window's choices, "Confirm"; 3.5: "Yes"); on the new version, "Preview"; read the notices.
//     Then (the reach, not a Step) press the preview's first file link and read the reader's notice.
//   OJS (control) submission 1, as `dbarnes`: its unpublished version 1.1 (3.5: the "Publication" entry), "Preview".
// PHASE=neighbour in front: on the state a walk left, OMP and OPS publish ("Publish" / "Post") the new version,
//   then PHASE=read follows.
// PHASE=read in front: read-only, signed in as `dbarnes`: the current page (no notice), the older version
//   from "Versions" (the outdated notice with that version's own date, no preview notice), and the preview of
//   a submission never published (OPS 1, OMP 4: the preview notice alone). For the fix's neighbour check,
//   with the fix in and out.
// Records every screen with screen(); prints each page's notices.
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preview-new-version-called-outdated/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const PHASE = process.env.PHASE || 'walk';
const CONF = {
    ojs: {sid: 1, noun: 'article/view', unpublished: null},
    omp: {sid: 14, noun: 'catalog/book', unpublished: 4},
    ops: {sid: 11, noun: 'preprint/view', unpublished: 1},
};

forEachApp(async (app) => {
    const conf = CONF[app.name];
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: L.flat(e.message, 200)}; }
        Object.assign(s, extra);
        const nm = `${PHASE[0]}-${String(++n).padStart(2, '0')}-${name}`;
        record(nm, s);
        await shot(page, nm).catch(() => {});
        return s;
    };
    const versionKey = (id) => (isMain ? `publication_${id}_titleAbstract` : 'publication_titleAbstract');
    const readHere = async (name) => {
        const out = {url: page.url().replace(app.baseURL, ''), notices: await L.notices(page)};
        await snap(name, {read: out});
        fact(name, out);
        return out;
    };
    const pressPreview = async (name) => {
        const button = L.publishingControl(page, 'Preview');
        await button.waitFor({state: 'visible', timeout: L.T});
        await L.sleep(500);
        const [popup] = await Promise.all([
            page.context().waitForEvent('page', {timeout: 5_000}).catch(() => null),
            button.click(),
        ]);
        if (popup) { fact(`${name} opened`, 'new tab'); await popup.waitForLoadState('load'); return popup; }
        await page.waitForURL((u) => !String(u).includes('/dashboard/'), {timeout: L.T}).catch(() => {});
        await page.waitForLoadState('load');
        return page;
    };

    try {
        if (PHASE === 'walk') {
            fact('before', L.publications(app, conf.sid));
            await signIn(page, 'dbarnes');
            if (app.name === 'ojs') {
                const v2 = L.latestPublicationId(app, conf.sid);
                await L.openWorkflow(page, app, conf.sid, versionKey(v2));
                await snap('ojs-v2-title-abstract');
            } else {
                await L.openWorkflow(page, app, conf.sid, versionKey(L.latestPublicationId(app, conf.sid)));
                await snap(`${app.name}-v1-title-abstract`);
                const v = await L.createNewVersion(page, app, conf.sid);
                fact('create new version', v);
                await L.openWorkflow(page, app, conf.sid, versionKey(v.after));
                await snap(`${app.name}-v2-title-abstract`);
            }
            const shown = await pressPreview('preview');
            if (shown !== page) throw new Error('Preview opened a new tab; the walk reads the same tab only');
            const pv = await readHere('preview');
            fact('verdict', {
                previewNotice: pv.notices.some((t) => t.startsWith('This is a preview')),
                outdatedNotice: pv.notices.find((t) => t.startsWith('This is an outdated version')) || null,
            });
            // The reach: the preview's first file opens its reader.
            const file = page.locator('a.obj_galley_link, .pub_format a, .files a').first();
            if (await file.count()) {
                const href = (await file.getAttribute('href') || '').replace(app.baseURL, '');
                await file.click();
                await page.waitForLoadState('load'); await L.sleep(1500);
                const r = await readHere('preview-file-reader');
                fact('reader', {href, notices: r.notices});
            } else {
                fact('reader', 'no file link on the preview');
            }
            fact('after', L.publications(app, conf.sid));
            await signOut(page);
            return;
        }

        if (app.name === 'ojs') { fact('skipped', 'the neighbour check reads OMP and OPS only'); return; }
        await signIn(page, 'dbarnes');
        if (PHASE === 'neighbour') {
            const latest = L.latestPublicationId(app, conf.sid);
            await L.openWorkflow(page, app, conf.sid, versionKey(latest));
            fact('publish new version', await L.publishOnScreen(page));
            await snap('published');
            fact('after publish', L.publications(app, conf.sid));
        }
        // PHASE read (and the end of neighbour): the current page, the older version, a never-published preview.
        await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/${conf.sid}`));
        await idle(page);
        await readHere('current-page');
        const older = page.locator('.sub_item.versions a[href*="/version/"], section.versions a[href*="/version/"], .versions a[href*="/version/"]').last();
        if (await older.count()) {
            const text = L.flat(await older.innerText());
            await older.click();
            await page.waitForLoadState('load');
            const o = await readHere('older-version');
            fact('older', {link: text, notices: o.notices});
        } else {
            fact('older', 'no older version listed');
        }
        await page.goto(app.url(`/index.php/${app.contextPath}/${conf.noun}/${conf.unpublished}`));
        await idle(page);
        await readHere('never-published-preview');
        await signOut(page);
    } finally {
        record(`facts-${PHASE}`, facts);
        await close();
    }
});
