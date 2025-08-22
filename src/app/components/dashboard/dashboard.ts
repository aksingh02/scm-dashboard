import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // <-- Add this import

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule], // <-- Add CommonModule here
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

    articles = [
    {
      title: 'Breaking News: Angular 20 Released',
      author: 'Jane Doe',
      date: '2024-06-01',
      summary: 'Angular 20 introduces new features and performance improvements for enterprise applications.',
    },
    {
      title: 'Editorial: The Future of Web Frameworks',
      author: 'John Smith',
      date: '2024-05-28',
      summary: 'A deep dive into the trends shaping the next generation of web development frameworks.',
    },
    {
      title: 'How to Manage News Content Efficiently',
      author: 'Alice Johnson',
      date: '2024-05-25',
      summary: 'Tips and tools for streamlining your news site content workflow.',
    },
  ];

}
