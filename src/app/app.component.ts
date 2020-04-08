import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, Renderer2, HostListener } from '@angular/core';

import { Observable, fromEvent, ReplaySubject, Subject, BehaviorSubject, of } from 'rxjs';
import { map, pairwise, switchMap, takeUntil, withLatestFrom, mergeMap } from 'rxjs/operators';
import { throwMatDialogContentAlreadyAttachedError } from '@angular/material';

interface IDimensions {
  width: number;
  height: number;
}

interface IRectangle extends IDimensions {
  x: number;
  y: number;
}

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
  rectangle = {
    x: 0,
    y: 0,
    width: 100,
    height: 100
  } as IRectangle;

  constructor(
    private window: Window,
    private renderer: Renderer2,
  ) {
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

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.ctx = this.canvasEl.nativeElement.getContext('2d');
    this.rect = this.canvasEl.nativeElement.getBoundingClientRect();
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
    this.scale = this.window.devicePixelRatio;
    this.renderer.setProperty(this.canvasEl.nativeElement, 'width', this.rect.width * this.scale);
    this.renderer.setProperty(this.canvasEl.nativeElement, 'height', this.rect.height * this.scale);
    this.ctx.scale(this.scale, this.scale);

    console.log('canvas', this.canvasEl.nativeElement.width);

    const img = new Image();
    img.src = '/assets/cell.png';

    img.onload = () => {
      this.ctx.drawImage(img, 0, 0, img.naturalWidth, img.naturalHeight);
      this.ctx.clearRect(0, 0, this.rect.width / 2, 100);

    };

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


  drawPicture() {

  }

  addPicture(event: Event) {
    const file = (event.target as HTMLInputElement).files[0];
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.src = fr.result as string;
      img.onload = () => {
        const wRatio = this.rect.width / img.width;
        const hRatio = this.rect.height / img.height;
        const ratio = Math.min(wRatio, hRatio);
        const shiftW = (this.rect.width - img.width * ratio) / 2;
        const shiftH = (this.rect.height - img.height * ratio) / 2;
        this.ctx.clearRect(0, 0, this.rect.width, this.rect.height);
        this.ctx.drawImage(img, 0, 0, img.width, img.height,
          shiftW, shiftH, img.width * ratio, img.height * ratio);


        // this.scaledImg = {
        //   w: img.width * this.scale,
        //   h: img.height * this.scale,
        // };
        // const wRatio = this.scaledRect.w / this.scaledImg.w;
        // const hRatio = this.scaledRect.h / this.scaledImg.h;
        // const ratio = Math.min(wRatio, hRatio);
        // console.log('this.scaledRect', this.scaledRect);
        // console.log('this.scaledImg', this.scaledImg.w * ratio, this.scaledImg.h * ratio);
        // const shiftW = (this.scaledRect.w - this.scaledImg.w * ratio) / 2 / this.scale;
        // const shiftH = (this.scaledRect.h - this.scaledImg.h * ratio) / 2 / this.scale;
        // console.log('shiftW', shiftW);
        // console.log('shiftH', shiftH);
        // // var centerShift_y = (canvas.height - img.height * ratio) / 2;
        // this.ctx.clearRect(0, 0, this.scaledRect.w, this.scaledRect.h);
        // this.ctx.drawImage(img, 0, 0, this.scaledImg.w, this.scaledImg.h,
        //   shiftW, shiftH, this.scaledImg.w * ratio, this.scaledImg.h * ratio);
      };
    };
    fr.readAsDataURL(file);
  }

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }

  crop() {
    // this.ctx.beginPath();
    // this.ctx.strokeStyle = 'red';
    // this.ctx.moveTo(this.rect.width * .1, this.rect.height * .1);
    // this.ctx.lineTo(this.rect.width * .1, this.rect.height * .9);
    // this.ctx.lineTo(this.rect.width * .9, this.rect.height * .9);
    // this.ctx.lineTo(this.rect.width * .9, this.rect.height * .1);
    // this.ctx.lineTo(this.rect.width * .1, this.rect.height * .1);
    // this.ctx.stroke();

    this.ctx.fillStyle = 'yellow';
    this.ctx.fillRect(0, 0, 250, 100);

    this.ctx.transform(1, 0.5, -0.5, 1, 30, 10);
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(0, 0, 250, 100);

    this.ctx.transform(1, 0.5, -0.5, 1, 30, 10);
    this.ctx.fillStyle = 'blue';
    this.ctx.fillRect(0, 0, 250, 100);


    //   const cropCanvas = this.renderer.createElement('canvas');
    //   this.renderer.appendChild(this.canvasEl.nativeElement, cropCanvas);
    //   cropCanvas.width = this.rect.width * .8;
    //   cropCanvas.height = this.rect.height * .8;
    //   // const cropCanvasCtx = cropCanvas.getContext('2d');

    //   const x = cropCanvas.getContext('2d').drawImage(this.canvasEl.nativeElement,
    //     this.rect.width * .1, this.rect.height * .1, cropCanvas.width, cropCanvas.height,
    //     0, 0, this.rect.width, this.rect.height);

    //   this.ctx.clearRect(0, 0, this.scaledRect.w, this.scaledRect.h);
    //   this.ctx.drawImage(cropCanvas, 0, 0, this.scaledRect.w, this.scaledRect.h);
  }

  animate() {
    this.ctx.clearRect(0, 0, this.rect.width, this.rect.height);
    this.rectangle.x += 1;
    if (this.rectangle.x > 100) {
      return;
    }
    console.log(' this.rectangle.x', this.rectangle.x);
    this.ctx.fillRect(this.rectangle.x, this.rectangle.y, this.rectangle.width, this.rectangle.height);
    this.window.requestAnimationFrame(this.animate.bind(this));

  }
}

