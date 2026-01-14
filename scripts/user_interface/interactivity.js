// Imports
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.156.1/build/three.module.js';
import {normalizeHeatmap, buildKillsById} from './heatmap_parser.js';
// Exports for User Interface interactions
// Note: accepts optional precomputedKillsById to avoid re-normalizing if main provides it.
export function setupInteractionHandlers(camera, scene, systems, heatmapRaw, precomputedKillsById = null) {
	const raycaster = new THREE.Raycaster();
	const mouse = new THREE.Vector2();
	// Normalize whatever heatmapRaw we were given into an array of bucket-like objects
	const heatmapBuckets = normalizeHeatmap(heatmapRaw);
	// create an id->kills map for fast lookup: prefer precomputed
	const killsById = precomputedKillsById || buildKillsById(heatmapBuckets);
	// Currently displayed label and selection
	let currentSystemLabel = null;
	let currentSelectedSystemId = null;
	// Keep labels registry on scene so scene can update sizes during camera change
	scene.userData = scene.userData || {};
	scene.userData.labels = scene.userData.labels || [];
	// Click events
	window.addEventListener('dblclick', handleDoubleClick);
	window.addEventListener('click', handleGlobalClick);
	// Create a text sprite from a string. Caller should call resizeSpriteToPixels() after adding to scene.
	function createTextSprite(text, options = {}) {
		const fontSize = options.fontSize || 64;
		const padding = options.padding || 12;
		const bg = options.background || 'rgba(0,0,0,0.6)';
		const color = options.color || 'white';
		const lines = String(text).split('\n');
		// Canvas draw
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		ctx.font = `Bold ${fontSize}px Arial`;
		let maxWidth = 0;
		for (const line of lines) {
			const m = ctx.measureText(line).width;
			if (m > maxWidth) maxWidth = m;
		}
		canvas.width = Math.ceil(maxWidth + padding * 2);
		canvas.height = Math.ceil((fontSize * lines.length) + padding * 2);
		ctx.font = `Bold ${fontSize}px Arial`;
		ctx.fillStyle = bg;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		ctx.fillStyle = color;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		const centerX = canvas.width / 2;
		const totalTextHeight = fontSize * lines.length;
		let startY = canvas.height / 2 - totalTextHeight / 2 + fontSize / 2;
		lines.forEach((line, idx) => {
			ctx.fillText(line, centerX, startY + idx * fontSize);
		});
		const texture = new THREE.CanvasTexture(canvas);
		texture.needsUpdate = true;
		const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
		const sprite = new THREE.Sprite(material);
		// store the pixel dimensions for later resizing
		sprite.userData._textPixelSize = { width: canvas.width, height: canvas.height };
		// default scale (caller will set proper world scale)
		sprite.scale.set(1, 1, 1);
		return sprite;
	}
	// Resize a sprite so it appears approximately pixelHeight pixels tall on screen.
	function resizeSpriteToPixels(sprite, cameraRef, pixelHeight = 64) {
		if (!sprite || !sprite.material || !sprite.userData || !sprite.userData._textPixelSize) return;
		// world position and distance
		const spriteWorldPos = new THREE.Vector3();
		sprite.getWorldPosition(spriteWorldPos);
		const distance = cameraRef.position.distanceTo(spriteWorldPos);
		// vertical FOV in radians
		const vFOV = (cameraRef.fov * Math.PI) / 180;
		// visible height (world units) at the sprite's distance
		const visibleHeight = 2 * distance * Math.tan(vFOV / 2);
		// convert desired pixel height to fraction of screen height
		const pixelFraction = pixelHeight / (window.innerHeight || 1);
		// desired world height for the sprite
		const worldHeight = visibleHeight * pixelFraction;
		// texture aspect ratio
		const tex = sprite.material.map;
		const imgW = (tex && tex.image && tex.image.width) ? tex.image.width : 1;
		const imgH = (tex && tex.image && tex.image.height) ? tex.image.height : 1;
		const aspect = imgW / imgH;
		// apply scale so sprite height == worldHeight
		sprite.scale.set(worldHeight * aspect, worldHeight, 1);
	}
	// expose resize helper so scene.js can call it
	window.__resizeSpriteToPixels = resizeSpriteToPixels;
	// Remove label when no longer in view, and unregister it from scene.userData.labels
	function removeCurrentLabel() {
		if (currentSystemLabel && currentSystemLabel.parent) {
			currentSystemLabel.parent.remove(currentSystemLabel);
		}
		// unregister from scene labels registry
		if (scene.userData && Array.isArray(scene.userData.labels)) {
			scene.userData.labels = scene.userData.labels.filter(entry => entry && entry.sprite !== currentSystemLabel);
		}
		currentSystemLabel = null;
		currentSelectedSystemId = null;
	}
	// Helper to find what was clicked
	function getPickedObject(event) {
		mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
		mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
		raycaster.setFromCamera(mouse, camera);
		// Cehck objects from click
		const intersects = raycaster.intersectObjects(scene.children);
		// Check for intersections
		if (!intersects.length) {
			return null;
		}
		// Check through iteration, for what object may have been clicked that might intersect
		for (const inter of intersects) {
			const obj = inter.object;
			// Check for intersections of other objects, i.e. an object that is a system
			if (obj.isMesh && obj.userData && obj.userData.system_id) {
				return {object: obj, type: 'system'};
			}
		}
		// If not picked
		// Check for intersections of other objects, i.e. an object that is a external region
		for (const inter of intersects) {
			const obj = inter.object;
			const ud = obj.userData || {};
			if (ud.region_name) {
				return {object: obj, type: 'region'};
			}
		}
		return null;
	}
	// Double click event for external regions
	function handleDoubleClick(event) {
		const picked = getPickedObject(event);
		// Nothing picked, return
		if (!picked) {
			return;
		}
		// If picked region, external gate to next region
		if (picked.type === 'region') {
			const ud = picked.object.userData || {};
			window.dispatchEvent(new CustomEvent('regionClick', {
				detail: {region_name: ud.region_name}
			}));
			return;
		}
	}
	// Handle clicking for systems
	function handleGlobalClick(event) {
		const picked = getPickedObject(event);
		// Nothing picked, return
		if (!picked) {
			return;
		}
		// Check picked object for system
		if (picked.type === 'system') {
			const systemData = picked.object.userData;
			if (!systemData || !systemData.system_id) {
				return;
			}
			// Remove any labels current for systems
			removeCurrentLabel();
			// Text for sprite
			const baseText = `System: ${systemData.system_name} \n Constellation: ${systemData.constellation_name || ''}`.trim();
			const label = createTextSprite(baseText, { fontSize: 64, padding: 12 });
			const labelOffset = new THREE.Vector3(0, 10, 0);
			// Add to scene
			label.position.copy(picked.object.position).add(labelOffset);
			scene.add(label);
			currentSystemLabel = label;
			currentSelectedSystemId = systemData.system_id;
			// Make it readable: compute an initial desired pixel height and resize
			const desiredPixelHeight = 72; // tweak this value (48..120) to taste
			resizeSpriteToPixels(label, camera, desiredPixelHeight);
			// Register label so scene can update it on camera/controls change
			scene.userData.labels.push({ sprite: label, pixelHeight: desiredPixelHeight });

			// Use normalized killsById lookup
			const k = killsById[systemData.system_id] ?? killsById[systemData.system_name] ?? null;
			// Check for kills
			if (typeof k === 'number') {
				// Remove labels before running a new sprite to screen
				removeCurrentLabel();
				const labelText = `System: ${systemData.system_name} \n Constellation: ${systemData.constellation_name || ''}\nKills: ${k}`;
				const updated = createTextSprite(labelText, { fontSize: 64, padding: 12 });
				updated.position.copy(picked.object.position).add(labelOffset);
				scene.add(updated);
				// resize and register
				const desiredPixelHeight2 = 72;
				resizeSpriteToPixels(updated, camera, desiredPixelHeight2);
				scene.userData.labels.push({ sprite: updated, pixelHeight: desiredPixelHeight2 });

				currentSystemLabel = updated;
				currentSelectedSystemId = systemData.system_id;
			}
		}
	}
}
