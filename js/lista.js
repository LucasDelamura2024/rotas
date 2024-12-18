document.addEventListener("DOMContentLoaded", function() {
    // Preenche a data e hora automaticamente
    const dataHoraInput = document.getElementById("dataHora");
    const localizacaoInput = document.getElementById("localizacao");
    const enderecoInput = document.getElementById("endereco");

    // Preencher com a data e hora atual
    const currentDateTime = new Date();
    dataHoraInput.value = currentDateTime.toLocaleString();

    // Preencher com a localização atual
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            localizacaoInput.value = `Latitude: ${lat}, Longitude: ${lon}`;

            // Converter latitude e longitude para endereço usando a API Nominatim
            geocodeLatLng(lat, lon, enderecoInput);
        }, function(error) {
            // Caso a geolocalização falhe
            alert("Não foi possível obter a localização. Por favor, habilite a geolocalização no seu navegador.");
        });
    } else {
        alert("Geolocalização não suportada neste navegador.");
    }

    // Prevenir alteração dos campos de data/hora e localização
    dataHoraInput.readOnly = true;
    localizacaoInput.readOnly = true;

    // Envio do formulário
    const form = document.getElementById("myForm");
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        // Validação dos campos antes de enviar
        const id = document.getElementById("id").value;
        const nome = document.getElementById("nome").value;
        const tipo = document.querySelector('input[name="tipo"]:checked')?.value; // Pegando o valor do tipo
        const dataHora = dataHoraInput.value;
        const localizacao = localizacaoInput.value;
        const endereco = enderecoInput.value;
        const observacoes = document.getElementById("observacoes").value;

        // Verificar se os campos obrigatórios estão preenchidos
        if (!id || !nome || !tipo) {
            alert("Por favor, preencha todos os campos obrigatórios.");
            return;
        }

        // Se tudo estiver correto, envia os dados
        console.log("Enviando dados:", { id, nome, dataHora, localizacao, endereco, tipo, observacoes });

        sendDataToGoogleSheets(id, nome, dataHora, localizacao, endereco, tipo, observacoes);
    });
});

// Função para converter latitude e longitude em endereço usando a API Nominatim (OpenStreetMap)
function geocodeLatLng(lat, lon, enderecoInput) {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;

    // Exibindo o log da URL para depuração
    console.log("Consultando API Nominatim com URL: ", url);

    fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'SeuAppName',  // Substitua por um nome do seu aplicativo
        },
    })
    .then(response => {
        // Verifica se a requisição foi bem-sucedida
        if (!response.ok) {
            throw new Error('Erro na requisição: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log("Resposta da API Nominatim:", data); // Exibindo a resposta da API

        if (data && data.address) {
            const endereco = data.display_name;  // Endereço completo retornado
            enderecoInput.value = endereco;  // Exibe o endereço no campo
        } else {
            alert("Nenhum endereço encontrado.");
        }
    })
    .catch(error => {
        alert("Erro ao obter o endereço: " + error);
        console.error("Erro ao consultar a API Nominatim: ", error);
    });
}

// Função para enviar dados para o Google Sheets
function sendDataToGoogleSheets(id, nome, dataHora, localizacao, endereco, tipo, observacoes) {
    const url = "https://script.google.com/macros/s/AKfycbw8gsaWSDO6I3un-AoZ9w1m8wm5jzmWsJLCcF5Oroh_oXN23xs2WzHuQ-UPwe9h3Rz4dw/exec"; // Substitua pela URL correta do seu script

    fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            id: id,
            nome: nome,
            dataHora: dataHora,
            localizacao: localizacao,
            endereco: endereco,
            tipo: tipo,
            observacoes: observacoes
        }),
    })
    .then(response => {
        if (!response.ok) {
            console.error("Erro na resposta do servidor:", response.statusText);
            throw new Error('Erro na resposta do servidor: ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log("Resposta do servidor:", data);
        if (data.result === "success") {
            alert("Formulário enviado com sucesso!");
            document.getElementById("myForm").reset(); // Limpar o formulário após o envio
        } else {
            alert("Erro ao enviar os dados: " + data.message);
        }
    })
    .catch(error => {
        console.error("Erro ao enviar o formulário:", error);
        alert("Ocorreu um erro ao enviar os dados: " + error.message);
    });
}
