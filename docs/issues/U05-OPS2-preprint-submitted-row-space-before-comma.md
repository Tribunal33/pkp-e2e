# On a preprint server, the Notifications tab's new-preprint row has a stray space before the comma

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; fixed there by 0f01b7885c in 2022, never ported to 3.4, 3.5 or main)
- **Introduced** [4109ca6688](https://github.com/pkp/ops/commit/4109ca6688e2f79a1e919507793d098084061c42) · 2019-06-04 · ajnyga (ajnyga), no PR
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U05 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#ops2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, the first row under "Submission Events" on a
person's Profile › "Notifications" tab, and the same row on an email's
"Unsubscribe" page, reads "A new preprint , "Title", has been
submitted.", with a space before the first comma. The journal's and the
press's rows have none.

Only the English wording carries the space (and the Macedonian
translation, copied from it). The fix was made on 3.3 in 2022 and never
reached the later versions, so it is ready to port.

## Impact

- **Lost**: nothing; the row's notification and email choices save as
  they should.
- **Who**: every account on a preprint server, whatever its role.
- **Way round**: none needed.

Low: a punctuation slip in a label.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` ("Public Knowledge Preprint
  Server", `publicknowledge`). Nothing else.

Steps:

1. Sign in as `dbarnes`.
2. Open the user menu's "Edit Profile" and the "Notifications" tab
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
3. Read the first row under "Submission Events".

**Expected**: no space before the comma, as on OPS 3.3:

```
A new preprint, "Title", has been submitted.
```

**Observed**:

```
A new preprint , "Title", has been submitted.
```

The journal's and the press's rows read "A new article, "Title," has
been submitted." and "A new monograph, "Title," has been submitted.".

## Cause

The English message `notification.type.submissionSubmitted` in OPS's
own locale file carries the space: `locale/en/locale.po` line 462 on
`main`:

```
msgid "notification.type.submissionSubmitted"
msgstr "A new preprint , \"{$title}\", has been submitted."
```

It dates from the 2019 commit that adapted OJS's English files to OPS
("clean locale files"), where "article" became "preprint " with a
trailing space: `A new preprint , "{$title}," has been submitted.`. The
move to `.po` files later that year
([93c92c3f71](https://github.com/pkp/ops/commit/93c92c3f7151e05e0aea25fdf33db32c4331fad6), 2019-11-13)
left the quotes unescaped. In July 2022 two commits escaped them and
also moved the comma outside the quotes, which is why OPS's comma sits
there, unlike OJS's and OMP's. On `stable-3_3_0`,
[0f01b7885c](https://github.com/pkp/ops/commit/0f01b7885c01161975f25a4429678dcdb78cbbc7)
also dropped the space. On `main`,
[09410d98f7](https://github.com/pkp/ops/commit/09410d98f7eddc859e7f67ffdd78d7b5b38b3815)
kept it, so 3.4 onwards carry it.

Where the message shows:

- The Profile › "Notifications" tab
  (`lib/pkp/templates/user/notificationSettingsForm.tpl`, which OPS's own
  copy only includes), with "Title" filled in (seen on screen).
- The "Unsubscribe" page (`lib/pkp/templates/notification/unsubscribeNotificationsForm.tpl`,
  which lists every row of `PKPNotificationManager::getNotificationSettingsMap()`
  through the same `{translate key=… title=…}` call) (code).
- `SubmissionNotificationManager::getNotificationMessage()` fills in the
  real title for the notification raised when a preprint is submitted
  (`SubEditorsDAO::assignEditors()`). That notification has the normal
  level, which no screen lists: the header's Tasks window shows only
  task-level notifications (`TaskNotificationsGridHandler`), and the
  email the moderators get is the "EDITOR_ASSIGN" template, not this
  sentence (code).
- Other languages: the Macedonian translation copied the space ("Нов
  препринт , "{$title}", е поднесен.", `locale/mk/locale.po` line 509);
  German, Ukrainian, Portuguese (Brazil), Czech and Bulgarian have none;
  the other languages leave the message empty or out.

## Proposed fix

Drop the space in OPS's English message and keep the comma outside the
quotes, as `stable-3_3_0` already did in 2022 ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submitted-row-space-before-comma/fix.diff)):

```diff
 msgid "notification.type.submissionSubmitted"
-msgstr "A new preprint , \"{$title}\", has been submitted."
+msgstr "A new preprint, \"{$title}\", has been submitted."
```

The same diff drops the same slip from the same 2019 commit in
`locale/en/editor.po`'s `editor.publicIdentificationExists`
("…another object (preprint , galley or file)…"). No code on any line
uses that message today, so no one sees it. A search of OPS's and
pkp-lib's English files for " ," finds no other instance.

Tried on `main`: with the fix in, the row reads "A new preprint,
"Title", has been submitted.". The tab in French, on all three apps,
shows the same rows with and without the fix.

**Alternatives**:

- Move the comma inside the quotes, as the journal and the press do:
  rejected, because the shared row below it ("A new version of your
  submission, "Title", was published.") and 3.3's fixed wording put it
  outside, and the slip is the space alone.

**What goes with it**:

- The `msgid` stays, so the translations are untouched. The Macedonian
  copy needs the same correction in Weblate.
- Backport: the diff applies as written to `stable-3_5_0` and
  `stable-3_4_0` (the same lines, a few lines lower on 3.4); 3.3 needs
  nothing.
- Guard: a wording check of the tab's rows in the U05 e2e spec (a
  Planned item there); a unit test would add nothing.

Small: one character in one English locale file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-submitted-row-space-before-comma/walk.js)
  (helper in `lib.js` beside it) takes the Steps on OJS, OMP and OPS,
  with OJS and OMP as the control. It runs as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-submitted-row-space-before-comma/walk.js`
  on an install loaded from PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03), PostgreSQL. With `neighbour` as its argument it
  reads the same tab in French (`fr_CA`) alone, to check the fix reaches
  no further.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS: the same
  Observed on OPS and the same control on OJS and OMP on both. The walk on
  `main` also tried to reach the "Unsubscribe" page through an email's
  footer link (a discussion with the author `ccorino`). The dataset's
  configuration leaves `api_key_secret` empty, so the link opened "404
  Not Found" (spec U05
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a6)).
  The Unsubscribe page is therefore read in the code only, and the Steps
  leave it out.
- Fix tried with `node bin/try-fix.js apply …/fix.diff ops` on `main`,
  then reverted with `node bin/try-fix.js revert …/fix.diff ops`.
- Tips: `main` OPS c8af945bb7 (lib/pkp 3dc90c81a6), OJS ff004d0973
  (lib/pkp 987776cd04), OMP 3b0ecf794c (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OPS 38b61882d3 (lib/pkp cf3f984335), OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c; `stable-3_4_0` OPS acd8ae704b
  (lib/pkp 767353f4fe); `stable-3_3_0` OPS c5532e2161 (lib/pkp
  ac3fa73402).
- Code reads, 3.5: `locale/en/locale.po` line 462, the same message;
  the two templates' `{translate key=… title=…}` lines as on `main`.
- Code reads, 3.4: `locale/en/locale.po` line 466, the same message;
  `lib/pkp/templates/user/notificationSettingsForm.tpl` line 41 and
  `lib/pkp/templates/notification/unsubscribeNotificationsForm.tpl` line
  30, the same calls.
- Code reads, 3.3: `locale/en_US/locale.po` line 483, "A new preprint,
  "{$title}", has been submitted.", without the space, since
  0f01b7885c.
- Trace: `git blame` on `main`'s line 462 gives 09410d98f7 ("Fixed bad
  escaping in locale files", 2022-07-15, Jonas Raoni Soares da Silva),
  which only escaped the quotes; `git log -S'A new preprint ,'` leads
  through 93c92c3f71 (the `.xml` to `.po` move, 2019-11-13) to
  4109ca6688, where the XML message first reads "A new preprint ,". The
  GitHub API lists no PR for 4109ca6688, 09410d98f7 or 0f01b7885c.
- `editor.publicIdentificationExists`: no PHP, template or JavaScript
  file of OPS or its pkp-lib uses it on `main`, 3.5, 3.4 or 3.3 (the
  code uses `editor.publicIdentificationExistsForTheSameType`).
- Upstream search: pkp/pkp-lib and pkp/ops, by "A new preprint" and
  `notification.type.submissionSubmitted`.
