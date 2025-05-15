import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if necessary

// Import the CSS Module
import styles from './Home.module.css'; // Adjust path if necessary

export default function Home({ currentUser, onChatWith }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state for fetching users
  const [error, setError] = useState(null); // Add error state

  useEffect(() => {
    async function fetchUsers() {
      console.log("Home.jsx: Fetching users...");
      setLoading(true); // Start loading
      setError(null); // Clear previous errors

      // Fetch users from the 'users' table
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('username, public_key_n, public_key_e'); // Fetch public keys too, useful later for chat

      if (fetchError) {
          console.error("Error fetching users:", fetchError);
          setError("Failed to load users."); // Set error message
          setUsers([]); // Clear users on error
      } else {
          console.log("Users fetched:", data);
          // Filter out the current user from the list
          // Store the user objects including public keys
          setUsers(data.filter(u => u.username !== currentUser));
      }
      setLoading(false); // Stop loading
    }

    // Fetch users when the component mounts or currentUser changes
    fetchUsers();

    // Optional: Set up a real-time subscription for new users joining
    // This would make the user list update automatically
    const subscription = supabase
        .channel('users') // Use a specific channel name
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, (payload) => {
            console.log('New user joined:', payload.new);
            // Add the new user to the list if it's not the current user
            if (payload.new.username !== currentUser) {
                setUsers(currentUsers => [...currentUsers, payload.new]);
            }
        })
        .subscribe(); // Don't forget to subscribe!

    // Cleanup function for the effect
    return () => {
        console.log("Home.jsx: Cleaning up user subscription.");
        supabase.removeChannel(subscription); // Remove the subscription on component unmount
    };

  }, [currentUser]); // Dependency array includes currentUser

  return (
    // Apply the container style from the CSS module
    <div className={styles.homeContainer}>
      {/* Apply heading styles */}
      <h2>Welcome, {currentUser}!</h2>

      <h3>Available Users:</h3>

      {loading && <p className={styles.loading}>Loading users...</p>} {/* Loading message */}
      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>} {/* Error message */}

      {/* Conditionally render the user list or a message if no users */}
      {!loading && !error && users.length === 0 && (
          <p className={styles.noUsersMessage}>No other users found yet. Invite someone to sign up!</p>
      )}

      {/* Apply list style - only render if there are users and no error */}
      {!loading && !error && users.length > 0 && (
        <ul className={styles.userList}>
          {users.map(user => ( // Map over user objects
            // Apply list item style
            <li key={user.username} className={styles.userItem}>
              {/* Apply button style */}
              {/* When button is clicked, call onChatWith prop with the selected username */}
              {/* We might need the public key later, but onChatWith currently expects just username */}
              <button className={styles.userButton} onClick={() => onChatWith(user.username)}>
                  {user.username}
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Note: The Logout button is handled in App.jsx based on your structure,
           so it's not included here. If you move it here, apply styles.logoutButton */}
    </div>
  );
}