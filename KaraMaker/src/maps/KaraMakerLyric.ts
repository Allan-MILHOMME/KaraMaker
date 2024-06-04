import { KaraMakerVoice } from "./KaraMakerVoice";

export interface KaraMakerLyric {
	voice: KaraMakerVoice;
	content: string;
	hold: boolean;
}
