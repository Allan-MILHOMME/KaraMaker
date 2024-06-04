import { NgModule, importProvidersFrom } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NgxFileDropModule } from 'ngx-file-drop';
import { TimingComponent } from './timing/timing.component';
import { HomeComponent } from './home/home.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { MainComponent } from './main/main.component';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { ColorPickerModule } from 'ngx-color-picker';
import { HttpClientModule } from '@angular/common/http';
import { MatSliderModule } from '@angular/material/slider';

@NgModule({
	declarations: [
		AppComponent,
		TimingComponent,
		HomeComponent,
		MainComponent
	],
	imports: [
		BrowserModule,
		AppRoutingModule,
		NgxFileDropModule,
		ReactiveFormsModule,
		MatFormFieldModule,
		MatInputModule,
		MatSelectModule,
		MatTableModule,
		FormsModule,
		MatListModule,
		MatIconModule,
		ColorPickerModule,
		MatSliderModule,
	],
	providers: [
		provideAnimationsAsync(),
		importProvidersFrom(HttpClientModule)
	],
	bootstrap: [AppComponent]
})
export class AppModule { }
