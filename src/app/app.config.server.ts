import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { provideZoneChangeDetection } from '@angular/core'; // Add this import
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideZoneChangeDetection() // Add this to override zoneless for server
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);