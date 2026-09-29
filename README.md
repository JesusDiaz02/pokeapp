# 📱 PokéDex Living Dex & Shiny Tracker (Android PWA + Firebase Sync)

Una aplicación web progresiva (PWA) móvil diseñada para rastrear y organizar tu colección de Pokémon a lo largo de todos los juegos de la saga (desde Kanto hasta Paldea, juegos spin-off y aplicaciones como Pokémon GO o HOME), con **sincronización en la nube en tiempo real mediante Firebase Authentication & Firestore**.

---

## 🚀 Características Principales

- **🔥 Sincronización Multinube en Tiempo Real (Firebase)**:
  - **Autenticación Flexibles**: Inicio de sesión con **Google**, **Correo/Contraseña** o **Acceso Invitado Anónimo**.
  - **Sincronización Firestore Bidireccional**: Tus registros se sincronizan instantáneamente entre todos tus dispositivos (celulares Android/iOS, tablets y computadoras).
  - **Indicador de Estado en Vivo**: Punto verde 🟢 (Sincronizado), amarillo 🟡 (Sincronizando) o gris 🔴 (Modo Local).
  - **Soporte Offline**: Sigue funcionando sin conexión a internet y sincroniza tus capturas automáticamente cuando recuperas señal.
- **📖 Pokédex Nacional Completa (Gen 1 - Gen 9 / 1025 Pokémon)**: Explora todos los Pokémon con sus números nacionales, nombres, tipos y artwork oficial.
- **🎮 Registro de Múltiples Capturas por Pokémon**:
  - Puedes registrar múltiples ejemplares de un mismo Pokémon capturados en diferentes juegos o versiones.
  - *Ejemplo*: Registrar un Pikachu capturado en *Sol & Luna (Alola)* y otro Pikachu Shiny capturado en *Escarlata & Púrpura (Paldea)*.
- **✨ Shiny Dex (Variocolor)**:
  - Selector de estado Shiny para cada captura.
  - Distintivo de destello dorado ✨ en la tarjeta Pokédex.
  - Pestaña **Shiny Dex** dedicada para visualizar tu colección de variocolor.
- **📝 Registro Detallado de Captura**:
  - Juego o versión de origen (Alola, Paldea, Galar, Kanto, Hisui, etc.).
  - Tipo de Pokéball (Ultra Ball, Fast Ball, Master Ball, Luxury Ball, etc.).
  - Nivel de captura, Naturaleza, Habilidad.
  - Mote / Apodo personalizado y notas adicionales (eventos, Tera Tipos, etc.).
- **📊 Estadísticas y Porcentaje de Completado**:
  - Porcentaje global de avance de la Pokédex.
  - Total de Pokémon Shiny registrados.
  - Desglose de capturas por juego de origen.
- **💾 Copia de Seguridad & Portabilidad**:
  - Exportación de tus datos a un archivo `.json`.
  - Importación de archivos `.json` para restaurar tu colección.
- **📱 PWA Modo Pantalla Completa & Offline**:
  - Instalable en Android/iOS como una aplicación nativa.
  - Service Worker integrado para funcionamiento 100% offline.

---

## 🛠️ Cómo Ejecutar e Instalar

### 1. Ejecutar localmente en la computadora

1. Abre tu terminal en la carpeta del proyecto `c:\Users\User\Desktop\pokeapp`.
2. Ejecuta el servidor HTTP de Python:
   ```bash
   python -m http.server 8000
   ```
3. Abre en tu navegador la dirección:
   ```
   http://localhost:8000
   ```

### 2. Sincronizar tus dispositivos con Firebase

1. Presiona el botón **"Iniciar Sesión"** / **Punto de Sincronización** en la barra superior.
2. Elige tu método preferido:
   - **Google**: Inicio de sesión instantáneo con tu cuenta de Google.
   - **Correo / Clave**: Crea tu cuenta con email y contraseña.
   - **Invitado**: Prueba la sincronización en tiempo real de forma anónima.
   - **Config Firebase**: Si deseas usar tu propio proyecto en Firebase Console, ingresa tus credenciales ahí.

### 3. Instalar en tu dispositivo Android

1. Asegúrate de que tu celular Android esté conectado a la misma red Wi-Fi que tu computadora (o accede mediante la URL pública alojada).
2. Ingresa a la IP de tu servidor desde Chrome Android (`http://<IP-DE-TU-PC>:8000`).
3. Presiona el menú de 3 puntos (`⋮`) en Chrome y toca en **"Agregar a la pantalla de inicio"** (o *"Instalar aplicación"*).
4. ¡Listo! Se creará una app nativa en tu teléfono que sincronizará tus capturas con tu computadora en tiempo real.

---

## 💡 Guía de Uso

1. **Explorar la Pokédex**:
   - Usa la barra de búsqueda superior para encontrar Pokémon por su nombre o número `#`.
   - Utiliza los botones de filtro rápido (*Atrapados*, *Shinies*, *Faltantes*, *Gen 1* a *Gen 9*).
2. **Registrar una Captura**:
   - Presiona el botón `+ Registrar Captura` en la tarjeta de cualquier Pokémon.
   - Elige el juego de origen (ej: *Sun & Moon* o *Scarlet & Violet*).
   - Marca la casilla **✨ ¿Es Variocolor (Shiny)?** si aplica.
   - Selecciona la Pokéball, nivel, naturaleza y guarda.
3. **Ver Detalle de Capturas**:
   - Haz clic en la tarjeta de un Pokémon para ver todos los ejemplares registrados de ese Pokémon en los diferentes juegos.
4. **Sincronización & Ajustes**:
   - Ve a la pestaña **Ajustes ⚙️** para forzar sincronizaciones manuales o exportar/importar respaldos en formato `.json`.
