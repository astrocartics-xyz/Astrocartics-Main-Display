// Heatmap normalization functions, do not want to repeat more than once.
export function normalizeHeatmap(raw) {
	// Returns an array of bucket-like objects: {system_id?, system_name?, kills?}
	if (!raw) {
		return [];
	}
	if (Array.isArray(raw)) {
		return raw;
	} else if (raw && Array.isArray(raw.buckets)) {
		return raw.buckets;
	} else if (raw && typeof raw === 'object') {
		// map of id->value
		return Object.keys(raw).map(k => ({ system_id: Number(k), kills: Number(raw[k] ?? 0) }));
	}
	return [];
}
// Builds a simple lookup where keys are either numeric ids or system name strings.
// Useful for quick lookup by id or name: lookup[id] => kills, lookup[name] => kills
export function buildKillsById(buckets) {
	const lookup = {};
	if (!Array.isArray(buckets)) {
		return lookup;
	}
	buckets.forEach(entry => {
		// ID, NAME, KILLS
		const id = entry.system_id ?? entry.id ?? entry.systemId ?? null;
		const name = entry.system_name ?? entry.name ?? null;
		const kills = Number(entry.kills ?? entry.count ?? 0);
		if (id !== null && id !== undefined) {
			lookup[id] = kills;
		} else if (name) {
			lookup[name] = kills;
		}
	});
	return lookup;
}

// Builds the panel-style keyed lookup: `id:<id>` and `name:<name>`
export function buildKillsByKey(buckets) {
	const lookup = {};
	if (!Array.isArray(buckets)) {
		return lookup;
	}
	// Buckets
	buckets.forEach(entry => {
		// ID, NAME, KILLS
		const id = entry.system_id ?? entry.id ?? entry.systemId ?? null;
		const name = entry.system_name ?? entry.name ?? null;
		const kills = Number(entry.kills ?? entry.count ?? entry.kills ?? 0);
		if (id !== null && id !== undefined) {
			lookup[`id:${id}`] = kills;
		} else if (name) {
			lookup[`name:${name}`] = kills;
		}
	});
	return lookup;
}
