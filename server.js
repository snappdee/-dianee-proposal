require("dotenv").config();
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const PUBLIC_DIR = __dirname;
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "proposals.json");

for (const dir of [UPLOAD_DIR, DATA_DIR]) fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
      return cb(new Error("Please choose a JPG, PNG, WEBP, or GIF image."));
    }
    cb(null, true);
  }
});

function readProposals() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function writeProposals(rows) {
  fs.writeFileSync(DB_FILE, JSON.stringify(rows, null, 2), "utf8");
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[ch]));
}
function mailer() {
  return {
    sendMail: async (message) => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: "Dianee Proposal <onboarding@resend.dev>",
          to: message.to,
          reply_to: message.replyTo,
          subject: message.subject,
          text: message.text,
          html: message.html
        })
      });

      if (!response.ok) {
        throw new Error(`Email failed: ${await response.text()}`);
      }

      return response.json();
    }
  };
}

app.post("/api/proposals", upload.single("background"), async (req, res) => {
  try {
    const proposerName = (req.body.proposerName || "").trim().slice(0, 80);
    const partnerName = (req.body.partnerName || "").trim().slice(0, 80);
    const partnerEmail = (req.body.partnerEmail || "").trim();
    const proposerEmail = (req.body.proposerEmail || "").trim();
    const message = (req.body.message || "").trim().slice(0, 1200);

    if (!proposerName || !partnerName || !partnerEmail || !proposerEmail) {
      return res.status(400).json({ error: "Please fill in both names and both email addresses." });
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(partnerEmail) || !emailPattern.test(proposerEmail)) {
      return res.status(400).json({ error: "Please enter valid email addresses." });
    }

    const token = crypto.randomBytes(24).toString("hex");
    const background = req.file ? `/uploads/${req.file.filename}` : "";
    const proposal = {
      token, proposerName, partnerName, partnerEmail, proposerEmail, message,
      background, createdAt: new Date().toISOString(), response: null
    };
    const rows = readProposals();
    rows.push(proposal);
    writeProposals(rows);

    const link = `${BASE_URL}/p/${token}`;
    return res.json({
  success: true,
  link: link,
  message: "Your proposal is ready! Copy the link and send it to Dianee."
});
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: partnerEmail,
      replyTo: proposerEmail,
      subject: `${partnerName}, someone has a little question for you 💌`,
      text: `Hi ${partnerName},\n\n${proposerName} made something special for you.\nOpen your personal proposal here: ${link}\n\nTake your time and answer honestly.\n`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#3d2432;background:#fff7fb;border-radius:18px"><p style="font-size:28px">💌</p><h1 style="color:#bd4779">A little question for you, ${escapeHtml(partnerName)}…</h1><p><strong>${escapeHtml(proposerName)}</strong> made something special just for you.</p><p style="text-align:center;margin:30px 0"><a href="${link}" style="background:#c94f83;color:#fff;text-decoration:none;padding:15px 24px;border-radius:30px;display:inline-block;font-weight:bold">Open your surprise ✨</a></p><p>Take your time and answer honestly. Whatever your answer, it deserves to be respected.</p></div>`
    });

    res.json({ ok: true, link });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Could not send the invitation. Please check your email settings." });
  }
});

app.get("/api/proposals/:token", (req, res) => {
  const p = readProposals().find(item => item.token === req.params.token);
  if (!p) return res.status(404).json({ error: "This proposal link could not be found." });
  res.json({
    proposerName: p.proposerName,
    partnerName: p.partnerName,
    message: p.message,
    background: p.background,
    response: p.response
  });
});

app.post("/api/proposals/:token/response", async (req, res) => {
  try {
    const answer = req.body.answer;
    if (!["yes", "no"].includes(answer)) return res.status(400).json({ error: "Please choose an answer." });
    const rows = readProposals();
    const p = rows.find(item => item.token === req.params.token);
    if (!p) return res.status(404).json({ error: "This proposal link could not be found." });
    if (p.response) return res.status(409).json({ error: "An answer has already been submitted." });

    p.response = { answer, answeredAt: new Date().toISOString() };
    writeProposals(rows);

    const transport = mailer();
    const answerText = answer === "yes" ? "YES 💍" : "NO";
    await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: p.proposerEmail,
      replyTo: p.partnerEmail,
      subject: `${p.partnerName} answered your proposal`,
      text: `${p.partnerName} has answered your proposal: ${answerText}\n\nProposal link: ${BASE_URL}/p/${p.token}\nAnswered at: ${p.response.answeredAt}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#3d2432;background:#fff7fb;border-radius:18px"><h1 style="color:#bd4779">${answer === "yes" ? "They said yes! 💍" : "You received an answer"}</h1><p><strong>${escapeHtml(p.partnerName)}</strong> answered your proposal:</p><p style="font-size:24px;font-weight:bold">${answerText}</p><p>Submitted at ${escapeHtml(p.response.answeredAt)}.</p></div>`
    });
    res.json({ ok: true, answer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Could not send the response email. Please check your email settings." });
  }
});

app.get("/p/:token", (_req, res) => res.sendFile(path.join(PUBLIC_DIR, "proposal.html")));

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "The background image must be 5 MB or smaller." });
  }
  res.status(400).json({ error: err.message || "Something went wrong." });
});

app.listen(PORT, () => console.log(`Proposal site running at ${BASE_URL}`));
