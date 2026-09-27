// U63 K1 follow-up: after k1.js "import", which passwords sign in (the existing account the file named, and the new ones).
//   PROBE_FEATURE=U63 PROBE_AGENT=ccK1 node bin/probe.js ojs|omp shared/playwright/checks/U63/K1/k1-login.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, idle, outDir, screen} = require('../../../probe');
forEachApp(async (app) => {
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), `k1-state-${app.name}.json`), 'utf8'));
    const t = S.t;
    const {page, close} = await launch(app);
    page.setDefaultTimeout(15_000);
    const res = {};
    try {
        for (const [k, u, pw] of [['uex-original', S.U.existing, `${S.U.existing}${S.U.existing}`], ['ikeep', `${t}ikeep`, 'newpassword1'], ['iplain', `${t}iplain`, 'plainpassword1'], ['irehash-old', `${t}irehash`, 'oldpassword1']]) {
            await signIn(page, u, {password: pw, contextPath: S.U.path}).catch((e) => { res[k] = {error: String(e.message).slice(0, 120)}; });
            await idle(page).catch(() => {});
            const s = await screen(page).catch(() => ({url: page.url(), text: {}}));
            res[k] = {...(res[k] || {}), url: s.url.replace(/^https?:\/\/[^/]+/, ''), signedIn: !/\/login/.test(s.url), text: String(s.text.main || '').replace(/\s+/g, ' ').slice(0, 200)};
            record(`k1-login-${k}`, s);
            await signOut(page).catch(() => {});
        }
    } finally {
        record('k1-login', res);
        console.log(app.name, JSON.stringify(res, null, 1));
        await close();
    }
});
