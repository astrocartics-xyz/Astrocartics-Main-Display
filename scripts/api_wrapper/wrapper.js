// Imports
import {kSpaceRegionsData} from './regions/known-space.js';
import {jSpaceRegionsData} from './regions/unknown-space.js';
// API Wrapper
class AstroApi {
	// Construct base url
	constructor() {
		this.baseUrl = 'https://api.astrocartics.xyz/v1';
	}
	// Unwrap any objects
	_normalizeApiResult(result) {
		return Array.isArray(result) ? (result[0] || null) : result;
	}
	// Endpoint fetcher
	async fetch(endpoint) {
		try {
			const response = await fetch(`${this.baseUrl}${endpoint}`);
			// Throw if not ok
			if (!response.ok) {
				throw new Error(`HTTP Status: ${response.status}`);
			}
			// Return the goods
			return await response.json();
		} catch (error) {
			console.warn(`Error: ${endpoint}:`, error);
			return null;
		}
	}
	// Stargates by Region
	async getStargatesForRegion(regionId) {
		return this.fetch(`/regions/${regionId}/stargates`);
	}
	// Stargates by System
	async getStargatesForSystem(systemId) {
		return this.fetch(`/systems/${systemId}/stargates`);
	}
	// Systems by Region
	async getSystemsForRegion(regionId) {
		return this.fetch(`/regions/${regionId}/systems`);
	}
	// Systems by Id
	async getSystemsForId(systemId) {
		return this.fetch(`/systems/${systemId}`);
	}
	// Constellation by Id
	async getConstellationForId(constellationId) {
		return this.fetch(`/constellations/${constellationId}`);
	}
	// Region by Id
	async getRegionsForId(regionId) {
		return this.fetch(`/regions/${regionId}`);
	}
	// Top Regions
	async getTopRegions() {
		return this.fetch(`/rankings/regions/top?mode=hour`);
	}
	// Top Systems
	async getTopSystems() {
		return this.fetch(`/rankings/systems/top?mode=hour`);
	}
	// Top Constellations
	async getTopConstellations() {
		return this.fetch(`/rankings/constellations/top?mode=hour`);
	}
	// System Summary
	async getSystemSummaryForId(systemId) {
		return this.fetch(`/systems/${systemId}/kills/summary?mode=hour`);
	}
	// Constellation Summary
	async getConstellationSummaryForId(constellationId) {
		return this.fetch(`/constellations/${constellationId}/kills/summary?mode=hour`);
	}
	// Region Summary
	async getRegionSummaryForId(regionId) {
		return this.fetch(`/regions/${regionId}/kills/summary?mode=hour`);
	}
	// Heatmap Summary
	async getRegionHeatmapForId(regionId) {
		return this.fetch(`/regions/${regionId}/heatmap?mode=hour`);
	}
	// Fetch single region data
	async fetchRegion(region) {
		// Fetch systems for the region
		const systems = await this.getSystemsForRegion(region.region_id);
		// If none exist, return empty list
		if (!systems) {
			return [];
		}
		// Get unique constellation IDs from the systems list
		// Be tolerant of different API shapes to prevent breaking changes (constellation_id, constellationId, nested object, etc.)
		const constellationIds = new Set();
		systems.forEach(s => {
			const cId =
				s.constellation_id ??
				s.constellationId ??
				(s.constellation && (s.constellation.id ?? s.constellation.constellation_id)) ??
				null;
			if (cId) constellationIds.add(cId);
		});
		const constellationMap = {};
		// Fetch them in parallel
		await Promise.all(Array.from(constellationIds).map(async (cId) => {
			try {
				const rawCData = await this.getConstellationForId(cId);
				const cData = this._normalizeApiResult(rawCData);
				if (cData) {
					// Prefer API's constellation_name
					constellationMap[cId] = cData.constellation_name ?? cData.name ?? cData.constellationName ?? null;
				}
			} catch (e) {
				console.warn(`Failed to fetch constellation ${cId}`, e);
			}
		}));
		// Fetch stargates for the region
		const stargates = await this.getStargatesForRegion(region.region_id);
		// Create a Set of local system IDs for quick lookup
		const localSystemIds = new Set(systems.map(s => s.system_id));
		// Map to store stargates by their source system_id
		const stargateMap = {};
		// Set to track external system IDs we need to fetch info for
		const externalSystemIds = new Set();
		// Working with stargates
		if (stargates) {
			for (const gate of stargates) {
				// Initialize array for system if needed
				if (!stargateMap[gate.system_id]) {
					stargateMap[gate.system_id] = [];
				}
				// Identify destination ID
				const destId = gate.destination?.system_id || gate.destination_system_id;
				// Add gate to map, preserving original data + temp destId
				stargateMap[gate.system_id].push({
					...gate,
					_destId: destId
				});
				// Check if destination is outside the current region
				if (destId && !localSystemIds.has(destId)) {
					externalSystemIds.add(destId);
				}
			}
		}
		// Fetch external destinations
		const externalDestinations = {};
		// Create fetch tasks for all external systems found
		const externalTasks = Array.from(externalSystemIds).map(async (sysId) => {
			try {
				// Get destination system info
				const sysInfoRaw = await this.getSystemsForId(sysId);
				const sysInfo = this._normalizeApiResult(sysInfoRaw);
				if (sysInfo) {
					// Region name
					let regionName = 'Unknown Region';
					if (sysInfo.region_id) {
						const regionInfoRaw = await this.getRegionsForId(sysInfo.region_id);
						const regionInfo = this._normalizeApiResult(regionInfoRaw);
						if (regionInfo) {
							regionName = regionInfo.name ?? regionInfo.region_name ?? regionName;
						}
					}
					// Constellation name
					let constName = 'Unknown Constellation';
					if (sysInfo.constellation_id) {
						const cDataRaw = await this.getConstellationForId(sysInfo.constellation_id);
						const cData = this._normalizeApiResult(cDataRaw);
						if (cData) {
							constName = cData.constellation_name ?? cData.name ?? constName;
						}
					}
					// external destinations put together
					externalDestinations[sysId] = {
						system_name: sysInfo.name,
						region_name: regionName,
						constellation_name: constName,
						// Capture coordinates for the map
						x: parseFloat(sysInfo.x_pos) || 0,
						y: parseFloat(sysInfo.y_pos) || 0,
						z: parseFloat(sysInfo.z_pos) || 0
					};
				}
			} catch (err) {
				console.warn(`Failed to load external system ${sysId}`, err);
			}
		});
		// Wait for all external info to load
		await Promise.all(externalTasks);
		// Normalize systems and attach stargates with external info
		return systems.map(sys => {
			// Resolve constellation name for this system
			const cNameFromMap = constellationMap[sys.constellation_id] ?? constellationMap[sys.constellationId] ?? null;
			// Also look for any name already present in the system object
			const cNameFromSystem =
				sys.constellation_name ??
				sys.constellationName ??
				(sys.constellation && (sys.constellation.name ?? sys.constellation.constellation_name)) ??
				null;
			const cName = cNameFromMap || cNameFromSystem || 'Unknown';
			// Nomralized systems
			const normalizedSys = this.normalizeSystem(sys, region.region_name, cName);
			// Attach stargates
			const systemGates = stargateMap[sys.system_id] || [];
			// Add stargates
			normalizedSys.stargates = systemGates.map(gate => {
				// Get stargates
				const destId = gate._destId;
				const isExternal = externalSystemIds.has(destId);
				const gateData = { ...gate };
				delete gateData._destId; // Clean up temp prop
				// If external to region, attach the fetched info
				if (isExternal && externalDestinations[destId]) {
					gateData.destination_info = externalDestinations[destId];
					gateData.is_external = true;
				} else {
					gateData.is_external = false;
				}
				// Return gate data
				return gateData;
			});
			// Return normalized systems
			return normalizedSys;
		});
	}
	// Parse the coordinates for systems, i.e. make sure not strings
	normalizeSystem(system, regionName, constellationName) {
		const rawX = system.x_pos;
		const rawY = system.y_pos;
		const rawZ = system.z_pos;
		// Return the goods
		return {
			...system, // Keep all existing properties
			region_name: regionName || 'Unknown',
			constellation_name: constellationName || 'Unknown',
			// Ensure everything is a number before sending to the wild.
			x: parseFloat(rawX) || 0,
			y: parseFloat(rawY) || 0,
			z: parseFloat(rawZ) || 0
		};
	}
}
// API constructed from class
const api = new AstroApi();
// Export region kills
export function fetchRegionSummary(regionId) {
	return api.getRegionSummaryForId(regionId);
}
// Export heatpmap
export function fetchRegionHeatmap(regionId) {
	return api.getRegionHeatmapForId(regionId);
}
// Export constellation kills
export function fetchConstellationSummary(constellationId) {
	return api.getConstellationSummaryForId(constellationId);
}
// Export system kills
export function fetchSystemSummary(systemId) {
	return api.getSystemSummaryForId(systemId);
}
// Export top regions
export function fetchTopRegions() {
	return api.getTopRegions();
}
// Export top constellations
export function fetchTopConstellations() {
	return api.getTopConstellations();
}
// Export top systems
export function fetchTopSystems(){
	return api.getTopSystems();
}
// Export getting random regions
export function getRandomRegion() {
	// Combine both lists into one pool
	const regions = [...kSpaceRegionsData, ...jSpaceRegionsData];
	// Pick a random index from the array and return that respective region
	const randomIndex = Math.floor(Math.random() * regions.length);
	return regions[randomIndex];
}
// Export loading random region
export async function loadRandomRegionSystems(progressCallback) {
	// Pick region
	const region = getRandomRegion();
	// Show we are searching for a region selected randomly.
	progressCallback('fetching', `Selected Region: ${region.region_name}`);
	// Call back for progress
	progressCallback('fetching', `Searching: ${region.region_name}`);
	// Make return
	return api.fetchRegion(region);
}
// Export search function
export async function fetchSystemsBySearch(searchTerm, progressCallback) {
	// Make progress call
	progressCallback('search', `Searching "${searchTerm}"`);
	// Find region in json file
	const regions = [...kSpaceRegionsData, ...jSpaceRegionsData];
	// Get the search region, everything is lowercase to prevent sensitivity for user
	const targetRegion = regions.find(r =>
		r.region_name.toLowerCase().includes(searchTerm.toLowerCase())
	);
	// Check if found
	if (!targetRegion) {
		progressCallback('error', 'Region not found!');
		return [];
	}
	// Found!
	progressCallback('fetching', `Found ${targetRegion.region_name}! Loading systems.`);
	// Return systems
	return api.fetchRegion(targetRegion);
}
