// Usar la función global safeParseLocalStorage de localstorage.js
let myList = (window.safeParseLocalStorage || function(key, def) { 
    try { return JSON.parse(localStorage.getItem(key)) || def; } 
    catch(e) { return def; }
})(MY_LIST_KEY, []);

let favorites = (window.safeParseLocalStorage || function(key, def) { 
    try { return JSON.parse(localStorage.getItem(key)) || def; } 
    catch(e) { return def; }
})(FAVORITES_KEY, []);

// Exportar las variables al objeto window para que sean accesibles desde otros archivos
window.myList = myList;
window.favorites = favorites;

// Función para calcular el total de episodios
function getTotalEpisodes(anime) {
    let total = 0;
    for (const season of anime.seasons) {
        // Si la temporada tiene información de episodios lanzados, usar ese valor
        if (season.newEpisode && season.newEpisode.releasedEpisodes !== undefined) {
            total += season.newEpisode.releasedEpisodes;
        } else {
            // Si no hay información de episodios lanzados, asumir que todos están disponibles
            total += season.episodes;
        }
    }
    return total;
}

// Función para calcular episodios lanzados para cada temporada
// Asegurarse de que la función sea accesible globalmente
window.updateReleasedEpisodes = function() {
    // Obtener la fecha actual en formato YYYY-MM-DD
    const currentDate = new Date();
    const currentDateFormatted = currentDate.toISOString().split('T')[0];
    
    // Actualizar cada anime
    for (const anime of animeData) {
        for (const season of anime.seasons) {
            // Solo procesar temporadas con información de nuevos episodios
            if (season.newEpisode && season.newEpisode.date) {
                const originalDate = season.newEpisode.date;
                const initialDateParts = originalDate.split('-');
                
                if (initialDateParts.length === 3) {
                    // Crear objeto Date para la fecha inicial
                    const initialDate = new Date(Date.UTC(
                        parseInt(initialDateParts[0]),
                        parseInt(initialDateParts[1]) - 1,
                        parseInt(initialDateParts[2])
                    ));
                    
                    // Formatear la fecha inicial como YYYY-MM-DD
                    const initialDateFormatted = initialDate.toISOString().split('T')[0];
                    
                    // Obtener el intervalo de transmisión (días entre episodios)
                    const broadcastInterval = season.newEpisode.broadcastInterval || 7; // Por defecto, semanal
                    
                    // Calcular días transcurridos desde la fecha inicial hasta hoy
                    const initialDateObj = new Date(initialDateFormatted);
                    const currentDateObj = new Date(currentDateFormatted);
                    
                    // Calcular la diferencia en días
                    const timeDiff = currentDateObj.getTime() - initialDateObj.getTime();
                    const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
                    
                    // Calcular episodios publicados basados en días transcurridos y el intervalo
                    let releasedEpisodes = Math.floor(daysDiff / broadcastInterval) + 1; // +1 porque el primer episodio sale en la fecha inicial
                    
                    // Asegurarse de que releasedEpisodes no exceda el total de episodios
                    if (releasedEpisodes > season.episodes) {
                        releasedEpisodes = season.episodes;
                    }
                    
                    // Asegurarse de que releasedEpisodes no sea negativo
                    if (releasedEpisodes < 0) {
                        releasedEpisodes = 0;
                    }
                    
                    // Si la fecha actual es anterior a la fecha inicial, no hay episodios publicados
                    if (currentDateFormatted < initialDateFormatted) {
                        releasedEpisodes = 0;
                    }
                    
                    // Guardar el número de episodios lanzados
                    season.newEpisode.releasedEpisodes = releasedEpisodes;
                }
            }
        }
    }
}

// Función para crear una tarjeta de anime
window.createAnimeCard = function(anime) {
    // Verificar si el anime está en "Mi lista" y en "Favoritos"
    anime.inMyList = window.myList.includes(anime.id);
    anime.inFavorites = window.favorites.includes(anime.id);
    
    // Crear la tarjeta de anime
    const animeCard = document.createElement('div');
    animeCard.className = 'anime-card';
    animeCard.dataset.animeId = anime.id;
    
    // Crear el contenido de la tarjeta
    animeCard.innerHTML = `
        <div class="anime-poster">
            ${anime.inMyList ? `<div class="in-list-corner">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="false" role="img">
                    <path d="M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"></path>
                </svg>
            </div>` : ''}
            <img src="${anime.poster || anime.image}" alt="${anime.title}" loading="lazy">
            <div class="anime-overlay">
                <div class="overlay-title">${anime.title}</div>
                <div class="overlay-details">
                    ${anime.seasons.length} Temporada${anime.seasons.length > 1 ? 's' : ''} | 
                    ${getTotalEpisodes(anime)} Episodio${getTotalEpisodes(anime) > 1 ? 's' : ''}
                </div>
                <div class="overlay-description">
                    ${anime.description || 'No hay descripción disponible.'}
                </div>
            </div>
        </div>
        <div class="anime-info">
            <h3>${anime.title}</h3>
            <div class="anime-subtitle">
                ${anime.subtitled && anime.dubbed ? '<span class="sub">Sub</span> | <span class="dob">Dob</span>' :
                  anime.subtitled ? '<span class="sub">Subtitulado</span>' :
                  anime.dubbed ? '<span class="dob">Doblado</span>' : ''}
            </div>
            <div class="anime-actions info-actions">
                <button class="action-button play-button" data-anime-id="${anime.id}" title="">
                    <span class="tooltip">Reproducir</span>
                    <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-t="play-svg" aria-hidden="false" role="img">
                        <path d="M5.944 3C5.385 3 5 3.445 5 4.22v16.018c0 .771.384 1.22.945 1.22.234 0 .499-.078.779-.243l13.553-7.972c.949-.558.952-1.468 0-2.028L6.724 3.243C6.444 3.078 6.178 3 5.944 3m1.057 2.726l11.054 6.503L7 18.732l.001-13.006"></path>
                    </svg>
                </button>
                <button class="action-button favorite-button ${anime.inFavorites ? 'in-favorites' : ''}" data-anime-id="${anime.id}" title="">
                    <span class="tooltip">${anime.inFavorites ? 'Quitar de favoritos' : 'Añadir a favoritos'}</span>
                    <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-t="${anime.inFavorites ? 'favorite-filled-svg' : 'favorite-svg'}" aria-hidden="true" role="img">
                        <path d="${anime.inFavorites ? 'M12.078 5.446C10.801 3.816 9.156 3 7.144 3 3.818 3 1.426 6.285 2.26 9.924c.785 3.422 4.058 7.114 9.818 11.076 5.608-3.613 8.845-7.305 9.711-11.076C22.706 5.935 20.244 3 16.965 3c-1.927 0-3.556.815-4.887 2.446z' : 'M19.84 9.476C20.442 6.858 19.07 5 16.965 5c-1.31 0-2.377.534-3.337 1.71L12.046 8.65l-1.542-1.97C9.602 5.53 8.536 5 7.144 5 5.132 5 3.658 7.07 4.21 9.477c.601 2.623 3.21 5.702 7.901 9.099 4.512-3.103 7.054-6.163 7.73-9.1zM16.965 3c3.279 0 5.741 2.935 4.824 6.924-.866 3.77-4.103 7.463-9.71 11.076-5.761-3.962-9.034-7.654-9.819-11.076C1.426 6.285 3.818 3 7.144 3c1.322 0 2.485.352 3.49 1.055l-.105.127.282.002c.456.346.879.766 1.267 1.262a7.499 7.499 0 0 1 1.264-1.236l.31.003a9.964 9.964 0 0 0-.115-.146C14.549 3.356 15.692 3 16.965 3z'}"></path>
                    </svg>
                </button>
                <button class="action-button watchlist-button ${anime.inMyList ? 'in-list' : ''}" data-anime-id="${anime.id}" title="">
                    <span class="tooltip">${anime.inMyList ? 'Eliminar de Ureshiilist' : 'Agregar a Ureshiilist'}</span>
                    <svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-t="${anime.inMyList ? 'watchlist-filled-svg' : 'watchlist-svg'}" aria-hidden="false" role="img">
                        <path d="${anime.inMyList ? 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z' : 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z'}"></path>
                    </svg>
                </button>
            </div>
        </div>
    `;
    
    // Añadir evento para mostrar detalles al hacer clic en la tarjeta
    animeCard.addEventListener('click', (e) => {
        // Si se hizo clic en algún botón de acción, no mostrar detalles
        if (e.target.closest('.action-button')) {
            return;
        }
        
        // Redirigir a la página de detalles del anime
        window.location.href = `anime.html?id=${anime.id}`;
    });
    
    // Añadir evento para el botón de reproducir
    const playButton = animeCard.querySelector('.play-button');
    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que se propague al animeCard
        window.location.href = `anime.html?id=${anime.id}`;
    });
    
    // Añadir evento para el botón de favoritos
    const favoriteButton = animeCard.querySelector('.favorite-button');
    favoriteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que se propague al animeCard
        toggleFavorites(anime.id);
    });
    
    // Añadir evento para el botón de lista de seguimiento
    const watchlistButton = animeCard.querySelector('.watchlist-button');
    watchlistButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evitar que se propague al animeCard
        if (typeof window.addToUreshiiList === 'function') {
            window.addToUreshiiList(anime.id);
        } else {
            toggleMyList(anime.id);
        }
    });
    
    return animeCard;
}

// Función para añadir/quitar anime de "Mi lista"
function toggleMyList(animeId) {
    const index = myList.indexOf(animeId);
    const anime = animeData.find(a => a.id === animeId);
    
    if (index === -1) {
        // Añadir a la lista
        myList.push(animeId);
        anime.inMyList = true;
    } else {
        // Quitar de la lista
        myList.splice(index, 1);
        anime.inMyList = false;
    }
    
    // Guardar en localStorage
    localStorage.setItem(MY_LIST_KEY, JSON.stringify(myList));
    
    // Actualizar los botones de "añadir a lista"
    const addToListButtons = document.querySelectorAll(`.add-to-list[data-anime-id="${animeId}"]`);
    addToListButtons.forEach(button => {
        if (anime.inMyList) {
            button.classList.add('in-list');
        } else {
            button.classList.remove('in-list');
        }
    });
    
    // Actualizar los botones de watchlist
    const watchlistButtons = document.querySelectorAll(`.watchlist-button[data-anime-id="${animeId}"]`);
    watchlistButtons.forEach(button => {
        if (anime.inMyList) {
            button.classList.add('in-list');
            button.querySelector('.tooltip').textContent = 'Eliminar de Ureshiilist';
            button.querySelector('svg').setAttribute('data-t', 'watchlist-filled-svg');
            button.querySelector('path').setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
        } else {
            button.classList.remove('in-list');
            button.querySelector('.tooltip').textContent = 'Agregar a Ureshiilist';
            button.querySelector('svg').setAttribute('data-t', 'watchlist-svg');
            button.querySelector('path').setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
        }
    });
    

    // Actualizar los indicadores triangulares en la esquina superior derecha
    const animeCards = document.querySelectorAll(`.anime-card[data-anime-id="${animeId}"]`);
    animeCards.forEach(card => {
        const poster = card.querySelector('.anime-poster');
        let corner = poster.querySelector('.in-list-corner');
        
        if (anime.inMyList) {
            // Si no existe el indicador triangular, crearlo
            if (!corner) {
                corner = document.createElement('div');
                corner.className = 'in-list-corner';
                corner.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="false" role="img">
                    <path d="M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"></path>
                </svg>`;
                poster.insertBefore(corner, poster.firstChild);
            }
        } else {
            // Si existe el indicador triangular, eliminarlo
            if (corner) {
                corner.remove();
            }
        }
        
        // Actualizar el botón de watchlist si existe
        const watchlistButton = card.querySelector('.watchlist-button');
        if (watchlistButton) {
            if (inList) {
                watchlistButton.classList.add('in-list');
                watchlistButton.querySelector('.tooltip').textContent = 'Eliminar de Ureshiilist';
                watchlistButton.querySelector('svg').setAttribute('data-t', 'watchlist-filled-svg');
                watchlistButton.querySelector('svg path').setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            } else {
                watchlistButton.classList.remove('in-list');
                watchlistButton.querySelector('.tooltip').textContent = 'Agregar a Ureshiilist';
                watchlistButton.querySelector('svg').setAttribute('data-t', 'watchlist-svg');
                watchlistButton.querySelector('svg path').setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            }
            
            // Actualizar el evento de clic para siempre abrir el modal de gestión
            watchlistButton.replaceWith(watchlistButton.cloneNode(true));
            const newWatchlistButton = card.querySelector('.watchlist-button');
            newWatchlistButton.addEventListener('click', (e) => {
                e.stopPropagation();
                window.addToUreshiiList(animeId); // Siempre llamamos a addToUreshiiList
            });
        }
        
        
        // Actualizar también los botones del slider y botones fijos (cambiar la clase, el SVG y el tooltip)
        const sliderButtons = document.querySelectorAll(`.hero-slide-button.add-button[data-anime-id="${animeId}"], .fixed-buttons-container .hero-slide-button.add-button[data-anime-id="${animeId}"]`);
        sliderButtons.forEach(button => {
            if (inList) {
                button.classList.add('in-list');
                // Actualizar el tooltip y el SVG
                const tooltip = button.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = 'Eliminar de la lista';
                }
                // Reemplazar el SVG completo
                button.innerHTML = `<span class="tooltip">Eliminar de la lista</span><svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"></path></svg>`;
            } else {
                button.classList.remove('in-list');
                // Actualizar el tooltip y el SVG
                const tooltip = button.querySelector('.tooltip');
                if (tooltip) {
                    tooltip.textContent = 'Agregar a Ureshiilist';
                }
                // Reemplazar el SVG completo
                button.innerHTML = `<span class="tooltip">Agregar a Ureshiilist</span><svg class="action-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"></path></svg>`;
            }
            
            // Restaurar el evento de clic
            button.onclick = (e) => {
                e.stopPropagation();
                // Usar addToUreshiiList para gestión completa de listas
                if (typeof window.addToUreshiiList === 'function') {
                    window.addToUreshiiList(animeId);
                } else {
                    // Fallback a toggleMyList si addToUreshiiList no está disponible
                    toggleMyList(animeId);
                }
            };
        });
    });
    
    // Actualizar cualquier otro elemento SVG que pueda estar en la página
    // Esto asegura que todos los SVGs se actualicen correctamente
    const allSvgButtons = document.querySelectorAll(`[data-anime-id="${animeId}"] svg`);
    allSvgButtons.forEach(svg => {
        const button = svg.closest('[data-anime-id]');
        if (button) {
            const buttonType = button.classList.contains('watchlist-button') ? 'watchlist' : 
                             button.classList.contains('favorite-button') ? 'favorite' : '';
            
            if (buttonType === 'watchlist') {
                if (inList) {
                    svg.setAttribute('data-t', 'watchlist-filled-svg');
                    const path = svg.querySelector('path');
                    if (path) {
                        path.setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
                    }
                } else {
                    svg.setAttribute('data-t', 'watchlist-svg');
                    const path = svg.querySelector('path');
                    if (path) {
                        path.setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
                    }
                }
            }
        }
    });
}

// Función para añadir/quitar anime de "Favoritos"
function toggleFavorites(animeId) {
    const index = favorites.indexOf(animeId);
    const anime = animeData.find(a => a.id === animeId);
    
    if (index === -1) {
        // Añadir a favoritos
        favorites.push(animeId);
        anime.inFavorites = true;
    } else {
        // Quitar de favoritos
        favorites.splice(index, 1);
        anime.inFavorites = false;
        
        // Mostrar notificación al eliminar de favoritos
        showFavoritesNotification();
    }
    
    // Guardar en localStorage
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    
    // Actualizar los botones de favoritos
    const favoriteButtons = document.querySelectorAll(`.favorite-button[data-anime-id="${animeId}"]`);
    favoriteButtons.forEach(button => {
        if (anime.inFavorites) {
            button.classList.add('in-favorites');
            button.querySelector('.tooltip').textContent = 'Quitar de favoritos';
            button.querySelector('svg').setAttribute('data-t', 'favorite-filled-svg');
            button.querySelector('path').setAttribute('d', 'M12.078 5.446C10.801 3.816 9.156 3 7.144 3 3.818 3 1.426 6.285 2.26 9.924c.785 3.422 4.058 7.114 9.818 11.076 5.608-3.613 8.845-7.305 9.711-11.076C22.706 5.935 20.244 3 16.965 3c-1.927 0-3.556.815-4.887 2.446z');
        } else {
            button.classList.remove('in-favorites');
            button.querySelector('.tooltip').textContent = 'Añadir a favoritos';
            button.querySelector('svg').setAttribute('data-t', 'favorite-svg');
            button.querySelector('path').setAttribute('d', 'M19.84 9.476C20.442 6.858 19.07 5 16.965 5c-1.31 0-2.377.534-3.337 1.71L12.046 8.65l-1.542-1.97C9.602 5.53 8.536 5 7.144 5 5.132 5 3.658 7.07 4.21 9.477c.601 2.623 3.21 5.702 7.901 9.099 4.512-3.103 7.054-6.163 7.73-9.1zM16.965 3c3.279 0 5.741 2.935 4.824 6.924-.866 3.77-4.103 7.463-9.71 11.076-5.761-3.962-9.034-7.654-9.819-11.076C1.426 6.285 3.818 3 7.144 3c1.322 0 2.485.352 3.49 1.055l-.105.127.282.002c.456.346.879.766 1.267 1.262a7.499 7.499 0 0 1 1.264-1.236l.31.003a9.964 9.964 0 0 0-.115-.146C14.549 3.356 15.692 3 16.965 3z');
        }
    });
    
    // Actualizar la visualización si es necesario
    if (typeof displayAnimes === 'function') {
        displayAnimes();
    }
}

// Función para mostrar la notificación de eliminación de favoritos
function showFavoritesNotification() {
    const notification = document.getElementById('favorites-notification');
    if (notification) {
        notification.classList.add('show');
        
        // Ocultar la notificación después de 6 segundos (aumentado de 3 a 6 segundos)
        setTimeout(() => {
            notification.classList.remove('show');
        }, 6000);
    }
}

// Función para añadir anime a UreshiiLista (modificada para gestión)
window.addToUreshiiList = function addToUreshiiList(animeId) {
    // Cargar las listas desde localStorage
    const URESHII_LISTS_KEY = 'anime-ureshii-lists';
    let ureshiiLists = (window.safeParseLocalStorage || function(key, def) { 
        try { return JSON.parse(localStorage.getItem(key)) || def; } 
        catch(e) { return def; }
    })(URESHII_LISTS_KEY, []);
    
    // Si no hay listas, redirigir a la página de listas
    if (ureshiiLists.length === 0) {
        window.location.href = 'ureshiilists.html?action=addToList&animeId=' + animeId;
        return;
    }
    
    // Crear modal dinámicamente si no existe
    let addToListModal = document.getElementById('add-to-list-modal');
    if (!addToListModal) {
        // Crear el modal
        addToListModal = document.createElement('div');
        addToListModal.id = 'add-to-list-modal';
        addToListModal.className = 'modal';
        
        // Crear contenido del modal
        addToListModal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="modal-header">
                    <h3>Gestión de UreshiiListas</h3>
                </div>
                <div class="modal-body">
                    <button id="create-new-list-button" class="create-new-list-button">CREAR UNA NUEVA LISTA</button>
                    <div id="lists-container" class="lists-container">
                        <!-- Las listas se generarán dinámicamente aquí -->
                    </div>
                </div>
            </div>
        `;
        
        // Añadir el modal al body
        document.body.appendChild(addToListModal);
        
        // Mostrar el modal
        addToListModal.style.display = 'flex';
        document.body.classList.add('modal-open'); // Asegurar que el scroll esté deshabilitado
        
        // Añadir evento para cerrar el modal
    const closeButton = addToListModal.querySelector('.close');
    closeButton.addEventListener('click', () => {
        addToListModal.classList.add('fade-out');
        setTimeout(() => {
            addToListModal.style.display = 'none';
            addToListModal.classList.remove('fade-out');
            document.body.classList.remove('modal-open'); // Quitar clase para habilitar scroll
            updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
        }, 300);
    });
        
        // Cerrar modal al hacer clic fuera del contenido
        addToListModal.addEventListener('click', (e) => {
            if (e.target === addToListModal) {
                addToListModal.classList.add('fade-out');
                setTimeout(() => {
                    addToListModal.style.display = 'none';
                    addToListModal.classList.remove('fade-out');
                    document.body.classList.remove('modal-open'); // Quitar clase para habilitar scroll
                    updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
                }, 300);
            }
        });
        
        // Añadir evento para crear nueva lista
        const createNewListButton = addToListModal.querySelector('#create-new-list-button');
        createNewListButton.addEventListener('click', () => {
            window.location.href = 'ureshiilists.html?action=createList&animeId=' + animeId;
        });
    }
    
    // Generar elementos para cada lista
    const listsContainer = addToListModal.querySelector('#lists-container');
    listsContainer.innerHTML = '';
    
    ureshiiLists.forEach(list => {
        const listItem = document.createElement('div');
        listItem.className = 'list-item';
        
        const listInfo = document.createElement('div');
        listInfo.className = 'list-info';
        
        const listName = document.createElement('div');
        listName.className = 'list-name';
        listName.textContent = list.name;
        
        const listCount = document.createElement('div');
        listCount.className = 'list-count';
        listCount.textContent = `${list.items.length} elementos`;
        
        const listActions = document.createElement('div');
        listActions.className = 'list-actions';
        
        // Botón de añadir
        const addButton = document.createElement('button');
        addButton.className = 'add-to-list-button';
        
        // Verificar si el anime está en esta lista
        const animeInList = list.items.includes(Number(animeId));
        
        // Usar el SVG proporcionado en lugar del signo '+'
        addButton.innerHTML = `<svg class="tooltip-icon__action-icon--toIky" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-t="add-svg" aria-hidden="false" role="img" aria-labelledby="add-svg-${animeId}-${list.id}"><title id="add-svg-${animeId}-${list.id}">Añadir</title><path d="M13 3v8h8v2h-8v8h-2v-8H3v-2h8V3z"></path></svg>`;
        
        // Si el anime ya está en la lista, bajar la opacidad y desactivar interacciones
        if (animeInList) {
            addButton.classList.add('in-list');
            addButton.style.opacity = '0.5';
            addButton.style.pointerEvents = 'none';
        }
        
        addButton.addEventListener('click', (e) => {
            e.preventDefault(); // Prevenir comportamiento por defecto
            e.stopPropagation(); // Detener propagación del evento
            
            // Añadir anime a la lista
            if (!list.items.includes(Number(animeId))) {
                list.items.push(Number(animeId));
                list.updatedAt = new Date().toISOString();
                
                // Guardar en localStorage
                localStorage.setItem(URESHII_LISTS_KEY, JSON.stringify(ureshiiLists));
                
                // Actualizar myList y animeData para reflejar que el anime está en una lista
                const MY_LIST_KEY = 'anime-my-list';
                let myList = (window.safeParseLocalStorage || function(key, def) { 
        try { return JSON.parse(localStorage.getItem(key)) || def; } 
        catch(e) { return def; }
    })(MY_LIST_KEY, []);
                if (!myList.includes(Number(animeId))) {
                    myList.push(Number(animeId));
                    localStorage.setItem(MY_LIST_KEY, JSON.stringify(myList));
                }
                
                // Actualizar el estado del anime en animeData
                const anime = animeData.find(a => Number(a.id) === Number(animeId));
                if (anime) {
                    anime.inMyList = true;
                }
                
                // Actualizar los indicadores visuales con un pequeño delay para asegurar que el DOM esté listo
                updateVisualIndicators(animeId, true);
                
                // Mostrar notificación
                showNotification('Añadido a la lista ' + list.name);
                
                // Actualizar el botón de eliminar para que ya no esté deshabilitado
                const deleteButton = listItem.querySelector('.delete-from-list-button');
                if (deleteButton) {
                    deleteButton.classList.remove('disabled');
                }
            }
            
            // Cerrar modal con animación y reactivar scroll
            addToListModal.classList.add('fade-out');
            setTimeout(() => {
                addToListModal.style.display = 'none';
                addToListModal.classList.remove('fade-out');
                document.body.classList.remove('modal-open'); // Reactivar scroll
                updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
            }, 300);
        });
        
        // Botón de eliminar
        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-from-list-button';
        // Verificar si el anime está en esta lista
        if (!animeInList) {
            deleteButton.classList.add('disabled');
        }
        
        deleteButton.innerHTML = `<svg class="custom-list-card-delete-button__icon--pENvJ" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-t="trash-svg" aria-hidden="true" role="img"><path d="M13 2h-2a1 1 0 0 0-1 1v1H4a1 1 0 0 0 0 2h1v15a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6h1a1 1 0 1 0 0-2h-6V3a1 1 0 0 0-1-1m-1 2v2h5v14H7V6h5V4zm-2 5a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1zm4 0a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0v-6a1 1 0 0 0-1-1z"></path></svg>`;
        
        // Solo añadir el evento si el anime está en la lista
        if (animeInList) {
            deleteButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevenir comportamiento por defecto
                e.stopPropagation(); // Detener propagación del evento
                
                // Eliminar anime de la lista
                const index = list.items.indexOf(Number(animeId));
                if (index > -1) {
                    list.items.splice(index, 1);
                    list.updatedAt = new Date().toISOString();
                    
                    // Guardar en localStorage
                    localStorage.setItem(URESHII_LISTS_KEY, JSON.stringify(ureshiiLists));
                    
                    // Verificar si el anime está en alguna otra lista
                    const isInAnyList = ureshiiLists.some(l => l.items.includes(Number(animeId)));
                    
                    // Actualizar el estado del anime en animeData
                    const anime = animeData.find(a => Number(a.id) === Number(animeId));
                    if (anime) {
                        anime.inMyList = isInAnyList;
                    }
                    
                    // Si no está en ninguna otra lista, eliminarlo de myList
                    if (!isInAnyList) {
                        const myListIndex = window.myList.indexOf(Number(animeId));
                        if (myListIndex > -1) {
                            window.myList.splice(myListIndex, 1);
                            localStorage.setItem(MY_LIST_KEY, JSON.stringify(window.myList));
                        }
                    }
                    
                    // SIEMPRE actualizar los indicadores visuales después de eliminar
                    updateVisualIndicators(animeId, isInAnyList);
                    
                    // Mostrar notificación
                    showNotification('Eliminado de la lista ' + list.name);
                    
                    // Cerrar modal con animación y reactivar scroll
                    addToListModal.classList.add('fade-out');
                    setTimeout(() => {
                        addToListModal.style.display = 'none';
                        addToListModal.classList.remove('fade-out');
                        document.body.classList.remove('modal-open'); // Reactivar scroll
                        updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
                    }, 300);
                }
            });
        }
        
        listInfo.appendChild(listName);
        listInfo.appendChild(listCount);
        
        listActions.appendChild(addButton);
        listActions.appendChild(deleteButton);
        
        listItem.appendChild(listInfo);
        listItem.appendChild(listActions);
        
        listsContainer.appendChild(listItem);
    });
    
    // Mostrar modal
    addToListModal.style.display = 'flex'; // Cambiado de 'block' a 'flex' para mejor centrado
    document.body.classList.add('modal-open'); // Asegurar que el scroll esté deshabilitado
    
    // Añadir evento para cerrar el modal
    const closeButton = addToListModal.querySelector('.close');
    closeButton.addEventListener('click', () => {
        addToListModal.classList.add('fade-out');
        setTimeout(() => {
            addToListModal.style.display = 'none';
            addToListModal.classList.remove('fade-out');
            document.body.classList.remove('modal-open'); // Quitar clase para habilitar scroll
            updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
        }, 300);
    });
    
    // Cerrar modal al hacer clic fuera del contenido
    addToListModal.addEventListener('click', (e) => {
        if (e.target === addToListModal) {
            addToListModal.classList.add('fade-out');
            setTimeout(() => {
                addToListModal.style.display = 'none';
                addToListModal.classList.remove('fade-out');
                document.body.classList.remove('modal-open'); // Quitar clase para habilitar scroll
                updateVisualStateOnModalClose(animeId); // Verificar estado y actualizar visuales
            }, 300);
        }
    });
    
    // Añadir evento para crear nueva lista
    const createNewListButton = addToListModal.querySelector('#create-new-list-button');
    createNewListButton.addEventListener('click', () => {
        window.location.href = 'ureshiilists.html?action=createList&animeId=' + animeId;
    });
}

// Función para mostrar notificación
function showNotification(message) {
    // Crear notificación si no existe
    let notification = document.getElementById('ureshii-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'ureshii-notification';
        notification.className = 'favorites-notification';
        notification.innerHTML = `<div class="favorites-notification-content">${message}</div>`;
        
        document.body.appendChild(notification);
    } else {
        notification.querySelector('.favorites-notification-content').textContent = message;
    }
    
    // Mostrar notificación con animación desde arriba
    notification.classList.remove('hide');
    notification.classList.remove('show');
    
    // Forzar un reflow para que el navegador aplique los estilos iniciales
    void notification.offsetWidth;
    
    // Añadir la clase show después de un pequeño retraso para permitir la animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ocultar después de 6 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // Eliminar la clase hide después de la animación
        setTimeout(() => {
            notification.classList.remove('hide');
        }, 300);
    }, 6000);
}

// Modificar la función toggleMyList para usar la nueva funcionalidad
function toggleMyList(animeId) {
    // Siempre mostrar el modal de gestión, independientemente de si el anime está en la lista o no
    addToUreshiiList(animeId);
}



// Función para mostrar notificación
function showNotification(message) {
    // Crear notificación si no existe
    let notification = document.getElementById('ureshii-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'ureshii-notification';
        notification.className = 'favorites-notification';
        notification.innerHTML = `<div class="favorites-notification-content">${message}</div>`;
        
        document.body.appendChild(notification);
    } else {
        notification.querySelector('.favorites-notification-content').textContent = message;
    }
    
    // Mostrar notificación con animación desde arriba
    notification.classList.remove('hide');
    notification.classList.remove('show');
    
    // Forzar un reflow para que el navegador aplique los estilos iniciales
    void notification.offsetWidth;
    
    // Añadir la clase show después de un pequeño retraso para permitir la animación
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Ocultar después de 6 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        // Eliminar la clase hide después de la animación
        setTimeout(() => {
            notification.classList.remove('hide');
        }, 300);
    }, 6000);
}

// Añadir esta función al inicio del archivo cards.js
function syncAnimeListState() {
    // Obtener la lista de animes guardados
    const MY_LIST_KEY = 'anime-my-list';
    const myList = (window.safeParseLocalStorage || function(key, def) { 
        try { return JSON.parse(localStorage.getItem(key)) || def; } 
        catch(e) { return def; }
    })(MY_LIST_KEY, []);
    
    // Actualizar el estado inMyList en animeData
    if (typeof animeData !== 'undefined' && Array.isArray(animeData)) {
        animeData.forEach(anime => {
            // Convertir IDs a string para comparación consistente
            const wasInList = anime.inMyList;
            anime.inMyList = myList.some(id => String(id) === String(anime.id));
            
            // Si el estado cambió, actualizar los indicadores visuales
            if (wasInList !== anime.inMyList) {
                updateVisualIndicators(anime.id, anime.inMyList);
            }
        });
        console.log('Estado de animes sincronizado con localStorage');
    }
}

// Llamar a esta función al cargar la página
document.addEventListener('DOMContentLoaded', function() {
    syncAnimeListState();
});

// Exponer la función updateVisualIndicators globalmente
window.updateVisualIndicators = updateVisualIndicators;

// Función para actualizar el estado visual después de cerrar el modal
// Función duplicada eliminada - se mantiene la definición más completa al final del archivo

// Añadir este código al final del archivo cards.js
window.addEventListener('storage', function(e) {
    // Detectar cambios en las listas
    if (e.key === 'anime-my-list' || e.key === 'anime-ureshii-lists') {
        console.log('Detectado cambio en localStorage:', e.key);
        
        // Sincronizar estado
        syncAnimeListState();
        
        // Actualizar visualización si la función existe
        if (typeof displayAnimes === 'function') {
            displayAnimes();
        }
    }
});


// Función para actualizar los indicadores visuales de un anime
function updateVisualIndicators(animeId, inList) {
    // Actualizar el estado en animeData si está disponible
    if (typeof animeData !== 'undefined' && Array.isArray(animeData)) {
        const anime = animeData.find(a => String(a.id) === String(animeId));
        if (anime) {
            anime.inMyList = inList;
        }
    }
    
    // Función para actualizar un botón específico del slider
    function updateSliderButton(button) {
        if (inList) {
            button.classList.add('in-list');
            // Actualizar el tooltip
            const tooltip = button.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'Eliminar de la lista';
            }
            // Actualizar solo el SVG path sin reemplazar todo el innerHTML
            const svg = button.querySelector('svg');
            const path = svg ? svg.querySelector('path') : null;
            if (path) {
                path.setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            }
        } else {
            button.classList.remove('in-list');
            // Actualizar el tooltip
            const tooltip = button.querySelector('.tooltip');
            if (tooltip) {
                tooltip.textContent = 'Agregar a Ureshiilist';
            }
            // Actualizar solo el SVG path sin reemplazar todo el innerHTML
            const svg = button.querySelector('svg');
            const path = svg ? svg.querySelector('path') : null;
            if (path) {
                path.setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            }
        }
    }
    
    // Función para actualizar los botones del slider con múltiples intentos
    function updateSliderButtons() {
        const sliderButtons = document.querySelectorAll(`.hero-slide-button.add-button[data-anime-id="${animeId}"], .fixed-buttons-container .hero-slide-button.add-button[data-anime-id="${animeId}"]`);
        
        sliderButtons.forEach(button => {
            updateSliderButton(button);
        });
        
        return sliderButtons.length > 0;
    }
    
    // Configurar un MutationObserver para detectar cuando se agregan nuevos botones
    function setupSliderObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar si el nodo agregado es un botón del slider que nos interesa
                        if (node.matches && node.matches(`.hero-slide-button.add-button[data-anime-id="${animeId}"]`)) {
                            updateSliderButton(node);
                        }
                        // También verificar en los hijos del nodo agregado
                        const childButtons = node.querySelectorAll ? node.querySelectorAll(`.hero-slide-button.add-button[data-anime-id="${animeId}"]`) : [];
                        childButtons.forEach(button => {
                            updateSliderButton(button);
                        });
                    }
                });
            });
        });
        
        // Observar cambios en todo el documento
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Desconectar el observer después de 5 segundos para evitar overhead
        setTimeout(() => {
            observer.disconnect();
        }, 5000);
    }
    
    // Actualizar los elementos visuales en la página
    const animeCards = document.querySelectorAll(`.anime-card[data-anime-id="${animeId}"]`);
    
    animeCards.forEach(card => {
        // Actualizar el indicador triangular
        let cornerIndicator = card.querySelector('.in-list-corner');
        
        if (inList) {
            // Si debe estar en la lista pero no tiene el indicador, añadirlo
            if (!cornerIndicator) {
                cornerIndicator = document.createElement('div');
                cornerIndicator.className = 'in-list-corner';
                cornerIndicator.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="false" role="img">
                        <path d="M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"></path>
                    </svg>
                `;
                const posterElement = card.querySelector('.anime-poster');
                if (posterElement) {
                    posterElement.insertBefore(cornerIndicator, posterElement.firstChild);
                }
            }
        } else {
            // Si no debe estar en la lista pero tiene el indicador, quitarlo
            if (cornerIndicator) {
                cornerIndicator.remove();
            }
        }
        
        // Actualizar el botón de watchlist si existe
        const watchlistButton = card.querySelector('.watchlist-button');
        if (watchlistButton) {
            if (inList) {
                watchlistButton.classList.add('in-list');
                watchlistButton.querySelector('.tooltip').textContent = 'Eliminar de Ureshiilist';
                watchlistButton.querySelector('svg').setAttribute('data-t', 'watchlist-filled-svg');
                watchlistButton.querySelector('svg path').setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            } else {
                watchlistButton.classList.remove('in-list');
                watchlistButton.querySelector('.tooltip').textContent = 'Agregar a Ureshiilist';
                watchlistButton.querySelector('svg').setAttribute('data-t', 'watchlist-svg');
                watchlistButton.querySelector('svg path').setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
            }
            
            // Actualizar el evento de clic para siempre abrir el modal de gestión
            watchlistButton.replaceWith(watchlistButton.cloneNode(true));
            const newWatchlistButton = card.querySelector('.watchlist-button');
            newWatchlistButton.addEventListener('click', (e) => {
                e.stopPropagation();
                addToUreshiiList(animeId); // Siempre llamamos a addToUreshiiList
            });
        }
    });
    
    // Actualizar los botones del slider existentes
    updateSliderButtons();
    
    // Configurar el observer para detectar cuando se agreguen nuevos botones
    setupSliderObserver();
    
    // También intentar actualizar después de que se complete el renderizado
    requestAnimationFrame(() => {
        updateSliderButtons();
    });
    
    // Disparar un evento personalizado para notificar la actualización
    const updateEvent = new CustomEvent('animeListUpdated', {
        detail: { animeId: animeId, inList: inList }
    });
    document.dispatchEvent(updateEvent);
    
    // Forzar actualización directa de todos los elementos con el anime ID
    setTimeout(() => {
        // Buscar específicamente en el slider hero
        const heroSlider = document.querySelector('.hero-slider');
        if (heroSlider) {
            const heroButtons = heroSlider.querySelectorAll(`.hero-slide-button.add-button[data-anime-id="${animeId}"]`);
            heroButtons.forEach(button => updateSliderButton(button));
        }
        
        // Buscar en el contenedor de botones fijos
        const fixedContainer = document.querySelector('.fixed-buttons-container');
        if (fixedContainer) {
            const fixedButtons = fixedContainer.querySelectorAll(`.hero-slide-button.add-button[data-anime-id="${animeId}"]`);
            fixedButtons.forEach(button => updateSliderButton(button));
        }
    }, 100);
    
    // Actualizar cualquier otro elemento SVG que pueda estar en la página
    // Esto asegura que todos los SVGs se actualicen correctamente
    const allSvgButtons = document.querySelectorAll(`[data-anime-id="${animeId}"] svg`);
    allSvgButtons.forEach(svg => {
        const button = svg.closest('[data-anime-id]');
        if (button) {
            const buttonType = button.classList.contains('watchlist-button') ? 'watchlist' : 
                             button.classList.contains('favorite-button') ? 'favorite' : '';
            
            if (buttonType === 'watchlist') {
                if (inList) {
                    svg.setAttribute('data-t', 'watchlist-filled-svg');
                    const path = svg.querySelector('path');
                    if (path) {
                        path.setAttribute('d', 'M18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
                    }
                } else {
                    svg.setAttribute('data-t', 'watchlist-svg');
                    const path = svg.querySelector('path');
                    if (path) {
                        path.setAttribute('d', 'M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z');
                    }
                }
            }
        }
    });
}


// Función para verificar si un anime está en alguna lista
function isAnimeInAnyList(animeId) {
    const URESHII_LISTS_KEY = 'anime-ureshii-lists';
    const ureshiiLists = (window.safeParseLocalStorage || function(key, def) { 
        try { return JSON.parse(localStorage.getItem(key)) || def; } 
        catch(e) { return def; }
    })(URESHII_LISTS_KEY, []);
    return ureshiiLists.some(list => list.items.includes(Number(animeId)));
}

// Función para actualizar el estado visual al cerrar el modal
function updateVisualStateOnModalClose(animeId) {
    // Verificar si el anime está en alguna lista
    const inAnyList = isAnimeInAnyList(animeId);
    
    // Actualizar el estado en animeData
    const anime = animeData.find(a => Number(a.id) === Number(animeId));
    if (anime) {
        anime.inMyList = inAnyList;
    }
    
    // Actualizar myList en localStorage si es necesario
    const MY_LIST_KEY = 'anime-my-list';
    let myList = (window.safeParseLocalStorage || function(key, def) { 
        try { return JSON.parse(localStorage.getItem(key)) || def; } 
        catch(e) { return def; }
    })(MY_LIST_KEY, []);
    const inMyList = myList.includes(Number(animeId));
    
    if (inAnyList && !inMyList) {
        // Si está en alguna lista pero no en myList, añadirlo
        myList.push(Number(animeId));
        localStorage.setItem(MY_LIST_KEY, JSON.stringify(myList));
    } else if (!inAnyList && inMyList) {
        // Si no está en ninguna lista pero sí en myList, quitarlo
        const index = myList.indexOf(Number(animeId));
        if (index > -1) {
            myList.splice(index, 1);
            localStorage.setItem(MY_LIST_KEY, JSON.stringify(myList));
        }
    }
    
    // Los indicadores visuales ya se actualizaron inmediatamente después de la acción
    // No necesitamos llamar updateVisualIndicators aquí para evitar conflictos
}

// Exponer la función globalmente
window.updateVisualStateOnModalClose = updateVisualStateOnModalClose;
