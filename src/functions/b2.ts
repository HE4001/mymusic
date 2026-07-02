export interface B2Auth {
  accountId: string;
  authorizationToken: string;
  apiUrl: string;
  downloadUrl: string;
  absoluteMinimumPartSize: number;
  minimumPartSize: number;
  uploadUrl: string;
  allowed: {
    bucketId?: string;
    bucketName?: string;
    capabilities: string[];
    namePrefix?: string;
  };
}

export interface Env {
  B2_ENDPOINT: string;
  B2_BUCKET: string;
  B2_REGION: string;
  B2_ACCESS_KEY_ID: string;
  B2_SECRET_ACCESS_KEY: string;
}

let cachedAuth: { auth: B2Auth; expiresAt: number } | null = null;

export async function B2Auth(env: Env): Promise<B2Auth> {
  // Reuse cached auth token (B2 tokens last ~24h)
  if (cachedAuth && Date.now() < cachedAuth.expiresAt) {
    return cachedAuth.auth;
  }

  const credentials = btoa(`${env.B2_ACCESS_KEY_ID}:${env.B2_SECRET_ACCESS_KEY}`);

  const res = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
    headers: {
      Authorization: `Basic ${credentials}`,
    },
  });

  if (!res.ok) {
    throw new Error(`B2 auth failed: ${res.status} ${await res.text()}`);
  }

  const auth: B2Auth = await res.json();
  cachedAuth = { auth, expiresAt: Date.now() + 23 * 60 * 60 * 1000 }; // 23h
  return auth;
}

export function signRequest(
  auth: B2Auth,
  method: string,
  path: string,
  query: Record<string, string> = {},
  body?: string | ArrayBuffer,
): { url: string; headers: Record<string, string> } {
  const url = new URL(path.startsWith('http') ? path : `${auth.apiUrl}${path}`);
  Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, v));

  const headers: Record<string, string> = {
    Authorization: auth.authorizationToken,
  };

  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  return { url: url.toString(), headers };
}

export function parseTimestamp(iso: string): number {
  return new Date(iso).getTime();
}

export async function generatePresignedUrl(
  env: Env,
  auth: B2Auth,
  fileName: string,
  expiresIn: number,
): Promise<string> {
  // B2 doesn't natively support presigned URLs like S3.
  // We use the b2_download_file_by_name API with an authorization header.
  // Since the browser can't send custom headers to a CDN URL, we use
  // the b2_get_download_authorization API to get a token-based URL.

  // First, ensure the bucket allows download by name
  const { url: authzUrl, headers } = signRequest(auth, 'POST', '/b2api/v2/b2_get_download_authorization', {}, JSON.stringify({
    bucketId: auth.allowed.bucketId || env.B2_BUCKET,
    fileNamePrefix: fileName,
    validDurationInSeconds: expiresIn,
  }));

  const authzRes = await fetch(authzUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bucketId: auth.allowed.bucketId || env.B2_BUCKET,
      fileNamePrefix: fileName,
      validDurationInSeconds: expiresIn,
    }),
  });

  if (!authzRes.ok) {
    // Fallback: use the download URL directly with auth token
    const downloadUrl = auth.downloadUrl || env.B2_ENDPOINT.replace('s3.', '');
    return `${downloadUrl}/file/${env.B2_BUCKET}/${encodeURIComponent(fileName)}?Authorization=${auth.authorizationToken}`;
  }

  const authzData = await authzRes.json() as { downloadUrl?: string };

  if (authzData.downloadUrl) {
    return `${authzData.downloadUrl}/file/${env.B2_BUCKET}/${encodeURIComponent(fileName)}`;
  }

  // Final fallback
  const downloadUrl = auth.downloadUrl || env.B2_ENDPOINT.replace('s3.', '');
  return `${downloadUrl}/file/${env.B2_BUCKET}/${encodeURIComponent(fileName)}`;
}

export async function listB2Files(env: Env): Promise<{ fileName: string; size: number; contentType: string }[]> {
  const auth = await B2Auth(env);

  const { url: listUrl, headers } = signRequest(auth, 'POST', '/b2api/v2/b2_list_file_names', {}, JSON.stringify({
    bucketId: auth.allowed.bucketId || env.B2_BUCKET,
    maxFileCount: 10000,
  }));

  const res = await fetch(listUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      bucketId: auth.allowed.bucketId || env.B2_BUCKET,
      maxFileCount: 10000,
    }),
  });

  if (!res.ok) {
    throw new Error(`B2 list failed: ${res.status}`);
  }

  const data = await res.json() as { files: Array<{ fileName: string; size: number; contentType: string }> };
  return data.files || [];
}
