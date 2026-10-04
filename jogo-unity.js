// ===== Jogo Unity (WebGL) dentro da página =====
// O jogo só é baixado quando a pessoa clica em "Jogar": quem só está lendo a página não paga o peso.
// Uso:
//   <figure data-jogo-unity data-pasta="assets/.../jogo/" data-nome="between-bubbles">
//       <img ...>   capa enquanto o jogo não roda
//   </figure>
// Na pasta ficam {nome}.loader.js, {nome}.data.br, {nome}.framework.js.br e {nome}.wasm.br
// (build com compressão Brotli; o vercel.json envia o Content-Encoding certo).

document.querySelectorAll("[data-jogo-unity]").forEach(caixa => {
    const pasta = caixa.dataset.pasta;
    const nome = caixa.dataset.nome;
    const tamanho = caixa.dataset.tamanho || "";

    // celular/tablet sem mouse: o jogo usa teclado, então fica só a capa com um aviso
    const temTeclado = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const capa = document.createElement("div");
    capa.className = "jogo-capa";
    capa.innerHTML = temTeclado
        ? `<button type="button" class="jogo-jogar"><span aria-hidden="true">▶</span> Jogar</button>
           ${tamanho ? `<small>${tamanho} · carrega só ao clicar</small>` : ""}`
        : `<p class="jogo-aviso">Jogue no computador: o jogo usa o teclado.</p>`;
    caixa.appendChild(capa);
    if (!temTeclado) return;

    const carregando = document.createElement("div");
    carregando.className = "jogo-carregando";
    carregando.hidden = true;
    carregando.innerHTML = `<span class="jogo-barra"><i></i></span><small>Carregando 0%</small>`;
    caixa.appendChild(carregando);

    const controles = document.createElement("div");
    controles.className = "jogo-controles";
    controles.hidden = true;
    controles.innerHTML = `<button type="button" data-acao="tela-cheia">Tela cheia</button>
                           <button type="button" data-acao="sair">Sair</button>`;
    caixa.appendChild(controles);

    let instancia = null, canvas = null;
    const barra = carregando.querySelector("i");
    const textoCarregando = carregando.querySelector("small");

    function carregarScript(src) {
        return new Promise((ok, falha) => {
            if (window.createUnityInstance) return ok();
            const s = document.createElement("script");
            s.src = src;
            s.onload = ok;
            s.onerror = () => falha(new Error("não foi possível baixar o jogo"));
            document.body.appendChild(s);
        });
    }

    async function jogar() {
        capa.hidden = true;
        carregando.hidden = false;
        caixa.classList.add("jogando");

        canvas = document.createElement("canvas");
        canvas.className = "jogo-canvas";
        canvas.id = `jogo-${nome}`;          // o loader do Unity procura o canvas pelo id
        canvas.tabIndex = -1;                // o teclado só vai para o jogo com ele focado
        caixa.appendChild(canvas);

        try {
            await carregarScript(`${pasta}${nome}.loader.js`);
            instancia = await window.createUnityInstance(canvas, {
                dataUrl: `${pasta}${nome}.data.br`,
                frameworkUrl: `${pasta}${nome}.framework.js.br`,
                codeUrl: `${pasta}${nome}.wasm.br`,
                companyName: "Luís Bispo",
                productName: caixa.dataset.titulo || nome,
                productVersion: "1.0",
                showBanner: () => {}
            }, progresso => {
                barra.style.transform = `scaleX(${progresso})`;
                textoCarregando.textContent = `Carregando ${Math.round(progresso * 100)}%`;
            });
            carregando.hidden = true;
            controles.hidden = false;
            canvas.focus();
        } catch (erro) {
            console.warn("Jogo não carregou:", erro);
            sair();
            capa.innerHTML = `<p class="jogo-aviso">Não foi possível carregar o jogo neste navegador.</p>`;
        }
    }

    function sair() {
        if (instancia) instancia.Quit().catch(() => {});
        instancia = null;
        canvas?.remove();
        canvas = null;
        caixa.classList.remove("jogando");
        carregando.hidden = true;
        controles.hidden = true;
        capa.hidden = false;
        barra.style.transform = "scaleX(0)";
    }

    capa.querySelector(".jogo-jogar").addEventListener("click", jogar);
    caixa.addEventListener("click", e => { if (canvas && e.target === canvas) canvas.focus(); });
    controles.addEventListener("click", e => {
        const acao = e.target.closest("button")?.dataset.acao;
        if (acao === "tela-cheia" && instancia) instancia.SetFullscreen(1);
        if (acao === "sair") sair();
    });
});
