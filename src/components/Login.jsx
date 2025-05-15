// src/components/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { decrypt } from '../crypto/rsa';

// Import the CSS Module
import styles from './Login.module.css'; // Make sure this path is correct

// Accept a new prop: onGoToSignup
export default function Login({ onLogin, onGoToSignup }) {
  const [username, setUsername] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state

  async function handleLogin(e) {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setLoading(true); // Start loading

    // --- SECURITY WARNING ---
    // Relying on a private key stored insecurely in localStorage
    // is NOT secure for real applications. This is for demonstration purposes ONLY.
    // --- END WARNING ---

    try {
      console.log("Starting login process...");

       // Basic validation: Check if username is provided
       if (!username.trim()) {
           throw new Error("Username is required.");
       }

      // 1. Get encrypted password from DB
      console.log(`Fetching user data for username: ${username}`); // Corrected typo 'Workspaceing' to 'Fetching'
      const { data, error } = await supabase
        .from('authentication')
        .select('encrypted_password') // Only need the encrypted password for login
        .eq('username', username)
        .single();

      if (error || !data) {
          console.error("User not found or fetch error:", error);
          // Use a more generic message for security
          throw new Error('Invalid username or password.');
      }
      console.log("User data fetched.");

      // 2. Get private key from localStorage (demo only)
       // Retrieve the private key using the username as part of the key
       console.log(`Attempting to retrieve private key for ${username} from localStorage...`);
      const privateKeyN = localStorage.getItem(`privateKey_n_${username}`); // Key includes username
      const privateKeyD = localStorage.getItem(`privateKey_d_${username}`); // Key includes username

      if (!privateKeyN || !privateKeyD) {
           console.error(`Private key for ${username} not found in localStorage.`);
           // Suggest signup if key isn't found locally for this specific username
           setMessage(`Private key for ${username} not found locally. Please sign up with this username on this device first.`);
           setLoading(false); // Stop loading specifically here
           return; // Stop the login process
      }

      const privateKey = {
         n: BigInt(privateKeyN),
         d: BigInt(privateKeyD),
      };
       console.log(`Private key for ${username} retrieved.`);


      // 3. Decrypt stored encrypted password
       console.log("Decrypting password...");
      const decryptedPassword = decrypt(data.encrypted_password, privateKey); // Pass private key object
       console.log("Password decrypted.");


      // 4. Check if decrypted password matches input password
      if (decryptedPassword === passwordInput) {
         console.log("Password match. Login successful.");
        setMessage('Login successful!');
        // Call the onLogin prop passed from the parent
        onLogin(username, privateKey); // Pass data up
      } else {
         console.warn("Password mismatch. Login failed.");
        setMessage('Login failed: incorrect password.');
      }
    } catch (error) {
      console.error("Login error:", error); // Log the actual error
      setMessage(`Login failed: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false); // Stop loading regardless of success or failure
       console.log("Login process finished.");
    }
  }

   // Determine the CSS class for the message paragraph based on content
   const messageClass = message.includes('success') ? styles.success : (message ? styles.error : '');


  return (
    // Apply the container style from the CSS module
    <div className={styles.loginContainer}>
      <h2>Login</h2>
      {/* Apply the form style */}
      <form onSubmit={handleLogin} className={styles.loginForm}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
           className={styles.loginInput} // Apply input style
        />
        <input
          placeholder="Password"
          type="password"
          value={passwordInput}
          onChange={e => setPasswordInput(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
           className={styles.loginInput} // Apply input style
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging In...' : 'Login'} {/* Button text changes */}
        </button>
      </form>

      {/* Display message with dynamic class */}
      {message && (
          <p className={`${styles.message} ${messageClass}`}>
              {message}
          </p>
      )}
       {/* Loading indicator message */}
       {loading && <p className={styles.loading}>Processing login...</p>}

       {/* Link/button to go to the signup page */}
       <p className={styles.switchFormMessage}> {/* Optional: style this paragraph */}
            Don't have an account?{' '}
            <button
                type="button" // Important: Use type="button" to prevent form submission
                onClick={onGoToSignup}
                className={styles.switchFormButton} // Optional: style this button
                disabled={loading} // Disable button while loading
            >
                Sign Up
            </button>
       </p>
    </div>
  );
}
