import { ThemeId } from '../types/diary';

export type SupportedLang = 'es' | 'en' | 'pt' | 'ja' | 'fr';

export interface ThemeI18n {
  name: string;
  tag: string;
  desc: string;
}

export interface LangStrings {
  id: SupportedLang;
  label: string;
  flag: string;
  welcomeHeading: string;
  welcomeSub: string;
  btnCreate: string;
  btnLink: string;
  customizeTitle: string;
  namePrompt: string;
  nameDefault: string;
  themePrompt: string;
  avatarPrompt: string;
  uploadPng: string;
  pngLimitNote: string;
  btnStart: string;
  linkTitle: string;
  linkPrompt: string;
  linkBtn: string;
  welcomeNoteTitle: string;
  welcomeNoteContent: string;
  folderName: string;
  // Tabs & General Settings
  generalSettings: string;
  tabThemes: string;
  tabBehavior: string;
  tabExtensions: string;
  tabSync: string;
  scaleTitle: string;
  scaleDesc: string;
  fontTitle: string;
  avatarTitle: string;
  customCssTitle: string;
  customCssDesc: string;
  copyCssPrompt: string;
  deploymentTitle: string;
  deploymentDesc: string;
  deploymentHover: string;
  deploymentHoverDesc: string;
  deploymentClick: string;
  deploymentClickDesc: string;
  dockPositionTitle: string;
  dockTop: string;
  dockBottom: string;
  dockRight: string;
  dockLeft: string;
  autostartTitle: string;
  autostartDesc: string;
  gameModeTitle: string;
  gameModeDesc: string;
  gameModeShortcut: string;
  resetDiaryTitle: string;
  resetDiaryDesc: string;
  resetDiaryBtn: string;
  extensionsTitle: string;
  copyExtPrompt: string;
  importExt: string;
  exportExt: string;
  pairingTitle: string;
  pairingDesc: string;
  copyCode: string;
  linkOtherTitle: string;
  copiedToast: string;
  searchPlaceholder: string;
  newNote: string;
  newFolder: string;
  deleteNote: string;
  pinNotification: string;
  themes: Record<ThemeId, ThemeI18n>;
}

export const AI_EXTENSION_PROMPT_GUIDE = `Act as an expert frontend engineer building a custom widget plugin for the Cross-Diary app.
Generate pure, secure vanilla JavaScript for the Cross-Diary isolated sandbox widget.
Requirements & Environment:
- The code runs inside an isolated sandbox container.
- Available arguments: 'container' (HTMLElement to render your UI) and 'api':
  * api.insertText(text: string): Appends markdown or text to the active diary note.
  * api.getStorage(key: string): Reads persistent stored data for this extension.
  * api.setStorage(key: string, value: string): Saves persistent data for this extension.
- Style your UI with clean, responsive dark/light compatible styling.
- Do NOT use markdown code fences or conversational text. Return ONLY executable JavaScript code.

Here is what I want the extension to do: `;

export const AI_CSS_PROMPT_GUIDE = `Act as an expert UI/UX designer and CSS developer for Cross-Diary.
Generate clean, valid custom CSS rules to customize the Cross-Diary interface according to the user's instructions.
System Variables & Target Classes:
- Core Variables:
  * --bg-main (main app background)
  * --bg-surface (secondary surface color)
  * --bg-card (container & card background)
  * --bg-pill (accent buttons & pills background)
  * --text-main (primary text color)
  * --text-muted (subtle/secondary text color)
  * --accent (brand accent color)
  * --accent-fg (text color on accent elements)
  * --border-color (subtle borders)
  * --border-strong (highlighted borders)
  * --card-radius (border-radius, e.g., 20px)
  * --pill-shadow (box-shadow)
- Rainbow Gradient Sequences (Folders & Sheets):
  * Target specific folders and sheets with [data-rainbow-index="0"], [data-rainbow-index="1"], etc.
  * Override the color sequence with: [data-rainbow-index="0"] { --item-color: #ff3366 !important; }
  * CSS variables available on items: --item-color, --rainbow-hue, --rainbow-index
- Window Shape & Island Geometry:
  * You CAN customize the entire shape of the Dynamic Island and floating containers!
  * Target .island-container, #root, or the main floating window container.
  * Use border-radius (e.g. border-radius: 42px !important; or border-radius: 0px !important; for brutalist box).
  * Use clip-path (e.g. clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%) !important; for cyber bevels, or clip-path: inset(0 round 32px)).
- Editor Elements:
  * .notion-editor, .notion-block, textarea, h1, h2, h3, blockquote, code, ul, li
- Output:
  * Return ONLY valid CSS code that can be directly pasted into the Cross-Diary custom CSS field. No markdown fences.

Here is how I want the styling to look: `;

export const AI_CSS_PROMPT_GUIDE_ES = `Actúa como un diseñador UI/UX experto y desarrollador de CSS para Cross-Diary.
Genera reglas de CSS puro, limpio y válido para personalizar la interfaz de Cross-Diary según las instrucciones del usuario.

Variables del Sistema y Selectores:
- Variables Principales del Tema:
  * --bg-main (fondo principal de la aplicación)
  * --bg-surface (color de superficies secundarias)
  * --bg-card (fondo de tarjetas y contenedores)
  * --bg-pill (fondo de botones de acento y píldoras)
  * --text-main (color de texto principal)
  * --text-muted (color de texto secundario/sutil)
  * --accent (color de acento de la marca)
  * --accent-fg (color del texto sobre elementos de acento)
  * --border-color (bordes sutiles)
  * --border-strong (bordes destacados)
  * --card-radius (radio de esquinas, ej: 20px)
  * --pill-shadow (sombras)

- Secuencias de Degradado Arcoíris (Carpetas y Hojas):
  * Selecciona carpetas y hojas específicas con [data-rainbow-index="0"], [data-rainbow-index="1"], etc.
  * Modifica la secuencia con: [data-rainbow-index="0"] { --item-color: #ff3366 !important; }
  * Variables CSS disponibles: --item-color, --rainbow-hue, --rainbow-index

- Forma de la Ventana y Geometría de la Isla:
  * ¡Puedes personalizar completamente la forma de la Isla Dinámica y ventanas flotantes!
  * Aplica estilos a .island-container, #root o el contenedor flotante principal.
  * Usa border-radius (ej: border-radius: 42px !important; o border-radius: 0px !important; para cajas brutalistas).
  * Usa clip-path (ej: clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%) !important; o clip-path: inset(0 round 32px)).

- Elementos del Editor:
  * .notion-editor, textarea, h1, h2, h3, blockquote, code, ul, li

- Salida:
  * Devuelve ÚNICAMENTE código CSS válido que se pueda pegar directamente en el campo de CSS personalizado de Cross-Diary. Sin bloques de markdown ni texto explicativo.

Aquí están las indicaciones de diseño que quiero aplicar: `;

export const LANGUAGES: Record<SupportedLang, LangStrings> = {
  es: {
    id: 'es',
    label: 'Español',
    flag: '🇪🇸',
    welcomeHeading: 'BIENVENIDO A CROSS-DIARY',
    welcomeSub: 'Tu diario personal, estético y modular con Isla Dinámica de escritorio.',
    btnCreate: 'Crear nuevo diario',
    btnLink: 'Vincular diario existente',
    customizeTitle: 'PERSONALIZA TU ESPACIO',
    namePrompt: 'Nombre de tu diario:',
    nameDefault: 'MI DIARIO',
    themePrompt: 'Elige tu estética visual:',
    avatarPrompt: 'Elige tu sello distintivo o sube una imagen:',
    uploadPng: 'Subir PNG (máx 1MB)',
    pngLimitNote: 'PNG o JPG de hasta 1MB (se sincroniza con todos tus dispositivos)',
    btnStart: 'Comenzar a escribir',
    linkTitle: 'VINCULAR DIARIO',
    linkPrompt: 'Introduce el código de 8 cifras de tu otro dispositivo:',
    linkBtn: 'Vincular y sincronizar',
    folderName: 'BITÁCORA',
    welcomeNoteTitle: 'NOTAS DEL DÍA // 01',
    welcomeNoteContent: `# NOTAS DEL DÍA // 01

¡Bienvenido a tu nuevo Cross-Diary! Aquí tienes un ejemplo práctico de bloques interactivos NoteBlock integrados directamente en tu hoja:

[[bloque:wdg-checklist-welcome]]

[[bloque:wdg-timer-welcome]]

Escribe aquí tus ideas, notas rápidas o escribe '/' para insertar más bloques interactivos como cronómetros, dibujos a mano alzada o tablas de cálculo.`,
    generalSettings: 'Ajustes Generales',
    tabThemes: 'Aspecto & Escala',
    tabBehavior: 'Comportamiento',
    tabExtensions: 'Extensiones',
    tabSync: 'Sincronización',
    scaleTitle: 'Escala de la Isla (Proporción Fija)',
    scaleDesc: 'Ajusta el tamaño global manteniendo rigurosamente la proporción de la ventana.',
    fontTitle: 'Tipografía del Sistema',
    avatarTitle: 'Icono o Foto del Diario',
    customCssTitle: 'CSS Personalizado & Prompt IA',
    customCssDesc: 'Inyecta código CSS en vivo o copia el prompt para que una IA genere tu tema personalizado.',
    copyCssPrompt: 'Copiar Prompt IA para CSS',
    deploymentTitle: 'Modo de Despliegue de la Isla',
    deploymentDesc: 'Elige cómo quieres que aparezca la Isla Dinámica desde el borde de tu pantalla:',
    deploymentHover: 'Al Pasar el Ratón por la Guía (Hover)',
    deploymentHoverDesc: 'Solo se abre cuando el cursor toca específicamente la guía del borde. Se oculta suavemente al alejar el ratón.',
    deploymentClick: 'Solo con Clic en la Guía (Fijo)',
    deploymentClickDesc: 'La isla nunca se abre por accidente. Solo se despliega al hacer clic en la guía del borde.',
    dockPositionTitle: 'Posición de la Isla en la Pantalla',
    dockTop: 'Arriba (Isla Notch)',
    dockBottom: 'Abajo (Dock)',
    dockRight: 'Derecha (Lateral)',
    dockLeft: 'Izquierda (Lateral)',
    autostartTitle: 'Iniciar al encender la PC',
    autostartDesc: 'Abre tu diario como barra lateral silenciosa al arrancar Windows.',
    gameModeTitle: 'Modo Juegos & Ocultación Automática',
    gameModeDesc: 'Cross-Diary detecta automáticamente cuando juegas a pantalla completa o sin bordes (Direct3D/DirectX) y oculta la isla por completo para liberar la pantalla y el ratón al 100%. Excluida de Alt+Tab.',
    gameModeShortcut: 'Atajo global para ocultar/mostrar:',
    resetDiaryTitle: 'Borrar Diario / Datos Guardados',
    resetDiaryDesc: 'Elige si deseas borrar solo los datos locales o solicitar el borrado permanente de tu diario en la nube.',
    resetDiaryBtn: 'Borrar Diario / Restablecer',
    extensionsTitle: 'Módulos Instalados',
    copyExtPrompt: 'Copiar Prompt IA para Extensiones',
    importExt: 'Importar',
    exportExt: 'Exportar',
    pairingTitle: 'Código de este Diario',
    pairingDesc: 'Introduce este código en tu teléfono u otro PC para sincronizar al instante.',
    copyCode: 'Copiar Código',
    linkOtherTitle: 'Vincular a Otro Diario',
    copiedToast: '¡Copiado!',
    searchPlaceholder: 'Buscar notas...',
    newNote: 'Nueva Hoja',
    newFolder: 'Nueva Carpeta',
    deleteNote: 'Eliminar Hoja',
    pinNotification: 'Fijar en Notificaciones',
    themes: {
      'solar-flare': {
        name: 'Vermilion Pulse // 01',
        tag: 'ALTO CONTRASTE',
        desc: 'Porcelana blanca, bermellón eléctrico #FF2E00 y tinta negra.',
      },
      'milk-sakura': {
        name: 'Mochi Cream & Berry',
        tag: 'PASTEL KAWAII',
        desc: 'Crema de fresa suave, rosa cereza y bordes redondeados dulces.',
      },
      'velvet-nebula': {
        name: 'Amethyst Horizon',
        tag: 'OBSIDIANA VIOLETA',
        desc: 'Noche obsidiana profunda con acentos orquídea luminosos.',
      },
      'amber-oxide': {
        name: 'Phosphor Oxide 84',
        tag: 'TERMINAL RETRO',
        desc: 'Carbón cálido, ámbar fundido y sombras sólidas de laboratorio retro.',
      },
      'cyber-mirage': {
        name: 'Acid Mirage',
        tag: 'NEÓN ELÉCTRICO',
        desc: 'Fondo abisal ciberpunk, magenta láser y cian reactivo fluorescente.',
      },
    },
  },
  en: {
    id: 'en',
    label: 'English',
    flag: '🇺🇸',
    welcomeHeading: 'WELCOME TO CROSS-DIARY',
    welcomeSub: 'Your personal, aesthetic, and modular Dynamic Island desktop diary.',
    btnCreate: 'Create new diary',
    btnLink: 'Link existing diary',
    customizeTitle: 'CUSTOMIZE YOUR SPACE',
    namePrompt: 'Diary name:',
    nameDefault: 'MY DIARY',
    themePrompt: 'Choose your visual aesthetic:',
    avatarPrompt: 'Choose your signature stamp or upload an image:',
    uploadPng: 'Upload PNG (max 1MB)',
    pngLimitNote: 'PNG or JPG up to 1MB (syncs across all your devices)',
    btnStart: 'Start writing',
    linkTitle: 'LINK DIARY',
    linkPrompt: 'Enter the 8-character pairing code from your other device:',
    linkBtn: 'Link and sync',
    folderName: 'JOURNAL',
    welcomeNoteTitle: 'DAILY NOTES // 01',
    welcomeNoteContent: `# DAILY NOTES // 01

Welcome to your new Cross-Diary! Here is a live example of NoteBlock interactive widgets embedded directly into your sheet:

[[bloque:wdg-checklist-welcome]]

[[bloque:wdg-timer-welcome]]

Type your thoughts or quick notes here, or type '/' to insert more interactive blocks like stopwatches, sketch drawings, or mini spreadsheets.`,
    generalSettings: 'General Settings',
    tabThemes: 'Appearance & Scale',
    tabBehavior: 'Behavior',
    tabExtensions: 'Extensions',
    tabSync: 'Sync & Devices',
    scaleTitle: 'Island Scale (Fixed Ratio)',
    scaleDesc: 'Adjust global size while strictly maintaining window aspect ratio.',
    fontTitle: 'System Typography',
    avatarTitle: 'Diary Icon or Photo',
    customCssTitle: 'Custom CSS & AI Prompt',
    customCssDesc: 'Inject live CSS styling or copy the AI prompt to generate your custom theme.',
    copyCssPrompt: 'Copy AI Prompt for CSS',
    deploymentTitle: 'Island Deployment Mode',
    deploymentDesc: 'Choose how the Dynamic Island opens from your screen edge:',
    deploymentHover: 'Hover Edge Guide',
    deploymentHoverDesc: 'Only opens when cursor specifically touches edge guide. Closes smoothly on mouse leave.',
    deploymentClick: 'Click Edge Guide Only (Fixed)',
    deploymentClickDesc: 'Never opens by accident. Only unfolds when you click the edge guide.',
    dockPositionTitle: 'Island Screen Edge Position',
    dockTop: 'Top (Notch Island)',
    dockBottom: 'Bottom (Dock)',
    dockRight: 'Right (Edge Dock)',
    dockLeft: 'Left (Edge Dock)',
    autostartTitle: 'Start on Windows Boot',
    autostartDesc: 'Launches your diary as a silent background edge dock on system startup.',
    gameModeTitle: 'Game Mode & Auto-Hide',
    gameModeDesc: 'Cross-Diary automatically detects fullscreen or borderless games (Direct3D/DirectX) and hides completely, releasing 100% of the screen and inputs. Excluded from Alt+Tab.',
    gameModeShortcut: 'Global shortcut to hide/show:',
    resetDiaryTitle: 'Delete Diary / Saved Data',
    resetDiaryDesc: 'Choose whether to delete local data only or request permanent deletion of your diary from the cloud.',
    resetDiaryBtn: 'Delete Diary / Reset',
    extensionsTitle: 'Installed Modules',
    copyExtPrompt: 'Copy AI Prompt for Extensions',
    importExt: 'Import',
    exportExt: 'Export',
    pairingTitle: 'This Diary Pairing Code',
    pairingDesc: 'Enter this code on your phone or another PC to sync notes instantly.',
    copyCode: 'Copy Code',
    linkOtherTitle: 'Link to Another Diary',
    copiedToast: 'Copied!',
    searchPlaceholder: 'Search notes...',
    newNote: 'New Sheet',
    newFolder: 'New Folder',
    deleteNote: 'Delete Sheet',
    pinNotification: 'Pin in Notifications',
    themes: {
      'solar-flare': {
        name: 'Vermilion Pulse // 01',
        tag: 'HIGH CONTRAST',
        desc: 'White porcelain, electric vermilion #FF2E00 and bold black ink.',
      },
      'milk-sakura': {
        name: 'Mochi Cream & Berry',
        tag: 'PASTEL KAWAII',
        desc: 'Soft strawberry cream, cherry blossom pink and bubbly rounded aesthetic.',
      },
      'velvet-nebula': {
        name: 'Amethyst Horizon',
        tag: 'VIOLET OBSIDIAN',
        desc: 'Deep obsidian night with luminous orchid purple accents.',
      },
      'amber-oxide': {
        name: 'Phosphor Oxide 84',
        tag: 'RETRO TERMINAL',
        desc: 'Warm charcoal, molten amber and solid geometric laboratory shadows.',
      },
      'cyber-mirage': {
        name: 'Acid Mirage',
        tag: 'ELECTRIC NEON',
        desc: 'Abyssal cyberpunk dark, laser magenta and reactive fluorescent cyan.',
      },
    },
  },
  pt: {
    id: 'pt',
    label: 'Português',
    flag: '🇧🇷',
    welcomeHeading: 'BEM-VINDO AO CROSS-DIARY',
    welcomeSub: 'Seu diário pessoal, estético e modular com Ilha Dinâmica para desktop.',
    btnCreate: 'Criar novo diário',
    btnLink: 'Vincular diário existente',
    customizeTitle: 'PERSONALIZE SEU ESPAÇO',
    namePrompt: 'Nome do seu diário:',
    nameDefault: 'MEU DIÁRIO',
    themePrompt: 'Escolha sua estética visual:',
    avatarPrompt: 'Escolha seu selo ou envie uma foto:',
    uploadPng: 'Enviar PNG (máx 1MB)',
    pngLimitNote: 'PNG ou JPG até 1MB (sincroniza com todos os seus dispositivos)',
    btnStart: 'Começar a escrever',
    linkTitle: 'VINCULAR DIÁRIO',
    linkPrompt: 'Digite o código de emparelhamento de 8 caracteres do seu outro dispositivo:',
    linkBtn: 'Vincular e sincronizar',
    folderName: 'DIÁRIO',
    welcomeNoteTitle: 'NOTAS DO DIA // 01',
    welcomeNoteContent: `# NOTAS DO DIA // 01\n\nBem-vindo ao seu Cross-Diary!`,
    generalSettings: 'Configurações Gerais',
    tabThemes: 'Aparência & Escala',
    tabBehavior: 'Comportamento',
    tabExtensions: 'Extensões',
    tabSync: 'Sincronização',
    scaleTitle: 'Escala da Ilha',
    scaleDesc: 'Ajuste o tamanho global mantendo a proporção exata.',
    fontTitle: 'Tipografia do Sistema',
    avatarTitle: 'Ícone ou Foto do Diário',
    customCssTitle: 'CSS Personalizado & Prompt IA',
    customCssDesc: 'Injete código CSS ou copie o prompt para IA.',
    copyCssPrompt: 'Copiar Prompt IA para CSS',
    deploymentTitle: 'Modo de Ativação da Ilha',
    deploymentDesc: 'Escolha como a Ilha Dinâmica se abre na borda da tela:',
    deploymentHover: 'Ao passar o mouse (Hover)',
    deploymentHoverDesc: 'Abre suavemente ao encostar o cursor na guia.',
    deploymentClick: 'Somente ao clicar (Fixo)',
    deploymentClickDesc: 'Abre apenas quando você clica na guia.',
    dockPositionTitle: 'Posição na Tela',
    dockTop: 'Topo',
    dockBottom: 'Base',
    dockRight: 'Direita',
    dockLeft: 'Esquerda',
    autostartTitle: 'Iniciar com o Windows',
    autostartDesc: 'Abre em segundo plano ao ligar o computador.',
    gameModeTitle: 'Modo Jogos & Ocultação Automática',
    gameModeDesc: 'Oculta automaticamente em jogos de tela cheia ou sem bordas. Fora do Alt+Tab.',
    gameModeShortcut: 'Atalho global ocultar/mostrar:',
    resetDiaryTitle: 'Excluir Diário / Dados Salvos',
    resetDiaryDesc: 'Escolha se deseja apagar apenas os dados locais ou solicitar a exclusão permanente na nuvem.',
    resetDiaryBtn: 'Excluir Diário / Redefinir',
    extensionsTitle: 'Módulos Instalados',
    copyExtPrompt: 'Copiar Prompt IA para Extensões',
    importExt: 'Importar',
    exportExt: 'Exportar',
    pairingTitle: 'Código deste Diário',
    pairingDesc: 'Insira este código em outro dispositivo para sincronizar.',
    copyCode: 'Copiar Código',
    linkOtherTitle: 'Vincular a Outro Diário',
    copiedToast: 'Copiado!',
    searchPlaceholder: 'Buscar notas...',
    newNote: 'Nova Folha',
    newFolder: 'Nova Pasta',
    deleteNote: 'Excluir Folha',
    pinNotification: 'Fixar nas Notificações',
    themes: {
      'solar-flare': { name: 'Vermilion Pulse', tag: 'ALTO CONTRASTE', desc: 'Porcelana branca e vermelho elétrico.' },
      'milk-sakura': { name: 'Mochi Cream & Berry', tag: 'PASTEL', desc: 'Creme de morango e cerejeira.' },
      'velvet-nebula': { name: 'Amethyst Horizon', tag: 'OBSIDIANA', desc: 'Noite profunda com tons violeta.' },
      'amber-oxide': { name: 'Phosphor Oxide 84', tag: 'RETRO', desc: 'Carvão e âmbar quente.' },
      'cyber-mirage': { name: 'Acid Mirage', tag: 'NEON', desc: 'Cyberpunk com ciano e magenta.' },
    },
  },
  ja: {
    id: 'ja',
    label: '日本語',
    flag: '🇯🇵',
    welcomeHeading: 'CROSS-DIARY へようこそ',
    welcomeSub: 'デスクトップのダイナミックアイランドを備えた美しくモジュール式の日記アプリ。',
    btnCreate: '新しい日記を作成',
    btnLink: '既存の日記を連携',
    customizeTitle: 'スペースをカスタマイズ',
    namePrompt: '日記の名前:',
    nameDefault: '私の日記',
    themePrompt: 'ビジュアルテーマを選択:',
    avatarPrompt: 'スタンプまたは画像をアップロード:',
    uploadPng: 'PNG画像をアップロード (最大1MB)',
    pngLimitNote: '1MB以下の画像 (全端末とリアルタイム同期)',
    btnStart: '書き始める',
    linkTitle: '日記を連携',
    linkPrompt: '他の端末に表示された8文字のコードを入力してください:',
    linkBtn: '連携して同期',
    folderName: 'ノート',
    welcomeNoteTitle: '本日のノート // 01',
    welcomeNoteContent: `# 本日のノート // 01\n\nCross-Diary へようこそ！`,
    generalSettings: '一般設定',
    tabThemes: '外観とスケール',
    tabBehavior: '動作設定',
    tabExtensions: '拡張機能',
    tabSync: '同期・端末',
    scaleTitle: 'アイランドの拡大率',
    scaleDesc: 'アスペクト比を維持しながらサイズを調整します。',
    fontTitle: 'フォント設定',
    avatarTitle: '日記アイコンまたは写真',
    customCssTitle: 'カスタムCSS & AIプロンプト',
    customCssDesc: 'CSSを直接編集するか、AI用プロンプトをコピーして生成できます。',
    copyCssPrompt: 'CSS用AIプロンプトをコピー',
    deploymentTitle: 'アイランドの展開方法',
    deploymentDesc: '画面端から開くトリガーを選択:',
    deploymentHover: 'ガイドにホバー時 (Hover)',
    deploymentHoverDesc: 'マウスが端のガイドに触れたときのみスムーズに展開します。',
    deploymentClick: 'クリック時のみ (固定)',
    deploymentClickDesc: '誤作動を防ぎ、クリックするまで展開しません。',
    dockPositionTitle: '画面上の配置位置',
    dockTop: '上部 (ノッチ)',
    dockBottom: '下部 (ドック)',
    dockRight: '右端',
    dockLeft: '左端',
    autostartTitle: 'PC起動時に自動開始',
    autostartDesc: 'Windows起動時に静かにバックグラウンドで開始します。',
    gameModeTitle: 'ゲームモード & 自動非表示',
    gameModeDesc: 'フルスクリーンまたはボーダーレスゲームを自動検出し、完全に非表示にします。Alt+Tab非表示。',
    gameModeShortcut: '表示/非表示のショートカット:',
    resetDiaryTitle: '日記の削除・保存データ初期化',
    resetDiaryDesc: 'ローカルデータのみを消去するか、クラウド上の日記の完全削除を要求するかを選択できます。',
    resetDiaryBtn: '日記を削除・初期化',
    extensionsTitle: 'インストール済み拡張機能',
    copyExtPrompt: '拡張機能用AIプロンプトをコピー',
    importExt: 'インポート',
    exportExt: 'エクスポート',
    pairingTitle: 'この日記の連携コード',
    pairingDesc: 'スマホや他のPCに入力して瞬時に同期します。',
    copyCode: 'コードをコピー',
    linkOtherTitle: '別の日記と連携',
    copiedToast: 'コピー完了！',
    searchPlaceholder: 'ノートを検索...',
    newNote: '新しいノート',
    newFolder: '新しいフォルダ',
    deleteNote: 'ノートを削除',
    pinNotification: '通知に固定',
    themes: {
      'solar-flare': { name: 'Vermilion Pulse', tag: '高コントラスト', desc: '純白とエレクトリックバーミリオン。' },
      'milk-sakura': { name: 'Mochi Cream & Berry', tag: 'カワイイ', desc: 'イチゴミルクとサクラピンク。' },
      'velvet-nebula': { name: 'Amethyst Horizon', tag: 'オブシディアン', desc: '深い夜と紫のアクセント。' },
      'amber-oxide': { name: 'Phosphor Oxide 84', tag: 'レトロ', desc: '温かみのある琥珀色とチャコール。' },
      'cyber-mirage': { name: 'Acid Mirage', tag: 'サイバーネオン', desc: 'マゼンタとシアンのサイバーパンク。' },
    },
  },
  fr: {
    id: 'fr',
    label: 'Français',
    flag: '🇫🇷',
    welcomeHeading: 'BIENVENUE SUR CROSS-DIARY',
    welcomeSub: 'Votre carnet personnel, esthétique et modulaire avec Dynamic Island de bureau.',
    btnCreate: 'Créer un nouveau carnet',
    btnLink: 'Lier un carnet existant',
    customizeTitle: 'PERSONNALISEZ VOTRE ESPACE',
    namePrompt: 'Nom du carnet :',
    nameDefault: 'MON CARNET',
    themePrompt: 'Choisissez votre thème :',
    avatarPrompt: 'Choisissez votre sceau ou téléversez une image :',
    uploadPng: 'Téléverser PNG (max 1Mo)',
    pngLimitNote: 'PNG ou JPG jusqu\'à 1Mo (synchronisé sur tous vos appareils)',
    btnStart: 'Commencer à écrire',
    linkTitle: 'LIER UN CARNET',
    linkPrompt: 'Entrez le code à 8 chiffres de votre autre appareil :',
    linkBtn: 'Lier et synchroniser',
    folderName: 'CARNET',
    welcomeNoteTitle: 'NOTES DU JOUR // 01',
    welcomeNoteContent: `# NOTES DU JOUR // 01\n\nBienvenue sur Cross-Diary !`,
    generalSettings: 'Paramètres Généraux',
    tabThemes: 'Apparence & Échelle',
    tabBehavior: 'Comportement',
    tabExtensions: 'Extensions',
    tabSync: 'Synchronisation',
    scaleTitle: 'Échelle de l\'Île',
    scaleDesc: 'Ajustez la taille tout en conservant les proportions.',
    fontTitle: 'Typographie du Système',
    avatarTitle: 'Icône ou Photo du Carnet',
    customCssTitle: 'CSS Personnalisé & Prompt IA',
    customCssDesc: 'Injectez du style CSS ou copiez le prompt pour l\'IA.',
    copyCssPrompt: 'Copier le Prompt IA pour CSS',
    deploymentTitle: 'Mode de Déploiement',
    deploymentDesc: 'Choisissez comment l\'Île s\'ouvre depuis le bord de votre écran :',
    deploymentHover: 'Au survol de la souris (Hover)',
    deploymentHoverDesc: 'S\'ouvre lorsque le curseur touche la bordure.',
    deploymentClick: 'Au clic uniquement (Fixe)',
    deploymentClickDesc: 'Reste fixe jusqu\'à ce que vous cliquiez dessus.',
    dockPositionTitle: 'Position de l\'Île',
    dockTop: 'Haut (Encoche)',
    dockBottom: 'Bas (Dock)',
    dockRight: 'Droite',
    dockLeft: 'Gauche',
    autostartTitle: 'Démarrer avec Windows',
    autostartDesc: 'Se lance discrètement au démarrage du PC.',
    gameModeTitle: 'Mode Jeux & Masquage Automatique',
    gameModeDesc: 'Masque automatiquement l\'île dans les jeux plein écran. Exclu d\'Alt+Tab.',
    gameModeShortcut: 'Raccourci masquer/afficher :',
    resetDiaryTitle: 'Supprimer le Carnet / Données',
    resetDiaryDesc: 'Choisissez si vous souhaitez effacer uniquement les données locales ou demander la suppression définitive dans le cloud.',
    resetDiaryBtn: 'Supprimer le Carnet / Réinitialiser',
    extensionsTitle: 'Modules Installés',
    copyExtPrompt: 'Copier le Prompt IA pour Extensions',
    importExt: 'Importer',
    exportExt: 'Exporter',
    pairingTitle: 'Code de ce Carnet',
    pairingDesc: 'Entrez ce code sur votre téléphone ou un autre PC pour synchroniser.',
    copyCode: 'Copier le Code',
    linkOtherTitle: 'Lier à un Autre Carnet',
    copiedToast: 'Copié !',
    searchPlaceholder: 'Rechercher des notes...',
    newNote: 'Nouvelle Feuille',
    newFolder: 'Nouveau Dossier',
    deleteNote: 'Supprimer la Feuille',
    pinNotification: 'Épingler dans les Notifications',
    themes: {
      'solar-flare': { name: 'Vermilion Pulse', tag: 'HAUT CONTRASTE', desc: 'Porcelaine blanche et vermillon électrique.' },
      'milk-sakura': { name: 'Mochi Cream & Berry', tag: 'PASTEL', desc: 'Crème de fraise et fleur de cerisier.' },
      'velvet-nebula': { name: 'Amethyst Horizon', tag: 'OBSIDIENNE', desc: 'Nuit profonde avec touches violettes.' },
      'amber-oxide': { name: 'Phosphor Oxide 84', tag: 'RÉTRO', desc: 'Charbon chaud et ambre fondu.' },
      'cyber-mirage': { name: 'Acid Mirage', tag: 'NÉON', desc: 'Cyberpunk avec cyan et magenta.' },
    },
  },
};
