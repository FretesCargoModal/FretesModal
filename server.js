require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'cargomodal.sqlite'));
db.pragma('journal_mode = WAL');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS freights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  origin_city TEXT NOT NULL,
  origin_state TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_state TEXT NOT NULL,
  weight_tons REAL,
  vehicle_type TEXT NOT NULL,
  material TEXT,
  loading_date TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','paused','closed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`);

const adminUser = process.env.ADMIN_USER || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD;
if (!db.prepare('SELECT id FROM users WHERE username=?').get(adminUser)) {
  if (!adminPassword || adminPassword === 'troque-esta-senha-antes-de-publicar') {
    console.warn('AVISO: configure ADMIN_PASSWORD no .env antes de usar em ambiente real. Nenhum administrador foi criado.');
  } else {
    db.prepare('INSERT INTO users(username,password_hash) VALUES(?,?)').run(adminUser, bcrypt.hashSync(adminPassword, 12));
    console.log(`Administrador inicial criado: ${adminUser}`);
  }
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(session({
  store: new SQLiteStore({ db: 'sessions.sqlite', dir: DATA_DIR }),
  secret: process.env.SESSION_SECRET || 'desenvolvimento-nao-usar-em-producao',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000
  }
}));
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Muitas tentativas. Aguarde 15 minutos e tente novamente.' } });

function isAuthed(req, res, next) {
  if (req.session && req.session.userId) return next();
  return res.status(401).json({ error: 'Sessão expirada. Entre novamente.' });
}
function clean(v, max=250) {
  if (v === undefined || v === null) return '';
  return String(v).trim().slice(0, max);
}
function validateFreight(body) {
  const f = {
    title: clean(body.title, 120),
    origin_city: clean(body.origin_city, 80),
    origin_state: clean(body.origin_state, 2).toUpperCase(),
    destination_city: clean(body.destination_city, 80),
    destination_state: clean(body.destination_state, 2).toUpperCase(),
    weight_tons: body.weight_tons === '' || body.weight_tons == null ? null : Number(body.weight_tons),
    vehicle_type: clean(body.vehicle_type, 50),
    material: clean(body.material, 120),
    loading_date: clean(body.loading_date, 10),
    notes: clean(body.notes, 1000),
    status: ['published','paused','closed'].includes(body.status) ? body.status : 'published'
  };
  if (!f.title || !f.origin_city || !/^[A-Z]{2}$/.test(f.origin_state) ||
      !f.destination_city || !/^[A-Z]{2}$/.test(f.destination_state) || !f.vehicle_type) {
    return { error: 'Preencha título, origem, destino, UFs válidas e tipo de veículo.' };
  }
  if (f.weight_tons !== null && (!Number.isFinite(f.weight_tons) || f.weight_tons <= 0 || f.weight_tons > 1000)) {
    return { error: 'Informe um peso válido em toneladas.' };
  }
  if (f.loading_date && !/^\d{4}-\d{2}-\d{2}$/.test(f.loading_date)) return { error: 'Data de carregamento inválida.' };
  return { freight: f };
}

app.get('/api/config', (req,res) => res.json({
  brand: process.env.BRAND_NAME || 'CargoModal',
  whatsapp: (process.env.WHATSAPP_NUMBER || '').replace(/\D/g,'')
}));
app.get('/api/freights', (req,res) => {
  const { origin='', destination='', vehicle='', minWeight='', maxWeight='' } = req.query;
  let sql = "SELECT * FROM freights WHERE status='published'";
  const args = [];
  if (origin) { sql += " AND (origin_city LIKE ? OR origin_state LIKE ?)"; args.push(`%${clean(origin,80)}%`,`%${clean(origin,2)}%`); }
  if (destination) { sql += " AND (destination_city LIKE ? OR destination_state LIKE ?)"; args.push(`%${clean(destination,80)}%`,`%${clean(destination,2)}%`); }
  if (vehicle) { sql += " AND vehicle_type = ?"; args.push(clean(vehicle,50)); }
  if (minWeight && Number.isFinite(Number(minWeight))) { sql += " AND weight_tons >= ?"; args.push(Number(minWeight)); }
  if (maxWeight && Number.isFinite(Number(maxWeight))) { sql += " AND weight_tons <= ?"; args.push(Number(maxWeight)); }
  sql += " ORDER BY created_at DESC";
  res.json(db.prepare(sql).all(...args));
});
app.post('/api/login', loginLimiter, (req,res) => {
  const username = clean(req.body.username,80);
  const password = String(req.body.password || '');
  const user = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
  req.session.regenerate(err => {
    if (err) return res.status(500).json({ error: 'Não foi possível iniciar a sessão.' });
    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ username: user.username });
  });
});
app.post('/api/logout', isAuthed, (req,res) => req.session.destroy(() => res.json({ ok: true })));
app.get('/api/me', (req,res) => req.session?.userId ? res.json({ authenticated: true, username: req.session.username }) : res.status(401).json({ authenticated: false }));
app.get('/api/admin/freights', isAuthed, (req,res) => res.json(db.prepare('SELECT * FROM freights ORDER BY created_at DESC').all()));
app.post('/api/admin/freights', isAuthed, (req,res) => {
  const result = validateFreight(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const f = result.freight;
  const info = db.prepare(`INSERT INTO freights(title,origin_city,origin_state,destination_city,destination_state,weight_tons,vehicle_type,material,loading_date,notes,status)
  VALUES(@title,@origin_city,@origin_state,@destination_city,@destination_state,@weight_tons,@vehicle_type,@material,@loading_date,@notes,@status)`).run(f);
  res.status(201).json(db.prepare('SELECT * FROM freights WHERE id=?').get(info.lastInsertRowid));
});
app.put('/api/admin/freights/:id', isAuthed, (req,res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(400).json({ error: 'ID inválido.' });
  const result = validateFreight(req.body);
  if (result.error) return res.status(400).json({ error: result.error });
  const f = result.freight;
  const info = db.prepare(`UPDATE freights SET title=@title,origin_city=@origin_city,origin_state=@origin_state,
  destination_city=@destination_city,destination_state=@destination_state,weight_tons=@weight_tons,
  vehicle_type=@vehicle_type,material=@material,loading_date=@loading_date,notes=@notes,status=@status,
  updated_at=CURRENT_TIMESTAMP WHERE id=@id`).run({ ...f, id });
  if (!info.changes) return res.status(404).json({ error: 'Frete não encontrado.' });
  res.json(db.prepare('SELECT * FROM freights WHERE id=?').get(id));
});
app.delete('/api/admin/freights/:id', isAuthed, (req,res) => {
  const info = db.prepare('DELETE FROM freights WHERE id=?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Frete não encontrado.' });
  res.json({ ok: true });
});
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req,res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`CargoModal Portal rodando em http://localhost:${PORT}`));
