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

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}


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

    const username = document.getElementById("modal-login-username").value.trim();
    const password = document.getElementById("modal-login-password").value;

    if (!username || !password) {
        setAuthStatus(loginMessage, "Заполните логин и пароль.", "error");
        return;
    }

    const response = await mockLogin(username, password);
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
    const role = document.getElementById("modal-register-role").value;
    const password = document.getElementById("modal-register-password").value;
    const passwordRepeat = document.getElementById("modal-register-password-repeat").value;

    if (!nickname || !role || !password || !passwordRepeat) {
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



async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const config = {
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
            ...(token && { Authorization: `Bearer ${token}` })
        },
        ...options,
        credentials: 'include'
    };
    
    const response = await fetch(endpoint, config);  
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || error.message || 'Ошибка сервера');
    }
    return response.json();
}


async function mockRegister(nickname) {
    try {
        const role = document.getElementById("modal-register-role").value;
        const password = document.getElementById("modal-register-password").value;
        const passwordRepeat = document.getElementById("modal-register-password-repeat").value;
        
        const data = {
            username: nickname,
            password: password,
            password_confirm: passwordRepeat,
            role: role  // student/teacher/parent
        };
        
        await apiRequest('/auth/register/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        setAuthStatus(registerMessage, "Аккаунт создан! Можете войти.", "success");
        setTimeout(() => setAuthMode('login'), 1500);  // Переключить на login
        return { ok: true };
    } catch (error) {
        setAuthStatus(registerMessage, error.message, "error");
        return { ok: false, message: error.message };
    }
}


// ИСПРАВЛЕННЫЙ вход
async function mockLogin(username, password) {
    try {
        const data = {
            username: username,  
            password: password
        };
        
        const authResponse = await apiRequest('/auth/token/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        localStorage.setItem('token', authResponse.access);
        localStorage.setItem('refresh', authResponse.refresh);
        
        // Получить профиль пользователя
        const profile = await apiRequest('/auth/profile/');

        if (profile.role === 'student') {
            window.location.assign('/student/');
            return { ok: true };
        }
        
        // ПОКАЗАТЬ ПРОФИЛЬ (добавь в HTML!)
        showUserProfile(profile.username, profile.level);
        
        closeAuthModal();
        setAuthStatus(loginMessage, `Добро пожаловать, ${profile.username}!`, "success");
        return { ok: true };
    } catch (error) {
        return { ok: false, message: error.message };
    }
}

// Функция показа профиля в хедере
function showUserProfile(username, level) {
    // Если нет элемента — создаём!
    let profileEl = document.getElementById('user-profile');
    if (!profileEl) {
        profileEl = document.createElement('div');
        profileEl.id = 'user-profile';
        profileEl.className = 'user-profile';
        profileEl.innerHTML = `
            <span>${username} | Lv.${level}</span>
            <button id="logout-btn" class="btn btn-nav btn-small">Выйти</button>
        `;
        document.querySelector('.auth-buttons').parentNode.appendChild(profileEl);
    } else {
        profileEl.querySelector('span').textContent = `${username} | Lv.${level}`;
    }
    
    profileEl.style.display = 'flex';
    document.querySelector('.auth-buttons').style.display = 'none';
    
    // Logout listener
    document.getElementById('logout-btn')?.addEventListener('click', logout);
}


// Logout функция
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh');
    
    const profileEl = document.getElementById('user-profile');
    if (profileEl) profileEl.remove();
    
    document.querySelector('.auth-buttons').style.display = 'flex';
}


// Auto-login при загрузке
window.addEventListener('load', async () => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            const profile = await apiRequest('/auth/profile/');
            if (profile.role === 'student') {
                window.location.assign('/student/');
                return;
            }
            showUserProfile(profile.username, profile.level);
        } catch (error) {
            localStorage.removeItem('token');
            localStorage.removeItem('refresh');
        }
    }
});

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

