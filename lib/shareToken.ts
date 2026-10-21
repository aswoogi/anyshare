const SECRET_KEY =
  process.env.SHARE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'anyshare-secure-default-key-10m';

export interface SharePayload {
  title: string;
  files: {
    name: string;
    size: number;
    mimeType?: string;
    storagePath: string;
  }[];
  exp: number; // Unix timestamp in milliseconds
}

export interface VerifyResult {
  valid: boolean;
  error?: 'EXPIRED' | 'INVALID' | 'MALFORMED';
  data?: SharePayload;
}

// Edge & Browser universal base64url encoding/decoding
function bytesToBase64url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function stringToBase64url(str: string): string {
  return bytesToBase64url(new TextEncoder().encode(str));
}

function base64urlToString(base64url: string): string {
  return new TextDecoder().decode(base64urlToBytes(base64url));
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(SECRET_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * 10분(600초) 유효 기간을 가진 무상태 Web Crypto HMAC 서명 토큰 생성
 */
export async function createShareToken(
  title: string,
  files: { name: string; size: number; mimeType?: string; storagePath: string }[],
  durationMinutes = 10
): Promise<{ token: string; exp: number }> {
  const exp = Date.now() + durationMinutes * 60 * 1000;
  const payload: SharePayload = {
    title,
    files,
    exp,
  };

  const payloadB64 = stringToBase64url(JSON.stringify(payload));
  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payloadB64) as unknown as BufferSource
  );
  const signatureB64 = bytesToBase64url(new Uint8Array(signatureBuffer));

  return {
    token: `${payloadB64}.${signatureB64}`,
    exp,
  };
}

/**
 * 공유 토큰의 HMAC 서명 및 10분 만료 시간 검증
 */
export async function verifyShareToken(token: string): Promise<VerifyResult> {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'MALFORMED' };
    }

    const [payloadB64, providedSigB64] = parts;

    // 1. HMAC 서명 검증
    const key = await getHmacKey();
    const providedSigBytes = base64urlToBytes(providedSigB64);
    const dataBytes = new TextEncoder().encode(payloadB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      providedSigBytes as unknown as BufferSource,
      dataBytes as unknown as BufferSource
    );

    if (!isValid) {
      return { valid: false, error: 'INVALID' };
    }

    // 2. 페이로드 디코딩
    const payloadStr = base64urlToString(payloadB64);
    const data: SharePayload = JSON.parse(payloadStr);

    // 3. 만료 시간 검증 (10분)
    if (!data.exp || data.exp <= Date.now()) {
      return { valid: false, error: 'EXPIRED', data };
    }

    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: 'MALFORMED' };
  }
}
