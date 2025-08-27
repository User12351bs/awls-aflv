// Constantes para localStorage
const MY_LIST_KEY = 'anime-my-list';
const FAVORITES_KEY = 'anime-favorites';
const URESHII_LISTS_KEY = 'anime-ureshii-lists';
const WATCHED_EPISODES_KEY = 'anime-watched-episodes';
const WATCHING_ANIMES_KEY = 'anime-watching-animes';
const SEASON_COLLAPSE_KEY = 'anime-season-collapse';

// Constantes para sincronización


// Exportar las constantes para que sean accesibles desde otros archivos
window.MY_LIST_KEY = MY_LIST_KEY;
window.FAVORITES_KEY = FAVORITES_KEY;
window.URESHII_LISTS_KEY = URESHII_LISTS_KEY;
window.WATCHED_EPISODES_KEY = WATCHED_EPISODES_KEY;
window.WATCHING_ANIMES_KEY = WATCHING_ANIMES_KEY;
window.SEASON_COLLAPSE_KEY = SEASON_COLLAPSE_KEY;



// Variables para control de sincronización
let lastKnownDataHash = null;
let driveDataCache = {}; // Cache para datos de Google Drive
let isDriveConnected = false; // Estado de conexión con Google Drive

// Función para parsear localStorage de forma segura
function safeParseLocalStorage(key, defaultValue = []) {
    try {
        const item = localStorage.getItem(key);
        if (!item || item === 'null' || item === 'undefined') {
            return defaultValue;
        }
        return JSON.parse(item);
    } catch (error) {
        console.log(`Error parsing localStorage key ${key}:`, error);
        // Limpiar el valor corrupto
        localStorage.setItem(key, JSON.stringify(defaultValue));
        return defaultValue;
    }
}

// Función para verificar si Google Drive está conectado
function checkDriveConnection() {
    // Usar el sistema centralizado si está disponible
    if (typeof window.googleDrive !== 'undefined' && window.googleDrive.isConnected) {
        isDriveConnected = window.googleDrive.isConnected();
        console.log('Estado de conexión con Google Drive (centralizado):', isDriveConnected ? 'Conectado' : 'Desconectado');
        return isDriveConnected;
    }
    
    // Fallback al método anterior
    const token = localStorage.getItem('google_drive_token');
    const expiry = localStorage.getItem('google_drive_token_expiry');
    
    // Verificar si el token existe y no ha expirado
    let hasValidToken = false;
    if (token && expiry) {
        if (Date.now() <= parseInt(expiry)) {
            hasValidToken = true;
        } else {
            // Token expirado, limpiar storage
            console.log('Token de Google Drive expirado, limpiando...');
            localStorage.removeItem('google_drive_token');
            localStorage.removeItem('google_drive_token_expiry');
        }
    }
    
    // Si tenemos un token válido, consideramos que Drive está conectado
    // Las funciones de Drive se cargan dinámicamente cuando es necesario
    isDriveConnected = hasValidToken;
    console.log('Estado de conexión con Google Drive (fallback):', isDriveConnected ? 'Conectado' : 'Desconectado');
    return isDriveConnected;
}

// Función para cargar datos desde Google Drive
async function loadDataFromDrive(key) {
    if (!checkDriveConnection()) {
        return null;
    }
    
    try {
        // Si ya tenemos los datos en cache, usarlos
        if (driveDataCache[key]) {
            return driveDataCache[key];
        }
        
        // Cargar datos desde Google Drive usando el sistema centralizado
        if (typeof window.googleDrive !== 'undefined' && window.googleDrive.loadFromDrive) {
            await window.googleDrive.loadFromDrive();
            
            // Después de cargar, obtener los datos desde localStorage
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    // Actualizar cache
                    driveDataCache[key] = data;
                    return parsedData;
                } catch (e) {
                    console.log('Error parsing data from localStorage:', e);
                }
            }
        } else if (typeof window.loadFromDrive === 'function') {
            // Fallback al método anterior
            await window.loadFromDrive();
            
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsedData = JSON.parse(data);
                    driveDataCache[key] = data;
                    return parsedData;
                } catch (e) {
                    console.log('Error parsing data from localStorage:', e);
                }
            }
        }
    } catch (error) {
        console.log('Error loading from Drive:', error);
    }
    
    return null;
}










// Función para interceptar localStorage.getItem
function interceptLocalStorageReads() {
    const originalGetItem = localStorage.getItem;
    const syncKeys = [MY_LIST_KEY, FAVORITES_KEY, WATCHED_EPISODES_KEY, WATCHING_ANIMES_KEY, URESHII_LISTS_KEY];
    
    localStorage.getItem = function(key) {
        // Para claves de sincronización, intentar cargar desde Drive primero
        if (syncKeys.includes(key) && checkDriveConnection()) {
            // Usar datos del cache si están disponibles
            if (driveDataCache[key]) {
                return driveDataCache[key];
            }
            
            // Si no hay cache, cargar de forma asíncrona en background
            loadDataFromDrive(key).then(driveData => {
                if (driveData !== null) {
                    // Actualizar localStorage como respaldo
                    const originalSetItem = Storage.prototype.setItem;
                    originalSetItem.call(localStorage, key, driveData);
                    
                    // Disparar evento personalizado para notificar cambios
                    window.dispatchEvent(new CustomEvent('driveDataLoaded', {
                        detail: { key, data: driveData }
                    }));
                }
            }).catch(error => {
                console.log('Error loading from Drive in background:', error);
            });
        }
        
        // Retornar datos de localStorage (que puede haber sido actualizado desde Drive)
        return originalGetItem.call(this, key);
    };
}



// Función para invalidar el cache de Drive
function invalidateDriveCache() {
    driveDataCache = {};
    console.log('Cache de Google Drive invalidado');
}



// Función para cargar datos iniciales desde Google Drive
async function loadInitialDataFromDrive() {
    if (!checkDriveConnection()) {
        console.log('Google Drive no está conectado, usando localStorage');
        return;
    }
    
    try {
        console.log('Cargando datos iniciales desde Google Drive...');
        const syncKeys = [MY_LIST_KEY, FAVORITES_KEY, WATCHED_EPISODES_KEY, WATCHING_ANIMES_KEY, URESHII_LISTS_KEY];
        let dataLoaded = false;
        
        // Usar el sistema centralizado de Google Drive si está disponible
        if (typeof window.googleDrive !== 'undefined' && window.googleDrive.isConnected()) {
            console.log('Usando sistema centralizado de Google Drive para carga inicial...');
            
            // Esperar a que las APIs estén disponibles
            let attempts = 0;
            while (typeof gapi === 'undefined' && attempts < 10) {
                console.log('Esperando APIs de Google...');
                await new Promise(resolve => setTimeout(resolve, 500));
                attempts++;
            }
            
            if (typeof gapi !== 'undefined') {
                const driveData = await window.googleDrive.loadFromDrive();
                if (driveData) {
                    console.log('Datos cargados exitosamente desde Google Drive');
                    dataLoaded = true;
                    
                    // Actualizar cache con los datos cargados
                    syncKeys.forEach(key => {
                        const data = localStorage.getItem(key);
                        if (data && data !== 'null' && data !== '[]') {
                            driveDataCache[key] = data;
                        }
                    });
                }
            } else {
                console.log('APIs de Google no disponibles después de esperar');
            }
        } else {
            // Fallback: verificar datos existentes en localStorage
            console.log('Sistema centralizado no disponible, verificando localStorage...');
            
            syncKeys.forEach(key => {
                const data = localStorage.getItem(key);
                if (data && data !== 'null' && data !== '[]') {
                    console.log(`Datos encontrados en localStorage para: ${key}`);
                    dataLoaded = true;
                    driveDataCache[key] = data;
                }
            });
        }
        
        if (dataLoaded) {
            // Disparar evento para notificar que los datos están listos
            window.dispatchEvent(new CustomEvent('driveDataReady', {
                detail: { source: 'drive', keys: syncKeys }
            }));
            
            console.log('Datos iniciales listos');
        } else {
            console.log('No se encontraron datos. Usando valores por defecto.');
            // Inicializar con valores por defecto si no hay datos
            syncKeys.forEach(key => {
                if (!localStorage.getItem(key)) {
                    const defaultValue = key === WATCHED_EPISODES_KEY ? '{}' : '[]';
                    localStorage.setItem(key, defaultValue);
                }
            });
        }
    } catch (error) {
        console.log('Error cargando datos iniciales desde Drive:', error);
    }
}



// Función simplificada para cargar datos manualmente
function manualLoadFromDrive() {
    if (typeof window.googleDrive !== 'undefined' && window.googleDrive.isConnected()) {
        return window.googleDrive.loadFromDrive();
    }
    console.log('Google Drive no está conectado');
    return null;
}

// Función simplificada para guardar datos manualmente
function manualSaveToDrive() {
    if (typeof window.googleDrive !== 'undefined' && window.googleDrive.isConnected()) {
        return window.googleDrive.saveToDrive();
    }
    console.log('Google Drive no está conectado');
    return false;
}

// Función simplificada para inicializar el sistema manual
function initManualSync() {
    console.log('Inicializando sistema manual de Google Drive...');
    
    // Inicializar Google Drive si está disponible
    if (window.googleDrive && window.googleDrive.initialize) {
        window.googleDrive.initialize().then(() => {
            console.log('Google Drive inicializado correctamente desde localstorage.js');
        }).catch(error => {
            console.error('Error al inicializar Google Drive desde localstorage.js:', error);
        });
    } else {
        console.warn('Google Drive no disponible en initManualSync');
    }
}

// Función para mostrar notificaciones de sincronización
function showSyncNotification(message, type = 'info') {
    // Crear elemento de notificación si no existe
    let notification = document.getElementById('sync-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'sync-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            transform: translateX(100%);
        `;
        document.body.appendChild(notification);
    }
    
    // Configurar colores según el tipo
    const colors = {
        info: '#2196F3',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    notification.textContent = message;
    notification.style.transform = 'translateX(0)';
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        if (notification) {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification && notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
}



// Exportar funciones al objeto window para acceso global
window.safeParseLocalStorage = safeParseLocalStorage;
window.checkDriveConnection = checkDriveConnection;
window.manualLoadFromDrive = manualLoadFromDrive;
window.manualSaveToDrive = manualSaveToDrive;
window.initManualSync = initManualSync;

// Inicializar el sistema manual cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    initManualSync();
    
    // Sistema de auto-guardado cada 2-3 segundos
    setInterval(function() {
        if (checkDriveConnection()) {
            console.log('Auto-guardado ejecutándose...');
            manualSaveToDrive();
        }
    }, 2500); // 2.5 segundos
});