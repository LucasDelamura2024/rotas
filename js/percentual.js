document.addEventListener("DOMContentLoaded", () => {
    const tabelaBody = document.querySelector("#percentual-table tbody");

    if (!tabelaBody) {
        console.error("Elemento 'percentual-table' não encontrado no DOM.");
        return;
    }

    // Recuperar dados do localStorage
    const roteirizacaoResultados = JSON.parse(localStorage.getItem("roteirizacaoResultados")) || [];
    const rotasData = JSON.parse(localStorage.getItem("rotasData")) || [];
    const motoristasData = JSON.parse(localStorage.getItem("motoristasData")) || [];

    if (roteirizacaoResultados.length === 0 || rotasData.length === 0 || motoristasData.length === 0) {
        console.error("Nenhum dado encontrado no LocalStorage.");
        return;
    }

    // Função para padronizar e processar bairros
    function padronizarBairros(texto) {
        return (texto || "")
            .toLowerCase()
            .replace(/[:;0-9]/g, "") // Remove números, ':' e ';'
            .split(/[-,\s]+/) // Separa por espaços, hífens e vírgulas
            .map(b => b.trim()) // Remove espaços
            .filter(b => b); // Remove valores vazios
    }

    // Função para calcular palavras iguais
    function calcularPalavrasIguais(bairroRota, bairroPreferencia) {
        const bairrosRota = padronizarBairros(bairroRota);
        const bairrosPreferencia = padronizarBairros(bairroPreferencia);

        return bairrosPreferencia.filter(b => bairrosRota.includes(b)).length;
    }

    // Função para calcular percentual de compatibilidade
    function calcularPercentualCompatibilidade(iguais, total) {
        return total > 0 ? `${Math.round((iguais / total) * 100)}%` : "0%";
    }

    // Função para renderizar a tabela
    function renderizarTabela(filtrados) {
        tabelaBody.innerHTML = ""; // Limpa a tabela

        filtrados.forEach(resultado => {
            const motorista = motoristasData.find(m => m["id motorista"] === resultado.ID);
            const rota = rotasData.find(r => r.letras === resultado.Letra);

            const bairrosRota = rota ? rota.bairro : "";
            const bairrosPreferencia = motorista ? motorista["bairro preferencia do motorista"] : "";

            const palavrasIguais = calcularPalavrasIguais(bairrosRota, bairrosPreferencia);
            const totalPalavrasPreferencia = padronizarBairros(bairrosPreferencia).length;
            const percentualCompatibilidade = calcularPercentualCompatibilidade(palavrasIguais, totalPalavrasPreferencia);

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${resultado.ID}</td>
                <td>${resultado.Motorista}</td>
                <td>${resultado.Letra}</td>
                <td>${resultado["Tipo de Atribuição"]}</td>
                <td>${bairrosRota}</td>
                <td>${bairrosPreferencia}</td>
                <td>${palavrasIguais}</td>
                <td>${percentualCompatibilidade}</td>
            `;
            tabelaBody.appendChild(row);
        });
    }

    // Função para aplicar os filtros
    function aplicarFiltros() {
        const filtroId = document.querySelector("#filter-id").value.trim();
        const filtroLetra = document.querySelector("#filter-letter").value.trim().toLowerCase();

        const dadosFiltrados = roteirizacaoResultados.filter(resultado => {
            const idMatch = filtroId === "" || resultado.ID.toString().includes(filtroId);
            const letraMatch = filtroLetra === "" || resultado.Letra.toLowerCase().includes(filtroLetra);
            return idMatch && letraMatch;
        });

        renderizarTabela(dadosFiltrados);
        atualizarResumo(dadosFiltrados);
    }

    // Função para atualizar o resumo
  // Função para atualizar o resumo
function atualizarResumo(dadosFiltrados) {
    const totalMotoristas = dadosFiltrados.length;

    const totalPalavrasIguais = dadosFiltrados.reduce((sum, resultado) => {
        const motorista = motoristasData.find(m => m["id motorista"] === resultado.ID);
        const rota = rotasData.find(r => r.letras === resultado.Letra);

        const bairrosRota = rota ? rota.bairro : "";
        const bairrosPreferencia = motorista ? motorista["bairro preferencia do motorista"] : "";

        return sum + calcularPalavrasIguais(bairrosRota, bairrosPreferencia);
    }, 0);

    const compatibilidadeMedia =
        totalMotoristas > 0
            ? `${Math.round(
                  dadosFiltrados.reduce((sum, resultado) => {
                      const motorista = motoristasData.find(m => m["id motorista"] === resultado.ID);
                      const rota = rotasData.find(r => r.letras === resultado.Letra);

                      const bairrosRota = rota ? rota.bairro : "";
                      const bairrosPreferencia = motorista ? motorista["bairro preferencia do motorista"] : "";

                      const palavrasIguais = calcularPalavrasIguais(bairrosRota, bairrosPreferencia);
                      const totalPalavrasPreferencia = padronizarBairros(bairrosPreferencia).length;
                      return sum + parseFloat(calcularPercentualCompatibilidade(palavrasIguais, totalPalavrasPreferencia));
                  }, 0) / totalMotoristas
              )}%`
            : "0%";

    // Atualizar os cards
    document.querySelector("#total-motoristas").textContent = totalMotoristas;
    document.querySelector("#media-compatibilidade").textContent = compatibilidadeMedia;
    document.querySelector("#palavras-iguais-totais").textContent = totalPalavrasIguais;
}

    
    

    // Adicionar eventos de filtro
    document.querySelector("#apply-filter").addEventListener("click", aplicarFiltros);
    document.querySelector("#clear-filter").addEventListener("click", () => {
        document.querySelector("#filter-id").value = "";
        document.querySelector("#filter-letter").value = "";
        renderizarTabela(roteirizacaoResultados);
        atualizarResumo(roteirizacaoResultados);
    });

    // Renderizar tabela inicial e resumo
    renderizarTabela(roteirizacaoResultados);
    atualizarResumo(roteirizacaoResultados);
});


// Função para exportar tabela para Excel
function exportarParaExcel() {
    const tabela = document.querySelector("#percentual-table");
    if (!tabela) {
        console.error("Tabela não encontrada.");
        return;
    }

    // Converte a tabela para um arquivo Excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.table_to_sheet(tabela);

    // Adiciona a aba no arquivo Excel
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tabela Percentual");

    // Salva o arquivo
    XLSX.writeFile(workbook, "tabela_percentual.xlsx");
}

// Adiciona evento ao botão de exportação
document.querySelector("#exportar-excel").addEventListener("click", exportarParaExcel);
