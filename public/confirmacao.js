document.addEventListener('DOMContentLoaded', () => {
    // Pega os parâmetros da URL (ex: ?nome=Walcir&data=...)
    const urlParams = new URLSearchParams(window.location.search);

    const nome = urlParams.get('nome');
    const data = urlParams.get('data');
    const horario = urlParams.get('horario');
    const local = urlParams.get('local');

    // Encontra os elementos na página para preencher
    const guestNameEl = document.getElementById('guestName');
    const eventDateEl = document.getElementById('eventDate');
    const eventTimeEl = document.getElementById('eventTime');
    const eventLocationEl = document.getElementById('eventLocation');

    // Preenche os elementos com os dados da URL, se existirem
    if (guestNameEl && nome) {
        guestNameEl.textContent = nome;
    }
    
    if (eventDateEl && data) eventDateEl.textContent = data;
    if (eventTimeEl && horario) eventTimeEl.textContent = horario;
    if (eventLocationEl && local) eventLocationEl.textContent = local;
});