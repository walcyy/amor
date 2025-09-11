document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const guestListBody = document.getElementById('guestListBody');
    const guestCount = document.getElementById('guestCount');
    const donationsListBody = document.getElementById('donationsListBody');

    const loadConfirmedGuests = async () => {
        try {
            const response = await fetch('/api/convidados', { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success) {
                guestCount.textContent = result.data.length;
                guestListBody.innerHTML = '';
                result.data.forEach(convidado => {
                    const row = document.createElement('tr');
                    const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');
                    const presente = convidado.presente_escolhido || '—';
                    row.innerHTML = `<td>${convidado.nome}</td><td>${convidado.telefone}</td><td>${presente}</td><td>${dataConfirmacao}</td>`;
                    guestListBody.appendChild(row);
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            alert(error.message || 'Erro ao carregar a lista de convidados.');
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    };
    
    const loadDonations = async () => {
        try {
            const response = await fetch('/api/doacoes', { headers: { 'Authorization': `Bearer ${token}` } });
            const result = await response.json();
            if (result.success) {
                donationsListBody.innerHTML = '';
                result.data.forEach(doacao => {
                    const row = document.createElement('tr');
                    const dataFormatada = new Date(doacao.data_criacao).toLocaleString('pt-BR');
                    const valorFormatado = parseFloat(doacao.valor).toFixed(2).replace('.', ',');
                    const tipoFormatado = doacao.tipo === 'pix' ? 'PIX' : 'Cota Lua de Mel';
                    row.innerHTML = `<td>${doacao.convidado_nome}</td><td>${tipoFormatado}</td><td>R$ ${valorFormatado}</td><td>${dataFormatada}</td><td><a href="${doacao.comprovante_url}" target="_blank" class="btn btn-secondary">Ver</a></td>`;
                    donationsListBody.appendChild(row);
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Erro ao buscar doações:', error);
        }
    };

    loadConfirmedGuests();
    loadDonations();
});