// Issue report docs/issues/U35-OPS2-ops-assign-editor-message-empty.md
// (U35 OPS2), the check of its alternative fix (fix.diff) and its neighbour. A server's predefined
// messages are written when the server is created, so that fix
// (registry/taskTemplates.xml) shows only on a server created after it:
// this script builds a scratch preprint server through the kit
// (app.api.createContext: a manager, an author and a moderator), the author
// submits a preprint through the wizard, and the manager takes the
// report's Steps 2-7 on it (Moderator, "Assign Editor", "Discussion
// (Production)", "Assign Editor" again, "OK"). With the fix out it shows
// the fault on a new server too; with it in, "Assign Editor" fills the
// letter, while "Discussion (Production)" (the neighbour) still fills
// "Please enter your message.". OPS only.
// Run: PROBE_FEATURE=issues-w27 PROBE_AGENT=w27 PROBE_RUN=<fix-in|fix-out> node bin/probe.js ops shared/playwright/checks/issues/ops-assign-editor-message-empty/fixcheck.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const RUN = process.env.PROBE_RUN || 'main';

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    const SP = require('../../../pages/StageParticipantsPages.js');
    const W = require(path.join(app.suiteDir, 'pages', 'SubmissionWizardPages.js'));
    const facts = {app: app.name, line: app.line || 'main', run: RUN};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const started = new Date();
    const t = `u35w27${Date.now().toString(36).slice(-5)}`;
    const users = [
        {username: `${t}mgr`, roles: ['manager'], givenName: 'Mira', familyName: 'Manager'},
        {username: `${t}au`, roles: ['author'], givenName: 'Ava', familyName: 'Author'},
        {username: `${t}mod`, roles: ['sectionEditor'], givenName: 'Moe', familyName: `Moderator${t}`},
    ];
    const ctx = await app.api.createContext({tag: t, context: {name: `U35 w27 ${t}`, contactName: 'w27 Contact', contactEmail: `${t}contact@mail.test`},
        sections: [{abbrev: 'PRE', title: 'Preprints'}], users});
    const cpath = ctx.path || t;
    fact('scratchServer', cpath);

    const {page, close} = await launch(app);
    const requests = [];
    page.on('response', (r) => {
        const m = r.url().match(/(fetch-template-body|save-participant)/);
        if (m) requests.push({op: m[1], status: r.status()});
    });
    try {
        // the author submits a preprint through the wizard
        await signIn(page, `${t}au`, {contextPath: cpath});
        await page.goto(app.baseURL + W.startUrl(cpath, {localePrefix: '/en'}));
        await W.beginSubmission(page, {title: `Preprint ${t}`});
        const sid = Number(new URL(page.url()).searchParams.get('id'));
        fact('submissionId', sid);
        await W.addGalleyFile(page);
        await W.continueTo(page, W.STEPS.details);
        await W.fillRichText(page, W.CONTROLS.abstract, 'An abstract.');
        await W.continueTo(page, W.STEPS.contributors);
        await W.continueTo(page, W.STEPS.readers);
        await W.setRelationStatus(page);
        await W.openReview(page);
        await W.confirmSubmit(page);
        await signOut(page);

        // the manager: Steps 2-7
        await signIn(page, `${t}mgr`, {contextPath: cpath});
        const panel = new SP.ParticipantsPanel(page, cpath);
        await panel.goto(sid);
        const win = await panel.openAssign();
        await win.chooseRole('Moderator');
        await win.search(`Moderator${t}`);
        await win.choosePerson(`Moe Moderator${t}`);
        fact('list', await win.templateOptions());
        const choose = async (label, step) => {
            const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: T});
            await win.templateSelect().selectOption({label});
            const res = await fetched;
            await idle(page);
            await sleep(800);
            fact(`${step}.status`, res.status());
            fact(`${step}.message`, flat(await win.messageText(), 300));
            record(step, await screen(page));
            await shot(page, `fix-${step}-${RUN}`);
        };
        await choose('Assign Editor', 'step4-assign-editor');
        await choose('Discussion (Production)', 'step5-discussion');
        await choose('Assign Editor', 'step6-assign-editor-again');
        const saved = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
        await win.root.getByRole('button', {name: 'OK', exact: true}).click();
        await saved;
        await idle(page);
        await sleep(1500);
        const s = await screen(page);
        record('step7-ok', s);
        fact('step7.notices', s.notices);
        const m = await app.mail.find({to: `${t}mod@mail.test`, subject: 'Assign Editor', timeoutMs: 20_000}).catch(() => null);
        const fresh = m && new Date(m.Created) >= started ? m : null;
        fact('mail', fresh ? {subject: fresh.Subject, snippet: flat(fresh.Snippet, 500)} : null);
        fact('requests', requests);
    } finally {
        record('facts', facts);
        await close();
    }
});
