import {App, Modal, Setting} from "obsidian";
import {Playlist} from "../mix";
import {formatTime} from "../../utils";

export class PlaylistConfigurationModal extends Modal {
	playlist: Playlist;
	reload: () => void;
	reloadFromFiles: () => void;
	deletePlaylist: () => void;

	constructor(app: App, playlist: Playlist, reload: () => void, reloadFromFiles: () => Promise<void>, deletePlaylist: () => void) {
		super(app);
		this.playlist = playlist;
		this.reload = reload;
		this.reloadFromFiles = reloadFromFiles;
		this.deletePlaylist = deletePlaylist;
	}

	onOpen() {
		const container = this.contentEl;

		container.createEl("h1", {text: "Configure playlist"});

		new Setting(container)
			.setHeading()
			.setName("Playlist");

		new Setting(container)
			.setName("Name")
			.addText((text) =>
				text
					.setValue(this.playlist.name)
					.onChange((value) => {
						this.playlist.name = value;
						this.reload();
					}));

		new Setting(container)
			.setName("Path")
			.addText((text) => {
				text
					.setValue(this.playlist.path)
					.onChange((value) => {
						this.playlist.path = value;
						this.reload();
					});
			});

		const tracksHeading = new Setting(container)
			.setHeading()
			.setName("Tracks");

		const reloadTrackList = () => {
			container.querySelectorAll('.track-setting').forEach((el) => el.remove());
			let lastElement = tracksHeading.settingEl;
			for (const track of this.playlist.tracks) {
				const heading = new Setting(container)
					.setHeading()
					.setName(`${track.fileName} (${formatTime(track.duration)})`);
				container.insertAfter(heading.settingEl, lastElement);
				lastElement = heading.settingEl;

				const title = new Setting(container)
					.setName("Title")
					.addText((text) =>
						text
							.setValue(track.title)
							.onChange((value) => {
								track.title = value;
								this.reload();
							}));
				container.insertAfter(title.settingEl, lastElement);
				lastElement = title.settingEl;

				const artist = new Setting(container)
					.setName("Artist")
					.addText((text) => {
						text
							.setValue(track.artist)
							.onChange((value) => {
								track.artist = value;
								this.reload();
							});
					});
				container.insertAfter(artist.settingEl, lastElement);
				lastElement = artist.settingEl;
			}
		};

		reloadTrackList();

		new Setting(container)
			.addExtraButton((btn) =>
				btn
					.setIcon('rotate-ccw')
					.setTooltip('Reload from files')
					.onClick(async () => {
						await this.reloadFromFiles();
						reloadTrackList();
					})
			)

		new Setting(container)
			.addButton((btn) =>
				btn
					.setButtonText("Delete")
					.setWarning()
					.onClick(() => {
						this.deletePlaylist();
						this.close();
					}))
			.addButton((btn) =>
				btn
					.setButtonText("Close")
					.setCta()
					.onClick(() => {
						this.close();
					}));
	}

	onClose() {
		const element = this.contentEl;
		element.empty();
	}
}
