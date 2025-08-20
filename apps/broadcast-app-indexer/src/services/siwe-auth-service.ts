import { generateSiweNonce, parseSiweMessage } from "viem/siwe";
import { sign as signJWT, verify as verifyJWT } from "hono/jwt";
import { MiniAppConfigRegistryService } from "./mini-app-config-registry-service";
import z from "zod";
import type { PublicClient } from "viem";
import { HexSchema, type Hex } from "@ecp.eth/sdk/core";
import { randomUUID } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { schema } from "../../schema";
import { and, eq } from "drizzle-orm";

type SiweAuthServiceOptions = {
  /**
   * Allowed URIs to verify requests from.
   *
   * These are used to match hostnames by farcaster quick auth when verifying jwt tokens.
   */
  miniAppConfigRegistryService: MiniAppConfigRegistryService;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudienceAccessToken: string;
  jwtAccessTokenLifetime: number;
  jwtRefreshTokenLifetime: number;
  jwtAudienceRefreshToken: string;
  jwtAudienceNonce: string;
  jwtNonceTokenLifetime: number;
  publicClient: PublicClient<any, any>;
  db: NodePgDatabase<typeof schema>;
};

export type NonceAndToken = {
  nonce: string;
  nonceToken: string;
  expiresIn: number;
};

export type VerifiedMessage = {
  address: Hex;
};

export type CreateJWTTokenResult = {
  token: string;
  expiresIn: number;
};

const JWTAccessTokenPayloadSchema = z.object({
  address: HexSchema,
  sessionId: z.string().nonempty(),
});

export type JWTAccessTokenPayload = z.infer<typeof JWTAccessTokenPayloadSchema>;

const JWTRefreshTokenPayloadSchema = z.object({
  address: HexSchema,
  sessionId: z.string().nonempty(),
  tokenId: z.string().nonempty(),
});

export type JWTRefreshTokenPayload = z.infer<
  typeof JWTRefreshTokenPayloadSchema
>;

type VerifyMessageAndCreateSessionParams = {
  message: string;
  signature: Hex;
  nonceToken: string;
};

export type Session = {
  address: Hex;
  accessToken: CreateJWTTokenResult;
  refreshToken: CreateJWTTokenResult;
};

export class SiweAuthService {
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly miniAppConfigRegistryService: MiniAppConfigRegistryService;
  private readonly jwtSecret: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudienceAccessToken: string;
  private readonly jwtAccessTokenLifetime: number;
  private readonly jwtRefreshTokenLifetime: number;
  private readonly jwtAudienceRefreshToken: string;
  private readonly jwtAudienceNonce: string;
  private readonly jwtNonceTokenLifetime: number;
  private readonly publicClient: PublicClient<any, any>;

  constructor(options: SiweAuthServiceOptions) {
    this.db = options.db;
    this.miniAppConfigRegistryService = options.miniAppConfigRegistryService;
    this.jwtSecret = options.jwtSecret;
    this.jwtIssuer = options.jwtIssuer;
    this.jwtAudienceAccessToken = options.jwtAudienceAccessToken;
    this.jwtAccessTokenLifetime = options.jwtAccessTokenLifetime;
    this.jwtRefreshTokenLifetime = options.jwtRefreshTokenLifetime;
    this.jwtAudienceRefreshToken = options.jwtAudienceRefreshToken;
    this.jwtAudienceNonce = options.jwtAudienceNonce;
    this.jwtNonceTokenLifetime = options.jwtNonceTokenLifetime;
    this.publicClient = options.publicClient;
  }

  async generateNonceAndToken(): Promise<NonceAndToken> {
    const nonce = generateSiweNonce();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = now + this.jwtNonceTokenLifetime;

    const token = await signJWT(
      {
        exp: expiresIn,
        iss: this.jwtIssuer,
        iat: now,
        aud: this.jwtAudienceNonce,
        nonce,
      },
      this.jwtSecret,
      "HS256",
    );

    return {
      nonce,
      nonceToken: token,
      expiresIn,
    };
  }

  async verifyMessageAndCreateSession(
    params: VerifyMessageAndCreateSessionParams,
  ): Promise<Session> {
    const verifiedMessage = await this.verifyMessage(
      params.message,
      params.signature,
      params.nonceToken,
    );

    const sessionId = randomUUID();

    const accessToken = await this.issueJWTAccessToken(
      verifiedMessage,
      sessionId,
    );
    const refreshToken = await this.issueJWTRefreshToken(
      verifiedMessage,
      sessionId,
    );

    await this.db.transaction(async (tx) => {
      await tx.insert(schema.authSiweSession).values({
        id: sessionId,
        userId: verifiedMessage.address,
      });

      await tx.insert(schema.authSiweRefreshToken).values({
        id: refreshToken.tokenId,
        sessionId,
        expiresAt: new Date(Date.now() + refreshToken.expiresIn * 1000),
      });
    });

    return {
      accessToken,
      refreshToken,
      address: verifiedMessage.address,
    };
  }

  async verifyJWTAccessToken(
    accessToken: string,
  ): Promise<JWTAccessTokenPayload> {
    const payload = await verifyJWT(accessToken, this.jwtSecret, {
      alg: "HS256",
      iss: this.jwtIssuer,
    });

    const payloadResult = JWTAccessTokenPayloadSchema.safeParse(payload);

    if (!payloadResult.success) {
      throw new SiweAuthInvalidJWTPayloadError();
    }

    const [session] = await this.db
      .update(schema.authSiweSession)
      .set({
        lastUsedAt: new Date(),
      })
      .where(eq(schema.authSiweSession.id, payloadResult.data.sessionId))
      .returning()
      .execute();

    if (!session) {
      throw new SiweAuthInvalidJWTPayloadError();
    }

    return payloadResult.data;
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: CreateJWTTokenResult;
    refreshToken: CreateJWTTokenResult;
  }> {
    const payload = await verifyJWT(refreshToken, this.jwtSecret, {
      alg: "HS256",
      iss: this.jwtIssuer,
    });

    const payloadResult = JWTRefreshTokenPayloadSchema.safeParse(payload);

    if (!payloadResult.success) {
      throw new SiweAuthInvalidJWTPayloadError();
    }

    const { address, sessionId, tokenId } = payloadResult.data;

    const refreshTokenRecord = await this.db.query.authSiweRefreshToken
      .findFirst({
        where: and(eq(schema.authSiweRefreshToken.id, tokenId)),
      })
      .execute();

    if (!refreshTokenRecord) {
      await this.revokeSession(sessionId);

      throw new SiweAuthInvalidJWTPayloadError();
    }

    if (refreshTokenRecord.isUsed) {
      await this.revokeSession(sessionId);

      throw new SiweAuthInvalidJWTPayloadError();
    }

    return await this.db.transaction(async (tx) => {
      // mark refresh token as used
      await tx
        .update(schema.authSiweRefreshToken)
        .set({
          isUsed: true,
          updatedAt: new Date(),
        })
        .where(eq(schema.authSiweRefreshToken.id, refreshTokenRecord.id))
        .execute();

      const newAccessToken = await this.issueJWTAccessToken(
        { address },
        sessionId,
      );

      const newRefreshToken = await this.issueJWTRefreshToken(
        { address },
        sessionId,
      );

      await tx
        .insert(schema.authSiweRefreshToken)
        .values({
          id: newRefreshToken.tokenId,
          sessionId,
          expiresAt: new Date(Date.now() + newRefreshToken.expiresIn * 1000),
        })
        .execute();

      return {
        accessToken: {
          token: newAccessToken.token,
          expiresIn: newAccessToken.expiresIn,
        },
        refreshToken: {
          token: newRefreshToken.token,
          expiresIn: newRefreshToken.expiresIn,
        },
      };
    });
  }

  async revokeSession(sessionId: string) {
    await this.db
      .delete(schema.authSiweSession)
      .where(eq(schema.authSiweSession.id, sessionId))
      .execute();
  }

  private async verifyMessage(
    message: string,
    signature: Hex,
    token: string,
  ): Promise<VerifiedMessage> {
    const payload = await verifyJWT(token, this.jwtSecret, {
      alg: "HS256",
      iss: this.jwtIssuer,
    });

    const payloadSchema = z.object({
      nonce: z.string().nonempty(),
    });

    const payloadResult = payloadSchema.safeParse(payload);

    if (!payloadResult.success) {
      throw new SiweInvalidJWTPayloadError();
    }

    const { nonce } = payloadResult.data;
    const parsedSiweMessage = parseSiweMessage(message);

    if (parsedSiweMessage.nonce !== nonce) {
      throw new SiweAuthInvalidNonceError();
    }

    if (
      !this.miniAppConfigRegistryService.getAppByHost(
        parsedSiweMessage.domain ?? "",
      )
    ) {
      throw new SiweAuthInvalidDomainError();
    }

    const valid = await this.publicClient.verifySiweMessage({
      message,
      signature,
      domain: parsedSiweMessage.domain,
      time: new Date(),
      nonce,
    });

    if (!valid) {
      throw new SiweAuthInvalidSignatureError();
    }

    return z
      .object({
        address: HexSchema,
      })
      .parse(parsedSiweMessage);
  }

  private async issueJWTAccessToken(
    verifiedMessage: VerifiedMessage,
    sessionId: string,
  ): Promise<CreateJWTTokenResult> {
    const now = Math.floor(Date.now() / 1000);

    const token = await signJWT(
      {
        ...({
          address: verifiedMessage.address,
          sessionId,
        } satisfies JWTAccessTokenPayload),
        exp: now + this.jwtAccessTokenLifetime,
        aud: this.jwtAudienceAccessToken,
        iat: now,
        iss: this.jwtIssuer,
        sub: verifiedMessage.address,
      },
      this.jwtSecret,
      "HS256",
    );

    return {
      token,
      expiresIn: this.jwtAccessTokenLifetime,
    };
  }

  private async issueJWTRefreshToken(
    verifiedMessage: VerifiedMessage,
    sessionId: string,
  ): Promise<CreateJWTTokenResult & { tokenId: string }> {
    const tokenId = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const token = await signJWT(
      {
        ...({
          address: verifiedMessage.address,
          sessionId,
          tokenId,
        } satisfies JWTRefreshTokenPayload),
        exp: now + this.jwtRefreshTokenLifetime,
        aud: this.jwtAudienceRefreshToken,
        iat: now,
        iss: this.jwtIssuer,
        sub: verifiedMessage.address,
      },
      this.jwtSecret,
      "HS256",
    );

    return {
      token,
      tokenId,
      expiresIn: this.jwtRefreshTokenLifetime,
    };
  }

  private async markRefreshTokenAsUsed(refreshTokenId: string) {
    await this.db
      .update(schema.authSiweRefreshToken)
      .set({
        isUsed: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.authSiweRefreshToken.id, refreshTokenId))
      .execute();
  }
}

export class SiweAuthError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class SiweInvalidJWTPayloadError extends SiweAuthError {
  constructor() {
    super(`Invalid JWT payload`);
  }
}

export class SiweAuthInvalidNonceError extends SiweAuthError {
  constructor() {
    super(`Invalid nonce`);
  }
}

export class SiweAuthInvalidDomainError extends SiweAuthError {
  constructor() {
    super(`Invalid domain`);
  }
}

export class SiweAuthInvalidSignatureError extends SiweAuthError {
  constructor() {
    super(`Invalid signature`);
  }
}

export class SiweAuthInvalidJWTPayloadError extends SiweAuthError {
  constructor() {
    super(`Invalid JWT payload`);
  }
}
