const CATEGORY_TO_HE = {
    RUNNING: 'ריצה',
    WALKING: 'הליכה',
    STRENGTH: 'כוח',
    YOGA: 'יוגה',
    BASKETBALL: 'כדורסל',
    FOOTBALL: 'כדורגל',
    TENNIS: 'טניס',
    CYCLING: 'אופניים'
};

const LEVEL_TO_HE = {
    ALL: 'לכולם',
    BEGINNER: 'מתחילים',
    INTERMEDIATE: 'בינוני',
    ADVANCED: 'מתקדמים'
};

let currentProfile = null;
let myWorkoutsCache = [];

function formatWorkoutDateTime(isoString) {
    const d = new Date(isoString);
    if (Number.isNaN(d.getTime())) {
        return { isoDate: '', displayDate: '', timeStr: '' };
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return {
        isoDate: `${year}-${month}-${day}`,
        displayDate: `${day}/${month}/${year}`,
        timeStr: `${hours}:${minutes}`
    };
}

function renderProfileDetails(user) {
    currentProfile = user;

    const profileNameElem = document.getElementById('profile-user-name');
    const avatarElem = document.getElementById('profile-big-avatar');
    const navAvatarElem = document.getElementById('nav-avatar');
    const locText = document.getElementById('loc-text');
    const levelText = document.getElementById('level-text');
    const sportText = document.getElementById('sport-text');
    const timeText = document.getElementById('time-text');

    const displayName = user.name || 'משתמש';
    const firstLetter = displayName.trim().charAt(0) || '?';

    if (profileNameElem) profileNameElem.textContent = displayName;
    if (avatarElem) avatarElem.textContent = firstLetter;
    if (navAvatarElem) navAvatarElem.textContent = firstLetter;
    const roleBadgeElem = document.getElementById('profile-role-badge');
if (roleBadgeElem) {
    if (user.role === 'ADMIN') {
        roleBadgeElem.textContent = '🛡️ מנהלת מערכת';
        roleBadgeElem.style.background = '#fef3c7';
        roleBadgeElem.style.color = '#92400e';
    } else if (user.isTrainer) {
        roleBadgeElem.textContent = '🏅 מאמנת מוסמכת';
        roleBadgeElem.style.background = '#dcfce7';
        roleBadgeElem.style.color = '#166534';
    } else {
        roleBadgeElem.textContent = '🏃‍♀️ מתאמנת ב-FitBuddy';
        roleBadgeElem.style.background = '#e0e7ff';
        roleBadgeElem.style.color = '#3730a3';
    }
}
    if (locText) {
        locText.textContent = user.area || 'לא צוין';
    }
    if (levelText) {
        levelText.textContent = user.level ? (LEVEL_TO_HE[user.level] || user.level) : 'לא צוין';
    }
    if (sportText) {
        sportText.textContent = user.preferredCategory
            ? (CATEGORY_TO_HE[user.preferredCategory] || user.preferredCategory)
            : 'לא צוין';
    }
    if (timeText) {
        timeText.textContent = user.preferredTime || 'לא צוין';
    }
}

async function loadUserProfile() {
    try {
        const user = await apiFetch('/api/users/me');
        if (user && user.id) {
            sessionStorage.setItem('fitbuddy_user', JSON.stringify(user));
            renderProfileDetails(user);
        }
    } catch (error) {
        console.error('Failed to load profile:', error);
        const fallbackUser = getCurrentUserData();
        if (fallbackUser) {
            renderProfileDetails(fallbackUser);
        }
    }
}

function renderMyWorkoutsList(organized, joined) {
    const container = document.getElementById('my-managed-workouts-list');
    const totalCountEl = document.getElementById('my-workouts-count');
    const organizedCountEl = document.getElementById('organized-workouts-count');

    const combined = [
        ...organized.map(w => ({ ...w, isOrganizer: true })),
        ...joined.map(w => ({ ...w, isOrganizer: false }))
    ];
    myWorkoutsCache = combined;

    if (totalCountEl) totalCountEl.textContent = combined.length;
    if (organizedCountEl) organizedCountEl.textContent = organized.length;

    if (!container) return;

    if (combined.length === 0) {
        container.innerHTML = '<p style="color:#64748b; font-size:0.95rem;">עדיין לא פתחת או נרשמת לפעילויות. לחצי על "+ צור פעילות" או חפשי אימון להצטרף אליו!</p>';
        return;
    }

    container.innerHTML = combined.map(w => {
        const { displayDate, timeStr } = formatWorkoutDateTime(w.startTime);
        const categoryHe = CATEGORY_TO_HE[w.category] || w.category;
        const levelHe = LEVEL_TO_HE[w.level] || w.level || 'לכולם';
        const organizerName = w.organizer?.name || 'מארגן';
        const notesHTML = w.description ? `<div class="card-notes">📝 ${escapeHTML(w.description)}</div>` : '';
        const safeId = escapeHTML(w.id);

        const actionButton = w.isOrganizer
            ? `<button type="button" class="btn-manage-activity" onclick="openManageModal('${safeId}')">נהל פעילות</button>`
            : `<button type="button" onclick="leaveWorkout('${safeId}')" style="width:100%; background:#fee2e2; color:#dc2626; padding:10px 18px; border-radius:10px; border:none; font-weight:700; font-size:0.92rem; cursor:pointer; margin-top:14px;">בטל השתתפות</button>`;

        const calendarItem = {
            title: w.title,
            location: w.location,
            notes: w.description || '',
            wazeUrl: w.wazeUrl || ''
        };

        return `
            <div class="my-workout-card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:1.15rem; font-weight:700; color:#1e293b;">${escapeHTML(w.title)}</div>
                        <span class="card-tag" style="margin-top:4px;">${escapeHTML(categoryHe)}</span>
                        <span class="card-tag" style="margin-top:4px; margin-right:6px; background:${w.isOrganizer ? '#dcfce7' : '#f1f5f9'}; color:${w.isOrganizer ? '#166534' : '#475569'};">
                            ${w.isOrganizer ? '👑 מארגן' : '👤 משתתף (מארגן: ' + escapeHTML(organizerName) + ')'}
                        </span>
                    </div>
                    <span style="background:#e2e8f0; color:#475569; padding:3px 10px; border-radius:12px; font-size:0.8rem; font-weight:600;">${escapeHTML(levelHe)}</span>
                </div>
                <div class="card-details" style="margin-top:8px; font-size:0.88rem;">
                    <span>📅 ${escapeHTML(displayDate)} • ⏰ ${escapeHTML(timeStr)}</span>
                    <span>📍 ${escapeHTML(w.location)}</span>
                    <span>👥 ${w.participants ?? 0}/${w.maxParticipants} משתתפים</span>
                    <span>💳 ${w.cost > 0 ? escapeHTML(w.cost) + ' ₪' : 'חינם'}</span>
                </div>
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:10px;">
                    <a href="${escapeHTML(getWazeLink(w))}" target="_blank" rel="noopener" class="waze-badge">🚗 פתח ב-Waze</a>
                    <a href="${escapeHTML(getGoogleCalendarLink(calendarItem))}" target="_blank" rel="noopener" class="waze-badge" style="background:#eef2ff; color:#4361ee;">📅 הוסף ליומן</a>
                    <button type="button" class="share-btn-mini" onclick="copyWorkoutInvite('${safeId}')">📲 הזמן חברים</button>
                </div>
                ${notesHTML}
                ${actionButton}
            </div>
        `;
    }).join('');
}

async function loadMyWorkouts() {
    const container = document.getElementById('my-managed-workouts-list');
    try {
        const result = await apiFetch('/api/users/me/workouts');
        renderMyWorkoutsList(result.organized || [], result.joined || []);
    } catch (error) {
        console.error('Failed to load user workouts:', error);
        if (container) {
            container.innerHTML = '<p style="color:#dc2626; font-size:0.95rem;">לא הצלחנו לטעון את הפעילויות כרגע. נסי לרענן את הדף.</p>';
        }
    }
}

window.copyWorkoutInvite = function (id) {
    const w = myWorkoutsCache.find(item => item.id === id);
    if (!w) return;

    const { displayDate, timeStr } = formatWorkoutDateTime(w.startTime);
    const categoryHe = CATEGORY_TO_HE[w.category] || w.category;
    const text = `🏃‍♂️ בואו להתאמן איתי ב-FitBuddy!\n📌 ${w.title} (${categoryHe})\n📅 ${displayDate} בשעה ${timeStr}\n📍 ${w.location}\n🚗 ניווט ב-Waze: ${getWazeLink(w)}`;

    navigator.clipboard.writeText(text).then(() => {
        alert('הזמנה לאימון הועתקה! אפשר להדביק ולשלוח בוואטסאפ 📲');
    });
};

window.leaveWorkout = async function (id) {
    try {
        await apiFetch(`/api/workouts/${encodeURIComponent(id)}/register`, {
            method: 'DELETE'
        });
        await loadMyWorkouts();
    } catch (error) {
        alert(error.message || 'לא ניתן לבטל השתתפות כרגע');
    }
};

window.openManageModal = function (id) {
    const w = myWorkoutsCache.find(item => item.id === id && item.isOrganizer);
    if (!w) return;

    const { isoDate, timeStr } = formatWorkoutDateTime(w.startTime);

    document.getElementById('edit-workout-id').value = w.id;
    document.getElementById('edit-w-title').value = w.title || '';
    document.getElementById('edit-w-category').value = w.category || 'RUNNING';
    document.getElementById('edit-w-level').value = w.level || 'ALL';
    document.getElementById('edit-w-date').value = isoDate;
    document.getElementById('edit-w-time').value = timeStr;
    document.getElementById('edit-w-location').value = w.location || '';
    document.getElementById('edit-w-waze').value = w.wazeUrl || '';
    document.getElementById('edit-w-max').value = w.maxParticipants || 12;
    document.getElementById('edit-w-cost').value = w.cost || 0;
    document.getElementById('edit-w-notes').value = w.description || '';

    document.getElementById('cancel-confirm-box').style.display = 'none';
    document.getElementById('manage-modal').style.display = 'flex';
};

window.closeManageModal = function () {
    document.getElementById('manage-modal').style.display = 'none';
};

window.saveEditedWorkout = async function (e) {
    e.preventDefault();
    const id = document.getElementById('edit-workout-id').value;
    const dateVal = document.getElementById('edit-w-date').value;
    const timeVal = document.getElementById('edit-w-time').value;
    const wazeVal = document.getElementById('edit-w-waze').value.trim();
    const notesVal = document.getElementById('edit-w-notes').value.trim();

    const payload = {
        title: document.getElementById('edit-w-title').value.trim(),
        category: document.getElementById('edit-w-category').value,
        level: document.getElementById('edit-w-level').value,
        startTime: new Date(`${dateVal}T${timeVal}`).toISOString(),
        location: document.getElementById('edit-w-location').value.trim(),
        wazeUrl: wazeVal || null,
        maxParticipants: Number(document.getElementById('edit-w-max').value) || 12,
        cost: Number(document.getElementById('edit-w-cost').value) || 0,
        description: notesVal || null
    };

    try {
        await apiFetch(`/api/workouts/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(payload)
        });
        closeManageModal();
        await loadMyWorkouts();
    } catch (error) {
        alert(error.message || 'שגיאה בשמירת השינויים באימון');
    }
};

window.confirmDeleteWorkout = async function () {
    const id = document.getElementById('edit-workout-id').value;
    try {
        await apiFetch(`/api/workouts/${encodeURIComponent(id)}`, {
            method: 'DELETE'
        });
        closeManageModal();
        await loadMyWorkouts();
    } catch (error) {
        alert(error.message || 'שגיאה במחיקת הפעילות');
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!guardProtectedPage('יש להתחבר כדי לצפות בדשבורד ובפרופיל')) {
        return;
    }

    initNavbar('profile');

    const editBtn = document.getElementById('edit-profile-btn');
    const saveBtn = document.getElementById('save-profile-btn');
    const cancelBtn = document.getElementById('cancel-profile-btn');
    const displaySection = document.getElementById('display-details');
    const editSection = document.getElementById('edit-form-section');

    const editName = document.getElementById('edit-name');
    const editLoc = document.getElementById('edit-loc');
    const editLevel = document.getElementById('edit-level');
    const editSport = document.getElementById('edit-sport');
    const editTime = document.getElementById('edit-time');

    if (editBtn) {
        editBtn.addEventListener('click', () => {
            const profile = currentProfile || getCurrentUserData() || {};
            editName.value = profile.name || '';
            editLoc.value = profile.area || '';
            editLevel.value = profile.level || '';
            editSport.value = profile.preferredCategory || '';
            editTime.value = profile.preferredTime || '';

            displaySection.style.display = 'none';
            editBtn.style.display = 'none';
            editSection.style.display = 'block';
        });
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            editSection.style.display = 'none';
            displaySection.style.display = 'flex';
            editBtn.style.display = 'inline-block';
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const trimmedName = editName.value.trim();
            if (trimmedName.length < 2) {
                alert('השם חייב להכיל לפחות 2 תווים.');
                return;
            }

            const payload = {
                name: trimmedName,
                area: editLoc.value.trim() || null,
                level: editLevel.value || null,
                preferredCategory: editSport.value || null,
                preferredTime: editTime.value.trim() || null
            };

            saveBtn.disabled = true;
            saveBtn.textContent = 'שומר...';

            try {
                const updatedUser = await apiFetch('/api/users/me', {
                    method: 'PATCH',
                    body: JSON.stringify(payload)
                });

                sessionStorage.setItem('fitbuddy_user', JSON.stringify(updatedUser));
                renderProfileDetails(updatedUser);

                editSection.style.display = 'none';
                displaySection.style.display = 'flex';
                editBtn.style.display = 'inline-block';
            } catch (error) {
                alert(error.message || 'שגיאה בשמירת פרטי הפרופיל');
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = '💾 שמור פרטים';
            }
        });
    }

    await Promise.all([loadUserProfile(), loadMyWorkouts()]);
});