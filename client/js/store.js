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

// Authentication and user permissions

function getCurrentUserData() {
    try {
        return JSON.parse(sessionStorage.getItem('fitbuddy_user')) || null;
    } catch {
        return null;
    }
}

function isUserLoggedIn() {
    const token = sessionStorage.getItem('fitbuddy_token');
    const user = getCurrentUserData();

    return Boolean(token && user && user.id);
}

function getCurrentUser() {
    return getCurrentUserData()?.name || 'אורח';
}

function setLoggedInUser(user, token) {
    if (!user || !user.id || !token) {
        throw new Error('Invalid login data');
    }

    sessionStorage.setItem('fitbuddy_token', token);
    sessionStorage.setItem('fitbuddy_user', JSON.stringify(user));

    // Remove old simulated authentication data.
    localStorage.removeItem('fitbuddy_logged_in');
    localStorage.removeItem('fitbuddy_user_name');
    localStorage.removeItem('fitbuddy_user_role');
    localStorage.removeItem('fitbuddy_profile');
}

function isAdmin() {
    return isUserLoggedIn() &&
        getCurrentUserData()?.role === 'ADMIN';
}

function isTrainer() {
    return isUserLoggedIn() &&
        getCurrentUserData()?.isTrainer === true;
}

function canCreateWorkout() {
    return isAdmin() || isTrainer();
}

// Compatibility with existing client pages.
function getUserRole() {
    return canCreateWorkout() ? 'trainer' : 'trainee';
}

function clearAuthSession() {
    sessionStorage.removeItem('fitbuddy_token');
    sessionStorage.removeItem('fitbuddy_user');
    sessionStorage.removeItem('fitbuddy_auth_notice');
    sessionStorage.removeItem('fitbuddy_redirect_after_login');

    localStorage.removeItem('fitbuddy_logged_in');
    localStorage.removeItem('fitbuddy_user_name');
    localStorage.removeItem('fitbuddy_user_role');
    localStorage.removeItem('fitbuddy_profile');
}

function logoutUser() {
    clearAuthSession();
    window.location.href = 'index.html';
}

async function refreshCurrentUser() {
    if (!isUserLoggedIn()) {
        return null;
    }

    const token = sessionStorage.getItem('fitbuddy_token');

    try {
        const user = await apiFetch('/api/users/me');

        if (sessionStorage.getItem('fitbuddy_token') !== token) {
            return null;
        }

        if (!user || !user.id) {
            clearAuthSession();
            return null;
        }

        sessionStorage.setItem(
            'fitbuddy_user',
            JSON.stringify(user)
        );

        return user;
    } catch (error) {
        if (sessionStorage.getItem('fitbuddy_token') === token &&
            (error.status === 401 || error.status === 403)) {
            clearAuthSession();
        }

        throw error;
    }
}

function guardProtectedPage(noticeMessage) {
    if (!isUserLoggedIn()) {
        sessionStorage.setItem(
            'fitbuddy_auth_notice',
            noticeMessage
        );

        sessionStorage.setItem(
            'fitbuddy_redirect_after_login',
            window.location.pathname.split('/').pop()
        );

        window.location.href = 'auth.html';
        return false;
    }

    return true;
}

async function guardTrainerPage() {
    if (!guardProtectedPage('יש להתחבר כדי לפתוח אימון חדש')) {
        return false;
    }

    try {
        const user = await refreshCurrentUser();

        if (!user) {
            guardProtectedPage('יש להתחבר מחדש');
            return false;
        }

        if (!canCreateWorkout()) {
            alert('רק מאמנים מאושרים ומנהלי המערכת יכולים ליצור אימונים.');
            window.location.href = 'index.html';
            return false;
        }

        return true;
    } catch (error) {
        if (error.status === 401 || error.status === 403) {
            guardProtectedPage('יש להתחבר מחדש');
        } else {
            alert('לא ניתן לאמת את ההרשאות כרגע. נסו שוב מאוחר יותר.');
            window.location.href = 'index.html';
        }

        return false;
    }
}

function initNavbar(activePage) {
    const loggedIn = isUserLoggedIn();
    const user = getCurrentUser();

    const guestEl = document.getElementById('guest-actions');
    const userEl = document.getElementById('user-actions');
    const avatarEl = document.getElementById('nav-avatar');

    if (guestEl) {
        guestEl.style.display = loggedIn ? 'none' : 'flex';
    }

    if (userEl) {
        userEl.style.display = loggedIn ? 'flex' : 'none';
    }

    if (avatarEl) {
        avatarEl.textContent = user.charAt(0);
    }

    const navCreate = document.getElementById('nav-create');

    if (navCreate) {
        navCreate.style.display = canCreateWorkout() ? '' : 'none';
    }

    document.querySelectorAll('a[href="create.html"]').forEach(btn => {
        btn.style.display = canCreateWorkout() ? '' : 'none';
    });

    const navLink = document.getElementById('nav-' + activePage);

    if (navLink) {
        navLink.classList.add('active-nav');
    }
}

// Existing workout functionality

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[char]);
}

function getWazeLink(w) {
    if (w.wazeUrl && w.wazeUrl.trim() !== '') {
        try {
            const url = new URL(w.wazeUrl.trim());

            if (url.protocol === 'https:' &&
                ['waze.com', 'www.waze.com'].includes(url.hostname)) {
                return url.href;
            }
        } catch {
            // Use the location-based link instead.
        }
    }

    return 'https://waze.com/ul?q=' + encodeURIComponent(w.location);
}

function getGoogleCalendarLink(w) {
    const title = encodeURIComponent('FitBuddy: ' + w.title);
    const location = encodeURIComponent(w.location);
    const details = encodeURIComponent(
        (w.notes ? w.notes + '\n' : '') +
        'ניווט Waze: ' + getWazeLink(w)
    );

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
        sessionStorage.setItem(
            'fitbuddy_auth_notice',
            'כדי להצטרף לאימון יש להתחבר לחשבון שלך'
        );

        sessionStorage.setItem(
            'fitbuddy_redirect_after_login',
            window.location.pathname.split('/').pop() || 'index.html'
        );

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
    const wazeHref = escapeHTML(getWazeLink(workout));

    const notesHTML = workout.notes
        ? `<div class="card-notes">📝 ${escapeHTML(workout.notes)}</div>`
        : '';

    const workoutId = Number(workout.id);

    if (!Number.isSafeInteger(workoutId)) {
        return '';
    }

    return `
        <div class="card">
            <div style="flex:1;">
                <span class="card-tag">${escapeHTML(workout.category)}</span>
                <span class="card-tag" style="background:#f1f5f9; color:#475569; margin-right:6px;">${escapeHTML(workout.level || 'חובבני')}</span>
                <span class="card-tag" style="background:#ecfdf5; color:#047857; margin-right:6px;">${workout.cost > 0 ? escapeHTML(workout.cost) + ' ₪' : 'חינם'}</span>
                <div class="card-title">${escapeHTML(workout.title)}</div>
                <div class="card-details">
                    <span>📍 ${escapeHTML(workout.location)}</span>
                    <span>📅 ${escapeHTML(workout.date || '')} • ⏰ ${escapeHTML(workout.time)}</span>
                    <span>👤 מארגן: ${escapeHTML(workout.organizer)}</span>
                    <a href="${wazeHref}" target="_blank" rel="noopener" class="waze-badge">🚗 נווט ב-Waze</a>
                    <button type="button" class="share-btn-mini" onclick="copyInviteText(${workoutId})">📲 שתף הזמנה</button>
                </div>
                ${notesHTML}
            </div>
            <button class="btn-join" onclick="joinWorkout(${workoutId})">הצטרף</button>
        </div>
    `;
}
async function syncAuthSession() {
    if (!isUserLoggedIn()) {
        return;
    }

    try {
        await refreshCurrentUser();
    } catch (error) {
        console.warn('Unable to refresh user session');
    }

    initNavbar('');
}

document.addEventListener('DOMContentLoaded', syncAuthSession);

window.addEventListener('focus', syncAuthSession);