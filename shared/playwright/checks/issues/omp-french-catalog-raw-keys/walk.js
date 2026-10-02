// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md, joined by
// U16 A15 (a press's category page) and U68 A8 (the catalog pages and the
// "Browse" block): a press shown in French (Canada) prints raw codes for the
// catalog pages' count, list headings and empty messages and for the "Browse"
// block. Takes the joined Steps on PKP's default test dataset (OMP):
//   1.  a visitor opens the French "New Releases" page (empty)
//   2.  dbarnes, Settings › Website › Appearance › Setup: ticks "Browse Block",
//       "Display featured books on the home page", "Display new releases on the
//       home page", "Save"
//   3.  dbarnes, Content › Catalog: "Featured" and "New release" on "From
//       Bricks to Brains" (book 14)
//   4-7. the visitor opens the French home page, "Catalogue", the block's
//       "Applied Science" and the block's first series
// then the same pages in English (the control).
// MODE=nb (the neighbour check, run alone with the fix in and out): steps 2-3
//   when not yet done, then the English pages and the French texts that were
//   already translated ("Catalogue", "Nouveautés", "Séries", the trail).
// MODE=tab (all three apps; evidence for the session's ruling, not in the
//   Steps): dbarnes opens Settings › (Journal|Press|Server) › "Categories" in
//   French and the raw codes on the tab are listed.
// Reset the dataset fleet first; the walk changes the press's appearance
// settings and book 14's catalog flags.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-catalog-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; MODE=tab with `all`)
const {forEachApp, launch, signIn, signOut, screen, record, idle, note, rawKeys} = require('../../../probe');
const {setUpHome, featureBook, readPublic, blockLinks, gotoRetry} = require('./lib');

const T = 30_000;
const BOOK = 'From Bricks to Brains';
const CATEGORY = 'Applied Science';
const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const u = (lang, tail = '') => app.url(`/index.php/${app.contextPath}/${lang}${tail}`);

    if (MODE === 'tab') {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            await page.goto(u('fr_CA', '/management/settings/context'));
            await idle(page);
            await page.locator('#categories-button').first().click();
            await idle(page);
            await page.waitForTimeout(1500);
            await idle(page);
            const s = await screen(page);
            record('c7tab', s);
            fact('tabText', (s.text && s.text.main || '').slice(0, 1500));
            fact('tabRawKeys', await rawKeys(page, {scope: '#categories'}) || await rawKeys(page));
        } finally {
            await close();
        }
        record('c7tab-facts', facts);
        return;
    }

    if (app.name !== 'omp') {
        note(`c7 walk: ${app.name} skipped, the catalog pages and the Browse block are a press's`);
        return;
    }
    const editor = await launch(app);
    const reader = await launch(app);
    const e = editor.page;
    const r = reader.page;
    const readAt = async (key, address) => {
        const tries = await gotoRetry(r, address);
        if (tries > 1) fact(`${key}-tries`, tries);
        const d = await readPublic(r);
        fact(key, d);
        record(`c7${MODE}-${key}`, await screen(r));
        return d;
    };
    const setUp = async () => {
        await signIn(e, 'dbarnes');
        fact('step2', await setUpHome(e, app));
        fact('step3', await featureBook(e, app, BOOK));
        await signOut(e);
    };
    try {
        if (MODE === 'walk') {
            await readAt('step1-newReleases-fr', u('fr_CA', '/catalog/newReleases'));
            await setUp();
            await readAt('step4-home-fr', u('fr_CA'));
            // step 5: "Catalogue" in the header
            const cat = r.locator('#navigationPrimary > li > a').filter({hasText: /^\s*Catalogue\s*$/}).first();
            if (await cat.count()) {
                await cat.click();
                await idle(r);
                fact('step5-via', 'header link');
            } else {
                await r.goto(u('fr_CA', '/catalog'));
                fact('step5-via', 'address (no "Catalogue" link)');
            }
            fact('step5-catalog-fr', await readPublic(r));
            record('c7walk-step5-catalog-fr', await screen(r));
            const links = await blockLinks(r);
            fact('blockLinks-fr', links);
            const catLink = links.find((l) => l.text === CATEGORY);
            const t6 = await gotoRetry(r, catLink ? new URL(catLink.href, r.url()).href : u('fr_CA', '/catalog/category/applied-science'));
            if (t6 > 1) fact('step6-tries', t6);
            fact('step6-category-fr', await readPublic(r));
            record('c7walk-step6-category-fr', await screen(r));
            const ser = links.find((l) => /\/catalog\/series\//.test(l.href || ''));
            if (ser) {
                await gotoRetry(r, new URL(ser.href, r.url()).href);
                fact('step7-series', ser.text);
                fact('step7-series-fr', await readPublic(r));
                record('c7walk-step7-series-fr', await screen(r));
            } else {
                fact('step7-series', 'no series link in the block');
            }
            // the control: the same pages in English
            for (const [k, tail] of [['home', ''], ['catalog', '/catalog'], ['newReleases', '/catalog/newReleases'],
                ['category', '/catalog/category/applied-science']].concat(ser ? [['series', `/catalog/series/${ser.href.split('/catalog/series/')[1]}`]] : [])) {
                await readAt(`control-${k}-en`, u('en', tail));
            }
        } else if (MODE === 'nb') {
            await setUp();
            for (const [k, tail] of [['home', ''], ['catalog', '/catalog'], ['newReleases', '/catalog/newReleases'],
                ['category', '/catalog/category/applied-science']]) {
                await readAt(`${k}-en`, u('en', tail));
            }
            for (const [k, tail] of [['catalog', '/catalog'], ['newReleases', '/catalog/newReleases']]) {
                const d = await readAt(`${k}-fr`, u('fr_CA', tail));
                fact(`${k}-fr-translated`, {h1: d.h1, trail: d.trail, nav: d.nav});
            }
        }
    } finally {
        await editor.close();
        await reader.close();
    }
    record(`c7${MODE}-facts`, facts);
});
