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
