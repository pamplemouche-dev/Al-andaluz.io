import * as THREE from 'three';
import { initScene, animateScene } from './scene.js';
import { createBoard } from './board.js';

const loaderOverlay = document.getElementById('loader-overlay');
const loaderStatus = document.getElementById('loader-status');

function showError(message) {
    document.getElementById('loader-overlay').classList.add('error-mode');
    loaderStatus.innerText = `Erreur : ${message}`;
}

try {
    // 1. Initialiser la scène, la caméra et le renderer
    const { scene, camera, renderer } = initScene();

    // 2. Construire le plateau de jeu
    createBoard(scene);

    // 3. Masquer le loader une fois que tout est prêt
    loaderOverlay.style.opacity = '0';
    setTimeout(() => loaderOverlay.style.display = 'none', 500);

    // 4. Lancer la boucle d'animation
    animateScene(scene, camera, renderer);

} catch (error) {
    console.error("Échec du chargement de Three.js:", error);
    showError("Impossible d'initialiser le moteur 3D. Vérifiez votre navigateur.");
}
