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

// ===== Transição de página dos projetos (parallax) =====
const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Saída: a cor do card se expande até cobrir a tela
document.querySelectorAll("a.proj").forEach(card => {
    card.addEventListener("click", (event) => {

        // deixa o navegador agir normalmente em ctrl/cmd+clique, botão do meio etc.
        if (reduzMovimento || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        event.preventDefault();

        const r = card.getBoundingClientRect();
        const cor = getComputedStyle(card).backgroundColor;

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

        setTimeout(() => { window.location.href = card.href; }, 700);
    });
});

// Ao voltar pelo botão do navegador, a página pode vir do cache com a cortina ainda na tela
window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    document.body.classList.remove("saindo");
    document.querySelectorAll(".cortina-saida").forEach(el => el.remove());
});

// Entrada: a cortina sobe e revela o conteúdo em camadas
if (document.body.classList.contains("pagina-projeto")) {

    let cor = null;
    try {
        cor = sessionStorage.getItem("corTransicao");
        sessionStorage.removeItem("corTransicao");
    } catch (erro) {}

    if (cor && !reduzMovimento) {
        const cortina = document.createElement("div");
        cortina.className = "cortina cortina-entrada";
        cortina.style.background = cor;
        document.body.appendChild(cortina);
        document.body.classList.add("entrando");

        cortina.addEventListener("animationend", () => cortina.remove());
        setTimeout(() => document.body.classList.remove("entrando"), 2000);
    }
}

// Parallax da capa ao rolar
const capaImg = document.querySelector(".projeto-capa-moldura img");

if (capaImg && !reduzMovimento) {

    let agendado = false;

    const moverCapa = () => {
        const r = capaImg.parentElement.getBoundingClientRect();
        const desloc = (r.top + r.height / 2 - window.innerHeight / 2) * -0.1;
        capaImg.style.transform = `translateY(${desloc}px) scale(1.12)`;
        agendado = false;
    };

    window.addEventListener("scroll", () => {
        if (!agendado) { agendado = true; requestAnimationFrame(moverCapa); }
    }, { passive: true });

    moverCapa();
}
