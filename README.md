# Xyro is Back!

Player web em HTML/CSS/JavaScript, com pesquisa pela YouTube Data API v3 e reprodução pelo player oficial incorporado.

## Configurar a pesquisa
A chave da YouTube Data API v3 está configurada em `assets/app.js`.
- **Segurança:** Como o GitHub Pages é estático e público, restrinja a chave no **Google Cloud Console** (Credenciais > Restrições de aplicativo > Referenciadores HTTP) para aceitar requisições apenas do domínio do seu GitHub Pages (ex: `https://seuusuario.github.io/*`).

## Usar sem chave
Mesmo sem chave de API válida, é possível colar um link ou ID de vídeo na barra de pesquisa para abrir o player incorporado.

## Limitações
- Não contorna bloqueadores, filtros de rede ou controles de acesso. O nome visual do site não altera o destino das requisições nem o domínio do player.
- Alguns vídeos não permitem incorporação, têm restrição regional/etária ou podem exigir login.
- A API tem cotas e termos de uso próprios. Respeite as políticas do YouTube e as regras da rede/dispositivo.
