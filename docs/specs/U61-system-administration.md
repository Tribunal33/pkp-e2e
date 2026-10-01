---
name: system-administration
status: verified
---

# System administration & jobs

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

An installation keeps running between the journals' own work: it holds
people's sign-ins, keeps stored copies of pages and settings to answer
faster, runs background work ("jobs") that pages hand off, and runs
routine tasks on a timetable. The Site Administrator looks after that
machinery from the Administration page: reading which version and
configuration the installation runs, expiring the user sessions,
deleting the stored copies, deleting the routine tasks' logs, and
watching the queue of waiting jobs and the list of jobs that failed, where
a failed job can be tried again, looked into or deleted. The routine tasks
report their errors by email to the site's principal contact. The
Administration page also leads to the site's journals and the site's
settings, which other features describe. <sup>a</sup>

## Actors & permissions

Only the Site Administrator reaches Administration and the pages it leads
to. The Site Administrator may first be asked for their password on the
Confirm Access page ([Login & sessions](U01-login-and-sessions.md),
Rule 16). "Every other account" below means every signed-in account
without the Site Administrator role, a Journal Manager's included.

| Action | Who may, and when |
|--------|--------------------|
| **Open Administration and its tools** (Rules 1–3) | • Site Administrator: at the site's own address (Rule 3)<br>• every other account: the access-denied page, reading "The current role does not have access to this operation."<br>• signed out: the Login page <sup>a</sup> |
| **Read System Information** (Rules 5–8) | • Site Administrator alone <sup>a</sup> |
| **Expire the user sessions** (Rule 9) | • Site Administrator alone <sup>a</sup> |
| **Delete the stored copies and the task logs** (Rules 10–12) | • Site Administrator alone <sup>a</sup> |
| **See the queued jobs** (Rules 13–14) | • Site Administrator alone <sup>a</sup> |
| **Try again, delete, look into and requeue failed jobs** (Rules 15–19) | • Site Administrator alone <sup>a</sup> |
| **Receive a routine task's report** (Rule 22) | • the site's principal contact, an email address rather than an account (*Site settings*, Rule 14) <sup>u</sup> |
| **Download a routine task's log** (Rule 23) | • Site Administrator, from the report's link<br>• every other account: the access-denied page, reading "The current role does not have access to this operation."<br>• signed out: the Login page <sup>v</sup> |

## Fields & validation

None of these pages has a field to fill in. What each page lists, top to
bottom:

**Administration** (Rule 1)

| Panel (UI label) | Its text | Buttons, and where described |
|------------------|----------|------------------------------|
| "Site Management" | "Add, edit or remove journals from this site and manage site-wide settings." (a press: "Add, edit or remove presses from this site and manage site-wide settings."; a preprint server: "Add, edit or remove preprint servers from this site and manage site-wide settings."); in French a press's and a preprint server's panel reads "##admin.siteManagement.description##" in place of this line ⚠ [A7](#a7) | "Hosted Journals" ("Hosted Presses" on a press, "Hosted Servers" on a preprint server; *Hosted journals*), "Site Settings" ([Site settings](U60-site-settings.md)) |
| "System Information" | "View information about the version and configuration settings of the application and server." | "View System Information" (Rules 5–8) |
| "Expire User Sessions" | "All users will be immediately logged out of the application, including you, and will need to login again." | "Expire User Sessions" (Rule 9) |
| "Delete Caches" | "Delete cache files from the system. This should only be done in development environments." | "Delete Data Caches" (Rule 10), "Delete Template Cache" (Rule 11) |
| "Clear Scheduled Task Logs" | "Delete all logs of scheduled tasks processes that have been run." | "Delete Task Logs" (Rule 12) |
| "Jobs" | "View all of the queued jobs in the system and track failed attempts." | "View Jobs" (Rule 13), "View Failed Jobs" (Rule 15) |

**System Information** (Rule 5)

| Part (UI label) | What it shows | Rule |
|-----------------|---------------|------|
| "Current version: {version} ({date and time installed})" | the version the installation runs | 5 |
| "Check for updates" | a link | 6 |
| "Version history" | a table: "Version", "Major", "Minor", "Revision", "Build", "Date installed", one row per version ever installed | 5 |
| "Server Information" | a table ("Setting Name", "Setting Value") with the rows "OS platform", "PHP version", "Apache version", "Database driver", "Database server version" | 5 |
| "OJS Configuration" ("OMP Configuration", "OPS Configuration") | a table ("Setting Name", "Setting Value") of the configuration file | 7 |
| "Extended PHP Information" | a link | 8 |

**Jobs** (Rule 13): a table titled "View queued jobs", its line "There's a
total of **{n}** job(s) on the queue", and the columns "ID", "Job",
"Queue", "Attempts", "Created At". No row has a control.

**Failed Jobs** (Rule 15): a table titled "View Failed Jobs", its line
"There's a total of **{n}** failed job(s).", the button "Requeue All
Failed Jobs" at its top right while the total is above 0, and the columns
"ID", "Job", "Queue", "Connection", "Failed At", "Actions"; each row's
"Actions" cell holds "Try Again", "Delete" (in red) and "Details".

**Failed Job Details** (Rule 18): a table titled "View Failed Job:{id}
Details" with the columns "Attribute" and "Attribute Value", and the rows
"ID", "Job", "Queue", "Connection", "Failed At", "Payload", "Exception".

## Rules & state

**The Administration page**

1. <a id="administration-page"></a> **Where it is.** Administration opens
   a page headed "Administration" (its browser tab reads "Site
   Administration"), holding the six panels of the Fields table in that
   order. It is reached from the "Administration" entry of the user menu
   on the site's and each journal's public pages, from the side menu's
   "Administration" on a journal's editorial screens
   ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)),
   or at the site's address with "admin" after it. The Administration
   pages themselves carry no side menu. <sup>b</sup> <sup>c</sup>
2. **The trail back.** Each page a panel leads to shows a trail above its
   heading: "Administration", a link back to this page, then the page's
   own name ("System Information", "Jobs", "Failed Jobs", "Failed Job
   Details"). The Failed Job Details trail has no step for "Failed Jobs".
   Administration itself carries no trail. <sup>b</sup>
3. **Only at the site's own address.** Administration and every page and
   button of this spec work at the site's address ("index" where a
   journal's path would be). Asked for with a journal's path in the
   address, they do not open for anyone, the Site Administrator
   included: the access-denied page reads "Access denied."
   ([Site settings](U60-site-settings.md), Rule 3, is the same rule for
   its page). <sup>d</sup>
4. <a id="newer-release"></a> **A newer release.** When the installation
   learns that a newer release exists, Administration, Hosted Journals
   ("Hosted Presses" on a press, "Hosted Servers" on a preprint server),
   Site Settings and System Information open with a notice: "There is a
   new version of OJS available! You are currently using OJS {version}.
   The most recent version is OJS {version}. Please visit this page to
   download the most recent version and find upgrade instructions.",
   "this page" being a link to PKP's download page in a new tab (a press
   and a preprint server name their own application, and a press's link
   reads "the PKP website" [OMP1](#omp1)). The installation asks PKP's
   site on every load of those pages, and of the Jobs and Failed Jobs
   pages, which never show the notice; when the answer does not come, the
   page shows no notice and nothing else. The test installs never reach
   PKP's site, so they never show it. A journal's own Settings › Journal
   page carries the managers' version of the notice
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 4b). <sup>e</sup>

**System Information**

5. **The page.** "View System Information" opens a page headed "System
   Information" with the parts of the Fields table in that order. The
   version is the one the database was last installed or upgraded to,
   with the date and time of that step. "Server Information" names the
   server's operating system, PHP version and database; the "Apache
   version" row shows the web server software's own name and version,
   whatever that server is. Nothing on the page can be changed.
   <sup>f</sup>
6. **"Check for updates".** The link reloads the page after asking PKP's
   site for its latest release. In the link's place the page then shows
   "Latest version: {release} ({date})" and under it either "Your system
   is up-to-date" or "An updated version is available: Download |
   Download Patch | More Information", "Download" and "More Information"
   being links, and "Download Patch" a link only when PKP offers a patch
   from this version. An installation that cannot reach PKP's site, as
   the test installs cannot, gets an empty page instead, with no heading
   and no text ⚠ [A1](#a1). <sup>g</sup> <sup>td1</sup>
7. **The configuration table.** It lists every setting of the
   installation's configuration file, grouped under each section's name
   in bold ("general", "database", "queues", and so on), each setting by
   its name in the file. A value reads as written in the file, without
   its quotes, except that a setting switched "On" reads "1", one
   switched "Off" leaves the value cell empty, and a number written with
   a leading 0 reads as another number ("umask" 0022 reads "18"). A
   section with no settings shows its bold name alone. <sup>h</sup>
   <sup>td2</sup>
   - 7b. **Hidden values.** The values of these settings read
     "**************" instead: the database "password", the email
     "smtp_username" and "smtp_password", the general "app_key" and
     "sentry_dsn", the security "salt" and "api_key_secret", the captcha
     "recaptcha_private_key" and "altcha_hmackey", the search
     "opensearch_password", the proxy "http_proxy" and "https_proxy",
     and any setting whose name contains "password", "api_key",
     "private_key" or "secret". <sup>h</sup> <sup>td2</sup>
8. **"Extended PHP Information".** The link at the foot of the page opens
   a new browser tab with PHP's own page about the server's PHP
   installation, headed with its PHP version. <sup>i</sup>

**Sessions and stored copies**

9. **"Expire User Sessions".** Pressing it opens the browser's own
   confirmation box, "Are you sure you want to expire all user sessions?
   All users who are currently logged into the system will be forced to
   log in again (yourself included).". "Cancel" changes nothing.
   <sup>j</sup>
   - 9a. **"OK"** takes the Site Administrator to the site's Login page,
     headed "Login", with no message. <sup>td3</sup>
   - 9b. **Accounts stay as they were.** No account loses a role or its
     password: each signs in again with the password it had.
     <sup>td4</sup>
10. **"Delete Data Caches".** Pressing it asks nothing. It empties the
    copies the installation keeps between requests to answer faster:
    each journal's plugin settings, its menus and role lists, the
    interface translations, the plugin gallery's list, and {OJS} the copy
    of an HTML galley's page served to readers who are not signed in,
    among others. Each is built again the next time a page needs it. The
    Administration page shows again with no message ⚠ [A2](#a2).
    <sup>k</sup>
11. **"Delete Template Cache".** Pressing it opens the browser's
    confirmation box "Are you sure you want to clear the cache of
    compiled templates?". "OK" empties the prepared page templates and
    the style sheets built from each theme; every page builds them again
    on its next load, and nothing on the pages changes. The
    Administration page shows again with no message
    [A2](#a2). "Cancel" changes nothing. <sup>l</sup>
12. **"Delete Task Logs".** Pressing it opens the browser's confirmation
    box "Are you sure you want to delete all scheduled task execution
    logs?". "OK" deletes the log file of every routine task run so far
    (Rule 21); the Administration page shows again with no message
    [A2](#a2). A log link in an earlier report email (Rule 23) then opens
    an empty page. "Cancel" changes nothing. <sup>m</sup> <sup>td5</sup>

**Jobs**

13. **The Jobs page.** "View Jobs" opens a page headed "Jobs" whose table
    (Fields above) lists the jobs waiting on the installation's queue,
    whichever journal or feature put them there. A row gives the job's
    number ("ID"), its internal name ("Job"), the queue it waits on
    ("Queue"), how many times it was attempted ("Attempts"), and in the
    "Created At" column the text "Created at {date} {time}" followed by a
    time-zone name and a bare number, "GMT+0000 0" on the test installs
    (for example "Created at 2026-09-26 22:16:23 GMT+0000 0"). A job
    being run at that moment is neither listed nor counted. The rows
    follow no particular order. Past 50 jobs, the table shows 50 at a
    time with page links under it; with none, the table reads "No Items"
    and the line reads "There's a total of **0** job(s) on the queue".
    The page shows what was waiting when it was opened and does not
    refresh by itself. <sup>n</sup> <sup>td6</sup>
14. **When jobs run.** On an installation with the built-in job runner
    switched on (the install default, Settings bullet 1), waiting jobs
    are run at the end of the requests people's pages make, so the list
    is usually short. With it off, as on the test installs, a job waits
    on the Jobs page until a job worker runs it outside the application.
    A job that fails its last attempt leaves the queue for the Failed
    Jobs page (Rule 15). <sup>o</sup>
15. **The Failed Jobs page.** "View Failed Jobs" opens a page headed
    "Failed Jobs" whose table (Fields above) lists every job that failed
    for good, a row per job, with the date and time of the failure under
    "Failed At", followed by a time-zone name and a bare number, "UTC 0"
    on the test installs (for example "2026-09-26 22:16:41 UTC 0"; the
    Failed Job Details page reads the same). Paging and order are as on
    the Jobs page (Rule 13). With none, the table reads "No Items", the
    line "There's a total of **0** failed job(s).", and "Requeue All
    Failed Jobs" is not offered.
    <sup>p</sup>
16. **"Try Again".** It puts the row's job back on the queue it came from
    as a new job (a new ID, "Attempts" 0) and takes it off the failed
    list: the notice "Failed job redispatched successfully." shows at the
    top right, the row leaves the table and the total drops by one. The
    Jobs page then lists the job (Rule 13). A failed job with no stored
    data to run from is refused with "The failed job missing the payload
    to be redispatched." (Rule 17b). <sup>q</sup>
17. **"Delete".** Pressing it asks nothing ⚠ [A3](#a3). It removes the
    failed job for good: the notice "Failed job deleted successfully from
    failed list." shows at the top right, the row leaves the table and
    the total drops by one. <sup>q</sup>
    - 17b. **A refused action.** When "Try Again" or "Delete" is refused,
      a window titled "Error" gives the reason with an "OK" button, and
      the row stays. A job already taken off the list elsewhere (in
      another tab, say) gets "The failed job not found in failed list.".
      <sup>q</sup> <sup>td7</sup>
18. **"Details".** It opens, in the same tab, a page headed "Failed Job
    Details" whose table (Fields above) gives the failed job's number,
    internal name, queue, connection and failure time, then under
    "Payload" the data the job was queued with, laid out over several
    lines, and under "Exception" the error that made it fail with the
    trail of where it happened. The page has no control; the trail's
    "Administration" is its way out (Rule 2). Opened again once the job
    is no longer on the list (from a bookmark or another tab), or with a
    number no failed job has at the end of its address, the page is a
    bare one reading "404 Not Found", with no header and no way back.
    <sup>r</sup> <sup>td8</sup>
19. **"Requeue All Failed Jobs".** It puts every failed job of the
    installation back on its queue, those on later pages included, as
    "Try Again" does one: the notice "All redispatchable failed jobs with
    valid payload have been requeued successfully." shows at the top
    right and the table reloads, empty (Rule 15). Failed jobs with no
    stored data are left on the list ⚠ [A4](#a4). When the list was
    already emptied elsewhere (in another tab, say), the button is
    refused: a window titled "Error" reads "No failed job found in the
    list." with "OK", and the rows stay ⚠ [A6](#a6). <sup>s</sup>
20. **Old failed jobs go by themselves.** Once a day, at midnight, a
    routine task removes the failed jobs that failed before the start of
    the day 180 days ago (Settings bullet 4); one that failed 180 days
    and a few hours ago stays until a later day's run. <sup>t</sup>

**Routine tasks ("scheduled tasks")**

21. **What they are.** The installation runs routine tasks on a
    timetable: this spec's two are the daily removal of old failed jobs
    (Rule 20) and, every minute, running waiting jobs when the
    configuration hands that to the tasks (Settings bullet 3); the others
    (reminders, deposits, usage statistics and the like) belong to the
    features they serve. Each run writes a log file on the server. With
    the built-in task runner switched on (the install default, Settings
    bullet 5), due tasks run at the end of people's requests at most once
    a minute; the test installs run none. <sup>t</sup>
22. **The report email.** A task run that ends in error sends an email to
    the site's principal contact, from that same name and address
    (Actors). Its subject joins the task's name, the run's code and
    "Error" with " - " ("Update DB-IP city lite database -
    6ab84ed618727 - Error"); its body reads "Your Open Journal Systems
    installation automatically executed and finished this task and you
    can download the log file here: {link}" (a press and a preprint
    server name their own application).
    A run that ends well sends nothing, unless the configuration asks for
    a report on every run (Settings bullet 6), whose subject then ends in
    "Completed". <sup>u</sup>
23. **The log link.** Opened by the Site Administrator, the report's
    link downloads that run's log file; for who else may open it, see
    Actors. After "Delete Task Logs" the link opens an empty page
    (Rule 12). <sup>v</sup>

## Side effects

- "Expire User Sessions" changes no account (Rule 9b). <sup>td4</sup>
- When the installation's configuration turns security audit logging on
  (it is off on a fresh installation), "Expire User Sessions", "Delete
  Data Caches", "Delete Template Cache" and "Delete Task Logs" each write
  one line to the installation's log ("All user sessions expired", "Data
  cache cleared", "Template cache cleared", "Scheduled task logs
  cleared"); no screen shows that log. <sup>w</sup>
- On an installation that cannot reach PKP's site, each "Check for
  updates" writes one error line to the installation's log [A1](#a1).
  No other action of this spec writes there while security audit logging
  is off. <sup>w</sup>
- "Try Again" and "Requeue All Failed Jobs" put jobs back on the queue
  (Rules 16, 19): with the built-in job runner on, they run again at the
  end of a later request, and one that fails again returns to the Failed
  Jobs page under a new ID. <sup>o</sup> <sup>q</sup>
- A routine task that ends in error emails the site's principal contact
  (Rule 22). No other action of this spec sends an email, raises a
  notification or writes to any journal's logs. <sup>u</sup>

## Settings that modify behavior

All of these are lines of the installation's configuration file, read by
the server; none can be changed on a screen, and System Information shows
each one the file sets under its section (Rule 7), by the name given in
quotes. A setting left commented out in the file, as "password_timeout"
is on a fresh installation, has no row there.

1. **The built-in job runner** ("job_runner" under "queues"; on). On:
   waiting jobs run at the end of people's requests (Rule 14). Off, as on
   the test installs: jobs wait on the Jobs page until a job worker runs
   them. <sup>o</sup>
2. **The job runner's limits** ("job_runner_max_jobs" 30,
   "job_runner_max_execution_time" 30 seconds, "job_runner_max_memory"
   80 per cent, "job_runner_cross_request_lock" on, under "queues"). How
   many jobs one request runs and for how long, and whether two requests
   may run jobs at once; smaller limits leave more jobs waiting on the
   Jobs page. <sup>o</sup>
3. **Jobs run by the routine tasks** ("process_jobs_at_task_scheduler"
   under "queues"; off). On: the every-minute task runs waiting jobs
   (Rule 21), except while the built-in job runner and task runner are
   both on. Off: that task does nothing. <sup>t</sup>
4. **How long failed jobs are kept** ("delete_failed_jobs_after" under
   "queues"; 180 days). Another number: the daily removal of Rule 20
   uses it. Removed from the file: failed jobs stay until deleted by
   hand. <sup>t</sup>
5. **The built-in task runner** ("task_runner" under "schedule"; on,
   with "task_runner_interval" 60 seconds). On: due routine tasks run at
   the end of people's requests, at most once per interval (Rule 21).
   Off, as on the test installs: tasks run only when the server's own
   timetable starts them. <sup>t</sup>
6. **Reports on errors only** ("scheduled_tasks_report_error_only" under
   "schedule"; on). On: only a run that ends in error sends the report
   email. Off: every run sends one (Rule 22). <sup>u</sup>
7. **The upgrade warning** ("show_upgrade_warning" under "general"; on).
   On: the notice of Rule 4 when a newer release exists. Off: never, and
   the pages do not ask PKP's site. <sup>e</sup>
8. **Stored copies of public pages** ("web_cache" under "cache"; off,
   with "web_cache_hours" 1). On: visitors who are not signed in get
   stored copies of many public pages for that many hours; neither
   "Delete Data Caches" nor "Delete Template Cache" empties them
   ⚠ [A5](#a5). <sup>k</sup> <sup>x</sup>
9. **The re-authentication window** ("password_timeout" under
   "security"; off). It belongs to the Confirm Access page, which
   [Login & sessions](U01-login-and-sessions.md) describes (its
   Rule 16). <sup>x</sup>

## Cross-feature interactions

- *Hosted journals* owns the "Hosted Journals" button's page ("Hosted
  Presses" on a press, "Hosted Servers" on a preprint server), creating,
  ordering and removing journals, and each journal's settings wizard;
  [Site settings](U60-site-settings.md) owns the "Site Settings" button's
  page and the site's principal contact that receives the task reports
  (Rule 22). This spec owns the Administration page they sit on, its
  trail, its address rule and the newer-release notice on their pages
  (Rules 1–4).
- [Login & sessions](U01-login-and-sessions.md) owns the Confirm Access
  page (its Rule 16), the access-denied page (its Rule 17), and how a
  session ends (its Rule 18); this spec owns the "Expire User Sessions"
  button (Rule 9).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the "Administration" entries of the user menu and the side menu.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns the managers' newer-release notice on Settings › Journal
  (Rule 4b).
- Each queued job's effect belongs to the feature that queues it (the
  search index to [Search](U15-search.md), deposits to
  [ORCID integration](U04-orcid-integration.md) and *DOIs*, emails to
  their senders), and each routine task's effect to the feature it
  serves (review reminders {OJS OMP} to
  [Reviewer assignment & management](U27-reviewer-assignment-and-management.md),
  expiry reminders {OJS} to [Subscriptions](U51-subscriptions.md), expired
  invitations to [User invitations](U06-user-invitations.md), usage
  statistics to *Statistics — usage*); this spec owns the Jobs and
  Failed Jobs pages, the report email and the log link.
- [OAI-PMH](U19-oai-pmh.md) reads its settings from the configuration
  file, which System Information shows under "oai" (Rule 7).

## Canonical scenarios

Every scenario runs as the Site Administrator (a ready account) at the
site's own address, on jobs and a task run of its own; the three that
reach the whole test install, pressing "Expire User Sessions", "Requeue
All Failed Jobs" or "Delete Task Logs", run alone. <sup>sc</sup>

1. **Who reaches Administration**

   Given: Site Administrator, on the site's home page, with the seeded
   journal's Journal Manager (a ready account) signed in in a second
   browser and a visitor signed out in a third.

   - **The page**: open the user menu and choose "Administration": a page
     headed "Administration" opens, its browser tab reading "Site
     Administration", with no trail above the heading and no side menu.
     Its panels, top to bottom, with their buttons: "Site Management"
     ("Hosted Journals" and "Site Settings"; a press: "Hosted Presses", a
     preprint server: "Hosted Servers"), "System Information" ("View
     System Information"), "Expire User Sessions" ("Expire User
     Sessions"), "Delete Caches" ("Delete Data Caches" and "Delete
     Template Cache"), "Clear Scheduled Task Logs" ("Delete Task Logs")
     and "Jobs" ("View Jobs" and "View Failed Jobs") (Rule 1; Fields).
   - **The trail**: press "View System Information": above the heading
     "System Information" the trail reads "Administration", a link, then
     "System Information". Press "Administration" in the trail: the
     Administration page opens. Do the same with "View Jobs" (the trail
     ends "Jobs") and "View Failed Jobs" (it ends "Failed Jobs") (Rule 2).
   - **A journal's path in the address**: in the Administration page's
     address, put the seeded journal's path in place of "index" and open
     it: the access-denied page reads "Access denied." (Rule 3).
   - **The Journal Manager**: opens the addresses of Administration,
     System Information, Jobs and Failed Jobs, copied from the Site
     Administrator's browser: each opens the access-denied page, reading
     "The current role does not have access to this operation." (Actors
     row 1).
   - **Signed out**: the visitor opens the same four addresses: each opens
     the Login page (Actors row 1).
   - **Control**: the Site Administrator opens the Administration address
     again, with "index" in it: the page headed "Administration" opens
     (Rule 3). <sup>sc</sup>

2. **System Information**

   Given: Site Administrator, on the Administration page of an
   installation whose configuration file switches the built-in job runner
   Off, writes "umask" as 0022 and leaves "password_timeout" commented
   out, as the test installs' file does.

   - **The page**: press "View System Information": the page headed
     "System Information" shows, top to bottom, "Current version:" with
     the version and, in brackets, the date and time it was installed; the
     link "Check for updates" (not pressed here, ⚠ [A1](#a1)); "Version
     history", a table with the columns "Version", "Major", "Minor",
     "Revision", "Build" and "Date installed"; "Server Information", a
     table with the columns "Setting Name" and "Setting Value" and the
     rows "OS platform", "PHP version", "Apache version", "Database
     driver" and "Database server version"; "OJS Configuration" ("OMP
     Configuration" on a press, "OPS Configuration" on a preprint server),
     a table with the same two columns; and the link "Extended PHP
     Information". The page has no box to type in and no button (Rule 5;
     Fields).
   - **The configuration table**: the settings stand under their
     sections' names in bold, "general", "database" and "queues" among
     them. Under "queues", "job_runner", switched Off, has an empty value,
     "job_runner_cross_request_lock", switched On, reads "1", and
     "delete_failed_jobs_after" reads "180"; "umask", written 0022 in the
     file, reads "18" (Rule 7; Settings bullets 1, 2, 4).
   - **Hidden values**: the database's "password", the general
     "app_key", and the security "salt" and "api_key_secret" each read
     "**************" (Rule 7b).
   - **"Extended PHP Information"**: press it: a new browser tab opens
     PHP's own page about the server's PHP installation, headed with its
     PHP version (Rule 8).
   - **Control**: back in the first tab, the "security" section has no
     "password_timeout" row, the setting the file leaves commented out
     (Settings preamble). <sup>sc</sup>

3. **"Expire User Sessions"**

   Given: Site Administrator, on the Administration page.

   - **The box**: press "Expire User Sessions": the browser's own
     confirmation box reads "Are you sure you want to expire all user
     sessions? All users who are currently logged into the system will be
     forced to log in again (yourself included)." (Rule 9).
   - **"OK"**: press "OK": the site's Login page opens, headed "Login",
     with no message (Rule 9a).
   - **Signed in again**: sign in as the Site Administrator with the
     password the account had, then open the Administration address: the
     page headed "Administration" opens (Rule 9b).
   - **Control**: press "Expire User Sessions" again and "Cancel" in the
     box: the Administration page stays as it was, and a reload shows the
     Administration page again (Rule 9). <sup>sc</sup>

4. **Deleting the stored copies**

   Given: Site Administrator, on the Administration page, with the seeded
   journal's home page open in a second tab.

   - **"Delete Data Caches"**: press it: nothing asks first, and the
     Administration page shows again with no message ⚠ [A2](#a2)
     (Rule 10).
   - **"Delete Template Cache"**: press it: the browser's confirmation box
     reads "Are you sure you want to clear the cache of compiled
     templates?". Press "OK": the Administration page shows again with no
     message (Rule 11).
   - **The journal's home page**: reload the second tab: the page looks as
     it did before the two presses (Rules 10, 11).
   - **Control**: press "Delete Template Cache" again and "Cancel" in the
     box: the Administration page stays as it was (Rule 11). <sup>sc</sup>

5. **The queued jobs**

   Given: Site Administrator, on an installation with the built-in job
   runner switched Off, with a waiting job of the scenario's own whose
   number, internal name and queue are known.

   - **The Jobs page**: on the Administration page press "View Jobs": a
     page headed "Jobs" with a table titled "View queued jobs", the line
     "There's a total of **{n}** job(s) on the queue" with the total in
     bold, and the columns "ID", "Job", "Queue", "Attempts" and "Created
     At" (Rule 13; Fields).
   - **The job's row**: find the row whose "ID" is the job's number,
     using the page links under the table when it holds more than 50 jobs:
     "Job" gives the job's internal name, "Queue" its queue, "Attempts"
     0, and "Created At" reads "Created at" with the date and the time,
     then "GMT+0000 0" on the test installs (Rule 13).
   - **The job runner Off**: open the site's home page and the
     Administration page, then come back to the Jobs page and reload it:
     the job's row is still there (Rule 14; Settings bullet 1).
   - **Control**: the job's row, like every row, has no button and no
     link (Fields). <sup>sc</sup>

6. **A failed job tried again**

   Given: Site Administrator, with a failed job of the scenario's own
   whose number, internal name and queue are known.

   - **The Failed Jobs page**: on the Administration page press "View
     Failed Jobs": a page headed "Failed Jobs" with a table titled "View
     Failed Jobs", the line "There's a total of **{n}** failed job(s)."
     with the total in bold, the button "Requeue All Failed Jobs" at the
     table's top right, and the columns "ID", "Job", "Queue",
     "Connection", "Failed At" and "Actions" (Rule 15; Fields).
   - **The job's row**: find it by its number, as on the Jobs page:
     "Failed At" gives the date and time of the failure, then "UTC 0" on
     the test installs, and "Actions" holds "Try Again", "Delete" in red
     and "Details" (Rule 15; Fields).
   - **"Try Again"**: press it: the notice "Failed job redispatched
     successfully." shows at the top right, the row leaves the table and
     the total drops by one (Rule 16).
   - **The Jobs page**: press "Administration" in the trail, then "View
     Jobs": the job is listed again under a new number, with the same
     "Job" and "Queue" and "Attempts" 0 (Rules 13, 16).
   - **Control**: open "View Failed Jobs" again: no row carries the job's
     old number (Rule 16). <sup>sc</sup>

7. **A failed job's details, then deleted**

   Given: Site Administrator, on the Failed Jobs page, with a failed job
   of the scenario's own whose number, internal name and queue are
   known.

   - **"Details"**: on the job's row press "Details": in the same tab, a
     page headed "Failed Job Details" opens, its trail reading
     "Administration" then "Failed Job Details", with no "Failed Jobs"
     between them. Its table is titled "View Failed Job:{id} Details"
     with the job's number in place of {id}, has the columns "Attribute"
     and "Attribute Value", and gives in its rows "ID" the job's number,
     "Job" its internal name, "Queue" its queue, "Connection" its
     connection, "Failed At" the date and time as on the Failed Jobs page, "Payload" the data
     the job was queued with over several lines, and "Exception" the
     error that made it fail. The page has no box and no button; note its
     address (Rule 18; Fields).
   - **"Delete"**: press "Administration" in the trail, then "View Failed
     Jobs", and on the job's row press "Delete": nothing asks first
     ⚠ [A3](#a3); the notice "Failed job deleted successfully from
     failed list." shows at the top right, the row leaves the table and
     the total drops by one (Rule 17).
   - **The details page again**: open the address noted above: a bare
     page reading "404 Not Found", with no header and no way back
     (Rule 18).
   - **Control**: reload the Failed Jobs page: no row carries the job's
     number (Rule 17). <sup>sc</sup>

8. **"Requeue All Failed Jobs"**

   Given: Site Administrator, on the Failed Jobs page, with two failed
   jobs of the scenario's own whose numbers, internal name and queue are
   known.

   - **The button**: press "Requeue All Failed Jobs": the notice "All
     redispatchable failed jobs with valid payload have been requeued
     successfully." shows at the top right, and the table reloads empty:
     it reads "No Items", the line reads "There's a total of **0** failed
     job(s).", and "Requeue All Failed Jobs" is no longer offered
     (Rules 15, 19).
   - **The Jobs page**: press "Administration" in the trail, then "View
     Jobs": both jobs are listed again, each under a new number, with the
     same "Job" and "Queue" and "Attempts" 0 (Rules 16, 19).
   - **Control**: open "View Failed Jobs" again: the table still reads
     "No Items", the total 0, with no "Requeue All Failed Jobs"
     (Rule 15). <sup>sc</sup>

9. **A routine task's report and its log**

   Given: Site Administrator, after a run of the routine task "Update
   DB-IP city lite database" that ended in error, its code known, with
   the site's principal contact as installed and a visitor signed out in
   a second browser.

   - **The report email**: the email arrives in the mail catcher, to the
     site's principal contact and from the same name and address. Its
     subject reads "Update DB-IP city lite database - {code} - Error"
     and its body reads as Rule 22 gives it, ending in the link.
   - **The log link**: open the link: the run's log file downloads
     (Rule 23).
   - **"Delete Task Logs", "Cancel"**: on the Administration page press
     "Delete Task Logs": the browser's confirmation box reads "Are you
     sure you want to delete all scheduled task execution logs?". Press
     "Cancel", then open the link again: the log file downloads again
     (Rule 12).
   - **"Delete Task Logs", "OK"**: press "Delete Task Logs" again and
     "OK": the Administration page shows again with no message
     [A2](#a2) (Rule 12).
   - **The log link after**: open the link again: an empty page opens
     (Rules 12, 23).
   - **Control**: the visitor opens the link: the Login page opens
     (Actors row 8). <sup>sc</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - "Check for updates" pressed on the test installs, which cannot reach PKP's site: System Information with a warning that the latest version could not be retrieved, the link still there, no server error (A1; the guard its issue report names)
  - Administration read in French (Canada) on a press and a preprint server: no `##` code on the page {OMP OPS} (A7; the guard its issue report names)
  - "Requeue All Failed Jobs" refused because the list was emptied in another tab: after "OK" no loading circle beside the button or in the page links (A6; the guard its issue report names)
- **Nothing new to test**:
  - a refused "Try Again" or "Delete" on a failed job already taken off
    the list in another tab (Rule 17b)
  - the Jobs and Failed Jobs pages past 50 rows, with page links under
    the table (Rules 13, 15)
  - a value written in quotes in the configuration file, read without
    its quotes (Rule 7)
  - a section of the configuration table with no settings (Rule 7)
  - every other account without the Site Administrator role at the
    Administration, System Information, Jobs and Failed Jobs addresses,
    which gets the Journal Manager's access-denied page of scenario 1
    (Actors rows 1–6)
  - every other account at the report's log link, the same access-denied
    page (Actors row 8)
  - the built-in task runner switched Off, which no screen shows
    (Settings bullet 5)
- **Register carries it**:
  - A1 ("Check for updates" on an installation that cannot reach PKP's
    site; Rule 6; scenario 2 passes the link)
  - A4 (a failed job with no stored data; Rules 16, 19)
  - A5 (stored copies of public pages switched on; Settings bullet 8)
  - A6 (a refused "Requeue All Failed Jobs"; Rule 19)
  - A7 (the Administration page in French on a press and a preprint
    server; Fields: Administration)
- **No seed**:
  - "Check for updates" answered, up to date or with an update
    available, since the test installs never reach PKP's site (Rule 6)
  - the newer-release notice, for the same reason (Rule 4; OMP1)
  - the upgrade warning switched Off, since the notice cannot show on
    the test installs either way (Settings bullet 7)
  - the Jobs page with no job waiting, since the test install's queue is
    shared by every test running at once (Rule 13)
  - old failed jobs removed by the daily task, which needs a failure 180
    days old and a run of that task (Rule 20)
  - the job runner's limits changed, a value of the configuration file
    the same for every test (Settings bullet 2)
  - jobs run by the routine tasks switched On, the same (Settings
    bullet 3)
  - failed jobs kept for another number of days, or for ever, the same
    (Settings bullet 4; Rule 20)
  - a report on every run, the same (Settings bullet 6; Rule 22)
- **Owned by another feature**:
  - the other people signed in when "Expire User Sessions" is pressed
    (Cross-feature bullet 2; *[Login & sessions](U01-login-and-sessions.md)*)
  - the re-authentication window (Settings bullet 9;
    *[Login & sessions](U01-login-and-sessions.md)*)
  - the page behind "Hosted Journals" (Rule 1; *Hosted journals*)
  - the page behind "Site Settings" (Rule 1;
    *[Site settings](U60-site-settings.md)*, scenario 1)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | "Check for updates" opens an empty page when the server cannot reach PKP's website | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A4](#a4) | "Requeue All Failed Jobs" fails with a database error when no failed job has stored data | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | Failed Jobs: after a refused "Requeue All Failed Jobs", loading circles keep turning until the page is reloaded | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | On a press or preprint server in French (Canada), Administration shows a code under "Gestion du site" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | The three deleting buttons return to Administration with no message, and "Delete Data Caches" asks nothing first | ❓ | minor | — |
| [A3](#a3) | A failed job's "Delete" removes it for good without asking | ❓ | minor | — |
| [A5](#a5) | Neither "Delete Caches" button empties the stored copies of public pages | ❓ | latent | — |
| [OMP1](#omp1) | A press's newer-release notice links "the PKP website" where the others link "this page" | ✅ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "Check for updates" opens an empty page when the server cannot reach PKP's website** · 🐞 · low · crash: server.
The site administrator presses "Check for updates" on Administration ›
"System Information". When the server cannot connect to PKP's website,
the application fails on the server. It opens an empty page, with no
heading, no text and no tab title. The administrator expects System
Information again, with word that the check could not be made.
Nothing is lost, and Back returns to a working System Information page.
The administrator is not told why the check failed, and pressing the
link again gives the same empty page.
The newer-release notice on Administration and its pages makes the same
request and handles the same failure quietly.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The deleting buttons give no feedback** · ❓ · minor.
"Delete Data Caches", "Delete Template Cache" and "Delete Task Logs"
return to the Administration page exactly as it was, with no message that
anything was deleted; "Delete Data Caches" also asks nothing first, while
the other two ask.
Question: should each button confirm what it did, and should "Delete Data
Caches" ask first like its neighbour? Lean: yes to a notice (the page
gives no sign the press worked); asking first matters less, since the
copies rebuild by themselves.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Deleting a failed job asks nothing** · ❓ · minor.
The red "Delete" removes the failed job, its stored data and its error at
once; there is no confirmation and no way back.
Question: should "Delete" ask first, as most deleting controls of the
applications do? Lean: intended; the button is styled as a warning and a
failed job is diagnostic data, but a confirmation would cost little.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Requeue All Failed Jobs" fails with a database error when no failed job has stored data** · 🐞 · low · crash: server.
The site administrator presses "Requeue All Failed Jobs" on
Administration › "View Failed Jobs". When none of the failed jobs on the
list has stored data, the application fails on the server. A window
titled "Error" shows the database's own error text (a "Not null
violation" naming the column "payload"), nothing is requeued, and the
list stays as it was. While at least one failed job has stored data, the
button requeues those, leaves the others on the list and shows "All
redispatchable failed jobs with valid payload have been requeued
successfully.".
No screen or job of the applications makes a failed job without stored
data, so no one meets this today. It is not specific to PostgreSQL:
MySQL and MariaDB refuse the same insert.
Basis: probe, 2026-10-02. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — "Delete Caches" leaves the stored public pages** · ❓ · latent.
With stored copies of public pages switched on (Settings bullet 8), a
change a journal makes stays invisible to visitors who are not signed in
for up to the configured hours, and the "Delete Caches" panel, whose text
says it deletes cache files, does not empty those copies.
Question: should one of the panel's buttons empty the stored public pages
too? Lean: yes; it is the one stored copy a visitor sees, and the
configuration file's own note asks operators to clear it with a separate
server job.
Basis: code. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Failed Jobs: after a refused "Requeue All Failed Jobs", loading circles keep turning until the page is reloaded** · 🐞 · low.
The site administrator presses "Requeue All Failed Jobs" on Administration ›
"Failed Jobs", and the server refuses the request: a window titled "Error"
gives the reason, for example "No failed job found in the list." when the
list was already emptied in another tab. After "OK" the rows rightly stay as
they were, but a loading circle keeps turning beside the button, and a
second one in place of the page number when the list has page links.
The page looks busy when nothing is happening, until it is reloaded. Every
error answer to this button does the same, whatever its reason.
Basis: probe, 2026-10-02. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — On a press or preprint server in French (Canada), Administration shows a code under "Gestion du site"** · 🐞 · low.
A Site Administrator who reads Administration in French (Canada) on a
press or a preprint server finds "##admin.siteManagement.description##"
under the "Gestion du site" heading. A journal shows the French line
there: "Ajouter, modifier ou supprimer des revues de ce site et gérer
les paramètres de l'ensemble du site."
The panel's buttons and the other five panels are in French (Canada)
and work.
By the code, the same line is missing in other languages of both apps
too: 13 more of OMP's and 9 more of OPS's, French (France) on a preprint
server among them.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The newer-release notice's link text** · ✅ · minor.
A press's notice (Rule 4) reads "Please visit the PKP website to
download…", linking "the PKP website", where a journal's and a preprint
server's read "Please visit this page…". Wording only.
Basis: code. <sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 on checkouts ojs `3162c105bf`, omp `72a01a026`, ops
`e9f6f4f550`, lib/pkp `1ad4a14bb2`, ui-library `03d1cee2` unless a block
says otherwise. No app carries a `pages/admin` directory or a
`templates/admin` override; each app's `api/v1/jobs/index.php` mounts
lib/pkp's `PKPJobController` unchanged, and the ui-library job pages are
shared, so the shared claims rest on one code path (multi-app rule 8). The
app seams are the locale keys named below and each app's
`APP\scheduler\Scheduler` (its own routine tasks, which other features
own). Live-probed 2026-09-27 on the three apps' test installs, as each
block says; what a block calls read from the code was not driven.

<a id="fn-a"></a>
**a** — `PKP\pages\admin\AdminHandler`: the constructor assigns every op
(`index`, `contexts`, `settings`, `wizard`, `systemInfo`, `phpinfo`,
`expireSessions`, `clearTemplateCache`, `clearDataCache`,
`downloadScheduledTaskLogFile`, `clearScheduledTaskLogFiles`, `jobs`,
`failedJobs`, `failedJobDetails`, `confirmAccess`, `confirmAccessSubmit`)
to `ROLE_ID_SITE_ADMIN` alone; `authorize()` adds `PKPSiteAccessPolicy`
and the checks owned by Login & sessions. The jobs requests
(`PKPJobController`, base `jobs`, site-wide) are for the Site
Administrator alone too. Live-probed 2026-09-27
(Actors rows 1–6 and 8; all three apps): `admin` reached every page with
no Confirm Access step; `manager.maya`, `sectioneditor.ana`, `copyeditor.carla`
(OJS, OMP) or `assistant.rita` (OPS), `reviewer.julia` (OJS, OMP),
`author.alex` and `reader.rosa` each typed fourteen addresses (the page,
`systemInfo`, `systemInfo?versionCheck=1`, `phpinfo`, `jobs`,
`failedJobs`, `failedJobDetails/1`, `contexts`, `settings`, the four
buttons' ops and `downloadScheduledTaskLogFile`) and landed on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`;
signed out, every address landed on `login?source=…`. No account but
`admin` has "Administration" in a user menu or side menu.

<a id="fn-b"></a>
**b** — `lib/pkp/templates/admin/index.tpl`: `<h1>` `navigation.admin`
"Administration"; six `<action-panel>`s in the order of the Fields
table: `admin.siteManagement` with `admin.siteManagement.description`
(app keys: OJS "journals", OMP "presses", OPS "preprint servers") and the
buttons `admin.hostedContexts` (app keys "Hosted Journals" / "Hosted
Presses" / "Hosted Servers") and `admin.siteSettings`;
`admin.systemInformation` / `admin.systemInformation.view`;
`admin.expireSessions` (heading and button) with
`admin.expireSessions.description`; `admin.deleteCache` with
`admin.clearDataCache` and `admin.clearTemplateCache`;
`admin.scheduledTask.clearLogs` with `admin.scheduledTask.clearLogs.delete`;
`navigation.tools.jobs` with `navigation.tools.jobs.view` and
`navigation.tools.jobs.failed.view`; then the hook
`Templates::Admin::Index::AdminFunctions`, which no plugin of the three
apps uses. `AdminHandler::index()` sets `pageTitle` `admin.siteAdmin`
"Site Administration". `AdminHandler::initialize()` sets `pageComponent`
`AdminPage` (`lib/ui-library/src/components/Container/AdminPage.vue`) and,
for every op but `index` and the confirm pair, the first breadcrumb
`navigation.admin` linking to `index/admin`; `systemInfo()`, `jobs()`,
`failedJobs()` and `failedJobDetails()` each add one more crumb
(`admin.systemInformation`, `navigation.tools.jobs`,
`navigation.tools.jobs.failed`, `navigation.tools.jobs.failed.details`)
and `failedJobDetails()` no crumb for the list. The job pages use
`pageComponent` `Page`. Live-probed 2026-09-27 (Fields: Administration;
Rules 1–2; all three apps): the six panels, their text and buttons as
the table says, a press's and a preprint server's naming their own kind
of site; the tab "Site Administration | Open Journal Systems" (… Open
Monograph Press, … Open Preprint Systems); the trail
(`nav.app__breadcrumbs`) "Administration / {page}" on System
Information, Jobs, Failed Jobs, Failed Job Details (no "Failed Jobs"
step), Hosted Journals and Site Settings, none on Administration; no
side menu on any of these pages. Live-probed 2026-09-29 in French
(`index/fr_CA/admin`, all three apps, two runs): every panel French but
the "Gestion du site" line on OMP and OPS ([A7](#a7), note f-a7).

<a id="fn-c"></a>
**c** — The side menu's entry: `PKPTemplateManager` adds `menu['admin']`
(`navigation.admin`, `index/admin`) for `ROLE_ID_SITE_ADMIN` inside a
context. The user menu's entry: `NavigationMenuItem::NMI_TYPE_ADMINISTRATION`
(`PKPNavigationMenuService`). The Navigation menus spec owns both and
records no side menu on the Administration screens. Live-probed
2026-09-27 (Rule 1; all three apps): as `admin`, the user menu of the
site's, `publicknowledge`'s and a scratch journal's public pages carries
"Administration" (landing on `index/en/admin/index`), and a journal's
editorial side menu carries it as its last top entry (landing on
`index/en/admin`); `index/admin` and `index/en/admin` both open the
page.

<a id="fn-d"></a>
**d** — `AdminHandler::authorize()` returns false whenever
`$request->getContext()` is set (`// Admin shouldn't access this page from
a specific context`), for every op. Live-probed 2026-09-27 (Rule 3; all
three apps): `admin` at every address of note a under
`publicknowledge/en/admin…`, a scratch journal's path and
`publicknowledge/admin` landed on
`…/user/authorizationDenied?message=user.authorization.accessDenied`,
"Access denied."; the site's Administration opened normally
afterwards.

<a id="fn-e"></a>
**e** — `AdminHandler::initialize()`: when `[general]
show_upgrade_warning` is on (`config.TEMPLATE.inc.php` default On),
`VersionCheck::checkIfNewVersionExists()` runs on every Administration
op and assigns `newVersionAvailable`, `currentVersion`, `latestVersion`;
`admin/index.tpl`, `contexts.tpl`, `settings.tpl` and `systemInfo.tpl`
print `site.upgradeAvailable.admin` in a `<notification>` (app keys: OJS
link text "this page" to `pkp.sfu.ca/ojs_download`, OMP "the PKP
website" to `pkp.sfu.ca/omp_download`, OPS "this page" to
`pkp.sfu.ca/ops/ops_download/`, all `target="_new"`). The check fetches
`Application::getVersionDescriptorUrl()` through
`FileManager::getStream()` (Guzzle) and catches `TransferException`,
logging "Failed to retrieve the latest version info" and returning
false; the version XML of a remote address is not cached
(`VersionCheck::parseVersionXML()` gives it expiry 0). The test installs'
`[proxy]` points at a dead local port (seed-facts "Outbound HTTP is
dead"). `[general] enable_beacon` (default On, the test installs Off)
adds the site's id and OAI address to that request and changes nothing
on screen. Live-probed 2026-09-27 (Rule 4; Settings bullet 7; all three
apps, two runs): System Information reads "show_upgrade_warning" "1";
each load of Administration, Hosted Journals, Site Settings, System
Information, Jobs, Failed Jobs and a journal's Settings › Journal page
wrote "Failed to retrieve the latest version info: cURL error 7 … for
https://pkp.sfu.ca/ojs/xml/ojs-version.xml" (OMP and OPS their own
version files) to the server's log and answered 200 with no notice; a
Dashboard load wrote none. The notice's wording and link, and bullet 7's
Off end, are read from the code: no screen of the test installs can
show the notice, and no screen changes the setting.

<a id="fn-f"></a>
**f** — `AdminHandler::systemInfo()` assigns `currentVersion`
(`VersionDAO::getCurrentVersion()`), `versionHistory`, `serverInfo`
(`admin.server.platform` `PHP_OS`, `admin.server.phpVersion`
`phpversion()`, `admin.server.apacheVersion`
`$_SERVER['SERVER_SOFTWARE']`, `admin.server.dbDriver` and
`admin.server.dbVersion` from PDO) and `configData` (`Config::getData()`),
rendered by `lib/pkp/templates/admin/systemInfo.tpl`: `admin.currentVersion`
"Current version" with `$datetimeFormatLong`, `admin.versionHistory` with
`admin.version`, `admin.versionMajor`, `admin.versionMinor`,
`admin.versionRevision`, `admin.versionBuild`, `admin.dateInstalled`;
`admin.serverInformation` and `admin.systemConfiguration` (app keys "OJS
Configuration", "OMP Configuration", "OPS Configuration") with
`admin.systemInfo.settingName` / `admin.systemInfo.settingValue`. The test
installs run PHP's built-in server, so "Apache version" reads its
`SERVER_SOFTWARE` string. Live-probed 2026-09-27 (Fields: System
Information; Rule 5; all three apps, two runs): "Current version: 3.6.0.0
(September 26, 2026 - 09:25 PM)", the test install's set-up time; one
history row "3.6.0.0 | 3 | 6 | 0 | 0 | 2026-09-26"; "OS platform"
Darwin, "PHP version" 8.4.11, "Apache version" "PHP/8.4.11 (Development
Server)", "Database driver" pgsql, "Database server version" "15.15
(Postgres.app)"; no input and no button, the only links "Administration",
"Check for updates" and "Extended PHP Information".

<a id="fn-g"></a>
**g** — `systemInfo.tpl`: without `$latestVersionInfo`, the link
`admin.version.checkForUpdates` to the same page with `versionCheck=1`;
with it, `admin.version.latest` "Latest version" with release and date,
then `admin.version.upToDate` or `admin.version.updateAvailable` with
`admin.version.downloadPackage` "Download", `admin.version.downloadPatch`
(a link only when the XML carries a patch) and `admin.version.moreInfo`,
chosen by `Version::compare()`. `AdminHandler::systemInfo()` calls
`VersionCheck::getLatestVersion()` with no `try`, unlike
`checkIfNewVersionExists()`. The answered half of Rule 6 is read from
the code: the test installs never reach PKP's site.

<a id="fn-h"></a>
**h** — `systemInfo.tpl` prints each `$configData` section as a bold
group row (`app--admin__systemInfoGroup`) and each key with
`{$value|escape}`, or `**************` when
`\PKP\config\Config::isSensitive($category, $name)`.
`Config::SENSITIVE_DATA`: general `app_key`, `sentry_dsn`; database
`password`; email `smtp_password`, `smtp_username`; security
`api_key_secret`, `salt`; captcha `recaptcha_private_key`,
`altcha_hmackey`; search `opensearch_password`; proxy `http_proxy`,
`https_proxy`; any section, a key matching `/password/`, `/api_key/`,
`/private_key/`, `/secret/`. `ConfigParser::readConfig()` turns
`On`/`true` into PHP `true` and `Off`/`false` into `false`, which Smarty
prints as "1" and "", reads a number written with a leading 0 as octal
(`intval($value, 8)`), which the page prints in decimal, and drops a
quoted value's quotes and backslash escapes.

<a id="fn-i"></a>
**i** — `systemInfo.tpl` ends with `<a href="{url op="phpinfo"}"
target="_blank">` `admin.phpInfo`; `AdminHandler::phpinfo()` calls PHP's
`phpinfo()`. Live-probed 2026-09-27 (Rule 8; all three apps): a new tab
at `index/en/admin/phpinfo`, titled "PHP 8.4.11 - phpinfo()" and headed
"PHP Version 8.4.11".

<a id="fn-j"></a>
**j** — `admin/index.tpl`: a POST form with the CSRF token and
`onclick="return confirm(…admin.confirmExpireSessions…)"`.
`AdminHandler::expireSessions()` checks the token, calls
`PKPSessionGuard::removeAllSession()` (deletes every row of the
`sessions` table) and logs `AuditEvent::ADMIN_SESSIONS_EXPIRE` (note w).
Live-probed 2026-09-27 (Rule 9; all three apps): the box read as Rule 9
quotes; "Cancel" sent no request and left the sessions as they were.

<a id="fn-k"></a>
**k** — `AdminHandler::clearDataCache()` (a POST form with no
`confirm()`): checks the token, calls `PKPContainer::getInstance()['cache']
->store()->flush()` (the Laravel store, `[cache] default` file under
`[cache] path`), logs `AuditEvent::ADMIN_CACHE_DATA_CLEAR`, redirects to
`admin` with no notification. Among the store's users:
`PluginSettingsDAO` (24 hours per context), `NavigationMenuDAO`, the
user-group repository, `PluginGalleryDAO`, the translation bundles, and
OJS's HTML galley plugin's page copy for readers not signed in
(`htmlArticleGalley-{galleyId}`), plus the web task runner's and job
runner's locks. A press builds the HTML publication format's page fresh
on every view, and a preprint server's HTML galley link downloads the
file, so neither keeps such a copy. The stored public pages of `[cache] web_cache`
(`PKPPageRouter` writes `cache/wc-*.html`, `Dispatcher` serves them for
`web_cache_hours`) are neither in that store nor matched by
`clearCssCache()`'s glob. Live-probed 2026-09-27 (Rule 10; all three
apps): no question; `clearDataCache` posted and Administration showed
again, text unchanged, no notice. The store, read by key before, right
after and once pages had loaded again: the scratch context's plugin
settings, its menus and masthead role lists, the plugin gallery's list
and the interface translations gone right after and built again; no
entry older than the press left. On OJS the HTML galley copy went and
came back at the next signed-out view; on OMP the HTML format's page
(`catalog/view/{id}/{formatId}/{fileId}`), viewed signed out, left no
copy.

<a id="fn-l"></a>
**l** — `admin/index.tpl`: a POST form with `confirm(…
admin.confirmClearTemplateCache …)`. `AdminHandler::clearTemplateCache()`
calls `TemplateManager::clearTemplateCache()` (Smarty compiled templates
and cache) and `clearCssCache()` (the compiled `*.css` files under
`cache/`), logs `AuditEvent::ADMIN_CACHE_TEMPLATE_CLEAR`, redirects to
`admin` with no notification. Live-probed 2026-09-27 (Rule 11; all three
apps): "Cancel" sent nothing and the compiled templates kept their
times; "OK" posted `clearTemplateCache`, removed every compiled template
and every theme style sheet in `cache/` (site-level and per context),
and Administration showed again, text unchanged, no notice; the
journal's home page built its style sheets again with the same content
and looked the same.

<a id="fn-m"></a>
**m** — `admin/index.tpl`: a POST form with `confirm(…
admin.scheduledTask.confirmClearLogs …)`.
`AdminHandler::clearScheduledTaskLogFiles()` calls
`ScheduledTaskHelper::clearExecutionLogs()` (removes
`{files_dir}/scheduledTaskLogs`), logs
`AuditEvent::ADMIN_SCHEDULED_LOGS_CLEAR`, redirects to `admin` with no
notification. `ScheduledTask` writes each run's log through
`PKPContainer::logFilePath()` into the same directory
(`storagePath()` is `[files] files_dir`). Live-probed 2026-09-27
(Rule 12; all three apps): "Cancel" sent nothing and the logs stayed;
"OK" posted `clearScheduledTaskLogFiles`, removed the `scheduledTaskLogs`
folder itself (the next task run makes it again), and Administration
showed again, text unchanged, no notice.

<a id="fn-n"></a>
**n** — `AdminHandler::jobs()` renders `admin/jobs.tpl` with
`<jobs-page>` (`lib/ui-library/src/pages/jobs/JobsPage.vue`, extending
`JobsPageBase.vue`): `label` `admin.jobs.viewQueuedJobs`, description
`admin.jobs.totalCount` with `{$total}`, columns `admin.jobs.list.id`,
`.displayName` "Job", `.queue`, `.attempts`, `.createdAt`; rows from `GET
index/api/v1/jobs/all?page=n` (`PKPJobController::getJobs()` →
`Repo::job()->showJobs()`: `nonEmptyQueue()`, `nonReserved()`, no
`orderBy`, 50 per page from `BaseRepository::$perPage`; `total()` with the
same scopes). `HttpJobResource`: `displayName` is the payload's
`displayName` (the job's class name), `created_at` is
`admin.jobs.createdAt` "Created at {$createdAt}" with the date in
`Y-m-d G:i:s T Z` (`T` and `Z` print the time zone's name and its
offset in seconds). `Pagination` renders only when `lastPage > 1`; an
empty `TableBody` prints `grid.noItems` "No Items". The page loads its
list once on `created()`. Live-probed 2026-09-27 (Fields: Jobs; Rule 13;
all three apps): the table, line and columns as the Fields table says,
no control in a row; with one of two waiting jobs held by a worker, one
row and a total of 1; 52 waiting: 50 rows, "Previous 1 2 Next" under
the table, 2 rows on page 2; none: "No Items", a total of 0, no page
links; a job added while the page was open showed only after a reload;
rows in no fixed order; jobs of the testing queue and the default queue
side by side.

<a id="fn-o"></a>
**o** — `config.TEMPLATE.inc.php` `[queues]`: `default_connection
"database"`, `default_queue "queue"`, `job_runner = On`,
`job_runner_max_jobs = 30`, `job_runner_max_execution_time = 30`,
`job_runner_max_memory = 80`, `job_runner_cross_request_lock = On`,
`process_jobs_at_task_scheduler = Off`, `delete_failed_jobs_after = 180`;
identical in the three apps (OMP and OPS differ only in a comment of
`[schedule]`). The test installs set `job_runner = Off` and
`task_runner = Off` (`shared/playwright/make-test-config.js`;
seed-facts). A requeued job is an ordinary row of the `jobs` table, run
by whichever runner is on. Live-probed 2026-09-27 (Rule 14; Settings
bullets 1–2; Side effects; all three apps): System Information reads
"job_runner" empty, "job_runner_max_jobs" 30,
"job_runner_max_execution_time" 30, "job_runner_max_memory" 80 and
"job_runner_cross_request_lock" "1"; waiting jobs stayed on the Jobs
page across every page load until the app's worker (`jobs.php run
--test`) ran them, and requeued jobs that failed again came back on
Failed Jobs under new IDs. The runner's On end, its limits at work and
a requeued job run at the end of a request are read from the code: the
test installs keep the runner off and no screen changes it.

<a id="fn-p"></a>
**p** — `AdminHandler::failedJobs()` renders `admin/failedJobs.tpl` with
`<failed-jobs-page>` (`FailedJobsPage.vue`): `label`
`navigation.tools.jobs.failed.view`, description
`admin.jobs.failed.totalCount`, the `top-controls` slot with
`admin.jobs.failed.action.redispatch.all` only `v-if="total > 0"`, columns
`admin.jobs.list.id`, `.displayName`, `.queue`, `.connection`,
`.failedAt`, `.actions`; rows from `GET index/api/v1/jobs/failed/all`
(`Repo::failedJob()->showJobs()`, 50 per page, no `orderBy`).
`HttpFailedJobResource` gives `failed_at` in `Y-m-d G:i:s T Z` with no
prefix, and `_hrefs` for details, redispatch and delete. Live-probed
2026-09-27 (Fields: Failed Jobs; Rule 15; all three apps): the table,
line, button (above the table at the right) and columns as the Fields
table says, "Delete" in red; 52 failed: 50 rows and page links; none:
"No Items", a total of 0, no "Requeue All Failed Jobs".

<a id="fn-q"></a>
**q** — `FailedJobsPage.vue`: "Try Again" (`admin.jobs.failed.action.redispatch`)
posts `index/api/v1/jobs/redispatch/{id}`; "Delete" (`common.delete`,
`is-warnable`, no confirmation) posts `index/api/v1/jobs/failed/delete/{id}`
with `X-Http-Method-Override: DELETE`; on success each emits `notify`
with the response `message` and removes the row locally (`total - 1`).
`PKPJobController::redispatchFailedJob()`:
`api.jobs.404.failedJobNotFound` when the id is gone,
`api.jobs.406.failedJobPayloadMissing` without a payload,
`api.jobs.200.failedJobRedispatchedSucceed` on success;
`deleteFailedJob()`: `api.jobs.404.failedJobNotFound` or
`api.jobs.200.failedJobDeleteSucceed`. `FailedJob::redispatchToQueue()`
adds a new `jobs` row (same queue and payload, `attempts` 0, new
timestamps) and deletes the failed row. Errors go through the `ajaxError`
mixin: a dialog titled `common.error` "Error" with the `errorMessage` and
`common.ok`. Live-probed 2026-09-27 (Rules 16–17; all three apps): "Try
Again" showed its notice at the top right, the row left and the total
dropped, and the Jobs page listed a new ID with the same queue and data,
"Attempts" 0 (a failed job moved to the default queue came back on
"queue"); on a failed job with no stored data, the "Error" window of
Rule 16 and the row kept. "Delete" asked nothing, showed its notice and
took the row out of the database too, a job with no stored data
included.

<a id="fn-r"></a>
**r** — `AdminHandler::failedJobDetails()`: `Repo::failedJob()->get((int)
$args[0])`, else `NotFoundHttpException`; rows from
`HttpFailedJobResource::toResourceArray()` merged with the raw `payload`,
array values dropped, each key's label `admin.jobs.list.{camel}` ("ID",
"Job", "Queue", "Connection", "Failed At", "Payload", "Exception"), JSON
values pretty-printed; `label` `navigation.tools.job.failed.details.view`
"View Failed Job:{$id} Details", columns `admin.job.failed.list.attribute`
/ `.attribute.value`. `FailedJobDetailsPage.vue` prints each value in a
`<pre>`. The row's "Details" is `PkpButton element="a"` to `_details`
(`index/admin/failedJobDetails/{id}`), same tab. Live-probed 2026-09-27
(Fields: Failed Job Details; Rule 18; all three apps): the table as the
Fields table says; "Payload" 18 lines of indented data, "Exception" 459
lines; no button or field, the trail's "Administration" its one link.

<a id="fn-s"></a>
**s** — `FailedJobsPage.vue` `requeueAll()` posts
`index/api/v1/jobs/redispatch/all`, shows the spinner, then `notify`s and
reloads page 1. `PKPJobController::redispatchAllFailedJob()`:
`api.jobs.406.failedJobEmpty` when there is none,
`getRedispatchableJobsInQueue()` (payload not empty) for the ids, then
`redispatchToQueue(null, ids)`, answering
`api.jobs.200.allFailedJobRedispatchedSucceed` or
`api.jobs.400.failedJobRedispatchedFailed`; `api.jobs.406.failedJobEmpty`
reads "No failed job found in the list.". Live-probed 2026-09-27
(Rule 19; all three apps): 53 failed over two pages: the notice, the
table reloaded to "No Items" with the button gone, 53 new jobs with
"Attempts" 0; one failed job with data and two without: the two stayed.
With the list emptied in another tab, the button answered 406 with that
text in the "Error" window.

<a id="fn-t"></a>
**t** — `PKP\scheduledTask\PKPScheduler::registerSchedules()`:
`StatisticsReport` and `RemoveUnvalidatedExpiredUsers` monthly on the 1st,
`UpdateIPGeoDB` monthly on the 10th, `ProcessQueueJobs` every minute,
`RemoveFailedJobs` daily, `RemoveExpiredInvitations` daily,
`UpdateRorRegistryDataset` monthly; plugin schedules under the command
line only. `APP\scheduler\Scheduler` adds, OJS: `ReviewReminder`,
`DepositDois`, `UsageStatsLoader`, `OpenAccessNotification` daily,
`EditorialReminders`, `SubscriptionExpiryReminder` monthly; OMP:
`ReviewReminder`, `PublishSubmissions`, `UsageStatsLoader` daily,
`EditorialReminders` monthly; OPS: `UsageStatsLoader` daily.
`RemoveFailedJobs::executeActions()` (name
`admin.scheduledTask.removeFailedJobs` "Remove much older failed jobs from
failed job list.") prunes failed jobs older than `delete_failed_jobs_after`
days (start of day), and does nothing when the key is unset.
`ProcessQueueJobs` (name `admin.scheduledTask.processQueueJobs` "Process
pending queue jobs") returns at once unless
`process_jobs_at_task_scheduler` is on; from the command line it runs up
to `job_runner_max_jobs`, on the web only when `job_runner` is off.
`[schedule]`: `task_runner = On`, `task_runner_interval = 60`,
`scheduled_tasks_report_error_only = On`;
`PKPScheduler::runWebBasedScheduleTaskRunner()` and
`ScheduleTaskRunner` run it at the end of a request.
`ScheduledTask::execute()` writes the log (`addExecutionLogEntry()`) and
calls `ScheduledTaskHelper::notifyExecutionResult()`. Live-probed
2026-09-27 (Rules 20–21; Settings bullets 3–5; all three apps):
`scheduler.php list` names `RemoveFailedJobs` at `0 0 * * *` and
`ProcessQueueJobs` at `* * * * *`; `RemoveFailedJobs`, run by the
scheduler tool over failed jobs dated 181 days, 180 days and one hour,
and 179 days back, removed only the first; System Information reads
"delete_failed_jobs_after" 180, "process_jobs_at_task_scheduler" empty,
"task_runner" empty and "task_runner_interval" 60; `ProcessQueueJobs`
left a waiting job in place; no task ran at the end of any request, and
every run wrote its own log. The On ends of "task_runner" and
"process_jobs_at_task_scheduler", and another "delete_failed_jobs_after"
or none, are read from the code: the test installs keep their values and
no screen changes them.

<a id="fn-u"></a>
**u** — `ScheduledTaskHelper::notifyExecutionResult()`: sends when the
result is false or `scheduled_tasks_report_error_only` is off; subject
`{name} - {processId} - ` plus `common.error` "Error" or
`common.completed` "Completed"; body `admin.scheduledTask.downloadLog`
with `softwareName` (the application's name) and the
`downloadScheduledTaskLogFile` link, or `admin.scheduledTask.noLog`;
`_sendEmail()` addresses a plain `Mailable` to and from the site's
`contactEmail` / `contactName`. No `email_log` row is written. The run's
code is `ScheduledTask`'s `processId`, `uniqid()` (13 hex characters,
"6ab84ed618727" in the probe below), which also names the run's log file
`{Task}-{processId}-{date}.log`.
`ScheduledTask`'s constructor always sets the log file's path, and
`execute()` writes the base address and "Task process started." before
the task's own work, so every report carries the link and
`admin.scheduledTask.noLog` "Task produced no log." is never sent. The
email's HTML part holds the address as plain text, with no link
element, so whether it can be clicked depends on the mail program.
Live-probed 2026-09-27 (Actors row 7; Rule 22; Settings bullet 6; all
three apps): a run of `UpdateIPGeoDB` ending in error sent "Update
DB-IP city lite database - {processId} - Error" to and from "Open
Journal Systems" (Open Monograph Press, Open Preprint Systems)
`<admin@mail.test>`, the site's principal contact; with the contact
changed on Site Settings the next report went to and came from the new
name and address; a `RemoveFailedJobs` run ending well sent nothing, and
with `scheduled_tasks_report_error_only` Off sent "Remove much older
failed jobs from failed job list. - {processId} - Completed". With every
other action of this spec used in one window, no email arrived and no
notification, event log or email log row was added.

<a id="fn-v"></a>
**v** — `AdminHandler::downloadScheduledTaskLogFile()`: `basename()` of
the `file` parameter, then `ScheduledTaskHelper::downloadExecutionLog()`
→ `FileManager::downloadByPath()`, which streams the file as an
attachment when readable and outputs nothing otherwise. The op is
site-admin-only like every Administration op (note a). Live-probed
2026-09-27 (Actors row 8; Rule 23; all three apps): `admin` downloaded
the run's log as an attachment (four lines: the base address, "Task
process started.", the error, "Task process stopped."); every other
level landed on the access-denied page of note a, and signed out on the
Login page.

<a id="fn-w"></a>
**w** — `AuditLog::log()` with `AuditEvent::ADMIN_SESSIONS_EXPIRE`
"All user sessions expired", `ADMIN_CACHE_DATA_CLEAR` "Data cache
cleared", `ADMIN_CACHE_TEMPLATE_CLEAR` "Template cache cleared",
`ADMIN_SCHEDULED_LOGS_CLEAR` "Scheduled task logs cleared", at
`LogLevel::NOTICE`; written only when `[logs] log_audit` is on (template:
commented out, off). Live-probed 2026-09-27 (Side effects; all three
apps): System Information's "logs" group lists "log_channel",
"log_level" and "log_stacks" only; with the four buttons and every other
action of this spec used in one window, the installation's log
(`{files_dir}/logs/app-{date}.log`) gained no audit line, and one line
per "Check for updates": `production.ERROR: cURL error 7: Failed to
connect to 127.0.0.1 port 9 … for
https://pkp.sfu.ca/ojs/xml/ojs-version.xml` (OMP and OPS their own
version files). The four audit lines are read from the code: no screen
changes `log_audit`.

<a id="fn-x"></a>
**x** — Settings bullets 8 and 9: the test installs run with
`web_cache` off and `password_timeout` commented out, and no screen
changes either. Bullet 8's other end is read from the code (note k) and
was not driven. Live-probed 2026-09-27 (all three apps): no stored
public page (`cache/wc-*.html`) existed before or after either "Delete
Caches" button, and every Administration page opened right after a
sign-in with no Confirm Access step.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Rule 6; all three apps, two runs): as
`admin`, "Check for updates" opened an empty page (no heading, no text,
an empty tab title) with a server error; note f-a1 has the server's
side. `VersionCheck::getLatestVersion()` is called without a `try` in
`AdminHandler::systemInfo()`, so the Guzzle connection error of the
dead proxy reaches the error handler.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rules 7, 7b; all three apps, two runs):
every row against `config.test.inc.php` (OJS and OPS 109 of 109, OMP 110
of 110, no extra row), the sections in file order, "finfo" a bold row
with nothing under it. "oai" › "oai" and "security" ›
"allow_plugin_install" (`on`) read "1"; "queues" › "job_runner",
"schedule" › "task_runner" and "captcha" › "recaptcha" (`off`) read
empty; "umask", written `0022`, reads "18"; "allowed_hosts", written
`"[\"127.0.0.1\",…]"`, reads `["127.0.0.1","127.0.0.1:8000"]`.
"password", "app_key", "salt", "api_key_secret",
"recaptcha_private_key", "altcha_hmackey", "http_proxy" and
"https_proxy" read "**************"; the "smtp_…" settings are absent
from the test files.

<a id="fn-td3"></a>
**td3** — `AdminHandler::expireSessions()` ends by redirecting to the
site's `login` page (`PKPRequest::redirectUrl()`). Live-probed 2026-09-27
(Rule 9a; all three apps): "OK" posted `expireSessions` and landed on
`index/en/login`, headed "Login", with no notice.

<a id="fn-td4"></a>
**td4** — `AdminHandler::expireSessions()` writes to no account's rows.
Live-probed 2026-09-27 (Rule 9b; Side effects bullet 1; all three apps):
throwaway accounts at every level; afterwards each account's rows
(password hash, email, disabled, last login, role assignments) were
unchanged, and each signed in again with its old password.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rules 12, 23; all three apps): as
`admin`, the report's link downloaded the run's log before "Delete Task
Logs"; after it, the same link, opened in a fresh browser, answered 200
with an empty document: no download, no message, no error. A `file=`
name that never existed gives the same empty page.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rules 13, 15, 18; all three apps, runs
1–3): a waiting job's row read "102 | PKP\jobs\testJobs\TestJobFailure |
queuedTestJob | 0 | Created at 2026-09-26 22:16:23 GMT+0000 0", and a job
attempted twice "2"; "Failed At" read "2026-09-26 22:16:41 UTC 0" on
Failed Jobs and on Failed Job Details.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 17b; all three apps): with one
failed job open on Failed Jobs in two tabs, "Delete" in the first, then
"Try Again" on the same row in the second, answered 404 and a window
titled "Error" read "The failed job not found in failed list." with one
button, "OK"; after "OK" the row and the total stayed. "Delete" in the
second tab, and the reverse order, gave the same.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 18; all three apps): a deleted
failed job's "Details" address, the same address with no number, and
`abc`, `0` or `999999` in its place answered 404 with a bare page
reading "404 Not Found", with an empty tab title, no header and no link;
an unknown Administration address gets the same page.

<a id="fn-sc"></a>
**sc** — Scenario seeding. Every scenario runs on OJS, OMP and OPS. The
Site Administrator is the installer's `admin` (password `admin`,
`docs/process/users.md`), the one site administrator of every fleet;
scenario 1's Journal Manager is `manager.maya` of `publicknowledge`, and
its visitor a fresh browser context. The addresses: Administration
`index/admin` (with the journal's path, `publicknowledge/admin`), System
Information `index/admin/systemInfo`, Jobs `index/admin/jobs`, Failed
Jobs `index/admin/failedJobs`, Failed Job Details
`index/admin/failedJobDetails/{id}`. A job of the scenario's own comes
from `pkpApi.createJob({state: 'queued'})` (scenario 5) or `{state:
'failed'}` (scenarios 6 and 7, twice in 8), answering `{id, queue,
displayName}`: lib/pkp's queue smoke-test job
`PKP\jobs\testJobs\TestJobFailure` on the `queuedTestJob` queue,
connection `database` (`scenarios.md` "`POST scenarios/job`"). No drain
of the fleets runs that queue, and the web job runner skips it (code
read), so a seeded or requeued test job stays on the Jobs page for good.
The two pages list every job of the install, 50 to a page in no set
order: a test finds its row by `id`, never by position or by a total, and
a requeued job comes back as a new row with a new `id`, the same `queue`
and `displayName`, "Attempts" 0 (note q). Scenario 2's values are the
test configuration's (`config.test.inc.php`, notes h and td2).
Scenario 4's second tab is `publicknowledge`'s home page. Scenario 9's
run is `pkpApi.runTask({result: 'error'})`, a run of
`PKP\task\UpdateIPGeoDB` ("Update DB-IP city lite database") that ends
in error on the dead proxy (`scenarios.md` "`POST scenarios/task`"); its
report goes to and from `admin@mail.test`, named after the application,
and is found in Mailpit by the `processId` (the Given's code) in its
subject; the link is
`…/index/en/admin/downloadScheduledTaskLogFile?file={logFile}` on the
suite's own server. Scenarios 3, 8 and 9 run alone (`@solo`, the serial
project): "Expire User Sessions" empties the sessions of every worker of
the fleet, "Requeue All Failed Jobs" acts on every failed job of the
fleet, and "Delete Task Logs" empties `{files_dir}/scheduledTaskLogs`
for every test that reads a log link.

<a id="fn-f-a1"></a>
**f-a1** — `AdminHandler::systemInfo()` calls
`VersionCheck::getLatestVersion()` → `parseVersionXML()` →
`FileManager::getStream()` → `Application::getHttpClient()->request()`
with no `try`; `checkIfNewVersionExists()`, used for the notice, wraps
the same call in `try … catch (TransferException)`. Live-probed
2026-09-27 (all three apps, two runs): `GET
index/en/admin/systemInfo?versionCheck=1` answered 500 with an empty
page; the server log reads "Uncaught
GuzzleHttp\Exception\ConnectException: cURL error 7 … for
https://pkp.sfu.ca/ojs/xml/ojs-version.xml" (OMP and OPS their own
version files), after the notice check's own caught failure for the same
request.
Issue report: [docs/issues/U61-A1-check-for-updates-offline-empty-page.md](../issues/U61-A1-check-for-updates-offline-empty-page.md).

<a id="fn-f-a2"></a>
**f-a2** — `clearDataCache()`, `clearTemplateCache()` and
`clearScheduledTaskLogFiles()` each end in `$request->redirect(null,
'admin')` with no trivial notification; `admin/index.tpl` gives
"Delete Data Caches" no `onclick="return confirm(…)"`, its two
neighbours one each. Live-probed 2026-09-27 (all three apps): "Delete
Data Caches" drew no question; each of the three returned to
Administration with its text unchanged and no notice, right after and
after a reload.

<a id="fn-f-a3"></a>
**f-a3** — `FailedJobsPage.vue`: `<PkpButton is-warnable
@click="remove(row)">` calls the delete request directly; no
`openDialog()`. Live-probed 2026-09-27 (all three apps): no browser
question and no window; the failed job left the list and the
database.

<a id="fn-f-a4"></a>
**f-a4** — `PKPJobController::redispatchAllFailedJob()` passes the ids
of `getRedispatchableJobsInQueue()` (payload `<> ''`) to
`FailedJob::redispatchToQueue(null, $ids)`, which filters by id only
`if (!empty($failedIds))`: an empty list (every failed job without a
payload) selects every failed job, and copying them into `jobs` breaks
its not-null `payload` column. `redispatchFailedJob()` refuses a
payload-less job with `api.jobs.406.failedJobPayloadMissing`. No
application path stores a failed job with an empty payload. Live-probed
2026-09-27 (all three apps; OJS runs 1–3, OMP and OPS runs 2–3), on
failed jobs whose stored data was emptied in the database: one job with
data and two without, the two stayed; only jobs without data, `POST
index/api/v1/jobs/redispatch/all` answered 500 and the "Error" window
read "SQLSTATE[23502]: Not null violation … null value in column
"payload" of relation "jobs" …"; nothing was requeued.
Issue report: [docs/issues/U61-A4-requeue-all-failed-jobs-database-error.md](../issues/U61-A4-requeue-all-failed-jobs-database-error.md).

<a id="fn-f-a5"></a>
**f-a5** — `config.TEMPLATE.inc.php` `[cache]`: `web_cache = Off`,
`web_cache_hours = 1`, with the note "configure a tool to periodically
clear out cache files such as CRON" (`find …/cache -name wc-\*.html
-mtime +1 -exec rm`). `PKPPageRouter` stores `cache/wc-{md5}.html`;
`clearDataCache()` flushes the Laravel store and `clearCssCache()`
matches `cache/*.css` only. Read from the code: the test installs run
with `web_cache` off and no screen changes it, so no screen of theirs
shows a stored public page (note x).

<a id="fn-f-a6"></a>
**f-a6** — Live-probed 2026-09-27 (all three apps): with the list
emptied in a first tab, "Requeue All Failed Jobs" in the second answered
406 with "No failed job found in the list."; 1.5 seconds after "OK" one
loading circle was turning beside the button, the button pressable, the
row and the old total kept. The same after A4's 500. On OJS, with page
links under the table, a circle also turned in place of the page number.
The request is `FailedJobsPage.vue`'s `requeueAll()` (note s).
Issue report: [docs/issues/U61-A6-requeue-all-refused-circle-keeps-turning.md](../issues/U61-A6-requeue-all-refused-circle-keeps-turning.md).

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-29 (`index/fr_CA/admin` as `admin`, all
three apps, two runs, the English page the control): on OMP and OPS the
"Gestion du site" panel's line is "##admin.siteManagement.description##";
on OJS it is "Ajouter, modifier ou supprimer des revues de ce site et
gérer les paramètres de l'ensemble du site."; the buttons ("Presses
hébergées" / "Serveurs hébergés", "Paramètres du site") and the other
panels French on all three. The buttons "Presses/Revues/Serveurs
hébergés", "Paramètres du site" and "Afficher les informations sur le
système" opened their pages. Code read 2026-09-29: the key
`admin.siteManagement.description` has an empty `msgstr` in OMP's and
OPS's `locale/fr_CA/admin.po`. Opening "Paramètres du site" also
answered 500 on the plugin gallery's list
(`plugin-gallery-grid/fetch-grid`), on all three apps: the Plugins
tab's known failure, not this page's.
Issue report: [docs/issues/U61-A7-admin-page-french-site-management-raw-key.md](../issues/U61-A7-admin-page-french-site-management-raw-key.md).

<a id="fn-f-omp1"></a>
**f-omp1** — `site.upgradeAvailable.admin` in each app's
`locale/en/locale.po`: OJS and OPS "Please visit <a …>this page</a>",
OMP "Please visit <a …>the PKP website</a>". Read from the code: no
screen of the test installs can show the notice (note e).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Administration (the page, its ops and trail) | `index/admin` → `PKP\pages\admin\AdminHandler` | ROUTE-003 |
| The Administration page container | `lib/ui-library/src/components/Container/AdminPage.vue` | VUE-015 |
| "View System Information" | `index/admin/systemInfo` | AFFM-185 |
| "Expire User Sessions" | POST `index/admin/expireSessions` | AFFM-186 |
| "Delete Data Caches" | POST `index/admin/clearDataCache` | AFFM-187 |
| "Delete Template Cache" | POST `index/admin/clearTemplateCache` | AFFM-188 |
| "Delete Task Logs" | POST `index/admin/clearScheduledTaskLogFiles` | AFFM-189 |
| "View Jobs", "View Failed Jobs" | `index/admin/jobs`, `index/admin/failedJobs` | AFFM-190 |
| The Jobs page | `JobsPage.vue` (`admin/jobs.tpl`) | AFFM-230, VUE-005 |
| "Requeue All Failed Jobs" | `FailedJobsPage.vue` → POST `index/api/v1/jobs/redispatch/all` | AFFM-231, VUE-006 |
| "Try Again" | POST `index/api/v1/jobs/redispatch/{id}` | AFFM-232 |
| "Delete" (a failed job) | DELETE `index/api/v1/jobs/failed/delete/{id}` | AFFM-233 |
| "Details" | `index/admin/failedJobDetails/{id}` | AFFM-234 |
| The Failed Job Details page | `FailedJobDetailsPage.vue` (`admin/failedJobDetails.tpl`) | AFFM-235, VUE-007 |
| "Check for updates" | `index/admin/systemInfo?versionCheck=1` | AFFM-236 |
| "Download", "Download Patch", "More Information" | links from PKP's version file | AFFM-237 |
| "Extended PHP Information" | `index/admin/phpinfo` (new tab) | AFFM-238 |
| The jobs requests | `PKP\API\v1\jobs\PKPJobController` (`index/api/v1/jobs/…`) | API-026 |
| The report email's log link | `index/admin/downloadScheduledTaskLogFile?file=…` | ROUTE-003 |
| The queue settings | `config.inc.php` `[queues]` | SET-062 |
| The routine-task settings | `config.inc.php` `[schedule]` | SET-063 |
| The upgrade warning and beacon (reference) | `config.inc.php` `[general]` `show_upgrade_warning`, `enable_beacon` | SET-046 |
| Stored public pages and the data store (reference) | `config.inc.php` `[cache]` | SET-048 |
| Running queued jobs from the timetable | `PKP\task\ProcessQueueJobs` | JOB-049 |
| Removing old failed jobs | `PKP\task\RemoveFailedJobs` | JOB-052 |
| The timetable | `PKP\scheduledTask\PKPScheduler`, `APP\scheduler\Scheduler` | JOB-063, JOB-064 |
| A routine task, its log and report | `PKP\scheduledTask\ScheduledTask`, `ScheduledTaskHelper` | JOB-065, JOB-066 |
| The built-in task runner | `PKP\scheduledTask\ScheduleTaskRunner` | JOB-067 |
| The queue smoke-test jobs (seeding reference) | `PKP\jobs\testJobs\TestJobFailure`, `TestJobSuccess` | JOB-028, JOB-029 |
| Riders: Hosted journals, Site settings, Login & sessions | `contexts`, `wizard`, `settings`, `confirmAccess`, `confirmAccessSubmit` ops | ROUTE-003 |

## Reference — code anchors

- Page handler: `lib/pkp/pages/admin/AdminHandler.php`,
  `lib/pkp/pages/admin/index.php`.
- Templates: `lib/pkp/templates/admin/index.tpl`, `systemInfo.tpl`,
  `jobs.tpl`, `failedJobs.tpl`, `failedJobDetails.tpl` (and the notice in
  `contexts.tpl`, `settings.tpl`).
- ui-library: `src/components/Container/AdminPage.vue`,
  `src/pages/jobs/JobsPageBase.vue`, `JobsPage.vue`,
  `FailedJobsPage.vue`, `FailedJobDetailsPage.vue`,
  `src/mixins/ajaxError.js`.
- Jobs requests and data: `lib/pkp/api/v1/jobs/PKPJobController.php`,
  `lib/pkp/classes/job/repositories/{BaseRepository,Job,FailedJob}.php`,
  `lib/pkp/classes/job/resources/{HttpJobResource,HttpFailedJobResource}.php`,
  `lib/pkp/classes/job/traits/JobResource.php`,
  `lib/pkp/tools/jobs.php`.
- Routine tasks: `lib/pkp/classes/scheduledTask/{PKPScheduler,ScheduledTask,ScheduledTaskHelper,ScheduleTaskRunner}.php`,
  `lib/pkp/classes/task/{ProcessQueueJobs,RemoveFailedJobs}.php`,
  `classes/scheduler/Scheduler.php` (each app).
- Version check and configuration: `lib/pkp/classes/site/VersionCheck.php`,
  `lib/pkp/classes/config/{Config,ConfigParser}.php`,
  `config.TEMPLATE.inc.php` (each app).
- Sessions and caches: `lib/pkp/classes/core/PKPSessionGuard.php`
  (`removeAllSession()`), `lib/pkp/classes/template/PKPTemplateManager.php`
  (`clearTemplateCache()`, `clearCssCache()`),
  `lib/pkp/classes/security/AuditEvent.php`.
