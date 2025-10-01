// pages/api/webhook.js
export default async function handler(req, res) {
  // Autorisation CORS
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
    const { message } = req.body || {};

    if (!message) {
      return res.status(400).json({ error: "Le champ 'message' est requis" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return res.status(500).json({ error: "Configuration Telegram manquante" });
    }

    // Envoi à Telegram
    const telegramUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML", // permet d’ajouter du style si besoin
      }),
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
