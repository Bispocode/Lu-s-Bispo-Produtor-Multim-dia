const container = document.querySelector(".sobre-objeto");
const statusEl = container.querySelector(".objeto-status");
const fallbackEl = container.querySelector(".objeto-fallback");
const MODELO_URL = "eu_comprimido.glb";

const reduzirMovimento = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

function conexaoRuim() {
    const conn =
        navigator.connection ||
        navigator.mozConnection ||
        navigator.webkitConnection;

    if (!conn) return false;

    if (conn.saveData) return true;

    if (conn.effectiveType && /2g/.test(conn.effectiveType)) {
        return true;
    }

    return false;
}

function suportaWebGL() {
    try {
        const canvas = document.createElement("canvas");

        return !!(
            window.WebGLRenderingContext &&
            (
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl")
            )
        );
    } catch (e) {
        return false;
    }
}

function usarFallback(motivo) {
    if (statusEl) {
        if (motivo) {
            statusEl.hidden = false;
            statusEl.textContent =
                "Modelo 3D não carregou: " + motivo;
        } else {
            statusEl.hidden = true;
        }
    }

    if (fallbackEl) {
        fallbackEl.hidden = false;
    }
}

function removerFallback() {
    if (statusEl) {
        statusEl.hidden = true;
        statusEl.style.display = "none";
    }

    if (fallbackEl) {
        fallbackEl.hidden = true;
        fallbackEl.style.display = "none";
    }
}

function mostrarFallback(motivo) {
    if (statusEl) {
        statusEl.hidden = false;
        statusEl.style.display = "";

        if (motivo) {
            statusEl.textContent =
                "Modelo 3D não carregou: " + motivo;
        }
    }

    if (fallbackEl) {
        fallbackEl.hidden = false;
        fallbackEl.style.display = "";
    }
}

erro => {
    console.error("❌ Erro ao carregar modelo:", erro);

    modelo = null;

    diagnosticar(erro).then(motivo => {
        mostrarFallback(motivo);
    });
}
// Investiga as causas mais comuns de falha
async function diagnosticar(erro) {
    if (location.protocol === "file:") {
        return "a página foi aberta direto como arquivo (file://); precisa ser servida por http(s) para o navegador buscar o .glb.";
    }

    if (!navigator.onLine) {
        return "não há conexão com a internet no momento.";
    }

    if (!suportaWebGL()) {
        return "este navegador/dispositivo não suporta WebGL.";
    }

    try {
        const resposta = await fetch(
            MODELO_URL,
            {
                method: "HEAD",
                cache: "no-store"
            }
        );

        if (!resposta.ok) {
            return `o arquivo ${MODELO_URL} respondeu ${resposta.status} (${resposta.statusText}) — verifique se ele existe nesse caminho.`;
        }
    } catch {
        return `não foi possível alcançar ${MODELO_URL} (caminho errado, bloqueio de CORS ou servidor fora do ar).`;
    }

    return (
        erro &&
        (erro.message || String(erro))
    ) || "motivo desconhecido — veja o console para o erro completo.";
}

if (conexaoRuim()) {

    usarFallback(
        "conexão lenta ou modo de economia de dados detectado."
    );

} else if (!suportaWebGL()) {

    usarFallback(
        "este navegador/dispositivo não suporta WebGL."
    );

} else {

    const observer = new IntersectionObserver(
        (entradas, obs) => {

            entradas.forEach(entrada => {

                if (entrada.isIntersecting) {

                    obs.disconnect();

                    iniciar();
                }
            });

        },
        {
            rootMargin: "400px"
        }
    );

    observer.observe(container);
}

async function iniciar() {

    // Evita inicializar mais de uma vez
    if (container.dataset.iniciando === "true") {
        return;
    }

    container.dataset.iniciando = "true";

    try {

        const [
            THREE,
            { GLTFLoader }
        ] = await Promise.all([

            import(
                "https://esm.sh/three@0.179"
            ),

            import(
                "https://esm.sh/three@0.179/examples/jsm/loaders/GLTFLoader"
            )

        ]);

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            40,
            container.clientWidth /
                container.clientHeight,
            0.1,
            100
        );

        camera.position.set(0, 0.60, 8.5);

        const renderer =
            new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });

        renderer.setSize(
            container.clientWidth,
            container.clientHeight
        );

        renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        renderer.outputColorSpace =
            THREE.SRGBColorSpace;

        renderer.toneMapping =
            THREE.ACESFilmicToneMapping;

        renderer.toneMappingExposure = 1.1;

        container.appendChild(
            renderer.domElement
        );

        // ==========================================
        // WEBGL: CONTEXTO PERDIDO
        // ==========================================

        renderer.domElement.addEventListener(
            "webglcontextlost",
            event => {

                event.preventDefault();

                console.warn(
                    "WebGL perdeu o contexto."
                );

                modelo = null;

                usarFallback(
                    "o contexto WebGL foi perdido."
                );
            }
        );

        // ==========================================
        // AMBIENTE
        // ==========================================

        const { RoomEnvironment } =
            await import(
                "https://esm.sh/three@0.179/examples/jsm/environments/RoomEnvironment"
            );

        const pmrem =
            new THREE.PMREMGenerator(renderer);

        scene.environment =
            pmrem.fromScene(
                new RoomEnvironment(),
                0.00
            ).texture;

        pmrem.dispose();

        // ==========================================
        // ILUMINAÇÃO
        // ==========================================

        scene.add(
            new THREE.HemisphereLight(
                0xffe9e2,
                0x5c1420,
                0.7
            )
        );

        const key =
            new THREE.DirectionalLight(
                0xffffff,
                1.8
            );

        key.position.set(4, 5, 6);

        scene.add(key);

        const rim =
            new THREE.DirectionalLight(
                0xff9ab0,
                0.9
            );

        rim.position.set(-5, 1, -4);

        scene.add(rim);

        // ==========================================
        // MATERIAL
        // ==========================================

        const material =
            new THREE.MeshStandardMaterial({
                color: 0xD7263D,
                roughness: 0.5,
                metalness: 0
            });

        let modelo;

        let targetX = 0;
        let targetY = 0;

        let mx = 0;
        let my = 0;

        let gyroX = 0;
        let gyroY = 0;

        // ==========================================
        // CARREGAMENTO DO MODELO
        // ==========================================

        new GLTFLoader().load(

            MODELO_URL,

            gltf => {

                modelo = gltf.scene;

                modelo.traverse(child => {

                    if (!child.isMesh) return;

                    // Recalcula as normais
                    // para suavizar a malha decimada
                    child.geometry.computeVertexNormals();

                    // Mantém o material original
                    // apenas nos olhos
                    if (
                        child.material?.name !==
                        "Material.005"
                    ) {
                        child.material = material;
                    }

                });

                // ==========================================
                // CENTRALIZA E ESCALA
                // ==========================================

                const box =
                    new THREE.Box3()
                        .setFromObject(modelo);

                const center =
                    box.getCenter(
                        new THREE.Vector3()
                    );

                const size =
                    box.getSize(
                        new THREE.Vector3()
                    );

                const maxDim =
                    Math.max(
                        size.x,
                        size.y,
                        size.z
                    );

                modelo.position.sub(center);

                modelo.scale.setScalar(
                    5.4 / maxDim
                );

                scene.add(modelo);

                // ==========================================
                // MODELO CARREGOU
                // REMOVE FALLBACK
                // ==========================================

                if (statusEl) {
                    statusEl.hidden = true;
                }

                if (fallbackEl) {
                    fallbackEl.hidden = true;
                }

                console.log(
                    "Modelo 3D carregado com sucesso."
                );
            },

            undefined,

            erro => {

                console.error(
                    "Erro ao carregar modelo 3D:",
                    erro
                );

                modelo = null;

                diagnosticar(erro)
                    .then(motivo => {

                        usarFallback(motivo);

                    });

            }
        );

        gltf => {
    modelo = gltf.scene;

    modelo.traverse(child => {
        if (!child.isMesh) return;

        child.geometry.computeVertexNormals();

        if (child.material?.name !== "Material.005") {
            child.material = material;
        }
    });

    const box = new THREE.Box3().setFromObject(modelo);

    const center = box.getCenter(
        new THREE.Vector3()
    );

    const size = box.getSize(
        new THREE.Vector3()
    );

    const maxDim = Math.max(
        size.x,
        size.y,
        size.z
    );

    modelo.position.sub(center);

    modelo.scale.setScalar(
        5.4 / maxDim
    );

    scene.add(modelo);

    // =====================================
    // MODELO CARREGOU
    // REMOVE FALLBACK DE VERDADE
    // =====================================

    removerFallback();

    console.log("✅ Modelo 3D carregado.");
},

        // ==========================================
        // MOUSE
        // ==========================================

        window.addEventListener(
            "mousemove",
            e => {

                mx = e.clientX;
                my = e.clientY;

            }
        );

        // ==========================================
        // GIROSCÓPIO
        // ==========================================

        function atualizarGiroscopio(e) {

            gyroX = e.beta || 0;
            gyroY = e.gamma || 0;

        }

        async function ativarGiroscopio() {

            if (
                typeof DeviceOrientationEvent !==
                    "undefined" &&
                typeof DeviceOrientationEvent
                    .requestPermission ===
                    "function"
            ) {

                try {

                    const permissao =
                        await DeviceOrientationEvent
                            .requestPermission();

                    if (
                        permissao === "granted"
                    ) {

                        window.addEventListener(
                            "deviceorientation",
                            atualizarGiroscopio
                        );

                    }

                } catch {
                    // Usuário negou
                    // ou navegador não suporta
                }

            } else {

                window.addEventListener(
                    "deviceorientation",
                    atualizarGiroscopio
                );

            }
        }

        document.body.addEventListener(
            "click",
            ativarGiroscopio,
            {
                once: true
            }
        );

        // ==========================================
        // RESIZE
        // ==========================================

        window.addEventListener(
            "resize",
            () => {

                renderer.setSize(
                    container.clientWidth,
                    container.clientHeight
                );

                camera.aspect =
                    container.clientWidth /
                    container.clientHeight;

                camera.updateProjectionMatrix();

            }
        );

        // ==========================================
        // ANIMAÇÃO
        // ==========================================

        function animate() {

            requestAnimationFrame(
                animate
            );

            if (
                modelo &&
                !reduzirMovimento
            ) {

                const isTouch =
                    window.matchMedia(
                        "(pointer: coarse)"
                    ).matches;

                if (isTouch) {

                    targetY =
                        THREE.MathUtils.degToRad(
                            gyroY
                        ) * 0.4;

                    targetX =
                        THREE.MathUtils.degToRad(
                            gyroX - 45
                        ) * 0.2;

                } else {

                    const nx =
                        (
                            (mx /
                                window.innerWidth) -
                            0.5
                        ) * 2;

                    const ny =
                        (
                            (my /
                                window.innerHeight) -
                            0.5
                        ) * 2;

                    targetY = nx * 0.35;
                    targetX = ny * 0.35;
                }

                // Suavização
                modelo.rotation.y =
                    THREE.MathUtils.lerp(
                        modelo.rotation.y,
                        targetY,
                        0.08
                    );

                modelo.rotation.x =
                    THREE.MathUtils.lerp(
                        modelo.rotation.x,
                        targetX,
                        0.08
                    );

            } else if (modelo) {

                modelo.rotation.y = 0.3;

            }

            renderer.render(
                scene,
                camera
            );
        }

        animate();

        // ==========================================
        // MARCA COMO INICIALIZADO
        // ==========================================

        container.dataset.iniciando =
            "false";

        container.dataset.iniciado =
            "true";

    } catch (erro) {

        console.error(
            "Erro ao inicializar Three.js:",
            erro
        );

        container.dataset.iniciando =
            "false";

        if (!navigator.onLine) {

            usarFallback(
                "sem conexão com a internet para baixar a biblioteca Three.js."
            );

        } else {

            usarFallback(
                "não foi possível carregar a biblioteca Three.js do CDN (esm.sh) — pode estar bloqueada por adblock, firewall ou o serviço está fora do ar."
            );

        }
    }
}