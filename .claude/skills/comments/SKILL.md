---
name: comments
description: How a comment earns its place here, and the pass that deletes the ones that don't. Invoke this after writing or editing any comment or doc-comment, before calling the change done.
---

Comments only. `.claude/rules/coding.md` states the standard; this is the pass that applies it, one comment at a time, to a diff you just wrote.

What this exists to catch is not ignorance of the standard — it is grading your own prose in the same breath that produced it. Knowing "delete anything that restates the code" does not make you notice that the sentence you just wrote restates the code. So read each comment against its code cold, and write down a verdict for each. A pass with no written verdicts didn't happen.

## Collect

```bash
git diff -U0 HEAD -- '*.ts' '*.tsx' | grep -E '^(\+\+\+|@@|\+[[:space:]]*(//|/\*|\*))'
```

The `+++` and `@@` lines are kept so each comment carries the file and line it came from. Widen the range (`HEAD~3`, a branch) when the comments under review are already committed.

Then open each one in its file and read the code it sits on. A comment judged from the diff alone is judged without the thing it is supposed to be explaining.

## The pass

Take each comment **sentence by sentence**, not as a block. Delete the sentence and name what a reader gets wrong without it: a wrong edit they would make, a failure they would reintroduce, a contract they would break. If the only answer is "it explains the code", it stays deleted.

A comment usually earns its place on one clause and pads around it. Keep the clause, drop the padding.

## Shapes that keep failing

- **Runway.** An opening sentence paraphrasing the code it sits on, ahead of the sentence that has the point. Start at the point.
- **Signature in prose.** A doc-comment saying in words what the name and the types already say.
- **Said twice.** The same fact at an interface and again at its implementation, or in a doc-comment and again in the body under it. Keep it where someone about to get it wrong is looking, and delete the other. A type that already enforces it needs neither.
- **Block filler.** A line written only so a block isn't empty. Biome permits `catch {}` — leave it empty rather than restating a reason already given above it.
- **Narrated constant.** A line over a constant spelling out its name or its value.

## What survives

- A *why* the code cannot show: the failure that made this branch exist, the interrupted state it recovers from, the order that matters.
- A contract absent from the signature: never throws, mutates its argument, must be called before something else.
- A gotcha in something external: a library option whose effect isn't guessable, a platform limit, a spec's escaping rule.
- A decision that would otherwise be re-litigated: why the obvious simpler thing was not done.

## Report

Per comment: `file:line`, keep or delete, and for a keep the one sentence naming what is lost without it. Apply the deletions — this pass fixes what it finds.
