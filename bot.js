import { Telegraf, Markup } from "telegraf";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// Conexión a PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Inicializar bot
export const bot = new Telegraf(process.env.BOT_TOKEN);

// Manejo de errores global
bot.catch((err) => {
  console.error("Error en el bot:", err);
});

// Middleware de logging
bot.use(async (ctx, next) => {
  if (ctx.message?.text) {
    console.log("MENSAJE RECIBIDO:");
    console.log("UsuarioID:", ctx.from.id);
    console.log("Nombre:", ctx.from.first_name);
    console.log("Mensaje:", ctx.message.text);
  }
  return next();
});

// ===== COMANDO START =====
bot.start((ctx) => {
  ctx.reply(` Bot activo

Comandos:
/ubicacion - Enviar tu ubicación GPS`);
});

// ===== COMANDO UBICACIÓN =====
bot.command("ubicacion", (ctx) => {
  return ctx.reply(
    "Pulsa el botón para enviar tu ubicación GPS 📍",
    Markup.keyboard([
      Markup.button.locationRequest("📍 Enviar mi ubicación")
    ])
      .resize()
      .oneTime()
  );
});

// ===== RECIBIR UBICACIÓN GPS =====
bot.on("location", (ctx) => {
  const lat = ctx.message.location.latitude;
  const lon = ctx.message.location.longitude;

  // Guardar ubicación para el server.js
  process.env.LAST_LAT = lat;
  process.env.LAST_LON = lon;

  ctx.reply(` Ubicación guardada:
Latitud: ${lat}
Longitud: ${lon}`);
});


// ===== MENSAJES DE TEXTO =====
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const name = ctx.from.first_name;
  const message = ctx.message.text?.trim();

  try {
    // Guardar usuario
    await pool.query(
      "INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [userId, name]
    );

    // Guardar mensaje
    await pool.query(
      "INSERT INTO messages (user_id, message) VALUES ($1, $2)",
      [userId, message]
    );
  } catch (err) {
    console.error("Error guardando en la BD:", err);
    return ctx.reply(" Error guardando el mensaje.");
  }

  if (message.toLowerCase() === "hola") {
    return ctx.reply(
      "Hola! Selecciona una opción:",
      Markup.inlineKeyboard([
        [Markup.button.callback("Contacto", "CONTACTO")],
        [Markup.button.callback("Ayuda", "AYUDA")],
        [Markup.button.callback("Estado del pedido", "ESTADO")],
        [Markup.button.callback("Registrar datos", "REGISTRO")]
      ])
    );
  }

  return ctx.reply(" Mensaje guardado en la base de datos.");
});

// ===== BOTONES =====
bot.action("CONTACTO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply(" WhatsApp: +57 3176072302");
});

bot.action("AYUDA", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("¿En qué puedo ayudarte?");
});

bot.action("ESTADO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Envíame el número del pedido.");
});

bot.action("REGISTRO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Envíame tu nombre completo y correo.");
});
