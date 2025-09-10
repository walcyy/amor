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
        try {
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
                        let chosenBy = 'Já escolhido';
                        if (presente.convidado_id == guestToken) {
                            chosenBy = 'Escolhido por você!';
                        }
                        content += `<button class="btn btn-select-gift" disabled>${chosenBy}</button>`;
                    } else {
                        content += `<button class="btn btn-select-gift" data-id="${presente.id}">Quero presentear</button>`;
                    }
                    itemDiv.innerHTML = content;
                    giftListContainer.appendChild(itemDiv);
                });
            }
        } catch(e) {
            giftListContainer.innerHTML = '<p>Erro ao carregar presentes.</p>';
        }
    };

    giftListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('btn-select-gift') && !event.target.disabled) {
            const presenteId = event.target.dataset.id;
            if (!presenteId) return;

            if (confirm('Você tem certeza que deseja escolher este presente? Esta ação não pode ser desfeita.')) {
                try {
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
                        loadGifts();
                    }
                } catch(e) {
                    alert('Erro de comunicação ao selecionar o presente.');
                }
            }
        }
    });

    loadGifts();
});