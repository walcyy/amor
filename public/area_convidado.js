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
    const photoGalleryContainer = document.getElementById('photoGalleryContainer');
    const giftSearchInput = document.getElementById('giftSearchInput');
    
    // Elementos do Modal de Contribuição
    const contributionModal = document.getElementById('contributionModal');
    const closeContributionBtn = document.getElementById('closeContributionBtn');
    const contributionTitle = document.getElementById('contributionTitle');
    const contributionDescription = document.getElementById('contributionDescription');
    const pixInfo = document.getElementById('pixInfo');
    const pixKeyDisplay = document.querySelector('.pix-key-display');
    const honeymoonInfo = document.getElementById('honeymoonInfo');

    // Passos do Modal
    const step1Value = document.getElementById('step1Value');
    const step2Copy = document.getElementById('step2Copy');
    const step3Upload = document.getElementById('step3Upload');

    // Formulários e botões dos Passos
    const valueForm = document.getElementById('valueForm');
    const contributionForm = document.getElementById('contributionForm');
    const copyBrCodeBtn = document.getElementById('copyBrCodeBtn');
    const paymentDoneBtn = document.getElementById('paymentDoneBtn');
    const qrCodeContainer = document.getElementById('qrCodeContainer');
    const brCodeText = document.getElementById('brCodeText');


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
    let allGifts = {};
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

    // Lida com cliques na lista de presentes (para abrir modal ou selecionar)
    if (giftListContainer) {
        giftListContainer.addEventListener('click', async (event) => {
            const target = event.target;
            if (target.classList.contains('btn-contribute')) {
                const tipo = target.dataset.type;
                const title = target.dataset.title;
                const pixKey = target.dataset.pixkey;
                
                contributionTitle.textContent = title;
                contributionDescription.textContent = (tipo === 'pix') ? 'Digite o valor que deseja presentear via PIX.' : 'Digite o valor com o qual deseja contribuir.';
                if(pixKeyDisplay) pixKeyDisplay.textContent = pixKey;

                pixInfo.style.display = (tipo === 'pix') ? 'block' : 'none';
                honeymoonInfo.style.display = (tipo === 'lua_de_mel') ? 'block' : 'none';
                
                sessionStorage.setItem('contributionType', tipo);
                valueForm.reset();
                contributionForm.reset();
                step1Value.style.display = 'block';
                step2Copy.style.display = 'none';
                step3Upload.style.display = 'none';
                
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

    // Lida com os 3 passos do modal de contribuição
    if(closeContributionBtn) closeContributionBtn.onclick = () => contributionModal.style.display = 'none';

    if (valueForm) {
        valueForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const valor = document.getElementById('contributionValue').value;
            const tipo = sessionStorage.getItem('contributionType');
            
            if (tipo === 'lua_de_mel') { // Pula direto para o passo 3 para cotas
                sessionStorage.setItem('contributionValue', valor);
                document.getElementById('finalValue').textContent = parseFloat(valor).toFixed(2);
                document.getElementById('finalContributionValue').value = valor;
                document.getElementById('contributionType').value = tipo;
                step1Value.style.display = 'none';
                step3Upload.style.display = 'block';
                return;
            }

            // Continua para o passo 2 para PIX
            try {
                const response = await fetch('/api/pix/gerar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${guestToken}` },
                    body: JSON.stringify({ valor })
                });
                const result = await response.json();
                if(result.success) {
                    sessionStorage.setItem('contributionValue', valor);
                    document.getElementById('displayValue').textContent = parseFloat(valor).toFixed(2);
                    if(brCodeText) brCodeText.value = result.brCode;
                    
                    const qr = qrcode(0, 'M');
                    qr.addData(result.brCode);
                    qr.make();
                    if(qrCodeContainer) qrCodeContainer.innerHTML = qr.createImgTag(5);

                    step1Value.style.display = 'none';
                    step2Copy.style.display = 'block';
                } else {
                    alert(result.message);
                }
            } catch (error) { alert('Erro ao gerar código PIX.'); }
        });
    }

    if (copyBrCodeBtn) {
        copyBrCodeBtn.addEventListener('click', () => {
            if(brCodeText) {
                brCodeText.select();
                document.execCommand('copy');
                alert('Código PIX Copia e Cola copiado!');
            }
        });
    }

    if (paymentDoneBtn) {
        paymentDoneBtn.addEventListener('click', () => {
            const valor = sessionStorage.getItem('contributionValue');
            document.getElementById('finalValue').textContent = parseFloat(valor).toFixed(2);
            document.getElementById('finalContributionValue').value = valor;
            document.getElementById('contributionType').value = sessionStorage.getItem('contributionType');
            step2Copy.style.display = 'none';
            step3Upload.style.display = 'block';
        });
    }

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