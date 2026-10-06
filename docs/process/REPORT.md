# Reports and issues

This page is the one contract for two kinds of write-up about one thing
that is broken. A **report** is the urgent kind: a regression the sync
loop confirmed, a fix that misses what its issue asked for, a bug a
developer's PR introduces, or a defect that blocks a feature build and
that the team should fix rather than the campaign work around. It lives
under `docs/reports/` as `<date>-<repo>-<pr>.md` (or
`<date>-<app>-<slug>.md` when no PR introduced it), is posted to the
team the same day, and is deleted once the team has acted on it; the
tracking row or the register footnote keeps the pointer (RUNBOOK "What
goes where"). An **issue report** is the backlog kind: a defect in a
spec's register, written up under `docs/issues/` by the housekeeping
session (MAINTENANCE "Issue reports"), filed as a GitHub issue on pkp-e2e
("As a GitHub issue" below) and deleted when the issue closes. Research write-ups (a performance round, a
flake investigation) are not this shape, but they too lead with the
outcome.

## Write for a reader who has five minutes

The team has far more findings than time. A developer or product person
who was not in the session filters the list by severity and effort,
reads the title and the Summary, and decides from those whether this one
comes first. So the labels must be honest and those two must carry the
whole problem. The rest serves the reader who goes on:
Impact says how much it matters and to whom, Steps let them see it with
their own eyes, Cause and Proposed fix let them fix it and check the fix.
Everything the campaign needed to establish the finding (agent names,
run folders, scratch contexts, the before-side drive) sits at the end, in
Evidence.

## The sections, in order

Use exactly these headings. A section with nothing to say is one line,
never dropped.

```markdown
# <What breaks, in product words: who does what, and what goes wrong>

- **Severity** critical | high | medium | low
- **Effort** small | medium | large
- **Kind** regression | intention gap | defect
[- **Crash** server | script | both]
[- **Security** unreleased]
- **Affects**
  - main: <apps>
  - 3.5: <apps>[ (code)]
  - 3.4: <apps> (code)
  - 3.3: none (code; <the word it needs, e.g. no Institutions page>)
- **Introduced** `<repo>#<pr>` for `<repo>#<issue>` · [<sha>](<commit
  URL>) · <date> · <name> (<github handle>) | not traced; present since
  at least [<sha>](<commit URL>) (<date>)
- **Upstream** none found (<date>) | `<repo>#<n>` (open | closed
  without a fix | fix in PR `<repo>#<n>`, not yet in main)[, covering
  <what it covers when that differs>][, the team's copy of this issue]
- **Tracked in** <spec Ux [An](<entry URL>), [Am](<entry URL>) |
  ci-triage row | app-changes row n>[ · Temporary: delete once acted on]
- **Checked** <date>, each branch's tip (the commits in Evidence)
- **Model** <model id>[, parts on <model id>…] | not recorded

## Summary

## Impact

[**Lost**, **Who**, **Way round** bullets; the severity sentence]

## Steps to reproduce

## Cause

## Proposed fix

## Evidence
```

**Title.** The symptom as the user meets it, specific enough to tell it
from its neighbours: who, on which screen, what goes wrong. No cause, no
class names, never "fails" without saying how. It is read in a list, so
it stays around fifteen words.

**The header.** Everything a reader filters and sorts by, readable in
the file itself: the bullets, one fact each, in this order,
right under the title. The GitHub labels are derived from it ("As a
GitHub issue"), so the report carries the same facts wherever it is
read; a label changed on GitHub is copied back into the header.

- **Severity**, **Effort**: the words defined below ("Severity",
  "Effort").
- **Kind**: **regression** when it worked before and a change broke it
  (Introduced names that change), **intention gap** when a fix misses
  what its issue asked for, and **defect** otherwise: it never worked, or
  its start cannot be traced.
- **Crash**, only when the app itself failed: a request behind the action
  answered a server error (`server`), or the page's own script failed in
  the browser (`script`), or both.
- **Security**, only for a fault that could plausibly be a security
  weakness and that no release carries (Affects names `main` alone): the
  word `unreleased`. One in released code never gets a report; it goes to
  the private security repo (RUNBOOK "What goes where").
- **Affects**, **Introduced**, **Upstream**: below.
- **Tracked in** links each register entry (or names the tracking row),
  and **Checked** dates the walks; the branch tips they ran on are
  listed in Evidence. A report under `docs/reports/` ends the bullet
  with "Temporary: delete once acted on"; an issue report does not.
- **Model** names the Claude model that wrote the report (its walk,
  trace and text, revisions included), so the team knows an AI agent
  wrote it and can give one written partly by a fallback model a closer
  check (maintainer, 2026-10-06). The model that served most of the work
  comes first, any other after "parts on". It is never written by hand:
  `npm run report-models -- --write` reads it from the Claude Code
  transcripts of the machine the work ran on and merges it into the
  bullet, keeping every model the bullet already names (transcripts
  expire, and a workstation's are not on the VM). "not recorded" only
  for a report no transcript remains for. A report outside this header
  shape (an older regression report, a research write-up) carries the
  same as a `Model: <model id>.` line under its title.

**Introduced.** The change that brought the fault in, so the team can
see who knows that code best and ask them first. It is traced from the
line the Cause names, not from where the symptom shows: `git blame` on
that line, then `git log -L` or blame at the parent when the blamed
commit only moved or reformatted it, until the commit that made the line
wrong. The commit leads to its PR and the issue the PR links (the GitHub
API's `commits/<sha>/pulls` answers for a merged PR); a fault that needed
a pkp-lib change and an app change names both. The person is the PR's
author, or the commit's author when there is no PR, by name and GitHub
handle. A fault older than the history that can be read, or spread over
many changes, says "not traced" and the oldest commit known to show it.
It names a starting point for the conversation, never blame: the bullet
states the change and its author, and nothing about the author. The
detail of the trace (blame steps, moves, the PR's discussion) goes in
Evidence, so the bullet stays one line or two.

**Upstream.** Whether pkp already tracks the fault, so the team sees
at once that a report adds to a known problem rather than a new one.
Search pkp/pkp-lib first, where most of the shared code lives, then the
app's own repo and pkp/ui-library: by the words a user would use for the
symptom, then by the class or method the Cause names. A pkp issue about
the same fault, open or closed without a fix, or a PR that fixes it but
has not reached `main`, goes in the bullet, with a clause when it covers
less or more than this report (another app, one symptom of several).
The report is written as usual either way: it re-verifies the fault on
today's code and adds the steps, cause and fix analysis the pkp issue
may lack. A fix already on `main` means the finding is stale and gets
no report. Nothing found says so, with the date of the search. When a
developer copies a filed issue to pkp to work on it, the bullet names
the copy with "the team's copy of this issue", and the pkp-e2e issue
closes once the copy is resolved and a walk on `main` shows the fix
(MAINTENANCE "The housekeeping session").

**Affects.** Which apps on which versions show the fault, so the team
can see what a fix must reach and what a backport would cover: a header
bullet with a sub-item per version (`main`, 3.5, 3.4, 3.3) naming the
apps that show the fault there. An app a sub-item leaves out was checked
and does not show it, or has no such surface; "none" says no app does.
"(code)" marks a version read in the code rather than walked, and "not
checked" a version not looked at, with the reason in Evidence. A short
bracket gives the one word a sub-item needs ("none (no Institutions
page)", "OJS (on a subscription's IP ranges)"); anything longer goes in
Evidence. Walked means the Steps were taken on that app and version, on
an install of the branch's tip freshly reset to its default dataset.

`main` and 3.5 are walked: the kept script takes the same Steps on the
`stable-3_5_0` install with `PKP_E2E_LINE=stable-3_5_0` in front, and
only when the steps cannot be taken there does the 3.5 sub-item fall
back to the code, with the reason in Evidence. 3.4 and 3.3 are read in the code
by default, since a fix is not expected to be backported past the 3.5
LTS: pkp's `stable-3_4_0` and `stable-3_3_0` branches, the app's, its
pkp-lib's and its ui-library's, fetched from pkp (the app checkout's
`upstream` remote, the `origin` of `lib/pkp` and `lib/ui-library`) and
read with `git show <branch>:<path>`. For a fault with an Introduced
commit, the question is whether that change, or its backport (found by
the PR or issue number in the branch's log), is on the branch; for an
older fault, find the code that does the same job there and judge
whether it has the same fault (older versions often do that job in
other classes, so a missing file answers nothing). When the team asks
for a particular issue to be checked on 3.4 or 3.3, the Steps are walked
there too, on that line's install (harness.md "The stable lines"), and
its sub-item loses the "(code)"; where the older screens make the
Steps differ, the Steps say so in a bracket and Evidence names the
adaptation.

The severity never rests on a "(code)" sub-item alone, and a walk and a code
read that disagree are settled before the report goes out.

A branch's tip stands for its version, since that is where a fix would
land. Evidence lists each line's tips, says what each code read looked
at, and names the database the walks ran on (the test installs run
PostgreSQL); a fault that could depend on the database (a column length,
a strict type, a query's ordering) says "MySQL not checked".

**Summary.** The section the team reads most, so it is written last,
once the Cause is settled and the report knows what the problem is
rather than how it first showed. Two to four sentences: who does what,
and what happens instead of what they expect, in screen words; what that
costs them and whether they can get round it; and the reach the header
cannot say (the setup or setting it needs; the apps and versions are the
Affects bullet's). When the app itself fails, the first sentence
says so and on which side. No paths, request names, commit shas or
hedges ("may", "seems to"): a doubt goes to Evidence. The test: a reader
who stops here can place the finding on the severity scale and say
whether their own users meet it. An issue report's Summary is also the
symptom of the register entry it covers, word for word, so it is
written in the spec's product voice and the two change together.

**Impact.** The three answers the severity rests on, for someone who
runs a journal. What is lost (data, work, a message, a correct public
record, time), and whether anyone is told. Who meets it: which role, on
which screen, in which setup, how often in ordinary use. Whether there
is a way round on screen, and whether it gets worse with time (a pending
request nobody can clear, wrong records piling up in an index). The last
sentence is the severity and its reason: "High: every press's series
pages lose their heading and description, silently, and the press has no
way to restore them."

**Steps to reproduce.** What a person does through the screens, starting
from PKP's default test dataset, so that a developer can follow it on
the install they already have. Every PKP test and development install
loads that dataset ([pkp/datasets](https://github.com/pkp/datasets),
`<app>/<branch>/pgsql`): one journal, press or server, its users (`admin`,
`dbarnes` and the others, each password the username twice) and its
submissions in every stage. `docs/process/dataset.md` lists them per
app. First the preconditions as a short list: the dataset of the
version ("the default dataset, OJS `main`"), then only what the steps
need beyond it, each written as what a person creates on screen, with
the names the steps use later. Use the dataset's own users, contexts and
submissions wherever they serve, by username and by title ("sign in as
`dbarnes`", "open "Signalling Theory Dividends"", with the ID when
it helps), so the reader creates nothing they already have; create only
what the dataset lacks (a setting it does not turn on, a role or a
second context it does not hold), and say why when it is not obvious.
Then numbered steps, one action each, using the names as they appear on
screen in quotes ("Add discussion", "Save And Continue"), with the page's
address where it helps. Then two paragraphs, **Expected** and
**Observed**, right under the steps: on-screen strings verbatim, an error
message or a request and its response in a code block, the server log
line when the app failed. A control (the neighbouring case that still
works) is one sentence after Observed, when it sharpens the finding.

The campaign's shortcuts are never steps: the harness builders, scenario
keys, the campaign's own seeded accounts (users.md) and the probe kit are
not in the team's hands; the default dataset is. The one exception is
state that only an outside service creates
(an ORCID authorization, a DOI registration agency's answer, a payment
gateway's callback). That precondition may be SQL, given in full, which
writes exactly what the integration's own code writes: the same tables,
columns, value shapes and settings, with the class and method it copies
named in Evidence. A value the app would never store reproduces nothing.
Everything before and after it goes through the screens. A step no
person can take (a link only the old code mailed) says what a person
does instead; failing that, it is not a step and belongs in Evidence.

A latent defect, one no screen reaches today, has no steps: this
section says so in a sentence and names what would reach it (a plugin
calling the method, a setting no screen offers), and the Cause carries
the code read.

The steps are walked as written before the report goes out: on an
install freshly reset to the version's default dataset, through the
screens, with the names the report uses. A
script that takes exactly those steps counts. Observed is what that walk
saw. Where the walk differed from the text, Evidence says how.

**Cause.** The root, not the place where it shows. Follow the wrong
value or decision back to the first place the code goes wrong, and say
what rule it breaks: the class and method, the line, and when known the
change that brought it and what that change was for. Then the reach of
the cause: the other callers, screens, apps and stored data the same
fault touches, each marked as checked in the code or on screen. This is
the first section a developer needs and the first a product reader may
skip.

**Proposed fix.** The fix the team should make, not the first change
that turns the symptom off. Before writing it, work out:

1. **Where the rule lives.** The fix goes in the layer that owns the rule
   that broke (the shared pkp-lib class rather than one app's subclass,
   the service rather than one handler, the writer of bad data rather
   than each of its readers), so that every caller is covered. A guard at
   one caller that leaves the others exposed is a workaround, and says so.
2. **How the code base already does it.** How the sibling classes, the
   other apps' twins and the surrounding code solve the same problem.
   The fix follows that pattern and names it ("the other DAOs read
   `$this->primaryKeyColumn`"). A new pattern needs a reason.
3. **Every instance.** A search for the same mistake elsewhere (the same
   call, the same assumption). Each one is covered by the fix or named as
   left out.
4. **What the introducing change was for.** The fix keeps that intent. A
   revert is proposed only when it is the right answer, and it says what
   is lost.
5. **What the fix touches.** Callers whose behavior changes, the REST API
   and plugin hooks that others rely on, records already stored wrong (a
   repair or an upgrade migration when bad data exists), and whether it
   applies as written to the older versions Affects lists, or what a
   backport would need there.
6. **The guard.** The test that would have caught it: a unit test in the
   app's repo, or the e2e scenario here (a **Planned** item in the spec).

Then write it developer to developer: the recommended fix first, with the
files and methods, a short diff when it is a few lines, and why it beats
the alternatives; the alternatives in a sentence each, with why not;
then what goes with it (data repair, backport, test). The last sentence
is the effort and its reason: "Small: one line in the shared DAO, and a
unit test." It is a proposal, and says so; the team decides.

The recommended fix is tried, so the team gets a fix that is known to
work rather than a guess. It is written as a diff against the app root
(`shared/playwright/checks/issues/<slug>/fix.diff`, linked from the
section, so the team can apply it as it stands), applied to the
checkouts for the length of a walk (`bin/try-fix.js`, harness.md "Trying
a fix"), and checked on `main` on every app it touches: the kept walk
now shows the Steps' Expected, and a neighbour check shows the fix does
not reach further than it should (the same action for a role that must
stay refused, the path the fix must leave alone). The section says it
was tried and what the check showed, in a sentence; Evidence gives the
command. A fix that cannot be tried as written (a product decision
first, a migration of stored data, a change too large to be a diff)
says "not tried" and why. A fix the campaign already
carries as a mounted overlay is named with the overlay's path and the
note that it is removed when upstream picks one.

**Evidence.** The kept script and how to run it, the run folders and
snapshots, the before-side drive and where it ran, the apps and lines not
driven, and what stays unverified, as a bulleted list. This is the only
section where agent names, `.reports/` paths and campaign vocabulary
appear. An issue report's Evidence stays in the file and out of the
issue's body ("As a GitHub issue"), and holds only what the team can
open: the kept script and how to run it, what each
code read looked at, the apps and versions not driven, and what stays
unverified. Run folders and agent names stay in the session's
`.reports/`.

## Severity

One of four words per finding, set by what the user loses and how many
users lose it. The scale exists so that a small team can find the few
findings worth its time among many, so it is used strictly: a finding
sits on the lowest level it fits.

- **critical**: a core task (sign in, submit, review, record a decision,
  talk to the others on a submission, publish, read or download what is
  published) fails or loses work or data, with no way round, in a setup
  most installs of that app have; or what goes out to the world (DOI
  deposits, a published article's pages and files) is wrong for many
  items. Saving a discussion on a press or a preprint server that fails
  and notifies nobody is critical.
- **high**: a core task fails or gives a wrong result, with no way
  round, in an ordinary setup that is not the default (a second
  language, a DOI plugin, OMP chapters); or a secondary task fails for
  everyone; or a public surface loses what it is for on every install,
  silently (a reader page without its content, a feed or OAI-PMH list
  that fails, a sitemap without articles). A press's series pages
  without the series' name, and a preprint without an abstract that
  breaks the server's OAI-PMH lists, are high.
- **medium**: a task fails or misleads but there is a way round on
  screen; or it happens only in a rarely met state or on a narrow input;
  or a secondary output is wrong in a field or for a few items. An
  article title holding a bare "<" cut short in its JATS XML, and the RSS
  2.0 feed failing until the first publication while the other two feeds
  work, are medium.
- **low**: nothing is lost and the task gets done: wording, a label, a
  raw translation key, a page title that misleads while the outcome is
  right, a wrong value nothing downstream relies on; and every latent
  defect, which no user can reach today. An invitation email that greets
  a newcomer by their address instead of their name is low.

How to pick:

- Consequence and reach decide, not the crash, which has its own label.
  A server error the user can retry past is medium at most, and a silent
  wrong result can be high without any error. A crash with no way round
  in a core task is at least high.
- Who sees it does not lower it. Output that only machines read (JATS,
  feeds, OAI-PMH, DOI deposits, exports, the REST API) is rated by what
  its readers and the indexes behind them lose, the same as a screen.
- Silence counts against it. A task that looks done and is not, or a
  record that is wrong where nobody looks, sits one level above the same
  fault shown as an error.
- A regression is rated like any other finding. Being unreleased makes
  it cheap to fix, not less severe.
- Torn between two levels, take the lower, and name in the reason what
  would raise it.
- The level is a proposal. The team changes the label, a changed label
  is the ruling, and the report follows it.

## Effort

One of three words for the recommended fix, so that the team can pick the
severe findings that are also cheap to close. It counts the fix with its
test and any repair of data already stored wrong; a backport is not
counted.

- **small**: a few lines in one place, following a pattern the code
  already uses, with no data repair and no change to what an API client,
  a plugin or another screen relies on. Someone who knows the area does
  it, test included, in an hour or two.
- **medium**: several files or two repos (pkp-lib and an app, or the
  backend and ui-library), or a repair of stored data or an upgrade
  migration, or a behavior change other callers must follow. About a
  day.
- **large**: a new pattern, a schema change, a change to a contract that
  others rely on (the REST API, a plugin hook), or a product decision the
  fix cannot be written without. Days, or a discussion first.

The effort is an estimate from reading the code, unless the fix was
tried. Torn between two sizes, take the larger: a finding sold as small
that is not wastes the time the label was meant to save.

## As a GitHub issue

An issue report under `docs/issues/` is written to be filed from the
file, on pkp-e2e's tracker (`jardakotesovec/pkp-e2e`):

- The title is the report's title. The labels are read off the header:
  `severity: <word>`, `effort: <word>`, the kind (`regression`,
  `intention gap` or `defect`) and `crash: server` or `crash: script`
  (both for both) and `security` from their bullets; `model: <model id>`
  per model the Model bullet names; one of `ojs`, `omp`, `ops` per
  app and one of `main`, `3.5`, `3.4`, `3.3` per version that has a
  a sub-item naming it under the Affects bullet; and `tracked upstream`
  when the Upstream bullet names a pkp issue or PR. They are a filter on
  top of the header, never the only place a fact is written.
- The body is the file below the title, header included, unchanged, up
  to the Evidence section, which stays in the file to keep the issue
  lean: `awk 'NR>1 && /^## Evidence/{exit} NR>1' <file>` prints it.
  Every link in the body is a full address that works on GitHub: a pkp commit as its URL (`https://github.com/pkp/pkp-lib/commit/<sha>`),
  and pkp-e2e's own files as
  `https://github.com/jardakotesovec/pkp-e2e/blob/main/<path>` (the
  spec's register entry with its anchor, the kept script).
- Filing notifies no one outside pkp-e2e. A GitHub handle is written
  without an `@`, and a pkp issue or PR as text in a code span
  (`pkp/pkp-lib#13288`), not as a link: GitHub would otherwise post a
  "mentioned this" line on pkp's own issue for every report. The team
  decides whom to ask and where to link.

## One report, one finding

A finding is one fault: one cause, one fix. Several register entries
that are symptoms of the same fault are one finding, and their issue
report names each symptom. An issue report always holds one finding.
A regression report may hold several when one change causes them: the
Summary names each in a sentence, a `## Finding n — <title>` block per
finding holds its own Severity, Effort, Kind, Crash and Affects bullets, Impact,
Steps, Cause and Proposed fix in that order, one shared Evidence section
follows, and the header at the top carries the highest severity. Two
findings with different fixes are two reports.

## Writing rules

- Product voice above the Cause, developer voice from the Cause down.
  Campaign words ("claim check", "regression reader", "fleet", "scratch
  context", "the kit") never appear above Evidence.
- Verbatim beats paraphrase: the dialog's text, the email's subject, the
  page title, the error line from the server log, each quoted or in a
  code block.
- Every sentence states a fact the report established. A guess is marked
  as one, in the Proposed fix or in Evidence under "unverified", never
  in Summary, Impact or Observed.
- Relevant, not redundant, plain English: the three tests every
  sentence passes, in that order, and clarity beats shortness.
  - **Relevant**: it tells a QA or developer who is learning about the
    problem, and wants to fix it, something they need: how to see it,
    what it breaks and for whom, why, how to fix it and check the fix.
    Evidence holds what the team needs to rerun and check (the script
    and the one command that runs it, what each code read looked at,
    what was not driven, what stays unverified), not the story of the
    walk or the harness's own setup (fleet resets, run tags).
  - **Not redundant**: a fact is said once, in the section that owns
    it. The header's facts (apps, versions, severity, crash, who
    introduced it) are not repeated below it ("on all three apps",
    "since 3.4"), and a sentence that only restates, previews or sums
    up goes.
  - **Plain English**: a reader gets it on the first pass. Name the
    actor, say what state a setting is in and what that means
    ("'Permit changes to Settings' is on by default for the Editor
    role, so …"), not what an install or the code does to a box ("an
    install ticks the box"), and unpack a stacked clause into two
    sentences. A sentence that needs a second read is rewritten, even
    when the clear version is longer.
- Laid out for reading, not only for accuracy: a paragraph holds one
  idea and runs about four lines at most, and a list of like things is a
  list. The Summary is two or three short paragraphs (what happens and
  what the user expected; what it costs and whether there is a way
  round; the reach). Impact is three labelled bullets, **Lost**, **Who**
  and **Way round**, each one or two short sentences read at a glance,
  then the severity sentence as its own paragraph; a detail not needed
  to judge the severity (a character count, which class reads a column)
  goes to the Cause or Evidence.
  The Cause is a paragraph per step of the argument, with the reach as a
  bullet list. The Proposed fix leads with the recommendation (and its
  diff), then **Alternatives** and **What goes with it** as bullets, and
  ends with the effort sentence as its own paragraph. Steps are split
  into labelled groups when they walk more than one path ("Adding:",
  "Editing:").
- An update after the report went out (another app received the change,
  the team ruled on part of it) is one dated paragraph under the header,
  and the sections, the header included, are edited to match; the
  report always reads as current.
