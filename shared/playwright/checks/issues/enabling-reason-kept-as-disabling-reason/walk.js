// U53 A7 walk (issue report docs/issues/U53-A7-enabling-reason-kept-as-disabling-reason.md).
// On PKP's default test dataset (a freshly reset install), rvaca in one browser and the
// user (Carlo Corino, OMP Arthur Clark) in a second:
//   steps (no argument): "Disable User" with "Spam"; the user's sign-in; "Enable User"
//     and what its box holds; "Appeal accepted" typed there, "OK"; the user's sign-in;
//     "Disable User" and what its box holds, "OK" unchanged; the user's sign-in.
//   neighbour (argument `neighbour`): what the fix must leave alone: "Disable User" with
//     "Spam" and the Login page quoting it; "Enable User" with "OK" on the box as it
//     opens and the user signing in; "Disable User" with "Second reason" typed and the
//     Login page quoting that.
//   PROBE_FEATURE=issues-r2 PROBE_AGENT=r2 node bin/probe.js all shared/playwright/checks/issues/enabling-reason-kept-as-disabling-reason/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const H = require('../disable-window-lists-ended-roles/lib.js');

const mode = process.argv.slice(2).find((a) => a === 'neighbour') || 'steps';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const who = c.user;
    const facts = {app: app.name, line: app.line || 'main', mode, user: who.username};
    const manager = await launch(app);
    const member = await launch(app);
    const page = manager.page;
    const userPage = member.page;
    const window = async (action) => {
        const {list, row} = await H.findUser(page, app, who);
        return H.openStatusWindow(page, list, row, who, action);
    };
    const login = async (name) => {
        const r = await H.tryLogin(userPage, app, who.username);
        record(name, await screen(userPage));
        if (r.signedIn) await signOut(userPage);
        return r;
    };
    try {
        await signIn(page, 'rvaca');
        let w = await window('Disable User');
        facts.disable1 = {boxOnOpen: w.reason};
        record('a7-01-disable-window', await screen(page));
        facts.disable1.save = await H.saveStatusWindow(page, w.win, 'Spam');
        facts.login1 = await login('a7-02-login-after-disable');

        w = await window('Enable User');
        facts.enable = {boxOnOpen: w.reason};
        record('a7-03-enable-window', await screen(page));
        facts.enable.save = await H.saveStatusWindow(page, w.win, mode === 'steps' ? 'Appeal accepted' : undefined);
        facts.login2 = await login('a7-04-login-after-enable');

        w = await window('Disable User');
        facts.disable2 = {boxOnOpen: w.reason};
        record('a7-05-disable-window-again', await screen(page));
        facts.disable2.save = await H.saveStatusWindow(page, w.win, mode === 'steps' ? undefined : 'Second reason');
        facts.login3 = await login('a7-06-login-after-second-disable');
        await signOut(page);
    } finally {
        record('a7-facts', facts);
        console.log(JSON.stringify(facts, null, 1).slice(0, 3000));
        await member.close();
        await manager.close();
    }
});
