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

// [ATUALIZADO] - Rota de RSVP agora inclui a senha
app.post('/confirmar-presenca', async (req, res) => {
    const { fullName, cpf, phone, password } = req.body;
    if (!fullName || !cpf || !phone || !password) {
        return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos, incluindo a senha.' });
    }
    try {
        const checkSql = "SELECT * FROM convidados WHERE cpf = ? OR telefone = ?";
        const [existingGuests] = await pool.query(checkSql, [cpf, phone]);
        if (existingGuests.length > 0) {
            return res.status(409).json({ success: false, message: 'CPF ou Telefone já cadastrados.' });
        }
        const insertSql = "INSERT INTO convidados (nome, cpf, senha, telefone) VALUES (?, ?, ?, ?)";
        await pool.query(insertSql, [fullName, cpf, password, phone]); // Adicionada a senha
        res.status(200).json({ success: true, message: `Presença confirmada com sucesso, ${fullName}!` });
    } catch (error) {
        console.error('Erro no banco de dados (RSVP):', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar presença.' });
    }
});

// [NOVO] - Rota para login do convidado
app.post('/api/guest-login', async (req, res) => {
    const { cpf, password } = req.body;
    if (!cpf || !password) {
        return res.status(400).json({ success: false, message: 'CPF e Senha são obrigatórios.' });
    }
    try {
        const sql = "SELECT id, nome FROM convidados WHERE cpf = ? AND senha = ?";
        const [guests] = await pool.query(sql, [cpf, password]);
        if (guests.length > 0) {
            const guest = guests[0];
            // Login bem-sucedido. Usamos o ID do convidado como nosso "token" simples.
            res.status(200).json({ success: true, token: guest.id, nome: guest.nome });
        } else {
            res.status(401).json({ success: false, message: 'CPF ou Senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login do convidado:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// [ATUALIZADO] - Rota da Lista de Presentes agora mostra quais estão disponíveis
app.get('/api/presentes', async (req, res) => {
    try {
        const sql = "SELECT id, titulo, descricao, tipo, link_url, chave_pix, texto_botao, convidado_id FROM presentes ORDER BY id";
        const [presentes] = await pool.query(sql);
        res.status(200).json({ success: true, data: presentes });
    } catch (error) {
        console.error('Erro ao buscar presentes:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar a lista de presentes.' });
    }
});

// [NOVO] - Middleware para proteger rotas de convidados
const checkGuestAuth = (req, res, next) => {
    const guestId = req.headers.authorization?.split(' ')[1];
    if (guestId) {
        req.guestId = guestId; // Adiciona o ID do convidado à requisição
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

// [NOVO] - Rota para um convidado selecionar um presente
app.post('/api/selecionar-presente', checkGuestAuth, async (req, res) => {
    const { presenteId } = req.body;
    const { guestId } = req; // Pega o ID do convidado do middleware

    try {
        // Verifica se o presente já não foi escolhido
        const checkGiftSql = "SELECT convidado_id FROM presentes WHERE id = ?";
        const [gifts] = await pool.query(checkGiftSql, [presenteId]);
        if (gifts.length === 0 || gifts[0].convidado_id !== null) {
            return res.status(409).json({ success: false, message: 'Este presente não está mais disponível.' });
        }

        // Atualiza a tabela de presentes com o ID do convidado
        const updateSql = "UPDATE presentes SET convidado_id = ? WHERE id = ?";
        await pool.query(updateSql, [guestId, presenteId]);
        res.status(200).json({ success: true, message: 'Presente selecionado com sucesso! Muito obrigado!' });
    } catch (error) {
        console.error('Erro ao selecionar presente:', error);
        // Verifica se o erro é de chave duplicada (convidado já escolheu um presente)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Você já selecionou um presente.' });
        }
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// Rota de login do admin (sem alterações)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        res.status(200).json({ success: true, token: 'secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
});

// Middleware de autenticação do admin (sem alterações)
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === 'secret-token-123') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

// [ATUALIZADO] - Rota da lista de convidados para noivos agora mostra o presente
app.get('/api/convidados', checkAuth, async (req, res) => {
    try {
        // Usamos um LEFT JOIN para buscar o título do presente que o convidado escolheu
        const sql = `
            SELECT 
                c.nome, 
                c.telefone, 
                c.data_confirmacao, 
                p.titulo as presente_escolhido 
            FROM convidados c 
            LEFT JOIN presentes p ON c.id = p.convidado_id 
            ORDER BY c.data_confirmacao DESC
        `;
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