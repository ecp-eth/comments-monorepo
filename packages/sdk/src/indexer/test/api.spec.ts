import { describe, it, expect } from "vitest";
import nock from "nock";
import { fetchComment, fetchCommentReplies } from "../api.js";
import type { Hex } from "../../core/schemas.js";

describe("fetchComment", () => {
  it("should fetch a comment", async () => {
    const commentId: Hex =
      "0x9e928d74c573428f69aa87aa084cc801c6c9a9c04c0512813abb3b82fbe1f21e";
    const chainId = 31337;
    const { responseData, expectedFetchResult } =
      getMockFetchCommentResponseData();

    nock("https://api.ethcomments.xyz")
      .get(`/api/comments/${commentId}?chainId=${chainId}`)
      .reply(200, responseData);

    const fetchResult = await fetchComment({
      commentId,
      chainId,
    });

    expect(fetchResult).toStrictEqual(expectedFetchResult);
  });
});

describe("fetchCommentReplies", () => {
  it("should fetch replies for a comment", async () => {
    const commentId: Hex =
      "0x9e928d74c573428f69aa87aa084cc801c6c9a9c04c0512813abb3b82fbe1f21e";
    const chainId = 31337;
    const { responseData, expectedFetchResult } =
      getMockFetchCommentRepliesResponseData();

    nock("https://api.ethcomments.xyz")
      .get(
        `/api/comments/${commentId}/replies?chainId=${chainId}&limit=50&sort=desc`,
      )
      .reply(200, responseData);

    const fetchResult = await fetchCommentReplies({
      commentId,
      chainId,
    });

    expect(fetchResult).toStrictEqual(expectedFetchResult);
  });
});

const responseDataJSONReplacer = (_: unknown, v: unknown) => {
  if (typeof v === "bigint") {
    return v.toString();
  }

  // JSON.stringify always attempt to call value.toJSON on the value and then passing the result to the replacer function
  // so in order to catch Date object in raw form, we need to handle it on its parent level.
  if (v !== null && typeof v === "object") {
    if (Array.isArray(v)) {
      return v;
    }

    return Object.fromEntries(
      Object.entries(v).map(([key, value]) => {
        if (value instanceof Date) {
          return [key, value.toISOString()];
        }
        return [key, value];
      }),
    );
  }

  return v;
};

function getMockFetchCommentResponseData() {
  const expectedFetchResult = {
    app: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
    author: {
      address: "0xc506739d39cbf1d94e2510bfca64cb6015f4bb1b",
      farcaster: {
        fid: 856052,
        pfpUrl:
          "https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/b1ede387-2c8d-4745-4686-ed9aa005a600/original",
        displayName: "Norm's test account",
        username: "normtest",
      },
    },
    id: "0x9e928d74c573428f69aa87aa084cc801c6c9a9c04c0512813abb3b82fbe1f21e",
    channelId: 0n,
    commentType: 0,
    content: "asdadasas1",
    chainId: 31337,
    deletedAt: null,
    logIndex: 0,
    metadata: [],
    hookMetadata: [],
    parentId: null,
    targetUri: "http://localhost:3004/quick-start",
    txHash:
      "0x7666a46c612a7bec2a5bea129c589d46cb6b17549471f92fbffd2b47f260c81b",
    cursor:
      "0x313735333731323531393030303a307839653932386437346335373334323866363961613837616130383463633830316336633961396330346330353132383133616262336238326662653166323165",
    moderationStatus: "approved",
    moderationStatusChangedAt: new Date(),
    moderationClassifierResult: {
      hate: 0,
      spam: 0,
      sexual: 0,
      violence: 0,
      self_harm: 0,
      harassment: 0,
      llm_generated: 0,
      sexual_minors: 0,
      hate_threatening: 0,
      violence_graphic: 0,
    },
    moderationClassifierScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    revision: 0,
    zeroExSwap: null,
    references: [],
    viewerReactions: {},
    reactionCounts: {},
    replies: {
      extra: {
        moderationEnabled: false,
        moderationKnownReactions: ["like"],
      },
      results: [],
      pagination: {
        limit: 2,
        hasNext: false,
        hasPrevious: false,
        count: 0,
      },
    },
    path: "0xc506739d39cbf1d94e2510bfca64cb6015f4bb1b/0x9e928d74c573428f69aa87aa084cc801c6c9a9c04c0512813abb3b82fbe1f21e",
  };

  return {
    expectedFetchResult,
    responseData: JSON.stringify(expectedFetchResult, responseDataJSONReplacer),
  };
}

function getMockFetchCommentRepliesResponseData() {
  const expectedFetchResult = {
    results: [
      {
        app: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        author: {
          address: "0xa0ee7a142d267c1f36714e4a8f75612f20a79720",
        },
        id: "0x4639fe3e5aa762ed850143819b5022ab59e67713ce1561cf4f012f9f5246ec1a",
        channelId: 0n,
        commentType: 0,
        content: "reply 7",
        chainId: 31337,
        deletedAt: null,
        logIndex: 0,
        metadata: [],
        hookMetadata: [],
        parentId:
          "0x7d4ceac9744f15fa8e544612dbdb3d34498761ef7437bf198f58037a37fa169f",
        targetUri: "",
        txHash:
          "0x8185e0d1c11e515c28cd6b8ef13925cb4bf0dcfe5bb4005b7a301edc56e78496",
        cursor:
          "0x313735333830343031303030303a307834363339666533653561613736326564383530313433383139623530323261623539653637373133636531353631636634663031326639663532343665633161",
        moderationStatus: "approved",
        moderationStatusChangedAt: new Date("2025-07-29T18:24:25.258Z"),
        moderationClassifierResult: {
          hate: 0,
          spam: 0,
          sexual: 0,
          violence: 0,
          self_harm: 0,
          harassment: 0,
          llm_generated: 0,
          sexual_minors: 0,
          hate_threatening: 0,
          violence_graphic: 0,
        },
        moderationClassifierScore: 0,
        createdAt: new Date("2025-07-29T15:46:50.000Z"),
        updatedAt: new Date("2025-07-29T15:46:50.000Z"),
        revision: 0,
        zeroExSwap: null,
        references: [],
        viewerReactions: {},
        reactionCounts: {},
        replies: {
          extra: {
            moderationEnabled: false,
            moderationKnownReactions: ["like"],
          },
          results: [],
          pagination: {
            limit: 2,
            hasNext: false,
            hasPrevious: false,
            count: 0,
          },
        },
        path: "0xa0ee7a142d267c1f36714e4a8f75612f20a79720/0x4639fe3e5aa762ed850143819b5022ab59e67713ce1561cf4f012f9f5246ec1a",
      },
      {
        app: "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266",
        author: {
          address: "0xa0ee7a142d267c1f36714e4a8f75612f20a79720",
        },
        id: "0x733462c8fae87358165c88b84f6dc213333e0480a8607cf26c33ce53206beda4",
        channelId: 0n,
        commentType: 0,
        content: "reply 6",
        chainId: 31337,
        deletedAt: null,
        logIndex: 0,
        metadata: [],
        hookMetadata: [],
        parentId:
          "0x7d4ceac9744f15fa8e544612dbdb3d34498761ef7437bf198f58037a37fa169f",
        targetUri: "",
        txHash:
          "0x8ecb2727559e83040eb0711d74755005ad3e8b145178e6bbf093dbe49901b4d2",
        cursor:
          "0x313735333830333937333030303a307837333334363263386661653837333538313635633838623834663664633231333333336530343830613836303763663236633333636535333230366265646134",
        moderationStatus: "approved",
        moderationStatusChangedAt: new Date("2025-07-29T18:24:25.236Z"),
        moderationClassifierResult: {
          hate: 0,
          spam: 0,
          sexual: 0,
          violence: 0,
          self_harm: 0,
          harassment: 0,
          llm_generated: 0,
          sexual_minors: 0,
          hate_threatening: 0,
          violence_graphic: 0,
        },
        moderationClassifierScore: 0,
        createdAt: new Date("2025-07-29T15:46:13.000Z"),
        updatedAt: new Date("2025-07-29T15:46:13.000Z"),
        revision: 0,
        zeroExSwap: null,
        references: [],
        viewerReactions: {},
        reactionCounts: {
          like: 1,
        },
        replies: {
          extra: {
            moderationEnabled: false,
            moderationKnownReactions: ["like"],
          },
          results: [],
          pagination: {
            limit: 2,
            hasNext: false,
            hasPrevious: false,
            count: 0,
          },
        },
        path: "0xa0ee7a142d267c1f36714e4a8f75612f20a79720/0x733462c8fae87358165c88b84f6dc213333e0480a8607cf26c33ce53206beda4",
      },
    ],
    pagination: {
      limit: 50,
      hasNext: false,
      hasPrevious: false,
      startCursor:
        "0x313735333830343031303030303a307834363339666533653561613736326564383530313433383139623530323261623539653637373133636531353631636634663031326639663532343665633161",
      endCursor:
        "0x313735333739353839393030303a307861313565353862366334373062333933373833666366386363636530616561636232623331393962623735663137613865663939326534663761646265396234",
    },
    extra: {
      moderationEnabled: false,
      moderationKnownReactions: ["like"],
    },
  };

  return {
    expectedFetchResult,
    responseData: JSON.stringify(expectedFetchResult, responseDataJSONReplacer),
  };
}
