import React from 'react';

const HomePage = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
      {/* כותרת ראשית */}
      <h1 style={{ color: '#2c3e50', fontSize: '2.5rem' }}>ברוכים הבאים ל-FitBuddy 🏃‍♂️🏋️‍♀️</h1>
      <p style={{ fontSize: '1.2rem', color: '#7f8c8d' }}>
        הפלטפורמה שלך למציאת שותפים לאימונים ולפעילות ספורט בסביבה הקרובה
      </p>

      {/* כפתורי הנעה לפעולה */}
      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center', gap: '20px' }}>
        <button 
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            backgroundColor: '#3498db',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => alert('מעבר לעמוד חיפוש אימונים')}
        >
          🔍 חפש אימון בסביבה
        </button>

        <button 
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            backgroundColor: '#2ecc71',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
          onClick={() => alert('מעבר לטופס יצירת אימון')}
        >
          ➕ צור אימון חדש
        </button>
      </div>

      {/* אזור תצוגה מקדימה לאימונים קרובים */}
      <div style={{ marginTop: '50px', textAlign: 'right', maxWidth: '600px', margin: '50px auto 0 auto' }}>
        <h3>אימונים קרובים באזורך:</h3>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '10px' }}>
          <h4>🏃‍♂️ ריצת ערב בפארק</h4>
          <p>📍 מיקום: גן סאקר | ⏰ שעה: 19:00 | 👤 מארגן: משה</p>
        </div>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px' }}>
          <h4>🏋️‍♀️ אימון כוח ואירובי</h4>
          <p>📍 מיקום: בית וגן | ⏰ שעה: 20:30 | 👤 מארגנת: מירי</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;