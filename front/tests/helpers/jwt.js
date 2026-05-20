import crypto from 'crypto';

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj))
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(data, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function createJwt(payload, secret = 'test-secret') {
  const header = { alg: 'HS256', typ: 'JWT' };

  const encodedHeader = base64url(header);
  const encodedPayload = base64url(payload);

  const toSign = `${encodedHeader}.${encodedPayload}`;
  const signature = sign(toSign, secret);

  return `${toSign}.${signature}`;
}