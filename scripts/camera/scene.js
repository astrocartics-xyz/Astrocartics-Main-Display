// Imports
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156.1/build/three.module.js';
import {OrbitControls} from 'https://cdn.jsdelivr.net/npm/three@0.156.1/examples/jsm/controls/OrbitControls.js';
import {CAMERA_SETTINGS, REGION_SETTINGS, STAR_COLORS} from './config.js';
//  Color based on class
function getStarMaterial(spectralClass) {
	// Default white if none presented
	if (!spectralClass) {
		return new THREE.MeshBasicMaterial({color: STAR_COLORS['DEFAULT']});
	}
	// Otherwise, get the letter in class from API
	const mainClass = spectralClass.charAt(0).toUpperCase();
	// Find color, or use default white
	const color = STAR_COLORS[mainClass] || STAR_COLORS['DEFAULT'];
	// Return proper coloring
	return new THREE.MeshBasicMaterial({color});
}
// Text label for next region
function createTextSprite(text) {
	const canvas = document.createElement('canvas');
	const context = canvas.getContext('2d');
	const fontSize = 274;
	// Set canvas size dynamically
	context.font = `Bold ${fontSize}px Arial`;
	const metrics = context.measureText(text);
	const textWidth = metrics.width;
	canvas.width = textWidth + 54;
	canvas.height = fontSize + 64;
	// Redraw with correct size
	context.font = `Bold ${fontSize}px Arial`;
	context.fillStyle = 'rgba(0, 0, 0, 0.6)';
	context.fillRect(0, 0, canvas.width, canvas.height);
	context.fillStyle = 'red';
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	context.fillText(text, canvas.width / 2, canvas.height / 2);
	// Canvas constants
	const texture = new THREE.CanvasTexture(canvas);
	const material = new THREE.SpriteMaterial({ map: texture });
	const sprite = new THREE.Sprite(material);
	// Scale sprite to be visible in scene
	sprite.scale.set(62, 32, 4);
	return sprite;
}
// Coordinates are large, fit to scene
function normalizeCoordinates(systems) {
	if (!systems || systems.length === 0) {
		// Return no-op scaler
		return {
			scaledSystems: [],
			scalePoint: (x,y,z) => new THREE.Vector3(0,0,0)
		};
	}
	// Create box
	const box = new THREE.Box3();
	systems.forEach(sys => {
		box.expandByPoint(new THREE.Vector3(sys.x, sys.y, sys.z));
	});
	// Find center
	const center = new THREE.Vector3();
	box.getCenter(center);
	// Calculate shrink for scene
	const size = box.getSize(new THREE.Vector3());
	const maxDimension = Math.max(size.x, size.y, size.z);
	const scaleFactor = maxDimension > 0 ? REGION_SETTINGS.SCENE_SIZE / maxDimension : 1;
	// Define scaling function for ANY point
	const scalePoint = (x, y, z) => {
		const pos = new THREE.Vector3(x, y, z);
		pos.sub(center).multiplyScalar(scaleFactor);
		return pos;
	};
	// Create new list
	const scaledSystems = systems.map(sys => {
		return {
			...sys,
			scaledPosition: scalePoint(sys.x, sys.y, sys.z)
		};
	});
	// Return scaledSystems and scalePoint so setupScene can use it
	return {scaledSystems, scalePoint};
}
// Scene setup for export
export function setupScene(systemData, stargateData) {
	// Get container for scene
	const container = document.getElementById('scene-container');
	// Clear scene container
	container.innerHTML = '';
	// Render scene with webgl
	const renderer = new THREE.WebGLRenderer({antialias: true});
	renderer.setSize(window.innerWidth, window.innerHeight); // Size
	renderer.setPixelRatio(window.devicePixelRatio); // Sharpness
	container.appendChild(renderer.domElement); // Add to cleared container
	// Set scene
	const scene = new THREE.Scene();
	scene.background = new THREE.Color(REGION_SETTINGS.BG_COLOR);
	// Ensure we have a labels registry so labels can be resized by controls/onResize
	scene.userData = scene.userData || {};
	scene.userData.labels = scene.userData.labels || [];
	// Set camera
	const camera = new THREE.PerspectiveCamera(
		CAMERA_SETTINGS.FOV,
		window.innerWidth / window.innerHeight,
		CAMERA_SETTINGS.NEAR,
		CAMERA_SETTINGS.FAR
	);
    	// Set camera position
	camera.position.set(0, 0, CAMERA_SETTINGS.START_Z);
	// Mouse controls
	const controls = new OrbitControls(camera, renderer.domElement);
	controls.enableDamping = true; // Smooth movement
	controls.dampingFactor = 0.05;
	// When controls change (zoom/pan/rotate), resize any registered labels so they stay readable
	controls.addEventListener('change', () => {
		const labels = scene.userData && scene.userData.labels;
		if (labels && labels.length) {
			for (let i = 0; i < labels.length; i++) {
				const entry = labels[i];
				if (entry && entry.sprite && typeof window.__resizeSpriteToPixels === 'function') {
					window.__resizeSpriteToPixels(entry.sprite, camera, entry.pixelHeight);
				}
			}
		}
	});
	// Ambient lighting for background
	const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
	scene.add(ambientLight);
	// Build scene coordinates for system
	const {scaledSystems, scalePoint} = normalizeCoordinates(systemData);
	const systemLookup = new Map();
	// Build stars
	const starGeometry = new THREE.SphereGeometry(REGION_SETTINGS.STAR_SIZE, 8, 8); // Simple sphere
	// Geometry used for picking (scaled by PICK_SCALE from config)
	const pickGeometry = new THREE.SphereGeometry(REGION_SETTINGS.STAR_SIZE * (REGION_SETTINGS.PICK_SCALE || 2.5), 8, 8);
	// Invisible pick material (still raycastable)
	const pickMaterial = new THREE.MeshBasicMaterial({color: 0x000000, transparent: true, opacity: 0, depthWrite: false});
	// Scaling for each star and information associated
	scaledSystems.forEach(system => {
		const material = getStarMaterial(system.spectral_class);
		const star = new THREE.Mesh(starGeometry, material);
		star.position.copy(system.scaledPosition);
		// Save original color
		system.originalColor = material.color.getHex();
		// Attach system metadata for interactivity (system objects are pickable)
		star.userData = system;
		scene.add(star);
		systemLookup.set(system.system_id, star);
		// Add a slightly larger invisible hit mesh for easier clicking.
		const hitMesh = new THREE.Mesh(pickGeometry, pickMaterial);
		hitMesh.position.copy(system.scaledPosition);
		hitMesh.userData = system; // same metadata
		hitMesh.frustumCulled = false;
		scene.add(hitMesh);
	});
	// Stargate lines
	if (stargateData && stargateData.length > 0) {
		// Separate arrays for internal (blue) and external (orange) connections
		const internalLinePoints = [];
		const externalLinePoints = [];
		// Run through the stargate data
		stargateData.forEach(gate => {
			const startNode = systemLookup.get(gate.system_id);
			// Check for gates and information
			if (gate.is_external && gate.destination_info) {
				// Handle External Gate (ORANGE)
				if (startNode) {
					// Calculate external position
					const destInfo = gate.destination_info;
					// Use scalePoint to find where the text label is
					const endPos = scalePoint(
						Number(destInfo.x),
						Number(destInfo.y),
						Number(destInfo.z)
					);
					// Add to external lines list
					externalLinePoints.push(startNode.position);
					externalLinePoints.push(endPos);
					// Create text label for region name
					const label = createTextSprite(destInfo.region_name || 'Unknown Region');
					label.position.copy(endPos);
					// Size using centralized config so gate & system labels match
					const gateLabelPixelHeight = REGION_SETTINGS.LABEL_PIXEL_HEIGHT || 72;
					if (typeof window.__resizeSpriteToPixels === 'function') {
						window.__resizeSpriteToPixels(label, camera, gateLabelPixelHeight);
					} else {
						const tex = label.material.map;
						if (tex && tex.image && tex.image.width && tex.image.height) {
							const aspect = (tex.image.width || 1) / (tex.image.height || 1);
							label.scale.set(gateLabelPixelHeight * aspect, gateLabelPixelHeight, 1);
						} else {
							label.scale.set(gateLabelPixelHeight * 1.5, gateLabelPixelHeight, 1);
						}
					}
					// Register label so it will be resized by controls/onResize
					scene.userData.labels.push({sprite: label, pixelHeight: gateLabelPixelHeight});
					// Render on top and make raycasting easier
					label.renderOrder = 999;
					label.material.depthTest = false;
					// Attach region metadata so interactions can detect it
					label.userData = {
						region_name: destInfo.region_name || 'Unknown Region'
					};
					scene.add(label);
				}
			} else {
				// Handle Internal Gate (BLUE)
				const endNode = systemLookup.get(gate.destination_system_id);
				if (startNode && endNode) {
					internalLinePoints.push(startNode.position);
					internalLinePoints.push(endNode.position);
				}
			}
		});
		// Draw Internal Connections (Blue)
		if (internalLinePoints.length > 0) {
			const internalGeometry = new THREE.BufferGeometry().setFromPoints(internalLinePoints);
			const internalMaterial = new THREE.LineBasicMaterial({
				color: 0x444488,
				opacity: REGION_SETTINGS.GATE_OPACITY,
				transparent: true,
				blending: THREE.AdditiveBlending
			});
			scene.add(new THREE.LineSegments(internalGeometry, internalMaterial));
		}
		// Draw External Connections (Orange)
		if (externalLinePoints.length > 0) {
			const externalGeometry = new THREE.BufferGeometry().setFromPoints(externalLinePoints);
			const externalMaterial = new THREE.LineBasicMaterial({
				color: 0xFFA500, // Orange color for regional gates
				opacity: 0.8, // Slightly more opaque
				transparent: true,
				blending: THREE.AdditiveBlending
			});
			scene.add(new THREE.LineSegments(externalGeometry, externalMaterial));
		}
	}
	// Window resizing for mobile friendliness
	const onResize = () => {
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
		renderer.setSize(window.innerWidth, window.innerHeight);
		// Also resize labels so they maintain pixel height after viewport change
		const labels = scene.userData && scene.userData.labels;
		if (labels && labels.length && typeof window.__resizeSpriteToPixels === 'function') {
			for (let i = 0; i < labels.length; i++) {
				const entry = labels[i];
				if (entry && entry.sprite) window.__resizeSpriteToPixels(entry.sprite, camera, entry.pixelHeight);
			}
		}
	};
	// Check event
	window.addEventListener('resize', onResize);
	// Local variable declaration
	let animationId;
	// Run animation loop
	const animate = () => {
		animationId = requestAnimationFrame(animate);
		controls.update();
		renderer.render(scene, camera);
	};
	// Start animation
	animate();
	// Clean up scene when loading new region
	const cleanup = () => {
		window.removeEventListener('resize', onResize);
		cancelAnimationFrame(animationId);
		renderer.dispose();
		container.innerHTML = '';
	};
	// Return everything for our scene view
	return {scene, camera, renderer, cleanup};
}
