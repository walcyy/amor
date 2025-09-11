document.addEventListener('DOMContentLoaded', async () => {
    const token = sessionStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const guestListBody = document.getElementById('guestListBody');
    const guestCount = document.getElementById('guestCount');
    const donationsListBody = document.getElementById('donationsListBody');
    const photoUploadForm = document.getElementById('photoUploadForm');
    const photoTagForm = document.getElementById('photoTagForm');
    const photoFile = document.getElementById('photoFile');
    const photoDescription = document.getElementById('photoDescription');
    const uploadedPhotoPreview = document.getElementById('uploadedPhotoPreview');
    const photoIdInput = document.getElementById('photoId');
    const guestTagsSelect = document.getElementById('guestTags');

    const fetchWithAuth = async (url) => {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Sessão expirada. Faça login novamente.');
        }
        return result;
    };

    const loadConfirmedGuests = async () => {
        try {
            const result = await fetchWithAuth('/api/convidados');
            guestCount.textContent = result.data.length;
            guestListBody.innerHTML = '';
            result.data.forEach(convidado => {
                const row = document.createElement('tr');
                const dataConfirmacao = new Date(convidado.data_confirmacao).toLocaleString('pt-BR');
                const presente = convidado.presente_escolhido || '—';
                row.innerHTML = `<td>${convidado.nome}</td><td>${convidado.telefone}</td><td>${presente}</td><td>${dataConfirmacao}</td>`;
                guestListBody.appendChild(row);
            });
        } catch (error) {
            alert(error.message);
            sessionStorage.removeItem('authToken');
            window.location.href = 'index.html';
        }
    };
    
    const loadDonations = async () => {
        try {
            const result = await fetchWithAuth('/api/doacoes');
            donationsListBody.innerHTML = '';
            result.data.forEach(doacao => {
                const row = document.createElement('tr');
                const dataFormatada = new Date(doacao.data_criacao).toLocaleString('pt-BR');
                const valorFormatado = parseFloat(doacao.valor).toFixed(2).replace('.', ',');
                const tipoFormatado = doacao.tipo === 'pix' ? 'PIX' : 'Cota Lua de Mel';
                row.innerHTML = `<td>${doacao.convidado_nome}</td><td>${tipoFormatado}</td><td>R$ ${valorFormatado}</td><td>${dataFormatada}</td><td><a href="${doacao.comprovante_url}" target="_blank" class="btn btn-secondary">Ver</a></td>`;
                donationsListBody.appendChild(row);
            });
        } catch (error) {
            console.error('Erro ao buscar doações:', error);
        }
    };

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
        } catch (error) {
            console.error('Erro ao carregar lista de convidados para etiquetar', error);
        }
    };

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
        } catch (error) {
            alert('Erro ao enviar foto.');
        }
    });

    photoTagForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fotoId = photoIdInput.value;
        const selectedOptions = Array.from(guestTagsSelect.selectedOptions).map(opt => opt.value);
        try {
            const response = await fetch('/api/fotos/etiquetar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ fotoId, convidadosIds: selectedOptions })
            });
            const result = await response.json();
            alert(result.message);
            if(result.success) {
                photoUploadForm.reset();
                photoTagForm.reset();
                photoTagForm.style.display = 'none';
                photoUploadForm.style.display = 'block';
            }
        } catch (error) {
            alert('Erro ao etiquetar foto.');
        }
    });

    loadConfirmedGuests();
    loadDonations();
    loadGuestsForTagging();
});