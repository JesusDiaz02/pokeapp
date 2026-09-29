// PokéDex Living Dex & Shiny Tracker Application Engine
document.addEventListener('DOMContentLoaded', () => {
  // State
  let captures = JSON.parse(localStorage.getItem('pokeapp_captures_v1') || '[]');
  let currentView = 'dex';
  let searchTerm = '';
  let activeGenFilter = 'ALL';
  let activeGameFilter = 'ALL';
  let activeStatusFilter = 'ALL'; // ALL, CAUGHT, SHINY, UNCAUGHT
  let activePokemonId = null;

  // Firebase Auth & Firestore Sync State
  let currentUser = null;
  let unsubscribeFirestore = null;
  let syncStatus = 'offline'; // 'offline', 'syncing', 'online', 'error'
  let firebaseReady = false;

  // DOM Elements
  const viewSections = document.querySelectorAll('.view-section');
  const navItems = document.querySelectorAll('.nav-item');
  const pokemonGrid = document.getElementById('pokemon-grid');
  const capturesList = document.getElementById('captures-list');
  const shinyGrid = document.getElementById('shiny-grid');
  const searchInput = document.getElementById('search-input');
  const quickFilters = document.getElementById('quick-filters');
  
  // Header Stat Counters & Sync Pill
  const statTotalCaught = document.getElementById('stat-total-caught');
  const statTotalShiny = document.getElementById('stat-total-shiny');
  const syncStatusDot = document.getElementById('sync-status-dot');
  const userDisplayName = document.getElementById('user-display-name');
  
  // Modal Elements
  const modalOverlay = document.getElementById('modal-overlay');
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');
  const btnCloseModal = document.getElementById('btn-close-modal');

  // Register PWA Service Worker with auto-update check
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.update();
    }).catch(err => console.log('SW registration error:', err));
  }

  // Initial setup & Render
  initFilters();
  initFirebaseSync();
  renderApp();

  // Event Listeners for Navigation Tabs
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const view = item.dataset.view;
      switchView(view);
    });
  });

  // Search Input Listener
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchTerm = e.target.value.toLowerCase().trim();
      renderDex();
    });
  }

  // Modal Close
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeModal);
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
  }

  // -------------------------------------------------------------
  // FIREBASE AUTHENTICATION & FIRESTORE REAL-TIME SYNC ENGINE
  // -------------------------------------------------------------
  function initFirebaseSync() {
    if (!window.PokeFirebase) return;
    const fb = window.PokeFirebase.initFirebase();
    firebaseReady = fb.ready;

    if (!firebaseReady || !fb.auth) {
      updateSyncStatusUI('offline', 'Modo Local');
      return;
    }

    // Escuchar cambios de estado de autenticación (Login, Logout, Auto-login)
    fb.auth.onAuthStateChanged(async (user) => {
      currentUser = user;
      if (unsubscribeFirestore) {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
      }

      if (user) {
        const name = user.displayName || user.email || (user.isAnonymous ? 'Invitado' : 'Usuario');
        updateSyncStatusUI('syncing', name);
        listenToFirestoreCaptures(user.uid);
      } else {
        updateSyncStatusUI('offline', 'Iniciar Sesión');
        renderApp();
      }
    });
  }

  function updateSyncStatusUI(status, nameText) {
    syncStatus = status;
    if (syncStatusDot) {
      syncStatusDot.className = `sync-dot ${status}`;
    }
    if (userDisplayName && nameText !== undefined) {
      userDisplayName.textContent = nameText;
    }
  }

  function listenToFirestoreCaptures(userId) {
    const db = window.PokeFirebase.db;
    if (!db) return;

    updateSyncStatusUI('syncing');

    unsubscribeFirestore = db.collection('users').doc(userId).collection('captures')
      .onSnapshot(async (snapshot) => {
        const remoteCaptures = [];
        snapshot.forEach(doc => {
          remoteCaptures.push(doc.data());
        });

        // Si la base de datos Firestore está vacía pero tenemos capturas locales, sincronizamos locales a Firestore
        if (remoteCaptures.length === 0 && captures.length > 0) {
          await pushAllLocalCapturesToFirestore(userId, captures);
          updateSyncStatusUI('online');
          return;
        }

        // Fusión inteligente: mantener registros únicos ordenados por fecha
        const localMap = {};
        captures.forEach(c => localMap[c.id] = c);

        // Si hay capturas locales que no están en Firestore, las agregamos a Firestore
        remoteCaptures.forEach(c => localMap[c.id] = c);
        
        captures = Object.values(localMap);
        saveLocalCapturesSilently();

        updateSyncStatusUI('online');
        renderApp();
      }, (err) => {
        console.error('Error en sincronización Firestore:', err);
        updateSyncStatusUI('error', 'Error Sync');
      });
  }

  async function pushAllLocalCapturesToFirestore(userId, captureList) {
    const db = window.PokeFirebase.db;
    if (!db || !userId || !captureList.length) return;

    try {
      const batch = db.batch();
      captureList.forEach(cap => {
        const docRef = db.collection('users').doc(userId).collection('captures').doc(cap.id);
        batch.set(docRef, cap);
      });
      await batch.commit();
      console.log(`✅ Sincronizados ${captureList.length} registros locales a Firestore.`);
    } catch (err) {
      console.error('Error enviando capturas a Firestore:', err);
    }
  }

  async function saveSingleCaptureToFirestore(capture) {
    if (!currentUser || !window.PokeFirebase.db) return;
    try {
      updateSyncStatusUI('syncing');
      await window.PokeFirebase.db
        .collection('users').doc(currentUser.uid)
        .collection('captures').doc(capture.id)
        .set(capture);
      updateSyncStatusUI('online');
    } catch (err) {
      console.error('Error guardando captura en Firestore:', err);
      updateSyncStatusUI('error');
    }
  }

  async function deleteSingleCaptureFromFirestore(captureId) {
    if (!currentUser || !window.PokeFirebase.db) return;
    try {
      updateSyncStatusUI('syncing');
      await window.PokeFirebase.db
        .collection('users').doc(currentUser.uid)
        .collection('captures').doc(captureId)
        .delete();
      updateSyncStatusUI('online');
    } catch (err) {
      console.error('Error eliminando captura en Firestore:', err);
      updateSyncStatusUI('error');
    }
  }

  async function clearFirestoreCaptures(userId) {
    const db = window.PokeFirebase.db;
    if (!db || !userId) return;
    try {
      const snapshot = await db.collection('users').doc(userId).collection('captures').get();
      const batch = db.batch();
      snapshot.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      console.error('Error vaciando colección Firestore:', err);
    }
  }

  // Switch Active View
  function switchView(viewName) {
    currentView = viewName;
    navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewName);
    });
    viewSections.forEach(sec => {
      sec.classList.toggle('active', sec.id === `view-${viewName}`);
    });
    renderApp();
  }

  function renderApp() {
    updateHeaderStats();
    if (currentView === 'dex') renderDex();
    else if (currentView === 'captures') renderCaptures();
    else if (currentView === 'shiny') renderShinyDex();
    else if (currentView === 'stats') renderStats();
    else if (currentView === 'settings') renderSettings();
  }

  function updateHeaderStats() {
    const uniqueCaughtCount = new Set(captures.map(c => c.pokemonId)).size;
    const totalShinies = captures.filter(c => c.isShiny).length;
    if (statTotalCaught) statTotalCaught.textContent = uniqueCaughtCount;
    if (statTotalShiny) statTotalShiny.textContent = totalShinies;
  }

  // Build filter pills dynamically
  function initFilters() {
    if (!quickFilters) return;
    quickFilters.innerHTML = '';

    const filterOptions = [
      { id: 'ALL', label: 'Todos' },
      { id: 'CAUGHT', label: 'Atrapados ✅' },
      { id: 'SHINY', label: 'Shinies ✨', isShiny: true },
      { id: 'UNCAUGHT', label: 'Faltantes ❓' },
      { id: 'Gen 1', label: 'Gen 1 (Kanto)' },
      { id: 'Gen 2', label: 'Gen 2 (Johto)' },
      { id: 'Gen 3', label: 'Gen 3 (Hoenn)' },
      { id: 'Gen 4', label: 'Gen 4 (Sinnoh)' },
      { id: 'Gen 5', label: 'Gen 5 (Unova)' },
      { id: 'Gen 6', label: 'Gen 6 (Kalos)' },
      { id: 'Gen 7', label: 'Gen 7 (Alola)' },
      { id: 'Gen 8', label: 'Gen 8 (Galar)' },
      { id: 'Gen 9', label: 'Gen 9 (Paldea)' }
    ];

    filterOptions.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = `filter-btn ${opt.isShiny ? 'shiny-filter' : ''}`;
      if (opt.id === 'ALL') btn.classList.add('active');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (opt.id === 'ALL' || opt.id === 'CAUGHT' || opt.id === 'SHINY' || opt.id === 'UNCAUGHT') {
          activeStatusFilter = opt.id;
          activeGenFilter = 'ALL';
        } else {
          activeGenFilter = opt.id;
          activeStatusFilter = 'ALL';
        }
        renderDex();
      });
      quickFilters.appendChild(btn);
    });
  }

  // RENDER DEX VIEW
  function renderDex() {
    if (!pokemonGrid) return;
    pokemonGrid.innerHTML = '';

    const db = window.POKEMON_DATABASE || [];
    const capturesByPokemon = getCapturesGroupedByPokemon();

    const filtered = db.filter(pkmn => {
      // Search term filter
      if (searchTerm) {
        const matchesName = pkmn.name.toLowerCase().includes(searchTerm);
        const matchesId = pkmn.id.toString() === searchTerm || `#${pkmn.id}` === searchTerm;
        if (!matchesName && !matchesId) return false;
      }

      // Gen filter
      if (activeGenFilter !== 'ALL' && !pkmn.gen.includes(activeGenFilter)) {
        return false;
      }

      // Status filter
      const userCaptures = capturesByPokemon[pkmn.id] || [];
      const isCaught = userCaptures.length > 0;
      const hasShiny = userCaptures.some(c => c.isShiny);

      if (activeStatusFilter === 'CAUGHT' && !isCaught) return false;
      if (activeStatusFilter === 'SHINY' && !hasShiny) return false;
      if (activeStatusFilter === 'UNCAUGHT' && isCaught) return false;

      return true;
    });

    if (filtered.length === 0) {
      pokemonGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
          <p style="font-size: 1.1rem; margin-bottom: 8px;">No se encontraron Pokémon con estos filtros.</p>
          <p style="font-size: 0.85rem;">Prueba limpiando la búsqueda o cambiando de filtro.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(pkmn => {
      const userCaptures = capturesByPokemon[pkmn.id] || [];
      const isCaught = userCaptures.length > 0;
      const hasShiny = userCaptures.some(c => c.isShiny);

      const card = document.createElement('div');
      card.className = `pokemon-card ${isCaught ? 'caught' : 'uncaught'} ${hasShiny ? 'has-shiny' : ''}`;
      
      const displayImg = (hasShiny && userCaptures.find(c => c.isShiny)) ? pkmn.shiny_sprite : pkmn.sprite;

      const gamesBadgeHtml = userCaptures.map(c => `
        <span class="game-tag ${c.isShiny ? 'shiny-tag' : ''}">
          ${c.game} ${c.isShiny ? '✨' : ''}
        </span>
      `).join('');

      card.innerHTML = `
        <div class="card-top-bar">
          <span class="dex-number">#${String(pkmn.id).padStart(3, '0')}</span>
          <div class="card-badges">
            ${hasShiny ? '<span class="shiny-sparkle-badge" title="Shiny registrado!">✨</span>' : ''}
            ${userCaptures.length > 0 ? `<span class="count-badge">${userCaptures.length}</span>` : ''}
          </div>
        </div>
        <div class="pokemon-img-wrapper">
          <img src="${displayImg}" alt="${pkmn.name}" class="pokemon-img" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';">
        </div>
        <div class="pokemon-name">${pkmn.name}</div>
        <div class="types-container">
          ${pkmn.types.map(t => `<span class="type-pill type-${t.toLowerCase()}">${t}</span>`).join('')}
        </div>
        ${gamesBadgeHtml ? `<div class="game-tags-list">${gamesBadgeHtml}</div>` : ''}
        <button class="btn-quick-add" onclick="event.stopPropagation(); window.openAddCaptureModal(${pkmn.id})">
          + Registrar Captura
        </button>
      `;

      card.addEventListener('click', () => {
        openPokemonDetailsModal(pkmn);
      });

      pokemonGrid.appendChild(card);
    });
  }

  // RENDER CAPTURES LOG VIEW
  function renderCaptures() {
    if (!capturesList) return;
    capturesList.innerHTML = '';

    if (captures.length === 0) {
      capturesList.innerHTML = `
        <div style="text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <p style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">Aún no has registrado ningún Pokémon</p>
          <p style="font-size: 0.85rem; margin-bottom: 20px;">Comienza buscando tus Pokémon favoritos y añade de qué juego provienen.</p>
          <button class="btn-primary" style="max-width: 200px; margin: 0 auto;" onclick="window.switchTab('dex')">Ir a la Pokédex</button>
        </div>
      `;
      return;
    }

    const dbMap = {};
    (window.POKEMON_DATABASE || []).forEach(p => dbMap[p.id] = p);

    captures.forEach(cap => {
      const pkmn = dbMap[cap.pokemonId] || { name: cap.pokemonName, sprite: '', shiny_sprite: '' };
      const item = document.createElement('div');
      item.className = `capture-item-card ${cap.isShiny ? 'is-shiny' : ''}`;
      const spriteUrl = cap.isShiny ? (pkmn.shiny_sprite || pkmn.sprite) : pkmn.sprite;

      item.innerHTML = `
        <div class="capture-left">
          <img src="${spriteUrl}" alt="${cap.pokemonName}" class="capture-sprite" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';">
          <div class="capture-info">
            <h4>
              ${cap.pokemonName} ${cap.isShiny ? '<span style="color:var(--accent-gold);">✨ (Shiny)</span>' : ''}
              ${cap.nickname ? `<span style="font-weight:normal; font-style:italic; font-size:0.8rem;">"${cap.nickname}"</span>` : ''}
            </h4>
            <p>Atrapado en: <strong style="color:var(--accent-cyan);">${cap.game}</strong></p>
            <div class="capture-meta">
              <span class="meta-chip">⚽ ${cap.ball || 'Poké Ball'}</span>
              ${cap.level ? `<span class="meta-chip">Nvl. ${cap.level}</span>` : ''}
              ${cap.nature ? `<span class="meta-chip">Naturaleza ${cap.nature}</span>` : ''}
              ${cap.ability ? `<span class="meta-chip">Habilidad: ${cap.ability}</span>` : ''}
              ${cap.notes ? `<span class="meta-chip">📝 ${cap.notes}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="capture-actions">
          <button class="btn-icon" onclick="window.deleteCapture('${cap.id}')" title="Eliminar registro">🗑️</button>
        </div>
      `;
      capturesList.appendChild(item);
    });
  }

  // RENDER SHINY DEX VIEW
  function renderShinyDex() {
    if (!shinyGrid) return;
    shinyGrid.innerHTML = '';

    const shinyCaptures = captures.filter(c => c.isShiny);
    if (shinyCaptures.length === 0) {
      shinyGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: var(--text-muted);">
          <p style="font-size: 1.2rem; font-weight: 700; color: var(--accent-gold); margin-bottom: 8px;">✨ ¡No tienes ningún Shiny registrado aún!</p>
          <p style="font-size: 0.85rem;">Cuando registres una captura marcando la casilla Shiny ✨, aparecerá en esta galería especial.</p>
        </div>
      `;
      return;
    }

    const dbMap = {};
    (window.POKEMON_DATABASE || []).forEach(p => dbMap[p.id] = p);

    shinyCaptures.forEach(cap => {
      const pkmn = dbMap[cap.pokemonId] || { name: cap.pokemonName, shiny_sprite: '', types: [] };
      const card = document.createElement('div');
      card.className = 'pokemon-card has-shiny';
      card.innerHTML = `
        <div class="card-top-bar">
          <span class="dex-number">#${String(cap.pokemonId).padStart(3, '0')}</span>
          <span class="shiny-sparkle-badge">✨</span>
        </div>
        <div class="pokemon-img-wrapper">
          <img src="${pkmn.shiny_sprite || pkmn.sprite}" alt="${cap.pokemonName}" class="pokemon-img">
        </div>
        <div class="pokemon-name">${cap.pokemonName}</div>
        <div class="game-tag shiny-tag" style="margin-top:6px;">${cap.game}</div>
      `;
      shinyGrid.appendChild(card);
    });
  }

  // RENDER STATS VIEW
  function renderStats() {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    const totalPokemonCount = 1025;
    const uniqueCaught = new Set(captures.map(c => c.pokemonId)).size;
    const totalShinies = captures.filter(c => c.isShiny).length;
    const dexPercent = ((uniqueCaught / totalPokemonCount) * 100).toFixed(1);

    const gameCounts = {};
    captures.forEach(c => {
      gameCounts[c.game] = (gameCounts[c.game] || 0) + 1;
    });

    const gameStatsHtml = Object.entries(gameCounts).map(([game, count]) => `
      <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.85rem;">
        <span>🎮 ${game}</span>
        <strong style="color:var(--accent-cyan);">${count} capturas</strong>
      </div>
    `).join('') || '<p style="font-size:0.85rem; color:var(--text-muted);">Sin capturas registradas aún.</p>';

    statsContainer.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Progreso Pokédex Nacional</h3>
          <div class="stat-big-num">${uniqueCaught} / ${totalPokemonCount}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">${dexPercent}% Completado</div>
          <div class="stat-progress-bar">
            <div class="stat-progress-fill" style="width: ${dexPercent}%"></div>
          </div>
        </div>

        <div class="stat-card">
          <h3>Total Shinies ✨</h3>
          <div class="stat-big-num" style="color:var(--accent-gold);">${totalShinies}</div>
          <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Capturas Variocolor</div>
          <div class="stat-progress-bar">
            <div class="stat-progress-fill shiny-fill" style="width: ${Math.min((totalShinies / 100) * 100, 100)}%"></div>
          </div>
        </div>
      </div>

      <div class="stat-card" style="margin-top:16px;">
        <h3>Capturas por Juego de Origen</h3>
        <div style="margin-top:12px;">
          ${gameStatsHtml}
        </div>
      </div>
    `;
  }

  // RENDER SETTINGS VIEW WITH FIREBASE SYNC PANEL
  function renderSettings() {
    const settingsContainer = document.getElementById('settings-container');
    if (!settingsContainer) return;

    let syncBadgeText = '🔴 Modo Local (Desconectado)';
    let syncBadgeClass = 'local';
    let userEmailText = 'No has iniciado sesión';
    let userProviderText = 'Los registros solo se guardan en este dispositivo.';

    if (currentUser) {
      userEmailText = currentUser.email || currentUser.displayName || (currentUser.isAnonymous ? 'Usuario Invitado (Anónimo)' : 'Usuario Conectado');
      userProviderText = `ID: ${currentUser.uid.substring(0, 12)}...`;
      if (syncStatus === 'online') {
        syncBadgeText = '🟢 Sincronizado en tiempo real con Firestore';
        syncBadgeClass = 'active';
      } else if (syncStatus === 'syncing') {
        syncBadgeText = '🟡 Sincronizando datos...';
        syncBadgeClass = 'active';
      }
    }

    settingsContainer.innerHTML = `
      <!-- Firebase Cloud Sync Card -->
      <div class="stat-card" style="margin-bottom:16px; border:1px solid rgba(0, 210, 211, 0.3);">
        <h3>🔥 Sincronización en la Nube (Firebase)</h3>
        
        <div class="user-profile-card" style="margin: 12px 0;">
          <div class="user-avatar">
            ${currentUser && currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="User">` : (currentUser ? '👤' : '📱')}
          </div>
          <div class="user-details">
            <div class="user-email">${userEmailText}</div>
            <div class="user-provider">${userProviderText}</div>
            <span class="sync-badge-status ${syncBadgeClass}">${syncBadgeText}</span>
          </div>
        </div>

        <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:14px;">
          Conecta tu cuenta de Firebase Authentication para sincronizar automáticamente tus Pokémon y Shinies entre todos tus celulares, tablets y computadoras.
        </p>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" style="flex:1;" onclick="window.openAuthModal()">
            ${currentUser ? '⚙️ Gestionar Cuenta / Sesión' : '🔑 Iniciar Sesión / Sincronizar'}
          </button>
          ${currentUser ? `<button class="btn-primary" style="flex:1; background:#0ea5e9;" onclick="window.manualSync()">🔄 Sincronizar Ahora</button>` : ''}
        </div>
      </div>

      <!-- Backup JSON Card -->
      <div class="stat-card" style="margin-bottom:16px;">
        <h3>💾 Copia de Seguridad Local (JSON)</h3>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin:8px 0 14px 0;">
          Exporta tus datos en un archivo JSON como respaldo físico.
        </p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" style="flex:1;" onclick="window.exportBackup()">📥 Exportar JSON</button>
          <button class="btn-primary" style="flex:1; background:#334155;" onclick="document.getElementById('import-file-input').click()">📤 Importar JSON</button>
          <input type="file" id="import-file-input" style="display:none" accept=".json" onchange="window.importBackup(event)">
        </div>
      </div>

      <!-- Quick Actions Card -->
      <div class="stat-card">
        <h3>⚡ Acciones Rápidas</h3>
        <p style="font-size:0.85rem; color:var(--text-secondary); margin:8px 0 14px 0;">
          Carga datos de demostración o reinicia tu colección.
        </p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn-primary" style="flex:1; background:linear-gradient(135deg, #00d2d3, #0984e3);" onclick="window.loadSampleData()">✨ Cargar Ejemplo (Pikachu Alola & Paldea)</button>
          <button class="btn-primary" style="flex:1; background:#e11d48;" onclick="window.clearAllData()">⚠️ Borrar Todo</button>
        </div>
      </div>
    `;
  }

  // -------------------------------------------------------------
  // FIREBASE AUTHENTICATION & SYNC MODAL DRAWER
  // -------------------------------------------------------------
  window.openAuthModal = function(activeTab = 'google') {
    modalTitle.textContent = '🔥 Sincronización Firebase & Cuenta';

    if (currentUser) {
      renderLoggedInAuthModal();
    } else {
      renderLoggedOutAuthModal(activeTab);
    }
    openModal();
  };

  function renderLoggedInAuthModal() {
    modalBody.innerHTML = `
      <div class="user-profile-card">
        <div class="user-avatar">
          ${currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="User">` : '👤'}
        </div>
        <div class="user-details">
          <div class="user-email">${currentUser.email || currentUser.displayName || 'Usuario Invitado'}</div>
          <div class="user-provider">Proveedor: ${currentUser.isAnonymous ? 'Anónimo / Invitado' : (currentUser.providerData[0]?.providerId || 'Email')}</div>
          <span class="sync-badge-status active">🟢 Conectado a Firestore</span>
        </div>
      </div>

      <div style="display:flex; flex-direction:column; gap:10px; margin-top:16px;">
        <button class="btn-primary" style="background:#0ea5e9;" onclick="window.manualSync()">🔄 Forzar Sincronización Inmediata</button>
        <button class="btn-primary" style="background:#475569;" onclick="window.showFirebaseConfigTab()">⚙️ Editar Credenciales de Firebase</button>
        <button class="btn-primary" style="background:#e11d48;" onclick="window.signOutFirebase()">🚪 Cerrar Sesión</button>
      </div>
    `;
  }

  function renderLoggedOutAuthModal(activeTab) {
    modalBody.innerHTML = `
      <div class="auth-tabs">
        <button class="auth-tab-btn ${activeTab === 'google' ? 'active' : ''}" onclick="window.renderAuthTab('google')">Google</button>
        <!-- Correo / Clave e Invitado ocultos: solo Google está activado en Firebase Auth -->
        <button class="auth-tab-btn ${activeTab === 'config' ? 'active' : ''}" onclick="window.renderAuthTab('config')">Config Firebase</button>
      </div>
      <div id="auth-tab-content"></div>
    `;
    window.renderAuthTab(activeTab);
  }

  window.renderAuthTab = function(tabName) {
    document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = Array.from(document.querySelectorAll('.auth-tab-btn')).find(b => b.getAttribute('onclick')?.includes(`'${tabName}'`));
    if (targetBtn) targetBtn.classList.add('active');

    const contentDiv = document.getElementById('auth-tab-content');
    if (!contentDiv) return;

    if (tabName === 'google') {
      contentDiv.innerHTML = `
        <div style="text-align:center; padding:10px 0;">
          <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
            Sincroniza instantáneamente tus capturas iniciando sesión con tu cuenta de Google.
          </p>
          <button class="btn-google" onclick="window.signInGoogle()">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.15C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.61H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.39l3.99-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.61l3.99 3.15c.95-2.85 3.6-4.96 6.72-4.96z"/></svg>
            Iniciar Sesión con Google
          </button>
        </div>
      `;
    } else if (tabName === 'email') {
      contentDiv.innerHTML = `
        <form id="email-auth-form">
          <div class="form-group">
            <label>Correo Electrónico</label>
            <input type="email" class="form-control" id="auth-email" required placeholder="tu@email.com">
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" class="form-control" id="auth-password" required placeholder="••••••••">
          </div>
          <div style="display:flex; gap:10px; margin-top:16px;">
            <button type="button" class="btn-primary" style="flex:1;" onclick="window.signInEmail()">Iniciar Sesión</button>
            <button type="button" class="btn-primary" style="flex:1; background:#475569;" onclick="window.signUpEmail()">Registrarse</button>
          </div>
        </form>
      `;
    } else if (tabName === 'guest') {
      contentDiv.innerHTML = `
        <div style="text-align:center; padding:10px 0;">
          <p style="font-size:0.88rem; color:var(--text-secondary); margin-bottom:16px;">
            Entra en modo invitado para probar la sincronización en Firestore sin ingresar datos personales.
          </p>
          <button class="btn-primary" onclick="window.signInGuest()">
            👤 Continuar como Invitado Anónimo
          </button>
        </div>
      `;
    } else if (tabName === 'config') {
      const cfg = window.PokeFirebase ? window.PokeFirebase.getFirebaseConfig() : {};
      contentDiv.innerHTML = `
        <p style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;">
          Ingresa las llaves de tu propio proyecto en Firebase Console para usar tu base de datos Firestore privada.
        </p>
        <div class="form-group">
          <label>API Key</label>
          <input type="text" class="form-control" id="cfg-apiKey" value="${cfg.apiKey || ''}">
        </div>
        <div class="form-group">
          <label>Auth Domain</label>
          <input type="text" class="form-control" id="cfg-authDomain" value="${cfg.authDomain || ''}">
        </div>
        <div class="form-group">
          <label>Project ID</label>
          <input type="text" class="form-control" id="cfg-projectId" value="${cfg.projectId || ''}">
        </div>
        <div class="form-group">
          <label>App ID</label>
          <input type="text" class="form-control" id="cfg-appId" value="${cfg.appId || ''}">
        </div>
        <button class="btn-primary" style="margin-top:12px;" onclick="window.saveFirebaseConfigForm()">💾 Guardar Credenciales</button>
      `;
    }
  };

  window.showFirebaseConfigTab = function() {
    renderLoggedOutAuthModal('config');
  };

  window.signInGoogle = async function() {
    if (!window.PokeFirebase || !window.PokeFirebase.auth) return;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await window.PokeFirebase.auth.signInWithPopup(provider);
      closeModal();
    } catch (err) {
      alert('Error en inicio de sesión con Google: ' + err.message);
    }
  };

  window.signInEmail = async function() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) return alert('Por favor ingresa correo y contraseña.');
    try {
      await window.PokeFirebase.auth.signInWithEmailAndPassword(email, password);
      closeModal();
    } catch (err) {
      alert('Error en inicio de sesión: ' + err.message);
    }
  };

  window.signUpEmail = async function() {
    const email = document.getElementById('auth-email')?.value;
    const password = document.getElementById('auth-password')?.value;
    if (!email || !password) return alert('Por favor ingresa correo y contraseña para crear la cuenta.');
    try {
      await window.PokeFirebase.auth.createUserWithEmailAndPassword(email, password);
      alert('¡Cuenta creada e inicio de sesión exitoso!');
      closeModal();
    } catch (err) {
      alert('Error creando cuenta: ' + err.message);
    }
  };

  window.signInGuest = async function() {
    if (!window.PokeFirebase || !window.PokeFirebase.auth) return;
    try {
      await window.PokeFirebase.auth.signInAnonymously();
      closeModal();
    } catch (err) {
      alert('Error en acceso como invitado: ' + err.message);
    }
  };

  window.signOutFirebase = async function() {
    if (!window.PokeFirebase || !window.PokeFirebase.auth) return;
    try {
      await window.PokeFirebase.auth.signOut();
      closeModal();
      renderApp();
    } catch (err) {
      alert('Error al cerrar sesión: ' + err.message);
    }
  };

  window.manualSync = async function() {
    if (!currentUser) return alert('Debes iniciar sesión para sincronizar.');
    updateSyncStatusUI('syncing');
    await pushAllLocalCapturesToFirestore(currentUser.uid, captures);
    updateSyncStatusUI('online');
    alert('¡Sincronización manual completada con éxito!');
  };

  window.saveFirebaseConfigForm = function() {
    const newCfg = {
      apiKey: document.getElementById('cfg-apiKey').value.trim(),
      authDomain: document.getElementById('cfg-authDomain').value.trim(),
      projectId: document.getElementById('cfg-projectId').value.trim(),
      storageBucket: `${document.getElementById('cfg-projectId').value.trim()}.appspot.com`,
      messagingSenderId: "123456789012",
      appId: document.getElementById('cfg-appId').value.trim()
    };
    window.PokeFirebase.saveCustomFirebaseConfig(newCfg);
    alert('Configuración guardada. Reiniciando conexión...');
    initFirebaseSync();
    closeModal();
  };

  // -------------------------------------------------------------
  // CAPTURES MANAGEMENT & MODALS
  // -------------------------------------------------------------
  window.openAddCaptureModal = function(pokemonId) {
    activePokemonId = pokemonId;
    const db = window.POKEMON_DATABASE || [];
    const pkmn = db.find(p => p.id === pokemonId) || { name: `Pokémon #${pokemonId}` };

    modalTitle.textContent = `Registrar Captura: ${pkmn.name} (#${pokemonId})`;
    
    let gamesOptions = '';
    const gamesDb = window.GAMES_DATABASE || {};
    Object.entries(gamesDb).forEach(([genGroup, gameList]) => {
      gamesOptions += `<optgroup label="${genGroup}">`;
      gameList.forEach(g => {
        gamesOptions += `<option value="${g}">${g}</option>`;
      });
      gamesOptions += `</optgroup>`;
    });

    const ballsOptions = (window.POKEBALLS || []).map(b => `<option value="${b}">${b}</option>`).join('');
    const naturesOptions = (window.NATURES || []).map(n => `<option value="${n}">${n}</option>`).join('');

    modalBody.innerHTML = `
      <form id="add-capture-form">
        <div class="form-group">
          <label>Juego / Versión de Origen *</label>
          <select class="form-control" id="form-game" required>
            ${gamesOptions}
          </select>
        </div>

        <div class="form-group">
          <div class="toggle-group">
            <span style="font-size:0.9rem; font-weight:600; color:var(--accent-gold);">✨ ¿Es Variocolor (Shiny)?</span>
            <label class="toggle-switch">
              <input type="checkbox" id="form-shiny">
              <span class="slider"></span>
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Pokéball usada</label>
            <select class="form-control" id="form-ball">
              ${ballsOptions}
            </select>
          </div>

          <div class="form-group">
            <label>Nivel de Captura</label>
            <input type="number" class="form-control" id="form-level" min="1" max="100" placeholder="Ej: 50">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Naturaleza</label>
            <select class="form-control" id="form-nature">
              <option value="">Seleccionar...</option>
              ${naturesOptions}
            </select>
          </div>

          <div class="form-group">
            <label>Habilidad</label>
            <input type="text" class="form-control" id="form-ability" placeholder="Ej: Electricidad">
          </div>
        </div>

        <div class="form-group">
          <label>Mote / Apodo</label>
          <input type="text" class="form-control" id="form-nickname" placeholder="Ej: Sparky">
        </div>

        <div class="form-group">
          <label>Notas adicionales</label>
          <textarea class="form-control" id="form-notes" rows="2" placeholder="Lugar de captura, evento, Tera Tipo, etc..."></textarea>
        </div>

        <button type="submit" class="btn-primary">💾 Guardar Captura</button>
      </form>
    `;

    document.getElementById('add-capture-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const newCapture = {
        id: 'cap_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        pokemonId: pkmn.id,
        pokemonName: pkmn.name,
        game: document.getElementById('form-game').value,
        isShiny: document.getElementById('form-shiny').checked,
        ball: document.getElementById('form-ball').value,
        level: document.getElementById('form-level').value || null,
        nature: document.getElementById('form-nature').value || null,
        ability: document.getElementById('form-ability').value.trim() || null,
        nickname: document.getElementById('form-nickname').value.trim() || null,
        notes: document.getElementById('form-notes').value.trim() || null,
        date: new Date().toISOString().split('T')[0]
      };

      captures.push(newCapture);
      saveLocalCapturesSilently();
      saveSingleCaptureToFirestore(newCapture);
      closeModal();
      renderApp();
    });

    openModal();
  };

  function openPokemonDetailsModal(pkmn) {
    const userCaptures = captures.filter(c => c.pokemonId === pkmn.id);
    modalTitle.textContent = `#${String(pkmn.id).padStart(3, '0')} - ${pkmn.name}`;

    const capturesHtml = userCaptures.map(c => `
      <div class="capture-item-card ${c.isShiny ? 'is-shiny' : ''}" style="margin-bottom:8px;">
        <div>
          <div style="font-weight:700; color:var(--text-primary);">
            🎮 ${c.game} ${c.isShiny ? '<span style="color:var(--accent-gold);">✨ Shiny</span>' : ''}
          </div>
          <div style="font-size:0.78rem; color:var(--text-secondary); margin-top:2px;">
            ⚽ ${c.ball} | ${c.nickname ? `Apodo: "${c.nickname}" |` : ''} ${c.notes || ''}
          </div>
        </div>
        <button class="btn-icon" onclick="window.deleteCapture('${c.id}')">🗑️</button>
      </div>
    `).join('') || '<p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:12px;">Sin capturas en tus juegos todavía.</p>';

    modalBody.innerHTML = `
      <div style="text-align:center; margin-bottom:16px;">
        <img src="${pkmn.artwork}" alt="${pkmn.name}" style="max-width:140px; max-height:140px; filter:drop-shadow(0 6px 12px rgba(0,0,0,0.5));">
        <div style="display:flex; gap:6px; justify-content:center; margin-top:8px;">
          ${pkmn.types.map(t => `<span class="type-pill type-${t.toLowerCase()}">${t}</span>`).join('')}
        </div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px;">Región: ${pkmn.region} (${pkmn.gen})</div>
      </div>

      <div style="margin-bottom:16px;">
        <h4 style="font-size:0.9rem; color:var(--accent-cyan); margin-bottom:8px;">Tus Registros de Captura (${userCaptures.length})</h4>
        ${capturesHtml}
      </div>

      <button class="btn-primary" onclick="window.openAddCaptureModal(${pkmn.id})">+ Registrar Nueva Captura</button>
    `;

    openModal();
  }

  // Global Actions
  window.deleteCapture = function(captureId) {
    if (confirm('¿Deseas eliminar este registro de captura?')) {
      captures = captures.filter(c => c.id !== captureId);
      saveLocalCapturesSilently();
      deleteSingleCaptureFromFirestore(captureId);
      closeModal();
      renderApp();
    }
  };

  window.switchTab = function(viewName) {
    switchView(viewName);
  };

  window.exportBackup = function() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(captures, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `pokeapp_backup_${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  };

  window.importBackup = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (Array.isArray(imported)) {
          captures = imported;
          saveLocalCapturesSilently();
          if (currentUser) {
            await pushAllLocalCapturesToFirestore(currentUser.uid, captures);
          }
          alert('¡Copia de seguridad importada exitosamente!');
          renderApp();
        } else {
          alert('El archivo importado no tiene un formato válido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  window.loadSampleData = async function() {
    captures = [
      {
        id: 'sample_1',
        pokemonId: 25,
        pokemonName: 'Pikachu',
        game: 'Sun & Moon (Alola)',
        isShiny: false,
        ball: 'Ultra Ball',
        level: 50,
        ability: 'Static',
        nature: 'Jolly',
        nickname: 'Sparky',
        notes: 'Capturado en Ruta 1 de Alola',
        date: '2026-09-28'
      },
      {
        id: 'sample_2',
        pokemonId: 25,
        pokemonName: 'Pikachu',
        game: 'Scarlet & Violet (Paldea)',
        isShiny: true,
        ball: 'Fast Ball',
        level: 75,
        ability: 'Lightning Rod',
        nature: 'Timid',
        nickname: 'Zippy ✨',
        notes: 'Evento Shiny Tera Incursión en Paldea',
        date: '2026-09-28'
      },
      {
        id: 'sample_3',
        pokemonId: 384,
        pokemonName: 'Rayquaza',
        game: 'Emerald (Hoenn)',
        isShiny: true,
        ball: 'Master Ball',
        level: 70,
        nature: 'Adamant',
        notes: 'Pilar Celeste Shiny',
        date: '2026-09-28'
      },
      {
        id: 'sample_4',
        pokemonId: 1007,
        pokemonName: 'Koraidon',
        game: 'Scarlet & Violet (Paldea)',
        isShiny: false,
        ball: 'Master Ball',
        level: 72,
        notes: 'Leyenda de Paldea',
        date: '2026-09-28'
      }
    ];
    saveLocalCapturesSilently();
    if (currentUser) {
      await pushAllLocalCapturesToFirestore(currentUser.uid, captures);
    }
    alert('¡Datos de demostración cargados! Revisa Pikachu con capturas en Alola y Paldea (Shiny ✨).');
    renderApp();
  };

  window.clearAllData = async function() {
    if (confirm('¿Estás seguro de borrar todos tus registros? Esta acción no se puede deshacer.')) {
      captures = [];
      saveLocalCapturesSilently();
      if (currentUser) {
        await clearFirestoreCaptures(currentUser.uid);
      }
      renderApp();
    }
  };

  function saveLocalCapturesSilently() {
    localStorage.setItem('pokeapp_captures_v1', JSON.stringify(captures));
  }

  function getCapturesGroupedByPokemon() {
    const map = {};
    captures.forEach(c => {
      if (!map[c.pokemonId]) map[c.pokemonId] = [];
      map[c.pokemonId].push(c);
    });
    return map;
  }

  function openModal() {
    if (modalOverlay) modalOverlay.classList.add('active');
  }

  function closeModal() {
    if (modalOverlay) modalOverlay.classList.remove('active');
  }
});
