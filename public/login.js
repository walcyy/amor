document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const result = await response.json();

            if (result.success) {
                // Se o login for bem-sucedido, salva um "token" e redireciona
                sessionStorage.setItem('authToken', result.token);
                window.location.href = 'admin.html';
            } else {
                loginMessage.textContent = result.message;
                loginMessage.style.color = 'red';
            }
        } catch (error) {
            loginMessage.textContent = 'Erro de comunicação com o servidor.';
            loginMessage.style.color = 'red';
        }
    });
});