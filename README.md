# tiffviewer
Tiff Viewer is a library that generates a javascript viewer for tiff files

## [Demo](https://fabianp60.github.io/tiffviewer/)

## Usage

### Browser

Download tiff.min.js, tiffviewer.js, tiff.css and load them by yourself:

- In html body create a div with "tiff-viewer" class
  - set data-tiff-url: for tiff file
  - Optional you can set initial parameters via dataset parameters
    - set data-zoom: if you want an initial zoom different of 100%
    - set data-page-num: if you want an initial page different of 1
```html
<div class="tiff-viewer" data-tiff-url="images/multipage.tiff" data-zoom="90" data-page-num="3"></div>
```

- In javascript
  - get the tiff-viewer element and pass it to the constructor of the new TiffViewer object 
    - Optional: you can send an initparams object {zoom: 90, page: 3} in the constructor
  - call the LoadAndShow method to view the tiff image
```js
let tiffImg = document.querySelector(".tiff-viewer");
new TiffViewer(tiffImg).LoadAndShow();
```

## Dependencies
- Tiff Viewer uses [tiff.js](https://github.com/seikichi/tiff.js), a port of LibTIFF
  - Please read [tiff.js](https://github.com/seikichi/tiff.js) notes if you have large files problems
- This viewer uses indexedDB which is available in many modern web browsers

## License
[GPL-3.0 license](https://github.com/fabianp60/tiffviewer/blob/main/LICENSE)
