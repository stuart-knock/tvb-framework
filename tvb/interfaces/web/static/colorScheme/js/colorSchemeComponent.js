var startColorRGB = [192, 192, 192];
var endColorRGB = [255, 0, 0];
var nodeColorRGB = [255, 255, 255];
var normalizedStartColorRGB = normalizeColorArray(startColorRGB);   // keep the normalized version to avoid
var normalizedEndColorRGB = [1, 0, 0];                              // function calls on every color computation
var normalizedNodeColorRGB = [1, 1, 1];
var _colorScheme = null;                                             // the color scheme to be used for current drawing
var _linearGradientStart = 0, _linearGradientEnd = 1 ;               // keep the interest interval
var _sparseColorNo = 10;
var _refreshCallback = null ;                                        // this is called when color scheme changes update the visualiser

function drawSimpleColorPicker(divId, refreshFunction) {
    $('#' + divId).ColorPicker({
        color: '#ffffff',
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            $('#' + divId + ' div').css('backgroundColor', '#' + hex);
            nodeColorRGB = [parseInt(rgb.r), parseInt(rgb.g), parseInt(rgb.b)];
            normalizedNodeColorRGB = normalizeColorArray(nodeColorRGB);
            if (refreshFunction) {
                 refreshFunction();
            }
        }
    });	
    $('#' + divId + ' div').css('backgroundColor', '#ffffff');
}


function getNewNodeColor() {
	return nodeColorRGB;
}

/**
 * @param startColorComponentId id of the container in which will be drawn the color picker for the start color
 * @param endColorComponentId id of the container in which will be drawn the color picker for the end color
 */
function drawColorPickerComponent(startColorComponentId, endColorComponentId) {
	var start_color_css = 'rgb(' + startColorRGB[0] + ',' + startColorRGB[1] + ',' + startColorRGB[2] + ')';
	var end_color_css = 'rgb(' + endColorRGB[0] + ',' + endColorRGB[1] + ',' + endColorRGB[2] + ')';
    $('#' + startColorComponentId).ColorPicker({
        color: start_color_css,
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            $('#' + startColorComponentId + ' div').css('backgroundColor', '#' + hex);
            startColorRGB = [parseInt(rgb.r), parseInt(rgb.g), parseInt(rgb.b)];
            normalizedStartColorRGB = normalizeColorArray(startColorRGB);
            if (_refreshCallback) {
                 _refreshCallback();
            }
        }
    });

    $('#' + endColorComponentId).ColorPicker({
        color: end_color_css,
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            $('#' + endColorComponentId + ' div').css('backgroundColor', '#' + hex);
            endColorRGB = [parseInt(rgb.r), parseInt(rgb.g), parseInt(rgb.b)];
            normalizedEndColorRGB = normalizeColorArray(endColorRGB);
            if (_refreshCallback) {
                _refreshCallback();
            }
        }
    });
    $('#' + startColorComponentId + ' div').css('backgroundColor', start_color_css);
    $('#' + endColorComponentId + ' div').css('backgroundColor', end_color_css);
}

function getGradientColorString(pointValue, min, max) {
    var rgb_values = getGradientColor(pointValue, min, max);
    return "rgb("+Math.round(rgb_values[0]*255)+","+ Math.round(rgb_values[1]*255)+","+ Math.round(rgb_values[2]*255)+")";
}

function getStartColor() {
	return startColorRGB;
}

function getEndColor() {
	return endColorRGB;
}

function normalizeColor(color) {
    return color / 255.0;
}

/**
 * Returns a copy of the given array, with all the colors normalized, i.e. from (0, 255) to (0, 1)
 * @param colorArray The colors to normalize
 */
function normalizeColorArray(colorArray) {
    var normalizedColorArray = [];
    for (var i = 0; i < colorArray.length; ++i)
        normalizedColorArray[i] = colorArray[i] / 255.0
    return normalizedColorArray
}

function clampValue(value) {
    if (value > 1) {
        return 1;
    } else if (value < 0) {
        return 0;
    }

    return value;
}

// ================================= COLOR SCHEME FUNCTIONS START =================================

/**
 * Sets the current color scheme to the given one
 * @param scheme The color scheme to use; currently supported: 'linear', 'rainbow', 'hotcold', 'TVB', 'sparse'
 */
function ColSch_setColorScheme(scheme) {
    $(".colorSchemeSettings").hide();
    $("#" + scheme + "ColSchFieldSet").show();
    _colorScheme = scheme;
    if (_refreshCallback) {
        _refreshCallback()
    }
}

/**
 * Initialises the settings for all color schemes
 *
 * @param minValue The minimum value for the linear slider
 * @param maxValue The maximum value for the linear slider
 * @param refreshFunction A reference to the function which updates the visualiser
 */
function ColSch_initColorSchemeParams(minValue, maxValue, refreshFunction) {
    _refreshCallback = refreshFunction;
    // initialise the linear params
    $("#rangerForLinearColSch").slider({
        range: true, min: minValue, max: maxValue, step: 0.001,
        values: [minValue, maxValue],
        slide: function(event, ui) {                            // update the UI
                event.target.parentElement.previousElementSibling.innerHTML = ui.values[0].toFixed(3);
                event.target.parentElement.nextElementSibling.innerHTML     = ui.values[1].toFixed(3)
        },
        change: function(event, ui) {
            _linearGradientStart = (ui.values[0] - minValue) / (maxValue - minValue);    // keep the interest interval
            _linearGradientEnd   = (ui.values[1] - minValue) / (maxValue - minValue) ;   // as normalized dist from min
            if (_refreshCallback)      _refreshCallback()
        }
    });
    $("#sliderMinValue").html(minValue.toFixed(3));
    $("#sliderMaxValue").html(maxValue.toFixed(3));
    _linearGradientStart = 0;            // on start the whole interval is selected
    _linearGradientEnd   = 1;
    drawColorPickerComponent('startColorSelector', 'endColorSelector');

    // initialise the sparse params
    var colorNoUIElem = $("#ColSch_colorNo");                    // cache the jQuery selector
    colorNoUIElem.html(_sparseColorNo);
    $("#sliderForSparseColSch").slider({
        min: 2, max: SPARSE_COLORS.length - 1, step: 1, values: [_sparseColorNo],
        slide: function (event, ui) { colorNoUIElem.html(ui.value) },
        change: function (event, ui) {
            _sparseColorNo = ui.value;
            if (_refreshCallback) { _refreshCallback() }
        }
    });

    if (!_colorScheme)                      // on very first call, set the default color scheme
        $("#setColorSchemeSelId").each(function() {this.selectedIndex = 0}).change()
}

/**
 * Factory function which returns a color for the given point in interval (min, max),
 * according to the current <code>_colorScheme</code>
 *
 * @param pointValue The value whose corresponding color is returned
 * @param max   The maximum value of the array, to use for computing gradient
 * @param min   Maximum value in colors array.
 *
 * NOTE: The following condition should be true: <code> min <= pointValue <= max </code>
 */
function getGradientColor(pointValue, min, max) {
    if (min == max)         // the interval is empty, so start color is the only possible one
        return [normalizedStartColorRGB[0], normalizedStartColorRGB[1], normalizedStartColorRGB[2]];
    if (pointValue < min)
        pointValue = min;   // avoid rounding problems
    if (pointValue > max)
        pointValue = max;
    var result = [];
    var normalizedValue = (pointValue - min) / (max - min);
    if (!_colorScheme || _colorScheme == "linear")                // default is "linear"
        result =  getLinearGradientColor(normalizedValue);
    else if (_colorScheme == "rainbow")
        result = getRainbowColor(normalizedValue);
    else if (_colorScheme == "hotcold")
        result = getHotColdColor(normalizedValue);
    else if (_colorScheme == "TVB")
        result = getTvbColor(normalizedValue);
    else if (_colorScheme == "sparse")
        result = getSparseColor(normalizedValue);
    return result
}

/**
 * Factory function which computes the colors for a whole array of values in interval (min, max)
 * according to the current <code>_colorScheme</code>
 *
 * @param {Array} values The values for which the colors are generated;
 *                       Condition: min <= values[i] <= max (for every values[i])
 * @param {Float} max   The maximum value of the array, to use for computing gradient
 * @param {Float} min   Maximum value in colors array.
 * @param {Float32Array} outputArray If specified, this is filled with the computed
 *                     Condition: outputArray.length = 4 * values.length (RGBA colors)
 * @returns {Array} If <code>outputArray</code> was not specified, a normal array is returned;
 *                  The empty array is returned otherwise
 */
function getGradientColorArray(values, min, max, outputArray) {
    var result = [], color = [];
    for (var i = 0; i < values.length; ++i) {
        color = getGradientColor(values[i], min, max);
        color.push(1);                               // add the alpha value
        if (outputArray)
            outputArray.set(color, i * 4);
        else
            result.concat(color)
    }

    return result;
}

/**
 * Returns an [r, g, b] color in a linear transition from <code>startColorRGB</code> to <code>endColorRGB</code>
 * If <code>normalizedValue</code> lays outside (_linearGradientStart, _linearGradientEnd) interval, the opposite color
 * to the closes end is returned
 */
function getLinearGradientColor(normalizedValue) {
    if (normalizedValue < _linearGradientStart)                                         // clamp to selected range
        return [1 - normalizedStartColorRGB[0], 1 - normalizedStartColorRGB[1], 1 - normalizedStartColorRGB[2]];
    if (normalizedValue > _linearGradientEnd)
        return [1 - normalizedEndColorRGB[0], 1 - normalizedEndColorRGB[1], 1 - normalizedEndColorRGB[2]];

    var r = normalizedStartColorRGB[0] + normalizedValue * (normalizedEndColorRGB[0] - normalizedStartColorRGB[0]);
    var g = normalizedStartColorRGB[1] + normalizedValue * (normalizedEndColorRGB[1] - normalizedStartColorRGB[1]);
    var b = normalizedStartColorRGB[2] + normalizedValue * (normalizedEndColorRGB[2] - normalizedStartColorRGB[2]);

    return [clampValue(r), clampValue(g), clampValue(b)]
}

/**
 * Returns an [r, g, b] color in the rainbow color scheme
 */
function getRainbowColor(normalizedValue) {
    normalizedValue *= 4;
    var r = Math.min(normalizedValue - 1.5, - normalizedValue + 4.5);
    var g = Math.min(normalizedValue - 0.5, - normalizedValue + 3.5);
    var b = Math.min(normalizedValue + 0.5, - normalizedValue + 2.5);

    return [clampValue(r), clampValue(g), clampValue(b)]
}

/**
 * Returns an [r, g, b] color from a smooth transition: icy blue to hot red
 */
function getHotColdColor(normalizedValue) {
    var r = 4 * (normalizedValue - 0.25);
    var g = 4 * Math.abs(normalizedValue - 0.5) - 1;
    var b = 4 * (0.75 - normalizedValue);

    return [clampValue(r), clampValue(g), clampValue(b)]
}

TVB_BRANDING_COLORS = [
    [76, 85, 94],
    [97, 124, 139],
    [63, 23, 46],
    [79, 23, 100],
    [146, 84, 151],
    [87, 180, 59],
    [32, 118, 53],
    [23, 57, 66],
    [29, 96, 88],
    [46, 153, 151],
    [138, 190, 234],
    [79, 169, 230],
    [45, 135, 171],
    [37, 101, 170],
    [229, 130, 33],
    [205, 67, 34],
    [182, 4, 49]
];

/**
 * Returns an [r, g, b] color from TVB_BRANDING_COLORS
 * Resulting color scheme is segmented among these colors
 */
function getTvbColor(normalizedValue) {
    var selectedInterval = Math.floor(normalizedValue * (TVB_BRANDING_COLORS.length - 1));
    return normalizeColorArray(TVB_BRANDING_COLORS[selectedInterval])
}

SPARSE_COLORS = [
0xFFC0CB, /* Pink */
0xCD5C5C, /* IndianRed */
0xFF0000, /* Red */
0x8B0000, /* DarkRed */
0xFF4500, /* OrangeRed */
0xFFA500, /* Orange */
0xFFFF00, /* Yellow */
0xADFF2F, /* GreenYellow */
0x32CD32, /* LimeGreen */
0x008000, /* Green */
0x8FBC8F, /* DarkSeaGreen */
0xE0FFFF, /* LightCyan */
0x00FFFF, /* Cyan */
0x008B8B, /* DarkCyan */
0x0000FF, /* Blue */
0x000080, /* Navy */
0xFF00FF, /* Magenta */
0x9400D3, /* DarkViolet */
0x4B0082, /* Indigo */
0xF0E68C, /* Khaki */
0xBDB76B, /* DarkKhaki */
0x808000, /* Olive */
0xBC8F8F, /* RosyBrown */
0xB8860B, /* DarkGoldenrod */
0xD2691E, /* Chocolate */
0xDEB887, /* BurlyWood */
0x8B4513  /* SaddleBrown */
];

/**
 * Returns an [r, g, b] color the first <code>_sparseColorNo</code> colors in SPARSE COLORS
 * Resulting color scheme is segmented among these colors
 */
function getSparseColor(normalizedValue) {
    var selectedInterval = Math.floor(normalizedValue * _sparseColorNo);
    var color = SPARSE_COLORS[selectedInterval];
    var r = color >> (4 * 4);                // discard green and blue, i.e. four hex positions
    var g = (color & 0xFF00) >> (2 * 4);     // sample green and discard blue, i.e. 2 hex positions
    var b = color & 0xFF;                    // only take the blue

    return [normalizeColor(r), normalizeColor(g), normalizeColor(b)]
}

// ================================= COLOR SCHEME FUNCTIONS  END  =================================

// ================================= LEGEND UPDATING FUNCTION START  =================================
/**
 * Function that should draw a gradient used for a legend. If the canvas for drawing doesn't exist, it will be created
 * @param containerDiv The div where the canvas is drawn
 * @param height The height of the drawn canvas
 */
function ColSch_updateLegendColors(containerDiv, height) {
    var canvas = $(containerDiv).children("canvas");
    if (!canvas.length) {                                   // create if it doesn't exist
        canvas = document.createElement("canvas");
        canvas.setAttribute("width", "20px");
        containerDiv.appendChild(canvas)
    }
    else
        canvas = canvas[0];                                  // exists, so take the first one
    canvas.setAttribute("height", height + "px");            // update canvas' height

	if (canvas.getContext) {                                // Make sure we don't execute when canvas isn't supported
        var ctx = canvas.getContext('2d');
        var legendGranularity = 127;
        var step = height / legendGranularity;
        var lingrad = ctx.createLinearGradient(0, height, 0, 0);         // y axis is inverted, so start from top
        for (var i = 0; i <= height; i += step)
            lingrad.addColorStop(i / height, getGradientColorString(i, 0, height))

        ctx.fillStyle = lingrad;                            // Fill a rect using the gradient
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
	}
    else
        displayMessage('You need a browser with canvas capabilities, to see this demo fully!', "errorMessage");
}

function ColSch_updateLegendLabels(container, minValue, maxValue, height) {
    var table = $(container).is("table") ? $(container) : $(container).find("table");    // get the table
    if (!table.length)
        table = $("<table>").appendTo(container);                            // create one if it doesn't exist
    table.height(height);                                                    // set its height
    var legendLabels = $(table).find("td");                                  // search for td
    if (!legendLabels.length)                                               // if none is found, assume tr also don't exist
        legendLabels = $(table).append("<tr><tr><tr><tr><tr><tr>")          // so add 6 rows
            .find("tr").each(function(idx, elem) {                          // get them and set their style
                if (idx == 0)   elem.style.height = "20px";                  // the first one should stay at the top
                else {
                    elem.style.height = "20%";                               // the other 5 are equally spread
                    elem.style.verticalAlign = 'bottom';                     // and stick the text at the bottom of cell
                }
            }).append("<td>").find("td");                                    // add td in each row and return them
    var step = (maxValue - minValue) / (legendLabels.length - 1);            // -1 because it includes min and max
    legendLabels.each(function(idx, elem) {
        elem.innerHTML = (maxValue - idx * step).toFixed(3)
    })
}
// ================================= LEGEND UPDATING FUNCTION  END   =================================

