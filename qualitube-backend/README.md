# QualiTube Backend

Este é o backend do **QualiTube**, uma API stateless construída com FastAPI para auxiliar pesquisadores na extração, limpeza e análise de dados do YouTube usando a YouTube Data API v3.

## Funcionalidades
*   **Totalmente Stateless**: Não possui banco de dados nem armazena arquivos persistentes.
*   **Segurança de Credenciais**: Não guarda chaves de API do YouTube. A chave é transmitida em tempo de execução via cabeçalho HTTP (`X-YouTube-API-Key`).
*   **Contabilidade de Cotas**: Cada endpoint calcula e reporta a cota exata gasta na chamada.
*   **Batching Automático**: O endpoint de detalhes dos vídeos (`/api/videos/details`) agrupa automaticamente os IDs e faz requisições em lotes de 50 para economia extrema de cotas.

## Como Executar Localmente

### Pré-requisitos
*   Python 3.10 ou superior instalado.

### Passo a Passo

1.  Acesse o diretório do backend:
    ```bash
    cd qualitube-backend
    ```

2.  Crie e ative um ambiente virtual:
    ```bash
    python -m venv venv
    # No Windows:
    .\venv\Scripts\activate
    # No Linux/macOS:
    source venv/bin/activate
    ```

3.  Instale as dependências:
    ```bash
    pip install -r requirements.txt
    ```

4.  Execute a aplicação localmente:
    ```bash
    python -m app.main
    # Ou diretamente via uvicorn:
    # uvicorn app.main:app --reload
    ```
    O servidor estará rodando em: `http://localhost:8000`.

5.  Acesse a documentação interativa (Swagger UI) em:
    `http://localhost:8000/docs`.

## Deploy no Hugging Face Spaces

Este projeto está pré-configurado para o Hugging Face Spaces (usando o Dockerfile). 
*   Ao criar o Space, escolha **Docker** como SDK.
*   A porta padrão configurada é a **7860**, que é exigida pelo Hugging Face.
