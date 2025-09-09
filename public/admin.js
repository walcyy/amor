document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('authToken');

    if (!token) {
        window.location.href = 'index.html'; // Redireciona para a página principal se não estiver logado
        return;
    }

    const guestListBody = document.getElementById('guestListBody');
    const guestCount = document.getElementById('guestCount');

    try {
        const response = await fetch('/api/convidados', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.success) {
            guestCount.textContent = result.data.length;
            
            result.data.forEach(convidado => {
                const row = document.createElement('tr');
                const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');

                row.innerHTML = `
                    <td>${convidado.nome}</td>
                    <td>${convidado.telefone}</td>
                    <td>${dataConfirmacao}</td>
                `;
                guestListBody.appendChild(row);
            });
        } else {
            alert(result.message);
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html'; // Redireciona se o token for inválido
        }
    } catch (error) {
        alert('Erro ao carregar a lista de convidados.');
    }
});