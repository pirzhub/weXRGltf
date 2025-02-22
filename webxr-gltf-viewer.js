import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let scene, camera, renderer, controller, reticle;

init();

function init() {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    document.body.appendChild(renderer.domElement);
    document.body.appendChild(ARButton.createButton(renderer));

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);
    scene.add(camera);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    scene.add(light);

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    createReticle();
    createFileInput();
    animate();
}

function createReticle() {
    const geometry = new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    reticle = new THREE.Mesh(geometry, material);
    reticle.visible = false;
    scene.add(reticle);
}

function createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.glb,.gltf';
    input.style.position = 'absolute';
    input.style.top = '10px';
    input.style.left = '10px';
    document.body.appendChild(input);
    input.addEventListener('change', handleFile);
}

function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = function () {
            const loader = new GLTFLoader();
            loader.parse(reader.result, '', (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.5, 0.5, 0.5);
                model.userData.selectable = true;
                model.visible = false;
                scene.add(model);
                reticle.userData.model = model;
            });
        };
    }
}

function onSelect() {
    if (reticle.visible && reticle.userData.model) {
        const model = reticle.userData.model;
        model.position.set(reticle.position.x, reticle.position.y, reticle.position.z);
        model.visible = true;
    }
}

function animate() {
    renderer.setAnimationLoop(() => {
        if (renderer.xr.isPresenting) {
            const session = renderer.xr.getSession();
            session.requestReferenceSpace('local').then((space) => {
                session.requestHitTestSource({ space }).then((hitTestSource) => {
                    const frame = renderer.xr.getFrame();
                    if (frame) {
                        const hitTestResults = frame.getHitTestResults(hitTestSource);
                        if (hitTestResults.length > 0) {
                            const hit = hitTestResults[0];
                            const pose = hit.getPose(space);
                            reticle.visible = true;
                            reticle.position.set(pose.transform.position.x, pose.transform.position.y, pose.transform.position.z);
                        } else {
                            reticle.visible = false;
                        }
                    }
                });
            });
        }
        renderer.render(scene, camera);
    });
}
