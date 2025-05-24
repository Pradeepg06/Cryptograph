import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

import styles from './Home.module.css'; // CSS Module

export default function Home({ currentUser, onChatWith }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Add this hook

  useEffect(() => {
    async function fetchUsers() {
      console.log("Home.jsx: Fetching users...");
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('users')
        .select('username, public_key_n, public_key_e');

      if (fetchError) {
        console.error("Error fetching users:", fetchError);
        setError("Failed to load users.");
        setUsers([]);
      } else {
        console.log("Users fetched:", data);
        setUsers(data.filter(u => u.username !== currentUser));
      }

      setLoading(false);
    }

    fetchUsers();

    const subscription = supabase
      .channel('users')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'users' },
        (payload) => {
          console.log('New user joined:', payload.new);
          if (payload.new.username !== currentUser) {
            setUsers(current => [...current, payload.new]);
          }
        }
      )
      .subscribe();

    return () => {
      console.log("Home.jsx: Cleaning up user subscription.");
      supabase.removeChannel(subscription);
    };
  }, [currentUser]);

  const handleUserClick = (username) => {
    onChatWith(username);
    navigate('/chat'); // Add navigation
  };

  return (
    <div className={styles.homeContainer}>
      <h2>Welcome, {currentUser}!</h2>
      <h3>Available Users:</h3>

      {loading && <p className={styles.loading}>Loading users...</p>}
      {error && <p className={`${styles.message} ${styles.error}`}>{error}</p>}

      {!loading && !error && users.length === 0 && (
        <p className={styles.noUsersMessage}>
          No other users found yet. Invite someone to sign up!
        </p>
      )}

      {!loading && !error && users.length > 0 && (
        <ul className={styles.userList}>
          {users.map(user => (
            <li key={user.username} className={styles.userItem}>
              <button 
                className={styles.userButton} 
                onClick={() => handleUserClick(user.username)} // Update click handler
              >
                {user.username}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Link to Cryptanalytic Attack Demo */}
      <div className={styles.demoLinkContainer}>
        <Link to="/attack-demo" className={styles.demoLinkButton}>
          🔓 Cryptanalytic Attack Demo
        </Link>
      </div>
    </div>
  );
}
