import { generateSiweNonce } from "viem/siwe";
import jwt from "hono/jwt";

export type SiweAuthService_Options = {
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
}

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

export interface ISiweAuthService {
  generateNonceAndToken: () => Promise<SiweAuthService_GenerateNonceAndTokenResult>;
}
