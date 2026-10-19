// Issue report U40 OJS1 (docs/issues/U40-OJS1-published-early-version-language-change-refused.md):
// an article whose only version was published as "Author's Original" or "Published Manuscript Under
// Review" keeps "Change" beside "Current Submission Language", and every change is refused.
// Runs on a dataset fleet (PKP's default test dataset); reset the fleet before each run.
//
// MODE=walk (default) — the report's Steps.
//   OJS main: as dbarnes, submission 5 "Genetic transformation of forest trees" published as
//     "Author's Original" (AO) and submission 6 "Investigating the Shared Background …" as "Published
//     Manuscript Under Review" (PMUR), "Don't Assign To An Issue". Each: the readout on Title &
//     Abstract before; after, on Title & Abstract, Contributors and Metadata; then "Change" ›
//     "French (Canada)" › Title (and Abstract) › "Confirm"; reloaded.
//   OMP main (submission 4), OPS main (submission 1), and OJS on stable-3_5_0 (submission 5): what
//     the publish button opens, read and left with "Cancel" (whether a "Publication Stage" list
//     offers a non-final stage at all).
// MODE=wayround (OJS main) — submission 6's "Associated review round" with PMUR picked (read, then
//   Cancel); then the editor's way round on submission 5: publish as AO, "Unpublish", "Change" ›
//   French (Canada) › "Confirm", publish as AO again.
// MODE=neighbour — what the fix must leave alone (OJS and OMP, main):
//   OJS: submission 9 "Hansen & Pinto: Reason Reclaimed" published as "Version of Record": neither
//     readout nor "Change"; submission 15 "Yam diseases and its management in Nigeria", unpublished:
//     "Change" offered and the change to French (Canada) accepted.
//   OMP: submission 4 published (the press's publish assigns Version of Record): neither;
//     submission 7, unpublished: "Change" offered and accepted.
//
//   npm run fleet-prep -- --feature issues-h19x --dataset 2 --reset
//   PROBE_FEATURE=issues-h19x PROBE_AGENT=h19x node bin/probe.js all shared/playwright/checks/issues/published-early-version-language-change-refused/walk.js
//   MODE=neighbour PROBE_RUN=nb-out … node bin/probe.js ojs,omp …   (and under the fix: PROBE_RUN=fix / nb-in)
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-h19x-3_5 … node bin/probe.js ojs …
// No assertions: the script records (walk-facts-<run>-<app>.json, snapshots), the reader judges.
// The psql reads are evidence only.
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const line = app.line || 'main';
    const isMain = line === 'main';
    const T0 = Date.now();
    const log = (...a) => console.log(`[h19x ${MODE} ${process.env.PROBE_RUN || '-'} ${app.name} ${line} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const prefix = MODE === 'walk' ? 'walk' : 'nb';
    const fact = (k, v) => { record(`${prefix}-facts`, {[k]: v}, {merge: true}); log(`[${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const q = (query) => { try { return sql(app, query); } catch (e) { return `SQL ERROR ${L.flat(e.message, 300)}`; } };
    const stored = (sid) => q(`select p.publication_id, p.status, ${isMain ? "coalesce(p.version_stage,'-')" : "'-'"}, s.status, s.locale from publications p join submissions s using (submission_id) where p.submission_id = ${sid}`);

    const {page, close} = await launch(app);
    const snapper = (base) => async (st) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), screenError: L.flat(e.message, 300)}; }
        record(`${prefix}-${base}-${st}`, s);
        await shot(page, `${prefix}-${base}-${st}`).catch(() => {});
        return s;
    };
    async function readPages(sub, pages, tag) {
        const out = {};
        for (const p of pages) {
            await L.openWorkflow(page, app, sub.id);
            out[p] = {opened: await L.openEntry(page, p)};
            Object.assign(out[p], await L.readout(page));
            await snapper(`${tag}`)(p.replace(/\W+/g, ''));
        }
        return out;
    }
    async function tryChange(sub, tag) {
        await L.openWorkflow(page, app, sub.id);
        await L.openEntry(page, 'Title & Abstract');
        const r = await L.readout(page);
        if (!(r.change.present && r.change.enabled)) return {offered: false, readout: r};
        let n = 0;
        const snap = snapper(`${tag}-change`);
        const change = await L.changeLanguage(page, {title: sub.title, language: 'French (Canada)', words: `Titre h19x ${tag}`,
            snap: async (st) => snap(`${String(++n).padStart(2, '0')}-${st}`)});
        await L.openWorkflow(page, app, sub.id);
        await L.openEntry(page, 'Title & Abstract');
        const reloaded = await L.readout(page);
        await snapper(tag)('reloaded');
        return {offered: true, change, reloaded, storedAfter: stored(sub.id)};
    }

    try {
        await signIn(page, 'dbarnes');
        await idle(page).catch(() => {});

        if (MODE === 'walk') {
            if (app.name === 'ojs' && isMain) {
                const subs = [
                    {id: 5, title: 'Genetic transformation of forest trees', stage: 'AO'},
                    {id: 6, title: 'Investigating the Shared Background Required for Argument', stage: 'PMUR'},
                ];
                for (const sub of subs) {
                    const tag = `ojs-${sub.stage}`;
                    await L.openWorkflow(page, app, sub.id);
                    await L.openEntry(page, 'Title & Abstract');
                    const before = await L.readout(page);
                    await snapper(tag)('before');
                    const storedBefore = stored(sub.id);
                    let publish;
                    try { publish = await L.publishOJS(page, app, sub.stage, snapper(tag)); } catch (e) { publish = {error: L.flat(e.message, 400)}; await snapper(tag)('publish-error'); }
                    const after = await L.readout(page);
                    await snapper(tag)('published');
                    const pages = await readPages(sub, ['Title & Abstract', 'Contributors', 'Metadata'], `${tag}-after`);
                    const storedAfterPublish = stored(sub.id);
                    const change = await tryChange(sub, tag);
                    fact(tag, {sub, before, storedBefore, publish, after, pages, storedAfterPublish, change});
                }
            } else {
                const sid = {ojs: 5, omp: 4, ops: 1}[app.name];
                await L.openWorkflow(page, app, sid);
                await L.openEntry(page, 'Title & Abstract');
                const before = await L.readout(page);
                await snapper(`${app.name}-offer`)('before');
                const offer = await L.readPublishOffer(page, snapper(`${app.name}-offer`));
                fact(`${app.name}-publish-offer`, {sid, line, before, offer, stored: stored(sid)});
            }
        } else if (MODE === 'neighbour') {
            const cases = {
                ojs: {pub: {id: 9, title: 'Hansen & Pinto: Reason Reclaimed'}, open: {id: 15, title: 'Yam diseases and its management in Nigeria'}},
                omp: {pub: {id: 4, title: 'How Canadians Communicate'}, open: {id: 7, title: 'Accessible Elements'}},
            }[app.name];
            if (!cases) { log('no neighbour case on this app'); return; }
            // An unpublished one-version item: "Change" offered and the change accepted.
            const openCase = await tryChange(cases.open, `${app.name}-unpublished`);
            fact(`${app.name}-unpublished`, {sub: cases.open, ...openCase});
            // A Version of Record published: neither readout nor "Change".
            await L.openWorkflow(page, app, cases.pub.id);
            await L.openEntry(page, 'Title & Abstract');
            const before = await L.readout(page);
            let publish;
            try {
                publish = app.name === 'ojs' ? await L.publishOJS(page, app, 'VoR', snapper(`${app.name}-vor`)) : await L.publishWindow(page, snapper(`${app.name}-vor`));
            } catch (e) { publish = {error: L.flat(e.message, 400)}; await snapper(`${app.name}-vor`)('publish-error'); }
            const pages = await readPages(cases.pub, ['Title & Abstract', 'Contributors'], `${app.name}-vor-after`);
            fact(`${app.name}-vor`, {sub: cases.pub, before, publish, pages, stored: stored(cases.pub.id)});
        } else if (MODE === 'wayround' && app.name === 'ojs' && isMain) {
            // PMUR's "Associated review round" as the panel shows it on submission 6 (left with Cancel).
            const s6 = {id: 6};
            await L.openWorkflow(page, app, s6.id);
            await L.openEntry(page, 'Title & Abstract');
            const {PublicationScreen} = require(require('path').join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            const panel = await pub.pressPublish();
            await panel.locator('select[name="versionStage"]').selectOption('PMUR');
            await L.pause(800);
            const rr = await panel.locator('select').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value,
                shown: e.selectedIndex >= 0 ? e.options[e.selectedIndex].innerText.trim() : null,
                options: [...e.options].map((o) => `${o.value}:${o.innerText.trim()}`)})));
            await snapper('pmur')('panel');
            await panel.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
            fact('pmur-review-round', {selects: rr});
            // The way round: publish as Author's Original, "Unpublish", "Change", publish again.
            const sub = {id: 5, title: 'Genetic transformation of forest trees'};
            await L.openWorkflow(page, app, sub.id);
            await L.openEntry(page, 'Title & Abstract');
            const publish = await L.publishOJS(page, app, 'AO').catch((e) => ({error: L.flat(e.message, 300)}));
            const published = await L.readout(page);
            let unpublish;
            try { await pub.unpublish(); unpublish = 'ok'; } catch (e) { unpublish = L.flat(e.message, 300); }
            await L.pause(1000);
            const unpublished = await L.readout(page);
            await snapper('way')('unpublished');
            const change = await tryChange(sub, 'way');
            await L.openWorkflow(page, app, sub.id);
            await L.openEntry(page, 'Title & Abstract');
            const republish = await L.publishOJS(page, app, 'AO', snapper('way-republish')).catch((e) => ({error: L.flat(e.message, 300)}));
            const after = await L.readout(page);
            await snapper('way')('republished');
            fact('wayround', {publish: publish.publishStatus, published, unpublish, unpublished, change, republish: republish.publishStatus || republish, after, stored: stored(sub.id)});
        } else throw new Error(`MODE=${MODE}: walk, neighbour or wayround (OJS main)`);
    } finally {
        await close();
    }
});
