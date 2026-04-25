# Visual Convergence Step

This step applies after implementation of any task that produces visible UI.
It is distinct from automated QA. It completes when the developer signs off, not when tests pass.

## The agent's role
Execute visual changes precisely as specified. Do not make unrequested changes.
Make sensible default choices for unspecified details (spacing, sizing, alignment).
Do not ask for approval on implementation details — make a decision and note it.

## The process

### Round 1 — Initial render
Implement the feature. Apply sensible visual defaults. 
Ask the developer: "Here's what I decided on [list 2-3 notable choices]. What are the biggest visual issues?"

### Subsequent rounds
Receive a list of issues from the developer. Fix all of them in one batch.
Ask: "Fixed. Anything else, or are we done?"

### Exit condition
The developer says "done" or "good enough." 
Do not ask more than 3 times total. If issues remain after round 3, log them as known issues and move on.
Scope creep is a risk. Convergence, not perfection.

## What the developer controls
- Whether something looks right
- When to stop
- Any change they specifically request

## What the agent controls
- How to implement a requested change
- Unspecified details (padding values, exact pixel sizes, border radius)
- Suggesting when diminishing returns have set in