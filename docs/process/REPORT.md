# Reports and issues

A report is a write-up handed to the team about one thing that is broken:
a regression the sync loop confirmed, a fix that misses what its issue
asked for, or a defect a feature build ran into that the team should fix
rather than the campaign work around. It lives under `docs/reports/` as
`<date>-<repo>-<pr>.md` (or `<date>-<app>-<slug>.md` when no PR
introduced it), is posted to the team the same day, and is deleted once
the team has acted on it; the tracking row or the register footnote keeps
the pointer (RUNBOOK "What goes where"). A GitHub issue on pkp-e2e is the
same write-up in the tracker ("As a GitHub issue" below), so this page is
the one contract for both. Research write-ups (a performance round, a
flake investigation) are not this shape, but they too lead with the
outcome.

## Write for a reader who has five minutes

The team has far more findings than time. A developer or product person
who was not in the session reads the title and the Summary in a list of
many, and decides from those two whether this one comes first. So those
two carry the whole problem. The rest serves the reader who goes on:
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

Severity: critical | high | medium | low · Effort: small | medium | large
· Regression | Intention gap | Defect · <OJS OMP OPS, the apps that show
it>[ · crash: server | script | both]

Introduced: <repo>#<pr> for <repo>#<issue>, commit <sha> (<date>), by
<name> (<github handle>) | not traced; present since at least <sha>

<App(s)> at <app tip> (lib/pkp <tip>). stable-3_5_0: shows it too at
<sha> | does not | not driven. Tracked in <ci-triage row | spec Ux
register An | app-changes row n>. Temporary: delete once acted on.

## Summary

## Impact

## Steps to reproduce

## Cause

## Proposed fix

## Evidence
```

**Title.** The symptom as the user meets it, specific enough to tell it
from its neighbours: who, on which screen, what goes wrong. No cause, no
class names, never "fails" without saying how. It is read in a list, so
it stays around fifteen words.

**The labels line.** The words are the issue's labels ("As a GitHub
issue"), in this order: the severity ("Severity" below), the effort of the
recommended fix ("Effort" below), the kind, the apps that show it, and
the crash word when the app itself failed (a request behind the action
answered a server error, or the page's own script failed in the
browser).

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
It names a starting point for the conversation, never blame: the line
states the change and its author, and nothing about the author.

**Summary.** The section the team reads most, so it is written last,
once the Cause is settled and the report knows what the problem is
rather than how it first showed. Two to four sentences: who does what,
and what happens instead of what they expect, in screen words; what that
costs them and whether they can get round it; and the reach (the apps,
the setups, since when). When the app itself fails, the first sentence
says so and on which side. No paths, request names, commit shas or
hedges ("may", "seems to"): a doubt goes to Evidence. The test: a reader
who stops here can place the finding on the severity scale and say
whether their own users meet it.

**Impact.** The three answers the severity rests on, for someone who
runs a journal. What is lost (data, work, a message, a correct public
record, time), and whether anyone is told. Who meets it: which role, on
which screen, in which setup, how often in ordinary use. Whether there
is a way round on screen, and whether it gets worse with time (a pending
request nobody can clear, wrong records piling up in an index). The last
sentence is the severity and its reason: "High: every press's series
pages lose their heading and description, silently, and the press has no
way to restore them."

**Steps to reproduce.** What a person does through the screens, from a
fresh install, so that a developer can follow it without the campaign's
tools. First the preconditions as a short list: the install (fresh,
default languages), the roles and data that must exist, each written as
what a person creates on screen, with the names the steps use later.
Then numbered steps, one action each, using the names as they appear on
screen in quotes ("Add discussion", "Save And Continue"), with the page's
address where it helps. Then two paragraphs, **Expected** and
**Observed**, right under the steps: on-screen strings verbatim, an error
message or a request and its response in a code block, the server log
line when the app failed. A control (the neighbouring case that still
works) is one sentence after Observed, when it sharpens the finding.

The campaign's shortcuts are never steps: the harness builders, scenario
keys, the seeded test accounts and the probe kit are not in the team's
hands. The one exception is state that only an outside service creates
(an ORCID authorization, a DOI registration agency's answer, a payment
gateway's callback). That precondition may be SQL, given in full, which
writes exactly what the integration's own code writes: the same tables,
columns, value shapes and settings, with the class and method it copies
named in Evidence. A value the app would never store reproduces nothing.
Everything before and after it goes through the screens. A step no
person can take (a link only the old code mailed) says what a person
does instead; failing that, it is not a step and belongs in Evidence.

The steps are walked as written before the report goes out: on a freshly
reset install, through the screens, with the names the report uses. A
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
   applies to stable-3_5_0.
6. **The guard.** The test that would have caught it: a unit test in the
   app's repo, or the e2e scenario here (a **Planned** item in the spec).

Then write it developer to developer: the recommended fix first, with the
files and methods, a short diff when it is a few lines, and why it beats
the alternatives; the alternatives in a sentence each, with why not;
then what goes with it (data repair, backport, test). The last sentence
is the effort and its reason: "Small: one line in the shared DAO, and a
unit test." It is a proposal, and says so; the team decides. It says whether it was tried: a fix
applied and checked against the steps says so in Evidence, otherwise
"not tried". A fix the campaign already carries as a mounted overlay is
named with the overlay's path and the note that it is removed when
upstream picks one.

**Evidence.** The kept script and how to run it, the run folders and
snapshots, the before-side drive and where it ran, the apps and lines not
driven, and what stays unverified, as a bulleted list. This is the only
section where agent names, `.reports/` paths and campaign vocabulary
appear.

## Severity

One of four words per finding, set by what the user loses and how many
users lose it. The scale exists so that a small team can find the few
findings worth its time among many, so it is used strictly: a finding
sits on the lowest level it fits.

- **critical**: a core task (sign in, submit, review, record a decision,
  publish, read or download what is published) fails or loses work or
  data, with no way round, in a setup most installs have; or what goes
  out to the world (DOI deposits, a published article's pages and files)
  is wrong for many items. Saving a discussion on a press or a preprint
  server that fails and notifies nobody is critical.
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

A finding filed on pkp-e2e's tracker is the report, in the same sections,
with three changes:

- The title is the report's title. The labels line becomes the issue's
  labels: `severity: critical`, `severity: high`, `severity: medium` or
  `severity: low`; `effort: small`, `effort: medium` or `effort: large`;
  `regression`, `intention gap` or `defect`; one of
  `ojs`, `omp`, `ops` per app; and `crash: server` or `crash: script`
  (both for both). The line is not repeated in the body.
- The body opens with the Introduced line, its PR, issue and commit as
  links and the handle written without an `@`, so that filing does not
  notify anyone (the team decides whom to ask); then the header
  paragraph, then Summary through Proposed fix as written.
- Evidence holds only what someone outside the session can open: the
  kept script as a link to its file on pkp-e2e `main`, the upstream
  commits, lines and PRs as links, and the spec's register entry as a
  link. Local run folders (`.reports/`) and agent names stay out.

## One report, one finding

A report describes one finding, and an issue always does. When one change
causes several, one report may carry them, with the Summary naming each
in a sentence and a `## Finding n — <title>` block per finding holding
its own labels line, Impact, Steps, Cause and Proposed fix in that order,
then one shared Evidence section; the labels line at the top carries the
highest severity. Filed as issues, they are one issue each, linked to
each other. Two findings with different fixes are two reports.

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
- Short. The Summary and Impact together fit on one screen; a report
  that runs long has evidence in its body.
- An update after the report went out (another app received the change,
  the team ruled on part of it) is one dated paragraph under the header
  paragraph, and the sections, the labels line included, are edited to
  match; the report always reads as current.
