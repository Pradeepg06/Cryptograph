import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import AuthPage from './components/AuthPage';
import Home from './components/Home';
import Chat from './components/Chat';
import AttackDemo from './components/AttackDemo'; // 👈 Import the new page

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

        {/* Home route (user list) */}
        <Route
          path="/home"
          element={
            loggedInUser ? (
              <>
                <Home currentUser={loggedInUser} onChatWith={setChatWith} />
                <button onClick={handleLogout}>Logout</button>
              </>
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
              <>
                <Chat
                  currentUser={loggedInUser}
                  chatWith={chatWith}
                  privateKey={privateKey}
                  onBackToUsers={() => {
                    setChatWith(null);
                    navigate('/home');
                  }}
                />
                <button onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <Navigate to="/home" />
            )
          }
        />

        {/* Cryptanalysis Attack Demo route */}
        <Route path="/attack-demo" element={<AttackDemo />} />
      </Routes>
    </Router>
  );
}
