// server.js

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Importa os pacotes necessários
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');

// Inicializa o servidor Express
const app = express();
// Usa a porta fornecida pelo ambiente da nuvem (AWS) ou a porta 3000 localmente
const PORT = process.env.PORT || 3000;

// Configura os Middlewares
app.use(cors()); // Habilita o CORS para segurança
app.use(express.json()); // Permite que o servidor entenda o formato JSON
app.use(express.urlencoded({ extended: true })); // Permite que o servidor entenda dados de formulário

// Serve os arquivos estáticos (HTML, CSS, JS, Imagens) da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Configura a conexão com o Banco de Dados MySQL usando um "pool"
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise(); // Habilita o uso de Promises para um código mais limpo (async/await)

// Rota (endpoint) para confirmação de presença (RSVP)
app.post('/confirmar-presenca', async (req, res) => {
    // Extrai os dados enviados pelo front-end
    const { fullName, cpf, phone } = req.body;

    // Valida se todos os campos foram preenchidos
    if (!fullName || !cpf || !phone) {
        return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos.' });
    }

    try {
        // Verifica se o CPF ou Telefone já existem no banco para evitar duplicados
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

        // Se não houver duplicados, insere o novo convidado no banco
        const insertSql = "INSERT INTO convidados (nome, cpf, telefone) VALUES (?, ?, ?)";
        await pool.query(insertSql, [fullName, cpf, phone]);

        // Retorna uma mensagem de sucesso
        res.status(200).json({ success: true, message: `Presença confirmada com sucesso, ${fullName}!` });

    } catch (error) {
        console.error('Erro no banco de dados (RSVP):', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar presença no banco de dados.' });
    }
});

// Rota (endpoint) para buscar a lista de presentes do banco de dados
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

// Inicia o servidor e o faz "ouvir" por requisições na porta definida
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});