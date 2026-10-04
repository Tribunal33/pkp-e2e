// Issue report U16 A6/A7, the series half (U68 A4): a press's series picture is not a link. Takes the report's
// "Series" Steps on PKP's default test dataset (a dataset fleet), OMP only (no other app has a series page):
//   rvaca › Settings › Press › "Series", "History" › Edit, "Cover Image" a 400 × 400 PNG, "Save"; the series page
//   (catalog/series/his): the picture's markup, whether it is a link, its alt; a press on the picture; then the
//   full-size and small-copy addresses the markup names, typed.
// Neighbour mode (fix in and out), alone:
//   WALK=nb  "Psychology" (psy, no picture): its page has no picture block; the catalog page's book covers are links.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <fleet> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp shared/playwright/checks/issues/category-picture/series.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<fleet-3_5> PROBE_AGENT=<name> node bin/probe.js omp shared/playwright/checks/issues/category-picture/series.js
const path = require('path');
const {forEachApp, launch, signIn, screen, record, shot, idle, sql, serverLog} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const T = 30_000;
const FILES = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files');
const PICTURE = path.join(FILES, 'profile-image-400.png'); // a real 400 × 400 PNG

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('series.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `serpic-${s}${run}`;
    const facts = {app: app.name, line, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };
    const {page, close} = await launch(app);
    const log = serverLog(app);
    const from = log.mark();
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
            return out;
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const ctx = app.contextPath;
    const seriesId = (p) => sql(app, `SELECT series_id FROM series WHERE path = '${p}'`).trim();

    // The series page: the picture block as the browser has it.
    const readSeriesPage = async (seriesPath) => {
        const res = await page.goto(app.url(`/index.php/${ctx}/catalog/series/${seriesPath}`));
        await idle(page);
        await page.locator('.about_section .cover img').first().evaluate((img) => img.decode && img.decode().catch(() => null)).catch(() => null);
        await page.waitForTimeout(500);
        const block = await page.evaluate(() => {
            const cover = document.querySelector('.about_section .cover');
            if (!cover) return {cover: null};
            const img = cover.querySelector('img');
            return {
                cover: {tag: cover.tagName.toLowerCase(), href: cover.getAttribute('href'), outerHTML: cover.outerHTML.replace(/\s+/g, ' ').slice(0, 600)},
                insideLink: !!(img && img.closest('a')),
                img: img && {src: img.getAttribute('src'), alt: img.getAttribute('alt'), complete: img.complete, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width: img.clientWidth, height: img.clientHeight},
            };
        });
        const aria = await page.locator('.about_section').first().ariaSnapshot().catch((e) => `no read: ${e.message}`);
        return {status: res && res.status(), url: page.url(), heading: await page.locator('h1').first().innerText().catch(() => null), block, aria};
    };

    // Type an address: status, type and size of what answers.
    const typeAddress = async (address) => {
        const res = await page.goto(address).catch((e) => ({error: e.message}));
        if (!res || res.error) return {address, error: res && res.error};
        const body = await res.body().catch(() => Buffer.alloc(0));
        return {address, status: res.status(), contentType: res.headers()['content-type'] || null, bytes: body.length};
    };

    try {
        await step('1 sign in as rvaca', async () => {
            await signIn(page, 'rvaca');
            return page.url();
        });

        if (MODE === 'walk') {
            await step('2-5 History: Edit, Cover Image, Save', async () => {
                const {SectionsTab} = require('../../../pages/SectionsPages.js');
                const series = new SectionsTab(page, ctx, {tab: 'Series', addLabel: 'Add Series'});
                await series.goto();
                const win = await series.openEdit('History');
                const uploaded = page.waitForResponse((r) => /upload-?[Ii]mage/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await win.form().locator('#plupload input[type=file]').setInputFiles(PICTURE);
                const up = await uploaded;
                await idle(page);
                const saved = page.waitForResponse((r) => /update-?[Ss]eries/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
                await win.saveButton().click();
                const s = await saved;
                await idle(page);
                return {upload: up.status(), save: s.status(), windowOpen: await win.form().isVisible().catch(() => false), stored: sql(app, `SELECT image FROM series WHERE path = 'his'`).trim()};
            });
            const pageRead = await step('6 the series page: the picture block', () => readSeriesPage('his'));
            record(name('page'), await screen(page));
            await shot(page, name('page'));
            await step('7 press the picture', async () => {
                const before = page.url();
                const img = page.locator('.about_section .cover img').first();
                if (!(await img.count())) return {pressed: false, reason: 'no picture on the page'};
                const opened = page.context().waitForEvent('page', {timeout: 2_000}).catch(() => null);
                await img.click({timeout: 5_000});
                await page.waitForLoadState('load').catch(() => null);
                await page.waitForTimeout(1_500);
                const other = await opened;
                const res = {before, after: page.url(), changed: before !== page.url(), newTab: other ? other.url() : null};
                if (res.changed) await page.goBack().catch(() => null);
                return res;
            });
            const id = seriesId('his');
            const block = pageRead && pageRead.block;
            const full = (block && block.cover && block.cover.href) || app.url(`/index.php/${ctx}/catalog/fullSize?type=series&id=${id}`);
            const thumb = (block && block.img && block.img.src) || app.url(`/index.php/${ctx}/catalog/thumbnail?type=series&id=${id}`);
            await step('8 type the full-size address the markup names', () => typeAddress(full));
            await step('8 type the small copy\'s address', () => typeAddress(thumb));
        }

        if (MODE === 'nb') {
            await step('nb Psychology page (no picture)', () => readSeriesPage('psy'));
            await step('nb catalog page: book covers', async () => {
                await page.goto(app.url(`/index.php/${ctx}/catalog`));
                await idle(page);
                return page.evaluate(() => {
                    const covers = [...document.querySelectorAll('.obj_monograph_summary .cover')];
                    return {count: covers.length, tags: [...new Set(covers.map((c) => c.tagName.toLowerCase()))], withHref: covers.filter((c) => c.getAttribute('href')).length};
                });
            });
        }
    } finally {
        facts.serverLog = log.since(from);
        record(name(`facts-${MODE}`), facts);
        await close();
    }
});
