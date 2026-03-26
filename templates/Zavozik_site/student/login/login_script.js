const tabButtons = document.querySelectorAll(".mode-btn");
const inlineSwitchButtons = document.querySelectorAll(".inline-switch-btn");
const panels = document.querySelectorAll(".auth-form");

const loginForm = document.getElementById("panel-login");
const registerForm = document.getElementById("panel-register");
const loginMessage = document.getElementById("login-message");
const registerMessage = document.getElementById("register-message");
const forgotPasswordLink = document.getElementById("forgot-password-link");
const pageParams = new URLSearchParams(window.location.search);

function setMode(mode) {
    const isLoginMode = mode === "login";

    tabButtons.forEach((button) => {
        const isActive = button.dataset.mode === mode;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
        panel.classList.toggle("is-active", panel.dataset.panel === mode);
    });

    clearStatus();
    if (isLoginMode) {
        loginForm.reset();
    } else {
        registerForm.reset();
    }

    const source = pageParams.get("source");
    const nextParams = new URLSearchParams();
    nextParams.set("mode", mode);
    if (source) {
        nextParams.set("source", source);
    }
    window.history.replaceState({}, "", `${window.location.pathname}?${nextParams.toString()}`);
}

function setStatus(element, message, type) {
    element.textContent = message;
    element.classList.remove("is-error", "is-success");
    if (type === "error") {
        element.classList.add("is-error");
    }
    if (type === "success") {
        element.classList.add("is-success");
    }
}

function clearStatus() {
    setStatus(loginMessage, "", "");
    setStatus(registerMessage, "", "");
}

tabButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
});

inlineSwitchButtons.forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
});

forgotPasswordLink.addEventListener("click", (event) => {
    event.preventDefault();
    setStatus(loginMessage, "Заглушка: восстановление пароля будет подключено позже.", "success");
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;

    if (!email || !password) {
        setStatus(loginMessage, "Заполните почту и пароль.", "error");
        return;
    }

    const response = await loginUser({ email, password });

    if (!response.ok) {
        setStatus(loginMessage, response.message, "error");
        return;
    }

    setStatus(loginMessage, "Успешный вход (заглушка). Подключите реальный API.", "success");
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearStatus();

    const nickname = document.getElementById("register-nickname").value.trim();
    const email = document.getElementById("register-email").value.trim().toLowerCase();
    const password = document.getElementById("register-password").value;
    const passwordRepeat = document.getElementById("register-password-repeat").value;

    if (!nickname || !email || !password || !passwordRepeat) {
        setStatus(registerMessage, "Заполните все поля.", "error");
        return;
    }

    if (password !== passwordRepeat) {
        setStatus(registerMessage, "Пароли не совпадают.", "error");
        return;
    }

    const response = await registerUser({ nickname, email, password });

    if (!response.ok) {
        setStatus(registerMessage, response.message, "error");
        return;
    }

    setStatus(registerMessage, "Аккаунт создан (заглушка). Теперь можно подключать БД/API.", "success");
});

async function loginUser({ email, password }) {
    /*
      TODO: интеграция с бэкендом.
      Пример:
      const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
      });
      return await res.json();
    */

    await wait(500);

    const demoUser = {
        email: "demo@zavozik.ru",
        password: "123456"
    };

    if (email === demoUser.email && password === demoUser.password) {
        return { ok: true, message: "ok" };
    }

    return { ok: false, message: "Неверный логин или пароль." };
}

async function registerUser({ nickname, email, password }) {
    /*
      TODO: интеграция с бэкендом.
      Пример:
      const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname, email, password })
      });
      return await res.json();
    */

    await wait(700);

    if (nickname.length < 3) {
        return { ok: false, message: "Никнейм должен быть не короче 3 символов." };
    }

    return { ok: true, message: "ok" };
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const initialMode = pageParams.get("mode") === "register" ? "register" : "login";
setMode(initialMode);
