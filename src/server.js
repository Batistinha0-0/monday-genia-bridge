const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const FORWARD_URL = (process.env.FORWARD_URL || "").trim();
const FORWARD_TIMEOUT_MS = Number(process.env.FORWARD_TIMEOUT_MS || 15000);

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    service: "monday-genia-bridge",
    health: "/health",
    mondayWebhook: "POST /monday/webhook",
    forwardConfigured: Boolean(FORWARD_URL),
  });
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

/**
 * Endpoint para o Monday:
 * 1) Na criação do webhook, ecoa o challenge
 * 2) Nos eventos, encaminha o body para FORWARD_URL (Genia/n8n/APIM)
 */
app.post("/monday/webhook", async (req, res) => {
  const body = req.body || {};

  if (body.challenge) {
    return res.status(200).json({ challenge: body.challenge });
  }

  if (!FORWARD_URL) {
    console.warn("FORWARD_URL não configurada; evento aceito sem forward", {
      keys: Object.keys(body),
    });
    return res.status(200).json({ ok: true, forwarded: false });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FORWARD_TIMEOUT_MS);

    const forwardRes = await fetch(FORWARD_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    const text = await forwardRes.text();
    console.log("Forward OK", {
      status: forwardRes.status,
      forwardUrlHost: safeHost(FORWARD_URL),
      bodyPreview: text.slice(0, 200),
    });

    // Monday só precisa de 200 rápido; detalhes do destino ficam no log
    return res.status(200).json({
      ok: true,
      forwarded: true,
      forwardStatus: forwardRes.status,
    });
  } catch (err) {
    console.error("Forward falhou", {
      message: err.message,
      forwardUrlHost: safeHost(FORWARD_URL),
    });
    // Ainda respondemos 200 ao Monday para não ficar em retry infinito no challenge/eventos
    return res.status(200).json({
      ok: true,
      forwarded: false,
      error: "forward_failed",
    });
  }
});

function safeHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "invalid-url";
  }
}

app.listen(PORT, () => {
  console.log(`monday-genia-bridge listening on :${PORT}`);
  console.log(`FORWARD_URL configured: ${Boolean(FORWARD_URL)}`);
});
