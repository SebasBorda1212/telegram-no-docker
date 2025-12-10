import express from "express";
import { bot } from "./bot.js";
import pkg from "pg";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { exec } from "child_process";
import { promisify } from "util";

dotenv.config();

const execPromise = promisify(exec);
const { Pool } = pkg;
const app = express();
const PORT = 3000;

const PDF_PASSWORD = "123456789";

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

app.get("/", (req, res) => {
  res.send("Bot funcionando sin Docker");
});

app.get("/pdf", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) {
      return res.status(400).send("Usa: /pdf?email=correo@gmail.com");
    }

    // ===== GPS REAL DESDE TELEGRAM =====
    const lat = process.env.LAST_LAT || null;
    const lon = process.env.LAST_LON || null;

    const mapaLink = (lat && lon)
      ? `https://www.google.com/maps?q=${lat},${lon}`
      : "Ubicación GPS no enviada";

    // ===== CONSULTA A LA BD =====
    const result = await pool.query(`
      SELECT users.name, messages.message, messages.created_at
      FROM messages
      JOIN users ON users.id = messages.user_id
      ORDER BY messages.created_at DESC
      LIMIT 20
    `);

    // ===== CREAR PDF (SIN GPS) =====
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let y = 760;
    page.drawText("Reporte de Mensajes", { x: 50, y, size: 20, font });
    y -= 40;

    result.rows.forEach((row, i) => {
      const text = `${i + 1}. ${row.name}: ${row.message} (${row.created_at})`;
      if (y < 40) return;
      page.drawText(text, { x: 50, y, size: 12, font });
      y -= 20;
    });

    const pdfBytes = await pdfDoc.save();

    const pdfDir = path.join(process.cwd(), "pdfs");
    if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir);

    const tempPath = path.join(pdfDir, `temp-${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, pdfBytes);

    const protectedPath = path.join(pdfDir, `reporte-${Date.now()}-protegido.pdf`);

    // ===== ENCRIPTAR PDF CON QPDF =====
    const QPDF_PATH = `"C:\\Program Files\\qpdf 12.2.0\\bin\\qpdf.exe"`;
    await execPromise(`${QPDF_PATH} --encrypt ${PDF_PASSWORD} ${PDF_PASSWORD} 256 -- "${tempPath}" "${protectedPath}"`);
    fs.unlinkSync(tempPath);

    // ===== ENVIAR CORREO =====
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Tu PDF protegido + GPS real",
      text: `
Tu contraseña del PDF es: ${PDF_PASSWORD}

Ubicación GPS real desde Telegram:
Latitud: ${lat || "No enviada"}
Longitud: ${lon || "No enviada"}

Mapa:
${mapaLink}
      `,
      attachments: [
        {
          filename: "reporte-protegido.pdf",
          path: protectedPath
        }
      ]
    });

    res.send(`PDF protegido enviado a ${email}`);

  } catch (error) {
    console.error("Error en /pdf:", error);
    res.status(500).send("Error generando PDF");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
  bot.launch();
});
