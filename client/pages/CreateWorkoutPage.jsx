import React, { useState } from 'react';

const CreateWorkoutPage = () => {
  const [formData, setFormData] = useState({
    title: '',
    category: 'ריצה',
    location: '',
    date: '',
    time: '',
    maxParticipants: 5,
    level: 'לכולם',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`האימון "${formData.title}" נוצר בהצלחה!`);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <h1 style={{ color: '#2c3e50', textAlign: 'center' }}>➕ פתיחת אימון חדש</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>מלא את פרטי האימון כדי ששותפים בסביבה יוכלו להצטרף</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px', backgroundColor: '#f9f9f9', padding: '25px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>שם האימון / כותרת:</label>
          <input
            type="text"
            name="title"
            placeholder="למשל: ריצת ערב קלה"
            value={formData.title}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>סוג ספורט:</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="ריצה">ריצה</option>
              <option value="כוח">כוח</option>
              <option value="יוגה">יוגה</option>
              <option value="משחקי כדור">משחקי כדור</option>
              <option value="הליכה">הליכה</option>
            </select>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>רמת קושי:</label>
            <select
              name="level"
              value={formData.level}
              onChange={handleChange}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            >
              <option value="לכולם">לכולם</option>
              <option value="מתחילים">מתחילים</option>
              <option value="בינוני">בינוני</option>
              <option value="מתקדמים">מתקדמים</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>מיקום (כתובת / פארק):</label>
          <input
            type="text"
            name="location"
            placeholder="למשל: גן סאקר, ירושלים"
            value={formData.location}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>תאריך:</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>שעה:</label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>מקסימום משתתפים:</label>
          <input
            type="number"
            name="maxParticipants"
            min="2"
            max="20"
            value={formData.maxParticipants}
            onChange={handleChange}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          style={{
            backgroundColor: '#2ecc71',
            color: 'white',
            padding: '12px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1.1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          צור אימון עכשיו 🚀
        </button>
      </form>
    </div>
  );
};

export default CreateWorkoutPage;