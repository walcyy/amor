document.addEventListener('DOMContentLoaded', function() {
    
    // --- LÓGICA DA CONTAGEM REGRESSIVA (se existir na página) ---
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        const weddingDate = new Date('2026-06-01T16:00:00').getTime();
        const countdownInterval = setInterval(function() {
            const now = new Date().getTime();
            const distance = weddingDate - now;
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownEl.innerHTML = "<h2>O Grande Dia Chegou!</h2>";
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            document.getElementById('days').innerText = String(days).padStart(2, '0');
            document.getElementById('hours').innerText = String(hours).padStart(2, '0');
            document.getElementById('minutes').innerText = String(minutes).padStart(2, '0');
            document.getElementById('seconds').innerText = String(seconds).padStart(2, '0');
        }, 1000);
    }
    
    // --- LÓGICA DOS MODAIS ---
    const rsvpModal = document.getElementById('rsvpModal');
    const adminLoginModal = document.getElementById('adminLoginModal');
    const guestLoginModal = document.getElementById('guestLoginModal');
    
    const openRsvpBtn = document.getElementById('openRsvpBtn');
    const adminLoginBtn = document.getElementById('adminLoginBtn');
    const guestLoginBtn = document.getElementById('guestLoginBtn');
    const guestLoginBtn2 = document.getElementById('guestLoginBtn2');
    
    const closeRsvpBtn = document.getElementById('closeRsvpBtn');
    const closeAdminLoginBtn = document.getElementById('closeAdminLoginBtn');
    const closeGuestLoginBtn = document.getElementById('closeGuestLoginBtn');

    if(openRsvpBtn) openRsvpBtn.onclick = () => rsvpModal.style.display = "block";
    if(adminLoginBtn) adminLoginBtn.onclick = () => adminLoginModal.style.display = "block";
    if(guestLoginBtn) guestLoginBtn.onclick = () => guestLoginModal.style.display = "block";
    if(guestLoginBtn2) guestLoginBtn2.onclick = () => guestLoginModal.style.display = "block";
    
    if(closeRsvpBtn) closeRsvpBtn.onclick = () => rsvpModal.style.display = "none";
    if(closeAdminLoginBtn) closeAdminLoginBtn.onclick = () => adminLoginModal.style.display = "none";
    if(closeGuestLoginBtn) closeGuestLoginBtn.onclick = () => guestLoginModal.style.display = "none";

    window.onclick = (event) => {
        if (event.target == rsvpModal) rsvpModal.style.display = "none";
        if (event.target == adminLoginModal) adminLoginModal.style.display = "none";
        if (event.target == guestLoginModal) guestLoginModal.style.display = "none";
    };

    // --- Máscaras de CPF ---
    const applyCpfMask = (inputElement) => {
        if (!inputElement) return;
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            e.target.value = value;
        });
    };
    applyCpfMask(document.getElementById('cpf'));
    applyCpfMask(document.getElementById('cpfLogin'));

    // --- Lógica do formulário de RSVP ---
    const rsvpForm = document.getElementById('rsvpForm');
    if(rsvpForm) {
        rsvpForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const submitButton = rsvpForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
            
            const fullName = document.getElementById('fullName').value;
            const cpf = document.getElementById('cpf').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('passwordRsvp').value;

            const formData = new URLSearchParams();
            formData.append('fullName', fullName);
            formData.append('cpf', cpf);
            formData.append('phone', phone);
            formData.append('password', password);

            fetch('/confirmar-presenca', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
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
                alert('Ocorreu um erro de comunicação.');
            })
            .finally(() => {
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
            });
        });
    }

    // --- Lógica do formulário de login do admin ---
    const adminLoginForm = document.getElementById('adminLoginForm');
    if(adminLoginForm) {
        const loginMessage = document.getElementById('loginMessage');
        adminLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = adminLoginForm.querySelector('#username').value;
            const password = adminLoginForm.querySelector('#password').value;
            loginMessage.textContent = '';
            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password }),
                });
                const result = await response.json();
                if (result.success) {
                    sessionStorage.setItem('authToken', result.token);
                    window.location.href = 'admin.html';
                } else {
                    loginMessage.textContent = result.message;
                }
            } catch (error) {
                loginMessage.textContent = 'Erro de comunicação.';
            }
        });
    }

    // --- Lógica do formulário de login do convidado ---
    const guestLoginForm = document.getElementById('guestLoginForm');
    if(guestLoginForm) {
        const guestLoginMessage = document.getElementById('guestLoginMessage');
        guestLoginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const cpf = guestLoginForm.querySelector('#cpfLogin').value;
            const password = guestLoginForm.querySelector('#passwordLogin').value;
            guestLoginMessage.textContent = '';
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