// U74 A2 with U72 A2 (docs/issues/U74-A2-assistant-marketing-and-work-type-refused.md):
// a press's assistant roles are offered "Marketing" › "Audience", "Marketing" › "Publication Dates"
// and the header's work-type control, and every save is refused. OMP only, on PKP's default
// test dataset (main or stable-3_5_0), freshly loaded.
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/assistant-marketing-work-type-offered-then-refused/walk.js
//   WALK_MODE=neighbour …   the neighbour check alone (a fix trial): the Series editor `dbuskins`
//                           on book 1 keeps the work type and "Audience"; `gcox` keeps
//                           "Representatives"; nothing of the Steps is walked.
const {forEachApp, launch, signIn, signOut, screen, record, shot, loc, sql} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const BOOK4 = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture'};
const BOOK7 = {id: 7, title: 'Accessible Elements: Teaching Science Online and at a Distance'};
const BOOK1 = {id: 1, title: 'The ABCs of Human Survival: A Paradigm for Global Citizenship'};
const EACH = 'Each chapter may have its own publication date.';

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 600)}`); };
    const guard = async (label, fn) => { try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 1200)); return null; } };
    const stored = (id) => ({
        workType: sql(app, `select work_type from submissions where submission_id=${id}`),
        settings: sql(app, `select setting_name, setting_value from submission_settings where submission_id=${id} and (setting_name like 'audience%' or setting_name='enableChapterPublicationDates') order by 1`),
    });

    const {page, close} = await launch(app);
    const saves = L.watchSubmissionSaves(page);
    try {
        if (MODE === 'steps') {
            fact('book4.before', stored(4));
            fact('book7.before', stored(7));

            // Layout Editor, book 4 (steps 1–13)
            await signIn(page, 'gcox');
            fact('gcox.open', await L.openBook(page, app, BOOK4.id, BOOK4.title));
            fact('gcox.marketing', await L.marketingEntries(page));
            await guard('gcox audience', async () => {
                fact('gcox.audience.opened', await L.openMarketing(page, 'Audience'));
                await loc(page, 'Audience page: Save', L.form(page).getByRole('button', {name: 'Save', exact: true}));
                fact('gcox.audience.choose', await L.chooseAudience(page, 'Children (02)'));
                fact('gcox.audience.save', await L.save(page, saves, 'gcox-audience-save'));
                fact('gcox.audience.shownAfterSave', await L.audienceValue(page));
                await page.reload();
                await L.header(page).waitFor({timeout: 60_000});
                await L.openMarketing(page, 'Audience');
                fact('gcox.audience.afterReload', await L.audienceValue(page));
                fact('gcox.audience.stored', stored(4));
            });
            await guard('gcox dates', async () => {
                fact('gcox.dates.opened', await L.openMarketing(page, 'Publication Dates'));
                fact('gcox.dates.before', await L.datesRadios(page));
                fact('gcox.dates.choose', await L.chooseDates(page, EACH));
                fact('gcox.dates.save', await L.save(page, saves, 'gcox-dates-save'));
                fact('gcox.dates.shownAfterSave', await L.datesRadios(page));
                await page.reload();
                await L.header(page).waitFor({timeout: 60_000});
                await L.openMarketing(page, 'Publication Dates');
                fact('gcox.dates.afterReload', await L.datesRadios(page));
                fact('gcox.dates.stored', stored(4));
            });
            await guard('gcox worktype', async () => {
                await loc(page, 'workflow header: work-type control', L.workTypeButton(page));
                fact('gcox.worktype', await L.chooseWorkType(page, saves, 'Edited Volume', 'gcox-worktype'));
                await page.reload();
                await L.header(page).waitFor({timeout: 60_000});
                fact('gcox.worktype.afterReload', L.flat(await L.workTypeButton(page).first().innerText().catch(() => null)));
                fact('gcox.worktype.stored', stored(4));
            });

            // Copyeditor, book 7 (steps 14–15)
            await signIn(page, 'mfritz');
            fact('mfritz.open', await L.openBook(page, app, BOOK7.id, BOOK7.title));
            fact('mfritz.marketing', await L.marketingEntries(page));
            await guard('mfritz audience', async () => {
                fact('mfritz.audience.opened', await L.openMarketing(page, 'Audience'));
                fact('mfritz.audience.choose', await L.chooseAudience(page, 'Children (02)'));
                fact('mfritz.audience.save', await L.save(page, saves, 'mfritz-audience-save'));
            });
            await guard('mfritz worktype', async () => {
                fact('mfritz.worktype', await L.chooseWorkType(page, saves, 'Edited Volume', 'mfritz-worktype'));
            });
            fact('book7.after', stored(7));

            // Control: the Press editor (step 16)
            await signIn(page, 'dbarnes');
            fact('dbarnes.open', await L.openBook(page, app, BOOK4.id, BOOK4.title));
            await guard('dbarnes audience', async () => {
                fact('dbarnes.audience.opened', await L.openMarketing(page, 'Audience'));
                fact('dbarnes.audience.choose', await L.chooseAudience(page, 'Children (02)'));
                fact('dbarnes.audience.save', await L.save(page, saves, 'dbarnes-audience-save'));
                await page.reload();
                await L.header(page).waitFor({timeout: 60_000});
                await L.openMarketing(page, 'Audience');
                fact('dbarnes.audience.afterReload', await L.audienceValue(page));
                fact('dbarnes.audience.stored', stored(4));
            });
        } else {
            // Neighbour: what the fix must leave alone.
            fact('book1.before', stored(1));
            await signIn(page, 'dbuskins');
            fact('dbuskins.open', await L.openBook(page, app, BOOK1.id, BOOK1.title));
            fact('dbuskins.marketing', await L.marketingEntries(page));
            await guard('dbuskins audience', async () => {
                fact('dbuskins.audience.opened', await L.openMarketing(page, 'Audience'));
                fact('dbuskins.audience.choose', await L.chooseAudience(page, 'Children (02)'));
                fact('dbuskins.audience.save', await L.save(page, saves, 'nb-dbuskins-audience-save'));
            });
            await guard('dbuskins dates', async () => {
                fact('dbuskins.dates.opened', await L.openMarketing(page, 'Publication Dates'));
                fact('dbuskins.dates.choose', await L.chooseDates(page, EACH));
                fact('dbuskins.dates.save', await L.save(page, saves, 'nb-dbuskins-dates-save'));
            });
            await guard('dbuskins worktype', async () => {
                fact('dbuskins.worktype', await L.chooseWorkType(page, saves, 'Edited Volume', 'nb-dbuskins-worktype'));
            });
            fact('book1.after', stored(1));

            await signIn(page, 'gcox');
            fact('gcox.open', await L.openBook(page, app, BOOK4.id, BOOK4.title));
            await guard('gcox representatives', async () => {
                const link = L.menuLink(page, 'Representatives');
                fact('gcox.representatives.offered', await link.count());
                await link.first().click();
                await L.workflow(page).getByText('Add Representative', {exact: true}).first().waitFor({timeout: L.T}).catch(() => {});
                const s = await screen(page);
                record('nb-gcox-representatives', s);
                await shot(page, 'nb-gcox-representatives');
                fact('gcox.representatives.add', await L.workflow(page).getByText('Add Representative', {exact: true}).count());
            });
            await guard('gcox audience read', async () => {
                fact('gcox.audience.opened', await L.openMarketing(page, 'Audience'));
                fact('gcox.audience.saveEnabled', await L.form(page).getByRole('button', {name: 'Save', exact: true}).isEnabled().catch(() => null));
                fact('gcox.worktypeOffered', await L.workTypeButton(page).count());
                const s = await screen(page);
                record('nb-gcox-audience', s);
                await shot(page, 'nb-gcox-audience');
            });
        }
        await signOut(page).catch(() => {});
    } finally {
        fact('saves', saves);
        await close();
    }
});
