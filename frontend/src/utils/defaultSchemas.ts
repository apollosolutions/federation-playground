import type { SubgraphState } from "@/types";

function id(): string {
    return crypto.randomUUID();
}

/** Default shown on first load; change anytime in the toolbar. */
export const DEFAULT_FEDERATION_VERSION = "=2.13.3";

/**
 * Datalist suggestions only (examples of Rover-style values). The toolbar field
 * accepts any string (e.g. `=2.14.1`); you do not need to update this list for new releases.
 */
export const FEDERATION_VERSION_SUGGESTIONS = ["=2.13.3", "2", "1"] as const;

export const DEFAULT_PRODUCTS_SCHEMA = `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key"])

type Query {
  products: [Product!]!
}

type Product @key(fields: "id") {
  id: ID!
  name: String!
  price: Int!
}
`;

export const DEFAULT_REVIEWS_SCHEMA = `extend schema @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@key", "@external"])

type Query {
  reviews: [Review!]!
}

type Review {
  id: ID!
  rating: Int!
  product: Product!
}

type Product @key(fields: "id") {
  id: ID!
  reviews: [Review!]!
}
`;

export const DEFAULT_OPERATION = `query GetProducts {
  products {
    id
    name
    price
    reviews {
      id
      rating
    }
  }
}
`;

export function createDefaultSubgraphs(): SubgraphState[] {
    return [
        {
            id: id(),
            name: "products",
            url: "http://products:4000/graphql",
            schema: DEFAULT_PRODUCTS_SCHEMA,
        },
        {
            id: id(),
            name: "reviews",
            url: "http://reviews:4001/graphql",
            schema: DEFAULT_REVIEWS_SCHEMA,
        },
    ];
}
