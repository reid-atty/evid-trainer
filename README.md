# Dragon FRE Engine (V1)

Endless, keyboard-only evidence objection drill app focused on Federal Rules of Evidence with subrules, adaptive spaced repetition, and performance tracking.

## Run

```bash
python3 -m http.server 8080
# open http://localhost:8080
```

## Controls

- `O` = Object
- `N` = No Objection
- If Object, pick family key:
  - `H` hearsay
  - `R` relevance
  - `P` Rule 403/prejudice
  - `C` character/other acts
  - `I` impeachment
  - `F` foundation/personal knowledge
  - `L` leading
  - `S` speculation/opinion
  - `A` authentication/docs
  - `X` exclusion/procedure/privilege bucket
- Then pick subrule via `1..9`
- `G` = force-generate next scenario from OpenAI API (optional; configure in settings)

## Learning loop

- Endless reps
- Embedded micro-AAR every 20 reps or 3 consecutive misses
- Rule-level spaced repetition scheduling across days (stored in localStorage)
- Weak-rule prioritization in queue selection

## Notes

- Includes seed scenarios plus synthetic fallback variants.
- API generation uses `/v1/responses` and expects strict JSON output.
