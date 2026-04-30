---
id: EXTERNAL_KEY_WITH_REQUIRES
codes: [SATISFIABILITY_ERROR]
match: "key field.*@external|accidentally marked @external|key.*@external.*@requires|@requires.*@external.*key"
summary: >
  A subgraph marks its @key field as @external AND uses @requires. The query
  planner cannot enter that subgraph via its own key, making @requires
  dependencies unsatisfiable.
suggestion: >
  Remove @external from the @key field. Change `id: ID! @external` to `id: ID!`
  in any subgraph that also uses @requires. The subgraph can still participate
  in entity resolution without owning the field's upstream data.
affectedVersions: ["2.3.0", "2.13.3"]
docsUrl: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors#satisfiability_error
---

## Pattern: `@external` on `@key` field with `@requires`

### What causes it

When a subgraph declares an entity with:

1. A `@key` field marked `@external` — meaning the subgraph does not own or resolve that field, and
2. A `@requires` directive on another field referencing `@external` fields

...the query planner cannot construct a valid execution path. To satisfy `@requires`, the planner needs to fetch a prerequisite field from another subgraph first, then return to this subgraph. Returning requires entering the subgraph via its `@key` — but if the key is `@external`, the planner treats the subgraph as unable to resolve entity lookups by that key.

### Minimal reproduction

```graphql
# authz-api — works fine in isolation
type EmployerJob @key(fields: "id") {
  id: ID! @external          # <-- @external on @key
  checkReadJobPermission: String! @inaccessible
}

# employer-api — this subgraph triggers the error
type EmployerJob @key(fields: "id") {
  id: ID! @external          # <-- @external on @key (the problem)
  title: String @external
  employerName: String @requires(fields: "title")
}
```

With only 2 subgraphs (one owning `id`, one with `@external id`), composition may succeed because the path is simple enough. The error reliably appears with 3+ subgraphs where multiple entities have this pattern.

### Why errors explode in large schemas

The satisfiability checker enumerates every possible query path that could satisfy each `@requires` dependency. In a schema with many subgraphs and many fields, this can produce thousands of errors (e.g. ~94,000 lines in real-world cases). All of them trace back to the same root cause. **Fix the `@external` on `@key` in the offending subgraph and all downstream errors disappear.**

### Fix

```graphql
# employer-api — corrected
type EmployerJob @key(fields: "id") {
  id: ID!                    # removed @external
  title: String @external
  employerName: String @requires(fields: "title")
}
```

### Observed versions

Reproduced on Federation 2.3.0 and 2.13.3+. The satisfiability checker behavior is consistent across v2.x releases — this is a schema authoring error, not a version-specific bug.

### Customer notes

- The 2-subgraph minimal reproduction a customer provides may compose successfully.
  Always test with 3+ subgraphs when `@requires` + `@external @key` is suspected.
- `@inaccessible` on related fields is a red herring — the issue is purely `@external` on `@key`.
- Nullability of the `@key` field is not a factor.
