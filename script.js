document.getElementById('upload').addEventListener('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // Carregar as abas da planilha
        const sheetRotas = workbook.Sheets[workbook.SheetNames[0]];
        const sheetMotoristas = workbook.Sheets[workbook.SheetNames[1]];

        // Converter os dados em JSON
        const rotasData = XLSX.utils.sheet_to_json(sheetRotas, { header: 1 });
        const motoristasData = XLSX.utils.sheet_to_json(sheetMotoristas, { header: 1 });

        if (rotasData && motoristasData) {
            window.rotasData = sanitizeData(rotasData);
            window.motoristasData = sanitizeData(motoristasData);

            displayTable(window.rotasData, 'rotas-table');
            displayTable(window.motoristasData, 'motoristas-table');
        } else {
            console.error('Erro ao carregar as planilhas.');
        }
    };

    reader.readAsArrayBuffer(file);
});

function sanitizeData(data) {
    const headers = data[0].map(header => header.trim().toLowerCase());
    return data.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, index) => {
            const value = row[index];
            obj[header] = typeof value === 'string' ? value.trim().toLowerCase() : value;
        });
        return obj;
    });
}

function roteirizar() {
    if (!window.rotasData || !window.motoristasData) {
        console.error('Dados de Rotas ou Motoristas não carregados.');
        return;
    }

    const motoristas = window.motoristasData;
    let rotas = [...window.rotasData]; // Copiar as rotas disponíveis

    const resultados = [];
    let contadorAleatoria = 0;
    let contadorPreferida = 0;
    let contadorSemRota = 0;

    motoristas.forEach(motorista => {
        const motoristaID = motorista['id motorista'];
        const motoristaNome = motorista['motorista'];
        const preferencias = motorista['bairro preferencia do motorista'] || '';
        const bairrosPreferidos = preferencias.split('-').map(b => b.trim().toLowerCase());

        let melhorRota = null;
        let maxCorrespondencias = 0;

        rotas.forEach((rota, index) => {
            const bairrosRota = (rota['bairro'] || '').split(';').map(b => b.trim().toLowerCase());
            let correspondencias = 0;

            bairrosPreferidos.forEach(bairroPreferido => {
                bairrosRota.forEach(bairroRota => {
                    if (bairroRota.includes(bairroPreferido)) {
                        correspondencias++;
                    }
                });
            });

            if (correspondencias > maxCorrespondencias) {
                maxCorrespondencias = correspondencias;
                melhorRota = rota['letras'];
            }
        });

        if (melhorRota) {
            // Remover a rota escolhida para que não seja reutilizada
            rotas = rotas.filter(rota => rota['letras'] !== melhorRota);
        } else if (rotas.length > 0) {
            // Se não houver rota preferida, atribuir uma aleatória
            melhorRota = rotas.shift()['letras'];
        }

        resultados.push({
            'ID': motoristaID,
            'Motorista': motoristaNome,
            'Letra': melhorRota || 'Sem Rota Disponível',
            'Tipo de Atribuição': melhorRota ? (maxCorrespondencias > 0 ? 'Rota Preferida' : 'Rota Aleatória') : 'Sem Rota Disponível'
        });

        // Atualiza os contadores
        if (melhorRota) {
            if (maxCorrespondencias > 0) contadorPreferida++;
            else contadorAleatoria++;
        } else {
            contadorSemRota++;
        }
    });

    displayRoteirizacaoTable(resultados);

    // Exibe o resumo
    displayResumo(contadorAleatoria, contadorPreferida, contadorSemRota);

    // Gera o relatório
    const relatorio = gerarRelatorio(contadorAleatoria, contadorPreferida);
}

function displayRoteirizacaoTable(data) {
    const tableBody = document.querySelector('#roteirizacao-table tbody');
    tableBody.innerHTML = '';

    data.forEach(row => {
        const rowHTML = `
            <tr>
                <td>${row['ID']}</td>
                <td>${row['Motorista']}</td>
                <td>${row['Letra']}</td>
                <td>${row['Tipo de Atribuição']}</td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });

    console.log('Tabela de Roteirização atualizada:', data);
}

// Função para exibir a tabela genérica (usada para exibir motoristas e rotas)
function displayTable(data, tableId) {
    const table = document.getElementById(tableId);
    const thead = table.querySelector('thead');
    const tbody = table.querySelector('tbody');

    thead.innerHTML = '';
    tbody.innerHTML = '';

    if (data.length > 0) {
        const headers = Object.keys(data[0]);
        const headRow = headers.map(header => `<th>${header}</th>`).join('');
        thead.innerHTML = `<tr>${headRow}</tr>`;
    }

    data.forEach(row => {
        const rowHTML = Object.values(row).map(cell => `<td>${cell || ''}</td>`).join('');
        tbody.innerHTML += `<tr>${rowHTML}</tr>`;
    });
}

// Função para exportar os dados para Excel
function exportToExcel(data, fileName) {
    const headers = Object.keys(data[0]);
    const worksheetData = [headers, ...data.map(row => headers.map(header => row[header]))];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Roteirização');
    XLSX.writeFile(workbook, fileName);
}

// Adicionar evento ao botão de exportação
document.getElementById('export-btn').addEventListener('click', function () {
    if (!window.roteirizacaoResultados) {
        alert('Nenhuma tabela para exportar.');
        return;
    }
    exportToExcel(window.roteirizacaoResultados, 'roteirizacao.xlsx');
});

function displayResumo(aleatoria, preferida, semRota) {
    const resumoContainer = document.getElementById('resumo-container');
    resumoContainer.style.display = 'block'; // Torna o resumo visível

    resumoContainer.innerHTML = `
        <h3>Resumo de Rotas</h3>
        <p class="rota-aleatoria">
            <strong>Rota Aleatória:</strong> <span>${aleatoria}</span>
        </p>
        <p class="rota-preferida">
            <strong>Rota Preferida:</strong> <span>${preferida}</span>
        </p>
        <p class="sem-rota">
            <strong>Sem Rota Disponível:</strong> <span>${semRota}</span>
        </p>
    `;
}

function gerarRelatorio(aleatoria, preferida) {
    const dataAtual = new Date().toLocaleDateString('pt-BR'); // Data no formato DD/MM/AAAA

    // Mensagem do relatório
    const relatorio = `
        Olá motoristas, hoje, ${dataAtual}, tivemos um total de ${aleatoria + preferida} rotas atribuídas, com ${aleatoria} rotas aleatórias e ${preferida} rotas preferidas.
        
        As rotas foram geradas automaticamente pelo sistema de roteirização.
    `;

    // Exibindo o relatório no console (ou enviar por e-mail, dependendo da integração que você fizer)
    console.log(relatorio);

    return relatorio; // Retorna o relatório para uso posterior
}

// Botão para executar a roteirização
document.getElementById('execute-btn').addEventListener('click', function () {
    roteirizar();
    window.roteirizacaoResultados = [...document.querySelectorAll('#roteirizacao-table tbody tr')].map(tr => {
        const cells = tr.querySelectorAll('td');
        return {
            ID: cells[0].innerText,
            Motorista: cells[1].innerText,
            Letra: cells[2].innerText,
            'Tipo de Atribuição': cells[3].innerText
        };
    });
});


function displayRoteirizacaoTable(data) {
    const tableBody = document.querySelector('#roteirizacao-table tbody');
    tableBody.innerHTML = '';

    let contadorAleatoria = 0;
    let contadorPreferida = 0;
    let contadorSemRota = 0;

    data.forEach(row => {
        const tipoClass = row['Tipo de Atribuição'] === 'Rota Aleatória'
            ? 'tipo-rota-aleatoria'
            : row['Tipo de Atribuição'] === 'Rota Preferida'
            ? 'tipo-rota-preferida'
            : 'tipo-sem-rota';

        if (row['Tipo de Atribuição'] === 'Rota Aleatória') contadorAleatoria++;
        if (row['Tipo de Atribuição'] === 'Rota Preferida') contadorPreferida++;
        if (row['Tipo de Atribuição'] === 'Sem Rota Disponível') contadorSemRota++;

        const rowHTML = `
            <tr>
                <td>${row['ID']}</td>
                <td>${row['Motorista']}</td>
                <td>${row['Letra']}</td>
                <td class="${tipoClass}">${row['Tipo de Atribuição']}</td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });

    // Exibir resumo no final da tabela
    displayResumo(contadorAleatoria, contadorPreferida, contadorSemRota);
}


function gerarRelatorio(aleatoria, preferida) {
    const dataAtual = new Date().toLocaleDateString('pt-BR'); // Data no formato DD/MM/AAAA

    // Mensagem do relatório
    const relatorio = `
        Olá motoristas, hoje, ${dataAtual}, tivemos um total de ${aleatoria + preferida} rotas atribuídas, com ${aleatoria} rotas aleatórias e ${preferida} rotas preferidas.
        
        As rotas foram geradas automaticamente pelo sistema de roteirização.
    `;

    // Exibindo o relatório na página
    const relatorioTexto = document.getElementById('relatorio-texto');
    relatorioTexto.textContent = relatorio;

    // Exibir o container do relatório
    document.getElementById('relatorio-container').style.display = 'block'; // Torna o relatório visível

    return relatorio; // Retorna o relatório para uso posterior
}
