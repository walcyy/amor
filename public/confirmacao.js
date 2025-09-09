document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const nome = urlParams.get('nome');
    const data = urlParams.get('data');
    const horario = urlParams.get('horario');
    const local = urlParams.get('local');

    const guestNameEl = document.getElementById('guestName');
    const eventDateEl = document.getElementById('eventDate');
    const eventTimeEl = document.getElementById('eventTime');
    const eventLocationEl = document.getElementById('eventLocation');

    if (guestNameEl) {
        if (nome) {
            guestNameEl.textContent = nome;
        } else {
            guestNameEl.textContent = 'Convidado(a)';
        }
    }
    if (eventDateEl && data) eventDateEl.textContent = data;
    if (eventTimeEl && horario) eventTimeEl.textContent = horario;
    if (eventLocationEl && local) eventLocationEl.textContent = local;
});