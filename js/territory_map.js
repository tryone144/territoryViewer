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

function createButton(label, title, handler) {
    var button = document.createElement('button');
    button.innerHTML = label;
    button.title = title;

    button.addEventListener('click', handler, false);
    button.addEventListener('touchstart', handler, false);

    return button;
}

function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

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
    group.getLayers().forEach(function(layer, i, a) {
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
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.name = 'TerritoryFile';
    fileInput.accept = '.json,application/json';
    fileInput.style = 'position: fixed; top: -100em;';

    var fileSelection = function() {
        if (fileInput.files.length > 0) {
            var file = fileInput.files[0];
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
                viewer.loading_div.style = "";
                fileInput.value = "";
            });
        }
    };
    fileInput.addEventListener('change', fileSelection, false);
    fileInput.addEventListener('click', (e) => e.stopPropagation(), false);

    var btnLoad = createButton('L', "Load Territory", function(e) {
        if (viewer.export_unsavedchanges === true) {
            console.warn("loadTerritory(): unsaved changes!");
            var loadanyway = confirm("You have unsaved changes. Load anyway and loose changes?");
            if (loadanyway === false) {
                return;
            }
            console.warn("loadTerritory(): ignore unsaved changes and load anyway");
        }

        viewer.loading_div.style = "display: block;";
        fileInput.click();
    });
    btnLoad.appendChild(fileInput);

    // Button "Save Territory"
    var btnSave = createButton('S', "Save Territory", function() {
        if (viewer.export_filename === undefined) {
            viewer.export_filename = "territory.json";
        }
        viewer.loading_div.style = "display: block;";
        viewer.saveTerritory(function(success) {
            viewer.loading_div.style = "";
            viewer.resetChanged();
            console.log("saveTerritory() finished");
        });
    });

    // Button "Export Viewport"
    var btnExport = createButton('E', "Export Viewport", function() {
        viewer.exportViewport();
    });

    // Add container div
    var element = document.createElement('div');
    element.className = 'tv-file-controls ol-unselectable ol-control';
    element.appendChild(btnLoad);
    element.appendChild(btnSave);
    element.appendChild(btnExport);

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
};
ol.inherits(viewer.ctrl.FileControls, ol.control.Control);

// Draw Handling (New)
viewer.ctrl.DrawControls = function(opt_options) {
    var options = opt_options || {};

    // Button "Draw Polygon"
    var btnPoly = createButton('P', "Draw Polygon", function() {
        viewer.drawPolygon();
    });

    // Button "Draw Line"
    var btnLine = createButton('L', "Draw Line", function() {
        viewer.drawLine();
    });

    // Button "Add Marker"
    var btnMark = createButton('M', "Add Marker", function() {
        console.log("FIXME: drawMarker()");
    });

    // Button "Add Text"
    var btnText = createButton('T', "Add Text", function() {
        console.log("FIXME: drawText()");
    });

    // Add container div
    var element = document.createElement('div');
    element.className = 'tv-draw-controls ol-unselectable ol-control';
    element.appendChild(btnPoly);
    element.appendChild(btnLine);
    element.appendChild(btnMark);
    element.appendChild(btnText);

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
};
ol.inherits(viewer.ctrl.DrawControls, ol.control.Control);

// Layer Handling (Add, Rename, Delete)
viewer.ctrl.LayerControls = function(opt_options) {
    var options = opt_options || {};

    // Button "Add Layer"
    var btnAdd = createButton('A', "Add Layer", function() {
        var name = prompt("Enter name for new layer:");
        if (name === null) {
            console.warn("addTerritoryLayer(): cancel")
        } else {
            viewer.addTerritoryLayer(name);
        }
    });

    // Button "Rename Layer"
    var btnRename = createButton('R', "Rename Layer", function() {
        console.log("FIXME: renameTerritoryLayer()");
    });

    // Button "Delete Layer"
    var btnDelete = createButton('D', "Delete Layer", function() {
        console.log("FIXME: deleteTerritoryLayer()");
    });

    // Add container div
    var element = document.createElement('div');
    element.className = 'tv-layer-controls ol-unselectable ol-control';
    element.appendChild(btnAdd);
    element.appendChild(btnRename);
    element.appendChild(btnDelete);

    ol.control.Control.call(this, {
        element: element,
        target: options.target
    });
};
ol.inherits(viewer.ctrl.LayerControls, ol.control.Control);

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
                    viewer.undoDraw(false);
                    return false;
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

    viewer.editMode = (window.location.hash === "#edit");
    window.addEventListener('hashchange', function(e) {
        var parser = document.createElement('a');
        parser.href = e.newURL;

        viewer.editMode = (parser.hash === "#edit");
    }, false);

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
        new ol.interaction.MouseWheelZoom(),
        new ol.interaction.KeyboardPan(),
        new ol.interaction.KeyboardZoom(),
    ];
    var controls = ol.control.defaults().extend([
        new ol.control.ScaleLine(),
        new ol.control.LayerSwitcher(),
        new viewer.ctrl.FileControls(),
        new viewer.ctrl.DrawControls(),
        new viewer.ctrl.LayerControls(),
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
    viewer.groups.push(osmGroup);

    // Initialize NRW DTK Layers
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
    viewer.styles = {};
    viewer.styles.territory = new ol.style.Style({
        zIndex: 1,
        fill: new ol.style.Fill({
            color: 'rgba(255, 121, 97, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#f44336',
            width: 3,
        }),
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({
                color: '#f44336',
            }),
        }),
    });

    viewer.styles.territoryEdit = new ol.style.Style({
        zIndex: 1,
        fill: new ol.style.Fill({
            color: 'rgba(244, 67, 54, 0.2)',
        }),
        stroke: new ol.style.Stroke({
            color: '#b9000a',
            width: 5,
        }),
        image: new ol.style.Circle({
            radius: 9,
            fill: new ol.style.Fill({
                color: '#b9000a',
            }),
        }),
    });

    // Initialize Territory Layers
    var territoryFeatures = new ol.Collection();
    viewer.territoryGroup = new ol.layer.Group({
        title: 'Territories',
        layers: [
            // territory border
            new ol.layer.Vector({
                title: 'Remscheid-Lennep',
                visibility: true,
                style: viewer.styles.territory,
                source: new ol.source.Vector({
                    features: territoryFeatures,
                }),
            }),
        ],
    });
    viewer.groups.push(viewer.territoryGroup);

    // Add Layers to map
    viewer.groups.forEach(function(group) {
        viewer.map.addLayer(group);
    });
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

    /*var contextmenu = new ContextMenu({
        //width: 170,
        defaultItems: true,
        items: [
            {
                text: 'Center map here',
                classname: 'some-style-class',
                //callback: center,
            },
            {
                text: 'Add a Marker',
                classname: 'some-style-class',
                icon: 'img/marker.png',
                //callback: marker,
            },
            '-',
            {
                text: 'Some Actions',
                items: [
                    {
                        text: 'Action 1',
                        //callback: action,
                    },
                    {
                        text: 'Other action',
                        //callback: action2,
                    },
                ],
            },
        ],
    });
    viewer.map.addControl(contextmenu);*/

    // Disable custom contextmenu on other controls
    var ctrls = Array.from(document.getElementsByClassName('ol-control'));
    ctrls = ctrls.concat(Array.from(document.getElementsByClassName('ol-scale-line')));
    for (var i = 0; i < ctrls.length; ++i) {
        ctrls[i].addEventListener('contextmenu', (e) => e.stopPropagation(), false);
    }

    viewer.contextmenu.addEventListener('beforeopen', function(evt) {
        console.log(evt);
        var feature = viewer.map.forEachFeatureAtPixel(evt.pixel, function(ft, l) {
            return ft;
        }, {
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
            viewer.contextmenu.disable();
        }
    });

    var default_items = [];
    var feature_items = [
        {
            text: 'Delete',
            callback: function(item) {
                viewer.setChanged();
                viewer.featureDelete(item.data.target);
            },
        },
        {
            text: 'Edit',
            callback: function(item) {
                viewer.setChanged();
                viewer.featureEdit(item.data.target);
            },
        },
    ];

    // Add context sensitive actions
    viewer.contextmenu.addEventListener('open', function(evt) {
        var feature = viewer.map.forEachFeatureAtPixel(evt.pixel, function(ft, l) {
            return ft;
        }, {
            hitTolerance: 6,
        });

        viewer.contextmenu.clear();
        if (feature) {
            // add some other items to the menu
            if (viewer.editMode) {
                for (var i = 0; i < feature_items.length; ++i) {
                    feature_items[i].data = {
                        target: feature,
                    };
                }
                viewer.contextmenu.extend(feature_items);
                viewer.contextmenu.push('-');
            }
        }
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

    viewer.territoryGroup.getLayers().push(l);
};

// Start drawing of a Polygon
viewer.drawPolygon = function() {
    var activeLayer = undefined;
    viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
        if (activeLayer === undefined) {
            activeLayer = layer;
            return false;
        }
    });

    if (activeLayer === undefined) {
        throw new viewer.ex.DrawTerritoryException("No drawable Layer found");
    }

    viewer.startDraw(activeLayer.getSource(), 'Polygon');
};

// Start drawing of a PolyLine
viewer.drawLine = function() {
    var activeLayer = undefined;
    viewer.forEachLayerIn(viewer.territoryGroup, function(layer) {
        if (activeLayer === undefined) {
            activeLayer = layer;
            return false;
        }
    });

    if (activeLayer === undefined) {
        throw new viewer.ex.DrawTerritoryException("No drawable Layer found");
    }

    viewer.startDraw(activeLayer.getSource(), 'LineString');
};

// Add Draw interaction of type to source
viewer.startDraw = function(source, type) {
    viewer.setChanged();
    console.log("viewer.startDraw(" + type + ")");

    if (viewer.drawInteraction !== undefined || viewer.drawControl !== undefined) {
        console.warn("Cancel active draw interaction");
        viewer.stopDraw();
    }

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom) {
            act.setActive(false);
            return false;
        }
    });

    var draw = new ol.interaction.Draw({
        features: source.getFeatures(),
        source: source,
        type: type,
        freehand: false,
        condition: function(evt) {
            return evt.originalEvent.button === 0 && ol.events.condition.noModifierKeys(evt);
        },
        freehandCondition: function(evt) {
            return false;
        },
    });
    draw.addEventListener('drawend', function(evt) {
        evt.feature.setId(createUUID());
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

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom) {
            setTimeout(function() {
                act.setActive(true);
            }, 200);
            return false;
        }
    });

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

// Add modify Interaction to selected feature and source
viewer.startEdit = function(feature, source) {
    console.log("viewer.startEdit()");
    if (viewer.modifyInteraction !== undefined || viewer.drawControl !== undefined) {
        console.warn("Cancel active modify interaction");
        viewer.stopEdit();
    }

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom) {
            act.setActive(false);
            return false;
        }
    });

    var modify = new ol.interaction.Modify({
        features: new ol.Collection([feature]),
        pixelTolerance: 6,
    });

    var control = new viewer.ctrl.KeyboardDrawInteractions();

    viewer.modifyFeature = feature;
    viewer.modifyInteraction = modify;
    viewer.drawControl = control;

    viewer.map.addInteraction(modify);
    viewer.map.addInteraction(control);

    feature.setStyle(viewer.styles.territoryEdit);

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

    viewer.map.getInteractions().forEach(function(act) {
        if (act instanceof ol.interaction.DoubleClickZoom) {
            setTimeout(function() {
                act.setActive(true);
            }, 200);
            return false;
        }
    });

    if (viewer.modifyFeature !== undefined) {
        viewer.modifyFeature.setStyle(null);
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

