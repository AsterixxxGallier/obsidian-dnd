import {setIcon, SliderComponent} from "obsidian";
import {MixView} from "./mixView";

export async function showPlayer(this: MixView) {
	const container = <HTMLElement>this.containerEl.children[1];
	// FIXME will have problems when there are no playlists
	const state = this.mix.states.find((state) => state.playlistIndex == this.mix.activePlaylist)!;
	const playlist = this.mix.playlists[state.playlistIndex];
	const track = playlist.tracks[state.trackIndices[state.currentTrack]];

	if (this.audioElement == null) {
		this.audioElement = <HTMLAudioElement>container.createEl('audio');
		if (this.isPlaying) {
			this.audioElement.autoplay = true;
		}
		this.audioElement.onended = async () => {
			await this.toNextTrack();
		}
	}

	const path = playlist.path + '/' + track.fileName;

	this.app.vault.adapter.readBinary(path).then((buffer) => {
		const blob = new Blob([buffer], {type: "audio/mpeg"});
		if (this.currentTrackPath != path) {
			this.audioElement.src = URL.createObjectURL(blob);
			this.currentTrackPath = path;
		}
	});

	container.createSpan({cls: 'track-info', text: track.title + ' – ' + track.artist})

	const controls = container.createDiv({cls: 'audio-controls'});

	const playButton = controls.createDiv({cls: 'clickable-icon', title: 'Play'});
	setIcon(playButton, 'play');
	if (this.isPlaying) {
		playButton.style.display = 'none';
	}

	const pauseButton = controls.createDiv({cls: 'clickable-icon', title: 'Pause'});
	setIcon(pauseButton, 'pause');
	if (!this.isPlaying) {
		pauseButton.style.display = 'none';
	}

	playButton.onclick = async () => {
		playButton.style.display = 'none';
		pauseButton.style.removeProperty('display');
		await this.audioElement.play();
		this.audioElement.autoplay = true;
		this.isPlaying = true;
	}

	pauseButton.onclick = async () => {
		pauseButton.style.display = 'none';
		playButton.style.removeProperty('display');
		await this.audioElement.pause();
		this.audioElement.autoplay = false;
		this.isPlaying = false;
	}

	const skipButton = controls.createDiv({cls: 'clickable-icon', title: 'Skip'});
	setIcon(skipButton, 'skip-forward');

	skipButton.onclick = async () => {
		await this.toNextTrack();
	}

	new SliderComponent(controls)
		.setLimits(0, 100, 10)
		.setValue(100)
		.setDynamicTooltip()
		.onChange((value) => {
			this.audioElement.volume = value / 100;
		});
}
