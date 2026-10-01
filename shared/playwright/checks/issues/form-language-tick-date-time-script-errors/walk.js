/**
 * U57 A5 — ticking a language's "Forms" box on Settings › Website makes the
 * page's script fail in the "Date & Time" form.
 *
 * Kept walk for docs/issues/U57-A5-form-language-tick-date-time-script-errors.md.
 * Runs on a dataset fleet (PKP's default test dataset), reset before each walk:
 *
 *   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all \
 *     shared/playwright/checks/issues/form-language-tick-date-time-script-errors/walk.js [save]
 *
 * Default: the report's steps 1 to 6. `rvaca` unticks "Forms" on the French
 * row, reloads, ticks it again, then opens "Setup" › "Date & Time" and
 * presses the French button; the browser's script errors are counted per step.
 * `save`: steps 1 to 7 (the same tick, then "Date & Time" › "Save"
 * before any reload, with the stored formats read before and after), a
 * reload with the French choices read, and an untick and tick of "UI" on
 * the French row (no error).
 */
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const NEIGHBOUR = process.argv.includes('save');
const CONTEXT = 'publicknowledge';
const FR = 'fr_CA';

/** The page's script errors since the last call, as messages. */
function errorLog(page) {
    let errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
        if (m.type() === 'error') errors.push(`console: ${m.text().split('\n').slice(0, 4).join(' | ')}`);
    });
    return () => {
        const out = errors;
        errors = [];
        return out;
    };
}

/** The "Date & Time" form's option groups as shown for the visible language(s). */
async function readDateTime(page) {
    return page.evaluate(() => {
        const panel = document.getElementById('dateTime');
        if (!panel) return null;
        const form = panel.querySelector('form');
        const locales = [...form.querySelectorAll('.pkpFormLocales button')].map((b) => ({
            text: b.innerText.replace(/\s+/g, ' ').trim(),
            pressed: b.getAttribute('aria-pressed'),
        }));
        const groups = [...form.querySelectorAll('.pkpFormGroup__locale')]
            .filter((el) => el.offsetParent !== null)
            .map((el) => {
                const fs = el.querySelector('fieldset');
                if (!fs) return null;
                const radios = [...fs.querySelectorAll('input[type=radio]')];
                return {
                    legend: fs.querySelector('legend')?.innerText.replace(/\s+/g, ' ').trim(),
                    radios: radios.length,
                    checked: radios.findIndex((r) => r.checked),
                    choices: [...fs.querySelectorAll('label.pkpFormField--options__option')].map((l) =>
                        l.innerText.replace(/\s+/g, ' ').trim()
                    ),
                };
            })
            .filter(Boolean);
        return {locales, groups};
    });
}

async function openDateTime(page) {
    const setup = page.locator('#setup-button').first();
    if ((await setup.getAttribute('aria-selected')) !== 'true') await setup.click();
    const side = page.locator('#dateTime-button:visible').first();
    await side.click();
    await page.locator('[id="dateTime"] form').first().waitFor({state: 'visible'});
    await idle(page);
}

/** Press the form's French language button (the one not English), if any. */
async function pressFrench(page) {
    const buttons = page.locator('[id="dateTime"] form .pkpFormLocales button');
    const n = await buttons.count();
    for (let i = 0; i < n; i++) {
        const t = (await buttons.nth(i).innerText()).trim();
        if (/fran|french/i.test(t)) {
            await buttons.nth(i).click();
            await idle(page);
            return t;
        }
    }
    return null;
}

async function dbFormats(app) {
    const {sql} = require('../../../probe');
    const t = app.contextTables;
    return sql(
        app,
        `select setting_name, locale, setting_value from ${t.settings} where ${t.id} = (select ${t.id} from ${t.table} where path = '${CONTEXT}') and setting_name in ('dateFormatLong','dateFormatShort','timeFormat','datetimeFormatLong','datetimeFormatShort','supportedFormLocales','supportedLocales') order by setting_name, locale`
    );
}

forEachApp(async (app) => {
    const {JournalLanguagesTab} = require('../../../pages/LanguagesPages.js');
    const {page, close} = await launch(app);
    const take = errorLog(page);
    const facts = {app: app.name, neighbour: NEIGHBOUR, steps: {}};
    try {
        // 1. sign in as the manager
        await signIn(page, 'rvaca');
        // 2. Settings › Website › Setup › Languages
        const tab = new JournalLanguagesTab(page, CONTEXT);
        await tab.goto();
        record('01-languages', await screen(page));
        facts.steps['1-2'] = take();
        // 3. untick "Forms" on the French row
        const untick = await tab.pressWebsite(FR, 'formLocale');
        await idle(page);
        facts.steps['3-untick'] = {status: untick.response.status(), alerts: untick.alerts, errors: take()};
        record('02-forms-unticked', await screen(page));
        // 4. reload, Setup › Languages again
        await tab.goto();
        facts.steps['4-reload'] = take();
        // 5. tick "Forms" on the French row again
        const tick = await tab.pressWebsite(FR, 'formLocale');
        await idle(page);
        const s5 = await screen(page);
        facts.steps['5-tick'] = {status: tick.response.status(), alerts: tick.alerts, notices: s5.notices, errors: take()};
        record('03-forms-ticked', s5);
        // 6. Setup › Date & Time, press French
        await openDateTime(page);
        facts.dateTimeEnglish = await readDateTime(page);
        facts.frenchButton = await pressFrench(page);
        facts.dateTimeFrench = await readDateTime(page);
        record('04-date-time-french', await screen(page));
        facts.steps['6-date-time'] = take();

        if (NEIGHBOUR) {
            // N1. "Save" on Date & Time before a reload
            facts.dbBeforeSave = await dbFormats(app);
            const saved = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET');
            await page.locator('[id="dateTime"] form').getByRole('button', {name: 'Save', exact: true}).click();
            const r = await saved;
            await idle(page);
            facts.saveStatus = r.status();
            facts.steps['N1-save'] = take();
            facts.dbAfterSave = await dbFormats(app);
            // N2. reload: French choices shown with the journal's formats
            await tab.goto();
            await openDateTime(page);
            await pressFrench(page);
            facts.dateTimeFrenchAfterReload = await readDateTime(page);
            record('05-date-time-french-reloaded', await screen(page));
            facts.steps['N2-reload'] = take();
            // N3. untick and tick "UI" on the French row
            await tab.goto();
            const u1 = await tab.pressWebsite(FR, 'uiLocale');
            await idle(page);
            const u2 = await tab.pressWebsite(FR, 'uiLocale');
            await idle(page);
            facts.steps['N3-ui'] = {status: [u1.response.status(), u2.response.status()], alerts: [...u1.alerts, ...u2.alerts], errors: take()};
        }
    } finally {
        record(NEIGHBOUR ? 'facts-neighbour' : 'facts', facts);
        await close();
    }
});
