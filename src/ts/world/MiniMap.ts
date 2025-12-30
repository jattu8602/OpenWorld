import * as THREE from 'three';
import type { World } from './World';

export class MiniMap {
    public camera: THREE.OrthographicCamera;
    public world: World;
    public container: HTMLDivElement;
    public renderer: THREE.WebGLRenderer;
    public markers: THREE.Group;
    public playerMarker: THREE.Mesh;
    public spawnMarker: THREE.Sprite;
    public vehicleMarkers: Map<string, THREE.Mesh> = new Map();
    public size: number = 200;

    constructor(world: World) {
        this.world = world;

        // Create Container
        this.container = document.createElement('div');
        this.container.id = 'mini-map-container';
        document.body.appendChild(this.container);

        // Create Renderer
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.size, this.size);
        this.container.appendChild(this.renderer.domElement);

        // Create Camera
        const aspect = 1;
        const d = 20; // Zoomed in
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
        this.camera.position.set(0, 100, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 0, -1);

        // Layers
        this.camera.layers.enable(1); // Enable layer 1 for markers

        // Markers Group
        this.markers = new THREE.Group();
        this.world.graphicsWorld.add(this.markers);

        this.createSpawnMarker();
        this.createPlayerMarker();
    }

    private createSpawnMarker(): void {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(0, 0, 0, 0)';
        ctx.fillRect(0, 0, 512, 256);
        ctx.font = 'Bold 120px Arial';
        ctx.fillStyle = '#ffcc00';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 10;
        ctx.fillText('SPAWN', 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        this.spawnMarker = new THREE.Sprite(material);
        this.spawnMarker.position.set(0, 10, 0); // Default spawn
        this.spawnMarker.scale.set(15, 7.5, 1);
        this.spawnMarker.layers.set(1);
        this.markers.add(this.spawnMarker);
    }

    public setSpawnPoint(position: THREE.Vector3): void {
        this.spawnMarker.position.copy(position);
        this.spawnMarker.position.y += 10; // Elevate slightly for visibility
    }

    private createPlayerMarker(): void {
        const geometry = new THREE.ConeGeometry(1, 4, 3);
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
        this.playerMarker = new THREE.Mesh(geometry, material);
        this.playerMarker.rotation.x = Math.PI / 2;
        this.playerMarker.scale.set(1.5, 1.5, 1.5);
        this.playerMarker.layers.set(1);
        this.markers.add(this.playerMarker);
    }

    public update(): void {
        const target = this.world.inputManager.inputReceiver;
        if (target) {
            const worldPos = new THREE.Vector3();
            const worldQuat = new THREE.Quaternion();

            // Get world position/rotation regardless of parenting
            if ((target as any).getWorldPosition) {
                (target as any).getWorldPosition(worldPos);
                (target as any).getWorldQuaternion(worldQuat);
            } else if ((target as any).target) {
                // For CameraOperator
                worldPos.copy((target as any).target);
                const dir = new THREE.Vector3();
                this.world.camera.getWorldDirection(dir);
                worldQuat.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
            }

            if (worldPos) {
                this.camera.position.x = worldPos.x;
                this.camera.position.z = worldPos.z;

                // Track player marker at player world position
                this.playerMarker.position.set(worldPos.x, 20, worldPos.z);

                // Get camera direction for map rotation
                const camDir = new THREE.Vector3();
                this.world.camera.getWorldDirection(camDir);
                camDir.y = 0;
                camDir.normalize();

                // Set camera UP to camera forward direction (for rotation)
                this.camera.up.copy(camDir);
                this.camera.lookAt(worldPos.x, 0, worldPos.z);

                // Rotate player arrow to match player's world orientation
                const euler = new THREE.Euler().setFromQuaternion(worldQuat);
                this.playerMarker.rotation.set(Math.PI / 2, -euler.y, 0);
            }
        }

        this.updateVehicleMarkers();
        this.render();
    }

    private updateVehicleMarkers(): void {
        const seenVehicles = new Set<string>();

        this.world.vehicles.forEach(vehicle => {
            const id = (vehicle as any).uuid || (vehicle as any).id;
            seenVehicles.add(id);

            let marker = this.vehicleMarkers.get(id);
            if (!marker) {
                const geometry = new THREE.BoxGeometry(2, 1, 4);
                const material = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
                marker = new THREE.Mesh(geometry, material);
                marker.layers.set(1);
                this.markers.add(marker);
                this.vehicleMarkers.set(id, marker);
            }

            const vPos = new THREE.Vector3();
            const vQuat = new THREE.Quaternion();
            vehicle.getWorldPosition(vPos);
            vehicle.getWorldQuaternion(vQuat);

            marker.position.set(vPos.x, 15, vPos.z);
            marker.quaternion.copy(vQuat);
            marker.rotation.x = 0;
        });

        this.vehicleMarkers.forEach((marker, id) => {
            if (!seenVehicles.has(id)) {
                this.markers.remove(marker);
                this.vehicleMarkers.delete(id);
            }
        });
    }

    public render(): void {
        this.renderer.render(this.world.graphicsWorld, this.camera);
    }
}
