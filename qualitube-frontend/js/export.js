/**
 * QualiTube - Utilitários de Exportação de Dados
 * Lida com a geração e download de arquivos em lote diretamente no navegador.
 */

const ExportUtils = {
    /**
     * Escapa valores para formato CSV seguro.
     */
    escapeCSVValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        let str = String(value);
        // Substitui quebras de linha por espaço para não quebrar as linhas do CSV
        str = str.replace(/(\r\n|\n|\r)/gm, ' ');
        // Se houver aspas duplas, duplica-as e envolve o texto em aspas
        if (str.includes('"') || str.includes(',') || str.includes(';')) {
            str = str.replace(/"/g, '""');
            return `"${str}"`;
        }
        return str;
    },

    /**
     * Converte array de objetos de comentários em arquivo CSV e dispara o download.
     * @param {Array} comments Lista de comentários limpos do backend
     * @param {string} filename Nome do arquivo final
     */
    downloadCommentsCSV(comments, filename = 'qualitube_comentarios.csv') {
        if (!comments || comments.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = [
            'comment_id',
            'video_id',
            'author_name',
            'author_channel_id',
            'author_channel_url',
            'text',
            'like_count',
            'published_at',
            'updated_at',
            'total_reply_count'
        ];

        // Cria o cabeçalho do CSV
        let csvContent = headers.join(',') + '\n';

        // Adiciona as linhas de dados
        comments.forEach(comment => {
            const row = headers.map(header => {
                return this.escapeCSVValue(comment[header]);
            });
            csvContent += row.join(',') + '\n';
        });

        // Adiciona BOM do UTF-8 para compatibilidade perfeita com o Microsoft Excel
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.triggerDownload(blob, filename);
    },

    /**
     * Converte array de objetos de vídeos do canal em arquivo CSV e dispara o download.
     * @param {Array} videos Lista de detalhes de vídeos do backend
     * @param {string} filename Nome do arquivo final
     */
    downloadChannelVideosCSV(videos, filename = 'qualitube_videos_canal.csv') {
        if (!videos || videos.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = [
            'video_id',
            'title',
            'published_at',
            'view_count',
            'like_count',
            'comment_count',
            'duration',
            'video_url'
        ];

        // Cria o cabeçalho do CSV
        let csvContent = headers.join(',') + '\n';

        // Adiciona as linhas de dados
        videos.forEach(video => {
            const dataRow = {
                video_id: video.video_id,
                title: video.title,
                published_at: video.published_at,
                view_count: video.view_count,
                like_count: video.like_count,
                comment_count: video.comment_count,
                duration: video.duration,
                video_url: `https://www.youtube.com/watch?v=${video.video_id}`
            };

            const row = headers.map(header => {
                return this.escapeCSVValue(dataRow[header]);
            });
            csvContent += row.join(',') + '\n';
        });

        // Adiciona BOM do UTF-8 para compatibilidade com o Excel
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.triggerDownload(blob, filename);
    },

    /**
     * Cria e exporta uma rede bipartida (2-mode network) ligando Autores de comentários aos Vídeos.
     * Exporta no formato GEXF compatível com o Gephi.
     * @param {Array} comments Lista de comentários
     * @param {Array} videos Lista de detalhes de vídeos analisados
     * @param {string} filename Nome do arquivo final
     */
    downloadNetworkGEXF(comments, videos, filename = 'qualitube_rede.gexf') {
        if (!comments || comments.length === 0) {
            alert('Não há comentários para mapear a rede.');
            return;
        }

        // Mapear vídeos para referência rápida de labels
        const videoMap = {};
        videos.forEach(v => {
            videoMap[v.video_id] = v.title || `Vídeo ${v.video_id}`;
        });

        // Conjuntos únicos para evitar duplicados em nós
        const nodes = new Map(); // id -> {label, type}
        const edges = new Map(); // source_target -> {source, target, weight}

        // 1. Adicionar nós de Vídeos que possuem comentários
        comments.forEach(c => {
            const vId = c.video_id;
            const vTitle = videoMap[vId] || `Vídeo ${vId}`;
            
            if (!nodes.has(vId)) {
                nodes.set(vId, {
                    label: vTitle,
                    type: 'video'
                });
            }

            // 2. Adicionar nós de Usuários (Autores dos comentários)
            const authorId = c.author_channel_id || `anon_${c.author_name}`;
            const authorName = c.author_name || 'Usuário Anônimo';

            if (!nodes.has(authorId)) {
                nodes.set(authorId, {
                    label: authorName,
                    type: 'author'
                });
            }

            // 3. Conectar Usuário ao Vídeo
            const edgeKey = `${authorId}_${vId}`;
            if (edges.has(edgeKey)) {
                edges.get(edgeKey).weight += 1;
            } else {
                edges.set(edgeKey, {
                    source: authorId,
                    target: vId,
                    weight: 1
                });
            }
        });

        // Montar a estrutura XML do GEXF v1.2
        const dateStr = new Date().toISOString().split('T')[0];
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
    <meta lastmodifieddate="${dateStr}">
        <creator>QualiTube</creator>
        <description>Rede de Interação Usuários-Vídeos no YouTube</description>
    </meta>
    <graph mode="static" defaultedgetype="directed">
        <attributes class="node" mode="static">
            <attribute id="0" title="type" type="string"/>
        </attributes>
        <nodes>
`;

        // Escrever Nós
        nodes.forEach((data, id) => {
            const escapedLabel = this.escapeXML(data.label);
            const escapedId = this.escapeXML(id);
            xml += `            <node id="${escapedId}" label="${escapedLabel}">
                <attvalues>
                    <attvalue for="0" value="${data.type}"/>
                </attvalues>
            </node>\n`;
        });

        xml += `        </nodes>\n        <edges>\n`;

        // Escrever Arestas
        let edgeId = 0;
        edges.forEach((data) => {
            const escSource = this.escapeXML(data.source);
            const escTarget = this.escapeXML(data.target);
            xml += `            <edge id="e${edgeId++}" source="${escSource}" target="${escTarget}" weight="${data.weight}"/>\n`;
        });

        xml += `        </edges>\n    </graph>\n</gexf>`;

        const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
        this.triggerDownload(blob, filename);
    },

    /**
     * Escapa caracteres especiais para segurança de XML.
     */
    escapeXML(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    },

    /**
     * Converte array de metadados de canais processados em lote em CSV e dispara o download.
     * @param {Array} channels Lista de metadados de canais do lote
     * @param {string} filename Nome do arquivo final
     */
    downloadBatchChannelsMetadataCSV(channels, filename = 'qualitube_canais_lote_metadados.csv') {
        if (!channels || channels.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = [
            'canal_pesquisado',
            'titulo_oficial',
            'channel_id',
            'handle',
            'subscriber_count',
            'video_count',
            'view_count',
            'status',
            'avatar_url'
        ];

        let csvContent = headers.join(',') + '\n';

        channels.forEach(channel => {
            const dataRow = {
                canal_pesquisado: channel.canal_pesquisado,
                titulo_oficial: channel.title || '',
                channel_id: channel.channel_id || '',
                handle: channel.custom_url || '',
                subscriber_count: channel.subscriber_count || 0,
                video_count: channel.video_count || 0,
                view_count: channel.view_count || 0,
                status: channel.status || '',
                avatar_url: channel.thumbnail_url || ''
            };

            const row = headers.map(header => {
                return this.escapeCSVValue(dataRow[header]);
            });
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.triggerDownload(blob, filename);
    },

    /**
     * Converte array de vídeos coletados de canais em lote em CSV e dispara o download.
     * @param {Array} videos Lista consolidada de vídeos de múltiplos canais
     * @param {string} filename Nome do arquivo final
     */
    downloadBatchChannelsVideosCSV(videos, filename = 'qualitube_canais_lote_videos.csv') {
        if (!videos || videos.length === 0) {
            alert('Não há dados para exportar.');
            return;
        }

        const headers = [
            'channel_title',
            'channel_id',
            'video_id',
            'title',
            'view_count',
            'like_count',
            'comment_count',
            'published_at',
            'duration',
            'video_url',
            'thumbnail_url'
        ];

        let csvContent = headers.join(',') + '\n';

        videos.forEach(video => {
            const dataRow = {
                channel_title: video.channel_title || '',
                channel_id: video.channel_id || '',
                video_id: video.video_id || '',
                title: video.title || '',
                view_count: video.view_count || 0,
                like_count: video.like_count || 0,
                comment_count: video.comment_count || 0,
                published_at: video.published_at || '',
                duration: video.duration || '',
                video_url: `https://www.youtube.com/watch?v=${video.video_id}`,
                thumbnail_url: video.thumbnail_url || ''
            };

            const row = headers.map(header => {
                return this.escapeCSVValue(dataRow[header]);
            });
            csvContent += row.join(',') + '\n';
        });

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        this.triggerDownload(blob, filename);
    },

    /**
     * Dispara o download de um Blob no navegador.
     */
    triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
};
