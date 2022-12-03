import { Component, HostListener, ViewChild } from '@angular/core';
import { Observable, Observer } from 'rxjs';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  title = 'importPdf';
  @ViewChild('file') file;
  aoaToExport: any[][];
  mergeArray: { row: number; array: number[] } = { row: null, array: [] };
  undoStack: { row: number; array: string[] }[] = [];
  redoStack: { row: number; array: string[] }[] = [];
  primaryMouseButtonDown: boolean = false;

  import(): void {
    this.file.nativeElement.value = null; //triggers file change event every time
    this.file.nativeElement.click();
  }

  fileObservable(evt: any) {
    return new Observable((observer: Observer<any>) => {
      let error = '';
      const target: DataTransfer = <DataTransfer>evt.target;
      console.log(evt);
      const reader: FileReader = new FileReader();
      /* read workbook and open modal*/
      reader.onload = (e: any) => {
        const bstr: string = e.target.result;
        // let workbook = XLSX.read(bstr, { type: 'binary' });
        observer.next(bstr);
      };
      reader.readAsBinaryString(target.files[0]);
    });
  }

  convertToTable(data) {
    let rowArray = data
      .replace(/(\d),(\d)/g, '')
      // .replace(/\n/g, '')
      .split('\n');
      // .split('\r');
    let splitStringAoa = rowArray.map((r) =>
      r
        .replace(
          /([A-Za-z/\,\.\^\$\*\+\-\?\(\)\[\]\{\}\\\|\—\//])\s(?=[A-Za-z/\,\.\^\$\*\+\-\?\(\)\[\]\{\}\\\|\—\//])/g,
          '$1'
        )
        // .replace(/(\d)\s(?=[A-Za-z/\,\.\^\$\*\+\-\?\(\)\[\]\{\}\\\|\—\//])/g, '$1')
        .split(' ')
    );
    this.aoaToExport = splitStringAoa;
  }

  test(e) {
    console.log(e);
  }

  onFileChange(evt: any) {
    this.undoStack = [];
    this.redoStack = [];
    this.mergeArray = { row: null, array: [] };
    this.fileObservable(evt).subscribe((data) => {
      this.convertToTable(data);
    });
  }

  export(aoa) {
    let ws: XLSX.WorkSheet = [];
    ws = XLSX.utils.aoa_to_sheet(aoa, { dateNF: 'mm/yyyy', cellDates: true });
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const excelBuffer: any = XLSX.write(wb, {
      bookType: 'xlsx',
      type: 'array',
    });
    const data: Blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
    });
    FileSaver.saveAs(data, 'formattedData');
  }

  startMergeArray(i, j) {
    this.primaryMouseButtonDown = true;
    this.mergeArray.row = i;
    this.mergeArray.array = [];
    this.mergeArray.array.push(j);
  }
  addToMergeArray(i: number, j: number) {
    // console.log(this.mergeArray)
    if (this.primaryMouseButtonDown && i == this.mergeArray.row) {
      this.mergeArray.array.push(j);
      // console.log(this.mergeArray.array)
    }
  }
  endMergeArray() {
    this.primaryMouseButtonDown = false;
    let row = this.aoaToExport[this.mergeArray.row];
    this.undoStack.push({ row: this.mergeArray.row, array: row });
    let minIndex = Math.min(...this.mergeArray.array);
    let maxIndex = Math.max(...this.mergeArray.array);
    this.aoaToExport[this.mergeArray.row] = [
      ...row.slice(0, minIndex),
      row.slice(minIndex, maxIndex + 1).join(''),
      ...row.slice(maxIndex + 1),
    ];
    this.mergeArray.array = [];
    this.mergeArray.row = null;
    // this.aoaToExport[i]
  }

  undo() {
    if (this.undoStack.length) {
      let undoRow = this.undoStack.pop();
      //when we undo, we want to take the current changes and store them in the redo stack
      // this.redoStack.push({row: undoRow.row, array: this.aoaToExport[undoRow.row]})
      this.aoaToExport[undoRow.row] = undoRow.array;
    }
  }
  // redo(){
  //   if (this.redoStack.length){
  //     let redoRow = this.redoStack.shift()
  //     // this.undoStack.push({row: redoRow.row, array: this.aoaToExport[redoRow.row]})
  //     this.aoaToExport[redoRow.row] = redoRow.array
  //   }
  // }

  isSelected = (i: number, j: number) => {
    return this.mergeArray.row == i && this.mergeArray.array.includes(j);
  };

  // setPrimaryButtonState(e) {
  //   console.log(e)
  //     var flags = e.buttons !== undefined ? e.buttons : e.which;
  //     this.primaryMouseButtonDown = (flags & 1) === 1;
  // }
  // @HostListener('mousedown', ['$event'])
  // onmousedown(e){
  //  this.setPrimaryButtonState(e)
  // }
  // @HostListener('mousemove', ['$event'])
  // onmousemove(e){
  //  this.setPrimaryButtonState(e)
  // }
  @HostListener('mouseup', ['$event'])
  onmouseup(e) {
    this.primaryMouseButtonDown = false;
  }

  @HostListener('window:keydown', ['$event'])
  onKeyPress($event: KeyboardEvent) {
    // console.log($event)
    if (
      ($event.ctrlKey || $event.metaKey) &&
      !$event.shiftKey &&
      $event.keyCode == 90
    ) {
      console.log('CTRL + Z');
      this.undo();
    }
    // if ((($event.ctrlKey || $event.metaKey) && $event.shiftKey) && $event.keyCode == 90){
    //   console.log('CTRL + Shift + Z');
    //   this.redo();
    // }
  }

  //   var primaryMouseButtonDown = false;

  // function

  // document.addEventListener("mousedown", setPrimaryButtonState);
  // document.addEventListener("mousemove", setPrimaryButtonState);
  // document.addEventListener("mouseup", setPrimaryButtonState);
}
