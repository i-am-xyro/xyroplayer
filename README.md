# Xyro is Back!

Player web em PHP + HTML/CSS/JavaScript, com pesquisa pela YouTube Data API v3 e reprodução pelo player oficial incorporado.

## Requisitos
- PHP 8+ com extensão OpenSSL e `allow_url_fopen` habilitado (ou adapte a chamada HTTP para cURL).
- Chave da YouTube Data API v3, ativada no Google Cloud Console.

## Configurar a pesquisa
Defina a variável de ambiente `YOUTUBE_API_KEY` no servidor. Exemplo em Apache (configuração do host, não dentro de pasta pública):

```apache
SetEnv YOUTUBE_API_KEY "SUA_CHAVE_AQUI"
```

Em hospedagem que não permite variáveis de ambiente, altere `api/search.php` para carregar a chave de um arquivo de configuração fora da pasta pública. **Não coloque a chave no JavaScript nem publique o repositório com ela.**

## Rodar localmente
Na pasta do projeto:

```bash
php -S localhost:8000
```

Abra `http://localhost:8000`.

## Usar sem chave
A pesquisa precisa da API. Mesmo sem chave, é possível colar um link ou ID de vídeo na barra de pesquisa para abrir o player incorporado.

## Limitações
- Não contorna bloqueadores, filtros de rede ou controles de acesso. O nome visual do site não altera o destino das requisições nem o domínio do player.
- Alguns vídeos não permitem incorporação, têm restrição regional/etária ou podem exigir login.
- A API tem cotas e termos de uso próprios. Respeite as políticas do YouTube e as regras da rede/dispositivo.
