# QualiTube Frontend

Este é o frontend do **QualiTube**, uma Single Page Application construída inteiramente com HTML, CSS e JavaScript puros (Vanilla), voltada para pesquisadores de Ciências Sociais.

## Funcionalidades
*   **Interface Premium**: Layout limpo, responsivo, dark mode sofisticado e micro-animações para melhor experiência do usuário.
*   **Simulador de Custos de Cota**: Calcula dinamicamente a estimativa de cota a ser consumida antes de iniciar a extração profunda.
*   **Orquestração Stateless**: Gerencia de forma inteligente a paginação e chamadas subsequentes no próprio navegador.
*   **Safe Resume**: Permite pausar e baixar o progresso atual da coleta em um arquivo JSON local. É possível carregar este arquivo para retomar a coleta de onde parou em outro momento ou dia.
*   **Segurança**: A chave de API nunca é persistida no navegador e é excluída ao fechar a aba. O arquivo JSON de progresso não contém chaves de API.
*   **Exportações Úteis**:
    *   **CSV**: Tabela limpa de comentários para R, SPSS e Python.
    *   **GEXF**: Rede bipartida (Autores -> Vídeos) estruturada pronta para importação no Gephi.

## Como Executar Localmente

### Pré-requisitos
*   Um servidor web estático simples local.

### Usando o VS Code (Live Server)
1.  Abra a pasta `qualitube-frontend` no VS Code.
2.  Instale a extensão **Live Server**.
3.  Clique em **Go Live** no canto inferior direito.
4.  O app abrirá por padrão em `http://127.0.0.1:5500`.

### Usando Python (Terminal)
1.  Abra o terminal na pasta `qualitube-frontend`.
2.  Execute:
    ```bash
    python -m http.server 5500
    ```
3.  Acesse `http://localhost:5500` no seu navegador.

## Deploy no GitHub Pages
Como o projeto contém apenas arquivos estáticos (HTML, CSS e JS puros) na raiz, basta enviar o conteúdo desta pasta para um repositório no GitHub e ativar o **GitHub Pages** nas configurações do repositório.
