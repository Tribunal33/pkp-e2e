// U28 A15 and U03 A19, joined to docs/issues/U09-A19-static-page-content-change-lost-on-close.md:
// the Steps' "A reviewer's free-form review" and "The Profile page" groups, walked through the
// screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit
// builds nothing. The review runs on OJS and OMP (OPS has no review), the Profile page on all three.
//   review (`jjanssen`; OJS submission 12, OMP 17):
//     r3   accept on step 1, "Continue to Step #3"
//     r4-6 text typed in "For author and editor" only; "2. Guidelines" (a question is answered
//          "Cancel", then the tab pressed again with "OK"); "3. Download & Review": what the box holds
//     r7-8 the text typed again; another address of the site; the review reopened: what the box holds
//     rc   the control (OJS): a "Recommendation" chosen instead, then "2. Guidelines" ("Cancel")
//   profile (`dbarnes`):
//     p10-12 "Signature" on Contact typed, "Identity", "Contact" again
//     p13    "Mailing Address" the same
//     p14    "Bio Statement" on Public the same
//     p15    "Signature" typed, the page reloaded
//     pc     the control: "Phone" typed, "Identity" ("Cancel")
//   `tail` as the script's argument: p15 and pc alone
//   `neighbour` as the script's argument, on a fresh reset (the fix's reach): untouched forms and
//   saved text ask nothing
//     n1 step 3 untouched, "2. Guidelines"         n2 text typed, "Save for Later", "2. Guidelines"
//     n3 step 3 with the saved text, untouched: "2. Guidelines", then another address
//     n4 Contact untouched, "Identity"             n5 "Signature" typed, "Save", "Identity"
//     n6 Contact with the saved signature, untouched: "Identity", then a reload
//     n7 Public untouched, "Identity"
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/free-form-review-leaving-loses-text-unasked/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<3.5 feature> PROBE_AGENT=<id> node bin/probe.js all <this script>
// Facts: .reports/<feature>/<id>/facts[-<run>]-<app>.json (neighbour[-<run>]-<app>.json)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib');
const NEIGHBOUR = process.argv[2] === 'neighbour';
const TAIL = process.argv[2] === 'tail'; // step 15 and the Profile control alone (nothing before them is saved)
const REVIEW = 'u28j a review typed and not saved';
const SIGNATURE = 'u28j signature typed and not saved';
const ADDRESS = 'u28j address typed and not saved';
const BIO = 'u28j bio typed and not saved';
const R3 = 'reviewStep3Form';

forEachApp(async (app) => {
    const fact = (k, v) => { record(NEIGHBOUR ? 'neighbour' : 'facts', {[k]: v}, {merge: true}); console.log(`[${app.name}]`, k, JSON.stringify(v).slice(0, 600)); };
    const {page} = await launch(app);
    const errs = [];
    page.on('pageerror', (e) => errs.push(L.flat(e.message, 200)));
    const elsewhere = app.url(`/index.php/${app.contextPath}/en/dashboard/reviewAssignments`);
    const hasReview = !!L.REVIEWS[app.name];

    // Leave a tab of the form, answering "Cancel" first when asked: what was kept, then "OK".
    const leave = async (key, press, read) => {
        let r = await press({answer: 'cancel'});
        fact(key, r);
        if (r.asked) {
            fact(`${key}-kept`, await read());
            fact(`${key}-ok`, await press({answer: 'ok'}));
        }
    };

    if (!NEIGHBOUR) {
        if (hasReview && !TAIL) {
            await signIn(page, 'jjanssen');                                                  // 1
            let w = await L.openReview(page, app, {accept: true});                           // 2–3
            fact('r3-box-before', await L.boxText(page, R3, 'comments'));
            fact('r4-typed', await L.typeBox(page, R3, 'comments', REVIEW));                 // 4
            await L.snap(page, 'r4-typed');
            await leave('r5-guidelines', (o) => L.pressStep(page, w, 2, o), () => L.boxText(page, R3, 'comments')); // 5
            await L.snap(page, 'r5-guidelines');
            await w.selectStep(3);                                                           // 6
            fact('r6-box', await L.boxText(page, R3, 'comments'));
            await L.snap(page, 'r6-step3');
            fact('r7-typed', await L.typeBox(page, R3, 'comments', REVIEW));                 // 7
            await L.leaveFocus(page);
            fact('r7-address', {asked: await L.asking(page, () => page.goto(elsewhere)), url: page.url().replace(app.baseURL, '')});
            w = await L.openReview(page, app);                                               // 8
            fact('r8-box', await L.boxText(page, R3, 'comments'));
            await L.snap(page, 'r8-step3');
            if (await w.recommendationSelect.count()) {                                      // control
                const label = (await w.recommendationOptions())[1];
                await w.chooseRecommendation(label);
                const r = await L.pressStep(page, w, 2, {answer: 'cancel'});
                fact('rc-recommendation', {chose: L.flat(label, 60), ...r, kept: L.flat(await w.recommendationSelect.locator('option:checked').innerText(), 60)});
                await L.asking(page, () => page.goto(elsewhere)); // leaves the changed form behind
            }
        }

        await signIn(page, 'dbarnes');                                                       // 9
        const p = L.profile(page, app);
        await p.goto('identity');
        await p.open('contact');
        if (!TAIL) {
        fact('p9-signature-before', await L.boxText(page, 'contactForm', 'signature'));
        fact('p10-typed', await L.typeBox(page, 'contactForm', 'signature', SIGNATURE));     // 10
        await L.snap(page, 'p10-typed');
        await leave('p11-identity', (o) => L.pressProfileTab(page, p, 'identity', o), () => L.boxText(page, 'contactForm', 'signature')); // 11
        await p.open('contact');                                                             // 12
        fact('p12-signature', await L.boxText(page, 'contactForm', 'signature'));
        await L.snap(page, 'p12-contact');
        fact('p13-typed', await L.typeBox(page, 'contactForm', 'mailingAddress', ADDRESS));  // 13
        await leave('p13-identity', (o) => L.pressProfileTab(page, p, 'identity', o), () => L.boxText(page, 'contactForm', 'mailingAddress'));
        await p.open('contact');
        fact('p13-address', await L.boxText(page, 'contactForm', 'mailingAddress'));
        await p.open('public');                                                              // 14
        fact('p14-typed', await L.typeBox(page, 'publicProfileForm', 'biography', BIO));
        await leave('p14-identity', (o) => L.pressProfileTab(page, p, 'identity', o), () => L.boxText(page, 'publicProfileForm', 'biography'));
        await p.open('public');
        fact('p14-bio', await L.boxText(page, 'publicProfileForm', 'biography'));
        await p.open('contact');                                                             // 15
        }
        fact('p15-typed', await L.typeBox(page, 'contactForm', 'signature', SIGNATURE));
        await L.leaveFocus(page);
        fact('p15-reload', {asked: await L.asking(page, () => page.reload())});
        await p.heading.waitFor({timeout: L.T}); // the reloaded page opens on its first tab
        await p.open('contact');
        fact('p15-signature', await L.boxText(page, 'contactForm', 'signature'));
        await L.snap(page, 'p15-reloaded');

        await p.phone().click();                                                             // control
        await p.phone().pressSequentially('555');
        const r = await L.pressProfileTab(page, p, 'identity', {answer: 'cancel'});
        fact('pc-phone', {...r, kept: await p.phone().inputValue().catch(() => null)});
        await L.asking(page, () => page.goto(elsewhere));
        fact('scriptErrors', errs);
        return;
    }

    if (hasReview) {
        await signIn(page, 'jjanssen');
        let w = await L.openReview(page, app, {accept: true});
        fact('n1-untouched-guidelines', await L.pressStep(page, w, 2, {answer: 'cancel'}));
        await w.selectStep(3);
        fact('n2-typed', await L.typeBox(page, R3, 'comments', REVIEW));
        let asked = await L.asking(page, () => w.saveForLater());
        fact('n2-save', {asked});
        fact('n2-saved-guidelines', await L.pressStep(page, w, 2, {answer: 'cancel'}));
        w = await L.openReview(page, app);
        fact('n3-box-saved', await L.boxText(page, R3, 'comments'));
        fact('n3-untouched-guidelines', await L.pressStep(page, w, 2, {answer: 'cancel'}));
        await w.selectStep(3);
        await L.boxText(page, R3, 'comments');
        await L.leaveFocus(page);
        fact('n3-untouched-address', {asked: await L.asking(page, () => page.goto(elsewhere))});
        await L.snap(page, 'n3');
    }
    await signIn(page, 'dbarnes');
    const p = L.profile(page, app);
    await p.goto('identity');
    await p.open('contact');
    await L.boxText(page, 'contactForm', 'signature');
    fact('n4-contact-untouched', await L.pressProfileTab(page, p, 'identity', {answer: 'cancel'}));
    await p.open('contact');
    fact('n5-typed', await L.typeBox(page, 'contactForm', 'signature', SIGNATURE));
    fact('n5-save', {asked: await L.asking(page, () => p.save())});
    fact('n5-saved-identity', await L.pressProfileTab(page, p, 'identity', {answer: 'cancel'}));
    await p.goto('contact');
    fact('n6-signature-saved', await L.boxText(page, 'contactForm', 'signature'));
    await L.boxText(page, 'contactForm', 'mailingAddress');
    fact('n6-untouched-identity', await L.pressProfileTab(page, p, 'identity', {answer: 'cancel'}));
    await p.open('contact');
    await L.boxText(page, 'contactForm', 'signature');
    await L.leaveFocus(page);
    fact('n6-untouched-reload', {asked: await L.asking(page, () => page.reload())});
    await p.heading.waitFor({timeout: L.T});
    await p.open('public');
    await L.boxText(page, 'publicProfileForm', 'biography');
    fact('n7-public-untouched', await L.pressProfileTab(page, p, 'identity', {answer: 'cancel'}));
    await L.snap(page, 'n7');
    fact('scriptErrors', errs);
});
