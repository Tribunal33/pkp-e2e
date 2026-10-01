// Neighbour check for the U52 A2 fix (fix.diff): recording one article's fee
// must close only that article's request. On a freshly reset dataset fleet, OJS:
//   preconditions as walk.js (payments on, APC 50), then dbarnes accepts
//   submission 4 (cmontgomerie) and submission 8 (eostrom), each with
//   "Request publication fee (50 USD)";
//   1. dbarnes records submission 4 "Paid";
//   2. eostrom's task for submission 8 is still listed and opens the manual page;
//   3. dbarnes saves submission 8's "Payments" as "Unpaid" (no fee recorded);
//   4. eostrom's task is still listed;
//   5. cmontgomerie's Tasks (with the fix: no fee task; without: the task stays).
// Run: PROBE_FEATURE=issues-w45 PROBE_AGENT=w45 PROBE_RUN=nb node bin/probe.js ojs shared/playwright/checks/issues/fee-task-stays-after-fee-recorded/neighbour.js
//      (reset first: npm run fleet-prep -- --feature issues-w45 --dataset 1 --reset)
const {forEachApp, launch, record} = require('../../../probe');
const L = require('./lib.js');

const PAID = {sid: 4, title: 'Computer Skill Requirements for New and Existing Teachers', author: 'cmontgomerie'};
const OTHER = {sid: 8, title: 'Traditions and Trends in the Study of the Commons', author: 'eostrom'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    if (app.name !== 'ojs') return;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    const {page, close} = await launch(app);
    const responses = [];
    page.on('response', (r) => {
        if (r.status() >= 500) responses.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)});
    });
    try {
        await L.setUpPayments(page, app);
        fact('fee requested on 4', await L.acceptRequestingFee(page, app, PAID.sid));
        fact('fee requested on 8', await L.acceptRequestingFee(page, app, OTHER.sid));
        fact('1 submission 4 Paid', await L.recordFee(page, app, PAID.sid, 'Paid'));
        fact('2 eostrom task (other article)', await L.feeTask(page, app, OTHER.author, OTHER.title, 'nb-2-other-task'));
        fact('3 submission 8 Unpaid saved', await L.recordFee(page, app, OTHER.sid, 'Unpaid'));
        fact('4 eostrom task after Unpaid', await L.feeTask(page, app, OTHER.author, OTHER.title, 'nb-4-other-after-unpaid', {press: false}));
        fact('5 cmontgomerie tasks', await L.feeTask(page, app, PAID.author, PAID.title, 'nb-5-paid-author', {press: false}));
    } finally {
        fact('server errors', responses);
        record('neighbour-facts', facts);
        await close();
    }
});
