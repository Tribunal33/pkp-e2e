// Issue report docs/issues/U07-A7-settings-side-tab-reload-opens-first-tab.md
// (U07 A7): a manager who reloads or bookmarks a Settings page while on a side
// tab of any top tab but the first (Website › "Setup" › "Privacy Statement")
// gets the page's first tab ("Appearance" › "Theme") back, because the address
// names the side tab alone (`#privacy`). Takes the report's Steps through the
// screens on a dataset fleet freshly reset to PKP's default test dataset, as
// `rvaca` (the journal's, press's, server's manager). All three apps.
//
//   1-2. sign in as rvaca, Settings › Website
//   3.   "Setup", then "Privacy Statement": the address
//   4.   reload: the open tabs
//   5.   the same address opened in a new browser tab (a bookmark): the open tabs
//   controls: 6 Settings › Journal › "Contact" (a top tab) and a reload;
//   7 Website › "Appearance" › "Advanced" (a side tab of the first top tab) and a reload;
//   8 Workflow › "Review" › "Reviewer Guidance" (OJS, OMP) and a reload;
//   9 the typed address website#setup/privacy: the open tabs and the address after.
//
// MODE=nb (the fix's neighbour, run with the fix in and out): what the fix must
// leave alone: a top tab writes its own id alone and survives a reload
// (Journal › "Contact"; Website › "Setup", which opens on its first side tab),
// and an old bookmark naming the side tab alone (website#privacy) opens what it opened before.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u07b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u07b PROBE_AGENT=u07b node bin/probe.js all shared/playwright/checks/issues/settings-side-tab-reload-opens-first-tab/walk.js
// Neighbour:    MODE=nb PROBE_RUN=nb-in|nb-out in front of the same command.
// On 3.5:       PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, feature issues-u07b-3_5.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const mode = process.env.MODE || 'steps';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null, mode};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const settings = (p) => app.url(`/index.php/${app.contextPath}/management/settings/${p}`);
    const open = async (page, url) => {
        await page.goto(url);
        await idle(page);
    };
    const reload = async (page, tag) => {
        await page.reload();
        await idle(page);
        record(tag, await screen(page));
        await shot(page, tag).catch(() => {});
        return L.openTabs(page);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        if (mode === 'nb') {
            await open(page, settings('context'));
            fact('nb contact pressed', await L.pressTab(page, 'contact'));
            fact('nb contact after reload', await reload(page, 'nb-contact-reload'));
            await open(page, settings('website'));
            fact('nb website setup pressed', await L.pressTab(page, 'setup'));
            fact('nb website setup after reload', await reload(page, 'nb-setup-reload'));
            await open(page, settings('website') + '#privacy');
            record('nb-old-bookmark', await screen(page));
            fact('nb old bookmark website#privacy', await L.openTabs(page));
            return;
        }
        // 2-3
        await open(page, settings('website'));
        record('02-website', await screen(page));
        fact('2 website opens on', await L.openTabs(page));
        fact('3 setup pressed', await L.pressTab(page, 'setup'));
        fact('3 privacy pressed', await L.pressTab(page, 'privacy'));
        fact('3 open before reload', await L.openTabs(page));
        record('03-privacy', await screen(page));
        const address = page.url();
        fact('3 address', address);
        // 4
        fact('4 after reload', await reload(page, '04-reload'));
        // 5: a bookmark, opened in a new tab
        const p2 = await page.context().newPage();
        await p2.goto(address);
        await idle(p2);
        record('05-bookmark', await screen(p2));
        await shot(p2, '05-bookmark').catch(() => {});
        fact('5 bookmark opens', await L.openTabs(p2));
        await p2.close();
        // 6
        await open(page, settings('context'));
        fact('6 contact pressed', await L.pressTab(page, 'contact'));
        fact('6 contact after reload', await reload(page, '06-contact-reload'));
        // 7
        await open(page, settings('website'));
        fact('7 advanced pressed', await L.pressTab(page, 'advanced'));
        fact('7 advanced after reload', await reload(page, '07-advanced-reload'));
        // 8
        await open(page, settings('workflow'));
        const review = await L.pressTab(page, 'review');
        fact('8 review pressed', review);
        if (review.pressed) {
            fact('8 reviewer guidance pressed', await L.pressTab(page, 'reviewerGuidance'));
            fact('8 after reload', await reload(page, '08-guidance-reload'));
        }
        // 9
        await open(page, settings('website') + '#setup/privacy');
        record('09-typed-both', await screen(page));
        fact('9 typed #setup/privacy opens', await L.openTabs(page));
        fact('9 address after', await L.settledHash(page, '#setup/privacy'));
        await signOut(page);
    } finally {
        record('facts', facts);
        await close();
    }
});
