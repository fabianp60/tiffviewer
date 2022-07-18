class TiffViewer {
    constructor(divTiffViewer, initparams = {zoom: 100, page: 1}) {
        this._divTiffViewer = divTiffViewer;
        this._initParams = {zoom: 100, page: 1};
        if ("zoom" in this._divTiffViewer.dataset) {
            this._initParams.zoom = parseInt(this._divTiffViewer.dataset.zoom);
        } else {
            if("zoom" in initparams) {
                this._initParams.zoom = initparams.zoom;
            }
        }
        if ("pageNum" in this._divTiffViewer.dataset) {
            this._initParams.page = parseInt(this._divTiffViewer.dataset.pageNum);
        } else {
            if("page" in initparams) {
                this._initParams.page = initparams.page;
            }
        }
        this._lastZoom = this._initParams.zoom;
        this._maxAroundPagesToShow = 20; // numero de paginas a mostrar antes y despues de la pagina actual
        this._tiffContent = { 
            file: {
                url: "",
                size: 0, // in bytes
                maxSize: 52428800, // in bytes {50MB: 52428800, 600MB: 629145600, 300MB: 314572800}
                sizeToPrint: "",
                downloadProgress: 0,
                loadProgress: 0,
                exists: false
            },
            loadTryEnd: false,
            totalPages: 0, 
            currentPage: 0, 
            currentAngle: 0, 
            pages: [] 
        };
        this._init();

    }

    _init() {
        this._createInterface();
        this._setDomObjects();
    }

    _createInterface() {
        this._divTiffViewer.innerHTML = 
            `<div class="tiff-controls">
                <div class="controls-left">
                    <small class="filesize"></small>
                </div>
                <div class="controls-center">
                    <input type="text" name="page-number" value="0" autocomplete="off">
                    <span class="page-sep">/</span>
                    <input type="text" name="total-pages" value="0" readonly>
                    <div class="ctrl-sep"></div>
                    <button type="button" name="zoomout" title="Reducir">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-dash-lg" viewBox="0 0 16 16">
                            <path fill-rule="evenodd" d="M2 8a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 8Z"/>
                        </svg>
                    </button>
                    <input type="text" name="zoom" autocomplete="off">
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
            <div class="tiff-progress">
                <progress value="0" name="pg-download" max="100"></progress>
                <progress value="0" name="pg-load" max="100"></progress>
            </div>
            <div class="tiff-loading hide">
                <p>Cargando...</p>
            </div>
            <div class="dialog-container hide">
                <div class="dialog-content"></div>
            </div>
            <div class="tiff-pages" data-zoom="${this._initParams.zoom}">
            </div>`;
    }

    _setDialogContent(content) {
        this._divDialog.querySelector('div.dialog-content').innerHTML = content;
    }

    _showDialog() {
        this._divDialog.classList.remove('hide');
    }

    _showDialog(content) {
        this._setDialogContent(content);
        this._divDialog.classList.remove('hide');
    }

    _showDialogAlert(title, text) {
        let content = `<h5 class="title">${title}</h5><div class="body"><p>${text}</p></div>`;
        this._showDialog(content);
    }

    _hideDialog() {
        this._divDialog.classList.add('hide');
    }

    _setDomObjects() {
        this._divLoading = this._divTiffViewer.querySelector(".tiff-loading");
        this._divDialog = this._divTiffViewer.querySelector(".dialog-container");
        this._divPages = this._divTiffViewer.querySelector(".tiff-pages");
        this._divControls = this._divTiffViewer.querySelector(".tiff-controls");
        this._inputTotalPages = this._divTiffViewer.querySelector("input[name='total-pages']");
        this._inputNumPage = this._divTiffViewer.querySelector("input[name='page-number']");
        this._inputZoom = this._divTiffViewer.querySelector("input[name='zoom']");
        this._btnZoomOut = this._divTiffViewer.querySelector("button[name='zoomout']");
        this._btnZoomIn = this._divTiffViewer.querySelector("button[name='zoomin']");
        this._btnRotateLeft = this._divTiffViewer.querySelector("button[name='rotateleft']");
        this._btnExpandToWidth = this._divTiffViewer.querySelector("button[name='expandtowidth']");
        this._pgDownload = this._divTiffViewer.querySelector("progress[name='pg-download']");
        this._pgLoad = this._divTiffViewer.querySelector("progress[name='pg-load']");
    }

    _calculateFileSizeToShow(fileSize) {
        let oneKb = 1024;
        let oneMb = oneKb * oneKb;
        let oneGb = oneMb * oneMb;
        let strFileSize = "";
        if(fileSize > 0) {
            if(fileSize > oneGb) {
                strFileSize = (fileSize / oneGb).toFixed(2) + " GB";
            } else if(fileSize > oneMb) {
                strFileSize = (fileSize / oneMb).toFixed(2) + " MB";
            } else if(fileSize > oneKb) {
                strFileSize = (fileSize / oneKb).toFixed(2) + " KB";
            } else {
                strFileSize = fileSize + " Bytes";
            }
        } else {
            strFileSize = "0 Bytes";
        }
        return strFileSize;
    }

    _getFileSize(url) {
        return new Promise(function (resolve, reject) {
            let xhr = new XMLHttpRequest();
            xhr.open("HEAD", url, true);
            xhr.onload = function() {
                if (xhr.status === 200) {
                    resolve(parseInt(xhr.getResponseHeader("Content-Length")));
                } else {
                    reject({ status: xhr.status, statusText: xhr.statusText });
                }
            };
            xhr.onerror = function () {
                reject({ status: xhr.status, statusText: xhr.statusText });
            };
            xhr.send();
        });
    }

    async LoadAndShow() {
        let fileUrl = this._divTiffViewer.dataset.tiffUrl;
        try {
            this._tiffContent.file.size = await this._getFileSize(fileUrl);
            this._tiffContent.file.sizeToPrint = this._calculateFileSizeToShow(this._tiffContent.file.size);
            if(this._tiffContent.file.size == 0) {
                this._showDialogAlert('Tiff Viewer',`El archivo no tiene contenido (${this._tiffContent.file.sizeToPrint})`);
            } else if(this._tiffContent.file.size > this._tiffContent.file.maxSize) {
                this._showDialogAlert('Tiff Viewer',`El archivo es demasiado grande para ser visualizado (${this._tiffContent.file.sizeToPrint})`);
            } else {
                try {
                    await this._loadFile();
                } catch(err) {
                    this._showDialogAlert('Tiff Viewer',`Error al cargar el archivo: ${err.statusText}`);
                    console.error(err);
                }
            }
            this._tiffContent.file.exists = true;
        } catch(err) {
            if(err.status === 404) {
                this._showDialogAlert('Tiff Viewer',"Archivo no encontrado");
            } else {
                this._showDialogAlert('Tiff Viewer',`Error cargando archivo: ${err.statusText}`);
            }
        }
    }

    async _loadFile() {
        this._setFileDataOnUI();
        await this._getTiffFileOnMemory(this._divTiffViewer.dataset.tiffUrl);
    }

    _setFileDataOnUI() {
        this._divControls.querySelector('div.controls-left small.filesize').innerHTML = this._tiffContent.file.sizeToPrint;
    }

    _getTiffFileOnMemory(url) {
        return new Promise(function (resolve, reject) {
            this._divLoading.classList.remove("hide");
            Tiff.initialize({TOTAL_MEMORY: this._tiffContent.file.maxSize});
            let xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.open("GET", url, true);
            xhr.onload = function (e) {
                this._divLoading.classList.add("hide");
                if (xhr.status === 200) {
                    try {
                        let buffer = xhr.response;
                        let tiff = new Tiff({buffer: buffer});
                        this._tiffContent.totalPages = tiff.countDirectory();
                        for(let i = 0; i < this._tiffContent.totalPages; i++) {
                            this._tiffContent.pages.push({loaded: false,pagenum:i+1,dataUrl:'',width:0,height:0,showed:false});
                        }
                        this._inputTotalPages.value = this._tiffContent.totalPages;
                        if(this._tiffContent.totalPages > 0) {
                            if(this._initParams.page <= this._tiffContent.totalPages && this._initParams.page > 0) {
                                this._tiffContent.currentPage = this._initParams.page;
                            } else {
                                this._tiffContent.currentPage = 1;
                            }
                        }
                        this._drawEmptyPages();
                        this._inputNumPage.value = this._tiffContent.currentPage;
                        this._showCurrentPageZone();
                        for (let i = 0, len = this._tiffContent.totalPages; i < len; ++i) {
                            let numpage = i + 1;
                            console.log(i);
                            tiff.setDirectory(i);
                            this._tiffContent.pages[i].loaded = true;
                            this._tiffContent.pages[i].pagenum = numpage;
                            this._tiffContent.pages[i].dataUrl = tiff.toCanvas().toDataURL(), 
                            this._tiffContent.pages[i].width = tiff.width();
                            this._tiffContent.pages[i].height = tiff.height();
                            this._tiffContent.file.loadProgress = Math.floor(((i + 1) / this._tiffContent.totalPages) * 100);
                            this._pgLoad.value = this._tiffContent.file.loadProgress;
                            this._tiffContent.isLoaded = true;
                        }
                        console.log(this._tiffContent.pages);
                        resolve(true);
                    } catch(err) {
                        reject({status: "Error", statusText: err.message});
                    }
                } else {
                    reject({ status: xhr.status, statusText: xhr.statusText });
                }
            }.bind(this);
            xhr.onerror = function () {
                reject({ status: xhr.status, statusText: xhr.statusText });
            };
            xhr.onprogress = function (e) {
                this._tiffContent.file.downloadProgress = Math.floor((e.loaded / e.total) * 100);
                this._pgDownload.value = this._tiffContent.file.downloadProgress;
            }.bind(this);
            xhr.send();
        }.bind(this));
    }

    _drawEmptyPages() {
        for (let npage = 0; npage < this._tiffContent.totalPages; npage++) {
            let div = document.createElement("div");
            let pageTemplate =  `<div class="tiff-page" data-page="${npage + 1}">
                    <div class="image-wrapper">
                        <div class="numpage-wrapper">
                            <small class="numpage">${npage + 1}</small>
                        </div>
                        <div class="tiff-image"></div>
                    </div>
                </div>`;
            div.innerHTML = pageTemplate;
            this._divPages.appendChild(div.firstChild);
        }
        this._setZoom(this._initParams.zoom);
        this._bindPageObserver();
        this._bindEvents();
    }

    async _showCurrentPageZone() {
        if(this._tiffContent.totalPages > 0) {
            if(this._tiffContent.currentPage > 0 && this._tiffContent.currentPage <= this._tiffContent.totalPages) {
                let start = this._tiffContent.currentPage - this._maxAroundPagesToShow;
                let end = this._tiffContent.currentPage + this._maxAroundPagesToShow;
                let pageStart = start > 0 ? start : 1;
                let pageEnd = end <= this._tiffContent.totalPages ? end : this._tiffContent.totalPages;
                for (let npage = pageStart; npage <= pageEnd; npage++) {
                    this._showNumPage(npage);
                }
            }
        }
    }

    async _showNumPage(numpage) {
        if(this._tiffContent.totalPages > 0) {
            if(numpage > 0 && numpage <= this._tiffContent.totalPages) {
                let pageindex = numpage - 1;
                let page = this._divPages.querySelector(`div.tiff-page[data-page="${numpage}"]`);
                if(page) {
                    let divImg = page.querySelector(`div.tiff-image`);
                    let imgTag = page.querySelector(`div.tiff-image img`);
                    if(divImg) {
                        if(!imgTag) {
                            divImg.innerHTML = '<div class="lds-dual-ring"></div>';
                            while(!this._tiffContent.pages[pageindex].loaded) {
                                await this._sleep(250);
                            }
                            divImg.innerHTML = '';
                            let imgTag = document.createElement("img");
                            imgTag.src = this._tiffContent.pages[pageindex].dataUrl;
                            page.querySelector(`div.tiff-image`).appendChild(imgTag);
                        }
                    }
                }
            }
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _bindEvents() {
        this._inputNumPage.addEventListener("keyup", (event) => { this._onInputNumPage(event); });
        this._inputNumPage.addEventListener("focusout", (event) => { this._onInputNumPage(event); });
        this._inputNumPage.addEventListener("keydown", (event) => { this._onInputKeyDownEnter(event); });
        this._inputNumPage.addEventListener("focus", () => { this._onInputNumPageFocus(); });
        this._btnZoomIn.addEventListener("click", () => { this._zoomIn(); });
        this._btnZoomOut.addEventListener("click", () => { this._zoomOut(); });
        this._btnRotateLeft.addEventListener("click", () => { this._rotateLeft(); });
        window.addEventListener("resize", () => { this._onWindowResize(); });
        window.addEventListener("orientationchange", () => { this._onWindowOrientationChange(); });
        this._inputZoom.addEventListener("keyup", (event) => { this._onInputZoom(event); });
        this._inputZoom.addEventListener("focusout", (event) => { this._onInputZoom(event); });
        this._inputZoom.addEventListener("keydown", (event) => { this._onInputKeyDownEnter(event); });
        this._inputZoom.addEventListener("focus", () => { this._onInputZoomFocus(); });
        this._btnExpandToWidth.addEventListener("click", () => { this._expandToWidth(); });
    }

    _onInputKeyDownEnter(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            return false;
        }
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
        this._tiffContent.currentAngle -= 90;
        if(this._tiffContent.currentAngle === -360) {
            this._tiffContent.currentAngle = 0;
        }
        this._divPages.classList.remove("rotated-90", "rotated-180", "rotated-270");
        if(this._tiffContent.currentAngle != 0) {
            this._divPages.classList.add(`rotated${this._tiffContent.currentAngle}`);
        }
    }

    _onInputNumPage(event) {
        if (event.key === 'Enter') {
            if(this._isPositiveInteger(this._inputNumPage.value)) {
                let numpage = parseInt(this._inputNumPage.value);
                if(numpage >= 1 && numpage <= this._tiffContent.totalPages) {
                    this._setPage(numpage);
                } else {
                    this._inputNumPage.value = this._tiffContent.currentPage;
                }
            } else {
                this._inputNumPage.value = this._tiffContent.currentPage;
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
        if(this._tiffContent.totalPages > 0) {
            if(numpage > 0 && numpage <= this._tiffContent.totalPages) {
                this._tiffContent.currentPage = numpage;
                this._showCurrentPageZone();
            }
        }
        this._inputNumPage.value = this._tiffContent.currentPage;
        let divPage = this._divPages.querySelector(`div.tiff-page[data-page="${this._tiffContent.currentPage}"]`);
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
                this._tiffContent.currentPage = paginaVisible;
                this._inputNumPage.value = this._tiffContent.currentPage;
                this._showCurrentPageZone();
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
