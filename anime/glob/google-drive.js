// ============================
// SISTEMA CENTRALIZADO DE GOOGLE DRIVE
// ============================

// Configuración de Google Drive
const CLIENT_ID = "288946566456-ld3hpv5pmej6nr64n3gn1n9o90btk7f6.apps.googleusercontent.com";
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_TOKEN_KEY = 'google_drive_token';
const GOOGLE_TOKEN_EXPIRY_KEY = 'google_drive_token_expiry';

// Variables globales
let accessToken = null;
let tokenClient = null;
let isGoogleAPILoaded = false;
let tokenRenewalInterval = null;

// ============================
// FUNCIONES DE TOKEN
// ============================

function saveTokenToStorage(token, expiresIn = 3600) {
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(GOOGLE_TOKEN_KEY, token);
    localStorage.setItem(GOOGLE_TOKEN_EXPIRY_KEY, expiryTime.toString());
    console.log('Token guardado en localStorage');
}

function getTokenFromStorage() {
    const token = localStorage.getItem(GOOGLE_TOKEN_KEY);
    const expiry = localStorage.getItem(GOOGLE_TOKEN_EXPIRY_KEY);
    
    if (!token || !expiry) return null;
    
    if (Date.now() > parseInt(expiry)) {
        // Token expirado, limpiar storage
        localStorage.removeItem(GOOGLE_TOKEN_KEY);
        localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
        console.log('Token expirado y eliminado');
        return null;
    }
    
    return token;
}

function clearTokenFromStorage() {
    localStorage.removeItem(GOOGLE_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_TOKEN_EXPIRY_KEY);
    localStorage.removeItem('google_account_hint');
    accessToken = null;
    console.log('Token eliminado del storage');
}

// ============================
// INICIALIZACIÓN DE GOOGLE API
// ============================

function initializeGoogleDrive() {
    return new Promise((resolve, reject) => {
        if (typeof gapi === 'undefined') {
            console.error('Google API no está disponible');
            reject(new Error('Google API no disponible'));
            return;
        }

        // Verificar si hay un token guardado
        const savedToken = getTokenFromStorage();
        if (savedToken) {
            accessToken = savedToken;
            console.log('Token válido encontrado en storage');
        }
        
        // Inicializar Google API client
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"]
                });
                
                // Inicializar Google Identity Services
                if (typeof google !== 'undefined' && google.accounts) {
                    tokenClient = google.accounts.oauth2.initTokenClient({
                        client_id: CLIENT_ID,
                        scope: SCOPES,
                        callback: (response) => {
                            if (response.error !== undefined) {
                                console.error('Error en autenticación:', response);
                                reject(new Error('Error de autenticación: ' + response.error));
                                return;
                            }
                            
                            accessToken = response.access_token;
                            saveTokenToStorage(accessToken, response.expires_in || 3600);
                            
                            if (response.hint) {
                                localStorage.setItem('google_account_hint', response.hint);
                            }
                            
                            console.log('Token obtenido/renovado exitosamente');
                            
                            // Disparar evento personalizado
                            window.dispatchEvent(new CustomEvent('googleDriveConnected', {
                                detail: { token: accessToken }
                            }));
                        }
                    });
                }
                
                isGoogleAPILoaded = true;
                console.log('Google Drive API inicializada correctamente');
                resolve(true);
                
            } catch (error) {
                console.error('Error al inicializar Google API:', error);
                reject(error);
            }
        });
    });
}

// ============================
// FUNCIONES DE AUTENTICACIÓN
// ============================

function signInToGoogleDrive() {
    if (!tokenClient) {
        console.error('Google API no está inicializada');
        return Promise.reject(new Error('Google API no inicializada'));
    }
    
    return new Promise((resolve, reject) => {
        // Configurar callback temporal para esta operación
        const originalCallback = tokenClient.callback;
        tokenClient.callback = (response) => {
            // Restaurar callback original
            tokenClient.callback = originalCallback;
            
            if (response.error !== undefined) {
                reject(new Error('Error de autenticación: ' + response.error));
                return;
            }
            
            accessToken = response.access_token;
            saveTokenToStorage(accessToken, response.expires_in || 3600);
            
            console.log('Inicio de sesión exitoso');
            resolve(accessToken);
        };
        
        tokenClient.requestAccessToken({prompt: 'consent'});
    });
}

function signOutFromGoogleDrive() {
    clearTokenFromStorage();
    
    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('googleDriveDisconnected'));
    
    console.log('Sesión cerrada correctamente');
    return Promise.resolve();
}

function isGoogleDriveConnected() {
    const token = getTokenFromStorage();
    return token !== null;
}

// ============================
// FUNCIONES DE SINCRONIZACIÓN
// ============================

async function saveToDrive(isAutoSync = false) {
    try {
        // Verificar que las APIs de Google estén disponibles
        if (typeof gapi === 'undefined' || !isGoogleAPILoaded) {
            console.warn('APIs de Google no están disponibles aún');
            return false;
        }
        
        // Verificar token
        const savedToken = getTokenFromStorage();
        if (!savedToken && !accessToken) {
            const error = new Error('No hay sesión activa con Google Drive');
            if (!isAutoSync) {
                console.error(error.message);
            }
            throw error;
        }
        
        if (savedToken && !accessToken) {
            accessToken = savedToken;
        }
        
        if (!isAutoSync) {
            console.log('Guardando datos en Google Drive...');
        }
        
        // Obtener datos desde localStorage usando las constantes globales
        const data = {
            watchedEpisodes: JSON.parse(localStorage.getItem(window.WATCHED_EPISODES_KEY) || '{}'),
            myList: JSON.parse(localStorage.getItem(window.MY_LIST_KEY) || '[]'),
            watchingAnimes: JSON.parse(localStorage.getItem(window.WATCHING_ANIMES_KEY) || '{}'),
            favorites: JSON.parse(localStorage.getItem(window.FAVORITES_KEY) || '[]'),
            ureshiiLists: JSON.parse(localStorage.getItem(window.URESHII_LISTS_KEY) || '[]'),
            timestamp: new Date().toISOString()
        };
        
        const jsonData = JSON.stringify(data);
        
        // Configurar el token de acceso
        gapi.client.setToken({ access_token: accessToken });
        
        // Buscar archivo existente
        const res = await gapi.client.drive.files.list({
            q: "name='ureshii_data.json' and trashed=false",
            fields: "files(id, name)"
        });
        
        if (res.result.files.length > 0) {
            // Actualizar archivo existente
            const fileId = res.result.files[0].id;
            await gapi.client.request({
                path: `/upload/drive/v3/files/${fileId}`,
                method: "PATCH",
                params: { uploadType: "media" },
                body: jsonData
            });
        } else {
            // Crear nuevo archivo
            await gapi.client.request({
                path: "/upload/drive/v3/files",
                method: "POST",
                params: { uploadType: "multipart" },
                headers: { "Content-Type": "multipart/related; boundary=foo_bar_baz" },
                body: `--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n{"name": "ureshii_data.json"}\r\n--foo_bar_baz\r\nContent-Type: application/json\r\n\r\n${jsonData}\r\n--foo_bar_baz--`
            });
        }
        
        // Marcar datos como sincronizados
        if (typeof window.markDataAsSynced === 'function') {
            window.markDataAsSynced();
        }
        
        if (!isAutoSync) {
            console.log('✅ Datos guardados en Google Drive exitosamente');
        }
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('googleDriveSaved', {
            detail: { timestamp: data.timestamp, isAutoSync }
        }));
        
        return true;
        
    } catch (error) {
        console.error('Error al guardar en Google Drive:', error);
        
        // Manejar token expirado
        if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('invalid_token')) {
            console.log('Token expirado, limpiando storage...');
            clearTokenFromStorage();
            
            // Disparar evento de desconexión
            window.dispatchEvent(new CustomEvent('googleDriveDisconnected'));
        }
        
        throw error;
    }
}

async function loadFromDrive() {
    try {
        // Verificar que las APIs de Google estén disponibles
        if (typeof gapi === 'undefined' || !isGoogleAPILoaded) {
            console.warn('APIs de Google no están disponibles aún');
            return null;
        }
        
        // Verificar token
        const savedToken = getTokenFromStorage();
        if (!savedToken && !accessToken) {
            throw new Error('No hay sesión activa con Google Drive');
        }
        
        if (savedToken && !accessToken) {
            accessToken = savedToken;
        }
        
        console.log('Cargando datos desde Google Drive...');
        
        // Configurar el token de acceso
        gapi.client.setToken({ access_token: accessToken });
        
        // Buscar archivo
        const res = await gapi.client.drive.files.list({
            q: "name='ureshii_data.json' and trashed=false",
            fields: "files(id, name, modifiedTime)"
        });
        
        if (res.result.files.length > 0) {
            const fileId = res.result.files[0].id;
            const file = await gapi.client.drive.files.get({ fileId, alt: "media" });
            
            let data;
            try {
                if (typeof file.body === 'string') {
                    data = JSON.parse(file.body);
                } else {
                    data = file.result;
                }
            } catch (parseError) {
                console.error('Error al parsear datos de Drive:', parseError);
                throw new Error('Datos corruptos en Google Drive');
            }
            
            // Guardar datos en localStorage
            if (data.watchedEpisodes) {
                localStorage.setItem(window.WATCHED_EPISODES_KEY, JSON.stringify(data.watchedEpisodes));
            }
            if (data.myList) {
                localStorage.setItem(window.MY_LIST_KEY, JSON.stringify(data.myList));
            }
            if (data.watchingAnimes) {
                localStorage.setItem(window.WATCHING_ANIMES_KEY, JSON.stringify(data.watchingAnimes));
            }
            if (data.favorites) {
                localStorage.setItem(window.FAVORITES_KEY, JSON.stringify(data.favorites));
            }
            if (data.ureshiiLists) {
                localStorage.setItem(window.URESHII_LISTS_KEY, JSON.stringify(data.ureshiiLists));
            }
            
            const timestamp = data.timestamp ? new Date(data.timestamp).toLocaleString() : 'Desconocida';
            console.log(`✅ Datos cargados desde Google Drive (Última actualización: ${timestamp})`);
            
            // Disparar evento personalizado
            window.dispatchEvent(new CustomEvent('googleDriveLoaded', {
                detail: { data, timestamp }
            }));
            
            return data;
            
        } else {
            console.log('⚠️ No se encontró archivo de datos en Google Drive');
            return null;
        }
        
    } catch (error) {
        console.error('Error al cargar desde Google Drive:', error);
        
        // Manejar token expirado
        if (error.status === 401 || error.message.includes('unauthorized') || error.message.includes('invalid_token')) {
            console.log('Token expirado, limpiando storage...');
            clearTokenFromStorage();
            
            // Disparar evento de desconexión
            window.dispatchEvent(new CustomEvent('googleDriveDisconnected'));
        }
        
        throw error;
    }
}



// ============================
// EXPORTAR FUNCIONES GLOBALMENTE
// ============================

// Hacer todas las funciones disponibles globalmente
window.googleDrive = {
    initialize: initializeGoogleDrive,
    signIn: signInToGoogleDrive,
    signOut: signOutFromGoogleDrive,
    isConnected: isGoogleDriveConnected,
    saveToDrive: saveToDrive,
    loadFromDrive: loadFromDrive,

    getToken: getTokenFromStorage,
    clearToken: clearTokenFromStorage
};

// Mantener compatibilidad con el código existente
window.saveToDrive = saveToDrive;
window.loadFromDrive = loadFromDrive;
window.initializeGoogleDrive = initializeGoogleDrive;
window.signInToGoogleDrive = signInToGoogleDrive;
window.signOutFromGoogleDrive = signOutFromGoogleDrive;
window.isGoogleDriveConnected = isGoogleDriveConnected;

// ============================
// INICIALIZACIÓN MANUAL
// ============================

// El sistema ahora requiere inicialización manual a través de los botones

console.log('Sistema centralizado de Google Drive cargado');