let accessToken = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh");
let refreshPromise = null;

const profileChipBtn = document.getElementById("parent-profile-chip");
const profileAvatarEl = document.getElementById("parent-profile-avatar");
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
const avatarPreviewWrapEl = document.getElementById("parent-avatar-preview");
const avatarPreviewImageEl = document.getElementById("parent-avatar-image");
const avatarPreviewPlaceholderEl = document.getElementById("parent-avatar-placeholder");
const avatarOpenEditorBtn = document.getElementById("parent-avatar-open-editor");
const avatarInputEl = document.getElementById("parent-avatar-input");
const avatarModalEl = document.getElementById("parent-avatar-modal");
const avatarModalCloseEls = document.querySelectorAll("[data-close-parent-avatar-modal]");
const avatarEditorCanvasEl = document.getElementById("parent-avatar-editor-canvas");
const avatarEditorZoomEl = document.getElementById("parent-avatar-editor-zoom");
const avatarEditorPickBtn = document.getElementById("parent-avatar-editor-pick");
const avatarEditorApplyBtn = document.getElementById("parent-avatar-editor-apply");
const avatarEditorStageEl = avatarModalEl?.querySelector(".avatar-editor-stage");

if (!accessToken) {
    window.location.replace("/");
}

let currentProfile = null;
let currentChild = null;
let currentProgress = [];
let currentModules = [];
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

function clearAuthAndRedirect() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh");
    accessToken = "";
    window.location.replace("/");
}

function normalizeAvatarUrl(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) {
        return "";
    }
    if (/^(https?:\/\/|blob:|data:)/i.test(value)) {
        return value;
    }
    if (value.startsWith("/")) {
        return `${window.location.origin}${value}`;
    }
    return `${window.location.origin}/${value.replace(/^\/+/, "")}`;
}

function withAvatarVersion(url) {
    const value = String(url || "");
    if (!value) {
        return "";
    }
    if (value.startsWith("blob:") || value.startsWith("data:")) {
        return value;
    }
    return `${value}${value.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

function revokeAvatarDraftPreviewUrl() {
    if (!avatarDraftPreviewUrl) {
        return;
    }
    URL.revokeObjectURL(avatarDraftPreviewUrl);
    avatarDraftPreviewUrl = "";
}

function setAvatarPreview(rawUrl) {
    const avatarUrl = normalizeAvatarUrl(rawUrl);
    if (avatarPreviewImageEl) {
        if (avatarUrl) {
            avatarPreviewImageEl.src = withAvatarVersion(avatarUrl);
            avatarPreviewImageEl.hidden = false;
        } else {
            avatarPreviewImageEl.hidden = true;
            avatarPreviewImageEl.removeAttribute("src");
        }
    }
    if (avatarPreviewPlaceholderEl) {
        avatarPreviewPlaceholderEl.hidden = Boolean(avatarUrl);
    }
}

function resetAvatarDraft(profile) {
    avatarDraftBlob = null;
    avatarDraftDirty = false;
    revokeAvatarDraftPreviewUrl();
    resetAvatarEditorState();
    const rawUrl = profile?.avatar_url || profile?.avatar || "";
    setAvatarPreview(rawUrl);
    if (avatarInputEl) {
        avatarInputEl.value = "";
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

    ctx.drawImage(avatarEditorImage, drawX, drawY, drawWidth, drawHeight);
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
                // Ничего не делаем, если releasePointerCapture недоступен.
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
    const previewSrc = String(avatarPreviewImageEl?.src || "").trim();
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
    closeAvatarModal();
    profileModalEl.hidden = true;
    document.body.classList.remove("modal-open");
    resetAvatarDraft(currentProfile || {});
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
    const avatarUrl = normalizeAvatarUrl(profile?.avatar_url || profile?.avatar || "");
    if (profileLabelEl) {
        profileLabelEl.textContent = `${username} | Lv.${level}`;
    }
    if (profileFallbackEl) {
        profileFallbackEl.textContent = username ? username[0].toUpperCase() : "?";
        profileFallbackEl.hidden = Boolean(avatarUrl);
    }
    if (profileAvatarEl) {
        if (avatarUrl) {
            profileAvatarEl.src = withAvatarVersion(avatarUrl);
            profileAvatarEl.hidden = false;
        } else {
            profileAvatarEl.hidden = true;
            profileAvatarEl.removeAttribute("src");
        }
    }
}

function fillProfileForm(profile) {
    formUsernameEl.value = profile?.username || "";
    formFirstNameEl.value = profile?.first_name || "";
    formLastNameEl.value = profile?.last_name || "";
    formEmailEl.value = profile?.email || "";
    formChildUsernameEl.value = profile?.child_username || "";
    formRoleEl.value = profile?.role || "";
    setAvatarPreview(profile?.avatar_url || profile?.avatar || "");
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
    const payload = new FormData();
    payload.append("first_name", formFirstNameEl.value.trim());
    payload.append("last_name", formLastNameEl.value.trim());
    payload.append("email", formEmailEl.value.trim());
    payload.append("child_username", formChildUsernameEl.value.trim());
    if (avatarDraftDirty && avatarDraftBlob) {
        payload.append("avatar", avatarDraftBlob, "avatar.jpg");
    }
    const response = await authFetch("/auth/profile/", {
        method: "PATCH",
        body: payload
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
            if (currentProfile.role === "teacher" || currentProfile.role === "admin") {
                window.location.replace("/teacher/");
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
    resetAvatarDraft(currentProfile || {});
    openProfileModal();
});

logoutBtn?.addEventListener("click", () => {
    clearAuthAndRedirect();
});

profileModalCloseEls.forEach((button) => {
    button.addEventListener("click", closeProfileModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && avatarModalEl && !avatarModalEl.hidden) {
        closeAvatarModal();
        return;
    }
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
        resetAvatarDraft(updated);
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

avatarModalCloseEls.forEach((element) => {
    element.addEventListener("click", closeAvatarModal);
});

function triggerAvatarPicker() {
    if (!avatarInputEl) {
        return;
    }
    avatarInputEl.value = "";
    avatarInputEl.click();
}

avatarPreviewWrapEl?.addEventListener("click", () => {
    triggerAvatarPicker();
});

avatarPreviewWrapEl?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }
    event.preventDefault();
    triggerAvatarPicker();
});

avatarOpenEditorBtn?.addEventListener("click", () => {
    if (!avatarEditorImage && !avatarPreviewImageEl?.src) {
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

avatarInputEl?.addEventListener("change", async () => {
    const file = avatarInputEl.files?.[0];
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
    setAvatarPreview(avatarDraftPreviewUrl);
    closeAvatarModal();
    setProfileMessage("Аватар обновлён. Нажмите «Сохранить».", "success");
});

initParentDashboard();
