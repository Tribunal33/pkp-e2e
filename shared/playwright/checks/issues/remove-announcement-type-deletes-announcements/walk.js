// Issue report docs/issues/U12-A1-remove-announcement-type-deletes-announcements.md (U12 A1):
// removing an announcement type deletes every announcement of that type, after a dialog that
// asks only about "this item".
// Takes the report's Steps on PKP's default test dataset, all three apps:
//   1. rvaca signs in
//   2. Settings › Website › Setup › "Announcements": "Enable announcements", "Save"
//   3. Announcements › "Announcement Types": add "u12r1 Event" and "u12r1 News"
//   4. reload, "Announcements" tab
//   5–7. add "u12r1 Workshop" and "u12r1 Conference" (type "u12r1 Event"), "u12r1 Newsletter" (type "u12r1 News")
//   8. signed out: the public Announcements page, "u12r1 Workshop"'s page
//   9. rvaca: "Announcement Types", "u12r1 Event" › "Remove": the dialog, "OK"
//   10. the "Announcements" tab, then after a reload
//   11. signed out: the public Announcements page, "u12r1 Workshop"'s address
// NB=1 is the neighbour check for a fix trial, alone: deleting a whole journal (press, server)
// must still delete its announcements, typed ones included. As admin: Administration › Hosted
// Journals › "Create Journal" "u12r1 Scratch" (path u12r1nb), announcements on, a type
// "u12r1 Event", "u12r1 Workshop" of that type and "u12r1 Plain" without; then the journal's
// "Remove", "OK"; the database read for what is left of its announcements and types.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/remove-announcement-type-deletes-announcements/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');
const L = require('./lib');
const {enableAnnouncements} = require('../sitemap-lists-expired-announcements/lib');
const {createContext: createContextOnScreen} = require('../all-dates-error-nothing-published/lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${String(JSON.stringify(v)).slice(0, 2000)}`);
        return v;
    };
    const step = async (k, fn) => { try { return fact(k, await fn()); } catch (e) { return fact(k, {error: L.flat(e.message, 400)}); } };
    const {table, id: idCol} = app.contextTables;
    const ctxId = (p) => Number(String(sql(app, `select ${idCol} from ${table} where path = '${p}'`)).trim()) || null;
    const rows = (cid) => String(sql(app, `select a.announcement_id, coalesce(a.type_id::text, 'null'), s.setting_value from announcements a left join announcement_settings s on s.announcement_id = a.announcement_id and s.setting_name = 'title' and s.locale = 'en' where a.assoc_id = ${cid} order by 1`)).trim().split('\n').filter(Boolean);
    const typeRows = (cid) => String(sql(app, `select type_id from announcement_types where context_id = ${cid} order by 1`)).trim().split('\n').filter(Boolean);
    const {page, close} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const fails = [];
    page.on('response', (r) => { if (r.status() >= 500) fails.push(`${r.status()} ${L.rel(r.url())}`); });
    try {
        if (nb) {
            const p = 'u12r1nb';
            const ctx = {...app, contextPath: p};
            await signIn(page, 'admin');
            await step('nb create journal', () => createContextOnScreen(page, app, {name: 'u12r1 Scratch', initials: 'U12R1', path: p, email: 'u12r1nb@mailinator.com'}));
            const cid = fact('nb context id', ctxId(p));
            await step('nb enable announcements', () => enableAnnouncements(ctx, page));
            await step('nb open Announcements', () => L.openManagement(app, page, p));
            await step('nb types tab', () => L.openTab(page, 'Announcement Types'));
            await step('nb add type', () => L.addType(page, 'u12r1 Event'));
            await step('nb reload', () => L.openManagement(app, page, p));
            await step('nb add typed', () => L.addAnnouncement(page, {title: 'u12r1 Workshop', type: 'u12r1 Event'}));
            await step('nb add plain', () => L.addAnnouncement(page, {title: 'u12r1 Plain'}));
            fact('nb db before', {announcements: rows(cid), types: typeRows(cid)});
            const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
            const {WORDS} = require('../all-dates-error-nothing-published/lib');
            const hosted = new HostedJournalsPage(page, WORDS[app.name]);
            await step('nb remove journal', async () => {
                await page.goto(app.url('/index.php/index/en/admin/contexts'));
                await hosted.expectOpen();
                const dialog = await hosted.openRemove(p);
                const text = L.flat(await dialog.root.innerText());
                const r = await hosted.confirmRemove(dialog);
                return {dialog: text, status: r.status(), paths: await hosted.paths()};
            });
            record('nb-hosted', await screen(page));
            fact('nb db after', {context: ctxId(p), announcements: rows(cid), types: typeRows(cid)});
        } else {
            const cid = ctxId(app.contextPath);
            // 1
            await signIn(page, 'rvaca');
            // 2
            await step('2 enable announcements', () => enableAnnouncements(app, page));
            // 3
            await step('3 open Announcements', () => L.openManagement(app, page));
            await step('3 types tab', () => L.openTab(page, 'Announcement Types'));
            await step('3 add "u12r1 Event"', () => L.addType(page, 'u12r1 Event'));
            await step('3 add "u12r1 News"', () => L.addType(page, 'u12r1 News'));
            record('3-types', await screen(page));
            // 4
            await step('4 reload', () => L.openManagement(app, page));
            // 5–7
            const ws = await step('5 add "u12r1 Workshop"', () => L.addAnnouncement(page, {title: 'u12r1 Workshop', type: 'u12r1 Event'}));
            await step('6 add "u12r1 Conference"', () => L.addAnnouncement(page, {title: 'u12r1 Conference', type: 'u12r1 Event'}));
            await step('7 add "u12r1 Newsletter"', () => L.addAnnouncement(page, {title: 'u12r1 Newsletter', type: 'u12r1 News'}));
            record('7-list', await screen(page));
            fact('db before', rows(cid));
            // 8
            await signOut(page);
            await step('8 public list before', () => L.readPublicList(app, page));
            record('8-public-before', await screen(page));
            if (ws && ws.view) await step('8 Workshop page before', () => L.follow(app, page, ws.view));
            // 9
            await signIn(page, 'rvaca');
            await step('9 open Announcements', () => L.openManagement(app, page));
            await step('9 types tab', () => L.openTab(page, 'Announcement Types'));
            let dlg = null;
            await step('9 Remove dialog', async () => { const o = await L.openRemoveType(page, 'u12r1 Event'); dlg = o.dialog; return o.read; });
            record('9-dialog', await screen(page));
            if (dlg) await step('9 OK', () => L.confirmOk(page, dlg));
            const s9 = await screen(page);
            fact('9 notices', s9.notices);
            fact('9 types after', await L.typeNames(page).catch((e) => ({error: L.flat(e.message)})));
            record('9-after', s9);
            // 10
            await step('10 Announcements tab, no reload', async () => { await L.openTab(page, 'Announcements'); return L.listTitles(page); });
            record('10-list-stale', await screen(page));
            await step('10 after reload', async () => { await L.openManagement(app, page); return L.listTitles(page); });
            record('10-list-reloaded', await screen(page));
            fact('db after', rows(cid));
            // 11
            await signOut(page);
            await step('11 public list after', () => L.readPublicList(app, page));
            record('11-public-after', await screen(page));
            if (ws && ws.view) await step('11 Workshop address after', () => L.follow(app, page, ws.view));
        }
        await idle(page).catch(() => {});
        fact('errors', {script: errs, server: fails});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
