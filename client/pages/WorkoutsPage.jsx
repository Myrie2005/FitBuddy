import React, { useState } from 'react';

const WorkoutsPage = () => {
  // נתונים מדומים לאימונים (Dummy Data) למילסטון 1
  const initialWorkouts = [
    {
      id: 1,
      title: 'ריצת ערב קבוצתית',
      category: 'ריצה',
      location: 'גן סאקר, ירושלים',
      date: '2026-11-12',
      time: '19:00',
      organizer: 'משה קלין',
      participants: 3,
      maxParticipants: 8,
      level: 'בינוני'
    },
    {
      id: 2,
      title: 'אימון כוח ומשקל גוף',
      category: 'כוח',
      location: 'בית וגן, ירושלים',
      date: '2026-11-13',
      time: '20:30',
      organizer: 'מירי',
      participants: 2,
      maxParticipants: 5,
      level: 'מתקדמים'
    },
    {
      id: 3,
      title: 'יוגה בשקיעה',
      category: 'יוגה',
      location: 'פארק המסילה',
      date: '2026-11-14',
      time: '17:30',
      organizer: 'שרה',
      participants: 6,
      maxParticipants: 10,
      level: 'לכולם'
    },
    {
      id: 4,
      title: 'משחק כדורסל 3v3',
      category: 'משחקי כדור',
      location: 'מגרש ספורטק',
      date: '2026-11-15',
      time: '18:00',
      organizer: 'עמית',
      participants: 4,
      maxParticipants: 6,
      level: 'בינוני'
    }
  ];

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('הכל');

  // סינון אימונים לפי קטגוריה וחיפוש טקסטואלי
  const filteredWorkouts = initialWorkouts.filter((workout) => {
    const matchesCategory = selectedCategory === 'הכל' || workout.category === selectedCategory;
    const matchesSearch = workout.title.includes(searchTerm) || workout.location.includes(searchTerm);
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Arial, sans-serif', direction: 'rtl' }}>
      <h1 style={{ color: '#2c3e50', textAlign: 'center' }}>🏃‍♂️ חיפוש אימונים בסביבה</h1>
      <p style={{ textAlign: 'center', color: '#7f8c8d' }}>מצא אימון שמתאים לך והצטרף לשותפים קרובים</p>

      {/* סרגל סינון וחיפוש */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="🔍 חפש לפי שם אימון או מיקום..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            flex: '1',
            padding: '10px 15px',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '8px'
          }}
        />

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{
            padding: '10px 15px',
            fontSize: '1rem',
            border: '1px solid #ccc',
            borderRadius: '8px',
            backgroundColor: '#f8f9fa'
          }}
        >
          <option value="הכל">כל הסוגים</option>
          <option value="ריצה">ריצה</option>
          <option value="כוח">כוח</option>
          <option value="יוגה">יוגה</option>
          <option value="משחקי כדור">משחקי כדור</option>
        </select>
      </div>

      {/* רשימת הכרטיסיות */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {filteredWorkouts.length > 0 ? (
          filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              style={{
                border: '1px solid #e0e0e0',
                borderRadius: '10px',
                padding: '20px',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <span
                  style={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}
                >
                  {workout.category}
                </span>
                <h3 style={{ margin: '10px 0 5px 0', color: '#333' }}>{workout.title}</h3>
                <p style={{ margin: '3px 0', color: '#666', fontSize: '0.95rem' }}>
                  📍 <strong>מיקום:</strong> {workout.location}
                </p>
                <p style={{ margin: '3px 0', color: '#666', fontSize: '0.95rem' }}>
                  📅 <strong>תאריך ושעה:</strong> {workout.date} | {workout.time}
                </p>
                <p style={{ margin: '3px 0', color: '#888', fontSize: '0.85rem' }}>
                  👤 מארגן: {workout.organizer} | רמה: {workout.level}
                </p>
              </div>

              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.85rem', color: '#555', marginBottom: '8px' }}>
                  👥 {workout.participants}/{workout.maxParticipants} משתתפים
                </p>
                <button
                  onClick={() => alert(`נרשמת בהצלחה לאימון: ${workout.title}`)}
                  style={{
                    backgroundColor: '#2ecc71',
                    color: 'white',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  הצטרף לאימון
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ textAlign: 'center', color: '#999', marginTop: '20px' }}>לא נמצאו אימונים המתאימים לחיפוש שלך.</p>
        )}
      </div>
    </div>
  );
};

export default WorkoutsPage;