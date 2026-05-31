export const isWebAuthnSupported = () => {
  return window.PublicKeyCredential !== undefined && typeof window.PublicKeyCredential === 'function';
};

function bufferToBase64url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  const base64String = window.btoa(str);
  return base64String.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export const registerBiometric = async (userEmail: string = "user@memento.vault"): Promise<string> => {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn not supported");

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new Uint8Array(16);
  window.crypto.getRandomValues(userId);

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: challenge,
    rp: {
      name: "Memento Vault",
    },
    user: {
      id: userId,
      name: userEmail,
      displayName: userEmail,
    },
    pubKeyCredParams: [
      { type: "public-key", alg: -7 }, // ES256
      { type: "public-key", alg: -257 } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
  };

  try {
    const credential = await navigator.credentials.create({ publicKey }) as PublicKeyCredential;
    if (!credential) throw new Error("Biometric registration failed");
    return bufferToBase64url(credential.rawId);
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.message.includes('publickey-credentials-create') || err.message.includes('Permissions Policy')) {
      throw new Error("Biometrics are disabled in this preview frame. Please click 'Open in New Tab' (top right arrow icon) to enable and configure Touch ID/Face ID.");
    }
    throw err;
  }
};

export const verifyBiometric = async (credentialIdBase64: string): Promise<boolean> => {
  if (!isWebAuthnSupported()) throw new Error("WebAuthn not supported");

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const base64 = credentialIdBase64.replace(/-/g, '+').replace(/_/g, '/');
  const padUrl = base64 + '='.repeat((4 - base64.length % 4) % 4);
  const rawIdStr = window.atob(padUrl);
  const rawId = new Uint8Array(rawIdStr.length);
  for (let i = 0; i < rawIdStr.length; i++) {
    rawId[i] = rawIdStr.charCodeAt(i);
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: challenge,
    allowCredentials: [{
      id: rawId,
      type: "public-key",
      transports: ["internal"]
    }],
    userVerification: "required",
    timeout: 60000,
  };

  try {
    const assertion = await navigator.credentials.get({ publicKey });
    return !!assertion;
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.message.includes('publickey-credentials-get') || err.message.includes('Permissions Policy')) {
      throw new Error("Biometrics are disabled in this preview frame. Please click 'Open in New Tab' (top right arrow icon) to authenticate with Touch ID/Face ID.");
    }
    throw err;
  }
};
