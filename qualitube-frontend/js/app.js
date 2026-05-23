/**
 * QualiTube - Core Application Logic
 * Gerencia o fluxo de trabalho do pesquisador, o estado volátil e a orquestração stateless.
 */

// Configuração do Backend - Ajustado para o Hugging Face Spaces
const BACKEND_URL = 'https://fmenegottobr-qualitube-api.hf.space';

// Estado global da aplicação (em memória do JavaScript)
const AppState = {
    sessionQuotaSpent: 0,
    searchResults: [],
    searchNextPageToken: null,
    currentSearchQuery: '',
    selectedVideos: new Map(), // videoId -> videoData (detalhes obtidos no Passo 1 ou Passo 2)
    extractedComments: [],     // Comentários acumulados na extração atual
    isExtracting: false,
    pauseRequested: false,
    
    // Lógica de ordenação da tabela
    sortColumn: null,          // Coluna atual ('title', 'channel_title', 'published_at')
    sortDirection: 'asc',      // Direção ('asc', 'desc')
    
    // Controle do Safe Resume (estado da fila de extração)
    extractionQueue: [],       // Lista de IDs dos vídeos a extrair
    currentQueueIndex: 0,      // Índice do vídeo atual na fila
    nextCommentPageToken: null,// Próximo token de página de comentários do vídeo atual
    commentsCollectedForCurrentVideo: 0,

    // Controle de vídeos do canal
    channelVideos: [],
    isExtractingChannelVideos: false,
    currentChannelUploadsPlaylistId: '',
    currentChannelVideoCount: 0,

    // Controle de extração de comentários do canal
    channelExtractedComments: [],
    isExtractingChannelComments: false,
    pauseChannelCommentsRequested: false,
    channelCommentsQueue: [],
    currentChannelCommentsQueueIndex: 0,
    channelCommentsNextPageToken: null,
    channelCommentsCollectedForCurrentVideo: 0,

    // Controle de canais em lote
    batchChannelsResults: [],
    batchChannelsVideos: [],
    isProcessingBatchChannels: false,
    pauseBatchChannelsRequested: false,
    language: 'pt'
};

// Elementos do DOM
const DOM = {
    btnToggleLang: document.getElementById('btn-toggle-lang'),
    sessionQuotaValue: document.getElementById('session-quota-value'),
    dailyQuotaEstimate: document.getElementById('daily-quota-estimate'),
    quotaProgressFill: document.getElementById('quota-progress-fill'),
    quotaWarning: document.getElementById('quota-warning'),
    btnExportSession: document.getElementById('btn-export-session'),
    sessionFileUpload: document.getElementById('session-file-upload'),
    
    searchForm: document.getElementById('search-form'),
    searchQuery: document.getElementById('search-query'),
    filterChannel: document.getElementById('filter-channel'),
    filterPublishedAfter: document.getElementById('filter-published-after'),
    filterPublishedBefore: document.getElementById('filter-published-before'),
    btnSearch: document.getElementById('btn-search'),
    
    searchResultsWrapper: document.getElementById('search-results-wrapper'),
    searchResultsTbody: document.getElementById('search-results-tbody'),
    searchResultsCount: document.getElementById('search-results-count'),
    btnSearchNextPage: document.getElementById('btn-search-next-page'),
    btnSelectAllVideos: document.getElementById('btn-select-all-videos'),
    btnDeselectAllVideos: document.getElementById('btn-deselect-all-videos'),
    
    selectedVideosCount: document.getElementById('selected-videos-count'),
    estimatedQuotaCost: document.getElementById('estimated-quota-cost'),
    estimatedCostBreakdown: document.getElementById('estimated-cost-breakdown'),
    maxCommentsPerVideo: document.getElementById('max-comments-per-video'),
    btnStartExtraction: document.getElementById('btn-start-extraction'),
    btnPauseExtraction: document.getElementById('btn-pause-extraction'),
    
    extractionProgressWrapper: document.getElementById('extraction-progress-wrapper'),
    extractionStatusText: document.getElementById('extraction-status-text'),
    extractionProgressPercentage: document.getElementById('extraction-progress-percentage'),
    extractionProgressFill: document.getElementById('extraction-progress-fill'),
    extractionLogConsole: document.getElementById('extraction-log-console'),
    
    moduleExport: document.getElementById('module-export'),
    extractionResultsSummary: document.getElementById('extraction-results-summary'),
    btnExportGexf: document.getElementById('btn-export-gexf'),
    btnExportCsv: document.getElementById('btn-export-csv'),
    thTitle: document.getElementById('th-title'),
    thChannel: document.getElementById('th-channel'),
    thViews: document.getElementById('th-views'),
    thPublished: document.getElementById('th-published'),
    
    // Módulo de Canais
    channelSearchForm: document.getElementById('channel-search-form'),
    channelQuery: document.getElementById('channel-query'),
    btnSearchChannel: document.getElementById('btn-search-channel'),
    channelResultWrapper: document.getElementById('channel-result-wrapper'),
    channelVideosExtractionPanel: document.getElementById('channel-videos-extraction-panel'),
    channelAvatar: document.getElementById('channel-avatar'),
    channelTitleDisplay: document.getElementById('channel-title-display'),
    tagChannelHandle: document.getElementById('tag-channel-handle'),
    tagChannelId: document.getElementById('tag-channel-id'),
    tagChannelCountry: document.getElementById('tag-channel-country'),
    channelDescription: document.getElementById('channel-description'),
    channelMetricSubscribers: document.getElementById('channel-metric-subscribers'),
    channelMetricVideos: document.getElementById('channel-metric-videos'),
    channelMetricViews: document.getElementById('channel-metric-views'),

    // Extração de vídeos do canal
    channelVideosEstimatedCost: document.getElementById('channel-videos-estimated-cost'),
    channelVideosCostBreakdown: document.getElementById('channel-videos-cost-breakdown'),
    btnStartChannelVideosExtraction: document.getElementById('btn-start-channel-videos-extraction'),
    channelVideosProgressWrapper: document.getElementById('channel-videos-progress-wrapper'),
    channelVideosStatusText: document.getElementById('channel-videos-status-text'),
    channelVideosProgressPercentage: document.getElementById('channel-videos-progress-percentage'),
    channelVideosProgressFill: document.getElementById('channel-videos-progress-fill'),
    channelVideosResultsWrapper: document.getElementById('channel-videos-results-wrapper'),
    channelVideosCountTitle: document.getElementById('channel-videos-count-title'),
    btnExportChannelVideosCsv: document.getElementById('btn-export-channel-videos-csv'),
    channelVideosTbody: document.getElementById('channel-videos-tbody'),

    // Extração de comentários do canal
    channelCommentsExtractionPanel: document.getElementById('channel-comments-extraction-panel'),
    channelCommentsScope: document.getElementById('channel-comments-scope'),
    channelCommentsLimit: document.getElementById('channel-comments-limit'),
    channelCommentsDatesWrapper: document.getElementById('channel-comments-dates-wrapper'),
    channelCommentsDateStart: document.getElementById('channel-comments-date-start'),
    channelCommentsDateEnd: document.getElementById('channel-comments-date-end'),
    channelCommentsEstimatedCost: document.getElementById('channel-comments-estimated-cost'),
    channelCommentsCostBreakdown: document.getElementById('channel-comments-cost-breakdown'),
    btnStartChannelCommentsExtraction: document.getElementById('btn-start-channel-comments-extraction'),
    btnPauseChannelCommentsExtraction: document.getElementById('btn-pause-channel-comments-extraction'),
    channelCommentsProgressWrapper: document.getElementById('channel-comments-progress-wrapper'),
    channelCommentsStatusText: document.getElementById('channel-comments-status-text'),
    channelCommentsProgressPercentage: document.getElementById('channel-comments-progress-percentage'),
    channelCommentsProgressFill: document.getElementById('channel-comments-progress-fill'),
    channelCommentsLogConsole: document.getElementById('channel-comments-log-console'),
    channelCommentsExportWrapper: document.getElementById('channel-comments-export-wrapper'),
    channelCommentsCountTitle: document.getElementById('channel-comments-count-title'),
    btnExportChannelCommentsCsv: document.getElementById('btn-export-channel-comments-csv'),
    btnExportChannelCommentsGexf: document.getElementById('btn-export-channel-comments-gexf'),

    // Módulo de Canais em Lote
    batchChannelsInput: document.getElementById('batch-channels-input'),
    btnBatchChannelsMetadata: document.getElementById('btn-batch-channels-metadata'),
    btnBatchChannelsVideos: document.getElementById('btn-batch-channels-videos'),
    batchChannelsProgressWrapper: document.getElementById('batch-channels-progress-wrapper'),
    batchChannelsStatusText: document.getElementById('batch-channels-status-text'),
    batchChannelsProgressPercentage: document.getElementById('batch-channels-progress-percentage'),
    batchChannelsProgressFill: document.getElementById('batch-channels-progress-fill'),
    batchChannelsLogConsole: document.getElementById('batch-channels-log-console'),
    btnBatchChannelsPause: document.getElementById('btn-batch-channels-pause'),
    batchChannelsMetadataResults: document.getElementById('batch-channels-metadata-results'),
    batchChannelsMetadataTitle: document.getElementById('batch-channels-metadata-title'),
    btnExportBatchChannelsMetadataCsv: document.getElementById('btn-export-batch-channels-metadata-csv'),
    batchChannelsMetadataTbody: document.getElementById('batch-channels-metadata-tbody'),
    batchChannelsVideosResults: document.getElementById('batch-channels-videos-results'),
    batchChannelsVideosTitle: document.getElementById('batch-channels-videos-title'),
    btnExportBatchChannelsVideosCsv: document.getElementById('btn-export-batch-channels-videos-csv'),
    batchChannelsVideosTbody: document.getElementById('batch-channels-videos-tbody'),

    // Guia do Pesquisador (Modal)
    linkResearcherGuide: document.getElementById('link-researcher-guide'),
    researcherModal: document.getElementById('researcher-modal'),
    btnCloseResearcherModal: document.getElementById('btn-close-researcher-modal'),
    btnCloseResearcherModalFooter: document.getElementById('btn-close-researcher-modal-footer'),
    btnCopyPrompt: document.getElementById('btn-copy-prompt')
};

// Inicialização e Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    updateQuotaUI();
});

function setupEventListeners() {
    // Busca de Vídeos
    DOM.searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performSearch(false);
    });

    DOM.btnSearchNextPage.addEventListener('click', () => {
        performSearch(true);
    });

    // Seleção de Vídeos
    DOM.btnSelectAllVideos.addEventListener('click', () => toggleAllSearchResults(true));
    DOM.btnDeselectAllVideos.addEventListener('click', () => toggleAllSearchResults(false));

    // Configuração de extração
    DOM.maxCommentsPerVideo.addEventListener('change', calculateEstimatedCost);

    // Controle de Extração
    DOM.btnStartExtraction.addEventListener('click', startExtractionWorkflow);
    DOM.btnPauseExtraction.addEventListener('click', pauseExtractionWorkflow);

    // Exportações de Resultados
    DOM.btnExportCsv.addEventListener('click', () => {
        ExportUtils.downloadCommentsCSV(AppState.extractedComments, `qualitube_comentarios_${Date.now()}.csv`);
    });
    DOM.btnExportGexf.addEventListener('click', () => {
        const videosList = Array.from(AppState.selectedVideos.values());
        ExportUtils.downloadNetworkGEXF(AppState.extractedComments, videosList, `qualitube_rede_${Date.now()}.gexf`);
    });

    // Ordenação da Tabela por clique no cabeçalho
    DOM.thTitle.addEventListener('click', () => sortSearchResults('title'));
    DOM.thChannel.addEventListener('click', () => sortSearchResults('channel_title'));
    DOM.thViews.addEventListener('click', () => sortSearchResults('view_count'));
    DOM.thPublished.addEventListener('click', () => sortSearchResults('published_at'));

    // Exportação e Importação de Sessão (Safe Resume)
    if (DOM.btnExportSession) {
        DOM.btnExportSession.addEventListener('click', exportSessionState);
    }
    if (DOM.sessionFileUpload) {
        DOM.sessionFileUpload.addEventListener('change', importSessionState);
    }

    // Navegação entre módulos (Tabs)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetModule = e.currentTarget.dataset.module;
            switchModule(targetModule);
        });
    });

    // Módulo de busca/análise de canal
    DOM.channelSearchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        performChannelAnalysis();
    });

    // Cópia do ID do canal
    DOM.tagChannelId.addEventListener('click', () => {
        const id = DOM.tagChannelId.textContent.trim();
        navigator.clipboard.writeText(id).then(() => {
            alert('ID do Canal copiado para a área de transferência!');
        }).catch(err => {
            console.error('Falha ao copiar ID:', err);
        });
    });

    // Extração de vídeos do canal
    DOM.btnStartChannelVideosExtraction.addEventListener('click', startChannelVideosExtractionWorkflow);
    DOM.btnExportChannelVideosCsv.addEventListener('click', exportChannelVideosCSV);

    // Extração de comentários do canal
    DOM.channelCommentsScope.addEventListener('change', handleChannelCommentsScopeChange);
    DOM.channelCommentsLimit.addEventListener('change', calculateChannelCommentsEstimatedCost);
    DOM.channelCommentsDateStart.addEventListener('change', calculateChannelCommentsEstimatedCost);
    DOM.channelCommentsDateEnd.addEventListener('change', calculateChannelCommentsEstimatedCost);
    DOM.btnStartChannelCommentsExtraction.addEventListener('click', startChannelCommentsExtractionWorkflow);
    DOM.btnPauseChannelCommentsExtraction.addEventListener('click', pauseChannelCommentsExtractionWorkflow);
    DOM.btnExportChannelCommentsCsv.addEventListener('click', exportChannelCommentsCSV);
    DOM.btnExportChannelCommentsGexf.addEventListener('click', exportChannelCommentsGEXF);

    // Eventos do Módulo de Canais em Lote
    DOM.btnBatchChannelsMetadata.addEventListener('click', performBatchChannelsMetadata);
    DOM.btnBatchChannelsVideos.addEventListener('click', performBatchChannelsVideos);
    DOM.btnBatchChannelsPause.addEventListener('click', pauseBatchChannelsWorkflow);
    DOM.btnExportBatchChannelsMetadataCsv.addEventListener('click', exportBatchChannelsMetadataCSV);
    DOM.btnExportBatchChannelsVideosCsv.addEventListener('click', exportBatchChannelsVideosCSV);

    // Eventos do Guia do Pesquisador (Modal)
    if (DOM.linkResearcherGuide) {
        DOM.linkResearcherGuide.addEventListener('click', openResearcherModal);
    }
    if (DOM.btnCloseResearcherModal) {
        DOM.btnCloseResearcherModal.addEventListener('click', closeResearcherModal);
    }
    if (DOM.btnCloseResearcherModalFooter) {
        DOM.btnCloseResearcherModalFooter.addEventListener('click', closeResearcherModal);
    }
    if (DOM.researcherModal) {
        DOM.researcherModal.addEventListener('click', (e) => {
            if (e.target === DOM.researcherModal) {
                closeResearcherModal();
            }
        });
    }

    // Toggle do Accordion
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const isActive = item.classList.contains('active');
            
            // Fecha todos os outros itens
            document.querySelectorAll('.accordion-item').forEach(i => {
                i.classList.remove('active');
            });
            
            // Se não estava ativo, abre o clicado
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // Copiar Prompt do Passo V
    if (DOM.btnCopyPrompt) {
        DOM.btnCopyPrompt.addEventListener('click', () => {
            const promptTextElement = document.getElementById('prompt-text');
            if (promptTextElement) {
                const promptText = promptTextElement.textContent.trim();
                navigator.clipboard.writeText(promptText).then(() => {
                    const originalHTML = DOM.btnCopyPrompt.innerHTML;
                    DOM.btnCopyPrompt.innerHTML = '<i class="fa-solid fa-check"></i> Copiado!';
                    DOM.btnCopyPrompt.classList.remove('btn-secondary');
                    DOM.btnCopyPrompt.classList.add('btn-primary');
                    
                    setTimeout(() => {
                        DOM.btnCopyPrompt.innerHTML = originalHTML;
                        DOM.btnCopyPrompt.classList.remove('btn-primary');
                        DOM.btnCopyPrompt.classList.add('btn-secondary');
                    }, 2000);
                }).catch(err => {
                    console.error('Erro ao copiar prompt:', err);
                    alert('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.');
                });
            }
        });
    }

    // Alternar Idioma (Language Toggle)
    if (DOM.btnToggleLang) {
        DOM.btnToggleLang.addEventListener('click', () => {
            const nextLang = AppState.language === 'pt' ? 'en' : 'pt';
            setLanguage(nextLang);
        });
    }
}

// Função de Tradução Dinâmica
function setLanguage(lang) {
    AppState.language = lang;
    
    // Atualizar texto do botão do seletor
    const langBtnText = document.getElementById('lang-btn-text');
    if (langBtnText) {
        langBtnText.textContent = lang === 'pt' ? 'English' : 'Português';
    }
    
    // Traduzir textos simples (preservando ícones <i>)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key] !== undefined) {
            const translation = translations[lang][key];
            const icon = el.querySelector('i');
            if (icon) {
                const iconHTML = icon.outerHTML;
                el.innerHTML = iconHTML + ' ' + translation;
            } else {
                el.innerHTML = translation;
            }
        }
    });

    // Traduzir placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key] !== undefined) {
            el.placeholder = translations[lang][key];
        }
    });

    // Traduzir títulos/tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (typeof translations !== 'undefined' && translations[lang] && translations[lang][key] !== undefined) {
            el.title = translations[lang][key];
        }
    });
}

// Funções de Controle do Modal do Pesquisador
function openResearcherModal(e) {
    if (e) e.preventDefault();
    if (DOM.researcherModal) {
        DOM.researcherModal.style.display = 'flex';
        // Adiciona a classe active no próximo tick para acionar a transição
        setTimeout(() => {
            DOM.researcherModal.classList.add('active');
        }, 10);
        
        // Garante que o primeiro item do accordion comece aberto (Passo I)
        const accordionItems = document.querySelectorAll('.accordion-item');
        if (accordionItems.length > 0) {
            accordionItems.forEach(i => i.classList.remove('active'));
            accordionItems[0].classList.add('active');
        }
    }
}

function closeResearcherModal() {
    if (DOM.researcherModal) {
        DOM.researcherModal.classList.remove('active');
        // Oculta completamente após o término da transição de opacidade
        setTimeout(() => {
            DOM.researcherModal.style.display = 'none';
        }, 300);
    }
}

// Logs na tela de console
function logConsole(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span style="color: var(--text-muted)">[${time}]</span> ${message}`;
    DOM.extractionLogConsole.appendChild(entry);
    DOM.extractionLogConsole.scrollTop = DOM.extractionLogConsole.scrollHeight;
}

// Atualizar UI de cota
function updateQuotaUI() {
    if (DOM.sessionQuotaValue) {
        DOM.sessionQuotaValue.textContent = AppState.sessionQuotaSpent.toLocaleString();
    }
    if (DOM.dailyQuotaEstimate) {
        DOM.dailyQuotaEstimate.textContent = `${AppState.sessionQuotaSpent.toLocaleString()} / 10.000`;
    }
    
    const percentage = Math.min((AppState.sessionQuotaSpent / 10000) * 100, 100);
    if (DOM.quotaProgressFill) {
        DOM.quotaProgressFill.style.width = `${percentage}%`;
    }

    if (percentage >= 80) {
        if (DOM.quotaWarning) DOM.quotaWarning.style.display = 'flex';
        if (DOM.quotaProgressFill) DOM.quotaProgressFill.style.background = 'var(--gradient-warning)';
    } else {
        if (DOM.quotaWarning) DOM.quotaWarning.style.display = 'none';
        if (DOM.quotaProgressFill) DOM.quotaProgressFill.style.background = 'var(--gradient-primary)';
    }
}

// Habilitar/Desabilitar botões dependendo das informações
function validateFormStates() {
    if (DOM.btnSearch) {
        DOM.btnSearch.disabled = false;
    }
    if (DOM.btnSearchNextPage) {
        DOM.btnSearchNextPage.disabled = !AppState.searchNextPageToken;
    }
    
    const hasSelectedVideos = AppState.selectedVideos.size > 0;
    if (DOM.btnStartExtraction) {
        DOM.btnStartExtraction.disabled = !hasSelectedVideos || AppState.isExtracting;
    }
    if (DOM.btnExportSession) {
        DOM.btnExportSession.disabled = AppState.extractedComments.length === 0 && AppState.selectedVideos.size === 0;
    }
}

// ----------------- MÓDULO 1: AMOSTRAGEM DE VÍDEOS -----------------

async function performSearch(loadNextPage = false) {
    const query = DOM.searchQuery.value.trim();
    if (!query) return;

    DOM.btnSearch.disabled = true;
    DOM.btnSearch.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';

    // Construção dos parâmetros de URL
    let url = `${BACKEND_URL}/api/search?q=${encodeURIComponent(query)}`;
    
    const channelId = DOM.filterChannel.value.trim();
    if (channelId) url += `&channel_id=${encodeURIComponent(channelId)}`;
    
    const after = DOM.filterPublishedAfter.value;
    if (after) url += `&published_after=${encodeURIComponent(new Date(after).toISOString())}`;
    
    const before = DOM.filterPublishedBefore.value;
    if (before) url += `&published_before=${encodeURIComponent(new Date(before).toISOString())}`;
    
    if (loadNextPage && AppState.searchNextPageToken) {
        url += `&page_token=${encodeURIComponent(AppState.searchNextPageToken)}`;
    }

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Falha ao buscar vídeos.');
        }

        const payload = await response.json();
        
        // Atualiza a cota
        AppState.sessionQuotaSpent += payload.quota.operation_cost;
        updateQuotaUI();

        // Processa os dados
        if (loadNextPage) {
            AppState.searchResults = [...AppState.searchResults, ...payload.data];
        } else {
            AppState.searchResults = payload.data;
            DOM.searchResultsTbody.innerHTML = ''; // Limpa tabela anterior
        }

        AppState.searchNextPageToken = payload.pagination.next_page_token;
        AppState.currentSearchQuery = query;

        renderSearchResults(payload.data);
        DOM.searchResultsWrapper.style.display = 'block';
        
    } catch (err) {
        alert(`Erro na busca: ${err.message}`);
    } finally {
        DOM.btnSearch.disabled = false;
        DOM.btnSearch.innerHTML = '<i class="fa-solid fa-search"></i> Buscar Vídeos';
        validateFormStates();
    }
}

function renderSearchResults(videos) {
    videos.forEach(video => {
        const tr = document.createElement('tr');
        tr.dataset.videoId = video.video_id;

        const isChecked = AppState.selectedVideos.has(video.video_id);

        tr.innerHTML = `
            <td>
                <input type="checkbox" class="custom-checkbox video-select-checkbox" 
                       ${isChecked ? 'checked' : ''} 
                       data-video-id="${video.video_id}">
            </td>
            <td>
                <img src="${video.thumbnail_url}" alt="Thumbnail" class="video-thumbnail">
            </td>
            <td>
                <div class="video-title-td" title="${video.title}">
                    <a href="https://www.youtube.com/watch?v=${video.video_id}" target="_blank" rel="noopener noreferrer" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                        ${video.title} <i class="fa-solid fa-up-right-from-square" style="font-size: 10px; color: var(--text-muted)"></i>
                    </a>
                </div>
            </td>
            <td>
                <div class="video-channel-td">${video.channel_title}</div>
            </td>
            <td>
                <div class="video-views-td">
                    <i class="fa-solid fa-eye" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${video.view_count ? video.view_count.toLocaleString() : '0'}
                </div>
            </td>
            <td>
                <div>${new Date(video.published_at).toLocaleDateString()}</div>
            </td>
        `;

        DOM.searchResultsTbody.appendChild(tr);
    });

    // Event Listener para os checkboxes recém-criados
    document.querySelectorAll('.video-select-checkbox').forEach(cb => {
        cb.addEventListener('change', handleVideoSelectionChange);
    });

    DOM.searchResultsCount.textContent = `Mostrando ${AppState.searchResults.length} vídeos encontrados`;
}

/**
 * Ordena a lista searchResults localmente com base na coluna clicada e direção.
 */
function sortSearchResults(column) {
    if (AppState.searchResults.length === 0) return;

    // Determina direção da ordenação
    if (AppState.sortColumn === column) {
        AppState.sortDirection = AppState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        AppState.sortColumn = column;
        AppState.sortDirection = 'asc';
    }

    // Ordenação dos resultados em memória
    AppState.searchResults.sort((a, b) => {
        let valA = a[column];
        let valB = b[column];

        if (column === 'published_at') {
            return AppState.sortDirection === 'asc' 
                ? new Date(valA) - new Date(valB) 
                : new Date(valB) - new Date(valA);
        }

        if (typeof valA === 'string') {
            return AppState.sortDirection === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }
        
        // Numérico (se houver)
        return AppState.sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    // Atualiza ícones dos cabeçalhos na UI
    updateSortIcons();

    // Limpa e renderiza novamente a tabela
    DOM.searchResultsTbody.innerHTML = '';
    renderSearchResults(AppState.searchResults);
}

/**
 * Atualiza visualmente os ícones dos cabeçalhos da tabela
 */
function updateSortIcons() {
    const mapping = {
        title: DOM.thTitle,
        channel_title: DOM.thChannel,
        view_count: DOM.thViews,
        published_at: DOM.thPublished
    };

    Object.keys(mapping).forEach(col => {
        const th = mapping[col];
        const icon = th.querySelector('.sort-icon');
        
        if (AppState.sortColumn === col) {
            icon.className = AppState.sortDirection === 'asc' 
                ? 'fa-solid fa-sort-up sort-icon' 
                : 'fa-solid fa-sort-down sort-icon';
            icon.style.opacity = '1';
        } else {
            icon.className = 'fa-solid fa-sort sort-icon';
            icon.style.opacity = '0.6';
        }
    });
}

function handleVideoSelectionChange(e) {
    const videoId = e.target.dataset.videoId;
    const isChecked = e.target.checked;

    if (isChecked) {
        const videoData = AppState.searchResults.find(v => v.video_id === videoId);
        if (videoData) {
            AppState.selectedVideos.set(videoId, videoData);
        }
    } else {
        AppState.selectedVideos.delete(videoId);
    }

    updateSelectedSummary();
}

function toggleAllSearchResults(select) {
    document.querySelectorAll('.video-select-checkbox').forEach(cb => {
        cb.checked = select;
        const videoId = cb.dataset.videoId;
        if (select) {
            const videoData = AppState.searchResults.find(v => v.video_id === videoId);
            if (videoData) AppState.selectedVideos.set(videoId, videoData);
        } else {
            AppState.selectedVideos.delete(videoId);
        }
    });

    updateSelectedSummary();
}

function updateSelectedSummary() {
    DOM.selectedVideosCount.textContent = AppState.selectedVideos.size;
    calculateEstimatedCost();
    validateFormStates();
}

// ----------------- MÓDULO 2: SIMULADOR DE CUSTO E EXTRAÇÃO -----------------

function calculateEstimatedCost() {
    const count = AppState.selectedVideos.size;
    if (count === 0) {
        DOM.estimatedQuotaCost.textContent = '0 unidades';
        DOM.estimatedCostBreakdown.textContent = 'Nenhum vídeo selecionado';
        return;
    }

    const limitStr = DOM.maxCommentsPerVideo.value;
    
    // Custo videos.list (detalhes): 1 unidade de cota por lote de 50 vídeos
    const detailsCost = Math.ceil(count / 50);
    
    if (limitStr === 'all') {
        DOM.estimatedQuotaCost.textContent = `~ ${detailsCost} + ? unidades`;
        DOM.estimatedCostBreakdown.textContent = `1 cota por batch + 1 cota por página de comentário (total real desconhecido)`;
        return;
    }

    const maxComments = parseInt(limitStr);
    const commentPagesPerVideo = Math.ceil(maxComments / 100);
    // Cada página de comentários consome 1 de cota
    const commentsCost = count * commentPagesPerVideo;
    const totalCost = detailsCost + commentsCost;

    DOM.estimatedQuotaCost.textContent = `${totalCost} unidades`;
    DOM.estimatedCostBreakdown.textContent = `${detailsCost} cota(s) de detalhes + ${commentsCost} cota(s) de comentários`;
}

// ----------------- MÓDULO 3: FLUXO DE EXTRAÇÃO PROFUNDA (SEQUENCIAL) -----------------

async function startExtractionWorkflow() {
    if (AppState.isExtracting) return;
    
    // Oculta painel de exportação anterior ao iniciar uma nova coleta
    DOM.moduleExport.style.display = 'none';
    
    AppState.isExtracting = true;
    AppState.pauseRequested = false;
    
    DOM.btnStartExtraction.disabled = true;
    DOM.btnPauseExtraction.style.display = 'inline-flex';
    DOM.extractionProgressWrapper.style.display = 'block';
    
    // Se for uma extração nova (não foi pausada antes ou a anterior foi concluída), reinicia a fila
    if (AppState.extractionQueue.length === 0 || AppState.currentQueueIndex === 0 || AppState.currentQueueIndex >= AppState.extractionQueue.length) {
        AppState.extractionQueue = Array.from(AppState.selectedVideos.keys());
        AppState.currentQueueIndex = 0;
        AppState.extractedComments = [];
        AppState.nextCommentPageToken = null;
        AppState.commentsCollectedForCurrentVideo = 0;
        
        // Reset da barra de progresso na UI
        DOM.extractionProgressPercentage.textContent = '0%';
        DOM.extractionProgressFill.style.width = '0%';
        
        DOM.extractionLogConsole.innerHTML = '';
        logConsole(`Iniciando nova extração profunda para ${AppState.extractionQueue.length} vídeo(s)...`, 'success');
        
        // Fase 1: Buscar métricas e detalhes reais em lotes de 50 vídeos
        await fetchSelectedVideosDetails();
    } else {
        logConsole(`Retomando extração do vídeo ${AppState.currentQueueIndex + 1} de ${AppState.extractionQueue.length}...`, 'warning');
    }

    // Processa a fila de extração de comentários sequencialmente
    await processExtractionQueue();
}

async function fetchSelectedVideosDetails() {
    logConsole('Coletando métricas e estatísticas dos vídeos selecionados...', 'info');
    const ids = Array.from(AppState.selectedVideos.keys());
    
    try {
        const response = await fetch(`${BACKEND_URL}/api/videos/details`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_ids: ids })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Erro ao carregar detalhes dos vídeos.');
        }

        const payload = await response.json();
        
        // Atualiza a cota gasta no backend
        AppState.sessionQuotaSpent += payload.quota.operation_cost;
        updateQuotaUI();

        // Atualiza as informações detalhadas em nosso Map de selecionados
        payload.data.forEach(detail => {
            AppState.selectedVideos.set(detail.video_id, detail);
        });

        logConsole('Estatísticas dos vídeos coletadas com sucesso.', 'success');
    } catch (err) {
        logConsole(`Falha ao obter métricas dos vídeos: ${err.message}. Continuando com dados básicos da busca.`, 'error');
    }
}

async function processExtractionQueue() {
    const maxCommentsLimit = DOM.maxCommentsPerVideo.value;
    
    while (AppState.currentQueueIndex < AppState.extractionQueue.length && !AppState.pauseRequested) {
        const videoId = AppState.extractionQueue[AppState.currentQueueIndex];
        const videoData = AppState.selectedVideos.get(videoId);
        const videoTitle = videoData ? videoData.title : videoId;
        
        logConsole(`[Vídeo ${AppState.currentQueueIndex + 1}/${AppState.extractionQueue.length}] Extraindo comentários de: "${videoTitle}"...`, 'info');
        
        let hasMorePages = true;
        
        while (hasMorePages && !AppState.pauseRequested) {
            // Define o máximo de comentários restantes para este vídeo
            let maxResults = 100;
            if (maxCommentsLimit !== 'all') {
                const limit = parseInt(maxCommentsLimit);
                const remaining = limit - AppState.commentsCollectedForCurrentVideo;
                if (remaining <= 0) {
                    hasMorePages = false;
                    break;
                }
                maxResults = Math.min(remaining, 100);
            }

            try {
                let url = `${BACKEND_URL}/api/comments?video_id=${videoId}&max_results=${maxResults}`;
                if (AppState.nextCommentPageToken) {
                    url += `&page_token=${encodeURIComponent(AppState.nextCommentPageToken)}`;
                }

                const response = await fetch(url);

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || 'Falha ao coletar página de comentários.');
                }

                const payload = await response.json();
                
                // Contabilidade
                AppState.sessionQuotaSpent += payload.quota.operation_cost;
                updateQuotaUI();

                // Salva comentários
                AppState.extractedComments = [...AppState.extractedComments, ...payload.data];
                AppState.commentsCollectedForCurrentVideo += payload.data.length;
                AppState.nextCommentPageToken = payload.pagination.next_page_token;

                logConsole(`Coletados +${payload.data.length} comentários (Total para este vídeo: ${AppState.commentsCollectedForCurrentVideo}).`, 'info');

                // Verifica se há próxima página e se não bateu o limite
                if (!AppState.nextCommentPageToken) {
                    hasMorePages = false;
                }
                
                // Pequena pausa (micro-delay de 100ms) para não sobrecarregar
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (err) {
                logConsole(`Erro ao coletar do vídeo: ${err.message}`, 'error');
                hasMorePages = false; // Avança para o próximo ou aborta
            }
        }

        if (AppState.pauseRequested) {
            break;
        }

        // Passa para o próximo vídeo
        logConsole(`Concluído vídeo: "${videoTitle}" (Total extraído: ${AppState.commentsCollectedForCurrentVideo}).`, 'success');
        AppState.currentQueueIndex++;
        AppState.nextCommentPageToken = null; // Reinicia para o próximo vídeo
        AppState.commentsCollectedForCurrentVideo = 0; // Reinicia contagem

        // Atualiza a barra de progresso da fila global
        const percent = Math.round((AppState.currentQueueIndex / AppState.extractionQueue.length) * 100);
        DOM.extractionProgressPercentage.textContent = `${percent}%`;
        DOM.extractionProgressFill.style.width = `${percent}%`;
    }

    // Finalização do loop
    AppState.isExtracting = false;
    DOM.btnPauseExtraction.style.display = 'none';
    validateFormStates();

    if (AppState.pauseRequested) {
        logConsole('Coleta pausada pelo pesquisador. O progresso atual foi preservado.', 'warning');
    } else {
        logConsole(`Coleta profunda totalmente concluída! ${AppState.extractedComments.length} comentário(s) no total.`, 'success');
        showExportModule();
    }
}

function pauseExtractionWorkflow() {
    AppState.pauseRequested = true;
    DOM.btnPauseExtraction.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pausando...';
    DOM.btnPauseExtraction.disabled = true;
}

function showExportModule() {
    DOM.extractionResultsSummary.textContent = `Foram extraídos com sucesso ${AppState.extractedComments.length.toLocaleString()} comentário(s) do conjunto de ${AppState.selectedVideos.size} vídeo(s) analisado(s).`;
    DOM.moduleExport.style.display = 'block';
    
    // Rola para a tela de exportação
    DOM.moduleExport.scrollIntoView({ behavior: 'smooth' });
}

// ----------------- MÓDULO 4: SAFE RESUME (SESSÃO JSON) -----------------

function exportSessionState() {
    // Nota de Segurança: A chave api_key não é adicionada no JSON exportado
    const sessionData = {
        sessionQuotaSpent: AppState.sessionQuotaSpent,
        selectedVideos: Array.from(AppState.selectedVideos.entries()),
        extractedComments: AppState.extractedComments,
        extractionQueue: AppState.extractionQueue,
        currentQueueIndex: AppState.currentQueueIndex,
        nextCommentPageToken: AppState.nextCommentPageToken,
        commentsCollectedForCurrentVideo: AppState.commentsCollectedForCurrentVideo
    };

    const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
    const filename = `qualitube_sessao_${Date.now()}.json`;
    ExportUtils.triggerDownload(blob, filename);
}

function importSessionState(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const data = JSON.parse(evt.target.result);
            
            // Restaura o estado na memória do App
            AppState.sessionQuotaSpent = data.sessionQuotaSpent || 0;
            AppState.selectedVideos = new Map(data.selectedVideos || []);
            AppState.extractedComments = data.extractedComments || [];
            AppState.extractionQueue = data.extractionQueue || [];
            AppState.currentQueueIndex = data.currentQueueIndex || 0;
            AppState.nextCommentPageToken = data.nextCommentPageToken || null;
            AppState.commentsCollectedForCurrentVideo = data.commentsCollectedForCurrentVideo || 0;

            // Restaura a UI
            updateQuotaUI();
            updateSelectedSummary();
            
            // Se existirem comentários já coletados, mostra o painel de exportação para download parcial
            if (AppState.extractedComments.length > 0) {
                showExportModule();
            }

            alert(AppState.language === 'pt' ? 'Progresso da sessão carregado com sucesso!' : 'Session progress loaded successfully!');
            
            // Reinicia logs
            DOM.extractionLogConsole.innerHTML = '';
            logConsole('Sessão importada com sucesso.', 'success');
            logConsole(`Fila restaurada: vídeo ${AppState.currentQueueIndex} de ${AppState.extractionQueue.length}.`, 'info');
            
            // Exibe o console se estava em progresso
            if (AppState.extractionQueue.length > 0) {
                DOM.extractionProgressWrapper.style.display = 'block';
                const percent = Math.round((AppState.currentQueueIndex / AppState.extractionQueue.length) * 100);
                DOM.extractionProgressPercentage.textContent = `${percent}%`;
                DOM.extractionProgressFill.style.width = `${percent}%`;
            }

        } catch (err) {
            alert('Erro ao decodificar arquivo de sessão: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ----------------- MÓDULO 5: CONTROLE DE ABAS E ANÁLISE DE CANAL -----------------

/**
 * Alterna dinamicamente entre os módulos do aplicativo.
 */
function switchModule(moduleName) {
    // Altera classe ativa nos botões do menu
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.module === moduleName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Altera visibilidade dos containers de módulos
    document.querySelectorAll('.module-content').forEach(content => {
        content.classList.remove('active');
    });

    const targetContent = document.getElementById(`${moduleName}-module-content`);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

/**
 * Executa a busca e análise de canal através da API.
 */
async function performChannelAnalysis() {
    const query = DOM.channelQuery.value.trim();
    if (!query) return;

    DOM.btnSearchChannel.disabled = true;
    DOM.btnSearchChannel.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analisando...';
    DOM.channelResultWrapper.style.display = 'none';
    DOM.channelVideosExtractionPanel.style.display = 'none';
    DOM.channelCommentsExtractionPanel.style.display = 'none';

    try {
        const url = `${BACKEND_URL}/api/channel?q=${encodeURIComponent(query)}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Falha ao analisar o canal.');
        }

        const payload = await response.json();
        
        // Atualiza cota gasta
        AppState.sessionQuotaSpent += payload.quota.operation_cost;
        updateQuotaUI();

        // Renderiza metadados do canal
        const channel = payload.data;
        
        DOM.channelAvatar.src = channel.thumbnail_url;
        DOM.channelTitleDisplay.textContent = channel.title;
        
        // Tags
        DOM.tagChannelHandle.textContent = channel.custom_url ? channel.custom_url : '@SemHandle';
        DOM.tagChannelId.innerHTML = `<i class="fa-regular fa-copy"></i> ${channel.channel_id}`;
        DOM.tagChannelCountry.textContent = channel.country ? `País: ${channel.country}` : 'País: Não Informado';
        
        // Descrição
        DOM.channelDescription.textContent = channel.description ? channel.description : 'Sem descrição no canal.';
        
        // Estatísticas
        DOM.channelMetricSubscribers.textContent = channel.subscriber_count.toLocaleString();
        DOM.channelMetricVideos.textContent = channel.video_count.toLocaleString();
        DOM.channelMetricViews.textContent = channel.view_count.toLocaleString();
        
        // Guarda estado do canal para extração de vídeos
        AppState.currentChannelUploadsPlaylistId = channel.uploads_playlist_id;
        AppState.currentChannelVideoCount = channel.video_count;

        // Calcular e exibir estimativa de cota: 2 unidades a cada 50 vídeos
        const estimatedCost = Math.ceil(channel.video_count / 50) * 2;
        DOM.channelVideosEstimatedCost.textContent = `${estimatedCost} unidades`;
        DOM.channelVideosCostBreakdown.textContent = `Custo calculado: 2 unidades de cota a cada 50 vídeos (Total de ${channel.video_count} vídeos).`;

        // Resetar UI de extração de vídeos anterior
        DOM.channelVideosResultsWrapper.style.display = 'none';
        DOM.channelVideosProgressWrapper.style.display = 'none';
        DOM.btnStartChannelVideosExtraction.disabled = false;
        DOM.btnStartChannelVideosExtraction.innerHTML = '<i class="fa-solid fa-play"></i> Listar todos os vídeos do canal';

        // Exibe o painel de listagem de vídeos do canal
        DOM.channelVideosExtractionPanel.style.display = 'block';

        // Exibe o painel de extração de comentários do canal por padrão
        DOM.channelCommentsExtractionPanel.style.display = 'block';
        DOM.btnStartChannelCommentsExtraction.disabled = false;
        DOM.btnStartChannelCommentsExtraction.title = "";
        DOM.channelCommentsExportWrapper.style.display = 'none';
        DOM.channelCommentsProgressWrapper.style.display = 'none';
        calculateChannelCommentsEstimatedCost();

        DOM.channelResultWrapper.style.display = 'block';

    } catch (err) {
        alert(`Erro ao analisar canal: ${err.message}`);
    } finally {
        DOM.btnSearchChannel.disabled = false;
        DOM.btnSearchChannel.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Analisar Canal';
        validateFormStates();
    }
}

/**
 * Inicia o fluxo de extração de todos os vídeos de um canal de forma paginada.
 */
async function startChannelVideosExtractionWorkflow() {
    if (AppState.isExtractingChannelVideos) return;
    if (!AppState.currentChannelUploadsPlaylistId) {
        alert('Por favor, faça a análise de um canal primeiro.');
        return;
    }

    AppState.isExtractingChannelVideos = true;
    DOM.btnStartChannelVideosExtraction.disabled = true;
    DOM.btnStartChannelVideosExtraction.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Extraindo...';
    
    // Configura e mostra barra de progresso
    DOM.channelVideosProgressWrapper.style.display = 'block';
    DOM.channelVideosProgressFill.style.width = '0%';
    DOM.channelVideosProgressPercentage.textContent = '0%';
    DOM.channelVideosStatusText.textContent = 'Iniciando extração...';

    // Oculta resultados anteriores e limpa a tabela
    DOM.channelVideosResultsWrapper.style.display = 'none';
    DOM.channelVideosTbody.innerHTML = '';
    AppState.channelVideos = [];

    const playlistId = AppState.currentChannelUploadsPlaylistId;
    const totalVideos = AppState.currentChannelVideoCount;
    let nextPageToken = null;
    let hasMore = true;

    try {
        while (hasMore) {
            let url = `${BACKEND_URL}/api/channel/videos?playlist_id=${playlistId}`;
            if (nextPageToken) {
                url += `&page_token=${encodeURIComponent(nextPageToken)}`;
            }

            const response = await fetch(url);

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Falha ao obter vídeos do canal.');
            }

            const payload = await response.json();
            
            // Incrementa cota gasta
            AppState.sessionQuotaSpent += payload.quota.operation_cost;
            updateQuotaUI();

            const newVideos = payload.data || [];
            AppState.channelVideos = [...AppState.channelVideos, ...newVideos];
            
            // Renderiza na tabela
            renderChannelVideosBatch(newVideos);

            nextPageToken = payload.pagination.next_page_token;

            // Calcula progresso
            const currentCount = AppState.channelVideos.length;
            const progressPercent = totalVideos > 0 ? Math.min(Math.round((currentCount / totalVideos) * 100), 100) : 100;
            
            DOM.channelVideosProgressFill.style.width = `${progressPercent}%`;
            DOM.channelVideosProgressPercentage.textContent = `${progressPercent}%`;
            DOM.channelVideosStatusText.textContent = `Coletados ${currentCount} de ${totalVideos} vídeos...`;

            if (!nextPageToken || newVideos.length === 0) {
                hasMore = false;
            }

            // Pequeno delay
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Concluído com sucesso
        DOM.channelVideosStatusText.textContent = `Coleta concluída! Total de ${AppState.channelVideos.length} vídeos.`;
        DOM.channelVideosCountTitle.textContent = `Vídeos Listados (${AppState.channelVideos.length})`;
        DOM.channelVideosResultsWrapper.style.display = 'block';

        // Habilita e exibe o painel de comentários do canal
        DOM.channelCommentsExtractionPanel.style.display = 'block';
        DOM.btnStartChannelCommentsExtraction.disabled = false;
        DOM.btnStartChannelCommentsExtraction.title = "";
        calculateChannelCommentsEstimatedCost();
    } catch (err) {
        alert(`Erro na extração de vídeos: ${err.message}`);
        DOM.channelVideosStatusText.textContent = 'Extração interrompida devido a erro.';
    } finally {
        AppState.isExtractingChannelVideos = false;
        DOM.btnStartChannelVideosExtraction.disabled = false;
        DOM.btnStartChannelVideosExtraction.innerHTML = '<i class="fa-solid fa-play"></i> Listar todos os vídeos do canal';
    }
}

/**
 * Renderiza um lote de vídeos na tabela do canal.
 */
function renderChannelVideosBatch(videos) {
    videos.forEach(video => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <img src="${video.thumbnail_url}" alt="Thumbnail" class="video-thumbnail">
            </td>
            <td>
                <div class="video-title-td" title="${video.title}">
                    <a href="https://www.youtube.com/watch?v=${video.video_id}" target="_blank" rel="noopener noreferrer" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
                        ${video.title} <i class="fa-solid fa-up-right-from-square" style="font-size: 10px; color: var(--text-muted)"></i>
                    </a>
                </div>
            </td>
            <td>
                <div class="video-views-td">
                    <i class="fa-solid fa-eye" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${video.view_count ? video.view_count.toLocaleString() : '0'}
                </div>
            </td>
            <td>
                <div><i class="fa-solid fa-thumbs-up" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${video.like_count ? video.like_count.toLocaleString() : '0'}</div>
            </td>
            <td>
                <div><i class="fa-solid fa-comment" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${video.comment_count ? video.comment_count.toLocaleString() : '0'}</div>
            </td>
            <td>
                <div>${new Date(video.published_at).toLocaleDateString()}</div>
            </td>
            <td>
                <div>${formatDuration(video.duration)}</div>
            </td>
        `;
        DOM.channelVideosTbody.appendChild(tr);
    });
}

/**
 * Dispara o download da lista de vídeos do canal em formato CSV.
 */
function exportChannelVideosCSV() {
    if (!AppState.channelVideos || AppState.channelVideos.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const channelName = DOM.channelTitleDisplay.textContent.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `qualitube_videos_${channelName}_${Date.now()}.csv`;
    ExportUtils.downloadChannelVideosCSV(AppState.channelVideos, filename);
}

/**
 * Auxiliar para formatar duração ISO 8601 do YouTube.
 */
function formatDuration(isoDuration) {
    if (!isoDuration) return 'N/A';
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;
    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    } else {
        return `${seconds}s`;
    }
}

// ----------------- MÓDULO 6: EXTRAÇÃO DE COMENTÁRIOS DE VÍDEOS DO CANAL -----------------

/**
 * Controla a exibição dos campos de data dependendo do escopo selecionado.
 */
function handleChannelCommentsScopeChange() {
    const scope = DOM.channelCommentsScope.value;
    if (scope === 'date') {
        DOM.channelCommentsDatesWrapper.style.display = 'grid';
    } else {
        DOM.channelCommentsDatesWrapper.style.display = 'none';
    }
    calculateChannelCommentsEstimatedCost();
}

/**
 * Retorna os vídeos filtrados por escopo e data.
 */
function getFilteredChannelVideos() {
    if (!AppState.channelVideos || AppState.channelVideos.length === 0) {
        return [];
    }

    const scope = DOM.channelCommentsScope.value;
    if (scope === 'all') {
        return AppState.channelVideos;
    }

    const startDateStr = DOM.channelCommentsDateStart.value;
    const endDateStr = DOM.channelCommentsDateEnd.value;

    const start = startDateStr ? new Date(startDateStr + 'T00:00:00') : null;
    const end = endDateStr ? new Date(endDateStr + 'T23:59:59') : null;

    return AppState.channelVideos.filter(video => {
        const publishDate = new Date(video.published_at);
        if (start && publishDate < start) return false;
        if (end && publishDate > end) return false;
        return true;
    });
}

/**
 * Calcula a estimativa de cota da API para extração dos comentários.
 */
function calculateChannelCommentsEstimatedCost() {
    let count = 0;
    const scope = DOM.channelCommentsScope.value;
    const isListLoaded = AppState.channelVideos && AppState.channelVideos.length > 0;

    if (isListLoaded) {
        count = getFilteredChannelVideos().length;
    } else {
        count = AppState.currentChannelVideoCount || 0;
    }

    if (count === 0) {
        DOM.channelCommentsEstimatedCost.textContent = '0 unidades';
        DOM.channelCommentsCostBreakdown.textContent = 'Nenhum vídeo localizado no escopo/datas definidas.';
        return;
    }

    const limitStr = DOM.channelCommentsLimit.value;
    const pagesPerVideo = limitStr === 'all' ? 1 : Math.ceil(parseInt(limitStr) / 100);

    if (limitStr === 'all') {
        DOM.channelCommentsEstimatedCost.textContent = `~ ${count} + ? unidades`;
        if (isListLoaded) {
            DOM.channelCommentsCostBreakdown.textContent = `Mapeados ${count} vídeo(s). 1 cota por lote de 100 comentários por vídeo (real desconhecido).`;
        } else {
            DOM.channelCommentsCostBreakdown.textContent = `Mapeamento pendente. Estimativa com base em ${count} vídeo(s) do canal (real desconhecido).`;
        }
        return;
    }

    const totalCost = count * pagesPerVideo;
    DOM.channelCommentsEstimatedCost.textContent = `${totalCost} unidades`;
    
    if (isListLoaded) {
        DOM.channelCommentsCostBreakdown.textContent = `Mapeados ${count} vídeo(s) * ${pagesPerVideo} chamada(s) de comentários por vídeo.`;
    } else {
        if (scope === 'date') {
            DOM.channelCommentsCostBreakdown.textContent = `Custo máximo estimado com base em todos os ${count} vídeos do canal. O custo real será menor, dependendo do número de vídeos no intervalo de datas.`;
        } else {
            DOM.channelCommentsCostBreakdown.textContent = `Mapeamento pendente. Estimativa de ${count} vídeo(s) * ${pagesPerVideo} chamada(s) de comentários por vídeo.`;
        }
    }
}

/**
 * Inicia o fluxo de coleta sequencial de comentários do canal.
 */
async function startChannelCommentsExtractionWorkflow() {
    if (AppState.isExtractingChannelComments) return;
    if (!AppState.currentChannelUploadsPlaylistId) {
        alert('Por favor, faça a análise de um canal primeiro.');
        return;
    }

    DOM.channelCommentsExportWrapper.style.display = 'none';
    AppState.isExtractingChannelComments = true;
    AppState.pauseChannelCommentsRequested = false;

    DOM.btnStartChannelCommentsExtraction.disabled = true;
    DOM.btnPauseChannelCommentsExtraction.style.display = 'flex';
    DOM.btnPauseChannelCommentsExtraction.disabled = false;
    DOM.btnPauseChannelCommentsExtraction.innerHTML = '<i class="fa-solid fa-pause"></i> Pausar Coleta';
    DOM.channelCommentsProgressWrapper.style.display = 'block';

    // Se for uma nova coleta, reinicia a fila
    if (AppState.channelCommentsQueue.length === 0 || 
        AppState.currentChannelCommentsQueueIndex === 0 || 
        AppState.currentChannelCommentsQueueIndex >= AppState.channelCommentsQueue.length) {
        
        DOM.channelCommentsProgressPercentage.textContent = '0%';
        DOM.channelCommentsProgressFill.style.width = '0%';
        DOM.channelCommentsLogConsole.innerHTML = '';
        
        // Passo A: Se a lista de vídeos local estiver vazia, busca em segundo plano primeiro
        if (AppState.channelVideos.length === 0) {
            logChannelCommentsConsole('Obtendo lista de vídeos do canal em segundo plano...', 'info');
            
            const playlistId = AppState.currentChannelUploadsPlaylistId;
            const totalVideos = AppState.currentChannelVideoCount;
            let nextPageToken = null;
            let hasMore = true;

            try {
                while (hasMore && !AppState.pauseChannelCommentsRequested) {
                    let url = `${BACKEND_URL}/api/channel/videos?playlist_id=${playlistId}`;
                    if (nextPageToken) {
                        url += `&page_token=${encodeURIComponent(nextPageToken)}`;
                    }

                    const response = await fetch(url);

                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.detail || 'Falha ao obter lista de vídeos do canal.');
                    }

                    const payload = await response.json();
                    
                    // Incrementa cota gasta
                    AppState.sessionQuotaSpent += payload.quota.operation_cost;
                    updateQuotaUI();

                    const newVideos = payload.data || [];
                    AppState.channelVideos = [...AppState.channelVideos, ...newVideos];

                    nextPageToken = payload.pagination.next_page_token;

                    const currentCount = AppState.channelVideos.length;
                    logChannelCommentsConsole(`Mapeados ${currentCount} de ${totalVideos} vídeos do canal...`, 'info');

                    if (!nextPageToken || newVideos.length === 0) {
                        hasMore = false;
                    }

                    await new Promise(resolve => setTimeout(resolve, 100));
                }

                if (AppState.pauseChannelCommentsRequested) {
                    AppState.isExtractingChannelComments = false;
                    DOM.btnPauseChannelCommentsExtraction.style.display = 'none';
                    DOM.btnStartChannelCommentsExtraction.disabled = false;
                    logChannelCommentsConsole('Coleta interrompida durante o mapeamento de vídeos.', 'warning');
                    return;
                }

                logChannelCommentsConsole(`Mapeamento concluído. Total de ${AppState.channelVideos.length} vídeos encontrados.`, 'success');

            } catch (err) {
                alert(`Erro ao mapear vídeos do canal: ${err.message}`);
                logChannelCommentsConsole(`Extração interrompida: ${err.message}`, 'error');
                AppState.isExtractingChannelComments = false;
                DOM.btnPauseChannelCommentsExtraction.style.display = 'none';
                DOM.btnStartChannelCommentsExtraction.disabled = false;
                return;
            }
        }

        const filteredVideos = getFilteredChannelVideos();
        if (filteredVideos.length === 0) {
            alert('Nenhum vídeo localizado no escopo definido para extração de comentários.');
            AppState.isExtractingChannelComments = false;
            DOM.btnPauseChannelCommentsExtraction.style.display = 'none';
            DOM.btnStartChannelCommentsExtraction.disabled = false;
            return;
        }

        AppState.channelCommentsQueue = filteredVideos.map(v => v.video_id);
        AppState.currentChannelCommentsQueueIndex = 0;
        AppState.channelExtractedComments = [];
        AppState.channelCommentsNextPageToken = null;
        AppState.channelCommentsCollectedForCurrentVideo = 0;
        
        logChannelCommentsConsole(`Iniciando extração em lote de comentários para ${AppState.channelCommentsQueue.length} vídeo(s)...`, 'success');
    } else {
        logChannelCommentsConsole(`Retomando extração a partir do vídeo ${AppState.currentChannelCommentsQueueIndex + 1} de ${AppState.channelCommentsQueue.length}...`, 'warning');
    }

    await processChannelCommentsExtractionQueue();
}

/**
 * Processa sequencialmente a fila de coleta de comentários dos vídeos do canal.
 */
async function processChannelCommentsExtractionQueue() {
    const limitStr = DOM.channelCommentsLimit.value;
    const queue = AppState.channelCommentsQueue;

    while (AppState.currentChannelCommentsQueueIndex < queue.length && !AppState.pauseChannelCommentsRequested) {
        const videoId = queue[AppState.currentChannelCommentsQueueIndex];
        const videoData = AppState.channelVideos.find(v => v.video_id === videoId);
        const videoTitle = videoData ? videoData.title : videoId;

        logChannelCommentsConsole(`[Vídeo ${AppState.currentChannelCommentsQueueIndex + 1}/${queue.length}] Extraindo comentários de: "${videoTitle}"...`, 'info');
        let hasMorePages = true;

        while (hasMorePages && !AppState.pauseChannelCommentsRequested) {
            let maxResults = 100;
            if (limitStr !== 'all') {
                const limit = parseInt(limitStr);
                const remaining = limit - AppState.channelCommentsCollectedForCurrentVideo;
                if (remaining <= 0) {
                    hasMorePages = false;
                    break;
                }
                maxResults = Math.min(remaining, 100);
            }

            try {
                let url = `${BACKEND_URL}/api/comments?video_id=${videoId}&max_results=${maxResults}`;
                if (AppState.channelCommentsNextPageToken) {
                    url += `&page_token=${encodeURIComponent(AppState.channelCommentsNextPageToken)}`;
                }

                const response = await fetch(url);

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || 'Falha ao coletar página de comentários.');
                }

                const payload = await response.json();

                // Contabilidade de Cota
                AppState.sessionQuotaSpent += payload.quota.operation_cost;
                updateQuotaUI();

                // Acumula os comentários
                AppState.channelExtractedComments = [...AppState.channelExtractedComments, ...payload.data];
                AppState.channelCommentsCollectedForCurrentVideo += payload.data.length;
                AppState.channelCommentsNextPageToken = payload.pagination.next_page_token;

                logChannelCommentsConsole(`Coletados +${payload.data.length} comentários (Total para este vídeo: ${AppState.channelCommentsCollectedForCurrentVideo}).`, 'info');

                if (!AppState.channelCommentsNextPageToken) {
                    hasMorePages = false;
                }

                // Micro delay de 100ms
                await new Promise(resolve => setTimeout(resolve, 100));

            } catch (err) {
                logChannelCommentsConsole(`Erro ao coletar do vídeo: ${err.message}`, 'error');
                hasMorePages = false; // Avança para o próximo
            }
        }

        if (AppState.pauseChannelCommentsRequested) {
            break;
        }

        logChannelCommentsConsole(`Concluído vídeo: "${videoTitle}" (Total extraído: ${AppState.channelCommentsCollectedForCurrentVideo}).`, 'success');
        AppState.currentChannelCommentsQueueIndex++;
        AppState.channelCommentsNextPageToken = null;
        AppState.channelCommentsCollectedForCurrentVideo = 0;

        // Atualiza progresso geral na UI
        const percent = Math.round((AppState.currentChannelCommentsQueueIndex / queue.length) * 100);
        DOM.channelCommentsProgressPercentage.textContent = `${percent}%`;
        DOM.channelCommentsProgressFill.style.width = `${percent}%`;
        DOM.channelCommentsStatusText.textContent = `Processados ${AppState.currentChannelCommentsQueueIndex} de ${queue.length} vídeos...`;
    }

    AppState.isExtractingChannelComments = false;
    DOM.btnPauseChannelCommentsExtraction.style.display = 'none';
    DOM.btnStartChannelCommentsExtraction.disabled = false;

    if (AppState.pauseChannelCommentsRequested) {
        logChannelCommentsConsole('Coleta pausada pelo pesquisador. O progresso foi preservado.', 'warning');
    } else {
        logChannelCommentsConsole(`Coleta completa finalizada! Total de ${AppState.channelExtractedComments.length} comentário(s) de ${queue.length} vídeo(s).`, 'success');
        showChannelCommentsExportModule();
    }
}

/**
 * Solicita a pausa na extração de comentários do canal.
 */
function pauseChannelCommentsExtractionWorkflow() {
    AppState.pauseChannelCommentsRequested = true;
    DOM.btnPauseChannelCommentsExtraction.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pausando...';
    DOM.btnPauseChannelCommentsExtraction.disabled = true;
}

/**
 * Exibe o painel de exportação para os comentários coletados.
 */
function showChannelCommentsExportModule() {
    DOM.channelCommentsCountTitle.textContent = `Comentários Coletados (${AppState.channelExtractedComments.length.toLocaleString()})`;
    DOM.channelCommentsExportWrapper.style.display = 'block';
    DOM.channelCommentsExportWrapper.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Grava e envia logs na console de comentários do canal.
 */
function logChannelCommentsConsole(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span style="color: var(--text-muted)">[${time}]</span> ${message}`;
    DOM.channelCommentsLogConsole.appendChild(entry);
    DOM.channelCommentsLogConsole.scrollTop = DOM.channelCommentsLogConsole.scrollHeight;
}

/**
 * Exporta os comentários coletados do canal em formato CSV.
 */
function exportChannelCommentsCSV() {
    if (!AppState.channelExtractedComments || AppState.channelExtractedComments.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const channelName = DOM.channelTitleDisplay.textContent.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `qualitube_comentarios_canal_${channelName}_${Date.now()}.csv`;
    ExportUtils.downloadCommentsCSV(AppState.channelExtractedComments, filename);
}

/**
 * Exporta a rede de interação de comentários do canal em formato GEXF.
 */
function exportChannelCommentsGEXF() {
    if (!AppState.channelExtractedComments || AppState.channelExtractedComments.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const channelName = DOM.channelTitleDisplay.textContent.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `qualitube_rede_canal_${channelName}_${Date.now()}.gexf`;
    ExportUtils.downloadNetworkGEXF(AppState.channelExtractedComments, AppState.channelVideos, filename);
}

// ----------------- MÓDULO: CANAIS EM LOTE -----------------

/**
 * Escapa caracteres HTML para exibição segura.
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Grava e envia logs na console do módulo de lote.
 */
function logBatchChannelsConsole(message, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span style="color: var(--text-muted)">[${time}]</span> ${message}`;
    DOM.batchChannelsLogConsole.appendChild(entry);
    DOM.batchChannelsLogConsole.scrollTop = DOM.batchChannelsLogConsole.scrollHeight;
}

/**
 * Valida e extrai IDs de canal UC... de uma string de entrada.
 * Aceita IDs separados por linha ou vírgula. Ignora entradas inválidas.
 */
function parseChannelIds(rawInput) {
    return rawInput
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(s => s.startsWith('UC') && s.length === 24);
}


/**
 * Coleta e renderiza metadados dos canais em lote via endpoint batch.
 * Custo: ⌈N/50⌉ unidades de cota (onde N = número de IDs válidos).
 */
async function performBatchChannelsMetadata() {
    if (AppState.isProcessingBatchChannels) return;

    const channelIds = parseChannelIds(DOM.batchChannelsInput.value);
    if (channelIds.length === 0) {
        alert('Nenhum ID válido encontrado. Os IDs devem começar com UC e ter 24 caracteres.');
        return;
    }

    AppState.isProcessingBatchChannels = true;
    AppState.pauseBatchChannelsRequested = false;
    AppState.batchChannelsResults = [];

    // UI Reset
    DOM.btnBatchChannelsMetadata.disabled = true;
    DOM.btnBatchChannelsVideos.disabled = true;
    DOM.btnBatchChannelsPause.style.display = 'none';

    DOM.batchChannelsProgressWrapper.style.display = 'block';
    DOM.batchChannelsStatusText.textContent = 'Enviando IDs em lote...';
    DOM.batchChannelsProgressPercentage.textContent = '0%';
    DOM.batchChannelsProgressFill.style.width = '0%';

    DOM.batchChannelsLogConsole.innerHTML = '';
    DOM.batchChannelsMetadataTbody.innerHTML = '';
    DOM.batchChannelsMetadataResults.style.display = 'block';
    DOM.batchChannelsVideosResults.style.display = 'none';

    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < channelIds.length; i += batchSize) {
        batches.push(channelIds.slice(i, i + batchSize));
    }

    const totalBatches = batches.length;
    const estimatedCost = totalBatches;
    logBatchChannelsConsole(`Iniciando busca de metadados: ${channelIds.length} ID(s) em ${totalBatches} lote(s). Custo estimado: ${estimatedCost} unidade(s) de cota.`, 'success');

    const resolvedMap = new Map(); // channel_id -> ChannelDetailModel

    for (let b = 0; b < totalBatches; b++) {
        const batch = batches[b];
        logBatchChannelsConsole(`[Lote ${b + 1}/${totalBatches}] Buscando ${batch.length} canal(is) em uma única chamada...`, 'info');
        DOM.batchChannelsStatusText.textContent = `Buscando lote ${b + 1} de ${totalBatches}...`;

        try {
            const response = await fetch(`${BACKEND_URL}/api/channels/batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ channel_ids: batch })
            });

            if (response.ok) {
                const payload = await response.json();
                AppState.sessionQuotaSpent += payload.quota.operation_cost;
                updateQuotaUI();

                payload.data.forEach(c => resolvedMap.set(c.channel_id, c));
                logBatchChannelsConsole(`Lote ${b + 1} concluído: ${payload.data.length} canal(is) encontrado(s) de ${batch.length} solicitado(s).`, 'success');
            } else {
                const err = await response.json();
                logBatchChannelsConsole(`Erro no lote ${b + 1}: ${err.detail || 'Falha desconhecida'}`, 'error');
            }
        } catch (err) {
            logBatchChannelsConsole(`Erro de rede no lote ${b + 1}: ${err.message}`, 'error');
        }

        const pct = Math.round(((b + 1) / totalBatches) * 100);
        DOM.batchChannelsProgressPercentage.textContent = `${pct}%`;
        DOM.batchChannelsProgressFill.style.width = `${pct}%`;
    }

    // Montar resultado final cruzando IDs solicitados com os encontrados
    channelIds.forEach(cid => {
        if (resolvedMap.has(cid)) {
            const c = resolvedMap.get(cid);
            const row = {
                canal_pesquisado: cid,
                title: c.title,
                custom_url: c.custom_url || '',
                channel_id: c.channel_id,
                subscriber_count: c.subscriber_count,
                video_count: c.video_count,
                view_count: c.view_count,
                thumbnail_url: c.thumbnail_url,
                status: 'Sucesso'
            };
            AppState.batchChannelsResults.push(row);
            appendBatchChannelsMetadataRow(row);
        } else {
            const row = {
                canal_pesquisado: cid,
                title: '',
                custom_url: '',
                channel_id: cid,
                subscriber_count: 0,
                video_count: 0,
                view_count: 0,
                thumbnail_url: '',
                status: 'Não encontrado'
            };
            AppState.batchChannelsResults.push(row);
            appendBatchChannelsMetadataRow(row);
            logBatchChannelsConsole(`ID não encontrado: ${cid}`, 'error');
        }
    });

    AppState.isProcessingBatchChannels = false;
    DOM.btnBatchChannelsMetadata.disabled = false;
    DOM.btnBatchChannelsVideos.disabled = false;

    DOM.batchChannelsMetadataTitle.textContent = `Metadados dos Canais (${AppState.batchChannelsResults.length})`;
    DOM.batchChannelsStatusText.textContent = 'Concluído!';
    logBatchChannelsConsole(`Busca em lote concluída! ${resolvedMap.size} de ${channelIds.length} canal(is) encontrado(s).`, 'success');
}


/**
 * Renderiza uma linha de metadados de canal na tabela correspondente.
 */
function appendBatchChannelsMetadataRow(c) {
    const tr = document.createElement('tr');
    
    let avatarHtml = '';
    if (c.thumbnail_url) {
        avatarHtml = `<img src="${c.thumbnail_url}" alt="Avatar" class="video-thumbnail" style="width: 36px; height: 36px; border-radius: 50%; border: var(--border-width) solid var(--border-color); object-fit: cover;">`;
    } else {
        avatarHtml = `<div style="width: 36px; height: 36px; border-radius: 50%; background-color: var(--secondary); display: flex; align-items: center; justify-content: center; border: var(--border-width) solid var(--border-color);"><i class="fa-solid fa-user" style="font-size: 14px; color: var(--text-secondary);"></i></div>`;
    }

    let statusStyle = '';
    if (c.status === 'Sucesso') {
        statusStyle = 'background-color: var(--bg-success); color: var(--text-success); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; display: inline-block;';
    } else {
        statusStyle = 'background-color: var(--bg-error); color: var(--text-error); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; display: inline-block;';
    }

    tr.innerHTML = `
        <td style="vertical-align: middle;">${avatarHtml}</td>
        <td style="vertical-align: middle; font-weight: 500;">${escapeHTML(c.canal_pesquisado)}</td>
        <td style="vertical-align: middle;">${c.title ? escapeHTML(c.title) : '-'}</td>
        <td style="vertical-align: middle;">
            ${c.channel_id ? `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 12px; font-weight: 500; color: var(--text-primary);">${c.custom_url || ''}</span>
                    <span style="font-size: 10px; color: var(--text-secondary);">${c.channel_id}</span>
                </div>
            ` : '-'}
        </td>
        <td style="vertical-align: middle;">${c.status === 'Sucesso' && c.subscriber_count !== null && c.subscriber_count !== undefined ? c.subscriber_count.toLocaleString() : '-'}</td>
        <td style="vertical-align: middle;">${c.status === 'Sucesso' && c.video_count !== null && c.video_count !== undefined ? c.video_count.toLocaleString() : '-'}</td>
        <td style="vertical-align: middle;">${c.status === 'Sucesso' && c.view_count !== null && c.view_count !== undefined ? c.view_count.toLocaleString() : '-'}</td>
        <td style="vertical-align: middle;"><span style="${statusStyle}">${c.status}</span></td>
    `;
    DOM.batchChannelsMetadataTbody.appendChild(tr);
}

/**
 * Coleta e renderiza vídeos de todos os canais informados em lote.
 */
async function performBatchChannelsVideos() {
    if (AppState.isProcessingBatchChannels) return;

    const channelIds = parseChannelIds(DOM.batchChannelsInput.value);
    if (channelIds.length === 0) {
        alert('Nenhum ID válido encontrado. Os IDs devem começar com UC e ter 24 caracteres.');
        return;
    }

    AppState.isProcessingBatchChannels = true;
    AppState.batchChannelsVideos = [];

    // UI Reset
    DOM.btnBatchChannelsMetadata.disabled = true;
    DOM.btnBatchChannelsVideos.disabled = true;
    DOM.btnBatchChannelsPause.style.display = 'none';

    DOM.batchChannelsProgressWrapper.style.display = 'block';
    DOM.batchChannelsStatusText.textContent = 'Resolvendo canais em lote...';
    DOM.batchChannelsProgressPercentage.textContent = '0%';
    DOM.batchChannelsProgressFill.style.width = '0%';

    DOM.batchChannelsLogConsole.innerHTML = '';
    logBatchChannelsConsole(`Iniciando coleta paralela de vídeos para ${channelIds.length} canal(is).`, 'success');

    DOM.batchChannelsVideosTbody.innerHTML = '';
    DOM.batchChannelsVideosResults.style.display = 'block';
    DOM.batchChannelsMetadataResults.style.display = 'none';

    // --- FASE 1: Resolver todos os canais via batch endpoint ---
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < channelIds.length; i += batchSize) {
        batches.push(channelIds.slice(i, i + batchSize));
    }

    const channelDetailsMap = new Map();
    logBatchChannelsConsole(`Fase 1: Resolvendo ${channelIds.length} ID(s) em ${batches.length} lote(s) (custo: ${batches.length} cota(s))...`, 'info');

    for (let b = 0; b < batches.length; b++) {
        try {
            const response = await fetch(`${BACKEND_URL}/api/channels/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channel_ids: batches[b] })
            });
            if (response.ok) {
                const payload = await response.json();
                AppState.sessionQuotaSpent += payload.quota.operation_cost;
                updateQuotaUI();
                payload.data.forEach(c => channelDetailsMap.set(c.channel_id, c));
                logBatchChannelsConsole(`Lote ${b + 1}/${batches.length}: ${payload.data.length} canal(is) resolvido(s).`, 'success');
            } else {
                const err = await response.json();
                logBatchChannelsConsole(`Erro no lote ${b + 1}: ${err.detail || 'Falha desconhecida'}`, 'error');
            }
        } catch (err) {
            logBatchChannelsConsole(`Erro de rede no lote ${b + 1}: ${err.message}`, 'error');
        }
        const pct = Math.round(((b + 1) / batches.length) * 25);
        DOM.batchChannelsProgressPercentage.textContent = `${pct}%`;
        DOM.batchChannelsProgressFill.style.width = `${pct}%`;
    }

    // Marcar canais não encontrados
    channelIds.forEach(cid => {
        if (!channelDetailsMap.has(cid)) {
            appendBatchChannelsVideoRow({ channel_title: `${cid} (Não encontrado)`, channel_id: cid, is_not_found: true });
            logBatchChannelsConsole(`ID não encontrado: ${cid}`, 'error');
        }
    });

    const resolvedChannels = Array.from(channelDetailsMap.values());
    const totalChannels = resolvedChannels.length;

    if (totalChannels === 0) {
        finalizeBatchVideosUI(0);
        return;
    }

    // --- FASE 2: Buscar vídeos de TODOS os canais em paralelo ---
    logBatchChannelsConsole(`Fase 2: Buscando vídeos de ${totalChannels} canal(is) em PARALELO...`, 'success');
    DOM.batchChannelsStatusText.textContent = `Coletando vídeos de ${totalChannels} canal(is) em paralelo...`;

    let channelsDone = 0;
    const allChannelResults = []; // { channelDetails, videos }[]

    /**
     * Busca todas as páginas de vídeos de um único canal sequencialmente.
     * Retorna um array com todos os vídeos coletados.
     */
    async function fetchAllVideosForChannel(channelDetails) {
        const playlistId = channelDetails.uploads_playlist_id;
        const totalVideos = channelDetails.video_count;
        let nextPageToken = null;
        let collectedVideos = [];

        while (true) {
            try {
                let url = `${BACKEND_URL}/api/channel/videos?playlist_id=${playlistId}`;
                if (nextPageToken) url += `&page_token=${encodeURIComponent(nextPageToken)}`;

                const response = await fetch(url);

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.detail || 'Falha ao buscar vídeos.');
                }

                const payload = await response.json();

                // Atualiza cota (JavaScript é single-threaded; += é seguro aqui)
                AppState.sessionQuotaSpent += payload.quota.operation_cost;
                updateQuotaUI();

                const pageVideos = payload.data || [];
                pageVideos.forEach(v => {
                    v.channel_title = channelDetails.title;
                    v.channel_id = channelDetails.channel_id;
                });
                collectedVideos.push(...pageVideos);

                nextPageToken = payload.pagination.next_page_token;
                if (!nextPageToken || pageVideos.length === 0) break;

            } catch (err) {
                logBatchChannelsConsole(`Erro em "${channelDetails.title}": ${err.message}`, 'error');
                break;
            }
        }

        // Atualizar progresso conforme cada canal termina
        channelsDone++;
        logBatchChannelsConsole(`✓ "${channelDetails.title}": ${collectedVideos.length} / ${totalVideos} vídeo(s) coletado(s).`, 'success');
        const pct = 25 + Math.round((channelsDone / totalChannels) * 75);
        DOM.batchChannelsProgressPercentage.textContent = `${pct}%`;
        DOM.batchChannelsProgressFill.style.width = `${pct}%`;
        DOM.batchChannelsStatusText.textContent = `${channelsDone} de ${totalChannels} canal(is) concluído(s)...`;

        return collectedVideos;
    }

    // Dispara todas as buscas de canal em paralelo
    const channelPromises = resolvedChannels.map(ch =>
        fetchAllVideosForChannel(ch).then(videos => ({ channelDetails: ch, videos }))
    );
    const settled = await Promise.allSettled(channelPromises);

    // Montar resultado final respeitando a ordem de entrada
    const videosByChannelId = new Map();
    settled.forEach(result => {
        if (result.status === 'fulfilled') {
            const { channelDetails, videos } = result.value;
            videosByChannelId.set(channelDetails.channel_id, { channelDetails, videos });
        }
    });

    // Renderizar na tabela respeitando a ordem original dos canais
    resolvedChannels.forEach(ch => {
        const entry = videosByChannelId.get(ch.channel_id);
        if (entry) {
            entry.videos.forEach(v => {
                AppState.batchChannelsVideos.push(v);
                appendBatchChannelsVideoRow(v);
            });
        }
    });

    finalizeBatchVideosUI(resolvedChannels.length);
}

function finalizeBatchVideosUI(processedCount) {
    AppState.isProcessingBatchChannels = false;
    DOM.btnBatchChannelsMetadata.disabled = false;
    DOM.btnBatchChannelsVideos.disabled = false;
    DOM.btnBatchChannelsPause.style.display = 'none';

    DOM.batchChannelsVideosTitle.textContent = `Vídeos Consolidados (${AppState.batchChannelsVideos.length})`;
    DOM.batchChannelsStatusText.textContent = 'Concluído!';
    DOM.batchChannelsProgressPercentage.textContent = '100%';
    DOM.batchChannelsProgressFill.style.width = '100%';
    logBatchChannelsConsole(`Coleta paralela concluída! ${AppState.batchChannelsVideos.length} vídeo(s) de ${processedCount} canal(is).`, 'success');
}


/**
 * Renderiza uma linha de vídeo na tabela combinada de canais em lote.
 */
function appendBatchChannelsVideoRow(v) {
    const tr = document.createElement('tr');
    
    if (v.is_not_found) {
        const statusStyle = 'background-color: var(--bg-error); color: var(--text-error); padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; display: inline-block;';
        tr.innerHTML = `
            <td style="vertical-align: middle; font-weight: 500; color: var(--text-error);">${escapeHTML(v.channel_title)}</td>
            <td style="vertical-align: middle;">-</td>
            <td style="vertical-align: middle;"><span style="${statusStyle}">Não encontrado</span></td>
            <td style="vertical-align: middle;">-</td>
            <td style="vertical-align: middle;">-</td>
            <td style="vertical-align: middle;">-</td>
            <td style="vertical-align: middle;">-</td>
            <td style="vertical-align: middle;">-</td>
        `;
    } else {
        tr.innerHTML = `
            <td style="vertical-align: middle; font-weight: 500;">${escapeHTML(v.channel_title)}</td>
            <td style="vertical-align: middle;">
                <img src="${v.thumbnail_url}" alt="Thumbnail" class="video-thumbnail" style="width: 50px; border-radius: 4px; border: var(--border-width) solid var(--border-color);">
            </td>
            <td style="vertical-align: middle;">
                <div class="video-title-td" title="${v.title}">
                    <a href="https://www.youtube.com/watch?v=${v.video_id}" target="_blank" rel="noopener noreferrer" style="color: var(--text-primary); text-decoration: none; display: inline-flex; align-items: center; gap: 6px; font-weight: 500;">
                        ${v.title} <i class="fa-solid fa-up-right-from-square" style="font-size: 10px; color: var(--text-muted)"></i>
                    </a>
                </div>
            </td>
            <td style="vertical-align: middle;">
                <div class="video-views-td">
                    <i class="fa-solid fa-eye" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${v.view_count ? v.view_count.toLocaleString() : '0'}
                </div>
            </td>
            <td style="vertical-align: middle;">
                <div><i class="fa-solid fa-thumbs-up" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${v.like_count ? v.like_count.toLocaleString() : '0'}</div>
            </td>
            <td style="vertical-align: middle;">
                <div><i class="fa-solid fa-comment" style="margin-right: 4px; font-size: 10px; color: var(--text-secondary);"></i>${v.comment_count ? v.comment_count.toLocaleString() : '0'}</div>
            </td>
            <td style="vertical-align: middle;">
                <div>${new Date(v.published_at).toLocaleDateString()}</div>
            </td>
            <td style="vertical-align: middle;">
                <div>${formatDuration(v.duration)}</div>
            </td>
        `;
    }
    
    DOM.batchChannelsVideosTbody.appendChild(tr);
}

/**
 * Controla a pausa no processamento de lote.
 */
function pauseBatchChannelsWorkflow() {
    AppState.pauseBatchChannelsRequested = true;
    DOM.btnBatchChannelsPause.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Pausando...';
    DOM.btnBatchChannelsPause.disabled = true;
}

/**
 * Exporta o CSV de metadados acumulados.
 */
function exportBatchChannelsMetadataCSV() {
    if (!AppState.batchChannelsResults || AppState.batchChannelsResults.length === 0) {
        alert('Não há dados para exportar.');
        return;
    }
    const filename = `qualitube_canais_lote_metadados_${Date.now()}.csv`;
    ExportUtils.downloadBatchChannelsMetadataCSV(AppState.batchChannelsResults, filename);
}

/**
 * Exporta o CSV de vídeos consolidados dos canais.
 */
function exportBatchChannelsVideosCSV() {
    const realVideos = AppState.batchChannelsVideos.filter(v => v.video_id);
    if (realVideos.length === 0) {
        alert('Não há vídeos reais para exportar.');
        return;
    }
    const filename = `qualitube_canais_lote_videos_${Date.now()}.csv`;
    ExportUtils.downloadBatchChannelsVideosCSV(realVideos, filename);
}
