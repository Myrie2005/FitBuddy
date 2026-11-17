
import React, { useState } from 'react';
import LoginPage from './LoginPage.jsx';
import RegisterPage from './RegisterPage.jsx';

function AuthPage() {
  const [currentPage, setCurrentPage] = useState('login');

  return (
    <>
      {currentPage === 'login' ? (
        <LoginPage
          onRegisterClick={() => setCurrentPage('register')}
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
