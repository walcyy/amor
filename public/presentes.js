document.addEventListener('DOMContentLoaded', async () => {
    const guestToken = sessionStorage.getItem('guestToken');
    const guestName = sessionStorage.getItem('guestName');

    if (!guestToken) {
        alert('Você precisa fazer login para ver a lista de presentes.');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('welcomeMessage').textContent = `Bem-vindo(a), ${guestName}!`;
    const giftListContainer = document.getElementById('giftListContainer');
    
    const loadGifts = async () => {
        giftListContainer.innerHTML = '<p>Carregando presentes...</p>';
        const response = await fetch('/api/presentes');
        const result = await response.json();

        if (result.success) {
            giftListContainer.innerHTML = '';
            result.data.forEach(presente => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'gift-list-item';
                
                let content = `<h4>${presente.titulo}</h4><p>${presente.descricao}</p>`;
                
                if (presente.convidado_id) {
                    itemDiv.classList.add('taken');
                    content += '<button class="btn btn-select-gift" disabled>Já escolhido</button>';
                } else {
                    content += `<button class="btn btn-select-gift" data-id="${presente.id}">Quero presentear</button>`;
                }
                
                itemDiv.innerHTML = content;
                giftListContainer.appendChild(itemDiv);
            });
        }
    };

    giftListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-select-gift')) {
            const presenteId = event.target.dataset.id;
            if (!presenteId) return;

            if (confirm('Você tem certeza que deseja escolher este presente?')) {
                const response = await fetch('/api/selecionar-presente', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${guestToken}`
                    },
                    body: JSON.stringify({ presenteId })
                });
                const result = await response.json();
                alert(result.message);
                if (result.success) {
                    loadGifts(); // Recarrega a lista para mostrar o status atualizado
                }
            }
        }
    });

    loadGifts();
});