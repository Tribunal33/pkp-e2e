// U21 OMP3 re-drive of the register's own evidence (note fn-omp3): a scratch context built by
// the campaign's _test API beside the dataset's publicknowledge, with a sub-editor + author and
// an editor + author; each opens the scratch context's start page four times and the script
// reads "Submit As" (order, selected) each time. Campaign-only: not a step of the report.
//   PROBE_FEATURE=issues-ir29 PROBE_AGENT=ir29 node bin/probe.js omp shared/playwright/checks/issues/submit-as-preselects-editorial-role/redrive.js
const {forEachApp, launch, signIn, signOut, record, tag} = require('../../../probe');
const H = require('../section-editor-submit-as-refused/lib.js');

forEachApp(async (app) => {
    const t = tag('u21ir29r');
    const ctx = await app.api.createContext({tag: t, users: [
        {username: `${t}se`, roles: ['sectionEditor', 'author']},
        {username: `${t}ed`, roles: ['editor', 'author']},
    ]});
    const path = (ctx && (ctx.path || (ctx.context && ctx.context.path))) || t;
    const facts = {app: app.name, ctx: path, created: ctx, visits: {}};
    const {page, close} = await launch(app);
    try {
        for (const u of [`${t}se`, `${t}ed`]) {
            await signIn(page, u, {contextPath: path});
            facts.visits[u] = [];
            for (let i = 0; i < 4; i++) {
                await H.openStart(page, {...app, contextPath: path, url: app.url});
                const v = await H.readSubmitAs(page);
                facts.visits[u].push(v && `${v.options.join(' / ')} (checked: ${v.checked})`);
            }
            await signOut(page);
        }
    } finally {
        record('redrive', facts);
        console.log(JSON.stringify(facts.visits, null, 1));
        await close();
    }
});
