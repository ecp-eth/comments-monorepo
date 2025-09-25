import * as Sentry from "@sentry/node";
import { CommentSelectType } from "ponder:schema";
import type {
  CommentReferencesResolutionServiceResolveFromCacheFirstParams,
  CommentReferencesResolutionServiceResolveFromCacheFirstResult,
  ICommentReferencesResolutionService,
} from "./types.ts";
import { IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
import type {
  ENSByAddressResolver,
  ENSByNameResolver,
  FarcasterByAddressResolver,
  ERC20ByTickerResolver,
  ERC20ByAddressResolver,
  URLResolver,
  FarcasterByNameResolver,
} from "../resolvers/index.ts";
import { CommentReferencesCacheService } from "./comment-references-cache-service.ts";

/**
 * Type for a collection of comment reference resolvers
 */
type CommentReferencesResolvers = {
  ensByAddressResolver: ENSByAddressResolver;
  ensByNameResolver: ENSByNameResolver;
  erc20ByAddressResolver: ERC20ByAddressResolver;
  erc20ByTickerResolver: ERC20ByTickerResolver;
  farcasterByAddressResolver: FarcasterByAddressResolver;
  farcasterByNameResolver: FarcasterByNameResolver;
  urlResolver: URLResolver;
};

type ResolveCommentReferencesHelper = (
  comment: Pick<CommentSelectType, "content" | "chainId">,
  options: CommentReferencesResolvers,
) => Promise<{
  references: IndexerAPICommentReferencesSchemaType;
  status: CommentSelectType["referencesResolutionStatus"];
}>;

type CommentReferencesResolutionServiceOptions = {
  resolveCommentReferences: ResolveCommentReferencesHelper;
  commentReferencesResolvers: CommentReferencesResolvers;
  commentReferencesCacheService: CommentReferencesCacheService;
};

export class CommentReferencesResolutionService
  implements ICommentReferencesResolutionService
{
  private resolveCommentReferences: ResolveCommentReferencesHelper;
  private commentReferencesResolvers: CommentReferencesResolvers;
  private commentReferencesCacheService: CommentReferencesCacheService;

  constructor(options: CommentReferencesResolutionServiceOptions) {
    this.resolveCommentReferences = options.resolveCommentReferences;
    this.commentReferencesResolvers = options.commentReferencesResolvers;
    this.commentReferencesCacheService = options.commentReferencesCacheService;
  }

  /**
   * Resolve references from cache first, only fetch from network if not in cache
   * @returns The references and status
   */
  async resolveFromCacheFirst({
    commentId,
    commentRevision,
    ...rests
  }: CommentReferencesResolutionServiceResolveFromCacheFirstParams): Promise<CommentReferencesResolutionServiceResolveFromCacheFirstResult> {
    const cachedReferences =
      await this.commentReferencesCacheService.getReferenceResolutionResult({
        commentId,
        commentRevision,
      });

    if (cachedReferences) {
      return {
        references: cachedReferences.references,
        status: cachedReferences.referencesResolutionStatus,
      };
    }

    try {
      const latestReferenceResult = await this.resolveCommentReferences(
        {
          ...rests,
        },
        this.commentReferencesResolvers,
      );

      await this.commentReferencesCacheService.updateReferenceResolutionResult({
        commentId,
        commentRevision,
        references: latestReferenceResult.references,
        referencesResolutionStatus: latestReferenceResult.status,
      });

      return latestReferenceResult;
    } catch (error) {
      console.error(error);

      Sentry.captureException(error, {
        extra: {
          commentId,
        },
      });

      const failedReferenceResult = {
        references: [],
        status: "failed" as const,
      };

      await this.commentReferencesCacheService.updateReferenceResolutionResult({
        commentId,
        commentRevision,
        references: failedReferenceResult.references,
        referencesResolutionStatus: failedReferenceResult.status,
      });

      return failedReferenceResult;
    }
  }
}
