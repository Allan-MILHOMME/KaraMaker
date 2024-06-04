import { Component, ElementRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FileSystemFileEntry, NgxFileDropEntry } from 'ngx-file-drop';
import { MapService } from '../../services/MapService';
import { KaraMakerMap } from '../../maps/KaraMakerMap';
import BSON, { Binary } from 'bson';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
	constructor(private router: Router, private mapService: MapService) { }

	public dropped(files: NgxFileDropEntry[]) {
		if (files.length == 1 && files[0].fileEntry.isFile) {
			let router = this.router;
			let mapService = this.mapService;
			let entry = files[0].fileEntry as FileSystemFileEntry;

			entry.file((f: File) => {
				f.arrayBuffer().then(result => {
					if (f.name.endsWith(".kmp")) {
						mapService.map = BSON.deserialize(result) as KaraMakerMap;
						let t = new Uint8Array((<Binary><unknown>mapService.map.track.datas).buffer);
						mapService.map.track.datas = t;
					}
					else {
						mapService.createMap(new Uint8Array(result));
					}
					mapService.push();
					if (f.name.endsWith(".kmp"))
						mapService.isSaved = true;
					mapService.audioContext = new (window.AudioContext)();
					mapService.audioContext.decodeAudioData(mapService.map.track.datas.buffer.slice(0, mapService.map.track.datas.length)).then(decodedData => {
						mapService.audioBuffer = decodedData;
						mapService.updateLyricsSize();
						router.navigate(["../timing"]);
					});
				});
			});
		}
	}
}
