// src/components/AttackDemo.jsx
import React, { useState } from 'react';
import styles from './AttackDemo.module.css';
import { modPow } from '../crypto/rsa'; // Import the BigInt modPow

export default function AttackDemo() {
  const [publicKey] = useState({ e: 3n, n: 55n }); // Use BigInt for demo
  const [ciphertext, setCiphertext] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [keySize, setKeySize] = useState(32);
  const [plaintext, setPlaintext] = useState('');
  const [attackMethod, setAttackMethod] = useState('bruteforce');

  const performAttack = () => {
    let found = false;
    let c;
    try {
      c = BigInt(ciphertext);
    } catch {
      setDecryptedMessage('Invalid ciphertext input.');
      return;
    }
    for (let m = 0n; m < publicKey.n; m++) {
      if (modPow(m, publicKey.e, publicKey.n) === c) {
        setDecryptedMessage(m.toString());
        found = true;
        break;
      }
    }
    if (!found) setDecryptedMessage('Decryption failed: No match found.');
  };

  const demonstrateAttack = async () => {
    // Add different attack demonstrations:
    // 1. Brute force for small keys
    // 2. Known plaintext attack
    // 3. Chosen ciphertext attack
    // 4. Timing attack simulation
  };

  return (
    <div className={styles.attackContainer}>
      <h2>🔓 RSA Cryptanalytic Attack Demo</h2>
      <p>Public Key (e, n): ({publicKey.e.toString()}, {publicKey.n.toString()})</p>
      <input
        type="text"
        className={styles.inputField}
        placeholder="Enter Ciphertext (e.g. 8)"
        value={ciphertext}
        onChange={(e) => setCiphertext(e.target.value)}
      />
      <button className={styles.attackButton} onClick={performAttack}>
        Attempt Decryption (Brute Force)
      </button>
      {decryptedMessage && (
        <p className={styles.resultMessage}>Recovered Message: {decryptedMessage}</p>
      )}

      <div className={styles.demoControls}>
        <select value={keySize} onChange={(e) => setKeySize(e.target.value)}>
          <option value="32">32-bit (Very Weak)</option>
          <option value="64">64-bit (Weak)</option>
          <option value="128">128-bit (Demo Only)</option>
        </select>

        <select value={attackMethod} onChange={(e) => setAttackMethod(e.target.value)}>
          <option value="bruteforce">Brute Force</option>
          <option value="known_plaintext">Known Plaintext</option>
          <option value="chosen_ciphertext">Chosen Ciphertext</option>
          <option value="timing">Timing Attack</option>
        </select>

        {/* Add visualization of attack progress */}
      </div>
    </div>
  );
}
