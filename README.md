# QualiTube | Extração de Dados do YouTube para Ciências Sociais

O **QualiTube** é uma ferramenta stateless de extração e estruturação de dados do YouTube, desenhada sob medida para pesquisadores de Ciências Sociais, Comunicação, Humanidades e analistas de redes. A ferramenta simplifica a amostragem de vídeos, a extração de comentários e a consolidação de metadados de canais para análises quantitativas e qualitativas.

---

## 🚀 Funcionalidades Principais

*   **Amostragem e Busca de Vídeos (Passo 1)**: Pesquise vídeos usando termos-chave (com suporte a operadores lógicos AND, OR, `-`) e filtros por canal ou período de publicação.
*   **Extração Profunda de Comentários (Passo 2)**: Capture comentários e respostas em lote de múltiplos vídeos de forma paginada e controlada.
*   **Análise de Canais Individuais**: Colete metadados, estatísticas gerais (inscritos, visualizações, vídeos) e listas de vídeos de canais específicos.
*   **Processamento de Canais em Lote**: Insira múltiplos IDs de canal para consolidar seus metadados ou listar todos os seus vídeos em tabelas agregadas.
*   **Exportação de Dados Multiformato**:
    *   **CSV (Planilha Plana)**: Tabela limpa com dados estruturados dos comentários (IDs, texto, likes, datas, autor) pronta para uso em R, SPSS, Python, Excel, etc.
    *   **GEXF (Redes Sociais)**: Estrutura redes de interação (autores de comentários conectados aos vídeos) prontas para importação e análise no Gephi.
*   **Internacionalização (i18n)**: Suporte completo a idiomas (Português e Inglês) alternáveis na barra lateral com um único clique.
*   **Design Premium e Responsivo**: Interface limpa e minimalista com tons inspirados em pergaminho/Midnight Navy, facilitando longas horas de pesquisa.

---

## 🛠️ Como Executar Localmente

O aplicativo é dividido em duas partes: um **Frontend** (página HTML/JS estática) e um **Backend** (API Python stateless construída com FastAPI).

### 1. Executando o Backend (API)

#### Pré-requisitos:
*   Python 3.10 ou superior instalado no computador.

#### Passo a Passo:
1.  Abra o terminal (PowerShell ou Bash) e acesse a pasta do backend:
    ```bash
    cd qualitube-backend
    ```
2.  Crie e ative um ambiente virtual:
    *   **No Windows (PowerShell)**:
        ```powershell
        python -m venv venv
        .\venv\Scripts\activate
        ```
    *   **No Linux/macOS**:
        ```bash
        python -m venv venv
        source venv/bin/activate
        ```
3.  Instale as dependências exigidas:
    ```bash
    pip install -r requirements.txt
    ```
4.  Configure sua Chave de API do YouTube nas variáveis de ambiente:
    *   **No Windows (PowerShell)**:
        ```powershell
        $env:YOUTUBE_API_KEY="SUA_CHAVE_DE_API_AQUI"
        ```
    *   **No Linux/macOS**:
        ```bash
        export YOUTUBE_API_KEY="SUA_CHAVE_DE_API_AQUI"
        ```
5.  Inicie o servidor do backend:
    ```bash
    python -m app.main
    ```
    O backend estará ativo em `http://localhost:8000`. Você pode acessar a documentação interativa das rotas em `http://localhost:8000/docs`.

### 2. Executando o Frontend (Interface)

1.  Navegue até a pasta `qualitube-frontend`.
2.  Abra o arquivo `index.html` diretamente em qualquer navegador de internet moderno (ou use extensões como o Live Server do VS Code).
3.  O painel se conectará automaticamente ao seu backend local.

---

## 🧑‍💻 Autoria e Créditos

Desenvolvido por **Felipe Menegotto**:
*   Licenciado em Física pela Universidade Federal do Rio Grande do Sul (UFRGS).
*   Mestre em Cultura Científica pela Universidade de Lisboa.
*   Pesquisador independente focado no desenvolvimento de ferramentas digitais e metodologias para pesquisa científica.
