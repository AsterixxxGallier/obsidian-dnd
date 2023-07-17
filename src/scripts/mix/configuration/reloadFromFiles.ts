import {Playlist, Track} from "../mix";
import {mode} from "../../utils";
import {MixView} from "../mixView";

export async function reloadFromFiles(this: MixView, playlist: Playlist) {
	if (!await this.app.vault.adapter.exists(playlist.path)) {
		console.warn("Cannot find " + playlist.path);
		return;
	}
	const files = (await this.app.vault.adapter.list(playlist.path)).files.sort();
	const fileNames: string[] = [];
	for (const file of files) {
		const fileName = file.substring(file.lastIndexOf('/') + 1);
		fileNames.push(fileName);
		const oldTrack = playlist.tracks.find((track) => track.fileName == fileName);
		if (oldTrack == undefined) {
			const buffer = await this.app.vault.adapter.readBinary(file);
			const audioContext = new AudioContext()
			const audioBuffer = await audioContext.decodeAudioData(buffer);
			const duration = audioBuffer.duration;
			playlist.tracks.push(new Track(
				fileName.substring(0, fileName.lastIndexOf('.')),
				fileName,
				mode(playlist.tracks.map((track) => track.artist)) || 'Unknown artist',
				duration
			))
			this.mix.states.find((state) => state.playlistIndex == this.mix.playlists.indexOf(playlist))!
				.trackIndices.push(playlist.tracks.length - 1);
		}

	}
	for (const track of playlist.tracks) {
		if (!fileNames.includes(track.fileName)) {
			await this.deleteTrack(playlist, track);
		}
	}
	playlist.totalDuration = playlist.tracks.reduce((total, track) => total + track.duration, 0);
}
