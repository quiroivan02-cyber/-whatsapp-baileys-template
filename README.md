# 📱 WhatsApp Baileys Template

Template base **probado y funcional** para crear bots de WhatsApp con Baileys. Listo para usar en producción.

## ✨ Características

✅ Conexión estable con WhatsApp  
✅ Manejo de QR automático  
✅ Reconexión automática ante errores  
✅ API REST para enviar mensajes  
✅ Deploy-ready para Koyeb/Railway/Render  
✅ Código limpio y documentado  

---

## 🚀 Deploy Rápido

### Opción 1: Koyeb (Recomendado - Gratis)

1. **Fork este repo** en tu GitHub
2. Ve a [Koyeb](https://app.koyeb.com)
3. **Create Service** → GitHub → Selecciona tu repo
4. **Builder:** Dockerfile
5. **Port:** 8000
6. **Deploy**
7. Visita `https://tu-url.koyeb.app/qr` y escanea el código

### Opción 2: Railway (Gratis con límites)

1. Fork este repo
2. Ve a [Railway](https://railway.app)
3. **New Project** → Deploy from GitHub
4. Selecciona tu repo
5. Railway detecta el Dockerfile automáticamente
6. Deploy → Visita `/qr`

### Opción 3: Render (Gratis con sleep)

1. Fork este repo
2. Ve a [Render](https://render.com)
3. **New Web Service** → Conecta GitHub
4. **Environment:** Docker
5. Deploy → Visita `/qr`

### Opción 4: Local

```bash
# Clonar
git clone https://github.com/TU_USUARIO/whatsapp-baileys-template.git
cd whatsapp-baileys-template

# Instalar
npm install

# Iniciar
npm start

# Visitar
http://localhost:3000/qr
```

---

## 📡 Endpoints Disponibles

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/` | GET | Home con estado del bot |
| `/qr` | GET | Ver código QR para vincular WhatsApp |
| `/health` | GET | Health check (estado de conexión) |
| `/restart` | GET | Reiniciar conexión |
| `/reset` | GET | Resetear sesión completa (nuevo QR) |
| `/send` | POST | Enviar mensaje por API |

### Ejemplo: Enviar mensaje

```javascript
fetch('https://tu-bot.koyeb.app/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: '573001234567@s.whatsapp.net',
    text: '¡Hola desde el bot!'
  })
})
```

```bash
# Con curl
curl -X POST https://tu-bot.koyeb.app/send \
  -H "Content-Type: application/json" \
  -d '{"to":"573001234567@s.whatsapp.net","text":"Hola"}'
```

---

## 🎯 Personalizar para tu Proyecto

### 1. Clonar el template

```bash
git clone https://github.com/TU_USUARIO/whatsapp-baileys-template.git mi-bot-cliente
cd mi-bot-cliente
```

### 2. Personalizar lógica

Edita `index.js` en la sección de mensajes:

```javascript
// Busca esta sección (línea ~160):
sock.ev.on("messages.upsert", async ({ messages, type }) => {
  if (type !== "notify") return;

  for (const msg of messages) {
    if (!msg.message || msg.key.fromMe) continue;

    const jid = msg.key.remoteJid;
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || "";

    // 🎯 AQUÍ AGREGAS TU LÓGICA PERSONALIZADA
    
    // Ejemplo 1: Respuestas personalizadas
    if (text.toLowerCase().includes('hola')) {
      await sock.sendMessage(jid, { 
        text: '¡Hola! Bienvenido a [TU EMPRESA]' 
      });
    }

    // Ejemplo 2: Comandos
    if (text === '!menu') {
      await sock.sendMessage(jid, { 
        text: 'Menú:\n1. Soporte\n2. Ventas\n3. Info' 
      });
    }

    // Ejemplo 3: Integrar con tu API
    await fetch('https://tu-backend.com/webhook', {
      method: 'POST',
      body: JSON.stringify({ jid, text })
    });

    // Ejemplo 4: Guardar en Google Sheets
    await guardarEnSheets(msg.pushName, text);
  }
});
```

### 3. Agregar funciones personalizadas

```javascript
// Al final del archivo, antes de app.listen():

async function guardarEnSheets(nombre, mensaje) {
  // Tu lógica aquí
}

async function consultarIA(texto) {
  // Integración con Grok, GPT, etc.
}

async function enviarNotificacion(data) {
  // Enviar email, SMS, etc.
}
```

---

## 🔧 Variables de Entorno

```bash
# Opcional en tu plataforma de deploy
PORT=3000
NODE_ENV=production

# Para integraciones personalizadas
WEBHOOK_URL=https://tu-webhook.com
API_KEY=tu-api-key
```

---

## 📁 Estructura del Proyecto

```
whatsapp-baileys-template/
├── index.js          # Código principal (limpio y documentado)
├── package.json      # Dependencias mínimas
├── Dockerfile        # Para deploy en cloud
├── .gitignore        # Ignorar node_modules y sessions
└── README.md         # Esta documentación
```

---

## ⚠️ Notas Importantes

### Persistencia de sesión

**En free tier de Koyeb/Render:**
- ❌ La sesión se pierde al redesplegar
- 🔄 Necesitarás escanear el QR de nuevo

**Soluciones:**
- Usar Railway (tiene volúmenes persistentes)
- Guardar sesión en MongoDB/Redis
- Usar plan pago con volúmenes

### Seguridad

- No compartas tu QR con nadie
- No subas la carpeta `sessions/` a GitHub
- Usa variables de entorno para secrets

### Performance

- El bot consume ~50-100MB RAM
- Suficiente para free tiers
- Puede manejar cientos de mensajes/día

---

## 🛠️ Stack Técnico

- **Runtime:** Node.js 20+
- **WhatsApp:** @whiskeysockets/baileys ^6.7.9
- **Web Server:** Express 4.x
- **QR Generator:** qrcode 1.x
- **Deploy:** Docker (Alpine Linux)

---

## 📚 Recursos

- [Documentación de Baileys](https://github.com/WhiskeySockets/Baileys)
- [Deploy en Koyeb](https://www.koyeb.com/docs)
- [API de WhatsApp Business](https://developers.facebook.com/docs/whatsapp)

---

## 🤝 Contribuir

¿Encontraste un bug o mejora?
1. Fork el repo
2. Crea un branch (`git checkout -b feature/mejora`)
3. Commit (`git commit -m 'Agregar mejora'`)
4. Push (`git push origin feature/mejora`)
5. Abre un Pull Request

---

## 📄 Licencia

MIT License - Úsalo libremente para tus proyectos.

---

## ✅ Checklist para Nuevos Proyectos

- [ ] Clonar este template
- [ ] Actualizar nombre en `package.json`
- [ ] Personalizar lógica de mensajes
- [ ] Agregar variables de entorno necesarias
- [ ] Subir a GitHub
- [ ] Deploy en Koyeb/Railway/Render
- [ ] Escanear QR en `/qr`
- [ ] Probar enviando mensajes
- [ ] Configurar integraciones (APIs, BD, etc.)

---

**🎉 ¡Listo para usar!**

¿Necesitas ayuda? Abre un issue en este repositorio.
