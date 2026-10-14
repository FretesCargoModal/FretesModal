# Portal de Fretes CargoModal — versão inicial

Portal web full-stack com:
- Página pública para consultar fretes publicados.
- Filtros por origem, destino, tipo de veículo e faixa de peso.
- Botão de interesse via WhatsApp, com texto pré-preenchido.
- Painel administrativo com login, cadastro, edição, publicação, pausa, encerramento e exclusão de fretes.
- Banco SQLite para usuários, fretes e sessões.
- Senhas armazenadas com hash bcrypt, cookie de sessão HttpOnly/SameSite, limite de tentativas de login e cabeçalhos Helmet.

> A identidade visual nesta versão é uma aproximação em azul-marinho e azul. Substitua o monograma “CM” pelo logotipo oficial da CargoModal antes de publicar.

## Requisitos

- Node.js 20 ou superior
- npm
- Em produção: hospedagem que suporte Node.js e armazenamento persistente para a pasta `data/`
- HTTPS obrigatório em produção
- Número de WhatsApp da empresa no formato internacional, apenas dígitos (ex.: 5511999999999)

## Rodar localmente

1. Instale Node.js 20+.
2. Copie `.env.example` para `.env`.
3. Defina `ADMIN_USER`, `ADMIN_PASSWORD`, `SESSION_SECRET` e `WHATSAPP_NUMBER`.
4. Instale dependências:
   ```bash
   npm install
   ```
5. Inicie:
   ```bash
   npm start
   ```
6. Abra `http://localhost:3000`.

O usuário administrador inicial é criado na primeira inicialização quando `ADMIN_PASSWORD` estiver configurada com um valor diferente do texto de exemplo. Se iniciar sem a senha configurada, defina as variáveis e reinicie. A criação inicial não substitui um fluxo de recuperação ou troca de senha para produção.

## Variáveis de ambiente

- `PORT`: porta HTTP (padrão 3000)
- `NODE_ENV`: use `production` em produção
- `SESSION_SECRET`: segredo aleatório longo e exclusivo
- `ADMIN_USER`: nome do primeiro usuário administrador
- `ADMIN_PASSWORD`: senha inicial forte
- `WHATSAPP_NUMBER`: número comercial com código do país e DDD, somente dígitos
- `BRAND_NAME`: nome da marca

## Requisitos para publicar com segurança

- Hospedar em serviço que execute Node.js (não basta hospedagem estática).
- Usar domínio próprio (por exemplo, um subdomínio da CargoModal) e HTTPS.
- Garantir armazenamento persistente para `data/cargomodal.sqlite` e `data/sessions.sqlite`; não usar disco efêmero.
- Configurar segredos apenas no painel de variáveis da hospedagem; não subir `.env` ao Git.
- Trocar a senha inicial e o segredo de sessão por valores fortes e únicos.
- Definir política de backup e testar restauração do SQLite.
- Restringir acesso administrativo, revisar logs, atualizar dependências e monitorar erros.
- Em caso de múltiplos servidores/instâncias, trocar SQLite por PostgreSQL e sessão por Redis ou store compartilhado.
- Implementar fluxo de troca/recuperação de senha, gestão de múltiplos usuários, auditoria e proteção CSRF mais robusta antes de ampliar o acesso da equipe.
- Incluir aviso de privacidade/LGPD se forem coletados dados pessoais.
- O número de WhatsApp precisa ser configurado para que os links levem à conta da empresa.

## Modelo de dados de frete

Título, origem (cidade/UF), destino (cidade/UF), peso em toneladas, tipo de veículo, material/produto, data de carregamento, observações e status (publicado/pausado/encerrado). Não há preço público: todas as cargas exibem “Frete a negociar”.

## Limites desta versão

- Não envia fretes para outros portais automaticamente; isso depende de API ou integração oficial autorizada.
- Não inclui o logotipo oficial, pois o arquivo do logotipo não foi fornecido nesta conversa.
- O primeiro usuário é criado por configuração de ambiente; não existe cadastro público de usuários.
- O sistema está preparado como primeira versão funcional, mas precisa ser configurado, testado e implantado em hospedagem antes de ficar disponível na internet.
