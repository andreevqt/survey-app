# Usability Study Protocol (5–10 participants)

A turnkey protocol to produce the user-research numbers the project otherwise lacks. Designed for
a moderated remote or in-person session of ~20 minutes per participant. Target n = 5–10
(5 already surfaces ~80% of usability issues; 10 tightens the quantitative metrics).

## Participants

- 5–10 people, mix of "has run a survey/poll before" and "has not".
- Each does the session solo; no help from the moderator beyond reading task prompts.

## Setup

- A fresh seeded instance (`npm run db:seed`) so every participant starts from the same state.
- One pre-created admin account for the AI-analysis task (so they reach a poll that already has
  free-text responses).
- Screen + audio recording with consent; a stopwatch (or the recording timeline) for timings.

## Tasks (read verbatim; do not coach)

| # | Task | Primary metric |
|---|---|---|
| T1 | "Create a new poll with one single-choice question and one free-text question, then publish it." | **Time to create & publish** (s); success (completed unaided y/n) |
| T2 | "Copy the public link and submit one response as a respondent." | Time to submit (s); success |
| T3 | "Open the poll's analytics and tell me the top theme in the free-text answers **without** using AI." | **Time to first insight, manual** (s); did they read raw answers? |
| T4 | "Now use the Analyze-with-AI button and tell me the top theme." | **Time to first insight, AI** (s); success |
| T5 | "Reopen the same analysis." | Notices it loads instantly / cached (y/n) — qualitative confirmation of the cache UX |

T3 vs T4 is the **before/after-AI** comparison from the user's side (manual reading vs one-click
summary). T5 validates the caching UX qualitatively.

## Metrics to record per participant

- Task completion (success / fail / gave up) for T1–T4 → **task success rate**.
- Time-on-task for T1, T3, T4 (seconds).
- Error count / wrong turns per task.
- T3 − T4 delta = **time saved by AI summary** per participant.

## Post-session: System Usability Scale (SUS)

Ten statements, 1 (strongly disagree) – 5 (strongly agree):

1. I think that I would like to use this system frequently.
2. I found the system unnecessarily complex.
3. I thought the system was easy to use.
4. I think that I would need the support of a technical person to be able to use this system.
5. I found the various functions in this system were well integrated.
6. I thought there was too much inconsistency in this system.
7. I would imagine that most people would learn to use this system very quickly.
8. I found the system very cumbersome to use.
9. I felt very confident using the system.
10. I needed to learn a lot of things before I could get going with this system.

**Scoring:** odd items → (score − 1); even items → (5 − score); sum × 2.5 = SUS (0–100).
Benchmark: **68 = average**; 80+ = excellent.

## Reporting template (fill after the runs)

```
Participants: n = __
Task success rate (T1–T4):        __ %
Median time to create+publish (T1): __ s
Median time to insight — manual (T3): __ s
Median time to insight — AI (T4):     __ s
  → AI time saved (T3−T4 median):     __ s  (__ % faster)
Mean SUS score:                       __ / 100
Top 3 usability issues observed:      1) …  2) …  3) …
```

This protocol plus the automated metrics in [README.md](README.md) cover the full feedback:
quantitative usage & performance (automated) + user research with real participants (this doc).
