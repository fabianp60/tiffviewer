# tiffviewer
Tiff Viewer is a library that generates a javascript viewer for tiff files

## [Demo](https://fabianp60.github.io/tiffviewer/)

## Usage

### Browser

Download tiff.min.js, tiffviewer.js, tiff.css and load them by yourself:

- In html body create a div with "tiff-viewer" class
  - set data-tiff-url: for tiff file
  - set data-zoom: if you want an initial zoom different of 100%
```html
<div class="tiff-viewer" data-tiff-url="images/multipage.tiff" data-zoom="30"></div>
```

- In javascript, get the tiff-viewer element an pass it to the constructor of the new TiffViewer object
```js
let tiffImg = document.querySelector(".tiff-viewer");
new TiffViewer(tiffImg);
```

## Dependencies
Tiff Viewer uses [tiff.js](https://github.com/seikichi/tiff.js), a port of LibTIFF
- Please read [tiff.js](https://github.com/seikichi/tiff.js) notes if you have large files problems

## License
[GPL-3.0 license](https://github.com/fabianp60/tiffviewer/blob/main/LICENSE)
