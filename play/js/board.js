import * as THREE from 'three';

export function createBoard(scene) {
    // Création de la table / support du jeu
    const tableGeo = new THREE.BoxGeometry(10, 0.4, 10);
    const tableMat = new THREE.MeshStandardMaterial({ 
        color: 0x2c1d11, // Couleur bois foncé
        roughness: 0.6 
    });
    const table = new THREE.Mesh(tableGeo, tableMat);
    table.position.y = -0.2;
    table.receiveShadow = true;
    scene.add(table);

    // Exemple de grille de jeu centrale (ajuste la taille selon ton gameplay)
    const gridSize = 6;
    const tileSize = 1.2;

    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            const tileGeo = new THREE.BoxGeometry(tileSize - 0.05, 0.1, tileSize - 0.05);
            const tileMat = new THREE.MeshStandardMaterial({
                color: (x + z) % 2 === 0 ? 0xd4b373 : 0xaa7c39, // Alternance style mosaïque andalouse
                roughness: 0.3
            });
            const tile = new THREE.Mesh(tileGeo, tileMat);
            
            // Centrage des tuiles sur la table
            tile.position.set(
                (x - gridSize / 2 + 0.5) * tileSize,
                0.05,
                (z - gridSize / 2 + 0.5) * tileSize
            );
            tile.receiveShadow = true;
            scene.add(tile);
        }
    }
}
