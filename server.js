const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════
// INPUT VALIDATION
// ═══════════════════════════════════════════════════════

const MASH_PATTERNS = [
  'qwerty','qwert','werty','erty','rtyu','tyui','yuio','uiop',
  'asdf','asdfg','sdfgh','dfgh','fghj','ghjk','hjkl',
  'zxcv','zxcvb','xcvbn','cvbn','vbnm',
  'abcd','abcde','abcdef','bcde','cdef',
  'qazwsx','wsxedc','edcrfv',
  '12345','123456','1234','2345','3456','4567','5678',
  '11111','22222','33333','44444','55555','66666','77777','88888','99999','00000',
  'aaaa','bbbb','cccc','dddd','eeee','ffff','gggg','hhhh','iiii','jjjj',
  'kkkk','llll','mmmm','nnnn','oooo','pppp','qqqq','rrrr','ssss','tttt',
  'uuuu','vvvv','wwww','xxxx','yyyy','zzzz',
];

function validateIdea(raw) {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  const idea = raw.trim();

  // 1. Presence
  if (!idea) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 2. Min length
  if (idea.length < 5) {
    return { valid: false, reason: 'Topic is too short. Please be more specific.' };
  }

  // 3. Max length
  if (idea.length > 300) {
    return { valid: false, reason: 'Topic is too long. Please keep it under 300 characters.' };
  }

  const lower = idea.toLowerCase();
  const letters = (idea.match(/[a-zA-Z]/g) || []);
  const letterCount = letters.length;
  const digitCount  = (idea.match(/\d/g) || []).length;

  // 4. Must have letters
  if (letterCount === 0) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 5. Mostly digits
  if (digitCount > letterCount) {
    return { valid: false, reason: 'Please enter a meaningful topic, not numbers.' };
  }

  // 6. Must have at least one vowel
  if (!/[aeiou]/i.test(idea)) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 7. Repeated character run (4+ identical chars in a row)
  if (/(.)\1{3,}/.test(lower)) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 8. Keyboard mash — applied strictly to single-token inputs
  const tokens = lower.split(/[\s,.\-!?;:]+/).filter(Boolean);
  const isSingleToken = tokens.length === 1;

  if (isSingleToken) {
    for (const pat of MASH_PATTERNS) {
      if (lower.includes(pat)) {
        return { valid: false, reason: 'Please enter a meaningful topic.' };
      }
    }
  }

  // 9. Garbage-character density — catches "ghgij,k", "!!##$$"
  const nonWordChars = (idea.match(/[^a-zA-Z0-9\s'"\-.,!?]/g) || []).length;
  if (nonWordChars > 3 && nonWordChars / idea.length > 0.3) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 10. Low unique-letter ratio for single tokens (catches "xkqpz", "bbnmm")
  if (isSingleToken && letterCount >= 4) {
    const uniqueLetters = new Set(lower.replace(/[^a-z]/g, '')).size;
    if (uniqueLetters / Math.min(letterCount, 10) < 0.25) {
      return { valid: false, reason: 'Please enter a meaningful topic.' };
    }
  }

  // 11. At least one token with 3+ letters (rules out "a b 1 c")
  const hasRealWord = tokens.some(tok => {
    const lOnly = tok.replace(/[^a-z]/g, '');
    return lOnly.length >= 3;
  });

  if (!hasRealWord) {
    return { valid: false, reason: 'Please enter a meaningful topic.' };
  }

  // 12. Alternating-pair nonsense: ghgh, ghgijij, etc.
  // Detect when the string is dominated by repeating 2–3 char patterns
  if (isSingleToken && letterCount >= 4) {
    const letOnly = lower.replace(/[^a-z]/g, '');
    // Check for 2-char repeat: abababab
    const twoChar = letOnly.slice(0, 2);
    if (twoChar.length === 2) {
      const repeated = twoChar.repeat(Math.ceil(letOnly.length / 2)).slice(0, letOnly.length);
      if (repeated === letOnly) {
        return { valid: false, reason: 'Please enter a meaningful topic.' };
      }
    }
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════
// RANDOM PICKER
// ═══════════════════════════════════════════════════════

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ═══════════════════════════════════════════════════════
// LEARNING MODE
// ═══════════════════════════════════════════════════════

const learning = {
  hook: {
    titles: [
      t => `The ${t} Mistake That's Costing You More Than You Think`,
      t => `Why 95% of People Never Get Good at ${t}`,
      t => `Everything You've Been Taught About ${t} Is Incomplete`,
      t => `The Counterintuitive Truth About ${t} No One Explains`,
      t => `You're Probably Approaching ${t} All Wrong`,
      t => `What School Never Taught You About ${t}`,
      t => `The ${t} Paradox: Why Trying Harder Backfires`,
    ],
    bodies: [
      t => `Here's the uncomfortable reality: most people spend years practicing ${t} and still plateau. Not because they lack talent or drive — but because the foundational mental model they're using is quietly broken. Fix the model, and everything else clicks into place.`,
      t => `The mainstream advice on ${t} is optimised for looking productive, not for getting results. It sounds logical. It feels like progress. But it systematically skips the one lever that actually moves the needle. This deck is about that lever.`,
      t => `Spend five minutes searching for ${t} tips and you'll find hundreds of frameworks, tools, and routines. Spend five years applying them and you'll discover most share the same invisible flaw. Let's name that flaw — and build around it.`,
      t => `There are two types of people studying ${t}: those collecting information, and those building understanding. They look identical from the outside. Their results, six months in, are completely different. The difference lives in one habit most people skip entirely.`,
      t => `${t} rewards depth, not breadth. Almost every popular resource defaults to breadth — lists, tips, hacks, shortcuts. This deck ignores all of that and goes straight to the root. Fair warning: it's less comfortable but far more useful.`,
    ],
  },
  problem: {
    titles: [
      t => `The Hidden Flaw in How Most People Learn ${t}`,
      t => `Why Your ${t} Progress Keeps Stalling`,
      t => `The Structural Problem with ${t} Advice Online`,
      t => `What Makes ${t} Hard (That Nobody Admits)`,
      t => `The ${t} Plateau: Why It Happens and Who It Traps`,
    ],
    bodies: [
      t => `The core problem with ${t} isn't a lack of resources — it's that most resources are designed to generate engagement, not comprehension. They optimise for the dopamine hit of feeling like you've learned something. Real understanding of ${t} is slower, less satisfying at first, and dramatically more durable.`,
      t => `Most ${t} advice skips prerequisites. It assumes you already have the foundational habits — clear goals, feedback loops, deliberate review — when in reality, those are the exact things people are missing. The advice lands on soft ground and washes away within weeks.`,
      t => `There's a specific trap in ${t} called the competence illusion: the more you consume about it, the more fluent your surface-level vocabulary becomes, tricking you into thinking you understand more than you do. Recognition isn't recall.`,
      t => `The hardest part of ${t} isn't the advanced material — it's the intermediate phase where novelty has worn off but mastery hasn't arrived. Most people quietly give up here and mistake it for personal failure. It's a completely normal phase, and there's a proven way to push through it.`,
      t => `With ${t}, effort is often inversely correlated with efficiency. The people who work hardest frequently produce the worst results, because intensity without direction just cements bad habits faster.`,
    ],
  },
  insight: {
    titles: [
      t => `The Single Principle That Accelerates ${t} Mastery`,
      t => `What Experts Actually Do Differently with ${t}`,
      t => `The Mental Model That Changes Everything in ${t}`,
      t => `How to Think About ${t} Like a Practitioner`,
      t => `The Compounding Variable Most ${t} Learners Ignore`,
    ],
    bodies: [
      t => `Retrieval practice is the most underused tool in ${t}: the act of recalling information strengthens the neural pathway far more than re-reading ever does. Switch from passive consumption to active reconstruction — testing yourself, teaching others, applying without notes — and your retention of ${t} concepts multiplies dramatically.`,
      t => `Experts in ${t} don't just know more — they've organised what they know differently. Where beginners store isolated facts, experts store interconnected patterns. When learning ${t}, always ask "what existing pattern does this resemble?" not just "what does this mean?"`,
      t => `There's a deceptively simple rule governing progress in ${t}: clarity of feedback determines speed of improvement. When you can tell precisely what went wrong and why, you course-correct fast. When feedback is vague or delayed, you repeat errors for months.`,
      t => `The most underrated variable in ${t} is spacing. Not how much you study, but how you distribute it over time. A concept reviewed once a week for four weeks is retained far longer than one reviewed four times in a single session.`,
      t => `In ${t}, the transfer gap is where most learning dies: people understand something in context but fail to apply it when the surface looks different. Closing this gap requires deliberately varied practice — same principle, different scenarios.`,
    ],
  },
  example: {
    titles: [
      t => `A Concrete Example: ${t} Applied Correctly`,
      t => `How One Learner Broke Through Their ${t} Plateau`,
      t => `${t} in Practice: Before and After the Shift`,
      t => `What Deliberate ${t} Practice Actually Looks Like`,
      t => `The Case Study That Illustrates ${t} Best`,
    ],
    bodies: [
      t => `Consider a learner who had spent eight months studying ${t} with no visible progress. The change that broke the pattern was deceptively small: they stopped adding new material entirely for three weeks and focused exclusively on reconstructing what they already knew — from memory, on a blank page. Retention doubled. Application became automatic.`,
      t => `Two people, same starting point, six months of ${t} practice. One consumes everything available. The other consumes half as much but reconstructs, applies, and reviews what they consume. At month six, the second person isn't just ahead — they're operating at a different level entirely.`,
      t => `The shift looks like this: before, a ${t} session meant watching or reading until time ran out. After, the same session starts with a blank page and one question — "what do I already know about this?" Output-first learning changes everything about how ${t} concepts stick.`,
      t => `Effective ${t} practice sounds like this from the inside: "I'm not sure if I've got this right — let me try to explain it as if I'm teaching someone, then check." That habit of resolving productive uncertainty before moving on is the most reliable accelerant in any ${t} discipline.`,
    ],
  },
  takeaway: {
    titles: [
      t => `Your Actionable Framework for ${t} — Starting Today`,
      t => `The 3-Part System That Makes ${t} Stick`,
      t => `How to Apply This to Your ${t} Practice Right Now`,
      t => `The ${t} Protocol Worth Building Into Your Week`,
      t => `One Week to a Better ${t} System — Here's How`,
    ],
    bodies: [
      t => `This week, restructure one ${t} session: spend the first 10 minutes writing everything you already know — no notes. Spend the next 20 minutes filling the gaps. Spend the final 5 minutes writing one question you'll answer before your next session. Do this three times before adding anything new.`,
      t => `Three moves, in order. First: pick one important ${t} concept and explain it out loud as if teaching a 12-year-old. Note where you stumble — those are your real gaps. Second: close the gaps before moving on. Third: wait 48 hours, then reproduce the explanation from scratch. Repeat.`,
      t => `Start with an audit: list every resource and routine in your current ${t} practice. For each, ask — is this helping me produce something, or helping me consume more comfortably? Cut everything in the second category for 30 days. Rebuild from what remains.`,
      t => `The most important ${t} commitment this month isn't to learn more — it's to review what you've already learned, more strategically. Block 15 minutes weekly for one question: "What have I encountered in ${t} this week that I could reconstruct from memory right now?"`,
    ],
  },
};

// ═══════════════════════════════════════════════════════
// STORY MODE
// ═══════════════════════════════════════════════════════

const story = {
  hook: {
    titles: [
      t => `The Day I Realised I'd Been Doing ${t} All Wrong`,
      t => `I Almost Quit ${t} Three Times. Then This Happened.`,
      t => `Nobody Warned Me ${t} Would Be This Hard`,
      t => `The Embarrassing ${t} Moment That Changed Everything`,
      t => `I Thought I Was Good at ${t}. I Was Humbled Fast.`,
      t => `Three Years Into ${t} and I Was Back at Zero`,
    ],
    bodies: [
      t => `I remember the exact Tuesday afternoon I admitted it: everything I'd built around ${t} wasn't working. Not because I hadn't tried — I'd tried obsessively. It wasn't working because I'd been measuring the wrong thing entirely, for longer than I wanted to admit.`,
      t => `There's a specific kind of tired you get from working hard at ${t} without results. It's not physical. It's the exhaustion of sustained hope repeatedly disappointed. I lived there for almost two years. What pulled me out was one conversation with someone who had already made the mistake I was making.`,
      t => `My lowest point with ${t} came during a week when I was technically doing everything right. The routine, the resources, the accountability. I was consistent. And nothing was moving. I was optimising a flawed system with tremendous efficiency. The problem wasn't my execution. It was the map.`,
      t => `I used to describe myself as someone who "was working on" ${t}. That phrase was doing a lot of work for me — it sounded like progress without requiring any. The day I stopped using it and started asking "what specifically has changed this week?" was the day everything shifted.`,
    ],
  },
  problem: {
    titles: [
      t => `The Part of ${t} Nobody Prepared Me For`,
      t => `Where My ${t} Journey Completely Fell Apart`,
      t => `The Thing That Was Quietly Sabotaging My ${t}`,
      t => `How I Got Stuck in ${t} and Didn't Even Realise It`,
      t => `The Mistake I Made at ${t} That I'm Still Unpacking`,
    ],
    bodies: [
      t => `The problem wasn't commitment. I was deeply committed to ${t}. The problem was that I'd confused commitment with direction. I was running hard, every day, in a circle. The moment I stopped and asked "where am I actually trying to get to?" — that question broke me open.`,
      t => `I spent a long time consuming everything I could find about ${t}. Courses, books, conversations, frameworks. I was full of it. And yet the moment anyone asked me to demonstrate ${t} in a new situation, I froze. I knew the language. I didn't have the capability.`,
      t => `Here's what was quietly destroying my progress in ${t}: I was advancing the parts I was already good at and avoiding the parts that felt uncertain. I was building an elaborate fortress around my comfort zone and calling it growth.`,
      t => `The hardest thing to admit about my ${t} journey is how long I mistook busyness for progress. I had full calendars, consistent habits, impressive-looking inputs. The one thing missing was honest output. I wasn't developing ${t} — I was performing it.`,
    ],
  },
  insight: {
    titles: [
      t => `The Moment ${t} Finally Started Making Sense to Me`,
      t => `What Actually Shifted My Relationship with ${t}`,
      t => `The Conversation That Rewired How I Think About ${t}`,
      t => `When I Stopped Fighting ${t} and Started Working With It`,
      t => `The Tiny Reframe That Made ${t} Click`,
    ],
    bodies: [
      t => `Someone I respected told me something about ${t} I wasn't ready to hear: "You're not stuck because you don't know enough. You're stuck because you're not letting yourself not know." What they were pointing at was my relationship with uncertainty in ${t} — I was treating it as a problem to eliminate, when real progress required treating it as information to use.`,
      t => `The shift happened during an ordinary practice session. I was working through something in ${t} and instead of reaching for my notes — which I always did — I just sat with not knowing. And then something I hadn't consciously memorised surfaced on its own. That experience told me more about how ${t} actually gets internalised than anything I'd read.`,
      t => `The mentor who changed my ${t} practice gave me one question: "What would I do differently if I trusted myself here?" Most of the complexity I'd built around ${t} turned out to be sophisticated procrastination. The thing I was avoiding doing was usually the next right step.`,
      t => `I realised I'd been treating ${t} as a performance for external validation rather than a practice for internal development. Once I stopped measuring myself against others, the quality of my attention completely changed. I stopped performing competence and started developing it.`,
    ],
  },
  example: {
    titles: [
      t => `The Week Everything Changed in My ${t} Practice`,
      t => `What I Actually Did Differently with ${t}`,
      t => `A Before-and-After from My Own ${t} Journey`,
      t => `The Specific Thing I Tried That Finally Worked for ${t}`,
      t => `How I Rebuilt My Entire Approach to ${t} in 30 Days`,
    ],
    bodies: [
      t => `In the first week of rebuilding, I stopped all input. No new ${t} content. I spent an hour every morning writing down what I already understood — then 20 minutes identifying the exact edge of that understanding. Where did confidence stop and bluffing start? Locating that boundary precisely was more valuable than any new material.`,
      t => `The before: a ${t} routine that felt productive but produced nothing tangible. The after: I traded most of the routine for one weekly ritual — producing something real with what I knew, then sharing it with someone who could push back. The fear was enormous. The growth was immediate.`,
      t => `Thirty days. That's how long I gave myself to test the new ${t} approach before evaluating it. Week one was disorienting. Week two was boring. Week three, something started to consolidate. Week four, I looked at what I'd produced and didn't recognise how far I'd moved.`,
      t => `I found someone two years further along in ${t} and asked if I could show them my work once a month — not for encouragement, but for honest assessment. The first session was quietly devastating. The second was clarifying. The third was energising.`,
    ],
  },
  takeaway: {
    titles: [
      t => `What I'd Tell Someone Starting ${t} Right Now`,
      t => `The ${t} Advice I Wish Someone Had Given Me Earlier`,
      t => `If I Had to Start My ${t} Journey Over, Here's What I'd Do`,
      t => `The One Thing That Would Have Saved Me Years in ${t}`,
      t => `For Anyone Who Feels Lost in ${t}: Read This`,
    ],
    bodies: [
      t => `I'd tell them: expect to feel competent about ${t} before you are. That gap between feeling competent and being competent is where most people get derailed. Build your feedback systems first, before your content systems. Know how you'll find out you're wrong faster than you build the habit of thinking you're right.`,
      t => `Start with the question no one asks early enough: "What would good actually look like for me in ${t}?" Not a generic answer. Your answer. Specific, personal, concrete. Every time you encounter new ${t} advice, run it through that filter. Most of it will be irrelevant to your specific version of good.`,
      t => `If I started ${t} again, I'd build the output habit in week one — before I felt ready, before I understood enough, before I was confident. The discomfort of producing early is the fastest teacher available. I spent eighteen months feeling like I needed more input. I didn't.`,
      t => `The plateaus in ${t} aren't failures. They're integration phases. Your system is consolidating what it already has before it can absorb what's next. Fighting a plateau makes it longer. The right move is to stop adding and start using — produce, apply, teach, demonstrate.`,
    ],
  },
};

// ═══════════════════════════════════════════════════════
// GENERATOR
// ═══════════════════════════════════════════════════════

function generateSlides(topic, mode) {
  const bank = mode === 'story' ? story : learning;
  const keys = ['hook', 'problem', 'insight', 'example', 'takeaway'];
  const meta = [
    { label: 'HOOK',     icon: '⚡' },
    { label: 'PROBLEM',  icon: '🔍' },
    { label: 'INSIGHT',  icon: '💡' },
    { label: 'EXAMPLE',  icon: '🎯' },
    { label: 'TAKEAWAY', icon: '🚀' },
  ];

  return keys.map((key, i) => {
    const titleFn = rnd(bank[key].titles);
    const bodyFn  = rnd(bank[key].bodies);
    const title   = typeof titleFn === 'function' ? titleFn(topic) : `${meta[i].label} for ${topic}`;
    const body    = typeof bodyFn  === 'function' ? bodyFn(topic)  : `Explore ${topic} in depth.`;
    return {
      label: meta[i].label,
      icon:  meta[i].icon,
      title: title || `${meta[i].label} — ${topic}`,
      body:  body  || `Content about ${topic}.`,
    };
  });
}

// ═══════════════════════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════════════════════

app.post('/generate', (req, res) => {
  const { idea, mode } = req.body || {};

  const validation = validateIdea(idea);
  if (!validation.valid) {
    return res.status(422).json({ error: validation.reason });
  }

  const resolvedMode = mode === 'story' ? 'story' : 'learning';
  const slides = generateSlides(idea.trim(), resolvedMode);
  res.json({ slides });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// ═══════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✦ AI Social Media Studio backend running at http://localhost:${PORT}`);
});
