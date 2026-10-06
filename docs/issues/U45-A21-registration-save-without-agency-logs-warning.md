# "Save" on the DOI "Registration" tab with no agency plugin enabled logs a PHP "Undefined array key" warning

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no "Registration" tab)
- **Introduced** `pkp/pkp-lib#8610` for `pkp/pkp-lib#7513` · [b6f6a63513](https://github.com/pkp/pkp-lib/commit/b6f6a63513bc5d7f954765ae33e03866926a10e5) · 2023-02-01 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a21)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Under Settings › Distribution › "DOIs", the "Registration" tab reads "No
Registration Agency Enabled" and shows only a "Save" button when no
registration agency plugin is enabled. That is the case on a journal or
preprint server until its manager enables one, and on a press (OMP)
always. Each time "Save" is pressed, the page shows "Saved" and stores
nothing, as expected, but the server's error log gains a PHP warning
that a value the save expects, the "Registration Agency" choice, is
missing from the request.

Nothing is lost and nothing on screen shows it, on an install that only
logs PHP warnings, which is the shipped setting.

## Impact

- **Lost.** Nothing: one line of noise in the server's error log each
  time "Save" is pressed.
- **Who.** The server's administrator reading the log. The line is
  caused by a manager who presses "Save" on a tab with nothing to fill
  in, which few will do.
- **Way round.** None needed.

Low. What would raise it to medium: an install with `display_errors =
On` in `config.inc.php`, as development installs often have. There PHP
writes the warning into the save's answer, and by the code the page can
then show "An unexpected error has occurred. Please reload the page and
try again." instead of "Saved" (read in the code, not tried; Cause).

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its `publicknowledge` journal and preprint server have no
  registration agency plugin enabled ("Crossref Manager Plugin", and on
  a journal "DataCite Manager Plugin", are off); a press has no such
  plugin.
- `display_errors = Off` under `[debug]` in `config.inc.php`, which is
  the dataset's own value and the config template's: PHP warnings go to
  the log only.
- A view of the server's PHP error log (the terminal running `php -S`,
  or the web server's error log).

Steps:
1. Sign in as `dbarnes`.
2. Open Settings › Distribution › "DOIs" › "Registration"
   (`/index.php/publicknowledge/management/settings/distribution#dois`,
   then the "Registration" side tab).
3. Press "Save".
4. Read the server's error log.

**Expected:** "Saved" beside the button, and no new line in the error
log.

**Observed:** the tab reads "No Registration Agency Enabled" and "DOIs
can be automatically minted and deposited with a registration agency. To
use this feature, locate and install a plugin from the appropriate
registration agency.", with a "Save" button below. Step 3 shows "Saved".
The request has no body and answers 200 with `[]`:

```
POST /index.php/publicknowledge/api/v1/contexts/1/registrationAgency   (X-Http-Method-Override: PUT)
```

The error log gains this line each time "Save" is pressed:

```
PHP Warning:  Undefined array key "registrationAgency" in …/lib/pkp/api/v1/contexts/PKPContextController.php on line 603
```

On 3.5 the line names line 599.

With "Crossref Manager Plugin" enabled (a journal or preprint server),
a "Save" with "Crossref" chosen and a "Save" with "None" chosen each
show "Saved" and log nothing.

## Cause

`PKPContextController::editDoiRegistrationAgencyPlugin()` (lib/pkp
`api/v1/contexts/PKPContextController.php`) keeps the request's fields
that are context properties in `$contextParams`, and validates and saves
them only when there are any (`if (!empty($contextParams))`, line 584).
The next statement, line 603, reads one of them without checking it is
there:

```php
// Return if no registration agency enabled;
if ($contextParams[Context::SETTING_CONFIGURED_REGISTRATION_AGENCY] === null) {
    return response()->json($contextParams, Response::HTTP_OK);
}
```

The line was written for the "None" choice, which sends the key with a
null value (`Context::SETTING_NO_REGISTRATION_AGENCY` is null; the form
posts `registrationAgency=`). The tab without a plugin sends the key
absent. PHP 8 then logs "Undefined array key", the read gives null, and
the method returns 200 as for "None".

The tab sends no key because
`PKPDoiRegistrationSettingsForm::__construct()` adds the "Registration
Agency" list and the "Automatic Deposit" box only when a plugin offers
an agency (`count($options) > 1`, line 89). Otherwise it adds one
`FieldHTML` named `noPluginsEnabled` (line 110), which holds the message
and posts nothing, and the form still shows its "Save".

With `display_errors = On` (read in the code, not tried: the walk's
install keeps the dataset's config, which has it Off).
`PKPApplication::__construct()` sets PHP's `display_errors` from `[debug]
display_errors` (`classes/core/PKPApplication.php` line 129), so PHP
prints the warning into the response in front of `[]`. What the page
then shows depends on PHP's `output_buffering`:

- Buffered (the `php.ini` files PHP ships set 4096): the answer keeps
  its JSON content type with a body that is not JSON. jQuery fails to
  parse it and calls the form's `error` callback (ui-library `Form.vue`,
  line 477), which for a status that is neither 400 nor 422 and has no
  error message shows the notice "An unexpected error has occurred.
  Please reload the page and try again." No "Saved".
- Unbuffered (`php -S` without a `php.ini`): the warning goes out before
  the headers, so the answer is `text/html`, jQuery takes it as text and
  the form shows "Saved".

Reach:

- A REST client's `PUT /api/v1/contexts/{id}/registrationAgency` without
  `registrationAgency` logs the same line. Any other context properties
  in it are validated and saved first (line 584); the agency plugin's
  own settings are not reached (read in the code, not run).
- The later reads of the key in the method (lines 612, 629 and 630) come
  after the return at line 604, so the key is set there (read in the
  code).

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/registration-save-without-agency-logs-warning/fix.diff):
with it, the Steps show "Saved" and the log gains nothing on the three
apps. With the fix applied and without it, a "Save" with "Crossref"
chosen stores the agency, a "Save" with "None" chosen clears it, and
neither logs anything.

Recommended: read the key as optional, so that an absent key is treated
as "None" without a warning.

```php
// PKPContextController::editDoiRegistrationAgencyPlugin()
if (($contextParams[Context::SETTING_CONFIGURED_REGISTRATION_AGENCY] ?? null) === null) {
```

`?? null` before a strict comparison is how the code base reads an
optional key (`VerifyIdentityWithOrcid`, `PKP\user\Collector`). The
answer and what is stored stay as they are, for the screens and for REST
clients. No other controller under `api/v1` compares a request key this
way without a check first (the stats and submissions controllers use
`array_key_exists()` and `isset()`).

**Alternatives:**

- Not offering "Save" on the tab when it has nothing to fill in (the
  message outside a form in `templates/management/distribution.tpl`, or
  a form without its button): it also removes a button that does
  nothing, which is a product choice, but a REST request without the key
  still logs the warning. It can go with the recommended fix. Not tried.
- Having the form post `registrationAgency` as an empty hidden field: it
  hides the warning for the screen only, and the save would then write
  the setting each time.

**What goes with it:**

- Backport: the same line on 3.5 (line 599) and on 3.4
  (`api/v1/contexts/PKPContextHandler.php` line 583); the change applies
  as written.
- Guard: the e2e scenarios of U45 that press this "Save" (a journal and
  a preprint server without an agency plugin, a press) read the server
  log for the save and expect no warning (a Planned item in the spec).

Small: one expression in one method.

## Evidence

- Kept script that takes the Steps in the browser on the three apps, on
  an install loaded from PKP's default test dataset, pressing "Save"
  twice and reading the lines PHP wrote to the server log for each
  press:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/registration-save-without-agency-logs-warning/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/registration-save-without-agency-logs-warning/walk.js`.
  `WALK=neighbour` in front takes the control on OJS and OPS: it ticks
  "Crossref Manager Plugin" on Settings › Website › "Plugins", saves
  "Crossref" with "Depositor name" and "Depositor email", then saves
  "None", and reads the stored `registrationAgency` beside the screens.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/registration-save-without-agency-logs-warning/fix.diff ojs omp ops`,
  then walk.js and the control (`WALK=neighbour`), then
  `node bin/try-fix.js revert shared/playwright/checks/issues/registration-save-without-agency-logs-warning/fix.diff ojs omp ops`.
- Walked 2026-10-01 on PostgreSQL, PHP 8.3 (`php -S`), each install
  freshly loaded from pkp/datasets 38ab955 (2026-09-30),
  `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). Each app logged the line once per
    press, two presses each.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd,
    lib/pkp a9c76aed62. The same, from line 599.
  - Every install ran with `[debug] display_errors = Off`, the
    dataset's own value. MySQL not checked; the fault does not touch the
    database.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d has b6f6a63513 on
  the branch, the same read at `api/v1/contexts/PKPContextHandler.php`
  line 583 after the same `!empty($contextParams)` block, and the same
  `noPluginsEnabled` field in `PKPDoiRegistrationSettingsForm` (line
  109). 3.4 runs on PHP 8, which logs the missing key as a warning.
- 3.3, by code: pkp-lib `stable-3_3_0` at d446601ebe does not hold
  b6f6a63513 and has no `registrationAgency` setting or endpoint.
- Introduced: `git blame` on line 603 in pkp-lib `main` gives b6f6a63513
  ("pkp/pkp-lib#7513 Refactor DOI plugin settings"), which added the
  method to `api/v1/contexts/PKPContextHandler.php` with this line and
  the `noPluginsEnabled` field to the form; the file was renamed since,
  the line unchanged. GitHub names PR `pkp/pkp-lib#8610` for the commit
  (merged 2023-02-13).
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library ("Undefined array key" with `registrationAgency`,
  `editDoiRegistrationAgencyPlugin`, "No Registration Agency Enabled",
  `noPluginsEnabled`, registration agency save warning). The three
  closest results were opened on github.com: `pkp/pkp-lib#7513` (the
  change that added the tab), `pkp/pkp-lib#12883` (the DataCite
  settings' test username validation) and `pkp/pkp-lib#7014` (DOIs
  brought into the core). None mentions the warning or the tab without a
  plugin. The other results were judged by their titles.
- Not driven: a REST request without `registrationAgency`; DataCite; the
  alternatives; `display_errors = On`.
- `display_errors = On`, by code only: `PKPApplication.php` line 129,
  the response path of the method, and ui-library `Form.vue` (the
  `$.ajax` call at line 362 sets no `dataType`, so jQuery goes by the
  answer's content type; `error` at line 477). Not tried, since the
  walks keep the dataset's config. Unverified: which of the two outcomes
  in the Cause a given install shows.
