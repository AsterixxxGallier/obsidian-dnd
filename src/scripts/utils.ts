import {EditorSelection} from "@codemirror/state";

export function mode<T>(array: T[]): T | null {
	if (array.length == 0)
		return null;
	const modeMap: any = {};
	let maxEl = array[0], maxCount = 1;
	for (let i = 0; i < array.length; i++) {
		const el = array[i];
		if (modeMap[el] == null) {
			modeMap[el] = 1;
		} else {
			modeMap[el]++;
		}
		if (modeMap[el] > maxCount) {
			maxEl = el;
			maxCount = modeMap[el];
		}
	}
	return maxEl;
}

export function selectionAndRangeOverlap(
	selection: EditorSelection,
	from: number,
	to: number
) {
	for (const range of selection.ranges) {
		if (range.from <= to && range.to >= from) {
			return true;
		}
	}

	return false;
}

export function formatTime(seconds: number) {
	const minutes = Math.floor(seconds / 60)
	const remainingSeconds = Math.floor(seconds % 60)
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
}

export function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number): { x: number, y: number } {
	const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;

	return {
		x: centerX + (radius * Math.cos(angleInRadians)),
		y: centerY + (radius * Math.sin(angleInRadians))
	};
}

export function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
	const start = polarToCartesian(x, y, radius, endAngle);
	const end = polarToCartesian(x, y, radius, startAngle);

	const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

	return [
		"M", start.x, start.y,
		"A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
	].join(" ");
}
