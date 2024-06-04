import { Component } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
	title = 'KaraMaker';

	constructor(private matIconRegistry: MatIconRegistry, private domSanitizer: DomSanitizer) {
		this.matIconRegistry.addSvgIcon(
			"metronome",
			this.domSanitizer.bypassSecurityTrustResourceUrl("assets/metronome.svg")
		);

		this.matIconRegistry.addSvgIcon(
			"normal",
			this.domSanitizer.bypassSecurityTrustResourceUrl("assets/normal.svg")
		);

		this.matIconRegistry.addSvgIcon(
			"upper",
			this.domSanitizer.bypassSecurityTrustResourceUrl("assets/upper.svg")
		);

		this.matIconRegistry.addSvgIcon(
			"lower",
			this.domSanitizer.bypassSecurityTrustResourceUrl("assets/lower.svg")
		);

		this.matIconRegistry.addSvgIcon(
			"romaji",
			this.domSanitizer.bypassSecurityTrustResourceUrl("assets/romaji.svg")
		);
	}
}
