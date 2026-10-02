// U37 A31: an item "Auto-add at stage" makes keeps the template's recipient and sender placeholders.
// The report's steps through the screens, on PKP's default dataset, as dbarnes:
//   autoadd   OJS, OMP: Settings › Workflow › "Tasks and Discussions", "Auto-add at stage" on "Galleys Complete"
//             (Production Stage), "Yes"; the Copyediting submission (OJS 3, OMP 1) › "Send To Production",
//             "Record Decision"; "Production Tasks & Discussions" › "Galleys Complete": its first message.
//             OPS: "Add template" in Production Stage, "Galleys Complete u37r15" with a letter holding
//             {$recipientName}, {$submissionTitle}, {$contextName} and {$signature}; "Auto-add at stage" on it, "Yes";
//             ccorino submits the preprint "u37r15 auto-add"; dbarnes opens it and the item.
//   control   (the neighbour check of the fix, walked with it in and out) the same submission: "Add" › the same
//             template, renamed "Galleys Complete u37r15 (Add)", one participant ticked, "Save"; its first message
//             must keep the writer's name in the closing ("Kind regards, Daniel Barnes").
//   wayround  the auto-added item › "More Actions" › "Edit": two participants ticked, "Save"; its first message.
//   nowriter  (a neighbour of the fix) a manager's own "Add" without taking part: OJS 5, OPS 1 (OMP: the walk's
//             submission) › "Add" › "Galleys Complete" (OPS: "Galleys Complete u37r15"), named "Galleys Complete
//             u37r15 (no writer)", dbarnes unticked, two others ticked, "Save"; its first message.
//   tabs35    (3.5 only) Settings › Workflow: its tabs (3.5 has no task templates and no auto-add).
//
//   PROBE_FEATURE=issues-u37r15 PROBE_AGENT=u37r15 node bin/probe.js all shared/playwright/checks/issues/auto-added-item-letter-placeholders/walk.js
//   (3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u37r15-3_5 in front; the fix trial:
//   node bin/try-fix.js apply shared/playwright/checks/issues/auto-added-item-letter-placeholders/fix.diff, PROBE_RUN=fix.)
//   STEPS=autoadd narrows a walk to the named steps.
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');
const P = require('../preprint-assign-editor-template-empty/lib.js');

const WORDS = {
    ojs: {id: 3, template: 'Galleys Complete', person: 'dbuskins'},
    omp: {id: 1, template: 'Galleys Complete', person: 'dbuskins'},
    ops: {id: null, template: 'Galleys Complete u37r15', person: 'dbuskins'},
};
// The "no writer" neighbour: a submission at Production and two participants besides dbarnes.
const NOWRITER = {ojs: {id: 5, users: ['dbuskins', 'sberardo']}, omp: {id: null, users: ['dbuskins', 'aclark']}, ops: {id: 1, users: ['dbuskins', 'sberardo']}};
const OPS_LETTER = 'Dear {$recipientName}, galleys are ready for {$submissionTitle} at {$contextName}. Kind regards, {$signature}';
const PREPRINT = 'u37r15 auto-add';

forEachApp(async (app) => {
    const w = WORDS[app.name];
    const is35 = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main'};
    const log = (...a) => console.log(`[${app.name}]`, ...a);
    const only = (process.env.STEPS || '').split(',').filter(Boolean);
    let id = w.id;
    const step = async (name, fn) => {
        if (only.length && !only.includes(name)) return;
        if (is35 !== (name === 'tabs35')) return;
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        log(name, JSON.stringify(facts[name]));
    };
    const {page, close} = await launch(app);
    page.on('dialog', async (d) => {
        await d.accept().catch(() => {});
    });
    try {
        await signIn(page, 'dbarnes');

        await step('tabs35', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
            await idle(page);
            const s = await screen(page);
            record('settings-workflow-35', s);
            return {tabs: await page.getByRole('tab').allInnerTexts().then((t) => t.map((x) => L.flat(x, 60)))};
        });

        await step('autoadd', async () => {
            const out = {};
            if (app.name === 'ops') {
                out.templates = await L.addTemplate(page, app, w.template, OPS_LETTER);
            }
            out.box = await P.autoAdd(page, app, w.template);
            if (app.name === 'ops') {
                const {submitAs} = require('../editorial-submitter-no-acknowledgement/lib.js');
                const sub = await submitAs(page, app, 'ccorino', PREPRINT);
                id = sub.id;
                out.submitted = {id: sub.id, problems: sub.problems};
                await signIn(page, 'dbarnes');
            } else {
                out.decision = await L.sendToProduction(page, app, id);
            }
            const panel = await L.openPanel(page, app, id);
            out.item = await L.readItem(page, panel, w.template, 'autoadd-item');
            return out;
        });

        await step('control', async () => {
            const panel = await L.openPanel(page, app, id);
            const name = `${w.template} (Add)`.replace('Galleys Complete (Add)', 'Galleys Complete u37r15 (Add)');
            const out = await L.addFromTemplate(page, panel, w.template, name, [w.person], 'dbarnes');
            out.item = await L.readItem(page, panel, name, 'control-item');
            return out;
        });

        await step('wayround', async () => {
            const panel = await L.openPanel(page, app, id);
            const out = await L.editAddParticipants(page, panel, w.template, 'dbarnes');
            out.item = await L.readItem(page, panel, w.template, 'wayround-item');
            return out;
        });

        await step('nowriter', async () => {
            const n = NOWRITER[app.name];
            const sid = n.id || id;
            const name = 'Galleys Complete u37r15 (no writer)';
            const out = {submission: sid};
            // The server's installed templates name nobody: its own template comes from the autoadd step, or here.
            if (app.name === 'ops' && !facts.autoadd) out.templates = await L.addTemplate(page, app, w.template, OPS_LETTER);
            const panel = await L.openPanel(page, app, sid);
            Object.assign(out, await L.addFromTemplate(page, panel, w.template, name, n.users, 'dbarnes', {untickSelf: true}));
            out.item = await L.readItem(page, panel, name, 'nowriter-item');
            return out;
        });

        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        facts.submission = id;
        record('walk', facts);
        log(JSON.stringify(facts));
        await close();
    }
});
