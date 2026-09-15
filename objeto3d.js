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

function usarFallback() {
    if (statusEl) statusEl.hidden = true;
    if (fallbackEl) fallbackEl.hidden = false;
}

if (conexaoRuim() || !suportaWebGL()) {
    usarFallback();
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
        container.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.9));
        const key = new THREE.DirectionalLight(0xffffff, 2.4);
        key.position.set(4, 5, 6);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0xff9ab0, 1.1);
        rim.position.set(-5, 1, -4);
        scene.add(rim);

        const toon = new THREE.MeshStandardMaterial({ color: 0xD7263D, roughness: .55, metalness: 0 });

        let modelo, targetX = 0, targetY = 0, mx = 0, my = 0;

        new GLTFLoader().load(
            "eu.glb",
            (gltf) => {

                modelo = gltf.scene;

               const toon = new THREE.MeshStandardMaterial({
    color: 0xD7263D,
    roughness: 0.3,
    metalness: 0
});

modelo.traverse(child => {
    if (child.isMesh) {

        child.geometry.computeVertexNormals();

        if (child.material?.name !== "Material.005") {
            child.material = toon;
        }
    }
});
                const box = new THREE.Box3().setFromObject(modelo);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);

                modelo.position.sub(center);
                const scale = 5.4 / maxDim;
                modelo.scale.setScalar(scale);

                scene.add(modelo);

                if (statusEl) statusEl.hidden = true;

            },
            undefined,
            (erro) => { console.error(erro); usarFallback(); }
        );

        window.addEventListener("mousemove", (e) => {
            mx = e.clientX; my = e.clientY;
        });

        window.addEventListener("resize", () => {
            renderer.setSize(container.clientWidth, container.clientHeight);
            camera.aspect = container.clientWidth / container.clientHeight;
            camera.updateProjectionMatrix();
        });

        function animate() {
            requestAnimationFrame(animate);

            if (modelo && !reduzirMovimento) {
                const nx = ((mx / window.innerWidth) - 0.5) * 2;
                const ny = ((my / window.innerHeight) - 0.5) * 2;
                targetY = nx * 0.5;
                targetX = ny * 0.25;
                modelo.rotation.y = THREE.MathUtils.lerp(modelo.rotation.y, targetY, .06);
                modelo.rotation.x = THREE.MathUtils.lerp(modelo.rotation.x, targetX, .06);
            } else if (modelo) {
                modelo.rotation.y = 0.3;
            }

            renderer.render(scene, camera);
        }
        animate();

    } catch (erro) {
        console.error(erro);
        usarFallback();
    }

}
