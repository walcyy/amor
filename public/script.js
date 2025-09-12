document.addEventListener('DOMContentLoaded', function() {
    const countdownEl = document.getElementById('countdown');
    if (countdownEl) {
        const weddingDate = new Date('2026-06-01T16:00:00').getTime();
        const countdownInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = weddingDate - now;
            if (distance < 0) {
                clearInterval(countdownInterval);
                countdownEl.innerHTML = "<h2>O Grande Dia Chegou!</h2>";
                return;
            }
            const days = String(Math.floor(distance / (1000 * 60 * 60 * 24))).padStart(2, '0');
            const hours = String(Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((distance % (1000 * 60)) / 1000)).padStart(2, '0');
            document.getElementById('days').innerText = days;
            document.getElementById('hours').innerText = hours;
            document.getElementById('minutes').innerText = minutes;
            document.getElementById('seconds').innerText = seconds;
        }, 1000);
    }
    
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

    const openModal = (modal) => { if(modal) modal.style.display = "block"; };
    const closeModal = (modal) => { if(modal) modal.style.display = "none"; };

    if(openRsvpBtn) openRsvpBtn.onclick = () => openModal(rsvpModal);
    if(adminLoginBtn) adminLoginBtn.onclick = () => openModal(adminLoginModal);
    if(guestLoginBtn) guestLoginBtn.onclick = () => openModal(guestLoginModal);
    if(guestLoginBtn2) guestLoginBtn2.onclick = () => openModal(guestLoginModal);
    
    if(closeRsvpBtn) closeRsvpBtn.onclick = () => closeModal(rsvpModal);
    if(closeAdminLoginBtn) closeAdminLoginBtn.onclick = () => closeModal(adminLoginModal);
    if(closeGuestLoginBtn) closeGuestLoginBtn.onclick = () => closeModal(guestLoginModal);

    window.onclick = (event) => {
        if (event.target == rsvpModal || event.target == adminLoginModal || event.target == guestLoginModal) {
            event.target.style.display = "none";
        }
    };

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

    const applyPhoneMask = (inputElement) => {
        if (!inputElement) return;
        inputElement.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d{5})(\d)/, '$1-$2');
            e.target.value = value.slice(0, 15);
        });
    };
    applyPhoneMask(document.getElementById('phone'));

    const rsvpForm = document.getElementById('rsvpForm');
    if(rsvpForm) {
        rsvpForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const fullName = document.getElementById('fullName').value;
            const cpf = document.getElementById('cpf').value;
            const phone = document.getElementById('phone').value;
            if (cpf.length !== 14) {
                alert('CPF inválido. Por favor, preencha todos os 11 dígitos.');
                return;
            }
            const phoneDigits = phone.replace(/\D/g, '');
            if (phoneDigits.length !== 11) {
                alert('Número de celular inválido. Por favor, inclua o DDD e os 9 dígitos.');
                return;
            }
            if (phoneDigits.charAt(2) !== '9') {
                alert('Número de celular inválido. O primeiro dígito após o DDD deve ser 9.');
                return;
            }
            const submitButton = rsvpForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
            
            const formData = new URLSearchParams();
            formData.append('fullName', fullName);
            formData.append('cpf', cpf);
            formData.append('phone', phone);

            fetch('/confirmar-presenca', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const eventDetails = {
                        nome: fullName,
                        data: '01 de Junho de 2026',
                        horario: '16:00',
                        local: 'Igreja Matriz São Pedro Apóstolo'
                    };
                    window.location.href = `confirmacao.html?${new URLSearchParams(eventDetails).toString()}`;
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
                    window.location.href = 'area_convidado.html';
                } else {
                    guestLoginMessage.textContent = result.message;
                }
            } catch (error) {
                guestLoginMessage.textContent = 'Erro de comunicação.';
            }
        });
    }
});