document.addEventListener("DOMContentLoaded", () => {
    const editBtn = document.getElementById("edit-profile-btn");
    const saveBtn = document.getElementById("save-profile-btn");
    
    const displaySection = document.getElementById("display-details");
    const editSection = document.getElementById("edit-form-section");
    
    const profileNameElem = document.querySelector(".profile-sidebar h2");
    const avatarElem = document.querySelector(".profile-big-avatar");
    const navAvatarElem = document.querySelector(".profile-avatar-btn");
    const locText = document.getElementById("loc-text");
    const levelText = document.getElementById("level-text");
    const sportText = document.getElementById("sport-text");
    const timeText = document.getElementById("time-text");

    const editName = document.getElementById("edit-name");
    const editLoc = document.getElementById("edit-loc");
    const editLevel = document.getElementById("edit-level");
    const editSport = document.getElementById("edit-sport");
    const editTime = document.getElementById("edit-time");

    const savedProfile = localStorage.getItem("fitbuddy_profile");
    if (savedProfile) {
        const data = JSON.parse(savedProfile);
        profileNameElem.innerText = data.name;
        const firstLetter = data.name.charAt(0);
        avatarElem.innerText = firstLetter;
        navAvatarElem.innerText = firstLetter;
        locText.innerText = data.loc;
        levelText.innerText = data.level;
        sportText.innerText = data.sport;
        timeText.innerText = data.time;
    }

    if (editBtn) {
        editBtn.addEventListener("click", () => {
            editName.value = profileNameElem.innerText;
            editLoc.value = locText.innerText;
            editLevel.value = levelText.innerText;
            editSport.value = sportText.innerText;
            editTime.value = timeText.innerText;

            displaySection.style.display = "none";
            editBtn.style.display = "none";
            editSection.style.display = "block";
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            let currentName = profileNameElem.innerText;
            if (editName.value.trim() !== "") {
                currentName = editName.value;
                profileNameElem.innerText = currentName;
                const firstLetter = currentName.charAt(0);
                avatarElem.innerText = firstLetter;
                navAvatarElem.innerText = firstLetter;
            }

            locText.innerText = editLoc.value;
            levelText.innerText = editLevel.value;
            sportText.innerText = editSport.value;
            timeText.innerText = editTime.value;

            const profileData = {
                name: currentName,
                loc: editLoc.value,
                level: editLevel.value,
                sport: editSport.value,
                time: editTime.value
            };
            localStorage.setItem("fitbuddy_profile", JSON.stringify(profileData));

            editSection.style.display = "none";
            displaySection.style.display = "flex";
            editBtn.style.display = "inline-block";
        });
    }

    const myWorkoutsList = document.getElementById("my-workouts-list");
    if (myWorkoutsList && typeof workouts !== 'undefined') {
        const myJoinedWorkouts = workouts.filter(w => w.id === 1 || w.id === 3);
        
        myWorkoutsList.innerHTML = myJoinedWorkouts.map(w => `
            <div class="card" style="padding: 15px; margin-bottom: 12px; flex-direction: row;">
                <div>
                    <span class="card-tag">${w.category}</span>
                    <div class="card-title" style="font-size: 1.1rem;">${w.title}</div>
                    <div class="card-details" style="font-size: 0.85rem;">
                        <span>📍 ${w.location}</span>
                        <span>⏰ ${w.time}</span>
                    </div>
                </div>
                <button class="btn-logout" style="background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; font-size: 0.8rem;" onclick="this.parentElement.style.display='none'">ביטול רישום</button>
            </div>
        `).join('');
    }
});