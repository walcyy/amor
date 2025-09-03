// server.js

require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Rota para confirmação de presença (RSVP) - ATUALIZADA
app.post('/confirmar-presenca', async (req, res) => {
    const { fullName, cpf, phone } = req.body;

    if (!fullName || !cpf || !phone) {
        return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos.' });
    }

    try {
        // Passo 1: Verificar se o CPF ou Telefone já existem
        const checkSql = "SELECT * FROM convidados WHERE cpf = ? OR telefone = ?";
        const [existingGuests] = await pool.query(checkSql, [cpf, phone]);

        if (existingGuests.length > 0) {
            const existing = existingGuests[0];
            if (existing.cpf === cpf) {
                return res.status(409).json({ success: false, message: 'Este CPF já foi utilizado para confirmar uma presença.' });
            }
            if (existing.telefone === phone) {
                return res.status(409).json({ success: false, message: 'Este número de telefone já foi utilizado para confirmar uma presença.' });
            }
        }

        // Passo 2: Inserir o novo convidado (agora com CPF)
        const insertSql = "INSERT INTO convidados (nome, cpf, telefone) VALUES (?, ?, ?)";
        await pool.query(insertSql, [fullName, cpf, phone]);

        res.status(200).json({ success: true, message: `Presença confirmada com sucesso, ${fullName}!` });

    } catch (error) {
        console.error('Erro no banco de dados (RSVP):', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar presença no banco de dados.' });
    }
});

// Rota para buscar a lista de presentes
app.get('/api/presentes', async (req, res) => {
    try {
        const sql = "SELECT titulo, descricao, tipo, link_url, chave_pix, texto_botao FROM presentes ORDER BY id";
        const [presentes] = await pool.query(sql);
        res.status(200).json({ success: true, data: presentes });
    } catch (error) {
        console.error('Erro no banco de dados (Presentes):', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar a lista de presentes.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Aguardando conexões...');
});