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

// Configuração do Multer para comprovantes
const comprovanteStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const uploadComprovante = multer({ storage: comprovanteStorage });

// Configuração do Multer para as fotos do casamento
const fotoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/photos/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const uploadFoto = multer({ storage: fotoStorage });

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// Rota de RSVP com senha automática
app.post('/confirmar-presenca', async (req, res) => {
    const { fullName, cpf, phone } = req.body;
    if (!fullName || !cpf || !phone) {
        return res.status(400).json({ success: false, message: 'Por favor, preencha todos os campos.' });
    }
    try {
        const senha = cpf.replace(/\D/g, '').slice(-4);
        const checkSql = "SELECT * FROM convidados WHERE cpf = ? OR telefone = ?";
        const [existingGuests] = await pool.query(checkSql, [cpf, phone]);
        if (existingGuests.length > 0) {
            return res.status(409).json({ success: false, message: 'CPF ou Telefone já cadastrados.' });
        }
        const insertSql = "INSERT INTO convidados (nome, cpf, senha, telefone) VALUES (?, ?, ?, ?)";
        await pool.query(insertSql, [fullName, cpf, senha, phone]);
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

// Rota da Lista de Presentes agrupada por categoria
app.get('/api/presentes', async (req, res) => {
    try {
        const sql = "SELECT id, titulo, descricao, tipo, categoria, preco, imagem_url, convidado_id, texto_botao, chave_pix FROM presentes ORDER BY categoria, preco";
        const [presentes] = await pool.query(sql);
        const presentesCategorizados = presentes.reduce((acc, presente) => {
            const categoria = presente.categoria || 'Outros';
            if (!acc[categoria]) acc[categoria] = [];
            acc[categoria].push(presente);
            return acc;
        }, {});
        res.status(200).json({ success: true, data: presentesCategorizados });
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
app.post('/api/contribuir', checkGuestAuth, uploadComprovante.single('comprovante'), async (req, res) => {
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

// Middleware de autenticação do admin
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === 'secret-token-123') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};
    
// Rota de login do admin
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        res.status(200).json({ success: true, token: 'secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
});

// Rota da lista de convidados para noivos
app.get('/api/convidados', checkAuth, async (req, res) => {
    try {
        const sql = `
            SELECT c.nome, c.telefone, c.data_confirmacao, p.titulo as presente_escolhido 
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

// Rota para o admin buscar a lista de nomes de convidados para etiquetar
app.get('/api/convidados-nomes', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, nome FROM convidados ORDER BY nome ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar nomes dos convidados.' });
    }
});

// Rota para o admin fazer upload de uma foto
app.post('/api/fotos/upload', checkAuth, uploadFoto.single('foto'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'Nenhum arquivo enviado.' });
    }
    try {
        const imagemUrl = `/photos/${req.file.filename}`;
        const { descricao } = req.body;
        const [result] = await pool.query("INSERT INTO fotos (imagem_url, descricao) VALUES (?, ?)", [imagemUrl, descricao]);
        res.json({ success: true, message: 'Foto enviada com sucesso!', fotoId: result.insertId, url: imagemUrl });
    } catch (error) {
        console.error('Erro no upload da foto:', error);
        res.status(500).json({ success: false, message: 'Erro ao salvar a foto.' });
    }
});

// Rota para o admin etiquetar uma foto com convidados
app.post('/api/fotos/etiquetar', checkAuth, async (req, res) => {
    const { fotoId, convidadosIds } = req.body;
    if (!fotoId || !convidadosIds || !Array.isArray(convidadosIds) || convidadosIds.length === 0) {
        return res.status(400).json({ success: false, message: 'Dados inválidos.' });
    }
    try {
        const values = convidadosIds.map(convidadoId => [fotoId, convidadoId]);
        await pool.query("INSERT INTO fotos_convidados (foto_id, convidado_id) VALUES ?", [values]);
        res.json({ success: true, message: 'Convidados etiquetados com sucesso!' });
    } catch (error) {
        console.error('Erro ao etiquetar foto:', error);
        res.status(500).json({ success: false, message: 'Erro ao etiquetar a foto.' });
    }
});

// Rota para um convidado logado buscar suas fotos
app.get('/api/minhas-fotos', checkGuestAuth, async (req, res) => {
    const { guestId } = req;
    try {
        const sql = `
            SELECT f.imagem_url, f.descricao 
            FROM fotos f
            JOIN fotos_convidados fc ON f.id = fc.foto_id
            WHERE fc.convidado_id = ?
            ORDER BY f.data_upload DESC
        `;
        const [fotos] = await pool.query(sql, [guestId]);
        res.json({ success: true, data: fotos });
    } catch (error) {
        console.error('Erro ao buscar fotos do convidado:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar suas fotos.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});