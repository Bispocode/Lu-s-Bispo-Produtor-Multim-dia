const container = document.querySelector(".sobre-objeto");
const statusEl = container.querySelector(".objeto-status");
const fallbackEl = container.querySelector(".objeto-fallback");

const reduzirMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function conexaoRuim() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return false;
    if (conn.saveData) return true;
    if (conn.effectiveType && /2g/.test(conn.effectiveType)) return true;
    return false;
}

function suportaWebGL() {
    try {
        const canvas = document.createElement("canvas");
        return !!(window.WebGLRenderingContext &&
            (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")));
    } catch (e) { return false; }
}

function usarFallback(motivo) {
    if (statusEl) {
        if (motivo) {
            statusEl.hidden = false;
            statusEl.textContent = "Modelo 3D não carregou: " + motivo;
        } else {
            statusEl.hidden = true;
        }
    }
    if (fallbackEl) fallbackEl.hidden = false;
}

// Investiga as causas mais comuns de falha e devolve uma frase legível
async function diagnosticar(erro) {

    if (location.protocol === "file:")
        return "a página foi aberta direto como arquivo (file://); precisa ser servida por http(s) para o navegador buscar o .glb.";

    if (!navigator.onLine)
        return "não há conexão com a internet no momento.";

    if (!suportaWebGL())
        return "este navegador/dispositivo não suporta WebGL.";

    try {
        const resposta = await fetch("assets/eu_comprimido.glb", { method: "HEAD", cache: "no-store" });
        if (!resposta.ok)
            return `o arquivo assets/eu.glb respondeu ${resposta.status} (${resposta.statusText}) — verifique se ele existe nesse caminho.`;
    } catch {
        return "não foi possível alcançar assets/eu.glb (caminho errado, bloqueio de CORS ou servidor fora do ar).";
    }

    return (erro && (erro.message || String(erro))) || "motivo desconhecido — veja o console para o erro completo.";
}

if (conexaoRuim()) {
    usarFallback("conexão lenta ou modo de economia de dados detectado.");
} else if (!suportaWebGL()) {
    usarFallback("este navegador/dispositivo não suporta WebGL.");
} else {

    const observer = new IntersectionObserver((entradas, obs) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                obs.disconnect();
                iniciar();
            }
        });
    }, { rootMargin: "400px" });

    observer.observe(container);

}

async function iniciar() {

    try {

        const [THREE, { GLTFLoader }] = await Promise.all([
            import("https://esm.sh/three@0.179"),
            import("https://esm.sh/three@0.179/examples/jsm/loaders/GLTFLoader")
        ]);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            40, container.clientWidth / container.clientHeight, 0.1, 100
        );
        camera.position.set(0, 0.2, 8.5);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;
        container.appendChild(renderer.domElement);

        // Ambiente para reflexos/realces suaves (aproxima do Solid Shading do Blender)
        const { RoomEnvironment } = await import("https://esm.sh/three@0.179/examples/jsm/environments/RoomEnvironment");
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        pmrem.dispose();

        scene.add(new THREE.HemisphereLight(0xffe9e2, 0x5c1420, 0.7));
        const key = new THREE.DirectionalLight(0xffffff, 1.8);
        key.position.set(4, 5, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xff9ab0, 0.9);
        rim.position.set(-5,
