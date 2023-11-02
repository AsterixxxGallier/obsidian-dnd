import {setIcon} from "obsidian";
import {createStateChart} from "./stateChart";
import {MixView} from "../mixView";

export async function showTable(this: MixView) {
	const container = this.containerEl.children[1];
	for (const element of Array.from(container.children)) {
		if (element !== this.audioElement) {
			element.remove()
		}
	}

	const table = container.createEl('table', {cls: 'mix-table'});

	const body = table.createTBody();

	const proportionSum = this.mix.states.reduce((sum, state) => sum + state.proportion, 0);

	for (let i = 0; i < this.mix.states.length; i++) {
		const state = this.mix.states[i];
		const playlist = this.mix.playlists[state.playlistIndex];
		const row = body.createEl('tr');

		const moveCell = row.createEl('td');
		moveCell.style.width = '32px';

		const upButton = moveCell.createDiv({cls: 'clickable-icon', title: 'Move up'});
		setIcon(upButton, 'chevron-up');
		upButton.style.paddingBottom = '0';
		upButton.onclick = async () => {
			await this.moveUp(state);
		}

		const upIcon = <HTMLElement>upButton.children[0];
		upIcon.setAttribute('height', '12px');
		upIcon.setAttribute('viewBox', '0 8 24 12');
		upIcon.style.height = 'calc(var(--icon-size) / 2)';

		// TODO use aria-disabled like in the navigation arrows (back/forward) of the title bar of a pane
		if (i == 0) {
			upButton.style.pointerEvents = 'none';
			upIcon.style.color = 'var(--text-muted)';
		}


		const downButton = moveCell.createDiv({cls: 'clickable-icon', title: 'Move down'});
		setIcon(downButton, 'chevron-down');
		downButton.style.paddingTop = '0';
		downButton.onclick = async () => {
			await this.moveDown(state);
		}

		const downIcon = <HTMLElement>downButton.children[0];
		downIcon.setAttribute('height', '12px');
		downIcon.setAttribute('viewBox', '0 4 24 12');
		downIcon.style.height = 'calc(var(--icon-size) / 2)';

		if (i == this.mix.states.length - 1) {
			downButton.style.pointerEvents = 'none';
			downIcon.style.color = 'var(--text-muted)';
		}

		const proportionCell = row.createEl('td');
		proportionCell.style.width = '60px';
		const proportionInput = proportionCell.createEl('input', {
			cls: 'proportion',
			type: 'number',
			value: state.proportion.toString()
		});
		proportionInput.min = '0';
		proportionInput.oninput = async () => {
			const proportion = proportionInput.valueAsNumber;
			if (!isNaN(proportion)) {
				await this.changeProportion(state, proportion);
				// @ts-ignore
				Array.from(this.contentEl.querySelectorAll('table tbody tr td:nth-child(2) input'))[i].focus();
			}
		}
		proportionCell.createSpan({text: ' / ' + proportionSum});

		let nameCell = row.createEl('td');
		// nameCell.style.width = '???';
		const nameSpan = nameCell.createSpan({
			text: playlist.name.length ? playlist.name : '<Unnamed>',
			title: 'Configure playlist'
		});
		nameSpan.onclick = async () => {
			await this.configurePlaylist(playlist);
		}

		let stateChartCell = row.createEl('td');
		stateChartCell.style.width = '32px';
		createStateChart(this.mix, state, stateChartCell);

		let playThisButtonCell = row.createEl('td');
		playThisButtonCell.style.width = '32px';
		const playThisButton = playThisButtonCell.createDiv({cls: 'clickable-icon', title: 'Play this'});
		setIcon(playThisButton, 'play');
		playThisButton.onclick = async () => {
			await this.playSolo(state);
		}
	}

	const lastRow = body.createEl('tr');

	lastRow.createEl('td');
	lastRow.createEl('td');

	const addPlaylistButton = lastRow.createEl('td').createDiv({cls: 'clickable-icon', title: 'Add playlist'});
	setIcon(addPlaylistButton, 'folder-plus');
	addPlaylistButton.onclick = async () => {
		await this.addPlaylist();
	}

	const resetButton = lastRow.createEl('td').createDiv({cls: 'clickable-icon', title: 'Reset'});
	setIcon(resetButton, 'timer-reset');
	resetButton.onclick = async () => {
		await this.resetTracksAndTimes();
	}

	lastRow.createEl('td');
}
