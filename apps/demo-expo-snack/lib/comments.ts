import { bigintReplacer } from "./utils";
import { fetchAPI } from "./fetch";
import { SignCommentRequestBodySchemaType } from "./schema";

export const postComment = async (
  comment: SignCommentRequestBodySchemaType
) => {
  const signingResponse = await fetchAPI("/api/sign-comment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(comment, bigintReplacer),
  });

  console.log(await signingResponse.json());
};
