import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { generateKeyPair, encrypt } from '../crypto/rsa';
import styles from './Signup.module.css'; // CSS module for styling

export default function Signup({ onSignupSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [primeBits, setPrimeBits] = useState(64); // Key size for demo

  async function handleSignup(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!username.trim()) throw new Error("Username is required.");

      const { publicKey, privateKey } = generateKeyPair(primeBits);
      const encryptedEmail = encrypt(email, publicKey);
      const encryptedPassword = encrypt(password, publicKey);

      const { error: authError } = await supabase.from('authentication').insert([
        {
          username,
          encrypted_email: encryptedEmail,
          encrypted_password: encryptedPassword,
          public_key_n: publicKey.n.toString(),
          public_key_e: publicKey.e.toString(),
        },
      ]);
      if (authError) throw authError;

      const { error: userError } = await supabase.from('users').insert([
        {
          username,
          public_key_n: publicKey.n.toString(),
          public_key_e: publicKey.e.toString(),
        },
      ]);
      if (userError) throw userError;

      // Store private key in localStorage (for demo only)
      localStorage.setItem(`privateKey_n_${username}`, privateKey.n.toString());
      localStorage.setItem(`privateKey_d_${username}`, privateKey.d.toString());

      // ✅ New: Automatically download private key as backup file
      const keyText = `Private Key for ${username}\n\nn: ${privateKey.n.toString()}\nd: ${privateKey.d.toString()}`;
      const blob = new Blob([keyText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `private_key_${username}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('Signup successful! Your private key has been downloaded. You can now log in.');
      setTimeout(() => {
        onSignupSuccess();
      }, 1500);

      setUsername('');
      setEmail('');
      setPassword('');

    } catch (error) {
      console.error("Signup error:", error);
      setMessage(`Signup failed: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  }

  const messageClass = message.includes('success') ? styles.success : (message ? styles.error : '');

  return (
    <div className={styles.signupContainer}>
      <h2>Signup</h2>

      <div className={styles.keySizeSelect}>
        <label htmlFor="primeBits">Key Size (bits per prime - demo):</label>
        <select
          id="primeBits"
          value={primeBits}
          onChange={e => setPrimeBits(Number(e.target.value))}
          disabled={loading}
        >
          <option value={32}>32 bits (Fast, No Security)</option>
          <option value={64}>64 bits (Medium, No Security)</option>
          <option value={128}>128 bits (Slow, No Security)</option>
        </select>
        <p><small>Using larger keys takes significantly longer due to slow prime generation.</small></p>
      </div>

      <form onSubmit={handleSignup} className={styles.signupForm}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={loading}
          className={styles.signupInput}
        />
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={loading}
          className={styles.signupInput}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          disabled={loading}
          className={styles.signupInput}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Signup'}
        </button>
      </form>

      {message && (
        <p className={`${styles.message} ${messageClass}`}>
          {message}
        </p>
      )}
      {loading && <p className={styles.loading}>Generating keys and encrypting data. This may take a moment...</p>}
    </div>
  );
}
