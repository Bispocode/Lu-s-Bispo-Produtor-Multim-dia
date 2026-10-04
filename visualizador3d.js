// ===== Visualizador 3D das páginas de projeto =====
// Mostra um modelo .glb que a pessoa gira arrastando (ou com o dedo).
// Uso: <div class="visualizador3d" data-modelo3d="caminho/modelo.glb"> <img ...> </div>
//   A <img> dentro do bloco é a imagem de reserva: aparece enquanto o modelo carrega
//   e continua se o navegador não tiver WebGL, a conexão estiver lenta ou algo falhar.
// Atributos opcionais:
//   data-cor="#d9d9d9"     cor do material (o modelo é mostrado em uma cor só)
//   data-rotacao-y="90"    gira o modelo (graus) para ele começar de frente
//   data-distancia="1.6"   distância da câmera (maior = modelo menor)

const THREE_URL = "https://esm.sh/three@0.179";
const reduzMovimento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function podeCarregar() {
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g/.test(conn.effectiveType || ""))) return false;
    try {
        const c = document.createElement("canvas");
        return !!(c.getContext("webgl2") || c.getContext("webgl"));
    } catch (e) { return false; }
}

let bibliotecas = null;
function carregarBibliotecas() {
    bibliotecas ??= Promise.all([
        import(THREE_URL),
        import(`${THREE_URL}/examples/jsm/loaders/GLTFLoader`),
        import(`${THREE_URL}/examples/jsm/controls/OrbitControls`),
        import(`${THREE_URL}/examples/jsm/environments/RoomEnvironment`)
    ]);
    return bibliotecas;
}

async function montar(caixa) {
    const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }] = await carregarBibliotecas();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const cena = new THREE.Scene();
    cena.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
    cena.environmentIntensity = 0.45;

    // luz principal de cima e de lado, para o relevo da escultura aparecer no escuro
    const chave = new THREE.DirectionalLight(0xffffff, 2.4);
    chave.position.set(-2, 3, 2.5);
    cena.add(chave);
    const recorte = new THREE.DirectionalLight(0xffffff, 1.2);
    recorte.position.set(2.5, 1, -2);
    cena.add(recorte);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);

    const gltf = await new GLTFLoader().loadAsync(caixa.dataset.modelo3d);
    const modelo = gltf.scene;

    const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(caixa.dataset.cor || "#d9d9d9"),
        roughness: 0.55,
        metalness: 0
    });
    modelo.traverse(o => {
        if (!o.isMesh) return;
        // modelos exportados sem normais (para ficarem leves) ganham normais suaves aqui
        if (!o.geometry.attributes.normal) o.geometry.computeVertexNormals();
        o.material = material;
    });

    // centraliza e normaliza o tamanho do modelo
    const grupo = new THREE.Group();
    grupo.add(modelo);
    const caixaModelo = new THREE.Box3().setFromObject(modelo);
    const centro = caixaModelo.getCenter(new THREE.Vector3());
    const tamanho = caixaModelo.getSize(new THREE.Vector3()).length();
    modelo.position.sub(centro);
    grupo.scale.setScalar(1 / tamanho);
    grupo.rotation.y = THREE.MathUtils.degToRad(parseFloat(caixa.dataset.rotacaoY || "0"));
    cena.add(grupo);

    camera.position.set(0, 0, parseFloat(caixa.dataset.distancia || "1.6"));

    const controles = new OrbitControls(camera, renderer.domElement);
    controles.enableDamping = true;
    controles.enablePan = false;
    controles.minDistance = 0.6;
    controles.maxDistance = 3;
    controles.autoRotate = !reduzMovimento;
    controles.autoRotateSpeed = 1.2;

    // volta a girar sozinho alguns segundos depois que a pessoa solta
    let pausa;
    controles.addEventListener("start", () => { controles.autoRotate = false; clearTimeout(pausa); caixa.classList.add("mexeu"); });
    controles.addEventListener("end", () => { if (!reduzMovimento) pausa = setTimeout(() => controles.autoRotate = true, 4000); });

    caixa.appendChild(renderer.domElement);

    const ajustar = () => {
        const { clientWidth: w, clientHeight: h } = caixa;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    };
    new ResizeObserver(ajustar).observe(caixa);
    ajustar();

    // só desenha enquanto está na tela
    let visivel = true;
    new IntersectionObserver(([e]) => { visivel = e.isIntersecting; }).observe(caixa);
    renderer.setAnimationLoop(() => {
        if (!visivel) return;
        controles.update();
        renderer.render(cena, camera);
    });

    caixa.classList.add("carregado");
}

document.querySelectorAll("[data-modelo3d]").forEach(caixa => {
    if (!podeCarregar()) return;
    // começa a carregar um pouco antes de aparecer na tela
    const obs = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        obs.disconnect();
        caixa.classList.add("carregando");
        montar(caixa).catch(erro => {
            console.warn("Modelo 3D não carregou:", erro);
            caixa.classList.remove("carregando");
        });
    }, { rootMargin: "400px 0px" });
    obs.observe(caixa);
});
