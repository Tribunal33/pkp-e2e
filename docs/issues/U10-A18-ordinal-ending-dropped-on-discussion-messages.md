# A "Custom" date pattern with "S" prints "17 Oct" on discussion messages and workflow file lists, "17th Oct" elsewhere

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP; OPS (code)
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#553` for `pkp/pkp-lib#9733` · [70e4f77b8c](https://github.com/pkp/ui-library/commit/70e4f77b8ca5493295272168ac7c7b09c8ddb5d9) · 2025-03-06 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U10 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a18)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager types a "Custom" date pattern with "S", the English ordinal
ending, such as `jS M Y H:i` under "Date & Time (Short)". The
Publisher Library's "Date uploaded" then reads "19th Oct 2026 05:48",
but a discussion's messages read "17 Oct 2026 09:58", without the
ending. With `jS M Y` under "Date (Short)", the "Files for Review" list
in a submission's workflow reads "17 Oct 2026" right under the version
label "Unassigned version (17th Oct 2026)".

The ending goes missing on the lists the browser draws: discussion
messages, the workflow's file lists, the reviewer list's due dates, the
editorial dashboard and the emails list in an author's workflow. Pages
the server draws keep it: the Publisher Library, the version label,
file notes, the review history and the public pages. Up to 3.4 every
page that used the journal's pattern was drawn by the server, so the
ending showed everywhere. It went missing on the workflow lists in 3.5
and on discussions too on `main`.

In other languages the browser prints no ending either, while the
server prints that language's own ("1er" on the 1st in French, "5." in
German).

## Impact

- **Lost**: nothing; every date is correct, only the ending is missing
  on some lists.
- **Who**: editors, authors and reviewers working in English at a
  journal whose manager typed a "Custom" pattern with "S"; none of the
  ready choices holds one. On `main` one public place also drops the
  ending: an OJS article's published peer reviews, when "Date (Long)"
  holds "S" (read in the code, not walked).
- **Way round**: a pattern without "S" prints the same on every page.

Low: only the wording of a date differs, and only after a manager types
a pattern with "S".

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
  "Add discussion"), type the Name "h19r ordinal check", tick David
  Buskins, type a message and press "Save".

"Date & Time (Short)":

1. Sign in as `dbarnes`.
2. Settings › Website › "Setup" › "Date & Time". Under "Date & Time
   (Short)" choose "Custom", type `jS M Y H:i` in its box and press
   "Save".
3. Settings › Workflow › "Publisher Library" (OMP "Press Library", OPS
   "Preprint Server Library"). Press "Add a file", type the Name "h19r
   ordinal check", choose the Type "Other", upload a small text file and
   press "OK".
4. Press the arrow beside "h19r ordinal check", then "Edit". Read "Date
   uploaded" in the "File" table.
5. Open the submission of the preconditions from the dashboard. Under
   "Review Tasks & Discussions" (OJS at Review, OMP at Internal Review)
   or "Production Tasks & Discussions" (OPS), press the discussion's
   name, "Editor Recommendation" (OPS "h19r ordinal check"), and read
   the date in "Message from …".

"Date (Short)", on an install reloaded from the default dataset (the
first path's pattern would otherwise still be saved):

1. Sign in as `dbarnes`.
2. Settings › Website › "Setup" › "Date & Time". Under "Date (Short)"
   choose "Custom", type `jS M Y` in its box and press "Save". The tab
   also moves "Date & Time (Short)" to `jS M Y h:i A`.
3. Open from the dashboard OJS submission 12, "Sodium butyrate improves
   growth performance of weaned piglets during the first period after
   weaning", or OMP submission 2, "The West and Beyond: New Perspectives
   on an Imagined Region"; both open at Review. Read "Date uploaded" in
   "Files for Review", and the version's date in the menu on the left,
   under "Publication".

**Expected**: every date carries its ending. First path: "19th Oct 2026
05:48" in step 4 and "17th Oct 2026 09:58" in step 5. Second path:
"17th Oct 2026" both in the files list and in the version label (OJS).

**Observed** (`main`, OJS). The message's date comes from the dataset,
the library file's is the day of the walk:

```
"Date & Time (Short)", step 4:  Date uploaded  19th Oct 2026 05:48
"Date & Time (Short)", step 5:  Message from minoue 17 Oct 2026 09:58
"Date (Short)", step 3:         Unassigned version (17th Oct 2026)
                                Files for Review: Sodium butyrate … weaning.pdf  17 Oct 2026
```

OMP read "19th Oct 2026 05:49", "Message from minoue 18 Oct 2026 09:49",
"Unassigned version (18th Oct 2026)" and "chapter1.pdf 18 Oct 2026".
OPS read "19th Oct 2026 05:49" and "Message from dbarnes 19 Oct 2026
05:49"; its preprint shows no files list.

[On 3.5 the discussion opens in the older discussions window, which the
server draws, so step 5 keeps the ending: "minoue 18th Oct 2026 10:15".
The second path shows the fault on 3.5: "Files for Review" read "…
weaning.pdf 18 Oct 2026" (OJS) and "chapter1.pdf 18 Oct 2026" (OMP);
3.5 has no version label in that menu.]

## Cause

The server prints a date with Carbon's `translatedFormat()`
(`PKPTemplateManager::smartyDateFormat()`, the grids' cell providers).
For PHP's `S` Carbon writes the locale's ordinal ending: "st", "nd",
"rd" or "th" in English.

The browser prints a date with ui-library's `formatDateWithPhpFormat()`
(`src/utils/dateUtils.js`). It turns the journal's PHP pattern into a
Luxon one with `phpToLuxonFormat()`
(`src/utils/convertPhpDateTimeFormatToLuxon.js`), whose map sends `S` to
nothing, because Luxon has no ordinal token:

```js
S: '', // English ordinal suffix for the day of the month (no direct Luxon equivalent)
```

The line came with the converter itself, when the browser began
printing the journal's own patterns (`pkp/ui-library#553`). Each list
moved from a server-drawn grid to the browser since then lost the
ending; discussion messages moved on `main` with `pkp/pkp-lib#11291`
(`pkp/ui-library#680`).

Reach:

- Prints through the browser, so without the ending (checked in the
  code; walked for discussion messages and the files list): every
  `formatShortDate()`, `formatShortDateTime()`, `formatLongDate()`,
  `formatLongDateTime()` and `formatTime()` caller: discussion messages
  (`DiscussionMessages.vue`), the files lists' "Date uploaded"
  (`FileManagerCellDateUploaded.vue`), the reviewer list's due dates
  (`useReviewerManagerConfig.js`), the dashboard's activity column, the
  emails list in an author's workflow, the announcements list, and on
  `main` the users list's start dates, invitations, readers' comments
  and the published peer reviews on an article page
  (`PkpOpenReview*.vue`, "Date (Long)").
- Prints on the server, so with the ending (checked in the code; walked
  for the library and the version label): a library file's "Date
  uploaded", the version label (`publication/Repository.php`), a file's
  notes, the review history, the public pages' dates.
- The "Date & Time" tab's own labels go through the same function, but
  no ready choice holds `S`.
- Left out, a different question: in other languages Carbon writes that
  language's ending and the browser writes none, before and after the
  fix.

## Proposed fix

Hand the converter the English ending as a quoted Luxon literal for `S`,
through a new `overrides` argument, from `formatDateWithPhpFormat()`,
the one function every browser-side date goes through and the
converter's only caller
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ordinal-ending-dropped-on-discussion-messages/fix.diff);
its paths start at the app root, so inside a ui-library clone it applies
with `git apply -p3`):

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
+	const luxonFormat = phpToLuxonFormat(phpFormat, {
+		S: toLuxonLiteral(getEnglishOrdinalSuffix(localizedDateTime)),
+	});
+	return localizedDateTime.toFormat(luxonFormat);
+}
+
+function getEnglishOrdinalSuffix(dateTime) {
+	// An invalid DateTime has no locale; toFormat() prints "Invalid DateTime" for it
+	if (!dateTime.isValid || dateTime.locale.split('-')[0] !== 'en') {
+		return '';
+	}
+	const day = dateTime.day;
+	if (day >= 11 && day <= 13) {
+		return 'th';
+	}
+	return {1: 'st', 2: 'nd', 3: 'rd'}[day % 10] || 'th';
+}
+
+function toLuxonLiteral(text) {
+	return text
+		.split('')
+		.map((char) => (char === "'" ? "''" : `'${char}'`))
+		.join('');
 }
```

`phpToLuxonFormat()` cannot know the day, so the ending is worked out
where the date is at hand. The converter already writes escaped letters
as quoted literals, and an escaped `\S` still prints a literal "S". A
date Luxon cannot parse prints "Invalid DateTime", as today: without the
`isValid` check the new function would throw on it, because an invalid
DateTime has no locale.

Tried on `main`, OJS, OMP and OPS: with the fix in, the discussion
messages read "17th Oct 2026 09:58" (OJS), "18th Oct 2026 09:49" (OMP)
and "19th Oct 2026 06:32" (OPS), and "Files for Review" "17th Oct 2026"
and "18th Oct 2026", like the server-printed dates beside them. A check
with `j \S M Y H:i` saved read "17 S Oct 2026 09:58" in the discussion
and "19 S Oct 2026" in the library with the fix in and out. The
`isValid` check was added after that trial and tried again on OJS: the
first path read "19th Oct 2026 06:47" and "17th Oct 2026 09:58". No
screen sends an unparseable date, so that case was checked in Node:
"2026-10-05 04:38" (no seconds) prints "Invalid DateTime" before and
with the fix.

**Alternatives**:

- Port Carbon's per-language ordinal rules to the browser: it would
  match the server in every language, but it is a table of endings per
  language to keep in step with Carbon, for a pattern only typed by
  hand.
- Let the server send each date preformatted: every API response with
  a date would change.
- Strip `S` from a pattern on save: a manager loses the ending on the
  pages that print it today.

**What goes with it**:

- A unit test in `src/composables/useDate.test.js`, the existing home
  of the date tests, which already sets `global.pkp` (add
  `context.datetimeFormatShort` there): the 1st, 2nd, 3rd, 4th, 11th to
  13th, 21st to 23rd and 31st, an escaped `\S`, a French locale and an
  invalid date.
- The [U10 A8 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A8-time-choice-3-05pm-prints-lower-case.md) (`pkp-e2e#779`) proposes the same
  `overrides` argument, spread at the same place in the map, and the
  same `toLuxonLiteral()`, for PHP's `a`. Whichever lands second drops
  its own copy of both and adds its entry to the one `overrides` object:
  `{a: …, S: …}`.
- No stored data changes. The diff applies to 3.5 as written, at an
  offset in `dateUtils.js`; 3.4 and 3.3 need nothing.
- Left out: the converter's list of letters to quote misses some Luxon
  tokens, so an escaped `\o` prints "278" (the day of the year) instead
  of "o"; a separate fault.

Small: a few lines in one ui-library folder, and a unit test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ordinal-ending-dropped-on-discussion-messages/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ordinal-ending-dropped-on-discussion-messages/lib.js);
  its header gives the commands. `walk` takes the first path, `short`
  the second, `neighbour` the first with `j \S M Y H:i`.
- The walks ran in Chromium on PostgreSQL, on the default dataset from
  pkp/datasets eaf024c5 (2026-10-18). 3.5 read "Date uploaded" "19th Oct
  2026 05:41" (OJS, OMP) and "05:42" (OPS), and the messages "18th Oct
  2026 10:15" (OJS), "18th Oct 2026 09:43" (OMP) and "19th Oct 2026
  05:42" (OPS).
- Branch tips. `main`: OJS 6b4323ced7, OMP 5777025be, OPS f048e747b4;
  pkp-lib 042726ebf6, ui-library 99abe252 (all three). 3.5: OJS
  007c2cd0d6, OMP 2d575f250, OPS e737a9e465; pkp-lib 092ec34b0f,
  ui-library 2576e00a. 3.4: OJS 0012bd1022, pkp-lib a71d6bd2ca,
  ui-library ee684b34. 3.3: OJS d7d9dd14ec, pkp-lib 5e84acd11b,
  ui-library 96959f9e.
- Code reads. `main` and 3.5: `convertPhpDateTimeFormatToLuxon.js`
  identical in the three apps and on both lines;
  `formatDateWithPhpFormat()` the same. 3.5 has no `PkpOpenReview`,
  `PkpComments` or `UserAccessManager` page, and its OPS workflow shows
  no files list; OPS on 3.5 reaches the converter through the
  announcements list and the tab (code, not walked). 3.4: no converter;
  the ui-library uses the journal's formats only in the "Date & Time"
  tab, so every date in the journal's pattern is printed by the server
  (`smartyDateFormat()` with Carbon's `translatedFormat()`). That is the
  basis of "Up to 3.4 … the ending showed everywhere" and of the
  regression kind; 3.4 was not walked. 3.3: strftime patterns, which
  have no ordinal ending.
- Carbon (the `main` checkout's vendor copy), run alone: `jS` gave
  "1st 2nd 3rd 4th … 11th 12th 13th 21st 22nd 23rd" in `en`, "1er 2 3 …"
  in `fr_CA` and `fr`, "1. 2. …" in `de`, "1º …" in `es`.
- The fix's functions, run in Node against the app's Luxon: the English
  endings as Carbon's for the 1st to 4th, 11th to 13th, 21st to 23rd and
  31st; `l, F jS, Y` "Monday, October 5th, 2026"; `jS M Y H:i` in
  `fr_CA` "5 oct. 2026 04:38", as without the fix. The unit test was not
  run: the ui-library checkout has no dev dependencies installed.
- `DiscussionMessages.vue` was added by 86d3eb89 (`pkp/ui-library#680`,
  2025-08-14).
- Upstream: searched pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and
  pkp/ops for ordinal dates and suffixes, `phpToLuxonFormat`, custom
  date formats with Luxon, `jS`. `pkp/pkp-lib#9733` (the move to Luxon)
  and `pkp/pkp-lib#5517` (a list ignoring the journal's format, closed)
  are not this fault.
- Not driven: 3.4 and 3.3 (code only); the reviewer list's due dates,
  the emails list, the published peer reviews and other browser-drawn
  dates beyond the discussion, the files list and the dashboard; "Date
  (Long)" and "Time" patterns; French pages; an unparseable date on
  screen; Firefox and Safari. MySQL not checked (the fault is in the
  browser).
