require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Parser } = require('json2csv');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configurações do Multer (comprovantes e fotos)
const comprovanteStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const uploadComprovante = multer({ storage: comprovanteStorage });

const fotoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/photos/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
});
const uploadFoto = multer({ storage: fotoStorage });

// Configuração do Banco de Dados
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
}).promise();

// --- ROTAS DE CONVIDADOS ---
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

const checkGuestAuth = (req, res, next) => {
    const guestId = req.headers.authorization?.split(' ')[1];
    if (guestId && !isNaN(guestId)) {
        req.guestId = guestId;
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};

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

app.get('/api/mensagem', async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT mensagem_convidado FROM configuracoes WHERE id = 1");
        if (rows.length > 0) {
            res.json({ success: true, data: rows[0] });
        } else {
            res.json({ success: true, data: { mensagem_convidado: '' } });
        }
    } catch (error) {
        console.error('Erro ao buscar mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

// --- ROTAS DE ADMIN ---
const checkAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (token === 'secret-token-123') {
        next();
    } else {
        res.status(403).json({ success: false, message: 'Acesso não autorizado.' });
    }
};
    
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASSWORD) {
        res.status(200).json({ success: true, token: 'secret-token-123' });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha inválidos.' });
    }
});

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

app.get('/api/doacoes', checkAuth, async (req, res) => {
    try {
        const sql = `
            SELECT d.id, d.tipo, d.valor, d.comprovante_url, d.data_criacao, d.status, c.nome as convidado_nome 
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

app.post('/api/doacoes/confirmar/:id', checkAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query("UPDATE doacoes SET status = 'confirmado' WHERE id = ?", [id]);
        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Pagamento confirmado com sucesso!' });
        } else {
            res.status(404).json({ success: false, message: 'Doação não encontrada.' });
        }
    } catch (error) {
        console.error('Erro ao confirmar pagamento:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

app.put('/api/mensagem', checkAuth, async (req, res) => {
    const { mensagem } = req.body;
    if (typeof mensagem === 'undefined') {
        return res.status(400).json({ success: false, message: 'Mensagem não fornecida.' });
    }
    try {
        await pool.query("UPDATE configuracoes SET mensagem_convidado = ? WHERE id = 1", [mensagem]);
        res.json({ success: true, message: 'Mensagem atualizada com sucesso!' });
    } catch (error) {
        console.error('Erro ao atualizar mensagem:', error);
        res.status(500).json({ success: false, message: 'Erro no servidor.' });
    }
});

app.get('/api/convidados-nomes', checkAuth, async (req, res) => {
    try {
        const [rows] = await pool.query("SELECT id, nome FROM convidados ORDER BY nome ASC");
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro ao buscar nomes dos convidados.' });
    }
});

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

app.get('/api/dashboard-stats', checkAuth, async (req, res) => {
    try {
        const [guestResult] = await pool.query("SELECT COUNT(*) as totalConvidados FROM convidados");
        const [giftsResult] = await pool.query("SELECT COUNT(*) as presentesEscolhidos FROM presentes WHERE convidado_id IS NOT NULL AND tipo = 'link'");
        const [donationsResult] = await pool.query("SELECT SUM(valor) as totalDoacoes, COUNT(*) as qtdDoacoes FROM doacoes");
        const stats = {
            totalConvidados: guestResult[0].totalConvidados || 0,
            presentesEscolhidos: giftsResult[0].presentesEscolhidos || 0,
            totalDoacoes: donationsResult[0].totalDoacoes || 0,
            qtdDoacoes: donationsResult[0].qtdDoacoes || 0,
        };
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        res.status(500).json({ success: false, message: 'Erro ao buscar estatísticas.' });
    }
});

app.get('/api/convidados/export', checkAuth, async (req, res) => {
    try {
        const [convidados] = await pool.query("SELECT nome, cpf, telefone, DATE_FORMAT(data_confirmacao, '%d/%m/%Y %H:%i') as data_confirmacao FROM convidados ORDER BY nome ASC");
        const fields = [
            { label: 'Nome Completo', value: 'nome' },
            { label: 'CPF', value: 'cpf' },
            { label: 'Telefone', value: 'telefone' },
            { label: 'Data da Confirmação', value: 'data_confirmacao' }
        ];
        const json2csvParser = new Parser({ fields, delimiter: ';' });
        const csv = json2csvParser.parse(convidados);
        res.header('Content-Type', 'text/csv');
        res.attachment('lista_de_convidados.csv');
        res.send(csv);
    } catch (error) {
        console.error('Erro ao exportar convidados:', error);
        res.status(500).json({ success: false, message: 'Erro ao exportar lista.' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});