const WORKOUT_CATEGORY_LABELS = {
    RUNNING: 'ריצה',
    WALKING: 'הליכה',
    STRENGTH: 'כוח',
    YOGA: 'יוגה',
    BASKETBALL: 'כדורסל',
    FOOTBALL: 'כדורגל',
    TENNIS: 'טניס',
    CYCLING: 'אופניים'
};

const WORKOUT_LEVEL_LABELS = {
    ALL: 'לכולם',
    BEGINNER: 'מתחילים',
    INTERMEDIATE: 'בינוני',
    ADVANCED: 'מתקדמים'
};

let workoutsCache = [];

function getWorkouts() {
    return workoutsCache;
}

async function fetchWorkoutsFromServer(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'ALL') {
        query.set('category', params.category);
    }
    if (params.q && params.q.trim() !== '') {
        query.set('q', params.q.trim());
    }

    const qs = query.toString();
    const path = qs ? `/api/workouts?${qs}` : '/api/workouts';
    const list = await apiFetch(path);
    workoutsCache = Array.isArray(list) ? list : [];
    return workoutsCache;
}

function formatServerWorkoutDateTime(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) {
        return { dateStr: '', timeStr: '' };
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return {
        dateStr: `${day}/${month}/${year}`,
        timeStr: `${hours}:${minutes}`
    };
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

// Workout helpers

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
    const noteText = w.description || w.notes || '';
    const details = encodeURIComponent(
        (noteText ? noteText + '\n' : '') +
        'ניווט Waze: ' + getWazeLink(w)
    );

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&location=${location}&details=${details}`;
}

function copyInviteText(id) {
    const w = workoutsCache.find(item => String(item.id) === String(id));

    if (!w) return;

    const { dateStr, timeStr } = formatServerWorkoutDateTime(w.startTime);
    const categoryHe = WORKOUT_CATEGORY_LABELS[w.category] || w.category;
    const text = `🏃‍♂️ בואו להתאמן איתי ב-FitBuddy!\n📌 ${w.title} (${categoryHe})\n📅 ${dateStr || 'בקרוב'} בשעה ${timeStr}\n📍 ${w.location}\n🚗 ניווט ב-Waze: ${getWazeLink(w)}`;

    navigator.clipboard.writeText(text).then(() => {
        alert('הזמנה לאימון הועתקה! אפשר להדביק ולשלוח בוואטסאפ 📲');
    });
}

async function joinWorkout(id, btnElement) {
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

    if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = 'מצטרף...';
    }

    try {
        const updated = await apiFetch(`/api/workouts/${encodeURIComponent(id)}/register`, {
            method: 'POST'
        });

        const idx = workoutsCache.findIndex(item => String(item.id) === String(id));
        if (idx !== -1 && updated) {
            workoutsCache[idx] = updated;
        }

        if (btnElement) {
            btnElement.textContent = 'רשום ✓';
            btnElement.style.background = '#94a3b8';
            btnElement.style.cursor = 'default';
        }

        alert('נרשמת בהצלחה לאימון! תוכל לראות אותו בדשבורד הפרופיל שלך.');
    } catch (error) {
        if (btnElement) {
            btnElement.disabled = false;
            btnElement.textContent = 'הצטרף';
        }
        alert(error.message || 'לא ניתן להצטרף לאימון כרגע');
    }
}

function createCardHTML(workout) {
    if (!workout || !workout.id) {
        return '';
    }

    const safeId = escapeHTML(workout.id);
    const wazeHref = escapeHTML(getWazeLink(workout));
    const categoryHe = WORKOUT_CATEGORY_LABELS[workout.category] || workout.category;
    const levelHe = WORKOUT_LEVEL_LABELS[workout.level] || workout.level || 'לכולם';
    const organizerName = workout.organizer?.name || workout.organizer || 'מארגן';
    const { dateStr, timeStr } = formatServerWorkoutDateTime(workout.startTime);
    const notesText = workout.description || workout.notes || '';
    const notesHTML = notesText
        ? `<div class="card-notes">📝 ${escapeHTML(notesText)}</div>`
        : '';

    let actionButtonHTML = `<button type="button" class="btn-join" onclick="joinWorkout('${safeId}', this)">הצטרף</button>`;
    if (workout.isOrganizer) {
        actionButtonHTML = `<button type="button" class="btn-join" style="background:#4361ee;" onclick="window.location.href='profile.html'">האימון שלך</button>`;
    } else if (workout.isRegistered) {
        actionButtonHTML = `<button type="button" class="btn-join" style="background:#94a3b8; cursor:default;" disabled>רשום ✓</button>`;
    } else if (workout.isFull) {
        actionButtonHTML = `<button type="button" class="btn-join" style="background:#cbd5e1; color:#475569; cursor:not-allowed;" disabled>מלא</button>`;
    }

    return `
        <div class="card">
            <div style="flex:1;">
                <span class="card-tag">${escapeHTML(categoryHe)}</span>
                <span class="card-tag" style="background:#f1f5f9; color:#475569; margin-right:6px;">${escapeHTML(levelHe)}</span>
                <span class="card-tag" style="background:#ecfdf5; color:#047857; margin-right:6px;">${workout.cost > 0 ? escapeHTML(workout.cost) + ' ₪' : 'חינם'}</span>
                <div class="card-title">${escapeHTML(workout.title)}</div>
                <div class="card-details">
                    <span>📍 ${escapeHTML(workout.location)}</span>
                    <span>📅 ${escapeHTML(dateStr)} • ⏰ ${escapeHTML(timeStr)}</span>
                    <span>👤 מארגן: ${escapeHTML(organizerName)}</span>
                    <span>👥 ${workout.participants ?? 0}/${workout.maxParticipants} משתתפים</span>
                    <a href="${wazeHref}" target="_blank" rel="noopener" class="waze-badge">🚗 נווט ב-Waze</a>
                    <button type="button" class="share-btn-mini" onclick="copyInviteText('${safeId}')">📲 שתף הזמנה</button>
                </div>
                ${notesHTML}
            </div>
            ${actionButtonHTML}
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