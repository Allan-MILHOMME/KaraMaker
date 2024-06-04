import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TimingComponent } from "./timing/timing.component"
import { HomeComponent } from './home/home.component';
import { MainComponent } from './main/main.component';
import { MapGuard } from '../map.guard';

const routes: Routes = [
	{ path: 'home', component: HomeComponent },
	{ path: 'timing', component: TimingComponent, canActivate: [MapGuard] },
	{ path: 'main', component: MainComponent, canActivate: [MapGuard] },
	{ path: '', redirectTo: 'home', pathMatch: 'full' },
	{ path: '**', component: HomeComponent }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
