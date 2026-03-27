// ========== Smooth scroll behavior =========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        if (!href || href === "#") {
            return;
        }
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ========== Add animation on scroll =========
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Initialize animations for cards
document.querySelectorAll('.course-card-main, .btn-primary').forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
});

// ========== Add keyframe animations =========
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-50px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

// ========== Add event listeners for buttons =========
const authModal = document.getElementById("auth-modal");
const authTabs = document.querySelectorAll("[data-auth-tab]");
const authPanels = document.querySelectorAll("[data-auth-panel]");
const authCloseButtons = document.querySelectorAll("[data-close-auth]");
const forgotPasswordLink = document.querySelector("[data-forgot-password]");

const loginForm = document.querySelector('[data-auth-panel="login"]');
const registerForm = document.querySelector('[data-auth-panel="register"]');
const loginMessage = document.getElementById("modal-login-message");
const registerMessage = document.getElementById("modal-register-message");

function setAuthStatus(element, message, type) {
    element.textContent = message;
    element.classList.remove("is-error", "is-success");
    if (type === "error") {
        element.classList.add("is-error");
    }
    if (type === "success") {
        element.classList.add("is-success");
    }
}

function clearAuthStatus() {
    setAuthStatus(loginMessage, "", "");
    setAuthStatus(registerMessage, "", "");
}

function setAuthMode(mode) {
    authTabs.forEach((tab) => {
        tab.classList.toggle("is-active", tab.dataset.authTab === mode);
    });

    authPanels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.authPanel === mode);
    });
}

function openAuthModal(mode) {
    setAuthMode(mode);
    clearAuthStatus();
    authModal.classList.add("is-open");
    authModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
}

function closeAuthModal() {
    authModal.classList.remove("is-open");
    authModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    clearAuthStatus();
    loginForm.reset();
    registerForm.reset();
}

document.querySelectorAll('.btn-auth').forEach(btn => {
    btn.addEventListener('click', function() {
        openAuthModal("login");
    });
});

document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
        openAuthModal("register");
    });
});

document.querySelectorAll('.btn-course-main').forEach(btn => {
    btn.addEventListener('click', function() {
        openAuthModal("register");
    });
});

authTabs.forEach((tab) => {
    tab.addEventListener("click", () => setAuthMode(tab.dataset.authTab));
});

authCloseButtons.forEach((button) => {
    button.addEventListener("click", closeAuthModal);
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && authModal.classList.contains("is-open")) {
        closeAuthModal();
    }
});

forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    setAuthStatus(loginMessage, "Заглушка: восстановление пароля подключим позже.", "success");
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthStatus();

    const email = document.getElementById("modal-login-email").value.trim().toLowerCase();
    const password = document.getElementById("modal-login-password").value;

    if (!email || !password) {
        setAuthStatus(loginMessage, "Заполните почту и пароль.", "error");
        return;
    }

    const response = await mockLogin(email, password);
    if (!response.ok) {
        setAuthStatus(loginMessage, response.message, "error");
        return;
    }

    setAuthStatus(loginMessage, "Успешный вход (заглушка).", "success");
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAuthStatus();

    const nickname = document.getElementById("modal-register-nickname").value.trim();
    const email = document.getElementById("modal-register-email").value.trim().toLowerCase();
    const role = document.getElementById("modal-register-role").value;
    const password = document.getElementById("modal-register-password").value;
    const passwordRepeat = document.getElementById("modal-register-password-repeat").value;

    if (!nickname || !email || !role || !password || !passwordRepeat) {
        setAuthStatus(registerMessage, "Заполните все поля.", "error");
        return;
    }

    if (password !== passwordRepeat) {
        setAuthStatus(registerMessage, "Пароли не совпадают.", "error");
        return;
    }

    const response = await mockRegister(nickname);
    if (!response.ok) {
        setAuthStatus(registerMessage, response.message, "error");
        return;
    }

    setAuthStatus(registerMessage, "Аккаунт создан (заглушка).", "success");
});

async function mockLogin(email, password) {
    await wait(450);

    if (email === "demo@zavozik.ru" && password === "123456") {
        return { ok: true };
    }

    return { ok: false, message: "Неверный логин или пароль." };
}

async function mockRegister(nickname) {
    await wait(650);

    if (nickname.length < 3) {
        return { ok: false, message: "Никнейм должен быть не короче 3 символов." };
    }

    return { ok: true };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

setAuthMode("login");
authModal.setAttribute("aria-hidden", "true");
document.body.classList.remove("modal-open");

/*
  TODO для бэкенда:
  вместо mockLogin/mockRegister подключить fetch к вашему API авторизации.
*/

document.querySelectorAll('.auth-modal__submit').forEach(btn => {
    btn.addEventListener('click', function() {
        btn.blur();
    });
});

// ========== Add header scroll effect =========
const header = document.querySelector('.header');

window.addEventListener('scroll', function() {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 100) {
        header.style.boxShadow = '0 8px 36px rgba(0, 0, 0, 0.2)';
    } else {
        header.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.12)';
    }
    
});

console.log('🎮 Добро пожаловать на Завозик! Скрипт загружен успешно!');

