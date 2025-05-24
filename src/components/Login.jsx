// src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { decrypt } from '../crypto/rsa';
import styles from './Login.module.css';

export default function Login({ onLogin, onGoToSignup }) {
  const [username, setUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [privateKeyFile, setPrivateKeyFile] = useState(null);

  // Handle private key file selection
  function handleFileChange(e) {
    setPrivateKeyFile(e.target.files[0]);
  }

  // Read private key file and store in localStorage
  function importPrivateKey(username) {
  return new Promise((resolve, reject) => {
    if (!privateKeyFile) {
      reject(new Error('Please upload your private key file.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;

        // Parse the text manually to get n and d
        // Example content:
        // Private Key for John
        //
        // n: 11529312800025574447
        // d: 1281757984214221953

        // Split lines and look for lines starting with 'n:' and 'd:'
        const lines = text.split('\n').map(line => line.trim());
        const nLine = lines.find(line => line.startsWith('n:'));
        const dLine = lines.find(line => line.startsWith('d:'));

        if (!nLine || !dLine) {
          throw new Error('Invalid private key file format.');
        }

        const n = nLine.split(':')[1].trim();
        const d = dLine.split(':')[1].trim();

        // Save in localStorage keyed by username
        localStorage.setItem(`privateKey_n_${username}`, n);
        localStorage.setItem(`privateKey_d_${username}`, d);

        resolve();
      } catch (err) {
        reject(new Error('Failed to parse private key file: ' + err.message));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read private key file.'));
    };
    reader.readAsText(privateKeyFile);
  });
}


  async function handleLogin(e) {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (!username.trim()) {
        throw new Error('Username is required.');
      }
      if (!passwordInput) {
        throw new Error('Password is required.');
      }

      // Import private key from uploaded file first (if file selected)
      if (privateKeyFile) {
        setMessage('Importing private key...');
        await importPrivateKey(username);
        setMessage('Private key imported successfully.');
      }

      // Retrieve private key from localStorage
      const privateKeyN = localStorage.getItem(`privateKey_n_${username}`);
      const privateKeyD = localStorage.getItem(`privateKey_d_${username}`);

      if (!privateKeyN || !privateKeyD) {
        throw new Error(
          `Private key for ${username} not found locally. Please upload your private key file.`
        );
      }

      const privateKey = {
        n: BigInt(privateKeyN),
        d: BigInt(privateKeyD),
      };

      // Fetch encrypted password from Supabase
      const { data, error } = await supabase
        .from('authentication')
        .select('encrypted_password')
        .eq('username', username)
        .single();

      if (error || !data) {
        throw new Error('Invalid username or password.');
      }

      // Decrypt stored encrypted password
      const decryptedPassword = decrypt(data.encrypted_password, privateKey);

      if (decryptedPassword === passwordInput) {
        setMessage('Login successful!');
        onLogin(username, privateKey);
      } else {
        setMessage('Login failed: incorrect password.');
      }
    } catch (error) {
      setMessage(`Login failed: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false);
    }
  }

  const messageClass = message.toLowerCase().includes('success') ? styles.success : (message ? styles.error : '');

  return (
    <div className={styles.loginContainer}>
      <h2>Login</h2>
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          disabled={loading}
          className={styles.loginInput}
        />
        <input
          placeholder="Password"
          type="password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          required
          disabled={loading}
          className={styles.loginInput}
        />

        {/* Private Key File Upload */}
        <label className={styles.fileLabel} htmlFor="privateKeyFile">
          Upload your Private Key File (JSON)
        </label>
        <input
          id="privateKeyFile"
          type="file"
          accept=".json,.txt"
          onChange={handleFileChange}
          disabled={loading}
          className={styles.fileInput}
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging In...' : 'Login'}
        </button>
      </form>

      {message && <p className={`${styles.message} ${messageClass}`}>{message}</p>}
      {loading && <p className={styles.loading}>Processing login...</p>}

      <p className={styles.switchFormMessage}>
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onGoToSignup}
          className={styles.switchFormButton}
          disabled={loading}
        >
          Sign Up
        </button>
      </p>
    </div>
  );
}
