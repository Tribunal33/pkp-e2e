// Issue report walk: docs/issues/U09-A19-static-page-content-change-lost-unasked.md,
// the "Issue Data" group (spec U50 register A16, joined to U09 A19). Takes the
// report's "Issue Data (OJS)" steps (20-26; the step comments below count
// them 1-8 from the sign-in) through the screens on a dataset fleet
// (PKP's default test dataset, harness.md "Dataset fleets"): `dbarnes` opens
// "Issues" › "Future Issues", the row "Vol. 2 No. 1 (2015)"'s arrow › "Edit",
// presses "Issue Data", types into "Description" only and presses "Table of
// Contents", then "Issue Data" again; types into "Description" again and
// presses the window's "Close"; opens "Edit" › "Issue Data" again and reads
// "Description". The control types into "URL Path" alone and presses "Table of
// Contents". OJS only (issues are an OJS surface). The kit builds nothing.
// Every browser question is recorded; a "The data on this form has changed"
// question is answered "Cancel" first (the window must keep the text), then
// the control is pressed again and the question answered "OK".
//
// `neighbour` as the argument walks the neighbour check for fix.diff instead,
// with the fix in and out (it must ask nothing either way):
//   N1 "Issue Data" untouched, "Table of Contents" pressed: opens at once
//   N2 "Description" typed and "Save" pressed: "Your changes have been saved.",
//      the window closes with no question
//   N3 "Edit" reopened, "Issue Data" holding the saved description, untouched:
//      "Table of Contents" opens at once; back on "Issue Data", "Close" closes
//      at once
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=u50a16 node bin/probe.js ojs shared/playwright/checks/issues/static-page-content-change-lost-unasked/issue-data.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=u50a16 node bin/probe.js ojs shared/playwright/checks/issues/static-page-content-change-lost-unasked/issue-data.js
const {forEachApp, launch, signIn, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const NEIGHBOUR = process.argv.includes('neighbour');
const ISSUE = 'Vol. 2 No. 1 (2015)';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // no issues on a press or a preprint server
    if (!app.dataset) throw new Error('issue-data.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {line: app.line || 'main', part: NEIGHBOUR ? 'neighbour' : 'steps'};
    const SUF = NEIGHBOUR ? '-nb' : '';
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };

    const {page, close} = await launch(app);
    const dialogs = [];
    let answer = 'dismiss';
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), answered: d.type() === 'beforeunload' ? 'accept' : answer});
        if (d.type() === 'beforeunload' || answer === 'accept') await d.accept().catch(() => {});
        else await d.dismiss().catch(() => {});
    });
    const asked = (from) => dialogs.slice(from).map((d) => d.message);

    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SUF}`, s); return s; };

    const win = () => page.locator('[role="dialog"]:visible').filter({has: page.locator('#editIssueTabs')}).last();
    const tab = (name) => win().locator('#editIssueTabs > ul > li > a').filter({hasText: name}).first();
    const selectedTab = async () => (await win().locator('#editIssueTabs > ul > li[aria-selected="true"]').innerText().catch(() => '')).trim();
    const form = () => page.locator('form#issueForm');
    const closeControl = () => win().getByRole('button', {name: /^Close/}).first();

    const editor = () => page.evaluate(() => {
        const ta = [...document.querySelectorAll('form#issueForm textarea')].find((t) => (t.getAttribute('name') || '').startsWith('description[en'));
        if (!ta) return null;
        const e = window.tinymce && window.tinymce.get(ta.id);
        return {id: ta.id, init: !!(e && e.initialized), content: e ? e.getContent() : null, textarea: ta.value};
    });
    const waitEditor = async () => {
        await form().waitFor({state: 'visible', timeout: T});
        await page.waitForFunction(() => {
            const ta = [...document.querySelectorAll('form#issueForm textarea')].find((t) => (t.getAttribute('name') || '').startsWith('description[en'));
            const e = ta && window.tinymce && window.tinymce.get(ta.id);
            return !!(e && e.initialized);
        }, null, {timeout: T});
        await idle(page); await pause(500);
        return (await editor()).id;
    };
    const typeDescription = async (text) => {
        const id = await waitEditor();
        await page.frameLocator(`[id="${id}_ifr"]`).locator('body').click();
        await page.keyboard.type(text, {delay: 20});
        await pause(300);
        return editor();
    };

    // Steps 2-3: "Issues" › "Future Issues", the row's arrow › "Edit"
    const land = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/manageIssues`));
        await idle(page);
        const t = page.getByRole('tab', {name: 'Future Issues'});
        if (await t.count()) { await t.first().click(); await idle(page); }
    };
    const openEdit = async () => {
        const row = page.locator('tr.gridRow').filter({visible: true}).filter({hasText: ISSUE}).first();
        await row.waitFor({timeout: T});
        const arrow = row.locator('a.show_extras');
        if (await arrow.count()) await arrow.first().click();
        const edit = page.locator('tr.gridRow + tr').filter({visible: true}).getByRole('link', {name: 'Edit', exact: true}).first();
        await loc(page, 'Future Issues: the row\'s "Edit" link', edit);
        await edit.click();
        await win().waitFor({timeout: T});
        await idle(page); await pause(500);
        fact(`window${n}`, {title: (await win().locator('h1, h2').first().innerText().catch(() => '')).trim(), tab: await selectedTab()});
    };
    const pressTab = async (name, label) => {
        const from = dialogs.length;
        answer = 'dismiss';
        await tab(name).click(); await idle(page); await pause(1500);
        const out = {asked: asked(from), selectedAfter: await selectedTab()};
        if (out.asked.length) {
            out.descriptionAfterCancel = (await editor().catch(() => null))?.content ?? null;
            await snap(`${label}-after-cancel`);
            answer = 'accept';
            await tab(name).click(); await idle(page); await pause(1500);
            answer = 'dismiss';
            out.selectedAfterOk = await selectedTab();
        }
        await snap(`${label}-after-press`);
        return out;
    };
    const pressClose = async (label) => {
        const from = dialogs.length;
        answer = 'dismiss';
        await loc(page, 'Issue Management window: the "Close" control', closeControl());
        await closeControl().click(); await pause(2000);
        const out = {asked: asked(from), openAfter: await win().isVisible().catch(() => false)};
        if (out.asked.length) {
            out.descriptionAfterCancel = (await editor().catch(() => null))?.content ?? null;
            await snap(`${label}-after-cancel`);
            answer = 'accept';
            await closeControl().click(); await pause(2000);
            out.openAfterOk = await win().isVisible().catch(() => false);
            answer = 'dismiss';
        }
        await snap(`${label}-closed`);
        await pause(800); // the closed window's slot (patterns.md pitfall 4)
        return out;
    };

    try {
        await signIn(page, 'dbarnes');                                        // step 1
        await idle(page);
        await land();                                                         // step 2
        await snap('future-issues');
        await openEdit();                                                     // step 3
        await snap('window');
        await tab('Issue Data').click();                                      // step 4
        await waitEditor();
        await snap('issue-data');
        fact('descriptionBefore', await editor());
        if (!NEIGHBOUR) {
            fact('step5 typed', await typeDescription('u50w30 description'));   // step 5
            fact('step6 to Table of Contents', await pressTab('Table of Contents', 'step6')); // step 6
            await tab('Issue Data').click();
            await waitEditor();
            fact('step6 back on Issue Data', await editor());
            await snap('step6-back');
            fact('step7 typed', await typeDescription('u50w30 description'));   // step 7
            fact('step7 Close', await pressClose('step7'));
            await openEdit();                                                 // step 8
            await tab('Issue Data').click();
            await waitEditor();
            fact('step8 description', await editor());
            await snap('step8');
            // Control: "URL Path" alone, then "Table of Contents"
            const url = form().locator('input[name="urlPath"]');
            await loc(page, 'Issue Data: "URL Path"', url);
            await url.click(); await page.keyboard.type('u50w30', {delay: 20});
            await url.blur(); await pause(300);
            fact('control URL Path to Table of Contents', await pressTab('Table of Contents', 'control'));
        } else {
            fact('N1 untouched to Table of Contents', await pressTab('Table of Contents', 'n1'));
            await tab('Issue Data').click();
            await waitEditor();
            await typeDescription('u50w30 saved description');
            const resp = page.waitForResponse((r) => /update-issue/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000}).catch(() => null);
            await form().getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            await idle(page); await pause(1000);
            const s = await snap('n2-saved');
            fact('N2 save', {status: r ? r.status() : null, notices: s.notices || [], windowOpenAfter: await win().isVisible().catch(() => false), asked: dialogs.map((d) => d.message)});
            if (await win().isVisible().catch(() => false)) await pressClose('n2-pre');
            await pause(800);
            await openEdit();
            await tab('Issue Data').click();
            await waitEditor();
            fact('N3 description loaded', await editor());
            fact('N3 untouched to Table of Contents', await pressTab('Table of Contents', 'n3-tab'));
            await tab('Issue Data').click();
            await waitEditor();
            fact('N3 untouched Close', await pressClose('n3'));
        }
    } finally {
        fact('dialogs', dialogs);
        record(NEIGHBOUR ? 'neighbour' : 'walk', facts);
        await close();
    }
});
