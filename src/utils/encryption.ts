import CryptoJS from 'crypto-js';

export function encryptPayload(data: object, key: string): string {
  const jsonString = JSON.stringify(data);
  const keyHash = CryptoJS.SHA256(key);
  const iv = CryptoJS.lib.WordArray.random(16);
  
  const encrypted = CryptoJS.AES.encrypt(jsonString, keyHash, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  const ivHex = iv.toString(CryptoJS.enc.Hex);
  const cipherHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex);
  
  return `${ivHex}:${cipherHex}`;
}

export function decryptPayload(encryptedData: string, key: string): object {
  try {
    const [ivHex, cipherHex] = encryptedData.split(':');
    const keyHash = CryptoJS.SHA256(key);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const ciphertext = CryptoJS.enc.Hex.parse(cipherHex);
    
    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext } as any,
      keyHash,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    );

    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Decryption failed: Invalid key or corrupted data');
  }
}

export function generateEncryptionKey(): string {
  return CryptoJS.lib.WordArray.random(32).toString();
}
