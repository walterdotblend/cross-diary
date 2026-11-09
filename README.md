# Cross-Diary (v0.1.0-alpha)

Una aplicación de diario minimalista, sobria, ligera y multiplataforma con sincronización en tiempo real, isla dinámica para escritorio y almacenamiento descentralizado.

---

## 🌟 Características Implementadas en v1

1. **Estética Sobria y Refinada:**
   - Paleta predeterminada *Obsidian Slate* (modo oscuro profundo, grafito y acentos sutiles).
   - Paletas integradas adicionales: *Warm Paper* (editorial sepia), *Midnight Ink* y *Nordic Frost*.
   - Tipografía cuidada (`Inter` para interfaz, `Newsreader` editorial para lectura y escritura).

2. **Organización por Hojas y Carpetas Cromáticas (Estilo Chromium):**
   - Agrupación por carpetas temáticas con pastillas de color personalizables (Azul, Esmeralda, Ámbar, Rosa, Púrpura, Cian, Pizarra).
   - Carpetas colapsables y recuento dinámico de hojas.
   - Creación rápida de hojas y eliminación con confirmación visual.

3. **Isla Dinámica Lateral para Escritorio (Dynamic Island):**
   - Modo de anclaje al borde de pantalla (derecho o izquierdo configurable).
   - Pestaña colapsada translúcida que se expande suavemente al pasar el ratón (`hover`) o hacer clic.
   - Panel de notas rápidas y fijación (`pin`) sin interrumpir tu flujo de trabajo en la PC.

4. **Flujo de Vinculación y Sincronización en Tiempo Real:**
   - Pantalla de bienvenida con opción de **"Crear nuevo diario"** o **"Vincular diario existente"**.
   - Generación de código seguro de 8 caracteres (`XXXX-XXXX`) y código QR interactivo (`QRCodeSVG`).
   - Indicador de estado de sincronización (Cloudflare R2 + WebSockets / P2P).
   - Botón de **"Simular móvil"**: prueba en vivo cómo se reflejan las pulsaciones de teclas remotas en tiempo real.

5. **Personalización Estética con CSS en Vivo:**
   - Editor de CSS incorporado en Ajustes.
   - Inyección instantánea en tiempo real sin recargar la aplicación.
   - Plantillas comunitarias incluidas (*Libro Editorial Clásico*, *Zen Minimalista*, *Terminal Monospace*).

6. **Ecosistema de Extensiones:**
   - Selector de destino para extensiones:
     - **Escritorio**: Como panel en la Isla Lateral o incrustada en la hoja de nota.
     - **Móvil**: Incrustada en la hoja de nota (predeterminado).
   - Dos complementos funcionales preinstalados:
     - *Calculadora y Expresiones Rápidas*.
     - *Bitácora Diaria de Hábitos & Energía* (Agua, Energía 1-5, Meditación).

7. **Configuración de Almacenamiento y Sistema:**
   - Estado de Cloudflare R2 (para textos y estados de notas).
   - Conexión con Google Drive para fotos y archivos multimedia.
   - Opción para iniciar al encender el ordenador (`tauri-plugin-autostart`).

---

## 🚀 Cómo Ejecutar la Aplicación

### Opción 1: Probar Inmediatamente en tu Navegador / Vista Web

Desde la carpeta del proyecto:

```powershell
cd C:\Users\walyo\.gemini\antigravity\scratch\cross-diary
npm run dev
```

Abre tu navegador en `http://localhost:1420` para interactuar con la interfaz completa, probar la isla dinámica, escribir notas y personalizar temas.

---

### Opción 2: Compilar como Aplicación Nativa de Escritorio con Tauri v2

1. Si aún no tienes Rust instalado en Windows, puedes instalarlo ejecutando en tu terminal:
   ```powershell
   winget install Rustlang.Rustup
   ```
2. Una vez instalado Rust, compila y ejecuta la ventana nativa de escritorio:
   ```powershell
   npm run tauri dev
   ```

---

## 📁 Estructura del Código

```
cross-diary/
├── src/
│   ├── App.tsx                     # Orquestador principal de vistas y modales
│   ├── index.css                   # Variables de diseño, temas y tipografía
│   ├── types/
│   │   └── diary.ts                # Modelos de datos (Note, FolderGroup, Extension, Settings)
│   ├── components/
│   │   ├── DynamicIsland.tsx       # Isla dinámica lateral de escritorio
│   │   ├── ChromiumTabs.tsx        # Navegación por pestañas y carpetas de colores
│   │   ├── NoteEditor.tsx          # Hoja de redacción, adjuntos y simulador en tiempo real
│   │   ├── OnboardingModal.tsx     # Bienvenida, vinculación por QR y código de 8 caracteres
│   │   ├── SettingsModal.tsx       # Ajustes de Drive, R2, autostart y vinculación
│   │   ├── CustomCssEditor.tsx     # Editor de CSS en vivo con plantillas
│   │   └── ExtensionsHub.tsx       # Gestor y widgets de extensiones
│   └── utils/
│       └── storage.ts              # Persistencia local y datos de ejemplo
├── src-tauri/                      # Núcleo nativo en Rust (Tauri v2)
│   ├── Cargo.toml                  # Dependencias de Rust
│   ├── tauri.conf.json             # Configuración de ventana y permisos
│   └── src/
│       ├── lib.rs                  # Plugins de autostart y comandos nativos
│       └── main.rs                 # Punto de entrada nativo
└── package.json
```
