import React, { useState } from 'react';
import AuthPage from './components/AuthPage'; // Adjust path
import Home from './components/Home'; // Adjust path
import Chat from './components/Chat'; // Adjust path

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [chatWith, setChatWith] = useState(null);

  // This function is called by AuthPage when login is successful
  function handleLogin(username, privKey) {
    console.log(`App.jsx: handleLogin called for user ${username}`);
    setLoggedInUser(username);
    setPrivateKey(privKey);
    // Optionally clear chatWith if you want to go back to the Home page after login
    setChatWith(null);
  }

  function handleLogout() {
    console.log(`App.jsx: Logging out user ${loggedInUser}`);
    setLoggedInUser(null);
    setPrivateKey(null);
    setChatWith(null);
    localStorage.clear(); // Clear local storage on logout
  }

  // If user is NOT logged in, show the AuthPage component
  if (!loggedInUser) {
    console.log("App.jsx: User not logged in, rendering AuthPage.");
    return (
      <div className="auth-container">
        <AuthPage onLogin={handleLogin} />
      </div>
    );
  }

  // If user IS logged in and has selected someone to chat with, show the Chat component
  if (chatWith) {
    console.log(`App.jsx: User ${loggedInUser} is chatting with ${chatWith}, rendering Chat.`);
    return (
      // Render the Chat component and pass props, including the function to go back
      // The Back button is now styled and handled inside Chat.jsx
      <>
        // Render the Chat component and pass props, including the function to go back
        // The Back button is now styled and handled inside Chat.jsx
        <Chat
          currentUser={loggedInUser}
          chatWith={chatWith}
          privateKey={privateKey}
          onBackToUsers={() => setChatWith(null)} // Pass the function to go back
        />
        // Note: The Logout button is typically visible regardless of chatWith status when logged in.
        // You might want to place it differently in your layout. For now, let's add it here.
        <button onClick={handleLogout}>Logout</button></>
    );
  }

  // If user IS logged in but has NOT selected someone to chat with, show the Home component
  console.log(`App.jsx: User ${loggedInUser} is logged in, rendering Home.`);
  return (
    <div className="home-view">
      {/* Home component now acts as the user list/chat selection screen */}
      <Home currentUser={loggedInUser} onChatWith={setChatWith} />
      {/* Logout button visible on the Home screen */}
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}
