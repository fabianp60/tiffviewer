class TiffViewer {
    constructor(divTiffViewer, initparams = {zoom: 100, page: 1}) {
        this._DAO = new TiffViewerDB('local_tiffviewer_db');
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
        // nombres de tablas e indices
        this._tiff_imag_table = 'tiff_image';
        this._tiff_page_table = 'tiff_page';
        this._idx_imgid_pagenum = 'idx_imgid_pagenum';
        this._lastZoom = this._initParams.zoom;
        // ayuda a determinar si se cargan todas las imagenes en memoria o en BD
        this._numPagesInMemoryLimit = 30;
        // numero de paginas a mostrar antes y despues de la pagina actual 
        // si se supera el limite de  _numPagesInMemoryLimit
        this._maxAroundPagesToShow = 5;
        // indica si indexedDB está disponible
        // siempre que se pueda usar la BD se usará
        this._canUseDB = false;
        // indica si se mostraron todas las paginas (solo si se cargan todas en memoria)
        this._allPagesShowed = false;
        // indica el maximo numero de dias que se puede guardar una imagen en BD
        this._maxDaysInBD = 1;
        this._tiffContent = { 
            file: {
                url: this._divTiffViewer.dataset.tiffUrl,
                fileName: this._getFileName(this._divTiffViewer.dataset.tiffUrl),
                size: 0, // in bytes
                maxSize: 629145600, // in bytes {50MB: 52428800, 600MB: 629145600, 300MB: 314572800}
                sizeToPrint: "",
                downloadProgress: 0,
                loadProgress: 0,
                exists: false
            },
            tiff: null,
            alreadyExistsOnBD: false,
            imageFromBD: null,
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
                <div class="controls-right">
                    <small class="filename"></small>
                </div>
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

    _getFileName(url) {
        let fileName = url.split("/").pop();
        return fileName;
    }

    async _tryOpenDB() {
        try {
            await this._DAO.OpenDatabase();
            this._canUseDB = this._DAO.IsOpen();
            if(this._canUseDB) {
                await this._cleanOldImagesFromDataBase();
            }
        } catch (error) {
            this._canUseDB = false;
            console.log('No se puede usar la idxDB', error);
        }
    }

    async _cleanOldImagesFromDataBase() {
        try {
            let images_result = await this._DAO.SelectAllAsync(this._tiff_imag_table);
            if(images_result.status == 'success') {
                let images = images_result.value;
                let date_now = Date.now();
                for(let i = 0; i < images.length; i++) {
                    let image = images[i];
                    if(this._getFileName(image.url) != this._tiffContent.file.fileName) {
                        let num_days = this._calcNumDays(date_now, images[i].lastUsed);
                        if(num_days > this._maxDaysInBD) {
                            // delete image pages from database
                            try {
                                let delete_result = await this._DAO.DeleteByIndexAsync(this._tiff_page_table,'idx_imgid', image.id);
                                if(delete_result.status != 'success') {
                                    console.log('No se pudo eliminar las paginas de la imagen ' + image.url);
                                }
                            } catch {
                                console.log('No se pudo eliminar las paginas de la imagen ' + image.url);
                            }
                            let result = await this._DAO.DeleteAsync(this._tiff_imag_table, image.id);
                            if(result.status != 'success') {
                                console.log('No se pudo eliminar la imagen ' + image.url);
                            }
                        }
                    } else {
                        this._tiffContent.alreadyExistsOnBD = true;
                        this._tiffContent.imageFromBD = image;
                        // update lastUsed
                        image.lastUsed = date_now;
                        image.url = this._tiffContent.file.url;
                        let result = await this._DAO.UpdateAsync(this._tiff_imag_table, image);
                        if(result.status != 'success') {
                            console.log('No se pudo actualizar la fecha de uso de la imagen ' + image.url);
                        }
                    }
                }
            } else {
                console.log('Error al obtener las imagenes de la base de datos', images_result.value);
            }
        } catch(err) {
            console.log('Error al limpiar la base de datos', err);
        }
    }

    _calcNumDays(date1, date2) {
        let oneDay = 24 * 3600 * 1000;
        let diffDays = Math.round(Math.abs((date2 - date1) / (oneDay)));
        return diffDays;
    }

    async LoadAndShow() {
        // intenta abrir la BD y si conecta, limpia las imagenes más antiguas
        await this._tryOpenDB();
        try {
            this._tiffContent.file.size = await this._getFileSize(this._tiffContent.file.url);
            this._tiffContent.file.sizeToPrint = this._calculateFileSizeToShow(this._tiffContent.file.size);
            if(this._tiffContent.file.size == 0) {
                this._showDialogAlert('Tiff Viewer',`El archivo no tiene contenido (${this._tiffContent.file.sizeToPrint})`);
            } else if(this._tiffContent.file.size > this._tiffContent.file.maxSize) {
                this._showDialogAlert('Tiff Viewer',`El archivo es demasiado grande para ser visualizado (${this._tiffContent.file.sizeToPrint})`);
            } else {
                this._tiffContent.file.exists = true;
                this._loadFile();
            }
        } catch(err) {
            if(err.status === 404) {
                this._showDialogAlert('Tiff Viewer',"Archivo no encontrado");
            } else {
                this._showDialogAlert('Tiff Viewer',`Error cargando archivo: ${err.statusText}`);
            }
        }
    }

    async _loadFile() {
        try {
            let promises = [];
            this._setFileDataOnUI();
            promises.push(this._UpdateDownloadProgressAsync());
            promises.push(this._UpdateLoadProgressAsync());
            if(this._tiffContent.alreadyExistsOnBD) {
                if(!this._tiffContent.imageFromBD.allPagesLoaded) {
                    promises.push(this._LoadPagesFromDBAsync());
                } else {
                    promises.push(this._LoadPagesFromTiffFileAsync());
                }
            } else {
                promises.push(this._LoadPagesFromTiffFileAsync());
            }
            await Promise.all(promises);
        } catch(err) {
            this._showDialogAlert('Tiff Viewer',`Error al cargar el archivo: ${err.statusText}`);
            console.error(err);
        }
    }

    _setFileDataOnUI() {
        this._divControls.querySelector('div.controls-left small.filesize').innerHTML = this._tiffContent.file.sizeToPrint;
        this._divControls.querySelector('div.controls-right small.filename').innerHTML = this._tiffContent.file.fileName;
    }

    async _UpdateDownloadProgressAsync() {
        while(this._tiffContent.file.downloadProgress < 100) {
            this._pgDownload.value = this._tiffContent.file.downloadProgress;
            await this._sleep(250);
       }
       this._pgDownload.value = this._tiffContent.file.downloadProgress;
    }

    async _UpdateLoadProgressAsync() {
        while(this._tiffContent.file.loadProgress < 100) {
            this._pgLoad.value = this._tiffContent.file.loadProgress;
            await this._sleep(250);
       }
       this._pgLoad.value = this._tiffContent.file.loadProgress;
    }

    async _LoadPagesFromDBAsync() {
        this._divLoading.classList.remove("hide");
        this._tiffContent.file.downloadProgress = 100;
        this._tiffContent.file.loadProgress = 100;
        await this._showCurrentPageZone();
        this._bindEvents();
        this._divLoading.classList.add("hide");
    }

    async _LoadPagesFromTiffFileAsync() {
        try {
            this._divLoading.classList.remove("hide");
            let tiffDownloaded = await this._getTiffFileOnMemory(this._divTiffViewer.dataset.tiffUrl);
            if(tiffDownloaded.status == 'success') {
                if(this._tiffContent.totalPages > 0) {
                    this._startLoadingPagesFromTiff();
                } else {
                    this._showDialogAlert('Tiff Viewer',`El archivo no tiene paginas`);
                }
                this._divLoading.classList.add("hide");
            }
        } catch(err) {
            this._showDialogAlert('Tiff Viewer',`Error al cargar el archivo: ${err.statusText}`);
            console.error(err);
        }
    }

    async _startLoadingPagesFromTiff() {
        for(let i = 0; i < this._tiffContent.totalPages; i++) {
            this._tiffContent.pages.push({pagenum:i+1,dataUrl:'',width:0,height:0, lastTimeViewed:Infinity});
        }
        this._inputTotalPages.value = this._tiffContent.totalPages;
        if(this._tiffContent.totalPages > 0) {
            if(this._initParams.page > 0 && this._initParams.page <= this._tiffContent.totalPages) {
                this._tiffContent.currentPage = this._initParams.page;
            } else {
                this._tiffContent.currentPage = 1;
            }
        }
        this._drawEmptyPages();
        this._inputNumPage.value = this._tiffContent.currentPage;
        
        if(this._canUseDB) {
            if(!this._tiffContent.alreadyExistsOnBD) {
                this._tiffContent.imageFromBD = { fileName: this._tiffContent.file.fileName, url: this._tiffContent.file.url, size: this._tiffContent.file.size, totalPages: this._tiffContent.totalPages, allPagesLoaded: false, lastUsed: Date.now() };
                this._tiffContent.alreadyExistsOnBD = await this._insertTiffImage();
            }
            // la siguiente instrucción es async así que continuará sin importar no haber terminado
            this._loadPagesInDatabase();
        } else {
            // la siguiente instrucción es async así que continuará sin importar no haber terminado
            this._loadPagesInMemory();
        }
        // mostrara las paginas cuando estén disponibles en memoria
        this._showCurrentPageZone().then(function() {
            // Registra los eventos
            this._bindEvents();
            this._divLoading.classList.add("hide");
        }.bind(this));
    }

    _getTiffFileOnMemory(url) {
        return new Promise(function (resolve, reject) {
            Tiff.initialize({TOTAL_MEMORY: this._tiffContent.file.maxSize});
            let xhr = new XMLHttpRequest();
            xhr.responseType = 'arraybuffer';
            xhr.open("GET", url, true);
            xhr.onload = function (e) {
                if (xhr.status === 200) {
                    try {
                        this._tiffContent.file.downloadProgress = 100;
                        let buffer = xhr.response;
                        let tiff = new Tiff({buffer: buffer});
                        this._tiffContent.totalPages = tiff.countDirectory();
                        this._tiffContent.tiff = tiff;
                        resolve({status: "success", statusText: "Ok"});
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
            }.bind(this);
            xhr.send();
        }.bind(this));
    }

    async _loadPagesInDatabase() {
        let promises = [];
        if(this._tiffContent.alreadyExistsOnBD) {
            for(let i = 0; i < this._tiffContent.totalPages; i++) {
                let pageExists = false;
                let tiff_page = structuredClone(this._tiffContent.pages[i]);
                let tiff_page_result = await this._DAO.SelectByIndexAsync(this._tiff_page_table, this._idx_imgid_pagenum, IDBKeyRange.only([this._tiffContent.imageFromBD.id, tiff_page.pagenum]));
                if(tiff_page_result.status == 'success') {
                    if(tiff_page_result.value) {
                        pageExists = true;
                    }
                }
                if(!pageExists) {
                    this._tiffContent.tiff.setDirectory(i);
                    tiff_page.dataUrl = this._tiffContent.tiff.toCanvas().toDataURL(), 
                    tiff_page.width = this._tiffContent.tiff.width();
                    tiff_page.height = this._tiffContent.tiff.height();
                    promises.push(this._loadPageInDatabase(tiff_page));
                }
                this._tiffContent.file.loadProgress = Math.floor((i / this._tiffContent.totalPages) * 100);
            }
            await Promise.all(promises);
            this._tiffContent.isLoaded = true;
            this._tiffContent.file.loadProgress = 100;
            this._tiffContent.imageFromBD.allPagesLoaded = true;
            this._tiffContent.alreadyExistsOnBD = true;
            await this._updateTiffImage();
        } else {
            this._showDialogAlert('Tiff Viewer',`Error durante el cargue del archivo (idxDB)`);
        }
        this._tiffContent.tiff = null;
    }

    async _insertTiffImage() {
        let inserted = false;
        try {
            let timg_result = await this._DAO.SelectByIndexAsync(this._tiff_imag_table, 'idx_fileName', this._tiffContent.imageFromBD.fileName);
            if(timg_result.status == 'success') {
                if(timg_result.value) {
                    this._tiffContent.imageFromBD.id = timg_result.value.id;
                } 
                else {
                    let tiff_img_insert = await this._DAO.InsertAsync(this._tiff_imag_table, this._tiffContent.imageFromBD);
                    if(tiff_img_insert.status == 'success') {
                        this._tiffContent.imageFromBD.id = tiff_img_insert.value;
                        inserted = true;
                    }
                }
            }
        } catch(err) {
            console.error(`La imagen ${this._tiffContent.imageFromBD.url} no se pudo insertar`, err);
        }
        return inserted;
    }

    async _updateTiffImage() {
        let updated = false;
        try {
            let timg_result = await this._DAO.UpdateAsync(this._tiff_imag_table, this._tiffContent.imageFromBD);
            if(timg_result.status == 'success') {
                updated = true;
            }
        } catch(err) {
            console.error(`La imagen ${this._tiffContent.imageFromBD.url} no se pudo actualizar`, err);
        }
        return updated;
    }

    async _loadPageInDatabase(tiff_page) {
        let tiff_img_id = this._tiffContent.imageFromBD.id;
        let pageLoaded = false;
        let maxTrys = 2, trynum = 0;
        while(!pageLoaded && trynum < maxTrys) {
            trynum++;
            try {
                if(tiff_img_id) {
                    if(tiff_img_id > 0) {
                        tiff_page["imgid"] = tiff_img_id;
                        let tiff_page_result = await this._DAO.SelectByIndexAsync(this._tiff_page_table, this._idx_imgid_pagenum, IDBKeyRange.only([tiff_img_id, tiff_page.pagenum]));
                        if(tiff_page_result.status == 'success') {
                            if(tiff_page_result.value) {
                                pageLoaded = true;
                            } else {
                                let tiff_page_insert = await this._DAO.InsertAsync(this._tiff_page_table, tiff_page);
                                if(tiff_page_insert.status == 'success') {
                                    pageLoaded = true;
                                }
                            }
                        } else {
                            let tiff_page_insert = await this._DAO.InsertAsync(this._tiff_page_table, tiff_page);
                            if(tiff_page_insert.status == 'success') {
                                pageLoaded = true;
                            }
                        }
                    }
                }
            } catch(err) {
                console.error(`Load in DB of page ${tiff_page.pagenum} fails`, err);
            }
        }
        return pageLoaded;
    }

    async _loadPagesInMemory() {
        for (let i = 0, len = this._tiffContent.totalPages; i < len; ++i) {
            tiff.setDirectory(i);
            this._tiffContent.pages[i].dataUrl = this._tiffContent.tiff.toCanvas().toDataURL(), 
            this._tiffContent.pages[i].width = this._tiffContent.tiff.width();
            this._tiffContent.pages[i].height = this._tiffContent.tiff.height();
            this._tiffContent.file.loadProgress = Math.floor(((i + 1) / this._tiffContent.totalPages) * 100);
        }
        this._tiffContent.isLoaded = true;
        tiff = null;
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
    }

    async _showCurrentPageZone() {
        if(this._tiffContent.totalPages > 0) {
            if(this._tiffContent.currentPage > 0 && this._tiffContent.currentPage <= this._tiffContent.totalPages) {
                if(this._canUseDB) {
                    await this._showCurrentPageZoneFromDB();
                } else {
                    await this._showCurrentPageZoneFromMemory();
                }
            }
        }
    }

    async _unshowPagesExceptPageRange(rangeIni, rangeEnd) {
        let pageStart = 1;
        let pageEnd = this._tiffContent.totalPages;
        for(let i = pageStart; i <= pageEnd; i++) {
            if(i < rangeIni || i > rangeEnd) {
                let page = this._divPages.querySelector(`div.tiff-page[data-page="${i}"]`);
                if(page) {
                    let divImg = page.querySelector(`div.tiff-image`);
                    if(divImg) {
                        divImg.innerHTML = '';;
                    }
                }
            }
        }
    }

    async _showCurrentPageZoneFromDB() {
        if(this._tiffContent.totalPages <= this._numPagesInMemoryLimit) {
            // mostrar todas las paginas en memoria
            if(!this._allPagesShowed) {
                let promises = [];
                let pageStart = 1;
                let pageEnd = this._tiffContent.totalPages;
                for(let i = pageStart; i <= pageEnd; i++) {
                    promises.push(this._showPageFromDB(i));
                }
                await Promise.all(promises); 
            }
        } else {
            // mostrar las paginas en el rango de la pagina actual
            let start = this._tiffContent.currentPage - this._maxAroundPagesToShow;
            let end = this._tiffContent.currentPage + this._maxAroundPagesToShow;
            let pageStart = start > 0 ? start : 1;
            let pageEnd = end <= this._tiffContent.totalPages ? end : this._tiffContent.totalPages;
            await this._unshowPagesExceptPageRange(pageStart, pageEnd);
            let promises = [];
            for(let i = pageStart; i <= pageEnd; i++) {
                promises.push(this._showPageFromDB(i));
            }
            await Promise.all(promises);  
        }
    }

    async _showPageFromDB(numpage) {
        let page = this._divPages.querySelector(`div.tiff-page[data-page="${numpage}"]`);
        if(page) {
            let divImg = page.querySelector(`div.tiff-image`);
            let imgTag = page.querySelector(`div.tiff-image img`);
            if(divImg) {
                if(!imgTag) {
                    divImg.innerHTML = '<div class="lds-dual-ring"></div>';
                    let tiff_page_result;
                    do {
                        tiff_page_result = await this._DAO.SelectByIndexAsync(this._tiff_page_table, this._idx_imgid_pagenum, IDBKeyRange.only([this._tiffContent.imageFromBD.id, numpage]));
                        if(tiff_page_result.status == 'success') {
                            if(tiff_page_result.value) {
                                divImg.innerHTML = '';
                                let imgTag = document.createElement("img");
                                imgTag.src = tiff_page_result.value.dataUrl;
                                page.querySelector(`div.tiff-image`).appendChild(imgTag);
                            } else {
                                await this._sleep(250);
                            }
                        }
                    } while(!tiff_page_result.value);
                }
            }
        }
    }

    async _showCurrentPageZoneFromMemory() {
        if(this._tiffContent.totalPages <= this._numPagesInMemoryLimit) {
            // mostrar todas las paginas en memoria
            if(!this._allPagesShowed) {
                let pageStart = 1;
                let pageEnd = this._tiffContent.totalPages;
                for (let npage = pageStart; npage <= pageEnd; npage++) {
                    this._showNumPageFromMemory(npage);
                }
                this._allPagesShowed = true;
            }
        } else {
            // mostrar las paginas en el rango de la pagina actual
            let start = this._tiffContent.currentPage - this._maxAroundPagesToShow;
            let end = this._tiffContent.currentPage + this._maxAroundPagesToShow;
            let pageStart = start > 0 ? start : 1;
            let pageEnd = end <= this._tiffContent.totalPages ? end : this._tiffContent.totalPages;
            await this._unshowPagesExceptPageRange(pageStart, pageEnd);
            for (let npage = pageStart; npage <= pageEnd; npage++) {
                this._showNumPageFromMemory(npage);
            }
        }
    }

    async _showNumPageFromMemory(numpage) {
        let page = this._divPages.querySelector(`div.tiff-page[data-page="${numpage}"]`);
        if(page) {
            let divImg = page.querySelector(`div.tiff-image`);
            let imgTag = page.querySelector(`div.tiff-image img`);
            if(divImg) {
                if(!imgTag) {
                    divImg.innerHTML = '<div class="lds-dual-ring"></div>';
                    let pagObj = this._tiffContent.pages.find(page => page.pagenum == numpage);
                    while(pagObj.dataUrl == '') {
                        await this._sleep(250);
                        pagObj = this._tiffContent.pages.find(page => page.pagenum == numpage);
                    }
                    divImg.innerHTML = '';
                    let imgTag = document.createElement("img");
                    imgTag.src = pagObj.dataUrl;
                    page.querySelector(`div.tiff-image`).appendChild(imgTag);
                }
            }
        }
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _bindEvents() {
        this._bindPageObserver();
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
        if(zoom < 30) {
            zoom = 30;
        }
        this._setZoom(zoom);
    }

    _onInputZoom(event) {
        if (event.key === 'Enter') {
            if(this._isPositiveInteger(this._inputZoom.value.replace("%", ""))) {
                let zoom = parseInt(this._inputZoom.value.replace("%", ""));
                if(zoom >= 30 && zoom <= 300) {
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
        let intersectingEntries = entries.filter(entry => entry.isIntersecting);
        let paginaVisible = Math.min.apply(Math,intersectingEntries.map((entry) => { return parseInt(entry.target.innerHTML); }));
        if(paginaVisible !== Infinity) {
            this._tiffContent.currentPage = paginaVisible;
            this._inputNumPage.value = this._tiffContent.currentPage;
            this._showCurrentPageZone();
        }
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


class TiffViewerDB {
    constructor(dbName) {
        this._localDB = {
            db: null,
            db_is_open: false,
            version: 1,
            databaseName: dbName,
            tables_config: this._parameterizeTables(),
            tables: [],
            dbOpenRequest: null,
            sucess: false
        };
        this._dbSupported = false;
        this._initIndexedDBAccessObjects();
        if(this.indexedDB) {
            this._dbSupported = true;
        }
    }

    IsIndexedDBSupported() {
        return this._dbSupported;
    }

    _parameterizeTables() {
        return [
            {
                tableName: 'tiff_image', 
                keyOptions: {keyPath: "id", autoIncrement: true},
                indexes: [
                    {idxname:"idx_fileName", name: "fileName", index_options: {unique: true}},
                    {idxname:"idx_url", name: "url", index_options: {unique: false}},
                    {idxname:"idx_size", name: "size", index_options: {unique: false}},
                    {idxname:"idx_totalPages", name: "totalPages", index_options: {unique: false}},
                    {idxname:"idx_lastUsed", name: "lastUsed", index_options: {unique: false}},
                    {idxname:"idx_fileName_size", name: ["fileName","size"], index_options: {unique: false}}
                ]
            },
            {
                tableName: 'tiff_page',
                keyOptions: {keyPath: "id", autoIncrement: true},
                indexes: [
                    {idxname:"idx_imgid", name: "imgid", index_options: {unique: false}},
                    {idxname:"idx_pagenum", name: "pagenum", index_options: {unique: false}},
                    {idxname:"idx_imgid_pagenum", name: ["imgid","pagenum"], index_options: {unique: true}}
                ]
            }
        ];
    }

    _initIndexedDBAccessObjects() {
        this.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        this.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction;
        this.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    }

    OpenDatabase() {
        return new Promise((resolve, reject) => {
            if(this._dbSupported) {
                let db = this._localDB;
                this._localDB.dbOpenRequest = this.indexedDB.open(db.databaseName, db.version);
                this._localDB.dbOpenRequest.onupgradeneeded = this._onUpgradeNeeded.bind(this);
                this._localDB.dbOpenRequest.onsuccess = function(evt) {
                    this._localDB.db = this._localDB.dbOpenRequest.result || evt.target.result;
                    this._localDB.db_is_open = true;
                    resolve({status:"success", value: true});
                }.bind(this);
                this._localDB.dbOpenRequest.onerror = function(err) {
                    this._localDB.db_is_open = false;
                    reject({status:"error", value: err.message});
                }.bind(this);
            }
        });
    }

    IsOpen() {
        return this._localDB.db_is_open;
    }

    _onUpgradeNeeded(evt) {
        this._localDB.db = evt.target.result;
        let db = this._localDB.db;
        // Crear tablas
        if(!this._localDB.db.objectStoreNames.contains(this._localDB.databaseName)) {
            for (let table_idx = 0; table_idx < this._localDB.tables_config.length; table_idx++) {
                const table_config = this._localDB.tables_config[table_idx];
                let store = db.createObjectStore(table_config.tableName, table_config.keyOptions);
                for (let col_idx = 0; col_idx < table_config.indexes.length; col_idx++) {
                    store.createIndex(table_config.indexes[col_idx].idxname, table_config.indexes[col_idx].name, table_config.indexes[col_idx].index_options);
                }
                this._localDB.tables[table_config.tableName] = store;
            }
        }
    }

    SelectAllAsync(tableName) {
        return new Promise((resolve, reject) => {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readonly');
                let store = transaction.objectStore(tableName);
                let request = store.getAll();
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        });
    }

    SelectByIndexAsync(tableName, byindex, key) {
        return new Promise(function (resolve, reject) {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readonly');
                let store = transaction.objectStore(tableName);
                let index = store.index(byindex);
                let request = index.get(key);
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        }.bind(this));
    }

    InsertAsync(tableName, obj) {
        return new Promise((resolve, reject) => {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readwrite');
                let store = transaction.objectStore(tableName);
                let request = store.add(obj);
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        });
    }

    DeleteAsync(tableName, key) {
        return new Promise((resolve, reject) => {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readwrite');
                let store = transaction.objectStore(tableName);
                let request = store.delete(key);
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        });
    }

    DeleteByIndexAsync(tableName, byindex, key) {
        return new Promise(function (resolve, reject) {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readwrite');
                let store = transaction.objectStore(tableName);
                let index = store.index(byindex);
                let request = index.delete(key);
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        }.bind(this));
    }

    UpdateAsync(tableName, obj) {
        return new Promise((resolve, reject) => {
            if(this._localDB.db_is_open) {
                let transaction = this._localDB.db.transaction(tableName, 'readwrite');
                let store = transaction.objectStore(tableName);
                let request = store.put(obj);
                request.onsuccess = (evt) => {
                    resolve({status:"success", value: evt.target.result});
                }
                request.onerror = (err) => {
                    reject({status:"error", value: err.target.error.message});
                }
            } else {
                reject({status:"error", value: 'Base de datos no abierta'});
            }
        });
    }
}