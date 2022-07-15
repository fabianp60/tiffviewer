class TiffViewer {
    constructor(divTiffViewer, initialZoom = 100) {
        this._divTiffViewer = divTiffViewer;
        if ("zoom" in this._divTiffViewer.dataset) {
            this._initialZoom = parseInt(this._divTiffViewer.dataset.zoom);
        } else {
            this._initialZoom = initialZoom;
        }
        this._totalPages = 0;
        this._currentPage = 0;
        this._currentAngle = 0;
        this._lastZoom = this._initialZoom;
        this._init();
    }

    _init() {
        this._createInterface();
        this._setDomObjects();
        this._drawPages();
        this._bindEvents();
    }

    

    _createInterface() {
        this._divTiffViewer.innerHTML = 
            `<div class="tiff-controls">
                <div class="controls-left">
                </div>
                <div class="controls-center">
                    <input type="text" name="page-number" value="0">
                    <span class="page-sep">/</span>
                    <input type="text" name="total-pages" value="0" readonly>
                    <div class="ctrl-sep"></div>
                    <button type="button" name="zoomout" title="Reducir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash-lg" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/>
                        </svg>
                    </button>
                    <input type="text" name="zoom">
                    <button type="button" name="zoomin" title="Acercar">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-plus-lg" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
                        </svg>
                    </button>
                    <div class="ctrl-sep"></div>
                    <button type="button" name="rotateleft" title="Girar hacia la izquierda">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrow-counterclockwise" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z"></path>
                            <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z"></path>
                        </svg>
                    </button>
                    <button type="button" name="expandtowidth" title="Ajustar al ancho">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-arrows-expand" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13A.5.5 0 0 1 1 8zM7.646.146a.5.5 0 0 1 .708 0l2 2a.5.5 0 0 1-.708.708L8.5 1.707V5.5a.5.5 0 0 1-1 0V1.707L6.354 2.854a.5.5 0 1 1-.708-.708l2-2zM8 10a.5.5 0 0 1 .5.5v3.793l1.146-1.147a.5.5 0 0 1 .708.708l-2 2a.5.5 0 0 1-.708 0l-2-2a.5.5 0 0 1 .708-.708L7.5 14.293V10.5A.5.5 0 0 1 8 10z"/>
                        </svg>
                    </button>
                </div>
                <div class="controls-right"></div>
            </div>
            <div class="tiff-loading hide">
                <p>Cargando...</p>
            </div>
            <div class="tiff-pages" data-zoom="${this._initialZoom}">
            </div>`;
    }

    _setDomObjects() {
        this._divLoading = this._divTiffViewer.querySelector(".tiff-loading");
        this._divPages = this._divTiffViewer.querySelector(".tiff-pages");
        this._divControls = this._divTiffViewer.querySelector(".tiff-controls");
        this._inputTotalPages = this._divTiffViewer.querySelector("input[name='total-pages']");
        this._inputNumPage = this._divTiffViewer.querySelector("input[name='page-number']");
        this._inputZoom = this._divTiffViewer.querySelector("input[name='zoom']");
        this._btnZoomOut = this._divTiffViewer.querySelector("button[name='zoomout']");
        this._btnZoomIn = this._divTiffViewer.querySelector("button[name='zoomin']");
        this._btnRotateLeft = this._divTiffViewer.querySelector("button[name='rotateleft']");
        this._btnExpandToWidth = this._divTiffViewer.querySelector("button[name='expandtowidth']");
    }

    _drawPages() {
        this._divPages.innerHTML = "";
        this._divLoading.classList.remove("hide");

        Tiff.initialize({TOTAL_MEMORY: 16777216 * 10});
        var xhr = new XMLHttpRequest();
        xhr.open('GET', this._divTiffViewer.dataset.tiffUrl);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function (e) {
            this._divLoading.classList.add("hide");
            var buffer = xhr.response;
            var tiff = new Tiff({buffer: buffer});
            this._totalPages = tiff.countDirectory();
            this._inputTotalPages.value = this._totalPages;
            if(this._totalPages > 0) this._currentPage = 1;
            this._inputNumPage.value = this._currentPage;
            for (var i = 0, len = tiff.countDirectory(); i < len; ++i) {
                tiff.setDirectory(i);
                let divPage = document.createElement("div");
                let divnumPage = document.createElement("div");
                let numPage = document.createElement("small");
                let divCanvasWrapper = document.createElement("div");
                divnumPage.classList.add("numpage-wrapper");
                numPage.classList.add("numpage");
                divCanvasWrapper.classList.add("canvas-wrapper");
                divPage.classList.add("tiff-page");
                divPage.dataset.page = i + 1;
                numPage.innerHTML = divPage.dataset.page;
                let canvas = tiff.toCanvas();
                divnumPage.appendChild(numPage);
                divCanvasWrapper.appendChild(divnumPage);
                divCanvasWrapper.appendChild(canvas);
                divPage.appendChild(divCanvasWrapper);
                this._divPages.appendChild(divPage);
            }
            this._setZoom(this._initialZoom);
            this._bindPageObserver();
        }.bind(this);
        xhr.send();
    }

    _bindEvents() {
        this._inputNumPage.addEventListener("keyup", (event) => { this._onInputNumPage(event); });
        this._inputNumPage.addEventListener("focus", () => { this._onInputNumPageFocus(); });
        this._btnZoomIn.addEventListener("click", () => { this._zoomIn(); });
        this._btnZoomOut.addEventListener("click", () => { this._zoomOut(); });
        this._btnRotateLeft.addEventListener("click", () => { this._rotateLeft(); });
        window.addEventListener("resize", () => { this._onWindowResize(); });
        window.addEventListener("orientationchange", () => { this._onWindowOrientationChange(); });
        this._inputZoom.addEventListener("keyup", (event) => { this._onInputZoom(event); });
        this._inputZoom.addEventListener("focus", () => { this._onInputZoomFocus(); });
        this._btnExpandToWidth.addEventListener("click", () => { this._expandToWidth(); });
    }

    _zoomIn() {
        let zoom = parseInt(this._inputZoom.value.replace("%", ""));
        zoom += 10;
        if(zoom > 300) {
            zoom = 300;
        }
        this._setZoom(zoom);
    }

    _zoomOut() {
        let zoom = parseInt(this._inputZoom.value.replace("%", ""));
        zoom -= 10;
        if(zoom < 20) {
            zoom = 20;
        }
        this._setZoom(zoom);
    }

    _onInputZoom(event) {
        if (event.key === 'Enter') {
            if(this._isPositiveInteger(this._inputZoom.value.replace("%", ""))) {
                let zoom = parseInt(this._inputZoom.value.replace("%", ""));
                if(zoom >= 20 && zoom <= 300) {
                    this._setZoom(zoom);
                } else {
                    this._inputZoom.value = this._lastZoom + '%';
                }
            } else {
                this._inputZoom.value = this._lastZoom + '%';
            }
            this._inputZoom.blur();
        }
    };

    _expandToWidth() {
        this._setZoom(100);
    }

    _setZoom(zoom) {
        this._inputZoom.value = zoom + "%";
        this._divPages.dataset.zoom = zoom;
        this._divPages.querySelectorAll('.tiff-page').forEach(page => {
            page.style.width = `${zoom}%`;
        });
        this._lastZoom = zoom;
    }

    _rotateLeft() {
        this._currentAngle -= 90;
        if(this._currentAngle === -360) {
            this._currentAngle = 0;
        }
        this._divPages.classList.remove("rotated-90", "rotated-180", "rotated-270");
        if(this._currentAngle != 0) {
            this._divPages.classList.add(`rotated${this._currentAngle}`);
        }
    }

    _onInputNumPage(event) {
        if (event.key === 'Enter') {
            if(this._isPositiveInteger(this._inputNumPage.value)) {
                let numpage = parseInt(this._inputNumPage.value);
                if(numpage >= 1 && numpage <= this._totalPages) {
                    this._setPage(numpage);
                } else {
                    this._inputNumPage.value = this._currentPage;
                }
            } else {
                this._inputNumPage.value = this._currentPage;
            }
            this._inputNumPage.blur();
        }
    }

    _onInputNumPageFocus() {
        this._inputNumPage.select();
    }

    _onInputZoomFocus() {
        this._inputZoom.select();
    }

    _setPage(numpage) {
        if(this._totalPages > 0) {
            if(numpage > 0 && numpage <= this._totalPages) {
                this._currentPage = numpage;
            }
        }
        this._inputNumPage.value = this._currentPage;
        let divPage = this._divPages.querySelector(`div.tiff-page[data-page="${this._currentPage}"]`);
        let pagePosition = divPage.offsetTop - this._divControls.clientHeight - 1;
        this._divPages.scroll(0, pagePosition);
    }

    _onWindowResize() {
        this._clientRect = this._divTiffViewer.getBoundingClientRect();
    }

    _onWindowOrientationChange() {
        this._clientRect = this._divTiffViewer.getBoundingClientRect();
    }

    _bindPageObserver() {
        this._pageObserverOptions = {
            root: this._divPages,
            threshold: 1,
            rootMargin: '0px 0px -50% 0px'
        };

        this._pagesObserver = new IntersectionObserver(this._pageObserverCallback.bind(this), this._pageObserverOptions);
        const pagesToObserve = this._divPages.querySelectorAll('div.tiff-page > div > div > small');

        pagesToObserve.forEach(page => {
            this._pagesObserver.observe(page);
        });
    }

    _pageObserverCallback(entries) {
        entries.forEach(entry => {
            if(entry.isIntersecting) {
                let paginaVisible = parseInt(entry.target.innerHTML);
                this._currentPage = paginaVisible;
                this._inputNumPage.value = this._currentPage;
            }
        });
    }

    _isPositiveInteger(str) {
        if (typeof str !== 'string') {
          return false;
        }
        const num = Number(str);
        if (Number.isInteger(num) && num > 0) {
          return true;
        }
        return false;
    }
}
