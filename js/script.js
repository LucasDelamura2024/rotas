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

            // Salvar no LocalStorage para a página de resumo
            localStorage.setItem('rotasData', JSON.stringify(window.rotasData));
            localStorage.setItem('motoristasData', JSON.stringify(window.motoristasData));


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
            rotas = rotas.filter(rota => rota['letras'] !== melhorRota);
        } else if (rotas.length > 0) {
            melhorRota = rotas.shift()['letras'];
        }

        resultados.push({
            'ID': motoristaID,
            'Motorista': motoristaNome,
            'Letra': melhorRota || 'Sem Rota Disponível',
            'Tipo de Atribuição': melhorRota ? (maxCorrespondencias > 0 ? 'Rota Preferida' : 'Rota Aleatória') : 'Sem Rota Disponível'
        });

        if (melhorRota) {
            if (maxCorrespondencias > 0) contadorPreferida++;
            else contadorAleatoria++;
        } else {
            contadorSemRota++;
        }
    });

    displayRoteirizacaoTable(resultados);
    displayResumo(contadorAleatoria, contadorPreferida, contadorSemRota);

    // Salvar os resultados no localStorage
    localStorage.setItem('roteirizacaoResultados', JSON.stringify(resultados));
    console.log('Resultados salvos no localStorage:', resultados);
}


function displayRoteirizacaoTable(data) {
    const tableBody = document.querySelector('#roteirizacao-table tbody');
    tableBody.innerHTML = '';

    data.forEach(row => {
        const tipoClass = row['Tipo de Atribuição'] === 'Rota Aleatória'
            ? 'tipo-rota-aleatoria'
            : row['Tipo de Atribuição'] === 'Rota Preferida'
            ? 'tipo-rota-preferida'
            : '';

        const rowHTML = `
            <tr>
                <td>${row['ID']}</td>
                <td>${row['Motorista']}</td>
                <td>${row['Letra']}</td>
                <td><span class="${tipoClass}">${row['Tipo de Atribuição']}</span></td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });
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
        thead.innerHTML = `<tr>${headers.map(header => `<th>${header}</th>`).join('')}</tr>`;
    }

    data.forEach(row => {
        const rowHTML = Object.values(row).map(cell => `<td>${cell || ''}</td>`).join('');
        tbody.innerHTML += `<tr>${rowHTML}</tr>`;
    });
}

// Função para exportar os dados para Excel
function exportToExcel(roteirizacaoData, fileName) {
    if (!window.rotasData || !window.roteirizacaoResultados) {
        console.error('Dados insuficientes para exportação.');
        return;
    }

    // Gerar a aba com dados de roteirização
    const headersRoteirizacao = Object.keys(roteirizacaoData[0]);
    const worksheetRoteirizacaoData = [headersRoteirizacao, ...roteirizacaoData.map(row => headersRoteirizacao.map(header => row[header]))];
    const worksheetRoteirizacao = XLSX.utils.aoa_to_sheet(worksheetRoteirizacaoData);

    // Gerar a aba com dados de rotas não vinculadas
    const rotasNaoVinculadas = window.rotasData.filter(rota => {
        return !window.roteirizacaoResultados.some(resultado => resultado['Letra'] === rota['letras']);
    });

    const headersNaoVinculadas = ["Letra", "Status"];
    const worksheetNaoVinculadasData = [
        headersNaoVinculadas,
        ...rotasNaoVinculadas.map(rota => [rota['letras'], "Não Vinculada"])
    ];
    const worksheetNaoVinculadas = XLSX.utils.aoa_to_sheet(worksheetNaoVinculadasData);

    // Criar o workbook e adicionar as abas
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheetRoteirizacao, 'Roteirização');
    XLSX.utils.book_append_sheet(workbook, worksheetNaoVinculadas, 'Rotas Não Vinculadas');

    // Salvar o arquivo Excel
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
    // Ensure rotasData and roteirizacaoResultados exist
    if (!window.rotasData || !window.roteirizacaoResultados) {
        console.error('Rotas data or results are not loaded.');
        return;
    }

    // Calculate non-linked routes
    const rotasNaoVinculadas = window.rotasData.filter(rota => {
        return !window.roteirizacaoResultados.some(resultado => resultado['Letra'] === rota['letras']);
    }).length;

    // Calculate total drivers
    const totalMotoristas = window.motoristasData ? window.motoristasData.length : 0;

    // Update the resumo container
    const resumoContainer = document.getElementById('resumo-container');
    resumoContainer.style.display = 'block'; // Ensure it is visible

    resumoContainer.innerHTML = `
        <h3>Resumo de Rotas</h3>
        <p id="rota-aleatoria">
            <strong>Rota Aleatória:</strong> <span>${aleatoria}</span>
        </p>
        <p id="rota-preferida">
            <strong>Rota Preferida:</strong> <span>${preferida}</span>
        </p>
        <p id="sem-rota">
            <strong>Sem Rota Disponível:</strong> <span>${semRota}</span>
        </p>
        <p id="rotas-nao-vinculadas">
            <strong>Rotas Não Vinculadas:</strong> <span>${rotasNaoVinculadas}</span>
        </p>
        <p id="total-motoristas">
            <strong>Quantidade de Motoristas:</strong> <span>${totalMotoristas}</span>
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

document.getElementById('execute-btn').addEventListener('click', function () {
    roteirizar();

    // Update roteirizacaoResultados in memory
    window.roteirizacaoResultados = [...document.querySelectorAll('#roteirizacao-table tbody tr')].map(tr => {
        const cells = tr.querySelectorAll('td');
        return {
            ID: cells[0].innerText,
            Motorista: cells[1].innerText,
            Letra: cells[2].innerText,
            'Tipo de Atribuição': cells[3].innerText
        };
    });

    // Recalculate and display summaries
    const aleatoria = window.roteirizacaoResultados.filter(res => res['Tipo de Atribuição'] === 'Rota Aleatória').length;
    const preferida = window.roteirizacaoResultados.filter(res => res['Tipo de Atribuição'] === 'Rota Preferida').length;
    const semRota = window.roteirizacaoResultados.filter(res => res['Tipo de Atribuição'] === 'Sem Rota Disponível').length;

    displayResumo(aleatoria, preferida, semRota);
    exibirRotasNaoVinculadas();
    gerarRelatorio(aleatoria, preferida);
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
            <tr class="${tipoClass}">
                <td>${row['ID']}</td>
                <td>${row['Motorista']}</td>
                <td>${row['Letra']}</td>
                <td>${row['Tipo de Atribuição']}</td>
            </tr>
        `;
        tableBody.innerHTML += rowHTML;
    });

    // Exibir resumo no final da tabela
    displayResumo(contadorAleatoria, contadorPreferida, contadorSemRota);
}


function gerarRelatorio(aleatoria, preferida) {
    const dataAtual = new Date().toLocaleDateString('pt-BR'); // Data no formato DD/MM/AAAA

    // Verifica se os parâmetros são válidos
    if (typeof aleatoria !== 'number' || typeof preferida !== 'number') {
        console.error('Parâmetros inválidos para a função gerarRelatorio.');
        return;
    }

    // Mensagem do relatório
    const relatorio = `
        Olá motoristas, hoje, ${dataAtual}, tivemos um total de ${aleatoria + preferida} rotas atribuídas.
        Das rotas atribuídas:
        - ${aleatoria} rotas foram geradas aleatoriamente.
        - ${preferida} rotas foram atribuídas com base nas preferências.
        
        Obrigado por sua colaboração!
    `.trim();

    // Obtém o elemento de texto do relatório
    const relatorioTexto = document.getElementById('relatorio-texto');
    if (relatorioTexto) {
        relatorioTexto.textContent = relatorio; // Define o texto no elemento
    } else {
        console.error('Elemento "relatorio-texto" não encontrado.');
        return;
    }

    // Exibe o container do relatório
    const relatorioContainer = document.getElementById('relatorio-container');
    if (relatorioContainer) {
        relatorioContainer.style.display = 'block'; // Torna visível
    } else {
        console.error('Elemento "relatorio-container" não encontrado.');
    }

    return relatorio; // Retorna o relatório para outros usos (se necessário)
}



document.getElementById('trocar-rotas-btn').addEventListener('click', function () {
    // Obter as rotas dos inputs
    const rota1 = document.getElementById('rota-atual').value.trim().toUpperCase();
    const rota2 = document.getElementById('nova-rota').value.trim().toUpperCase();

    if (!rota1 || !rota2) {
        alert('Por favor, preencha ambas as rotas.');
        return;
    }

    // Função para trocar as rotas na tabela
    trocarRota(rota1, rota2);
});

function trocarRota(rota1, rota2) {
    // Acessar as rotas na tabela de roteirização
    const tableBody = document.querySelector('#roteirizacao-table tbody');
    const rows = tableBody.querySelectorAll('tr');

    let rota1Encontrada = false;
    let rota2Encontrada = false;

    // Loop para encontrar as rotas e trocá-las
    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const letraCell = cells[2]; // Coluna que contém as letras das rotas

        if (letraCell) {
            const letra = letraCell.textContent.trim().toUpperCase();
            if (letra === rota1) {
                letraCell.textContent = rota2;
                rota1Encontrada = true;
            } else if (letra === rota2) {
                letraCell.textContent = rota1;
                rota2Encontrada = true;
            }
        }
    });

    // Verificar se as rotas foram encontradas e trocadas
    if (!rota1Encontrada || !rota2Encontrada) {
        alert('Uma ou ambas as rotas não foram encontradas.');
    } else {
        alert('As rotas foram trocadas com sucesso.');
    }
}


function exibirRotasNaoVinculadas() {
    if (!window.rotasData || !window.roteirizacaoResultados) {
        console.error('Rotas data or results are not loaded.');
        return;
    }

    const tabelaNaoVinculadas = document.querySelector('#nao-vinculadas-table tbody');
    tabelaNaoVinculadas.innerHTML = ''; // Clear the table

    // Filter non-linked routes
    const rotasNaoVinculadas = window.rotasData.filter(rota => {
        return !window.roteirizacaoResultados.some(resultado => resultado['Letra'] === rota['letras']);
    });

    // Populate table with non-linked routes
    rotasNaoVinculadas.forEach(rota => {
        const rowHTML = `
            <tr>
                <td>${rota['letras'] || 'N/A'}</td>
                <td>Não Vinculada</td>
            </tr>
        `;
        tabelaNaoVinculadas.innerHTML += rowHTML;
    });

    console.log('Rotas Não Vinculadas:', rotasNaoVinculadas);
}


