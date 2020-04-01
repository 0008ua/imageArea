import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, Renderer2, HostListener } from '@angular/core';

import { Observable, fromEvent, ReplaySubject, Subject, BehaviorSubject, of } from 'rxjs';
import { map, pairwise, switchMap, takeUntil, withLatestFrom, mergeMap } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit, AfterViewInit {

  @ViewChild('area', { static: false })
  public canvasEl: ElementRef;

  @ViewChild('range', { static: false })
  public rangeEl: ElementRef;

  @ViewChild('color', { static: false })
  public colorEl: ElementRef;

  @ViewChild('inputPictureDirective', { static: false })
  public inputPictureDirective: ElementRef;

  mouseMove$: ReplaySubject<MouseEvent>;
  mouseDown$: ReplaySubject<MouseEvent>;
  mouseUp$: Subject<MouseEvent>;
  mouseOut$: Subject<MouseEvent>;
  rangeInput$: BehaviorSubject<number>;
  colorInput$: BehaviorSubject<any>;
  stream$: Observable<any>;

  canvas: ElementRef;
  ctx: CanvasRenderingContext2D;
  rect: DOMRect;
  scale: number;

  one$: any;
  two$: any;

  constructor(
    private window: Window,
    private renderer: Renderer2,
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.ctx = this.canvasEl.nativeElement.getContext('2d');
    this.rect = this.canvasEl.nativeElement.getBoundingClientRect();

    this.scale = this.window.devicePixelRatio;

    // this.rect
    //  - relatively to document
    // x: 517.2000122070312
    // y: 8
    // width: 400
    // height: 200
    //  - relatively to viewport
    // top: 8
    // right: 917.2000122070312
    // bottom: 208
    // left: 517.2000122070312

    this.renderer.setProperty(this.canvasEl.nativeElement, 'width', this.rect.width * this.scale);
    this.renderer.setProperty(this.canvasEl.nativeElement, 'height', this.rect.height * this.scale);
    this.ctx.scale(this.scale, this.scale);

    // take last value without initial value
    this.mouseMove$ = new ReplaySubject(1);
    this.mouseDown$ = new ReplaySubject(1);
    // take values only after subscribing (without memory of last value)
    this.mouseUp$ = new Subject();
    this.mouseOut$ = new Subject();
    // take last value with initial value
    this.rangeInput$ = new BehaviorSubject(this.rangeEl.nativeElement.value);
    this.colorInput$ = new BehaviorSubject(this.colorEl.nativeElement.value);

    this.stream$ = this.mouseDown$
      // start with click on canvas stream
      .pipe(
        // get latest data of streams, first arg in callback (_) is from mouseDown$
        // second is the line width stream and last is the color stream
        withLatestFrom(this.rangeInput$, this.colorInput$,
          (_, lineWidth, strokeStyle) =>
            ({
              lineWidth,
              strokeStyle
            })
        ),
        // then switch on mouse move over canvas stream
        switchMap((options) => {
          return this.mouseMove$
            .pipe(
              map(e =>
                ({
                  x: e.offsetX,
                  y: e.offsetY,
                  options
                })
              ),
              // get prrevious and current streams - transform dots to line
              pairwise(),
              // stop stream when fires new streams (mouseUp or cursor out of canvas)
              takeUntil(this.mouseUp$),
              takeUntil(this.mouseOut$)
            );
        })
      );

    this.stream$
      .subscribe(([from, to]) => {
        // this.ctx.fillRect(position.x, position.y, 2, 2);
        const { lineWidth, strokeStyle } = from.options;
        this.ctx.lineWidth = lineWidth;
        this.ctx.strokeStyle = strokeStyle;
        this.ctx.beginPath();
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
        this.ctx.stroke();
      }
      );
  }

  @HostListener('mousemove', ['$event'])
  onMove(e: MouseEvent) {
    if (e.target === this.canvasEl.nativeElement) {
      this.mouseMove$.next(e);
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    this.mouseDown$.next(e);
  }

  @HostListener('mouseup', ['$event'])
  onMouseUp(e: MouseEvent) {
    this.mouseUp$.next(e);
  }

  @HostListener('mouseout', ['$event'])
  onMouseOut(e: MouseEvent) {
    this.mouseOut$.next(e);
  }

  @HostListener('input', ['$event'])
  onInput(e: KeyboardEvent) {
    if (e.target === this.colorEl.nativeElement) {
      this.colorInput$.next(this.colorEl.nativeElement.value);
    }
    if (e.target === this.rangeEl.nativeElement) {
      this.rangeInput$.next(this.rangeEl.nativeElement.value);
    }
  }

  addPicture(event: Event) {
    // this.processingLoadPicture = true;
    
    // const file = (event.target as HTMLInputElement).files[0];
    // const fr = new FileReader();
    // fr.readAsDataURL(file);

    // fr.onload = () => {
    //   const img = new Image();   // Создает новый элемент изображения
    //   img.src = fr.result as string;
    //   img.onload = () => {
    //     this.ctx.drawImage(img, 100, 0);
    //   };
    // };


    // const img = new Image();   // Создает новый элемент изображения
    // img.src =  './assets/cell.png';
    // console.log('file', file);
    // img.onload = () => {
      
      // this.ctx.beginPath();
      // this.ctx.moveTo(30, 96);
      // this.ctx.lineTo(70, 66);
      // this.ctx.lineTo(103, 76);
      // this.ctx.lineTo(170, 15);
      // this.ctx.stroke();
    // const error = this.sharedService.checkPictureFile(file).err;

    // if (error) {
    //   this.matSnackBar.open(error, '', { duration: 2000 });
    //   this.processingLoadPicture = false;
    // } else {
    //   this.sharedService.uploadPicture(file, 'product', [
    //     { width: 1100, height: 825, crop: 'fill', fetch_format: 'auto' }, // popup - lg, xl
    //     { width: 760, height: 570, crop: 'fill', fetch_format: 'auto' }, // popp up - sm, md
    //     { width: 590, height: 443, crop: 'fill', fetch_format: 'auto' }, // xs
    //     { width: 460, height: 345, crop: 'fill', fetch_format: 'auto' }, // sm
    //     { width: 360, height: 270, crop: 'fill', fetch_format: 'auto' }, // lg, xl
    //     { width: 300, height: 225, crop: 'fill', fetch_format: 'auto' }, // md
    //   ])
    //     .subscribe(public_id => {
    //       this.productForm.get('picture').setValue(public_id);
    //       this.processingLoadPicture = false;
    //       this.productForm.get('picture').markAsDirty();
    //     },
    //       err => this.matSnackBar.open(err.error.message, '', { duration: 2000 })
    //     );
    // }
  }
}
