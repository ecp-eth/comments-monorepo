import type { JSONContent } from "@tiptap/core";

export function isContentEqual(a: JSONContent, b: JSONContent): boolean {
  // If both are exactly the same (including null/undefined), return true
  if (a === b) {
    return true;
  }

  // If one is null/undefined but not the other, return false
  if (!a || !b) {
    return false;
  }

  // Get all keys from both objects, filtering out undefined values
  const keysA = Object.keys(a).filter(
    (key) => a[key as keyof JSONContent] !== undefined,
  );
  const keysB = Object.keys(b).filter(
    (key) => b[key as keyof JSONContent] !== undefined,
  );

  // Check if the number of defined keys is different
  if (keysA.length !== keysB.length) {
    return false;
  }

  // Check if all keys in A exist in B and have equal values
  return keysA.every((key) => {
    const valueA = a[key as keyof JSONContent];
    const valueB = b[key as keyof JSONContent];

    if (valueA === valueB) {
      return true;
    }

    // If both values are objects, recursively compare them
    if (typeof valueA === "object" && typeof valueB === "object") {
      return isContentEqual(valueA as JSONContent, valueB as JSONContent);
    }

    return false;
  });
}
