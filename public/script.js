document.addEventListener('DOMContentLoaded', function() {
    // ... (Lógica do contador e carrossel continua igual) ...

    // --- LÓGICA DOS MODAIS E CONEXÕES ---
    const rsvpModal = document.getElementById('rsvpModal');
    const giftsModal = document.getElementById('giftsModal');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const guestLoginModal = document.getElementById('guestLoginModal'); // [NOVO]
    
    // Botões que abrem os modais
    const openRsvpBtn = document.getElementById('openRsvpBtn');
    const openGiftsBtn = document.getElementById('openGiftsBtn');
    const adminLoginBtn = document.getElementById('adminLoginBtn'); // [NOVO]
    const guestLoginBtn = document.getElementById('guestLoginBtn'); // [NOVO]
    
    // Botões que fecham os modais
    const closeRsvpBtn = document.getElementById('closeRsvpBtn');
    const closeGiftsBtn = document.getElementById('closeGiftsBtn');
    const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
    const closeGuestLoginBtn = document.getElementById('closeGuestLoginBtn'); // [NOVO]

    // Eventos para abrir os modais
    if(openRsvpBtn) openRsvpBtn.onclick = () => rsvpModal.style.display = "block";
    if(openGiftsBtn) openGiftsBtn.onclick = () => giftsModal.style.display = "block"; // Este pode ser removido se a lista só for visível para logados
    if(adminLoginBtn) adminLoginBtn.onclick = () => adminLoginModal.style.display = "block";
    if(guestLoginBtn) guestLoginBtn.onclick = () => guestLoginModal.style.display = "block";

    // Eventos para fechar os modais
    if(closeRsvpBtn) closeRsvpBtn.onclick = () => rsvpModal.style.display = "none";
    if(closeGiftsBtn) closeGiftsBtn.onclick = () => giftsModal.style.display = "none";
    if(closeAdminLoginBtn) closeAdminLoginBtn.onclick = () => adminLoginModal.style.display = "none";
    if(closeGuestLoginBtn) closeGuestLoginBtn.onclick = () => guestLoginModal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == rsvpModal) rsvpModal.style.display = "none";
        if (event.target == giftsModal) giftsModal.style.display = "none";
        if (event.target == adminLoginModal) adminLoginModal.style.display = "none";
        if (event.target == guestLoginModal) guestLoginModal.style.display = "none";
    };

    // --- Lógica do formulário de RSVP (ATUALIZADA) ---
    const rsvpForm = document.getElementById('rsvpForm');
    if(rsvpForm) {
        // ... (código da máscara de CPF continua igual) ...
        rsvpForm.addEventListener('submit', function(event) {
            // ... (código de desabilitar botão continua igual) ...
            const password = document.getElementById('passwordRsvp').value; // Pega a senha
            formData.append('password', password); // Adiciona a senha aos dados
            // ... (resto da lógica fetch, redirecionando para confirmacao.html) ...
        });
    }

    // --- Lógica do formulário de login do admin (ATUALIZADA) ---
    const adminLoginForm = document.getElementById('adminLoginForm');
    if(adminLoginForm) {
        // ... (código do login do admin, redirecionando para admin.html) ...
    }
    
    // [NOVO] Lógica do formulário de login do convidado
    const guestLoginForm = document.getElementById('guestLoginForm');
    if(guestLoginForm) {
        const cpfLoginInput = document.getElementById('cpfLogin');
        // ... (adicionar máscara de CPF para este campo também) ...
        const guestLoginMessage = document.getElementById('guestLoginMessage');
        guestLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const cpf = cpfLoginInput.value;
            const password = document.getElementById('passwordLogin').value;

            try {
                const response = await fetch('/api/guest-login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ cpf, password }),
                });
                const result = await response.json();
                if (result.success) {
                    sessionStorage.setItem('guestToken', result.token);
                    sessionStorage.setItem('guestName', result.nome);
                    window.location.href = 'presentes.html';
                } else {
                    guestLoginMessage.textContent = result.message;
                }
            } catch (error) {
                guestLoginMessage.textContent = 'Erro de comunicação.';
            }
        });
    }
});