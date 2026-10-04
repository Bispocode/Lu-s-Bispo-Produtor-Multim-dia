// ===== Troca de IDV: abertura e saída das páginas de projeto =====
// Ida (index → projeto): a tela abre com a identidade do portfólio (quem eu sou) e é
// "repintada" pela identidade do cliente (onde eu gero impacto). Depois sobe e revela a página.
// Volta (projeto → index): o mesmo movimento ao contrário, do cliente para o portfólio.
//
// Branding BISPO.: o nome do cliente na transição sempre termina com ponto final,
// como no "Bispo." — o ponto vem na cor de destaque da marca do cliente (ver BRANDING.md).
//
// Para usar em outro projeto:
//   1. Coloque <script src="troca-idv.js"></script> logo depois de abrir o <body>
//      (precisa ser o primeiro elemento, para a abertura cobrir a página antes dela aparecer).
//      O index.html também carrega este script, para tocar a volta.
//   2. Configure no <body> da página do projeto:
//        data-idv-marca="SIEG"                         nome do cliente, sem o ponto (obrigatório)
//        data-idv-descricao="Soluções Fiscais"         linha de apoio (opcional)
//        data-idv-logo="assets/.../logo.svg"           logo claro do cliente; substitui o nome (opcional)
//        data-idv-fundo="#0A1F44"                      cor de fundo da marca
//        data-idv-texto="#FFFFFF"                      cor do texto sobre o fundo
//        data-idv-destaque="#4FC3F7"                   cor de destaque (rótulo e ponto final)
//        data-idv-cores="#005FE9 #2F8CFF #4FC3F7 #13346F"   paleta, separada por espaços
//        data-idv-fonte="Figtree"                      fonte da marca (carregue no <head>)

const TrocaIDV = (() => {
    const CHAVE_VOLTA = "idvVolta";
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // identidade do portfólio
    const PORTFOLIO = {
        fundo: "#FAF9F6",
        texto: "#17130F",
        destaque: "#D7263D",
        cores: ["#D7263D", "#7A0D1D", "#F5DEE0", "#17130F"],
        fonte: "Red Hat Display",
        rotulo: "Quem eu sou",
        marca: `<img src="logo.svg" alt="">`
    };

    const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

    // identidade do cliente a partir dos data-idv-* do <body>
    function lerCliente(cfg) {
        if (!cfg.idvMarca) return null;
        return {
            nome: cfg.idvMarca,
            descricao: cfg.idvDescricao || "",
            logo: cfg.idvLogo || "",
            fundo: cfg.idvFundo || "#17130F",
            texto: cfg.idvTexto || "#FFFFFF",
            destaque: cfg.idvDestaque || cfg.idvTexto || "#FFFFFF",
            cores: (cfg.idvCores || "").trim().split(/\s+/).filter(Boolean),
            fonte: cfg.idvFonte || PORTFOLIO.fonte
        };
    }

    function comoCamada(cliente) {
        // nome do cliente + ponto final na cor de destaque (regra do branding BISPO.)
        const nome = cliente.logo
            ? `<img src="${esc(cliente.logo)}" alt="">`
            : `<b>${esc(cliente.nome)}<span class="idv-ponto">.</span></b>`;
        return {
            ...cliente,
            rotulo: "Onde eu gero impacto",
            marca: nome + (cliente.descricao ? `<small>${esc(cliente.descricao)}</small>` : "")
        };
    }

    const paleta = (cores, fonte) => !cores.length ? "" :
        `<div class="idv-paleta">${cores.map(c => `<i style="background:${esc(c)}"></i>`).join("")}` +
        `<span class="idv-amostra" style="font-family:'${esc(fonte)}', sans-serif">Aa <small>${esc(fonte)}</small></span></div>`;

    const camada = (id, classe) => `
        <div class="idv-camada ${classe}" style="--idv-fundo:${esc(id.fundo)};--idv-texto:${esc(id.texto)};--idv-destaque:${esc(id.destaque)};font-family:'${esc(id.fonte)}', sans-serif">
            <p class="idv-rotulo">${id.rotulo}</p>
            <div class="idv-marca">${id.marca}</div>
            ${paleta(id.cores, id.fonte)}
        </div>`;

    // fonte do cliente na volta (o index não carrega as fontes dos clientes)
    function carregarFonte(fonte) {
        if (!fonte || fonte === PORTFOLIO.fonte) return;
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fonte).replace(/%20/g, "+")}:wght@400;500;700;800&display=swap`;
        document.head.appendChild(link);
    }

    // toca a sequência: origem → onda com o destino → sobe e revela a página
    function tocar(origem, destino, corEntrada) {
        const corpo = document.body;
        const tela = document.createElement("div");
        tela.className = "idv-troca";
        tela.setAttribute("aria-hidden", "true");
        tela.style.setProperty("--idv-entrada", corEntrada || origem.fundo);
        tela.innerHTML = camada(origem, "idv-camada-origem") + camada(destino, "idv-camada-destino");

        corpo.prepend(tela);
        corpo.classList.add("idv-abrindo");

        const tempos = { repintar: 1250, revelar: 2750, fim: 3650 };
        const timers = [];
        let encerrada = false, iniciada = false;

        const revelar = () => {
            if (encerrada) return;
            encerrada = true;
            timers.forEach(clearTimeout);
            tela.classList.add("idv-iniciar", "idv-repintar", "idv-revelar");
            corpo.classList.remove("idv-abrindo");

            // a página entra em camadas, como na transição entre páginas
            corpo.classList.add("entrando");
            setTimeout(() => corpo.classList.remove("entrando"), 2000);
            setTimeout(() => tela.remove(), tempos.fim - tempos.revelar);
        };

        // só começa quando as imagens da primeira camada carregaram (ou depois de um limite),
        // para a primeira fase nunca passar em branco
        const iniciar = () => {
            if (iniciada || encerrada) return;
            iniciada = true;
            tela.classList.add("idv-iniciar");
            timers.push(setTimeout(() => tela.classList.add("idv-repintar"), tempos.repintar));
            timers.push(setTimeout(revelar, tempos.revelar));
        };
        const imgs = [...tela.querySelectorAll(".idv-camada-origem img")].filter(img => !img.complete);
        if (!imgs.length) iniciar();
        else {
            let faltam = imgs.length;
            imgs.forEach(img => ["load", "error"].forEach(ev => img.addEventListener(ev, () => { if (--faltam === 0) iniciar(); })));
            timers.push(setTimeout(iniciar, 700));
        }

        // clique ou tecla pula a abertura
        tela.addEventListener("click", revelar);
        window.addEventListener("keydown", revelar, { once: true });
    }

    // chamado pelo script.js ao sair de uma página de projeto para o index:
    // guarda a identidade do cliente para a volta tocar ao contrário
    function prepararVolta() {
        const cliente = lerCliente(document.body.dataset);
        if (!cliente) return null;
        try { sessionStorage.setItem(CHAVE_VOLTA, JSON.stringify(cliente)); } catch (erro) {}
        return cliente.fundo;
    }

    // ---- ao carregar a página ----
    if (!reduzMovimento && document.body) {
        const cliente = lerCliente(document.body.dataset);
        let volta = null;
        try {
            volta = JSON.parse(sessionStorage.getItem(CHAVE_VOLTA) || "null");
            sessionStorage.removeItem(CHAVE_VOLTA);
        } catch (erro) {}

        if (cliente) {
            // ida: portfólio → cliente (começa na cor do card clicado, se veio do index)
            let corEntrada = null;
            try { corEntrada = sessionStorage.getItem("corTransicao"); } catch (erro) {}
            tocar({ ...PORTFOLIO }, comoCamada(cliente), corEntrada);
        } else if (volta) {
            // volta: cliente → portfólio; a cortina comum do script.js não entra
            try { sessionStorage.removeItem("corTransicao"); } catch (erro) {}
            carregarFonte(volta.fonte);
            tocar(comoCamada(volta), { ...PORTFOLIO }, volta.fundo);
        }
    }

    return { prepararVolta };
})();
