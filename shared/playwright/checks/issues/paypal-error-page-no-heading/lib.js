// Helpers of walk.js (issue report docs/issues/U52-A10-paypal-error-page-no-heading.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const fs = require("fs");
const path = require("path");
const { idle } = require("../../../probe");
const { sleep, flat, rel } = require("../older-version-pdf-reader-empty/lib");

const T = 30_000;

/**
 * Settings › Distribution › "Payments": "Enable", a currency, a method, its one box that makes
 * it count as set up ("Account Name" for PayPal, the instructions for the manual method), "Save".
 */
async function setUpMethod(
  page,
  app,
  { currency, method, accountName, instructions },
) {
  const { PaymentSettingsTab } = require("../../../pages/PaymentsPages.js");
  const tab = new PaymentSettingsTab(page, app.contextPath);
  await tab.goto();
  const before = { enabled: await tab.enableBox().isChecked() };
  await tab.enableBox().check();
  await tab.currencySelect().waitFor({ state: "visible", timeout: T });
  await tab.currencySelect().selectOption(currency);
  await tab.pluginSelect().selectOption({ label: method });
  if (accountName != null) await tab.accountNameBox().fill(accountName);
  if (instructions != null) await tab.instructionsBox().fill(instructions);
  const chosen = {
    currency: await tab.chosenOption(tab.currencySelect()),
    method: await tab.chosenOption(tab.pluginSelect()),
  };
  const response = await tab.save();
  return {
    before,
    chosen,
    saveStatus: response.status(),
    saved: flat(
      await tab
        .savedStatus()
        .innerText()
        .catch(() => null),
      60,
    ),
  };
}

/** A journal's "Payments" page › "Payment Types": the "Article Processing Charge", "Save". */
async function setApc(page, app, amount) {
  const {
    JournalPaymentsPage,
    PAYMENTS_TEXT,
  } = require("../../../pages/PaymentsPages.js");
  const payments = new JournalPaymentsPage(page, app.contextPath);
  await payments.goto();
  const types = await payments.showPaymentTypes();
  await types.type(PAYMENTS_TEXT.apc, amount);
  const response = await types.save();
  await idle(page);
  return {
    saveStatus: response.status(),
    notice: flat(
      await types
        .savedNotice()
        .first()
        .innerText()
        .catch(() => null),
      80,
    ),
    box: await types.box(PAYMENTS_TEXT.apc).inputValue(),
  };
}

/** A submission's workflow, "Accept and Skip Review", the fee's request kept, "Continue" twice, "Record Decision". */
async function acceptRequestingFee(page, app, submissionId) {
  const { WorkflowPage } = require("../../../pages/WorkflowPage.js");
  const { DecisionWizardPage } = require(
    path.join(app.suiteDir, "pages", "DecisionWizardPages.js"),
  );
  const workflow = new WorkflowPage(page, app.contextPath);
  await workflow.gotoEditorial(submissionId);
  await idle(page);
  await workflow.actionButton("Accept and Skip Review").click();
  const wizard = new DecisionWizardPage(page);
  await wizard.expectTitle("Accept and Skip Review: Request Payment");
  const radios = await wizard
    .currentStep()
    .locator("label")
    .filter({ has: page.getByRole("radio") })
    .evaluateAll((ls) =>
      ls.map((l) => ({
        label: (l.textContent || "").replace(/\s+/g, " ").trim(),
        checked: !!l.querySelector("input:checked"),
      })),
    );
  await wizard.continueStep();
  await wizard.expectTitle("Accept and Skip Review: Notify Authors");
  await wizard.continueStep();
  await wizard.expectTitle("Accept and Skip Review: Select Files");
  const dialog = await wizard.recordDecision("Skipped Review");
  const done = flat(await dialog.innerText().catch(() => null), 200);
  await wizard.viewSubmissionSummary();
  await idle(page);
  return { radios, done };
}

/** The payment page as a payer meets it: the answer's status, the tab's title, every `h1`, the breadcrumb, the page's text. */
async function readPaymentPage(page, response) {
  await idle(page).catch(() => {});
  await sleep(500);
  const dom = await page.evaluate(() => {
    const t = (el) =>
      el
        ? (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim()
        : null;
    const main =
      document.querySelector(".pkp_structure_main") ||
      document.querySelector("main") ||
      document.body;
    return {
      title: document.title,
      h1: [...main.querySelectorAll("h1")].map((h) => t(h)),
      breadcrumb: t(main.querySelector(".cmp_breadcrumbs")),
      breadcrumbCurrent: t(main.querySelector(".cmp_breadcrumbs .current")),
      pageClass: (main.querySelector(".page") || {}).className || null,
      text: t(main.querySelector(".page") || main),
    };
  });
  return {
    url: rel(page.url()),
    status: response ? response.status() : null,
    ...dom,
    text: flat(dom.text, 500),
  };
}

/** The author's "Tasks", the fee task pressed; the page it opens. */
async function pressFeeTask(page, app) {
  const { TasksPanel } = require("../../../pages/NotificationsPages.js");
  await page.goto(
    app.url(`/index.php/${app.contextPath}/dashboard/mySubmissions`),
  );
  await idle(page);
  const tasks = new TasksPanel(page);
  await tasks.open();
  const row = tasks.row("The publication fee is due for payment.").first();
  const rowText = flat(await row.innerText().catch(() => null), 300);
  const answered = page.waitForResponse(
    (r) =>
      r.request().resourceType() === "document" &&
      /\/payment\/pay\/\d+/.test(r.url()),
    { timeout: 60_000 },
  );
  await tasks.openTask(row);
  return { task: rowText, ...(await readPaymentPage(page, await answered)) };
}

/** A page opened by its address; read as a payment page. */
async function openAddress(page, app, address) {
  const response = await page.goto(
    app.url(`/index.php/${app.contextPath}/${address}`),
  );
  return readPaymentPage(page, response);
}

/** A book's priced file link pressed on its page; the page it opens. */
async function pressPricedLink(page, linkText) {
  const link = page
    .locator(
      ".obj_monograph_full .entry_details .item.files a.cmp_download_link",
    )
    .filter({ hasText: linkText })
    .first();
  const linkRead = flat(await link.innerText().catch(() => null), 120);
  const answered = page.waitForResponse(
    (r) => r.request().resourceType() === "document" && r.status() < 300,
    { timeout: 60_000 },
  );
  await link.click();
  return { link: linkRead, ...(await readPaymentPage(page, await answered)) };
}

/** The fleet's server log from now on: the lines the PayPal method writes. */
function paypalLog(app) {
  const dir = path.join(
    __dirname,
    "../../../../../apps",
    app.name,
    "playwright/.server-logs",
  );
  const name = fs.existsSync(dir)
    ? fs.readdirSync(dir).find((f) => f.startsWith(`server-${app.port}`))
    : null;
  const full = name ? path.join(dir, name) : null;
  const size = () => (full && fs.existsSync(full) ? fs.statSync(full).size : 0);
  const start = size();
  return {
    file: name,
    since() {
      if (!full) return [];
      const fd = fs.openSync(full, "r");
      const buf = Buffer.alloc(Math.max(0, size() - start));
      fs.readSync(fd, buf, 0, buf.length, start);
      fs.closeSync(fd);
      return [
        ...new Set(
          buf
            .toString("utf8")
            .split("\n")
            .filter((l) => /PayPal|Uncaught|Fatal|TypeError/.test(l))
            .map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ""), 400)),
        ),
      ];
    },
  };
}

module.exports = {
  setUpMethod,
  setApc,
  acceptRequestingFee,
  readPaymentPage,
  pressFeeTask,
  openAddress,
  pressPricedLink,
  paypalLog,
};
