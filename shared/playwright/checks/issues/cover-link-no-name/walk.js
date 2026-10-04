// Walk of docs/issues/U68-A2-cover-link-no-name.md: each list's cover link, named only by the cover's
// "Alternate text", has no name for a screen reader. The steps, on PKP's default test dataset:
//   OMP  signed out, "Catalog", then book 14 › "Series" › "Psychology" (the default picture); dbarnes,
//        submission 14 › "Catalog Entry" (no "Alternate text" box), "Unpublish", a PNG under
//        "Cover Image" with "Alternate text" left empty, "Save", "Publish"; signed out, "Catalog" again.
//   OJS  dbarnes, submission 1 (its unpublished version 1.1) › "Publication Settings" ("Issue" on 3.5):
//        the PNG, "Alternate text" empty, "Save", "Publish"; Issues › "Back Issues" › "Vol. 1 No. 2
//        (2014)" › "Edit" › "Issue Data": the PNG, "Save"; signed out, the home page (the current issue),
//        "Archives" and article 17's page (the issue cover).
//   OPS  dbarnes, submission 2 › "Unpost", "Preprint Entry": the PNG, "Alternate text" empty, "Save",
//        "Post"; signed out, "Archives" (the home page read too: preprint 2 is not among its ten latest).
// Each list's cover links and title links are read from Chrome's accessibility tree (role, name).
//
//   WALK=walk (default)  the steps above, on every app.
//   WALK=nb              neighbour (OMP): the PNG on book 14 with "Alternate text" "u68a cover"; the catalog's
//                        title links and the book page's own cover read. Run with the fix in and out.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u68a --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u68a PROBE_AGENT=u68a node bin/probe.js all shared/playwright/checks/issues/cover-link-no-name/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u68a-3_5 PROBE_AGENT=u68a node bin/probe.js all shared/playwright/checks/issues/cover-link-no-name/walk.js
// Fix trial:    PROBE_RUN=fix (WALK=walk), PROBE_RUN=nb-in / nb-out (WALK=nb, ONLY=omp); after the
//               detail pages' change PROBE_RUN=fix2 (ONLY=ojs,omp) and nb-in2
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');
const {sleep, flat, readSummaries, setCover, readItemPageCover, readCoverField, openCoverPage, PICTURE} = require('./lib');
const one = require('../one-item-reads-1-items/lib');

const MODE = process.env.WALK || 'walk';
const T = 30_000;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (MODE === 'nb' && app.name !== 'omp') return;
    const line = app.line || 'main';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const label = (s) => `cover-${MODE}-${s}${run}`;
    const ctx = app.contextPath;
    const lang = /3_[34]/.test(line) ? '' : '/en';
    const facts = {app: app.name, line, mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1800)}`);
    };
    const {page, close} = await launch(app);
    const step = async (name, action) => {
        try {
            const out = await action();
            fact(name, out === undefined ? 'done' : out);
            return out;
        } catch (e) {
            fact(`${name} threw`, String(e.message).split('\n')[0]);
            return null;
        } finally {
            await idle(page).catch(() => null);
        }
    };
    const snap = async (name) => {
        record(label(name), await screen(page));
        await shot(page, label(name)).catch(() => {});
    };
    const header = async (name) => {
        await page.goto(app.url(`/index.php/${ctx}${lang}`));
        await idle(page).catch(() => {});
        if (name) {
            const link = page.locator('.pkp_navigation_primary').getByRole('link', {name, exact: true}).first();
            if (await link.isVisible().catch(() => false)) await link.click();
            else {
                // Not in the header's menu: the address the menu item would hold, recorded as such.
                const tail = {Catalog: 'catalog', Archives: app.name === 'ops' ? 'preprints' : 'issue/archive'}[name];
                fact(`header has no "${name}"`, tail);
                await page.goto(app.url(`/index.php/${ctx}${lang}/${tail}`));
            }
            await idle(page).catch(() => {});
        }
    };
    const reopen = (sid) => async () => {
        await page.reload();
        await idle(page).catch(() => {});
        await sleep(1500);
    };

    // The context's public folder: creating a context makes it, the dataset dump leaves it out (its
    // public/ holds only index.html), and the cover's small copy is written there. Made as a press
    // created on screen has it; recorded, so Evidence can say so.
    await step('context public folder', async () => {
        const conf = fs.readFileSync(path.join(app.root, path.basename(app.configFile)), 'utf8');
        const publicDir = (conf.match(/^public_files_dir\s*=\s*"?([^"\n]+?)"?\s*$/m) || [])[1];
        const ctxDir = {ojs: 'journals', omp: 'presses', ops: 'contexts'}[app.name];
        const t = app.contextTables;
        const ctxId = sql(app, `SELECT ${t.id} FROM ${t.table} WHERE path = '${ctx}'`).trim();
        const dir = path.join(path.isAbsolute(publicDir) ? publicDir : path.join(app.root, publicDir), ctxDir, ctxId);
        const existed = fs.existsSync(dir);
        fs.mkdirSync(dir, {recursive: true});
        return {dir: path.relative(app.root, dir), existed};
    });

    try {
        if (app.name === 'omp') {
            const BOOK = 14;
            if (MODE === 'walk') {
                await step('1-2 Catalog (default pictures)', async () => {
                    await header('Catalog');
                    await snap('catalog-before');
                    return readSummaries(page, 'book');
                });
                await step('3 book 14 › Series "Psychology"', async () => {
                    await page.locator('.obj_monograph_summary .title a').filter({hasText: 'From Bricks to Brains'}).first().click();
                    await idle(page).catch(() => {});
                    await page.locator('.item.series a').filter({hasText: /^\s*Psychology\s*$/}).first().click();
                    await idle(page).catch(() => {});
                    await snap('series-psy');
                    return readSummaries(page, 'book');
                });
            }
            await signIn(page, 'dbarnes');
            await step('4 Catalog Entry before Unpublish', async () => {
                await one.openWorkflow(page, app, BOOK);
                const opened = await openCoverPage(page);
                await snap('catalog-entry-before');
                return {opened, field: await readCoverField(page)};
            });
            await step('5 Unpublish', () => one.unpublish(page));
            await step(`6 Cover Image, Alternate text ${MODE === 'nb' ? '"u68a cover"' : 'empty'}, Save`, async () => {
                const out = await setCover(page, MODE === 'nb' ? 'u68a cover' : '', reopen(BOOK));
                await snap('catalog-entry-after');
                return out;
            });
            await step('7 Publish', () => one.publish(page));
            await signOut(page);
            await step('8 Catalog after the cover', async () => {
                await header('Catalog');
                await snap('catalog-after');
                return readSummaries(page, 'book');
            });
            await step('book page cover', async () => {
                await page.goto(app.url(`/index.php/${ctx}${lang}/catalog/book/${BOOK}`));
                await idle(page).catch(() => {});
                await snap('book-page');
                return {cover: await readItemPageCover(page), bookLinks: (await readSummariesLinks(page))};
            });
            await step('chapter page cover (reach)', async () => {
                const ch = sql(app, `SELECT chapter_id FROM submission_chapters WHERE publication_id = (SELECT current_publication_id FROM submissions WHERE submission_id = ${BOOK}) ORDER BY seq LIMIT 1`).trim();
                const r = await page.goto(app.url(`/index.php/${ctx}${lang}/catalog/book/${BOOK}/chapter/${ch}`));
                await idle(page).catch(() => {});
                await snap('chapter-page');
                const {axRead} = require('./lib');
                return {status: r && r.status(), chapter: ch, coverLinks: await axRead(page, '.item.cover a')};
            });
        }

        if (app.name === 'ojs') {
            const SUB = 1;
            await signIn(page, 'dbarnes');
            await step('1-2 Cover Image on the unpublished version, Alternate text empty, Save', async () => {
                await one.openWorkflow(page, app, SUB);
                const out = await setCover(page, '', reopen(SUB));
                await snap('publication-settings');
                return out;
            });
            await step('3 Publish', () => one.publish(page));
            await step('4 Issue Data: Cover Image, Alternate text empty, Save', async () => {
                const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
                const issues = new IssuesAdmin(page, ctx);
                await issues.goto('Back Issues');
                await issues.showTab('Back Issues');
                const win = await issues.openManagement('Back Issues', 'Vol. 1 No. 2 (2014)');
                const form = await win.openData();
                const up = await form.uploadCover(PICTURE);
                const altVisible = await form.altTextBox().isVisible().catch(() => false);
                const saved = await form.save();
                await sleep(500);
                await snap('issue-data');
                return {upload: up.status(), altTextBox: altVisible, save: saved.status()};
            });
            await signOut(page);
            await step('5 Home page: the current issue', async () => {
                await header(null);
                await snap('home');
                return readSummaries(page, 'article');
            });
            await step('6 Archives', async () => {
                await header('Archives');
                await snap('archives');
                return readSummaries(page, 'issue');
            });
            await step('article 17 page: the issue cover (reach)', async () => {
                await page.goto(app.url(`/index.php/${ctx}${lang}/article/view/17`));
                await idle(page).catch(() => {});
                await snap('article-17');
                const {axRead} = require('./lib');
                return {issueCoverLinks: await axRead(page, '.cover_image a'), issueLinks: await axRead(page, '.item.issue a')};
            });
        }

        if (app.name === 'ops') {
            const SUB = 2;
            await signIn(page, 'dbarnes');
            await step('1 open, 2 Unpost', async () => {
                await one.openWorkflow(page, app, SUB);
                return one.unpublish(page);
            });
            await step('3 Preprint Entry: Cover Image, Alternate text empty, Save', async () => {
                const out = await setCover(page, '', reopen(SUB));
                await snap('preprint-entry');
                return out;
            });
            await step('4 Post', () => one.publish(page));
            await signOut(page);
            await step('5 Archives', async () => {
                await header('Archives');
                await snap('archives');
                return readSummaries(page, 'preprint');
            });
            await step('5 home page', async () => {
                await header(null);
                await snap('home');
                return readSummaries(page, 'preprint');
            });
        }
    } finally {
        record(label('facts'), facts);
        await close();
    }

    async function readSummariesLinks(p) {
        const {axRead} = require('./lib');
        return axRead(p, '.obj_monograph_full a[href*="/catalog/book/"]');
    }
});
