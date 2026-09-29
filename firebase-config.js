// Firebase Configuration & Initialization Module for PokéDex Living Dex
// Permite sincronización multinube con Firebase Authentication & Firestore

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDemoKey_PokeDexApp_ReplaceWithYourOwnIfNeeded",
  authDomain: "pokedex-livingdex.firebaseapp.com",
  projectId: "pokedex-livingdex",
  storageBucket: "pokedex-livingdex.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};

// Cargar configuración guardada o la predeterminada
function getFirebaseConfig() {
  const customConfigStr = localStorage.getItem('pokeapp_firebase_custom_config');
  if (customConfigStr) {
    try {
      return JSON.parse(customConfigStr);
    } catch (e) {
      console.warn('Error leyendo configuración personalizada de Firebase:', e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

function saveCustomFirebaseConfig(configObj) {
  localStorage.setItem('pokeapp_firebase_custom_config', JSON.stringify(configObj));
}

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let isFirebaseInitialized = false;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('SDK de Firebase no detectado. Modo Offline activado.');
    return { app: null, auth: null, db: null, ready: false };
  }

  try {
    const config = getFirebaseConfig();
    if (!firebase.apps.length) {
      firebaseApp = firebase.initializeApp(config);
    } else {
      firebaseApp = firebase.app();
    }

    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();

    // Habilitar persistencia offline para Firestore si está disponible
    try {
      firebaseDb.enablePersistence({ synchronizeTabs: true }).catch(err => {
        if (err.code === 'failed-precondition') {
          console.warn('Persistencia Firestore: Múltiples pestañas abiertas.');
        } else if (err.code === 'unimplemented') {
          console.warn('Persistencia Firestore no soportada en este navegador.');
        }
      });
    } catch (persistErr) {
      console.log('Nota sobre persistencia offline Firestore:', persistErr.message);
    }

    isFirebaseInitialized = true;
    console.log('✅ Firebase Authentication y Firestore inicializados correctamente.');
    return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, ready: true };
  } catch (err) {
    console.error('Error inicializando Firebase:', err);
    return { app: null, auth: null, db: null, ready: false };
  }
}

// Exportar globalmente
window.PokeFirebase = {
  initFirebase,
  getFirebaseConfig,
  saveCustomFirebaseConfig,
  get auth() { return firebaseAuth; },
  get db() { return firebaseDb; },
  get isReady() { return isFirebaseInitialized; }
};
