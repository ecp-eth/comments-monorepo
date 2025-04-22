import _normalizeUrl from "normalize-url";

export function normalizeUrl(url: string) {
  return _normalizeUrl(url, {
    sortQueryParameters: true,
    removeTrailingSlash: true,
    stripHash: true,
    removeSingleSlash: true,
  });
}

/**
 * Transforms comment targetUri
 */
export function transformCommentTargetUri(targetUri: string) {
  let normalizedTargetUri = targetUri.trim().length > 0 ? targetUri : "";

  if (normalizedTargetUri === "") {
    return normalizedTargetUri;
  }

  try {
    const urlObj = new URL(targetUri);
    normalizedTargetUri = normalizeUrl(urlObj.toString());
  } catch (error) {
    console.error(error);
  }
  return normalizedTargetUri;
}

/**
 * Transforms comment parentId
 */
export function transformCommentParentId(parentId: `0x${string}`) {
  return parentId ===
    "0x0000000000000000000000000000000000000000000000000000000000000000" // bytes32(0)
    ? null
    : parentId;
}
