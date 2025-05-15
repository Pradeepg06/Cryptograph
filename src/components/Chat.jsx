import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path if necessary
import { encrypt, decrypt } from '../crypto/rsa'; // Ensure encrypt and decrypt are exported

// Import the CSS Module
import styles from './Chat.module.css'; // Adjust path if necessary

// Receive onBackToUsers prop from App.jsx
export default function Chat({ currentUser, chatWith, privateKey, onBackToUsers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatPartnerPublicKey, setChatPartnerPublicKey] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState(null);

  // Ref to keep the message list scrolled to the bottom
  const messagesEndRef = useRef(null);

  // --- Effects ---

  // Effect to fetch chat partner's public key
  useEffect(() => {
    async function fetchChatPartnerPublicKey() {
      console.log(`Chat.jsx: Fetching public key for ${chatWith}`);
      const { data, error } = await supabase
        .from('users')
        .select('public_key_n, public_key_e')
        .eq('username', chatWith)
        .single(); // Expecting a single user

      if (error) {
        console.error('Chat.jsx: Error fetching public key:', error);
        // Handle error, maybe disable sending or show a message
      } else if (data) {
        console.log('Chat.jsx: Public key fetched.');
        setChatPartnerPublicKey({
          n: BigInt(data.public_key_n),
          e: BigInt(data.public_key_e),
        });
      } else {
         console.warn(`Chat.jsx: Public key not found for ${chatWith}.`);
         // Handle case where user is found but key is missing
      }
    }

    if (chatWith) {
      fetchChatPartnerPublicKey();
    } else {
        setChatPartnerPublicKey(null);
    }
  }, [chatWith]); // Re-run if chatWith changes

  // Effect to fetch initial messages and set up real-time subscription
  useEffect(() => {
    async function fetchAndSubscribeMessages() {
      console.log(`Chat.jsx: Fetching initial messages with ${chatWith}...`);
      setLoadingMessages(true);
      setMessagesError(null);

      // Fetch initial messages
      const { data, error: fetchError } = await supabase
        .from('messages')
        .select('*') // Select all columns, including timestamp
        // Select messages where sender is currentUser AND receiver is chatWith
        // OR sender is chatWith AND receiver is currentUser
        .or(`and(sender_username.eq.${currentUser},receiver_username.eq.${chatWith}),and(sender_username.eq.${chatWith},receiver_username.eq.${currentUser})`)
        .order('timestamp', { ascending: true }); // Order chronologically

      if (fetchError) {
        console.error('Chat.jsx: Error fetching messages:', fetchError);
        setMessagesError("Failed to load messages.");
        setMessages([]); // Clear messages on error
      } else {
        console.log('Chat.jsx: Initial messages fetched:', data);
        // Decrypt messages if private key is available
        const decryptedMessages = data.map(msg => {
            if (!privateKey) {
                console.warn("Chat.jsx: Private key not available, cannot decrypt messages.");
                return { ...msg, decrypted_message: '[Key not available]' };
            }
            try {
                const decryptedContent = decrypt(msg.encrypted_message, privateKey); // Pass private key object
                return { ...msg, decrypted_message: decryptedContent };
            } catch (e) {
                console.error('Chat.jsx: Error decrypting message:', msg.id, e);
                return { ...msg, decrypted_message: '[Decryption error]' };
            }
        });
        setMessages(decryptedMessages);
      }
      setLoadingMessages(false);


      // Set up real-time subscription
      console.log(`Chat.jsx: Setting up real-time subscription for chat with ${chatWith}...`);
      // Create a unique channel name for the conversation pair, sorted alphabetically
      const channelName = `chat_${[currentUser, chatWith].sort().join('_')}`;
      const subscription = supabase
        .channel(channelName)
        // Listen for INSERT events on the 'messages' table
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          console.log('Chat.jsx: Real-time new message received:', payload.new);

          // Filter messages relevant to this specific chat pair
          if (
            (payload.new.sender_username === currentUser && payload.new.receiver_username === chatWith) ||
            (payload.new.sender_username === chatWith && payload.new.receiver_username === currentUser)
          ) {
              console.log('Chat.jsx: Message is relevant to this chat.');
              // Decrypt the new message before adding to state
              let decryptedNewMessage;
              if (!privateKey) {
                  console.warn("Chat.jsx: Private key not available for real-time decryption.");
                  decryptedNewMessage = '[Key not available]';
              } else {
                  try {
                      decryptedNewMessage = decrypt(payload.new.encrypted_message, privateKey); // Pass private key object
                  } catch (e) {
                      console.error('Chat.jsx: Error decrypting new real-time message:', payload.new.id, e);
                      decryptedNewMessage = '[Decryption error]';
                  }
              }

              // Add the new message (with decrypted content) to the state
              setMessages(prevMessages => [
                  ...prevMessages,
                  { ...payload.new, decrypted_message: decryptedNewMessage }
              ]);
          }
        })
        .subscribe(); // Subscribe to the channel

      // Cleanup function: unsubscribe when component unmounts or chatWith changes
      return () => {
        console.log(`Chat.jsx: Cleaning up subscription for chat with ${chatWith}.`);
        supabase.removeChannel(subscription);
      };
    }

    // Only run this effect if chatWith and privateKey are available
    if (chatWith && privateKey) {
      fetchAndSubscribeMessages();
    } else if (!privateKey && chatWith) {
        console.warn("Chat.jsx: Private key is required to fetch and decrypt messages.");
        setMessagesError("Private key not available. Cannot load chat.");
        setLoadingMessages(false);
        setMessages([]);
    }

    // Added decrypt to dependency array as recommended by linter, though it's a stable function
  }, [currentUser, chatWith, privateKey, decrypt, encrypt]); // Added encrypt too, just in case

  // Effect to scroll to the bottom whenever messages state updates
  useEffect(() => {
    // Use a timeout to ensure the DOM has updated before scrolling
    const timer = setTimeout(() => {
         messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50); // Small delay

    return () => clearTimeout(timer); // Cleanup timeout
  }, [messages]); // Scroll when messages change


  // --- Send Message Function ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatPartnerPublicKey) {
        console.log("Chat.jsx: Message input is empty or receiver public key not available.");
        return; // Don't send empty messages or if key isn't ready
    }

    console.log(`Chat.jsx: Sending message to ${chatWith}...`);

    try {
      // Encrypt message with receiver's public key
      const encryptedMsg = encrypt(input, chatPartnerPublicKey); // Pass public key object
      console.log("Chat.jsx: Message encrypted.");

      // Insert the encrypted message into the 'messages' table
      const { data, error } = await supabase.from('messages').insert([
        {
          sender_username: currentUser,
          receiver_username: chatWith,
          encrypted_message: encryptedMsg,
          // Supabase will add id and timestamp automatically if configured
        },
      ]);

      if (error) {
        console.error('Chat.jsx: Error sending message:', error);
        alert('Failed to send message: ' + error.message); // Show error to user
      } else {
        console.log('Chat.jsx: Message sent successfully.');
        setInput(''); // Clear the input field

        // The new message will be added to the state automatically by the real-time subscription
        // No need to refetch messages here.
      }
    } catch (e) {
        console.error('Chat.jsx: Error encrypting or sending message:', e);
        alert('Failed to send message: ' + e.message); // Show encryption/send error
    }
  };

  // --- Render ---
  return (
    // Apply main container style
    <div className={styles.chatContainer}>
        {/* Header with Back button and chat partner name */}
        <div className={styles.chatHeader}>
             {/* Back button */}
             <button className={styles.backButton} onClick={onBackToUsers}>
                 ← Back to Users
             </button>
             {/* Chat partner name */}
             <h3>Chatting with {chatWith}</h3>
        </div>


      {/* Container for messages, with scrolling */}
      <div className={styles.messageList}>
        {loadingMessages && <p className={styles.loading}>Loading messages...</p>}
        {messagesError && <p className={`${styles.message} ${styles.errorMessage}`}>{messagesError}</p>}
        {!loadingMessages && !messagesError && messages.length === 0 && (
            <p className={styles.noMessagesMessage}>No messages yet. Start the conversation!</p>
        )}

        {/* Map and display messages */}
        {!loadingMessages && !messagesError && messages.map(msg => (
            // Apply bubble style and sender/receiver class
            <div
                key={msg.id} // Use unique message ID as key
                className={`${styles.messageBubble} ${msg.sender_username === currentUser ? styles.sent : styles.received}`}
            >
                {/* Display sender name */}
                 <span className={styles.messageSender}>{msg.sender_username}</span>
                {/* Display decrypted message content */}
                 <div className={styles.messageContent}>
                    {msg.decrypted_message}
                 </div>
                 {/* Optional: Display timestamp */}
                 {/* <div className={styles.messageTimestamp}>
                      {new Date(msg.timestamp).toLocaleTimeString()}
                 </div> */}
            </div>
        ))}
        {/* Element to scroll into view */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleSend} className={styles.messageInputForm}>
        {/* Apply input style */}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={chatPartnerPublicKey ? "Type a message" : "Loading key..."}
          disabled={!chatPartnerPublicKey || loadingMessages} // Disable input while key loads or messages load
          className={styles.messageInput}
        />
        {/* Apply send button style */}
        <button type="submit" disabled={!chatPartnerPublicKey || !input.trim()}> {/* Disable if key not loaded or input is empty */}
            Send
        </button>
      </form>

        {/* Optional: Add key status for debugging */}
        {/* {!chatPartnerPublicKey && !loadingMessages && <p style={{textAlign: 'center', color: 'orange', fontSize: '0.9em'}}>Waiting for partner's public key...</p>} */}

    </div>
  );
}
