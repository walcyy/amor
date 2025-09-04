// /public/confirmacao.js

document.addEventListener('DOMContentLoaded', () => {
    // Pega os parâmetros da URL
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

    // Preenche os elementos com os dados da URL
    if (nome) {
        guestNameEl.textContent = nome;
    } else {
        guestNameEl.textContent = 'Convidado(a)';
    }

    if (data) eventDateEl.textContent = data;
    if (horario) eventTimeEl.textContent = horario;
    if (local) eventLocationEl.textContent = local;
});