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
    const normalized = String(rawLanguage || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "")
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

function renderModules(modules) {
    modulesListEl.innerHTML = "";

    if (!modules.length) {
        modulesEmptyEl.hidden = false;
        return;
    }

    modulesEmptyEl.hidden = true;

    modules
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .forEach((module) => {
            const card = document.createElement("article");
            card.className = "student-module-card";

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

function renderModulesForActiveLanguage() {
    const filteredModules = filterModulesByLanguage(allModules, activeLanguageKey);
    renderModules(filteredModules);
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
