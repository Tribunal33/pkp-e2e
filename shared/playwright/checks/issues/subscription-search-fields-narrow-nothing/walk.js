// Issue report walk: docs/issues/U51-A22-subscription-search-fields-narrow-nothing.md
// (spec U51 register A22). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only (OMP and OPS have no subscriptions):
//   steps 1-9   the journal manager `rvaca` creates an individual and an
//               institutional type, two institutions and two subscriptions
//               of each kind (amwandenga / Harbour Library, ccorino / Dock
//               College), with membership, reference number and notes;
//   steps 10-17 "Search" on "Individual Subscriptions" and "Institutional
//               Subscriptions" by every field of the list, with "contains"
//               and a text only the first subscription holds, and with "is"
//               and a text no subscription holds; the "Family Name" search
//               is the control.
// Step numbers are the report's. The kit builds nothing. Every search is
// recorded with screen(); the list's names after each, the search form's
// option values and the fleet's server-log errors go into the facts.
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check: after the same setup, the searches the fix
//               must leave as they are (an empty text lists both; "is" with
//               a part of a value lists none, with the whole value in other
//               letter case one; the four name and address fields narrow;
//               "Notes" "is" with a note's text lists none, the note being
//               stored as HTML).
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/subscription-search-fields-narrow-nothing/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, record, idle, sql} = require('../../../probe');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);

const T = 30_000;
const TAG = 'u51w6';
const TYPE_IND = `Online Year ${TAG}`;
const TYPE_INST = `Campus Year ${TAG}`;
const INST_A = `Harbour Library ${TAG}`;
const INST_B = `Dock College ${TAG}`;
const NONE = 'nothing-like-this';
const IND = 'Individual Subscriptions';
const INST = 'Institutional Subscriptions';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 4000) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const iso = (d) => d.toISOString().slice(0, 10);
const now = new Date();
const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
const nextYear = new Date(today);
nextYear.setUTCFullYear(nextYear.getUTCFullYear() + 1);

// [tab, user, type, institution, domain, membership, reference, notes]
const SUBS = [
    [IND, 'amwandenga', TYPE_IND, null, null, 'HARB-1001', `INV-${TAG}-A`, 'Paid by cheque'],
    [IND, 'ccorino', TYPE_IND, null, null, 'DOCK-2002', `INV-${TAG}-B`, 'Paid by card'],
    [INST, 'amwandenga', TYPE_INST, INST_A, 'harbour.example.org', null, `INV-${TAG}-C`, 'Paid by cheque'],
    [INST, 'ccorino', TYPE_INST, INST_B, 'dock.example.org', null, `INV-${TAG}-D`, 'Paid by card'],
];

// [step, tab, field label, match, text, expected names]
const STEPS = [
    ['10', IND, 'Membership', 'contains', 'HARB', ['Alan Mwandenga']],
    ['11', IND, 'Reference Number', 'contains', `${TAG}-A`, ['Alan Mwandenga']],
    ['12', IND, 'Notes', 'contains', 'cheque', ['Alan Mwandenga']],
    ['13', IND, 'Membership', 'is', NONE, []],
    ['13', IND, 'Reference Number', 'is', NONE, []],
    ['13', IND, 'Notes', 'is', NONE, []],
    ['14', IND, 'Family Name', 'contains', 'Mwandenga', ['Alan Mwandenga']],
    ['15', INST, 'Institution name', 'contains', 'Harbour', [INST_A]],
    ['15', INST, 'Domain', 'contains', 'harbour', [INST_A]],
    ['15', INST, 'IP ranges', 'contains', '192.0.2', [INST_A]],
    ['15', INST, 'Reference Number', 'contains', `${TAG}-C`, [INST_A]],
    ['15', INST, 'Notes', 'contains', 'cheque', [INST_A]],
    ['16', INST, 'Institution name', 'is', NONE, []],
    ['16', INST, 'Domain', 'is', NONE, []],
    ['16', INST, 'IP ranges', 'is', NONE, []],
    ['16', INST, 'Reference Number', 'is', NONE, []],
    ['16', INST, 'Notes', 'is', NONE, []],
    ['16', INST, 'Membership', 'is', NONE, []],
    ['17', INST, 'Family Name', 'contains', 'Mwandenga', [INST_A]],
];
const NEIGHBOUR = [
    ['n1', IND, 'Reference Number', 'contains', '', ['Alan Mwandenga', 'Carlo Corino']],
    ['n2', IND, 'Reference Number', 'is', `${TAG}-A`, []],
    ['n3', IND, 'Reference Number', 'is', `inv-${TAG}-a`, ['Alan Mwandenga']],
    ['n4', IND, 'Given Name', 'contains', 'Carlo', ['Carlo Corino']],
    ['n5', IND, 'Username', 'is', 'ccorino', ['Carlo Corino']],
    ['n6', IND, 'Email', 'contains', 'amwandenga@', ['Alan Mwandenga']],
    ['n7', INST, 'Domain', 'is', 'dock.example.org', [INST_B]],
    ['n8', INST, 'IP ranges', 'contains', '', [INST_B, INST_A]],
    ['n9', INST, 'Username', 'is', 'ccorino', [INST_B]],
    ['n10', INST, 'Membership', 'contains', 'HARB', []],
    // "Notes" is a rich-text box, stored as HTML ("<p>Paid by cheque</p>"), so
    // "is" with the typed text compares against the markup: none, fix in or out.
    ['n11', IND, 'Notes', 'is', 'Paid by cheque', []],
];

forEachApp(async (app) => {
    if (app.name !== 'ojs') { console.log(`[${app.name}] no subscriptions on this app; nothing to walk`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const {PaymentsPage} = require('../../../pages/SubscriptionsPages.js');
    const {InstitutionsPage} = require('../../../pages/InstitutionsPages.js');
    const cp = app.contextPath;
    const facts = {line: app.line || 'main', mode: MODE, today: iso(today), results: []};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps/ojs/playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\[5\d\d\]|Fatal|Uncaught|PHP (Warning|Error)/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const userId = (u) => Number(sql(app, `SELECT user_id FROM users WHERE username = '${u}'`));

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, {...s, ...extra}); return s; };
    const payments = new PaymentsPage(page, cp);

    /** The rich "Notes" box: type into its editor. */
    async function typeNotes(dialog, text) {
        const frame = dialog.locator('iframe[id^="notes"]').first();
        await frame.waitFor({state: 'visible', timeout: T});
        await pause(300);
        const body = frame.contentFrame().locator('body');
        await body.click();
        await body.pressSequentially(text);
    }

    /** "Search" on a tab's list: press the header's "Search", fill the form, press its "Search". */
    async function search(step, tab, field, match, text, expected) {
        const grid = payments.grid(tab);
        const form = grid.locator('form.filter');
        if (!(await form.isVisible())) {
            await grid.locator('a.pkp_linkaction_search').first().click();
            await form.waitFor({state: 'visible', timeout: T});
        }
        if (!facts[`options-${tab}`]) {
            fact(`options-${tab}`, await form.locator('select[name="searchField"] option').evaluateAll((os) => os.map((o) => `${o.value}=${o.textContent.trim()}`)));
        }
        await form.locator('select[name="searchField"]').selectOption({label: field});
        await form.locator('select[name="searchMatch"]').selectOption({label: match});
        await form.locator('input[name="search"]').fill(text);
        const from = logSize();
        const answer = page.waitForResponse((r) => /fetch-grid|fetchGrid/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Search', exact: true}).click();
        const r = await answer;
        await idle(page); await pause(300);
        const names = (await payments.firstCells(tab)).map((s) => flat(s, 200));
        const noItems = await payments.noItems(tab).isVisible().catch(() => false);
        const sorted = (a) => [...a].sort();
        const out = {
            step, tab, field, match, text, status: r ? r.status() : null,
            names, noItems, expected, asExpected: JSON.stringify(sorted(names)) === JSON.stringify(sorted(expected)),
            log: logSince(from),
        };
        await snap(`${step}-${tab.split(' ')[0].toLowerCase()}-${field.replace(/\W+/g, '-').toLowerCase()}-${match}`, {walk: out});
        facts.results.push(out);
        console.log(`[${app.name}] ${step} ${tab} / ${field} ${match} "${text}": ${JSON.stringify(names)} (expected ${JSON.stringify(expected)})${out.asExpected ? '' : '  <-- differs'}`);
        return out;
    }

    try {
        // ------------------------------------------------------------ steps 1-9: the manager sets up
        await signIn(page, 'rvaca', {contextPath: cp});                                                    // 1
        for (const [name, cost, kind] of [                                                                  // 2-3
            [TYPE_IND, '10', 'Individual (users are validated via login)'],
            [TYPE_INST, '100', 'Institutional (users are validated via domain or IP address)'],
        ]) {
            await payments.gotoTab('Subscription Types');
            const type = await payments.openCreateType();
            await type.fill({name, currency: 'USD', cost, format: 'Online', duration: '12'});
            await type.kindRadio(kind).check();
            fact(`step2-3-type-${cost}`, (await type.saveAccepted()).status());
        }
        await snap('setup-types');

        const inst = new InstitutionsPage(page, cp);                                                       // 4-5
        for (const [name, range] of [[INST_A, '192.0.2.0/24'], [INST_B, '198.51.100.0/24']]) {
            await inst.goto();
            const panel = await inst.openAdd();
            await panel.nameBox('en').fill(name);
            await panel.ipRangesBox.fill(range);
            fact(`step4-5-institution-${name}`, (await panel.saveAccepted({refetch: true})).status());
        }
        await snap('setup-institutions');

        for (const [tab, user, type, institution, domain, membership, reference, notes] of SUBS) {          // 6-9
            await payments.gotoTab(tab);
            const sw = await payments.openCreateSubscription(tab);
            await sw.chooseUser(user, userId(user));
            await sw.chooseType(type);
            await sw.chooseStatus('Active');
            await sw.typeDate('dateStart', iso(today));
            await sw.typeDate('dateEnd', iso(nextYear));
            if (institution) await sw.chooseInstitution(institution);
            if (domain) await sw.domainBox().fill(domain);
            if (membership) await sw.membershipBox().fill(membership);
            await sw.referenceBox().fill(reference);
            await typeNotes(sw.dialog, notes);
            fact(`step6-9-${tab.split(' ')[0]}-${user}`, (await sw.saveAccepted()).status());
        }
        fact('stored', sql(app, `SELECT s.subscription_id, u.username, st.institutional, s.membership, s.reference_number, s.notes, iss.domain FROM subscriptions s JOIN users u ON u.user_id = s.user_id JOIN subscription_types st ON st.type_id = s.type_id LEFT JOIN institutional_subscriptions iss ON iss.subscription_id = s.subscription_id ORDER BY s.subscription_id`).split('\n').filter(Boolean));
        fact('stored-ip', sql(app, `SELECT i.institution_id, ip.ip_string FROM institution_ip ip JOIN institutions i ON i.institution_id = ip.institution_id ORDER BY 1`).split('\n').filter(Boolean));

        // ------------------------------------------------------------ steps 10-17 (or the neighbour searches)
        const list = MODE === 'steps' ? STEPS : NEIGHBOUR;
        let current = null;
        for (const [step, tab, field, match, text, expected] of list) {
            if (tab !== current) {
                await payments.gotoTab(tab);
                const all = (await payments.firstCells(tab)).map((s) => flat(s, 200));
                fact(`list-${tab}`, all);
                await snap(`list-${tab.split(' ')[0].toLowerCase()}`);
                current = tab;
            }
            await search(step, tab, field, match, text, expected);
        }
        fact('summary', facts.results.map((r) => `${r.step} ${r.tab.split(' ')[0]} ${r.field} ${r.match} "${r.text}" -> ${r.names.length} row(s)${r.asExpected ? '' : ' DIFFERS'}`));
    } finally {
        record('facts', facts);
        await close();
    }
});
