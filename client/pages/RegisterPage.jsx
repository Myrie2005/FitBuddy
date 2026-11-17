
import React, { useState } from 'react';

function RegisterPage({ onLoginClick }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  // בדיקת דרישות הסיסמה
  const hasEightCharacters = password.length >= 8;
  const numberCount = (password.match(/[0-9]/g) || []).length;
  const hasFourNumbers = numberCount >= 4;

  const hasSpecialCharacter =
    /[^a-zA-Z0-9\u0590-\u05FF\s]/.test(password);

  const requirements = [
    { text: '8 תווים לפחות', valid: hasEightCharacters },
    { text: '4 ספרות לפחות', valid: hasFourNumbers },
    {
      text: 'סימן מיוחד (! @ # $ %)',
      valid: hasSpecialCharacter
    }
  ];

  const passwordIsValid = requirements.every(
    (item) => item.valid
  );

  const completedCount = requirements.filter(
    (item) => item.valid
  ).length;

  function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('יש למלא את כל השדות');
      return;
    }

    if (!passwordIsValid) {
      setError('יש להשלים את כל דרישות הסיסמה');
      return;
    }

    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות');
      return;
    }

    alert('הטופס תקין! בהמשך נחבר אותו לשרת.');
  }

  return (
    <div
      dir="rtl"
      style={{
        maxWidth: '420px',
        margin: '35px auto',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '16px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h2
        style={{
          textAlign: 'center',
          color: '#4361ee',
          marginBottom: '22px'
        }}
      >
        הרשמה ל-FitBuddy
      </h2>

      <form onSubmit={handleSubmit}>

        {/* שם מלא */}
        <input
          type="text"
          placeholder="שם מלא"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          style={inputStyle}
          autoComplete="name"
          required
        />

        {/* אימייל */}
        <input
          type="email"
          placeholder="כתובת אימייל"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoComplete="email"
          required
        />

        {/* סיסמה */}
        <div style={{ position: 'relative' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="סיסמה"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            style={{
              ...inputStyle,
              paddingLeft: '48px'
            }}
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'
            }
            style={eyeStyle}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* דרישות הסיסמה - מופיעות בזמן הקלדה */}
        {password.length > 0 && (
          <div
            style={{
              backgroundColor: '#f5f7fb',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              padding: '12px',
              marginTop: '10px'
            }}
          >
            {/* מד עמידה בדרישות */}
            <div
              style={{
                display: 'flex',
                gap: '5px',
                marginBottom: '12px'
              }}
            >
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  style={{
                    flex: 1,
                    height: '6px',
                    borderRadius: '5px',
                    backgroundColor:
                      level <= completedCount
                        ? '#16a34a'
                        : '#dce1e9'
                  }}
                />
              ))}
            </div>

            <p
              style={{
                margin: '0 0 10px',
                fontSize: '13px',
                fontWeight: 'bold',
                color: passwordIsValid
                  ? '#16a34a'
                  : '#374151'
              }}
            >
              {passwordIsValid
                ? '✓ כל דרישות הסיסמה מתקיימות'
                : 'הסיסמה חייבת לכלול:'}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px 6px'
              }}
            >
              {requirements.map((item, index) => (
                <div
                  key={item.text}
                  style={{
                    gridColumn: index === 2
                      ? '1 / -1'
                      : 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '12px',
                    color: item.valid
                      ? '#16a34a'
                      : '#dc2626'
                  }}
                >
                  <span aria-hidden="true">
                    {item.valid ? '✓' : '○'}
                  </span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* אימות סיסמה */}
        <div style={{ position: 'relative' }}>
          <input
            type={
              showConfirmPassword ? 'text' : 'password'
            }
            placeholder="אימות סיסמה"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError('');
            }}
            style={{
              ...inputStyle,
              paddingLeft: '48px'
            }}
            autoComplete="new-password"
            required
          />

          <button
            type="button"
            onClick={() =>
              setShowConfirmPassword(!showConfirmPassword)
            }
            aria-label={
              showConfirmPassword
                ? 'הסתר סיסמה'
                : 'הצג סיסמה'
            }
            style={eyeStyle}
          >
            {showConfirmPassword ? '🙈' : '👁️'}
          </button>
        </div>

        {/* התאמה בין הסיסמאות */}
        {confirmPassword.length > 0 && (
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              margin: '10px 0 0',
              color:
                password === confirmPassword
                  ? '#16a34a'
                  : '#dc2626'
            }}
          >
            {password === confirmPassword
              ? '✓ הסיסמאות תואמות'
              : '✗ הסיסמאות אינן תואמות'}
          </p>
        )}

        {/* הודעות שגיאה */}
        {error && (
          <p
            role="alert"
            style={{
              color: '#dc2626',
              textAlign: 'center',
              fontSize: '13px',
              marginTop: '12px'
            }}
          >
            {error}
          </p>
        )}

        {/* כפתור הרשמה */}
        <button
          type="submit"
          style={{
            ...inputStyle,
            marginTop: '20px',
            backgroundColor: '#4361ee',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '16px'
          }}
        >
          הרשמה
        </button>

        {/* מעבר למסך התחברות */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '14px',
            marginTop: '18px',
            color: '#555'
          }}
        >
          כבר יש לך חשבון?{' '}
          <button
            type="button"
            onClick={onLoginClick}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#4361ee',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            להתחברות
          </button>
        </p>

      </form>
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

export default RegisterPage;
