# Incidentals

What a session saw in passing on another feature's screens; the spec
author reads their feature's rows at RUNBOOK step 3 and the row is deleted
when the spec absorbs it.

| Feature | Screen | Seen | Date | Evidence |
|---|---|---|---|---|
| U45 DOIs (a refused "Export DOIs") | The DOIs page's "Export DOIs" on an OJS DataCite journal, stable-3_5_0, the work whose "Article" DOI was emptied while its PDF galley kept one (walked by the U45 OJS5 reporter k2 for the report's export side) | On 3.5 the export answered 400 and the page showed no window or notice: the screenshot a second later shows the list as before, so the manager is not told the export failed. On `main` the refusal's text is read from `PKPDoiController::getXmlExportFailedMessage()` only (the test installs cannot fetch DataCite's schema, so no walk reached it). Drive a refused export on `main` and 3.5 (any refusal the fleets can reach, e.g. "Export DOIs" with nothing exportable) and say whether a message shows; a 🐞 or ❓ candidate | 2026-10-15 | housekeeping, U45 OJS5 reporter k2 (`.reports/issues/k2/`, the 3.5 export walk; `shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js` `WALK=galleyexport`) |
