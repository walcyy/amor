require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// --- Rota de RSVP (sem alterações) ---
app.post('/confirmar-presenca', async (req, res) => {
    // ... (código existente)
});

// --- Rota da Lista de Presentes (sem alterações) ---
app.get('/api/presentes', async (req, res) => {
    // ... (código existente)
});

// [NOVO] Rota para login do admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Compara com as credenciais seguras do arquivo .env
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        // Login bem-sucedido. Enviamos um "token" simples.
        res.status(200).json({ success: true, token: 'secret-token-123' });
    } else {
        // Credenciais inválidas
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
});

// [NOVO] Middleware de autenticação simples
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]; // Pega o token do header 'Bearer TOKEN'
    if (token === 'secret-token-123') {
        next(); // Se o token for válido, continua para a próxima função
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

// [NOVO] Rota para buscar a lista de convidados (protegida pelo middleware)
app.get('/api/convidados', checkAuth, async (req, res) => {
    try {
        const sql = "SELECT nome, telefone, data_confirmacao FROM convidados ORDER BY id DESC";
        const [convidados] = await pool.query(sql);
        res.status(200).json({ success: true, data: convidados });
    } catch (error) {
        console.error('Erro ao buscar convidados:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar a lista de convidados.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});