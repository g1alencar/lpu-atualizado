const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const port = 3000; // Porta do Express

app.use(cors());

// ===== DADOS DE CONEXÃO COM O POSTGRESQL =====
const pool = new Pool({
  user: "postgres",           // usuário do banco
  host: "localhost",          // host local
  database: "postgres",       // nome do banco
  password: "Colu@2025",      // sua senha
  port: 5432,                 // porta padrão do PostgreSQL
});

// ===== ENDPOINT API PARA SERVIÇOS =====
app.get("/api/servicos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT codigo, descricao, descricao_completa, unidade, horas_gp, horas_jr, horas_pl, horas_sr FROM lpu_servicos ORDER BY codigo"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ erro: "Erro ao buscar serviços", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`API disponível em http://localhost:${port}/api/servicos`);
});