# "Subscriptions Report" downloads nothing and leaves a blank tab when an institutional contact has no country

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** commit without a PR, for `pkp/pkp-lib#5453` · [e5f9a25bf6](https://github.com/pkp/ojs/commit/e5f9a25bf6f473dc881a8bf4e92ba036707a93d3) · 2020-01-29 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8086` (closed; its fix, `pkp/ojs#3459`, guards individual subscriptions only), covering the same fault for individual subscribers
- **Tracked in** spec U65 [OJS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#ojs4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an institutional subscription's contact has no country on their
profile, pressing "Subscriptions Report" on Statistics › "Reports"
makes the app fail on the server: no file arrives, the browser tab is
left blank and no message says why. Individual subscribers without a
country are listed with an empty "Country", as expected.

The journal gets no subscriber list at all, not even the individual
subscriptions. The file downloads again once every institutional
contact has a country.

Registration and the user's own Profile require a country, but the
editors' "Add User", "Edit User" and "Create New Reviewer" forms do
not, so a contact the journal's staff added can have none.

## Impact

- **Lost**: the subscriptions export; nothing stored is changed.
- **Who**: journal managers (and others allowed into "Reports") on a
  journal with institutional subscriptions.
- **Way round**: give each institutional contact a country under Users
  & Roles › "Edit User". Nothing names the contact that lacks one, so
  the manager opens each contact in turn.

Medium: a secondary export fails outright, with a way round on screen,
and only on journals where an institutional contact has no country. It
would be high if the report instead downloaded a file with subscribers
missing and no error, or if most journals with institutional
subscriptions met it.

## Steps to reproduce

Preconditions (PKP's default test dataset for OJS `main`; it holds no
subscriptions, so they are made on screen). The dataset's reviewer
`jdoe` (Jhon Doe) has no country on his profile, so he serves as the
contact.

1. Sign in as `rvaca` (Journal manager).
2. Settings › Distribution › "Payments": tick "Enable payments",
   currency "US Dollar", method "Manual Fee Payment", "Save" (the
   "Payments" and "Institutions" menu entries appear).
3. Institutions › "Add Institution": Name "u65ir1 Harbour Library",
   "Save".
4. Payments › "Subscription Types" › "Create New Subscription Type":
   "u65ir1 Campus Year", "Institutional", 400 USD, "Online", 12 months,
   "Save".
5. Payments › "Institutional Subscriptions" › "Create New
   Subscription": find `jdoe` under "Locate a User" and pick Jhon Doe;
   "u65ir1 Campus Year"; "Active"; start 2026-01-01, end 2026-12-31;
   institution "u65ir1 Harbour Library"; mailing address "2 Harbour
   Road"; domain "harbour.ac.uk"; "Save".
6. Statistics › "Reports": press "Subscriptions Report".

**Expected**: "subscriptions-20261002.csv" (today's date) downloads;
under "Institutional Subscriptions" it lists "u65ir1 Harbour Library"
with "Contact Name" "Jhon Doe" and an empty "Country".

**Observed**: nothing downloads. The tab leaves the "Reports" page for
a blank page. The request answers 500 with an empty body, though its
headers announce the file:

```
GET /index.php/publicknowledge/en/stats/reports/report?pluginName=SubscriptionReportPlugin
500  content-type: text/comma-separated-values;charset=utf-8
     content-disposition: attachment; filename=subscriptions-20261002.csv
```

The server log:

```
PHP Fatal error:  Uncaught TypeError: Sokil\IsoCodes\Database\Countries::getByAlpha2(): Argument #1 ($alpha2) must be of type string, null given, called in plugins/reports/subscriptions/SubscriptionReportPlugin.php on line 260
```

Control, on a freshly loaded dataset: steps 1–4; in step 4 also
"u65ir1 Online Year", "Individual", 40 USD, "Online", 12 months; step 5
with `ccorino` (Carlo Corino, country Italy) in place of `jdoe`; then
Payments › "Individual Subscriptions" › "Create New Subscription" for
`lvon` (Lisset Von, no country), "u65ir1 Online Year", "Active", the
same dates, "Save"; then step 6. The file downloads, with "Italy" on
Carlo Corino's row and an empty "Country" on Lisset Von's.

## Cause

`SubscriptionReportPlugin::display()` (OJS
`plugins/reports/subscriptions/SubscriptionReportPlugin.php`) writes
the institutional block's "Country" cell at line 260 with
`$countries->getByAlpha2($user->getCountry())`. A user with no country
returns `null` from `getCountry()`, and the isocodes library declares
`getByAlpha2(string $alpha2)`, so PHP throws an uncaught `TypeError`.
The CSV written so far (the byte-order mark and the heading rows) is
still in the output buffer, and the fatal error discards it: the
response goes out as a 500 with an empty body, still carrying the
`content-type` and `content-disposition` headers queued at lines
83–84. A user's country is optional, so this reader must allow it to be
empty.

The individual block (lines 160–165) checks the country first; that
check came with `pkp/pkp-lib#8086` (2022), which left the institutional
block as it was.

The unguarded call dates from e5f9a25bf6, which replaced
`CountryDAO::getCountry()` with the isocodes library
(`pkp/pkp-lib#5453`). The DAO looked the code up in a cache and gave
`null` back for an empty one; the library's typed parameter refuses
it.

Reach:

- `Identity::getCountryLocalized()` (lib/pkp
  `classes/identity/Identity.php`) already does this lookup with the
  empty check, and the users report (`lib/pkp/classes/user/Report.php`)
  uses it (code).
- The other `getByAlpha2()` callers in OJS and pkp-lib guard or cast
  their value: `PKPStatsPublicationController` (`!empty`),
  `ValidationServiceProvider` (`(string)`), `Identity`, the JATS
  template plugin (`ArticleFront`, inside its own check) (code).
- The site administrator's account is also installed without a
  country (code).

## Proposed fix

Read the country through `$user->getCountryLocalized()` in both blocks
of `SubscriptionReportPlugin::display()`, as the users report does,
and drop the plugin's own `Locale::getCountries()` lookup
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscriptions-report-contact-no-country/fix.diff),
against the OJS root):

```diff
                     case 'country':
-                        $country = $countries->getByAlpha2($user->getCountry());
-                        $columns[$index] = $country ? $country->getLocalName() : '';
+                        $columns[$index] = $user->getCountryLocalized() ?? '';
                         break;
```

In the individual block the same one line replaces the six-line check
(lines 160–165), and the now unused `$countries` variable and `use
PKP\facades\Locale` import are removed. The lookup belongs to
`Identity`, which every user and author shares; the plugin's own two
copies of it are what went out of step in 2022. The output is
unchanged: the same current-locale country name, or an empty cell.

Tried on OJS `main`: step 6 downloads the file with "Jhon Doe" and an
empty "Country". The control (a contact with a country, an individual
subscriber without one) gives the same file with the fix in and out:
"Italy" and an empty cell.

**Alternatives**

- Copy the individual block's `if ($userCountry)` guard to line 260:
  the smallest change, but keeps two hand-written lookups beside the
  shared one.
- Make `getByAlpha2()` callers cast to string: leaves each caller to
  remember it.

**What goes with it**

- No API or plugin hook change.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` (`SubscriptionReportPlugin.inc.php`,
  line 242) the same one-line change applies, but 3.3's
  `getCountryLocalized()` builds a new `IsoCodesFactory` on every call,
  one per row; copying the individual block's check is the cheaper
  backport there.
- Test: an e2e download of "Subscriptions Report" with an institutional
  contact who has no country (the spec's scenario for this report
  plans one); OJS has no unit test of report plugins.

Small: two lines in one OJS file, using a method the code base already
has, with an e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/subscriptions-report-contact-no-country/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscriptions-report-contact-no-country/walk.js)
  (helpers in `lib.js` beside it), steps 1–6 on an install freshly
  loaded from the default dataset (3.5: with
  `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=issues-ir1 PROBE_AGENT=ir1 node bin/probe.js ojs shared/playwright/checks/issues/subscriptions-report-contact-no-country/walk.js`;
  the Control is the same script with the argument `neighbour`, on a
  freshly loaded install.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/subscriptions-report-contact-no-country/fix.diff ojs`
- Tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a); `stable-3_5_0`
  [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6)
  (lib/pkp cf3f984335); `stable-3_4_0`
  [c1827e3527](https://github.com/pkp/ojs/commit/c1827e3527df2f402ba130af0ce82e6ed61cc33e)
  (lib/pkp 9e41f10273); `stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL; nothing here depends on the database.
- Walked: `main` and 3.5, the same Observed and the same log line
  (line 260 on both).
- Code reads: `SubscriptionReportPlugin::display()` on all four
  branches. 3.4 and 3.3 have the guarded individual block and the
  unguarded institutional call (3.3 line 242); 3.4's lib/pkp ships
  isocodes 4.2.0 and 3.3's 3.0.6, both with the `string` parameter
  (the `TypeError` in `pkp/pkp-lib#8086` was raised on 3.3.0.11).
  `Identity::getCountryLocalized()` has the empty check on all four.
- Introduced: `git blame` on line 260 gives 665ed1f925 (PSR-12
  reformat, `pkp/pkp-lib#5678`); at its parent the line comes from
  e5f9a25bf6, pushed without a PR (the API lists none). Its parent
  called `CountryDAO::getCountry()`, a cache lookup that does not take
  a typed argument; the version before e5f9a25bf6 was not walked.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-02; the fix of `pkp/pkp-lib#8086` on `main` is
  [8f3cee3f76](https://github.com/pkp/ojs/commit/8f3cee3f76b76ef5f2a3783721d77f5cf5d8a408).
- Unverified: the way round by "Edit User" was not walked; that a
  contact with a country downloads was (the control).
