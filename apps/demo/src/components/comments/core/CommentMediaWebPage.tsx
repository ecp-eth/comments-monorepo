import type { IndexerAPICommentReferenceURLWebPageSchemaType } from "@ecp.eth/sdk/indexer/schemas";

export function CommentMediaWebPage({
  reference,
}: {
  reference: IndexerAPICommentReferenceURLWebPageSchemaType;
}) {
  return (
    <div className="w-full h-full flex flex-col">
      {reference.opengraph?.image && (
        <img
          src={reference.opengraph.image}
          alt={reference.opengraph.title}
          className="w-full h-full object-cover"
        />
      )}
      <span className="text-sm font-medium truncate">
        {reference.opengraph?.title || reference.title}
      </span>
    </div>
  );
}
