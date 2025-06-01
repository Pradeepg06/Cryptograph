import React, { useState } from 'react';
import styles from './AttackDemo.module.css';
import { modPow, modInverse } from '../crypto/rsa'; // Use your existing rsa.js
import { useNavigate } from 'react-router-dom';

export default function AttackDemo() {
  const [publicKey] = useState({ e: 3n, n: 55n });
  const [ciphertext, setCiphertext] = useState('');
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [attackMethod, setAttackMethod] = useState('bruteforce');

  const navigate = useNavigate();

  const log = (msg) => setLogs((prev) => [...prev, msg]);
  const clearLogs = () => setLogs([]);

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const parseCipher = () => {
    try {
      return BigInt(ciphertext);
    } catch {
      setDecryptedMessage('❌ Invalid ciphertext input.');
      return null;
    }
  };

  const performBruteForce = async (c) => {
    log(`🔍 Brute Force Attack starting for ciphertext: ${c}`);
    for (let m = 0n; m < publicKey.n; m++) {
      const computed = modPow(m, publicKey.e, publicKey.n);
      log(`Trying m = ${m}: ${m}^${publicKey.e} mod ${publicKey.n} = ${computed}`);
      if (computed === c) {
        log(`✅ Match found! Decrypted message is: ${m}`);
        setDecryptedMessage(m.toString());
        return;
      }
      await delay(100);
    }
    log('❌ No match found using brute force.');
    setDecryptedMessage('Decryption failed.');
  };

  const performCyclicAttack = async (c) => {
    log(`🔁 Cyclic Attack starting with c = ${c}`);
    let seen = new Map();
    let current = c;
    let iteration = 0;
    let previous = null;

    while (iteration < 100) {
      if (seen.has(current.toString())) {
        const cycleStart = seen.get(current.toString());
        log(`🔄 Cycle detected! Value '${current}' repeats at iteration ${iteration} (first seen at ${cycleStart})`);
        log(`✅ Original Plaintext: ${previous}`);
        setDecryptedMessage(previous.toString());
        return;
      }

      seen.set(current.toString(), iteration);
      const next = modPow(current, publicKey.e, publicKey.n);
      log(`Encrypting step ${iteration}: ${current}^${publicKey.e} mod ${publicKey.n} = ${next}`);
      previous = current;
      current = next;
      iteration++;
      await delay(200);
    }

    log('❌ No cycle detected within 100 iterations.');
    setDecryptedMessage('Cycle not found.');
  };

  const performKnownPlaintextAttack = async (c) => {
  log(`📘 Known Plaintext Attack on ciphertext: ${c}`);
  const knownPlaintexts = [];

  // Simulate known (plaintext, ciphertext) pairs
  for (let m = 1n; m <= 20n; m++) {
    const encrypted = modPow(m, publicKey.e, publicKey.n);
    knownPlaintexts.push({ m, encrypted });
    log(`Known Pair ➤ m = ${m}: ${m}^${publicKey.e} mod ${publicKey.n} = ${encrypted}`);
    await delay(100);
  }

  log(`🔍 Searching for match in known pairs...`);

  for (const pair of knownPlaintexts) {
    log(`Testing ➤ ciphertext = ${pair.encrypted} ↔ m = ${pair.m}`);
    await delay(100);
    if (pair.encrypted === c) {
      log(`✅ Match found! Ciphertext ${c} corresponds to plaintext m = ${pair.m}`);
      setDecryptedMessage(pair.m.toString());
      return;
    }
  }

  log(`❌ No match found in known plaintexts.`);
  setDecryptedMessage('Match not found.');
};


  const performChosenCiphertextAttack = async (c) => {
    log(`🎯 Chosen Ciphertext Attack on c = ${c}`);
    const s = 2n;
    const sToE = modPow(s, publicKey.e, publicKey.n);
    const cPrime = (c * sToE) % publicKey.n;
    log(`Modified ciphertext: c' = c * s^e mod n = ${cPrime}`);

    const mPrime = await simulateDecryption(cPrime);
    const sInv = modInverse(s, publicKey.n);
    const m = (mPrime * sInv) % publicKey.n;

    log(`Simulated decrypted m' = ${mPrime}`);
    log(`Recovered original m = m' * s^-1 mod n = ${m}`);
    setDecryptedMessage(m.toString());
  };

  // Simulate decryption (only works in demo because we know private key d = 27 for (3,55))
  const simulateDecryption = async (c) => {
    const d = 27n;
    await delay(500);
    return modPow(c, d, publicKey.n);
  };

  const handleAttack = async () => {
    clearLogs();
    setDecryptedMessage('');
    const c = parseCipher();
    if (c === null) return;
    setIsRunning(true);

    switch (attackMethod) {
      case 'bruteforce':
        await performBruteForce(c);
        break;
      case 'cyclic':
        await performCyclicAttack(c);
        break;
      case 'known_plaintext':
        await performKnownPlaintextAttack(c);
        break;
      case 'chosen_ciphertext':
        await performChosenCiphertextAttack(c);
        break;
      default:
        log('❌ Unknown attack method.');
    }

    setIsRunning(false);
  };

  return (
    <div className={styles.attackContainer}>
      <button className={styles.backButton} onClick={() => navigate('/home')}>
        ⬅️ Back to Home
      </button>

      <h2>🔓 RSA Cryptanalytic Attack Demo</h2>
      <p>Public Key (e, n): ({publicKey.e.toString()}, {publicKey.n.toString()})</p>

      <input
        type="text"
        className={styles.inputField}
        placeholder="Enter Ciphertext (e.g. 8)"
        value={ciphertext}
        onChange={(e) => setCiphertext(e.target.value)}
        disabled={isRunning}
      />

      <div className={styles.controls}>
        <select
          value={attackMethod}
          onChange={(e) => setAttackMethod(e.target.value)}
          disabled={isRunning}
        >
          <option value="bruteforce">Brute Force</option>
          <option value="cyclic">Cyclic Attack</option>
          <option value="known_plaintext">Known Plaintext</option>
          <option value="chosen_ciphertext">Chosen Ciphertext</option>
        </select>

        <button onClick={handleAttack} disabled={isRunning || !ciphertext}>
          {isRunning ? 'Running...' : 'Start Attack'}
        </button>
      </div>

      {decryptedMessage && (
        <div className={styles.resultBox}>
          <strong>🔍 Result:</strong> {decryptedMessage}
        </div>
      )}

      <div className={styles.logBox}>
        <h3>🧾 Attack Logs:</h3>
        <div className={styles.logOutput}>
          {logs.map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
