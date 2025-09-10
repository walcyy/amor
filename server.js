require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'));
    }
});
const upload = multer({ storage: storage });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Rota de RSVP (inclui senha)
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
        await pool.query(insertSql, [fullName, cpf, password, phone]);
        res.status(200).json({ success: true, message: `Presença confirmada com sucesso, ${fullName}!` });
    } catch (error) {
        console.error('Erro no banco de dados (RSVP):', error);
        res.status(500).json({ success: false, message: 'Erro ao registrar presença.' });
    }
});

// Rota para login do convidado
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
            res.status(200).json({ success: true, token: guest.id, nome: guest.nome });
        } else {
            res.status(401).json({ success: false, message: 'CPF ou Senha inválidos.' });
        }
    } catch (error) {
        console.error('Erro no login do convidado:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// Rota da Lista de Presentes
app.get('/api/presentes', async (req, res) => {
    try {
        const sql = "SELECT id, titulo, descricao, tipo, preco, imagem_url, link_url, chave_pix, texto_botao, convidado_id FROM presentes ORDER BY id";
        const [presentes] = await pool.query(sql);
        res.status(200).json({ success: true, data: presentes });
    } catch (error) {
        console.error('Erro ao buscar presentes:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar a lista de presentes.' });
    }
});

// Middleware para proteger rotas de convidados
const checkGuestAuth = (req, res, next) => {
    const guestId = req.headers.authorization?.split(' ')[1];
    if (guestId && !isNaN(guestId)) {
        req.guestId = guestId;
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

// Rota para um convidado selecionar um presente FÍSICO
app.post('/api/selecionar-presente', checkGuestAuth, async (req, res) => {
    const { presenteId } = req.body;
    const { guestId } = req;
    try {
        const checkGiftSql = "SELECT convidado_id FROM presentes WHERE id = ?";
        const [gifts] = await pool.query(checkGiftSql, [presenteId]);
        if (gifts.length === 0 || gifts[0].convidado_id !== null) {
            return res.status(409).json({ success: false, message: 'Este presente não está mais disponível.' });
        }
        const updateSql = "UPDATE presentes SET convidado_id = ? WHERE id = ?";
        await pool.query(updateSql, [guestId, presenteId]);
        res.status(200).json({ success: true, message: 'Presente selecionado com sucesso! Muito obrigado!' });
    } catch (error) {
        console.error('Erro ao selecionar presente:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Você já selecionou um presente físico.' });
        }
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// Rota para receber contribuições FINANCEIRAS com comprovante
app.post('/api/contribuir', checkGuestAuth, upload.single('comprovante'), async (req, res) => {
    const { tipo, valor } = req.body;
    const { guestId } = req;
    const comprovanteUrl = req.file ? `/uploads/${req.file.filename}` : null;
    if (!tipo || !valor || !comprovanteUrl) {
        return res.status(400).json({ success: false, message: 'Todos os campos são obrigatórios, incluindo o comprovante.' });
    }
    try {
        const sql = "INSERT INTO doacoes (convidado_id, tipo, valor, comprovante_url) VALUES (?, ?, ?, ?)";
        await pool.query(sql, [guestId, tipo, valor, comprovanteUrl]);
        res.status(200).json({ success: true, message: 'Sua contribuição foi registrada! Muito obrigado pelo carinho!' });
    } catch (error) {
        console.error('Erro ao registrar doação:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor ao registrar sua contribuição.' });
    }
});

// Rota de login do admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        res.status(200).json({ success: true, token: 'secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
});

// Middleware de autenticação do admin
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === 'secret-token-123') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

// Rota da lista de convidados para noivos
app.get('/api/convidados', checkAuth, async (req, res) => {
    try {
        const sql = `
            SELECT 
                c.nome, c.telefone, c.data_confirmacao, 
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

// Rota para noivos verem as doações
app.get('/api/doacoes', checkAuth, async (req, res) => {
    try {
        const sql = `
            SELECT d.tipo, d.valor, d.comprovante_url, d.data_criacao, c.nome as convidado_nome 
            FROM doacoes d 
            JOIN convidados c ON d.convidado_id = c.id 
            ORDER BY d.data_criacao DESC
        `;
        const [doacoes] = await pool.query(sql);
        res.status(200).json({ success: true, data: doacoes });
    } catch (error) {
        console.error('Erro ao buscar doações:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar a lista de doações.' });
    }
});


app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});