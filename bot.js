import { Telegraf, Markup } from "telegraf";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

// Pool de conexión PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

// Inicializar bot
export const bot = new Telegraf(process.env.BOT_TOKEN);

// Manejo de errores global
bot.catch((err, ctx) => {
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

// Manejo de mensajes de texto
bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const name = ctx.from.first_name;
  const message = ctx.message.text?.trim();

  try {
    // Insertar usuario si no existe
    await pool.query(
      "INSERT INTO users (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
      [userId, name]
    );

    // Insertar mensaje
    await pool.query(
      "INSERT INTO messages (user_id, message) VALUES ($1, $2)",
      [userId, message]
    );
  } catch (err) {
    console.error("Error guardando en la BD:", err);
    return ctx.reply("Ocurrió un problema guardando tu mensaje.");
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

  return ctx.reply("Recibí tu mensaje.");
});

// Acciones de los botones
bot.action("CONTACTO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Puedes contactarnos al WhatsApp +57 3176072302");
});

bot.action("AYUDA", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("En qué puedo ayudarte?");
});

bot.action("ESTADO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Envíame el número del pedido.");
});

bot.action("REGISTRO", (ctx) => {
  ctx.answerCbQuery();
  ctx.reply("Envíame tu nombre completo y correo.");
});
