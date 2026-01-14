// Scene Configurations
export const CAMERA_SETTINGS = {
        FOV: 60, // Field of View
        NEAR: 0.1, // Objects closer than this won't be drawn
        FAR: 20000, // Objects further than this won't be drawn
        START_Z: 1500 // Starting view distance
};
// Region view Settings
export const REGION_SETTINGS = {
	SCENE_SIZE: 3000, // Scene size
	STAR_SIZE: 10, // Size of the star
	GATE_OPACITY: 0.6, // Gate opacity
	BG_COLOR: 0x000000, // Background color
	PICK_SCALE: 2.5, // Textbox size for stars
	LABEL_PIXEL_HEIGHT: 72 // Target on-screen pixel height for labels, i.e. gates and systems
};
// Colors for different types of stars from O, B, A, F, G, K, to M. O being hot and M being cool.
export const STAR_COLORS = {
        'O': 0x9bb0ff,
        'B': 0xaabfff,
        'A': 0xcad7ff,
        'F': 0xf8f7ff,
        'G': 0xfff4ea,
        'K': 0xffd2a1,
        'M': 0xffad51,
        'L': 0x8b4513,
        'T': 0x654321,
        'Y': 0x400080,
        'DEFAULT': 0xffffff,
};
