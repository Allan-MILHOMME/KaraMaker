import { inject } from "@angular/core";
import { CanActivateFn } from '@angular/router';
import { MapService } from './services/MapService';
import { Router } from "@angular/router";
import { KaraMakerMap } from "./maps/KaraMakerMap";

export const MapGuard: CanActivateFn = (route, state) => {
	const service = inject(MapService);
	const router = inject(Router);

	if (service.map === undefined || service.audioContext === undefined) {
		router.navigateByUrl('/home');
		return false;
	}
	return true;
};
