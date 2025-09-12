document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        alert('Acesso não autorizado. Por favor, faça o login.');
        window.location.href = 'index.html';
        return;
    }

    // Função genérica para requisições autenticadas
    const fetchWithAuth = async (url) => {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Sessão expirada. Faça login novamente.');
        }
        return result;
    };

    // Carrega estatísticas do Dashboard com verificação
    const loadDashboardStats = async () => {
        try {
            const result = await fetchWithAuth('/api/dashboard-stats');
            const stats = result.data;
            
            const statConvidadosEl = document.getElementById('statConvidados');
            if (statConvidadosEl) statConvidadosEl.textContent = stats.totalConvidados;
            
            const statPresentesEl = document.getElementById('statPresentes');
            if (statPresentesEl) statPresentesEl.textContent = stats.presentesEscolhidos;

            const statQtdDoacoesEl = document.getElementById('statQtdDoacoes');
            if (statQtdDoacoesEl) statQtdDoacoesEl.textContent = stats.qtdDoacoes;

            const statValorDoacoesEl = document.getElementById('statValorDoacoes');
            if (statValorDoacoesEl) statValorDoacoesEl.textContent = parseFloat(stats.totalDoacoes || 0).toFixed(2).replace('.', ',');

        } catch (error) { console.error('Erro ao carregar estatísticas:', error); }
    };

    // Carrega a lista de convidados confirmados com verificação
    const loadConfirmedGuests = async () => {
        const guestCountEl = document.getElementById('guestCount');
        const guestListBodyEl = document.getElementById('guestListBody');
        if (!guestCountEl || !guestListBodyEl) return;

        try {
            const result = await fetchWithAuth('/api/convidados');
            guestCountEl.textContent = result.data.length;
            guestListBodyEl.innerHTML = '';
            result.data.forEach(convidado => {
                const row = document.createElement('tr');
                const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');
                const presente = convidado.presente_escolhido || '—';
                row.innerHTML = `
                    <td data-label="Nome">${convidado.nome}</td>
                    <td data-label="Telefone">${convidado.telefone}</td>
                    <td data-label="Presente Físico">${presente}</td>
                    <td data-label="Data Confirmação">${dataConfirmacao}</td>
                `;
                guestListBodyEl.appendChild(row);
            });
        } catch (error) {
            alert(error.message);
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    };
    
    // Carrega a lista de doações financeiras com verificação
    const loadDonations = async () => {
        const donationsListBodyEl = document.getElementById('donationsListBody');
        if (!donationsListBodyEl) return;
        
        try {
            const result = await fetchWithAuth('/api/doacoes');
            donationsListBodyEl.innerHTML = '';
            result.data.forEach(doacao => {
                const row = document.createElement('tr');
                const dataFormatada = new Date(doacao.data_criacao).toLocaleString('pt-BR');
                const valorFormatado = parseFloat(doacao.valor).toFixed(2).replace('.', ',');
                const tipoFormatado = doacao.tipo === 'pix' ? 'PIX' : 'Cota Lua de Mel';
                row.innerHTML = `
                    <td data-label="Convidado">${doacao.convidado_nome}</td>
                    <td data-label="Tipo">${tipoFormatado}</td>
                    <td data-label="Valor (R$)">R$ ${valorFormatado}</td>
                    <td data-label="Data">${dataFormatada}</td>
                    <td data-label="Comprovante"><a href="${doacao.comprovante_url}" target="_blank" class="btn btn-secondary">Ver</a></td>
                `;
                donationsListBodyEl.appendChild(row);
            });
        } catch (error) { console.error('Erro ao buscar doações:', error); }
    };

    // Carrega a lista de convidados para a etiquetagem de fotos com verificação
    const loadGuestsForTagging = async () => {
        const guestTagsSelectEl = document.getElementById('guestTags');
        if (!guestTagsSelectEl) return;

        try {
            const result = await fetchWithAuth('/api/convidados-nomes');
            guestTagsSelectEl.innerHTML = '';
            result.data.forEach(guest => {
                const option = document.createElement('option');
                option.value = guest.id;
                option.textContent = guest.nome;
                guestTagsSelectEl.appendChild(option);
            });
        } catch (error) { console.error('Erro ao carregar lista de convidados para etiquetar', error); }
    };

    // Lida com formulários e botões, com verificação
    const photoUploadForm = document.getElementById('photoUploadForm');
    const photoTagForm = document.getElementById('photoTagForm');
    const exportBtn = document.getElementById('exportBtn');
    
    if (photoUploadForm && photoTagForm) {
        // ... (código dos formulários de foto igual a antes, pois já são baseados em eventos) ...
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', async () => {
            // ... (código do botão de exportar igual a antes) ...
        });
    }

    // Carrega todos os dados da página
    loadDashboardStats();
    loadConfirmedGuests();
    loadDonations();
    loadGuestsForTagging();
});