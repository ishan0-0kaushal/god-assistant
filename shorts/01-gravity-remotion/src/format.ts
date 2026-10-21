const int = (n: number) => Math.round(n).toLocaleString('en-US');

export const formatG = (g: number): string => {
	if (g < 10) {
		return `${Math.round(g * 10) / 10} G`;
	}
	return `${int(g)} G`;
};

export const formatWeight = (kg: number): string => {
	if (kg < 1000) {
		return `${int(kg)} kg`;
	}
	const t = kg / 1000;
	if (t < 10) {
		return `${t.toFixed(2)} t`;
	}
	if (t < 100) {
		return `${t.toFixed(1)} t`;
	}
	if (t < 1e6) {
		return `${int(t)} t`;
	}
	return `${(t / 1e6).toFixed(1)} million t`;
};

export const formatSpeed = (kms: number): string => {
	if (kms < 100) {
		return `${kms.toFixed(1)} km/s`;
	}
	return `${int(kms)} km/s`;
};
