const defaultWorkouts = [{
        id: 1,
        title: 'ריצת ערב קבוצתית',
        category: 'ריצה',
        level: 'חובבני',
        location: 'גן סאקר, ירושלים',
        time: '19:00',
        date: '2026-11-18',
        maxParticipants: 12,
        cost: 0,
        wazeUrl: '',
        notes: 'נפגשים ליד הכניסה הראשית, קצב 5:30 קליל',
        organizer: 'משה',
        isMine: false
    },
    {
        id: 2,
        title: 'אימון כוח ואירובי',
        category: 'כוח',
        level: 'חובבני',
        location: 'בית וגן, ירושלים',
        time: '20:30',
        date: '2026-11-19',
        maxParticipants: 10,
        cost: 0,
        wazeUrl: '',
        notes: 'מומלץ להביא מזרן אישי ובקבוק מים',
        organizer: 'מירי',
        isMine: true
    },
    {
        id: 3,
        title: 'יוגה בשקיעה',
        category: 'יוגה',
        level: 'לכולם',
        location: 'פארק המסילה',
        time: '17:30',
        date: '2026-11-20',
        maxParticipants: 15,
        cost: 0,
        wazeUrl: '',
        notes: '',
        organizer: 'שרה',
        isMine: false
    },
    {
        id: 4,
        title: 'משחק כדורסל 3v3',
        category: 'כדורסל',
        level: 'בינוני',
        location: 'מגרש ספורטק',
        time: '18:00',
        date: '2026-11-21',
        maxParticipants: 6,
        cost: 0,
        wazeUrl: '',
        notes: '',
        organizer: 'עמית',
        isMine: false
    }
];

function getWorkouts() {
    return JSON.parse(localStorage.getItem('fitbuddy_workouts')) || defaultWorkouts;
}

function saveWorkouts(list) {
    localStorage.setItem('fitbuddy_workouts', JSON.stringify(list));
}

function isUserLoggedIn() {
    return localStorage.getItem('fitbuddy_logged_in') === 'true';
}

function getCurrentUser() {
    return localStorage.getItem('fitbuddy_user_name') || 'מירי';
}

function setLoggedInUser(name) {
    localStorage.setItem('fitbuddy_logged_in', 'true');
    if (name) localStorage.setItem('fitbuddy_user_name', name);
}

function logoutUser() {
    localStorage.setItem('fitbuddy_logged_in', 'false');
    window.location.href = 'index.html';
}

function guardProtectedPage(noticeMessage) {
    if (!isUserLoggedIn()) {
        sessionStorage.setItem('fitbuddy_auth_notice', noticeMessage);
        sessionStorage.setItem('fitbuddy_redirect_after_login', window.location.pathname.split('/').pop());
        window.location.href = 'auth.html';
        return false;
    }
    return true;
}

function initNavbar(activePage) {
    const loggedIn = isUserLoggedIn();
    const user = getCurrentUser();
    const guestEl = document.getElementById('guest-actions');
    const userEl = document.getElementById('user-actions');
    const avatarEl = document.getElementById('nav-avatar');

    if (guestEl) guestEl.style.display = loggedIn ? 'none' : 'flex';
    if (userEl) userEl.style.display = loggedIn ? 'flex' : 'none';
    if (avatarEl) avatarEl.textContent = user[0];

    const navLink = document.getElementById('nav-' + activePage);
    if (navLink) navLink.classList.add('active-nav');
}

function getWazeLink(w) {
    if (w.wazeUrl && w.wazeUrl.trim() !== '') return w.wazeUrl.trim();
    return 'https://waze.com/ul?q=' + encodeURIComponent(w.location);
}

function getGoogleCalendarLink(w) {
    const title = encodeURIComponent('FitBuddy: ' + w.title);
    const location = encodeURIComponent(w.location);
    const details = encodeURIComponent((w.notes ? w.notes + '\n' : '') + 'ניווט Waze: ' + getWazeLink(w));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}`;
}

function copyInviteText(id) {
    const w = getWorkouts().find(item => item.id === id);
    if (!w) return;
    const text = `🏃‍♂️ בואו להתאמן איתי ב-FitBuddy!\n📌 ${w.title} (${w.category})\n📅 ${w.date || 'בקרוב'} בשעה ${w.time}\n📍 ${w.location}\n🚗 ניווט ב-Waze: ${getWazeLink(w)}`;
    navigator.clipboard.writeText(text).then(() => {
        alert('הזמנה לאימון הועתקה! אפשר להדביק ולשלוח בוואטסאפ 📲');
    });
}

function joinWorkout(id) {
    if (!isUserLoggedIn()) {
        sessionStorage.setItem('fitbuddy_auth_notice', 'כדי להצטרף לאימון יש להתחבר לחשבון שלך');
        sessionStorage.setItem('fitbuddy_redirect_after_login', window.location.pathname.split('/').pop() || 'index.html');
        window.location.href = 'auth.html';
        return;
    }
    const list = getWorkouts();
    const w = list.find(item => item.id === id);
    if (w) {
        w.isMine = true;
        saveWorkouts(list);
        alert('נרשמת בהצלחה לאימון "' + w.title + '"! תוכל לראות אותו בדשבורד שלך.');
    }
}

function createCardHTML(workout) {
    const wazeHref = getWazeLink(workout);
    const notesHTML = workout.notes ? `<div class="card-notes">📝 ${workout.notes}</div>` : '';

    return `
        <div class="card">
            <div style="flex:1;">
                <span class="card-tag">${workout.category}</span>
                <span class="card-tag" style="background:#f1f5f9; color:#475569; margin-right:6px;">${workout.level || 'חובבני'}</span>
                <span class="card-tag" style="background:#ecfdf5; color:#047857; margin-right:6px;">${workout.cost > 0 ? workout.cost + ' ₪' : 'חינם'}</span>
                <div class="card-title">${workout.title}</div>
                <div class="card-details">
                    <span>📍 ${workout.location}</span>
                    <span>📅 ${workout.date || ''} • ⏰ ${workout.time}</span>
                    <span>👤 מארגן: ${workout.organizer}</span>
                    <a href="${wazeHref}" target="_blank" rel="noopener" class="waze-badge">🚗 נווט ב-Waze</a>
                    <button type="button" class="share-btn-mini" onclick="copyInviteText(${workout.id})">📲 שתף הזמנה</button>
                </div>
                ${notesHTML}
            </div>
            <button class="btn-join" onclick="joinWorkout(${workout.id})">הצטרף</button>
        </div>
    `;
}