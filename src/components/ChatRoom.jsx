import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { encrypt, decrypt } from '../crypto/rsa';

export default function ChatRoom({ currentUser, chatWith, privateKey }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatPartnerPublicKey, setChatPartnerPublicKey] = useState(null);

  useEffect(() => {
    // Fetch chat partner public key
    async function fetchPublicKey() {
      const { data, error } = await supabase
        .from('users')
        .select('public_key_n, public_key_e')
        .eq('username', chatWith);

      if (error) {
        console.error('Error fetching public key:', error);
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
      // Subscribe to new messages
      const subscription = supabase
        .channel(`chat_${[currentUser, chatWith].sort().join('_')}`) // Unique channel name for the pair
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
          // Filter messages relevant to this chat
          if (
            (payload.new.sender === currentUser && payload.new.receiver === chatWith) ||
            (payload.new.sender === chatWith && payload.new.receiver === currentUser)
          ) {
            setMessages(prevMessages => [...prevMessages, payload.new]);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [currentUser, chatWith]);

  useEffect(() => {
    // Fetch initial messages
    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender.eq.${currentUser},receiver.eq.${chatWith}),and(sender.eq.${chatWith},receiver.eq.${currentUser})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
        return;
      }

      // Decrypt messages if privateKey is available
      if (data && privateKey) {
        const decryptedMessages = data.map(msg => {
          try {
            const decryptedContent = decrypt(msg.content, privateKey.n, privateKey.d);
            return { ...msg, content: decryptedContent };
          } catch (e) {
            console.error('Error decrypting message:', e);
            return msg; // Return encrypted message if decryption fails
          }
        });
        setMessages(decryptedMessages);
      } else {
        setMessages(data || []);
      }
    }

    if (chatWith && privateKey) {
      fetchMessages();
    }
  }, [currentUser, chatWith, privateKey]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !chatPartnerPublicKey) return;

    try {
      // Encrypt the message
      const encryptedMessage = encrypt(input, chatPartnerPublicKey.n, chatPartnerPublicKey.e);

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender: currentUser,
            receiver: chatWith,
            content: encryptedMessage, // Store encrypted content
          },
        ]);

      if (error) {
        console.error('Error sending message:', error);
      } else {
        setInput('');
        // The new message will be added to state via the real-time subscription
      }
    } catch (e) {
      console.error('Error encrypting or sending message:', e);
    }
  };

  // Added missing UsersList component snippet based on the user's partial code
  // Assuming this is how the UsersList component might look based on the fragment provided.
  // This part was not fully in the original request but seems implied by the second block.
  // If this was unintended, please disregard this component.
  function UsersList({ currentUser, onChatWith }) {
    const [users, setUsers] = useState([]);

    useEffect(() => {
      async function fetchUsers() {
        const { data, error } = await supabase.from('users').select('username');
        if (error) {
          console.error('Error fetching users:', error);
          return;
        }
        // Filter out the current user
        setUsers(data.filter(u => u.username !== currentUser));
      }
      fetchUsers();
    }, [currentUser]);

    return (
      <div>
        <h2>Welcome, {currentUser}</h2>
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
          <h2>Chatting with {chatWith}</h2>
          <div className="messages">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.sender === currentUser ? 'sent' : 'received'}>
                <strong>{msg.sender}:</strong> {privateKey ? (msg.sender === currentUser ? decrypt(msg.content, privateKey.n, privateKey.d) : msg.content) : msg.content}
                {/* Note: Messages sent by the other user are displayed as encrypted if privateKey is not available here,
                         or if decryption failed earlier. A more robust approach would handle this UI differently.
                         The decrypt function is called inline here for the current user's messages for demonstration,
                         but initial fetch already decrypts for both sides if possible. The message content in state
                         should ideally be the decrypted one if successful. */}
              </div>
            ))}
          </div>
          <form onSubmit={handleSend}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message"
              disabled={!chatPartnerPublicKey} // Disable input until public key is fetched
            />
            <button type="submit" disabled={!chatPartnerPublicKey}>Send</button>
          </form>
        </>
      ) : (
         // Render UsersList if no chat partner is selected
        <UsersList currentUser={currentUser} onChatWith={chatWith} />
      )}
    </div>
  );
}