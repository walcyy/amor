document.addEventListener('DOMContentLoaded', async () => {
    // Pega o token de autenticação guardado na sessão do navegador
    const token = sessionStorage.getItem('authToken');

    // Se não houver token, o usuário não está logado. Redireciona para a página de login.
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const guestListBody = document.getElementById('guestListBody');
    const guestCount = document.getElementById('guestCount');

    try {
        // Envia a requisição para a API, incluindo o token para autorização
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
                
                // Formata a data para o padrão brasileiro
                const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');

                row.innerHTML = `
                    <td>${convidado.nome}</td>
                    <td>${convidado.telefone}</td>
                    <td>${dataConfirmacao}</td>
                `;
                guestListBody.appendChild(row);
            });
        } else {
            // Se o token for inválido, o servidor retornará um erro. Redireciona para o login.
            alert(result.message);
            window.location.href = 'login.html';
        }
    } catch (error) {
        alert('Erro ao carregar a lista de convidados.');
    }
});