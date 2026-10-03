// U12 OMP2 (spec docs/specs/U12-announcements.md): a press's home page carries the site's
// announcements block while the press shows none of its own on its home page; a journal
// and a preprint server in the same state show no block (the control).
// Takes the report's Steps on PKP's default test dataset (OMP; OJS and OPS as the control):
//   1–2  admin: Administration › Hosted Presses › "Create Press" (the second context brings
//        the Site Settings' "Announcements" tab)
//   3    Site Settings › Announcements › Settings: "Enable announcements", "Display on Homepage" 1
//   4    side tab "Announcements" › "Add Announcement" "u12r8 Site maintenance"
//   5    signed out: the site's home page (the site's own block)
//   6–7  the dataset context's home page (its announcements off), and "Read More"
//   8–10 admin: the context's "Enable announcements" on, "Display on Homepage" empty; its home
//        page and "Read More" signed out
//   11–12 the context's own count 1 and "u12r8 Press notice"; its home page signed out
// NB=1 is the neighbour check for a fix trial, alone: steps 1–4, the site's home page and the
// second context's home page (announcements off) signed out, then the dataset context with
// a count of 1 and its own announcement: its home page must show its own alone and the
// site's home page the site's.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-home-shows-site-announcements/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for a fix trial)
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib');

const SITE_TITLE = 'u12r8 Site maintenance';
const OWN_TITLE = 'u12r8 Press notice';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: L.flat(e.message, 400)}); } };
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    const readMore = (home) => (home && home.links ? home.links.find((l) => /announcement\/view\/\d+/.test(l)) : null);
    try {
        // 1–2
        await signIn(page, 'admin');
        await step('2 create second context', () => L.createSecondContext(page, app, {
            name: `u12r8 Second ${L.WORDS[app.name].noun}`, initials: 'U12R8', path: 'u12r8second', email: 'u12r8second@mailinator.com',
        }));
        // 3
        await step('3 site settings', () => L.siteEnable(page, {count: 1}));
        record('o3-site-settings', await screen(page));
        // 4
        const site = await step('4 site announcement', () => L.siteAdd(page, {title: SITE_TITLE, shortDescription: 'Sunday morning.'}));
        record('o4-site-list', await screen(page));
        // 5
        await signOut(page);
        await step('5 site home', () => L.readHome(page, app, 'index'));
        if (nb) {
            await step('nb second context home (announcements off)', () => L.readHome(page, app, 'u12r8second'));
            await signIn(page, 'admin');
            await step('nb own count 1', () => L.contextSettings(page, ctx, {count: 1}));
            await step('nb own announcement', () => L.contextAdd(page, ctx, {title: OWN_TITLE, shortDescription: 'For the press.'}));
            await signOut(page);
            await step('nb context home (own count)', () => L.readHome(page, app, ctx));
            record('onb-home', await screen(page));
            await step('nb site home after', () => L.readHome(page, app, 'index'));
        } else {
            // 6–7
            const h6 = await step('6 context home (announcements off)', () => L.readHome(page, app, ctx));
            record('o6-home-off', await screen(page));
            if (readMore(h6)) await step('7 Read More', () => L.follow(app, page, readMore(h6)));
            // 8
            await signIn(page, 'admin');
            await step('8 context on, no count', () => L.contextSettings(page, ctx, {count: ''}));
            // 9–10
            await signOut(page);
            const h9 = await step('9 context home (on, no count)', () => L.readHome(page, app, ctx));
            record('o9-home-nocount', await screen(page));
            if (readMore(h9)) await step('10 Read More', () => L.follow(app, page, readMore(h9)));
            // 11–12 (control)
            await signIn(page, 'admin');
            await step('11 own count 1', () => L.contextSettings(page, ctx, {count: 1}));
            await step('11 own announcement', () => L.contextAdd(page, ctx, {title: OWN_TITLE, shortDescription: 'For the press.'}));
            await signOut(page);
            await step('12 context home (own count)', () => L.readHome(page, app, ctx));
            record('o12-home-own', await screen(page));
        }
        fact('site announcement id', site && site.id);
    } finally {
        fact('page errors', errs);
        fact('5xx responses', fails);
        record(nb ? 'omp2-nb-facts' : 'omp2-facts', facts);
        await close();
    }
});
