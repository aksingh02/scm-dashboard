import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Analytics</h1>
        <p class="text-gray-600">View analytics and insights</p>
      </div>
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold mb-4">Analytics Dashboard</h2>
        <p class="text-gray-500">Analytics functionality will be implemented here.</p>
      </div>
    </div>
  `
})
export class Analytics {}