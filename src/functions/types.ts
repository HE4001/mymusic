export interface Env {
  B2_ENDPOINT: string;
  B2_BUCKET: string;
  B2_REGION: string;
  B2_ACCESS_KEY_ID: string;
  B2_SECRET_ACCESS_KEY: string;
  PRESIGN_EXPIRY: string;
  APP_NAME: string;
  URL_CACHE: KVNamespace;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  coverUrl?: string;
  fileName: string;
  size: number;
  contentType: string;
}
