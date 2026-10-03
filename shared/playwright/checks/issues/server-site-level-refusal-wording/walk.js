// Issue report docs/issues/U08-OPS4-server-site-level-refusal-wording.md (U08 OPS4): a server's
// settings address opened at the site's level ("index" in place of the server's path) refuses
// with "No server in context!", where a journal and a press say "No journal (press) was found
// that matched your request.". Takes the report's Steps on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing. OJS and OMP are the control.
//
//   1. sign in as admin
//   2. open /index.php/publicknowledge/en/management/settings/website
//   3. replace "publicknowledge" with "index" in the address
//   4. Logout   5. open the step 3 address again: the Login page   6. sign in there as dbarnes
//
// Neighbour mode (`neighbour` as the script's argument, run alone, fix in and out):
//   - dbuskins (moderator, section editor, series editor) opens the context's own Settings ›
//     Website address: refused with "The current role does not have access to this operation."
//   - admin opens the same address: the page opens
//
// Reset first:  npm run fleet-prep -- --feature issues-u08s --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u08s PROBE_AGENT=u08s node bin/probe.js all shared/playwright/checks/issues/server-site-level-refusal-wording/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u08s-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08s-3_5 PROBE_AGENT=u08s node bin/probe.js all shared/playwright/checks/issues/server-site-level-refusal-wording/walk.js
// Facts: .reports/<feature>/u08s/facts[-neighbour][-<run>]-<app>.json
const {
  forEachApp,
  launch,
  signIn,
  signOut,
  screen,
  shot,
  record,
  idle,
} = require("../../../probe");

const SETTINGS = (path) => `/index.php/${path}/en/management/settings/website`;
const neighbour = process.argv.includes("neighbour");

forEachApp(async (app) => {
  if (!app.dataset) throw new Error("walk.js runs on a dataset fleet");
  const { readPaymentPage: read } = require("../paypal-error-page-no-heading/lib");
  const { LoginPage } = require("../../../pages/LoginPage.js");

  const facts = { app: app.name, line: app.line || "main", mode: neighbour ? "neighbour" : "steps" };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
  };
  const open = async (page, address) => read(page, await page.goto(app.url(address)));
  const step = async (key, fn) => {
    try {
      fact(key, await fn());
    } catch (e) {
      fact(`${key} error`, String(e).slice(0, 500));
    }
  };

  const { page, close } = await launch(app);
  try {
    if (!neighbour) {
      // 1
      await signIn(page, "admin");
      fact("1 signed in at", page.url());
      // 2
      await step("2 context settings", () => open(page, SETTINGS(app.contextPath)));
      // 3
      await step("3 site-level address", () => open(page, SETTINGS("index")));
      record("3-site-level-admin", await screen(page));
      await shot(page, "3-site-level-admin").catch(() => {});
      // 4
      await signOut(page);
      // 5
      await step("5 signed out", () => open(page, SETTINGS("index")));
      // 6
      await step("6 dbarnes signs in there", async () => {
        const login = new LoginPage(page);
        const answered = page.waitForResponse(
          (r) => r.request().resourceType() === "document" && /authorizationDenied/.test(r.url()),
          { timeout: 30_000 },
        );
        await login.signIn("dbarnes", "dbarnesdbarnes");
        return read(page, await answered);
      });
      record("6-site-level-dbarnes", await screen(page));
    } else {
      await signIn(page, "dbuskins");
      await step("nb dbuskins context settings", () => open(page, SETTINGS(app.contextPath)));
      record("nb-dbuskins", await screen(page));
      await signIn(page, "admin");
      await step("nb admin context settings", () => open(page, SETTINGS(app.contextPath)));
    }
  } finally {
    record(neighbour ? "facts-neighbour" : "facts", facts);
    await close();
  }
});
