import { describe, it } from "node:test";
import assert from "node:assert";
import nock from "nock";
import { fetchComment } from "../api.js";
import type { Hex } from "../../core/schemas.js";

describe("fetchComment", () => {
  it("should fetch a comment", async () => {
    const commentId: Hex =
      "0x9e928d74c573428f69aa87aa084cc801c6c9a9c04c0512813abb3b82fbe1f21e";
    const chainId = 31337;
    const { responseData, expectedFetchResult } = getMockResponseData();

    nock("https://api.ethcomments.xyz")
      .get(`/api/comments/${commentId}?chainId=${chainId}`)
      .reply(200, responseData);

    const fetchResult = await fetchComment({
      commentId,
      chainId,
    });

    assert.deepStrictEqual(expectedFetchResult, fetchResult);
  });
});

function getMockResponseData() {
  const date = new Date();
  const channelId = 0n;

  const responseData = {
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
    channelId: channelId.toString(),
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
    moderationStatusChangedAt: date.toISOString(),
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
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
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
      },
    },
  };

  const expectedFetchResult = {
    ...responseData,
    channelId,
    moderationStatusChangedAt: date,
    createdAt: date,
    updatedAt: date,
  };

  return {
    responseData,
    expectedFetchResult,
  };
}
