// Issue report docs/issues/U52-A10-paypal-error-page-no-heading.md (U52 A10): the page a payer
// gets when the PayPal hand-over fails has an empty heading, a breadcrumb that ends "Home /" and
// a browser tab without the page's name. Takes the report's Steps on PKP's default test dataset
// (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// A journal (OJS):
//   1. sign in as dbarnes
//   2. Settings › Distribution › "Payments": "Enable", "US Dollar", "Paypal Fee Payment",
//      "Account Name" u52r4, "Save"
//   3. "Payments" › "Payment Types": "Article Processing Charge" 50, "Save"
//   4. submission 4: "Accept and Skip Review", the fee's request kept, "Record Decision"
//   5. sign in as cmontgomerie; "Tasks", "The publication fee is due for payment."
// A press (OMP):
//   1., 2. the same
//   3. book 14, "Publication Formats", "PDF": the book file's "Open Access" › "Direct Sales",
//      25.00, "Save"
//   4. sign in as aclark; "Catalog", the book, the priced file's link
//
// Neighbours (the same run, fix in and out): the address payment/pay/999999 (a journal's page
// "Payment", which names itself), and the same task or link once "Manual Fee Payment" is the
// method (the page "Manual Fee Payment").
//
// Reset first:  npm run fleet-prep -- --feature issues-u52r4 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u52r4 PROBE_AGENT=u52r4 node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u52r4-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u52r4-3_5 PROBE_AGENT=u52r4 node bin/probe.js all shared/playwright/checks/issues/paypal-error-page-no-heading/walk.js
// Facts: .reports/<feature>/u52r4/facts[-<run>]-<app>.json
const {
  forEachApp,
  launch,
  signIn,
  screen,
  shot,
  record,
} = require("../../../probe");

const ACCOUNT = "u52r4";
const INSTRUCTIONS = "Pay by cheque u52r4";
const SUBMISSION = 4; // OJS: Submission stage, author cmontgomerie
const AUTHOR = "cmontgomerie";
const BOOK = 14; // OMP: published
const BOOK_TITLE =
  "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots";
const FORMAT = "PDF";
const BOOK_FILE = "Segmentation of Vascular Ultrasound Imag.pdf";
const PRICE = "25.00";
const READER = "aclark";

forEachApp(async (app) => {
  if (app.name === "ops") return; // a preprint server has no payments
  if (!app.dataset) throw new Error("walk.js runs on a dataset fleet");
  const lib = require("./lib");

  const facts = { app: app.name, line: app.line || "main" };
  const fact = (k, v) => {
    facts[k] = v;
    console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
  };
  const log = lib.paypalLog(app);

  const { page, close } = await launch(app);
  try {
    // 1, 2
    await signIn(page, "dbarnes");
    fact(
      "2 payments",
      await lib.setUpMethod(page, app, {
        currency: "USD",
        method: "Paypal Fee Payment",
        accountName: ACCOUNT,
      }),
    );
    record("2-payments", await screen(page));

    if (app.name === "ojs") {
      // 3, 4
      fact("3 payment types", await lib.setApc(page, app, "50"));
      fact("4 decision", await lib.acceptRequestingFee(page, app, SUBMISSION));
      // 5
      await signIn(page, AUTHOR);
      fact("5 paypal page", await lib.pressFeeTask(page, app));
      record("5-paypal-page", await screen(page));
      await shot(page, "5-paypal-page").catch(() => {});
      // neighbour: a page of the same template that names itself
      fact(
        "neighbour: payment/pay/999999",
        await lib.openAddress(page, app, "payment/pay/999999"),
      );
      record("neighbour-not-found", await screen(page));
      // neighbour: the manual method's page
      await signIn(page, "dbarnes");
      fact(
        "neighbour: manual method chosen",
        await lib.setUpMethod(page, app, {
          currency: "USD",
          method: "Manual Fee Payment",
          instructions: INSTRUCTIONS,
        }),
      );
      await signIn(page, AUTHOR);
      fact("neighbour: manual page", await lib.pressFeeTask(page, app));
      record("neighbour-manual-page", await screen(page));
    } else {
      const {
        openFormats,
        fileTerms,
        setDirectSales,
        openBook,
      } = require("../priced-file-link-price-twice-or-missing/lib");
      // 3
      const formats = await openFormats(page, app, BOOK);
      fact(
        "3 file terms",
        await setDirectSales(page, formats, FORMAT, BOOK_FILE, PRICE),
      );
      fact("3 files after", await fileTerms(formats, FORMAT));
      // 4
      await signIn(page, READER);
      const book = await openBook(page, app, BOOK_TITLE);
      fact("4 book page", { url: book.url, status: book.status });
      fact("4 paypal page", await lib.pressPricedLink(page, BOOK_FILE));
      record("4-paypal-page", await screen(page));
      await shot(page, "4-paypal-page").catch(() => {});
      // neighbour: the manual method's page
      await signIn(page, "dbarnes");
      fact(
        "neighbour: manual method chosen",
        await lib.setUpMethod(page, app, {
          currency: "USD",
          method: "Manual Fee Payment",
          instructions: INSTRUCTIONS,
        }),
      );
      await signIn(page, READER);
      await openBook(page, app, BOOK_TITLE);
      fact(
        "neighbour: manual page",
        await lib.pressPricedLink(page, BOOK_FILE),
      );
      record("neighbour-manual-page", await screen(page));
    }
    fact("server log", log.since());
  } finally {
    record("facts", facts);
    await close();
  }
});
