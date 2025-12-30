import * as THREE from 'three';
import { World } from './World';
export declare class MiniMap {
    camera: THREE.OrthographicCamera;
    world: World;
    container: HTMLDivElement;
    renderer: THREE.WebGLRenderer;
    markers: THREE.Group;
    playerMarker: THREE.Mesh;
    spawnMarker: THREE.Sprite;
    vehicleMarkers: Map<string, THREE.Mesh>;
    size: number;
    constructor(world: World);
    private createSpawnMarker;
    setSpawnPoint(position: THREE.Vector3): void;
    private createPlayerMarker;
    update(): void;
    private updateVehicleMarkers;
    render(): void;
}
