// Issue report docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md (U35 OPS4):
// the confirmation after "Notify" on the Participants panel shows in the
// stage's own "Notification" box instead of at the top right of the page.
// Takes the report's Steps through the screens on a dataset fleet (PKP's
// default test dataset), freshly reset:
//   as dbarnes, on each submission of CASE: the row menu's "Notify" with the
//   first predefined message, TRIES times; on OPS also "Assign" (Moderator
//   Minoti Inoue) once and "Edit" (the "Permissions" box flipped) EDITS times.
// After each press it reads where the notice showed (a notice at the top
// right, the stage's "Notification" box) and which of the page's two
// fetches of pending notices carried it: the page's own (GET) or the stage
// box's (POST).
// Run: PROBE_FEATURE=issues-w41 PROBE_AGENT=w41 node bin/probe.js all shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w41 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w41-3_5 and PROBE_RUN=r35)
// On OJS submission 3 a neighbour check follows: "Assign" of a copyeditor with
// "Permissions" ticked still refreshes the Copyediting entry's own box.
// TRIES (default 10) and EDITS (default 5) in the environment change the counts.
const {forEachApp, launch, signIn, record, shot, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';
const TRIES = Number(process.env.TRIES || 10);
const EDITS = Number(process.env.EDITS || 5);

const CASE = {
    ojs: [
        {sid: 3, stage: 'Copyediting', notify: 'Maria Fritz', neighbour: {role: 'Copyeditor', search: 'Vogt', name: 'Sarah Vogt'}},
        {sid: 5, stage: 'Production', notify: 'Graham Cox'},
    ],
    omp: [{sid: 4, stage: 'Production', notify: 'Graham Cox'}],
    ops: [{sid: 1, stage: 'Production', notify: 'Carlo Corino', assign: {role: 'Moderator', search: 'Inoue', name: 'Minoti Inoue'}}],
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const SP = require('../../../pages/StageParticipantsPages.js');
    const facts = {app: app.name, line: app.line || 'main', run: RUN, cases: []};
    const fact = (k, v) => console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);

    const {page, close} = await launch(app);
    // The browser's own fetches of pending notices, with what each answered.
    // Times are ms since the press's own request (save-participant / send-notification) was sent.
    let fetches = [];
    let t0 = Date.now();
    const isFetch = (u) => /fetchNotification|fetch-notification/.test(u);
    const isPress = (u) => /send-notification|save-participant/.test(u);
    page.on('request', (req) => {
        if (isPress(req.url())) t0 = Date.now();
        if (!isFetch(req.url())) return;
        req._w41 = {sent: Date.now() - t0};
    });
    page.on('response', async (r) => {
        const req = r.request();
        if (isPress(r.url())) {
            fetches.push({press: r.url().replace(/.*\$\$\$call\$\$\$\//, '').replace(/\?.*/, ''), answered: Date.now() - t0});
            return;
        }
        if (!isFetch(r.url())) return;
        let body = '';
        try {
            body = await r.text();
        } catch (e) {
            body = `<unreadable: ${e.message}>`;
        }
        const post = req.postData() || '';
        fetches.push({
            url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*/, ''),
            method: req.method(),
            requestOptions: post ? (post.match(/name="requestOptions\[[^"]+\]"/g) || []).map((s) => s.slice(6, -1)).join(',') : null,
            sent: req._w41 ? req._w41.sent : null,
            answered: Date.now() - t0,
            status: r.status(),
            notices: (body.match(/(Notification sent to users\.|User added as a stage participant\.|The stage assignment has been changed\.)/g) || []),
        });
    });

    const toast = page.locator('.app__notifications .pkpNotification');
    const box = page.locator('[data-cy="workflow-primary-items"] h3').filter({hasText: /^\s*Notification\s*$/});

    // Where the notice of one press showed: read for 3 s after the press.
    async function landing(expectText) {
        const seen = {topRight: null, box: null};
        const end = Date.now() + 3000;
        while (Date.now() < end) {
            if (!seen.topRight && (await toast.count())) {
                const t = flat(await toast.allInnerTexts().then((a) => a.join(' | ')));
                if (t && t.includes(expectText)) seen.topRight = t;
            }
            if (!seen.box && (await box.count())) {
                seen.box = flat(await box.first().locator('xpath=..').innerText());
            }
            await sleep(100);
        }
        return seen;
    }

    // Let a top-right notice expire before the next row menu (it covers the panel's top).
    async function clearToasts() {
        await page.mouse.move(10, 890);
        await toast.first().waitFor({state: 'detached', timeout: 10_000}).catch(() => {});
    }

    async function pressAndRead(label, expectText, act) {
        fetches = [];
        await act();
        const seen = await landing(expectText);
        await idle(page);
        const where = seen.box && seen.box.includes(expectText) ? (seen.topRight ? 'both' : 'box') : seen.topRight ? 'top right' : 'nowhere';
        const row = {label, where, topRight: seen.topRight, box: seen.box, fetches: fetches.slice()};
        fact(label, {
            where,
            fetches: row.fetches.map((f) =>
                f.press
                    ? `[${f.press} answered ${f.answered}]`
                    : `${f.method} ${f.url.replace(/.*index\.php/, '')}(${f.requestOptions || ''}) sent ${f.sent} answered ${f.answered}: ${f.notices[0] || '-'}`,
            ),
        });
        if (where === 'box' || where === 'both') await shot(page, `${label}-${RUN}`);
        await clearToasts();
        return row;
    }

    try {
        await signIn(page, 'dbarnes');
        for (const c of CASE[app.name]) {
            const panel = new SP.ParticipantsPanel(page, app.contextPath);
            await panel.goto(c.sid);
            await idle(page);
            const out = {sid: c.sid, stage: c.stage, presses: []};
            out.primaryHeads = flat(await page.locator('[data-cy="workflow-primary-items"]').innerText(), 300);
            out.boxMounted = await page.locator('[data-cy="workflow-primary-items"] > *').count();
            fact(`s${c.sid}.primary`, out.primaryHeads);

            // "Notify", TRIES times.
            for (let i = 1; i <= TRIES; i++) {
                out.presses.push(
                    await pressAndRead(`s${c.sid}-notify-${i}`, 'Notification sent to users.', async () => {
                        const win = await panel.openNotify(c.notify);
                        const opts = (await win.templateOptions()).filter((t) => t && !t.startsWith('Choose'));
                        if (i === 1) out.templates = opts;
                        await win.chooseTemplate(opts[0]);
                        await win.send();
                    }),
                );
            }

            if (c.assign) {
                // "Assign" once.
                out.presses.push(
                    await pressAndRead(`s${c.sid}-assign`, 'User added as a stage participant.', async () => {
                        const win = await panel.openAssign();
                        await win.chooseRole(c.assign.role);
                        await win.search(c.assign.search);
                        await win.choosePerson(c.assign.name);
                        await win.ok();
                    }),
                );
                // "Edit", EDITS times, the "Permissions" box flipped each time.
                for (let i = 1; i <= EDITS; i++) {
                    out.presses.push(
                        await pressAndRead(`s${c.sid}-edit-${i}`, 'The stage assignment has been changed.', async () => {
                            await panel.row(c.assign.name).first().waitFor({timeout: 30_000});
                            const win = await panel.openEdit(c.assign.name);
                            const b = win.metadataBox();
                            await b.setChecked(!(await b.isChecked()));
                            await win.ok();
                        }),
                    );
                }
            }
            if (c.neighbour) {
                // Neighbour (the fix must keep it): the stage's own box still
                // refreshes after a change, here "Assign" of a copyeditor with
                // "Permissions" ticked (pkp/pkp-lib#10701's case).
                const boxText = async () => flat(await page.locator('[data-cy="workflow-primary-items"]').innerText(), 200);
                out.neighbourBefore = await boxText();
                const row = await pressAndRead(`s${c.sid}-neighbour-assign`, 'User added as a stage participant.', async () => {
                    const win = await panel.openAssign();
                    await win.chooseRole(c.neighbour.role);
                    await win.search(c.neighbour.search);
                    await win.choosePerson(c.neighbour.name);
                    await win.metadataBox().check();
                    await win.ok();
                });
                out.presses.push(row);
                await idle(page);
                out.neighbourAfter = await boxText();
                fact(`s${c.sid}.neighbour`, {before: out.neighbourBefore, after: out.neighbourAfter});
            }
            out.tally = out.presses.reduce((t, p) => {
                const k = p.label.replace(/^s\d+-/, '').replace(/-\d+$/, '');
                t[k] = t[k] || {};
                t[k][p.where] = (t[k][p.where] || 0) + 1;
                return t;
            }, {});
            fact(`s${c.sid}.tally`, out.tally);
            facts.cases.push(out);
        }
    } finally {
        record(`facts-${RUN}`, facts);
        await close();
    }
});
