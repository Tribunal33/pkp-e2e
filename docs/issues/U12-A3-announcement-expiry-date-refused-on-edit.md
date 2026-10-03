# "Edit Announcement" shows the expiry date in a format "Save" refuses, or one day early, which "Save" then stores

- **Severity** medium
- **Effort** medium
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#660` for `pkp/pkp-lib#11556` · [993573b439](https://github.com/pkp/ui-library/commit/993573b4395d23a629532676e3f60206e1631cf9) (3.5), forward-ported to main as [af709efd6d](https://github.com/pkp/ui-library/commit/af709efd6dbda7935b3089a36fc8bf369b6f69c1) · 2025-07-09 · Taslan A. Graham (taslangraham)
- **Upstream** `pkp/pkp-lib#11556`, closed; its fix is the Introduced change, which mends only part of it
- **Tracked in** spec U12 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U12-announcements.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager opens "Edit Announcement" on an announcement with an expiry
date and expects "Expiry Date" to show the date as it was entered,
YYYY-MM-DD, the only shape the box accepts. Instead the box shows the
date as the journal prints dates elsewhere, and in the browser's own
time zone.

On a journal whose "Date (Short)" is anything but YYYY-MM-DD (the
default), the box shows that format ("31-03-2027"), and "Save", even
with nothing changed, is refused with "The date format is not valid. Enter each date in the
format YYYY-MM-DD." until the manager retypes the date. In a browser
west of the install's time zone (an install on UTC, the default, edited
from the Americas), the box shows the day before, and "Save" stores it
without a word: every save of the panel moves the expiry one day
earlier, and the announcement leaves the public site early.

On a journal with the default "Date (Short)", edited from a browser at
or east of the install's time zone, the fault does not appear. The
site's own Announcements panel behaves the same.

## Impact

- **Lost**: with another "Date (Short)", the manager's time on every
  edit of a dated announcement. West of the install's time zone, the
  expiry date itself, so a call for papers disappears from the
  Announcements page and the home page before its deadline.
- **Who**: every manager who edits an announcement that has an expiry
  date, on a journal whose "Date (Short)" is not YYYY-MM-DD, or from a
  browser west of the install's time zone.
- **Way round**: retype the date as YYYY-MM-DD before each "Save". The
  shifted date is visible in the box, so a manager who checks it can
  retype it too; one who does not is not warned. Dates already moved
  stay wrong and cannot be found: nothing tells a moved date from an
  intended one.

Medium: a secondary task is refused with a way round, and its silent
form loses a day of a public deadline per save in a common setup; it
would be high if edits from west of the install's zone were the norm
rather than one setup among several.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`; the
  same on OMP and OPS). Its `config.inc.php` has `time_zone = UTC`,
  the default; the journal has its own "Date (Short)" unset (the
  installation's YYYY-MM-DD), no announcements, and announcements off.
- For steps 3 to 6, a browser on New York time (the computer's time
  zone set to America/New_York); steps 7 to 11 in a browser on the
  install's time zone (UTC).

Setup:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Setup" › "Announcements": tick "Enable
   announcements" and press "Save".

In a browser west of the install's time zone (New York):

3. Open "Announcements" in the side menu, press "Add Announcement",
   enter the "Title" "Workshop" and the "Expiry Date" `2027-03-31`, and
   press "Save".
4. Press "Edit" on "Workshop".
5. Without changing anything, press "Save".
6. Press "Edit" on "Workshop" again.

With "Date (Short)" in another format (a browser on UTC):

7. Settings › Website › "Setup" › "Date & Time": on the "English" tab,
   under "Date (Short)" choose the second format, which shows today's date day first
   ("03-10-2026" on 3 October 2026; `d-m-Y`), and press "Save".
8. Open "Announcements", press "Add Announcement", enter the "Title"
   "Call for papers" and the "Expiry Date" `2027-03-31`, and press
   "Save".
9. Press "Edit" on "Call for papers".
10. Without changing anything, press "Save".
11. Replace the "Expiry Date" with `2027-03-31` and press "Save".

**Expected:** steps 4, 6 and 9 show "Expiry Date" `2027-03-31`; steps 5
and 10 save and close the panel with the expiry date unchanged.

**Observed:** step 4 shows `2027-03-30`; step 5 saves and closes the
panel with no message, and the announcement's expiry date is now
2027-03-30 (the save sends `dateExpire=2027-03-30`, the answer carries
`"dateExpire": "2027-03-30T00:00:00.000000Z"`); step 6 shows
`2027-03-29`. Step 9 shows `31-03-2027`; step 10 is refused, the panel
stays open with "The date format is not valid. Enter each date in the
format YYYY-MM-DD." under "Expiry Date" and "Please correct one error.",
and the save request answers 400:

```
{"dateExpire":["The date format is not valid. Enter each date in the format YYYY-MM-DD."]}
```

Step 11 saves, with 2027-03-31 kept.

## Cause

The REST API sends an announcement's `dateExpire` as an ISO 8601
date-time in UTC (`"2027-03-31T00:00:00.000000Z"`, the model's
`datetime` cast), while the field and the API's own validation take a
plain date (`schemas/announcement.json`: `"date_format:Y-m-d"`).

lib/ui-library `AnnouncementsListPanel.vue::openEditModal()` converts
that value for the "Expiry Date" box with `formatShortDate()`
(`src/utils/dateUtils.js`), the display helper:

```js
if (field.name == 'dateExpire') {
	value = formatShortDate(value);
}
```

`formatShortDate()` does two things a display wants and an input must
not have. It prints in `pkp.context.dateFormatShort`, the context's
"Date (Short)" for the current language, so any format but `Y-m-d`
yields text the save refuses. And `parseDateTimeString()` reads an ISO
string with `DateTime.fromISO()` in the browser's zone, not the
install's (`pkp.context.timeZone`, which it applies only to strings
without a `T`). A browser west of the install's zone shows the
install's midnight as the evening before, so the box shows the day
before.

How it came about. Against 3.4, where the API sent the stored `Y-m-d`
string and the panel passed it through, the edit broke in 3.5.0 with
pkp-lib [070aa6f77b](https://github.com/pkp/pkp-lib/commit/070aa6f77b2b14e31b9089b5f82a48e8ba11c329)
(`pkp/pkp-lib#10328`, the `datetime` cast): in tag `3_5_0-0` the box showed
the raw ISO string and every edit was refused (`pkp/pkp-lib#11556`).
That issue's fix, `pkp/ui-library#660` (first in `3_5_0-1`), put `formatShortDate()`
there. It mended the default format in a browser at or east of the
install's zone only, and brought in the day shift.

Reach:

- The site's Announcements panel (Administration › Site Settings) uses
  the same component and prints with the installation's
  `date_format_short`: the same refusal when that is changed in
  `config.inc.php`, the same shift west of the install's zone (code).
- No other form feeds a display-formatted date into a box the API
  validates as `Y-m-d`: every other `formatShortDate()` and
  `formatShortDateTime()` call in ui-library prints into a table, a
  list or a message, and the other client-side `field.value`
  assignments (`ContributorsListPanel`, `HighlightsListPanel`,
  `InstitutionsListPanel`, `SubmissionFilesListPanel`,
  `ReviewerSuggestionsListPanel`, `Form.vue` after a save) copy the API
  value unchanged. The other date boxes (`datePublished` on the
  publication's Issue form in OJS and OPS, and on OMP's catalog entry) get their value from a publication's
  stored `Y-m-d` string on the server (code).
- Those display calls read an ISO date-time in the browser's zone as
  well, which only moves a printed date (code).

## Proposed fix

Give the box the date as the API takes it: YYYY-MM-DD in the install's
time zone, whatever the display format, and give the page the zone the
server actually uses
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/fix.diff)
for `main`,
[fix-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/fix-3_5.diff)
for `stable-3_5_0`).

In lib/ui-library, a helper beside `formatShortDate()` in
`src/utils/dateUtils.js`, exposed through `useDate()`, and
`openEditModal()` calling it:

```js
export function formatIsoDate(dateString) {
	if (!dateString) {
		return '';
	}
	return parseDateTimeString(dateString)
		.setZone(getConfiguredTimezone())
		.toISODate();
}
```

```diff
 					if (field.name == 'dateExpire') {
-						value = formatShortDate(value);
+						// The box and the API take YYYY-MM-DD, not the display format
+						value = formatIsoDate(value);
 					}
```

In lib/pkp `PKPTemplateManager::display()`, which builds `pkp.context`, the page's
`timeZone` becomes the zone PHP resolved rather than the raw setting:

```diff
-            'timeZone' => Config::getVar('general', 'time_zone'),
+            // The zone PHP resolved from `time_zone` (an empty or legacy setting included)
+            'timeZone' => date_default_timezone_get(),
```

The helper needs a zone Luxon can read. `PKPApplication::initializeTimeZone()`
accepts an empty `time_zone` (falling back to `date.timezone` or UTC)
and an old-style city name (`amsterdam` for Europe/Amsterdam), but the
page gets the raw setting: with the helper alone, an empty setting would
make "Edit" throw ("pkp.context.timeZone is not configured"), and an
old name would make `setZone()` invalid, open the box empty and let
"Save" clear the expiry. Sending `date_default_timezone_get()` fixes
that at the source, for every reader of `pkp.context.timeZone` (the
`Y-m-d H:i:s` parsing in `parseDateTimeString()` has the same exposure
today); a guard in the helper would have to fall back to a zone the
browser can only guess.

The rest keeps what `pkp/pkp-lib#11556` asked for (an unchanged edit
saves) and leaves the API as it is: the install's zone is the one the
server stored and serialized the date in.

Tried on OJS, OMP and OPS `main` with both changes in: steps 4 and 6
show `2027-03-31` and step 5 keeps 2027-03-31; step 9 shows
`2027-03-31` and step 10 saves. A neighbour check, the same with the
fix in and out, shows what the fix leaves alone: the page's time zone
stays `UTC` on the default install, an announcement without an expiry
date opens with an empty box and saves with none, and a date typed day
first (`31-03-2027`) is still refused with the same message.

**Alternatives**

- Send `dateExpire` as `Y-m-d` from the API (`pkp/pkp-lib#11575`,
  `toDateString()` in the announcement map): proposed for
  `pkp/pkp-lib#11556` and declined in review, because every other date
  in the API is ISO 8601 with its zone; it also changes what API
  clients read.
- Take the first ten characters of the ISO string: wrong on an install
  east of UTC, whose midnight is the day before in UTC.
- A `FieldDate` (`<input type="date">`) for "Expiry Date": the
  browser's date picker would show the date in the user's locale and
  post `Y-m-d`, but it would still need the value converted as above,
  and it changes the form for every theme and test; a larger change.

**What goes with it**

- A unit test in `src/composables/useDate.test.js` (in the diff), with
  the browser's zone pinned through Luxon's `Settings.defaultZone`:
  `formatIsoDate('2027-03-31T00:00:00.000000Z')` is `2027-03-31` with
  the install on UTC and the browser on America/New_York (the
  conversion in use today gives `2027-03-30` there), and
  `formatIsoDate('2027-03-30T22:00:00.000000Z')` is `2027-03-31` with
  the install on Europe/Prague.
- The e2e guard: a **Planned** item in spec U12 for an unchanged
  "Save" on "Edit Announcement" with another "Date (Short)" and a
  browser west of the install's zone.
- The submodule bumps in OJS, OMP and OPS. On `stable-3_5_0` the same
  change needs its own diff: `dateUtils.js` applies there, but
  `useDate.js` lacks the long-date helpers `main`'s hunk uses as
  context, and `PKPTemplateManager`'s `timeZone` line is the last entry
  of its array there, so `main`'s diff does not apply (fix-3_5.diff
  does, on all three apps). No data repair is possible (Impact).
- The resolved zone also mends the dashboard's dates for an install
  with an empty or old-style `time_zone`, since `getConfiguredTimezone()`
  is the only reader of `pkp.context.timeZone`.

Medium: a one-line change in pkp-lib beside the ui-library helper,
two repos, and a unit test; the pkp-lib line is what keeps the helper
safe on installs with an empty or old-style `time_zone`.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/walk.js)
  (helpers in `lib.js` beside it) takes steps 1 to 11 on the dataset
  as `rvaca`, in the order above: steps 3 to 6 in a second browser
  context with `timezoneId: 'America/New_York'`, steps 7 to 11 in the
  browser on UTC; it reads the stored `announcements.date_expire` after
  each save. Run from pkp-e2e on a dataset fleet:
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5); `U12R3_MODE=neighbour`
  runs the neighbour check alone. Titles in the walk carry a `u12r3`
  prefix.
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/fix.diff ojs omp ops`
  (rebuilds the JavaScript), the walk and the neighbour check, then
  `revert`; the neighbour check also ran without the fix. The unit
  test's assertions were run in Node against the committed
  `dateUtils.js` with and without the helper (vitest could not start in
  the test checkout, which lacks ui-library's development
  dependencies): all pass with the helper, and the conversion in use
  today gives `2027-03-30` and `31-03-2027`; `vitest` itself not run. fix-3_5.diff was checked to apply with no
  fuzz on the three `stable-3_5_0` apps (`patch --dry-run -F0`), not
  walked.
- Not walked: an empty or old-style `time_zone` in `config.inc.php`
  (no screen sets it); read in the code (`PKPApplication::initializeTimeZone()`,
  Luxon `setZone('amsterdam')` giving an invalid date).
- Walked 2026-10-03 on OJS, OMP and OPS `main` and `stable-3_5_0`, each
  on PKP's default test dataset (pkp/datasets 566bb1f, 2026-10-03) on
  PostgreSQL, the browser Chromium. The fault is in the browser's
  handling of the value the API sends, which is the same on MySQL; MySQL
  not walked.
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d6736318), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c570); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335),
  lib/ui-library d4e0188353 on all three.
- 3.4 and 3.3 (code): `origin/stable-3_4_0` and `origin/stable-3_3_0`
  of lib/ui-library pass `announcement[field.name]` to the box
  unchanged, and lib/pkp stores `date_expire` as a `date` column read
  back as a `Y-m-d` string (3.4 `EntityDAO`, 3.3
  `AnnouncementDAO`/`DAO::dateFromDB()`), so the box shows what the API
  validates; neither branch carries `pkp/ui-library#660`.
- Upstream searched 2026-10-03 (pkp/pkp-lib, pkp/ui-library, pkp/ojs,
  pkp/omp, pkp/ops; "announcement expiry date", "dateExpire",
  "formatShortDate", "AnnouncementsListPanel", "Expiry Date edit
  announcement", "announcement expiry timezone"): `pkp/pkp-lib#11556`
  and its PRs only; `pkp/pkp-lib#4216` (3.2, the old forms) is an
  earlier, unrelated fault.
- Unverified: an install on a zone other than UTC was not walked; the
  code reads the same way there (a browser west of the install's zone
  shows the day before).
