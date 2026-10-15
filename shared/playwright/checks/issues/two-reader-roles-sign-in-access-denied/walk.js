// U22 A7 walk (issue report docs/issues/U22-A7-two-reader-roles-sign-in-access-denied.md).
// On PKP's default test dataset (context `publicknowledge`), through the screens:
//   steps (default): rvaca creates the role "hkk22 Subscriber" at the "Reader" level with
//     "Allow user self-registration"; a newcomer `hkk22reader` registers on the context (Reader),
//     ticks "hkk22 Subscriber" on Profile > "Roles", signs out and signs in on the context's own
//     Login page: where it lands. On OJS also: a second newcomer `hkk22subs` registers, `admin`
//     gives it "Subscription Manager" and takes "Reader" away (Administration > Hosted Journals >
//     Settings wizard > Users > Edit User), and it signs in: where it lands.
//   neighbour: runs alone on a fresh dataset: an Author (`ccorino`, OMP `aclark`) and `dbarnes`
//     sign in on the Login page; a newcomer `hkk22single` registers (Reader alone), signs out and
//     in, then types the old `submissions` address.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/two-reader-roles-sign-in-access-denied/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.argv[2] || 'steps';
const ROLE = 'hkk22 Subscriber';
const AUTHOR = {ojs: 'ccorino', omp: 'aclark', ops: 'ccorino'};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const {page, close} = await launch(app);
    try {
        if (MODE === 'neighbour') {
            await H.step(facts, 'n1-author-lands', () => H.landing(page, app, AUTHOR[app.name]));
            await signOut(page);
            await H.step(facts, 'n2-dbarnes-lands', () => H.landing(page, app, 'dbarnes'));
            await signOut(page);
            await H.step(facts, 'n3-register-single', () => H.register(page, app, 'hkk22single'));
            await signOut(page);
            await H.step(facts, 'n3-single-reader-lands', () => H.landing(page, app, 'hkk22single'));
            await H.step(facts, 'n4-single-reader-typed-submissions', () => H.typed(page, app, '/en/submissions'));
            record('neighbour-end', await screen(page));
            await signOut(page);
            return;
        }

        // Steps 1-3
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        await H.step(facts, '03-create-role', () => H.createRole(page, app, {level: 'Reader', name: ROLE, abbrev: 'HKK22', selfRegistration: true}));
        record('03-roles', await screen(page));
        await signOut(page); // 4
        // Step 5
        await H.step(facts, '05-register', () => H.register(page, app, 'hkk22reader'));
        record('05-registered', await screen(page));
        // Step 6
        await H.step(facts, '06-tick-role', () => H.tickOwnRole(page, app, ROLE));
        record('06-profile-roles', await screen(page));
        await signOut(page); // 7
        // Step 8
        await H.step(facts, '08-lands', () => H.landing(page, app, 'hkk22reader'));
        record('08-landed', await screen(page));
        await signOut(page);

        if (app.name === 'ojs') {
            // Steps 9-11
            await H.step(facts, '09-register-subs', () => H.register(page, app, 'hkk22subs'));
            await signOut(page);
            await signIn(page, 'admin');
            await H.step(facts, '10-admin-edit-user', () => H.setRolesAsAdmin(page, app, {username: 'hkk22subs', hostedLabel: 'Hosted Journals', tick: ['Subscription Manager'], untick: ['Reader']}));
            await signOut(page);
            await H.step(facts, '11-subs-lands', () => H.landing(page, app, 'hkk22subs'));
            record('11-landed', await screen(page));
            await signOut(page);
        }
    } finally {
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
