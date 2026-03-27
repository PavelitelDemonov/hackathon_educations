const token = localStorage.getItem("token");

const langDropdown = document.getElementById("lang-dropdown");
const langTrigger = document.getElementById("lang-trigger");
const langMenu = document.getElementById("lang-menu");
const activeLanguage = document.getElementById("active-language");
const heroLanguage = document.getElementById("hero-language");
const tasksLanguage = document.getElementById("tasks-language");

const usernameEl = document.getElementById("student-username");
const levelEl = document.getElementById("student-level");
const experienceEl = document.getElementById("student-experience");
const profileBtn = document.getElementById("student-profile");
const homeTab = document.getElementById("tab-home");
const tasksTab = document.getElementById("tab-tasks");
const homePanels = document.querySelectorAll(".panel-home");
const tasksPanel = document.getElementById("panel-tasks");
const modulesListEl = document.getElementById("student-modules-list");
const modulesEmptyEl = document.getElementById("student-modules-empty");
const lessonViewerEl = document.getElementById("student-lesson-viewer");
const lessonModuleNameEl = document.getElementById("lesson-module-name");
const lessonCounterEl = document.getElementById("lesson-counter");
const lessonListEl = document.getElementById("lesson-list");
const lessonTitleEl = document.getElementById("lesson-title");
const lessonContentEl = document.getElementById("lesson-content");
const lessonPrevBtn = document.getElementById("lesson-prev-btn");
const lessonNextBtn = document.getElementById("lesson-next-btn");

if (!token) {
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
const lessonsByModule = new Map();
let lessonRequestSeq = 0;

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
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeLanguageMenu();
    }
});

function setActiveTab(tabName) {
    const isHome = tabName === "home";

    homeTab.classList.toggle("is-active-tab", isHome);
    tasksTab.classList.toggle("is-active-tab", !isHome);

    homePanels.forEach((section) => {
        section.hidden = !isHome;
    });
    tasksPanel.hidden = isHome;

    if (!isHome) {
        renderModulesForActiveLanguage();
    }
}

homeTab.addEventListener("click", () => {
    setActiveTab("home");
});

tasksTab.addEventListener("click", () => {
    setActiveTab("tasks");
});

modulesListEl.addEventListener("click", (event) => {
    const moduleButton = event.target.closest("[data-module-id]");
    if (!moduleButton) {
        return;
    }

    const moduleId = Number(moduleButton.dataset.moduleId);
    const moduleName = moduleButton.dataset.moduleName || "Модуль";
    selectModule(moduleId, moduleName);
});

lessonPrevBtn.addEventListener("click", () => {
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
});

lessonNextBtn.addEventListener("click", () => {
    if (!currentLessons.length) {
        return;
    }

    if (currentSectionIndex < currentLessonSections.length - 1) {
        currentSectionIndex += 1;
        renderActiveLesson();
        return;
    }

    if (currentLessonIndex < currentLessons.length - 1) {
        currentLessonIndex += 1;
        currentSectionIndex = 0;
        renderActiveLesson();
    }
});

lessonListEl.addEventListener("click", (event) => {
    const lessonButton = event.target.closest("[data-lesson-index]");
    if (!lessonButton) {
        return;
    }

    const index = Number(lessonButton.dataset.lessonIndex);
    if (!Number.isNaN(index) && index >= 0 && index < currentLessons.length) {
        currentLessonIndex = index;
        currentSectionIndex = 0;
        renderActiveLesson();
    }
});

async function fetchProfile() {
    const response = await fetch("/auth/profile/", {
        headers: {
            Authorization: `Bearer ${token}`,
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
    const response = await fetch(`/auth/courses/modules/${moduleId}/lessons/`, {
        headers: {
            "Content-Type": "application/json"
        }
    });

    if (!response.ok) {
        throw new Error("Не удалось загрузить уроки");
    }

    return response.json();
}

function fillProfile(profile) {
    const username = profile.username || "-";
    const level = profile.level ?? "-";
    const experience = profile.experience ?? "-";

    usernameEl.textContent = username;
    levelEl.textContent = level;
    experienceEl.textContent = experience;
    profileBtn.textContent = `${username} | Lv.${level}`;
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

function parseLessonSections(rawContent) {
    const content = String(rawContent || "").trim();
    if (!content) {
        return [];
    }

    const delimiterChunks = content
        .split(/\n\s*---+\s*\n/g)
        .map((chunk) => chunk.trim())
        .filter(Boolean);
    if (delimiterChunks.length > 1) {
        return delimiterChunks.map((chunk, index) => ({
            title: `Слайд ${index + 1}`,
            text: chunk
        }));
    }

    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            const sections = normalizeSectionsFromJson(parsed);
            if (sections.length) {
                return sections;
            }
        }
        if (parsed && Array.isArray(parsed.sections)) {
            const sections = normalizeSectionsFromJson(parsed.sections);
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
            return { title, text };
        });
    }

    return [{ title: "Описание", text: content }];
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
            const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
            if (paragraphs.length) {
                paragraphs.forEach((paragraph) => {
                    const p = document.createElement("p");
                    p.className = "lesson-section__text";
                    p.textContent = paragraph;
                    block.appendChild(p);
                });
            } else {
                const p = document.createElement("p");
                p.className = "lesson-section__text";
                p.textContent = text;
                block.appendChild(p);
            }
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
        if (index === currentLessonIndex) {
            item.classList.add("is-active");
        }
        item.dataset.lessonIndex = String(index);
        item.textContent = `${index + 1}. ${lesson.title || "Без названия"}`;
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
        currentLessonSections = [];
        currentSectionIndex = 0;
        renderLessonList();
        return;
    }

    const lesson = currentLessons[currentLessonIndex];
    currentLessonSections = parseLessonSections(lesson.content);
    if (!currentLessonSections.length) {
        currentLessonSections = [{ title: "Описание", text: "Текст урока пока не добавлен." }];
    }
    if (currentSectionIndex >= currentLessonSections.length) {
        currentSectionIndex = currentLessonSections.length - 1;
    }
    if (currentSectionIndex < 0) {
        currentSectionIndex = 0;
    }

    const section = currentLessonSections[currentSectionIndex];
    lessonTitleEl.textContent = lesson.title || "Без названия";
    lessonCounterEl.textContent = `Урок ${currentLessonIndex + 1} из ${currentLessons.length} | Слайд ${currentSectionIndex + 1} из ${currentLessonSections.length}`;
    renderLessonContent([section], lesson.video_url);

    const isFirstSlide = currentLessonIndex === 0 && currentSectionIndex === 0;
    const isLastSlide =
        currentLessonIndex === currentLessons.length - 1 &&
        currentSectionIndex === currentLessonSections.length - 1;
    lessonPrevBtn.disabled = isFirstSlide;
    lessonNextBtn.disabled = isLastSlide;
    renderLessonList();
}

function renderModules(modules) {
    modulesListEl.innerHTML = "";

    if (!modules.length) {
        modulesEmptyEl.hidden = false;
        lessonViewerEl.hidden = true;
        return;
    }

    modulesEmptyEl.hidden = true;

    modules
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((module) => {
            const card = document.createElement("button");
            card.type = "button";
            card.className = "student-module-card student-module-card--button";
            if (module.id === activeModuleId) {
                card.classList.add("is-active-module");
            }
            card.dataset.moduleId = String(module.id);
            card.dataset.moduleName = module.name || "Модуль";

            const description = module.description
                ? escapeHtml(module.description)
                : "Описание модуля пока не добавлено.";
            const moduleOrder = module.order ?? "-";

            card.innerHTML = `
                <div class="student-module-order">#${moduleOrder}</div>
                <h3 class="student-module-title">${escapeHtml(module.name || "Без названия")}</h3>
                <p class="student-module-description">${description}</p>
            `;

            modulesListEl.appendChild(card);
        });
}

async function selectModule(moduleId, moduleName) {
    const requestSeq = ++lessonRequestSeq;
    activeModuleId = moduleId;
    activeModuleName = moduleName || "Модуль";

    lessonViewerEl.hidden = false;
    lessonModuleNameEl.textContent = activeModuleName;
    lessonCounterEl.textContent = "Загрузка...";
    lessonTitleEl.textContent = "Загружаем уроки";
    lessonContentEl.textContent = "Подождите, загружаем материалы модуля...";
    lessonPrevBtn.disabled = true;
    lessonNextBtn.disabled = true;

    renderModulesForActiveLanguage();

    try {
        if (!lessonsByModule.has(moduleId)) {
            const lessons = await fetchLessons(moduleId);
            lessonsByModule.set(moduleId, Array.isArray(lessons) ? lessons : []);
        }

        if (requestSeq !== lessonRequestSeq || activeModuleId !== moduleId) {
            return;
        }

        currentLessons = [...(lessonsByModule.get(moduleId) || [])].sort(
            (a, b) => (a.order ?? 0) - (b.order ?? 0)
        );
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        renderActiveLesson();
    } catch (error) {
        if (requestSeq !== lessonRequestSeq || activeModuleId !== moduleId) {
            return;
        }

        currentLessons = [];
        currentLessonIndex = 0;
        currentSectionIndex = 0;
        currentLessonSections = [];
        lessonCounterEl.textContent = "Урок 0 из 0";
        lessonTitleEl.textContent = "Не удалось загрузить уроки";
        lessonContentEl.textContent = "Проверьте данные в БД и перезагрузите страницу.";
        lessonPrevBtn.disabled = true;
        lessonNextBtn.disabled = true;
        renderLessonList();
    }
}

function renderModulesForActiveLanguage() {
    const filteredModules = filterModulesByLanguage(allModules, activeLanguageKey);
    renderModules(filteredModules);

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
    }
}

async function initStudentDashboard() {
    try {
        const profile = await fetchProfile();

        if (profile.role !== "student") {
            window.location.replace("/");
            return;
        }

        try {
            const modules = await fetchModules();
            allModules = Array.isArray(modules) ? modules : [];
        } catch (modulesError) {
            allModules = [];
        }

        fillProfile(profile);
        setLanguage(activeLanguageKey);
        setActiveTab("home");
    } catch (error) {
        localStorage.removeItem("token");
        localStorage.removeItem("refresh");
        window.location.replace("/");
    }
}

initStudentDashboard();
