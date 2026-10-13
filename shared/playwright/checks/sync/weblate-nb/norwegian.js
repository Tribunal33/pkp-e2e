// Weblate language-data `1d5b84f67d` (2026-09-30, "prefer nb for Norwegian Bokmål"): Weblate's
// languages.csv names Norwegian Bokmål `nb`, no longer `nb_NO`. pkp-lib's `composer install`
// (ComposerScript::weblateFilesDownload) builds lib/pkp/lib/weblateLanguages/languages.json from that
// file's `main`, and Locale::getLocales()/isLocaleValid() keep only the locale folders whose name is in
// it, while the apps' Norwegian folders stay `nb_NO` (3.5's I9707_WeblateUILocales renamed `nb` to
// `nb_NO` to match Weblate then). A lead of the housekeeping session (U56 C56-3), worked by the daily
// sync of 2026-10-13.
//
// The same app code on both sides; only the data file differs:
//   DATA=old  languages.json as built before 2026-09-30 (today's file with `nb` named `nb_NO` again)
//   DATA=new  today's file, as every `composer install` since 2026-09-30 writes it
// STEP=install (DATA=old, on a freshly loaded dataset): the site administrator installs Norwegian
// Bokmål through Administration › Site Settings › Languages › "Install Locale"; the site and the
// journal then offer it (site and journal locale settings written in SQL, the grid's "Enable" and
// Website › Languages in the screens); the read below.
// STEP=read: the reads only (an install already using Norwegian, now on today's file).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset --reset --apps ojs
// Run:          DATA=old STEP=install PROBE_FEATURE=<f> PROBE_AGENT=<id> node bin/probe.js ojs <this>
//               DATA=new STEP=read    PROBE_FEATURE=<f> PROBE_AGENT=<id> node bin/probe.js ojs <this>
// Fixed when DATA=new offers "Norwegian" in "Install Locale" and its `read` matches DATA=old's.
// Fix tried: fix.diff (lib/pkp: the download pinned to language-data tag 2026.10), then `composer run-script
// weblateFilesDownload` in lib/pkp and DATA=new STEP=read: settings 200, `/nb_NO` served again.
// Facts: .reports/<feature>/<id>/facts-<DATA>-<STEP>-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, idle, sql, serverLog, shot, outFile} = require('../../../probe');

const DATA = process.env.DATA || 'new';
const STEP = process.env.STEP || 'read';
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

async function adminLanguages(page, app, facts) {
    const r = await page.goto(app.url('/index.php/index/en/admin/settings#languages'));
    facts.adminSettingsStatus = r && r.status();
    await idle(page);
    const tab = page.getByRole('tab', {name: 'Languages'});
    if (await tab.count()) await tab.first().click();
    await page.waitForTimeout(3_000);
    await idle(page);
    const grid = page.locator('#languageGridContainer');
    facts.languagesTab = flat(await grid.innerText().catch(() => null), 1200);
    await shot(page, `admin-languages-${DATA}-${STEP}`);
}

async function installForm(page, facts) {
    const link = page.locator('#languageGridContainer a', {hasText: 'Install Locale'}).first();
    if (!(await link.count())) {
        facts.installLocale = 'no "Install Locale" link';
        return null;
    }
    await link.click();
    const form = page.locator('#installLanguageForm');
    await form.waitFor({timeout: 30_000});
    const labels = await form.locator('label').allInnerTexts();
    facts.installOffered = labels.length;
    facts.installNorwegian = labels.map((l) => flat(l, 120)).filter((l) => /norw|bokm|nynorsk/i.test(l));
    return form;
}

async function reader(page, app, facts, locale) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/${locale}`));
    await idle(page);
    facts[`home_${locale}`] = {
        status: r && r.status(),
        url: page.url(),
        htmlLang: await page.locator('html').getAttribute('lang').catch(() => null),
        nav: flat(await page.locator('.pkp_navigation_user, nav').first().innerText().catch(() => null), 200),
        languageBlock: flat(await page.locator('.block_language, [class*="language"]').first().innerText().catch(() => null), 200),
        title: flat(await page.title(), 120),
    };
    await shot(page, `home-${locale}-${DATA}-${STEP}`);
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('norwegian.js runs on a dataset fleet');
    const file = path.join(app.root, 'lib/pkp/lib/weblateLanguages/languages.json');
    const original = fs.readFileSync(file, 'utf8');
    const facts = {app: app.name, data: DATA, step: STEP};
    const log = serverLog(app), from = log.mark();
    try {
        const langs = JSON.parse(original);
        if (DATA === 'old') {
            const out = {};
            for (const [k, v] of Object.entries(langs)) out[k === 'nb' ? 'nb_NO' : k] = k === 'nb' ? 'Norwegian Bokmål (Norway)' : v;
            fs.writeFileSync(file, JSON.stringify(out));
        } else {
            fs.writeFileSync(file, original); // a new mtime: the app's cache key changes
        }
        facts.fileNorwegian = Object.keys(JSON.parse(fs.readFileSync(file, 'utf8'))).filter((k) => /^(nb|no|nn)(_|$)/.test(k));
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await adminLanguages(page, app, facts);
            const form = await installForm(page, facts);
            if (STEP === 'install') {
                if (!form) throw new Error('no install form');
                await form.locator('input[type=checkbox][value="nb_NO"]').check();
                await form.getByRole('button', {name: 'Save'}).click();
                await page.waitForTimeout(3_000);
                await idle(page);
                facts.installedAfterSave = sql(app, 'select installed_locales from site');
                sql(app, `update site set supported_locales='["en","fr_CA","nb_NO"]'`);
                for (const s of ['supportedLocales', 'supportedFormLocales', 'supportedSubmissionLocales']) {
                    sql(app, `update journal_settings set setting_value='["en","fr_CA","nb_NO"]' where setting_name='${s}'`);
                }
                fs.utimesSync(file, new Date(), new Date());
                await adminLanguages(page, app, facts);
            } else if (form) {
                await page.keyboard.press('Escape');
            }
            facts.site = sql(app, 'select installed_locales, supported_locales from site');
            const ctx = await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website#setup/languages`));
            await idle(page);
            await page.waitForTimeout(2_000);
            facts.websiteLanguages = {
                status: ctx && ctx.status(),
                text: flat(await page.locator('#languages, [id*="languages"]').first().innerText().catch(() => null), 800),
            };
            await shot(page, `website-languages-${DATA}-${STEP}`);
        } finally {
            await close();
        }
        const anon = await launch(app);
        try {
            await reader(anon.page, app, facts, 'nb_NO');
            await reader(anon.page, app, facts, 'en');
        } finally {
            await anon.close();
        }
    } finally {
        if (DATA === 'old') fs.writeFileSync(file, original);
        facts.serverLog = log.since(from).slice(0, 30).map((l) => l.slice(0, 400));
        fs.writeFileSync(outFile(`facts-${DATA}-${STEP}-${app.name}.json`), JSON.stringify(facts, null, 2));
        console.log('[fact]', JSON.stringify(facts).slice(0, 3000));
    }
});
