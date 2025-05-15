// src/components/Signup.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { generateKeyPair, encrypt } from '../crypto/rsa';

// Import the CSS Module
import styles from './Signup.module.css'; // Make sure this path is correct

// Accept a new prop: onSignupSuccess
export default function Signup({ onSignupSuccess }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false); // Add loading state
  // Set a smaller default key size for faster demo (optional, but recommended for this code)
  const [primeBits, setPrimeBits] = useState(64); // Changed default to 64 bits

  async function handleSignup(e) {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setLoading(true); // Start loading

    // --- SECURITY WARNING ---
    // Generating keys in the browser like this, especially with insecure methods,
    // and storing the private key in localStorage is NOT secure for real applications.
    // This is for demonstration purposes ONLY.
    // --- END WARNING ---

    try {
      console.log("Starting signup process...");

       // Basic validation: Check if username is provided
       if (!username.trim()) {
           throw new Error("Username is required.");
       }

      // 1. Generate RSA key pair
      // Pass primeBits to control key size for demo speed.
      // Using small number (e.g., 32 or 64) is MUCH faster with trial division.
      // 128 bits will be very slow or hang with current generateLargePrime.
      // Recommend using 64 bits for a faster demo.
      const { publicKey, privateKey } = generateKeyPair(primeBits);
      console.log("Key pair generated.");

      // 2. Encrypt email and password using public key
      console.log("Encrypting email and password...");
      const encryptedEmail = encrypt(email, publicKey);
      const encryptedPassword = encrypt(password, publicKey);
      console.log("Encryption complete.");


      // 3. Store encrypted details and public key parts (n, e) in Supabase
      console.log("Storing data in Supabase...");
      const { data, error: authError } = await supabase.from('authentication').insert([
        {
          username,
          encrypted_email: encryptedEmail,
          encrypted_password: encryptedPassword,
          public_key_n: publicKey.n.toString(), // Store as string for Supabase
          public_key_e: publicKey.e.toString(), // Store as string for Supabase
        },
      ]);

      if (authError) throw authError;
       console.log("Authentication data stored.");

      // 4. Also insert into users table for chat listing
      // Assuming users table is for displaying chat participants and needs their public key
       console.log("Storing user data...");
      const { error: userError } = await supabase.from('users').insert([
        {
          username,
          public_key_n: publicKey.n.toString(), // Store as string
          public_key_e: publicKey.e.toString(), // Store as string
        },
      ]);

      if (userError) throw userError;
       console.log("User data stored.");


      // 5. Store private key in localStorage for demo (normally keep private key SECRET)
      // NOTE: Storing the private key in localStorage is HIGHLY INSECURE.
      // Use the username as part of the localStorage key to avoid overwriting
      console.warn(`Storing private key for ${username} in localStorage. DO NOT DO THIS IN PRODUCTION!`);
      localStorage.setItem(`privateKey_n_${username}`, privateKey.n.toString()); // Key includes username
      localStorage.setItem(`privateKey_d_${username}`, privateKey.d.toString()); // Key includes username
       console.log(`Private key for ${username} stored in localStorage.`);


      setMessage('Signup successful! You can now log in.'); // Display success message
       // Call the onSignupSuccess prop to navigate back to login
       console.log("Signup successful, calling onSignupSuccess...");
       // Use a small delay before redirecting so the user can see the success message
       setTimeout(() => {
           onSignupSuccess();
       }, 1500); // Redirect after 1.5 seconds

      // Clear form fields immediately
      setUsername('');
      setEmail('');
      setPassword('');

    } catch (error) {
      console.error("Signup error:", error); // Log the error details
      setMessage(`Signup failed: ${error.message || 'An unknown error occurred.'}`);
    } finally {
      setLoading(false); // Stop loading regardless of success or failure
       console.log("Signup process finished.");
    }
  }

    // Determine the CSS class for the message paragraph based on content
   const messageClass = message.includes('success') ? styles.success : (message ? styles.error : '');


  return (
    // Apply the container style from the CSS module
    <div className={styles.signupContainer}>
      <h2>Signup</h2>
      {/* Add input to choose prime bit size for demo */}
      {/* Apply the key size select container style */}
      <div className={styles.keySizeSelect}>
          <label htmlFor="primeBits">Key Size (bits per prime - demo):</label>
          <select id="primeBits" value={primeBits} onChange={e => setPrimeBits(Number(e.target.value))} disabled={loading}>
              <option value={32}>32 bits (Fast, No Security)</option>
              <option value={64}>64 bits (Medium, No Security)</option>
              <option value={128}>128 bits (Slow, No Security)</option>
              {/* Larger sizes will likely be too slow with trial division */}
          </select>
           <p><small>Using larger keys takes significantly longer due to slow prime generation.</small></p>
      </div>

      {/* Apply the form style */}
      <form onSubmit={handleSignup} className={styles.signupForm}>
        <input
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
          className={styles.signupInput} // Apply input style
        />
        <input
          placeholder="Email"
          type="email" // Use type="email" for better validation
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
          className={styles.signupInput} // Apply input style
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          disabled={loading} // Disable inputs while loading
          className={styles.signupInput} // Apply input style
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Signing Up...' : 'Signup'} {/* Change button text */}
        </button>
      </form>

      {/* Display message with dynamic class */}
      {message && (
          <p className={`${styles.message} ${messageClass}`}>
              {message}
          </p>
      )}
      {/* Loading indicator message */}
      {loading && <p className={styles.loading}>Generating keys and encrypting data. This may take a moment...</p>}

       {/* Optional: Link/button to go back to login */}
       {/* You might only show this if signup failed or wasn't attempted yet */}
       {/* <p className={styles.switchFormMessage}>
           Already have an account?{' '}
           <button
               type="button"
               onClick={onSignupSuccess} // Re-using the prop to go back to login
               className={styles.switchFormButton}
               disabled={loading}
           >
               Login
           </button>
       </p> */}
    </div>
  );
}
