// ===== Vitrine de feed: celular 3D controlado pela rolagem =====
// No computador, a seção fica presa na tela enquanto a rolagem gira o celular,
// desce o feed post a post e passa os slides de cada carrossel.
// Em telas de toque (ou com movimento reduzido) o celular fica de frente e o feed rola normalmente.

const vitrine = document.querySelector("[data-vitrine]");
if (vitrine) iniciarVitrine(vitrine);

function iniciarVitrine(vitrine) {

    const usuario = vitrine.dataset.usuario || "sieg";
    // foto de perfil (opcional); sem ela aparece a inicial do usuário
    const avatar = vitrine.dataset.avatar
        ? `<img src="${vitrine.dataset.avatar}" alt="">`
        : usuario[0].toUpperCase();
    vitrine.querySelectorAll(".ig-nav-avatar").forEach(el => el.innerHTML = vitrine.dataset.avatar ? avatar : "");
    const celular = vitrine.querySelector(".celular");
    const trilho = vitrine.querySelector(".vitrine-trilho");
    const rolagem = vitrine.querySelector(".ig-rolagem");
    const feed = vitrine.querySelector(".ig-feed");
    const posts = [...feed.querySelectorAll(".ig-post")];
    if (!posts.length) return;

    const info = {
        atual: vitrine.querySelector("[data-post-atual]"),
        total: vitrine.querySelector("[data-post-total]"),
        titulo: vitrine.querySelector("[data-post-titulo]"),
        slide: vitrine.querySelector("[data-slide-info]")
    };

    const doisDigitos = n => String(n).padStart(2, "0");
    const limitar = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const misturar = (a, b, t) => a + (b - a) * t;
    const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    vitrine.querySelectorAll("[data-ig-usuario]").forEach(el => el.textContent = usuario.toUpperCase());
    if (info.total) info.total.textContent = doisDigitos(posts.length);

    // --- Espessura do aparelho: camadas empilhadas entre a frente e o verso ---
    const ESPESSURA = 14;
    celular.style.setProperty("--espessura", `${ESPESSURA}px`);
    for (let z = -ESPESSURA / 2 + 1; z < ESPESSURA / 2; z++) {
        const camada = document.createElement("span");
        camada.className = "celular-camada";
        camada.style.transform = `translateZ(${z}px)`;
        celular.appendChild(camada);
    }

    // --- Monta cada post com cara de Instagram a partir das <img> soltas ---
    const icone = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
    const ICONES = {
        curtir: icone("M12 20.5s-7.6-4.6-9.4-9.3C1.4 8 3.3 4.5 6.8 4.5c2.2 0 3.6 1.2 5.2 3.1 1.6-1.9 3-3.1 5.2-3.1 3.5 0 5.4 3.5 4.2 6.7-1.8 4.7-9.4 9.3-9.4 9.3z"),
        comentar: icone("M20.7 16.2A9 9 0 1 0 17 20l4 1z"),
        enviar: icone("M22 3 2.5 9.5l8 3.2 3.3 8.3zM10.5 12.7 22 3"),
        salvar: icone("M19 21l-7-5.5L5 21V3.5h14z")
    };

    const carrosseis = posts.map((post, i) => {
        const imagens = [...post.querySelectorAll(":scope > img")];
        const legenda = post.querySelector(".ig-legenda");

        const topo = document.createElement("header");
        topo.className = "ig-post-topo";
        topo.innerHTML = `<span class="ig-avatar">${avatar}</span><b>${usuario}</b><span class="ig-mais">•••</span>`;

        const carrossel = document.createElement("div");
        carrossel.className = "ig-carrossel";
        const faixa = document.createElement("div");
        faixa.className = "ig-slides";
        carrossel.appendChild(faixa);

        imagens.forEach((img, j) => {
            const slide = document.createElement("figure");
            slide.className = "ig-slide";
            slide.dataset.rotulo = `Arte ${doisDigitos(i + 1)}${imagens.length > 1 ? ` · ${j + 1}/${imagens.length}` : ""}`;
            img.draggable = false;
            const marcarVazia = () => slide.classList.add("vazia");
            if (img.complete && img.naturalWidth === 0) marcarVazia();
            else img.addEventListener("error", marcarVazia);
            slide.appendChild(img);
            faixa.appendChild(slide);
        });

        let selo = null, pontos = [];
        if (imagens.length > 1) {
            selo = document.createElement("span");
            selo.className = "ig-selo";
            carrossel.appendChild(selo);
        }

        const acoes = document.createElement("div");
        acoes.className = "ig-acoes";
        acoes.innerHTML = `<span class="ig-acoes-esq">${ICONES.curtir}${ICONES.comentar}${ICONES.enviar}</span><span class="ig-pontos"></span>${ICONES.salvar}`;
        if (imagens.length > 1) {
            const caixaPontos = acoes.querySelector(".ig-pontos");
            pontos = imagens.map(() => caixaPontos.appendChild(document.createElement("i")));
        }

        if (legenda) {
            const nome = document.createElement("b");
            nome.textContent = usuario + " ";
            legenda.prepend(nome);
        }

        post.prepend(topo, carrossel, acoes);
        if (legenda) post.appendChild(legenda);

        return { post, carrossel, faixa, selo, pontos, total: imagens.length, slideMostrado: -1 };
    });

    // Atualiza pontinhos, selo "2/5" e o painel lateral
    let postMostrado = -1;
    function marcarSlide(c, indice) {
        if (c.slideMostrado === indice) return;
        c.slideMostrado = indice;
        c.pontos.forEach((p, k) => p.classList.toggle("ativo", k === indice));
        if (c.selo) c.selo.textContent = `${indice + 1}/${c.total}`;
    }
    function marcarPost(indice) {
        const c = carrosseis[indice];
        if (postMostrado !== indice) {
            postMostrado = indice;
            carrosseis.forEach((outro, k) => outro.post.classList.toggle("ig-post-ativo", k === indice));
            if (info.atual) info.atual.textContent = doisDigitos(indice + 1);
            if (info.titulo) info.titulo.textContent = c.post.dataset.titulo || `Post ${doisDigitos(indice + 1)}`;
        }
        // pontinhos do slide atual, embaixo do celular
        const chave = `${indice}-${c.slideMostrado}`;
        if (info.slide && info.slide.dataset.chave !== chave) {
            info.slide.dataset.chave = chave;
            info.slide.innerHTML = c.total > 1
                ? Array.from({ length: c.total }, (_, k) => `<i${k === c.slideMostrado ? ' class="ativo"' : ""}></i>`).join("")
                : "";
        }
    }
    carrosseis.forEach(c => marcarSlide(c, 0));
    marcarPost(0);

    // --- Modo toque: carrosséis com arrastar nativo ---
    carrosseis.forEach(c => {
        c.carrossel.addEventListener("scroll", () => {
            if (modo3d) return;
            marcarSlide(c, Math.round(c.carrossel.scrollLeft / c.carrossel.clientWidth));
        }, { passive: true });
    });

    // --- Linha do tempo da rolagem (modo 3D) ---
    // Cada etapa ocupa um "peso" de rolagem: girar o celular, descer até o próximo post, passar um slide...
    const ENTRADA = 1.4, SAIDA = 1;
    let etapas = [], unidades = 0, alturaPosts = [];

    function medir() {
        etapas = [];
        unidades = 0;
        const etapa = (tipo, peso, dados = {}) => { etapas.push({ tipo, peso, inicio: unidades, ...dados }); unidades += peso; };

        etapa("entrada", ENTRADA);
        carrosseis.forEach((c, i) => {
            if (i > 0) etapa("descer", 1, { de: i - 1, para: i });
            etapa("pausa", .45);
            for (let s = 1; s < c.total; s++) etapa("deslizar", .75, { post: i, slide: s });
        });
        etapa("pausa", .5);
        etapa("saida", SAIDA);

        trilho.style.setProperty("--unidades", unidades.toFixed(2));

        const limite = Math.max(0, feed.scrollHeight - rolagem.clientHeight);
        alturaPosts = carrosseis.map(c => Math.min(c.post.offsetTop, limite));
    }

    // Posição de cada coisa para um progresso p (0 → 1) da seção
    function estadoEm(p) {
        const u = p * unidades;
        const slides = carrosseis.map(() => 0);
        let y = alturaPosts[0] || 0, post = 0;

        for (const e of etapas) {
            const t = limitar((u - e.inicio) / e.peso);
            if (t <= 0) break;
            const k = suave(t);
            if (e.tipo === "descer") {
                y = misturar(alturaPosts[e.de], alturaPosts[e.para], k);
                if (t > .5) post = e.para;
            }
            if (e.tipo === "deslizar") slides[e.post] = e.slide - 1 + k;
        }

        // giro: começa de costas, vira de frente, balança devagar durante o feed e termina reto
        const tEntrada = suave(limitar(u / ENTRADA));
        const tFeed = limitar((u - ENTRADA) / (unidades - ENTRADA - SAIDA));
        const tSaida = suave(limitar((u - (unidades - SAIDA)) / SAIDA));

        let ry = misturar(205, -22, tEntrada);
        let rx = misturar(24, 7, tEntrada);
        let rz = misturar(-10, 0, tEntrada);
        let escala = misturar(.82, 1, tEntrada);

        if (tEntrada >= 1) {
            ry = misturar(-22, 22, tFeed) + Math.sin(tFeed * Math.PI * 3) * 4;
            rx = 7 - Math.sin(tFeed * Math.PI) * 3;
        }
        if (tSaida > 0) {
            ry = misturar(ry, 0, tSaida);
            rx = misturar(rx, 0, tSaida);
        }

        return { ry, rx, rz, escala, y, slides, post };
    }

    // --- Movimento suavizado ---
    let modo3d = false;
    let alvo = null, atual = null;
    let mouseX = 0, mouseY = 0, rodando = false;
    const barra = vitrine.querySelector(".vitrine-progresso span");
    const sombra = vitrine.querySelector(".celular-sombra");

    function progresso() {
        const r = trilho.getBoundingClientRect();
        const percurso = r.height - window.innerHeight;
        return percurso > 0 ? limitar(-r.top / percurso) : 0;
    }

    function calcularAlvo() {
        const p = progresso();
        alvo = estadoEm(p);
        alvo.ry += mouseX * 6;
        alvo.rx -= mouseY * 4;
        if (barra) barra.style.transform = `scaleX(${p})`;
        vitrine.classList.toggle("vitrine-iniciada", p > .03);
        if (!atual) atual = { ...alvo, slides: [...alvo.slides] };
    }

    function desenhar() {
        const f = .12;
        let mexendo = false;
        const aproximar = (a, b) => {
            const novo = misturar(a, b, f);
            if (Math.abs(b - novo) > .002) mexendo = true;
            return Math.abs(b - novo) > .002 ? novo : b;
        };

        atual.ry = aproximar(atual.ry, alvo.ry);
        atual.rx = aproximar(atual.rx, alvo.rx);
        atual.rz = aproximar(atual.rz, alvo.rz);
        atual.escala = aproximar(atual.escala, alvo.escala);
        atual.y = aproximar(atual.y, alvo.y);
        atual.slides = atual.slides.map((s, i) => aproximar(s, alvo.slides[i]));

        celular.style.transform = `rotateX(${atual.rx}deg) rotateY(${atual.ry}deg) rotateZ(${atual.rz}deg) scale(${atual.escala})`;
        celular.style.setProperty("--brilho", `${50 + atual.ry * 1.6}%`);
        feed.style.transform = `translate3d(0, ${-atual.y}px, 0)`;

        carrosseis.forEach((c, i) => {
            c.faixa.style.transform = `translate3d(${-atual.slides[i] * 100}%, 0, 0)`;
            marcarSlide(c, Math.min(c.total - 1, Math.round(atual.slides[i])));
        });
        marcarPost(alvo.post);

        if (sombra) {
            const giro = Math.abs(Math.cos(atual.ry * Math.PI / 180));
            sombra.style.transform = `scaleX(${.55 + giro * .45})`;
        }

        if (mexendo) requestAnimationFrame(desenhar);
        else rodando = false;
    }

    function agendar() {
        if (!modo3d || vendoGrade) return;
        calcularAlvo();
        if (!rodando) { rodando = true; requestAnimationFrame(desenhar); }
    }

    function limpar() {
        celular.style.transform = "";
        feed.style.transform = "";
        carrosseis.forEach(c => c.faixa.style.transform = "");
        if (sombra) sombra.style.transform = "";
        vitrine.classList.remove("vitrine-iniciada");
        atual = null;
    }

    // Só gira em telas grandes, com mouse, e se a pessoa não pediu menos movimento
    const consulta = window.matchMedia("(min-width: 901px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");

    function aplicarModo() {
        modo3d = consulta.matches;
        vitrine.classList.toggle("modo-3d", modo3d);
        limpar();
        if (modo3d) { medir(); agendar(); }
        else carrosseis.forEach(c => marcarSlide(c, Math.round(c.carrossel.scrollLeft / (c.carrossel.clientWidth || 1))));
    }

    consulta.addEventListener("change", aplicarModo);
    window.addEventListener("scroll", agendar, { passive: true });
    window.addEventListener("resize", () => { if (modo3d) { medir(); agendar(); } });
    window.addEventListener("load", () => { if (modo3d) { medir(); agendar(); } });

    // Leve inclinação seguindo o mouse
    vitrine.addEventListener("mousemove", (event) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
        mouseY = (event.clientY / window.innerHeight) * 2 - 1;
        agendar();
    });
    vitrine.addEventListener("mouseleave", () => { mouseX = 0; mouseY = 0; agendar(); });

    // --- Ver as artes "No feed": grade do perfil do Instagram ---
    // Cada quadrado é um carrossel: dá para passar com as setas ou arrastando,
    // e os que ninguém está mexendo passam sozinhos, cada um no seu tempo.
    const grade = document.createElement("div");
    grade.className = "vitrine-grade";
    grade.hidden = true;
    grade.innerHTML = `
        <header class="perfil">
            <span class="perfil-avatar">${avatar}</span>
            <div>
                <b>${usuario}</b>
                <span><strong>${carrosseis.length}</strong> publicações</span>
                <small>Artes criadas por Luís Bispo</small>
            </div>
        </header>
        <div class="perfil-abas"><span>${icone("M3 3h18v18H3zM9 3v18M15 3v18M3 9h18M3 15h18")} Publicações</span></div>
        <div class="feed-grade"></div>`;
    const caixaGrade = grade.querySelector(".feed-grade");
    const ICONE_CARROSSEL = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7V4h13v13h-3"/><path d="M4 7h13v13H4z"/></svg>`;
    const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const quadros = carrosseis.map((c, i) => {
        const titulo = c.post.dataset.titulo || `Post ${doisDigitos(i + 1)}`;
        const item = document.createElement("article");
        item.className = "feed-item";
        item.setAttribute("aria-label", titulo);

        const faixa = document.createElement("div");
        faixa.className = "feed-faixa";
        c.faixa.querySelectorAll(".ig-slide").forEach(slide => {
            const arte = slide.cloneNode(true);
            arte.className = "feed-arte" + (slide.classList.contains("vazia") ? " vazia" : "");
            const img = arte.querySelector("img");
            img.addEventListener("error", () => arte.classList.add("vazia"));
            faixa.appendChild(arte);
        });
        item.appendChild(faixa);

        const q = { item, faixa, total: c.total, atual: 0, pausaAte: 0, pontos: [], timer: null };

        if (c.total > 1) {
            item.insertAdjacentHTML("beforeend", `
                <span class="feed-icone">${ICONE_CARROSSEL}</span>
                <button type="button" class="feed-seta feed-seta-ant" aria-label="Slide anterior de ${titulo}">‹</button>
                <button type="button" class="feed-seta feed-seta-prox" aria-label="Próximo slide de ${titulo}">›</button>
                <span class="feed-pontos">${"<i></i>".repeat(c.total)}</span>`);
            q.pontos = [...item.querySelectorAll(".feed-pontos i")];
            // cada carrossel tem o seu ritmo: entre 2,5 e 5 segundos
            q.intervalo = 2500 + ((i * 1370) % 2600);

            item.querySelector(".feed-seta-ant").addEventListener("click", () => { pausar(q); irPara(q, q.atual - 1); });
            item.querySelector(".feed-seta-prox").addEventListener("click", () => { pausar(q); irPara(q, q.atual + 1); });

            // arrastar com o dedo ou o mouse
            let inicioX = null;
            faixa.addEventListener("pointerdown", e => { inicioX = e.clientX; });
            faixa.addEventListener("pointerup", e => {
                if (inicioX === null) return;
                const dx = e.clientX - inicioX;
                inicioX = null;
                if (Math.abs(dx) < 30) return;
                pausar(q);
                irPara(q, q.atual + (dx < 0 ? 1 : -1));
            });
            faixa.addEventListener("pointercancel", () => { inicioX = null; });

            // enquanto o mouse está em cima, o carrossel espera
            item.addEventListener("mouseenter", () => { q.emCima = true; });
            item.addEventListener("mouseleave", () => { q.emCima = false; });
        }

        item.insertAdjacentHTML("beforeend", `<span class="feed-titulo">${titulo}</span>`);
        caixaGrade.appendChild(item);
        irPara(q, 0);
        return q;
    });
    trilho.after(grade);

    function irPara(q, indice) {
        q.atual = (indice + q.total) % q.total;
        q.faixa.style.transform = `translateX(${-q.atual * 100}%)`;
        q.pontos.forEach((p, k) => p.classList.toggle("ativo", k === q.atual));
    }
    function pausar(q) { q.pausaAte = Date.now() + 7000; }

    function passarSozinho(q) {
        clearTimeout(q.timer);
        q.timer = setTimeout(() => {
            if (!q.emCima && Date.now() > q.pausaAte) irPara(q, q.atual + 1);
            passarSozinho(q);
        }, q.intervalo);
    }
    function autoplay(ligado) {
        quadros.forEach(q => {
            clearTimeout(q.timer);
            if (ligado && q.total > 1 && !reduzMovimento) passarSozinho(q);
        });
    }

    let vendoGrade = false;
    const botoes = [...vitrine.querySelectorAll("[data-ver]")];

    function verComo(modo) {
        vendoGrade = modo === "grade";
        vitrine.classList.toggle("ver-grade", vendoGrade);
        grade.hidden = !vendoGrade;
        trilho.hidden = vendoGrade;
        botoes.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ver === modo)));
        autoplay(vendoGrade);
        if (!vendoGrade) aplicarModo();
    }

    botoes.forEach(botao => botao.addEventListener("click", () => {
        verComo(botao.dataset.ver);
        try { localStorage.setItem("vitrineVer", botao.dataset.ver); } catch (erro) {}
    }));

    aplicarModo();

    // lembra a preferência de quem já escolheu ver só as artes
    let preferencia = null;
    try { preferencia = localStorage.getItem("vitrineVer"); } catch (erro) {}
    if (preferencia === "grade") verComo("grade");
}
