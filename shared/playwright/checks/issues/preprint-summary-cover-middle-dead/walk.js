// Issue report docs/issues/U13-OPS9-preprint-summary-cover-middle-dead.md (U13 OPS9):
// on a preprint server's lists ("Archives", the home page's "Latest
// preprints") a press on the middle of a preprint's cover image opens
// nothing; only its top and bottom open the preprint. Takes the report's
// Steps through the screens on a dataset fleet freshly reset to PKP's
// default test dataset, at 1280 x 900:
//   OPS (the finding): `dbarnes` opens preprint 2 "The Facets Of Job
//     Satisfaction…", "Preprint entry", uploads a cover, "Save"; then
//     "Archives": presses on the cover (middle, top, bottom).
//   OJS (control): `dbarnes` opens submission 17 "Antimicrobial, heavy
//     metal resistance…", "Publication Settings" ("Issue" on 3.5), uploads the same cover, "Save"; then the
//     current issue's table of contents: the same presses.
//   OMP (control): signed out, "Catalog": the same presses on a book's
//     cover (every book shows one).
// On each list the script also reads the element under the pointer at a
// column of points down the cover's middle (elementFromPoint), and the
// summary's text block's computed `position`, and presses the cover at
// the middle of the text block's row beside it ("text row": the author
// line on a journal).
// Neighbour (for the fix): on the same list, a press on the keyword row
// beside the cover (OPS) opens nothing with or without the fix, the title
// still opens the preprint, and the text block keeps its place (its box is
// recorded, to compare between the runs with the fix in and out); a
// preprint without a cover (preprint 15 "Yam diseases…") keeps its layout.
// Run (reset the fleet first):
//   npm run fleet-prep -- --feature issues-ir9 --dataset 3 --reset
//   PROBE_FEATURE=issues-ir9 PROBE_AGENT=ir9 node bin/probe.js all shared/playwright/checks/issues/preprint-summary-cover-middle-dead/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir9-3_5.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle} = require('../../../probe');

const COVER = path.resolve(__dirname, '../../../../../apps/ops/playwright/fixtures/files/profile-image-400.png');
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const T = 30_000;

// Per app: the submission given a cover, the menu item holding "Cover
// Image", the list page and the summary box on it.
const PLAN = {
    ops: {
        id: 2,
        entry: 'Preprint entry',
        list: async (page, app) => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en`));
            await idle(page);
            await page.getByRole('link', {name: 'Archives', exact: true}).first().click();
            await idle(page);
        },
        summary: (page, id) => page.locator('.obj_preprint_summary').filter({has: page.locator(`[id="preprint-${id}"]`)}).first(),
        landing: (id) => new RegExp(`/preprint/view/${id}(?:$|[/?#])`),
    },
    ojs: {
        id: 17,
        entry: 'Publication Settings', // "Issue" on 3.5 (entryOn35)
        entryOn35: 'Issue',
        list: async (page, app) => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/issue/current`));
            await idle(page);
        },
        summary: (page, id) => page.locator('.obj_article_summary').filter({has: page.locator(`[id="article-${id}"]`)}).first(),
        landing: (id) => new RegExp(`/article/view/${id}(?:$|[/?#])`),
    },
    omp: {
        id: 14,
        entry: null, // every book shows a cover; nothing to upload
        list: async (page, app) => {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog`));
            await idle(page);
        },
        summary: (page, id) => page.locator('.obj_monograph_summary').filter({has: page.locator(`a[href$="/catalog/book/${id}"]`)}).first(),
        landing: (id) => new RegExp(`/catalog/book/${id}(?:$|[/?#])`),
    },
};

// The element at a point, as a short path up to the summary box.
async function hitAt(page, x, y) {
    return page.evaluate(([px, py]) => {
        const el = document.elementFromPoint(px, py);
        if (!el) return null;
        const parts = [];
        for (let n = el; n && parts.length < 5; n = n.parentElement) {
            parts.push(n.tagName.toLowerCase() + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).join('.') : ''));
            if (/obj_(preprint|article|monograph)_summary/.test(n.className || '')) break;
        }
        const link = el.closest('a');
        return {path: parts.join(' < '), link: link ? link.getAttribute('href') : null};
    }, [x, y]);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const plan = PLAN[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };

    const {page, close} = await launch(app);
    try {
        // 1-3. The cover, through the workflow's publication form.
        const entry = app.line === 'stable-3_5_0' && plan.entryOn35 ? plan.entryOn35 : plan.entry;
        if (entry) {
            await signIn(page, 'dbarnes');
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${plan.id}`));
            const dialog = page.getByRole('dialog').first();
            const item = dialog.getByRole('link', {name: entry, exact: true})
                .or(dialog.getByRole('button', {name: entry, exact: true})).first();
            await item.waitFor({timeout: T});
            await item.click();
            await idle(page);
            const form = dialog.locator('form').filter({hasText: 'Cover Image'}).first();
            await form.waitFor({timeout: T});
            record('03-entry-form', await screen(page));
            const uploaded = page.waitForResponse((r) => /temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
            await form.locator('input[type=file]').first().setInputFiles(COVER);
            fact('3 upload', {status: (await uploaded).status()});
            await form.getByRole('textbox', {name: /Alternate text/i}).first().waitFor({timeout: T});
            const saved = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
            await form.getByRole('button', {name: 'Save', exact: true}).click();
            const res = await saved;
            await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
            fact('3 save', {status: res.status()});
            record('03-entry-saved', await screen(page));
            await signOut(page);
        }

        // 4. The list.
        await plan.list(page, app);
        const listUrl = page.url();
        fact('4 list', {url: listUrl, title: await page.title()});
        record('04-list', await screen(page));
        const box = plan.summary(page, plan.id);
        await box.waitFor({timeout: T});
        const coverImg = box.locator('.cover img').first();
        await coverImg.scrollIntoViewIfNeeded();
        await shot(page, '04-list');

        const geometry = await box.evaluate((el) => {
            const r = (n) => (n ? (({x, y, width, height}) => ({x: Math.round(x), y: Math.round(y), w: Math.round(width), h: Math.round(height)}))(n.getBoundingClientRect()) : null);
            const meta = el.querySelector('.meta');
            const cover = el.querySelector('.cover');
            return {
                summary: r(el),
                cover: r(cover),
                coverImg: r(el.querySelector('.cover img')),
                coverFloat: cover ? getComputedStyle(cover).float : null,
                title: r(el.querySelector('.title')),
                meta: r(meta),
                metaPosition: meta ? getComputedStyle(meta).position : null,
                authors: r(el.querySelector('.authors')),
                keywords: r(el.querySelector('.keywords')),
                details: r(el.querySelector('.details')),
                galleys: r(el.querySelector('.galleys_links')),
            };
        });
        fact('4 geometry', geometry);

        // The element under the pointer down the cover's middle.
        const img = geometry.coverImg;
        const column = [];
        for (const f of [0.05, 0.15, 0.25, 0.35, 0.45, 0.5, 0.55, 0.65, 0.75, 0.85, 0.95]) {
            const y = img.y + img.h * f;
            const hit = await hitAt(page, img.x + img.w / 2, y);
            column.push({at: f, y: Math.round(y), ...hit});
        }
        fact('5 hits down the cover', column);
        fact('5 share of the cover column not on the cover link', column.filter((c) => !(c.link && plan.landing(plan.id).test(c.link))).length + '/' + column.length);

        // 5-6. Presses: middle, top, bottom.
        const press = async (label, fx, fy) => {
            await plan.list(page, app);
            const b = plan.summary(page, plan.id);
            await b.locator('.cover img').first().scrollIntoViewIfNeeded();
            const r = await b.locator('.cover img').first().boundingBox();
            const x = r.x + r.width * fx;
            const y = r.y + r.height * fy;
            const hit = await hitAt(page, x, y);
            const before = page.url();
            await page.mouse.click(x, y);
            await page.waitForURL((u) => u.toString() !== before, {timeout: 4000}).catch(() => {});
            await idle(page);
            const after = page.url();
            const opened = plan.landing(plan.id).test(after);
            fact(`5 press ${label}`, {hit, before, after, opened});
            return opened;
        };
        await press('middle', 0.5, 0.5);
        await press('top', 0.5, 0.06);
        await press('bottom', 0.5, 0.94);
        // The row of the summary's text block (the author line on a journal):
        // the vertical middle of `.meta` where it runs beside the cover.
        if (geometry.meta && img) {
            const top = Math.max(geometry.meta.y, img.y);
            const bottom = Math.min(geometry.meta.y + geometry.meta.h, img.y + img.h);
            if (bottom > top) await press('text row', 0.5, ((top + bottom) / 2 - img.y) / img.h);
        }
        record('05-after-presses', await screen(page));

        // Neighbour: the title still opens it; a press on the keyword row
        // beside the cover (OPS) stays on the list.
        await plan.list(page, app);
        const titleLink = plan.summary(page, plan.id).locator('.title a').first();
        await titleLink.click();
        await idle(page);
        fact('N title press', {after: page.url(), opened: plan.landing(plan.id).test(page.url())});
        if (app.name === 'ops') {
            await plan.list(page, app);
            const kw = plan.summary(page, plan.id).locator('.keywords li').first();
            await kw.scrollIntoViewIfNeeded();
            const before = page.url();
            await kw.click();
            await page.waitForURL((u) => u.toString() !== before, {timeout: 3000}).catch(() => {});
            fact('N keyword press beside the cover', {text: flat(await kw.innerText().catch(() => null)), after: page.url(), stayed: page.url() === before});
            // A preprint without a cover keeps its layout.
            await plan.list(page, app);
            const other = plan.summary(page, 15);
            if (await other.count()) {
                fact('N preprint 15 (no cover) geometry', await other.evaluate((el) => {
                    const r = (n) => (n ? (({x, y, width, height}) => ({x: Math.round(x), w: Math.round(width), h: Math.round(height)}))(n.getBoundingClientRect()) : null);
                    return {summary: r(el), meta: r(el.querySelector('.meta')), keywords: r(el.querySelector('.keywords')), cover: !!el.querySelector('.cover')};
                }));
            }
            // The home page's "Latest preprints", when preprint 2 is listed.
            await page.goto(app.url(`/index.php/${app.contextPath}/en`));
            await idle(page);
            const home = plan.summary(page, plan.id);
            if (await home.count()) {
                const hi = home.locator('.cover img').first();
                await hi.scrollIntoViewIfNeeded();
                const r = await hi.boundingBox();
                const hit = await hitAt(page, r.x + r.width / 2, r.y + r.height / 2);
                const before = page.url();
                await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
                await page.waitForURL((u) => u.toString() !== before, {timeout: 4000}).catch(() => {});
                fact('5 home middle press', {hit, after: page.url(), opened: plan.landing(plan.id).test(page.url())});
            } else {
                fact('5 home middle press', 'preprint 2 not among the home page\'s latest preprints this load');
            }
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
