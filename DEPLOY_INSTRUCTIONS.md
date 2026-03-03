# Como publicar no Vercel

O seu aplicativo já está configurado e **compilando com sucesso** (corrigi os erros de configuração interna que impediam o build).

Para colocar no ar (Vercel), você tem duas opções principais:

## Opção 1: Via Linha de Comando (Mais Rápido)

Essa opção envia o código direto do seu computador para o Vercel.

1.  Abra o terminal na pasta do projeto.
2.  Execute o comando:

    ```bash
    npx vercel
    ```

3.  Responda às perguntas que aparecerem:
    *   **Log in to Vercel**: Vai abrir o navegador para você logar.
    *   **Set up and deploy**: Digite `y` (yes).
    *   **Which scope**: Selecione seu usuário.
    *   **Link to existing project**: Digite `n` (no).
    *   **Project name**: Aperte Enter (aceita o padrão) ou digite um nome.
    *   **In which directory**: Aperte Enter (aceita `./`).
    *   **Want to modify these settings**: Digite `n`.

O Vercel vai começar o upload e te dar um link de produção (ex: `https://peregrinas-app.vercel.app`).

---

## Opção 2: Via GitHub (Recomendado)

Se você usa GitHub, é a forma mais profissional.

1.  Crie um repositório no GitHub e suba este código.
2.  Vá no painel do Vercel (vercel.com).
3.  Clique em **Add New...** > **Project**.
4.  Selecione o repositório do GitHub.
5.  Clique em **Deploy**.

O Vercel detectará automaticamente que é um projeto Vite e fará o resto.
