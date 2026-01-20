// Export navigation bar.
export function setupNavbar() {
	// Grab DOM nodes
	const topBar = document.getElementById('top-bar');
	const header = document.getElementById('region-header');
	const searchBtn = document.getElementById('search-toggle-btn');
	const infoBtn = document.getElementById('info-btn');
	const explosionBtn = document.getElementById('explosion-btn');
	const searchPanel = document.getElementById('search-panel');
	const closeSearchBtn = document.getElementById('close-search-btn');
	const panelSearchBtn = document.getElementById('search-btn');
	const searchInput = document.getElementById('search-input');

	// Ensure markup exists before adding subtle metadata/behavior
	if (topBar) {
		topBar.dataset.initialized = 'true';
	}
	// Helper methods to be used by main.js or other UI modules
	function showSearchPanel() {
		if (searchPanel) {
			searchPanel.classList.remove('hidden'); // reveals the panel
			if (searchInput) {
				searchInput.focus(); // puts cursor in the input for convenience
			}
		}
	}
	// Open/Close
	function toggleSearchPanel() {
		if (!searchPanel) {
			return;
		}
    		if (searchPanel.classList.contains('hidden')) {
    			showSearchPanel();
        	} else {
        		hideSearchPanel();
        	}
	}
	// Set title
	function setTitle(text) {
		if (header) {
			header.textContent = text;
		}
	}
	// Get search value
	function getSearchValue() {
		return searchInput ? searchInput.value.trim() : '';
	}
	// Clear search value
	function clearSearchInput() {
		if (searchInput) {
			searchInput.value = '';
		}
	}
	// Hide search
	function hideSearchPanel() {
		if (searchPanel) {
			searchPanel.classList.add('hidden');
		}
	}
	// Send returns
	return {
		topBar,
		header,
		searchBtn,
		infoBtn,
		explosionBtn,
		showSearchPanel,
		searchPanel,
		closeSearchBtn,
		searchInput,
		setTitle,
		toggleSearchPanel,
		hideSearchPanel,
		panelSearchBtn,
		getSearchValue,
		clearSearchInput
	};
}
