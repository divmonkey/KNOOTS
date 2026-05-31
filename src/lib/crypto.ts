/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utility to convert hex string to ArrayBuffer
function hexToArrayBuffer(hex: string): Uint8Array {
  const length = hex.length / 2;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return result;
}

// Utility to convert ArrayBuffer to hex string
function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  let hexString = '';
  for (let i = 0; i < byteArray.length; i++) {
    const hex = byteArray[i].toString(16);
    hexString += (hex.length === 1 ? '0' : '') + hex;
  }
  return hexString;
}

// Generate random salt for key derivation
export function generateSalt(): string {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return arrayBufferToHex(array.buffer);
}

// Derive AES-GCM 256-bit key from passphrase using PBKDF2
async function deriveKey(passphrase: string, saltHex: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passphraseBuffer = encoder.encode(passphrase);
  const salt = hexToArrayBuffer(saltHex);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passphraseBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext using a derived key
export async function encryptText(text: string, passphrase: string, saltHex: string): Promise<string> {
  try {
    const key = await deriveKey(passphrase, saltHex);
    const encoder = new TextEncoder();
    const encodedText = encoder.encode(text);
    
    // AES-GCM standard IV is 12 bytes
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encodedText
    );

    const ivHex = arrayBufferToHex(iv.buffer);
    const ciphertextHex = arrayBufferToHex(ciphertext);

    // Return combined iv and ciphertext separated by a colon
    return `${ivHex}:${ciphertextHex}`;
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('E2E Encryption failed.');
  }
}

// Decrypt ciphertext using a derived key
export async function decryptText(encryptedValue: string, passphrase: string, saltHex: string): Promise<string> {
  try {
    const parts = encryptedValue.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format.');
    }
    const [ivHex, ciphertextHex] = parts;
    const key = await deriveKey(passphrase, saltHex);
    const iv = hexToArrayBuffer(ivHex);
    const ciphertext = hexToArrayBuffer(ciphertextHex);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Incorrect decryption passphrase or tampered data.');
  }
}

// Hash passphrase to store a validation token locally
export async function hashPassphrase(passphrase: string, saltHex: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(passphrase + saltHex);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  return arrayBufferToHex(hashBuffer);
}
