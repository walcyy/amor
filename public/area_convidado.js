document.addEventListener('DOMContentLoaded', async () => {
    const guestToken = sessionStorage.getItem('guestToken');
    const guestName = sessionStorage.getItem('guestName');

    if (!guestToken) {
        alert('Você precisa fazer login para ver esta página.');
        window.location.href = 'index.html';
        return;
    }
    
    // Elementos da página
    const welcomeMessageEl = document.getElementById('welcomeMessage');
    const customWelcomeMessageEl = document.getElementById('customWelcomeMessage');
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const giftListContainer = document.getElementById('giftListContainer');
    const contributionModal = document.getElementById('contributionModal');
    const closeContributionBtn = document.getElementById('closeContributionBtn');
    const contributionForm = document.getElementById('contributionForm');
    const photoGalleryContainer = document.getElementById('photoGalleryContainer');
    const giftSearchInput = document.getElementById('giftSearchInput');
    let allGifts = {}; // Guarda a lista original de presentes

    if (welcomeMessageEl) {
        welcomeMessageEl.textContent = `Bem-vindo(a), ${guestName}!`;
    }
    
    // Lógica das Abas
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(item => item.classList.remove('active'));
            tab.classList.add('active');
            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Renderiza a lista de presentes na tela
    const renderGifts = (categories) => {
        if (!giftListContainer) return;
        giftListContainer.innerHTML = '';
        if (Object.keys(categories).length === 0) {
            giftListContainer.innerHTML = '<p>Nenhum presente encontrado com esse nome.</p>';
            return;
        }
        const accordion = document.createElement('div');
        accordion.className = 'category-accordion';
        for (const categoryName in categories) {
            const details = document.createElement('details');
            details.open = true;
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
                        content += `<button class="btn btn-select-gift" disabled>${presente.convidado_id == guestToken ? 'Escolhido por você!' : 'Já escolhido'}</button>`;
                    } else {
                        content += `<button class="btn btn-select-gift" data-id="${presente.id}">Quero presentear</button>`;
                    }
                } else if (presente.tipo === 'lua_de_mel' || presente.tipo === 'pix') {
                     content += `<button class="btn btn-contribute" data-type="${presente.tipo}" data-title="${presente.titulo}" data-pixkey="${presente.chave_pix || ''}">${presente.texto_botao}</button>`;
                }
                itemDiv.innerHTML = content;
                grid.appendChild(itemDiv);
            });
            details.appendChild(grid);
            accordion.appendChild(details);
        }
        giftListContainer.appendChild(accordion);
    };
    
    // Busca a lista de presentes da API
    const loadGifts = async () => {
        if (!giftListContainer) return;
        giftListContainer.innerHTML = '<p>Carregando presentes...</p>';
        try {
            const response = await fetch('/api/presentes');
            const result = await response.json();
            if (result.success) {
                allGifts = result.data;
                renderGifts(allGifts);
            }
        } catch(e) { giftListContainer.innerHTML = '<p>Erro ao carregar presentes.</p>'; }
    };

    // Busca a galeria de fotos personalizada da API
    const loadPhotos = async () => {
        if (!photoGalleryContainer) return;
        photoGalleryContainer.innerHTML = '<p>Carregando suas fotos...</p>';
        try {
            const response = await fetch('/api/minhas-fotos', { headers: { 'Authorization': `Bearer ${guestToken}` } });
            const result = await response.json();
            if(result.success) {
                photoGalleryContainer.innerHTML = '';
                if (result.data.length === 0) {
                    photoGalleryContainer.innerHTML = '<p>Assim que as fotos do casamento ficarem prontas, as que você aparece estarão aqui!</p>';
                } else {
                    const photoGrid = document.createElement('div');
                    photoGrid.className = 'photo-grid';
                    result.data.forEach(foto => {
                        const photoCard = document.createElement('div');
                        photoCard.className = 'photo-card';
                        photoCard.innerHTML = `<a href="${foto.imagem_url}" target="_blank"><img src="${foto.imagem_url}" alt="${foto.descricao || 'Foto do casamento'}"></a><p>${foto.descricao || ''}</p>`;
                        photoGrid.appendChild(photoCard);
                    });
                    photoGalleryContainer.appendChild(photoGrid);
                }
            }
        } catch (error) { photoGalleryContainer.innerHTML = '<p>Erro ao carregar suas fotos.</p>'; }
    };
    
    // Busca a mensagem personalizada dos noivos
    const loadCustomMessage = async () => {
        if (!customWelcomeMessageEl) return;
        try {
            const response = await fetch('/api/mensagem');
            const result = await response.json();
            if(result.success) {
                customWelcomeMessageEl.textContent = result.data.mensagem_convidado;
            }
        } catch (error) { console.error('Erro ao buscar mensagem personalizada:', error); }
    };

    // Lógica do filtro de busca de presentes
    if (giftSearchInput) {
        giftSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            if (!searchTerm) {
                renderGifts(allGifts);
                return;
            }
            const filteredGifts = {};
            for (const categoryName in allGifts) {
                const matchingGifts = allGifts[categoryName].filter(presente => 
                    presente.titulo.toLowerCase().includes(searchTerm) ||
                    presente.descricao.toLowerCase().includes(searchTerm)
                );
                if (matchingGifts.length > 0) {
                    filteredGifts[categoryName] = matchingGifts;
                }
            }
            renderGifts(filteredGifts);
        });
    }

    // Lógica para abrir modal de contribuição e selecionar presente físico
    if (giftListContainer) {
        giftListContainer.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('btn-contribute')) {
                const tipo = target.dataset.type;
                const title = target.dataset.title;
                const pixKey = target.dataset.pixkey;
                document.getElementById('contributionTitle').textContent = title;
                document.getElementById('contributionType').value = tipo;
                const pixInfoDiv = document.getElementById('pixInfo');
                if (pixInfoDiv.querySelector('.pix-key')) {
                     pixInfoDiv.querySelector('.pix-key').textContent = pixKey;
                }
                pixInfoDiv.style.display = (tipo === 'pix') ? 'block' : 'none';
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
    }

    // Fecha o modal de contribuição
    if(closeContributionBtn) closeContributionBtn.onclick = () => contributionModal.style.display = 'none';

    // Lida com o envio do formulário de contribuição
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
    
    // Carrega os dados iniciais da página
    loadGifts();
    loadPhotos();
    loadCustomMessage();
});