# Issues queue

The specs the issues session works next (MAINTENANCE "The issues
session"), top first. The order puts the likely-severe first: the count
of 🐞 entries with a crash word, then those marked user-visible, then all
🐞 entries, as the registers stood when the queue was made. A spec leaves
the queue when every 🐞 entry has an outcome; a spec left mid-way names
its open entries in the Note. A spec gains a row again when a new 🐞
entry lands in it (MAINTENANCE "The issues session").

A session takes a row by marking its Note "**Taken: issues session,
<VM or workstation> s<n>, <date>**" and pushing before any other work
(MAINTENANCE issues session step 4); a row so marked is not free. The
VM marks also count the VM's issues sessions: at most two run at once,
and the hourly routine starts one only when none is running
(MAINTENANCE "The issues session").

| Spec | 🐞 | crash | user-visible | Note |
|---|---|---|---|---|
| [U45](../specs/U45-dois.md) | 26 | 7 | 1 | A24, OJS4, OMP4: new from the housekeeping claim check of 2026-10-05, no report yet; A15 extended to "Deposit All" (its report wants a re-sync) (housekeeping 2026-10-05) |
| [U69](../specs/U69-monograph-landing-page.md) | 20 | 6 | 1 | A24, A25: new from the housekeeping claim check of 2026-10-05, no report yet; A19 (pkp-e2e#286) widened to a new version's preview and A4 (pkp-e2e#209) to the saved "Date Published": both reports want a re-sync (housekeeping 2026-10-05) |
| [U19](../specs/U19-oai-pmh.md) | 28 | 5 | 2 | OMP8 and OPS5 join the U15 OMP3/OPS4 report (pkp-e2e#709): its "Tracked in" list (housekeeping 2026-10-05) |
| [U21](../specs/U21-submission-wizard.md) | 19 | 5 | 0 | A21: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U37](../specs/U37-tasks-and-discussions.md) | 24 | 3 | 2 | A1: open report docs/reports/2026-09-04-omp-ops-discussion-save-missing-notification-class.md (the rest of U37 written up by the issues session, VM s1, 2026-10-02; A24 not reproduced, its incidentals.md row of 2026-10-02 awaits the housekeeping fold, which retires the entry); A32, A33, A34: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05); A36: new from the housekeeping claim check of 2026-10-05, no report yet; A24 retired (housekeeping 2026-10-05) |
| [U31](../specs/U31-reviewer-suggestions.md) | 9 | 3 | 2 | A12: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U15](../specs/U15-search.md) | 15 | 3 | 1 | A17: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U27](../specs/U27-reviewer-assignment-and-management.md) | 28 | 2 | 3 | A44: new from the housekeeping fold of 2026-10-05, no report yet; A43 joins the U09-A19 report: its "Tracked in" list (housekeeping 2026-10-05); A45, A46, A47: new from the housekeeping claim check of 2026-10-05, no report yet; A8 retired (housekeeping 2026-10-05) |
| [U17](../specs/U17-sections.md) | 17 | 2 | 2 | OMP9, OPS6: open reports docs/reports/2026-09-25-omp-series-page-blank.md and docs/reports/2026-09-25-ops-oai-empty-abstract.md (the rest of U17 written up by the issues session, workstation s0, 2026-10-02); OPS7 joins the U63-A24 report (pkp-e2e#919): its "Tracked in" list (housekeeping 2026-10-05) |
| [U18](../specs/U18-web-feeds.md) | 6 | 2 | 2 | A1, A7, OPS1: open reports docs/reports/2026-09-26-webfeed-rss2-empty-feed-fails.md, docs/reports/2026-09-26-webfeed-terms-read-array.md and docs/reports/2026-09-26-webfeed-ops-publisher-array.md (the rest of U18 written up by the issues session, workstation s0, 2026-10-02) |
| [U16](../specs/U16-categories.md) | 23 | 2 | 1 | OMP5: open report docs/reports/2026-09-30-php-gh20469-segfaults.md (the rest of U16 written up by the issues session, VM s0, 2026-10-02); A22: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U44](../specs/U44-identifiers.md) | 20 | 2 | 0 | A15: new from the housekeeping fold of 2026-10-05, no report yet; OMP7 joins pkp-e2e#576: its "Tracked in" list (housekeeping 2026-10-05) |
| [U36](../specs/U36-submission-files.md) | 19 | 2 | 0 | A23, A24: open report docs/reports/2026-09-27-pkp-lib-13288.md (the rest of U36 written up by the issues session, workstation s0, 2026-10-02); A27: new from the housekeeping fold of 2026-10-05, no report yet; A26 joins the U63-A6 report: its "Tracked in" list (housekeeping 2026-10-05) |
| [U74](../specs/U74-onix-metadata-export.md) | 18 | 2 | 0 | A18 only, a re-sync: its filed report docs/issues/U74-A18-unsaved-format-states-no-returns-condition.md (line 128) and its GitHub issue say "Returnable Indicator" is offered on physical formats only and a digital format is not reached; today every format's "Metadata" tab shows the physical groups, "Returnable Indicator" included (U73 A6, pkp-e2e#796, walk `shared/playwright/checks/issues/format-metadata-tab-always-physical/walk.js`), so those sentences hold only once A6 is fixed (housekeeping 2026-10-05, from an incidentals row of 2026-10-03); A20: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U50](../specs/U50-issues.md) | 16 | 2 | 0 | A9 (now 🐞), A19: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U28](../specs/U28-reviewers-review.md) | 15 | 2 | 0 | A17 joins the U39-A5 report: its "Tracked in" list (housekeeping 2026-10-05) |
| [U49](../specs/U49-publish-schedule-and-versions.md) | 11 | 2 | 0 | OJS5, OPS6: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U59](../specs/U59-hosted-journals.md) | 10 | 2 | 0 | A11: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U20](../specs/U20-search-engine-metadata-and-analytics.md) | 14 | 1 | 2 | OJS1, OJS2: open reports docs/reports/2026-09-26-ojs-dc-source-uri-404.md and docs/reports/2026-09-26-ojs-sitemap-lists-no-article.md (the rest of U20 written up by the issues session, workstation s0, 2026-10-03) |
| [U04](../specs/U04-orcid-integration.md) | 10 | 1 | 1 | A14, A15: new from the housekeeping claim check of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U65](../specs/U65-editorial-statistics.md) | 19 | 1 | 0 | OMP6 joins the U65-OJS3 report: its "Tracked in" list (housekeeping 2026-10-05) |
| [U10](../specs/U10-appearance-and-theming.md) | 18 | 1 | 0 | A15, A16: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05); A17, A18, A20: new from the housekeeping claim check of 2026-10-05, no report yet; A5's report (pkp-e2e#780) wants its last Summary sentence re-synced (the thumbnail is A20) (housekeeping 2026-10-05) |
| [U64](../specs/U64-usage-statistics.md) | 14 | 1 | 0 | A14: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U23](../specs/U23-submissions-dashboard.md) | 8 | 1 | 0 | A15: new from the housekeeping fold of 2026-10-05, no report yet; A16 joins the U63-A24 report (pkp-e2e#919) and A17 the U39-A5 report: their "Tracked in" lists (housekeeping 2026-10-05) |
| [U07](../specs/U07-journal-identity-and-about-pages.md) | 9 | 0 | 4 | A13: open report docs/reports/2026-09-29-pkp-lib-13370.md (the rest of U07 written up by the issues session, workstation s0, 2026-10-03) |
| [U26](../specs/U26-review-stage-and-rounds.md) | 5 | 0 | 1 | A13: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U03](../specs/U03-user-profile.md) | 12 | 0 | 0 | A11 (rescoped 2026-10-05: after a successful password change the three boxes keep the typed passwords): new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U58](../specs/U58-submission-intake-configuration.md) | 11 | 0 | 0 | A14: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U56](../specs/U56-emails-management.md) | 10 | 0 | 0 | A12: new from the housekeeping fold of 2026-10-05, no report yet (housekeeping 2026-10-05) |
| [U72](../specs/U72-chapters-work-type.md) | 8 | 0 | 0 | A10 joins the U73-A15 report (pkp-e2e#806): its "Tracked in" list (housekeeping 2026-10-05) |
| [U14](../specs/U14-reader-comments-and-moderation.md) | 5 | 0 | 0 | A14: open report docs/reports/2026-09-29-ui-library-992.md; A12 open: reader comments exist only on `main`, in no release, so by RUNBOOK "What goes where" it is an ordinary finding and gets a public report (maintainer, 2026-10-04: briefs/issue-report.md now gives the reporter the release policy and the maintainer's advisory access). The 2026-10-04 draft in .reports/issues/u14d/draft/ was written after a fallback to another model and must not be used or read: start A12 fresh. Paused for the maintainer again: the second attempt (2026-10-04, with the release context) also fell back to another model after a classifier stop, and the session was stopped before anything was written up |
| [U32](../specs/U32-copyediting-stage.md) | 5 | 0 | 0 | A13: open report docs/reports/2026-09-26-pkp-lib-12798.md (the rest of U32 written up by the issues session, workstation s0, 2026-10-04) |
| [U43](../specs/U43-funding.md) | 5 | 0 | 0 | A15 joins the U42-A13 report (pkp-e2e#880): its "Tracked in" list (housekeeping 2026-10-05) |
| [U63](../specs/U63-import-export.md) | 2 | 0 | 0 | A23: open report docs/reports/2026-10-01-pkp-lib-13414.md (the rest of U63 written up by the issues session, workstation s0, 2026-10-01; A24 on 2026-10-04) |
