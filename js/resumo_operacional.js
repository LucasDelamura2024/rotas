window.onload = () => {
    const rotasData = JSON.parse(localStorage.getItem('rotasData')) || [];
    const motoristasData = JSON.parse(localStorage.getItem('motoristasData')) || [];
    const roteirizacaoResultados = JSON.parse(localStorage.getItem('roteirizacaoResultados')) || [];

    if (!rotasData.length || !motoristasData.length || !roteirizacaoResultados.length) {
        alert("Dados incompletos! Faça o upload e execute a roteirização no Index primeiro.");
        return;
    }

    const totalMotoristas = motoristasData.length;
    const rotasAtribuidas = roteirizacaoResultados.filter(res => res.Letra && res.Letra !== "Sem Rota Disponível");
    const totalRotas = rotasAtribuidas.length;
    const rotasNaoAtribuidas = rotasData.length - totalRotas;

    let totalDuracao = 0, totalKM = 0, totalParadas = 0, totalSPR = 0;

    // Somente rotas atribuídas
    rotasAtribuidas.forEach(rotaAtribuida => {
        const rota = rotasData.find(r => r['letras'] === rotaAtribuida.Letra);
        if (rota) {
            const duracao = rota['duração'] || "0h0min";
            const km = parseFloat(String(rota['km'] || "0").replace('.', '').replace(/(\d{2})$/, ',$1').replace(',', '.')) || 0;
            const paradas = parseInt(rota['parada'] || 0);
            const spr = parseInt(rota['spr'] || 0);

            // Converter duração em minutos
            const match = duracao.match(/(\d+)h(\d+)min/);
            if (match) totalDuracao += parseInt(match[1]) * 60 + parseInt(match[2]);

            totalKM += km;
            totalParadas += paradas;
            totalSPR += spr;
        }
    });

    // Cálculo das médias
    const mediaDuracao = totalRotas ? totalDuracao / totalRotas : 0;
    const mediaKM = totalRotas ? totalKM / totalRotas : 0;
    const mediaParadas = totalRotas ? totalParadas / totalRotas : 0;
    const mediaSPR = totalRotas ? totalSPR / totalRotas : 0;

    // Formatar duração em hh:mm
    const formatarDuracao = (minutos) => {
        const horas = Math.floor(minutos / 60);
        const minutosRestantes = Math.round(minutos % 60);
        return `${horas.toString().padStart(2, '0')}:${minutosRestantes.toString().padStart(2, '0')}`;
    };

    const duracaoTotalFormatada = formatarDuracao(totalDuracao);
    const duracaoMediaFormatada = formatarDuracao(mediaDuracao);

    // Resumo operacional
    const resumo = [
        { titulo: "Total de Motoristas", valor: totalMotoristas },
        { titulo: "Total de Rotas", valor: rotasData.length },
        { titulo: "Rotas Atribuídas", valor: totalRotas },
        { titulo: "Rotas Não Atribuídas", valor: rotasNaoAtribuidas },
        { titulo: "Duração Total (hh:mm)", valor: duracaoTotalFormatada },
        { titulo: "Duração Média (hh:mm)", valor: duracaoMediaFormatada },
        { titulo: "KM Total", valor: totalKM.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
        { titulo: "KM Médio", valor: mediaKM.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
        { titulo: "Paradas Totais", valor: totalParadas },
        { titulo: "Paradas Médias", valor: mediaParadas.toFixed(2) },
        { titulo: "SPR Total", valor: totalSPR },
        { titulo: "SPR Médio", valor: mediaSPR.toFixed(2) },
    ];

    // Renderizar os cards
    const container = document.getElementById('resumo-operacional');
    container.innerHTML = resumo.map(dado => `
        <div class="col-md-4">
            <div class="card bg-light shadow">
                <div class="card-body text-center">
                    <h5 class="card-title">${dado.titulo}</h5>
                    <p class="display-6 fw-bold">${dado.valor}</p>
                </div>
            </div>
        </div>
    `).join('');
};
