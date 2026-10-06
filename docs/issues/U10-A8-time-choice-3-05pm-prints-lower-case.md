# The "3:05PM" time choice prints most times as "3:05pm", some as "3:05PM"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#553` for `pkp/pkp-lib#9733` · [70e4f77b8c](https://github.com/pkp/ui-library/commit/70e4f77b8ca5493295272168ac7c7b09c8ddb5d9) · 2025-03-06 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a8)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Website › "Date & Time", the third "Time" choice reads
like "3:05PM". A manager who picks it and saves expects times written
that way. Most pages print them in lower case instead: a library file's
"Date uploaded" reads "2026-10-03 7:25pm".

The screens drawn in the browser follow the label, so the same journal
prints both forms. On `main` a discussion message reads "11:58AM" while
the library reads "7:25pm". On 3.5 only the tab's own labels and the
emails list in an author's workflow print "PM". Up to 3.4 the choice
read "3:05pm" and every page agreed.

It happens only with that choice, in English, and only on staff
screens, apart from readers' comments on `main`. French (Canada)
differs in another way, outside this report.

## Impact

- **Lost**: nothing; every time is correct.
- **Who**: managers who choose the third "Time" choice, and then
  editors, authors and reviewers who read times on staff screens in
  English. "03:05 PM" is the default, so only a manager's own choice
  leads here. Public pages print dates without a time; the one public
  place with a time is readers' comments on a published item, on `main`
  with "Comments" on (off by default), and those print "PM".
- **Way round**: "Custom" with `g:iA` prints "PM" on every page (read
  in the code, not walked). There is no way to get lower case
  everywhere.

Low: only a label and the case of "am/pm" disagree.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
- A discussion with a message. OJS: submission 2, "The influence of
  lactation on the quantity and quality of cashmere production", has
  "Editor Recommendation" at Review. OMP: submission 6, "The Information
  Literacy User's Guide", has "Editor Recommendation" at Internal
  Review. OPS has none: as `dbarnes`, open preprint 1, "The influence of
  lactation on the quantity and quality of cashmere production", at
  Production, press "Add" under "Production Tasks & Discussions" (3.5:
  "Add discussion"), type the Name "u10f time check", tick David
  Buskins, type a message and press "Save".

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Setup" › "Date & Time". Under "Time" the ready
   choices show the current time by your computer's clock: "21:25",
   "09:25 PM" (chosen) and "9:25PM".
3. Choose "9:25PM" and press "Save". Saving it also moves "Date & Time
   (Short)" from `Y-m-d h:i A` to `Y-m-d g:ia`; its choice now reads
   "2026-10-03 9:25PM". That is the format library files and
   discussions print with.
4. Settings › Workflow › "Publisher Library" (OMP "Press Library", OPS
   "Preprint Server Library"). Press "Add a file", type the Name "u10f
   time check", choose the Type "Other", upload a small text file and
   press "OK".
5. Press the arrow beside "u10f time check", then "Edit". Read "Date
   uploaded" in the "File" table.
6. Open the discussion of the preconditions in the workflow and read
   the message's date and time.

**Expected**: the choice reads the way times will print, and every
page prints them the same way, as up to 3.4, where this choice read
"9:25pm".

**Observed** (OJS). The step 2 labels use the browser's clock; the
times in steps 5 and 6 are stored times shown in the server's time zone
(UTC), two hours behind that browser:

```
Step 2:  "21:25", "09:25 PM", "9:25PM"
Step 5:  Date uploaded   2026-10-03 7:25pm
Step 6:  Message from minoue 2026-10-02 11:58AM
```

OMP gave "7:25pm" and "Message from minoue 2026-10-03 10:39AM"; OPS
"7:26pm" and "Message from dbarnes 2026-10-03 7:26PM". The save sent
`timeFormat[en]=g:ia` and `datetimeFormatShort[en]=Y-m-d g:ia`.

[On 3.5 the discussion opens in the older discussions window, which
the server prints, so it reads lower case like the library: "minoue
2026-10-03 11:04am". On 3.5 only the tab's labels and the emails list
in an author's workflow print "PM".]

## Cause

The server prints a date with Carbon's `translatedFormat()`
(`PKPTemplateManager::smartyDateFormat()`, the grids' cell providers).
For PHP's `a` that gives the lower-case meridiem ("pm"), for `A` the
upper-case one ("PM").

The browser prints a date with ui-library's
`formatDateWithPhpFormat()` (`src/utils/dateUtils.js`), which turns the
PHP pattern into a Luxon one with `phpToLuxonFormat()`
(`src/utils/convertPhpDateTimeFormatToLuxon.js`). That map sends both
`a` and `A` to Luxon's `a`, which has no lower-case form and prints "PM"
in English:

```js
a: 'a', // Lowercase Ante meridiem and Post meridiem
A: 'a', // Uppercase Ante meridiem and Post meridiem (Luxon doesn't distinguish case)
```

So the browser prints `g:ia` as "9:25PM" and the server as "9:25pm".
Before the move to Luxon the labels were drawn with moment, whose `a`
was lower case, which is why 3.4 and 3.3 read "9:25pm" throughout. The
tab's labels have gone through `formatDateWithPhpFormat()` since
`pkp/ui-library#558` (for `pkp/pkp-lib#11079`).

Reach:

- Prints through the browser, so "PM" (checked in the code; walked for
  the tab and discussion messages): the "Date & Time" tab's labels, its
  "Date & Time" and "Date & Time (Short)" choices included; and on
  `main`, discussion messages (`DiscussionMessages.vue`), the reviewer
  details an editor opens (`ReviewDetailsInfo.vue`), the emails list in
  an author's workflow (`WorkflowListingEmails.vue`, 3.5 too), the
  comment moderation windows and, with "Comments" on, readers' comments
  on a published item (`PkpComments.vue`).
- Prints on the server, so "pm" (checked in the code; walked for the
  library): a file's notes (`note.tpl`), a library file's "Date
  uploaded", the review history, an author's read review, the author
  dashboard's emails, and on 3.5 the discussions window.
- Any "Custom" pattern with `a` behaves the same.
- Left out, a different question: in French (Canada) Luxon writes the
  locale's "p.m." for both `a` and `A`, while Carbon has no French
  meridiem and prints "pm" and "PM" (Evidence). Which one is right is a product choice;
  the fix leaves French as it is.

## Proposed fix

Print PHP's `a` as Luxon's meridiem lower-cased, written into the
pattern as a quoted literal, in the one function every browser-side
date goes through
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/time-choice-3-05pm-prints-lower-case/fix.diff)):

```diff
-export function phpToLuxonFormat(phpFormat) {
+export function phpToLuxonFormat(phpFormat, overrides = {}) {
 	const formatMap = {
 ...
+		...overrides,
 	};
```

```diff
 export function formatDateWithPhpFormat(dateTime, phpFormat, locale = 'en') {
-	const luxonFormat = phpToLuxonFormat(phpFormat);
-	return dateTime.setLocale(getLuxonLocale(locale)).toFormat(luxonFormat);
+	const localizedDateTime = dateTime.setLocale(getLuxonLocale(locale));
+	const lowercaseMeridiem = localizedDateTime.toFormat('a').toLowerCase();
+	const luxonFormat = phpToLuxonFormat(phpFormat, {
+		a: toLuxonLiteral(lowercaseMeridiem),
+	});
+	return localizedDateTime.toFormat(luxonFormat);
+}
+
+function toLuxonLiteral(text) {
+	return text
+		.split('')
+		.map((char) => (char === "'" ? "''" : `'${char}'`))
+		.join('');
 }
```

In English this matches Carbon, which prints `a` as its meridiem
lower-cased. In French (Canada) Carbon prints "pm" while the browser,
with the fix, prints "p.m.", the question left out above.
`toLuxonLiteral()` quotes each character and writes a single quote as
Luxon's `''`. None of PKP's 71 locales has a quote in its meridiem
today, but the quoting keeps a pattern from breaking if one ever does.
`phpToLuxonFormat()` already writes escaped letters as quoted literals,
and `formatDateWithPhpFormat()` is its only caller, so the tab's labels
and every browser-side date are covered. `A`, `H:i` and an escaped `\a`
are unchanged.

Tried on `main`, OJS, OMP and OPS: with the fix in, the choice read
"9:38pm", "Date uploaded" "7:38pm" and the message "11:58am". A check
with the journal left on the default "03:05 PM" choice read the same
with the fix in and out: the English "Time" labels "21:40" and "09:40
PM", the French labels "09:40 p.m." and "9:40p.m." (the second and
third choices), and the discussion message "11:58 AM".

**Alternatives**:

- Change the choice's pattern to `g:iA`: every journal that saved
  `g:ia` keeps the mismatch, and a "Custom" pattern with `a` stays
  wrong.
- Lower-case the label in `DateTimeForm.vue`: the label would match the
  server, but the browser-side dates would still print "PM".
- Replace "AM"/"PM" in the formatted text: this would also change `A`
  and any literal text.

**What goes with it**: the diff adds a unit test beside the function,
`src/utils/dateUtils.test.js`, for `a`, `A`, `H:i` and an escaped `\a`
(`src/composables/useDate.test.js` is the other home; the function
needs no `pkp.context`). The test has not been run. No stored data
changes. `formatDateWithPhpFormat()` is the same on 3.5, so the diff
applies there; 3.5's `dateUtils.js` lacks some later helpers, so the
hunk lands at an offset. 3.4 and 3.3 need nothing. One more gap of
the same map is left out: PHP's `S` (the "th" in "24th") is dropped in
the browser, so a "Custom" `jS` pattern prints differently there too.

Small: a few lines in one ui-library folder.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/time-choice-3-05pm-prints-lower-case/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/time-choice-3-05pm-prints-lower-case/lib.js).
  On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout (`<feature>` names the set of test installs, `<id>`
  the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/time-choice-3-05pm-prints-lower-case/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `neighbour` after
  the script's path walks the check with the default choice alone; the
  fix goes in with `node bin/try-fix.js apply <fix.diff> ojs omp ops`.
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets 566bb1f
  (2026-10-03). Each save sent `timeFormat[en]=g:ia` and
  `datetimeFormatShort[en]=Y-m-d g:ia`, and the context's settings held
  them afterwards. 3.5 showed the same labels on the three apps, "Date
  uploaded" "7:20pm" to "7:22pm", and messages "11:04am" (OJS), "10:36am"
  (OMP) and "7:21pm" (OPS).
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS), the converter and
  `formatDateWithPhpFormat()` identical. 3.5:
  OJS c1cee76b95, OMP 9c5e24246c, OPS 38b61882d3; pkp-lib 771474347e
  (OJS) and cf3f984335 (OMP, OPS); ui-library d4e01883. 3.4: OJS
  d68934d0d1, pkp-lib 767353f4fe, ui-library ee684b34. 3.3: OJS
  ac77c9fb35, pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads. 3.5: `convertPhpDateTimeFormatToLuxon.js`,
  `formatDateWithPhpFormat()` and `DateTimeForm.vue` the same as
  `main`'s; `PKPDateTimeForm.php`
  offers `H:i`, `h:i A`, `g:ia`. 3.4 and 3.3 (`PKPDateTimeForm`,
  `DateTimeForm.vue`): the choices are strftime patterns (`%H:%M`,
  `%I:%M %p`, `%l:%M%P`), the labels are drawn with moment, whose
  `%P` → `a` is lower case, and the server prints `%P` in lower case.
  Public templates (the three apps' `templates/frontend`, pkp-lib's,
  the default themes) print no time format.
- Introduced: `git blame` on the `a: 'a'` line gives 70e4f77b8c, the
  commit that created the converter (`pkp/ui-library#553`, merged
  2025-03-06); 3.5 carries it as f699733a6d. Between it and 0e28ab1246
  the labels showed the raw pattern (`pkp/pkp-lib#11079`).
- Upstream: searched pkp/pkp-lib, pkp/ui-library and pkp/ojs for a time
  format in lower or upper case, am/pm, meridiem, `g:ia`, Luxon date
  formats, `phpToLuxonFormat`, `formatShortDateTime` and
  `DateTimeForm`. `pkp/pkp-lib#11079` (labels showing format symbols)
  and `pkp/pkp-lib#9733` (the move to Luxon) are the changes named
  above, not this fault.
- The fix's unit test was never run: the ui-library checkout has no
  dev dependencies installed, so vitest could not start. The two
  functions, run in Node against the app's Luxon, gave "3:05pm", "03:05
  PM", "2026-09-24 3:05pm", "15:05", "3:05 a", "9:05am", and "3:05p.m."
  in French; `toLuxonLiteral()` kept "a'b", "'x", "y'" and "o'clock h"
  as written. Luxon's `a` was read for PKP's 71 locales (pkp-lib
  `locale/`) in Node's ICU: none holds a quote.
- Not driven: 3.4 and 3.3 (code only); the reviewer details, emails
  list, comment windows, file notes and review history; a "Custom"
  pattern; Firefox and Safari; French (Canada) pages: Carbon 3.11.4
  from the `main` checkout, run alone, printed `g:ia | h:i A` as
  "3:05pm | 03:05 PM" for `en`, `fr_CA` and `fr`.
