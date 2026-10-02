// Issue report docs/issues/U08-A3-access-denied-page-no-heading.md (U08 A3): the page a
// signed-in user gets when a screen refuses them has an empty heading, a breadcrumb that ends
// "Home /" and a browser tab without the page's name. Takes the report's Steps on PKP's default
// test dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
//   1. sign in as dbuskins (section editor; series editor on a press, moderator on a server)
//   2. type /index.php/publicknowledge/en/management/settings/context
//   3. type /index.php/index/en/admin
//
// Generic mode (`generic` as the script's argument, run alone, fix in and out): a refusal whose
// message is the generic "Access denied." itself: admin opens the site's Administration under the
// journal's path, /index.php/publicknowledge/en/admin (AdminHandler::authorize() refuses it there
// without a message of its own, so PKPRouter falls back to user.authorization.accessDenied).
//
// Neighbour mode (`neighbour` as the script's argument, run alone, fix in and out):
//   - signed out, the step 2 address: the Login page
//   - signed out, Login › "Forgot your password?", dbuskins@mailinator.com, "Reset Password":
//     the message page that names itself ("Reset Password")
//
// Reset first:  npm run fleet-prep -- --feature issues-u08d --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u08d PROBE_AGENT=u08d node bin/probe.js all shared/playwright/checks/issues/access-denied-page-no-heading/walk.js [neighbour | generic]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u08d-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u08d-3_5 PROBE_AGENT=u08d node bin/probe.js all shared/playwright/checks/issues/access-denied-page-no-heading/walk.js
// Facts: .reports/<feature>/u08d/facts[-neighbour][-<run>]-<app>.json
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

const USER = "dbuskins";
const SETTINGS = "/index.php/publicknowledge/en/management/settings/context";
const ADMIN = "/index.php/index/en/admin";
const neighbour = process.argv.includes("neighbour");
const generic = process.argv.includes("generic");

forEachApp(async (app) => {
  if (!app.dataset) throw new Error("walk.js runs on a dataset fleet");
  const { readPaymentPage } = require("../paypal-error-page-no-heading/lib");
  const read = readPaymentPage; // status, tab title, every h1, breadcrumb, text

  const facts = { app: app.name, line: app.line || "main", mode: generic ? "generic" : neighbour ? "neighbour" : "steps" };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
  };
  const open = async (page, address) => {
    const response = await page.goto(app.url(address));
    return read(page, response);
  };

  const { page, close } = await launch(app);
  try {
    if (generic) {
      await signIn(page, "admin");
      try {
        fact("generic admin under the journal", await open(page, `/index.php/${app.contextPath}/en/admin`));
        record("generic-admin-under-journal", await screen(page));
      } catch (e) {
        fact("generic error", String(e).slice(0, 500));
      }
    } else if (!neighbour) {
      // 1
      await signIn(page, USER);
      fact("1 signed in at", page.url());
      // 2
      try {
        fact("2 settings address", await open(page, SETTINGS));
        record("2-settings-address", await screen(page));
        await shot(page, "2-settings-address").catch(() => {});
      } catch (e) {
        fact("2 error", String(e).slice(0, 500));
      }
      // 3
      try {
        fact("3 admin address", await open(page, ADMIN));
        record("3-admin-address", await screen(page));
        await shot(page, "3-admin-address").catch(() => {});
      } catch (e) {
        fact("3 error", String(e).slice(0, 500));
      }
    } else {
      // signed out: the settings address goes to Login
      await signOut(page).catch(() => {});
      try {
        fact("nb signed out settings address", await open(page, SETTINGS));
      } catch (e) {
        fact("nb signed out error", String(e).slice(0, 500));
      }
      // signed out: Login › "Forgot your password?" › "Reset Password"
      try {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
        await idle(page);
        await page.getByRole("link", { name: "Forgot your password?" }).click();
        await idle(page);
        await page.getByLabel(/Registered user's email/i).fill(`${USER}@mailinator.com`);
        const answered = page.waitForResponse(
          (r) => r.request().resourceType() === "document" && /requestResetPassword/.test(r.url()),
          { timeout: 60_000 },
        );
        await page.getByRole("button", { name: "Reset Password" }).click();
        fact("nb reset password page", await read(page, await answered));
        record("nb-reset-password", await screen(page));
      } catch (e) {
        fact("nb reset error", String(e).slice(0, 500));
      }
    }
  } finally {
    record(generic ? "facts-generic" : neighbour ? "facts-neighbour" : "facts", facts);
    await close();
  }
});
