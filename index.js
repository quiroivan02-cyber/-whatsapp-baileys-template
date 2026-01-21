// ========================================
// WHATSAPP BAILEYS STARTER TEMPLATE
// Base funcional para proyectos de bot
// ========================================

import express from "express";
import * as baileysNS from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import path from "path";
import fs from "fs/promises";

// ========================================
// CONFIGURACIÓN DE BAILEYS (ESM/CJS compatible)
// ========================================
const baileysMod = baileysNS?.default ?? baileysNS;

const makeWASocket =
  typeof baileysMod === "function"
    ? baileysMod
    : baileysMod?.makeWASocket ?? baileysMod?.default;

const useMultiFileAuthState =
  baileysMod?.useMultiFileAuthState ?? baileysNS?.useMultiFileAuthState;

const DisconnectReason =
  baileysMod?.DisconnectReason ?? baileysNS?.DisconnectReason;

// Validación de imports
if (typeof makeWASocket !== "function") {
  throw new Error("makeWASocket no es una función (revisa versión/import de Baileys)");
}
if (typeof useMultiFileAuthState !== "function") {
  throw new Error("useMultiFileAuthState no es una función (revisa versión/import de Baileys)");
}

// ========================================
// CONFIGURACIÓN EXPRESS
// ========================================
const app = express();
app.use(express.json());

// Fix para URLs duplicadas
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/{2,}/g, "/");
  next();
});

// ========================================
// VARIABLES GLOBALES
// ========================================
let lastQr = null;        // Último QR generado
let sock = null;          // Socket de WhatsApp
let restarting = false;   // Flag para evitar reinicios múltiples
let isConnected = false;  // Estado de conexión

// ========================================
// FUNCIONES HELPER
// ========================================
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Limpiar directorio completamente
async function emptyDir(dir) {
  await fs.mkdir(dir, { recursive: true });
  const items = await fs.readdir(dir);
  await Promise.all(
    items.map((name) => fs.rm(path.join(dir, name), { recursive: true, force: true }))
  );
}

// Cerrar socket de forma segura
async function hardCloseSocket() {
  try {
    sock?.ws?.close?.();
  } catch (_) {}
  try {
    sock?.ws?.terminate?.();
  } catch (_) {}
  try {
    sock?.end?.();
  } catch (_) {}
  sock = null;
  isConnected = false;
}

// ========================================
// FUNCIÓN PRINCIPAL: INICIAR BAILEYS
// ========================================
async function startBaileys() {
  const { state, saveCreds } = await useMultiFileAuthState("/app/sessions");

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
  });

  // Guardar credenciales cuando cambien
  sock.ev.on("creds.update", saveCreds);

  // ========================================
  // EVENTO: ACTUALIZACIÓN DE CONEXIÓN
  // ========================================
  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update;
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    console.log("📡 connection.update", {
      connection,
      hasQr: !!qr,
      statusCode,
      error: lastDisconnect?.error?.message,
    });

    // Nuevo QR generado
    if (qr) {
      lastQr = qr;
      console.log("📱 QR generado. Visita /qr para escanearlo");
    }

    // Conexión exitosa
    if (connection === "open") {
      lastQr = null;
      isConnected = true;
      console.log("✅ Conectado a WhatsApp");
    }

    // Conexión cerrada
    if (connection === "close") {
      lastQr = null;
      isConnected = false;

      // Caso 1: Restart requerido (error 515)
      if (statusCode === DisconnectReason?.restartRequired) {
        console.log("🔄 Restart requerido (515). Reiniciando...");
        await restartBaileys({ delayMs: 10000 });
        return;
      }

      // Caso 2: Sesión cerrada (error 401)
      if (statusCode === DisconnectReason?.loggedOut) {
        console.log("🚪 Sesión cerrada (401). Usa /reset para escanear QR de nuevo.");
        return;
      }

      // Caso 3: Otros errores - reconectar
      console.log("⚠️ Conexión cerrada. Reintentando...");
      setTimeout(() => {
        restartBaileys({ delayMs: 3000 }).catch((e) => 
          console.error("❌ Error en restart:", e)
        );
      }, 1000);
    }
  });

  // ========================================
  // EVENTO: MENSAJES RECIBIDOS
  // ========================================
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      // Ignorar mensajes sin contenido o propios
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const jid = msg.key.remoteJid;
      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        "";

      if (!jid || !text) continue;

      console.log("📩 Mensaje recibido:");
      console.log("   De:", jid);
      console.log("   Nombre:", msg.pushName || "Desconocido");
      console.log("   Texto:", text);

      // ========================================
      // 🎯 AQUÍ AGREGAS TU LÓGICA PERSONALIZADA
      // ========================================
      
      // Ejemplo 1: Respuesta automática simple
      const respuesta = `Hola ${msg.pushName || ""}! Recibí tu mensaje: "${text}"`;
      await sock.sendMessage(jid, { text: respuesta });

      // Ejemplo 2: Guardar en base de datos
      // await guardarMensaje(jid, text);

      // Ejemplo 3: Enviar a webhook
      // await enviarAWebhook({ jid, text });

      // Ejemplo 4: Lógica de comandos
      // if (text === '!help') { ... }
    }
  });

  console.log("🚀 Baileys iniciado correctamente");
}

// ========================================
// REINICIAR CONEXIÓN
// ========================================
async function restartBaileys({ delayMs = 3000 } = {}) {
  if (restarting) {
    console.log("⏳ Ya hay un restart en proceso");
    return;
  }
  restarting = true;

  try {
    console.log("🔄 Reiniciando socket...");
    await hardCloseSocket();
    await wait(delayMs);
    await startBaileys();
  } finally {
    restarting = false;
  }
}

// ========================================
// RESETEAR SESIÓN (NUEVA VINCULACIÓN)
// ========================================
async function resetSession() {
  if (restarting) {
    console.log("⏳ Ya hay un reset en proceso");
    return;
  }
  restarting = true;

  try {
    console.log("🗑️ Limpiando sesión...");
    lastQr = null;
    await hardCloseSocket();
    await wait(1500);
    await emptyDir("/app/sessions");
    await startBaileys();
    console.log("✅ Sesión reseteada. Escanea el QR en /qr");
  } finally {
    restarting = false;
  }
}

// ========================================
// RUTAS EXPRESS
// ========================================

// Home
app.get("/", (_req, res) => {
  res.send(`
    <h1>WhatsApp Bot - Baileys</h1>
    <p>Estado: ${isConnected ? '✅ Conectado' : '⚠️ Desconectado'}</p>
    <ul>
      <li><a href="/qr">Ver código QR</a></li>
      <li><a href="/health">Health check</a></li>
      <li><a href="/restart">Reiniciar conexión</a></li>
      <li><a href="/reset">Resetear sesión</a></li>
    </ul>
  `);
});

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: isConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Ver QR
app.get(
  "/qr",
  asyncHandler(async (_req, res) => {
    if (!lastQr) {
      return res.status(404).send(`
        <h2>No hay código QR disponible</h2>
        <p>Opciones:</p>
        <ul>
          <li>Si ya estás conectado, no necesitas QR</li>
          <li>Si necesitas reconectar, visita <a href="/reset">/reset</a></li>
        </ul>
      `);
    }
    const dataUrl = await QRCode.toDataURL(lastQr);
    res.setHeader("Content-Type", "text/html");
    res.send(`
      <h2>Escanea este código QR con WhatsApp</h2>
      <img src="${dataUrl}" style="max-width: 400px;" />
      <p>WhatsApp → Dispositivos vinculados → Vincular dispositivo</p>
    `);
  })
);

// Reiniciar conexión
app.get(
  "/restart",
  asyncHandler(async (_req, res) => {
    await restartBaileys({ delayMs: 3000 });
    res.send("Reiniciando conexión...");
  })
);

// Resetear sesión completa
app.get(
  "/reset",
  asyncHandler(async (_req, res) => {
    await resetSession();
    res.send("Sesión reseteada. Visita /qr para escanear el código.");
  })
);

// Enviar mensaje (API endpoint)
app.post(
  "/send",
  asyncHandler(async (req, res) => {
    const { to, text } = req.body || {};
    
    if (!sock || !isConnected) {
      return res.status(503).json({ 
        ok: false, 
        error: "Bot no conectado. Escanea el QR en /qr" 
      });
    }
    
    if (!to || !text) {
      return res.status(400).json({ 
        ok: false, 
        error: "Faltan parámetros: to y text son requeridos" 
      });
    }
    
    await sock.sendMessage(to, { text });
    res.json({ ok: true, message: "Mensaje enviado" });
  })
);

// Manejador de errores global
app.use((err, _req, res, _next) => {
  console.error("❌ ERROR:", err);
  res.status(500).send(err?.message || "Error interno del servidor");
});

// ========================================
// INICIAR SERVIDOR
// ========================================
const port = process.env.PORT || 3000;

app.listen(port, "0.0.0.0", () => {
  console.log("=".repeat(50));
  console.log("🚀 Servidor iniciado en puerto", port);
  console.log("📱 Visita http://localhost:" + port + "/qr");
  console.log("=".repeat(50));
  
  startBaileys().catch((e) => {
    console.error("❌ Error al iniciar Baileys:", e);
    process.exit(1);
  });
});
