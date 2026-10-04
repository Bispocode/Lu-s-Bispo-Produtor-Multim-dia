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
        const cor = corDaTransicao(link);

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
    let agendado = false;

    const moverCamadas = () => {

        // topo do index: o logo fica para trás e o texto de apoio vem um pouco depois
        if (hero && window.scrollY < hero.offsetHeight) {
            const y = window.scrollY;
            if (heroLogo) heroLogo.style.translate = `0 ${y * 0.35}px`;
            if (heroMeta) heroMeta.style.translate = `0 ${y * 0.18}px`;
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
