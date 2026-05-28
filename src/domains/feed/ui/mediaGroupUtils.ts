export function getImageGridColumns(count: number): number {
	if (count <= 2) return count;
	if (count <= 4) return count;
	if (count <= 6) return 3;
	return 4;
}
