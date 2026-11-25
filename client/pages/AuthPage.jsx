
import React, { useState } from 'react';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';

function AuthPage() {
  const [currentPage, setCurrentPage] = useState('login');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);

  function handleLoginSuccess(userData, jwtToken) {
    setUser(userData);
    setToken(jwtToken);
  }

  function handleLogout() {
    setUser(null);
    setToken(null);
    setCurrentPage('login');
  }

  if (user && token) {
    return (
      <div
        dir="rtl"
        style={{
          textAlign: 'center',
          margin: '80px auto',
          fontFamily: 'Arial, sans-serif'
        }}
      >
        <h1 style={{ color: '#4361ee' }}>
          ברוכים הבאים ל-FitBuddy
        </h1>

        <h2>שלום {user.name}!</h2>

        <p>התחברת למערכת בהצלחה</p>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: '#4361ee',
            color: 'white',
            padding: '12px 30px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          התנתקות
        </button>
      </div>
    );
  }

  return (
    <>
      {currentPage === 'login' ? (
        <LoginPage
          onRegisterClick={() => setCurrentPage('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : (
        <RegisterPage
          onLoginClick={() => setCurrentPage('login')}
        />
      )}
    </>
  );
}

export default AuthPage;
