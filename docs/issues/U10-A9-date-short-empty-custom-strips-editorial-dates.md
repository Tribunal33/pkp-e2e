# After a manager saves an empty "Custom" short date, editorial dates show only the time

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#117` for `pkp/pkp-lib#5540` · [2b4d7bd782](https://github.com/pkp/ui-library/commit/2b4d7bd7821dea838c3f2b6b29d54bd78c2c1fab) · 2020-07-30 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a9)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager opens Settings › Website › "Date & Time", picks "Custom" under
"Date (Short)", leaves its box empty and presses "Save". "Saved" shows,
and the short dates go back to the installation's default. But the same
save also rewrites "Date & Time (Short)", a group the manager never
touched, to the time alone.

From then on every editorial timestamp that uses "Date & Time (Short)"
shows no date: a discussion message reads "11:58 AM" instead of
"2026-10-02 11:58 AM". Nothing on the page says so, and choosing another
"Date (Short)" does not bring the date back.

## Impact

- **Lost**: the date in editorial timestamps: discussion messages, file
  notes, the review history, the reviewer dates an editor reads, a
  library file's "Date uploaded", the emails list an author sees. The
  stored dates themselves are intact. Public pages keep their dates; the
  one exception is readers' comments on a published item, when
  "Comments" is turned on (it is off by default).
- **Who**: everyone who works in the language whose "Custom" was left
  empty, since each language's formats are saved on their own: editors,
  authors, and reviewers in the discussions they take part in.
  Reviewers' own due and submitted dates use "Date (Short)" and are
  unaffected. The trigger is unusual: the form's help text does not
  offer an empty "Custom" as a way back to the default, but a manager
  who tries "Custom" and changes their mind may well clear the box.
- **Way round**: choose the first choice under "Date & Time (Short)" and
  save. The manager has to see that this group, not the one they
  changed, is wrong.

Medium: every editorial date in that language loses its day until a
manager finds a group they never touched.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, context `publicknowledge`.
- The steps read a discussion message. OJS: submission 2, "The influence
  of lactation on the quantity and quality of cashmere production", has
  the discussion "Editor Recommendation" at Review. OMP: submission 6,
  "The Information Literacy User's Guide", has "Editor Recommendation"
  at Internal Review. OPS has no discussion in the dataset: as `dbarnes`,
  open preprint 1, "The influence of lactation on the quantity and
  quality of cashmere production", at Production, press "Add" under
  "Production Tasks & Discussions" (3.5: "Add discussion"), type the
  Name "u10g date check", tick David Buskins, type a message and press
  "Save".

Steps:

1. Sign in as `dbarnes`.
2. Open the submission in the workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=2`
   on OJS) at the discussion's stage, and press the discussion's name.
   The message's head reads "Message from minoue 2026-10-02 11:58 AM"
   (OJS; the dataset's own date and time).
3. Settings › Website › "Setup" › "Date & Time". "Date (Short)" is on
   its first choice (today's date as "2026-10-03") and "Date & Time
   (Short)" on its first choice ("2026-10-03 07:36 PM").
4. Under "Date (Short)", choose "Custom" and leave its box empty.
5. Press "Save". "Saved" shows beside the button.
6. Reload the page and open "Setup" › "Date & Time" again.
7. Open the discussion of step 2 again.

**Expected**: at step 6 "Date (Short)" is back on its first choice and
"Date & Time (Short)" stays on its first choice. At step 7 the message
still reads "Message from minoue 2026-10-02 11:58 AM".

**Observed**: at step 4 the first choice under "Date & Time (Short)",
still the chosen one, changes its label to `h:i A`. At step 6 "Date
(Short)" is on its first choice, and "Date & Time (Short)" is on
"Custom" with `h:i A` in its box. At step 7 the message reads:

```
Message from minoue 11:58 AM
```

OMP gives "Message from minoue 10:39 AM" and OPS "Message from dbarnes
05:36 PM". The save sent `dateFormatShort[en]=""` and
`datetimeFormatShort[en]=" h:i A"`.

Then, under "Date (Short)", choosing the fourth choice ("03.10.2026")
and saving leaves "Date & Time (Short)" on "Custom" with `h:i A`, and
the message still has no date. Choosing the first choice under "Date &
Time (Short)" and saving brings it back: "Message from minoue
02.10.2026 11:58 AM".

[On 3.5 the discussion opens in the older discussions window. Each
message row ends with the writer's username and, below it, the date and
time: "minoue 2026-10-03 11:04 AM" before, "minoue 11:04 AM" after.]

## Cause

ui-library's `DateTimeForm.vue` keeps "Date & Time (Short)" in step
with "Date (Short)" and "Time": when one of those two changes,
`fieldChanged()` passes the new date and time to `updateFields()`, which
rebuilds the combined value as `date + ' ' + time` if the combined field
still held the old combination. Choosing "Custom" makes
`FieldRadioInput.selectInput()` set the field's value to its box's text,
which is empty until something is typed. So `updateFields()` sees the
date `''`, finds the combined value `"Y-m-d h:i A"` equal to the old
combination, and replaces it with `'' + ' ' + 'h:i A'`.

On "Save", Laravel's `TrimStrings` and `ConvertEmptyStringsToNull`
middleware (registered in `PKPRoutingProvider.php`) turn the empty date
into null and trim the combined value to `h:i A`. A null date has no
stored format, so `Context::getLocalizedDateFormatShort()` falls back to
the configuration file's `date_format_short`. The combined value is a
format, so `getLocalizedDateTimeFormatShort()` uses it as it is.

The form treats an empty date or time as a format of its own. The
server treats it as "use the installation's default". So when a
manager empties one of the two, the form should build "Date & Time
(Short)" from the default it stands for, not from an empty string.

Reach:

- What prints "Date & Time (Short)" (checked in the code; walked for
  discussion messages): discussion messages (`DiscussionMessages.vue`
  on `main`, the query notes grid on 3.5 and older), a file's notes
  (`note.tpl`), a library file's "Date uploaded", the review history,
  the reviewer details an editor opens (`ReviewDetailsInfo.vue`,
  `readReview.tpl`), the emails list an author sees in the workflow
  (`WorkflowListingEmails.vue`), the comment moderation windows, and,
  on `main` with "Comments" on, readers' comments on a published item's
  page (`PkpComments.vue`). The reviewer's own pages use
  `formatShortDate()`.
- The same mistake in the other two combinations (checked in the code,
  not driven): an empty "Custom" under "Date" saves "Date & Time" as
  `- h:i A`, which no screen of a context prints today; an empty
  "Custom" under "Time" saves the two combinations as the date alone, so
  the editorial dates lose their time.

## Proposed fix

Give the form the installation's default formats, and have it combine
an empty date or time as the default it stands for
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/fix.diff)):

- pkp-lib `PKPDateTimeForm::getConfig()` adds `defaultFormats`
  (`date_format_long`, `date_format_short` and `time_format` from the
  configuration file), the way `PKPDoiSetupSettingsForm::getConfig()`
  adds its extra keys.
- ui-library `DateTimeForm.vue` takes it as a prop and reads every date
  and time through `effectiveFormat()`, both the new value and the old
  one `updateFields()` compares with:

```diff
+		effectiveFormat: function (name, value) {
+			return value || this.defaultFormats[name] || '';
+		},
 ...
-				shortDateTimeValue.date = value;
+				shortDateTimeValue.date = this.effectiveFormat(name, value);
 ...
-							? this.fieldBeforeSetEvent.value + ' ' + shortDateTime.value.time
-							: shortDateTime.value.date + ' ' + this.fieldBeforeSetEvent.value;
+							? oldFormat + ' ' + shortDateTime.value.time
+							: shortDateTime.value.date + ' ' + oldFormat;
```

An empty "Custom" date then saves "Date & Time (Short)" as the default
date with the context's own time (`Y-m-d H:i` on a context that chose
"15:05"). That is the value `PKPDateTimeForm` itself offers as the first
choice after the reload (`getLocalizedDateFormatShort() . ' ' .
getLocalizedTimeFormat()`), so the group reopens on its first choice. A
pattern typed into "Custom" still moves the combination letter by
letter, as today. The first choice's label also reads as a date again
("2026-10-03 08:32 PM") instead of the raw pattern.

Tried on `main`, OJS, OMP and OPS: with the fix in, step 5 sent
`datetimeFormatShort[en]="Y-m-d h:i A"`, step 6 showed "Date & Time
(Short)" on its first choice, and step 7 read "Message from minoue
2026-10-02 11:58 AM". With "Time" on "15:05", emptying a "Date (Short)"
"Custom" box that held "d/m/Y" saved `Y-m-d H:i`, the tab reopened with
"Date & Time (Short)" on its first choice, and the message read
"2026-10-02 11:58". A neighbour check gave the same result with the fix
in and out: "Custom" with "d/m/Y" typed under "Date (Short)" moved
"Date & Time (Short)" to `d/m/Y h:i A`, and the message read
"02/10/2026 11:58 AM".

**Alternatives**:

- Save the combination empty whenever one part is empty, so it falls
  back to `datetime_format_short`: one ui-library file, but that default
  carries the installation's time format, not the context's. A context
  on "15:05" would switch its editorial times to "11:58 AM", and "Date &
  Time (Short)" would reopen on "Custom".
- Leave the combination alone when the new value is empty: the first
  letter typed into "Custom" then no longer matches the old combination,
  so a typed pattern stops moving "Date & Time (Short)".
- Repair it on the server when saving: the server cannot tell a
  combination built from an empty part from a time-only format a
  manager chose on purpose.

**What goes with it**: no data repair, since a stored `h:i A` cannot be
told from a deliberate choice. A unit test of `DateTimeForm` (an empty
"Custom" combines with the default) would guard it. The diff applies to
3.5 as it stands. 3.4 and 3.3 have the same `updateFields()` with older
indentation, and 3.3 stores strftime patterns, so a backport makes the
same edit by hand.

Medium: two repos (pkp-lib and ui-library), a new key in the form's
config that the Vue form reads; no API or data change.

## Evidence

- The kept script walks the Steps and then the way round:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/lib.js)
  (the discussion helpers come from
  [the U53 A15 walk](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-fails-for-discussion-opener/lib.js)).
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the set of test installs, `<id>` the
  output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `neighbour` after
  the script's path walks the neighbour checks alone. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/date-short-empty-custom-strips-editorial-dates/fix.diff ojs omp ops`
  (it rebuilds the JavaScript).
- The walks ran in Chromium on PostgreSQL. Datasets: pkp/datasets
  566bb1f (2026-10-03). 3.5 showed the same on the three apps (the
  stored `h:i A`, the tab on "Custom", the message without its date,
  the way round).
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794c, OPS c8af945bb7;
  pkp-lib 987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS c1cee76b95, OMP
  9c5e24246c, OPS 38b61882d3; pkp-lib 771474347e (OJS) and cf3f984335
  (OMP, OPS); ui-library d4e01883. 3.4: pkp-lib 767353f4fe, ui-library
  ee684b34. 3.3: pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads beyond the Cause. 3.5: `DateTimeForm.vue` and
  `PKPDateTimeForm.php` identical to `main`'s. 3.4 and 3.3 (the pkp-lib
  and ui-library branches, which the three apps share): the same
  `updateFields()` lines and `FieldRadioInput.selectInput()`, the same
  combined first choices in `PKPDateTimeForm`, and the query notes grid
  printing `getLocalizedDateTimeFormatShort()` (3.3 with strftime
  patterns, so the stored value there is `%I:%M %p`).
  `schemas/context.json`: `enablePublicComments` defaults to false.
  `manager.setup.dateTime.description` points to the PHP format
  characters and says nothing about an empty "Custom".
- Introduced: `git blame` on `updateFields()` gives 2b4d7bd782 (Vitaliy
  Bezsheiko) for the combination lines, the commit that created the
  component; later commits only reformatted them. Nate Wright's
  `pkp/ui-library#117` merged it on 2020-08-26. `FieldRadioInput`'s
  "Custom" box has started empty since then.
- Upstream: searched pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and
  pkp/ops for an empty custom date format, `datetimeFormatShort`,
  `DateTimeForm`, "Date & Time (Short)" and dates showing the time
  alone. `pkp/pkp-lib#11079` (the choices' labels) and
  `pkp/pkp-lib#8814` (empty choices for a new language) are other
  faults of the same form.
- Not driven: 3.4 and 3.3 (code only); the empty "Custom" under "Date"
  and under "Time"; screens other than discussions; Firefox and Safari;
  MySQL (the fault is in the browser, not in a query).
