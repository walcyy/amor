document.addEventListener('DOMContentLoaded', async () => {
    // ... (lógica de verificação de token continua igual) ...
    try {
        const response = await fetch('/api/convidados', { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        if (result.success) {
            guestCount.textContent = result.data.length;
            result.data.forEach(convidado => {
                const row = document.createElement('tr');
                const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');
                // Se o convidado não escolheu presente, mostra um traço
                const presente = convidado.presente_escolhido || '—';

                row.innerHTML = `
                    <td>${convidado.nome}</td>
                    <td>${convidado.telefone}</td>
                    <td>${presente}</td>
                    <td>${dataConfirmacao}</td>
                `;
                guestListBody.appendChild(row);
            });
        } else {
            // ... (lógica de erro e redirecionamento continua igual) ...
        }
    } catch (error) {
        alert('Erro ao carregar a lista de convidados.');
    }
});