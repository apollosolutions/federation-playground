---
id: NO_QUERIES
codes: [NO_QUERIES]
summary: >
  No subgraph defines a Query type with at least one field. Federation
  composition requires at least one queryable root field.
suggestion: >
  Add at least one field to a Query type in any subgraph. The Federation
  Playground auto-injects a dummy `type Query { _playground_health_check: String }`
  if none is present, so this error should only appear if all subgraphs have
  parse errors or empty schemas.
docsUrl: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/errors#no_queries
---

## Pattern: `NO_QUERIES`

### What causes it

Apollo Federation composition requires that the composed supergraph exposes at least one field on the `Query` type. If no subgraph defines `type Query { ... }` with at least one field, composition fails with `NO_QUERIES`.

### Playground behavior

The Federation Playground **auto-injects** a dummy Query type when none is present:

```graphql
type Query { _playground_health_check: String }
```

This is injected into the first subgraph and flagged with a `PLAYGROUND_AUTO_QUERY` hint in the response. This means agents building minimal reproduction schemas for entity/directive issues don't need to manually add a Query type.

### When you still see this error

If `NO_QUERIES` appears despite the auto-injection, the likely causes are:

1. **All subgraphs fail to parse** — a SDL syntax error prevents the auto-injected Query from being recognized.
2. **The Query type has zero fields** — `type Query {}` is present but empty (no fields = same as absent).
3. **Schema is completely empty** — an empty string `""` as the schema for all subgraphs.

### Fix for real schemas

Add a meaningful Query field to at least one subgraph:

```graphql
type Query {
  myEntity(id: ID!): MyEntity
}
```
