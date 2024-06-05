import { Injectable } from '@angular/core';
import { KaraMakerMap } from '../maps/KaraMakerMap';
import { KaraMakerLyric } from '../maps/KaraMakerLyric';
import { KaraMakerVoice } from '../maps/KaraMakerVoice';
import { RomajiSplit, colorToString, mix, pad, readColor, setAlphaRatio } from '../Utils';

@Injectable({
	providedIn: 'root',
})
export class MapService {
	currentTime = 0;
	map!: KaraMakerMap;
	audioBuffer!: AudioBuffer; 
	audioContext!: AudioContext;
	playContext?: PlayContext;
	currentSentences!: (Sentence | undefined)[];
	selecting?: Selecting;
	mapHistory: KaraMakerMap[] = [];
	metronomeMode: string = "volume_off";
	insertionMode: string = "normal";
	currentWaitingSentence: WaitingChararacter[] = [];
	isSaved = true;

	constructor() { }

	createMap(datas: Uint8Array) {
		let track = {
			datas: datas,
			start: 0,
			offset: 0,
			bpm: 120,
			volume: 100
		};

		let voices = [{
			name: "Default",
			color: "#ff5733",
			insertInto: true
		}];

		this.map = {
			version: 1,
			track: track,
			voices: voices,
			beatsPerLine: 8,
			lyricsPerBeat: 2,
			lyrics: [],
			outline: [],
			metronomeVolume: 100,
			waitingLyricsPosition: 0,
			waitingLyrics: [],
		}
	}

	playing() {
		return this.playContext !== undefined;
	}

	getLyricsPerLine() {
		return this.map.beatsPerLine * this.map.lyricsPerBeat;
	}

	getBeatDuration() {
		return 60 / this.map.track.bpm;
	}

	getLyricDuration() {
		return this.getBeatDuration() / this.map.lyricsPerBeat;
	}

	getLineDuration() {
		return this.getBeatDuration() * this.map.beatsPerLine;
	}

	getLyricsSize() {
		let length = Math.floor(this.getDuration() / this.getLyricDuration());
		if (this.getDuration() % this.getLyricDuration() !== 0)
			length++;
		return length;
	}

	getDuration() {
		return this.audioBuffer.duration - this.map.track.start;
	}

	updateLyricsSize() {
		let size = this.getLyricsSize();
		let addedLyrics = [];
		let addedSelection = [];
		for (let i = this.map.lyrics.length; i < size; i++) {
			let newLyrics = [];
			for (let j = 0; j < this.map.voices.length; j++)
				newLyrics.push({
					voice: this.map.voices[j],
					content: '',
					hold: false
				});
			addedLyrics.push(newLyrics);
			addedSelection.push({selected: false, hold: false});
		}

		this.map.lyrics = this.map.lyrics.concat(addedLyrics);
		this.map.outline = this.map.outline.concat(addedSelection);
		this.updateCurrentSentences();
	}

	getCurrentPositionLine() {
		return Math.floor(this.currentTime / this.getLineDuration());
	}

	getCurrentPositionWidth() {
		return (this.currentTime / this.getLineDuration()) % 1;
	}

	stop() {
		if (this.playContext != undefined) {
			this.playContext.audioNode.disconnect();
			this.playContext = undefined;
		}
	}

	start() {
		if (!this.playing()) {
			let audioNode = this.audioContext.createBufferSource();
			audioNode.buffer = this.audioBuffer;

			let gainNode = this.audioContext.createGain();
			gainNode.gain.value = this.map.track.volume / 100;

			audioNode.connect(gainNode);
			gainNode.connect(this.audioContext.destination);

			this.playContext = {
				startingCurrentTime: this.currentTime,
				startInstant: Date.now(),
				audioNode,
				gainNode
			};

			audioNode.start(0, this.currentTime + this.map.track.start);
		}
	}

	updateVolume() {
		if (this.playContext)
			this.playContext.gainNode.gain.value = this.map.track.volume / 100;
	}

	updateCurrentTime() {
		if (this.playContext != undefined) {
			this.setCurrentTime(this.playContext.startingCurrentTime + (Date.now() - this.playContext.startInstant) / 1000, false);
			if (this.currentTime >= this.getDuration()) {
				this.stop();
			}
		}
	}

	setCurrentTime(setTime: number, replaceTrack: boolean = true) {
		if (setTime < -this.map.track.start)
			setTime = -this.map.track.start;
		if (setTime > this.getDuration())
			setTime = this.getDuration();
		if (this.currentTime < 0)
			setTime = 0;

		if (this.selecting) {
			let time = this.currentTime;
			let newTime = setTime;
			if (this.playing()) {
				time += this.getLyricDuration() * 0.4;
				newTime += this.getLyricDuration() * 0.4;
			}
			let currentPos = Math.floor((time + 0.01) / this.getLyricDuration());
			let newPos = Math.floor((newTime + 0.01) / this.getLyricDuration());

			let min = Math.min(currentPos, newPos);
			let max = Math.max(currentPos, newPos);

			let updated = false;
			if (!this.playing() || (Date.now() - this.selecting.start) / 1000 > this.getLyricDuration()) {
				for (let i = min; i <= max; i++) {
					if (this.selecting.deselecting) {
						if (this.map.outline[i].selected)
							updated = true;
						this.map.outline[i].selected = false;
						this.map.outline[i].hold = false;
					}
					else {
						if (!this.map.outline[i].selected)
							updated = true;

						this.map.outline[i].selected = true;
						if (i != max)
							this.map.outline[i].hold = true;
					}
				}

				if (this.selecting.deselecting && min !== 0)
					this.map.outline[min - 1].hold = false;
			}
			if (updated && !this.playing())
				this.push();
		}

		this.currentTime = setTime;
		this.updateCurrentSentences();

		if (replaceTrack) {
			let wasPlaying = this.playing();
			this.stop();
			if (wasPlaying)
				this.start();
		}
	}

	updateCurrentSentences() {
		let currentSentences = this.getSentencesAt(this.currentTime);
		let max = Math.max(...currentSentences.map(s => s.position));
		let orderedSentences: (Sentence | undefined)[] = [];
		for (let i = 0; i <= max; i++) {
			orderedSentences.push(currentSentences.find(s => s.position == i));
		}
		this.currentSentences = orderedSentences;
	}

	getSentencesAt(time: number) {
		return this.getSentences().filter(s => s.startTime <= time && s.endTime >= time);
	}

	getSentences() {
		let sentences: Sentence[] = [];

		for (let j = 0; j < this.map.voices.length; j++) {
			let currentSentenceLyrics: SentenceLyric[] = [];

			for (let i = 0; i < this.map.lyrics.length; i++) {
				let beforeCurrent = this.getLyricDuration() * i >= this.currentTime;
				let lyric = this.map.lyrics[i][j];

				if (lyric.content !== "") {
					let start = 0;
					for (let k = 0; k < lyric.content.length; k++) {
						let isPoint = lyric.content[k] === '.'
						if (isPoint || k === lyric.content.length - 1) {
							let slice = lyric.content.slice(start, k - start + (isPoint ? 0 : 1));
							if (slice !== undefined && slice !== "") {
								let coloration = 1;
								let end = this.getHoldEnd(i, j);
								if (beforeCurrent)
									coloration = 0;
								else if (lyric.hold) { 
									if (end * this.getLyricDuration() >= this.currentTime)
										coloration = (this.currentTime - i * this.getLyricDuration()) / ((end - i) * this.getLyricDuration());
								}
								currentSentenceLyrics.push({ content: slice, lyric: i, coloration, end: end });
							}

							start = k + 1;
						}
						if (isPoint && currentSentenceLyrics.length > 0) {
								let startTime = currentSentenceLyrics[0].lyric * this.getLyricDuration() - 1;
								let endTime = currentSentenceLyrics[currentSentenceLyrics.length - 1].end * this.getLyricDuration() + 0.5;
								let alpha = 1;
								if (this.currentTime > startTime && this.currentTime < startTime + 1)
									alpha = (this.currentTime - startTime) / 1;

								if (this.currentTime > endTime - 0.5 && this.currentTime < endTime)
									alpha = (endTime - this.currentTime) / 0.5;

							let activeSentences = sentences.filter(s => s.endTime >= startTime && s.startTime <= endTime);
								let position = 0;
								while (activeSentences.some(s => s.position == position))
									position++;

							sentences.push({ voice: j, lyrics: currentSentenceLyrics, startTime, endTime, position, alpha });
							currentSentenceLyrics = [];
						}
					}
				}
			}
			if (currentSentenceLyrics.length > 0) {
				let startTime = currentSentenceLyrics[0].lyric * this.getLyricDuration() - 1;
				let endTime = currentSentenceLyrics[currentSentenceLyrics.length - 1].end * this.getLyricDuration() + 0.5;
				let alpha = 1;
				if (this.currentTime > startTime && this.currentTime < startTime + 1)
					alpha = (this.currentTime - startTime) / 1;

				if (this.currentTime > endTime - 0.5 && this.currentTime < endTime)
					alpha = (endTime - this.currentTime) / 0.5;

				let activeSentences = sentences.filter(s => s.endTime >= startTime && s.startTime <= endTime);
				let position = 0;
				while (activeSentences.some(s => s.position == position))
					position++;

				sentences.push({ voice: j, lyrics: currentSentenceLyrics, startTime, endTime, position, alpha });
				currentSentenceLyrics = [];
			}
		}
		return sentences;
	}

	public getHoldEnd(lyric: number, voice: number) {
		while (this.map.lyrics[lyric][voice].hold)
			lyric++;
		return lyric + 1;
	}

	public updateLyric(lyric: number, voice: number) {
		if (lyric !== 0)
			this.map.lyrics[lyric - 1][voice].hold = false;
		this.updateCurrentSentences();
		this.push();
	}

	public enterSelectingMode() {
		this.push();
		let time = this.currentTime;
		if (this.playing())
			time += this.getLyricDuration() * 0.4;
		let currentPos = Math.floor((time + 0.01) / this.getLyricDuration());
		this.selecting = { deselecting: this.map.outline[currentPos].selected && !this.playing(), start: Date.now() }
		if (this.selecting.deselecting) {
			this.map.outline[currentPos].selected = false;
			this.map.outline[currentPos].hold = false;
			if (currentPos !== 0)
				this.map.outline[currentPos - 1].hold = false;
		}
		else
			this.map.outline[currentPos].selected = true;
	}

	public getVoiceColor(voice: number, alpha: number, coloration: number) {
		return colorToString(setAlphaRatio(mix('#FFFFFF', this.map.voices[voice].color, coloration), alpha));
	}

	public getBlackAlphaRatio(alpha: number) {
		return colorToString(setAlphaRatio('#000000', alpha));
	}

	public push() {
		this.isSaved = false;
		let newMap = { ...this.map };
		newMap.lyrics = structuredClone(this.map.lyrics);
		newMap.outline = structuredClone(this.map.outline);
		newMap.waitingLyrics = structuredClone(this.map.waitingLyrics);
		this.mapHistory.push(newMap);
		
		if (this.mapHistory.length > 100)
			this.mapHistory.splice(1, 1);
	}

	public pop() {
		if (this.mapHistory.length > 1) {
			this.mapHistory.splice(this.mapHistory.length - 1, 1)[0];
			let newMap = this.mapHistory[this.mapHistory.length - 1];
			for (let i = 0; i < this.map.lyrics.length; i++)
				for (let j = 0; j < this.map.lyrics[i].length; j++) {
					if (this.map.lyrics[i][j].content !== newMap.lyrics[i][j].content ||
						this.map.lyrics[i][j].hold !== newMap.lyrics[i][j].hold) {
						this.map.lyrics[i][j].content = newMap.lyrics[i][j].content;
						this.map.lyrics[i][j].hold = newMap.lyrics[i][j].hold;
					}
				}

			for (let i = 0; i < this.map.outline.length; i++) {
				if (this.map.outline[i].hold !== newMap.outline[i].hold ||
					this.map.outline[i].selected !== newMap.outline[i].selected) {
					this.map.outline[i].hold = newMap.outline[i].hold;
					this.map.outline[i].selected = newMap.outline[i].selected;
				}
			}
			this.map.waitingLyrics = newMap.waitingLyrics;
			this.map.waitingLyricsPosition = newMap.waitingLyricsPosition;
			this.updateCurrentSentences();
			this.updateWaitingSentence();
		}
	}

	public getWaitingSentenceLength() {
		return this.map.waitingLyrics.map(s => s.length).reduce((a, b) => a + b, 0);
	}

	public getRemainingWaitingSentence() {
		if (this.map.waitingLyricsPosition < this.getWaitingSentenceLength()) {
			let currentIndex = 0;
			for (let split of this.map.waitingLyrics) {
				if (currentIndex + split.length > this.map.waitingLyricsPosition)
					return split.slice(this.map.waitingLyricsPosition - currentIndex);
				currentIndex += split.length;
			}
		}
		return;
	}

	public updateWaitingSentence() {
		if (this.map.waitingLyricsPosition < this.getWaitingSentenceLength()) {
			let currentIndex = 0;
			for (let split of this.map.waitingLyrics) {
				if (currentIndex + split.length > this.map.waitingLyricsPosition) {
					let list = [];
					if (this.insertionMode !== "romaji")
						for (let i = 0; i < split.length; i++) 
							list.push({ content: split.charAt(i), used: currentIndex + i < this.map.waitingLyricsPosition });
						
					else {
						let splits = RomajiSplit(split);
						let ci = 0;
						for (let s of splits) {
							list.push({ content: s, used: currentIndex + ci < this.map.waitingLyricsPosition });
							ci += s.length;
						}
					}
					this.currentWaitingSentence = list;
					return;
				}
				currentIndex += split.length;
			}
		}
		this.currentWaitingSentence = [];
		return;
	}
}

export interface WaitingChararacter {
	content: string;
	used: boolean;
}

export interface Sentence {
	startTime: number;
	endTime: number;
	alpha: number;
	voice: number;
	position: number;
	lyrics: SentenceLyric[]
}

export interface SentenceLyric {
	content: string;
	lyric: number;
	coloration: number;
	end: number;
}

interface PlayContext {
	startingCurrentTime: number;
	startInstant: number;
	audioNode: AudioBufferSourceNode;
	gainNode: GainNode;
}

interface Selecting {
	start: number;
	deselecting: boolean;
}
