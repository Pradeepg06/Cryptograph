import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { encrypt, decrypt } from '../crypto/rsa';

export default function ChatRoom({ currentUser, chatWith, setChatWith, privateKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatPartnerPublicKey, setChatPartnerPublicKey] = useState(null);
  const [showCipher, setShowCipher] = useState(false);

  // Fetch partner's public key
  useEffect(() => {
    async function fetchPublicKey() {
      const { data, error } = await supabase
        .from('users')
        .select('public_key_n, public_key_e')
        .eq('username', chatWith);

      if (error) {
        console.error('Error fetching public key:', error);
        setChatPartnerPublicKey(null);
        return;
      }

      if (data && data.length > 0) {
        setChatPartnerPublicKey({
          n: BigInt(data[0].public_key_n),
          e: BigInt(data[0].public_key_e),
        });
      }
    }

    if (chatWith) {
      fetchPublicKey();

      const subscription = supabase
        .channel(`chat_${[currentUser, chatWith].sort().join('_')}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            const newMsg = payload.new;
            if (
              (newMsg.sender === currentUser && newMsg.receiver === chatWith) ||
              (newMsg.sender === chatWith && newMsg.receiver === currentUser)
            ) {
              setMessages((prev) => [...prev, newMsg]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    } else {
      setChatPartnerPublicKey(null);
      setMessages([]);
    }
  }, [currentUser, chatWith]);

  // Initial fetch of messages
  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender.eq.${currentUser},receiver.eq.${chatWith}),and(sender.eq.${chatWith},receiver.eq.${currentUser})`
        )
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      if (data && privateKey) {
        const decryptedMessages = data.map((msg) => {
          let plain = msg.content;
          try {
            plain = decrypt(msg.content, privateKey.n, privateKey.d);
          } catch (e) {
            console.warn('Decryption failed:', e);
          }
          return {
            ...msg,
            plainContent: plain,
          };
        });
        setMessages(decryptedMessages);
      } else {
        setMessages(data || []);
      }
    }

    if (chatWith && privateKey) {
      fetchMessages();
    } else {
      setMessages([]);
    }
  }, [currentUser, chatWith, privateKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatPartnerPublicKey) return;

    try {
      const encryptedMessage = encrypt(input, chatPartnerPublicKey.n, chatPartnerPublicKey.e);

      const { error } = await supabase.from('messages').insert([
        {
          sender: currentUser,
          receiver: chatWith,
          content: encryptedMessage,
        },
      ]);

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setInput('');
      }
    } catch (e) {
      console.error('Encryption/send failed:', e);
    }
  };

  function UsersList({ currentUser, onChatWith }) {
    const [users, setUsers] = useState([]);

    useEffect(() => {
      async function fetchUsers() {
        const { data, error } = await supabase.from('users').select('username');
        if (error) {
          console.error('Error fetching users:', error);
          return;
        }
        setUsers(data.filter((u) => u.username !== currentUser));
      }
      fetchUsers();
    }, [currentUser]);

    return (
      <div>
        <h3>Users</h3>
        <ul>
          {users.map((user) => (
            <li key={user.username}>
              <button onClick={() => onChatWith(user.username)}>
                Chat with {user.username}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div>
      <h1>Chat Room</h1>
      {chatWith ? (
        <>
          <button onClick={() => setChatWith(null)}>Back to Users List</button>
          <h2>Chatting with {chatWith}</h2>

          <div style={{ marginBottom: '10px' }}>
            <label>
              <input
                type="checkbox"
                checked={showCipher}
                onChange={() => setShowCipher(!showCipher)}
              />{' '}
              Show Ciphertext
            </label>
          </div>

          <div className="messages" style={{ marginBottom: '10px', maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '10px' }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  backgroundColor: msg.sender === currentUser ? '#DCF8C6' : '#FFF',
                  padding: '5px',
                  margin: '5px 0',
                  borderRadius: '5px',
                  textAlign: msg.sender === currentUser ? 'right' : 'left',
                }}
              >
                <strong>{msg.sender}:</strong>{' '}
                {showCipher ? msg.content : msg.plainContent || msg.content}
              </div>
            ))}
          </div>

          <form onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              disabled={!chatPartnerPublicKey}
            />
            <button type="submit" disabled={!chatPartnerPublicKey}>
              Send
            </button>
          </form>
        </>
      ) : (
        <UsersList currentUser={currentUser} onChatWith={setChatWith} />
      )}
    </div>
  );
}
