// Export navigation bar.
export function setupNavbar() {
	// Grab DOM nodes (these live in TEST/index.html)
	const topBar = document.getElementById('top-bar');
	const header = document.getElementById('region-header');
	const searchBtn = document.getElementById('search-toggle-btn');
	const infoBtn = document.getElementById('info-btn');
	// Ensure markup exists before adding subtle metadata/behavior
	if (topBar) {
		topBar.dataset.initialized = 'true';
	}
	// Helper methods to be used by main.js or other UI modules
	function setTitle(text) {
		if (header) header.textContent = text;
	}
	// Show search
	function showSearchButton() {
		if (searchBtn) searchBtn.classList.remove('hidden');
	}
	// Hide search
	function hideSearchButton() {
		if (searchBtn) searchBtn.classList.add('hidden');
	}
	// Send returns
	return {
		topBar,
		header,
		searchBtn,
		infoBtn,
		setTitle,
		showSearchButton,
		hideSearchButton
	};
}
