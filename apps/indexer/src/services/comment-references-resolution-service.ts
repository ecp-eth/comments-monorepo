import * as Sentry from "@sentry/node";
import { type CommentSelectType } from "../../ponder.schema.ts";
import type {
  CommentReferencesResolutionServiceResolveParams,
  CommentReferencesResolutionServiceResolveFromCacheFirstResult,
  ICommentReferencesResolutionService,
  CommentReferencesResolutionServiceResolveFromNetworkResult,
} from "./types.ts";
import { type IndexerAPICommentReferencesSchemaType } from "@ecp.eth/sdk/indexer";
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
import { type ResolveCommentReferencePosition } from "../lib/resolve-comment-references.ts";

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

type ResolveCommentReferencesHelperResult = {
  references: IndexerAPICommentReferencesSchemaType;
  status: "success" | "partial" | "failed";
  allResolvedPositions: ResolveCommentReferencePosition[];
};

type ResolveCommentReferencesHelper = (
  comment: Pick<CommentSelectType, "content" | "chainId">,
  options: CommentReferencesResolvers,
) => Promise<ResolveCommentReferencesHelperResult>;

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
  }: CommentReferencesResolutionServiceResolveParams): Promise<CommentReferencesResolutionServiceResolveFromCacheFirstResult> {
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

  /**
   * Resolve references from network and merge with cached references
   * @param param0
   * @returns
   */
  async resolveFromNetworkFirst({
    commentId,
    commentRevision,
    ...rests
  }: CommentReferencesResolutionServiceResolveParams): Promise<CommentReferencesResolutionServiceResolveFromNetworkResult> {
    let latestReferenceResult: ResolveCommentReferencesHelperResult | undefined;

    try {
      latestReferenceResult = await this.resolveCommentReferences(
        {
          ...rests,
        },
        this.commentReferencesResolvers,
      );
    } catch (error) {
      console.error(error);

      Sentry.captureException(error, {
        extra: {
          commentId,
        },
      });

      latestReferenceResult = {
        allResolvedPositions: [],
        references: [],
        status: "failed",
      };
    }

    switch (latestReferenceResult.status) {
      case "success":
        await this.commentReferencesCacheService.updateReferenceResolutionResult(
          {
            commentId,
            commentRevision,
            references: latestReferenceResult.references,
            referencesResolutionStatus: latestReferenceResult.status,
          },
        );
        return {
          references: latestReferenceResult.references,
          status: latestReferenceResult.status,
        };
      case "partial":
      case "failed": {
        const cachedReferences =
          await this.commentReferencesCacheService.getReferenceResolutionResult(
            {
              commentId,
              commentRevision,
            },
          );

        if (
          !cachedReferences ||
          cachedReferences.referencesResolutionStatus === "failed"
        ) {
          // if no cached references or it was failed then no need to merge,
          // just update the cache and return the result
          await this.commentReferencesCacheService.updateReferenceResolutionResult(
            {
              commentId,
              commentRevision,
              references: latestReferenceResult.references,
              referencesResolutionStatus: latestReferenceResult.status,
            },
          );

          return {
            references: latestReferenceResult.references,
            status: latestReferenceResult.status,
          };
        }

        if (cachedReferences.referencesResolutionStatus === "success") {
          // use return cached success result, no need to update cache with a partial or failed
          return {
            references: cachedReferences.references,
            status: cachedReferences.referencesResolutionStatus,
          };
        }

        // if the cached is a partial but latest is a complete failed, just use the cache, no need to update cache with a failed result
        if (latestReferenceResult.status === "failed") {
          return {
            references: cachedReferences.references,
            status: cachedReferences.referencesResolutionStatus,
          };
        }

        // at least one of the references is partially resolved, let's try to merge the result
        const mergedReferences: IndexerAPICommentReferencesSchemaType = [];

        for (const pos of latestReferenceResult.allResolvedPositions) {
          const foundRef =
            latestReferenceResult.references.find(
              (r) =>
                r.position.start === pos.start && r.position.end === pos.end,
            ) ??
            cachedReferences.references.find(
              (r) =>
                r.position.start === pos.start && r.position.end === pos.end,
            );

          if (foundRef) {
            mergedReferences.push(foundRef);
          }
        }

        const mergedReferencesStatus =
          mergedReferences.length >=
          latestReferenceResult.allResolvedPositions.length
            ? "success"
            : "partial";

        await this.commentReferencesCacheService.updateReferenceResolutionResult(
          {
            commentId,
            commentRevision,
            references: mergedReferences,
            referencesResolutionStatus: mergedReferencesStatus,
          },
        );

        return {
          references: mergedReferences,
          status: mergedReferencesStatus,
        };
      }
      default:
        latestReferenceResult.status satisfies never;
        throw new Error("Invalid status, should never happen");
    }
  }
}
