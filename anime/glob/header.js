// Funcionalidad para el menú desplegable en resoluciones pequeñas
document.addEventListener('DOMContentLoaded', function() {
    // Funcionalidad para el menú desplegable en resoluciones pequeñas
    const menuToggle = document.getElementById('menu-toggle');
    const navCategories = document.querySelector('.nav-categories');
    
    if (menuToggle && navCategories) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            navCategories.classList.toggle('active');
        });
        
        // Cerrar el menú al hacer clic en una categoría
        const navLinks = document.querySelectorAll('.nav-category');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 768) {
                    navCategories.classList.remove('active');
                }
            });
        });
        
        // Cerrar el menú al hacer clic fuera de él
        document.addEventListener('click', function(event) {
            if (!navCategories.contains(event.target) && !menuToggle.contains(event.target)) {
                navCategories.classList.remove('active');
            }
        });
    }

    // Funcionalidad para la notificación de primera visita
    const firstVisitNotification = document.getElementById('first-visit-notification');
    const notificationClose = document.querySelector('.notification-close');
    
    // Verificar si es la primera visita
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    
    if (!hasVisitedBefore && firstVisitNotification) {
        // Mostrar la notificación
        firstVisitNotification.classList.add('show');
        
        // Marcar como visitado
        localStorage.setItem('hasVisitedBefore', 'true');
        
        // Cerrar la notificación al hacer clic en el botón de cierre
        if (notificationClose) {
            notificationClose.addEventListener('click', function() {
                firstVisitNotification.classList.remove('show');
            });
        }
    }

    // Funcionalidad para ocultar/mostrar el header al hacer scroll
    const header = document.querySelector('header');
    let lastScrollTop = 0;
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Si estamos scrolleando hacia abajo y ya hemos pasado la altura del header
        if (scrollTop > lastScrollTop && scrollTop > header.offsetHeight) {
            header.classList.add('hidden');
        } else {
            // Si estamos scrolleando hacia arriba o estamos en la parte superior
            header.classList.remove('hidden');
        }
        
        lastScrollTop = scrollTop;
    });
});