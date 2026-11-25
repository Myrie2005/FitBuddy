
import React, { useState } from 'react';

const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

function RegisterPage({ onLoginClick }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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

  async function handleSubmit(event) {
    event.preventDefault();

    if (loading || success) return;

    setError('');
    setSuccess('');

    if (
      !fullName.trim() ||
      !email.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError('יש למלא את כל השדות');
      return;
    }

    if (
      fullName.trim().length < 2 ||
      fullName.trim().length > 50
    ) {
      setError('השם חייב להכיל בין 2 ל-50 תווים');
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

    setLoading(true);

    try {
      // שליחת פרטי ההרשמה לשרת
      const response = await fetch(
        `${API_URL}/api/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: fullName.trim(),
            email: email.trim().toLowerCase(),
            password: password
          })
        }
      );

      const data = await response.json().catch(() => null);

      // טיפול בשגיאות מהשרת
      if (!response.ok) {
        if (
          response.status === 409 ||
          data?.code === 'EMAIL_EXISTS'
        ) {
          setError(
            'כתובת האימייל כבר רשומה במערכת. יש לעבור למסך ההתחברות.'
          );
        } else if (response.status === 400) {
          setError('פרטי ההרשמה אינם תקינים');
        } else {
          setError('ההרשמה נכשלה. יש לנסות שוב.');
        }

        return;
      }

      if (response.status !== 201 || !data?.user?.id) {
        setError('התקבלה תשובה לא צפויה מהשרת');
        return;
      }

      // הרשמה הצליחה
      setSuccess('ההרשמה בוצעה בהצלחה! כעת ניתן להתחבר.');

      setFullName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);

    } catch (error) {
      setError(
        'לא ניתן להתחבר לשרת. יש לבדוק את החיבור ולנסות שוב.'
      );
    } finally {
      setLoading(false);
    }
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
          disabled={loading || !!success}
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
          disabled={loading || !!success}
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
            disabled={loading || !!success}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'
            }
            style={eyeStyle}
            disabled={loading || !!success}
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
            disabled={loading || !!success}
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
            disabled={loading || !!success}
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

        {/* הודעת הצלחה */}
        {success && (
          <p
            role="status"
            style={{
              color: '#16a34a',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center',
              fontSize: '14px',
              marginTop: '12px'
            }}
          >
            ✓ {success}
          </p>
        )}

        {/* כפתור הרשמה */}
        {!success && (
          <button
            type="submit"
            disabled={loading}
            style={{
              ...inputStyle,
              marginTop: '20px',
              backgroundColor: loading
                ? '#9ca3af'
                : '#4361ee',
              color: 'white',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '16px'
            }}
          >
            {loading ? 'מבצע הרשמה...' : 'הרשמה'}
          </button>
        )}

        {/* מעבר למסך התחברות */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '14px',
            marginTop: '18px',
            color: '#555'
          }}
        >
          {success
            ? 'החשבון שלך מוכן! '
            : 'כבר יש לך חשבון? '}

          <button
            type="button"
            onClick={onLoginClick}
            disabled={loading}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#4361ee',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
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
