import { Component, NgZone } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { MapService } from '../../services/MapService';
import { IsLetters, IsUpper, pad } from '../../Utils';
 
@Component({
  selector: 'app-timing',
  templateUrl: './timing.component.html',
  styleUrl: './timing.component.css'
})
export class TimingComponent {

	waitingLyrics: string;
	changed = false;

	constructor(private router: Router, private zone: NgZone, public mapService: MapService) {
		this.waitingLyrics = mapService.map.waitingLyrics.join("\n");
	}

	controls = new FormGroup({
		bpmControl: new FormControl(this.mapService.map.track.bpm),
		startControl: new FormControl(this.mapService.map.track.start),
		beatsPerLineControl: new FormControl(this.mapService.map.beatsPerLine),
		lyricsPerBeatControl: new FormControl(this.mapService.map.lyricsPerBeat),
	})
	submit() {
		this.mapService.map.track.bpm = this.controls.controls.bpmControl.value!;
		this.mapService.map.track.start = this.controls.controls.startControl.value!;
		this.mapService.map.beatsPerLine = this.controls.controls.beatsPerLineControl.value!;
		this.mapService.map.lyricsPerBeat = this.controls.controls.lyricsPerBeatControl.value!;

		if (this.changed)
			this.mapService.push();

		this.zone.run(() => this.router.navigate(["../main"]));
	}

	addVoice() {
		let defaultColor = '#' + pad(Math.floor(Math.random() * 16777215).toString(16), 6);
		if (this.mapService.map.voices.length === 1)
			defaultColor = '#009FFF';
		if (this.mapService.map.voices.length === 2)
			defaultColor = '#C622FF';

		let voice = {
			name: 'Voice ' + (this.mapService.map.voices.length + 1),
			color: defaultColor,
			insertInto: false
		};
		this.mapService.map.voices.push(voice);

		for (let entry of this.mapService.map.lyrics)
			entry.push({
				voice: voice,
				content: '',
				hold: false
			});
	}

	submitLyrics() {
		this.changed = true;
		if (this.mapService.map.waitingLyrics.length === 0) {
			this.mapService.map.waitingLyrics = this.waitingLyrics.replace("\r", "").replace("\t", "").split("\n");
			this.mapService.updateWaitingSentence();
		}
		else {
			this.mapService.map.waitingLyrics = [];
			this.mapService.map.waitingLyricsPosition = 0;
			this.mapService.updateWaitingSentence();
		}
	}

	deleteVoice(index: number) {
		this.mapService.map.voices.splice(index, 1);

		for (let entry of this.mapService.map.lyrics)
			entry.splice(index, 1);
	}

	romajize() {
		let newWords = [];
		let currentWord = "";
		for (let j = 0; j < this.waitingLyrics.length; j++) {
			if (IsLetters(this.waitingLyrics.charAt(j)) )
				currentWord += this.waitingLyrics.charAt(j);
			else
			{
				if (currentWord !== "") {
					let foreign = true;
					for (let i = 0; i < currentWord.length; i++)
						if (!IsUpper(currentWord.charAt(i)))
							foreign = false;

					if (!foreign) {
						currentWord = currentWord.toLowerCase();
						if (currentWord.length == 1)
							currentWord = currentWord.replace("e", "he").replace("o", "wo").replace("a", "wa");
						else if (currentWord.length == 2)
							currentWord = currentWord.replace("ha", "wa");

						currentWord = currentWord.replace("ī", "ii").replace("ū", "uu").replace("ō", "ou").replace("ā", "aa")
							.replace("ē", "ei");
					}
					newWords.push(currentWord);
				}
				newWords.push(this.waitingLyrics.charAt(j));
				currentWord = "";
			}

			if (j === this.waitingLyrics.length - 1 && currentWord !== "")
				newWords.push(currentWord);
		}
		this.waitingLyrics = newWords.join("");
	}
}
