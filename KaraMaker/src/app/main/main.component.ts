import { Component, DestroyRef, ElementRef, NgZone, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { MapService } from '../../services/MapService';
import { Router } from '@angular/router';
import { KaraMakerMap } from '../../maps/KaraMakerMap';
import { HostListener } from '@angular/core';
import FileSaver, { saveAs } from 'file-saver';
import BSON from 'bson';
import { setAlphaRatio, colorToString, RomajiSplit, baseFile, colorExport, timestampToString, reverseColor } from "../../Utils"
import { DomSanitizer } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { MatSelectChange } from '@angular/material/select';
import { MatSliderChange } from '@angular/material/slider';


@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent implements OnInit, OnDestroy {
	metronomeBuffer?: AudioBuffer;
	currentMatrix: number[][] = [];
	map: KaraMakerMap;

	@ViewChild('cursor') cursor?: ElementRef<HTMLInputElement>;

	constructor(private router: Router, private zone: NgZone, public mapService: MapService, private httpClient: HttpClient) {
		this.updateMatrix(this.mapService.map.lyrics.length, this.mapService.getLyricsPerLine());
		this.map = mapService.map;

		window.onbeforeunload = function (event) {
			if (!mapService.isSaved) {
				event.preventDefault();
			}
		};

		const id = setInterval(() => {
			if (mapService.playing())
				this.cursor?.nativeElement.scrollIntoView({block: "nearest", behavior:"instant"});
			this.updateCurrentTime();
		}, 10);
		const destroyRef = inject(DestroyRef);
		destroyRef.onDestroy(() => clearInterval(id));

		mapService.updateCurrentSentences();
		mapService.updateWaitingSentence();
	}

	updateCurrentTime() {
		if (this.mapService.playing())
			this.cursor?.nativeElement.scrollIntoView({ block: "nearest", behavior: "instant" });
		let oldTime = this.mapService.currentTime;
		this.mapService.updateCurrentTime();

		if (this.metronomeBuffer) {
			let oldLyric = Math.floor(oldTime / this.mapService.getLyricDuration());
			let currentLyric = Math.floor(this.mapService.currentTime / this.mapService.getLyricDuration());

			if (oldLyric != currentLyric && currentLyric >= 0 && oldLyric >= 0)
				if (this.mapService.metronomeMode === "volume_on" ||
					(this.mapService.metronomeMode === "music-note" && this.map.outline[currentLyric].selected && !this.map.outline[oldLyric].hold) ||
					(this.mapService.metronomeMode === "record_voice_over" && this.map.lyrics[currentLyric].some(l => l.content))) {
					let audioNode = this.mapService.audioContext.createBufferSource();
					audioNode.buffer = this.metronomeBuffer;
					let gainNode = this.mapService.audioContext.createGain();
					gainNode.gain.value = this.map.metronomeVolume / 100;

					audioNode.connect(gainNode);
					gainNode.connect(this.mapService.audioContext.destination);

					audioNode.start();
				};
		}
	}

	ngOnInit() {
		this.httpClient.get('assets/metronome.wav', { responseType: 'arraybuffer' }).subscribe(buffer =>
			this.mapService.audioContext.decodeAudioData(buffer).then(result => this.metronomeBuffer = result)
		);
	}

	ngOnDestroy(): void {
		this.mapService.stop();
	}

	@HostListener('document:keyup', ['$event'])
	async handleKeyboardUpEvent(event: KeyboardEvent) {
		if (event.code == "Enter") {
			event.stopPropagation();
			event.stopImmediatePropagation();
			event.preventDefault();
			this.mapService.selecting = undefined;
		}

	}

	@HostListener('document:keydown', ['$event'])
	async handleKeyboardEvent(event: KeyboardEvent) {
		let focused = document.activeElement;

		if (event.key == "z" && event.ctrlKey) {
			event.stopPropagation();
			event.preventDefault();
			event.stopImmediatePropagation();
			this.mapService.pop();
		}

		if (focused && focused.tagName.toLowerCase() === "input")
			return;

		event.stopImmediatePropagation();
		event.preventDefault();
		event.stopPropagation();

		if ((event.code == "NumpadAdd" || event.code == "NumpadMultiply") && !event.ctrlKey && !event.altKey && !event.shiftKey) {
			let add = event.code == "NumpadAdd";
			if (this.mapService.currentTime >= 0 && this.map.waitingLyricsPosition < this.mapService.getWaitingSentenceLength()) {
				this.mapService.push();
				let currentSentence = this.mapService.getRemainingWaitingSentence();
				let currentLyric = Math.floor((this.mapService.currentTime + 0.01) / this.mapService.getLyricDuration());
				if (currentSentence) {
					if (this.mapService.insertionMode !== 'romaji') {
						let char = currentSentence.charAt(0);

						while (currentSentence.length > char.length && (
							currentSentence.charAt(char.length) === " " ||
							currentSentence.charAt(char.length) === "," ||
							currentSentence.charAt(char.length) === "!" ||
							currentSentence.charAt(char.length) === "." ||
							currentSentence.charAt(char.length) === "?"))
							char += currentSentence.charAt(char.length);

						if (this.mapService.insertionMode === "upper")
							char = char.toUpperCase();
						if (this.mapService.insertionMode === "lower")
							char = char.toLowerCase();

						let oldChar = char;
						if (currentSentence.length == char.length)
							char += '.';
						if (add)
							for (let i = 0; i < this.map.lyrics[currentLyric].length; i++)
								if (this.map.voices[i].insertInto)
									this.map.lyrics[currentLyric][i].content += char;
						this.map.waitingLyricsPosition += oldChar.length;
					}
					else {
						let splits = RomajiSplit(currentSentence);
						if (splits.length > 0) {
							let split = splits[0];
							if (currentSentence.length == splits[0].length)
								splits[0] += '.';
							if (add)
								for (let i = 0; i < this.map.lyrics[currentLyric].length; i++)
								if (this.map.voices[i].insertInto)
									this.map.lyrics[currentLyric][i].content += splits[0];
							this.map.waitingLyricsPosition += split.length;
						}
					}
					this.mapService.updateWaitingSentence();
					this.mapService.updateCurrentSentences();
				}
				
			}
		}

		if (event.key == "s" && event.ctrlKey && !event.repeat) {
			event.stopPropagation();
			event.preventDefault();
			this.save();
		}

		if (event.code == "Enter" && !event.repeat) {
			event.stopPropagation();
			event.preventDefault();
			this.mapService.enterSelectingMode();
		}

		if (event.code == "Space") {
			event.stopPropagation();
			event.preventDefault();
			if (this.mapService.playing())
				this.mapService.stop();
			else
				this.mapService.start();
		}

		if (event.code == "ArrowUp") {
			event.stopPropagation();
			event.preventDefault();
			if (event.ctrlKey) {
				let currentLyric = Math.floor((this.mapService.currentTime + 0.01) / this.mapService.getLyricDuration());
				if (currentLyric < 0)
					currentLyric = 0;
				for (let i = currentLyric - 1; currentLyric >= 0; i--) {
					if (this.map.outline[i].selected)
						this.mapService.setCurrentTime(i * this.mapService.getLyricDuration());
					break;
				}
			}
			else
				this.mapService.setCurrentTime(this.mapService.currentTime - this.mapService.getLineDuration());
		}

		if (event.code == "ArrowDown") {
			event.stopPropagation();
			event.preventDefault();
			if (event.ctrlKey) {
				let currentLyric = Math.floor(this.mapService.currentTime / this.mapService.getLyricDuration());
				if (currentLyric < 0)
					currentLyric = 0;
				for (let i = currentLyric + 1; currentLyric < this.mapService.map.lyrics.length; i++) {
					if (this.map.outline[i].selected && !this.map.outline[i - 1].hold) {
						this.mapService.setCurrentTime(i * this.mapService.getLyricDuration());
						break;
					}
				}
			}
			else
				this.mapService.setCurrentTime(this.mapService.currentTime + this.mapService.getLineDuration());
		}

		if (event.code == "ArrowLeft") {
			event.stopPropagation();
			event.preventDefault();
			this.mapService.setCurrentTime(this.mapService.currentTime - this.mapService.getLyricDuration());
		}

		if (event.code == "ArrowRight") {
			event.stopPropagation();
			event.preventDefault();
			this.mapService.setCurrentTime(this.mapService.currentTime + this.mapService.getLyricDuration());
		}
	}

	save() {
		this.mapService.isSaved = true;
		let size = BSON.calculateObjectSize(this.mapService.map);
		BSON.setInternalBufferSize(size);
		let blob = new Blob([BSON.serialize(this.mapService.map)]);
		FileSaver.saveAs(blob, 'map.kmp');
	}

	export() {
		let total = baseFile;
		let voices = "";
		for (let voice of this.map.voices)
			voices += colorExport.replace('{name}', voice.name).replace("{color}", reverseColor(voice.color).toUpperCase().replace('#', "&H00")) + "\n";

		let dialogs = "";
		let comments = "";
		for (let sentence of this.mapService.getSentences()) {
			let sentenceString = "";
			for (let j = 0; j < sentence.lyrics.length; j++) {
				let lyric = sentence.lyrics[j];
				let diff = j == sentence.lyrics.length - 1 ?
					this.mapService.getLyricDuration()
					: (sentence.lyrics[j + 1].lyric - lyric.end + 1) * this.mapService.getLyricDuration();

				if (lyric.end !== lyric.lyric + 1) {
					sentenceString += "{\\kf" + Math.floor((lyric.end - lyric.lyric) * this.mapService.getLyricDuration() * 100) + "}" +
						lyric.content + "{\\k" + Math.floor((diff - this.mapService.getLyricDuration()) * 100) + "}";
				}
				else
					sentenceString += "{\\k" + Math.floor(diff * 100) + "}" + lyric.content;
			}
			comments += "Comment: 0," +
				timestampToString(sentence.startTime + 0.9 + this.map.track.start) + ',' +
				timestampToString(sentence.endTime - 0.2 + this.map.track.start) + ',' +
				this.map.voices[sentence.voice].name + ",,0,0,0,karaoke," + sentenceString + '\n'
			dialogs += "Dialogue: 0," +
				timestampToString(sentence.startTime + this.map.track.start) + ',' +
				timestampToString(sentence.endTime + this.map.track.start) + ',' +
				this.map.voices[sentence.voice].name + ",,0,0,0,fx,{\\k90\\fad(300,200)}" + sentenceString + '\n'
		}

		let blob = new Blob([total.replace("{voices}", voices).replace("{comments}", comments).replace("{dialogs}", dialogs)]);
		FileSaver.saveAs(blob, 'map.ass');
	}

	hold(index: number, voiceIndex: number, event: Event) {
		event.stopPropagation();
		event.preventDefault();
		if (index < this.map.lyrics.length - 1) {
			if (this.map.lyrics[index + 1][voiceIndex].content === '') {
				this.map.lyrics[index][voiceIndex].hold = true;
			}
		}
	}

	updateMatrix(length: number, lineLength: number) {
		var index = 0;
		var total = [];
		while (index < length) {
			var innerList = [];
			for (var i = 0; i < lineLength; i++)
				if (index < length)
					innerList.push(index++);
			total.push(innerList);
		}
		this.currentMatrix = total;
	}

	close() {
		this.zone.run(() => this.router.navigate(["../home"]));
	}

	toTiming() {
		this.zone.run(() => this.router.navigate(["../timing"]));
	}
}
