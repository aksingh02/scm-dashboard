import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private isVisibleSubject = new BehaviorSubject<boolean>(true);
  public isVisible$ = this.isVisibleSubject.asObservable();

  toggle() {
    this.isVisibleSubject.next(!this.isVisibleSubject.value);
  }

  hide() {
    this.isVisibleSubject.next(false);
  }

  show() { 
    this.isVisibleSubject.next(true);
  }

  get isVisible(): boolean {
    return this.isVisibleSubject.value;
  }
}