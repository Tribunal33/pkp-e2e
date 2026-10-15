/**
 * U07 claim check H15 (housekeeping 2026-10-15): two incidentals rows.
 *
 *  (1) U07 A14, Czech on OPS: OPS's `locale/cs/locale.po` writes `{$ojsVersion}` in
 *      `about.aboutOPSSite` and `about.aboutOPSServer`, while the template passes
 *      `opsVersion`; does the page about the software print the version or the placeholder?
 *      OJS and OMP in Czech are the controls (their Czech texts carry their own token).
 *  (2) U57 A9, Uzbek: the "Install Locale" window names "Uzbek (Latin)" apart from "Uzbek",
 *      while the installed rows on the site's list and a journal's "Website Languages" read
 *      "Uzbek/o‘zbek". Both ends: Uzbek (Latin) installed alone, then both scripts installed.
 *      Only where the window offers them (OJS ships both; OMP and OPS read as controls).
 *
 * What the script does, per app, on a dataset fleet of its own (it changes the site's languages):
 *   A  signed out, English: the site's and `publicknowledge`'s software page (control)
 *   B  admin: Site Settings › Site Setup › Languages; "Install Locale": the Czech and Uzbek
 *      boxes' labels; leave once with a box ticked (the window's "Close"); then Czech and
 *      Uzbek (Latin) installed; the list read after a reload
 *   C  a scratch context (the _test API); admin ticks Czech under "UI" on its Settings ›
 *      Website › Setup › Languages; the rows read
 *   D  signed out, Czech: the site's page, the site home's footer link to it, the scratch
 *      context's page
 *   E  admin installs Uzbek (Uzbek script both installed): the site's list and the scratch
 *      context's "Website Languages" read again
 *   F  admin installs Chinese in both scripts, ticks both scripts of Uzbek and Chinese under "UI"
 *      on the scratch context, and reads its rows and the user menu's "Change Language"
 *
 * Each run leaves the site with these languages installed: reset before the next run.
 *
 * Reset the fleet before each run (it is the checker's alone):
 *   npm run fleet-prep -- --feature issues-cc07a --dataset 7 --reset
 * Run (main, one app per call, under the slot's shared app lock):
 *   PROBE_RUN=r1 PROBE_FEATURE=issues-cc07a PKP_E2E_DATASET=7 PROBE_AGENT=cc07a \
 *     bin/app-lock.sh shared ops -- node bin/probe.js ops shared/playwright/checks/U07/H15/h15.js
 * stable-3_5_0: PKP_E2E_LINE=stable-3_5_0, PROBE_FEATURE=issues-cc07a-3_5, PROBE_RUN=s1, no lock.
 * Outputs: .reports/<PROBE_FEATURE>/cc07a/ (facts-<run>-<app>.json, one snapshot per screen).
 */
const {forEachApp, launch, signIn, signOut, screen, rawKeys, shot, record, loc, note, idle, tag, sql, serverLog} = require('../../../probe');

const PAGE = '/about/aboutThisPublishingSystem';
const CS = 'cs';
const UZ = ['uz_Latn', 'uz'];
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('h15.js changes the site languages: run it on a dataset fleet of its own (PKP_E2E_DATASET=<n>)');
    const {SiteLanguagesList, JournalLanguagesTab, noticeDuring, answeringDialogs} = require('../../../pages/LanguagesPages.js');
    const log = serverLog(app);
    const fact = (k, v) => {
        record('facts', {[k]: v}, {merge: true});
        console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const part = async (name, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`ERROR ${name}`, flat(e && e.stack ? e.stack : String(e), 1500));
        }
    };

    // ---------------------------------------------------------------- the software page, read
    async function about(page, path, name) {
        const from = log.mark();
        const resp = await page.goto(app.url(path)).catch((e) => ({error: String(e.message)}));
        await idle(page).catch(() => {});
        const s = await screen(page);
        record(name, s);
        await shot(page, name).catch(() => {});
        const r = await page.evaluate(() => {
            const box = document.querySelector('.page_about_publishing_system');
            const p = box ? box.querySelector('p') : null;
            const h = box ? box.querySelector('h1') : null;
            return {
                url: location.pathname,
                lang: document.documentElement.lang,
                title: document.title,
                h1: h ? h.innerText.trim() : null,
                para: p ? p.innerText.replace(/\s+/g, ' ').trim() : null,
                paraLinks: p ? [...p.querySelectorAll('a')].map((a) => `${a.innerText.trim()} -> ${a.getAttribute('href')}`) : [],
                footerAbout: [...document.querySelectorAll('a[href*="aboutThisPublishingSystem"]')].map(
                    (a) => `${(a.innerText || (a.querySelector('img') && a.querySelector('img').alt) || '').trim()} -> ${a.getAttribute('href')}`
                ),
            };
        });
        const out = {
            status: resp && resp.status ? resp.status() : resp,
            ...r,
            placeholder: ((r.para || '').match(/\{\s*\$[^}]*\}?/g) || []),
            version: ((r.para || '').match(/\d+\.\d+\.\d+(\.\d+)?/) || [null])[0],
            rawKeys: await rawKeys(page).catch((e) => ({error: String(e.message)})),
            notices: s.notices,
            log: log.since(from),
        };
        fact(name, out);
        return out;
    }

    const site = sql(app, 'select installed_locales, supported_locales, primary_locale from site');
    fact('site languages at start', site);

    // ================= A: English control, signed out
    await part('A english', async () => {
        const {page, close} = await launch(app);
        try {
            await about(page, `/index.php/index/en${PAGE}`, 'a1-site-en');
            await about(page, `/index.php/${app.contextPath}/en${PAGE}`, 'a2-pk-en');
        } finally {
            await close();
        }
    });

    const {page, close} = await launch(app);
    const list = new SiteLanguagesList(page);
    const t = tag('u07h15');
    let offered = [];
    let scratchMade = false;
    const rowsOf = async (grid, codes) => {
        const have = await grid.codes();
        const out = {codes: have};
        for (const c of codes) out[c] = have.includes(c) ? await grid.cellTexts(c) : 'absent';
        return out;
    };
    try {
        // ================= B: admin, the site's list and "Install Locale"
        await part('B install', async () => {
            await signIn(page, 'admin');
            await list.goto();
            await idle(page);
            record('b1-site-languages-before', await screen(page));
            fact('b1 site rows before', await rowsOf(list, ['en', 'fr_CA']));
            fact('b1 site columns', await list.columns());
            fact('b1 list actions', (await list.actions.allInnerTexts()).map((x) => flat(x)));
            await loc(page, 'Site Settings › Site Setup › Languages: "Install Locale"', list.installButton);

            // the window, read; left once with a box ticked
            let win = await list.openInstall();
            offered = await win.boxes.evaluateAll((bs) => bs.map((b) => b.value));
            const label = async (code) =>
                offered.includes(code) ? flat(await win.box(code).evaluate((b) => (b.closest('label') || b.parentElement).innerText)) : 'not offered';
            fact('b2 install window', {
                boxes: offered.length,
                cs: await label(CS),
                uz_Latn: await label('uz_Latn'),
                uz: await label('uz'),
                // every other box whose language is offered in two or more forms, as read
                sameLanguage: await win.boxes.evaluateAll((bs) => {
                    const byLang = {};
                    for (const b of bs) {
                        const l = b.value.split(/[_@]/)[0];
                        (byLang[l] = byLang[l] || []).push(`${(b.closest('label') || b.parentElement).innerText.replace(/\s+/g, ' ').trim()}`);
                    }
                    return Object.values(byLang).filter((v) => v.length > 1);
                }),
            });
            const s2 = await screen(page);
            record('b2-install-window', s2);
            await shot(page, 'b2-install-window').catch(() => {});
            await loc(page, 'Install Locale window: the Czech box', win.box(CS));
            if (offered.includes('uz_Latn')) await loc(page, 'Install Locale window: the Uzbek (Latin) box', win.box('uz_Latn'));

            // leave once with a box ticked: the window's "Close", the leave question answered "OK"
            await win.box(CS).check();
            const asked = await answeringDialogs(page, ['accept'], async () => {
                await win.closeButton.click();
                await sleep(2000);
            });
            await idle(page).catch(() => {});
            fact('b3 close with Czech ticked', {asked, windowOpen: await win.form.isVisible().catch(() => false)});
            await list.reload();
            fact('b3 site codes after the close', await list.codes());
            record('b3-site-languages-after-close', await screen(page));

            // install Czech and Uzbek (Latin)
            win = await list.openInstall();
            const want = [CS, 'uz_Latn'].filter((c) => offered.includes(c));
            for (const c of want) await win.box(c).check();
            const started = Date.now();
            let answer;
            let noticeSeen = true;
            try {
                await noticeDuring(page, 'All selected locale(s) installed and activated.', async () => {
                    answer = await win.save();
                });
            } catch (e) {
                noticeSeen = flat(String(e), 200);
            }
            fact('b4 install save', {want, status: answer && answer.status(), seconds: Math.round((Date.now() - started) / 1000), notice: noticeSeen});
            record('b4-site-languages-after-save', await screen(page));
            fact('b4 site rows, same page', await rowsOf(list, [CS, ...UZ]));
            await list.reload();
            fact('b5 site rows, after a reload', await rowsOf(list, [CS, ...UZ]));
            record('b5-site-languages-installed', await screen(page));
            await shot(page, 'b5-site-languages-installed').catch(() => {});
            fact('b5 site stored', sql(app, 'select installed_locales, supported_locales from site'));
        });

        // ================= C: a scratch context; admin ticks Czech under "UI"
        await part('C scratch', async () => {
            const made = await app.api.createContext({
                tag: t,
                users: [{username: `${t}mgr`, roles: ['manager']}],
                context: {supportedLocales: ['en'], primaryLocale: 'en', enabled: true},
            });
            scratchMade = true;
            fact('c0 scratch', {path: t, made: flat(JSON.stringify(made), 300)});
            const tab = new JournalLanguagesTab(page, t);
            await tab.goto();
            record('c1-website-languages-before', await screen(page));
            await shot(page, 'c1-website-languages-before').catch(() => {});
            fact('c1 website rows before', {columns: await tab.website.columns(), ...(await rowsOf(tab.website, [CS, ...UZ]))});
            await loc(page, 'Website Languages: the "UI" box of Czech', tab.website.cell(CS, 'uiLocale'));
            const r = await tab.pressWebsite(CS, 'uiLocale');
            await idle(page);
            const c2 = await screen(page);
            record('c2-website-languages-czech-ui', c2);
            fact('c2 tick Czech UI', {
                status: r.response && r.response.status(),
                alerts: r.alerts,
                ui: await tab.website.cell(CS, 'uiLocale').isChecked(),
                forms: await tab.website.cell(CS, 'formLocale').isChecked().catch(() => null),
                notices: c2.notices,
            });
            await page.reload();
            await tab.openTab();
            fact('c3 website rows, after a reload', {
                ...(await rowsOf(tab.website, [CS, ...UZ])),
                csUi: await tab.website.cell(CS, 'uiLocale').isChecked(),
            });
            record('c3-website-languages-reloaded', await screen(page));
        });

        // ================= D: signed out, Czech
        await part('D czech', async () => {
            const {page: v, close: closeV} = await launch(app);
            try {
                await about(v, `/index.php/index/${CS}${PAGE}`, 'd1-site-cs');
                await about(v, `/index.php/index/${CS}`, 'd2-site-home-cs');
                const link = v.locator('a[href*="aboutThisPublishingSystem"]').first();
                await loc(v, 'site home (cs): the footer link to the software page', link);
                if (await link.count()) {
                    await link.click();
                    await v.waitForLoadState('load').catch(() => {});
                    await about(v, new URL(v.url()).pathname, 'd3-site-home-link-cs');
                } else {
                    fact('d3-site-home-link-cs', 'no link');
                }
                if (scratchMade) {
                    const d4 = await about(v, `/index.php/${t}/${CS}${PAGE}`, 'd4-scratch-cs');
                    // the paragraph's contact link, pressed
                    const contact = v.locator('.page_about_publishing_system p a[href*="contact"]').first();
                    if (await contact.count()) {
                        await contact.click();
                        await v.waitForLoadState('load').catch(() => {});
                        await idle(v).catch(() => {});
                        record('d5-scratch-contact-cs', await screen(v));
                        fact('d5 contact link lands', {url: new URL(v.url()).pathname, title: await v.title()});
                    } else {
                        fact('d5 contact link lands', {none: true, links: d4.paraLinks});
                    }
                    await about(v, `/index.php/${t}/en${PAGE}`, 'd6-scratch-en');
                }
            } finally {
                await closeV();
            }
        });

        // ================= E: both Uzbek scripts installed
        if (offered.includes('uz')) {
            await part('E uzbek both', async () => {
                await list.goto();
                const win = await list.openInstall();
                const left = await win.boxes.evaluateAll((bs) => bs.map((b) => b.value));
                fact('e1 install window, Uzbek (Latin) installed', {uz: left.includes('uz') ? flat(await win.box('uz').evaluate((b) => (b.closest('label') || b.parentElement).innerText)) : 'not offered', uz_Latn: left.includes('uz_Latn')});
                await win.box('uz').check();
                let answer;
                let noticeSeen = true;
                try {
                    await noticeDuring(page, 'All selected locale(s) installed and activated.', async () => {
                        answer = await win.save();
                    });
                } catch (e) {
                    noticeSeen = flat(String(e), 200);
                }
                fact('e2 install uz', {status: answer && answer.status(), notice: noticeSeen});
                await list.reload();
                fact('e3 site rows, both scripts', await rowsOf(list, UZ));
                record('e3-site-languages-both-uzbek', await screen(page));
                await shot(page, 'e3-site-languages-both-uzbek').catch(() => {});
                if (scratchMade) {
                    const tab = new JournalLanguagesTab(page, t);
                    await tab.goto();
                    fact('e4 website rows, both scripts', await rowsOf(tab.website, UZ));
                    record('e4-website-languages-both-uzbek', await screen(page));
                    await shot(page, 'e4-website-languages-both-uzbek').catch(() => {});
                }
                // publicknowledge's list, read only
                const pk = new JournalLanguagesTab(page, app.contextPath);
                await pk.goto();
                fact('e5 publicknowledge website rows', await rowsOf(pk.website, UZ));
                record('e5-pk-website-languages', await screen(page));
            });
        } else {
            fact('E uzbek both', 'skipped: the window offers no "uz"');
        }

        // ================= F: Chinese in both scripts too (U57 A9's own example); both scripts of
        // each language ticked under "UI" on the scratch context, "Change Language" read
        if (scratchMade && offered.includes('zh_Hans') && offered.includes('zh_Hant')) {
            await part('F chinese and the menu', async () => {
                const {LanguageMenu} = require('../../../pages/LanguagesPages.js');
                const ZH = ['zh_Hans', 'zh_Hant'];
                await list.goto();
                const win = await list.openInstall();
                for (const c of ZH) await win.box(c).check();
                const answer = await win.save();
                await list.reload();
                fact('f1 site rows, Chinese both scripts', {status: answer.status(), ...(await rowsOf(list, ZH))});
                record('f1-site-languages-chinese', await screen(page));
                const tab = new JournalLanguagesTab(page, t);
                await tab.goto();
                const ticks = {};
                for (const c of [...ZH, ...UZ].filter((x) => offered.includes(x))) {
                    const r = await tab.pressWebsite(c, 'uiLocale');
                    ticks[c] = {status: r.response && r.response.status(), alerts: r.alerts};
                }
                await page.reload();
                await tab.openTab();
                fact('f2 website rows, UI ticked', {ticks, ...(await rowsOf(tab.website, [...ZH, ...UZ]))});
                record('f2-website-languages-ui', await screen(page));
                await shot(page, 'f2-website-languages-ui').catch(() => {});
                const menu = new LanguageMenu(page);
                fact('f3 Change Language menu', await menu.read());
                await menu.openUserMenu();
                record('f3-change-language-menu', await screen(page));
                await shot(page, 'f3-change-language-menu').catch(() => {});
                await menu.closeUserMenu();
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        await close();
        fact('site languages at end', sql(app, 'select installed_locales, supported_locales from site'));
    }
});
