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
    const contributionModal = document.getElementById('contributionModal');
    const closeContributionBtn = document.getElementById('closeContributionBtn');
    const contributionForm = document.getElementById('contributionForm');

    const loadGifts = async () => {
        giftListContainer.innerHTML = '<p>Carregando presentes...</p>';
        try {
            const response = await fetch('/api/presentes');
            const result = await response.json();
            if (result.success) {
                giftListContainer.innerHTML = '';
                const categories = result.data;
                const accordion = document.createElement('div');
                accordion.className = 'category-accordion';

                for (const categoryName in categories) {
                    const details = document.createElement('details');
                    details.open = true; // Começa aberto
                    const summary = document.createElement('summary');
                    summary.textContent = categoryName;
                    details.appendChild(summary);
                    const grid = document.createElement('div');
                    grid.className = 'gift-items-grid';
                    categories[categoryName].forEach(presente => {
                        const itemDiv = document.createElement('div');
                        itemDiv.className = 'gift-list-item';
                        let content = `<h4>${presente.titulo}</h4><p>${presente.descricao}</p>`;
                        if(presente.preco) {
                            content += `<p><strong>Valor: R$ ${parseFloat(presente.preco).toFixed(2).replace('.', ',')}</strong></p>`;
                        }
                        if (presente.tipo === 'link') {
                            if (presente.convidado_id) {
                                itemDiv.classList.add('taken');
                                content += '<button class="btn btn-select-gift" disabled>Já escolhido</button>';
                            } else {
                                content += `<button class="btn btn-select-gift" data-id="${presente.id}">Quero presentear</button>`;
                            }
                        } else if (presente.tipo === 'lua_de_mel' || presente.tipo === 'pix') {
                             content += `<button class="btn btn-contribute" data-type="${presente.tipo}" data-title="${presente.titulo}">${presente.texto_botao}</button>`;
                        }
                        itemDiv.innerHTML = content;
                        grid.appendChild(itemDiv);
                    });
                    details.appendChild(grid);
                    accordion.appendChild(details);
                }
                giftListContainer.appendChild(accordion);
            }
        } catch(e) {
            giftListContainer.innerHTML = '<p>Erro ao carregar presentes.</p>';
        }
    };

    giftListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        if (target.classList.contains('btn-contribute')) {
            const tipo = target.dataset.type;
            const title = target.dataset.title;
            document.getElementById('contributionTitle').textContent = title;
            document.getElementById('contributionType').value = tipo;
            document.getElementById('pixInfo').style.display = (tipo === 'pix') ? 'block' : 'none';
            document.getElementById('honeymoonInfo').style.display = (tipo === 'lua_de_mel') ? 'block' : 'none';
            contributionModal.style.display = 'block';
        }

        if (target.classList.contains('btn-select-gift') && !target.disabled) {
            const presenteId = target.dataset.id;
            if (!presenteId) return;
            if (confirm('Você tem certeza que deseja escolher este presente? Esta ação não pode ser desfeita.')) {
                try {
                    const response = await fetch('/api/selecionar-presente', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${guestToken}` },
                        body: JSON.stringify({ presenteId })
                    });
                    const result = await response.json();
                    alert(result.message);
                    if (result.success) loadGifts();
                } catch(e) {
                    alert('Erro de comunicação ao selecionar o presente.');
                }
            }
        }
    });

    if(closeContributionBtn) closeContributionBtn.onclick = () => contributionModal.style.display = 'none';

    if(contributionForm) {
        contributionForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const submitButton = contributionForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = "Enviando...";
            const formData = new FormData(contributionForm);
            try {
                const response = await fetch('/api/contribuir', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${guestToken}` },
                    body: formData,
                });
                const result = await response.json();
                alert(result.message);
                if (result.success) {
                    contributionForm.reset();
                    contributionModal.style.display = 'none';
                }
            } catch (error) {
                alert('Erro de comunicação ao enviar contribuição.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = "Enviar Registro";
            }
        });
    }
    loadGifts();
});