# A preprint posted with a future "Date Posted" stays "Scheduled" for good and never goes public

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** no PR · [d4599004fb](https://github.com/pkp/ops/commit/d4599004fb8bf7c47e0ab329ebbec92460357ef9)
  · 2019-09-09 · Antti-Jussi Nygård (ajnyga); it made a future posted
  date schedule the preprint, with no task to post it later
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U49 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager or moderator who types a future date into "Date Posted" on a
preprint's "Preprint entry" page and then posts the preprint gets
"Status: Scheduled", not a posted preprint. It stays "Scheduled" after
the date, because the preprint server has no task that posts scheduled
preprints. Its public page never appears, while the authors receive the
usual email telling them it has been posted.

The only way round is to press "Unschedule" and post again by hand on
or after the date. Clearing the date and posting at once posts the
preprint the same day, with that day's date.

This needs a future date in a field whose help says to fill it only
when backdating.

## Impact

- **Lost**: the preprint's public record. Its page, its place on the
  home page, the preprints archive and section pages, OAI-PMH, the web
  feeds and the sitemap are all missing until someone posts it by hand.
  The authors are told it was posted (the posted acknowledgement, which
  is on by default), so neither they nor the editor hear otherwise.
- **Who**: managers and moderators who give a preprint a future "Date
  Posted", for example to release it on a set day, which a press's
  catalog entry does on its own. Their preprints' authors and readers
  are affected too.
- **Way round**: "Unschedule", then post again by hand on or after the
  date. Preprints already stuck this way are posted on the task's first
  run once the fix is in.

Medium: a public record is lost silently, but only in a rarely met
state, a future date in a field meant for backdating. Shown as an error,
this would be low, because the editor would simply post by hand on the
day. Silence lifts it one level, to medium, and no further. High would
need servers that commonly release preprints on a set day through this
field.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (or `stable-3_5_0`), "Public
  Knowledge Preprint Server". Submission 1, "The influence of lactation
  on the quantity and quality of cashmere production", is in Production
  and has never been posted.

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open submission 1, "The influence of lactation on the quantity and
   quality of cashmere production"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. In the side menu, under "Preprint", open "Preprint entry".
4. In "Date Posted", type tomorrow's date (YYYY-MM-DD) by the server's
   clock (`time_zone` in `config.inc.php`, UTC in the dataset), and
   press "Save".
5. Press "Post" at the top of the page, read the "Post the preprint"
   window, and press its "Post".
6. Read the head of the page.
7. Signed out, open `/index.php/publicknowledge/en/preprint/view/1`.
8. Move the server's clock to the posted date or later: in
   `config.inc.php` set `time_zone = "Pacific/Kiritimati"` (UTC+14,
   already on tomorrow's date after 10:00 UTC). Then in the OPS root run
   the scheduler's list and the publish task:
   `php lib/pkp/tools/scheduler.php list`, then
   `php lib/pkp/tools/scheduler.php test --name='PKP\task\PublishSubmissions'`.
   (`scheduler.php run`, which cron calls each minute, starts a daily
   task only at 00:00; `test` runs the task now.)
9. Repeat steps 1–2 and 6 (the head), then step 7 (the page).

**Expected**: steps 6 and 7 show "Status: Scheduled" and a page that is
not found until the date. On or after the posted date, the list shows
`0 0 * * * PKP\task\PublishSubmissions`, as a press's does, and the task
posts the preprint. Step 9 then reads "Status: Posted", and the
preprint page opens.

**Observed**: step 6 reads "Status: Scheduled", with "Preview" and
"Unschedule", and step 7 answers 404 Not Found. In step 8 the list names
no publish task (the daily ones are `RemoveFailedJobs`,
`RemoveExpiredInvitations` and `UsageStatsLoader`), and the task cannot
be run:

```
ERROR  No matching scheduled task found.
```

Step 9 still reads "Status: Scheduled", and the page still answers 404.

The "Post the preprint" window in step 5 does not mention the date. It
is the same as for an immediate post ("All requirements have been met.
Are you sure you want to post this?"), and the press's "Publish" window
has the same gap.

## Cause

On a preprint server, posting with a future date marks the publication
as scheduled. `APP\publication\Repository::setStatusOnPublish()`
([classes/publication/Repository.php](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/publication/Repository.php#L154-L168))
sets `STATUS_SCHEDULED` when `datePublished` is later than the current
date. OMP has the same method. The shared task `PKP\task\PublishSubmissions`
([lib/pkp/classes/task/PublishSubmissions.php](https://github.com/pkp/pkp-lib/blob/3dc90c81a638238c2241f5d3086f93865cb943b8/classes/task/PublishSubmissions.php#L38-L60))
posts these later. It finds the submissions in status "Scheduled" whose
`datePublished` is now or earlier, and publishes their current
publication.

OMP registers that task daily in `APP\scheduler\Scheduler::registerSchedules()`
([omp classes/scheduler/Scheduler.php](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/scheduler/Scheduler.php#L46-L51)).
OPS's `registerSchedules()`
([ops classes/scheduler/Scheduler.php](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/scheduler/Scheduler.php#L25-L35))
registers only `UsageStatsLoader` beside the shared tasks. OPS has no
other code that posts a scheduled preprint. A journal's scheduled
articles go live when their issue is published, and OPS has no issues.

d4599004fb was an early OPS commit that took issues out of posting. In
`PublicationService::publishPublicationBefore()` it replaced the check
"the issue is not published, so scheduled" with "the date is in the
future, so scheduled". That is OMP's rule. OPS's
`registry/scheduledTasks.xml` never received OMP's
`PKP\task\PublishSubmissions` entry. The move to the Laravel scheduler
(`pkp/pkp-lib#9678`, [dd6d6e3523](https://github.com/pkp/ops/commit/dd6d6e3523fe7bce5c9d77d84b793c799e2a8d61))
carried the XML list over to `Scheduler.php` unchanged.

Reach:

- OJS does not need the task and must not get it. Its
  `setStatusOnPublish()` schedules by the issue, and publishing the
  issue releases the article (code).
- The public lists leave out anything not posted: `IndexHandler`,
  `PreprintsHandler`, `SectionsHandler`, `OAIDAO`, `WebFeedGatewayPlugin`
  and `SitemapHandler` all filter on `STATUS_PUBLISHED` (code).
- The posting window (`APP\components\forms\publication\PublishForm`)
  shows one confirmation for every date (walked).

## Proposed fix

Register the shared publish task in OPS's scheduler, daily, as OMP
does:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/scheduled-preprint-never-posted/fix.diff).

```diff
 use APP\tasks\UsageStatsLoader;
 use PKP\scheduledTask\PKPScheduler;
+use PKP\task\PublishSubmissions;
 ...
         parent::registerSchedules();
 
+        $this
+            ->schedule
+            ->call(fn () => (new PublishSubmissions())->execute())
+            ->daily()
+            ->name(PublishSubmissions::class)
+            ->withoutOverlapping();
+
```

The registration belongs in the app's `Scheduler`, beside OMP's, not in
the shared `PKPScheduler`, because OJS must not run the task. The fix
keeps what d4599004fb was for: a future "Date Posted" schedules the
preprint, as OPS's texts expect ("The submission was scheduled to be
posted.", "Unschedule").

Tried on OPS `main`. With the fix in, the task run in step 8 reports
`Running [PKP\task\PublishSubmissions] … DONE`, step 9 reads "Status:
Posted" with "Unpost", and the preprint page opens. As a control, a
preprint dated 30 days out stayed "Scheduled", with its page at 404,
after the same task run. So the fix does not post a preprint before its
date. Without the fix the control reads the same, so the fix changes
nothing for preprints whose date has not come.

**Alternatives**:

- Refuse a future "Date Posted", to match the field's help. This drops
  a feature the code and the texts were built for, and it is a product
  decision.
- Register the task in `PKPScheduler`. OJS would then publish an
  article scheduled in an unpublished issue once its date has passed.

**What goes with it**:

- The posted acknowledgement. OPS's `SendPostedAcknowledgement::handle()`
  runs on every `publish()`, whatever the resulting status. Today the
  authors are told the preprint was posted when it is only scheduled.
  With the fix, they get a second acknowledgement when the task posts
  it (code). Whether the listener should skip `STATUS_SCHEDULED` is an
  open question awaiting the team's ruling (spec U49
  [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ops2)),
  so it is left out of this fix.
- A new version scheduled while an earlier version stays posted is left
  out of this fix too. While the earlier version is posted, the
  submission's status stays "Posted". The task reads only submissions in
  "Scheduled", so it never releases such a version, on OMP as well
  (code; not driven). Releasing it means changing what the task looks
  for, in both apps.
- The window's missing notice of the date is shared with the press's
  "Publish" window. It is better fixed for both together.
- Preprints already stuck in "Scheduled" with a past date are posted on
  the first run after the upgrade. No migration is needed, but a release
  note should say so.
- A test: post with a future date, run the task on or after the date,
  and expect "Posted".
- Backport: on 3.4 and 3.3 the same entry goes in OPS's
  `registry/scheduledTasks.xml`, as OMP's carries it
  (`PKP\task\PublishSubmissions`, or
  `lib.pkp.classes.task.PublishSubmissions` on 3.3). The diff applies to
  3.5 as written.

Small: one registration in one app file, following OMP's, and a test.

## Evidence

- Kept script, which takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/scheduled-preprint-never-posted/walk.js),
  with helpers in [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/scheduled-preprint-never-posted/lib.js).
  Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/scheduled-preprint-never-posted/walk.js`
  (`nb` as the argument runs the 30-day control alone;
  `PKP_E2E_LINE=stable-3_5_0` in front runs it on 3.5).
- Where the walk differed from the text: it used the `Pacific/Kiritimati`
  zone only for the scheduler commands, through a copy of the install's
  config, and read the pages under the install's own UTC config.
  Nothing in the database was changed by hand.
- Walked on PostgreSQL on 2 October 2026, datasets pkp/datasets e8dafbc
  (2026-10-02). On main: the Steps, the Steps with the fix in, and the
  control with the fix in and out. On 3.5: the Steps. 3.5's window has
  no version-stage paragraph, and its "Related Publication" line reads
  "This preprint has not been published elsewhere."
- Branch tips: OPS main
  [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
  with pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
  OPS stable-3_5_0 [38b61882d3](https://github.com/pkp/ops/commit/38b61882d3a2396f08e56e2c622ff654fbe48c44)
  with pkp-lib [cf3f984335](https://github.com/pkp/pkp-lib/commit/cf3f984335381e5794227e8079e56065052e2537);
  OPS stable-3_4_0 [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
  with pkp-lib [32b0f4b4af](https://github.com/pkp/pkp-lib/commit/32b0f4b4afc34c67655739319e1467957441cbf1);
  OPS stable-3_3_0 [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
  with pkp-lib [f6ab331645](https://github.com/pkp/pkp-lib/commit/f6ab331645d2168f4455322140dfa16ba118564d);
  OMP main [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262).
- Code reads:
  - 3.4: OPS `setStatusOnPublish()` is the same as main's, and OPS
    `registry/scheduledTasks.xml` holds no `PublishSubmissions`, while
    OMP's does. "Date Posted" is on `IssueEntryForm`.
  - 3.3: OPS `PublicationService::publishPublicationBefore()` sets
    `STATUS_SCHEDULED` for a future date, and OPS
    `registry/scheduledTasks.xml` lists only `StatisticsReport`.
    pkp-lib's `PublishSubmissions` exists there, and OMP's XML lists it.
    "Date Posted" is on `IssueEntryForm`.
- Not driven: 3.4 and 3.3 (code only), MySQL (the fault does not depend
  on the database), the scheduler's own run at 00:00, the emails (the
  first acknowledgement was seen in the spec's OPS2 drive; the second is
  read from the code), the public lists other than the preprint page,
  and the release of a scheduled new version.
