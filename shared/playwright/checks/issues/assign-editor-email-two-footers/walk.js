// Issue report docs/issues/U35-A15-assign-editor-email-two-footers.md (U35 A15):
// assigning an editor on the Submission stage with the predefined message
// "Assign Editor" sends an email that ends with two footers: the letter's own
// "— This is an automated message from {journal}." and then the discussion
// footer "— Reply to this comment at … or unsubscribe …". Takes the report's
// Steps through the screens on a dataset fleet (PKP's default test dataset),
// freshly reset: OJS submission 4 and OMP submission 3 (Submission stage), OPS
// submission 1 (Production, the only stage a preprint server has).
//   Assign: dbarnes, "Assign", role, "Search" Inoue, Minoti Inoue, "Assign Editor"
//           ("Editor Assigned" on OPS 3.5), "Message" left as it fills, "OK".
//   Read:   minoue's mailbox, the email's text after "Kind regards,".
// neighbour.js runs the same steps on the Review stage's "Assign Editor"
// (OJS submission 7, OMP 16; OPS has no other stage and is skipped there).
// On OPS main "Message" stays empty after the choice (U35 OPS2): the walk
// records that and presses "OK" all the same.
// Run: PROBE_FEATURE=issues-w39 PROBE_AGENT=w39 node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/walk.js
//      (reset the dataset fleet first: npm run fleet-prep -- --feature issues-w39 --dataset 1 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w39-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');
const {waitForJQueryIdle} = require('../../../support/legacy.js');

const RUN = process.env.PROBE_RUN || 'main';
const NEIGHBOUR = process.env.A15_WALK === 'neighbour';
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const CASE = {
    walk: {
        ojs: {sid: 4, role: 'Section editor'},
        omp: {sid: 3, role: 'Series editor'},
        ops: {sid: 1, role: 'Moderator'},
    },
    neighbour: {
        ojs: {sid: 7, role: 'Section editor'},
        omp: {sid: 16, role: 'Series editor'},
    },
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const tag = NEIGHBOUR ? 'neighbour' : 'walk';
    const c = CASE[tag][app.name];
    if (!c) {
        console.log(`[fact] ${app.name} skipped: no ${tag} case`);
        return;
    }
    const SP = require('../../../pages/StageParticipantsPages.js');
    const ctx = app.contextPath;
    const ASSIGN_EDITOR = /^(Assign Editor|Editor Assigned)$/;
    const facts = {app: app.name, line: app.line || 'main', run: RUN, mode: tag, sid: c.sid};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const ctxTable = app.contextTables;
    fact('db.emailSignature', sql(app, `select locale, setting_value from ${ctxTable.settings} where setting_name='emailSignature' and ${ctxTable.id}=(select ${ctxTable.id} from ${ctxTable.table} where path='${ctx}')`));

    const started = Date.now();
    const {page, close} = await launch(app);
    try {
        // ---- Steps 1-3: assign with "Assign Editor", letter left as it fills ----
        await signIn(page, 'dbarnes');
        const panel = new SP.ParticipantsPanel(page, ctx);
        await panel.goto(c.sid);
        const win = await panel.openAssign();
        await win.chooseRole(c.role);
        await win.search('Inoue');
        await win.choosePerson('Minoti Inoue');
        const options = await win.templateOptions();
        fact('templates', options);
        const template = options.find((o) => ASSIGN_EDITOR.test(o));
        fact('template', template);
        const fetched = page.waitForResponse((r) => r.url().includes('fetch-template-body'), {timeout: 30_000});
        await win.templateSelect().selectOption({label: template});
        fact('templateFetch', (await fetched).status());
        await waitForJQueryIdle(page);
        // The letter arrives after jQuery idles; wait until it stops changing.
        let message = '';
        for (let i = 0; i < 20; i++) {
            const now = await win.messageText();
            if (now && now === message) break;
            message = now;
            await page.waitForTimeout(250);
        }
        fact('messageTail', flat(message, 4000).slice(-260));
        record(`${tag}-message-${RUN}`, await screen(page));
        await shot(page, `${tag}-message-${RUN}`);
        await win.ok();
        await idle(page);
        record(`${tag}-assigned-${RUN}`, await screen(page));
        await signOut(page);

        // ---- Step 4: the email ----
        let m = null;
        for (let i = 0; i < 40 && !m; i++) {
            const res = await app.mail._search({to: 'minoue@mailinator.com'});
            m = (res.messages || []).find((x) => new Date(x.Created).getTime() >= started - 2000) || null;
            if (!m) await new Promise((r) => setTimeout(r, 500));
        }
        if (!m) {
            fact('mail', null);
            return;
        }
        const full = await app.mail.fullMessage(m.ID);
        const text = flat(full.Text, 20000);
        fact('mail', {subject: m.Subject, from: m.From && m.From.Name});
        const i = text.lastIndexOf('Kind regards,');
        fact('mail.tail', i >= 0 ? text.slice(i) : text.slice(-400));
        fact('mail.footers', (text.match(/—/g) || []).length);
        fact('mail.automatedLine', /This is an automated message from/.test(text));
        fact('mail.discussionFooter', /Reply to this comment at/.test(text));
        record(`${tag}-mail-${RUN}`, {subject: m.Subject, text: full.Text, html: full.HTML});
    } finally {
        record(`${tag}-facts-${RUN}`, facts);
        await close();
    }
});
