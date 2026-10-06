# "Add Reviewer" list says "Yesterday" for a reviewer who was sent a request today

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#4312` · [c8cdbd9806](https://github.com/pkp/ui-library/commit/c8cdbd98062a3624be9aa3c7457c01637891544e) · 2023-11-16 · Alec Smecher (asmecher); backported to 3.4 and 3.3 as f328a5e0 and 654bf807
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A36](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a36)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "Add Reviewer" window's list, each reviewer's entry says how
long ago they were last sent a review request. A reviewer sent one
today reads "Yesterday", and expanded, 0 for "Days since last review
assigned". An editor cannot tell a reviewer invited minutes ago from
one invited the day before.

Only today's entries carry a wrong word. The other entries count
whole 24-hour periods rather than calendar days, so "Yesterday" covers
24 to 48 hours back and "{N} days ago" can be one day short of the
calendar.

Nothing is lost: the editor only judges how recently a reviewer was
asked by a wrong day. Fixing it touches both pkp-lib (a new "Today"
label) and ui-library (the count).

## Impact

- **Lost**: nothing.
- **Who**: an editor choosing among reviewers, on every journal and
  press, for each reviewer sent a request earlier the same day.
- **Way round**: none in the list; expanded, a reviewer asked today
  and one asked less than 24 hours earlier both read 0.

Low: a wrong word in a list, nothing saved or sent wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
  The browser and the install (`time_zone` in `config.inc.php`) in the
  same time zone. Nothing else is needed.

1. Sign in as `dbarnes`.
2. Open submission 12, "Sodium butyrate improves growth performance of
   weaned piglets during the first period after weaning" (Review,
   round 1).
3. Under "Reviewers", press "Add Reviewer", type "McCrae", press Enter,
   press "Select Reviewer" on "Aisla McCrae", and press "Add Reviewer".
4. Open submission 2, "The influence of lactation on the quantity and
   quality of cashmere production" (Review, round 1), and press "Add
   Reviewer". (In submission 12's own window her entry reads "This
   reviewer has already been assigned to this review round." in place
   of the figures.)
5. Type "McCrae" in "Locate a Reviewer" and press Enter. Read the line
   under her name: the "{N} active" badge, the count of completed
   reviews, then the days since her last request.
6. Press the arrow at the end of her entry ("Show more details about
   Aisla McCrae") and read "Days since last review assigned".

[On a press: add her on submission 17, "Open Development: Networked
Innovations in International Development" (Internal Review, round 1),
and read her entry on submission 9, "Enabling Openness: The future of
the information society in Latin America and the Caribbean" (Internal
Review, round 1).]

**Expected:** the line ends in "Today", agreeing with the 0 days of her
statistics.

**Observed:** "7 active", "2", "Yesterday"; expanded, "0" for "Days
since last review assigned". On the press: "4 active", "0",
"Yesterday", and 0.

## Cause

The entry is drawn by ui-library's `SelectReviewerListItem.vue`. Its
`daysSinceLastAssignment` counts the whole 24-hour periods since the
reviewer's `dateLastReviewAssignment` (the server's
`MAX(date_assigned)`, a date and time with no zone, parsed in the
browser's zone), so a request made today and one made yesterday less
than 24 hours ago both give 0. `daysSinceLastAssignmentLabelCompiled`
then prints "{$days} days ago" (`reviewer.list.daysSinceLastAssignment`)
above 1 and "Yesterday" (`reviewer.list.daySinceLastAssignment`) for
anything else, 0 included.

The 0 case reached "Yesterday" in c8cdbd9806 (`pkp/pkp-lib#4312`,
"Reviewer shown as 'never assigned' when they have active review
assignments", 2023), backported to 3.4 and 3.3. Until then the label
tested `!days`, so a request made within the last 24 hours read "Never
assigned"; the change returned `null` for a reviewer never assigned and
tested `=== null`, which sent 0 to the `else` branch. The 24-hour count
dates from 2018 (ui-library 5ff287dc).

Reach:

- The reviewer search of the "Add Reviewer" window on OJS and OMP, in
  every window but the round the reviewer was just added to (walked);
  the expanded figure comes from the same count.
- The list's "Filters" for days since the last assignment are applied
  on the server, which compares the last assignment's date and time
  with midnight of the day N days back; not changed here (code).

## Proposed fix

Count calendar days in the journal's time zone, and give 0 its own
label, "Today"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-assigned-today-reads-yesterday/fix.diff)):

- ui-library `src/utils/dateUtils.js`: a
  `calculateCalendarDaysBetweenDates(start, end)` beside
  `calculateDaysBetweenDates()`. It parses both with the module's
  `parseDateTimeString()` (Luxon, in `pkp.context.timeZone`, the
  install's `time_zone`, in which the server writes `date_assigned`),
  takes each day's start in that zone and returns the difference in
  days. `useDate()` exposes it, and `useDate.test.js` gets its test
  (same day, the day before at under and over 24 hours, two days).
- `SelectReviewerListItem.vue`: `daysSinceLastAssignment` calls it with
  the request's date and now; the label prints the new
  `todaySinceLastAssignmentLabel` for 0, "Yesterday" for 1 and
  "{$days} days ago" above. `SelectReviewerListPanel.vue` takes and
  passes the prop as it does the other labels, and
  `SelectReviewerListPanel.stories.js` sets it.
- pkp-lib `PKPSelectReviewerListPanel::getConfig()` fills the prop from
  a new key, `reviewer.list.todaySinceLastAssignment` ("Today", in
  `locale/en/editor.po`).

"Today" is then the journal's day, as every other date the backend
shows through `dateUtils.js`, not the browser's: the stored date carries
no zone, and the install's zone is the one it was written in. The
expanded figure counts calendar days too, so the words and the figure
agree: a request sent yesterday evening reads "Yesterday" and 1 the
next morning, where today's code reads "Yesterday" and 0.

Tried on `main`, OJS and OMP: Aisla McCrae reads "Today" and 0; a
reviewer last asked the day before, under 24 hours earlier, reads
"Yesterday" and 1. The new tests pass with the module's own tests.

**Alternatives**

- Luxon's relative-calendar wording (`toRelativeCalendar()`): no new
  key, but it would replace the translated labels the list already
  has with the browser's "today" / "yesterday" in lower case.
- Keep the 24-hour count and only add a label for 0 ("Less than a day
  ago"): smaller, but "Yesterday" would still cover requests made two
  calendar days back.

**What goes with it**

- Translations of the new key; until then other languages show the
  English word.
- No stored data; the API is unchanged. The panel prop is new, so a
  plugin that builds this list itself must pass it.
- Backport: 3.5 has `dateUtils.js` with the same helpers; 3.4 and 3.3
  have none, so a backport there counts calendar days in the component.

Medium: a new helper with its test and the component in ui-library,
and the panel's label and a new locale key in pkp-lib.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-assigned-today-reads-yesterday/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-template-chooser-nothing-to-choose/lib.js),
  run on an install loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02; PostgreSQL):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/reviewer-assigned-today-reads-yesterday/walk.js`
  (`K6_MODE=nb` reads only the reviewer of the day before).
- Walked on `main` and `stable-3_5_0`, OJS and OMP, 2026-10-03, browser
  and server at UTC.
- The reviewer of the day before: Julie Janssen, whose latest request
  is the dataset's own, dated 2026-10-02 between 11:39 and 12:13 UTC.
  Read under 24 hours later (the walks ran 04:20–10:10 UTC), she reads
  "Yesterday" and 0 without the fix and "Yesterday" and 1 with it. On a
  dump built more than a day before the walk she reads "{N} days ago"
  either way.
- Fix trial on `main`, OJS and OMP (the JavaScript rebuilt), with the
  Steps and Julie Janssen's entry. The tests ran with vitest 3.2.4 on
  ui-library 64d67363 with the diff applied: 6 passed in
  `useDate.test.js`.
- Not walked: a reviewer last asked two or more days before; a browser
  in another time zone than the install.
- Branch tips. `main`: OJS ff004d0973 (lib/pkp 987776cd04,
  lib/ui-library 64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). `stable-3_5_0`: OJS c1cee76b95, OMP
  9c5e24246 (lib/ui-library d4e01883). `stable-3_4_0`: lib/pkp
  767353f4fe, lib/ui-library ee684b34. `stable-3_3_0`: lib/pkp
  ac3fa73402, lib/ui-library 96959f9e.
- Code reads on 3.4 and 3.3: the same label logic and 24-hour count,
  and in the ui-library their app branches point at; `editor.po` holds
  "Yesterday" for `reviewer.list.daySinceLastAssignment`.
