let accessToken = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh");
let refreshPromise = null;

const langDropdown = document.getElementById("lang-dropdown");
const langTrigger = document.getElementById("lang-trigger");
const langMenu = document.getElementById("lang-menu");
const activeLanguage = document.getElementById("active-language");
const heroLanguage = document.getElementById("hero-language");
const heroRoleCaptionEl = document.getElementById("hero-role-caption");
const heroMainTitleEl = document.getElementById("hero-main-title");
const tasksLanguage = document.getElementById("tasks-language");
const tasksTitleEl = document.getElementById("tasks-title");
const tasksSubtitleEl = document.getElementById("tasks-subtitle");
const parentProgressNoteEl = document.getElementById("parent-progress-note");
const achievementsPanelEl = document.getElementById("student-achievements-panel");
const achievementsGridEl = document.getElementById("student-achievements-grid");
const achievementToastStackEl = document.getElementById("achievement-toast-stack");
const pvzTrophySectionEl = document.getElementById("student-easter-egg");
const pvzTrophyBtn = document.getElementById("pvz-trophy-btn");

const usernameEl = document.getElementById("student-username");
const levelEl = document.getElementById("student-level");
const experienceEl = document.getElementById("student-experience");
const profileBtn = document.getElementById("student-profile");
const headerAvatarImageEl = document.getElementById("header-avatar-image");
const headerAvatarFallbackEl = document.getElementById("header-avatar-fallback");
const headerProfileLabelEl = document.getElementById("header-profile-label");
const profileMenuWrap = document.getElementById("profile-menu");
const profileMenuList = document.getElementById("profile-menu-list");
const profileMenuProfileBtn = document.getElementById("profile-menu-profile");
const profileMenuLogoutBtn = document.getElementById("profile-menu-logout");
const homeTab = document.getElementById("tab-home");
const tasksTab = document.getElementById("tab-tasks");
const achievementsTab = document.getElementById("tab-achievements");
const homePanels = document.querySelectorAll(".panel-home");
const achievementsPanel = document.getElementById("panel-achievements");
const tasksPanel = document.getElementById("panel-tasks");
const modulesListEl = document.getElementById("student-modules-list");
const modulesEmptyEl = document.getElementById("student-modules-empty");
const lessonViewerEl = document.getElementById("student-lesson-viewer");
const lessonModuleNameEl = document.getElementById("lesson-module-name");
const lessonCounterEl = document.getElementById("lesson-counter");
const lessonProgressTrackEl = document.getElementById("lesson-progress-track");
const lessonProgressTextEl = document.getElementById("lesson-progress-text");
const lessonListEl = document.getElementById("lesson-list");
const lessonTitleEl = document.getElementById("lesson-title");
const lessonContentEl = document.getElementById("lesson-content");
const lessonPrevBtn = document.getElementById("lesson-prev-btn");
const lessonNextBtn = document.getElementById("lesson-next-btn");
const codeModalEl = document.getElementById("code-modal");
const codeModalTitleEl = document.getElementById("code-modal-title");
const codeModalContentEl = document.getElementById("code-modal-content");
const codeModalCloseEls = document.querySelectorAll("[data-close-code-modal]");
const profileModalEl = document.getElementById("profile-modal");
const profileModalCloseEls = document.querySelectorAll("[data-close-profile-modal]");
const profileFormEl = document.getElementById("profile-form");
const profileMessageEl = document.getElementById("profile-form-message");
const profileUsernameInput = document.getElementById("profile-username");
const profileFirstNameInput = document.getElementById("profile-first-name");
const profileLastNameInput = document.getElementById("profile-last-name");
const profileEmailInput = document.getElementById("profile-email");
const profileChildFieldEl = document.getElementById("profile-child-field");
const profileChildUsernameInput = document.getElementById("profile-child-username");
const profileRoleInput = document.getElementById("profile-role");
const profileLevelInput = document.getElementById("profile-level");
const profileAvatarPreviewEl = document.getElementById("profile-avatar-preview");
const profileAvatarOpenEditorBtn = document.getElementById("profile-avatar-open-editor");
const profileAvatarInput = document.getElementById("profile-avatar-input");
const profileAvatarImageEl = document.getElementById("profile-avatar-image");
const profileAvatarPlaceholderEl = document.getElementById("profile-avatar-placeholder");
const avatarModalEl = document.getElementById("avatar-modal");
const avatarModalCloseEls = document.querySelectorAll("[data-close-avatar-modal]");
const avatarEditorCanvasEl = document.getElementById("avatar-editor-canvas");
const avatarEditorZoomEl = document.getElementById("avatar-editor-zoom");
const avatarEditorPickBtn = document.getElementById("avatar-editor-pick");
const avatarEditorApplyBtn = document.getElementById("avatar-editor-apply");
const avatarEditorStageEl = document.querySelector(".avatar-editor-stage");

if (!accessToken) {
    window.location.replace("/");
}

const LANGUAGE_CONFIG = {
    python: { label: "Python" },
    java: { label: "Java" },
    javascript: { label: "JavaScript" },
    cpp: { label: "C++" }
};

let activeLanguageKey = "python";
let allModules = [];
let activeModuleId = null;
let activeModuleName = "";
let currentLessons = [];
let currentLessonIndex = 0;
let currentLessonSections = [];
let currentSectionIndex = 0;
const stepProgressByStepId = new Map();
const practiceDragStateByStepId = new Map();
const quizStateByStepId = new Map();
const codePracticeStateByStepId = new Map();
const finalTestIntroAcceptedLessonIds = new Set();
const lessonsByModule = new Map();
const moduleLessonTotals = new Map();
const moduleLessonsLoading = new Set();
let lessonRequestSeq = 0;
const completedLessonIds = new Set();
const completedLessonIdsByModule = new Map();
const lessonCompletionInFlight = new Set();
const slideSyncInFlight = new Set();
const rewardedModuleIds = new Set();
const viewedSlidesByLessonId = new Map();
let achievementsCache = [];
const shownAchievementToastCodes = new Set();
let lessonProgressStatusMessage = "";
const VIEWED_SLIDES_STORAGE_PREFIX = "student_viewed_slides_v1";
const ACHIEVEMENT_SOUND_URL = "/static/music/achievement-unlock.mp3";
let viewedSlidesStorageLoadedFor = "";
let localSlidesSyncDoneForStorageKey = "";
let currentProfile = null;
let currentRole = "";
let isParentMode = false;
let monitoredChildProfile = null;
let avatarDraftBlob = null;
let avatarDraftDirty = false;
let avatarDraftPreviewUrl = "";
let avatarEditorImage = null;
let avatarEditorScale = 1;
let avatarEditorOffsetX = 0;
let avatarEditorOffsetY = 0;
let avatarEditorDragging = false;
let avatarEditorDragStartX = 0;
let avatarEditorDragStartY = 0;
let avatarEditorDragStartOffsetX = 0;
let avatarEditorDragStartOffsetY = 0;
let achievementSoundEl = null;
let pyodideInstancePromise = null;
const PYODIDE_INDEX_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";

function clearAuthAndRedirect() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    accessToken = "";
    window.location.replace("/");
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

function setLanguage(languageKey) {
    const config = LANGUAGE_CONFIG[languageKey];
    if (!config) {
        return;
    }

    activeLanguageKey = languageKey;
    activeLanguage.textContent = config.label;
    heroLanguage.textContent = config.label;
    tasksLanguage.textContent = config.label;

    document.querySelectorAll(".lang-option").forEach((option) => {
        option.classList.toggle("is-selected", option.dataset.lang === languageKey);
    });

    lessonRequestSeq += 1;
    activeModuleId = null;
    activeModuleName = "";
    currentLessons = [];
    currentLessonIndex = 0;
    currentLessonSections = [];
    currentSectionIndex = 0;

    if (!tasksPanel.hidden) {
        renderModulesForActiveLanguage();
    }
}

function closeLanguageMenu() {
    langMenu.hidden = true;
    langTrigger.setAttribute("aria-expanded", "false");
}

function closeProfileMenu() {
    if (!profileMenuList || !profileBtn) {
        return;
    }
    profileMenuList.hidden = true;
    profileBtn.setAttribute("aria-expanded", "false");
}

function openProfileMenu() {
    if (!profileMenuList || !profileBtn) {
        return;
    }
    profileMenuList.hidden = false;
    profileBtn.setAttribute("aria-expanded", "true");
}

function toggleProfileMenu() {
    if (!profileMenuList) {
        return;
    }
    if (profileMenuList.hidden) {
        openProfileMenu();
        return;
    }
    closeProfileMenu();
}

function setProfileMessage(message, type = "") {
    if (!profileMessageEl) {
        return;
    }
    profileMessageEl.textContent = message || "";
    profileMessageEl.classList.remove("is-success", "is-error");
    if (type === "success") {
        profileMessageEl.classList.add("is-success");
    } else if (type === "error") {
        profileMessageEl.classList.add("is-error");
    }
}

function setLessonProgressStatus(message) {
    lessonProgressStatusMessage = String(message || "").trim();
}

function getViewedSlidesOwnerUsername() {
    if (isParentMode && monitoredChildProfile?.username) {
        return monitoredChildProfile.username;
    }
    return currentProfile?.username || "";
}

function fillDashboardStats(sourceUser) {
    const username = sourceUser?.username || "-";
    const level = sourceUser?.level ?? "-";
    const experience = sourceUser?.experience ?? sourceUser?.xp ?? "-";

    usernameEl.textContent = username;
    levelEl.textContent = level;
    experienceEl.textContent = experience;
}

function setParentProgressNote(message = "") {
    if (!parentProgressNoteEl) {
        return;
    }
    const text = String(message || "").trim();
    parentProgressNoteEl.textContent = text;
    parentProgressNoteEl.hidden = !isParentMode || !text;
}

function applyRoleUi(role) {
    currentRole = String(role || "");
    isParentMode = currentRole === "parent";

    if (tasksTab) {
        tasksTab.textContent = isParentMode ? "Прогресс" : "Задания";
    }
    if (tasksTitleEl) {
        const titlePrefixNode = tasksTitleEl.firstChild;
        if (titlePrefixNode && titlePrefixNode.nodeType === Node.TEXT_NODE) {
            titlePrefixNode.nodeValue = isParentMode ? "Прогресс ребёнка по " : "Задания по ";
        }
    }
    if (tasksSubtitleEl) {
        tasksSubtitleEl.textContent = isParentMode
            ? "Здесь отображается учебный прогресс ребёнка по выбранному языку."
            : "Выберите модуль. Список модулей подбирается под активный язык.";
    }
    if (heroRoleCaptionEl) {
        heroRoleCaptionEl.textContent = isParentMode ? "Личный кабинет родителя" : "Личный кабинет ученика";
    }
    if (heroMainTitleEl) {
        heroMainTitleEl.textContent = isParentMode ? "Главная родителя" : "Главная ученика";
    }
    if (profileChildFieldEl) {
        profileChildFieldEl.hidden = !isParentMode;
    }
    if (achievementsPanelEl) {
        achievementsPanelEl.hidden = isParentMode;
    }
    if (achievementsTab) {
        achievementsTab.hidden = isParentMode;
    }
    if (pvzTrophySectionEl) {
        pvzTrophySectionEl.hidden = isParentMode;
    }
    if (!isParentMode) {
        setParentProgressNote("");
    }
}

function normalizeAchievementCode(rawCode) {
    return String(rawCode || "").trim().toLowerCase();
}

function playAchievementSound() {
    if (isParentMode) {
        return;
    }

    if (!achievementSoundEl) {
        achievementSoundEl = new Audio(ACHIEVEMENT_SOUND_URL);
        achievementSoundEl.preload = "auto";
        achievementSoundEl.volume = 0.75;
    }

    try {
        achievementSoundEl.currentTime = 0;
        const playPromise = achievementSoundEl.play();
        if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
                // Браузер может блокировать автозвук без действия пользователя.
            });
        }
    } catch (error) {
        // Ошибка проигрывания не должна ломать интерфейс.
    }
}

function showAchievementToast(achievement) {
    if (!achievementToastStackEl || isParentMode) {
        return;
    }

    const code = normalizeAchievementCode(achievement?.code);
    if (code && shownAchievementToastCodes.has(code)) {
        return;
    }
    if (code) {
        shownAchievementToastCodes.add(code);
    }

    playAchievementSound();

    const toast = document.createElement("article");
    toast.className = "achievement-toast";
    toast.setAttribute("role", "status");

    const label = document.createElement("p");
    label.className = "achievement-toast__label";
    label.textContent = "Новое достижение";

    const title = document.createElement("p");
    title.className = "achievement-toast__name";
    title.textContent = achievement?.name || "Достижение открыто";

    toast.appendChild(label);
    toast.appendChild(title);
    achievementToastStackEl.appendChild(toast);

    const removeToast = () => {
        toast.classList.add("is-hiding");
        window.setTimeout(() => {
            toast.remove();
        }, 220);
    };

    window.requestAnimationFrame(() => {
        toast.classList.add("is-visible");
    });
    window.setTimeout(removeToast, 3600);
    toast.addEventListener("click", removeToast);
}

function renderAchievements(achievements) {
    if (!achievementsGridEl) {
        return;
    }
    achievementsGridEl.innerHTML = "";

    const list = Array.isArray(achievements) ? achievements : [];
    if (!list.length) {
        const empty = document.createElement("p");
        empty.className = "student-note";
        empty.textContent = "Достижения пока не получены.";
        achievementsGridEl.appendChild(empty);
        return;
    }

    list.forEach((achievement) => {
        const card = document.createElement("article");
        card.className = "student-achievement-card";
        if (achievement?.unlocked) {
            card.classList.add("is-unlocked");
        }

        const title = document.createElement("p");
        title.className = "student-achievement-card__name";
        title.textContent = achievement?.name || "Достижение";

        const meta = document.createElement("p");
        meta.className = "student-achievement-card__meta";
        if (achievement?.unlocked) {
            meta.textContent = "Открыто";
        } else if (Number(achievement?.xp_required) > 0) {
            meta.textContent = `Нужно XP: ${achievement.xp_required}`;
        } else {
            meta.textContent = "Скрыто до выполнения условия";
        }

        card.appendChild(title);
        card.appendChild(meta);
        achievementsGridEl.appendChild(card);
    });
}

function applyNewAchievements(newAchievements) {
    const incoming = Array.isArray(newAchievements) ? newAchievements : [];
    if (!incoming.length) {
        return;
    }

    incoming.forEach((item) => showAchievementToast(item));

    if (!Array.isArray(achievementsCache)) {
        achievementsCache = [];
    }

    const indexByCode = new Map();
    achievementsCache.forEach((achievement, index) => {
        const code = normalizeAchievementCode(achievement?.code);
        if (code) {
            indexByCode.set(code, index);
        }
    });

    incoming.forEach((item) => {
        const code = normalizeAchievementCode(item?.code);
        if (code && indexByCode.has(code)) {
            const index = indexByCode.get(code);
            const existing = achievementsCache[index] || {};
            achievementsCache[index] = {
                ...existing,
                id: item?.id ?? existing.id,
                code: item?.code || existing.code,
                name: item?.name || existing.name,
                unlocked: true
            };
            return;
        }

        const appended = {
            id: item?.id ?? null,
            code: item?.code || code,
            name: item?.name || "Достижение",
            xp_required: 0,
            unlocked: true,
            unlocked_at: new Date().toISOString()
        };
        achievementsCache.push(appended);
        if (code) {
            indexByCode.set(code, achievementsCache.length - 1);
        }
    });

    renderAchievements(achievementsCache);
}

function getViewedSlidesStorageKey(usernameValue) {
    const username = String(usernameValue || getViewedSlidesOwnerUsername() || "").trim().toLowerCase();
    if (!username) {
        return "";
    }
    return `${VIEWED_SLIDES_STORAGE_PREFIX}:${username}`;
}

function loadViewedSlidesFromStorage(usernameValue) {
    const storageKey = getViewedSlidesStorageKey(usernameValue);
    if (!storageKey) {
        return;
    }
    if (viewedSlidesStorageLoadedFor && viewedSlidesStorageLoadedFor !== storageKey) {
        viewedSlidesByLessonId.clear();
    }

    try {
        const rawData = localStorage.getItem(storageKey);
        if (!rawData) {
            viewedSlidesStorageLoadedFor = storageKey;
            return;
        }

        const parsed = JSON.parse(rawData);
        if (!parsed || typeof parsed !== "object") {
            viewedSlidesStorageLoadedFor = storageKey;
            return;
        }

        Object.entries(parsed).forEach(([lessonIdRaw, slideIndexesRaw]) => {
            const lessonId = Number(lessonIdRaw);
            if (!Number.isFinite(lessonId) || !Array.isArray(slideIndexesRaw)) {
                return;
            }
            const set = new Set();
            slideIndexesRaw.forEach((slideIndexRaw) => {
                const slideIndex = Number(slideIndexRaw);
                if (Number.isInteger(slideIndex) && slideIndex >= 0) {
                    set.add(slideIndex);
                }
            });
            if (set.size > 0) {
                const existing = viewedSlidesByLessonId.get(lessonId);
                if (existing) {
                    set.forEach((index) => existing.add(index));
                } else {
                    viewedSlidesByLessonId.set(lessonId, set);
                }
            }
        });
    } catch (error) {
        // Игнорируем невалидный localStorage и начинаем с пустой истории.
    }

    viewedSlidesStorageLoadedFor = storageKey;
}

function persistViewedSlidesToStorage() {
    const storageKey = getViewedSlidesStorageKey();
    if (!storageKey || viewedSlidesStorageLoadedFor !== storageKey) {
        return;
    }

    const payload = {};
    viewedSlidesByLessonId.forEach((slideIndexesSet, lessonId) => {
        if (!(slideIndexesSet instanceof Set) || !slideIndexesSet.size) {
            return;
        }
        payload[String(lessonId)] = Array.from(slideIndexesSet).sort((a, b) => a - b);
    });

    try {
        localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (error) {
        // Переполненный localStorage не должен ломать UI.
    }
}

function normalizeAvatarUrl(rawUrl) {
    const value = String(rawUrl || "").trim();
    if (!value) {
        return "";
    }
    if (/^https?:\/\//i.test(value)) {
        return value;
    }
    return value.startsWith("/") ? value : `/${value}`;
}

function getProfileInitial(rawUsername) {
    const value = String(rawUsername || "").trim();
    if (!value) {
        return "?";
    }
    return value[0].toUpperCase();
}

function setHeaderProfileChip(usernameValue, levelValue, avatarRawUrl) {
    const username = String(usernameValue || "-");
    const level = String(levelValue ?? "-");
    const label = `${username} | Lv.${level}`;

    if (headerProfileLabelEl) {
        headerProfileLabelEl.textContent = label;
    } else if (profileBtn) {
        profileBtn.textContent = label;
    }

    const avatarUrl = normalizeAvatarUrl(avatarRawUrl);
    if (headerAvatarImageEl) {
        if (avatarUrl) {
            headerAvatarImageEl.src = `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;
            headerAvatarImageEl.hidden = false;
        } else {
            headerAvatarImageEl.hidden = true;
            headerAvatarImageEl.removeAttribute("src");
        }
    }

    if (headerAvatarFallbackEl) {
        headerAvatarFallbackEl.textContent = getProfileInitial(username);
        headerAvatarFallbackEl.hidden = Boolean(avatarUrl);
    }
}

function revokeAvatarDraftPreviewUrl() {
    if (!avatarDraftPreviewUrl) {
        return;
    }
    URL.revokeObjectURL(avatarDraftPreviewUrl);
    avatarDraftPreviewUrl = "";
}

function setProfileAvatarPreview(srcValue) {
    const safeSrc = String(srcValue || "").trim();
    if (profileAvatarImageEl) {
        if (safeSrc) {
            profileAvatarImageEl.src = safeSrc;
            profileAvatarImageEl.hidden = false;
        } else {
            profileAvatarImageEl.hidden = true;
            profileAvatarImageEl.removeAttribute("src");
        }
    }
    if (profileAvatarPlaceholderEl) {
        profileAvatarPlaceholderEl.hidden = Boolean(safeSrc);
    }
}

function resetAvatarEditorState() {
    avatarEditorImage = null;
    avatarEditorScale = 1;
    avatarEditorOffsetX = 0;
    avatarEditorOffsetY = 0;
    avatarEditorDragging = false;

    if (avatarEditorZoomEl) {
        avatarEditorZoomEl.value = "1";
    }
    if (avatarEditorCanvasEl) {
        avatarEditorCanvasEl.hidden = true;
        avatarEditorCanvasEl.classList.remove("is-dragging");
        const ctx = avatarEditorCanvasEl.getContext("2d");
        if (ctx) {
            ctx.clearRect(0, 0, avatarEditorCanvasEl.width, avatarEditorCanvasEl.height);
        }
    }
    if (avatarEditorApplyBtn) {
        avatarEditorApplyBtn.disabled = true;
    }
}

function resetAvatarPreview(profile) {
    avatarDraftBlob = null;
    avatarDraftDirty = false;
    revokeAvatarDraftPreviewUrl();
    resetAvatarEditorState();

    if (profileAvatarInput) {
        profileAvatarInput.value = "";
    }

    const avatarUrl = normalizeAvatarUrl(profile?.avatar_url || profile?.avatar);
    if (avatarUrl) {
        setProfileAvatarPreview(`${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${Date.now()}`);
        return;
    }

    setProfileAvatarPreview("");
}

function populateProfileForm(profile) {
    if (!profile) {
        return;
    }
    if (profileUsernameInput) {
        profileUsernameInput.value = profile.username || "";
    }
    if (profileFirstNameInput) {
        profileFirstNameInput.value = profile.first_name || "";
    }
    if (profileLastNameInput) {
        profileLastNameInput.value = profile.last_name || "";
    }
    if (profileEmailInput) {
        profileEmailInput.value = profile.email || "";
    }
    if (profileChildUsernameInput) {
        profileChildUsernameInput.value = profile.child_username || "";
    }
    if (profileRoleInput) {
        profileRoleInput.value = profile.role_display || profile.role || "";
    }
    if (profileLevelInput) {
        profileLevelInput.value = profile.level ?? "";
    }
    resetAvatarPreview(profile);
}

function closeProfileModal() {
    if (!profileModalEl) {
        return;
    }
    closeAvatarModal();
    profileModalEl.hidden = true;
    document.body.classList.remove("is-profile-modal-open");
    setProfileMessage("");
}

async function openProfileModal() {
    if (!profileModalEl) {
        return;
    }
    profileModalEl.hidden = false;
    document.body.classList.add("is-profile-modal-open");
    setProfileMessage("Загружаем профиль...");

    if (currentProfile) {
        populateProfileForm(currentProfile);
    }

    try {
        const profile = await fetchProfile();
        currentProfile = profile;
        fillProfile(profile);
        populateProfileForm(profile);
        setProfileMessage("");
    } catch (error) {
        setProfileMessage("Не удалось загрузить профиль.", "error");
    }
}

function clamp(value, minValue, maxValue) {
    return Math.min(maxValue, Math.max(minValue, value));
}

function clampAvatarEditorOffset() {
    if (!avatarEditorImage || !avatarEditorCanvasEl) {
        avatarEditorOffsetX = 0;
        avatarEditorOffsetY = 0;
        return;
    }

    const canvasWidth = avatarEditorCanvasEl.width;
    const canvasHeight = avatarEditorCanvasEl.height;
    const baseScale = Math.max(canvasWidth / avatarEditorImage.width, canvasHeight / avatarEditorImage.height);
    const totalScale = baseScale * avatarEditorScale;
    const drawWidth = avatarEditorImage.width * totalScale;
    const drawHeight = avatarEditorImage.height * totalScale;

    const maxOffsetX = Math.max(0, (drawWidth - canvasWidth) / 2);
    const maxOffsetY = Math.max(0, (drawHeight - canvasHeight) / 2);
    avatarEditorOffsetX = clamp(avatarEditorOffsetX, -maxOffsetX, maxOffsetX);
    avatarEditorOffsetY = clamp(avatarEditorOffsetY, -maxOffsetY, maxOffsetY);
}

function renderAvatarEditorCanvas() {
    if (!avatarEditorCanvasEl) {
        return;
    }

    const ctx = avatarEditorCanvasEl.getContext("2d");
    if (!ctx) {
        return;
    }
    const canvasWidth = avatarEditorCanvasEl.width;
    const canvasHeight = avatarEditorCanvasEl.height;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.fillStyle = "#13213d";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    if (!avatarEditorImage) {
        avatarEditorCanvasEl.hidden = true;
        if (avatarEditorApplyBtn) {
            avatarEditorApplyBtn.disabled = true;
        }
        return;
    }

    avatarEditorCanvasEl.hidden = false;
    if (avatarEditorApplyBtn) {
        avatarEditorApplyBtn.disabled = false;
    }

    clampAvatarEditorOffset();
    const baseScale = Math.max(canvasWidth / avatarEditorImage.width, canvasHeight / avatarEditorImage.height);
    const totalScale = baseScale * avatarEditorScale;
    const drawWidth = avatarEditorImage.width * totalScale;
    const drawHeight = avatarEditorImage.height * totalScale;
    const drawX = (canvasWidth - drawWidth) / 2 + avatarEditorOffsetX;
    const drawY = (canvasHeight - drawHeight) / 2 + avatarEditorOffsetY;

    ctx.drawImage(
        avatarEditorImage,
        drawX,
        drawY,
        drawWidth,
        drawHeight
    );
}

function stopAvatarEditorDrag(pointerId) {
    avatarEditorDragging = false;
    if (avatarEditorCanvasEl) {
        avatarEditorCanvasEl.classList.remove("is-dragging");
        if (typeof pointerId === "number") {
            try {
                if (avatarEditorCanvasEl.hasPointerCapture(pointerId)) {
                    avatarEditorCanvasEl.releasePointerCapture(pointerId);
                }
            } catch (error) {
                // Игнорируем ошибки release/capture при закрытии модалки.
            }
        }
    }
}

function loadImageByUrl(imageUrl) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error("Не удалось обработать изображение."));
        image.src = imageUrl;
    });
}

async function ensureAvatarEditorSourceFromPreview() {
    if (avatarEditorImage) {
        return;
    }
    const previewSrc = String(profileAvatarImageEl?.src || "").trim();
    if (!previewSrc) {
        return;
    }

    try {
        avatarEditorImage = await loadImageByUrl(previewSrc);
        avatarEditorScale = 1;
        avatarEditorOffsetX = 0;
        avatarEditorOffsetY = 0;
        if (avatarEditorZoomEl) {
            avatarEditorZoomEl.value = "1";
        }
    } catch (error) {
        avatarEditorImage = null;
    }
}

function closeAvatarModal() {
    if (!avatarModalEl) {
        return;
    }
    stopAvatarEditorDrag();
    avatarModalEl.hidden = true;
    document.body.classList.remove("is-avatar-modal-open");
}

async function openAvatarModal() {
    if (!avatarModalEl) {
        return;
    }
    avatarModalEl.hidden = false;
    document.body.classList.add("is-avatar-modal-open");
    await ensureAvatarEditorSourceFromPreview();
    renderAvatarEditorCanvas();
}

async function getAvatarEditorBlob() {
    if (!avatarEditorImage || !avatarEditorCanvasEl) {
        return null;
    }

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = 512;
    exportCanvas.height = 512;
    const exportCtx = exportCanvas.getContext("2d");
    if (!exportCtx) {
        return null;
    }

    const canvasWidth = avatarEditorCanvasEl.width;
    const canvasHeight = avatarEditorCanvasEl.height;
    const baseScale = Math.max(canvasWidth / avatarEditorImage.width, canvasHeight / avatarEditorImage.height);
    const totalScale = baseScale * avatarEditorScale;
    const drawWidth = avatarEditorImage.width * totalScale;
    const drawHeight = avatarEditorImage.height * totalScale;
    const drawX = (canvasWidth - drawWidth) / 2 + avatarEditorOffsetX;
    const drawY = (canvasHeight - drawHeight) / 2 + avatarEditorOffsetY;

    const scaleX = exportCanvas.width / canvasWidth;
    const scaleY = exportCanvas.height / canvasHeight;

    exportCtx.drawImage(
        avatarEditorImage,
        drawX * scaleX,
        drawY * scaleY,
        drawWidth * scaleX,
        drawHeight * scaleY
    );

    return new Promise((resolve) => {
        exportCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });
}

function extractProfileError(payload) {
    if (!payload || typeof payload !== "object") {
        return "Не удалось сохранить профиль.";
    }
    if (typeof payload.detail === "string") {
        return payload.detail;
    }
    const firstKey = Object.keys(payload)[0];
    if (!firstKey) {
        return "Не удалось сохранить профиль.";
    }
    const value = payload[firstKey];
    if (Array.isArray(value) && value.length) {
        return String(value[0]);
    }
    if (typeof value === "string") {
        return value;
    }
    return "Не удалось сохранить профиль.";
}

function closeCodeModal() {
    if (!codeModalEl) {
        return;
    }
    codeModalEl.hidden = true;
    document.body.classList.remove("is-code-modal-open");
}

function openCodeModal(codeText, codeLanguage) {
    if (!codeModalEl || !codeModalTitleEl || !codeModalContentEl) {
        return;
    }
    codeModalTitleEl.textContent = codeLanguage ? `Код: ${codeLanguage}` : "Код";
    codeModalContentEl.textContent = String(codeText || "");
    codeModalEl.hidden = false;
    document.body.classList.add("is-code-modal-open");
}

function openLanguageMenu() {
    langMenu.hidden = false;
    langTrigger.setAttribute("aria-expanded", "true");
}

langTrigger.addEventListener("click", () => {
    if (langMenu.hidden) {
        openLanguageMenu();
    } else {
        closeLanguageMenu();
    }
});

langMenu.addEventListener("click", (event) => {
    const button = event.target.closest(".lang-option");
    if (!button) {
        return;
    }

    setLanguage(button.dataset.lang);
    closeLanguageMenu();
});

document.addEventListener("click", (event) => {
    if (!langDropdown.contains(event.target)) {
        closeLanguageMenu();
    }
    if (profileMenuWrap && !profileMenuWrap.contains(event.target)) {
        closeProfileMenu();
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeLanguageMenu();
        closeProfileMenu();
        if (avatarModalEl && !avatarModalEl.hidden) {
            closeAvatarModal();
            return;
        }
        if (profileModalEl && !profileModalEl.hidden) {
            closeProfileModal();
            return;
        }
        if (codeModalEl && !codeModalEl.hidden) {
            closeCodeModal();
            return;
        }
        return;
    }

    if (avatarModalEl && !avatarModalEl.hidden) {
        return;
    }

    if (profileModalEl && !profileModalEl.hidden) {
        return;
    }

    if (tasksPanel.hidden || lessonViewerEl.hidden) {
        return;
    }
    if (codeModalEl && !codeModalEl.hidden) {
        return;
    }

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPreviousSlide();
        return;
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        void goToNextSlide();
    }
});

codeModalCloseEls.forEach((element) => {
    element.addEventListener("click", closeCodeModal);
});

profileBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleProfileMenu();
});

profileMenuProfileBtn?.addEventListener("click", () => {
    closeProfileMenu();
    void openProfileModal();
});

profileMenuLogoutBtn?.addEventListener("click", () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    accessToken = "";
    closeProfileMenu();
    window.location.replace("/");
});

profileModalCloseEls.forEach((element) => {
    element.addEventListener("click", closeProfileModal);
});

avatarModalCloseEls.forEach((element) => {
    element.addEventListener("click", closeAvatarModal);
});

function triggerAvatarPicker() {
    if (!profileAvatarInput) {
        return;
    }
    // Сбрасываем значение, чтобы можно было выбрать тот же файл повторно.
    profileAvatarInput.value = "";
    profileAvatarInput?.click();
}

profileAvatarPreviewEl?.addEventListener("click", () => {
    triggerAvatarPicker();
});

profileAvatarPreviewEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }
    event.preventDefault();
    triggerAvatarPicker();
});

profileAvatarOpenEditorBtn?.addEventListener("click", () => {
    if (!avatarEditorImage && !profileAvatarImageEl?.src) {
        triggerAvatarPicker();
        return;
    }
    void openAvatarModal();
});

avatarEditorPickBtn?.addEventListener("click", () => {
    triggerAvatarPicker();
});

avatarEditorStageEl?.addEventListener("click", () => {
    if (avatarEditorImage) {
        return;
    }
    triggerAvatarPicker();
});

async function loadAvatarFromFile(file) {
    const objectUrl = URL.createObjectURL(file);
    try {
        avatarEditorImage = await loadImageByUrl(objectUrl);
        avatarEditorScale = 1;
        avatarEditorOffsetX = 0;
        avatarEditorOffsetY = 0;
        if (avatarEditorZoomEl) {
            avatarEditorZoomEl.value = "1";
        }
        renderAvatarEditorCanvas();
        await openAvatarModal();
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

profileAvatarInput?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
        return;
    }

    try {
        await loadAvatarFromFile(file);
    } catch (error) {
        setProfileMessage("Не удалось обработать изображение.", "error");
    }
});

avatarEditorZoomEl?.addEventListener("input", () => {
    avatarEditorScale = Number(avatarEditorZoomEl.value || 1);
    renderAvatarEditorCanvas();
});

avatarEditorCanvasEl?.addEventListener("pointerdown", (event) => {
    if (!avatarEditorImage) {
        return;
    }
    event.preventDefault();
    avatarEditorDragging = true;
    avatarEditorDragStartX = event.clientX;
    avatarEditorDragStartY = event.clientY;
    avatarEditorDragStartOffsetX = avatarEditorOffsetX;
    avatarEditorDragStartOffsetY = avatarEditorOffsetY;
    avatarEditorCanvasEl.classList.add("is-dragging");
    avatarEditorCanvasEl.setPointerCapture(event.pointerId);
});

avatarEditorCanvasEl?.addEventListener("pointermove", (event) => {
    if (!avatarEditorDragging) {
        return;
    }
    avatarEditorOffsetX = avatarEditorDragStartOffsetX + (event.clientX - avatarEditorDragStartX);
    avatarEditorOffsetY = avatarEditorDragStartOffsetY + (event.clientY - avatarEditorDragStartY);
    renderAvatarEditorCanvas();
});

avatarEditorCanvasEl?.addEventListener("pointerup", (event) => {
    stopAvatarEditorDrag(event.pointerId);
});

avatarEditorCanvasEl?.addEventListener("pointercancel", (event) => {
    stopAvatarEditorDrag(event.pointerId);
});

avatarEditorCanvasEl?.addEventListener("wheel", (event) => {
    if (!avatarEditorImage || !avatarEditorZoomEl) {
        return;
    }
    event.preventDefault();

    const step = event.deltaY < 0 ? 0.05 : -0.05;
    const nextZoom = clamp(Number(avatarEditorZoomEl.value || 1) + step, 1, 3);
    avatarEditorZoomEl.value = nextZoom.toFixed(2);
    avatarEditorScale = nextZoom;
    renderAvatarEditorCanvas();
}, { passive: false });

avatarEditorApplyBtn?.addEventListener("click", async () => {
    const avatarBlob = await getAvatarEditorBlob();
    if (!avatarBlob) {
        setProfileMessage("Сначала выберите фото для аватара.", "error");
        return;
    }

    avatarDraftBlob = avatarBlob;
    avatarDraftDirty = true;
    revokeAvatarDraftPreviewUrl();
    avatarDraftPreviewUrl = URL.createObjectURL(avatarBlob);
    setProfileAvatarPreview(avatarDraftPreviewUrl);
    closeAvatarModal();
    setProfileMessage("Аватар обновлён. Нажмите «Сохранить».", "success");
});

profileFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();

    setProfileMessage("Сохраняем профиль...");
    const formData = new FormData();
    formData.append("first_name", (profileFirstNameInput?.value || "").trim());
    formData.append("last_name", (profileLastNameInput?.value || "").trim());
    formData.append("email", (profileEmailInput?.value || "").trim());
    if (isParentMode) {
        formData.append("child_username", (profileChildUsernameInput?.value || "").trim());
    }

    if (avatarDraftDirty && avatarDraftBlob) {
        formData.append("avatar", avatarDraftBlob, "avatar.jpg");
    }

    try {
        const response = await authFetch("/auth/profile/", {
            method: "PATCH",
            body: formData
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(extractProfileError(payload));
        }

        currentProfile = payload;
        applyRoleUi(payload.role);
        fillProfile(payload);
        populateProfileForm(payload);
        if (isParentMode) {
            await refreshParentMonitoringData();
        }
        setProfileMessage("Профиль сохранён.", "success");
    } catch (error) {
        setProfileMessage(error?.message || "Не удалось сохранить профиль.", "error");
    }
});

pvzTrophyBtn?.addEventListener("click", async () => {
    if (isParentMode) {
        return;
    }

    pvzTrophyBtn.disabled = true;
    playAchievementSound();

    try {
        const payload = await unlockPvzCupAchievement();
        applyNewAchievements(payload?.new_achievements);
        applyUserXpFromPayload(payload?.user);

        try {
            achievementsCache = await fetchAchievements();
            renderAchievements(achievementsCache);
        } catch (refreshError) {
            // Ошибка обновления списка достижений не критична для пасхалки.
        }
    } catch (error) {
        // Текстовых подсказок на главной не показываем.
    } finally {
        pvzTrophyBtn.disabled = false;
    }
});

function setActiveTab(tabName) {
    const safeTab = String(tabName || "home");
    const isHome = safeTab === "home";
    const isTasks = safeTab === "tasks";
    const isAchievements = safeTab === "achievements" && !isParentMode;

    homeTab.classList.toggle("is-active-tab", isHome);
    tasksTab.classList.toggle("is-active-tab", isTasks);
    if (achievementsTab) {
        achievementsTab.classList.toggle("is-active-tab", isAchievements);
    }

    homePanels.forEach((section) => {
        section.hidden = !isHome;
    });
    tasksPanel.hidden = !isTasks;
    if (achievementsPanel) {
        achievementsPanel.hidden = !isAchievements;
    }

    if (isTasks) {
        renderModulesForActiveLanguage();
    }
}

homeTab.addEventListener("click", () => {
    setActiveTab("home");
});

tasksTab.addEventListener("click", () => {
    setActiveTab("tasks");
});

achievementsTab?.addEventListener("click", () => {
    setActiveTab("achievements");
});

modulesListEl.addEventListener("click", (event) => {
    const moduleButton = event.target.closest("[data-module-id]");
    if (!moduleButton) {
        return;
    }
    if (moduleButton.disabled) {
        setLessonProgressStatus("Сначала заверши предыдущий модуль.");
        return;
    }

    const moduleId = Number(moduleButton.dataset.moduleId);
    const moduleName = moduleButton.dataset.moduleName || "Модуль";
    selectModule(moduleId, moduleName);
});

function goToPreviousSlide() {
    if (!currentLessons.length) {
        return;
    }

    if (currentSectionIndex > 0) {
        currentSectionIndex -= 1;
        renderActiveLesson();
        return;
    }

    if (currentLessonIndex > 0) {
        currentLessonIndex -= 1;
        currentSectionIndex = Number.MAX_SAFE_INTEGER;
        renderActiveLesson();
    }
}

async function goToNextSlide() {
    if (!currentLessons.length) {
        return;
    }

    const lesson = currentLessons[currentLessonIndex];
    if (needsFinalTestIntro(lesson)) {
        finalTestIntroAcceptedLessonIds.add(Number(lesson.id));
        setLessonProgressStatus("");
        currentSectionIndex = 0;
        renderActiveLesson();
        return;
    }

    const currentSegment = currentLessonSections[currentSectionIndex];
    if (!isParentMode && isInteractiveSegment(currentSegment) && !isLessonSegmentCompleted(lesson?.id, currentSegment, currentSectionIndex)) {
        let segmentCompleted = false;
        if (currentSegment.kind === "practice_drag") {
            segmentCompleted = await submitPracticeDragStep(lesson, currentSegment);
        } else if (currentSegment.kind === "quiz") {
            segmentCompleted = await submitQuizStep(lesson, currentSegment);
        } else if (currentSegment.kind === "practice_code") {
            segmentCompleted = await submitCodePracticeStep(lesson, currentSegment);
        }
        if (!segmentCompleted) {
            return;
        }
        await syncCurrentSlideProgress(lesson, currentSectionIndex, currentLessonSections.length);
    }

    if (currentSectionIndex < currentLessonSections.length - 1) {
        currentSectionIndex += 1;
        renderActiveLesson();
        return;
    }

    const completionSaved = await completeCurrentLessonIfNeeded();
    if (!completionSaved) {
        console.warn("Не удалось сохранить прогресс, но переход к следующему шагу продолжается.");
    }

    if (currentLessonIndex < currentLessons.length - 1) {
        currentLessonIndex += 1;
        currentSectionIndex = 0;
        renderActiveLesson();
        return;
    }

    renderActiveLesson();
}

lessonPrevBtn.addEventListener("click", goToPreviousSlide);
lessonNextBtn.addEventListener("click", () => {
    void goToNextSlide();
});

lessonListEl.addEventListener("click", (event) => {
    const lessonButton = event.target.closest("[data-lesson-index]");
    if (!lessonButton) {
        return;
    }

    const index = Number(lessonButton.dataset.lessonIndex);
    if (!Number.isNaN(index) && index >= 0 && index < currentLessons.length) {
        if (isLessonLockedByPrerequisites(currentLessons[index], index)) {
            setLessonProgressStatus("Сначала пройди первые 2 урока.");
            renderLessonProgressOverview();
            return;
        }
        currentLessonIndex = index;
        currentSectionIndex = 0;
        renderActiveLesson();
    }
});

lessonContentEl.addEventListener("click", async (event) => {
    const tokenButton = event.target.closest(".practice-drag__token");
    if (tokenButton) {
        const stepId = Number(tokenButton.dataset.stepId);
        const tokenId = tokenButton.dataset.tokenId;
        const fromZone = tokenButton.dataset.zone === "answer" ? "answer" : "pool";
        const toZone = fromZone === "answer" ? "pool" : "answer";
        if (tokenId && movePracticeToken(stepId, tokenId, fromZone, toZone)) {
            renderActiveLesson();
        }
        return;
    }

    const expandButton = event.target.closest(".md-code-expand");
    if (expandButton) {
        const codeBlock = expandButton.closest(".md-code-block");
        const codeEl = codeBlock?.querySelector("code");
        if (!codeEl) {
            return;
        }
        const langLabel = expandButton.dataset.codeLang || "Code";
        openCodeModal(codeEl.textContent || "", langLabel);
        return;
    }

    const copyButton = event.target.closest(".md-code-copy");
    if (!copyButton) {
        return;
    }

    const codeEl = copyButton.closest(".md-code-block")?.querySelector("code");
    if (!codeEl) {
        return;
    }

    try {
        await navigator.clipboard.writeText(codeEl.textContent || "");
        const prevLabel = copyButton.textContent;
        copyButton.textContent = "Скопировано";
        setTimeout(() => {
            copyButton.textContent = prevLabel;
        }, 1200);
    } catch (error) {
        copyButton.textContent = "Не удалось";
        setTimeout(() => {
            copyButton.textContent = "Копировать";
        }, 1200);
    }
});

lessonContentEl.addEventListener("dragstart", (event) => {
    const tokenButton = event.target.closest(".practice-drag__token");
    if (!tokenButton || tokenButton.disabled) {
        return;
    }
    const tokenId = tokenButton.dataset.tokenId;
    const zone = tokenButton.dataset.zone;
    if (!tokenId || !zone || !event.dataTransfer) {
        return;
    }
    event.dataTransfer.setData("text/plain", `${zone}:${tokenId}`);
    event.dataTransfer.effectAllowed = "move";
});

lessonContentEl.addEventListener("dragover", (event) => {
    const zone = event.target.closest(".practice-drag__zone");
    if (!zone) {
        return;
    }
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
});

lessonContentEl.addEventListener("drop", (event) => {
    const zone = event.target.closest(".practice-drag__zone");
    if (!zone) {
        return;
    }

    event.preventDefault();
    const rawPayload = event.dataTransfer?.getData("text/plain") || "";
    const [fromZoneRaw, tokenId] = rawPayload.split(":");
    const fromZone = fromZoneRaw === "answer" ? "answer" : "pool";
    const toZone = zone.dataset.zone === "answer" ? "answer" : "pool";
    const stepId = Number(String(tokenId || "").split("-")[0]);
    if (!tokenId || !Number.isFinite(stepId)) {
        return;
    }

    if (movePracticeToken(stepId, tokenId, fromZone, toZone)) {
        renderActiveLesson();
    }
});

async function fetchProfile() {
    const response = await authFetch("/auth/profile/", {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось получить профиль");
    }

    return response.json();
}

async function fetchModules() {
    const response = await fetch("/auth/courses/modules/", {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить модули");
    }

    return response.json();
}

async function fetchLessons(moduleId) {
    const response = await authFetch(`/auth/courses/modules/${moduleId}/lessons/`, {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить уроки");
    }

    return response.json();
}

async function fetchUserProgress() {
    const response = await authFetch("/auth/courses/progress/", {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить прогресс");
    }

    return response.json();
}

async function fetchAchievements() {
    const response = await authFetch("/auth/courses/achievements/", {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить достижения");
    }

    return response.json();
}

async function fetchParentChildProgress() {
    const response = await authFetch("/auth/parent/child-progress/", {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить прогресс ребёнка");
    }

    return response.json();
}

async function unlockPvzCupAchievement() {
    const response = await authFetch("/auth/courses/achievements/pvz-cup/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = payload?.error || payload?.detail || "Не удалось открыть достижение";
        throw new Error(detail);
    }

    return payload;
}

async function syncLocalViewedSlidesToServer() {
    if (isParentMode) {
        return null;
    }

    const storageKey = getViewedSlidesStorageKey();
    if (!storageKey || localSlidesSyncDoneForStorageKey === storageKey) {
        return null;
    }

    const lessonsPayload = [];
    viewedSlidesByLessonId.forEach((slideIndexesSet, lessonId) => {
        if (!Number.isFinite(Number(lessonId))) {
            return;
        }
        if (!(slideIndexesSet instanceof Set) || !slideIndexesSet.size) {
            return;
        }
        lessonsPayload.push({
            lesson_id: Number(lessonId),
            viewed_slide_indexes: Array.from(slideIndexesSet).sort((a, b) => a - b)
        });
    });

    localSlidesSyncDoneForStorageKey = storageKey;
    if (!lessonsPayload.length) {
        return null;
    }

    const response = await authFetch("/auth/courses/progress/sync-slides/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            lessons: lessonsPayload
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        localSlidesSyncDoneForStorageKey = "";
        const detail = payload?.error || payload?.detail || "Не удалось синхронизировать локальный прогресс";
        throw new Error(detail);
    }

    if (Array.isArray(payload?.progress)) {
        syncProgressState(payload.progress);
    }
    applyUserXpFromPayload(payload?.user);
    applyNewAchievements(payload?.new_achievements);
    renderModulesForActiveLanguage();
    return payload;
}

function syncProgressState(progressItems) {
    completedLessonIds.clear();
    completedLessonIdsByModule.clear();
    rewardedModuleIds.clear();
    viewedSlidesByLessonId.clear();
    stepProgressByStepId.clear();
    practiceDragStateByStepId.clear();
    quizStateByStepId.clear();
    codePracticeStateByStepId.clear();

    (Array.isArray(progressItems) ? progressItems : []).forEach((item) => {
        const lessonId = Number(
            typeof item?.lesson === "number" ? item.lesson : item?.lesson?.id
        );
        const moduleId = Number(item?.module);
        if (item?.completed && Number.isFinite(lessonId)) {
            completedLessonIds.add(lessonId);
            if (Number.isFinite(moduleId)) {
                if (!completedLessonIdsByModule.has(moduleId)) {
                    completedLessonIdsByModule.set(moduleId, new Set());
                }
                completedLessonIdsByModule.get(moduleId).add(lessonId);
            }
        }
        const viewedIndexes = Array.isArray(item?.viewed_slide_indexes) ? item.viewed_slide_indexes : [];
        if (Number.isFinite(lessonId) && viewedIndexes.length) {
            const normalizedSet = new Set();
            viewedIndexes.forEach((indexRaw) => {
                const index = Number(indexRaw);
                if (Number.isInteger(index) && index >= 0) {
                    normalizedSet.add(index);
                }
            });
            if (normalizedSet.size) {
                viewedSlidesByLessonId.set(lessonId, normalizedSet);
            }
        }
        if (item?.module_reward_granted && typeof item?.module === "number") {
            rewardedModuleIds.add(item.module);
        }
    });
    persistViewedSlidesToStorage();
}

async function refreshParentMonitoringData() {
    if (!isParentMode) {
        return;
    }

    try {
        const payload = await fetchParentChildProgress();
        monitoredChildProfile = payload?.child || null;
        syncProgressState(payload?.progress || []);

        if (monitoredChildProfile) {
            fillDashboardStats(monitoredChildProfile);
            loadViewedSlidesFromStorage(monitoredChildProfile.username);
            setParentProgressNote(`Отслеживается ученик: ${monitoredChildProfile.username}`);
        } else {
            fillDashboardStats({ username: "Ребёнок не выбран", level: "-", experience: "-" });
            loadViewedSlidesFromStorage(currentProfile?.username);
            setParentProgressNote(payload?.message || "Укажите ник ребёнка в профиле.");
        }
    } catch (error) {
        monitoredChildProfile = null;
        completedLessonIds.clear();
        completedLessonIdsByModule.clear();
        rewardedModuleIds.clear();
        fillDashboardStats({ username: "Ошибка загрузки", level: "-", experience: "-" });
        setParentProgressNote("Не удалось загрузить прогресс ребёнка.");
    }

    renderModulesForActiveLanguage();
    if (activeModuleId && !lessonViewerEl.hidden) {
        renderActiveLesson();
    }
}

function getCompletedLessonsForModule(moduleId) {
    const normalizedModuleId = Number(moduleId);
    if (!Number.isFinite(normalizedModuleId)) {
        return 0;
    }
    const completedSet = completedLessonIdsByModule.get(normalizedModuleId);
    return completedSet ? completedSet.size : 0;
}

function getModuleProgressStats(moduleId) {
    const normalizedModuleId = Number(moduleId);
    const total = moduleLessonTotals.get(normalizedModuleId) ?? 0;
    const completed = getCompletedLessonsForModule(normalizedModuleId);
    const safeTotal = Math.max(total, completed);
    const percent = safeTotal > 0 ? Math.round((completed / safeTotal) * 100) : 0;
    return {
        completed,
        total: safeTotal,
        percent: clamp(percent, 0, 100)
    };
}

function getSortedModulesForLanguage(languageKey = activeLanguageKey) {
    return filterModulesByLanguage(allModules, languageKey)
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function getKnownTotalLessonsForModule(moduleId) {
    const normalizedModuleId = Number(moduleId);
    if (!Number.isFinite(normalizedModuleId)) {
        return 0;
    }
    if (moduleLessonTotals.has(normalizedModuleId)) {
        return Math.max(0, Number(moduleLessonTotals.get(normalizedModuleId) || 0));
    }
    const cachedLessons = lessonsByModule.get(normalizedModuleId);
    if (Array.isArray(cachedLessons)) {
        return cachedLessons.length;
    }
    return 0;
}

function isModuleCompleted(module) {
    const moduleId = Number(module?.id);
    if (!Number.isFinite(moduleId)) {
        return false;
    }
    const completed = getCompletedLessonsForModule(moduleId);
    const total = getKnownTotalLessonsForModule(moduleId);
    return total > 0 && completed >= total;
}

function isModuleLocked(module, sortedModules = null) {
    if (isParentMode) {
        return false;
    }
    const moduleOrder = Number(module?.order ?? 0);
    if (!Number.isFinite(moduleOrder) || moduleOrder <= 1) {
        return false;
    }

    const modulesList = Array.isArray(sortedModules) ? sortedModules : getSortedModulesForLanguage();
    const previousModules = modulesList.filter((item) => Number(item?.order ?? 0) < moduleOrder);
    if (!previousModules.length) {
        return false;
    }

    return previousModules.some((previousModule) => !isModuleCompleted(previousModule));
}

async function warmupModuleLessonTotals(modules) {
    const moduleItems = Array.isArray(modules) ? modules : [];
    const tasks = [];

    moduleItems.forEach((module) => {
        const moduleId = Number(module?.id);
        if (!Number.isFinite(moduleId) || moduleLessonTotals.has(moduleId) || moduleLessonsLoading.has(moduleId)) {
            return;
        }
        moduleLessonsLoading.add(moduleId);
        tasks.push(
            (async () => {
                try {
                    const lessons = await fetchLessons(moduleId);
                    const normalizedLessons = Array.isArray(lessons) ? lessons : [];
                    moduleLessonTotals.set(moduleId, normalizedLessons.length);
                    if (!lessonsByModule.has(moduleId)) {
                        lessonsByModule.set(moduleId, normalizedLessons);
                    }
                } catch (error) {
                    moduleLessonTotals.set(moduleId, getCompletedLessonsForModule(moduleId));
                } finally {
                    moduleLessonsLoading.delete(moduleId);
                }
            })()
        );
    });

    if (!tasks.length) {
        return;
    }
    await Promise.allSettled(tasks);

    const filteredModules = filterModulesByLanguage(allModules, activeLanguageKey);
    renderModules(filteredModules);
}

function fillProfile(profile) {
    currentProfile = profile;
    const username = profile.username || "-";
    const level = profile.level ?? "-";
    const avatarRawUrl = profile?.avatar_url || profile?.avatar || "";

    if (!isParentMode) {
        fillDashboardStats(profile);
    }
    setHeaderProfileChip(username, level, avatarRawUrl);
}

function escapeHtml(text) {
    return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function normalizeLanguageKey(rawLanguage) {
    const base = String(rawLanguage || "").trim().toLowerCase();
    const noSpaces = base.replace(/\s+/g, "");

    if (noSpaces === "python" || noSpaces === "py" || noSpaces === "питон") {
        return "python";
    }
    if (noSpaces === "java" || noSpaces === "джава" || noSpaces === "ява") {
        return "java";
    }
    if (noSpaces === "javascript" || noSpaces === "js" || noSpaces === "ecmascript" || noSpaces === "джаваскрипт") {
        return "javascript";
    }
    if (noSpaces === "c++" || noSpaces === "cpp" || noSpaces === "cplusplus" || noSpaces === "си++") {
        return "cpp";
    }

    const normalized = noSpaces
        .replace(/#/g, "sharp")
        .replace(/[^a-z0-9+]/g, "");

    if (normalized === "python" || normalized === "py") {
        return "python";
    }
    if (normalized === "java") {
        return "java";
    }
    if (normalized === "javascript" || normalized === "js" || normalized === "ecmascript") {
        return "javascript";
    }
    if (normalized === "c++" || normalized === "cpp" || normalized === "cplusplus") {
        return "cpp";
    }

    return "";
}

function filterModulesByLanguage(modules, languageKey) {
    if (!LANGUAGE_CONFIG[languageKey]) {
        return [];
    }

    return modules.filter((module) => {
        const moduleLanguageKey = normalizeLanguageKey(module.language);
        return moduleLanguageKey === languageKey;
    });
}

function normalizeSectionsFromJson(rawSections) {
    if (!Array.isArray(rawSections)) {
        return [];
    }

    return rawSections
        .map((item, index) => {
            if (typeof item === "string") {
                return {
                    title: `Подтема ${index + 1}`,
                    text: item.trim()
                };
            }

            if (!item || typeof item !== "object") {
                return null;
            }

            const title = String(item.title || item.name || `Подтема ${index + 1}`).trim();
            const text = String(item.text || item.content || item.body || "").trim();
            if (!title && !text) {
                return null;
            }

            return { title, text };
        })
        .filter(Boolean);
}

function normalizeLessonText(rawContent) {
    let content = String(rawContent || "");
    const hasRealLineBreak = /\r|\n/.test(content);
    if (!hasRealLineBreak && /\\[nr]/.test(content)) {
        content = content
            .replace(/\\r\\n/g, "\n")
            .replace(/\\n/g, "\n")
            .replace(/\\r/g, "\n");
    }
    return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
}

function splitBySlideDelimiter(content) {
    const lines = content.split("\n");
    const chunks = [];
    let currentLines = [];
    let isInsideCodeFence = false;

    lines.forEach((line) => {
        const normalizedLine = isInsideCodeFence
            ? line
            : line.replace(/\s---+\s/g, "\n---\n");
        const subLines = normalizedLine.split("\n");

        subLines.forEach((subLine) => {
            const trimmed = subLine.trim();

            if (/^```/.test(trimmed)) {
                isInsideCodeFence = !isInsideCodeFence;
                currentLines.push(subLine);
                return;
            }

            if (!isInsideCodeFence && /^-{3,}$/.test(trimmed)) {
                const chunk = currentLines.join("\n").trim();
                if (chunk) {
                    chunks.push(chunk);
                }
                currentLines = [];
                return;
            }

            currentLines.push(subLine);
        });
    });

    const finalChunk = currentLines.join("\n").trim();
    if (finalChunk) {
        chunks.push(finalChunk);
    }

    return chunks;
}

function normalizeStepProgress(rawProgress) {
    return {
        completed: Boolean(rawProgress?.completed),
        attempts: Number(rawProgress?.attempts || 0),
        score: rawProgress?.score ?? null,
        completedAt: rawProgress?.completed_at || null
    };
}

function syncStepProgressFromLessons(lessons) {
    (Array.isArray(lessons) ? lessons : []).forEach((lesson) => {
        const stepItems = Array.isArray(lesson?.steps) ? lesson.steps : [];
        stepItems.forEach((step) => {
            const stepId = Number(step?.id);
            if (!Number.isFinite(stepId)) {
                return;
            }
            stepProgressByStepId.set(stepId, normalizeStepProgress(step?.progress));
        });
    });
}

function getStepProgress(stepId) {
    const normalizedStepId = Number(stepId);
    if (!Number.isFinite(normalizedStepId)) {
        return normalizeStepProgress(null);
    }
    if (!stepProgressByStepId.has(normalizedStepId)) {
        stepProgressByStepId.set(normalizedStepId, normalizeStepProgress(null));
    }
    return stepProgressByStepId.get(normalizedStepId);
}

function setStepProgress(stepId, progressPayload) {
    const normalizedStepId = Number(stepId);
    if (!Number.isFinite(normalizedStepId)) {
        return;
    }
    stepProgressByStepId.set(normalizedStepId, normalizeStepProgress(progressPayload));
}

function normalizePracticeTokens(rawValue) {
    if (!Array.isArray(rawValue)) {
        return [];
    }
    return rawValue
        .map((item) => String(item || "").trim())
        .filter((item) => item.length > 0);
}

function parseLessonSectionsFromSteps(lesson) {
    const stepItems = Array.isArray(lesson?.steps) ? [...lesson.steps] : [];
    if (!stepItems.length) {
        return [];
    }

    const sortedSteps = stepItems.sort((a, b) => {
        const left = Number(a?.order ?? 0);
        const right = Number(b?.order ?? 0);
        if (left !== right) {
            return left - right;
        }
        return Number(a?.id ?? 0) - Number(b?.id ?? 0);
    });

    return sortedSteps
        .map((step, index) => {
            const stepType = String(step?.step_type || "").trim().toLowerCase();
            const stepId = Number(step?.id);
            const title = String(step?.title || `Слайд ${index + 1}`).trim() || `Слайд ${index + 1}`;
            const content = normalizeLessonText(step?.content || "");
            const incomingProgress = normalizeStepProgress(step?.progress);
            const storedProgress = getStepProgress(stepId);
            const progress = (incomingProgress.completed || incomingProgress.attempts > storedProgress.attempts)
                ? incomingProgress
                : storedProgress;
            setStepProgress(stepId, progress);

            if (stepType === "practice_drag") {
                return {
                    kind: "practice_drag",
                    stepId,
                    stepType,
                    order: Number(step?.order ?? index + 1),
                    title,
                    text: content,
                    config: step?.config || {},
                    progress
                };
            }

            if (stepType === "quiz") {
                return {
                    kind: "quiz",
                    stepId,
                    stepType,
                    order: Number(step?.order ?? index + 1),
                    title,
                    text: content,
                    config: step?.config || {},
                    progress
                };
            }

            if (stepType === "practice_code") {
                return {
                    kind: "practice_code",
                    stepId,
                    stepType,
                    order: Number(step?.order ?? index + 1),
                    title,
                    text: content,
                    config: step?.config || {},
                    progress
                };
            }

            return {
                kind: "theory",
                stepId,
                stepType: stepType || "theory",
                order: Number(step?.order ?? index + 1),
                title,
                text: content || "Текст шага пока не добавлен.",
                config: step?.config || {},
                progress
            };
        })
        .filter(Boolean);
}

function parseLessonSectionsFromLesson(lesson) {
    const sectionsFromSteps = parseLessonSectionsFromSteps(lesson);
    if (sectionsFromSteps.length) {
        return sectionsFromSteps;
    }
    return parseLessonSections(lesson?.content);
}

function parseLessonSections(rawContent) {
    const content = normalizeLessonText(rawContent);
    if (!content) {
        return [];
    }

    const delimiterChunks = splitBySlideDelimiter(content);
    if (delimiterChunks.length > 1) {
        return delimiterChunks.map((chunk, index) => ({
            kind: "theory",
            title: `Слайд ${index + 1}`,
            text: chunk
        }));
    }

    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            const sections = normalizeSectionsFromJson(parsed).map((section) => ({
                kind: "theory",
                ...section
            }));
            if (sections.length) {
                return sections;
            }
        }
        if (parsed && Array.isArray(parsed.sections)) {
            const sections = normalizeSectionsFromJson(parsed.sections).map((section) => ({
                kind: "theory",
                ...section
            }));
            if (sections.length) {
                return sections;
            }
        }
    } catch (error) {
        // not json, continue with text-based parsing
    }

    const markdownChunks = content
        .split(/\n(?=##\s+)/)
        .map((chunk) => chunk.trim())
        .filter(Boolean);

    if (markdownChunks.length > 1 || /^##\s+/.test(markdownChunks[0] || "")) {
        return markdownChunks.map((chunk, index) => {
            const lines = chunk.split("\n");
            const firstLine = lines[0] || "";
            const title = firstLine.replace(/^##\s*/, "").trim() || `Подтема ${index + 1}`;
            const text = lines.slice(1).join("\n").trim();
            return { kind: "theory", title, text };
        });
    }

    return [{ kind: "theory", title: "Описание", text: content }];
}

function renderInlineMarkdown(rawText) {
    const placeholders = [];
    let text = String(rawText || "");

    text = text.replace(/`([^`\n]+)`/g, (_, codeText) => {
        const key = `__INLINE_CODE_${placeholders.length}__`;
        placeholders.push(`<code class="md-inline-code">${escapeHtml(codeText)}</code>`);
        return key;
    });

    text = escapeHtml(text);

    text = text.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
    text = text.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");

    text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    placeholders.forEach((replacement, index) => {
        const key = `__INLINE_CODE_${index}__`;
        text = text.replace(key, replacement);
    });

    return text;
}

function formatCodeLanguageLabel(lang) {
    const key = normalizeLanguageKey(lang);
    if (!key) {
        return String(lang || "code");
    }
    return LANGUAGE_CONFIG[key]?.label || key;
}

function renderMarkdownToHtml(rawMarkdown) {
    const text = normalizeLessonText(rawMarkdown);
    const lines = text.split("\n");
    const html = [];
    let index = 0;

    function isBlank(line) {
        return !line || !line.trim();
    }

    while (index < lines.length) {
        const line = lines[index];

        if (isBlank(line)) {
            index += 1;
            continue;
        }

        const codeStart = line.match(/^\s*```([\w#+-]*)\s*$/);
        if (codeStart) {
            const langRaw = codeStart[1] || "";
            const codeLines = [];
            index += 1;
            while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
                codeLines.push(lines[index]);
                index += 1;
            }
            if (index < lines.length && /^\s*```\s*$/.test(lines[index])) {
                index += 1;
            }

            const codeHtml = escapeHtml(codeLines.join("\n"));
            const langClass = langRaw ? ` language-${escapeHtml(langRaw.toLowerCase())}` : "";
            const langLabel = formatCodeLanguageLabel(langRaw);

            html.push(`
                <div class="md-code-block">
                    <div class="md-code-header">
                        <span class="md-code-lang">${escapeHtml(langLabel)}</span>
                        <div class="md-code-actions">
                            <button class="md-code-expand" type="button" data-code-lang="${escapeHtml(langLabel)}">Открыть окно</button>
                            <button class="md-code-copy" type="button">Копировать</button>
                        </div>
                    </div>
                    <pre class="md-code-pre"><code class="md-code${langClass}">${codeHtml}</code></pre>
                </div>
            `);
            continue;
        }

        const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headingMatch) {
            const level = Math.min(6, headingMatch[1].length + 2);
            html.push(`<h${level} class="md-heading md-heading-${level}">${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
            index += 1;
            continue;
        }

        if (/^>\s?/.test(line)) {
            const quoteLines = [];
            while (index < lines.length && /^>\s?/.test(lines[index])) {
                quoteLines.push(lines[index].replace(/^>\s?/, ""));
                index += 1;
            }
            html.push(`<blockquote class="md-quote">${renderInlineMarkdown(quoteLines.join(" "))}</blockquote>`);
            continue;
        }

        if (/^[-*+]\s+/.test(line)) {
            const items = [];
            while (index < lines.length && /^[-*+]\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^[-*+]\s+/, ""));
                index += 1;
            }
            html.push(`<ul class="md-list">${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
            continue;
        }

        if (/^\d+\.\s+/.test(line)) {
            const items = [];
            while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
                items.push(lines[index].replace(/^\d+\.\s+/, ""));
                index += 1;
            }
            html.push(`<ol class="md-list md-list-ordered">${items.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ol>`);
            continue;
        }

        const paragraphLines = [];
        while (index < lines.length && !isBlank(lines[index]) &&
            !/^```/.test(lines[index]) &&
            !/^(#{1,6})\s+/.test(lines[index]) &&
            !/^>\s?/.test(lines[index]) &&
            !/^[-*+]\s+/.test(lines[index]) &&
            !/^\d+\.\s+/.test(lines[index])) {
            paragraphLines.push(lines[index]);
            index += 1;
        }
        html.push(`<p class="md-paragraph">${renderInlineMarkdown(paragraphLines.join(" "))}</p>`);
    }

    return html.join("");
}

function renderLessonContent(sections, videoUrl) {
    lessonContentEl.innerHTML = "";

    if (!sections.length) {
        lessonContentEl.textContent = "Текст урока пока не добавлен.";
        return;
    }

    sections.forEach((section) => {
        const block = document.createElement("section");
        block.className = "lesson-section";

        if (section.title) {
            const title = document.createElement("h5");
            title.className = "lesson-section__title";
            title.textContent = section.title;
            block.appendChild(title);
        }

        const text = String(section.text || "").trim();
        if (text) {
            const body = document.createElement("div");
            body.className = "lesson-section__body";
            body.innerHTML = renderMarkdownToHtml(text);
            block.appendChild(body);
        }

        lessonContentEl.appendChild(block);
    });

    if (videoUrl) {
        const linkWrap = document.createElement("p");
        linkWrap.className = "lesson-video-link";
        const link = document.createElement("a");
        link.href = videoUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Смотреть видео к уроку";
        linkWrap.appendChild(link);
        lessonContentEl.appendChild(linkWrap);
    }
}

function getViewedSlidesSet(lessonId) {
    const normalizedLessonId = Number(lessonId);
    if (!Number.isFinite(normalizedLessonId)) {
        return new Set();
    }

    if (!viewedSlidesByLessonId.has(normalizedLessonId)) {
        viewedSlidesByLessonId.set(normalizedLessonId, new Set());
    }
    return viewedSlidesByLessonId.get(normalizedLessonId);
}

function isPracticeStepCompleted(stepId) {
    const normalizedStepId = Number(stepId);
    if (!Number.isFinite(normalizedStepId)) {
        return false;
    }
    return Boolean(getStepProgress(normalizedStepId)?.completed);
}

function isInteractiveSegment(segment) {
    const kind = String(segment?.kind || "");
    return kind === "practice_drag" || kind === "quiz" || kind === "practice_code";
}

function isLessonSegmentCompleted(lessonId, segment, index) {
    const normalizedLessonId = Number(lessonId);
    if (completedLessonIds.has(normalizedLessonId)) {
        return true;
    }
    if (isInteractiveSegment(segment)) {
        return isPracticeStepCompleted(segment.stepId);
    }
    return getViewedSlidesSet(normalizedLessonId).has(index);
}

function isFinalTestLesson(lesson) {
    const title = String(lesson?.title || "").toLowerCase();
    return title.includes("итоговый тест");
}

function needsFinalTestIntro(lesson) {
    const lessonId = Number(lesson?.id);
    if (!Number.isFinite(lessonId)) {
        return false;
    }
    if (isParentMode || !isFinalTestLesson(lesson)) {
        return false;
    }
    if (completedLessonIds.has(lessonId)) {
        return false;
    }
    return !finalTestIntroAcceptedLessonIds.has(lessonId);
}

function isLessonLockedByPrerequisites(lesson, lessonIndex) {
    if (isParentMode || !isFinalTestLesson(lesson)) {
        return false;
    }
    const requiredCompletedLessons = 2;
    const completedBefore = currentLessons
        .slice(0, lessonIndex)
        .filter((item) => completedLessonIds.has(Number(item?.id)))
        .length;
    return completedBefore < requiredCompletedLessons;
}

function renderFinalTestIntro(lesson) {
    const totalTasks = Array.isArray(currentLessonSections) ? currentLessonSections.length : 0;
    const safeTotal = Math.max(totalTasks, 3);

    lessonContentEl.innerHTML = `
        <section class="lesson-section final-test-intro">
            <h5 class="lesson-section__title">Перед тобой итоговый тест</h5>
            <div class="lesson-section__body">
                <p class="md-paragraph">
                    Это важный этап. Тест проверяет, как ты понял(а) темы после первых двух уроков.
                </p>
                <ul class="md-list">
                    <li>${safeTotal} задания: теория, сборка кода и мини-практика.</li>
                    <li>Отвечай спокойно, ошибки можно исправлять.</li>
                    <li>Главное — показать, что ты понимаешь, как работают переменные.</li>
                </ul>
                <p class="md-paragraph final-test-intro__hint">
                    Когда будешь готов(а), нажми «Начать тест».
                </p>
            </div>
        </section>
    `;

    lessonPrevBtn.disabled = currentLessonIndex === 0;
    lessonNextBtn.disabled = false;
    lessonNextBtn.textContent = "Начать тест";
    setLessonProgressStatus("важный тест");
    renderLessonList();
    renderLessonProgressOverview();
}

function createPracticeTokenObjects(stepId, tokens) {
    return tokens.map((text, index) => ({
        id: `${stepId}-${index}`,
        text
    }));
}

function lockPracticeStateAsCompleted(state, answerTokens) {
    state.pool = [];
    state.answer = createPracticeTokenObjects(state.stepId, answerTokens);
}

function ensurePracticeDragState(segment) {
    const stepId = Number(segment?.stepId);
    if (!Number.isFinite(stepId)) {
        return null;
    }

    const expectedTokens = normalizePracticeTokens(segment?.config?.answer);
    let allTokens = normalizePracticeTokens(segment?.config?.tokens);
    if (!allTokens.length) {
        allTokens = [...expectedTokens];
    }
    if (!expectedTokens.length && !allTokens.length) {
        return null;
    }

    expectedTokens.forEach((token) => {
        if (!allTokens.includes(token)) {
            allTokens.push(token);
        }
    });

    let state = practiceDragStateByStepId.get(stepId);
    if (!state) {
        const shuffled = [...allTokens].sort(() => Math.random() - 0.5);
        state = {
            stepId,
            pool: createPracticeTokenObjects(stepId, shuffled),
            answer: [],
            statusMessage: "",
            statusType: "",
            isSubmitting: false
        };
        practiceDragStateByStepId.set(stepId, state);
    }

    if (isPracticeStepCompleted(stepId)) {
        lockPracticeStateAsCompleted(state, expectedTokens);
    }

    return state;
}

function movePracticeToken(stepId, tokenId, fromZone, toZone) {
    const normalizedStepId = Number(stepId);
    if (!Number.isFinite(normalizedStepId)) {
        return false;
    }
    const state = practiceDragStateByStepId.get(normalizedStepId);
    if (!state || fromZone === toZone) {
        return false;
    }
    if (state.isSubmitting || isPracticeStepCompleted(normalizedStepId)) {
        return false;
    }

    const source = fromZone === "answer" ? state.answer : state.pool;
    const target = toZone === "answer" ? state.answer : state.pool;
    const tokenIndex = source.findIndex((token) => token.id === tokenId);
    if (tokenIndex < 0) {
        return false;
    }

    const [token] = source.splice(tokenIndex, 1);
    target.push(token);
    state.statusMessage = "";
    state.statusType = "";
    return true;
}

async function submitLessonStepAttempt(stepId, payload) {
    const response = await authFetch(`/auth/courses/steps/${stepId}/submit/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload || {})
    });

    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = responsePayload?.error || responsePayload?.detail || "Не удалось отправить практику";
        throw new Error(detail);
    }
    return responsePayload;
}

async function submitPracticeDragStep(lesson, segment) {
    const stepId = Number(segment?.stepId);
    if (!Number.isFinite(stepId)) {
        return false;
    }
    const state = ensurePracticeDragState(segment);
    if (!state || state.isSubmitting) {
        return false;
    }

    const answerTokens = state.answer.map((token) => token.text);
    if (!answerTokens.length) {
        state.statusMessage = "Сначала собери команду из кусочков.";
        state.statusType = "error";
        renderActiveLesson();
        return false;
    }

    state.isSubmitting = true;
    renderActiveLesson();

    try {
        const payload = await submitLessonStepAttempt(stepId, { answer: answerTokens });
        setStepProgress(stepId, payload?.progress || null);

        if (payload?.is_correct) {
            const expectedTokens = normalizePracticeTokens(segment?.config?.answer);
            lockPracticeStateAsCompleted(state, expectedTokens.length ? expectedTokens : answerTokens);
            state.statusMessage = payload?.message || "Верно!";
            state.statusType = "success";
        } else {
            state.statusMessage = payload?.message || "Порядок пока неверный.";
            state.statusType = "error";
        }

        applyUserXpFromPayload(payload?.user);
        applyNewAchievements(payload?.new_achievements);
        renderModulesForActiveLanguage();
        return Boolean(payload?.is_correct);
    } catch (error) {
        state.statusMessage = error?.message || "Ошибка при проверке практики.";
        state.statusType = "error";
        return false;
    } finally {
        state.isSubmitting = false;
        renderActiveLesson();
    }
}

function renderPracticeDragSegment(lesson, segment) {
    const state = ensurePracticeDragState(segment);
    lessonContentEl.innerHTML = "";

    const block = document.createElement("section");
    block.className = "lesson-section lesson-section--practice";

    const title = document.createElement("h5");
    title.className = "lesson-section__title";
    title.textContent = segment?.title || "Практика";
    block.appendChild(title);

    const body = document.createElement("div");
    body.className = "lesson-section__body";
    if (segment?.text) {
        body.innerHTML = renderMarkdownToHtml(segment.text);
    } else {
        body.innerHTML = "<p class=\"md-paragraph\">Собери команду из кусочков.</p>";
    }
    block.appendChild(body);

    if (!state) {
        const errorNote = document.createElement("p");
        errorNote.className = "practice-drag__status practice-drag__status--error";
        errorNote.textContent = "Для этого шага пока не настроены кусочки.";
        block.appendChild(errorNote);
        lessonContentEl.appendChild(block);
        return;
    }

    const workspace = document.createElement("div");
    workspace.className = "practice-drag";

    const answerZone = document.createElement("div");
    answerZone.className = "practice-drag__zone practice-drag__zone--answer";
    answerZone.dataset.zone = "answer";

    const answerLabel = document.createElement("p");
    answerLabel.className = "practice-drag__label";
    answerLabel.textContent = "Твой ответ";
    answerZone.appendChild(answerLabel);

    const answerTokensWrap = document.createElement("div");
    answerTokensWrap.className = "practice-drag__tokens";
    if (!state.answer.length) {
        const empty = document.createElement("span");
        empty.className = "practice-drag__empty";
        empty.textContent = "Перетащи сюда кусочки";
        answerTokensWrap.appendChild(empty);
    } else {
        state.answer.forEach((token) => {
            const tokenBtn = document.createElement("button");
            tokenBtn.type = "button";
            tokenBtn.className = "practice-drag__token";
            tokenBtn.draggable = true;
            tokenBtn.dataset.tokenId = token.id;
            tokenBtn.dataset.zone = "answer";
            tokenBtn.dataset.stepId = String(state.stepId);
            tokenBtn.textContent = token.text;
            if (state.isSubmitting || isPracticeStepCompleted(state.stepId)) {
                tokenBtn.disabled = true;
            }
            answerTokensWrap.appendChild(tokenBtn);
        });
    }
    answerZone.appendChild(answerTokensWrap);
    workspace.appendChild(answerZone);

    const poolZone = document.createElement("div");
    poolZone.className = "practice-drag__zone";
    poolZone.dataset.zone = "pool";

    const poolLabel = document.createElement("p");
    poolLabel.className = "practice-drag__label";
    poolLabel.textContent = "Кусочки";
    poolZone.appendChild(poolLabel);

    const poolTokensWrap = document.createElement("div");
    poolTokensWrap.className = "practice-drag__tokens";
    state.pool.forEach((token) => {
        const tokenBtn = document.createElement("button");
        tokenBtn.type = "button";
        tokenBtn.className = "practice-drag__token";
        tokenBtn.draggable = true;
        tokenBtn.dataset.tokenId = token.id;
        tokenBtn.dataset.zone = "pool";
        tokenBtn.dataset.stepId = String(state.stepId);
        tokenBtn.textContent = token.text;
        if (state.isSubmitting || isPracticeStepCompleted(state.stepId)) {
            tokenBtn.disabled = true;
        }
        poolTokensWrap.appendChild(tokenBtn);
    });
    poolZone.appendChild(poolTokensWrap);
    workspace.appendChild(poolZone);

    const actions = document.createElement("div");
    actions.className = "practice-drag__actions";

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn btn-test-check";
    checkBtn.textContent = "Проверить";
    checkBtn.disabled = state.isSubmitting || isPracticeStepCompleted(state.stepId);
    checkBtn.addEventListener("click", () => {
        void (async () => {
            const isCorrect = await submitPracticeDragStep(lesson, segment);
            if (isCorrect) {
                await syncCurrentSlideProgress(lesson, currentSectionIndex, currentLessonSections.length);
            }
        })();
    });
    actions.appendChild(checkBtn);

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn-nav";
    resetBtn.textContent = "Сбросить";
    resetBtn.disabled = state.isSubmitting || isPracticeStepCompleted(state.stepId);
    resetBtn.addEventListener("click", () => {
        const tokens = [
            ...state.pool.map((token) => token.text),
            ...state.answer.map((token) => token.text)
        ];
        const shuffled = [...tokens].sort(() => Math.random() - 0.5);
        state.pool = createPracticeTokenObjects(state.stepId, shuffled);
        state.answer = [];
        state.statusMessage = "";
        state.statusType = "";
        renderActiveLesson();
    });
    actions.appendChild(resetBtn);
    workspace.appendChild(actions);

    const status = document.createElement("p");
    status.className = "practice-drag__status";
    if (state.statusType === "success") {
        status.classList.add("practice-drag__status--success");
    }
    if (state.statusType === "error") {
        status.classList.add("practice-drag__status--error");
    }
    if (isPracticeStepCompleted(state.stepId) && !state.statusMessage) {
        status.textContent = "Практика выполнена.";
        status.classList.add("practice-drag__status--success");
    } else {
        status.textContent = state.statusMessage || "";
    }
    workspace.appendChild(status);

    const assembled = document.createElement("pre");
    assembled.className = "practice-drag__result";
    assembled.textContent = state.answer.map((token) => token.text).join("");
    workspace.appendChild(assembled);

    block.appendChild(workspace);
    lessonContentEl.appendChild(block);
}

function normalizeQuizOptions(rawOptions) {
    if (!Array.isArray(rawOptions)) {
        return [];
    }
    return rawOptions
        .map((item, index) => {
            if (item && typeof item === "object") {
                const value = String(item.value ?? item.id ?? index).trim();
                const text = String(item.text ?? item.label ?? value).trim();
                if (!value || !text) {
                    return null;
                }
                return { value, text };
            }
            const text = String(item || "").trim();
            if (!text) {
                return null;
            }
            return { value: text, text };
        })
        .filter(Boolean);
}

function ensureQuizState(segment) {
    const stepId = Number(segment?.stepId);
    if (!Number.isFinite(stepId)) {
        return null;
    }
    const options = normalizeQuizOptions(segment?.config?.options);
    if (!options.length) {
        return null;
    }
    if (!quizStateByStepId.has(stepId)) {
        quizStateByStepId.set(stepId, {
            selectedValue: "",
            statusMessage: "",
            statusType: "",
            isSubmitting: false
        });
    }
    return quizStateByStepId.get(stepId);
}

async function submitQuizStep(lesson, segment) {
    const stepId = Number(segment?.stepId);
    const state = ensureQuizState(segment);
    if (!Number.isFinite(stepId) || !state || state.isSubmitting) {
        return false;
    }
    if (!state.selectedValue) {
        state.statusMessage = "Выбери вариант ответа.";
        state.statusType = "error";
        renderActiveLesson();
        return false;
    }

    state.isSubmitting = true;
    renderActiveLesson();

    try {
        const payload = await submitLessonStepAttempt(stepId, { answer: state.selectedValue });
        setStepProgress(stepId, payload?.progress || null);
        if (payload?.is_correct) {
            state.statusMessage = payload?.message || "Верный ответ.";
            state.statusType = "success";
        } else {
            state.statusMessage = payload?.message || "Ответ неверный.";
            state.statusType = "error";
        }
        applyUserXpFromPayload(payload?.user);
        applyNewAchievements(payload?.new_achievements);
        renderModulesForActiveLanguage();
        return Boolean(payload?.is_correct);
    } catch (error) {
        state.statusMessage = error?.message || "Ошибка проверки.";
        state.statusType = "error";
        return false;
    } finally {
        state.isSubmitting = false;
        renderActiveLesson();
    }
}

function renderQuizSegment(lesson, segment) {
    const state = ensureQuizState(segment);
    lessonContentEl.innerHTML = "";

    const block = document.createElement("section");
    block.className = "lesson-section lesson-section--quiz";

    const title = document.createElement("h5");
    title.className = "lesson-section__title";
    title.textContent = segment?.title || "Тест";
    block.appendChild(title);

    const question = String(segment?.config?.question || segment?.text || "").trim();
    const body = document.createElement("div");
    body.className = "lesson-section__body";
    body.innerHTML = question
        ? renderMarkdownToHtml(question)
        : "<p class=\"md-paragraph\">Выбери правильный вариант.</p>";
    block.appendChild(body);

    const options = normalizeQuizOptions(segment?.config?.options);
    const optionsWrap = document.createElement("div");
    optionsWrap.className = "quiz-options";

    options.forEach((option) => {
        const optionBtn = document.createElement("button");
        optionBtn.type = "button";
        optionBtn.className = "quiz-option";
        optionBtn.textContent = option.text;
        optionBtn.dataset.value = option.value;

        if (state?.selectedValue === option.value) {
            optionBtn.classList.add("is-selected");
        }
        if (state?.isSubmitting || isPracticeStepCompleted(segment.stepId)) {
            optionBtn.disabled = true;
        }

        optionBtn.addEventListener("click", () => {
            state.selectedValue = option.value;
            state.statusMessage = "";
            state.statusType = "";
            renderActiveLesson();
        });
        optionsWrap.appendChild(optionBtn);
    });

    block.appendChild(optionsWrap);

    const actions = document.createElement("div");
    actions.className = "quiz-actions";

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn btn-test-check";
    checkBtn.textContent = "Проверить";
    checkBtn.disabled = !state || state.isSubmitting || isPracticeStepCompleted(segment.stepId);
    checkBtn.addEventListener("click", () => {
        void (async () => {
            const isCorrect = await submitQuizStep(lesson, segment);
            if (isCorrect) {
                await syncCurrentSlideProgress(lesson, currentSectionIndex, currentLessonSections.length);
            }
        })();
    });
    actions.appendChild(checkBtn);
    block.appendChild(actions);

    const status = document.createElement("p");
    status.className = "quiz-status";
    if (state?.statusType === "success") {
        status.classList.add("quiz-status--success");
    } else if (state?.statusType === "error") {
        status.classList.add("quiz-status--error");
    }
    if (isPracticeStepCompleted(segment.stepId) && !(state?.statusMessage)) {
        status.textContent = "Тестовый вопрос выполнен.";
        status.classList.add("quiz-status--success");
    } else {
        status.textContent = state?.statusMessage || "";
    }
    block.appendChild(status);

    lessonContentEl.appendChild(block);
}

function ensureCodePracticeState(segment) {
    const stepId = Number(segment?.stepId);
    if (!Number.isFinite(stepId)) {
        return null;
    }
    const starterCode = String(segment?.config?.starter_code || "").trim();
    const templateCode = String(segment?.config?.template || "").trim();
    const expectedCode = String(segment?.config?.expected_code || "").trim();
    const defaultCandidates = [starterCode, templateCode, expectedCode].filter(Boolean);

    // Для итоговой практики поле должно быть пустым: ученик пишет код сам.
    const initialCode = "";
    if (!codePracticeStateByStepId.has(stepId)) {
        codePracticeStateByStepId.set(stepId, {
            code: initialCode,
            runOutput: "",
            statusMessage: "",
            statusType: "",
            isSubmitting: false,
            isRunning: false,
            userEdited: false
        });
    }
    const state = codePracticeStateByStepId.get(stepId);

    // Чистим старый автопрефилл (если он остался из предыдущих версий),
    // пока ученик сам не начал вводить код.
    if (!state.userEdited && !isPracticeStepCompleted(stepId)) {
        const normalizedStateCode = String(state.code || "").trim();
        if (normalizedStateCode && defaultCandidates.includes(normalizedStateCode)) {
            state.code = "";
        }
    }

    return state;
}

function ensurePyodideRuntime() {
    if (pyodideInstancePromise) {
        return pyodideInstancePromise;
    }
    pyodideInstancePromise = (async () => {
        if (typeof window.loadPyodide !== "function") {
            await new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
                script.async = true;
                script.onload = resolve;
                script.onerror = () => reject(new Error("Не удалось загрузить Pyodide."));
                document.head.appendChild(script);
            });
        }
        const pyodide = await window.loadPyodide({ indexURL: PYODIDE_INDEX_URL });
        return pyodide;
    })();
    return pyodideInstancePromise.catch((error) => {
        pyodideInstancePromise = null;
        throw error;
    });
}

async function runCodeInPyodide(codeText) {
    const pyodide = await ensurePyodideRuntime();
    const runnerCode = `
import io
import contextlib
import traceback

_user_code = ${JSON.stringify(String(codeText || ""))}
_buffer = io.StringIO()
try:
    with contextlib.redirect_stdout(_buffer):
        with contextlib.redirect_stderr(_buffer):
            exec(_user_code, {})
except Exception:
    traceback.print_exc(file=_buffer)
_js_result = _buffer.getvalue()
`;
    await pyodide.runPythonAsync(runnerCode);
    const outputObj = pyodide.globals.get("_js_result");
    const output = String(outputObj || "");
    if (outputObj && typeof outputObj.destroy === "function") {
        outputObj.destroy();
    }
    return output;
}

async function submitCodePracticeStep(lesson, segment) {
    const stepId = Number(segment?.stepId);
    const state = ensureCodePracticeState(segment);
    if (!Number.isFinite(stepId) || !state || state.isSubmitting) {
        return false;
    }

    const answer = String(state.code || "").trim();
    if (!answer) {
        state.statusMessage = "Введи код перед проверкой.";
        state.statusType = "error";
        renderActiveLesson();
        return false;
    }

    state.isSubmitting = true;
    renderActiveLesson();

    try {
        const payload = await submitLessonStepAttempt(stepId, { answer });
        setStepProgress(stepId, payload?.progress || null);
        if (payload?.is_correct) {
            state.statusMessage = payload?.message || "Код принят.";
            state.statusType = "success";
        } else {
            state.statusMessage = payload?.message || "Код пока не прошел проверку.";
            state.statusType = "error";
        }
        applyUserXpFromPayload(payload?.user);
        applyNewAchievements(payload?.new_achievements);
        renderModulesForActiveLanguage();
        return Boolean(payload?.is_correct);
    } catch (error) {
        state.statusMessage = error?.message || "Ошибка проверки кода.";
        state.statusType = "error";
        return false;
    } finally {
        state.isSubmitting = false;
        renderActiveLesson();
    }
}

function renderCodePracticeSegment(lesson, segment) {
    const state = ensureCodePracticeState(segment);
    lessonContentEl.innerHTML = "";

    const block = document.createElement("section");
    block.className = "lesson-section lesson-section--code";

    const title = document.createElement("h5");
    title.className = "lesson-section__title";
    title.textContent = segment?.title || "Практика кода";
    block.appendChild(title);

    const body = document.createElement("div");
    body.className = "lesson-section__body";
    body.innerHTML = segment?.text
        ? renderMarkdownToHtml(segment.text)
        : "<p class=\"md-paragraph\">Напиши код и проверь его.</p>";
    block.appendChild(body);

    const editor = document.createElement("textarea");
    editor.className = "code-practice-editor";
    editor.spellcheck = false;
    editor.value = state?.code || "";
    editor.placeholder = "Напиши Python-код...";
    editor.disabled = !state || state.isSubmitting || state.isRunning || isPracticeStepCompleted(segment.stepId);
    editor.addEventListener("input", () => {
        state.code = editor.value;
        state.userEdited = true;
    });
    block.appendChild(editor);

    const actions = document.createElement("div");
    actions.className = "code-practice-actions";

    const runBtn = document.createElement("button");
    runBtn.type = "button";
    runBtn.className = "btn btn-test-run";
    runBtn.textContent = state?.isRunning ? "Запуск..." : "Запустить код";
    runBtn.disabled = !state || state.isRunning || state.isSubmitting;
    runBtn.addEventListener("click", () => {
        void (async () => {
            state.isRunning = true;
            state.runOutput = "Запуск кода...";
            renderActiveLesson();
            try {
                const output = await runCodeInPyodide(state.code);
                state.runOutput = output || "(без вывода)";
            } catch (error) {
                state.runOutput = error?.message || "Ошибка запуска Python.";
            } finally {
                state.isRunning = false;
                renderActiveLesson();
            }
        })();
    });
    actions.appendChild(runBtn);

    const checkBtn = document.createElement("button");
    checkBtn.type = "button";
    checkBtn.className = "btn btn-test-check";
    checkBtn.textContent = "Проверить";
    checkBtn.disabled = !state || state.isSubmitting || isPracticeStepCompleted(segment.stepId);
    checkBtn.addEventListener("click", () => {
        void (async () => {
            const isCorrect = await submitCodePracticeStep(lesson, segment);
            if (isCorrect) {
                await syncCurrentSlideProgress(lesson, currentSectionIndex, currentLessonSections.length);
            }
        })();
    });
    actions.appendChild(checkBtn);
    block.appendChild(actions);

    const outputLabel = document.createElement("p");
    outputLabel.className = "code-practice-output-label";
    outputLabel.textContent = "Вывод интерпретатора (Pyodide):";
    block.appendChild(outputLabel);

    const output = document.createElement("pre");
    output.className = "code-practice-output";
    output.textContent = state?.runOutput || "(пока пусто)";
    block.appendChild(output);

    const status = document.createElement("p");
    status.className = "code-practice-status";
    if (state?.statusType === "success") {
        status.classList.add("code-practice-status--success");
    } else if (state?.statusType === "error") {
        status.classList.add("code-practice-status--error");
    }
    if (isPracticeStepCompleted(segment.stepId) && !(state?.statusMessage)) {
        status.textContent = "Практика кода выполнена.";
        status.classList.add("code-practice-status--success");
    } else {
        status.textContent = state?.statusMessage || "";
    }
    block.appendChild(status);

    lessonContentEl.appendChild(block);
}

function renderLessonProgressOverview() {
    if (!lessonProgressTrackEl || !lessonProgressTextEl) {
        return;
    }

    lessonProgressTrackEl.innerHTML = "";

    const currentLesson = currentLessons[currentLessonIndex];
    if (!currentLesson || !currentLessonSections.length) {
        lessonProgressTextEl.textContent = "Слайды: 0/0";
        return;
    }

    let completedCount = 0;
    currentLessonSections.forEach((segment, index) => {
        if (isLessonSegmentCompleted(currentLesson.id, segment, index)) {
            completedCount += 1;
        }
    });
    lessonProgressTextEl.textContent = lessonProgressStatusMessage
        ? `Слайды: ${completedCount}/${currentLessonSections.length} • ${lessonProgressStatusMessage}`
        : `Слайды: ${completedCount}/${currentLessonSections.length}`;

    currentLessonSections.forEach((segment, index) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "lesson-progress-chip";
        chip.dataset.slideIndex = String(index);
        const kind = String(segment?.kind || "");
        const isPracticeChip = kind === "practice_drag";
        const isQuizChip = kind === "quiz";
        const isCodeChip = kind === "practice_code";
        const labelPrefix = isPracticeChip
            ? "Практика"
            : (isQuizChip ? "Тест" : (isCodeChip ? "Код" : "Слайд"));
        chip.setAttribute("aria-label", `${labelPrefix} ${index + 1}`);
        chip.title = `${labelPrefix} ${index + 1}`;
        if (isPracticeChip) {
            chip.classList.add("is-practice");
            chip.dataset.symbol = ">_.";
        } else if (isQuizChip) {
            chip.classList.add("is-quiz");
            chip.dataset.symbol = "?";
        } else if (isCodeChip) {
            chip.classList.add("is-code");
            chip.dataset.symbol = "Py";
        }

        if (isLessonSegmentCompleted(currentLesson.id, segment, index)) {
            chip.classList.add("is-completed");
        }
        if (index === currentSectionIndex) {
            chip.classList.add("is-active");
        }

        chip.addEventListener("click", () => {
            currentSectionIndex = index;
            renderActiveLesson();
        });

        lessonProgressTrackEl.appendChild(chip);
    });
}

function applyUserXpFromPayload(userPayload) {
    if (!userPayload) {
        return;
    }
    if (typeof userPayload.level === "number") {
        levelEl.textContent = String(userPayload.level);
    }
    if (typeof userPayload.xp === "number") {
        experienceEl.textContent = String(userPayload.xp);
    }
    const username = usernameEl.textContent || "-";
    const level = levelEl.textContent || "-";
    const avatarRawUrl = currentProfile?.avatar_url || currentProfile?.avatar || "";
    setHeaderProfileChip(username, level, avatarRawUrl);
}

async function completeLesson(lessonId, options = {}) {
    const bodyPayload = {};
    if (Number.isInteger(options?.slideIndex)) {
        bodyPayload.slide_index = options.slideIndex;
    }
    if (Number.isInteger(options?.totalSlides)) {
        bodyPayload.total_slides = options.totalSlides;
    }

    const response = await authFetch(`/auth/courses/lessons/${lessonId}/complete/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(bodyPayload)
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = payload?.error || payload?.detail || "Не удалось сохранить прогресс";
        throw new Error(detail);
    }

    if (payload?.progress?.completed) {
        completedLessonIds.add(lessonId);
        const moduleId = Number(payload?.module?.id);
        if (Number.isFinite(moduleId)) {
            if (!completedLessonIdsByModule.has(moduleId)) {
                completedLessonIdsByModule.set(moduleId, new Set());
            }
            completedLessonIdsByModule.get(moduleId).add(lessonId);
        }
    }
    const viewedIndexes = Array.isArray(payload?.progress?.viewed_slide_indexes)
        ? payload.progress.viewed_slide_indexes
        : [];
    if (viewedIndexes.length) {
        const set = getViewedSlidesSet(lessonId);
        viewedIndexes.forEach((indexRaw) => {
            const index = Number(indexRaw);
            if (Number.isInteger(index) && index >= 0) {
                set.add(index);
            }
        });
        persistViewedSlidesToStorage();
    }
    if (payload?.module?.reward_granted && typeof payload?.module?.id === "number") {
        rewardedModuleIds.add(payload.module.id);
    }
    if (typeof payload?.module?.total_lessons === "number" && typeof payload?.module?.id === "number") {
        moduleLessonTotals.set(payload.module.id, payload.module.total_lessons);
    }
    applyUserXpFromPayload(payload?.user);
    applyNewAchievements(payload?.new_achievements);
    renderModulesForActiveLanguage();
    return payload;
}

async function syncCurrentSlideProgress(lesson, slideIndex, totalSlides) {
    if (isParentMode) {
        return;
    }
    const lessonId = Number(lesson?.id);
    if (!Number.isFinite(lessonId) || !Number.isInteger(slideIndex) || !Number.isInteger(totalSlides)) {
        return;
    }

    const syncKey = `${lessonId}:${slideIndex}`;
    if (slideSyncInFlight.has(syncKey)) {
        return;
    }
    slideSyncInFlight.add(syncKey);

    try {
        await completeLesson(lessonId, { slideIndex, totalSlides });
        setLessonProgressStatus("");
        renderLessonProgressOverview();
    } catch (error) {
        setLessonProgressStatus("ошибка сохранения прогресса");
        console.error("Не удалось сохранить слайд:", error);
        renderLessonProgressOverview();
    } finally {
        slideSyncInFlight.delete(syncKey);
    }
}

async function saveLessonProgressFallback(lesson) {
    const lessonId = Number(lesson?.id);
    const moduleId = Number(lesson?.module?.id ?? lesson?.module_id ?? activeModuleId);
    if (!Number.isFinite(lessonId) || !Number.isFinite(moduleId)) {
        throw new Error("Недостаточно данных для сохранения прогресса.");
    }

    const response = await authFetch("/auth/courses/progress/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            module: moduleId,
            lesson_id: lessonId,
            completed: true
        })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const detail = payload?.error || payload?.detail || "Не удалось сохранить прогресс";
        throw new Error(detail);
    }

    completedLessonIds.add(lessonId);
    if (!completedLessonIdsByModule.has(moduleId)) {
        completedLessonIdsByModule.set(moduleId, new Set());
    }
    completedLessonIdsByModule.get(moduleId).add(lessonId);
    if (!moduleLessonTotals.has(moduleId)) {
        moduleLessonTotals.set(moduleId, Math.max(getCompletedLessonsForModule(moduleId), 1));
    }
    renderModulesForActiveLanguage();
}

async function completeCurrentLessonIfNeeded() {
    if (isParentMode) {
        return true;
    }

    const currentLesson = currentLessons[currentLessonIndex];
    if (!currentLesson || completedLessonIds.has(currentLesson.id)) {
        return true;
    }
    if (currentSectionIndex < currentLessonSections.length - 1) {
        return true;
    }
    if (lessonCompletionInFlight.has(currentLesson.id)) {
        return true;
    }

    lessonCompletionInFlight.add(currentLesson.id);
    try {
        await completeLesson(currentLesson.id, {
            slideIndex: currentSectionIndex,
            totalSlides: currentLessonSections.length
        });
        setLessonProgressStatus("");
        return true;
    } catch (error) {
        try {
            await saveLessonProgressFallback(currentLesson);
            setLessonProgressStatus("");
            return true;
        } catch (fallbackError) {
            setLessonProgressStatus("ошибка сохранения прогресса");
            console.error("Не удалось сохранить прогресс урока:", error, fallbackError);
            renderLessonProgressOverview();
            return false;
        }
    } finally {
        lessonCompletionInFlight.delete(currentLesson.id);
    }
}

function renderLessonList() {
    lessonListEl.innerHTML = "";

    if (!currentLessons.length) {
        const empty = document.createElement("p");
        empty.className = "student-note";
        empty.textContent = "В этом модуле пока нет уроков.";
        lessonListEl.appendChild(empty);
        return;
    }

    currentLessons.forEach((lesson, index) => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "lesson-list-item";
        const isLocked = isLessonLockedByPrerequisites(lesson, index);
        if (index === currentLessonIndex) {
            item.classList.add("is-active");
        }
        if (completedLessonIds.has(lesson.id)) {
            item.classList.add("is-completed");
        }
        if (isLocked) {
            item.classList.add("is-locked");
            item.disabled = true;
        }
        item.dataset.lessonIndex = String(index);
        const title = escapeHtml(lesson.title || "Без названия");
        const marker = completedLessonIds.has(lesson.id)
            ? '<span class="lesson-list-item__done">✓</span>'
            : (isLocked ? '<span class="lesson-list-item__lock">🔒</span>' : "");
        item.innerHTML = `${title}${marker}`;
        lessonListEl.appendChild(item);
    });
}

function renderActiveLesson() {
    if (!currentLessons.length) {
        lessonCounterEl.textContent = "Урок 0 из 0";
        lessonTitleEl.textContent = "В этом модуле пока нет уроков";
        lessonContentEl.textContent = "Добавьте уроки в базу данных и обновите страницу.";
        lessonPrevBtn.disabled = true;
        lessonNextBtn.disabled = true;
        lessonNextBtn.textContent = "Далее";
        currentLessonSections = [];
        currentSectionIndex = 0;
        renderLessonList();
        renderLessonProgressOverview();
        return;
    }

    const lesson = currentLessons[currentLessonIndex];
    const lessonLocked = isLessonLockedByPrerequisites(lesson, currentLessonIndex);
    if (lessonLocked) {
        lessonCounterEl.textContent = `Урок ${currentLessonIndex + 1} из ${currentLessons.length}`;
        lessonTitleEl.textContent = lesson.title || "Урок заблокирован";
        lessonContentEl.innerHTML = "<p class=\"student-note\">Сначала пройди первые 2 урока, чтобы открыть итоговый тест.</p>";
        lessonPrevBtn.disabled = currentLessonIndex === 0;
        lessonNextBtn.disabled = true;
        lessonNextBtn.textContent = "Далее";
        currentLessonSections = [];
        renderLessonList();
        renderLessonProgressOverview();
        return;
    }

    currentLessonSections = parseLessonSectionsFromLesson(lesson);
    if (!currentLessonSections.length) {
        currentLessonSections = [{ kind: "theory", title: "Описание", text: "Текст урока пока не добавлен." }];
    }
    if (currentSectionIndex >= currentLessonSections.length) {
        currentSectionIndex = currentLessonSections.length - 1;
    }
    if (currentSectionIndex < 0) {
        currentSectionIndex = 0;
    }

    if (needsFinalTestIntro(lesson)) {
        lessonTitleEl.textContent = lesson.title || "Итоговый тест";
        lessonCounterEl.textContent = `Урок ${currentLessonIndex + 1} из ${currentLessons.length} | Важный тест`;
        renderFinalTestIntro(lesson);
        return;
    }

    const currentSegment = currentLessonSections[currentSectionIndex];
    const isInteractive = isInteractiveSegment(currentSegment);
    const viewedSlidesSet = getViewedSlidesSet(lesson.id);
    const wasViewedBefore = isLessonSegmentCompleted(lesson.id, currentSegment, currentSectionIndex);
    if (completedLessonIds.has(lesson.id)) {
        for (let i = 0; i < currentLessonSections.length; i += 1) {
            viewedSlidesSet.add(i);
        }
    }
    if (!isInteractive) {
        viewedSlidesSet.add(currentSectionIndex);
        persistViewedSlidesToStorage();
    }

    lessonTitleEl.textContent = lesson.title || "Без названия";
    lessonCounterEl.textContent = `Урок ${currentLessonIndex + 1} из ${currentLessons.length} | Слайд ${currentSectionIndex + 1} из ${currentLessonSections.length}`;
    if (currentSegment?.kind === "practice_drag") {
        renderPracticeDragSegment(lesson, currentSegment);
    } else if (currentSegment?.kind === "quiz") {
        renderQuizSegment(lesson, currentSegment);
    } else if (currentSegment?.kind === "practice_code") {
        renderCodePracticeSegment(lesson, currentSegment);
    } else {
        renderLessonContent([currentSegment], lesson.video_url);
    }

    const isFirstSlide = currentLessonIndex === 0 && currentSectionIndex === 0;
    const isLastSlide =
        currentLessonIndex === currentLessons.length - 1 &&
        currentSectionIndex === currentLessonSections.length - 1;
    const interactiveCompleted = isInteractive && isLessonSegmentCompleted(lesson.id, currentSegment, currentSectionIndex);
    lessonPrevBtn.disabled = isFirstSlide;
    lessonNextBtn.disabled = false;
    if (isInteractive && !interactiveCompleted) {
        lessonNextBtn.textContent = isLastSlide ? "Проверить" : "Проверить и далее";
    } else {
        lessonNextBtn.textContent = isLastSlide ? "Завершить" : "Далее";
    }
    renderLessonList();
    renderLessonProgressOverview();

    if (!isInteractive && !wasViewedBefore && !completedLessonIds.has(lesson.id)) {
        void syncCurrentSlideProgress(lesson, currentSectionIndex, currentLessonSections.length);
    }
}

function renderModules(modules) {
    modulesListEl.innerHTML = "";

    if (!modules.length) {
        modulesEmptyEl.hidden = false;
        lessonViewerEl.hidden = true;
        return;
    }

    modulesEmptyEl.hidden = true;

    const sortedModules = modules
        .slice()
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    sortedModules.forEach((module) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "student-module-card student-module-card--button";
            const moduleLocked = isModuleLocked(module, sortedModules);
            if (module.id === activeModuleId) {
                card.classList.add("is-active-module");
            }
            card.dataset.moduleId = String(module.id);
            card.dataset.moduleName = module.name || "Модуль";
            if (moduleLocked) {
                card.classList.add("is-module-locked");
                card.disabled = true;
            }

            const description = module.description
                ? escapeHtml(module.description)
                : "Описание модуля пока не добавлено.";
            const moduleOrder = module.order ?? "-";
            const progressStats = getModuleProgressStats(module.id);
            const moduleProgressText = `${progressStats.completed}/${progressStats.total}`;
            const moduleProgressPercentText = `${progressStats.percent}%`;
            const isCompleted = progressStats.total > 0 && progressStats.completed >= progressStats.total;
            if (isCompleted) {
                card.classList.add("is-module-complete");
            }
            const previousOrder = Math.max(1, Number(moduleOrder || 0) - 1);
            const lockBadgeHtml = moduleLocked
                ? `<div class="student-module-lock">Сначала заверши модуль ${previousOrder}</div>`
                : "";

            card.innerHTML = `
                <div class="student-module-order">#${moduleOrder}</div>
                <h3 class="student-module-title">${escapeHtml(module.name || "Без названия")}</h3>
                <p class="student-module-description">${description}</p>
                ${lockBadgeHtml}
                <div class="student-module-progress">
                    <div class="student-module-progress__meta">
                        <span>Прогресс уроков</span>
                        <span>${moduleProgressText} (${moduleProgressPercentText})</span>
                    </div>
                    <div class="student-module-progress__bar">
                        <span style="width: ${progressStats.percent}%"></span>
                    </div>
                </div>
            `;

            modulesListEl.appendChild(card);
        });
}

async function selectModule(moduleId, moduleName) {
    const normalizedModuleId = Number(moduleId);
    const sortedModules = getSortedModulesForLanguage();
    const selectedModule = sortedModules.find((module) => Number(module?.id) === normalizedModuleId);
    if (selectedModule && isModuleLocked(selectedModule, sortedModules)) {
        setLessonProgressStatus("Сначала заверши предыдущий модуль.");
        renderModulesForActiveLanguage();
        return;
    }

    const requestSeq = ++lessonRequestSeq;
    activeModuleId = normalizedModuleId;
    activeModuleName = moduleName || selectedModule?.name || "Модуль";
    setLessonProgressStatus("");

    lessonViewerEl.hidden = false;
    lessonModuleNameEl.textContent = activeModuleName;
    lessonCounterEl.textContent = "Загрузка...";
    lessonTitleEl.textContent = "Загружаем уроки";
    lessonContentEl.textContent = "Подождите, загружаем материалы модуля...";
    lessonPrevBtn.disabled = true;
    lessonNextBtn.disabled = true;
    lessonNextBtn.textContent = "Далее";

    renderModulesForActiveLanguage();

    try {
        if (!lessonsByModule.has(normalizedModuleId)) {
            const lessons = await fetchLessons(normalizedModuleId);
            lessonsByModule.set(normalizedModuleId, Array.isArray(lessons) ? lessons : []);
        }

        if (requestSeq !== lessonRequestSeq || activeModuleId !== normalizedModuleId) {
            return;
        }

        currentLessons = [...(lessonsByModule.get(normalizedModuleId) || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        syncStepProgressFromLessons(currentLessons);
        moduleLessonTotals.set(normalizedModuleId, currentLessons.length);
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        renderModulesForActiveLanguage();
        renderActiveLesson();
    } catch (error) {
        if (requestSeq !== lessonRequestSeq || activeModuleId !== normalizedModuleId) {
            return;
        }

        currentLessons = [];
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        setLessonProgressStatus("");
        lessonCounterEl.textContent = "Урок 0 из 0";
        lessonTitleEl.textContent = "Не удалось загрузить уроки";
        lessonContentEl.textContent = "Проверьте данные в БД и перезагрузите страницу.";
        lessonPrevBtn.disabled = true;
        lessonNextBtn.disabled = true;
        lessonNextBtn.textContent = "Далее";
        renderLessonList();
        renderLessonProgressOverview();
    }
}

function renderModulesForActiveLanguage() {
    const filteredModules = getSortedModulesForLanguage(activeLanguageKey);
    renderModules(filteredModules);
    void warmupModuleLessonTotals(filteredModules);

    if (!activeModuleId) {
        lessonViewerEl.hidden = true;
        return;
    }

    const hasActiveModule = filteredModules.some((module) => module.id === activeModuleId);
    if (!hasActiveModule) {
        lessonRequestSeq += 1;
        activeModuleId = null;
        activeModuleName = "";
        currentLessons = [];
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        lessonViewerEl.hidden = true;
        return;
    }

    const activeModule = filteredModules.find((module) => module.id === activeModuleId);
    if (activeModule && isModuleLocked(activeModule, filteredModules)) {
        lessonRequestSeq += 1;
        activeModuleId = null;
        activeModuleName = "";
        currentLessons = [];
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        lessonViewerEl.hidden = true;
        setLessonProgressStatus("Сначала заверши предыдущий модуль.");
    }
}

async function initStudentDashboard() {
    try {
        const profile = await fetchProfile();

        if (profile.role !== "student" && profile.role !== "parent") {
            if (profile.role === "teacher" || profile.role === "admin") {
                window.location.replace("/teacher/");
                return;
            }
            window.location.replace("/");
            return;
        }
        applyRoleUi(profile.role);
        fillProfile(profile);

        try {
            const modules = await fetchModules();
            allModules = Array.isArray(modules) ? modules : [];
        } catch (modulesError) {
            allModules = [];
        }

        if (isParentMode) {
            await refreshParentMonitoringData();
        } else {
            try {
                const progressItems = await fetchUserProgress();
                syncProgressState(progressItems);
            } catch (progressError) {
                completedLessonIds.clear();
                completedLessonIdsByModule.clear();
                rewardedModuleIds.clear();
            }
            loadViewedSlidesFromStorage(profile.username);
            try {
                await syncLocalViewedSlidesToServer();
            } catch (syncError) {
                console.warn("Не удалось синхронизировать локальный прогресс:", syncError);
            }
            try {
                achievementsCache = await fetchAchievements();
            } catch (achievementsError) {
                achievementsCache = [];
            }
            renderAchievements(achievementsCache);
        }

        setLanguage(activeLanguageKey);
        setActiveTab("home");
    } catch (error) {
        clearAuthAndRedirect();
    }
}

initStudentDashboard();
