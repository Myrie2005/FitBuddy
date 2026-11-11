
import React, { useState } from 'react';

function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError('יש למלא את כל השדות');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    alert('הטופס תקין! בהמשך נחבר אותו לשרת.');
  }

  return (
    <div dir="rtl" style={{
      maxWidth: '420px',
      margin: '60px auto',
      padding: '30px',
      backgroundColor: 'white',
      borderRadius: '16px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ textAlign: 'center', color: '#4361ee' }}>
        הרשמה ל-FitBuddy
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="שם מלא"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="email"
          placeholder="כתובת אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="password"
          placeholder="סיסמה"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />

        <input
          type="password"
          placeholder="אימות סיסמה"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
          required
        />

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" style={{
          ...inputStyle,
          backgroundColor: '#4361ee',
          color: 'white',
          border: 'none',
          cursor: 'pointer'
        }}>
          הרשמה
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '14px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxSizing: 'border-box'
};

export default RegisterPage;
