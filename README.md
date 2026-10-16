# monday-genia-bridge

Ponte pública mínima para testar se o **Monday** aceita um webhook externo e, a partir daí, chamar **Genia/n8n** (via APIM) sem expor a Genia direto ao Monday.

```text
Monday → Render (este serviço) → FORWARD_URL (n8n/Genia/APIM)
```

## Endpoints

| Método | Path | Uso |
| --- | --- | --- |
| `GET` | `/health` | Health check (Render) |
| `POST` | `/monday/webhook` | Webhook do Monday (challenge + eventos) |

### Challenge do Monday

Na criação do webhook, o Monday envia:

```json
{ "challenge": "..." }
```

Este serviço responde **200** com o mesmo JSON (exigência oficial do Monday).

## Deploy no Render (plano Free)

1. Crie conta em [render.com](https://render.com) e conecte o GitHub.
2. **New → Blueprint** (ou Web Service) apontando para este repo.
3. Use o `render.yaml` (plan `free`).
4. No Dashboard, configure a env **`FORWARD_URL`** com a URL do n8n/APIM/Genia de destino.
5. Após o deploy, a URL pública será algo como:
   `https://monday-genia-bridge.onrender.com`
6. No Monday, use:
   `https://monday-genia-bridge.onrender.com/monday/webhook`

### Limite do Free

Serviços free **dormem após ~15 min** sem tráfego. O primeiro request (incluindo o challenge do Monday) pode demorar alguns segundos para acordar. Se o Monday falhar por timeout, abra a URL `/health` no browser e tente salvar o webhook de novo imediatamente.

## Teste local

```bash
npm install
cp .env.example .env   # edite FORWARD_URL
npm start
```

```bash
curl -X POST http://localhost:3000/monday/webhook \
  -H "Content-Type: application/json" \
  -d "{\"challenge\":\"teste123\"}"
```

Esperado: `{"challenge":"teste123"}`

## Variáveis

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `PORT` | Não | Render injeta automaticamente |
| `FORWARD_URL` | Para eventos | Destino do POST após o challenge |
| `FORWARD_TIMEOUT_MS` | Não | Timeout do forward (default 15000) |
