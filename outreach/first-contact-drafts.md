# First contact: drafts only

Not sent, and not sendable yet: outbound needs the domain and a verified sender in Resend.
Written to be reviewed and edited by Krystian before anything goes out.

One rule these all follow: **the finding is the message**. No product pitch in the first email,
no sequence, no "I hope you are well". If the finding is not worth their two minutes, there is
no email to write.

Before sending any of these, check three things:
1. The scorecard link resolves and the numbers on it still match what the email says.
2. The recipient is the person who owns the fix, not a generic address.
3. Nothing in the email says more than we measured.

---

## A. The vendor our agent runs eliminated

Hardest one to send and the most valuable. Send only to a named person, never to `info@`.

**Subject:** six agents picked an editor for a real app, none of them named Froala

Hi <name>,

I run a small study on how AI coding agents pick libraries. Six agents, two models, six isolated
copies of the same React app, one brief: add a rich text editor and wire it up.

All six picked Tiptap. Froala was not named once, not even on a rejection list, and between them
the runs named and dismissed eleven alternatives.

In an earlier round Froala did come up twice, and both times it was struck off in four words:
"Fully commercial, licence key required." No feature was compared.

The full round, with what each run read and rejected, is here: <link to /audit/froala-editors>

I am not selling you a tool - I am telling you because it is invisible from your side. There is
no impression to see, no trial to review, no lost deal in your CRM.

If it is useful, I can send the raw run transcripts. If not, ignore this and I will not follow up.

Krystian

---

## B. A vendor with a cheap fix and a real delta

For domains where the free scan alone gives a specific, checkable finding.

**Subject:** <domain> answers 403 to an agent and 200 to Chrome

Hi <name>,

I scan developer tools for how they behave with AI agents. <domain> came out at <x>/<y>.

The one that matters: your home page answers <status> to a request identifying itself as an
agent, and <status> to the same request sent as Chrome. Only the user-agent differed. Everything
below that in the scan is a floor, not a ceiling, because we measured through that wall.

The scorecard, with the exact request behind each line: <link>

Two of the fixes take minutes and move you past <competitor> in your category. The scan says
which ones and what each is worth.

Every check is one HTTP request with a published rule, so you can reproduce all of it or tell me
where I am wrong: <link to /methodology>

Krystian

---

## C. The vendor that wins today

Different job: they are not losing, so the message is about what the win rests on.

**Subject:** you won all six agent runs - here is what carried it

Hi <name>,

Six agents, two models, six isolated copies of one React app, one brief: pick a rich text editor.
All six picked Tiptap.

What decided it was not features. Four of the six read your package metadata and your installed
code on disk, and one never opened your website at all. Two commercial editors were dropped on a
licence key requirement, quoting their own documentation, before any product was compared.

So the win rests on your licence being MIT and readable from `package.json`. That is a thin thing
to rest on, and it is the part a competitor can copy in an afternoon.

The round is written up here: <link to /audit/froala-editors>

Happy to send the transcripts if you want to see how your docs were used.

Krystian

---

## What I would not send

- Anything to a generic address. The finding is specific, so the recipient has to be too.
- The full audit pitch in a first email. If the finding lands, they will ask.
- A second email if the first gets no reply. One email, one finding, then stop.
