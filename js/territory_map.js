// -*- coding: utf8 -*-
//
// © 2017 Bernd Busse
// territory_map.js
//

// OpenStreetMap Copyright: © 2017 OpenStreetMap contributors / Open Data Commons Open Database License
// DTK NRW Copyright: © 2017 Bezirksregierung Köln / Data licence Germany – attribution – version 2.0


// FIXME: don't rely on fixed values
DEFAULTS = {
    center: [7.2499820, 51.1974775],
    kingdom_hall: [7.2553192, 51.1779812],
};


// Init custom namespace
window.TerritoryViewer = {};
var viewer = window.TerritoryViewer;


// =====================================
// Internal Helper
// =====================================
viewer.coordToProj = function(coords) {
    return ol.proj.fromLonLat(coords, 'EPSG:3857');
};

viewer.forEachLayerIn = function(group, callback) {
    var this_ = arguments.callee;
    group.getLayers().forEach(function(layer) {
        if (layer instanceof ol.layer.Layer) {
            return callback(layer);
        } else if (layer instanceof ol.layer.Group) {
            return this_(layer, callback);
        }
    });
};
viewer.forEachLayer = function(callback) {
    this.forEachLayerIn(this.map, callback);
};
viewer.colContains = function(collection, item) {
    collection.forEach(function(i) {
        if (i === item) {
            found = true;
            return false;
        }
    });

    return found;
}

viewer.extentsOf = function(group) {
    var gext = null;

    viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
        layer.getSource().getFeatures().forEach(function(feature) {
            var mext = feature.getGeometry().getExtent();

            if (gext !== null) {
                gext = [gext[0] < mext[0] ? gext[0] : mext[0],
                        gext[1] < mext[1] ? gext[1] : mext[1],
                        gext[2] > mext[2] ? gext[2] : mext[2],
                        gext[3] > mext[3] ? gext[3] : mext[3],
                ];
            } else {
                gext = mext;
            }
        });
    });

    return gext;
};

viewer.scalePT = function(base, res) {
    var pt = 9;
    var scale = (0.125 * res);

    if (typeof base !== 'number') {
        return '13pt';
    }
    if (typeof res !== 'number') {
        return base + 'pt;'
    }

    if (scale < 1) {
        pt = base;
    } else {
        pt = base / scale;
    }

    return ((pt > 9) ? pt : 9) + 'pt';
};

viewer.tools = {};
viewer.tools.createButton = function(opts) {
    var options = opts || {};

    var button = document.createElement('button');
    button.title = options.title || 'Button';

    if (options.icon !== undefined) {
        button.appendChild(viewer.tools.getIcon(options.icon));
    } else {
        button.innerHTML = options.label || 'X';
    }

    if (typeof options.handler === 'function') {
        var that = options.that || this;
        button.addEventListener('click', options.handler.bind(that), false);
        button.addEventListener('touchstart', options.handler.bind(that), false);
    }

    return button;
};
viewer.tools.getIcon = function(name) {
    var cls = name || "exclamation-triangle";

    var icon = document.createElement('span');
    icon.className = 'fa ' + cls;

    return icon;
};
viewer.tools.parseHash = function(hash) {
    if (typeof hash !== 'string' || hash.length < 1) {
        return {};
    }

    var parse = (hash.charAt(0) === '#') ? hash.substring(1) : hash;
    parse = parse.split(';');

    return {
        editMode: (parse.indexOf('edit') > -1),
    };
};

viewer.setRender = function() {
    this.map.setTarget(this.map_div);
    this.loading_div.style = "";
};
viewer.setExport = function() {
    this.map.setTarget(this.export_div);
    this.loading_div.style = "display: block;";
};
viewer.resetMap = function(mapsave) {
    this.map.setSize(mapsave.size);
    this.view.setCenter(mapsave.center);
    this.view.setZoom(mapsave.zoom);
    this.view.setRotation(mapsave.rotation);
};
viewer.setChanged = function() {
    this.export_unsavedchanges = true;
};
viewer.resetChanged = function() {
    this.export_unsavedchanges = false;
};
viewer.setLoading = function() {
    this.loading_div.style = "display: block;";
};
viewer.resetLoading = function() {
    this.loading_div.style = "";
};

viewer.updateFeatureStyle = function(feature, mode) {
    var geo = feature.getGeometry();

    if (geo !== undefined) {
        if (geo instanceof ol.geom.Polygon || geo instanceof ol.geom.LineString) { // Border
            switch (mode) {
                case 'default':
                    feature.setStyle(viewer.styles.territory);
                    break;
                case 'edit':
                    feature.setStyle(viewer.styles.territoryEdit);
                    break;
                case 'select':
                    feature.setStyle(viewer.styles.territorySelect);
                    break;
                default:
                    feature.setStyle(null);
            }
        } else if (geo instanceof ol.geom.Point) { // Marker
            switch (mode) {
                case 'default':
                    feature.setStyle(viewer.styles.marker);
                    break;
                case 'edit':
                    feature.setStyle(viewer.styles.markerEdit);
                    break;
                case 'select':
                    feature.setStyle(viewer.styles.markerSelect);
                    break;
                default:
                    feature.setStyle(null);
            }
        }
    }
}

viewer.enableInteractions = function() {
    var interaction_count_ = 2;

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom || act instanceof ol.interaction.Select) {
            setTimeout(function() {
                act.setActive(true);
            }, 200);
            if (0 == --interaction_count_) { return false; }
        }
    });

};
viewer.disableInteractions = function() {
    var interaction_count_ = 2;

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom || act instanceof ol.interaction.Select) {
            act.setActive(false);
            if (0 == --interaction_count_) { return false; }
        }
    });
};

// Help and About Messages
viewer.showHelp = function() {
    console.log("FIXME: help()");
};

viewer.showAbout = function() {
    console.log("FIXME: about()");
};


// =====================================
// Custom Exceptions
// =====================================
viewer.ex = {};
viewer.ex.LoadTerritoryException = function(message) {
    this.name = "LoadTerritoryException";
    this.message = message;
};

viewer.ex.DrawTerritoryException = function(message) {
    this.name = "DrawTerritoryException";
    this.message = message;
};


// =====================================
// Custom Controls
// =====================================
viewer.ctrl = {};

// File Handling (Load, Save, Export)
viewer.ctrl.FileControls = function(opt_options) {
    var options = opt_options || {};

    // Button "Load Territory"
    this.fileInput_ = document.createElement('input');

    var fi = this.fileInput_;
    fi.type = 'file';
    fi.name = 'TerritoryFile';
    fi.accept = '.json,application/json';
    fi.style = 'position: fixed; top: -100em;';

    var fileSelection = function(evt) {
        var input = evt.target;

        if (input.files.length > 0) {
            var file = input.files[0];

            viewer.loadTerritory(file, function(success, message) {
                if (success === true) {
                    console.log("loadTerritory() finished");
                    viewer.resetChanged();
                    viewer.view.fit(viewer.extentsOf(viewer.territoryGroup), {
                        size: viewer.map.getSize(),
                        padding: [20, 20, 20, 20],
                    });
                } else {
                    console.error("loadTerritory() failed: " + message);
                    alert("Error while loading territory '" + file.name + "': " + message);
                }

                viewer.resetLoading();
                input.value = "";
            });
        }
    };
    fi.addEventListener('change', fileSelection, false);
    fi.addEventListener('click', (e) => e.stopPropagation(), false);

    this.btnLoad_ = viewer.tools.createButton({
        icon: 'fa-folder-open-o',
        title: "Load Territory",
        that: this,
        handler: viewer.ctrl.FileControls.prototype.handleLoad,
    });
    this.btnLoad_.appendChild(fi);

    // Button "Save Territory"
    this.btnSave_ = viewer.tools.createButton({
        icon: 'fa-floppy-o',
        title: "Save Territory",
        that: this,
        handler: viewer.ctrl.FileControls.prototype.handleSave,
    });

    // Button "Export Image"
    this.btnExportViewport_ = viewer.tools.createButton();
    this.btnExportExtent_ = viewer.tools.createButton();

    this.btnExportViewport_ = viewer.tools.createButton({
        icon: 'fa-picture-o',
        title: "Export as image",
        that: this,
        handler: viewer.ctrl.FileControls.prototype.handleExportViewport,
    });

    // Add container div
    var element = document.createElement('div');
    element.className = 'tv-file-controls ol-unselectable ol-control';
    element.appendChild(this.btnLoad_);
    element.appendChild(this.btnSave_);
    element.appendChild(this.btnExportViewport_);

    if (!viewer.editMode) {
        this.btnSave_.style = 'display: none';
    }

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });

    // Handle mode Changes
    this.addEventListener('modeChanged', viewer.ctrl.FileControls.prototype.modeChanged, false);
};
ol.inherits(viewer.ctrl.FileControls, ol.control.Control);

viewer.ctrl.FileControls.prototype.modeChanged = function(evt) {
    var opts = evt.detail || {};

    if (opts.editMode === true) {
        this.btnSave_.style = '';
    } else {
        this.btnSave_.style = 'display: none;';
    }
};

viewer.ctrl.FileControls.prototype.handleLoad = function(evt) {
    if (viewer.export_unsavedchanges === true) {
        console.warn("loadTerritory(): unsaved changes!");

        var loadanyway = confirm("You have unsaved changes. Load anyway and loose changes?");
        if (loadanyway === false) {
            return; // do nothing
        }

        console.warn("loadTerritory(): ignore unsaved changes and load anyway");
    }

    viewer.setLoading();
    this.fileInput_.click();
};

viewer.ctrl.FileControls.prototype.handleSave = function(evt) {
    if (viewer.export_filename === undefined) {
        viewer.export_filename = "territory.json";
    }

    viewer.setLoading();
    viewer.saveTerritory(function(success) {
        viewer.resetLoading();
        viewer.resetChanged();
        console.log("saveTerritory() finished");
    });
};

viewer.ctrl.FileControls.prototype.handleExportViewport = function(evt) {
    viewer.exportViewport();
};

// Keyboard Handler Drawing features
viewer.ctrl.KeyboardDrawInteractions = function(opt_options) {
    var options = opt_options || {};

    ol.interaction.Interaction.call(this, {
        handleEvent: viewer.ctrl.KeyboardDrawInteractions.prototype.handleEvent,
    });
};
ol.inherits(viewer.ctrl.KeyboardDrawInteractions, ol.interaction.Interaction);

viewer.ctrl.KeyboardDrawInteractions.prototype.handleEvent = function(evt) {
    if (evt.type === 'keydown') {
        var orig = evt.originalEvent;

        switch (orig.key) {
            case "Enter":
                if (viewer.drawInteraction !== undefined) {
                    viewer.stopDraw(true);
                    return false;
                } else if (viewer.modifyInteraction !== undefined) {
                    viewer.stopEdit();
                    return false;
                }
                break;
            case "Escape":
                if (viewer.drawInteraction !== undefined) {
                    viewer.stopDraw(false);
                    return false;
                } else if (viewer.modifyInteraction !== undefined) {
                    viewer.stopEdit();
                    return false;
                }
                break;
            case "z":
                if (orig.ctrlKey) {
                    if (viewer.drawInteraction !== undefined) {
                        viewer.undoDraw(false);
                        return false;
                    }
                }
                break;
            default:
        };
    }

    //console.log(evt);
    return true;
};


// =====================================
// Base Functionality
// =====================================

// Init TerritoryViewer
viewer.initMap = function() {
    // Get DOM elements for rendering and exporting the map
    viewer.map_div = document.getElementById("map");
    viewer.export_div = document.getElementById("export-map");
    viewer.loading_div = document.getElementById("loading-spinner");

    // Init editMode
    var opts = viewer.tools.parseHash(window.location.hash);
    viewer.editMode = !!opts.editMode;

    window.addEventListener('hashchange', function(evt) {
        var parser = document.createElement('a');
        parser.href = evt.newURL;

        var opts = viewer.tools.parseHash(parser.hash);
        viewer.editMode = !!opts.editMode;

        if (viewer.editMode !== true) {
            viewer.stopDraw();
            viewer.stopEdit();
        }

        var change_evt = new CustomEvent('modeChanged', {detail: opts});
        viewer.map.getControls().forEach(function(ctrl) {
            ctrl.dispatchEvent(change_evt);
        });
    }, false);

    // Init Controls and Interactions
    var interactions = [
        new ol.interaction.DragPan({
            condition: function(evt) {
                if (viewer.drawInteraction !== undefined) {
                    return ol.events.condition.noModifierKeys(evt) && evt.originalEvent.button === 1;
                } else {
                    return ol.events.condition.noModifierKeys(evt);
                }
            }
        }),
        new ol.interaction.DoubleClickZoom(),
        new ol.interaction.PinchZoom(),
        new ol.interaction.MouseWheelZoom(),
        new ol.interaction.KeyboardPan(),
        new ol.interaction.KeyboardZoom(),
    ];
    var controls = ol.control.defaults().extend([
        new ol.control.ScaleLine(),
        new ol.control.LayerSwitcher(),
        new viewer.ctrl.FileControls({
            mode: viewer.editMode,
        }),
    ]);

    // Initialize the OpenLayers Map
    viewer.map = new ol.Map({
        target: viewer.map_div,
        controls: controls,
        interactions: interactions,
        keyboardEventTarget: document,
        view: new ol.View({
            projection: 'EPSG:3857',
            center: viewer.coordToProj(DEFAULTS.center),
            zoom: 13,
        }),
    });
    viewer.view = viewer.map.getView();
    viewer.groups = [];

    // Add custom contextmenu
    viewer.addContextMenu();

    // Initialize OpenStreetMap Layers
    var osmGroup = new ol.layer.Group({
        title: 'OpenStreetMap',
        layers: [
            // OpenStreetMap (Humanitarian)
            // http://${b}.tile.openstreetmap.fr/hot/${z}/${x}/${y}.png
            new ol.layer.Tile({
                title: "OSM Humanitarian",
                type: 'base',
                visible: false,
                source: new ol.source.OSM({
                    crossOrigin: "anonymous",
                    url: "http://{a-b}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
                }),
            }),
            // OpenStreetMap (Mapnik)
            // http://${c}.tile.openstreetmap.org/${z}/${x}/${y}.png
            new ol.layer.Tile({
                title: "OSM Mapnik",
                type: 'base',
                visible: true,
                source: new ol.source.OSM({
                    crossOrigin: "anonymous",
                    url: "http://{a-c}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                }),
            }),
        ],
    });
    viewer.groups.push(osmGroup);

    // Initialize NRW DTK Layers
    var dtkGroup = new ol.layer.Group({
        title: 'NRW DTK',
        layers: [
            // NRW ABK*
            // http://www.wms.nrw.de/geobasis/wms_nw_abk_stern?
            new ol.layer.Tile({
                title: "ABK* 1:5.000",
                type: 'base',
                visible: false,
                source: new ol.source.TileWMS({
                    url: "http://www.wms.nrw.de/geobasis/wms_nw_abk_stern?",
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'nw_abk',
                    },
                    attributions: new ol.Attribution({
                        html: '© Land NRW ' +
                            '(<a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland - Namensnennung - Version 2.0</a>)'
                    }),
                }),
            }),
            // NRW DTK10
            // http://www.wms.nrw.de/geobasis/wms_nw_dtk10?
            new ol.layer.Tile({
                title: "DTK 1:10.000",
                type: 'base',
                visible: false,
                source: new ol.source.TileWMS({
                    url: "http://www.wms.nrw.de/geobasis/wms_nw_dtk10?",
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'nw_dtk10_col,nw_dtk10_res',
                    },
                    attributions: new ol.Attribution({
                        html: '© Land NRW ' +
                            '(<a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland - Namensnennung - Version 2.0</a>)'
                    }),
                }),
            }),
            // NRW DTK
            // http://www.wms.nrw.de/geobasis/wms_nw_dtk?
            new ol.layer.Tile({
                title: "DTK Komplett",
                type: 'base',
                visible: false,
                source: new ol.source.TileWMS({
                    url: "http://www.wms.nrw.de/geobasis/wms_nw_dtk?",
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'nw_dtk_col',
                    },
                    attributions: new ol.Attribution({
                        html: '© Land NRW ' +
                            '(<a href="https://www.govdata.de/dl-de/by-2-0">Datenlizenz Deutschland - Namensnennung - Version 2.0</a>)'
                    }),
                }),
            }),
        ],
    });
    viewer.groups.push(dtkGroup);

    // init styles
    viewer.initStyles();

    // Initialize Territory Layers
    viewer.territoryGroup = new ol.layer.Group({
        title: 'Territories',
        layers: [],
    });
    viewer.groups.push(viewer.territoryGroup);

    // Special select Interaction
    var select = new ol.interaction.Select({
        //style: viewer.styles.territorySelect,
        condition: ol.events.condition.click,
        toggleCondition: ol.events.condition.click,
        filter: (ft, l) => viewer.colContains(viewer.territoryGroup.getLayers(), l) && (ft.getGeometry() instanceof ol.geom.Polygon),
        hitTolerance: 6,
    });

    select.addEventListener('change:active', function(evt) {
        var active = evt.target.get(evt.key);
        if (!active) {
            console.log("Deselect all features");
            evt.target.getFeatures().forEach((ft) => viewer.updateFeatureStyle(ft, 'default'));
            evt.target.getFeatures().clear();
        }
    }, false);

    select.addEventListener('select', function(evt) {
        evt.selected.forEach((ft) => viewer.updateFeatureStyle(ft, 'select'));
        evt.deselected.forEach((ft) => viewer.updateFeatureStyle(ft, 'default'));
    }, false);

    viewer.map.addInteraction(select);

    // Add Layers to map
    viewer.groups.forEach(function(group) {
        viewer.map.addLayer(group);
    });
};

// Initialize feature styles
viewer.initStyles = function() {
    var styles = {};
    styles.territory = new ol.style.Style({
        zIndex: 1,
        fill: new ol.style.Fill({
            color: 'rgba(255, 121, 97, 0.0)',
        }),
        stroke: new ol.style.Stroke({
            color: '#f44336',
            width: 3,
            lineDash: [20, 15, 10, 15],
            lineDashOffset: 10,
        }),
        /*image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
                color: '#f44336',
            }),
        }),*/
    });

    styles.territorySelect = styles.territory.clone();
    styles.territorySelect.getFill().setColor('rgba(255, 121, 97, 0.2)');
    styles.territorySelect.getStroke().setWidth(4);

    styles.territoryEdit = new ol.style.Style({
        zIndex: 1,
        fill: new ol.style.Fill({
            color: 'rgba(244, 67, 54, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#b9000a',
            width: 4,
        }),
        /*image: new ol.style.Circle({
            radius: 9,
            fill: new ol.style.Fill({
                color: '#b9000a',
            }),
        }),*/
    });

    styles.marker = new ol.style.Style({
        zIndex: 2,
        image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
                color: '#b9000a',
            }),
        }),
    });

    styles.markerSelect = styles.marker.clone();

    styles.markerEdit = new ol.style.Style({
        zIndex: 2,
        image: new ol.style.Circle({
            radius: 9,
            fill: new ol.style.Fill({
                color: '#cdcdcd',
            }),
        }),
    });

    styles.textRed = new ol.style.Text({
        font: '13pt Roboto, sans-serif',
        text: 'Text',
        textAlign: 'center',
        fill: new ol.style.Fill({
            color: '#ff0000',
        }),
    });

    styles.textBlack = new ol.style.Text({
        font: '13pt Roboto, sans-serif',
        text: 'Text',
        textAlign: 'center',
        fill: new ol.style.Fill({
            color: '#040404',
        }),
    });

    // Global styles
    viewer.styles = {};
    viewer.styles.draw = new ol.style.Style({
        zIndex: 1,
        fill: new ol.style.Fill({
            color: 'rgba(255, 121, 97, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#f44336',
            width: 4,
        }),
        image: new ol.style.Circle({
            radius: 6,
            fill: new ol.style.Fill({
                color: '#f44336',
            }),
        }),
    });
    viewer.styles.modify = viewer.styles.draw;

    // Feature style cache
    styles.cache = {
        normal: {},
        select: {},
        edit: {},
    };

    viewer.styles.territory = function(a, b) {
        var [ft, res] = (b === undefined) ? [this, a] : [a, b];
        var id = ft.getId() || 'noid';

        var style = styles.cache.normal[id];
        if (!style) {
            style = styles.cache.normal[id] = styles.territory.clone();
        }

        return [style];
    };

    viewer.styles.territorySelect = function(a, b) {
        var [ft, res] = (b === undefined) ? [this, a] : [a, b];
        var id = ft.getId() || 'noid';

        var style = styles.cache.select[id];
        if (!style) {
            style = styles.territorySelect.clone();
            style.setText(styles.textBlack.clone());
        }

        style.getText().setFont(viewer.scalePT(22, res) + ' Roboto, sans-serif');
        style.getText().setText(ft.get('title') || '');

        return [style];
    };

    viewer.styles.territoryEdit = function(a, b) {
        var [ft, res] = (b === undefined) ? [this, a] : [a, b];
        var id = ft.getId() || 'noid';

        var style = styles.cache.edit[id];
        if (!style) {
            style = styles.territoryEdit.clone();
            style.setText(styles.textRed.clone());
        }

        style.getText().setFont(viewer.scalePT(24, res) + ' Roboto, sans-serif');
        style.getText().setText((ft.get('title') || '') + '\n(EDIT)');

        return [style];
    };

    viewer.styles.marker = function(a, b) {
        var [ft, res] = (b === undefined) ? [this, a] : [a, b];
        var id = ft.getId() || 'noid';

        var style = styles.cache.normal[id];
        if (!style) {
            style = styles.marker.clone();
            style.setText(styles.textBlack.clone());

            style.getText().setOffsetY(-6);
            style.getText().setTextBaseline('bottom');
        }

        style.getText().setFont(viewer.scalePT(22, res) + ' Roboto, sans-serif');
        style.getText().setText(ft.get('title') || '');

        return [style];
    };
    viewer.styles.markerSelect = viewer.styles.marker;

    viewer.styles.markerEdit = function(a, b) {
        var [ft, res] = (b === undefined) ? [this, a] : [a, b];
        var id = ft.getId() || 'noid';

        var style = styles.cache.edit[id];
        if (!style) {
            style = styles.markerEdit.clone();
            style.setText(styles.textRed.clone());

            style.getText().setOffsetY(-6 - 24);
            style.getText().setTextBaseline('bottom');
        }

        style.getText().setFont(viewer.scalePT(24, res) + ' Roboto, sans-serif');
        style.getText().setText((ft.get('title') || '') + '\n(EDIT)');

        return [style];
    };
};

// Initialize contextmenu
viewer.addContextMenu = function() {
    // Disable default contextmenu
    document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
    });

    // Add contextmenu control
    viewer.contextmenu = new ContextMenu({
        width: 240,
        defaultItems: false,
        items: []
    });
    viewer.map.addControl(viewer.contextmenu);

    // Disable custom contextmenu on other controls
    var ctrls = Array.from(document.getElementsByClassName('ol-control'));
    ctrls = ctrls.concat(Array.from(document.getElementsByClassName('ol-scale-line')));
    for (var i = 0; i < ctrls.length; ++i) {
        ctrls[i].addEventListener('contextmenu', (e) => e.stopPropagation(), false);
    }

    viewer.contextmenu.addEventListener('beforeopen', function(evt) {
        var feature = viewer.map.forEachFeatureAtPixel(evt.pixel, (ft, l) => ft, {
            hitTolerance: 6,
        });

        if (feature) {
            if (viewer.drawInteraction !== undefined) {
                viewer.contextmenu.disable();
                viewer.undoDraw();
            } else {
                viewer.contextmenu.enable();
            }
        } else {
            viewer.contextmenu.enable();
        }
    });

    // Specify different menu items
    var default_items = [
        {
            text: 'Help',
            callback: (item) => viewer.showHelp(),
        },
        {
            text: 'About',
            callback: (item) => viewer.showAbout(),
        },
    ];
    var modify_items = [
        {
            text: 'Finish',
            callback: (item) => viewer.stopEdit(),
        },
    ];
    var draw_items = [
        {
            text: 'Add Marker',
            callback: function(item) {
                var text = prompt("Enter text for new marker:");
                if (text === null) {
                    console.warn("drawMarker(): cancel")
                } else {
                    viewer.drawMarker(text);
                }
            },
        },
        {
            text: 'Draw',
            items: [
                {
                    text: 'Polygon',
                    callback: (item) => viewer.drawPolygon(),
                },
                {
                    text: 'Line',
                    callback: (item) => viewer.drawLine(),
                },
            ],
        },
    ];
    var layer_items = [
        {
            text: 'Add Layer',
            callback: function(item) {
                var name = prompt("Enter name for new layer:");
                if (name === null) {
                    console.warn("addTerritoryLayer(): cancel")
                } else {
                    viewer.addTerritoryLayer(name);
                }
            },
        },
    ];
    var feature_items = [
        {
            text: 'Delete',
            callback: (item) => viewer.featureDelete(item.data.target),
        },
        {
            text: 'Modify',
            callback: (item) => viewer.featureEdit(item.data.target),
        },
        {
            text: 'Rename',
            callback: function(item) {
                var name = prompt("Enter new name for '" + item.data.oldName + "':", item.data.oldName);
                if (name === null) {
                    console.warn("viewer.featureRename(): cancel");
                } else {
                    viewer.featureRename(item.data.target, name);
                }
            },
        },
    ];

    // Add context sensitive actions
    viewer.contextmenu.addEventListener('open', function(evt) {
        var feature = viewer.map.forEachFeatureAtPixel(evt.pixel, (ft, l) => ft, {
            hitTolerance: 6,
        });

        viewer.contextmenu.clear();
        var items = [];

        // Add additional items, when in editMode
        if (viewer.editMode) {

            // Editing specific items
            if (viewer.modifyInteraction !== undefined) {
                items = items.concat(modify_items);
                items.push('-');
            }

            // Feature specific items
            if (feature) {
                for (var i = 0; i < feature_items.length; ++i) {
                    feature_items[i].data = {
                        target: feature,
                        oldName: feature.get('title') || "",
                    };
                }

                items = items.concat(feature_items);
                items.push('-');
            }

            // Layer specific items
            items = items.concat(layer_items);

            var delete_entries = [];
            var rename_entries = [];
            var select_entries = [];

            viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
                var title = layer.get('title') || "Layer #" + delete_entries.length;

                delete_entries.push({
                    text: title,
                    callback: (item) => viewer.deleteTerritoryLayer(item.data.target),
                    data: {
                        target: layer,
                    },
                });

                rename_entries.push({
                    text: title,
                    callback: function(item) {
                        var name = prompt("Enter new name for '" + item.data.oldName + "':", item.data.oldName);
                        if (name === null || name === item.data.oldName) {
                            console.warn("renameTerritoryLayer(): cancel");
                        } else {
                            viewer.renameTerritoryLayer(item.data.target, name);
                        }
                    },
                    data: {
                        target: layer,
                        oldName: title,
                    },
                });

                select_entries.push({
                    text: title,
                    callback: (item) => viewer.selectLayer(item.data.target),
                    data: {
                        target: layer,
                    },
                });
            });

            if (delete_entries.length > 0) {
                items.push({
                    text: 'Delete Layer',
                    items: delete_entries,
                });
            }

            if (rename_entries.length > 0) {
                items.push({
                    text: 'Rename Layer',
                    items: rename_entries,
                });
            }

            items.push('-');

            if (select_entries.length > 0) {
                items.push({
                    text: 'Draw Target',
                    items: select_entries,
                });
            }

            // Drawing specific items
            items = items.concat(draw_items);
            items.push('-');
        }

        // Default items
        viewer.contextmenu.extend(items);
        viewer.contextmenu.extend(default_items);
    });
};


// =====================================
// Draw and Edit Features
// =====================================

// Add new Layer
viewer.addTerritoryLayer = function(name) {
    viewer.setChanged();
    console.log("addTerritoryLayer(" + name + ")");

    var l = new ol.layer.Vector({
        title: name,
        visible: true,
        style: viewer.styles.territory,
        source: new ol.source.Vector({
            features: new ol.Collection(),
        }),
    });

    viewer.activeLayer = l;
    viewer.territoryGroup.getLayers().push(l);
};

// Delete existing Layer
viewer.deleteTerritoryLayer = function(layer) {
    viewer.setChanged();
    console.log("deleteTerritoryLayer(" + (layer.get('title') || 'unnamed') + ")");

    viewer.territoryGroup.getLayers().remove(layer);
};

// Rename existing Layer
viewer.renameTerritoryLayer = function(layer, name) {
    viewer.setChanged();
    console.log("renameTerritoryLayer(" + (layer.get('title') || 'unnamed') + ") to '" + name + "'");

    layer.set('title', name);
};

// Select draw target Layer
viewer.selectLayer = function(layer) {
    var activeLayer = undefined;

    // No layer specified? Try to find one by hand
    if (! (layer instanceof ol.layer.Base)) {
        viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
            if (activeLayer === undefined) {
                activeLayer = layer;
                return false;
            }
        });
    } else {
        activeLayer = layer;
    }

    if (activeLayer === undefined) {
        throw new viewer.ex.DrawTerritoryException("No drawable Layer found");
    }

    viewer.activeLayer = activeLayer;
};

// Start drawing of a Polygon
viewer.drawPolygon = function() {
    if (viewer.activeLayer === undefined) {
        viewer.selectLayer();
    }

    viewer.startDraw(viewer.activeLayer.getSource(), 'Polygon');
};

// Start drawing of a PolyLine
viewer.drawLine = function() {
    if (viewer.activeLayer === undefined) {
        viewer.selectLayer();
    }

    viewer.startDraw(viewer.activeLayer.getSource(), 'LineString');
};

// Start drawing of a Marker
viewer.drawMarker = function(text) {
    if (viewer.activeLayer === undefined) {
        viewer.selectLayer();
    }

    viewer.startDraw(viewer.activeLayer.getSource(), 'Point', text);
};

// Add Draw interaction of type to source
viewer.startDraw = function(source, type, title) {
    viewer.setChanged();
    console.log("viewer.startDraw(" + type + ")");

    if (viewer.drawInteraction !== undefined || viewer.drawControl !== undefined) {
        console.warn("Cancel active draw interaction");
        viewer.stopDraw();
    }

    viewer.disableInteractions();

    var draw = new ol.interaction.Draw({
        features: source.getFeatures(),
        source: source,
        type: type,
        freehand: false,
        style: viewer.styles.draw,
        condition: function(evt) {
            return evt.originalEvent.button === 0 && ol.events.condition.noModifierKeys(evt);
        },
        freehandCondition: function(evt) {
            return false;
        },
    });
    draw.addEventListener('drawend', function(evt) {
        evt.feature.setId(ol.control.LayerSwitcher.uuid());
        evt.feature.set('title', title || "");

        viewer.updateFeatureStyle(evt.feature, 'default');

        viewer.stopDraw();
    }, false);

    var snap = new ol.interaction.Snap({
        source: source,
        edge: false,
        vertex: true,
        pixelTolerance: 6,
    });

    var control = new viewer.ctrl.KeyboardDrawInteractions();

    viewer.drawInteraction = draw;
    viewer.snapInteraction = snap;
    viewer.drawControl = control;

    viewer.map.addInteraction(draw);
    viewer.map.addInteraction(snap);
    viewer.map.addInteraction(control);
};

// Undo last draw action
viewer.undoDraw = function(complete) {
    console.log("viewer.undoDraw(" + complete + ")");

    if (viewer.drawInteraction !== undefined) {
        if (complete !== undefined && complete) {
            viewer.stopDraw(false);
        } else {
            viewer.drawInteraction.removeLastPoint();
        }
    }
}

// Stop active draw interaction
viewer.stopDraw = function(finishActive) {
    console.log("viewer.stopDraw(" + finishActive + ")");

    viewer.enableInteractions();

    if (viewer.drawControl !== undefined) {
        viewer.map.removeInteraction(viewer.drawControl);
        viewer.drawControl = undefined;
    }

    if (viewer.snapInteraction !== undefined) {
        viewer.map.removeInteraction(viewer.snapInteraction);
        viewer.snapInteraction = undefined;
    }

    if (viewer.drawInteraction !== undefined) {
        if (finishActive !== undefined && finishActive) {
            viewer.drawInteraction.finishDrawing();
        }
        viewer.map.removeInteraction(viewer.drawInteraction);
        viewer.drawInteraction = undefined;
    } else {
        console.warn("Cannot stop drawing: no active interaction.");
    }
};

// Edit selected feature
viewer.featureEdit = function(feature) {
    var id = feature.getId();
    console.log("viewer.featureEdit(" + id + ")");

    var activeSource = undefined;
    if (id !== undefined) {
        viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
            var found = layer.getSource().getFeatureById(id);
            if (activeSource === undefined && found !== null) {
                activeSource = layer.getSource();
                return false;
            }
        });
    }

    if (activeSource === undefined) {
        viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
            var src = layer.getSource();
            if (src instanceof ol.source.Vector) {
                var f = src.getFeatures();
                if (f.indexOf(feature) !== -1) {
                    activeSource = src;
                    return false;
                }
            }
        });
    }

    viewer.startEdit(feature, activeSource);
};

// Delete selected feature
viewer.featureDelete = function(feature) {
    viewer.setChanged();
    var id = feature.getId();
    console.log("viewer.featureDelete(" + id + ")");

    var activeSource = undefined;
    if (id !== undefined) {
        viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
            var found = layer.getSource().getFeatureById(id);
            if (activeSource === undefined && found !== null) {
                activeSource = layer.getSource();
                return false;
            }
        });
    }

    if (activeSource !== undefined) {
        activeSource.removeFeature(feature);
    } else {
        viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
            var src = layer.getSource();
            if (src instanceof ol.source.Vector) {
                src.removeFeature(feature);
            }
        });
    }
};

// Delete selected feature
viewer.featureRename = function(feature, name) {
    viewer.setChanged();
    console.log("viewer.featureRename(" + feature.getId() + "): '" + (feature.get('title') || '') + "' to '" + name + "'");

    feature.set('title', name);
};

// Add modify Interaction to selected feature and source
viewer.startEdit = function(feature, source) {
    viewer.setChanged();
    console.log("viewer.startEdit()");

    if (viewer.modifyInteraction !== undefined || viewer.drawControl !== undefined) {
        console.warn("Cancel active modify interaction");
        viewer.stopEdit();
    }

    viewer.disableInteractions();

    var modify = new ol.interaction.Modify({
        features: new ol.Collection([feature]),
        pixelTolerance: 6,
        style: viewer.styles.modify,
    });

    var control = new viewer.ctrl.KeyboardDrawInteractions();

    viewer.modifyFeature = feature;
    viewer.modifyInteraction = modify;
    viewer.drawControl = control;

    viewer.map.addInteraction(modify);
    viewer.map.addInteraction(control);

    viewer.updateFeatureStyle(feature, 'edit');

    if (source !== undefined) {
        var snap = new ol.interaction.Snap({
            source: source,
            edge: false,
            vertex: true,
            pixelTolerance: 6,
        });

        viewer.snapInteraction = snap;
        viewer.map.addInteraction(snap);
    }
};

// Stop modify Interaction
viewer.stopEdit = function() {
    console.log("viewer.stopEdit()");

    viewer.enableInteractions();

    if (viewer.modifyFeature !== undefined) {
        viewer.updateFeatureStyle(viewer.modifyFeature, 'default');
        viewer.modifyFeature = undefined;
    }

    if (viewer.drawControl !== undefined) {
        viewer.map.removeInteraction(viewer.drawControl);
        viewer.drawControl = undefined;
    }

    if (viewer.snapInteraction !== undefined) {
        viewer.map.removeInteraction(viewer.snapInteraction);
        viewer.snapInteraction = undefined;
    }

    if (viewer.modifyInteraction !== undefined) {
        viewer.map.removeInteraction(viewer.modifyInteraction);
        viewer.modifyInteraction = undefined;
    } else {
        console.warn("Cannot stop edit: no active interaction.");
    }

};


// =====================================
// Export / Import Vector Data
// =====================================

// Export Data
viewer.saveTerritory = function(doneCallback) {
    console.log("saveTerritory()");

    var writer = new ol.format.GeoJSON({
        defaultDataProjection: 'EPSG:4326',
    });

    var territories = [];
    viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
        var f = layer.getSource().getFeatures();
        var t = {
            title: layer.get('title'),
            visible: layer.get('visible'),
            source_features: writer.writeFeaturesObject(f, {
                featureProjection: 'EPSG:3857',
                decimals: 9,
            }),
        };
        territories.push(t);
    });

    var exportFeatures = JSON.stringify({
        modified: (new Date()).toJSON(),
        territories: territories,
    });
    console.log("Save Features: " + exportFeatures);

    var file = new File([exportFeatures, '\n'], viewer.export_filename, {type: "application/json;charset=utf-8"});
    saveAs(file); // FIXME: Convert to StreamSaver.js and check if our dialog got cancelled

    if (typeof doneCallback === 'function') {
        doneCallback(true);
    }
}

// Import Data
viewer.loadTerritory = function(file, doneCallback) {
    console.log("loadTerritory(" + file.name + ")");

    var callback = function(succ, err) {
        viewer.export_filename = succ ? file.name : viewer.export_filename;

        viewer.enableInteractions();

        if (typeof doneCallback === 'function') {
            doneCallback(succ, err);
        } else if (!succ) {
            throw new viewer.ex.LoadTerritoryException(err);
        }
    };

    var handleFile = function(e) {
        var result = e.target.result;
        var importFeatures = undefined;

        try {
            console.log("Load Features: " + result);
            importFeatures = JSON.parse(result);
        } catch (ex) {
            callback(false, "Cannot decode JSON: \"" + ex + "\"");
            return;
        }

        if (importFeatures.territories === undefined) {
            callback(false, "Missing territory data.");
            return;
        }

        // Load territory Features
        var reader = new ol.format.GeoJSON({
            defaultDataProjection: 'EPSG:4326',
        });

        var territories = [];
        for (var i = 0; i < importFeatures.territories.length; ++i) {
            var t = importFeatures.territories[i];
            try {
                var f = reader.readFeatures(t.source_features, {
                    featureProjection: 'EPSG:3857',
                });
            } catch (ex) {
                callback(false, "Cannot read saved features: \"" + ex + "\"");
                return;
            }

            f.forEach(function (ft) {
                viewer.updateFeatureStyle(ft, 'default');
            });

            var l = new ol.layer.Vector({
                title: t.title,
                visible: t.visible,
                style: viewer.styles.territory,
                source: new ol.source.Vector({
                    features: f,
                }),
            });

            territories.push(l);
        }

        // Disable any selection
        viewer.stopDraw(true);
        viewer.stopEdit();
        viewer.disableInteractions();

        // Remove old Layers and add new
        var lc = viewer.territoryGroup.getLayers();
        lc.clear();
        for (var i = 0; i < territories.length; ++i) {
            lc.push(territories[i]);
        }

        callback(true);
    };

    var handleError = function(e) {
        var message = "Unkown error!";
        switch (e.target.error.code) {
            case e.target.error.NOT_FOUND_ERR:
                message = "File not found!";
                break;
            case e.target.error.NOT_READABLE_ERR:
                message = "File not readable!";
                break;
            case e.target.error.ABORT_ERR:
                message = "Read operation was aborted!";
                break;
            case e.target.error.SECURITY_ERR:
                message = "File is in a locked state!";
                break;
            case e.target.error.ENCODING_ERR:
                message = "The file is too long to encode in a 'data://' URL.";
                break;
            default:
                message = "Read error.";
        }
        callback(false, message);
    };

    var fileReader = new FileReader();
    fileReader.addEventListener('load', handleFile, false)
    fileReader.addEventListener('error', handleError, false);
    fileReader.readAsText(file);
}


// =====================================
// Export Map (image)
// =====================================

// Render Map in temporary canvas and export as png
viewer.exportCanvas = function(doneCallback) {
    var self = this;
    var loading = 0;
    var loaded = 0;

    // All tiles downloaded
    var finishedLoading = function() {
        console.log("Finished loading tiles (" + loaded + ")");
        self.map.once('postcompose', function(e) {
            var canvas = e.context.canvas;
            canvas.toBlob(function(data) {
                saveAs(data, "map.png");

                // All done -> notify callback
                if (typeof doneCallback === 'function') {
                    doneCallback(true);
                }
            });
        });

        // Cause actual rendering on canvas
        self.map.renderSync();
    };

    // Tile requested
    var tileLoadStart = function(e) {
        ++loading;
    };

    // Tile loaded
    var tileLoadEnd = function(e) {
        ++loaded;
        if (loaded === loading) { // loaded all tiles for the time being
            console.log("Loaded " + loading + " tiles, wait 500ms for more");
            var oldLoading = loading;
            setTimeout(function() {
                console.log("More tiles loaded than before: " + !(loading === oldLoading) + " (+" + (loading - oldLoading) + ")");
                if (oldLoading === loading) { // finally loaded all tiles (hopefully)
                    loading = -1;
                    self.forEachLayer(function(layer) { // reset event listener
                        var source = layer.getSource();
                        source.un('tileloadstart', tileLoadStart);
                        source.un('tileloadend', tileLoadEnd);
                        source.un('tileloaderror', tileLoadEnd);
                    });

                    // Call finish function
                    finishedLoading();
                }
            }, 500);
        }
    };

    // Start export -> reload tiles
    console.log("Export Map");
    self.forEachLayer(function(layer) {
        var source = layer.getSource();
        source.on('tileloadstart', tileLoadStart);
        source.on('tileloadend', tileLoadEnd);
        source.on('tileloaderror', tileLoadEnd);

        source.refresh();
    });
};

// Export current viewport as png
viewer.exportViewport = function () {
    var self = this;

    // Save current map viewport
    var mapsave = {
        'size': self.map.getSize(),
        'center': self.view.getCenter(),
        'zoom': self.view.getZoom(),
        'rotation': self.view.getRotation(),
    };

    // Set export viewport
    self.setExport();
    self.resetMap(mapsave);

    // Do actual export
    self.exportCanvas(function() {
        // Reset previous viewport
        self.setRender();
        self.resetMap(mapsave);
        self.map.render();
    });
}


// Load on start
if (viewer.map === undefined) {
    viewer.initMap();
}




//=================================================
//
//=================================================


// Init map
// Load Layers and Stuff
function initMap() {
    map_div = document.getElementById("map");
    export_div = document.getElementById("export-map");

    // init map
    map = new ol.Map({
        target: map_div,
        controls: ol.control.defaults().extend([
            new ol.control.ScaleLine(),
            new ol.control.LayerSwitcher(),
        ]),
        interactions: ol.interaction.defaults({
            altShiftDragRotate: false,
            shiftDragZoom: false,
            pinchRotate: false,
        }),
        view: new ol.View({
            projection: 'EPSG:3857',
            center: map_coord_proj.center(),
            zoom: 13,
        }),
    });

    // Show tempory extent
    var ext_feature = new ol.Feature({
            geometry: new ol.geom.Polygon([map_coord_proj.vertices()], "XY"),
        });
    var center_feature = new ol.Feature({
            geometry: new ol.geom.Point(map_coord_proj.center(), "XY"),
        });
    var overlay = new ol.layer.Vector({
        source: new ol.source.Vector({
            features: [ext_feature, center_feature],
        }),
        visible: true,
    });

    // init OSM base map
    var osmGroup = new ol.layer.Group({
        title: 'OpenStreetMap',
        layers: [
            // OpenStreetMap (Mapnik)
            // http://b.tile.openstreetmap.org/${z}/${x}/${y}.png
            new ol.layer.Tile({
                title: "OSM Mapnik",
                type: 'base',
                visible: true,
                source: new ol.source.OSM(),
            }),
        ],
    });

    // init DTK base map
    var dtkGroup = new ol.layer.Group({
        title: 'NRW DTK',
        layers: [
            // NRW DTK
            // http://www.wms.nrw.de/geobasis/wms_nw_dtk?
            new ol.layer.Tile({
                title: "DTK Komplett",
                type: 'base',
                visible: false,
                source: new ol.source.TileWMS({
                    url: "http://www.wms.nrw.de/geobasis/wms_nw_dtk?",
                    crossOrigin: 'anonymous',
                    params: {
                        LAYERS: 'nw_dtk_col',
                    },
                }),
            }),
        ],
    });


    // init territory border style
    var territory_style = new ol.style.Style({
        fill: new ol.style.Fill({
            color: 'rgba(110, 198, 255, 0.2)'
        }),
        stroke: new ol.style.Stroke({
            color: '#2196f3',
            width: 2
        }),
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
                color: '#2196f3'
            })
        }),
    });

    var border_features = new ol.Collection();

    // init border overlay
    var borderGroup = new ol.layer.Group({
        title: 'Borders',
        layers: [
            // territory border
            new ol.layer.Vector({
                title: 'Remscheid-Lennep',
                visibility: true,
                style: territory_style,
                source: new ol.source.Vector({
                    features: border_features,
                }),
            }),
        ],
    });

    var modify = new ol.interaction.Modify({
        features: border_features,
        // the SHIFT key must be pressed to delete vertices, so
        // that new vertices can be drawn at the same position
        // of existing vertices
        deleteCondition: function(event) {
          return ol.events.condition.shiftKeyOnly(event) &&
              ol.events.condition.singleClick(event);
        }
      });
      map.addInteraction(modify);

    // init marker overlay
    var markerGroup = new ol.layer.Group({
        title: 'Markers',
        layers: [
            // Kingdom Hall
            new ol.layer.Vector({
                title: 'Kingdom Hall',
                visible: true,
                style: territory_style,
                source: new ol.source.Vector({
                    features: [new ol.Feature({
                        geometry: new ol.geom.Point(map_coord_proj.kingdom_hall(), "XY"),
                    })],
                }),
            }),
        ],
    });

    map.addLayer(osmGroup);
    map.addLayer(dtkGroup);
    map.addLayer(overlay);
    map.addLayer(borderGroup);
    map.addLayer(markerGroup);
};

function startDraw() {
    
    //function addInteraction() {
        draw = new ol.interaction.Draw({
            features: border_features,
            type: 'Polygon',
        });
        map.addInteraction(draw);
    //}

}

function exportFullMap(dpi, scale) {
    var real_w = map_coord_proj.tr()[0] - map_coord_proj.bl()[0];
    var real_h = map_coord_proj.tr()[1] - map_coord_proj.bl()[1];

    var pointres = (scale * 25.4) / (dpi * 1000);
    var pixel_w = Math.ceil(real_w / pointres);
    var pixel_h = Math.ceil(real_h / pointres);

    var param_size = [pixel_w, pixel_h];
    console.log(pointres + " / " + param_size);
    //var param_size = [1200, 1200];

    var view = map.getView();

    var mpu = view.getProjection().getMetersPerUnit();
    var pointres = ol.proj.getPointResolution(view.getProjection(), view.getResolution(), view.getCenter());
    var res = view.getResolutionForExtent(map_coord_proj.extents(), [1200, 1200]);
    console.log(pointres + " / " + res);


    // Save current map viewport
    var mapsave = {
        'size': map.getSize(),
        'center': view.getCenter(),
        'zoom': view.getZoom(),
        'rotation': view.getRotation(),
    };

    // Set export viewport
    map.setTarget(export_div);
    map.setSize(param_size);
    view.fit(map_coord_proj.extents(), {
        size: map.getSize(),
        padding: [0, 0, 0, 0],
    });

    var pointres = ol.proj.getPointResolution(view.getProjection(), view.getResolution(), view.getCenter());
    var res = view.getResolutionForExtent(map_coord_proj.extents(), map.getSize());
    console.log(pointres + " / " + res);

    // Do actual export
    saveMap(function() {
        // Reset previous viewport
        map.setTarget(map_div);
        map.setSize(mapsave.size);

        view.setCenter(mapsave.center);
        view.setZoom(mapsave.zoom);
        view.setRotation(mapsave.rotation);

        map.render();
    });
}

