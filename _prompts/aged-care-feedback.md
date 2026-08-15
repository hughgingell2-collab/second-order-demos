# Prompt — fold real-world industry feedback into the aged care app

Paste everything below this line into a Claude session opened on the aged care app's repo.

---

You are working on my aged care safety app. I've had first real-world feedback from an
aged-care industry contact (a nursing home tour plus retail channel experience), and I want
the app updated to reflect it. Work in priority order — item 1 is a launch blocker, the rest
are growth features.

## Step 0 — orient first, then confirm

Before changing anything: read the codebase, then tell me in a few sentences what the app
currently does, what stack it uses, and your plan for the tasks below. Ask me any clarifying
questions at that point — especially anything where the feedback doesn't match what the app
actually is. Only start editing once I've confirmed.

## The feedback

1. **Liability is real.** "If someone relies on it but then dies, you'd be in trouble." The
   app must never present itself as something a person's safety can depend on, and I need
   the groundwork for proper business insurance.
2. **Distribution is B2B2C, not just B2C.** Aged-care equipment retailers and chemists can
   onsell it. The moment a chemist sells a walker, that customer is eligible. Anyone
   receiving a Webster pack is eligible.
3. **Nursing homes already run passive fall-detection sensors** (one in the corner of each
   room). Our positioning should acknowledge and eventually integrate with that, not compete
   with it.

## Task 1 — safety and liability (launch blocker)

- Add a first-run disclaimer screen the user must explicitly acknowledge before using the
  app: this is **not a medical device** (not TGA-registered), **not a monitoring or
  emergency service**, and **no substitute for professional or clinical care**. In an
  emergency, call **000**.
- Everywhere the app could be relied on (alerts, check-ins, reminders), add failure-safe
  wording: delivery is not guaranteed; if something is wrong, call 000 or your doctor — do
  not wait for the app.
- Draft a `TERMS.md` covering intended use, no-reliance, and limitation of liability.
  Mark it clearly as a **draft for a solicitor's review — not legal advice**, and add a
  pre-launch checklist item: obtain product/public liability insurance and legal review
  before any real user relies on the app.
- Audit existing copy and remove or soften any wording that promises detection, monitoring,
  or safety outcomes. Never state or imply detection accuracy.

## Task 2 — eligibility screener

Add a short self-serve screener (3–4 questions) that mirrors the real-world eligibility
triggers: Do you (or the person you care for) use a walker or other mobility aid? Receive a
Webster pack? Had a fall in the last 12 months? Live alone? Any "yes" ends on an
encouraging "you're likely a good fit — get started" screen. Keep it warm and plain-English;
the audience is older Australians and their families.

## Task 3 — partner channel (chemists and equipment retailers)

- Add a partner-facing page pitched at chemists and aged-care equipment retailers: "Sold a
  walker? Dispensing Webster packs? Your customer is eligible — onsell this at the counter."
- Support a referral code at signup so a partner's signups are attributable to them.
- Stub a simple partner view: their code, signups via their code, and a shareable blurb they
  can print or hand out. Mock data is fine for now.

## Task 4 — positioning for sensor integration (roadmap only)

Add a roadmap/about entry: residential facilities already use passive in-room fall sensors;
this app serves people **at home, before that stage**, and a future integration could hand
over cleanly when someone moves into care. No build work beyond the copy.

## Constraints

- Match the existing stack, file layout, and visual style — no new frameworks.
- Australian conventions throughout: 000 (never 911), "chemist", "Webster pack", AUD, DD/MM
  dates.
- Accessibility matters more than usual here: large tap targets, high contrast, plain
  language — the end users are elderly.

## Before you finish

- Walk every new screen and flow once and confirm nothing is dead or unstyled.
- Confirm the disclaimer cannot be skipped on first run.
- List anything you deliberately left out or that needs a human (insurance broker,
  solicitor) rather than code.
