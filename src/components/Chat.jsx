import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { encrypt, decrypt } from '../crypto/rsa';
import styles from './Chat.module.css';

export default function Chat({ currentUser, chatWith, privateKey, onBackToUsers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatPartnerPublicKey, setChatPartnerPublicKey] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState(null);
  const messagesEndRef = useRef(null);

  // Fetch chat partner's public key
  useEffect(() => {
    async function fetchChatPartnerPublicKey() {
      const { data, error } = await supabase
        .from('users')
        .select('public_key_n, public_key_e')
        .eq('username', chatWith)
        .single();

      if (data) {
        setChatPartnerPublicKey({
          n: BigInt(data.public_key_n),
          e: BigInt(data.public_key_e),
        });
      } else {
        console.error('Failed to fetch public key:', error);
        setChatPartnerPublicKey(null);
      }
    }

    if (chatWith) fetchChatPartnerPublicKey();
  }, [chatWith]);

  // Fetch messages and subscribe
  useEffect(() => {
    if (!chatWith || !privateKey) return;

    const fetchMessages = async () => {
      setLoadingMessages(true);
      setMessagesError(null);

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_username.eq.${currentUser},receiver_username.eq.${chatWith}),and(sender_username.eq.${chatWith},receiver_username.eq.${currentUser})`
        )
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        setMessagesError('Failed to load messages.');
        setMessages([]);
        setLoadingMessages(false);
        return;
      }

      const decrypted = data.map((msg) => {
        if (msg.receiver_username === currentUser) {
          try {
            const content = decrypt(msg.encrypted_message, privateKey);
            return { ...msg, decrypted_message: content };
          } catch (e) {
            console.error('Decrypt error:', e);
            return { ...msg, decrypted_message: '[Decryption error]' };
          }
        } else {
          return { ...msg, decrypted_message: '[Sent]' };
        }
      });

      setMessages(decrypted);
      setLoadingMessages(false);
    };

    fetchMessages();

    // Real-time subscription
    const channelName = `chat_${[currentUser, chatWith].sort().join('_')}`;
    const subscription = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_username=eq.${currentUser}`,
        },
        async (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_username === currentUser && msg.receiver_username === chatWith) ||
            (msg.sender_username === chatWith && msg.receiver_username === currentUser)
          ) {
            let content = '[Decryption error]';
            try {
              content = decrypt(msg.encrypted_message, privateKey);
            } catch (e) {
              console.error('Decryption error:', e);
            }

            setMessages((prev) => [...prev, { ...msg, decrypted_message: content }]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chatWith, privateKey, currentUser]);

  // Scroll to bottom on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatPartnerPublicKey) return;

    const encryptedMsg = encrypt(input, chatPartnerPublicKey);
    const tempId = Date.now().toString();

    const newMsg = {
      id: tempId,
      sender_username: currentUser,
      receiver_username: chatWith,
      encrypted_message: encryptedMsg,
      decrypted_message: input, // Show plaintext immediately
    };

    setMessages((prev) => [...prev, newMsg]);
    setInput('');

    const { error } = await supabase.from('messages').insert([
      {
        sender_username: currentUser,
        receiver_username: chatWith,
        encrypted_message: encryptedMsg,
      },
    ]);

    if (error) {
      console.error('Send error:', error);
      alert('Message send failed.');
    }
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <button className={styles.backButton} onClick={onBackToUsers}>← Back</button>
        <h3>Chatting with {chatWith}</h3>
      </div>

      <div className={styles.messageList}>
        {loadingMessages && <p className={styles.loading}>Loading messages...</p>}
        {messagesError && <p className={styles.errorMessage}>{messagesError}</p>}
        {!loadingMessages && !messagesError && messages.length === 0 && (
          <p className={styles.noMessagesMessage}>No messages yet.</p>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`${styles.messageBubble} ${
              msg.sender_username === currentUser ? styles.sent : styles.received
            }`}
          >
            <span className={styles.messageSender}>{msg.sender_username}</span>
            <div className={styles.messageContent}>{msg.decrypted_message}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className={styles.messageInputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={chatPartnerPublicKey ? 'Type a message' : 'Loading key...'}
          disabled={!chatPartnerPublicKey || loadingMessages}
          className={styles.messageInput}
        />
        <button type="submit" disabled={!chatPartnerPublicKey || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
