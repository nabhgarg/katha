# Bollywood Voice & Language Reference Library v1

**Purpose:** Reference dialogues from real Indian films and series that the generation engine retrieves to learn (a) the *kind of language* to use, (b) *when* to use which register, and (c) the *contextual situation* that calls for it. Used as few-shot material in the scene-generation prompt and as a vector-search corpus once we wire up retrieval.

**How the model uses each entry:**
- The **line** anchors a specific cadence the model can imitate.
- The **register tags** tell the model *what kind of language* — slang level, code-switch ratio, formality, regional inflection.
- The **situation** tells the model *when* this language is appropriate — what emotional state, what relationship between speakers, what point in the scene.
- The **technique** is the transferable craft lesson.
- The **deploy-in-Katha** instruction says exactly where in the engine this kind of line should surface.

**Honesty markers:**
- ✓ = I'm 90%+ confident the wording is accurate
- ≈ = paraphrase / approximate (verify the exact wording before training use)

---

## ROMANCE

### R-1 — Dilwale Dulhania Le Jayenge (1995)

- **Line:** "Ja Simran, ja. Jee le apni zindagi." ✓
- **Speaker → Listener:** Baldev Singh (father) → Simran (daughter)
- **Situation:** A father who has refused his daughter's love through the entire film, at the railway platform, finally letting her go to chase the train. The line is the surrender of patriarchal authority that has been the film's central conflict.
- **Register:** Punjabi-inflected Hindi. Zero English. Formal-paternal. Volume: low. Pace: slow.
- **Code-switch ratio:** 100% Hindi.
- **Technique:** Repetition with break. The second "ja" is the actual surrender, not the first. Short declarative sentence after, no qualifier, no explanation. The brevity is the love.
- **Deploy in Katha:** Cliffhanger or climactic surrender beats where a character with power releases someone from a hold they've kept. Use when the *speaker* loses the conflict but the listener wins it.

- **Second line:** "Bade bade deshon mein aisi choti choti baatein hoti rehti hain, Senorita." ✓
- **Speaker → Listener:** Raj (urban NRI) → Simran (during their unplanned Europe layover)
- **Situation:** Raj is calming Simran after a small disaster on their unintended trip. The line establishes him as someone who reframes panic into smallness.
- **Register:** Urban Hindi with a deliberately incongruous English/Spanish address ("Senorita"). Casual. Performed-charm.
- **Code-switch ratio:** ~90% Hindi, 10% Spanish/English address — the *address* carries the entire English-language signal.
- **Technique:** Mismatched address. The foreign word doesn't fit the speaker or the moment — that mismatch *is* the charm. Reassurance through deflection.
- **Deploy in Katha:** Romance openers and early-rapport scenes where a character is calming the other through tonal shift, not through reasoning. Especially useful when class or world-difference is implicit (e.g., Scene R-1 in our golden library).

---

### R-2 — Kuch Kuch Hota Hai (1998)

- **Line:** "Pyaar dosti hai." ✓ (and its echo throughout the film)
- **Speaker → Listener:** Rahul → Anjali (and to himself, recurringly)
- **Situation:** The thematic declaration of the film — that love is friendship — repeated at multiple emotional altitudes (laughed off in college, painfully revisited as an adult).
- **Register:** Polished Delhi-college Hindi. Conversational, declarative, no slang.
- **Code-switch ratio:** 100% Hindi.
- **Technique:** Three-word thesis. Short enough to be a slogan, vague enough to mean different things at different ages. The repetition across the film is what gives it weight, not the line alone.
- **Deploy in Katha:** When a character is voicing a belief they will be tested on later. The line plants — the test pays off in a later scene.

---

### R-3 — Kabhi Khushi Kabhie Gham (2001)

- **Line:** "Keh diya na, bas keh diya." ✓
- **Speaker → Listener:** Yashvardhan Raichand (father) → Rahul (son) — disowning him
- **Situation:** The patriarch is closing a conversation he refuses to continue. The "keh diya" is self-citation as authority — *I have said it, therefore it is finished.*
- **Register:** High-formal Delhi-Hindi. Patriarchal absolute. Volume: controlled, not raised. The control *is* the violence.
- **Code-switch ratio:** 100% Hindi.
- **Technique:** Self-citation. The speaker quotes their own earlier statement as the final authority. No reasoning offered, no engagement with counter-argument. Use this whenever a character is shutting down a discussion they could lose.
- **Deploy in Katha:** Cliffhangers where authority is asserted against a sympathetic protagonist. Particularly useful for ROMANCE scenes featuring parental/family conflict, which is the dominant Indian romance conflict template.

- **Tonal pair:** "It's all about loving your parents." ✓
- **Register note:** The film's English-language thesis spoken in English — a class signal. The same family that speaks Hindi at home declares its values in English. This duality is itself a story about an upper-class-Indian way of holding two languages simultaneously.
- **Deploy in Katha:** Use the English-thesis-in-Hindi-household pattern when establishing class or generational tension.

---

### R-4 — Jab We Met (2007)

- **Line:** "Main apni favourite hoon." ✓
- **Speaker → Listener:** Geet (Punjabi 22-year-old from Bhatinda) → Aditya (depressed Mumbai businessman on a train)
- **Situation:** Geet, having dragged Aditya into her chaotic family-laden travel, declaring her self-regard without irony or apology. Establishes her entire character in five words.
- **Register:** Punjabi-Delhi-young, maximalist, English word slipped into Hindi sentence casually. Volume: high. Self-confidence: total.
- **Code-switch ratio:** ~80% Hindi, 20% English — but the English word ("favourite") is the *load-bearing* word. The full-Hindi version ("apni pasandida") would feel translated.
- **Technique:** The code-switch happens *at* the emotional load-bearing word. This is the highest-leverage code-switching rule in Indian dialogue writing. If the engine learns one thing about Hinglish, it should be this.
- **Deploy in Katha:** Character-introduction lines, manifesto moments, voice-establishment in episode 1. Whenever a character is declaring who they are without apology.

- **Second line:** "Akeli ladki khuli tijori ki tarah hoti hai." ✓
- **Situation:** Geet quoting something her father told her — to explain why she carries herself the way she does. The cadence carries inherited weight.
- **Register:** Same as above but with a slightly more formal Hindi register because she is *quoting* her father — the register lifts when transmitting wisdom.
- **Technique:** Concrete simile (tijori, not "vulnerable"). Indian dialogue tends to use *object similes* over *adjective declarations*. "She is vulnerable" is weak; "she is like an open safe" is strong.
- **Deploy in Katha:** When a character voices inherited belief. Useful for character cards (see engine spec) — every protagonist could carry one inherited line they live by or against.

---

### R-5 — Yeh Jawaani Hai Deewani (2013)

- **Line:** "Main udhna chahta hoon, daudna chahta hoon, girna bhi chahta hoon." ✓
- **Speaker → Listener:** Bunny (travel-obsessed 24-year-old) → Naina (the more grounded counterpart)
- **Situation:** Bunny is explaining why he can't commit to a settled life. The triplet announces wanderlust, but the third item — wanting to *fall* — is the actual confession.
- **Register:** Urban-articulate Mumbai-Delhi Hindi. Slight performance to it — the character is aware of being eloquent. Volume: animated.
- **Code-switch ratio:** 100% Hindi here, but Bunny across the film code-switches freely with English filler ("dude," "yaar," "you know").
- **Technique:** Triplet with reversal. Two upward verbs, then one downward. The reversal is the line — anyone can want to fly; admitting you want the fall is character.
- **Deploy in Katha:** Manifesto moments. Pre-decision speeches where a character is announcing the kind of life they want, including the cost they are accepting.

- **Bunny's general voice:** "Kuch toh log kahenge, logon ka kaam hai kehna." ✓ (also from earlier Amar Prem 1972 song, reused conversationally in YJHD and broader culture)
- **Register lesson:** Aphorism in casual conversation. Indian dialogue often deploys old film/poetic lines as everyday speech — characters quote songs and movies the way Americans quote sitcoms. The engine should learn to let modern characters drop pre-existing aphorisms naturally.

---

### R-6 — Devdas (2002)

- **Line:** ≈ "Babuji ne kaha gaon chhod do, sab ne kaha Paro ko chhod do, ek din aayega jab woh kahenge ki yeh duniya chhod do." (Devdas — Bhansali version; approximate, verify exact)
- **Speaker → Listener:** Devdas → Chunni (his enabler)
- **Situation:** Devdas describing the trajectory of his self-destruction as a series of obediences. Each clause is a thing taken from him by command; the final clause is the prediction of his own death.
- **Register:** Bhansali period-poetic. Heavy Urdu loanwords, formal, slow. Drunk-articulate — the character is impaired but his cadence is somehow more, not less, controlled.
- **Code-switch ratio:** 100% Hindi/Urdu blend.
- **Technique:** Escalating list with semantic progression. Each item is a larger loss than the last. The structure is *village → Paro → world*. The grammar is parallel; the content compounds.
- **Deploy in Katha:** Late-episode confessional moments where a character is naming the chain that led to where they are. Use the escalating-list-with-parallel-grammar pattern.

- **Second line:** ≈ "Kaun kambakht bardasht karne ko peeta hai." (Devdas — approximate, verify)
- **Technique:** A question that turns into a triplet of justifications, each shorter grammatically but heavier emotionally. The escalation lands on a small word repeated.
- **Deploy in Katha:** Use sparingly — this register is heavy. Reserved for confession beats where a character explains their self-destruction to the person who caused it.

---

### R-7 — Tamasha (2015) / Wake Up Sid (2009)

- **Voice signature:** Characters who do not know what they want and are openly bad at hiding it.
- **Recurring line in Tamasha:** "Why always the same story?" ✓ (Ved, to himself, repeatedly)
- **Register:** Self-interrogation in English. The character has the vocabulary to articulate the problem but not to solve it.
- **Code-switch ratio:** Tamasha specifically uses English for *internal* reflection and Hindi for *external* performance. This is a real linguistic pattern in urban India — many people *think* in one language and *speak* in another to family.
- **Technique:** The interior monologue line is in English; the dialogue with parents is in Hindi. The bilingual gap *is* the conflict.
- **Deploy in Katha:** When ROLEPLAY-mode internal narration is used (when we add that). The internal voice can shift register from the dialogue voice — and *that shift* should reflect the kind of urban-Indian character whose private and public languages diverge.

---

### R-8 — Ae Dil Hai Mushkil (2016)

- **Line:** ≈ "Ek tarfa pyaar ki taakat hi kuch aur hoti hai." (Ayan — paraphrase; verify exact wording)
- **Situation:** Ayan defending his unreciprocated love for Alizeh as having a legitimacy of its own.
- **Register:** Karan Johar-cosmopolitan. Hindi-English fluid, more emotionally articulate than realistic. A class signal.
- **Code-switch ratio:** ~70% Hindi, 30% English, but the English appears in casual filler rather than load-bearing words.
- **Technique:** Aphoristic line that the character clearly believes but the film questions. The register is poetic-confessional.
- **Deploy in Katha:** Use sparingly — over-aphorism is a failure mode. Limit aphoristic lines to one per episode maximum. Best deployed in scene-3 cliffhangers where a character is committing to a difficult position.

---

### Romance voice — language summary

If the engine learns four things from this section:

1. **Code-switch on the load-bearing word.** ("favourite" not "pasandida" in *Jab We Met*.)
2. **Concrete object similes beat adjective declarations.** ("Khuli tijori" not "vulnerable".)
3. **Repetition with one altered element does emotional work.** ("Ja Simran, ja.")
4. **Internal vs external language can diverge** — bilingual gap is character.

---

## THRILLER

### T-1 — Sholay (1975)

- **Line:** "Kitne aadmi the?" ✓
- **Speaker → Listener:** Gabbar Singh (dakait) → his subordinates returning from a failed raid
- **Situation:** Gabbar is interrogating his men about why they retreated from two villagers. The threat is not in the question — it is in the *unstated judgment* of whatever answer they give.
- **Register:** Chambal-dakait Hindi. Minimal vocabulary, heavy stress on each word. Volume: low at first, weaponised silence in between words.
- **Code-switch ratio:** 100% Hindi, dialect-flavoured.
- **Technique:** Three-word question that forces the listener to provide their own evidence against themselves. The shorter the question, the higher the stakes of the answer.
- **Deploy in Katha:** Antagonist interrogation beats. Whenever a powerful character is making a less-powerful character incriminate themselves. The model should learn that *question length is inversely proportional to threat level.*

- **Second line:** "Yeh haath mujhe de de, Thakur." ✓
- **Situation:** Gabbar taunting Thakur, who he has previously had his hands chopped off.
- **Technique:** Weaponising past damage. The line lands because of dramatic irony the audience holds — the listener has no hands.
- **Deploy in Katha:** Reveal scenes where the antagonist references something the protagonist has lost. The cruelty is in pretending the past damage doesn't exist.

---

### T-2 — Don (1978)

- **Line:** "Don ko pakadna mushkil hi nahi, namumkin hai." ✓
- **Speaker → Listener:** Voiceover / Don himself, mythologising his own untouchability
- **Situation:** The line establishes the antagonist as beyond the law before any plot has even started.
- **Register:** Polished urban-Hindi. Crisp, no slang, no English. Confidence: absolute.
- **Code-switch ratio:** 100% Hindi.
- **Technique:** Concessive escalation. "Mushkil hi nahi" sets up; "namumkin hai" closes. The structure is a self-correction that intensifies — the speaker is upgrading their own claim mid-sentence.
- **Deploy in Katha:** When establishing antagonist stakes early in a thriller. Also useful for protagonist declarations of impossible resolve (e.g., scene 3 cliffhangers where the protagonist commits to a path that is acknowledged-impossible).

---

### T-3 — Gangs of Wasseypur Part I & II (2012)

- **Line:** "Beta, tumse na ho payega." ✓
- **Speaker → Listener:** Faizal Khan → his rival (and recurring contempt to anyone underestimating him)
- **Situation:** Faizal — slow-spoken, ganja-mellow — repeatedly using this line to dismiss enemies. The line works because of his particular drawl; the *flat affect* is the threat.
- **Register:** Wasseypur-Bihari working-class. Drawl, vowels held slightly long. Volume: low. Affect: bored.
- **Code-switch ratio:** 100% Hindi, regional inflection.
- **Technique:** Diminutive address ("beta") + future-tense dismissal ("ho payega"). The address condescends; the verb forecloses. Combined, it is a refusal that does not bother to argue with the listener.
- **Deploy in Katha:** Power-assertion beats where an antagonist (or anti-hero protagonist) is dismissing the listener's plan in advance. Especially effective for THRILLER subgenres that depend on patient-dangerous antagonists rather than explosive ones.

- **Second line:** ≈ "Goli nahi maarunga. [Profanity] hai, bandook se khud goli khaayega." (Ramadhir Singh — approximate; the film uses graphic profanity in this register)
- **Register note:** Heavy profanity is a register-marker in this film. For Katha, profanity should be calibrated to platform tolerance — the *function* of the profanity (cynical street-realism) can be approximated with milder slang.
- **Technique:** Prediction as threat. The antagonist is announcing that they will *not* commit violence — and the prediction itself becomes the violence. The listener is denied even the dignity of confrontation.
- **Deploy in Katha:** Reserve for high-stakes thriller cliffhangers where an antagonist's *refusal to engage* is more terrifying than engagement.

---

### T-4 — A Wednesday (2008)

- **Line:** "Main bahut common aadmi hoon." ✓
- **Speaker → Listener:** The Common Man → the police commissioner (over phone, during a citywide bomb threat)
- **Situation:** The protagonist (revealed only at the climax) is establishing his anonymity as his power. He cannot be caught because he is indistinguishable from everyone.
- **Register:** Anonymous urban middle-class Hindi. Neutral, deliberately featureless. Volume: calm. Pace: measured.
- **Code-switch ratio:** ~95% Hindi, slight English filler ("common").
- **Technique:** Self-diminishment as concealment. The "bahut" is the move — exaggerating ordinariness past plausibility. A character giving themselves an alibi by description.
- **Deploy in Katha:** Reveal moments where a character claims they cannot be the one doing this — and the claim is correct in form but wrong in substance. Particularly useful for THRILLER subgenres MYSTERY and CONSPIRACY.

---

### T-5 — Sacred Games (Netflix, 2018)

- **Line:** "Kabhi kabhi lagta hai apun hi bhagwan hai." ✓
- **Speaker → Listener:** Ganesh Gaitonde → audience (opening voiceover)
- **Situation:** The first line of the series. Establishes Gaitonde's grandiosity-in-street-register before any plot has moved.
- **Register:** Bombay-tapori. Mixes Hindi, Marathi, English freely. "Apun" is the marker word — a humble, working-class first-person pronoun used here for a god-claim.
- **Code-switch ratio:** ~70% Hindi, 20% English/Marathi mix, 10% slang.
- **Technique:** Register-clash. "Apun" (the smallest possible first-person) + "bhagwan" (the largest possible word) in the same sentence. The blasphemy *lands* because the register refuses to perform cosmic.
- **Deploy in Katha:** Opening voiceovers / opening lines for protagonists with grandiose self-conception. Also useful for any character admitting something cosmic in a tone that refuses to perform cosmic. Excellent reference for MYTHOLOGY protagonists who *don't* believe they're inside a mythology.

---

### T-6 — Mirzapur (Amazon, 2018)

- **Voice signature of the Tripathi family:** Threat-register that escalates through *increasing politeness*. As the violence implied grows, the grammar becomes more correct, the Hindi more formal.
- **Kaleen Bhaiya's tonal range:** When ordinary conversation, mid-register Hindi with some English filler. When announcing harm, register lifts toward Urdu-formal — addresses people by their full names, uses respect-forms.
- **Code-switch ratio:** Mid-register ~80% Hindi 20% English; threat-register ~95% Hindi, slight Urdu lift.
- **Technique:** Polite Hindi structures wrapped around extreme violence. The contrast is the threat. The more dangerous the moment, the more grammatical the sentence.
- **Deploy in Katha:** Antagonist announcement beats where the threat must be conveyed without raising volume. Particularly useful for CONSPIRACY subgenre — the antagonist who threatens through composure rather than aggression.

---

### T-7 — Paatal Lok (Amazon, 2020)

- **Line:** ≈ "Hum aalu hote, toh fight bhi karte." (Hathi Ram Chaudhary — approximate; verify exact)
- **Speaker → Listener:** Hathi Ram → himself (or his junior), reflecting on his stagnant career
- **Situation:** A worn-out outer-Delhi cop is voicing his own irrelevance through a self-mocking conditional.
- **Register:** Outer-Delhi working-cop. Tired, dryly self-aware, anti-heroic. Volume: low. Affect: rueful.
- **Code-switch ratio:** 100% Hindi, regional inflection.
- **Technique:** Conditional self-mockery. The character makes a joke about their powerlessness, and the joke admits the powerlessness as fact. The vegetable comparison is *deliberately small* — that's the move.
- **Deploy in Katha:** Mid-thriller scenes where the investigator-protagonist is admitting they're outclassed. Useful for episode 3-4 emotional-state beats where the protagonist must voice their disadvantage to themselves before deciding to push forward anyway.

---

### T-8 — Andhadhun (2018)

- **Voice signature:** Affect-suppression. Crucial plot information is delivered in the same flat tone as small talk. The dialogue *omits* emphasis where lesser films would italicise.
- **Technique:** Reveal-without-emphasis. A character delivers a fact that recontextualises the scene — and the next line continues as if nothing was said. The listener (and viewer) does the realising.
- **Deploy in Katha:** Mid-scene plot pivots where you want the realisation to land *delayed* — the character processes one line later than the listener does. Particularly useful for PSYCHOLOGICAL_SUSPENSE subgenre.

---

### Thriller voice — language summary

If the engine learns five things from this section:

1. **Politeness is the highest threat register.** The more dangerous the moment, the more formal the grammar.
2. **Register-clash carries large claims.** Pair the smallest first-person ("apun") with the biggest concept ("bhagwan") for theological/grandiose lines.
3. **Diminutive address ("beta") is a power weapon.** Use when an antagonist condescends to the protagonist.
4. **Question length is inversely proportional to threat.** "Kitne aadmi the?" — three words is more dangerous than thirty.
5. **Affect-suppression on reveals.** Drop the load-bearing fact at the same volume as the rest.

---

## MYTHOLOGY

**Honest gap note:** Modern Bollywood mythology is thin. The strongest reference voices for Katha mythology will come from outside Bollywood — TV serials (Mahabharat 1988, Ramayan 1987, Devon Ke Dev Mahadev), Amish Tripathi's Shiva Trilogy, Devdutt Pattanaik's retellings. The Bollywood references below should be used sparingly and as a *starting* register, not the full library. The mythology entries in `golden-scenes-v1.md` deliberately invent a working voice that is more useful for Katha than what Bollywood actually offers.

---

### M-1 — Bahubali / Bahubali 2 (2015-17)

- **Voice signature:** Period-epic Hindi (and Telugu, in original) with Sanskrit loanwords. Heavy declaratives. Characters *announce* their loyalties rather than reveal them through behaviour.
- **Representative pattern:** "Main [X] ka aadmi hoon" / "[Y] ke liye yeh jaan haazir hai" — loyalty as stated identity, not internal state.
- **Register:** Formal-epic Hindi. Declarative. Volume: raised in public scenes, controlled in private.
- **Code-switch ratio:** 95% Hindi, 5% Sanskrit loanwords ("rajdharm," "kshatriya," etc.)
- **Technique:** Loyalty as title. Characters define themselves through whom or what they serve.
- **Deploy in Katha:** *Side characters* in MYTHOLOGY who serve a cosmic role (guardians, gatekeepers, oracle-figures). The protagonist should *resist* this register at first — modern characters do not naturally announce loyalty in titles. The growth arc is becoming able to.

- **Cultural moment to learn from:** "Kattappa ne Bahubali ko kyun maara?" ✓ This was the *audience's* question between Part 1 and Part 2 — not a character's line, but a cliffhanger framed by the audience itself.
- **Deploy in Katha:** Episode-1-to-Episode-2 cliffhangers can structure themselves around a question the *player* will carry between sessions, not a question the character asks.

---

### M-2 — Padmaavat (2018) / Bajirao Mastani (2015)

- **Voice signature:** Bhansali period-poetic. Long sentences, heavy ornamentation, Urdu-Hindi balance leaning Urdu. Characters address each other by title before name. Volume is theatrical-controlled.
- **Code-switch ratio:** 100% Hindi/Urdu blend. Zero English. Heavy Persian-origin vocabulary.
- **Technique:** Honorific address as weight. "Maharaj," "Sardar," "Devi" — the title does the work the modern reader has to feel rather than understand.
- **Deploy in Katha:** Use sparingly — too much title-address reads as costume drama parody. Reserve for one or two key honorific moments per episode, not throughout. The modern Katha protagonist should *struggle* with how to address cosmic figures, not slip into period-formal automatically.

---

### M-3 — PK (2014)

- **Line:** "Galat number." ✓
- **Speaker → Listener:** PK (the alien character) → various devotees and temple-goers
- **Situation:** PK has concluded that prayer is a phone call, and that all calls go to the wrong number. The line is a recurring deflation of religious certainty.
- **Register:** Bhojpuri-inflected naïveté. Simple Hindi, child-vocabulary, total literalism.
- **Code-switch ratio:** ~90% Hindi, 10% English ("number" — the load-bearing word).
- **Technique:** Defamiliarisation through naïveté. A character literalises something everyone else treats metaphorically. The naïveté *is* the critique.
- **Deploy in Katha:** Midpoint scenes where a mythology episode risks feeling preordained. Bring in an outsider character — or let the protagonist function as the outsider — who treats the cosmic literally. The naïveté creates space for player choice to *matter* against cosmic destiny.

---

### M-4 — OMG — Oh My God! (2012)

- **Voice signature:** Religious authority interrogated through legal-modern Hindi. When the Krishna character speaks, he speaks in *cinematic-modern* Hindi, not Sanskrit or formal-devotional. A god who sounds like a friend.
- **Technique:** Bring the cosmic into mundane registers. A deity who speaks like a peer is more interesting than a deity who speaks like a Doordarshan serial. The friendliness is the strangeness.
- **Deploy in Katha:** When introducing supernatural characters in MYTHOLOGY, let them be *casual.* The casualness is the cosmic strangeness — Katha mythology should not announce its supernatural through music or formal register, but through the wrong-ness of small things: a god who orders chai, a sage who has a missed-call notification on his phone, a guardian whose Hindi is *too* contemporary for what he is.

---

### M-5 — Devon Ke Dev Mahadev (TV, 2011-14) — anti-reference

- **Voice signature:** Mythology-TV register. Long pauses, music-dependent, characters declaim rather than converse.
- **Honest deploy note:** This register does *not* work for a mobile interactive fiction app. It is too slow, too performed, too dependent on the music bed it ships with. Katha mythology should explicitly *not* sound like this.
- **Use as:** A negative example. The model should learn what NOT to do. Tag this as anti-pattern in the prompt: "Avoid the mythology-TV register — slow declamation, ornamental Sanskrit, music-dependent gravitas. Katha mythology must work without a music bed."

---

### Mythology voice — language summary

Because the Bollywood corpus runs thin here, the working principle for Katha MYTHOLOGY is a *prescription*, not a transcription:

1. **Modern Indian character + supernatural disruption + casual register for the supernatural.** Don't announce the supernatural through music or vocabulary. Announce it through *physical wrongness* — crows that don't move, water against current, a tattoo matching an ancient inscription.
2. **The cosmic character speaks like a person, not like a TV deity.** Maximum one Sanskrit word per scene. The supernatural is more frightening when it is *grammatical*.
3. **The mortal character does not believe at first.** Resistance is the voice. Belief comes through bodily evidence (a fever, a vision, a wound that shouldn't heal but does).
4. **One title-honorific per story, maximum.** Overuse turns mythology into period parody.
5. **Use the protagonist as the naïve outsider** (like PK) — let them ask the literal question that mythological characters wouldn't think to ask.

The mythology entries in `golden-scenes-v1.md` (M-1, M-2, M-3) are written in this target voice. Treat them, not the Bollywood references, as the primary reference until the dialogue library expands.

---

## Cross-genre language principles (deploy in Stateless Screenwriter system prompt)

Lift these directly into the production prompt as explicit rules:

1. **Code-switching point is the emotional load-bearing wall.** The Hindi-English switch happens *at* the word carrying the most emotion. Switching at random words produces auto-translated-feeling prose. Train the model to identify the emotionally loaded word and code-switch *there*.

2. **Concrete object similes beat adjective declarations.** "She was scared" is weak. "She was like a glass placed too close to a table edge" is strong. Object-based imagery is the dominant Indian dialogue technique — across all three genres.

3. **Repetition with one altered element does the emotional work.** "Ja Simran, ja." "Peete hain ki yahan baith sake, tumhe dekh sake, tumhe bardasht kar sake." "Bahut acha. Bahut acha." Repeat one structural unit, change one element — the variation carries the meaning.

4. **The shortest sentence in the scene should be the heaviest.** All landing lines across these references are short. The model should learn to land scenes on the shortest possible final sentence — never a long elaborate one.

5. **Politeness scales with stakes.** In thriller, the more dangerous the moment, the more formal the grammar. In romance, the more vulnerable the moment, the more colloquial. In mythology, the more cosmic the moment, the more casual the supernatural character. Each genre has its own politeness-stakes curve.

6. **Address ≫ Description.** Characters address each other by name, title, or relation before describing them. "Beta," "Sir," "Bhaiya," "Madam," "Yaar" — the form of address carries class, age, intimacy, and threat-level. A scene without a single direct address feels disembodied.

---

## Expansion plan

This is **v1**. To grow this library:

1. Watch 3-5 specific films per genre with a notebook. For each scene that lands, transcribe the line, the situation, the register, the technique.
2. Add 8-10 more references per genre, especially for MYTHOLOGY where the Bollywood gap is real.
3. Hire one writer (ideally a screenwriter who has worked in Hindi film/web) to do this pass. ~2 weeks.
4. Once volume is enough, re-tag everything by *technique cluster* and let retrieval pull by technique, not just by genre.

**Reviewer note:** Verify the ≈ lines before training use. The ✓ lines are high-confidence. The annotations (register, situation, deploy-in-Katha) are the actually-useful part — those are what teach the engine *what kind of language to use, when*.
