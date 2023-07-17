import {Mix, PlaylistState} from "../mix";
import {describeArc} from "../../utils";

export function createStateChart(mix: Mix, state: PlaylistState, container: HTMLElement) {
	const svg = container.createSvg('svg', {
		attr: {
			'xmlns': "http://www.w3.org/2000/svg",
			'width': 25,
			'height': 25,
			'viewBox': "0 0 25 25",
			'fill': "none",
			'stroke': "currentColor",
			'stroke-width': 5,
		},
		cls: 'state-chart'
	});
	const playlist = mix.playlists[state.playlistIndex];
	const relativeDurations = state.trackIndices.map(index => playlist.tracks[index].duration / playlist.totalDuration);
	const angles = relativeDurations.map(x => x * 360);
	let currentAngle = 0;
	for (let i = 0; i < angles.length; i++) {
		const angle = angles[i];
		const classes = [];
		if (i == state.currentTrack) {
			classes.push('current');
			if (mix.activePlaylist == state.playlistIndex) {
				classes.push('active')
			}
		}
		svg.createSvg('path', {
			attr: {
				d: describeArc(15, 15, 7.5, currentAngle + 4, currentAngle + angle - 4),
			},
			cls: classes,
		});
		currentAngle += angle;
	}
}
