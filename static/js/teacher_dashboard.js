let accessToken = localStorage.getItem("token");
const refreshToken = localStorage.getItem("refresh");
let refreshPromise = null;

const tabHomeBtn = document.getElementById("teacher-tab-home");
const tabTasksBtn = document.getElementById("teacher-tab-tasks");
const homePanelEl = document.getElementById("teacher-home-panel");
const tasksPanelEl = document.getElementById("teacher-tasks-panel");

const statModulesEl = document.getElementById("teacher-stat-modules");
const statLessonsEl = document.getElementById("teacher-stat-lessons");
const statStepsEl = document.getElementById("teacher-stat-steps");
const taskMessageEl = document.getElementById("teacher-task-message");

const modulesListEl = document.getElementById("teacher-modules-list");
const lessonsListEl = document.getElementById("teacher-lessons-list");
const stepsListEl = document.getElementById("teacher-steps-list");

const moduleFormEl = document.getElementById("teacher-module-form");
const moduleNameEl = document.getElementById("teacher-module-name");
const moduleLanguageEl = document.getElementById("teacher-module-language");
const moduleOrderEl = document.getElementById("teacher-module-order");
const moduleDescriptionEl = document.getElementById("teacher-module-description");
const moduleSubmitEl = document.getElementById("teacher-module-submit");
const moduleCancelEl = document.getElementById("teacher-module-cancel");

const lessonFormEl = document.getElementById("teacher-lesson-form");
const lessonTitleEl = document.getElementById("teacher-lesson-title");
const lessonOrderEl = document.getElementById("teacher-lesson-order");
const lessonVideoEl = document.getElementById("teacher-lesson-video");
const lessonContentEl = document.getElementById("teacher-lesson-content");
const lessonSubmitEl = document.getElementById("teacher-lesson-submit");
const lessonCancelEl = document.getElementById("teacher-lesson-cancel");

const stepFormEl = document.getElementById("teacher-step-form");
const stepTypeEl = document.getElementById("teacher-step-type");
const stepOrderEl = document.getElementById("teacher-step-order");
const stepXpEl = document.getElementById("teacher-step-xp");
const stepRequiredEl = document.getElementById("teacher-step-required");
const stepTitleEl = document.getElementById("teacher-step-title");
const stepContentEl = document.getElementById("teacher-step-content");
const stepConfigEl = document.getElementById("teacher-step-config");
const stepSubmitEl = document.getElementById("teacher-step-submit");
const stepCancelEl = document.getElementById("teacher-step-cancel");

const profileChipBtn = document.getElementById("teacher-profile-chip");
const profileAvatarEl = document.getElementById("teacher-profile-avatar");
const profileFallbackEl = document.getElementById("teacher-profile-fallback");
const profileLabelEl = document.getElementById("teacher-profile-label");
const profileMenuEl = document.getElementById("teacher-profile-menu-list");
const openProfileBtn = document.getElementById("teacher-profile-open");
const logoutBtn = document.getElementById("teacher-logout-btn");

const profileModalEl = document.getElementById("teacher-profile-modal");
const profileModalCloseEls = document.querySelectorAll("[data-close-teacher-profile]");
const profileFormEl = document.getElementById("teacher-profile-form");
const profileMessageEl = document.getElementById("teacher-profile-message");
const formUsernameEl = document.getElementById("teacher-form-username");
const formFirstNameEl = document.getElementById("teacher-form-first-name");
const formLastNameEl = document.getElementById("teacher-form-last-name");
const formEmailEl = document.getElementById("teacher-form-email");
const formRoleEl = document.getElementById("teacher-form-role");
const avatarPreviewWrapEl = document.getElementById("teacher-avatar-preview");
const avatarPreviewImageEl = document.getElementById("teacher-avatar-image");
const avatarPreviewPlaceholderEl = document.getElementById("teacher-avatar-placeholder");
const avatarOpenEditorBtn = document.getElementById("teacher-avatar-open-editor");
const avatarInputEl = document.getElementById("teacher-avatar-input");
const avatarModalEl = document.getElementById("teacher-avatar-modal");
const avatarModalCloseEls = document.querySelectorAll("[data-close-teacher-avatar-modal]");
const avatarEditorCanvasEl = document.getElementById("teacher-avatar-editor-canvas");
const avatarEditorZoomEl = document.getElementById("teacher-avatar-editor-zoom");
const avatarEditorPickBtn = document.getElementById("teacher-avatar-editor-pick");
const avatarEditorApplyBtn = document.getElementById("teacher-avatar-editor-apply");
const avatarEditorStageEl = avatarModalEl?.querySelector(".avatar-editor-stage");

let currentProfile = null;
let curriculum = [];
let selectedModuleId = null;
let selectedLessonId = null;

let editingModuleId = null;
let editingLessonId = null;
let editingStepId = null;
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

if (!accessToken) {
    window.location.replace("/");
}

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

function roleHomePath(role) {
    if (role === "student") {
        return "/student/";
    }
    if (role === "parent") {
        return "/parent/";
    }
    return "/";
}

function safeInt(value, fallback = 0) {
    const parsed = Number.parseInt(String(value ?? ""), 10);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }
    return parsed;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function setTaskMessage(message, type = "") {
    if (!taskMessageEl) {
        return;
    }
    taskMessageEl.textContent = String(message || "");
    taskMessageEl.classList.remove("is-success", "is-error");
    if (type === "success") {
        taskMessageEl.classList.add("is-success");
    }
    if (type === "error") {
        taskMessageEl.classList.add("is-error");
    }
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

function setActiveTab(tabName) {
    const isTasks = tabName === "tasks";
    tabHomeBtn?.classList.toggle("is-active-tab", !isTasks);
    tabTasksBtn?.classList.toggle("is-active-tab", isTasks);
    if (homePanelEl) {
        homePanelEl.hidden = isTasks;
    }
    if (tasksPanelEl) {
        tasksPanelEl.hidden = !isTasks;
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
    } else {
        closeProfileMenu();
    }
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

function fillProfileForm(profile) {
    formUsernameEl.value = profile?.username || "";
    formFirstNameEl.value = profile?.first_name || "";
    formLastNameEl.value = profile?.last_name || "";
    formEmailEl.value = profile?.email || "";
    formRoleEl.value = profile?.role || "";
    setAvatarPreview(profile?.avatar_url || profile?.avatar || "");
}

function setProfileChip(profile) {
    const username = String(profile?.username || "-");
    const avatarUrl = normalizeAvatarUrl(profile?.avatar_url || profile?.avatar || "");
    if (profileLabelEl) {
        profileLabelEl.textContent = username;
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
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh: refreshToken }),
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

async function requestJson(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const isFormDataBody = typeof FormData !== "undefined" && options.body instanceof FormData;
    if (!isFormDataBody && !headers.has("Content-Type") && options.method && options.method !== "GET" && options.method !== "DELETE") {
        headers.set("Content-Type", "application/json");
    }

    const response = await authFetch(url, {
        ...options,
        headers,
    });

    let payload = {};
    if (response.status !== 204) {
        payload = await response.json().catch(() => ({}));
    }

    if (!response.ok) {
        const detail = payload?.detail;
        const message = payload?.message;
        if (typeof detail === "string" && detail.trim()) {
            throw new Error(detail.trim());
        }
        if (typeof message === "string" && message.trim()) {
            throw new Error(message.trim());
        }
        if (Array.isArray(detail) && detail.length) {
            throw new Error(String(detail[0]));
        }

        if (payload && typeof payload === "object") {
            const preferredKeys = [
                "non_field_errors",
                "module_id",
                "lesson_id",
                "order",
                "title",
                "content",
                "video_url",
                "config",
                "step_type"
            ];
            for (const key of preferredKeys) {
                const value = payload[key];
                if (Array.isArray(value) && value.length) {
                    throw new Error(`${key}: ${String(value[0])}`);
                }
                if (typeof value === "string" && value.trim()) {
                    throw new Error(`${key}: ${value.trim()}`);
                }
            }

            for (const [key, value] of Object.entries(payload)) {
                if (Array.isArray(value) && value.length) {
                    throw new Error(`${key}: ${String(value[0])}`);
                }
                if (typeof value === "string" && value.trim()) {
                    throw new Error(`${key}: ${value.trim()}`);
                }
            }
        }

        throw new Error(`Ошибка запроса (${response.status}).`);
    }

    return payload;
}

async function fetchProfile() {
    return requestJson("/auth/profile/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
}

async function saveProfile() {
    const payload = new FormData();
    payload.append("first_name", formFirstNameEl.value.trim());
    payload.append("last_name", formLastNameEl.value.trim());
    payload.append("email", formEmailEl.value.trim());
    if (avatarDraftDirty && avatarDraftBlob) {
        payload.append("avatar", avatarDraftBlob, "avatar.jpg");
    }
    return requestJson("/auth/profile/", {
        method: "PATCH",
        body: payload,
    });
}

async function loadCurriculum() {
    const data = await requestJson("/auth/courses/teacher/curriculum-tree/", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });
    curriculum = Array.isArray(data) ? data : [];
}

function getSelectedModule() {
    return curriculum.find((module) => Number(module.id) === Number(selectedModuleId)) || null;
}

function getSelectedLesson() {
    const module = getSelectedModule();
    if (!module || !Array.isArray(module.lessons)) {
        return null;
    }
    return module.lessons.find((lesson) => Number(lesson.id) === Number(selectedLessonId)) || null;
}

function normalizeSelection() {
    if (!curriculum.length) {
        selectedModuleId = null;
        selectedLessonId = null;
        return;
    }

    const hasSelectedModule = curriculum.some((module) => Number(module.id) === Number(selectedModuleId));
    if (!hasSelectedModule) {
        selectedModuleId = Number(curriculum[0].id);
    }

    const module = getSelectedModule();
    const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
    if (!lessons.length) {
        selectedLessonId = null;
        return;
    }

    const hasSelectedLesson = lessons.some((lesson) => Number(lesson.id) === Number(selectedLessonId));
    if (!hasSelectedLesson) {
        selectedLessonId = Number(lessons[0].id);
    }
}

function resetModuleForm() {
    editingModuleId = null;
    moduleFormEl?.reset();
    moduleOrderEl.value = "1";
    moduleSubmitEl.textContent = "Создать модуль";
    moduleCancelEl.hidden = true;
}

function resetLessonForm() {
    editingLessonId = null;
    lessonFormEl?.reset();
    lessonOrderEl.value = "1";
    lessonSubmitEl.textContent = "Создать урок";
    lessonCancelEl.hidden = true;
}

function resetStepForm() {
    editingStepId = null;
    stepFormEl?.reset();
    stepOrderEl.value = "1";
    stepXpEl.value = "0";
    stepRequiredEl.value = "true";
    stepConfigEl.value = "{}";
    stepSubmitEl.textContent = "Создать задание";
    stepCancelEl.hidden = true;
}

function openEditModule(module) {
    if (!module) {
        return;
    }
    editingModuleId = Number(module.id);
    moduleNameEl.value = module.name || "";
    moduleLanguageEl.value = module.language || "";
    moduleOrderEl.value = String(module.order ?? 0);
    moduleDescriptionEl.value = module.description || "";
    moduleSubmitEl.textContent = "Сохранить модуль";
    moduleCancelEl.hidden = false;
}

function openEditLesson(lesson) {
    if (!lesson) {
        return;
    }
    editingLessonId = Number(lesson.id);
    lessonTitleEl.value = lesson.title || "";
    lessonOrderEl.value = String(lesson.order ?? 0);
    lessonVideoEl.value = lesson.video_url || "";
    lessonContentEl.value = lesson.content || "";
    lessonSubmitEl.textContent = "Сохранить урок";
    lessonCancelEl.hidden = false;
}

function openEditStep(step) {
    if (!step) {
        return;
    }
    editingStepId = Number(step.id);
    stepTypeEl.value = step.step_type || "theory";
    stepOrderEl.value = String(step.order ?? 0);
    stepXpEl.value = String(step.xp_reward ?? 0);
    stepRequiredEl.value = step.is_required ? "true" : "false";
    stepTitleEl.value = step.title || "";
    stepContentEl.value = step.content || "";
    stepConfigEl.value = JSON.stringify(step.config || {}, null, 2);
    stepSubmitEl.textContent = "Сохранить задание";
    stepCancelEl.hidden = false;
}

function renderHomeStats() {
    const modulesCount = curriculum.length;
    let lessonsCount = 0;
    let stepsCount = 0;

    curriculum.forEach((module) => {
        const lessons = Array.isArray(module?.lessons) ? module.lessons : [];
        lessonsCount += lessons.length;
        lessons.forEach((lesson) => {
            const steps = Array.isArray(lesson?.steps) ? lesson.steps : [];
            stepsCount += steps.length;
        });
    });

    statModulesEl.textContent = String(modulesCount);
    statLessonsEl.textContent = String(lessonsCount);
    statStepsEl.textContent = String(stepsCount);
}

function renderModulesList() {
    modulesListEl.innerHTML = "";

    if (!curriculum.length) {
        modulesListEl.innerHTML = '<div class="teacher-empty">Модулей пока нет.</div>';
        return;
    }

    curriculum.forEach((module) => {
        const card = document.createElement("article");
        card.className = "teacher-item";
        if (Number(module.id) === Number(selectedModuleId)) {
            card.classList.add("is-selected");
        }

        const title = module.name || "Без названия";
        const safeTitle = escapeHtml(title);
        const language = module.language || "-";
        const safeLanguage = escapeHtml(language);
        const order = safeInt(module.order, 0);
        card.innerHTML = `
            <div class="teacher-item__head">
                <div>
                    <p class="teacher-item__title">${safeTitle}</p>
                    <p class="teacher-item__meta">#${order} · ${safeLanguage}</p>
                </div>
                <div class="teacher-item__controls">
                    <button class="teacher-btn" type="button" data-action="edit">Изм.</button>
                    <button class="teacher-btn teacher-btn--danger" type="button" data-action="delete">Удал.</button>
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            if (Number(selectedModuleId) === Number(module.id)) {
                return;
            }
            selectedModuleId = Number(module.id);
            selectedLessonId = null;
            resetLessonForm();
            resetStepForm();
            renderAll();
        });

        card.querySelector('[data-action="edit"]')?.addEventListener("click", (event) => {
            event.stopPropagation();
            openEditModule(module);
        });

        card.querySelector('[data-action="delete"]')?.addEventListener("click", async (event) => {
            event.stopPropagation();
            const confirmed = window.confirm(`Удалить модуль «${title}»? Все уроки и задания в нём тоже удалятся.`);
            if (!confirmed) {
                return;
            }
            try {
                await requestJson(`/auth/courses/teacher/modules/${module.id}/`, { method: "DELETE" });
                setTaskMessage("Модуль удалён.", "success");
                if (Number(selectedModuleId) === Number(module.id)) {
                    selectedModuleId = null;
                    selectedLessonId = null;
                }
                if (Number(editingModuleId) === Number(module.id)) {
                    resetModuleForm();
                }
                resetLessonForm();
                resetStepForm();
                await loadCurriculum();
                renderAll();
            } catch (error) {
                setTaskMessage(error?.message || "Не удалось удалить модуль.", "error");
            }
        });

        modulesListEl.appendChild(card);
    });
}

function renderLessonsList() {
    lessonsListEl.innerHTML = "";
    const module = getSelectedModule();
    const lessons = Array.isArray(module?.lessons) ? module.lessons : [];

    if (!module) {
        lessonsListEl.innerHTML = '<div class="teacher-empty">Сначала создай или выбери модуль.</div>';
        return;
    }

    if (!lessons.length) {
        lessonsListEl.innerHTML = '<div class="teacher-empty">В этом модуле пока нет уроков.</div>';
        return;
    }

    lessons.forEach((lesson) => {
        const card = document.createElement("article");
        card.className = "teacher-item";
        if (Number(lesson.id) === Number(selectedLessonId)) {
            card.classList.add("is-selected");
        }

        const title = lesson.title || "Без названия";
        const safeTitle = escapeHtml(title);
        const order = safeInt(lesson.order, 0);
        card.innerHTML = `
            <div class="teacher-item__head">
                <div>
                    <p class="teacher-item__title">${safeTitle}</p>
                    <p class="teacher-item__meta">#${order}</p>
                </div>
                <div class="teacher-item__controls">
                    <button class="teacher-btn" type="button" data-action="edit">Изм.</button>
                    <button class="teacher-btn teacher-btn--danger" type="button" data-action="delete">Удал.</button>
                </div>
            </div>
        `;

        card.addEventListener("click", () => {
            if (Number(selectedLessonId) === Number(lesson.id)) {
                return;
            }
            selectedLessonId = Number(lesson.id);
            resetStepForm();
            renderAll();
        });

        card.querySelector('[data-action="edit"]')?.addEventListener("click", (event) => {
            event.stopPropagation();
            openEditLesson(lesson);
        });

        card.querySelector('[data-action="delete"]')?.addEventListener("click", async (event) => {
            event.stopPropagation();
            const confirmed = window.confirm(`Удалить урок «${title}»? Все шаги урока тоже удалятся.`);
            if (!confirmed) {
                return;
            }
            try {
                await requestJson(`/auth/courses/teacher/lessons/${lesson.id}/`, { method: "DELETE" });
                setTaskMessage("Урок удалён.", "success");
                if (Number(selectedLessonId) === Number(lesson.id)) {
                    selectedLessonId = null;
                }
                if (Number(editingLessonId) === Number(lesson.id)) {
                    resetLessonForm();
                }
                resetStepForm();
                await loadCurriculum();
                renderAll();
            } catch (error) {
                setTaskMessage(error?.message || "Не удалось удалить урок.", "error");
            }
        });

        lessonsListEl.appendChild(card);
    });
}

function renderStepsList() {
    stepsListEl.innerHTML = "";
    const lesson = getSelectedLesson();
    const steps = Array.isArray(lesson?.steps) ? lesson.steps : [];

    if (!lesson) {
        stepsListEl.innerHTML = '<div class="teacher-empty">Сначала выбери урок.</div>';
        return;
    }

    if (!steps.length) {
        stepsListEl.innerHTML = '<div class="teacher-empty">В этом уроке пока нет заданий.</div>';
        return;
    }

    steps.forEach((step) => {
        const card = document.createElement("article");
        card.className = "teacher-item";
        const title = step.title || "Без заголовка";
        const safeTitle = escapeHtml(title);
        const order = safeInt(step.order, 0);
        const safeStepType = escapeHtml(step.step_type || "");
        const xp = safeInt(step.xp_reward, 0);
        const requiredLabel = step.is_required ? "обяз." : "необяз.";
        card.innerHTML = `
            <div class="teacher-item__head">
                <div>
                    <p class="teacher-item__title">${safeTitle}</p>
                    <p class="teacher-item__meta">#${order} · ${safeStepType} · XP ${xp} · ${requiredLabel}</p>
                </div>
                <div class="teacher-item__controls">
                    <button class="teacher-btn" type="button" data-action="edit">Изм.</button>
                    <button class="teacher-btn teacher-btn--danger" type="button" data-action="delete">Удал.</button>
                </div>
            </div>
        `;

        card.querySelector('[data-action="edit"]')?.addEventListener("click", (event) => {
            event.stopPropagation();
            openEditStep(step);
        });

        card.querySelector('[data-action="delete"]')?.addEventListener("click", async (event) => {
            event.stopPropagation();
            const confirmed = window.confirm(`Удалить задание «${title}»?`);
            if (!confirmed) {
                return;
            }
            try {
                await requestJson(`/auth/courses/teacher/steps/${step.id}/`, { method: "DELETE" });
                setTaskMessage("Задание удалено.", "success");
                if (Number(editingStepId) === Number(step.id)) {
                    resetStepForm();
                }
                await loadCurriculum();
                renderAll();
            } catch (error) {
                setTaskMessage(error?.message || "Не удалось удалить задание.", "error");
            }
        });

        stepsListEl.appendChild(card);
    });
}

function renderAll() {
    normalizeSelection();
    renderHomeStats();
    renderModulesList();
    renderLessonsList();
    renderStepsList();
}

moduleFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
        name: moduleNameEl.value.trim(),
        language: moduleLanguageEl.value.trim(),
        order: Math.max(0, safeInt(moduleOrderEl.value, 0)),
        description: moduleDescriptionEl.value.trim(),
    };

    if (!payload.name || !payload.description) {
        setTaskMessage("Заполни название и описание модуля.", "error");
        return;
    }

    moduleSubmitEl.disabled = true;
    try {
        const result = await requestJson(
            editingModuleId
                ? `/auth/courses/teacher/modules/${editingModuleId}/`
                : "/auth/courses/teacher/modules/",
            {
                method: editingModuleId ? "PATCH" : "POST",
                body: JSON.stringify(payload),
            }
        );
        setTaskMessage(editingModuleId ? "Модуль обновлён." : "Модуль создан.", "success");
        resetModuleForm();
        await loadCurriculum();
        selectedModuleId = Number(result?.id || selectedModuleId);
        renderAll();
    } catch (error) {
        setTaskMessage(error?.message || "Не удалось сохранить модуль.", "error");
    } finally {
        moduleSubmitEl.disabled = false;
    }
});

lessonFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const module = getSelectedModule();
    if (!module) {
        setTaskMessage("Сначала выбери модуль для урока.", "error");
        return;
    }

    const payload = {
        title: lessonTitleEl.value.trim(),
        order: Math.max(0, safeInt(lessonOrderEl.value, 0)),
        video_url: lessonVideoEl.value.trim(),
        content: lessonContentEl.value.trim(),
        module_id: Number(module.id),
    };

    if (!payload.title || !payload.content) {
        setTaskMessage("Заполни название и контент урока.", "error");
        return;
    }

    lessonSubmitEl.disabled = true;
    try {
        const result = await requestJson(
            editingLessonId
                ? `/auth/courses/teacher/lessons/${editingLessonId}/`
                : `/auth/courses/teacher/modules/${module.id}/lessons/`,
            {
                method: editingLessonId ? "PATCH" : "POST",
                body: JSON.stringify(payload),
            }
        );

        setTaskMessage(editingLessonId ? "Урок обновлён." : "Урок создан.", "success");
        resetLessonForm();
        await loadCurriculum();
        selectedModuleId = Number(module.id);
        selectedLessonId = Number(result?.id || selectedLessonId);
        renderAll();
    } catch (error) {
        setTaskMessage(error?.message || "Не удалось сохранить урок.", "error");
    } finally {
        lessonSubmitEl.disabled = false;
    }
});

stepFormEl?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const lesson = getSelectedLesson();
    if (!lesson) {
        setTaskMessage("Сначала выбери урок для задания.", "error");
        return;
    }

    let parsedConfig = {};
    try {
        parsedConfig = JSON.parse(stepConfigEl.value.trim() || "{}");
    } catch (error) {
        setTaskMessage("Поле Config должно быть валидным JSON.", "error");
        return;
    }

    const payload = {
        step_type: stepTypeEl.value,
        order: Math.max(0, safeInt(stepOrderEl.value, 0)),
        xp_reward: Math.max(0, safeInt(stepXpEl.value, 0)),
        is_required: stepRequiredEl.value === "true",
        title: stepTitleEl.value.trim(),
        content: stepContentEl.value,
        config: parsedConfig,
        lesson_id: Number(lesson.id),
    };

    stepSubmitEl.disabled = true;
    try {
        await requestJson(
            editingStepId
                ? `/auth/courses/teacher/steps/${editingStepId}/`
                : `/auth/courses/teacher/lessons/${lesson.id}/steps/`,
            {
                method: editingStepId ? "PATCH" : "POST",
                body: JSON.stringify(payload),
            }
        );

        setTaskMessage(editingStepId ? "Задание обновлено." : "Задание создано.", "success");
        resetStepForm();
        await loadCurriculum();
        selectedLessonId = Number(lesson.id);
        renderAll();
    } catch (error) {
        setTaskMessage(error?.message || "Не удалось сохранить задание.", "error");
    } finally {
        stepSubmitEl.disabled = false;
    }
});

moduleCancelEl?.addEventListener("click", resetModuleForm);
lessonCancelEl?.addEventListener("click", resetLessonForm);
stepCancelEl?.addEventListener("click", resetStepForm);

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
    const submitBtn = profileFormEl.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    setProfileMessage("");

    try {
        const profile = await saveProfile();
        currentProfile = profile;
        fillProfileForm(profile);
        setProfileChip(profile);
        resetAvatarDraft(profile);
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

tabHomeBtn?.addEventListener("click", () => {
    setActiveTab("home");
});

tabTasksBtn?.addEventListener("click", () => {
    setActiveTab("tasks");
});

async function initTeacherDashboard() {
    try {
        currentProfile = await fetchProfile();
        if (currentProfile.role !== "teacher" && currentProfile.role !== "admin") {
            window.location.replace(roleHomePath(currentProfile.role));
            return;
        }

        fillProfileForm(currentProfile);
        setProfileChip(currentProfile);

        await loadCurriculum();
        renderAll();
        setActiveTab("home");
    } catch (error) {
        clearAuthAndRedirect();
    }
}

initTeacherDashboard();
