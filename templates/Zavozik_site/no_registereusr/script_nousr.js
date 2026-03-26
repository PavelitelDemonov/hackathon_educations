// ========== Smooth scroll behavior =========
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
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
document.querySelectorAll('.btn-auth').forEach(btn => {
    btn.addEventListener('click', function() {
        alert('👋 Привет! Открываем страницу входа.');
    });
});

document.querySelectorAll('.btn-primary').forEach(btn => {
    btn.addEventListener('click', function() {
        alert('🎉 Супер! Открываем регистрацию.');
    });
});

document.querySelectorAll('.btn-course-main').forEach(btn => {
    btn.addEventListener('click', function() {
        alert('🚀 Класс! Зарегистрируйся и начни первую миссию.');
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

