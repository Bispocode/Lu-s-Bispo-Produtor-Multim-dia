// ===== Menu mobile =====
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

menuToggle.addEventListener("click", () => {
    const aberto = nav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", aberto ? "true" : "false");
});

document.querySelectorAll(".nav a").forEach(link => {
    link.addEventListener("click", () => {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    });
});

window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
    }
});

// ===== Ano no rodapé =====
const anoEl = document.querySelector("#ano");
if (anoEl) anoEl.textContent = new Date().getFullYear();

// ===== Formulário de contato via fetch =====
const form = document.querySelector(".contato-form");

if (form) {

    const status = form.querySelector(".form-status");
    const botao = form.querySelector('button[type="submit"]');

    form.addEventListener("submit", async (event) => {

        event.preventDefault();

        if (botao) { botao.disabled = true; botao.textContent = "Enviando..."; }
        if (status) { status.textContent = ""; status.className = "form-status"; }

        try {

            const resposta = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });

            if (!resposta.ok) throw new Error("Falha no envio");

            if (status) {
                status.textContent = "Mensagem enviada! Te respondo em breve.";
                status.classList.add("success");
            }
            form.reset();

        } catch (erro) {

            console.error(erro);
            if (status) {
                status.textContent = "Não consegui enviar agora. Tente pelo WhatsApp ali do lado.";
                status.classList.add("error");
            }

        } finally {

            if (botao) { botao.disabled = false; botao.textContent = "Enviar mensagem"; }

        }

    });

}

// ===== Transição de página (parallax) =====
const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function corDaTransicao(link) {
    if (link.dataset.cor) return link.dataset.cor;

    const fundo = getComputedStyle(link).backgroundColor;
    const transparente = fundo === "transparent" || fundo === "rgba(0, 0, 0, 0)";
    if (!transparente) return fundo;

    // links sem fundo (voltar, menu) usam a cor do projeto ou a cor de texto do site
    const corProjeto = getComputedStyle(document.body).getPropertyValue("--cor-projeto").trim();
    return corProjeto || "#17130F";
}

// Saída: o elemento clicado se expande até cobrir a tela
document.querySelectorAll("a.proj, a[data-transicao]").forEach(link => {
    link.addEventListener("click", (event) => {

        // deixa o navegador agir normalmente em ctrl/cmd+clique, botão do meio etc.
        if (reduzMovimento || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        // link para a mesma página (ex.: âncora no próprio index) não precisa de transição
        const destino = new URL(link.href, location.href);
        if (destino.pathname === location.pathname) return;

        event.preventDefault();

        const r = link.getBoundingClientRect();
        let cor = corDaTransicao(link);

        // saindo de um projeto com troca de IDV para o index: a volta toca ao contrário
        // (cliente → portfólio), então a cortina já sai na cor de fundo do cliente
        const paraIndex = /(^|\/)(index\.html)?$/.test(destino.pathname);
        if (paraIndex && typeof TrocaIDV !== "undefined") {
            const corCliente = TrocaIDV.prepararVolta();
            if (corCliente) cor = corCliente;
        }

        const cortina = document.createElement("div");
        cortina.className = "cortina cortina-saida";
        cortina.style.background = cor;
        cortina.style.clipPath = `inset(${r.top}px ${window.innerWidth - r.right}px ${window.innerHeight - r.bottom}px ${r.left}px round 26px)`;
        document.body.appendChild(cortina);

        try { sessionStorage.setItem("corTransicao", cor); } catch (erro) {}

        requestAnimationFrame(() => requestAnimationFrame(() => {
            document.body.classList.add("saindo");
            cortina.style.clipPath = "inset(0px 0px 0px 0px round 0px)";
        }));

        setTimeout(() => { window.location.href = link.href; }, 700);
    });
});

// Ao voltar pelo botão do navegador, a página pode vir do cache com a cortina ainda na tela
window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.body.classList.remove("saindo");
    document.querySelectorAll(".cortina-saida").forEach(el => el.remove());
});

// Entrada: se a página foi aberta por uma transição, a cortina sobe e revela o conteúdo em camadas
{
    let cor = null;
    try {
        cor = sessionStorage.getItem("corTransicao");
        sessionStorage.removeItem("corTransicao");
    } catch (erro) {}

    // páginas com troca de IDV (troca-idv.js) têm a própria abertura no lugar da cortina
    if (cor && !reduzMovimento && !document.body.dataset.idvMarca) {
        const cortina = document.createElement("div");
        cortina.className = "cortina cortina-entrada";
        cortina.style.background = cor;
        document.body.appendChild(cortina);
        document.body.classList.add("entrando");

        cortina.addEventListener("animationend", () => cortina.remove());
        setTimeout(() => document.body.classList.remove("entrando"), 2000);
    }
}

// ===== Imagens dos projetos que ainda não existem viram moldura vazia =====
document.querySelectorAll(".projeto-capa-moldura img, .galeria-item img").forEach(img => {
    const marcarVazia = () => img.classList.add("img-vazia");
    if (img.complete && img.naturalWidth === 0) marcarVazia();
    else img.addEventListener("error", marcarVazia);
});

// ===== Animações ao rolar (index e páginas de projeto) =====
if (!reduzMovimento) {

    // Revelar: elementos entram de baixo quando aparecem na tela.
    // Irmãos com .revelar entram em sequência, com um pequeno atraso entre eles.
    const revelaveis = document.querySelectorAll(".revelar");

    revelaveis.forEach(el => {
        const irmaos = [...el.parentElement.children].filter(filho => filho.classList.contains("revelar"));
        const posicao = Math.min(irmaos.indexOf(el), 5);
        if (posicao > 0) el.style.setProperty("--atraso", `${posicao * 0.08}s`);
    });

    document.body.classList.add("js-revelar");

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (!entrada.isIntersecting) return;
            entrada.target.classList.add("visivel");
            observador.unobserve(entrada.target);
        });
    }, { rootMargin: "0px 0px -10% 0px" });

    revelaveis.forEach(el => observador.observe(el));

    // Parallax: cada camada se move numa velocidade diferente da página
    const imagens = document.querySelectorAll(".projeto-capa-moldura img, .galeria-item img");
    const hero = document.querySelector(".hero");
    const heroLogo = document.querySelector(".hero-word");
    const heroMeta = document.querySelector(".hero-meta");
    const dicaRolagem = document.querySelector(".scroll-cue");
    let agendado = false;

    const moverCamadas = () => {

        // topo do index: logo e texto de apoio descem mais devagar que a página.
        // O texto (embaixo) desce mais rápido que o logo (em cima), então os dois só se afastam
        // e nunca se sobrepõem.
        if (hero && window.scrollY < hero.offsetHeight) {
            const y = window.scrollY;
            if (heroLogo) heroLogo.style.translate = `0 ${y * 0.12}px`;
            if (heroMeta) heroMeta.style.translate = `0 ${y * 0.24}px`;
            if (dicaRolagem) dicaRolagem.style.opacity = y > 40 ? 0 : "";
        }

        // imagens das páginas de projeto
        imagens.forEach(img => {
            const r = img.parentElement.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return;
            // a imagem é 12% maior que a moldura: o movimento não pode passar dessa folga
            const folga = r.height * 0.055;
            const desloc = Math.max(-folga, Math.min(folga, (r.top + r.height / 2 - window.innerHeight / 2) * -0.1));
            img.style.transform = `translateY(${desloc}px) scale(1.12)`;
        });

        agendado = false;
    };

    window.addEventListener("scroll", () => {
        if (!agendado) { agendado = true; requestAnimationFrame(moverCamadas); }
    }, { passive: true });

    moverCamadas();
}

// ===== Vídeos que tocam só quando aparecem na tela =====
// (quem pediu menos movimento vê o vídeo parado, com os controles para dar play)
document.querySelectorAll("video[data-tocar-visivel]").forEach(video => {
    if (reduzMovimento) { video.controls = true; return; }
    const obs = new IntersectionObserver(([entrada]) => {
        if (entrada.isIntersecting) video.play().catch(() => {});
        else video.pause();
    }, { threshold: .35 });
    obs.observe(video);
});

// ===== Trajetória horizontal =====
// No computador, a seção fica presa na tela e a rolagem vertical move a linha do tempo para o lado.
// No celular (ou com movimento reduzido), a linha é arrastada com o dedo.
{
    const secao = document.querySelector("[data-trajetoria]");
    if (secao) {
        const trilho = secao.querySelector(".trajetoria-trilho");
        const linha = secao.querySelector(".linha-do-tempo");
        const progresso = secao.querySelector(".linha-progresso");
        const consulta = window.matchMedia("(min-width: 901px) and (prefers-reduced-motion: no-preference)");
        let distancia = 0, agendado = false;

        const medir = () => {
            const ativo = consulta.matches;
            secao.classList.toggle("horizontal", ativo);
            linha.style.transform = "";
            const largura = linha.scrollWidth;
            linha.style.setProperty("--largura-linha", `${largura}px`);
            const palco = getComputedStyle(linha.parentElement);
            const visivel = linha.parentElement.clientWidth - parseFloat(palco.paddingLeft) - parseFloat(palco.paddingRight);
            distancia = ativo ? Math.max(0, largura - visivel) : 0;
            secao.style.setProperty("--distancia", `${distancia}px`);
            mover();
        };

        const mover = () => {
            agendado = false;
            if (!secao.classList.contains("horizontal")) {
                // no celular, a barra acompanha o arraste
                const max = linha.scrollWidth - linha.clientWidth;
                progresso.style.width = `${max > 0 ? (linha.scrollLeft / max) * linha.scrollWidth : 0}px`;
                return;
            }
            const r = trilho.getBoundingClientRect();
            const percurso = r.height - window.innerHeight;
            const p = percurso > 0 ? Math.min(1, Math.max(0, -r.top / percurso)) : 0;
            linha.style.transform = `translate3d(${-p * distancia}px, 0, 0)`;
            // a linha vermelha avança até a etapa que está no meio da tela
            progresso.style.width = `${p * (linha.scrollWidth - 360) + 30}px`;
        };

        const agendar = () => { if (!agendado) { agendado = true; requestAnimationFrame(mover); } };
        window.addEventListener("scroll", agendar, { passive: true });
        linha.addEventListener("scroll", agendar, { passive: true });
        window.addEventListener("resize", medir);
        window.addEventListener("load", medir);
        consulta.addEventListener("change", medir);
        medir();
    }
}

// ===== Cartões que viram (frente e verso) =====
document.querySelectorAll(".postal-virar").forEach(botao => {
    botao.addEventListener("click", () => {
        const virado = botao.getAttribute("aria-pressed") === "true";
        botao.setAttribute("aria-pressed", String(!virado));
    });
});

// ===== Cursor personalizado =====
// Ponto que segue o mouse na hora e um anel que vem logo atrás, na cor da IDV da página
// (--cursor-cor no CSS). Só no computador: em tela de toque não existe cursor.
// Sobre um link o anel cresce; em cards e modelos 3D ele mostra um rótulo
// (qualquer elemento pode pedir o seu com data-cursor="Texto").
// Em campos de texto, iframes e no jogo, o cursor normal do sistema volta.
(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const raiz = document.documentElement;

    const NATIVO = "input, textarea, select, iframe, .jogo-canvas, [contenteditable]";
    const CLICAVEL = "a, button, [role='button'], label, summary, [tabindex]:not([tabindex='-1'])";
    const ROTULOS = [
        ["[data-cursor]", el => el.dataset.cursor],
        ["a.proj", () => "Ver projeto"],
        ["article.proj", () => "Em breve"],
        [".visualizador3d", () => "Arraste"],
        [".projeto-seguinte", () => "Próximo"]
    ];
    // fundos pintados com a própria cor da IDV: ali o cursor troca para a cor do fundo da página
    const INVERTIDO = ".projeto-seguinte, [data-cursor-invertido]";

    const ponto = document.createElement("div");
    ponto.className = "cursor-ponto";
    const anel = document.createElement("div");
    anel.className = "cursor-anel";
    anel.innerHTML = "<b></b>";
    const rotulo = anel.firstChild;
    ponto.setAttribute("aria-hidden", "true");
    anel.setAttribute("aria-hidden", "true");
    document.body.append(ponto, anel);
    raiz.classList.add("cursor-ativo");

    let x = -100, y = -100, ax = x, ay = y, animando = false;

    function quadro() {
        ax += (x - ax) * 0.2;
        ay += (y - ay) * 0.2;
        if (Math.abs(x - ax) < 0.1 && Math.abs(y - ay) < 0.1) { ax = x; ay = y; }
        anel.style.transform = `translate3d(${ax}px, ${ay}px, 0)`;
        animando = ax !== x || ay !== y;
        if (animando) requestAnimationFrame(quadro);
    }

    window.addEventListener("pointermove", e => {
        if (e.pointerType !== "mouse") return;
        x = e.clientX;
        y = e.clientY;
        ponto.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        if (reduzir || !raiz.classList.contains("cursor-visivel")) {
            ax = x; ay = y;
            anel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        } else if (!animando) {
            animando = true;
            requestAnimationFrame(quadro);
        }
        raiz.classList.add("cursor-visivel");
    }, { passive: true });

    document.addEventListener("pointerover", e => {
        const alvo = e.target;
        if (!(alvo instanceof Element)) return;
        let texto = "";
        for (const [seletor, ler] of ROTULOS) {
            const el = alvo.closest(seletor);
            if (el) { texto = ler(el); break; }
        }
        rotulo.textContent = texto;
        raiz.classList.toggle("cursor-nativo", !!alvo.closest(NATIVO));
        raiz.classList.toggle("cursor-invertido", !!alvo.closest(INVERTIDO));
        raiz.classList.toggle("cursor-rotulo", !!texto);
        raiz.classList.toggle("cursor-link", !texto && !!alvo.closest(CLICAVEL));
    });

    // saiu da janela (ou entrou num iframe): some até o mouse voltar
    document.addEventListener("mouseout", e => {
        if (!e.relatedTarget) raiz.classList.remove("cursor-visivel");
    });
    window.addEventListener("pointerdown", () => raiz.classList.add("cursor-pressionado"));
    window.addEventListener("pointerup", () => raiz.classList.remove("cursor-pressionado"));
})();
