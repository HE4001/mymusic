import { AwsClient } from 'aws4fetch';
import { validateObjectKey } from './library';

const DEFAULT_URL_TTL_SECONDS = 3600;
const MIN_URL_TTL_SECONDS = 60;
const MAX_URL_TTL_SECONDS = 3600;
const B2_ENDPOINT_PATTERN = /^s3\.([a-z0-9-]+)\.backblazeb2\.com$/;
const B2_BUCKET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{4,48}[A-Za-z0-9]$/;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;

export interface B2Env {
  B2_ENDPOINT?: string;
  B2_REGION?: string;
  B2_BUCKET?: string;
  B2_KEY_ID?: string;
  B2_APPLICATION_KEY?: string;
  B2_URL_TTL_SECONDS?: string;
}

export interface SignedTrackUrl {
  url: string;
  expiresAt: number;
}

export class B2ConfigurationError extends Error {
  constructor() {
    super('B2 configuration is missing or invalid');
    this.name = 'B2ConfigurationError';
  }
}

function invalidConfiguration(): never {
  throw new B2ConfigurationError();
}

function requiredValue(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.trim() !== value ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    return invalidConfiguration();
  }
  return value;
}

function validateEndpoint(endpointValue: unknown, region: string): URL {
  const rawEndpoint = requiredValue(endpointValue);
  let endpoint: URL;
  try {
    endpoint = new URL(rawEndpoint);
  } catch {
    return invalidConfiguration();
  }

  const hostnameMatch = B2_ENDPOINT_PATTERN.exec(endpoint.hostname);
  if (
    endpoint.protocol !== 'https:' ||
    !hostnameMatch ||
    hostnameMatch[1] !== region ||
    endpoint.username !== '' ||
    endpoint.password !== '' ||
    endpoint.port !== '' ||
    endpoint.pathname !== '/' ||
    endpoint.search !== '' ||
    endpoint.hash !== ''
  ) {
    return invalidConfiguration();
  }
  return endpoint;
}

function readTtlSeconds(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_URL_TTL_SECONDS;
  }
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return invalidConfiguration();
  }

  const ttl = Number(value);
  if (!Number.isSafeInteger(ttl) || ttl < MIN_URL_TTL_SECONDS || ttl > MAX_URL_TTL_SECONDS) {
    return invalidConfiguration();
  }
  return ttl;
}

export async function signTrack(env: B2Env, objectKey: string): Promise<SignedTrackUrl> {
  const region = requiredValue(env.B2_REGION);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(region)) {
    return invalidConfiguration();
  }

  const endpoint = validateEndpoint(env.B2_ENDPOINT, region);
  const bucket = requiredValue(env.B2_BUCKET);
  if (!B2_BUCKET_PATTERN.test(bucket)) {
    return invalidConfiguration();
  }

  const accessKeyId = requiredValue(env.B2_KEY_ID);
  const secretAccessKey = requiredValue(env.B2_APPLICATION_KEY);
  const ttlSeconds = readTtlSeconds(env.B2_URL_TTL_SECONDS);
  const validObjectKey = validateObjectKey(objectKey);
  const encodedObjectKey = validObjectKey.split('/').map(encodeURIComponent).join('/');
  const unsignedUrl = new URL(`/${encodeURIComponent(bucket)}/${encodedObjectKey}`, endpoint);
  unsignedUrl.searchParams.set('X-Amz-Expires', String(ttlSeconds));

  const issuedAt = Date.now();
  const client = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region,
  });
  const signedRequest = await client.sign(unsignedUrl.toString(), {
    method: 'GET',
    aws: { signQuery: true },
  });

  return {
    url: signedRequest.url,
    expiresAt: issuedAt + ttlSeconds * 1000,
  };
}
