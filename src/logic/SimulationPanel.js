import * as THREE from 'three';

export class SimulationPanel {
    constructor(scene, offset, colorHex, dims) {
        this.scene = scene;
        this.offset = new THREE.Vector3(...offset);
        this.color = new THREE.Color(colorHex);
        this.dims = dims;
        
        this.group = new THREE.Group();
        this.scene.add(this.group);
        
        this.boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        this.baseMat = new THREE.MeshLambertMaterial({ 
            color: 0xffffff, transparent: true, opacity: 0.1 
        });
        this.activeMat = new THREE.MeshLambertMaterial({ 
            color: this.color, transparent: true, opacity: 0.8 
        });
        
        this.cells = new Map();
        this.knightMesh = null;
        this.trailPoints = [];
        this.pathHistory = []
        this.trailLine = null;
        this.separation = 0;

        this.initBoard();
    }

    getKey(x, y, z) { return `${x},${y},${z}`; }

    getWorldPos(x, y, z) {
        const yWorld = z * (1 + this.separation);
        const vec = new THREE.Vector3(x, yWorld, y);
        vec.add(this.offset);
        return vec;
    }

    initBoard() {
        // Bersihkan trail lama
        this.group.clear();
        this.cells.clear();
        this.trailPoints = [];
        this.pathHistory = [];

        // Grid
        const [w, l, h] = this.dims;
        for(let x=0; x<w; x++){
            for(let y=0; y<l; y++){
                for(let z=0; z<h; z++){
                    const mesh = new THREE.Mesh(this.boxGeo, this.baseMat.clone());
                    mesh.userData = { gridPos: [x,y,z] };
                    mesh.position.copy(this.getWorldPos(x,y,z));
                    this.group.add(mesh);
                    this.cells.set(this.getKey(x,y,z), mesh);
                }
            }
        }

        // Knight
        const knightGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const knightMat = new THREE.MeshPhongMaterial({ color: 0xffff00, emissive: 0x444400 });
        this.knightMesh = new THREE.Mesh(knightGeo, knightMat);
        this.group.add(this.knightMesh);
        
        // Posisi awal
        this.updateKnightPos(0, 0, 0);

        // Trail line
        const lineGeo = new THREE.BufferGeometry();
        const lineMat = new THREE.LineBasicMaterial({ color: this.color });
        this.trailLine = new THREE.Line(lineGeo, lineMat);
        this.group.add(this.trailLine);
    }

    updateKnightPos(x, y, z) {
        const pos = this.getWorldPos(x, y, z);
        this.knightMesh.position.copy(pos);
    }

    updateSeparation(val) {
        this.separation = val;
        
        this.cells.forEach((mesh, key) => {
            const [x,y,z] = mesh.userData.gridPos;
            mesh.position.copy(this.getWorldPos(x,y,z));
        });
        
        const curr = this.knightMesh.userData.lastLogicPos || [0,0,0];
        this.updateKnightPos(...curr);

        this.trailPoints = this.pathHistory.map(pos => this.getWorldPos(pos[0], pos[1], pos[2]));
        this.updateTrailGeometry();
    }

    update(eventType, pos, step) {
        const [x, y, z] = pos;
        this.knightMesh.userData.lastLogicPos = pos;
        this.updateKnightPos(x, y, z);
        
        const cell = this.cells.get(this.getKey(x, y, z));

        if (eventType === 'move') {
            if(cell) {
                cell.material = this.activeMat;
                cell.scale.set(0.9, 0.9, 0.9);
            }
            this.pathHistory.push([...pos]);
            this.trailPoints.push(this.knightMesh.position.clone());
            this.updateTrailGeometry();
        } 
        else if (eventType === 'revert') {
            if(cell) {
                cell.material = this.baseMat.clone();
                cell.scale.set(1, 1, 1);
            }
            this.pathHistory.pop();
            this.trailPoints.pop();
            this.updateTrailGeometry();
        }
    }

    updateTrailGeometry() {
        if (!this.trailLine) return;
        this.trailLine.geometry.setFromPoints(this.trailPoints);
    }

    reset(startPos = [0, 0, 0]) {
        this.cells.forEach(mesh => {
            mesh.material = this.baseMat.clone();
            mesh.scale.set(1, 1, 1);
        });
        this.trailPoints = [];
        this.pathHistory = [];
        this.updateTrailGeometry();
        this.updateKnightPos(...startPos);
    }
}