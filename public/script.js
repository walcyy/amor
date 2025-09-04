document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA DA CONTAGEM REGRESSIVA ---
    const weddingDate = new Date('2026-06-01T16:00:00').getTime();
    const countdownInterval = setInterval(function() {
        const now = new Date().getTime();
        const distance = weddingDate - now;
        if (distance < 0) {
            clearInterval(countdownInterval);
            if(document.getElementById('countdown')) document.getElementById('countdown').innerHTML = "<h2>O Grande Dia Chegou!</h2>";
            return;
        }
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        if (document.getElementById('days')) document.getElementById('days').innerText = String(days).padStart(2, '0');
        if (document.getElementById('hours')) document.getElementById('hours').innerText = String(hours).padStart(2, '0');
        if (document.getElementById('minutes')) document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
        if (document.getElementById('seconds')) document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
    }, 1000);

    // --- LÓGICA DO CARROSSEL DE IMAGENS ---
    const slides = document.querySelectorAll('#church-carousel-slide img');
    if (slides.length > 0) {
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const carouselDots = document.getElementById('carouselDots');
        let currentSlide = 0;
        let autoSlideInterval;
        const showSlide = (index) => {
            slides.forEach((slide, i) => slide.classList.toggle('active', i === index));
            updateDots(index);
        };
        const nextSlide = () => { currentSlide = (currentSlide + 1) % slides.length; showSlide(currentSlide); };
        const prevSlide = () => { currentSlide = (currentSlide - 1 + slides.length) % slides.length; showSlide(currentSlide); };
        const updateDots = (activeIndex) => {
            const dots = document.querySelectorAll('.dot');
            dots.forEach((dot, i) => dot.classList.toggle('active', i === activeIndex));
        };
        const createDots = () => {
            if (!carouselDots) return;
            carouselDots.innerHTML = '';
            slides.forEach((_, i) => {
                const dot = document.createElement('span');
                dot.classList.add('dot');
                dot.addEventListener('click', () => { currentSlide = i; showSlide(currentSlide); resetAutoSlide(); });
                carouselDots.appendChild(dot);
            });
        };
        const startAutoSlide = () => { autoSlideInterval = setInterval(nextSlide, 5000); };
        const resetAutoSlide = () => { clearInterval(autoSlideInterval); startAutoSlide(); };
        createDots();
        showSlide(currentSlide);
        startAutoSlide();
        prevBtn.addEventListener('click', () => { prevSlide(); resetAutoSlide(); });
        nextBtn.addEventListener('click', () => { nextSlide(); resetAutoSlide(); });
    }

    // --- LÓGICA DOS MODAIS E CONEXÕES COM O BANCO DE DADOS ---
    const rsvpModal = document.getElementById('rsvpModal');
    const giftsModal = document.getElementById('giftsModal');
    const openRsvpBtn = document.getElementById('openRsvpBtn');
    const openGiftsBtn = document.getElementById('openGiftsBtn');
    const closeRsvpBtn = document.getElementById('closeRsvpBtn');
    const closeGiftsBtn = document.getElementById('closeGiftsBtn');

    openRsvpBtn.onclick = () => rsvpModal.style.display = "block";
    openGiftsBtn.onclick = () => loadGifts();
    closeRsvpBtn.onclick = () => rsvpModal.style.display = "none";
    closeGiftsBtn.onclick = () => giftsModal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == rsvpModal) rsvpModal.style.display = "none";
        if (event.target == giftsModal) giftsModal.style.display = "none";
    };

    // Aplica uma máscara de formatação ao campo de CPF
    const cpfInput = document.getElementById('cpf');
    cpfInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        e.target.value = value;
    });

    // Carrega a lista de presentes dinamicamente do servidor
    const giftContainer = document.getElementById('giftOptionsContainer');
    const loadGifts = async () => {
        giftsModal.style.display = "block";
        giftContainer.innerHTML = '<p>Carregando opções de presentes...</p>';
        try {
            // Usa caminho relativo
            const response = await fetch('http://3.81.0.138:3000/api/presentes');
            const result = await response.json();
            if (result.success) {
                giftContainer.innerHTML = '';
                result.data.forEach(presente => {
                    const giftItem = document.createElement('div');
                    giftItem.className = 'gift-item';
                    let contentHtml = `<h4>${presente.titulo}</h4><p>${presente.descricao}</p>`;
                    if (presente.tipo === 'link') {
                        contentHtml += `<a href="${presente.link_url}" target="_blank" class="btn">${presente.texto_botao}</a>`;
                    } else if (presente.tipo === 'pix') {
                        contentHtml += `<div class="pix-container"><p class="pix-key">${presente.chave_pix}</p><button class="btn btn-pix" data-pixkey="${presente.chave_pix}">${presente.texto_botao}</button></div>`;
                    }
                    giftItem.innerHTML = contentHtml;
                    giftContainer.appendChild(giftItem);
                });
            } else {
                giftContainer.innerHTML = `<p>${result.message}</p>`;
            }
        } catch (error) {
            console.error("Erro ao buscar presentes:", error);
            giftContainer.innerHTML = '<p>Não foi possível carregar a lista. Tente novamente mais tarde.</p>';
        }
    };
    
    // Adiciona a funcionalidade de "copiar" para os botões de PIX
    giftContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-pix')) {
            const chavePix = event.target.dataset.pixkey;
            navigator.clipboard.writeText(chavePix).then(() => {
                alert('Chave PIX copiada para a área de transferência!');
            }).catch(err => alert('Não foi possível copiar a chave.'));
        }
    });

    // Envia os dados do formulário de RSVP para o servidor
    const rsvpForm = document.getElementById('rsvpForm');
    rsvpForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const submitButton = rsvpForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';
        
        const fullName = document.getElementById('fullName').value;
        const cpf = document.getElementById('cpf').value;
        const phone = document.getElementById('phone').value;

        const formData = new URLSearchParams();
        formData.append('fullName', fullName);
        formData.append('cpf', cpf);
        formData.append('phone', phone);

        // Usa caminho relativo
        fetch('http://3.81.0.138:3000/confirmar-presenca', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            // [AJUSTADO] Redireciona em caso de sucesso, mostra alerta em caso de falha
            if (data.success) {
                const eventDetails = {
                    nome: fullName,
                    data: '01 de Junho de 2026',
                    horario: '16:00',
                    local: 'Igreja Matriz São Pedro Apóstolo'
                };
                const queryString = new URLSearchParams(eventDetails).toString();
                window.location.href = `confirmacao.html?${queryString}`;
            } else {
                alert(data.message);
            }
        })
        .catch(error => {
            console.error('Erro de comunicação:', error);
            alert('Ocorreu um erro de comunicação. Verifique se o servidor está rodando.');
        })
        .finally(() => {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        });
    });
});