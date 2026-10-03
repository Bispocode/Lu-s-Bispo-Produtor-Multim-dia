// ===== Troca de IDV: abertura das páginas de projeto =====
// A tela abre com a identidade do portfólio (quem eu sou) e é "repintada" pela
// identidade do cliente (onde eu gero impacto). Depois sobe e revela a página.
//
// Para usar em outro projeto:
//   1. Coloque <script src="troca-idv.js"></script> logo depois de abrir o <body>
//      (precisa ser o primeiro elemento, para a abertura cobrir a página antes dela aparecer).
//   2. Configure no próprio <body>:
//        data-idv-marca="SIEG"                         nome do cliente (obrigatório)
//        data-idv-descricao="Soluções Fiscais"         linha de apoio (opcional)
//        data-idv-logo="assets/.../logo.svg"           logo claro do cliente; substitui o nome (opcional)
//        data-idv-fundo="#0A1F44"                      cor de fundo da marca
//        data-idv-texto="#FFFFFF"                      cor do texto sobre o fundo
//        data-idv-destaque="#4FC3F7"                   cor de destaque (rótulo)
//        data-idv-cores="#005FE9 #2F8CFF #4FC3F7 #13346F"   paleta, separada por espaços
//        data-idv-fonte="Figtree"                      fonte da marca (carregue no <head>)

(() => {
    const corpo = document.body;
    const cfg = corpo.dataset;
    if (!corpo || !cfg.idvMarca) return;

    // quem pediu menos movimento vai direto para a página
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // identidade do portfólio (ponto de partida)
    const ORIGEM = {
        fundo: "#FAF9F6",
        texto: "#17130F",
        destaque: "#D7263D",
        cores: ["#D7263D", "#7A0D1D", "#F5DEE0", "#17130F"],
        fonte: "Bricolage Grotesque"
    };

    const destino = {
        fundo: cfg.idvFundo || "#17130F",
        texto: cfg.idvTexto || "#FFFFFF",
        destaque: cfg.idvDestaque || cfg.idvTexto || "#FFFFFF",
        cores: (cfg.idvCores || "").trim().split(/\s+/).filter(Boolean),
        fonte: cfg.idvFonte || ORIGEM.fonte
    };

    // se chegou pela transição do index, começa na cor do card clicado
    let corEntrada = null;
    try { corEntrada = sessionStorage.getItem("corTransicao"); } catch (erro) {}

    const paleta = (cores, fonte) =>
        `<div class="idv-paleta">${cores.map(c => `<i style="background:${c}"></i>`).join("")}` +
        `<span class="idv-amostra" style="font-family:'${fonte}', sans-serif">Aa <small>${fonte}</small></span></div>`;

    const marcaCliente = cfg.idvLogo
        ? `<img src="${cfg.idvLogo}" alt="">`
        : `<b>${cfg.idvMarca}</b>`;

    const tela = document.createElement("div");
    tela.className = "idv-troca";
    tela.setAttribute("aria-hidden", "true");
    tela.style.setProperty("--idv-entrada", corEntrada || ORIGEM.fundo);
    tela.innerHTML = `
        <div class="idv-camada idv-camada-origem" style="--idv-fundo:${ORIGEM.fundo};--idv-texto:${ORIGEM.texto};--idv-destaque:${ORIGEM.destaque};font-family:'${ORIGEM.fonte}', sans-serif">
            <p class="idv-rotulo">Quem eu sou</p>
            <div class="idv-marca"><img src="logo.svg" alt=""></div>
            ${paleta(ORIGEM.cores, ORIGEM.fonte)}
        </div>
        <div class="idv-camada idv-camada-destino" style="--idv-fundo:${destino.fundo};--idv-texto:${destino.texto};--idv-destaque:${destino.destaque};font-family:'${destino.fonte}', sans-serif">
            <p class="idv-rotulo">Onde eu gero impacto</p>
            <div class="idv-marca">${marcaCliente}${cfg.idvDescricao ? `<small>${cfg.idvDescricao}</small>` : ""}</div>
            ${destino.cores.length ? paleta(destino.cores, destino.fonte) : ""}
        </div>`;

    corpo.prepend(tela);
    corpo.classList.add("idv-abrindo");

    // linha do tempo: origem → onda da marca do cliente → sobe e revela a página
    const tempos = { repintar: 1250, revelar: 2750, fim: 3650 };
    const timers = [];
    let encerrada = false;

    const revelar = () => {
        if (encerrada) return;
        encerrada = true;
        timers.forEach(clearTimeout);
        tela.classList.add("idv-repintar", "idv-revelar");
        corpo.classList.remove("idv-abrindo");

        // a página entra em camadas, como na transição entre páginas
        corpo.classList.add("entrando");
        setTimeout(() => corpo.classList.remove("entrando"), 2000);
        setTimeout(() => tela.remove(), tempos.fim - tempos.revelar);
    };

    // só começa quando o logo do portfólio carregou (ou depois de um limite),
    // para a fase "quem eu sou" nunca passar em branco
    let iniciada = false;
    const iniciar = () => {
        if (iniciada || encerrada) return;
        iniciada = true;
        tela.classList.add("idv-iniciar");
        timers.push(setTimeout(() => tela.classList.add("idv-repintar"), tempos.repintar));
        timers.push(setTimeout(revelar, tempos.revelar));
    };
    const logo = tela.querySelector(".idv-camada-origem img");
    if (logo.complete) iniciar();
    else {
        logo.addEventListener("load", iniciar);
        logo.addEventListener("error", iniciar);
        timers.push(setTimeout(iniciar, 700));
    }

    // clique ou tecla pula a abertura
    tela.addEventListener("click", revelar);
    window.addEventListener("keydown", revelar, { once: true });
})();
