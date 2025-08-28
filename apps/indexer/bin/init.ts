const ECP_INDEXER_SCHEMA_NAME = process.env.ECP_INDEXER_SCHEMA_NAME;

if (!ECP_INDEXER_SCHEMA_NAME) {
  throw new Error(
    "ECP_INDEXER_SCHEMA_NAME is not set. Make sure it is the same schema name used in production",
  );
}

globalThis.PONDER_NAMESPACE_BUILD = {
  schema: ECP_INDEXER_SCHEMA_NAME,
};
