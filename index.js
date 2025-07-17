const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors());

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: 'Colu@2025',
  port: 5432,
});

const SECRET = 'Columbia@2024_lpu_secret!$#';

// Cadastro de usuário (só para teste, depois bloqueie)
app.post('/api/register', async (req, res) => {
  const { username, senha } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  await pool.query('INSERT INTO usuarios (username, senha_hash) VALUES ($1, $2)', [username, hash]);
  res.json({ ok: true });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, senha } = req.body;
  const result = await pool.query('SELECT * FROM usuarios WHERE username=$1', [username]);
  if (result.rowCount === 0) return res.status(401).json({ erro: 'Usuário/senha inválidos' });
  const user = result.rows[0];
  if (!(await bcrypt.compare(senha, user.senha_hash))) return res.status(401).json({ erro: 'Usuário/senha inválidos' });
  const token = jwt.sign({ userId: user.id, username: user.username }, SECRET, { expiresIn: "8h" });
  res.json({ token });
});

// Middleware autenticador
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    res.sendStatus(401);
  }
}

// ============ NOVO ENDPOINT: Catálogo de serviços global ================
app.get('/api/servicos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lpu_servicos ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar serviços" });
  }
});

// Listar todos os DDTs (visível a todos, sem editar/excluir)
app.get('/api/ddts', auth, async (req, res) => {
  const r = await pool.query('SELECT d.*, u.username FROM ddts d JOIN usuarios u ON u.id = d.usuario_id ORDER BY d.criado_em DESC');
  res.json(r.rows);
});

// Listar só meus DDTs (pode editar/excluir)
app.get('/api/my-ddts', auth, async (req, res) => {
  const r = await pool.query('SELECT * FROM ddts WHERE usuario_id=$1 ORDER BY criado_em DESC', [req.user.userId]);
  res.json(r.rows);
});

// Criar novo DDT
app.post('/api/ddts', auth, async (req, res) => {
  const { titulo, dados } = req.body;
  const r = await pool.query(
    'INSERT INTO ddts (usuario_id, titulo, dados) VALUES ($1, $2, $3) RETURNING *',
    [req.user.userId, titulo, dados]);
  res.json(r.rows[0]);
});

// Editar DDT (apenas se for dono)
app.put('/api/ddts/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { titulo, dados } = req.body;
  // Só dono pode editar
  const ddtr = await pool.query('SELECT * FROM ddts WHERE id=$1', [id]);
  if (!ddtr.rowCount) return res.sendStatus(404);
  if (ddtr.rows[0].usuario_id !== req.user.userId) return res.sendStatus(403);
  const r = await pool.query('UPDATE ddts SET titulo=$1, dados=$2, atualizado_em=NOW() WHERE id=$3 RETURNING *',
    [titulo, dados, id]);
  res.json(r.rows[0]);
});

// Excluir DDT (apenas se for dono)
app.delete('/api/ddts/:id', auth, async (req, res) => {
  const { id } = req.params;
  const ddtr = await pool.query('SELECT * FROM ddts WHERE id=$1', [id]);
  if (!ddtr.rowCount) return res.sendStatus(404);
  if (ddtr.rows[0].usuario_id !== req.user.userId) return res.sendStatus(403);
  await pool.query('DELETE FROM ddts WHERE id=$1', [id]);
  res.json({ ok: true });
});

// Copiar DDT de outro usuário
app.post('/api/ddts/:id/copy', auth, async (req, res) => {
  const { id } = req.params;
  const ddt = await pool.query('SELECT * FROM ddts WHERE id=$1', [id]);
  if (!ddt.rowCount) return res.sendStatus(404);
  const { titulo, dados } = ddt.rows[0];
  const copy = await pool.query(
    'INSERT INTO ddts (usuario_id, titulo, dados) VALUES ($1, $2, $3) RETURNING *',
    [req.user.userId, titulo + ' (cópia)', dados]);
  res.json(copy.rows[0]);
});

app.listen(3000, () => console.log('API pronta em http://localhost:3000'));
