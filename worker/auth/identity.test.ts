import { createLocalJWKSet, errors, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { accessIdentity, issuer, type AccessConfig } from './identity.ts';

const config: AccessConfig = { teamDomain: 'example.cloudflareaccess.com', aud: 'app-aud' };

async function accessSigner() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = await exportJWK(publicKey);
  const keys = createLocalJWKSet({ keys: [{ ...jwk, kid: 'k1', alg: 'RS256' }] });
  const sign = (
    claims: Record<string, unknown>,
    { aud = config.aud, iss = issuer(config.teamDomain) } = {},
  ) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(iss)
      .setAudience(aud)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);
  return { keys, sign };
}

const request = (headers: Record<string, string> = {}) =>
  new Request('https://trainote.example/api/me', { headers });

describe('accessIdentity', () => {
  it('takes the email from the Access binding before reading the request', async () => {
    const { keys, sign } = await accessSigner();
    const resolve = accessIdentity(() => keys);
    const ctx = {
      access: {
        aud: config.aud,
        getIdentity: () => Promise.resolve({ email: 'bound@example.com' }),
      },
    };
    const token = await sign({ email: 'jwt@example.com' });

    const identity = await resolve(request({ 'cf-access-jwt-assertion': token }), config, ctx);

    expect(identity).toEqual({ email: 'bound@example.com' });
  });

  it('verifies the assertion header when the binding has no identity', async () => {
    const { keys, sign } = await accessSigner();
    const resolve = accessIdentity(() => keys);
    const token = await sign({ email: 'jwt@example.com' });

    const identity = await resolve(
      request({ 'cf-access-jwt-assertion': token }),
      config,
      undefined,
    );

    expect(identity).toEqual({ email: 'jwt@example.com' });
  });

  it('reads the token from the CF_Authorization cookie', async () => {
    const { keys, sign } = await accessSigner();
    const resolve = accessIdentity(() => keys);
    const token = await sign({ email: 'cookie@example.com' });

    const identity = await resolve(
      request({ cookie: `theme=dark; CF_Authorization=${token}; other=1` }),
      config,
      undefined,
    );

    expect(identity).toEqual({ email: 'cookie@example.com' });
  });

  it('returns no identity for a token issued to another audience', async () => {
    const { keys, sign } = await accessSigner();
    const resolve = accessIdentity(() => keys);
    const token = await sign({ email: 'jwt@example.com' }, { aud: 'another-app' });

    const identity = await resolve(
      request({ 'cf-access-jwt-assertion': token }),
      config,
      undefined,
    );

    expect(identity).toBeUndefined();
  });

  it('returns no identity for a token without an email claim', async () => {
    const { keys, sign } = await accessSigner();
    const resolve = accessIdentity(() => keys);
    const token = await sign({ sub: 'service-token' });

    const identity = await resolve(
      request({ 'cf-access-jwt-assertion': token }),
      config,
      undefined,
    );

    expect(identity).toBeUndefined();
  });

  it('lets a certificate outage surface instead of answering with no identity', async () => {
    const { sign } = await accessSigner();
    const resolve = accessIdentity(() => () => {
      throw new errors.JWKSTimeout();
    });
    const token = await sign({ email: 'jwt@example.com' });

    await expect(
      resolve(request({ 'cf-access-jwt-assertion': token }), config, undefined),
    ).rejects.toBeInstanceOf(errors.JWKSTimeout);
  });

  it('returns no identity for a request that carries no token', async () => {
    const { keys } = await accessSigner();
    const resolve = accessIdentity(() => keys);

    const identity = await resolve(request(), config, undefined);

    expect(identity).toBeUndefined();
  });
});
