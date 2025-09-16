document.addEventListener('DOMContentLoaded', function () {
    const token = sessionStorage.getItem('authToken');
    // Protege a página: se não for um admin logado, volta para o início
    if (!token) {
        alert('Acesso não autorizado. Por favor, faça o login como administrador.');
        window.location.href = 'index.html';
        return;
    }

    const resultContainer = document.getElementById('scan-result');
    let isScanning = true;

    function displayResult(message, isSuccess) {
        resultContainer.innerHTML = `<p>${message}</p>`;
        resultContainer.className = 'scan-result'; // Limpa classes antigas
        if (isSuccess) {
            resultContainer.classList.add('success');
        } else {
            resultContainer.classList.add('error');
        }
    }

    async function onScanSuccess(decodedText, decodedResult) {
        // Para o scanner para evitar múltiplas leituras
        if (!isScanning) return;
        isScanning = false;
        
        const guestId = decodedText;
        displayResult('QR Code lido! Validando com o servidor...', null);

        try {
            const response = await fetch('/api/validar-qrcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ guestId })
            });
            const result = await response.json();
            displayResult(result.message, result.success);

        } catch (error) {
            displayResult('Erro de comunicação com o servidor.', false);
        }

        // Após 4 segundos, reseta a tela para o próximo convidado
        setTimeout(() => {
            displayResult('Aponte a câmera para o QR Code do convidado.', null);
            isScanning = true;
        }, 4000);
    }

    function onScanFailure(error) {
        // Esta função é chamada continuamente, então não fazemos nada aqui
        // para não poluir o console. A biblioteca lida com a busca do QR Code.
    }

    // Inicializa o leitor de QR Code
    let html5QrcodeScanner = new Html5QrcodeScanner(
        "qr-reader", 
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
    );
    html5QrcodeScanner.render(onScanSuccess, onScanFailure);
});