---
id: SATISFIABILITY_ERROR_EXPLOSION
codes: [SATISFIABILITY_ERROR]
matchErrorCount: 20
summary: >
  A large number of SATISFIABILITY_ERRORs (20+) appeared at once. This is a
  combinatorial explosion: one root-cause schema authoring error generates errors
  for every affected query path.
suggestion: >
  Focus on fixing the first 3-5 errors. The rest are downstream consequences
  of the same root cause. Look for @external on @key fields with @requires
  (see EXTERNAL_KEY_WITH_REQUIRES pattern), or circular @requires chains.
docsUrl: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors#satisfiability_error
---

## Pattern: SATISFIABILITY_ERROR explosion

### What causes it

The Federation satisfiability checker validates every possible query execution path. When a schema has a structural issue — most commonly `@external` on `@key` fields combined with `@requires` — the checker generates an error for every path that would fail, not just one error per root cause.

In real-world large schemas (many subgraphs, many entities), this can produce:
- Hundreds to thousands of `SATISFIABILITY_ERROR` entries
- Error payloads of 10MB+ (observed: ~94,000 lines / ~19MB in at least one production case)
- Schema checks that hang forever in "PENDING" state in Apollo Studio, because the large error payload overwhelms the processing pipeline before it can reach "complete" or "failed"

### How to triage

1. Look at the **first few errors** only. The error message will name the specific field and subgraph.
2. Check if the error message mentions: `"please ensure that this is not due to key field '...' being accidentally marked @external"` — if so, see **EXTERNAL_KEY_WITH_REQUIRES**.
3. Fix the root cause in the schema and recompose. If the error count drops dramatically or goes to zero, you found it.
4. If errors persist after fixing `@external @key`, look for circular `@requires` chains or missing entity representations.

### Studio hang behavior

When error payloads are very large, Apollo Studio's schema check pipeline may stall indefinitely in "PENDING". The underlying cause is still the schema error — Studio is not the root cause. The fix is to resolve the composition errors so the check produces a manageable response.
