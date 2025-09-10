const DATABASE_SCHEMA = process.env.DATABASE_SCHEMA;

if (!DATABASE_SCHEMA) {
  throw new Error(
    "DATABASE_SCHEMA is not set. Make sure it is the same schema name used in production usually deployment id",
  );
}

globalThis.PONDER_NAMESPACE_BUILD = {
  schema: DATABASE_SCHEMA,
};
