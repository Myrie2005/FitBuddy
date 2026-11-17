
import React, { useState } from 'react';

function LoginPage({ onRegisterClick, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('יש למלא את כל השדות');
      return;
    }

    setIsLoading(true);

    try {
      // כאן נחבר בהמשך את בקשת ההתחברות לשרת של עמית.
      // כרגע אין אימות משתמש אמיתי.
      setError('ההתחברות עדיין לא מחוברת לשרת. המסך מוכן לחיבור.');
    } catch (err) {
      setError('אירעה שגיאה. נסי שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: '420px',
        margin: '60px auto',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h2 style={{
        textAlign: 'center',
        color: '#4361ee',
        marginBottom: '24px'
      }}>
        התחברות ל-FitBuddy
      </h2>

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="כתובת אימייל"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          autoComplete="email"
          style={inputStyle}
          required
          disabled={isLoading}
        />

        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="סיסמה"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            style={{ ...inputStyle, paddingLeft: '48px' }}
            required
            disabled={isLoading}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
            style={eyeStyle}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {error && (
          <p role="alert" style={{
            color: '#dc2626',
            textAlign: 'center',
            fontSize: '13px'
          }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          style={{
            ...inputStyle,
            marginTop: '20px',
            backgroundColor: '#4361ee',
            color: 'white',
            border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            opacity: isLoading ? 0.7 : 1,
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          {isLoading ? 'מתחברת...' : 'התחברות'}
        </button>
      </form>

      <p style={{
        textAlign: 'center',
        fontSize: '14px',
        marginTop: '20px',
        color: '#555'
      }}>
        עדיין אין לך חשבון?{' '}
        <button
          type="button"
          onClick={onRegisterClick}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#4361ee',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          להרשמה
        </button>
      </p>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '12px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  boxSizing: 'border-box',
  fontSize: '14px'
};

const eyeStyle = {
  position: 'absolute',
  left: '12px',
  top: 'calc(50% + 6px)',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '20px',
  padding: '5px'
};

export default LoginPage;
