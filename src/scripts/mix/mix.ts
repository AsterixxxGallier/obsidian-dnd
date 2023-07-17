export class Track {
	title: string
	fileName: string
	artist: string
	duration: number

	constructor(title: string, fileName: string, artist: string, duration: number) {
		this.title = title;
		this.fileName = fileName;
		this.artist = artist;
		this.duration = duration;
	}
}

export class Playlist {
	name: string
	path: string
	tracks: Track[]
	totalDuration: number

	constructor(name: string, path: string, tracks: Track[], totalDuration: number) {
		this.name = name;
		this.path = path;
		this.tracks = tracks;
		this.totalDuration = totalDuration;
	}
}

export class PlaylistState {
	playlistIndex: number
	proportion: number
	trackIndices: number[]
	currentTrack: number
	playTime: number

	constructor(playlistIndex: number, proportion: number, trackIndices: number[], currentTrack: number, playTime: number) {
		this.playlistIndex = playlistIndex;
		this.proportion = proportion;
		this.trackIndices = trackIndices;
		this.currentTrack = currentTrack;
		this.playTime = playTime;
	}

	static from(playlistIndex: number, playlist: Playlist) {
		return new PlaylistState(
			playlistIndex,
			0,
			playlist.tracks.map((_, index) => index).shuffle(),
			0,
			0
		)
	}
}

export class Mix {
	playlists: Playlist[] = []
	states: PlaylistState[] = []
	activePlaylist: number | undefined

	constructor(playlists: Playlist[], states: PlaylistState[], currentPlaylist: number | undefined) {
		this.playlists = playlists;
		this.states = states;
		this.activePlaylist = currentPlaylist;
	}

	addPlaylist(name: string, path: string): Playlist {
		const playlist = new Playlist(name, path, [], 0);
		this.playlists.push(playlist);
		this.states.push(PlaylistState.from(this.playlists.length - 1, playlist));
		return playlist;
	}

	async store() {
		console.log(this);
		await app.vault.adapter.write('.mix', JSON.stringify(this));
	}

	private static from(json: string) {
		const data: Mix = JSON.parse(json);
		return new Mix(
			data.playlists.map((data: Playlist) =>
				new Playlist(data.name, data.path, data.tracks.map((data: Track) =>
					new Track(data.title, data.fileName, data.artist, data.duration)), data.totalDuration)),
			data.states.map((data: PlaylistState) =>
				new PlaylistState(data.playlistIndex, data.proportion, data.trackIndices, data.currentTrack, data.playTime)
			),
			data.activePlaylist
		);
	}

	static async load() {
		if (await app.vault.adapter.exists('.mix')) {
			return Mix.from(await app.vault.adapter.read('.mix'))
		}
		return new Mix([], [], undefined);
	}

	toNextTrack() {
		if (this.playlists.length == 0) {
			console.warn('Attempted to switch to next track, but there are no playlists');
			return;
		}
		if (this.activePlaylist != undefined) {
			const state = this.states.find((state) => state.playlistIndex == this.activePlaylist)!;
			state.playTime += this.playlists[state.playlistIndex].tracks[state.trackIndices[state.currentTrack]].duration;
			state.currentTrack++;
			if (state.currentTrack == state.trackIndices.length) {
				state.currentTrack = 0;
			}
		}
		this.switchToPlaylist(
			this.states
				.filter((state) => state.proportion > 0)
				.shuffle()
				.reduce((best: PlaylistState | null, state) => {
					if (
						best == null ||
						// if this playlist has proportionally more play time to catch up
						state.playTime / state.proportion <
						best.playTime / best.proportion
					) {
						return state
					} else {
						return best
					}
				}, null)!
		)
	}

	private switchToPlaylist(state: PlaylistState) {
		if (state.currentTrack == 0) {
			state.trackIndices = state.trackIndices.shuffle();
		}
		this.activePlaylist = state.playlistIndex;
	}

	resetTracksAndTimes() {
		for (const state of this.states) {
			state.currentTrack = 0;
			state.playTime = 0;
			state.trackIndices = state.trackIndices.shuffle();
		}
		this.activePlaylist = undefined;
	}
}
