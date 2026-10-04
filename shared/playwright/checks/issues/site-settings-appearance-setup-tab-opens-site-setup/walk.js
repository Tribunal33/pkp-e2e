// Issue report docs/issues/U60-A7-appearance-setup-tab-opens-site-setup.md (U60 A7): on
// Administration › Site Settings, the "Appearance" side tab "Setup" has the same id, `setup`, as
// the "Site Setup" top tab, so an address naming it (the browser's Back button to it, and, once
// pkp-e2e#784's fix writes `#appearance/setup`, a reload) opens "Site Setup" instead. Takes the
// report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as `admin`. All three apps.
//
//   0.    Administration › Hosted Journals › "Create Journal" (a second context, so the page
//         shows every tab: U60 Rule 2)
//   1-2.  Site Settings
//   3-6.  "Appearance", side tab "Setup", side tab "Theme", Back: the open tabs
//   7.    control: "Announcements" › "Announcements", "Announcement Types", Back
//   8-11. the reload group (pkp-e2e#784 on this page): "Appearance" › "Theme", "Appearance" ›
//         "Setup", "Announcements" › "Announcement Types", "Plugins" › "Plugin Gallery", each
//         pressed, then the page reloaded
//
// MODE=typed: the addresses `#appearance/theme` and `#appearance/setup` typed (what a reload reads
// once pkp-e2e#784 writes two-part addresses).
// MODE=nb (the fix's neighbour, run with the fix in and out): what the fix must leave alone:
// the "Site Setup" top tab and its side tab "Settings" pressed and reloaded, the typed
// `#setup/settings`, and the "Appearance" › "Setup" form still shown under its tab.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u60e --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u60e PROBE_AGENT=u60e node bin/probe.js all shared/playwright/checks/issues/site-settings-appearance-setup-tab-opens-site-setup/walk.js
// Neighbour:    MODE=nb PROBE_RUN=nb-in|nb-out in front of the same command.
// On 3.5:       PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, feature issues-u60e-3_5.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');
const {createContext, WORDS} = require('../all-dates-error-nothing-published/lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const mode = process.env.MODE || 'steps';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const settingsUrl = app.url('/index.php/index/en/admin/settings');
    const open = async (page, hash = '') => {
        await page.goto(settingsUrl + hash);
        await idle(page);
    };
    const snap = async (page, tag) => {
        record(tag, await screen(page));
        await shot(page, tag).catch(() => {});
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        // 0: the second context, on screen
        const noun = WORDS[app.name].noun;
        fact('0 create second context', await createContext(page, app, {
            name: `u60e Second ${noun}`, initials: 'U60E', path: 'u60esecond', email: 'u60e@mailinator.com',
        }).catch((e) => `failed: ${String(e.message).slice(0, 200)}`));
        // 1-2
        await open(page);
        await snap(page, '02-site-settings');
        fact('2 opens on', await L.openTabs(page));
        fact('2 ids', await L.idFacts(page));
        if (mode === 'typed') {
            // The two-part addresses pkp-e2e#784's fix makes the page write, typed on today's code
            // (the page reads an address the same way on a reload and when it is typed).
            for (const h of ['#appearance/theme', '#appearance/setup']) {
                await open(page, h);
                fact(`typed ${h}`, await L.openTabs(page));
            }
            await signOut(page);
            return;
        }
        if (mode === 'nb') {
            fact('nb site setup pressed', await L.pressTop(page, 'Site Setup'));
            fact('nb site setup after reload', await L.reload(page));
            fact('nb settings pressed', await L.pressSide(page, 'Settings'));
            fact('nb settings after reload', await L.reload(page));
            await open(page, '#setup/settings');
            fact('nb typed #setup/settings', await L.openTabs(page));
            fact('nb appearance pressed', await L.pressTop(page, 'Appearance'));
            fact('nb appearance setup pressed', await L.pressSide(page, 'Setup'));
            await snap(page, 'nb-appearance-setup');
            fact('nb appearance setup form', await page.evaluate(() => {
                const panel = document.querySelector('.pkpTabs > [id="appearance"]');
                const open = panel && panel.querySelector('.pkpTabs > .pkpTab:not([hidden])');
                return open ? {id: open.id, labels: [...open.querySelectorAll('label, legend')].map((l) => l.innerText.trim()).filter(Boolean).slice(0, 6)} : null;
            }));
            await signOut(page);
            return;
        }
        // 3-6: Back
        fact('3 appearance pressed', await L.pressTop(page, 'Appearance'));
        fact('4 side setup pressed', await L.pressSide(page, 'Setup'));
        await snap(page, '04-appearance-setup');
        fact('5 side theme pressed', await L.pressSide(page, 'Theme'));
        fact('6 after back', await L.back(page));
        await snap(page, '06-back');
        // 7: control, Back on Announcements
        fact('7 announcements pressed', await L.pressTop(page, 'Announcements'));
        fact('7 side announcements pressed', await L.pressSide(page, 'Announcements'));
        fact('7 side types pressed', await L.pressSide(page, 'Announcement Types'));
        fact('7 after back', await L.back(page));
        await snap(page, '07-back-control');
        // 8-11: reload on each side tab
        const reloadOn = async (n, top, side) => {
            await open(page);
            fact(`${n} ${top} pressed`, await L.pressTop(page, top));
            fact(`${n} ${side} pressed`, await L.pressSide(page, side));
            fact(`${n} after reload`, await L.reload(page));
            await snap(page, `${n}-reload`);
        };
        await reloadOn('08', 'Appearance', 'Theme');
        await reloadOn('09', 'Appearance', 'Setup');
        await reloadOn('10', 'Announcements', 'Announcement Types');
        await reloadOn('11', 'Plugins', 'Plugin Gallery');
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
