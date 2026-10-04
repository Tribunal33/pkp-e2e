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
| [U37](../specs/U37-tasks-and-discussions.md) | 21 | 2 | 5 | **Taken: issues session, workstation s0, 2026-10-04** A1: open report docs/reports/2026-09-04-omp-ops-discussion-save-missing-notification-class.md (the rest of U37 written up by the issues session, VM s1, 2026-10-02); A24 open (missed by that session: its register row has no outcome) |
| [U36](../specs/U36-submission-files.md) | 17 | 2 | 2 | A23, A24: open report docs/reports/2026-09-27-pkp-lib-13288.md (the rest of U36 written up by the issues session, workstation s0, 2026-10-02) |
| [U17](../specs/U17-sections.md) | 16 | 2 | 2 | OMP9, OPS6: open reports docs/reports/2026-09-25-omp-series-page-blank.md and docs/reports/2026-09-25-ops-oai-empty-abstract.md (the rest of U17 written up by the issues session, workstation s0, 2026-10-02) |
| [U18](../specs/U18-web-feeds.md) | 6 | 2 | 2 | A1, A7, OPS1: open reports docs/reports/2026-09-26-webfeed-rss2-empty-feed-fails.md, docs/reports/2026-09-26-webfeed-terms-read-array.md and docs/reports/2026-09-26-webfeed-ops-publisher-array.md (the rest of U18 written up by the issues session, workstation s0, 2026-10-02) |
| [U16](../specs/U16-categories.md) | 22 | 1 | 4 | OMP5: open report docs/reports/2026-09-30-php-gh20469-segfaults.md (the rest of U16 written up by the issues session, VM s0, 2026-10-02) |
| [U20](../specs/U20-search-engine-metadata-and-analytics.md) | 14 | 1 | 2 | OJS1, OJS2: open reports docs/reports/2026-09-26-ojs-dc-source-uri-404.md and docs/reports/2026-09-26-ojs-sitemap-lists-no-article.md (the rest of U20 written up by the issues session, workstation s0, 2026-10-03) |
| [U07](../specs/U07-journal-identity-and-about-pages.md) | 9 | 0 | 4 | A13: open report docs/reports/2026-09-29-pkp-lib-13370.md (the rest of U07 written up by the issues session, workstation s0, 2026-10-03) |
| [U14](../specs/U14-reader-comments-and-moderation.md) | 5 | 0 | 0 | A14: open report docs/reports/2026-09-29-ui-library-992.md; A12 open: reader comments exist only on `main`, in no release, so by RUNBOOK "What goes where" it is an ordinary finding and gets a public report (maintainer, 2026-10-04: briefs/issue-report.md now gives the reporter the release policy and the maintainer's advisory access). The 2026-10-04 draft in .reports/issues/u14d/draft/ was written after a fallback to another model and must not be used or read: start A12 fresh |
| [U32](../specs/U32-copyediting-stage.md) | 5 | 0 | 0 | A13: open report docs/reports/2026-09-26-pkp-lib-12798.md (the rest of U32 written up by the issues session, workstation s0, 2026-10-04) |
| [U63](../specs/U63-import-export.md) | 2 | 0 | 0 | A23: open report docs/reports/2026-10-01-pkp-lib-13414.md (the rest of U63 written up by the issues session, workstation s0, 2026-10-01; A24 on 2026-10-04) |
| [U13](../specs/U13-article-landing-page-and-reading.md) | 1 | 0 | 0 | A13 open (new 2026-10-02 by the housekeeping fold: the PDF reader from a new version's preview says "outdated version published on ."; the OPS1 report docs/issues/U13-OPS1-new-version-preview-called-outdated.md names it and leaves it out of its fix) |
