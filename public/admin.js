document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        alert('Acesso não autorizado. Por favor, faça o login.');
        window.location.href = 'index.html';
        return;
    }

    // Seletores de elementos
    const guestListBody = document.getElementById('guestListBody');
    const guestCount = document.getElementById('guestCount');
    const donationsListBody = document.getElementById('donationsListBody');
    const exportBtn = document.getElementById('exportBtn');
    const messageForm = document.getElementById('messageForm');
    const guestMessageText = document.getElementById('guestMessageText');
    const photoUploadForm = document.getElementById('photoUploadForm');
    const photoTagForm = document.getElementById('photoTagForm');
    const photoFile = document.getElementById('photoFile');
    const photoDescription = document.getElementById('photoDescription');
    const uploadedPhotoPreview = document.getElementById('uploadedPhotoPreview');
    const photoIdInput = document.getElementById('photoId');
    const guestTagsSelect = document.getElementById('guestTags');

    // Função genérica para requisições autenticadas
    const fetchWithAuth = async (url, options = {}) => {
        const defaultOptions = {
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const response = await fetch(url, { ...defaultOptions, ...options });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Sessão expirada. Faça login novamente.');
        }
        return result;
    };

    // Carrega estatísticas do Dashboard
    const loadDashboardStats = async () => {
        try {
            const result = await fetchWithAuth('/api/dashboard-stats');
            const stats = result.data;
            document.getElementById('statConvidados').textContent = stats.totalConvidados;
            document.getElementById('statPresentes').textContent = stats.presentesEscolhidos;
            document.getElementById('statQtdDoacoes').textContent = stats.qtdDoacoes;
            document.getElementById('statValorDoacoes').textContent = parseFloat(stats.totalDoacoes || 0).toFixed(2).replace('.', ',');
        } catch (error) { console.error('Erro ao carregar estatísticas:', error); }
    };

    // Carrega a lista de convidados confirmados
    const loadConfirmedGuests = async () => {
        try {
            const result = await fetchWithAuth('/api/convidados');
            guestCount.textContent = result.data.length;
            guestListBody.innerHTML = '';
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
                guestListBody.appendChild(row);
            });
        } catch (error) {
            alert(error.message);
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    };
    
    // Carrega a lista de doações financeiras
    const loadDonations = async () => {
        try {
            const result = await fetchWithAuth('/api/doacoes');
            donationsListBody.innerHTML = '';
            result.data.forEach(doacao => {
                const row = document.createElement('tr');
                const dataFormatada = new Date(doacao.data_criacao).toLocaleString('pt-BR');
                const valorFormatado = parseFloat(doacao.valor).toFixed(2).replace('.', ',');
                const tipoFormatado = doacao.tipo === 'pix' ? 'PIX' : 'Cota Lua de Mel';
                
                let statusHtml = `<span class="status-pending">${doacao.status}</span>`;
                let actionHtml = `<button class="btn btn-secondary btn-confirm" data-id="${doacao.id}">Confirmar</button>`;
                if (doacao.status === 'confirmado') {
                    statusHtml = `<span class="status-confirmed">✔ Confirmado</span>`;
                    actionHtml = '—';
                }

                row.innerHTML = `
                    <td data-label="Convidado">${doacao.convidado_nome}</td>
                    <td data-label="Tipo">${tipoFormatado}</td>
                    <td data-label="Valor (R$)">R$ ${valorFormatado}</td>
                    <td data-label="Data">${dataFormatada}</td>
                    <td data-label="Comprovante"><a href="${doacao.comprovante_url}" target="_blank" class="btn btn-secondary">Ver</a></td>
                    <td data-label="Status">${statusHtml}</td>
                    <td data-label="Ação">${actionHtml}</td>
                `;
                donationsListBody.appendChild(row);
            });
        } catch (error) { console.error('Erro ao buscar doações:', error); }
    };
    
    // Lida com o clique no botão "Confirmar" pagamento
    donationsListBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-confirm')) {
            const donationId = e.target.dataset.id;
            if (confirm('Você confirma o recebimento deste pagamento?')) {
                try {
                    const result = await fetchWithAuth(`/api/doacoes/confirmar/${donationId}`, { method: 'POST' });
                    alert(result.message);
                    if (result.success) {
                        loadDonations(); // Recarrega a lista para mostrar o novo status
                    }
                } catch (error) { alert('Erro ao confirmar pagamento.'); }
            }
        }
    });

    // Carrega a mensagem personalizada atual no textarea
    const loadCustomMessage = async () => {
        try {
            const response = await fetch('/api/mensagem'); // Rota pública
            const result = await response.json();
            if(result.success && guestMessageText) {
                guestMessageText.value = result.data.mensagem_convidado;
            }
        } catch (error) { console.error('Erro ao buscar mensagem:', error); }
    };

    // Lida com o envio do formulário de mensagem
    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const mensagem = guestMessageText.value;
        try {
            const result = await fetchWithAuth('/api/mensagem', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mensagem })
            });
            alert(result.message);
        } catch (error) { alert('Erro ao salvar mensagem.'); }
    });

    // Carrega a lista de convidados para a etiquetagem de fotos
    const loadGuestsForTagging = async () => {
        try {
            const result = await fetchWithAuth('/api/convidados-nomes');
            guestTagsSelect.innerHTML = '';
            result.data.forEach(guest => {
                const option = document.createElement('option');
                option.value = guest.id;
                option.textContent = guest.nome;
                guestTagsSelect.appendChild(option);
            });
        } catch (error) { console.error('Erro ao carregar lista de convidados para etiquetar', error); }
    };

    // Lida com o formulário de upload de foto
    photoUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('foto', photoFile.files[0]);
        formData.append('descricao', photoDescription.value);
        try {
            const response = await fetch('/api/fotos/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const result = await response.json();
            alert(result.message);
            if(result.success) {
                photoUploadForm.style.display = 'none';
                photoTagForm.style.display = 'block';
                uploadedPhotoPreview.src = result.url;
                photoIdInput.value = result.fotoId;
            }
        } catch (error) { alert('Erro ao enviar foto.'); }
    });

    // Lida com o formulário de etiquetagem de foto
    photoTagForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fotoId = photoIdInput.value;
        const selectedOptions = Array.from(guestTagsSelect.selectedOptions).map(opt => opt.value);
        try {
            const result = await fetchWithAuth('/api/fotos/etiquetar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fotoId, convidadosIds: selectedOptions })
            });
            alert(result.message);
            if(result.success) {
                photoUploadForm.reset();
                photoTagForm.reset();
                photoTagForm.style.display = 'none';
                photoUploadForm.style.display = 'block';
            }
        } catch (error) { alert('Erro ao etiquetar foto.'); }
    });

    // Lida com o botão de exportar para CSV
    exportBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/convidados/export', { headers: { 'Authorization': `Bearer ${token}` } });
            if (!response.ok) throw new Error('Falha ao gerar o arquivo.');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'lista_de_convidados.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } catch (error) { alert(error.message); }
    });

    // Carrega todos os dados da página
    loadDashboardStats();
    loadConfirmedGuests();
    loadDonations();
    loadGuestsForTagging();
    loadCustomMessage();
});