import forge from 'node-forge';

let cachedPublicKey: forge.pki.rsa.PublicKey | null = null;

export async function fetchPublicKey(): Promise<forge.pki.rsa.PublicKey> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }
  const res = await fetch('/api/v1/crypto/public-key');
  if (!res.ok) {
    throw new Error('Failed to fetch public key');
  }
  const data = await res.json();
  cachedPublicKey = forge.pki.publicKeyFromPem(data.public_key);
  return cachedPublicKey;
}

export async function encryptPayload(payload: any): Promise<{ encrypted_key: string; payload: string }> {
  const publicKey = await fetchPublicKey();

  // 1. Generate random AES-256 key (32 bytes) and IV (12 bytes for GCM)
  const aesKey = forge.random.getBytesSync(32);
  const iv = forge.random.getBytesSync(12);

  // 2. Encrypt the payload with AES-GCM
  const jsonStr = JSON.stringify(payload);
  const cipher = forge.cipher.createCipher('AES-GCM', aesKey);
  cipher.start({ iv: iv });
  cipher.update(forge.util.createBuffer(jsonStr, 'utf8'));
  cipher.finish();

  const ciphertext = cipher.output.getBytes();
  const tag = cipher.mode.tag.getBytes();

  // 3. Construct the full payload buffer: IV + Ciphertext + Tag
  const fullPayload = iv + ciphertext + tag;
  const payloadB64 = forge.util.encode64(fullPayload);

  // 4. Encrypt the AES key with RSA (RSA-OAEP)
  const encryptedKey = publicKey.encrypt(aesKey, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: {
      md: forge.md.sha256.create()
    }
  });
  const encryptedKeyB64 = forge.util.encode64(encryptedKey);

  return {
    encrypted_key: encryptedKeyB64,
    payload: payloadB64
  };
}
