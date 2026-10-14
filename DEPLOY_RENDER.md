# Publicação de teste no Render

Este guia é para publicar uma versão de teste. O plano gratuito usa armazenamento local efêmero: os fretes e sessões guardados no SQLite podem ser perdidos após reinicialização, redeploy ou suspensão. Não use dados reais nem senhas reutilizadas.

## 1. Preparar um repositório GitHub

1. Entre em https://github.com e crie uma conta, caso ainda não tenha.
2. Crie um repositório privado chamado `cargomodal-portal-fretes`.
3. Extraia o ZIP do projeto no computador.
4. Envie os arquivos e pastas da raiz do projeto para o repositório. Não envie `.env`, `node_modules/` nem a pasta `data/`.
5. Confirme que o repositório contém `package.json`, `server.js`, `render.yaml`, `README.md` e a pasta `public/`.

## 2. Criar o serviço temporário no Render

1. Acesse https://render.com e crie uma conta.
2. Escolha criar um novo serviço a partir de um repositório Git (Web Service / Blueprint, conforme as opções exibidas).
3. Autorize a conexão ao GitHub e selecione o repositório `cargomodal-portal-fretes`.
4. Se usar Blueprint, o `render.yaml` define um serviço Node.js gratuito para testes. Se criar um Web Service manualmente, configure:
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Health check path: `/api/config`
5. Em Environment Variables, configure:
   - `NODE_ENV` = `production`
   - `SESSION_SECRET` = segredo longo e aleatório (se o Blueprint já o gerar, mantenha o valor gerado)
   - `ADMIN_USER` = nome de usuário escolhido
   - `ADMIN_PASSWORD` = senha forte exclusiva para o teste
   - `WHATSAPP_NUMBER` = número comercial, só dígitos com país e DDD (ex.: `5511999999999`)
   - `BRAND_NAME` = `CargoModal`
6. Clique em Deploy e aguarde o resultado do build.
7. Abra a URL `*.onrender.com` exibida pelo Render.

## 3. Testar

- Abra a URL em janela anônima e confira a página pública.
- Clique em “Área da equipe” e entre com o usuário/senha definidos.
- Cadastre um frete fictício, por exemplo Campinas/SP → Curitiba/PR, tipo Truck, 12 toneladas.
- Teste filtros, edição, pausa/publicação e exclusão.
- Clique no WhatsApp para verificar a mensagem montada. Configure um número de teste se não quiser abrir conversa com o número comercial.
- Teste no celular.
- Não insira dados pessoais, cargas reais ou informações comerciais confidenciais.

## 4. Limitações e segurança

- O serviço gratuito é apenas para avaliação visual/funcional. O SQLite local fica em disco efêmero; registros podem desaparecer e sessões podem terminar após reinicialização ou novo deploy.
- Para operação real, escolha hospedagem com disco persistente compatível com SQLite ou migre para PostgreSQL gerenciado; configure backups e restauração.
- Não compartilhe credenciais nem as coloque no repositório. Configure-as somente nas variáveis de ambiente da hospedagem.
- Se alterar `ADMIN_USER`/`ADMIN_PASSWORD` depois que o usuário inicial já tiver sido criado em banco persistente, mudar variáveis não altera automaticamente a senha existente. Esta versão de teste usa armazenamento efêmero.
- O Render pode solicitar cartão, limitar serviços gratuitos ou alterar as condições do plano; confirme os termos atuais antes de prosseguir.
- A URL temporária é pública. O painel exige login, mas não divulgue o endereço como se fosse uma operação final.
