import {Playlist, Track} from "../mix";
import {mode} from "../../utils";
import {MixView} from "../mixView";
import {PlaylistImportModal} from "./playlistImportModal";

export function reloadFromFiles(this: MixView, playlist: Playlist) {
	return new Promise((resolve, reject) => {
		this.app.vault.adapter.exists(playlist.path).then((exists) => {
			if (!exists) {
				console.warn("Cannot find " + playlist.path);
				reject();
			}
		})
		const state = this.mix.states.find((state) => state.playlistIndex == this.mix.playlists.indexOf(playlist))!;
		new PlaylistImportModal(this.app, async (defaultArtist) => {
			const files = (await this.app.vault.adapter.list(playlist.path)).files.sort();
			const fileNames: string[] = [];
			const tasks = [];
			for (const file of files) {
				const fileName = file.substring(file.lastIndexOf('/') + 1);
				fileNames.push(fileName);
				const oldTrack = playlist.tracks.find((track) => track.fileName == fileName);
				if (oldTrack == undefined) {
					console.log('reading ' + fileName);
					tasks.push(this.app.vault.adapter.readBinary(file).then(async (buffer) => {
						console.log('read ' + fileName + ', decoding');
						const audioContext = new AudioContext()
						const audioBuffer = await audioContext.decodeAudioData(buffer);
						console.log('decoded ' + fileName);
						const duration = audioBuffer.duration;
						playlist.tracks.push(new Track(
							fileName.substring(0, fileName.lastIndexOf('.')),
							fileName,
							mode(playlist.tracks.map((track) => track.artist)) || defaultArtist,
							duration
						));
						console.log('pushing track index' + (playlist.tracks.length - 1) + ' to', state);
						state.trackIndices.push(playlist.tracks.length - 1);
						await this.reload();
					}));
				}

			}
			await Promise.all(tasks);
			for (const track of playlist.tracks) {
				if (!fileNames.includes(track.fileName)) {
					await this.deleteTrack(playlist, track);
				}
			}
			playlist.totalDuration = playlist.tracks.reduce((total, track) => total + track.duration, 0);
			resolve(undefined);
		}).open();
	});
}
