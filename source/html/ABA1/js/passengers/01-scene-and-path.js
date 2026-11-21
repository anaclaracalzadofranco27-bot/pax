
// ============================================================================
// PASSAGEIROS (viajante, senhor e mãe com bebê) caminhando na passarela de embarque.
// Mesmo código e animação do arquivo do manequim; a câmera 3D foi enquadrada na passarela do SVG.
// ============================================================================
const PAX_START = 0.5;                        // segundos da linha do tempo em que o primeiro passageiro começa a andar
let paxLastTick = performance.now();
function PAX_TIMELINE() { return time + (playing ? Math.min(0.1, (performance.now() - paxLastTick) / 1000) : 0); }
(() => {
        // ============================================================================
        // CENA 3D E MAPEAMENTO EXATO SOBRE O VETOR DA RAMPA (A → z → y → x)
        // ============================================================================
        // Camada 3D sobre a passarela do avião: o canvas cobre só o retângulo AV do SVG (unidades do viewBox), para renderizar nítido com o zoom.
        // K = unidades do SVG por unidade do mundo. 17.94 dá a mesma proporção boneco/piso do arquivo do manequim; aqui os passageiros ficam 2x maiores,
        // mais perto do tamanho dos passageiros sentados na cabine (maior que isso, a cabeça passaria da borda de cima da passarela).
        const PAX_SCALE = 2.0;
        const PAX_DY = 7.5; // o caminho desce um pouco no piso (unidades do SVG), para a cabeça dos bonecos maiores não passar da borda de cima da passarela
        const AV = { x0: 185, y0: 455, w: 175, h: 190, K: 17.94 * PAX_SCALE, ZOOM: 2.35 };
        const container = document.getElementById('pax-layer');
        const scene = new THREE.Scene();

        const SVG_W = AV.w;
        const SVG_H = AV.h;
        const ASPECT = SVG_W / SVG_H;
        const FRUSTUM_H = AV.h / AV.K;
        const FRUSTUM_W = FRUSTUM_H * ASPECT;

        const camera = new THREE.OrthographicCamera(
            -FRUSTUM_W / 2, FRUSTUM_W / 2,
             FRUSTUM_H / 2, -FRUSTUM_H / 2,
             0.1, 100
        );
        camera.position.set(10, 7.2, 10);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(4, (window.devicePixelRatio || 1) * AV.ZOOM));   // resolução para o zoom inicial (2.35x), limitada a 4x
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.BasicShadowMap;   // sombra do chão com borda dura (cel shading)
        container.appendChild(renderer.domElement);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 0.92);
        hemiLight.position.set(0, 12, 0);
        scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.80);
        dirLight.position.set(5, 13, 7);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 35;
        const d = 8.5;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
        scene.add(dirLight);

        const shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(40, 40),
            new THREE.ShadowMaterial({ opacity: 0.22 })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.receiveShadow = true;
        scene.add(shadowPlane);

        const START_ANGLE = -Math.PI * 0.50;
        const END_ANGLE = 0.0;
        const TURN_DELTA = END_ANGLE - START_ANGLE;

        const raycaster = new THREE.Raycaster();
        const groundMathPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        function svgToWorldOnGround(svgX, svgY) {
            const ndcX = ((svgX - AV.x0) / SVG_W) * 2 - 1;
            const ndcY = -((svgY - AV.y0) / SVG_H) * 2 + 1;
            raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera);
            const target = new THREE.Vector3();
            raycaster.ray.intersectPlane(groundMathPlane, target);
            return target;
        }

        // pontos do caminho no piso da passarela (coordenadas do SVG do avião), x perto da porta da aeronave.
        // A fica logo depois do poste do pórtico, do lado da passarela: os bonecos são mais altos que a abertura do pórtico,
        // então não começam dentro dele (a cabeça passaria por cima da viga). Eles surgem ali com um dissolve curto (PAX_FADE).
        const PT_A = svgToWorldOnGround(312.0, 607.7 + PAX_DY);
        const PT_Z = svgToWorldOnGround(286.5, 591.1 + PAX_DY);
        const PT_Y = svgToWorldOnGround(252.2, 568.7 + PAX_DY);
        const PT_X = svgToWorldOnGround(219.8, 547.5 + PAX_DY);

        const LEN_AZ = PT_A.distanceTo(PT_Z);
        const LEN_ZY = PT_Z.distanceTo(PT_Y);
        const LEN_YX = PT_Y.distanceTo(PT_X);
        const TOTAL_PATH_LEN = LEN_AZ + LEN_ZY + LEN_YX;

        function getPathWorldPosition(dist) {
            const clamped = Math.max(0, Math.min(TOTAL_PATH_LEN, dist));
            if (clamped <= LEN_AZ) {
                return new THREE.Vector3().lerpVectors(PT_A, PT_Z, clamped / LEN_AZ);
            } else if (clamped <= LEN_AZ + LEN_ZY) {
                return new THREE.Vector3().lerpVectors(PT_Z, PT_Y, (clamped - LEN_AZ) / LEN_ZY);
            } else {
                return new THREE.Vector3().lerpVectors(PT_Y, PT_X, (clamped - LEN_AZ - LEN_ZY) / LEN_YX);
            }
        }

        // Material de manta ainda utilizado pelo modelo ativo do bebê.
        const swaddleBlueMat = new THREE.MeshStandardMaterial({ color: 0xc2d5e3, roughness: 0.72, metalness: 0.0 });
