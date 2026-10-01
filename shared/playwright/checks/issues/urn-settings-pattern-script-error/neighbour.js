// Neighbour check for docs/issues/U44-A11-urn-settings-pattern-script-error.md: what the pattern boxes do must not
// change with the fix. On a fresh load of the default dataset, as `rvaca`, in the URN settings window: under each
// "URN Suffix" choice, tick every kind one by one, untick the first, switch choices, then save with patterns and
// reopen. Records which pattern boxes can be typed in after each click, and the page errors. Walked with the fix
// in and out; the box states must read the same both ways.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=fixin] node bin/probe.js all shared/playwright/checks/issues/urn-settings-pattern-script-error/neighbour.js
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 800)}`); };
    if (!L.KINDS[app.name]) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    const errs = L.watchErrors(page);
    const kinds = L.KINDS[app.name];
    const seq = [];
    const step = async (what, locator) => { const r = await L.press(page, app, errs, what, locator); seq.push({what, boxes: r.boxes, errors: r.errors.length}); };
    try {
        await signIn(page, 'rvaca');
        await L.openUrnSettings(page, app, 'n-01-window-open');
        seq.push({what: 'opened', boxes: await L.boxStates(page, app), errors: errs.since().length});
        await step('pattern choice', L.choice(page, 'pattern'));
        for (const k of kinds) await step(`tick ${k.kind}`, L.kindBox(page, k));
        await step(`untick ${kinds[0].kind}`, L.kindBox(page, kinds[0]));
        await step('Check Number', L.checkNo(page));
        await step('default choice', L.choice(page, 'default'));
        await step(`tick ${kinds[0].kind} (default choice)`, L.kindBox(page, kinds[0]));
        await step('individual choice', L.choice(page, 'customId'));
        await step('pattern choice again', L.choice(page, 'pattern'));
        await step(`untick ${kinds[1].kind}`, L.kindBox(page, kinds[1]));
        await step(`tick ${kinds[1].kind}`, L.kindBox(page, kinds[1]));
        // Save with a pattern in every box, then reopen.
        const f = L.form(page);
        await f.locator('input[name="urnPrefix"]').fill('urn:nbn:de:0000-');
        for (const k of kinds) await f.locator(`input[name="${k.box}"]`).fill(k.pattern);
        await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
        await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
        const s = await L.save(page, app, 'n-02-saved');
        seq.push({what: 'Save', saveStatus: s.saveStatus, windowOpen: s.windowOpen, notices: s.notices, errors: errs.since().length});
        await L.openUrnSettings(page, app, 'n-03-window-reopened');
        const values = {};
        for (const k of kinds) values[k.label] = await f.locator(`input[name="${k.box}"]`).inputValue();
        seq.push({what: 'reopened', boxes: await L.boxStates(page, app), values, errors: errs.since().length});
        await step(`untick ${kinds[0].kind} (reopened)`, L.kindBox(page, kinds[0]));
    } finally {
        for (const r of seq) console.log(`[${app.name}] ${JSON.stringify(r)}`);
        fact('page errors', errs.all.length);
        facts.seq = seq;
        record('n-facts', facts);
        await close();
    }
});
