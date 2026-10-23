# Conecta Vídeo

Aplicação web responsiva de conversas aleatórias 1 a 1 por WebRTC, com chat de texto e servidor Node.js + Socket.IO. Não exige cadastro: apenas nome e confirmação de maioridade.

## Rodar localmente

```bash
npm install
npm start
```

Abra http://localhost:3000 em dois navegadores/abas. Permita câmera e microfone.

## Publicar no Render

1. Envie o projeto para um repositório GitHub.
2. Render > New > Web Service > selecione o repositório.
3. Runtime: Node. Build Command: `npm install`. Start Command: `npm start`.
4. Use a URL HTTPS fornecida pelo Render (câmera exige HTTPS, exceto localhost).
5. Mantenha uma única instância de servidor. Para escalar horizontalmente, será preciso usar adaptador Redis do Socket.IO e fila compartilhada.

## Limitações importantes antes de produção

- WebRTC usa STUN público. Redes corporativas, NAT simétrico e certas redes móveis exigem um servidor TURN. Configure TURN com credenciais próprias no `rtcConfig` de `public/app.js`.
- Denúncias são registradas no log, mas ainda não existe moderação, banimento, revisão humana ou persistência. Adicione proteção contra abuso, política de privacidade e termos antes de divulgar.
- A confirmação de 18 anos é autodeclarada, não uma verificação de idade.
- Não há autenticação; o nome não identifica uma pessoa de forma confiável.
- Sem gravação de vídeo ou áudio no servidor; participantes ainda podem gravar localmente.
- O chat não é armazenado e desaparece ao mudar de conversa.
- Para produção, implemente rate limiting por IP, mecanismos antispam, controle de sessões, logs com retenção definida e tratamento de denúncias.
