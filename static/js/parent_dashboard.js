let accessToken = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh");
let refreshPromise = null;

const profileChipBtn = document.getElementById("parent-profile-chip");
const profileFallbackEl = document.getElementById("parent-profile-fallback");
const profileLabelEl = document.getElementById("parent-profile-label");
const profileMenuEl = document.getElementById("parent-profile-menu-list");
const openProfileBtn = document.getElementById("parent-profile-open");
const logoutBtn = document.getElementById("parent-logout-btn");

const childNameEl = document.getElementById("parent-child-name");
const childLevelEl = document.getElementById("parent-child-level");
const childExperienceEl = document.getElementById("parent-child-experience");
const summaryLessonsEl = document.getElementById("parent-summary-lessons");
const summaryModulesEl = document.getElementById("parent-summary-modules");
const noteEl = document.getElementById("parent-page-note");
const modulesListEl = document.getElementById("parent-modules-list");
const modulesEmptyEl = document.getElementById("parent-modules-empty");
const modulesCaptionEl = document.getElementById("parent-modules-caption");

const profileModalEl = document.getElementById("parent-profile-modal");
const profileModalCloseEls = document.querySelectorAll("[data-close-parent-profile]");
const profileFormEl = document.getElementById("parent-profile-form");
const profileMessageEl = document.getElementById("parent-profile-message");
const formUsernameEl = document.getElementById("parent-form-username");
const formFirstNameEl = document.getElementById("parent-form-first-name");
const formLastNameEl = document.getElementById("parent-form-last-name");
const formEmailEl = document.getElementById("parent-form-email");
const formChildUsernameEl = document.getElementById("parent-form-child-username");
const formRoleEl = document.getElementById("parent-form-role");

if (!accessToken) {
    window.location.replace("/");
}

let currentProfile = null;
let currentChild = null;
let currentProgress = [];
let currentModules = [];

function clearAuthAndRedirect() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    accessToken = "";
    window.location.replace("/");
}

function setProfileMessage(message, type = "") {
    if (!profileMessageEl) {
        return;
    }
    profileMessageEl.textContent = String(message || "");
    profileMessageEl.classList.remove("is-success", "is-error");
    if (type === "success") {
        profileMessageEl.classList.add("is-success");
    } else if (type === "error") {
        profileMessageEl.classList.add("is-error");
    }
}

function closeProfileMenu() {
    if (!profileMenuEl || !profileChipBtn) {
        return;
    }
    profileMenuEl.hidden = true;
    profileChipBtn.setAttribute("aria-expanded", "false");
}

function openProfileMenu() {
    if (!profileMenuEl || !profileChipBtn) {
        return;
    }
    profileMenuEl.hidden = false;
    profileChipBtn.setAttribute("aria-expanded", "true");
}

function toggleProfileMenu() {
    if (!profileMenuEl) {
        return;
    }
    if (profileMenuEl.hidden) {
        openProfileMenu();
        return;
    }
    closeProfileMenu();
}

function openProfileModal() {
    if (!profileModalEl) {
        return;
    }
    profileModalEl.hidden = false;
    document.body.classList.add("modal-open");
}

function closeProfileModal() {
    if (!profileModalEl) {
        return;
    }
    profileModalEl.hidden = true;
    document.body.classList.remove("modal-open");
    setProfileMessage("");
}

async function refreshAccessToken() {
    if (refreshPromise) {
        return refreshPromise;
    }
    if (!refreshToken) {
        throw new Error("Отсутствует refresh-токен.");
    }

    refreshPromise = (async () => {
        const response = await fetch("/auth/token/refresh/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refresh: refreshToken })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || typeof payload?.access !== "string" || !payload.access) {
            throw new Error("Не удалось обновить сессию.");
        }
        accessToken = payload.access;
        localStorage.setItem("token", accessToken);
        return accessToken;
    })();

    try {
        return await refreshPromise;
    } finally {
        refreshPromise = null;
    }
}

async function authFetch(url, options = {}, allowRetry = true) {
    const headers = new Headers(options.headers || {});
    if (accessToken && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    let response = await fetch(url, { ...options, headers });
    if (response.status !== 401 || !allowRetry) {
        return response;
    }

    try {
        await refreshAccessToken();
    } catch (error) {
        clearAuthAndRedirect();
        throw error;
    }

    const retryHeaders = new Headers(options.headers || {});
    if (accessToken && !retryHeaders.has("Authorization")) {
        retryHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
    response = await fetch(url, { ...options, headers: retryHeaders });
    if (response.status === 401) {
        clearAuthAndRedirect();
    }
    return response;
}

function setProfileChip(profile) {
    const username = String(profile?.username || "-");
    const level = String(profile?.level ?? "-");
    if (profileLabelEl) {
        profileLabelEl.textContent = `${username} | Lv.${level}`;
    }
    if (profileFallbackEl) {
        profileFallbackEl.textContent = username ? username[0].toUpperCase() : "?";
    }
}

function fillProfileForm(profile) {
    formUsernameEl.value = profile?.username || "";
    formFirstNameEl.value = profile?.first_name || "";
    formLastNameEl.value = profile?.last_name || "";
    formEmailEl.value = profile?.email || "";
    formChildUsernameEl.value = profile?.child_username || "";
    formRoleEl.value = profile?.role || "";
}

function setChildStats(child) {
    childNameEl.textContent = child?.username || "Не выбран";
    childLevelEl.textContent = String(child?.level ?? "-");
    childExperienceEl.textContent = String(child?.experience ?? "-");
}

function buildProgressMaps(progressItems) {
    const completedByModule = new Map();
    const completedLessonIds = new Set();

    (Array.isArray(progressItems) ? progressItems : []).forEach((item) => {
        const moduleId = Number(item?.module);
        const lessonId = Number(typeof item?.lesson === "number" ? item.lesson : item?.lesson?.id);
        if (!item?.completed || !Number.isFinite(moduleId) || !Number.isFinite(lessonId)) {
            return;
        }
        completedLessonIds.add(lessonId);
        if (!completedByModule.has(moduleId)) {
            completedByModule.set(moduleId, new Set());
        }
        completedByModule.get(moduleId).add(lessonId);
    });

    return { completedByModule, completedLessonIds };
}

async function fetchLessonsCount(moduleId) {
    const response = await fetch(`/auth/courses/modules/${moduleId}/lessons/`, {
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        return 0;
    }
    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload.length : 0;
}

async function loadModules() {
    const response = await fetch("/auth/courses/modules/", {
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        currentModules = [];
        return;
    }
    const payload = await response.json().catch(() => []);
    currentModules = Array.isArray(payload) ? payload : [];
}

async function renderModulesProgress() {
    modulesListEl.innerHTML = "";

    if (!currentModules.length) {
        modulesEmptyEl.hidden = false;
        modulesCaptionEl.textContent = "Модули не найдены";
        summaryLessonsEl.textContent = "0 / 0";
        summaryModulesEl.textContent = "0 / 0";
        return;
    }

    const lessonTotals = await Promise.all(
        currentModules.map((module) => fetchLessonsCount(module.id))
    );
    const lessonTotalMap = new Map();
    currentModules.forEach((module, index) => {
        lessonTotalMap.set(module.id, Number(lessonTotals[index] || 0));
    });

    const { completedByModule } = buildProgressMaps(currentProgress);
    let totalLessons = 0;
    let totalCompletedLessons = 0;
    let totalCompletedModules = 0;

    const sortedModules = [...currentModules].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    sortedModules.forEach((module) => {
        const moduleId = Number(module.id);
        const lessonsTotal = lessonTotalMap.get(moduleId) ?? 0;
        const completedSet = completedByModule.get(moduleId) || new Set();
        const completedLessons = completedSet.size;
        const percent = lessonsTotal > 0 ? Math.round((completedLessons / lessonsTotal) * 100) : 0;
        const isComplete = lessonsTotal > 0 && completedLessons >= lessonsTotal;

        totalLessons += lessonsTotal;
        totalCompletedLessons += completedLessons;
        if (isComplete) {
            totalCompletedModules += 1;
        }

        const card = document.createElement("article");
        card.className = "parent-module-card";
        if (isComplete) {
            card.classList.add("is-complete");
        }
        card.innerHTML = `
            <h4 class="parent-module-card__title">${module?.name || "Без названия"}</h4>
            <p class="parent-module-card__meta">Язык: ${module?.language || "-"}</p>
            <div class="parent-module-card__progress">
                <div class="parent-module-card__progress-head">
                    <span>Уроки</span>
                    <span>${completedLessons}/${lessonsTotal} (${percent}%)</span>
                </div>
                <div class="parent-module-card__progress-bar"><span style="width:${percent}%"></span></div>
            </div>
        `;
        modulesListEl.appendChild(card);
    });

    modulesEmptyEl.hidden = sortedModules.length > 0;
    summaryLessonsEl.textContent = `${totalCompletedLessons} / ${totalLessons}`;
    summaryModulesEl.textContent = `${totalCompletedModules} / ${sortedModules.length}`;
    modulesCaptionEl.textContent = currentChild
        ? `Отслеживается: ${currentChild.username}`
        : "Укажите ник ребёнка в профиле";
}

async function fetchProfile() {
    const response = await authFetch("/auth/profile/", {
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        throw new Error("Не удалось загрузить профиль.");
    }
    return response.json();
}

async function fetchChildProgress() {
    const response = await authFetch("/auth/parent/child-progress/", {
        headers: {
            "Content-Type": "application/json"
        }
    });
    if (!response.ok) {
        throw new Error("Не удалось загрузить прогресс ребёнка.");
    }
    return response.json();
}

async function saveProfile() {
    const payload = {
        first_name: formFirstNameEl.value.trim(),
        last_name: formLastNameEl.value.trim(),
        email: formEmailEl.value.trim(),
        child_username: formChildUsernameEl.value.trim(),
    };
    const response = await authFetch("/auth/profile/", {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data?.detail || "Не удалось сохранить профиль.");
    }
    return data;
}

async function refreshDashboardData() {
    const progressPayload = await fetchChildProgress();
    currentChild = progressPayload?.child || null;
    currentProgress = Array.isArray(progressPayload?.progress) ? progressPayload.progress : [];

    setChildStats(currentChild);
    if (currentChild) {
        noteEl.textContent = `Отслеживается ученик: ${currentChild.username}`;
    } else {
        noteEl.textContent = progressPayload?.message || "Укажите ник ребёнка в профиле.";
    }

    await renderModulesProgress();
}

async function initParentDashboard() {
    try {
        currentProfile = await fetchProfile();
        if (currentProfile.role !== "parent") {
            if (currentProfile.role === "student") {
                window.location.replace("/student/");
                return;
            }
            window.location.replace("/");
            return;
        }

        setProfileChip(currentProfile);
        fillProfileForm(currentProfile);
        await loadModules();
        await refreshDashboardData();
    } catch (error) {
        clearAuthAndRedirect();
    }
}

profileChipBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu();
});

document.addEventListener("click", (event) => {
    if (!profileMenuEl || profileMenuEl.hidden) {
        return;
    }
    if (profileMenuEl.contains(event.target) || profileChipBtn?.contains(event.target)) {
        return;
    }
    closeProfileMenu();
});

openProfileBtn?.addEventListener("click", () => {
    closeProfileMenu();
    fillProfileForm(currentProfile || {});
    openProfileModal();
});

logoutBtn?.addEventListener("click", () => {
    clearAuthAndRedirect();
});

profileModalCloseEls.forEach((button) => {
    button.addEventListener("click", closeProfileModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !profileModalEl.hidden) {
        closeProfileModal();
    }
});

profileFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setProfileMessage("");
    const submitBtn = profileFormEl.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
    }

    try {
        const updated = await saveProfile();
        currentProfile = updated;
        setProfileChip(updated);
        fillProfileForm(updated);
        await refreshDashboardData();
        setProfileMessage("Профиль обновлен.", "success");
    } catch (error) {
        setProfileMessage(error?.message || "Не удалось сохранить профиль.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
        }
    }
});

initParentDashboard();
