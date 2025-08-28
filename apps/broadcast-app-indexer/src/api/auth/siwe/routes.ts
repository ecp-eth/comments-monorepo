import type { OpenAPIHono } from "@hono/zod-openapi";
import { authSiweMeGET } from "./me/get";
import { authSiweNonceGET } from "./nonce/get";
import { authSiweRefreshPOST } from "./refresh/post";
import { authSiweVerifyPOST } from "./verify/post";
import { authSiweLogoutPOST } from "./logout/post";

export async function initializeSiweRoutes(api: OpenAPIHono) {
  await authSiweMeGET(api);
  await authSiweNonceGET(api);
  await authSiweVerifyPOST(api);
  await authSiweRefreshPOST(api);
  await authSiweLogoutPOST(api);
}
