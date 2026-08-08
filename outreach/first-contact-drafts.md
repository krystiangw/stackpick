# First contact: drafts only

Not sent, and not sendable yet: outbound needs the domain and a verified sender in Resend.
Written to be reviewed and edited by Krystian before anything goes out.

Rewritten 2026-08-08 after the first version was judged to read like spam. The audit that
produced this version is at the bottom, kept on purpose so the next rewrite starts from
evidence and not from taste.

## The three rules these follow

1. **The finding is the message.** No product pitch in the first email, no sequence.
2. **Only quote what is in the run archives.** Same contract as the audit pages: a sentence in
   quotation marks must exist verbatim in `ai-audit/runs/*.md`, section "Archiwum cytatów".
   Storage and auth have almost nothing quotable, so emails about them quote nothing.
3. **Hand them the method, not the conclusion.** Every draft below tells the recipient how to
   rerun the thing against their own product. That is the one move spam never makes.

Before sending any of these:
- The link resolves and the numbers on the page still match the email.
- The recipient is the person who owns the fix, not a generic address.
- Nothing in the email says more than we measured.

---

# The chosen draft

## A. The vendor the agent runs eliminated

Send only to a named person, never to `info@`.

**Subject:** Froala was not named in any of six agent runs

Hi <name>,

Six AI coding agents, six isolated copies of one React app, the same brief in each: pick a rich
text editor and wire it up. Each choice confirmed from the files the run left on disk, not from
what the run said it did.

All six picked Tiptap. Between them they named and rejected ten other editors. Froala was not
one of the ten.

The brief and the scaffold are in the write-up, so you can rerun this against your own
app: <link to /audit/froala-editors>

The part I would find most annoying in your seat: the two commercial editors that were named got
one line each, both about a licence key, before any feature was compared. One run never opened a
vendor site at all and decided from npm metadata and the code it had installed.

Two models from one family, one brief, one codebase. A different brief moves the winner. It does
not move being absent from the list.

Krystian

**Why this one wins:** the reasoning is in the audit below. Short version: it survives three
seconds, it is checkable before they trust a word of it, and the last two paragraphs are things
a template would never say.

**Deliberately left out:** the four-word quote from the earlier round ("Fully commercial, licence
key required"). It is real and archived, but it comes from the round that shared one working
directory, so using it needs a sentence of explanation, and a sentence of explanation in a cold
email costs more than the quote is worth. Keep it for the reply if they ask.

---

# The same shape, applied to the other two situations

## B. A vendor with a cheap fix and a real delta

For domains where the free scan alone gives a specific, checkable finding.

**Subject:** <domain> answers 403 to an agent and 200 to Chrome

Hi <name>,

The same request to <domain> twice, one header different. Sent as Chrome: 200. Sent as something
identifying itself as an agent: 403.

Every check behind that is one HTTP request with a published rule, so you can reproduce the whole
thing before you believe any of it: <link to /methodology>

The part I would find most annoying in your seat: everything else we measured is a floor, not a
score. We measured you through that wall, so your real number is probably higher and neither of
us can see it from here.

<x> of <y> measurable points, and the report says which two fixes are minutes rather than
weeks: <link to scorecard>

Krystian

## C. The vendor that wins today

They are not losing, so the message is about what the win rests on.

**Subject:** you won six of six agent runs, and it was not on features

Hi <name>,

Six agents, six isolated copies of one React app, one brief: pick a rich text editor. All six
picked Tiptap.

Four of the six read your package metadata and the code they had installed on disk. One never
opened your website at all. Two commercial editors were dropped on a licence key requirement,
quoted from their own documentation, before any product was compared.

So the win rests on your licence being MIT and legible from `package.json`. That is a thin thing
to rest on, and it is the easiest part of your position for a competitor to copy.

The brief and the scaffold are in the write-up if you want to rerun it: <link to
/audit/froala-editors>

Krystian

---

# What I would not send

- Anything to a generic address. The finding is specific, so the recipient has to be too.
- The full audit pitch in a first email. If the finding lands, they will ask.
- A second email if the first gets no reply. One email, one finding, then stop.
- Any sentence claiming we are not selling anything. We are, further down the page, and a reader
  who notices the gap trusts nothing else in the email.

---

# The audit that produced this rewrite

Verdict on the first version: the individual sentences were fine and the structure was the
problem. Three drafts, one skeleton, repeated: introduce myself, state the number, drop a link,
disclaim the sales motive, offer a favour, sign off. A reader who gets two of them sees the
template, and a reader who gets one feels it without being able to name it.

**1. The first sentence was about me.** *"I run a small study on how AI coding agents pick
libraries."* and *"I scan developer tools for how they behave with AI agents."* Both spend the
only sentence that gets read on credentials nobody asked for. The finding, which is the entire
reason to send anything, arrived in paragraph two.

**2. The denial did the opposite of its job.** *"I am not selling you a tool"* is a sentence only
sellers write. Worse, it is not true: `/pricing` sells an audit for four figures. A recipient who
clicks the link finds the price and the email retroactively becomes a pitch that opened with a
denial. Nothing else in it survives that.

**3. The close asked for a favour and then withdrew it.** *"If it is useful, I can send the raw
run transcripts. If not, ignore this and I will not follow up."* Two moves in one sentence, both
familiar: the bonus-content offer and the no-pressure promise. "I will not follow up" is a
sequence tell, because the only people who need to say it are people who normally would.

**4. Nothing was verifiable inside the email.** Our single strongest asset is that all of it
reproduces: a published brief, a seeded scaffold, one HTTP request per check with a published
rule. Draft A mentioned none of that. Draft B mentioned it in the last line, after the pitch.

**5. The pitch was vague where it should have been precise.** *"Two of the fixes take minutes and
move you past <competitor> in your category."* Past which competitor, from what position, worth
how much. A specific claim invites a check. A vague one invites a delete.

**6. The subject lines described the email, not the finding.** *"six agents picked an editor for a
real app, none of them named Froala"* is two clauses where the second one is the news. *"you won
all six agent runs - here is what carried it"* promises a payoff after the dash, which is the
grammar of a newsletter.

**7. No limit was stated anywhere.** Every audit page carries its limits, and the emails dropped
them. Stating the limit early is the cheapest credibility available, because no spam does it.

## The variants, and why the others lost

**V1, result then caveat.** Finding first, limits second, actionable detail third. Honest and
readable, but putting the caveat in position two slows the read at the exact moment the reader
is deciding whether to keep going.

**V2, method first.** Opens with the protocol so a sceptic can dismiss it in five seconds. Very
strong for an engineer, weak for anyone else, and it spends the first sentence on setup again,
which is the mistake we were fixing.

**V3, sixty words, no pitch.** The least spammy thing on the list and the least useful. It makes
the reader feel bad and gives them nothing to do about it. A finding with no next step is a
complaint.

**V4, the aggressive one.** *"Your competitor was chosen six times out of six."* Highest open
rate, and it makes an enemy in the first sentence of a first contact with someone who has never
heard of us. Rejected, not softened.

**V5, reproduce it.** Finding, then the method as an invitation to disprove us, then the one
detail that is actionable, then the limit. Wins because it transfers control: it is the only
variant that assumes the reader will check, and it is the only one spam cannot imitate, because
spam never wants to be checked.

The chosen draft is V5's spine with V2's protocol compressed into the first sentence and V1's
limit cut down to one closing pair of sentences.

## Two things the copy cannot fix

**Deliverability.** A cold email from a domain registered last week, with a link, to a stranger,
lands in spam no matter how it reads. If these go out: send from an established personal address
first, plain text, no tracking pixel, no link shortener, a handful a day, and let the new domain
warm up on replies before it carries outbound.

**Consent.** Unsolicited commercial email to individuals is regulated here, and a first contact
that only reports a finding sits differently from one that sells. That is another reason the
pitch stays out of email one, but it is worth a proper check before any volume.
