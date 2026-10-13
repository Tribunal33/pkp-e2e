/**
 * U07 claim check C07 (housekeeping 2026-10-13): incidentals row 21.
 *
 * The page about the publishing software (Rule 20) in a translation whose
 * version placeholder is broken: OMP's Russian `about.aboutOMPSite` and
 * `about.aboutOMPPress` read `{$ompVersion, которая …` (no closing brace);
 * OJS's Hindi and Uzbek (Latin) `about.aboutOJSSite` read `{$ ojsVersion}`
 * (a space after `$`), with Russian on OJS as the control.
 *
 * A signed-out visitor reads, per language: the site's own page
 * (`index/<lc>/about/aboutThisPublishingSystem`), the site home's footer
 * link to it, and a scratch context's page (`<ctx>/<lc>/about/...`);
 * English first as the control.
 *
 * The site's languages are changed for the length of this one process
 * only: the languages are installed through Administration › Site Settings ›
 * Site Setup › Languages › "Install Locale" and removed again in `finally`,
 * the site's list checked back to en + fr_CA. Run it ONLY under the
 * slot's exclusive app lock, one app per call:
 *
 *   PROBE_RUN=r1 PROBE_FEATURE=U07 PROBE_AGENT=ccC07 \
 *     bin/app-lock.sh exclusive omp -- node bin/probe.js omp \
 *     shared/playwright/checks/U07/C07/c07.js
 *
 * It refuses to touch the site when the site's installed languages are not
 * en + fr_CA, or when any context has a language outside them (a site
 * language change unticks those: U57 A1).
 */
const {forEachApp, launch, signIn, signOut, screen, rawKeys, shot, record, loc, note, idle, tag, sql, serverLog} = require('../../../probe');

const LANGS = {omp: ['ru'], ojs: ['ru', 'hi', 'uz_Latn'], ops: []};
const SITE_SET = ['en', 'fr_CA'];
const PAGE = '/about/aboutThisPublishingSystem';

const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    const langs = LANGS[app.name] || [];
    const facts = {app: app.name, langs, steps: []};
    const step = (k, v) => {
        facts.steps.push({k, ...v});
        console.log(`[${app.name}] ${k}`, JSON.stringify(v).slice(0, 900));
    };
    const log = serverLog(app);
    const T = app.contextTables;

    // a signed-out visitor's read of one address
    async function visit(page, path, name) {
        const from = log.mark();
        const resp = await page.goto(path).catch((e) => ({error: String(e.message)}));
        await idle(page).catch(() => {});
        const s = await screen(page);
        await shot(page, name);
        const r = await page.evaluate(() => {
            const p = document.querySelector('.page_about_publishing_system p');
            const h = document.querySelector('.page_about_publishing_system h1');
            return {
                url: location.pathname,
                lang: document.documentElement.lang,
                title: document.title,
                h1: h ? h.innerText.trim() : null,
                para: p ? p.innerText.replace(/\s+/g, ' ').trim() : null,
                paraHtml: p ? p.innerHTML.replace(/\s+/g, ' ').trim() : null,
                paraLinks: p ? [...p.querySelectorAll('a')].map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`) : [],
                crumbs: [...document.querySelectorAll('.cmp_breadcrumbs li')].map((l) => l.innerText.trim()),
                footerAbout: [...document.querySelectorAll('a[href*="aboutThisPublishingSystem"]')].map((a) => `${(a.innerText || a.querySelector('img')?.alt || '').trim()} -> ${a.getAttribute('href')}`),
            };
        });
        const raw = await rawKeys(page).catch((e) => ({error: String(e.message)}));
        const out = {
            status: resp && resp.status ? resp.status() : resp,
            ...r,
            rawPlaceholder: /\{\$/.test(r.para || ''),
            versionPrinted: /\d+\.\d+\.\d+(\.\d+)?/.test(r.para || ''),
            rawKeys: raw,
            log: log.since(from),
        };
        record(name, {...out, screen: s});
        step(name, {...out, paraHtml: undefined});
        return out;
    }

    // ------------------------------------------------------------ English, every app (no site change)
    {
        const {page: e, close: closeE} = await launch(app);
        try {
            await visit(e, `/index.php/index/en${PAGE}`, 'c07-01-site-en');
            await visit(e, `/index.php/${app.contextPath}/en${PAGE}`, 'c07-02-pk-en');
            await visit(e, '/index.php/index/en', 'c07-02h-home-en');
            const link = e.locator('a[href*="aboutThisPublishingSystem"]').first();
            await loc(e, 'site home (en): the footer link to the software page', link);
            if (await link.count()) {
                await link.click();
                await e.waitForLoadState('load').catch(() => {});
                await visit(e, new URL(e.url()).pathname, 'c07-02l-home-link-en');
            }
            const contact = e.locator('.page_about_publishing_system p a[href*="contact"]').first();
            await visit(e, `/index.php/${app.contextPath}/en${PAGE}`, 'c07-02c-pk-en-again');
            if (await contact.count()) {
                await contact.click();
                await e.waitForLoadState('load').catch(() => {});
                await visit(e, new URL(e.url()).pathname, 'c07-02d-pk-contact-link');
            }
        } finally {
            await closeE();
        }
    }

    // ------------------------------------------------------------ guard
    const site = sql(app, 'select installed_locales, supported_locales from site');
    const ctxLocales = sql(
        app,
        `select distinct setting_value from ${T.settings} where setting_name in ('supportedLocales','supportedSubmissionLocales','supportedSubmissionMetadataLocales','supportedFormLocales')`
    )
        .split('\n')
        .filter(Boolean);
    const outside = ctxLocales.flatMap((v) => JSON.parse(v)).filter((l) => !SITE_SET.includes(l));
    step('guard', {site, ctxLocales, outside});
    if (!langs.length) {
        step('skip', {why: 'no language with a broken placeholder on this app'});
        record('c07', facts);
        return;
    }
    const installed = JSON.parse(site.split('|')[0]).sort();
    if (installed.join() !== [...SITE_SET].sort().join() || outside.length) {
        step('refused', {why: 'site not as seeded, or a context carries a language outside the site set'});
        record('c07', facts);
        return;
    }

    const {page: admin, close: closeAdmin} = await launch(app);
    const {page: v, close: closeV} = await launch(app);
    const {SiteLanguagesList} = require('../../../pages/LanguagesPages.js');
    const list = new SiteLanguagesList(admin);
    let changed = false;
    try {
        // ------------------------------------------------------------ install
        await signIn(admin, 'admin');
        await list.goto();
        await idle(admin).catch(() => {});
        record('c07-03-site-languages-before', await screen(admin));
        await loc(admin, 'Site Setup › Languages: the "Install Locale" link', list.installButton);
        const win = await list.openInstall();
        const offered = await win.boxes.evaluateAll((bs) => bs.map((b) => b.value));
        const want = langs.filter((l) => offered.includes(l));
        step('install-offer', {offered: offered.length, want, missing: langs.filter((l) => !offered.includes(l))});
        for (const l of want) await win.box(l).check();
        changed = true;
        const t0 = Date.now();
        const resp = await win.save();
        step('install', {status: resp.status(), ms: Date.now() - t0});
        await list.reload();
        const codes = await list.codes();
        const rows = {};
        for (const c of codes) rows[c] = await list.cellTexts(c);
        step('site-languages-after-install', {codes, rows});
        record('c07-04-site-languages-installed', await screen(admin));

        // ------------------------------------------------------------ scratch context with the languages
        const t = tag('u07c07');
        const made = await app.api.createContext({
            tag: t,
            context: {supportedLocales: ['en', ...want], primaryLocale: 'en', enabled: true},
        });
        step('scratch', {tag: t, made: JSON.stringify(made).slice(0, 300)});

        // ------------------------------------------------------------ the pages per language
        for (const l of want) {
            await visit(v, `/index.php/index/${l}${PAGE}`, `c07-10-site-${l}`);
            await visit(v, `/index.php/${t}/${l}${PAGE}`, `c07-11-ctx-${l}`);
            // reached from the site's own home: the footer's link to the page
            await visit(v, `/index.php/index/${l}`, `c07-12-home-${l}`);
            const link = v.locator('a[href*="aboutThisPublishingSystem"]').first();
            await loc(v, `site home (${l}): the footer link to the software page`, link);
            if (await link.count()) {
                await link.click();
                await v.waitForLoadState('load').catch(() => {});
                await visit(v, new URL(v.url()).pathname, `c07-13-home-link-${l}`);
            } else {
                step(`c07-13-home-link-${l}`, {absent: true});
            }
        }
        // the visitor's language left on English again (the choice is kept per browser)
        await visit(v, `/index.php/index/en${PAGE}`, 'c07-19-site-en-after');
    } catch (e) {
        step('error', {message: String(e && e.stack).slice(0, 1500)});
    } finally {
        // ------------------------------------------------------------ restore the site
        if (changed) {
            for (const l of langs) {
                try {
                    const removed = await list.removeIfInstalled(l);
                    step(`restore-${l}`, {removed});
                } catch (e) {
                    step(`restore-${l}-failed`, {message: String(e && e.message).slice(0, 500)});
                }
            }
            await sleep(500);
        }
        const after = sql(app, 'select installed_locales, supported_locales, primary_locale from site');
        const afterCtx = sql(
            app,
            `select distinct setting_value from ${T.settings} where setting_name in ('supportedSubmissionLocales','supportedSubmissionMetadataLocales')`
        );
        step('restored', {site: after, ctxSubmission: afterCtx});
        if (changed && !/^\["fr_CA","en"\]\|\["fr_CA","en"\]\|en$|^\["en","fr_CA"\]\|\["en","fr_CA"\]\|en$/.test(after)) {
            note(`ccC07: c07.js left ${app.name}'s site languages at ${after}: restore by hand (Site Settings › Languages).`);
        }
        await signOut(admin).catch(() => {});
        await closeAdmin();
        await closeV();
        record('c07', facts);
    }
});
