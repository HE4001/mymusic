import { createRemoteJWKSet, errors, jwtVerify } from 'jose';

const TEAM_HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.cloudflareaccess\.com$/;
const JWT_ALGORITHMS = ['RS256'] as const;
const MAX_AUDIENCE_LENGTH = 256;
const MAX_TOKEN_LENGTH = 16_384;
const CONTROL_OR_WHITESPACE_PATTERN = /[\u0000-\u0020\u007f]/;

export interface AccessEnv {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

export class AccessConfigurationError extends Error {
  constructor() {
    super('Cloudflare Access configuration is missing or invalid');
    this.name = 'AccessConfigurationError';
  }
}

export class AccessUnauthorizedError extends Error {
  constructor() {
    super('Cloudflare Access assertion is missing or invalid');
    this.name = 'AccessUnauthorizedError';
  }
}

export class AccessVerificationError extends Error {
  constructor() {
    super('Cloudflare Access assertion could not be verified');
    this.name = 'AccessVerificationError';
  }
}

function configurationError(): never {
  throw new AccessConfigurationError();
}

function readConfiguration(env: AccessEnv): {
  issuer: string;
  audience: string;
  jwksUrl: URL;
} {
  if (typeof env.ACCESS_TEAM_DOMAIN !== 'string' || env.ACCESS_TEAM_DOMAIN.length === 0) {
    return configurationError();
  }

  let teamDomain: URL;
  try {
    teamDomain = new URL(env.ACCESS_TEAM_DOMAIN);
  } catch {
    return configurationError();
  }

  if (
    teamDomain.protocol !== 'https:' ||
    !TEAM_HOST_PATTERN.test(teamDomain.hostname) ||
    teamDomain.username !== '' ||
    teamDomain.password !== '' ||
    teamDomain.port !== '' ||
    teamDomain.pathname !== '/' ||
    teamDomain.search !== '' ||
    teamDomain.hash !== ''
  ) {
    return configurationError();
  }

  const audience = env.ACCESS_AUD;
  if (
    typeof audience !== 'string' ||
    audience.length === 0 ||
    audience.length > MAX_AUDIENCE_LENGTH ||
    CONTROL_OR_WHITESPACE_PATTERN.test(audience)
  ) {
    return configurationError();
  }

  const issuer = teamDomain.origin;
  return {
    issuer,
    audience,
    jwksUrl: new URL('/cdn-cgi/access/certs', issuer),
  };
}

const remoteKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getRemoteKeySet(url: URL): ReturnType<typeof createRemoteJWKSet> {
  const cacheKey = url.href;
  const cached = remoteKeySets.get(cacheKey);
  if (cached) {
    return cached;
  }

  const keySet = createRemoteJWKSet(url);
  remoteKeySets.set(cacheKey, keySet);
  return keySet;
}

export async function verifyAccess(request: Request, env: AccessEnv): Promise<void> {
  const { issuer, audience, jwksUrl } = readConfiguration(env);
  const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
  if (
    assertion === null ||
    assertion.length === 0 ||
    assertion.length > MAX_TOKEN_LENGTH ||
    CONTROL_OR_WHITESPACE_PATTERN.test(assertion)
  ) {
    throw new AccessUnauthorizedError();
  }

  try {
    await jwtVerify(assertion, getRemoteKeySet(jwksUrl), {
      issuer,
      audience,
      algorithms: [...JWT_ALGORITHMS],
      requiredClaims: ['exp', 'iss', 'aud'],
    });
  } catch (error) {
    if (error instanceof errors.JOSEError) {
      throw new AccessUnauthorizedError();
    }
    throw new AccessVerificationError();
  }
}
