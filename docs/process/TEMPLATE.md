# Spec template

Copy this file to `docs/specs/U<nn>-<feature>.md` (the zero-padded
FEATURE-MAP row number) and fill in every section, or mark a section
`N/A — <reason>`. The HTML comments are guidance. Delete them in the real
spec.

## Write for a reader who has only this page

A QA person or product owner who wants to **learn** the feature, **check**
whether it behaves as intended, or **add** to it: someone who knows the
applications and has read `docs/specs/GLOSSARY.md`, has no code, has read no
other spec, and reads nothing below the footnotes. The readability pass
(RUNBOOK step 7) hands the body to exactly that reader. The spec is the
source of truth: everything the project knows about the feature lives here
(its behavior in all three apps, where the apps differ, what is broken, what
still needs a product decision), and everything else (tests, bug lists,
coverage views) is derived from it. If a reader needs a developer or an
internal report to understand a sentence, the sentence is wrong.

**One spec covers OJS, OMP and OPS.** The body describes shared behavior. A
claim with no app marker asserts "verified identical in every app that has
the surface". The absence of a marker is itself a claim, never "not checked
yet" (how that bar is met is RUNBOOK multi-app rule 1). A divergence carries
an inline marker linking to the Findings register. A feature an app lacks
entirely gets a title badge such as `{OJS OMP}` and one absence paragraph near
the top, written as an install fact ("OPS does not install X by default"),
never as an impossibility. Cross-app vocabulary (press and server for journal,
monograph and preprint for submission, and so on) follows GLOSSARY Part II:
write the OJS term once, note the substitution in the preamble, and do not
re-badge every mention.

**How much to write.** Two principles, no length quota. *Complete*: enough to
recreate the feature from the spec alone. *Say each fact once*: state it in
its home section and link to it from anywhere else. Length is whatever those
two produce. Write plain sentences. A rule the reader has to read twice is a
defect, however true it is.

Every writer, whether drafting, folding or rewriting, writes to that
reader from the start: lean, in the GLOSSARY's words, with nothing the
reader already knows explained again (what a test install, a seeded or
scratch journal, a ready account or the mail catcher is; how to reach
the Dashboard; what a role does). Three kinds of sentence fail:

- **A verb or noun that maps to nothing on screen.** "Re-rendered",
  "is built to show", "the fold", "the editorial layout": say what the
  tester sees ("the tab shows again with the message at the top right",
  "a link that opens a list under it").
- **A token the page does not explain.** Every screen a rule or scenario
  starts on is reachable from the text: a menu path or an address. Every
  term the screen itself does not use is glossed at first use.
- **A step with two readings, or an outcome nobody can judge.** "Up to 255
  characters" says whether longer input is cut or refused. "The change is
  lost" says where the tester looks to see that. A scenario step that
  leaves a choice ("press another tab") names one.

Two conventions the shipped specs share, so a new spec does not invent
its own:

- The scenario preamble is one or two sentences: which scenarios run on
  the seeded journal with ready accounts and which on a scratch journal
  with throwaway ones, in the GLOSSARY's words, with the accounts, the
  passwords and the tooling recipe in the footnote. It defines nothing and
  says nothing about how to read the page (no "common to all three apps",
  no pointer to a note under the title).
- A finding's expected and observed behaviour are stated in the same
  screen words as the rule it marks, so a tester can tell a documented
  defect from a pass.

## The lint gate

Every spec passes `node docs/process/lint/lint-spec.mjs <spec>` with zero
findings before the claim check (RUNBOOK step 5) and after every later edit.
The gate checks only what is mechanically decidable and would be a broken
reference for the reader:

- Findings register: every entry opens `**ID — title** · badge · impact`
  under its own anchor; IDs are dense per prefix and in document order; the
  summary table mirrors the entries (same badge, the same crash word when
  the head carries one, sorted 🐞 → ❓ → ✅); a crash word is one of server /
  script / both; every
  🐞 or ❓ entry is marked in the body with exactly one `⚠ [A1](#a1)`, a ✅
  entry with a plain link and never ⚠; a `### Retired` entry needs no marker.
- Links: every link, anchor and `<sup>` mark resolves both ways, anchors are
  unique, and no footnote block is orphaned.
- Campaign identifiers in the body: a FEATURE-MAP row code or an atlas atom
  ID is a reference no QA or product reader can resolve (rule 5).
- The Conventions line is the one-line GLOSSARY pointer verbatim.
- Coverage: in the draft table every row carries a class and a "Runs in"
  or a "Why not"; in the final shape (the "Left out" bullets alone) every
  bullet opens with one of the reason words and the Rarely met bullet
  holds no main or guard row; a `verified` spec carries the final shape
  and no `planned` row; no date sits in the section; and no scenario leaves a
  typed value to the tester ("type a sentence", "type a title").

`node docs/process/lint/lint-spec.mjs --claims <spec>` prints the spec's
claims marked by kind (`to-drive`, `no-mark`, `undated`, `no-screen`,
`role-gated`, `exclusive`, `string`; the rest print as dated) for the claim
check; it is a report, not a gate. A `to-drive` line is one whose footnote
opens `to drive:` with the author's open question (RUNBOOK step 3).

Everything else, including wording, glossary vocabulary, app badges, the
code-in-footnotes rule and the shape of the preambles, is the writer's
judgment, checked by the readability pass and never by the gate.

## The rules

1. **Product language in the body, code and evidence in the footnotes.** No
   section body may contain a class or method name, a route, a Vue component,
   a database table or column, a constant, or an HTTP status code. Describe
   what a user observes or does. Code symbols, status codes, redirect
   targets, probe notes and dates, seeded usernames and journals are
   provenance: they prove a claim, they are not the claim. They live only in
   `<sup>x</sup>` footnotes, and all footnote blocks sit in one
   `## Footnotes — mechanism & evidence` section at the end, so the upper spec
   stays in product language. Anchor to stable symbols
   (`ClassName::method()`, a constant, a route path), never to line numbers.
   A footnote is self-contained: cite a probe by its date and what was seen
   ("live-probed 2026-07-31: both links present, single-use"), never by a
   report file or item number, because `.reports/` is session scratch and a
   committed spec must stand on its own. A probe citation may name what it
   covers, so a reader can tell which claims the probe settled:
   "Live-probed 2026-09-02 (Rules 4, 9; Actors rows 1–2): …".
   - Bad: "`/authorDashboard/submission/{id}` redirects to My Submissions …
     (live-probed 302, both author kinds)"
   - Good: "An old bookmarked author-dashboard link lands on My Submissions
     with that submission's tracking view open. <sup>g</sup>"
2. **Concrete role names, never umbrellas.** Use the app's actual role names,
   for example Site Administrator, Journal Manager, Section Editor,
   Assistant, Author, Reviewer, Reader. The app's Roles settings screen is
   the source; OMP and OPS names are in GLOSSARY Part II. Never "editorial
   staff", "editors", "the full manager". If several roles qualify, list
   them. If it depends on assignment or scope, say so. One canonical name per
   role per spec.
3. **One home for permissions.** Actors & permissions is the single place
   that says who may do what. Rules & state describes behavior and state and
   never restates the permission matrix. Where behavior depends on a role,
   name the state and point to Actors for the who.
4. **Findings are accurate and easy to read.** Those are the only wording
   tests. A finding states expected behavior, observed behavior and impact,
   in the same product voice as the rest of the spec. Write it as what it is:
   a defect report for the team that maintains this code. Here is what the
   screen led the user to expect, here is what they got, fix one of them. Say
   exactly what happens. Never soften a finding into vagueness; a reader must
   be able to tell precisely what is broken from the spec alone. A finding is
   not a walkthrough: the spec states the outcome, and step-by-step
   reproduction stays in the session's `.reports/` scratch, because a product
   reader needs the outcome, not the trail.
   Each finding enters at the weight its impact earns, symptom-first, at
   proportionate length. Severity is proposed by the change list and settled
   by the reviewer, not argued in the spec: badge it, state the symptom,
   state the impact in one plain word, and stop. Campaign-internal words
   ("claim check", "change list", "orchestrator") do not belong in a
   spec; evidence citations live in footnotes.
   Every finding belongs in a register, with one exception: a potential
   security concern goes to the maintainer's private security file and never
   into a public spec, test or report until the fix ships (RUNBOOK "What goes
   where"; these repos are public).
   - Bad: "⚠ the restriction may not fully apply in every case."
   - Good: "⚠ the Section Editor is offered **Remove Role** on this screen,
     but pressing it returns to the list with the role still assigned and no
     message [A3](#a3)."
5. **Shared mechanisms have one owner; other specs link.** A mechanism that
   serves several features is described fully in exactly one spec, the one
   whose subject it is. Every other spec keeps only what its own reader needs
   and links instead of retelling. The owner marks the passage with an
   explicit anchor (`<a id="stage-access"></a>`, never derived from a
   heading); the referencing spec points at it
   (`[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)`).
   Before describing any cross-feature behavior, grep `specs/` for its
   user-facing string: if another spec owns it, link; if this spec is the
   natural owner, take the passage over and leave links behind. A
   Cross-feature bullet states no behavior of the other feature's screen
   beyond the pointer.
   Which spec owns what:
   - *Behavior that does not vary with context* is specified once, in the
     mechanism's home feature. Context features own the deltas (presence,
     configuration, permissions, consequences) and point home for the
     mechanics. The test per sentence: "if I changed the stage, role or
     surface, would this still be true?" Reusable managers (the file manager,
     the participant manager, tasks and discussions) get their mechanics in
     their own feature; stage features own each instantiation: which panels
     appear, which actions and columns show, and the role-by-state gates on
     that stage. Tests follow the same split: mechanics are tested deeply
     once in the home feature, and context features test only gates and
     instantiation. Duplicate mechanism coverage is a reviewable defect.
   - *Ownership follows the screen, not the trigger.* A status, notice or
     other display belongs to the feature that owns the screen where it
     renders, even when another feature's actions drive it. The triggering
     feature keeps one side-effect line plus a pointer.
   - *Name the feature, never its row code.* A cross-feature pointer reads as
     the feature's name in the reader's words ("participants are managed on
     the Participants panel; see *Stage participants*") and becomes a real
     link once that spec exists. A bare `U35` means nothing to a QA reader
     and the lint gate rejects it, as it rejects atlas atom IDs outside the
     Reference tables. Say where the reader goes; features do not "own"
     things in a spec's own voice.
6. **One shared workflow screen, the Author included.** The editorial
   dashboard and My Submissions are separate features that each own their
   list, but the workflow screen both open is one shared surface. Workflow
   specs cover every role on it, the Author included, in the same permission
   rows: the role determines what is available, it never creates a separate
   screen. Never split a stage into an editor view and an author view, and
   never describe the Author's access as its own reduced screen. The Author's
   entry route (View on My Submissions) belongs to the My Submissions
   feature; everything after it belongs to the workflow features.
7. **Glossary discipline.** `docs/specs/GLOSSARY.md` defines the product
   vocabulary the specs use, as the OJS, OMP and OPS screens use it, plus the
   settled choices between competing words. On-screen names always win. A
   term may be coined only when the screen offers none, every coined term has
   one definition home (the glossary), and its first use in a spec carries a
   gloss or a pointer. The same applies to test names. Cross-app name
   substitution (journal, press, server) is GLOSSARY Part II's job, not this
   rule's. New specs check the glossary before coining and add missing terms
   as part of writing.

**Everything clickable.** Body markers link to register entries, register IDs
link back from the summary table, `<sup>` marks link to their footnotes, and
cross-spec pointers are real links. Anchors are explicit `<a id="…"></a>` on
their own line. Lint checks that every reference resolves both ways.

---

```markdown
---
name: <feature-slug>
status: draft | verified    # verified = the full RUNBOOK loop passed
---

# <Feature name> {OJS OMP OPS}

<!-- Title badge only when an app LACKS the feature; omit when all three have it.
     If badged, follow the Purpose section with a one-paragraph absence note. -->

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

<!-- That one line, verbatim, is the whole on-page legend. The reader has read
     the glossary: its "Reading a spec" section is the legend and its Part II
     is the cross-app word map, so a spec never carries a local legend, a
     "how to read this on a press" note, or any sentence about its own
     conventions. The body is the feature's substance and nothing else. A
     spec that needs a construct the legend does not cover should simplify
     the construct. -->

## Purpose

<!-- One paragraph. Whose job, what job, why it exists. A new product manager
     should get it. -->

## Actors & permissions

<!-- One ROW PER CAPABILITY (View, Create, Edit, Remove…), so a reader can
     compare a capability across roles in one row. Two columns: Action | Who
     may, and when. Cells are plain product language, one bullet per role
     group or condition (`<br>• `), each bullet: actor(s), then condition.
     Open with a short paragraph defining recurring terms (assigned,
     participant…) and site-wide baselines, so the cells stay short.
     The row records what the role is OFFERED and what happens when they use
     it. Where the offer and the outcome disagree (the control is there and
     does nothing, or is refused, or is missing where the role should have
     it), the observed outcome is the headline and the offer carries a ⚠
     marker into the register. Never state a capability the screen does not
     expose.
     One sentence per fact: the cell holds the rule, and the register entry
     holds only the finding, not a retelling of the cell. A cell says WHO and
     WHEN and stops. When the "when" needs a chain of conditions, that chain
     becomes its own numbered rule in Rules & state and the cell cites it
     ("… while the round awaits revisions (Rule 12)"). Footnote marks
     (`<sup>a</sup>`) point at blocks in the Footnotes tail. -->

| Action | Who may, and when |
|--------|--------------------|
| **<Action>** | • <actor(s)>: <condition><br>• <actor(s)>: <condition; ⚠ [A1](#a1) for oddities> <sup>a</sup> |

## Fields & validation

<!-- Fields by on-screen LABEL, not internal attribute names. Validation in
     plain terms. Leave out fields the server sets on its own. Three columns;
     anchors as footnotes. -->

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|

## Rules & state

<!-- The heart: states, invariants, computed behavior, ordering rules.
     Numbered rules. If a rule is really two rules, split it (10a/10b) so
     other sections can cite the half they mean. One sentence, one rule:
     three short sentences beat one 90-word chain. Put the condition first,
     then the consequence. ONE IDEA PER RULE, and a rule past about eight
     lines is split. Inventory (what a screen lists, top to bottom) belongs
     in the Fields tables; a rule says what changes and when, and points at
     the table for the list. Name states and fields as the UI shows them. Lists
     of three or more parallel items get bullets or a compact table, never a
     prose run. Mark as-built oddities with ⚠ and a register link; the
     symptom is stated once here (its home) and repeated mentions elsewhere
     carry the bare marker. -->

## Side effects

<!-- Emails (mailable, recipients, opt-outs), notifications (type, where
     surfaced), log entries, jobs, changes to other entities. One bullet per
     effect. Do not stack five findings in one bullet. -->

## Settings that modify behavior

<!-- The catalogue of what can be configured that changes the rules above:
     site or context settings, config variables, plugin toggles. One bullet
     per setting: its on-screen label in quotes, where it is set (the
     screen path, or the owning feature in italics), the install default,
     and what each end changes, citing the Rule. Facts only, verified like
     any rule: which scenario runs which end is read from the scenarios'
     bold leads, and an end left untested is a Coverage "Left out" item,
     never a sentence here. "None" is a valid section, with a pointer to
     where the feature's gates live. -->

## Cross-feature interactions

<!-- Other specs this one touches, and who owns each shared rule (rule 5
     links). -->

## Canonical scenarios

<!-- Named journeys a QA person can act out on any install. These are the
     units tests map onto: each app's suite implements them (RUNBOOK
     multi-app rules). WHEN: the draft carries this section's preamble and
     no scenarios; they are composed after the claim check from the
     verified body and the Coverage rows (RUNBOOK step 6),
     every sentence a fact the Rules, Fields or Side effects already
     state. ORDER: first the scenarios COMMON to every app that
     has the feature, then the app-specific ones (title the block or badge
     the scenario). A common scenario is written once, app-neutral, and each
     app implements it in its own context (roles, data and vocabulary per
     GLOSSARY Part II), so keep any app-varying step behind an inline marker
     rather than baking one app's nouns into the flow.
     Name actors BY ROLE, never by seeded account.
     WRITE EACH ONE AS A MANUAL TEST SCRIPT: what the tester does and what
     appears on screen, quoting real UI labels. No developer verbs (pins,
     fires, wires), no nouns invisible on screen. A scenario stands alone: a
     reader executes it without a trip back into Rules. Mark a per-app
     divergence inline ([OMP2](#omp2)); a scenario an app cannot run gets its
     analogue or absence noted at the end. Seeding recipes and usernames go
     in the scenario's footnote. PRECONDITIONS ARE GIVENS, NOT STEPS: a
     scratch journal, throwaway accounts, a seeded submission or an email
     in a mailbox are stated as the state the scenario starts from; how the
     test tooling builds that state is the footnote's business, and a
     by-hand recipe for building it (create a journal, invite accounts)
     never enters the body. The flow starts where the feature's screens
     start.
     SPENDING THE TABLE: by the Coverage classes (the Coverage comment,
     "Spending the table"): main and guard rows always, states a user
     meets in ordinary use, variants only inside a scenario already
     there. Depth
     goes INSIDE a scenario, as controls, variants and quoted outcomes,
     never as a second scenario on the same state. A bug path gets a
     scenario only when it is the main path a user takes; otherwise the
     register entry carries it and the scenario that passes by carries
     the ⚠ marker. Every scenario reads the other side's effect after the
     action it performs: the editor's screen after a reviewer's action,
     the affected screen after a settings change.
     SHAPE: the title names the state, on its own line with its badge;
     then a "Given:" line, one clause; then one bullet per screen or case,
     opening with a bold lead that names what the bullet opens (the
     screen, the role, the row's case: "**Nova's row, no account**"), its
     steps in execution order, each typed value named ("type 2 in "Default
     Response Deadline"", never "type a number"), each outcome quoted; the
     last bullet is "**Control**". Read only the bold leads and you know
     what the scenario checks: that is the coverage index, and the
     Coverage section below lists only what the scenarios leave out. An
     action by another actor mid-scenario opens its own bullet naming the
     role.
     Acceptance test: a QA person who has NEVER opened the screen can execute
     the scenario and judge pass or fail. -->

1. **<Scenario name>** {OJS OMP}

   Given: <actor(s)>, <the state the scenario starts from>.

   - **<Screen or case>**: <steps, each typed value named, each outcome
     quoted>.
   - **Control**: <the negative control>. <sup>s1</sup>

## Coverage

<!-- What the suites check and what they leave out, so a reviewer sees
     every decision in one place and can ask for a cut to be reversed.
     The section has two shapes: the DRAFT table below (steps 3 to 5),
     and the FINAL shape the scenario writer turns it into at step 6.
     Only the final shape ships.

     DRAFT TABLE, three runs of rows: the ACTORS (one row per Actors row
     or group of rows), the STATES the Rules name (each state of the
     feature's main object: unanswered, accepted, declined, cancelled,
     moved on…), and the SETTINGS of the section above, one row per
     setting's non-default end. A feature that is itself a settings
     screen lists the screen's own fields, each mapped to where it takes
     effect. A row CITES the body instead of restating it: "moved on to
     Copyediting (Rule 8e)", "assigned Section Editor (Actors row 5)",
     ""Restrict File Access" on (Settings bullet 1)". "Runs in" reads `planned` for a row the
     scenarios should cover, or stays empty with a reason word in "Why
     not" (the five words are under FINAL SHAPE). A row blank in both is
     a gap the lint reports. Every setting listed is driven at both ends
     (RUNBOOK step 5): the base journal keeps the install defaults and the
     other end runs on a scratch context configured through the scenario
     API (scenarios.md "Configuring a scratch context").

     CLASS, one word per row, the author's judgment from the body just
     written; the fold may reclass on evidence:
       main     the job the Purpose paragraph names, once per actor it
                names: the path a user takes on an ordinary day. Test:
                would a user notice the same day if this broke?
       guard    a rule that stops something ("only X can", "is refused",
                "cannot be pressed", "never shows"); a side effect that
                leaves the app or changes another entity (an email and
                who gets it, a notification, a role granted, data kept or
                lost, anything published or paid); an app's absence of the
                feature. Test: if this broke silently, who is hurt, and
                how soon would anyone know?
       state    a further state of the main object with its own screen
                wording; a setting's non-default end when it changes what
                a screen offers. Test: does the screen say or offer
                something different here?
       variant  a second role with the same offer as a covered one; a
                close, cancel or back control; a wording variant; a
                setting end that only re-words a line; a bug path (the
                register carries it). Test: would a test here assert
                anything a covered row does not?

     SPENDING THE TABLE (the scenario writer, step 6): every main and
     guard row first. A guard rides inside the main scenario that
     triggers it (the email is read after the accept, the refusal is
     pressed on the way past) and gets a scenario of its own only when no
     main scenario opens its actor or state. Then state rows. A state a
     scenario passes through, or whose given a scenario already holds,
     rides in it as a bullet (the dashboard's views on the seeded
     journal, walked in one scenario, one bullet each) and costs nothing;
     a state that needs a given of its own (a setting's non-default end,
     a submission in a stage the seed lacks, another signed-in role) gets
     a scenario when an editor, author or reviewer would meet it in an
     ordinary week of running the journal, and goes under "Rarely met"
     otherwise (RUNBOOK "What the scenarios cover"). A variant is covered
     only when it rides inside a scenario already there, and is "Nothing
     new to test" otherwise. A main or guard row is never left out. No
     count and no suite size decide any of this: what matters is always
     covered, and a test that would assert nothing a covered row does not
     is never written.

     FINAL SHAPE: the "Left out" list alone, under this heading, placed
     after the canonical scenarios. What IS checked is the scenarios
     themselves: their bold leads name what each opens, their badges say
     which apps run them, so the section never restates them.
     "Left out": one bullet per reason, only the reasons that apply, in
     this order, each opening with its reason word in bold and ending at
     the colon; the items are indented bullets under it, one per line, so
     a reviewer can point at one:
       - **Planned**:
         - <coverage owed on a shipped spec that was not written on the
           spot, citing the body that states it: behavior an upstream sync
           added, a coverage request, an item a regression pulled
           back, a register entry retired or ruled intended, a bullet a
           suite does not assert yet. The spec's one backlog: the housekeeping
           session spends every item together through RUNBOOK "Revising
           a shipped feature". A spec being written has none.>
       - **Rarely met**:
         - <a state an editor, author or reviewer would not meet in an
           ordinary week, the most likely first; never a main or guard
           row, never a row another feature's scenario drives (that is
           Owned): Rarely met tells the reader that no spec tests it>
       - **Nothing new to test**:
         - <a row a test would assert nothing new about: a role or state
           with the same screen as a covered row, naming the row it
           repeats; a role no screen offers anything; a variant no
           scenario takes (a second role with the same offer, a close,
           cancel or back control, a wording variant, a setting end that
           only re-words a line)>
       - **Register carries it**:
         - <a path a 🐞 or ❓ entry records; never a test (PRINCIPLES M3);
           when the entry retires or is ruled intended, the item becomes
           Planned>
       - **No seed**:
         - <a state the harness cannot build yet; this is the harness
           backlog>
       - **Owned by another feature**:
         - <the item, then the feature in italics, and the scenario number
           once that feature is shipped>
     Each item cites the body (a Rule, an Actors row, a register ID). No
     evidence in this section: a probe date is a footnote. Rarely met and
     Nothing new to test are the bullets a reviewer argues with: an item
     there moves to Planned on request (MAINTENANCE "Coverage requests"),
     and unasked when a regression lands on it, since a regression shows
     it mattered. -->

| Who, state or setting | Class | Runs in | Why not |
|-----------------------|-------|---------|---------|

## Findings register

<!-- The single home for everything as-built that deviates, diverges, or
     needs a product ruling. There is no separate Known-deviations or
     Open-questions section, and no external bug list. Structure:

     Preamble, one sentence: "Verdicts are the author's judgment (claude,
     <date>), unreviewed unless an entry notes otherwise; the team settles
     them on spec review." The sort rule, the verdict and impact words and
     the entry shape are the glossary's ("Reading a spec"); the preamble
     repeats none of them.

     Summary table, the triage view, sorted 🐞 → ❓ → ✅, mirroring the
     entries (the entries are the source):

     | ID | Finding (one line, symptom) | Bug? | Impact | Review |

     Badges and Impact words: the glossary's. Review: "—" until someone reviews, then `<name> <date>` with an
     optional ` · <disposition>` (`Jarda 2026-08-25`, `Jarda 2026-08-25 ·
     to triage`, `@beaug 2026-08-29 · risk accepted`); the cell is a mirror
     of the entry's Reviewed blockquote, never the only record. An author
     re-check (claim check, re-probe, rebase check) may also fill the cell,
     as `<check> (claude), <date> — <outcome>`.

     Entries under `### All apps` / `### OMP` / `### OPS`. IDs are LOCAL and
     DENSE (A1, A2… / OMP1… / OPS1…), no gaps, no foreign keys. Anchor each:
     `<a id="a1"></a>`. Body markers: `⚠ [A1](#a1)` when the entry is 🐞 or ❓,
     plain `[OMP2](#omp2)` for ✅ intended divergences.

     Entry anatomy (5–8 lines):
     **A1 — <short title>** · 🐞 · user-visible[ · crash: server | script | both].
     <Symptom, 1–3 sentences: present tense, the user as subject, expected
     versus observed. State it at the weight it earns (rule 4).>
     <For ❓ only> Question: <the one sentence the team answers>. Lean: <the
     author's lean and why, one sentence>.
     Since: <date (age)> · Basis: probe | commit | judgment. <sup>f-a1</sup>

     > **Reviewed — <name>, <date>**: confirmed 🐞 | overturned (was 🐞) |
     > ❓ stands | ✅ intended (was ❓). Ruling: <the decision, and any
     > adjustment it sets>.

     MAINTAINER VERDICTS. A human's verdict on an entry (spec review, a
     Mattermost reply, a PR comment) is ALWAYS the blockquote above: a blank
     line after the Basis line (the footnote mark stays on the Basis line),
     then `> **Reviewed — <name>, <date>**:` in bold, the verdict first,
     then `Ruling:` with the decision and anything it sets (fix, disposition,
     ticket, risk accepted). Name the person (the name they sign with, or
     their Mattermost handle), never "maintainer ruling". Never an inline
     `Reviewed:` line in the entry body. Only when it happens; never
     pre-printed. Mirror the name and date in the summary table's Review
     column. U01's register is the reference rendering.
     An author re-check that changes a verdict is a plain `Re-checked:
     <check> (claude), <date> — <outcome>` line; "Reviewed" is reserved
     for a human.

     ISSUE REPORTS. A 🐞 entry written up in `docs/issues/` carries the
     report's severity (critical / high / medium / low) in place of the
     impact word, and, when it is the report's whole subject, the report's
     title and Summary as its title and symptom (MAINTENANCE "The issues
     session", step 7); the report is the source and the entry follows it.

     CRASHES. When the drive saw the app fail behind the finding (a request
     answering a server error, the page's script failing: the digest block's
     `Crash:` line, the probe kit's run record), the head carries the crash
     word after the impact, the summary row repeats it in its Impact cell
     ("user-visible · crash: server"), and the symptom says in screen words
     that the app failed, not merely declined. The status code and the
     server-log line stay in the footnote (rule 1).

     `Since:` only when dated (omit the line otherwise). One sentence of
     rationale for a 🐞-versus-✅ call is welcome ("worked for OPS's whole
     life; broke in the 2025 stage removal — regression, not choice"); the
     commit archaeology goes in the footnote. A finding another feature owns
     gets one line plus a link to that spec, with the full entry there.

     RETIRED ENTRIES. When a defect is fixed upstream or a verdict is
     overturned, the entry moves to a `### Retired` block at the end of
     the register as ONE line, anchor and ID kept (IDs stay dense), badge
     ✅, impact "retired", one clause saying why and when, the footnote
     mark kept:
     <a id="a5"></a>
     **A5 — <short title>** · ✅ · retired. Fixed upstream (pkp/pkp-lib#NNNN),
     2026-08-25. <sup>f-a5</sup>
     Its summary row stays (sorted with the ✅ rows); its body markers are
     removed, and lint does not require one for a Retired entry. -->

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<!-- ALL `<sup>` blocks from every section above, in section order, each
     anchored (`<a id="fn-a1"></a>`) so the marks link down. Code symbols,
     probe dates, seeded accounts, commit archaeology: the developer's layer.
     A reader can ignore this section entirely and lose no behavior. -->

## Reference — entry points & surfaces

<!-- Where the feature is reached: UI paths, API endpoints, CLI, email links.
     One row per entry point with its atlas atom ID. -->

| Entry | Path | Atom |
|-------|------|------|

## Reference — code anchors

<!-- The files the feature lives in (handlers, services, forms, templates,
     ui-library components), one bullet per layer. The sync loop greps the
     specs for the class and file names an upstream diff touches. -->
```
