import DnDPlugin from "../main";
import {ItemView} from "obsidian";
import {Mix, Playlist, PlaylistState, Track} from "./mix";
import {PlaylistConfigurationModal} from "./configuration/playlistConfigurationModal";
import {reloadFromFiles} from "./configuration/reloadFromFiles";
import {showTable} from "./table/table";
import {showPlayer} from "./player";

const VIEW_TYPE_MIX = 'mix-view';

export class MixView extends ItemView {
	mix: Mix
	audioElement: HTMLAudioElement
	currentTrackPath: string | undefined
	isPlaying: boolean
	play: () => Promise<void>;
	pause: () => Promise<void>;

	async addPlaylist() {
		const playlist = this.mix.addPlaylist("", "");
		await this.reload();
		await this.configurePlaylist(playlist);
	}

	async configurePlaylist(playlist: Playlist) {
		new PlaylistConfigurationModal(
			this.app,
			playlist,
			async () => await this.reload(),
			async () => reloadFromFiles.call(this, playlist),
			async () => await this.deletePlaylist(playlist),
		).open();
	}

	async deleteTrack(playlist: Playlist, track: Track) {
		const playlistIndex = this.mix.playlists.indexOf(playlist);
		const state = this.mix.states.find((state) => state.playlistIndex == playlistIndex)!;
		const trackIndex = playlist.tracks.indexOf(track);
		if (state.trackIndices[state.currentTrack] == trackIndex) {
			// the track to be deleted is currently playing
			// TODO
		}
		state.trackIndices.remove(state.currentTrack);
		playlist.tracks.remove(track);
		await this.reload();
	}

	async deletePlaylist(playlist: Playlist) {
		const index = this.mix.playlists.indexOf(playlist);
		this.mix.playlists.remove(playlist);
		for (let i = 0; i < this.mix.states.length; i++) {
			const state = this.mix.states[i];
			if (state.playlistIndex == index) {
				this.mix.states.remove(state);
				i--;
			} else if (state.playlistIndex > index) {
				state.playlistIndex--;
			}
		}
		await this.reload();
	}

	async moveUp(state: PlaylistState) {
		const index = this.mix.states.indexOf(state);
		console.assert(index != 0);
		this.mix.states.remove(state);
		this.mix.states.splice(index - 1, 0, state);
		await this.reload();
	}

	async moveDown(state: PlaylistState) {
		const index = this.mix.states.indexOf(state);
		console.assert(index != this.mix.states.length - 1);
		this.mix.states.remove(state);
		this.mix.states.splice(index + 1, 0, state);
		await this.reload();
	}

	async changeProportion(state: PlaylistState, proportion: number) {
		state.proportion = proportion;
		await this.reload();
	}

	async playSolo(state: PlaylistState) {
		this.mix.states.forEach(s => {
			s.proportion = 0;
		});
		state.proportion = 1;
		if (!this.isPlaying) {
			await this.play();
		}
		this.mix.toNextTrack();
		await this.reload();
	}

	async resetTracksAndTimes() {
		this.currentTrackPath = undefined;
		this.mix.resetTracksAndTimes();
		await this.toNextTrack();
	}

	async toNextTrack() {
		this.mix.toNextTrack();
		await this.reload();
	}

	getDisplayText(): string {
		return "Mix";
	}

	getViewType(): string {
		return VIEW_TYPE_MIX;
	}

	async onOpen() {
		this.mix = await Mix.load();
		await this.populate();
	}

	async populate() {
		if (this.mix.activePlaylist == undefined)
			this.mix.toNextTrack();
		await showTable.call(this);
		[this.play, this.pause] = await showPlayer.call(this);
	}

	async reload() {
		await this.populate();
		await this.mix.store();
	}

	async onClose() {

	}

	getIcon() {
		return 'music';
	}
}

async function showMixView(this: DnDPlugin) {
	this.app.workspace.detachLeavesOfType(VIEW_TYPE_MIX);

	await this.app.workspace.getLeaf(true).setViewState({
		type: VIEW_TYPE_MIX,
		active: true,
	});

	this.app.workspace.revealLeaf(
		this.app.workspace.getLeavesOfType(VIEW_TYPE_MIX)[0]
	);
}

export function registerMixView(this: DnDPlugin) {
	this.registerView(VIEW_TYPE_MIX, (leaf) => new MixView(leaf));
}

export function addMixRibbonIcon(this: DnDPlugin) {
	this.addRibbonIcon('music', 'Mix', async () => {
		await showMixView.call(this);
	});
}
