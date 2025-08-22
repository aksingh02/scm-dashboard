import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

declare var Quill: any;


@Component({
  selector: 'app-editor',
  imports: [CommonModule, FormsModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css'
})
export class Editor {
  
@ViewChild('editor', { static: true }) editorRef!: ElementRef;
  @Input() initialContent: string = '';
  @Input() placeholder: string = 'Start typing your document...';
  @Output() contentChange = new EventEmitter<string>();
  @Output() save = new EventEmitter<string>();

  private quill: any;
  editorId = Math.random().toString(36).substr(2, 9);
  wordCount = 0;
  charCount = 0;
  zoomLevel = 100;

  ngAfterViewInit() {
    this.loadQuill();
  }

  ngOnDestroy() {
    if (this.quill) {
      this.quill = null;
    }
  }

  private loadQuill() {
    // Load Quill CSS
    if (!document.querySelector('link[href*="quill"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css';
      document.head.appendChild(link);
    }

    // Load Quill JS
    if (typeof Quill === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js';
      script.onload = () => this.initializeQuill();
      document.head.appendChild(script);
    } else {
      this.initializeQuill();
    }
  }

  private initializeQuill() {
    const toolbarOptions = {
      container: `#toolbar-${this.editorId}`,
      handlers: {
        'image': this.imageHandler.bind(this),
        'save': this.saveDocument.bind(this)
      }
    };

    this.quill = new Quill(this.editorRef.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: toolbarOptions,
        history: {
          delay: 1000,
          maxStack: 100,
          userOnly: true
        }
      },
      placeholder: this.placeholder,
      formats: [
        'header', 'font', 'size',
        'bold', 'italic', 'underline', 'strike',
        'color', 'background',
        'script', 'blockquote', 'code-block',
        'list', 'bullet', 'indent',
        'direction', 'align',
        'link', 'image', 'video'
      ]
    });

    // Set initial content
    if (this.initialContent) {
      this.quill.root.innerHTML = this.initialContent;
    }

    // Listen for text changes
    this.quill.on('text-change', () => {
      const content = this.quill.root.innerHTML;
      this.updateStats();
      this.contentChange.emit(content);
    });

    // Initial stats update
    this.updateStats();
  }

  private imageHandler() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const range = this.quill.getSelection();
          this.quill.insertEmbed(range.index, 'image', e.target?.result);
        };
        reader.readAsDataURL(file);
      }
    };
  }

  private updateStats() {
    if (!this.quill) return;
    
    const text = this.quill.getText();
    this.charCount = text.length - 1; // Subtract 1 for the trailing newline
    this.wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  }

  saveDocument() {
    if (this.quill) {
      const content = this.quill.root.innerHTML;
      this.save.emit(content);
      
      // Create and download as HTML file
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${new Date().toISOString().split('T')[0]}.html`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  exportToPDF() {
    // For a full PDF export, you'd typically use a library like jsPDF or html2pdf
    // Here's a simple implementation using the browser's print functionality
    const content = this.quill.root.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Document</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  printDocument() {
    const content = this.quill.root.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Document</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              @media print { 
                body { margin: 15mm; }
                @page { margin: 15mm; }
              }
            </style>
          </head>
          <body>${content}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  }

  changeZoom(delta: number) {
    this.zoomLevel = Math.max(50, Math.min(200, this.zoomLevel + delta));
    if (this.quill) {
      this.quill.root.style.zoom = `${this.zoomLevel}%`;
    }
  }

  getContent(): string {
    return this.quill ? this.quill.root.innerHTML : '';
  }

  setContent(content: string) {
    if (this.quill) {
      this.quill.root.innerHTML = content;
      this.updateStats();
    }
  }

  clearContent() {
    if (this.quill) {
      this.quill.setText('');
      this.updateStats();
    }
  }
}
