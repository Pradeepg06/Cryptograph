// src/components/AuthPage.jsx
import React, { useState } from 'react';
import Login from './Login'; // Adjust path based on your file structure
import Signup from './Signup'; // Adjust path based on your file structure

// AuthPage receives the onLogin prop from App.jsx
export default function AuthPage({ onLogin }) { // <-- Receive the onLogin prop
  // State to track which form is currently visible ('login' or 'signup')
  const [view, setView] = useState('login');

  // This function is called by the Login component when login is successful
  const handleSuccessfulLoginFromLoginComponent = (username, privateKey) => {
    console.log(`AuthPage: Login component reported successful login for ${username}.`);
    // Call the onLogin prop that AuthPage received from App.jsx
    // This passes the login info (username, privateKey) up to App.jsx
    if (onLogin) { // Check if the prop exists before calling
      onLogin(username, privateKey);
    }
    // We don't need to change AuthPage's internal 'view' state here
    // because App.jsx updating its loggedInUser state will cause App.jsx
    // to stop rendering AuthPage entirely and switch to Home/Chat.
  };

  // Function to switch to the signup view
  const goToSignup = () => {
    console.log("AuthPage: Switching to signup view.");
    setView('signup');
  };

  // Function to switch back to the login view (used after successful signup)
  const goToLogin = () => {
    console.log("AuthPage: Switching to login view.");
    setView('login');
    // Optional: You could set a message state here to show "Signup successful, please login"
    // in the Login component, but that requires passing a message prop down.
    // For now, we rely on the Login component's own message state.
  };

  return (
    <div className="auth-page-container"> {/* Add a container class for styling */}
      {/* Conditionally render Login or Signup based on the 'view' state */}
      {view === 'login' ? (
        // Render the Login component
        // Pass the handler that calls the App.jsx prop down to the Login component
        <Login onLogin={handleSuccessfulLoginFromLoginComponent} onGoToSignup={goToSignup} />
      ) : (
        // Render the Signup component
        // Pass the handler to go back to login after successful signup
        <Signup onSignupSuccess={goToLogin} />
      )}
    </div>
  );
}