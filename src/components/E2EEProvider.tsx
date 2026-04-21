import React, { createContext, useContext, useEffect, useState } from 'react';

interface E2EEContextType {
  encrypt: (text: string) => Promise<string>;
  decrypt: (cipher: string) => Promise<string>;
  isReady: boolean;
}

const E2EEContext = createContext<E2EEContextType | null>(null);

export const E2EEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [key, setKey] = useState<CryptoKey | null>(null);

  useEffect(() => {
    const initKey = async () => {
      // For this demo, we use a simple shared key derivation. 
      // In a real app, this would involve DH key exchange per conversation.
      const rawKey = new TextEncoder().encode('nexus-secret-shared-key-demo-32b');
      const cryptoKey = await window.crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt', 'decrypt']
      );
      setKey(cryptoKey);
    };
    initKey();
  }, []);

  const encrypt = async (text: string) => {
    if (!key) return text;
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );
    
    // Combine IV and Encrypted message for storage
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  };

  const decrypt = async (cipher: string) => {
    if (!key) return cipher;
    try {
      const combined = new Uint8Array(atob(cipher).split('').map(c => c.charCodeAt(0)));
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);
      
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );
      
      return new TextDecoder().decode(decrypted);
    } catch (e) {
      console.warn('Decryption failed, returning raw string', e);
      return cipher;
    }
  };

  return (
    <E2EEContext.Provider value={{ encrypt, decrypt, isReady: !!key }}>
      {children}
    </E2EEContext.Provider>
  );
};

export const useE2EE = () => {
  const context = useContext(E2EEContext);
  if (!context) throw new Error('useE2EE must be used within E2EEProvider');
  return context;
};
