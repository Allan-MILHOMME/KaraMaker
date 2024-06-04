import { AudioTrack } from "./AudioTrack";
import { KaraMakerLyric } from "./KaraMakerLyric";
import { KaraMakerVoice } from "./KaraMakerVoice";

export interface KaraMakerMap {
	version: 1;
	track: AudioTrack;
	voices: KaraMakerVoice[];
	beatsPerLine: number ;
	lyricsPerBeat: number;
	lyrics: KaraMakerLyric[][] ;
	outline: Selection[];
	metronomeVolume: number;
	waitingLyrics: string[];
	waitingLyricsPosition: number;
}


export interface Selection {
	selected: boolean;
	hold: boolean; 
}

