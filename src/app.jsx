import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';

import AuthPage from './components/AuthPage';
import Home from './components/Home';
import Chat from './components/Chat';
import AttackDemo from './components/AttackDemo';

export default function App() {
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [chatWith, setChatWith] = useState(null);

  function handleLogin(username, privKey) {
    console.log(`App.jsx: handleLogin called for user ${username}`);
    setLoggedInUser(username);
    setPrivateKey(privKey);
    setChatWith(null);
  }

  function handleLogout() {
    console.log(`App.jsx: Logging out user ${loggedInUser}`);
    setLoggedInUser(null);
    setPrivateKey(null);
    setChatWith(null);
    localStorage.clear();
  }

  return (
    <Router>
      <Routes>
        {/* Login route */}
        <Route
          path="/"
          element={
            loggedInUser ? (
              <Navigate to="/home" />
            ) : (
              <AuthPage onLogin={handleLogin} />
            )
          }
        />

        {/* Home route */}
        <Route
          path="/home"
          element={
            loggedInUser ? (
              <Home
                currentUser={loggedInUser}
                onChatWith={setChatWith}
                onLogout={handleLogout} // Pass logout handler to Home
              />
            ) : (
              <Navigate to="/" />
            )
          }
        />

        {/* Chat route */}
        <Route
          path="/chat"
          element={
            loggedInUser && chatWith ? (
              <Chat
                currentUser={loggedInUser}
                chatWith={chatWith}
                privateKey={privateKey}
                onBackToUsers={() => {
                  setChatWith(null);
                }}
              />
            ) : (
              <Navigate to="/home" />
            )
          }
        />

        {/* Attack Demo */}
        <Route path="/attack-demo" element={<AttackDemo />} />
      </Routes>
    </Router>
  );
}
