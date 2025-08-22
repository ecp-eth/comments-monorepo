import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import jwt from "hono/jwt";
import {
  JwtTokenExpired,
  JwtTokenInvalid,
  JwtTokenIssuedAt,
  JwtTokenIssuer,
  JwtTokenNotBefore,
  JwtTokenSignatureMismatched,
} from "hono/utils/jwt/types";
import type { Hex, PublicClient } from "viem";
import z from "zod";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema";
import { HexSchema } from "@ecp.eth/sdk/core";
import { eq } from "drizzle-orm";

export type SiweAuthService_Options = {
  db: NodePgDatabase<typeof schema>;
  /**
   * Access token lifetime in seconds
   */
  jwtAccessTokenLifetime: number;
  /**
   * The issuer of the access token
   */
  jwtAccessTokenIssuer: string;
  /**
   * The audience of the access token
   */
  jwtAccessTokenAudience: string;
  /**
   * The secret to sign the access token with
   */
  jwtAccessTokenSecret: string;
  /**
   * Refresh token lifetime in seconds
   */
  jwtRefreshTokenLifetime: number;
  /**
   * The audience of the refresh token
   */
  jwtRefreshTokenAudience: string;
  /**
   * The issuer of the refresh token
   */
  jwtRefreshTokenIssuer: string;
  /**
   * The secret to sign the refresh token with
   */
  jwtRefreshTokenSecret: string;
  /**
   * The audience to sign the nonce token with
   */
  jwtNonceTokenAudience: string;
  /**
   * The issuer to sign the nonce token with
   */
  jwtNonceTokenIssuer: string;
  /**
   * Nonce life time in seconds
   */
  jwtNonceTokenLifetime: number;
  /**
   * The secret to sign the nonce token with
   */
  jwtNonceTokenSecret: string;
  /**
   * Resolve the chain client
   * @param chainId - The chain id
   * @returns
   */
  resolveChainClient: (chainId: number) => Promise<PublicClient | undefined>;
};
export class SiweAuthService implements ISiweAuthService {
  constructor(private readonly options: SiweAuthService_Options) {}

  async generateNonceAndToken(): Promise<SiweAuthService_GenerateNonceAndTokenResult> {
    const nonce = generateSiweNonce();
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + this.options.jwtNonceTokenLifetime;

    const token = await jwt.sign(
      {
        exp: expiresAt,
        iat: now,
        aud: this.options.jwtNonceTokenAudience,
        iss: this.options.jwtNonceTokenIssuer,
        nonce,
      },
      this.options.jwtNonceTokenSecret,
      "HS256",
    );

    return {
      nonce,
      token,
    };
  }

  async verifyAccessToken(
    token: string,
  ): Promise<SiweAuthService_VerifyAccessTokenResult> {
    try {
      const decodedJWTToken = await jwt.verify(
        token,
        this.options.jwtAccessTokenSecret,
        {
          alg: "HS256",
          iss: this.options.jwtAccessTokenIssuer,
        },
      );

      const { sessionId } = accessTokenPayloadSchema.parse(decodedJWTToken);

      return await this.options.db.transaction(async (tx) => {
        const [updatedSession] = await tx
          .update(schema.userAuthSession)
          .set({
            lastUsedAt: new Date(),
          })
          .where(eq(schema.userAuthSession.id, sessionId))
          .returning()
          .execute();

        if (!updatedSession) {
          throw new SiweAuthService_InvalidSessionError();
        }

        await tx
          .update(schema.userAuthCredentials)
          .set({
            lastUsedAt: new Date(),
          })
          .where(
            eq(
              schema.userAuthCredentials.id,
              updatedSession.userAuthCredentialsId,
            ),
          )
          .execute();

        return {
          userId: updatedSession.userId,
          sessionId: updatedSession.id,
        };
      });
    } catch (e) {
      throwAuthServiceError(e);
    }
  }

  async verifyMessageAndIssueAuthTokens(
    params: SiweAuthService_VerifyMessageAndNonceParams,
  ): Promise<SiweAuthService_VerifyMessageAndIssueAuthTokensResult> {
    try {
      const { message, signature, token } = params;

      const decodedJWTToken = await jwt.verify(
        token,
        this.options.jwtNonceTokenSecret,
        {
          alg: "HS256",
          iss: this.options.jwtNonceTokenIssuer,
        },
      );

      const { nonce } = nonceTokenPayloadSchema.parse(decodedJWTToken);

      if (decodedJWTToken.aud !== this.options.jwtNonceTokenAudience) {
        throw new SiweAuthService_JwtTokenInvalidAudienceError();
      }

      const { chainId, address } = siweMessagePayloadSchema.parse(
        parseSiweMessage(message),
      );

      if (!chainId) {
        throw new SiweAuthService_MissingChainIdError();
      }

      const client = await this.options.resolveChainClient(chainId);

      if (!client) {
        throw new SiweAuthService_UnsupportedChainError();
      }

      const verificationResult = await client.verifySiweMessage({
        message,
        signature,
        nonce,
      });

      if (!verificationResult) {
        throw new SiweAuthService_SiweMessageVerificationFailedError();
      }

      return await this.options.db.transaction(async (tx) => {
        // is there existing auth method for this ethereum address?
        let authCredentials = await tx.query.userAuthCredentials.findFirst({
          where(fields, operators) {
            return operators.and(
              operators.eq(fields.method, "siwe"),
              operators.eq(fields.identifier, address),
            );
          },
        });

        if (!authCredentials) {
          const [user] = await tx
            .insert(schema.user)
            .values({})
            .returning()
            .execute();

          if (!user) {
            throw new SiweAuthService_FailedToCreateUserError();
          }

          // create credentials and account
          [authCredentials] = await tx
            .insert(schema.userAuthCredentials)
            .values({ identifier: address, method: "siwe", userId: user.id })
            .returning()
            .execute();
        }

        if (!authCredentials) {
          throw new SiweAuthService_FailedToCreateAuthCredentialsError();
        }

        // create session
        const [session] = await tx
          .insert(schema.userAuthSession)
          .values({
            userAuthCredentialsId: authCredentials.id,
            userId: authCredentials.userId,
          })
          .returning()
          .execute();

        if (!session) {
          throw new SiweAuthService_FailedToCreateAuthSessionError();
        }

        const now = Math.floor(Date.now() / 1000);
        const accessTokenExpiresAt = now + this.options.jwtAccessTokenLifetime;
        const refreshTokenExpiresAt =
          now + this.options.jwtRefreshTokenLifetime;

        // create access token
        const accessToken = await jwt.sign(
          {
            exp: accessTokenExpiresAt,
            iat: now,
            aud: this.options.jwtAccessTokenAudience,
            iss: this.options.jwtAccessTokenIssuer,
            ...accessTokenPayloadSchema.parse({
              sessionId: session.id,
            }),
          },
          this.options.jwtAccessTokenSecret,
          "HS256",
        );

        const [storedRefreshToken] = await tx
          .insert(schema.userAuthSessionSiweRefreshToken)
          .values({
            expiresAt: new Date(refreshTokenExpiresAt * 1000),
            userAuthSessionId: session.id,
          })
          .returning()
          .execute();

        if (!storedRefreshToken) {
          throw new SiweAuthService_FailedToCreateRefreshTokenError();
        }

        const refreshToken = await jwt.sign(
          {
            exp: refreshTokenExpiresAt,
            iat: now,
            aud: this.options.jwtRefreshTokenAudience,
            iss: this.options.jwtRefreshTokenIssuer,
            ...refreshTokenPayloadSchema.parse({
              id: storedRefreshToken.id,
            }),
          },
          this.options.jwtRefreshTokenSecret,
          "HS256",
        );

        return {
          accessToken: {
            token: accessToken,
            expiresAt: accessTokenExpiresAt,
          },
          refreshToken: {
            token: refreshToken,
            expiresAt: refreshTokenExpiresAt,
          },
        };
      });
    } catch (e) {
      throwAuthServiceError(e);
    }
  }
}

const siweMessagePayloadSchema = z.object({
  chainId: z.number().int().positive(),
  address: HexSchema,
});

const nonceTokenPayloadSchema = z.object({
  nonce: z.string().nonempty(),
});

const accessTokenPayloadSchema = z.object({
  sessionId: z.string().uuid(),
});

const refreshTokenPayloadSchema = z.object({
  id: z.string().uuid(),
});

export type SiweAuthService_GenerateNonceAndTokenResult = {
  /**
   * Nonce
   */
  nonce: string;
  /**
   * JWT nonce token
   */
  token: string;
};

type SiweAuthService_VerifyMessageAndNonceParams = {
  message: string;
  signature: Hex;
  /**
   * JWT nonce token
   */
  token: string;
};

export type SiweAuthService_VerifyMessageAndIssueAuthTokensResult = {
  accessToken: {
    token: string;
    expiresAt: number;
  };
  refreshToken: {
    token: string;
    expiresAt: number;
  };
};

export type SiweAuthService_VerifyAccessTokenResult = {
  userId: string;
  sessionId: string;
};

export interface ISiweAuthService {
  generateNonceAndToken: () => Promise<SiweAuthService_GenerateNonceAndTokenResult>;

  verifyMessageAndIssueAuthTokens: (
    params: SiweAuthService_VerifyMessageAndNonceParams,
  ) => Promise<SiweAuthService_VerifyMessageAndIssueAuthTokensResult>;

  verifyAccessToken: (
    token: string,
  ) => Promise<SiweAuthService_VerifyAccessTokenResult>;
}

function throwAuthServiceError(error: unknown): never {
  if (error instanceof JwtTokenInvalid) {
    throw new SiweAuthService_JwtTokenInvalidError(error);
  }

  if (error instanceof JwtTokenExpired) {
    throw new SiweAuthService_JwtTokenExpiredError(error);
  }

  if (error instanceof JwtTokenIssuer) {
    throw new SiweAuthService_JwtTokenIssuerError(error);
  }

  if (error instanceof JwtTokenIssuedAt) {
    throw new SiweAuthService_JwtTokenIssuedAtError(error);
  }

  if (error instanceof JwtTokenNotBefore) {
    throw new SiweAuthService_JwtTokenNotBeforeError(error);
  }

  if (error instanceof JwtTokenSignatureMismatched) {
    throw new SiweAuthService_JwtTokenSignatureMismatchedError(error);
  }

  if (error instanceof z.ZodError) {
    throw new SiweAuthService_InvalidTokenOrMessageError();
  }

  throw error;
}

export class SiweAuthServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiweAuthServiceError";
  }
}

export class SiweAuthService_JwtTokenExpiredError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token is expired`);
    this.name = "SiweAuthService_JwtTokenExpiredError";
  }
}

export class SiweAuthService_JwtTokenIssuedAtError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token is issued at in the future`);
    this.name = "SiweAuthService_JwtTokenIssuedAtError";
  }
}

export class SiweAuthService_JwtTokenNotBeforeError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token is not before the specified time`);
    this.name = "SiweAuthService_JwtTokenNotBeforeError";
  }
}

export class SiweAuthService_JwtTokenInvalidError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token is invalid`);
    this.name = "SiweAuthService_JwtTokenInvalidError";
  }
}

export class SiweAuthService_JwtTokenInvalidAudienceError extends SiweAuthServiceError {
  constructor() {
    super(`JWT token has invalid audience`);
    this.name = "SiweAuthService_JwtTokenInvalidAudienceError";
  }
}

export class SiweAuthService_JwtTokenIssuerError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token has invalid issuer`);
    this.name = "SiweAuthService_JwtTokenIssuerError";
  }
}

export class SiweAuthService_JwtTokenSignatureMismatchedError extends SiweAuthServiceError {
  constructor(public readonly innerError: Error) {
    super(`JWT token signature mismatched`);
    this.name = "SiweAuthService_JwtTokenSignatureMismatchedError";
  }
}

export class SiweAuthService_MissingChainIdError extends SiweAuthServiceError {
  constructor() {
    super(`Missing chain id in SIWE message`);
    this.name = "SiweAuthService_MissingChainIdError";
  }
}

export class SiweAuthService_UnsupportedChainError extends SiweAuthServiceError {
  constructor() {
    super(`Unsupported chain`);
    this.name = "SiweAuthService_UnsupportedChainError";
  }
}

export class SiweAuthService_SiweMessageVerificationFailedError extends SiweAuthServiceError {
  constructor() {
    super(`SIWE message verification failed`);
    this.name = "SiweAuthService_SiweMessageVerificationFailedError";
  }
}

export class SiweAuthService_InvalidTokenOrMessageError extends SiweAuthServiceError {
  constructor() {
    super(`Invalid token or message`);
    this.name = "SiweAuthService_InvalidTokenOrMessageError";
  }
}

export class SiweAuthService_FailedToCreateUserError extends SiweAuthServiceError {
  constructor() {
    super(`Failed to create user`);
    this.name = "SiweAuthService_FailedToCreateUserError";
  }
}

export class SiweAuthService_FailedToCreateAuthCredentialsError extends SiweAuthServiceError {
  constructor() {
    super(`Failed to create auth credentials`);
    this.name = "SiweAuthService_FailedToCreateAuthCredentialsError";
  }
}

export class SiweAuthService_FailedToCreateAuthSessionError extends SiweAuthServiceError {
  constructor() {
    super(`Failed to create auth session`);
    this.name = "SiweAuthService_FailedToCreateAuthSessionError";
  }
}

export class SiweAuthService_FailedToCreateRefreshTokenError extends SiweAuthServiceError {
  constructor() {
    super(`Failed to create refresh token`);
    this.name = "SiweAuthService_FailedToCreateRefreshTokenError";
  }
}

export class SiweAuthService_InvalidSessionError extends SiweAuthServiceError {
  constructor() {
    super(`Invalid session`);
    this.name = "SiweAuthService_InvalidSessionError";
  }
}
