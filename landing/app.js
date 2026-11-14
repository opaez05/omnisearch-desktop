(() => {
    // Configuración por Sistema Operativo
    const OS_CONFIG = {
        windows: {
            description: 'Instalador nativo MSI/EXE compilado con Tauri v2 y Rust (~50 MB RAM en reposo).',
            primaryLabel: 'Descargar para Windows (x64)',
            secondaryLabel: 'Descargar para ARM64',
            requirements: 'Windows 10 / 11 (64 bits) · 8 GB RAM · Sin GPU dedicada requerida',
            shellName: 'Windows PowerShell',
            cliCommand: 'irm https://omnisearch.local/install.ps1 | iex',
            primaryFile: 'OmniSearch-Desktop_0.4.2_x64-setup.msi (42.8 MB)',
            secondaryFile: 'OmniSearch-Desktop_0.4.2_arm64-setup.msi (41.2 MB)',
            sha256: '4f8a92c1e7b03d94a61c8e20f5d12b78a3e904c1f76d82b5a90e1c4d3b2f8190',
            steps: [
                'Ejecuta el instalador .msi descargado.',
                'Selecciona las carpetas locales que deseas indexar de forma privada.',
                'Espera la descarga automática única de los modelos cuantizados (BGE-Small y Moondream2).'
            ]
        },
        macos: {
            description: 'Aplicación universal nativa para Apple Silicon (M1–M4) e Intel con aceleración Metal.',
            primaryLabel: 'Descargar para Apple Silicon (M1–M4)',
            secondaryLabel: 'Descargar para Mac Intel (x64)',
            requirements: 'macOS 12 Monterey o posterior · 8 GB RAM unificada',
            shellName: 'macOS Terminal (zsh / bash)',
            cliCommand: 'curl -fsSL https://omnisearch.local/install.sh | sh',
            primaryFile: 'OmniSearch-Desktop_0.4.2_aarch64.dmg (39.5 MB)',
            secondaryFile: 'OmniSearch-Desktop_0.4.2_x64.dmg (43.1 MB)',
            sha256: '8b2e74d91a05c38f62e4b19d0a7c5e31f8492a6d0c1e7b35a492f81c6d0e3a72',
            steps: [
                'Abre la imagen .dmg y arrastra OmniSearch Desktop a tu carpeta Aplicaciones.',
                'Otorga permisos de lectura únicamente sobre las carpetas que quieras indexar.',
                'Comienza a buscar con lenguaje natural sin conexión a internet.'
            ]
        },
        linux: {
            description: 'Paquete portátil AppImage y binario .deb optimizado para distribuciones modernas.',
            primaryLabel: 'Descargar .AppImage (x64)',
            secondaryLabel: 'Descargar paquete .deb (Ubuntu / Debian)',
            requirements: 'Ubuntu 22.04+, Fedora 38+ o Arch Linux · WebKitGTK 4.1 · 8 GB RAM',
            shellName: 'Linux Bash',
            cliCommand: 'curl -fsSL https://omnisearch.local/install.sh | bash',
            primaryFile: 'OmniSearch-Desktop_0.4.2_amd64.AppImage (45.0 MB)',
            secondaryFile: 'OmniSearch-Desktop_0.4.2_amd64.deb (38.7 MB)',
            sha256: '2d91c6e40f83a71b59e2d4c80a1f6b37e9504c2a8d1f73b6e04a92c5d8f1b634',
            steps: [
                'Asigna permisos de ejecución: chmod +x OmniSearch-Desktop_0.4.2_amd64.AppImage',
                'Ejecuta el binario o instala el paquete mediante sudo dpkg -i.',
                'El daemon en Rust comenzará a indexar tus documentos en segundo plano.'
            ]
        }
    };

    const MOCK_FILES = [
        {
            id: 'contrato-pdf',
            name: 'Contrato_Servicios_TechCorp_2026.pdf',
            type: 'Documento PDF · BGE-Small',
            score: '98.4%',
            path: '~/Documentos/Contratos/Contrato_Servicios_TechCorp_2026.pdf',
            model: 'BGE-Small (Embeddings Locales)',
            snippet: 'Cláusula 14.2: En caso de incumplimiento en los plazos de entrega, aplicará una penalización del 10% sobre el valor total...',
            keywords: ['contrato', 'penalización', '10%', 'cláusula', 'servicios']
        },
        {
            id: 'foto-firma',
            name: 'IMG_20261018_Firma_Acuerdo.jpg',
            type: 'Imagen · Moondream2 VLM',
            score: '95.7%',
            path: '~/Documentos/Contratos/Anexos/IMG_20261018_Firma_Acuerdo.jpg',
            model: 'Moondream2 (Visión Computacional Local)',
            snippet: 'Descripción VLM: Fotografía de documento impreso sobre escritorio con firma manuscrita en tinta azul y sello de recibido.',
            keywords: ['foto', 'firma', 'imagen', 'contrato', 'sello', 'documento']
        },
        {
            id: 'comprobante-luz',
            name: 'Comprobante_Nequi_Luz_Juancho.png',
            type: 'Captura de Pantalla · Moondream2 VLM',
            score: '97.1%',
            path: '~/Imágenes/Recibos/Comprobante_Nequi_Luz_Juancho.png',
            model: 'Moondream2 (OCR + Comprensión Visual)',
            snippet: 'Descripción VLM: Comprobante de transferencia exitosa por $148.500 COP con referencia "Pago recibo de luz - Juancho".',
            keywords: ['pago', 'luz', 'juancho', 'recibo', 'transferencia', 'nequi']
        },
        {
            id: 'audio-reunion',
            name: 'Nota_Voz_Entrega_Proyecto_04.m4a',
            type: 'Audio · Whisper Local',
            score: '94.2%',
            path: '~/Documentos/Reuniones/Nota_Voz_Entrega_Proyecto_04.m4a',
            model: 'Whisper.cpp (Transcripción Offline)',
            snippet: 'Transcripción [01:14]: "Recuerda que para la entrega final del proyecto debemos mostrar la demo corriendo sin internet..."',
            keywords: ['nota', 'voz', 'audio', 'entrega', 'final', 'proyecto']
        }
    ];

    let currentOS = 'windows';
    let selectedFileId = MOCK_FILES[0].id;

    // Referencias DOM
    const osTabs = document.querySelectorAll('.os-tab');
    const osDesc = document.getElementById('os-description');
    const labelPrimary = document.getElementById('label-primary');
    const labelSecondary = document.getElementById('label-secondary');
    const osReq = document.getElementById('os-requirements');
    const cliShellName = document.getElementById('cli-shell-name');
    const cliCommand = document.getElementById('cli-command');

    const btnPrimary = document.getElementById('btn-download-primary');
    const btnSecondary = document.getElementById('btn-download-secondary');
    const btnCopyCli = document.getElementById('btn-copy-cli');
    const copyStatus = document.getElementById('copy-status');

    const modal = document.getElementById('download-modal');
    const modalFileInfo = document.getElementById('modal-file-info');
    const modalSha = document.getElementById('modal-sha256');
    const modalSteps = document.getElementById('modal-steps');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnModalDone = document.getElementById('btn-modal-done');

    const searchInput = document.getElementById('semantic-search-input');
    const resultsList = document.getElementById('search-results-list');
    const inspectorPanel = document.getElementById('vector-inspector');
    const promptChips = document.querySelectorAll('.prompt-chip');
    const btnScanFolder = document.getElementById('btn-scan-folder');
    const scanBtnText = document.getElementById('scan-btn-text');
    const scanContainer = document.getElementById('scan-progress-container');
    const scanFill = document.getElementById('scan-progress-fill');

    // Detectar SO inicial del visitante
    function detectOS() {
        const platform = (navigator.userAgent || '').toLowerCase();
        if (platform.includes('mac')) return 'macos';
        if (platform.includes('linux')) return 'linux';
        return 'windows';
    }

    function updateOSView(os) {
        currentOS = os;
        const cfg = OS_CONFIG[os];

        osTabs.forEach((tab) => {
            const isActive = tab.dataset.os === os;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', String(isActive));
        });

        osDesc.textContent = cfg.description;
        labelPrimary.textContent = cfg.primaryLabel;
        labelSecondary.textContent = cfg.secondaryLabel;
        osReq.textContent = cfg.requirements;
        cliShellName.textContent = cfg.shellName;
        cliCommand.textContent = cfg.cliCommand;
    }

    function openDownloadModal(isPrimary) {
        const cfg = OS_CONFIG[currentOS];
        const fileName = isPrimary ? cfg.primaryFile : cfg.secondaryFile;

        modalFileInfo.textContent = `Archivo seleccionado: ${fileName}`;
        modalSha.textContent = cfg.sha256;
        modalSteps.innerHTML = cfg.steps.map((step) => `<li>${step}</li>`).join('');
        modal.hidden = false;
    }

    function renderInspector(file) {
        if (!file) {
            inspectorPanel.innerHTML = '<p class="result-snippet">Selecciona un resultado para inspeccionar sus metadatos vectoriales.</p>';
            return;
        }

        inspectorPanel.innerHTML = `
      <span class="inspector-tag">Inspector Vectorial Local</span>
      <h4>${file.name}</h4>
      <ul class="inspector-meta">
        <li><strong>Ruta local:</strong> <code>${file.path}</code></li>
        <li><strong>Modelo utilizado:</strong> ${file.model}</li>
        <li><strong>Similitud coseno:</strong> ${file.score}</li>
      </ul>
      <div class="inspector-chunk">${file.snippet}</div>
    `;
    }

    function filterAndRenderResults(queryText) {
        const q = queryText.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter((w) => w.length > 2);

        let matches = MOCK_FILES.filter((file) => {
            if (!tokens.length) return true;
            const haystack = `${file.name} ${file.snippet} ${file.keywords.join(' ')}`.toLowerCase();
            return tokens.some((token) => haystack.includes(token));
        });

        if (!matches.length) {
            matches = MOCK_FILES;
        }

        if (!matches.some((m) => m.id === selectedFileId)) {
            selectedFileId = matches[0].id;
        }

        resultsList.innerHTML = matches
            .map(
                (file) => `
        <div class="result-card ${file.id === selectedFileId ? 'selected' : ''}" data-id="${file.id}">
          <div class="result-top">
            <span class="result-name">${file.name}</span>
            <span class="match-score">${file.score}</span>
          </div>
          <div class="result-snippet">${file.type} — ${file.snippet}</div>
        </div>
      `
            )
            .join('');

        resultsList.querySelectorAll('.result-card').forEach((card) => {
            card.addEventListener('click', () => {
                selectedFileId = card.dataset.id;
                filterAndRenderResults(searchInput.value);
            });
        });

        const activeFile = matches.find((f) => f.id === selectedFileId) || matches[0];
        renderInspector(activeFile);
    }

    // Event Listeners
    osTabs.forEach((tab) => {
        tab.addEventListener('click', () => updateOSView(tab.dataset.os));
    });

    btnPrimary.addEventListener('click', () => openDownloadModal(true));
    btnSecondary.addEventListener('click', () => openDownloadModal(false));

    btnCloseModal.addEventListener('click', () => (modal.hidden = true));
    btnModalDone.addEventListener('click', () => (modal.hidden = true));
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
    });

    btnCopyCli.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(cliCommand.textContent);
            copyStatus.textContent = '¡Copiado!';
            setTimeout(() => (copyStatus.textContent = 'Copiar'), 2000);
        } catch {
            copyStatus.textContent = 'Error';
        }
    });

    searchInput.addEventListener('input', (e) => {
        promptChips.forEach((c) => c.classList.remove('active'));
        filterAndRenderResults(e.target.value);
    });

    promptChips.forEach((chip) => {
        chip.addEventListener('click', () => {
            promptChips.forEach((c) => c.classList.remove('active'));
            chip.classList.add('active');
            searchInput.value = chip.dataset.query;
            filterAndRenderResults(chip.dataset.query);
        });
    });

    btnScanFolder.addEventListener('click', () => {
        scanContainer.hidden = false;
        scanFill.style.width = '15%';
        scanBtnText.textContent = 'Indexando vectores...';

        setTimeout(() => (scanFill.style.width = '65%'), 250);
        setTimeout(() => {
            scanFill.style.width = '100%';
            scanBtnText.textContent = '4 archivos indexados';
        }, 650);
        setTimeout(() => {
            scanContainer.hidden = true;
            scanFill.style.width = '0%';
            scanBtnText.textContent = 'Escanear Carpeta';
        }, 2200);
    });

    // Inicialización
    updateOSView(detectOS());
    filterAndRenderResults(searchInput.value);
})();