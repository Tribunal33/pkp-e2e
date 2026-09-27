# Glossary

The vocabulary of the specs, in two parts. **Part I** says what the terms
mean, so a QA or product person can read any spec without a developer. It is
written in OJS words. Where OMP or OPS use a different name for the same
thing, the entry says "cross-app names: Part II" instead of repeating the
mapping. **Part II** is the cross-app term map and the capability names the
shared tests use. Specs follow TEMPLATE rule 7 (`docs/process/TEMPLATE.md`):
on-screen names win, the first use of a coined term carries a short
explanation or a pointer here, and authors add missing terms as part of
writing. **Settled usage** entries record which of two competing words the
specs use from now on. Shipped specs are brought in line when they are next
touched.

---

# Part I — What terms mean

## The world

- **Site vs journal (context)** — one install hosts many *journals* plus
  site-level surfaces (site login, Administration, Site Settings, Hosted
  Journals). "Context" is the generic word for the journal-like unit.
  Cross-app names: Part II (press, preprint server).
- **Section** — a journal's content grouping (e.g. Articles, Reviews); a
  section can set its own policies (abstract required, word limits, a default
  review form). Cross-app names: Part II (series; OPS has one
  "Preprints" section).
- **Category** — a topic a journal offers its published work under,
  across its sections: optional, arranged as a tree (top-level categories
  with sub-categories to any depth; screens say "sub-categories" and, on
  the reader's page, "Subcategories"), each with its own public page. An
  article sits in exactly one section and in any number of categories.
  Same word in all three apps.
- **Issue** — a journal's published collection (volume/number/year); OJS
  only. Cross-app names: Part II (absence is not a synonym — OMP/OPS
  have no issues; OMP's counterpart concept is the catalog).
- **Submission** — the manuscript-plus-metadata object moving through the
  workflow; OJS voice also says "article". Cross-app names: Part II
  (monograph, preprint).
- **Publication (object)** — the publishable face of a submission: title &
  abstract, contributors, galleys, scheduling. A submission carries one or
  more publications (versions); publishing acts on a publication. Its status
  can be **published** or **scheduled** (assigned to a future issue —
  scheduled counts as published for automatic follow-ups such as ORCID
  deposits).
- **Galley** — a publication's reader-facing file rendition (e.g. the PDF).
  Cross-app names: Part II (publication format).
- **Contributor** — a person on the submission's author list (the
  Contributors list). Distinct from the **Author role** — the account that
  submitted and follows the submission; a contributor need not have an
  account at all.
- **Primary contact (contributor)** — the one contributor on a publication's
  Contributors list that editorial correspondence about the work is addressed
  to (the list's "Primary Contact" badge; the submitting author's record
  arrives holding it). Distinct from the journal's **principal contact**
  ("Invitations, accounts, ORCID" below) — the configured identity system
  emails are sent from.
<a id="harvesting"></a>
- **Harvesting (OAI-PMH)** — the standard interface through which indexing
  services, library catalogues and aggregators (*harvesters*) collect a
  journal's metadata: a *request* (one of six, such as "Identify" or
  "ListRecords") sent to the journal's OAI address, answered with XML that
  a browser shows as a page headed "OAI 2.0 Request Results". A *record*
  describes one published item in one *metadata format* (Dublin Core,
  MARC, JATS); a *set* is a group of records a harvester can ask for alone
  (the journal, one section); a *deleted record* is the header left behind
  when an item stops being published. The OAI-PMH spec owns the rules.

## Roles and access

- **Role** — a named group membership in a journal (Journal Manager, Section
  Editor, Reviewer, Author, Reader…). The app's Roles settings screen is the
  source of names; specs always use the concrete on-screen name, never
  umbrellas like "editorial staff". Role LEVELS (manager / editor /
  assistant / reader) group roles by capability; "assistant-level" covers
  the default assistant groups (OJS: Copyeditor, Designer, Funding
  Coordinator, Indexer, Layout Editor, Marketing and Sales Coordinator,
  Proofreader, Editorial Board Member) — panels but never decision buttons.
- **Site Administrator** — the install-wide admin: Administration area, site
  settings, impersonation. Takes part in a journal's workflow only through a
  journal role.
- **Guest Editor** — an editorial role assignable per submission, alongside
  Section Editor; can be deciding or recommending like any assigned editor.
- **Assigned (to the stage)** — listed on that stage's Participants panel;
  the precondition for Section Editors, Guest Editors and assistants to act
  on a submission.
- **Deciding editor** — a Journal Manager or Editor, an assigned Production
  editor (a manager-level role), or an assigned Section or Guest Editor whose
  participation is NOT limited to recommendations; the set that gets real
  decision buttons. **Settled usage**: specs say
  "deciding editor" / "recommending editor"; the collective "review
  managers" is retired.
- **Recommending editor (recommend-only)** — an assigned editor whose
  participation IS limited to recommendations (a per-assignment flag set in
  Stage participants): records a recommendation instead of a decision, and
  only while a deciding editor is also assigned.
- **Impersonation (Login As)** — continuing the browser session AS another
  user; total while it lasts (every action attributed to the target), exited
  via "Logout as {username}". **Settled usage**: "impersonation" is the
  concept, "Login As" the on-screen control.
- **Access-denied page** — what a signed-in user gets on a screen their role
  does not allow ("The current role does not have access to this
  operation."); signed out, the same address shows Login instead.

## Workflow

- **Draft (incomplete submission)** — a submission started in the wizard
  and not yet submitted; it is the author's alone until the final "Submit".
- **Stage** — one of the workflow's fixed stops: Submission → Review →
  Copyediting → Production (OJS), plus Done once a version of record is
  published. Fixed per app, not configurable. Cross-app: Part II (OMP adds
  Internal Review; OPS has Production only). The **active stage** is where
  the submission currently sits; decision buttons render only there.
- **Done** — the resting place a submission enters by itself when a version
  of record is published: the stage bubble reads "Published", no stage
  entry is striped, and the log records the move. It is left by hand with
  the header's "Return to Workflow" (back to the stage it was published
  from; "Return to Done" reverses that) or automatically when the last
  published version is unpublished. The workflow-screen spec owns the
  rules.
- **Workflow screen** — the per-submission editorial screen with its stage
  navigation; ONE shared surface for every role including the Author (role
  determines what is offered, never a separate screen). The author's reduced
  presentation of it is called the **author view** in specs.
- **Dashboard / My Submissions** — the editorial submission lists vs the
  author's own list. **Settled usage**: "Dashboard" = the editorial landing;
  authors land on "My Submissions"; "reviewer dashboard" names the
  reviewer's assignment list.
- **Decision** — a recorded editorial move that changes stage or status,
  taken through the decision wizard: Send for Review, Accept and Skip
  Review, Decline Submission, Revert Decline (Submission stage); Request
  Revisions, Accept Submission, Create New Review Round, Cancel Review
  Round, Decline (Review); Send To Production; Post the preprint (OPS).
  Specs quote the exact button label. **Queued** = the submission status
  "still awaiting a decision at this stage".
- **Declined (submission)** — the status set by Decline Submission: the
  submission stays on its stage, the label reads "Declined", buttons flip to
  **Revert Decline** (+ Delete for managers), and it lists only under the
  dashboard's Declined view.
- **Submission intake configuration** — the specs' name (no screen uses
  it) for what a journal sets up on Settings › Workflow › "Submission" to
  shape incoming work: whether it accepts submissions at all ("Disable
  Submissions"), the texts authors read before and while submitting and
  the copyright notice they accept ("Author Guidance"), which descriptive
  fields the journal uses and the wizard asks for ("Metadata"), and the
  components authors label their files with ("Components"); on a preprint
  server also any "Author Screening" rules a plugin supplies. Its spec
  also owns the reader's About › "Submissions" page.
- **Component** — one of a journal's kinds of submission file ("Article
  Text", "Data Set", "Image"…), kept in the list on Settings › Workflow ›
  "Submission" › "Components"; every uploaded file is labelled with one,
  and a component can be required for every submission. Cross-app names:
  Part II (the default main component).
- **Desk review** — informal name for pre-review screening on the Submission
  stage (the panel heading reads "Desk Review Tasks & Discussions"). What QA
  folk call "desk reject" is, on screen, Decline Submission while queued.

## Review

- **Review round** — the numbered container (from 1) for one pass of peer
  review: its reviewers, its files under review, its revisions, its status.
  Round 1 opens on Send for Review; later rounds only via Create New Review
  Round; rounds are never renumbered. The **current round** is the
  highest-numbered one — only it moves; past rounds stay visible.
- **Round status** — the recomputed one-sentence state box at the top of the
  review stage ("Round {N} Status"); the review-stage spec owns the sentence
  roster and precedence.
- **Review assignment** — one reviewer's engagement on one round: a row in
  the **Reviewers panel** with its own review type, dates, files, status and
  history. **Settled usage**: "Reviewers panel" (not "Reviewers table").
- **Reviewer statuses** — the row vocabulary: Request Sent, Request
  Accepted, Overdue, Request Declined, Request Resent, Review Submitted,
  Review Viewed, Complete, Reviewer Thanked, Request Cancelled.
- **Review type** — per assignment: Anonymous Reviewer/Anonymous Author,
  Anonymous Reviewer/Disclosed Author, or Open. Gates the author's access to
  the finished review — only open, completed reviews are ever listed for the
  author.
- **Review form / Free Form Review** — a structured questionnaire an
  assignment may carry (default "Free Form Review" = none); parts are marked
  for authors vs editors; changeable only until the review is submitted.
- **Files for Review / revisions** — the per-round file sets: what reviewers
  of that round are given, and what the author uploads in answer to Request
  Revisions ("Revisions Uploaded" panel; the wizard's new-round path is
  named "Resubmit for Review").
- **Reviewer pool** — the users holding a reviewer role for the stage,
  searchable in Add Reviewer (per-stage on OMP: Internal vs External).
- **Recommendation** — two senses, same screen, kept distinct in specs: the
  **reviewer's recommendation** (part of a completed review on a journal;
  shown in the row and Read Review) and an **editor's recommendation** (what
  a recommending editor records instead of a decision; shown to deciding
  editors in the Recommendation box).
- **Confirming a review** — the editor's "Mark as Complete" press in Read
  Review (the dialog asks "Mark this review as complete?"): row →
  Complete, reviewer's task cleared. **Thank Reviewer** acknowledges it
  (row → Reviewer Thanked); **Revert Decision** ("Unconsider this Review")
  steps a Complete/Thanked row back.
- **Unassign vs Cancel (reviewer)** — before any response: Unassign
  Reviewer, row deleted. After a response: Cancel Reviewer, row kept as
  Request Cancelled and **Reinstate Reviewer** can restore it. **Resend
  Review Request** asks a declined reviewer to reconsider with fresh dates.
- **Log Response** — recording a reviewer's accept/decline on their behalf
  when they answered by email.
- **One-click access** — a journal setting adding a sign-in-free keyed
  review link to request/reminder emails; each reminder mints a fresh link.
- **Editorial Notes** — notes editors keep about a reviewer as a person (one
  shared text across all submissions, shown in reviewer search; never shown
  to the reviewer).

## Invitations, accounts, ORCID

- **Invitation (role invitation)** — a manager's emailed offer of one or
  more journal roles (start date, optional end, masthead visibility);
  accepted (creating/linking an account) or declined via personal links.
  States: draft (being composed) → pending → accepted / declined /
  cancelled. There is no "expired" STATE — a pending invitation past its
  deadline simply stops working (the landing page's word "expired" is a
  deadline check, not a status) and is purged. **Distinct from a review
  request**, which specs also call an "invitation" in email subjects — the
  Add Reviewer flow, not "Invite to a role".
- **Invitation Unavailable page** — the shared front door for every emailed
  personal link that no longer works ("This invitation is no longer
  available…"): answered/cancelled/expired role invitations, stale reviewer
  one-click links, used registration-validation links.
- **Masthead** — the journal's public listing of team members per role; each
  invited role row carries "Appear on the masthead" / "Does not appear";
  reviewers always appear.
- **Disabled account** — refused at sign-in ("Your account has been
  disabled…", optionally with a recorded reason); a disabled user also
  cannot be invited to a role.
- **Register page: journal-level vs site-level** — a journal's own
  "Register" page (its address carries the journal's path) registers with
  that journal and hands out its Reader role; the site-level page, reached
  from the site homepage that lists the journals, offers a choice of
  journals and roles instead. The registration spec owns both.
- **Account validation (email validation)** — the optional, install-wide
  requirement that a new account prove its email address before it works:
  the account starts disabled, a "Validate Your Account" email carries an
  activation link, and pressing "Activate Account" on the linked page opens
  the account. **Settled usage**: "activation link" for the emailed link,
  "validation" for the requirement.
- **Principal contact** — the journal's configured contact identity that
  the journal's own emails (such as automatic reminders) are sent from;
  password resets come from the site, not from it. Distinct from a publication's **primary contact (contributor)** —
  the badge on its Contributors list ("The world" above).
- **ORCID iD: verified vs unauthenticated** — *verified* means the person
  completed ORCID's own sign-in for this install, so the iD carries an
  access token (solid icon); an iD merely typed or imported is
  *unauthenticated* (hollow icon, "(unauthenticated)" suffix). **Settled
  usage**: verified/unauthenticated (not "authenticated").
- **ORCID deposit** — the background write of a published article to each
  verified contributor's ORCID record (member API only), or of a completed
  review to the reviewer's record ("Send Review To ORCID", OJS).

## Screen furniture

- **Header, editorial header, side menu** — the *header* (public header)
  tops every reader-facing page of a journal or of the site: the logo or
  name, the primary navigation menu, "Search", and at the top right the
  user menu ("Login" and "Register", or the signed-in username with
  "Dashboard", "View Profile", "Logout" under it). The *editorial header*
  is the dark bar across the editorial screens (the Dashboard, Settings,
  a workflow): the journals switcher, the journal's name, the help icon,
  the Tasks bell and the initials button of the user's menu; windows that
  open from the right repeat its right-hand part. The *side menu* is the
  menu down the left of the editorial screens ("Editor Dashboard",
  "Settings", "Statistics"…; some specs say "backend sidebar"), distinct
  from the public pages' *sidebar* of blocks. The navigation-menus spec
  owns the three frames; each entry's own feature owns the page it opens.
- **Participants panel** — the per-stage list of assigned users; assignment
  and the recommend-only flag live in its Stage-participants forms.
- **Tasks (header panel)** — the per-user to-do list opened from the site
  header ("Review pending.", "Revision required."…), cleared by the
  corresponding action. Not to be confused with the Submission-stage
  discussions panel headed "Desk Review Tasks & Discussions".
- **Discussions panel; discussion vs task** — the per-stage panel headed
  "{Stage} Tasks & Discussions" ("Desk Review Tasks & Discussions" on the
  Submission stage). A **discussion** is a named thread of messages among
  the people ticked as its participants; a **task** is a discussion that
  also has a due date and one participant responsible for it (its "Task
  Owner"), and is started and completed. Distinct from the header's Tasks
  panel above, where each message also lands. The tasks-and-discussions
  spec owns the panel and its templates.
- **Libraries (Publisher Library, Submission Library)** — the stores for
  documents that are not the scholarly work (forms, agreements, marketing
  material, reports). The **Publisher Library** belongs to the journal
  (Settings › Workflow › "Publisher Library"; cross-app names: Part II);
  each submission has its own **Submission Library**, the window the
  workflow header's "Library" opens. Library files are not submission
  files. The libraries spec owns both.
- **Email, email template** — an *email* is one kind of message the
  journal sends ("Review Request", "Submission Confirmation"), a row of
  Settings › Workflow › Emails › "Manage Emails"; its *templates* are the
  saved texts (name, subject, body with "{$…}" placeholders) it can be
  sent with, one of them its default. Some emails take several templates
  that a sender picks from, the rest one. The Emails management spec owns
  both screens; each email's sending belongs to the feature that sends it.
- **Notifications (author's list)** — on the author's review stage, the list
  of emails editors sent about this submission (decision emails re-read
  here). Distinct from toast notices and from the header Tasks panel; specs
  name the surface. **Settled usage**: decision communications are "decision
  emails" (not "letters").
- **Activity log** — the submission's permanent record of editorial events
  (assignments, decisions, reminders); "logged" in specs means a row lands
  here.
- **Submission wizard** — the author's multi-step submission flow; its
  Contributors step hosts the author-side ORCID request.
- **Comments page** — the manager's moderation list for public comments,
  reached from the editorial side menu's Content › Comments (address
  `management/settings/userComments`): tabs "All", "Approved",
  "Hidden/Needs Approval", "Reported", a "…" menu per row, and the comment
  and report panels. Distinct from the "Comments" tab of Settings › Website
  › Content, which holds the switch "Enable Public Comments". **Settled
  usage**: "the Comments page" for the moderation list, "public comments"
  for the feature; the reader-side block is "the comments block" on the
  landing page.

## The test install (used in Canonical scenarios)

- **Seeded** — fixture data present on the test install before any test
  runs: the base journal, the account roster, sections, issues.
- **Roster** — the seeded accounts (one per permission archetype, usernames
  like `editor.diana`); shared and never mutated by tests.
- **Scratch** — a throwaway journal/submission/user created for one test and
  owned by it.
- **Ready account / throwaway account** — a roster account a scenario signs
  in with, versus a scratch user created for that scenario.
- **Mail catcher** — the test install's outgoing-mail trap; "the email
  arrives" in a scenario means it lands there.

<a id="reading-a-spec"></a>
## Reading a spec

The long form of the legend. Each spec's Conventions line carries the three symbols a tester needs to judge pass or fail (⚠, app badges, superscript evidence marks) and links here for the rest.

- **The block of codes above the title** is a machine-readable index for the
  documentation tooling. Ignore it when reading.
- **A claim with no app marker** holds in every app that has the surface, and
  has been verified there. The absence of a marker is itself a claim, never
  "not checked yet".
- **Badge.** `{OJS OMP}` on a title or a scenario says which apps have the
  surface. A missing app gets a one-paragraph absence note near the top. A
  register entry whose ID starts with OMP or OPS concerns only the app it
  names, and a marker inside a badged claim may report what the apps
  outside the badge wrongly show.
- **Markers.** `⚠ [A1](#a1)` in the body means "the app deviates here from
  what you would expect". It links to the Findings-register entry. A plain
  `[OMP2](#omp2)` without ⚠ links to an intended difference between apps.
  After the first mention, repeats carry the bare marker.
- **Basis** (the last line of a register entry) names the kind of evidence
  behind the finding: *probe* = seen on a running install; *commit* =
  traced in the app's change history; *code* = read from the app's code
  and not seen running; *judgment* = the author's reading of the app, not
  yet seen running. A **Since** date before it, on a dated entry, is the day
  the behavior began (the day of the app change that brought it); the Basis
  date is the day it was seen.
- **Findings register.** The spec's single home for everything that deviates
  or needs a decision: 🐞 a defect (the author's call) · ❓ needs a product
  ruling · ✅ an intended difference. **Impact** is one plain word
  (user-visible / minor / invisible / latent). A finding in which the app
  itself fails carries a **crash** word after the impact: *crash: server*
  when a request behind the action answers a server error, *crash: script*
  when the page's own code fails in the browser, *crash: both* for both;
  the symptom says so in screen words, so a tester can tell the app
  breaking from the app declining. A ✅ entry whose impact
  reads *retired* is a former 🐞 or ❓ that was fixed upstream or
  overturned; its one line says why and when, and any verdict quoted
  under it is the record of the earlier ruling.
- **Coverage.** The canonical scenarios are what the automated suites
  check: a scenario's bold leads name what it opens, its badge which apps
  run it. The Coverage section lists what they leave out and why: a
  **Budget** item is a cut the team can ask to reverse; the other reasons
  (nothing new to test, a register entry records it, no way to seed the
  state yet, another feature owns it) are not cuts.
- **Placeholders.** A lowercase phrase in braces, {email} for one, stands for
  the value the screen fills in.
- **Footnote marks** (`<sup>a</sup>`) point to evidence: code anchors, probe
  dates, seeded accounts. The body never depends on them. Skip the footnotes
  and you lose no behavior.
- **Everything is clickable.** Markers, footnote marks and cross-spec pointers
  are real links, checked both ways by the lint gate.
---

# Part II — Cross-app term map & capability names

**Contract.** This part is the single home for multi-app vocabulary. Specs
are always written in OJS terms. When reading a spec for OMP or OPS,
substitute using the tables below. No spec repeats these tables or inlines a
translation such as "journal (press in OMP)". On-screen names win: every cell
is the name the app's UI shows, and a probe that contradicts a cell fixes the
cell. One definition per term. Term meanings are in Part I.

**Two sections, two different questions.** Section 1 answers "what does this
OJS word become in OMP or OPS?" and governs the scope of a spec: a renamed
concept is the same feature, covered by the same spec. Section 2 answers
"may a shared-layer test run on this app?" and governs test gating only. The
two can legitimately disagree about the same noun. OMP series ARE sections
for spec purposes (the shared `PKPSection` machinery relabeled, so one
Sections spec covers them by substitution), while `hasSections` is ✗ for OMP,
so a shared-layer test written against OJS sections skips there and OMP's
series coverage comes from its own suite. Read each section for its own
question and no cell conflicts.

**Absence is not a synonym.** A "—" cell means the concept does not exist in
that app. Any rule or scenario built on a "—" term is absent there even
without a badge. The spec still carries the badge: the dash is the reader's
safety net, the badge is the contract. Where an app has a *counterpart
feature* instead (issues → catalog), the dash says so, but the counterpart
is a different feature with its own spec, never a substitution.

Terms not in this file mean the same thing in all three apps.

## 1. Vocabulary map

### Context and content nouns

| OJS term (as written in specs) | OMP | OPS |
|---|---|---|
| journal | press | preprint server |
| article / submission | monograph (work types on screen: Monograph, Edited Volume) | preprint |
| section | series (optional; categories carry more weight) | section (unchanged; seed section "Preprints") |
| issue | — no issues. Counterpart feature: catalog (New Releases / Featured) | — no issues; continuous posting |
| issue assignment | — counterpart feature: catalog entry | — |
| galley | publication format (+ ONIX metadata) | galley (unchanged) |
| Archive (back issues) | — no back-issue archive. Counterpart feature: Catalog browse (own OMP spec; maintainer scope extension 2026-07-27) | Preprints archive listing |
| Hosted Journals (site admin) | Hosted Presses | Hosted Servers |
| Publisher Library (Settings › Workflow tab) | Press Library | Preprint Server Library |

### Roles (default user-group names)

| OJS | OMP | OPS |
|---|---|---|
| Journal Manager | Press Manager | Preprint Server Manager |
| Editor | Press Editor | — no editor group |
| Section Editor (sub-editor slot) | Series Editor | Moderator |
| Reviewer | Reviewer (split: Internal Reviewer / External Reviewer) | — no reviewer group |
| Copyeditor | Copyeditor | — not seeded; no copyediting stage |
| Layout Editor | Layout Editor (+ Designer) | — |
| Translator (journal user group) | Volume Editor, Chapter Author, Translator (chapter roles — OMP's Translator is a chapter role, distinct from OJS's group of the same name) | — |

*Note*: OPS "Moderator" fills the Section-editor slot, not the Editor slot —
confirmed in live OPS Moderator sessions, 2026-07-26.

### Workflow stages and decisions

| OJS | OMP | OPS |
|---|---|---|
| stages: Submission → Review → Copyediting → Production | Submission → **Internal Review** → External Review → Copyediting → Production | **Production only** (single stage) |
| Review (the stage) | External Review (Internal Review is a distinct, OMP-unique stage) | — |
| Copyediting | Copyediting | — |
| Send for Review (decision; label live-confirmed 2026-07-27) | Send to External Review (same label from Submission [skips internal] and from Internal Review; plus Send to Internal Review, Accept and Skip Review, internal recommend-only variants) | — decisions are Decline / Revert Decline only |
| Publish | Publish to Catalog (approved proof) | **Post the preprint** |
| Schedule for publication (issue) | — catalog entry instead | — posts continuously; moderation-before-posting is a context setting |

### Payments and access

| OJS | OMP | OPS |
|---|---|---|
| subscriptions | — | — |
| payments (APC / subscription) | direct sales of publication formats (different feature, shared paymethod plugins only) | — no payments code at all |

### Seed-data names (test fixtures)

| OJS | OMP | OPS |
|---|---|---|
| context "Journal of Public Knowledge" (path `publicknowledge`) | "Public Knowledge Press" (same path) | "Public Knowledge Preprint Server" (same path) |
| default genre "Article Text" | "Book Manuscript" | "Preprint Text" |
| seeded sections ART / REV | series (seeded separately); no default section | one section "Preprints" |

## 2. Capability names (`app.context.js` — canonical, verbatim)

These flags serve the SHARED `shared/playwright/` layer (base fixtures, POMs,
bootstrap/smoke specs), which gates on capabilities, never app names
(`if (!ctx.hasReviewStage)`, never `if (app === 'ops')`). Per-app suites don't
need them — a suite living in an app's own tree names that app's roles, stages
and data directly. The names below are the canonical spelling; `app.context.js`
in each app's tree (`apps/<app>/playwright/support/`) must use them verbatim.

| Capability | Gates | OJS | OMP | OPS |
|---|---|:-:|:-:|:-:|
| `hasReviewStage` | any review stage exists: the whole review cluster (send-to-review, reviewers, rounds, forms, anonymity, recommend-only) | ✓ | ✓ | ✗ |
| `hasInternalReview` | the OMP-unique Internal Review stage: internal decision roster, internal/external `reviewRounds` seeding, internal-stage companions | ✗ | ✓ | ✗ |
| `hasCopyediting` | the Copyediting stage and its participants/files | ✓ | ✓ | ✗ |
| `hasProduction` | the Production stage (all apps; kept for completeness) | ✓ | ✓ | ✓ |
| `hasIssues` | issues, issue assignment, back-issue archive/TOC | ✓ | ✗ | ✗ |
| `hasGalleys` | galley representation model (OMP uses publication formats instead) | ✓ | ✗ | ✓ |
| `hasSubscriptions` | subscriptions management and subscription access | ✓ | ✗ | ✗ |
| `hasSections` | sections as the content grouping (OMP uses optional series) | ✓ | ✗ | ✓ |
| `hasReviewerRoles` | reviewer user groups exist / can be seeded | ✓ | ✓ | ✗ |

## 3. Spec badge → which suites implement

Spec badges are reader-facing and name apps. Under per-app suites the
translation is direct: a scenario badged `{OJS OMP}` is implemented in the OJS
and OMP suites and simply absent from OPS's — plus one absence test where the
spec calls for it (PRINCIPLES M4). Only the shared
`shared/playwright/` layer translates badges to capability gates, via this table:

| Spec marking (typical) | Shared-layer gate |
|---|---|
| `{OJS OMP}` on a review rule / "OPS: hidden (no review stage)" | `test.skip(!ctx.hasReviewStage, …)` |
| OMP variation "applies to Internal Review too" / internal-stage scenario | OMP companion gated on `ctx.hasInternalReview` |
| `{OJS OMP}` on a copyediting item | `test.skip(!ctx.hasCopyediting, …)` |
| `{OJS}` on an issue rule / "no issues" | `test.skip(!ctx.hasIssues, …)` |
| `{OJS OPS}` on a galley item (OMP: publication formats) | `test.skip(!ctx.hasGalleys, …)` |
| `{OJS}` on a subscriptions item | `test.skip(!ctx.hasSubscriptions, …)` |
| `{OJS OPS}` on a section-grouping item | `test.skip(!ctx.hasSections, …)` |
| reviewer-persona steps ("as reviewer.julia…") | `test.skip(!ctx.hasReviewerRoles, …)` |

Vocabulary deltas (§1) never gate anything: labels and payload nouns come from
`appContext.vocab` / `appContext.seed`, so a shared test runs unchanged wherever
the capability holds.

The relationship between section 1 (spec scope) and section 2 (shared-test
gating) is defined in this part's header. The probe evidence behind it
(`.reports/phase0-feature-map/probe-omp-series.md`) was removed from the tip
and is reachable in git history.
