/**
 * K-Factor Calibration Pattern
 * Copyright (C) 2017 Sineos [https://github.com/Sineos]
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
"use strict";

function gengcode(form1) {

    // get the values from the HTML form
    var FILAMENT_DIAMETER = parseFloat(document.forms['form1']['FIL_DIA'].value);
    var NOZZLE_DIAMETER = parseFloat(document.forms['form1']['NOZ_DIA'].value);
    var NOZZLE_TEMP = parseInt(document.forms['form1']['NOZZLE_TEMP'].value);
    var NOZZLE_LINE_RATIO = parseFloat(document.forms['form1']['NOZ_LIN_R'].value);
    var BED_TEMP = parseInt(document.forms['form1']['BED_TEMP'].value);
    var SPEED_SLOW = parseInt(document.forms['form1']['SLOW_SPEED'].value);
    var SPEED_FAST = parseInt(document.forms['form1']['FAST_SPEED'].value);
    var SPEED_MOVE = parseInt(document.forms['form1']['MOVE_SPEED'].value);
    var RETRACT_DIST = parseFloat(document.forms['form1']['RETRACTION'].value);
    var BED_X = parseInt(document.forms['form1']['BEDSIZE_X'].value);
    var BED_Y = parseInt(document.forms['form1']['BEDSIZE_Y'].value);
    var BED_DIAMETER = parseInt(document.forms['form1']['BEDSIZE_DIAMETER'].value);
    var HEIGHT_LAYER = parseFloat(document.forms['form1']['LAYER_HEIGHT'].value);
    var EXT_MULT = parseFloat(document.forms['form1']['EXTRUSION_MULT'].value);
    var START_K = parseInt(document.forms['form1']['K_START'].value);
    var END_K = parseInt(document.forms['form1']['K_END'].value);
    var STEP_K = parseFloat(document.forms['form1']['K_STEP'].value);
    var SELECT_DIR = document.getElementById('DIR_PRINT');
    var PRINT_DIR = SELECT_DIR.options[SELECT_DIR.selectedIndex].value;
    var LINE_SPACING = parseFloat(document.forms['form1']['SPACE_LINE'].value);
    var ALT_PATTERN = document.getElementById("PAT_ALT").checked;

    //calculate some values for later use
    var RANGE_K =  END_K - START_K;
    var LINE_WIDTH = NOZZLE_DIAMETER * NOZZLE_LINE_RATIO;
    var PRINT_SIZE = RANGE_K / STEP_K * LINE_SPACING + 25;
    var CENTER_X = (document.getElementById('ROUND_BED').checked ? BED_DIAMETER / 2 : BED_X / 2);
    var CENTER_Y = (document.getElementById('ROUND_BED').checked ? BED_DIAMETER / 2 : BED_Y / 2);
    var PRIME_START_X = CENTER_X - 50;
    var PRIME_START_Y = CENTER_Y - (PRINT_SIZE / 2);
    var PRIME_END_X = CENTER_X - 50;
    var PRIME_END_Y = CENTER_Y + (PRINT_SIZE / 2);
    var REF1_START_X = CENTER_X - 10;
    var REF2_START_X = CENTER_X + 30;
    var REF_START_Y = (PRINT_SIZE / 2) + CENTER_Y - 20;
    var REF_END_Y = (PRINT_SIZE / 2) + CENTER_Y;
    var PAT_START_X = CENTER_X - 30;
    var PAT_START_Y = CENTER_Y - (PRINT_SIZE / 2);


    // Check if K-Factor Stepping is a multiple of the K-Factor Range
    if (RANGE_K % STEP_K != 0) {
        alert("Your K-Factor range cannot be cleanly divided. Check Start / End / Steps for the K-Factor");
        document.forms['form1']['textarea'].value = '';
        return;
    }

    // Calculate a straight (non rotated) least fit rectangle around the entire test pattern
    // https://stackoverflow.com/a/17453766
    var PRINT_DIR_RAD = PRINT_DIR  * Math.PI / 180;
    var ANGLE = ((PRINT_DIR_RAD > Math.PI * 0.5 && PRINT_DIR_RAD < Math.PI * 1) || (PRINT_DIR_RAD > Math.PI * 1.5 && PRINT_DIR_RAD < Math.PI * 2)) ? Math.PI - PRINT_DIR_RAD : PRINT_DIR_RAD; 
    var FIT_WIDTH = Math.sin(ANGLE) * PRINT_SIZE + Math.cos(ANGLE) * 100;
    var FIT_HEIGHT = Math.sin(ANGLE) * 100 + Math.cos(ANGLE) * PRINT_SIZE;
    var FIT_DIAGONAL = Math.sqrt(Math.pow(PRINT_SIZE, 2) + Math.pow(100, 2));
    
    // Compare the fit rectangle with the bed size. Safety margin 5 mm
    if (FIT_WIDTH > BED_X - 5 && !document.getElementById('ROUND_BED').checked) {
        if (!confirm('Your K-Factor settings exceed your X bed size. Check Start / End / Steps for the K-Factor. \n OK to continue, Cancel to return')) {
            document.forms['form1']['textarea'].value = '';
            return;
        }
    } else if (FIT_HEIGHT > BED_Y - 5 && !document.getElementById('ROUND_BED').checked) {
        if (!confirm('Your K-Factor settings exceed your Y bed size. Check Start / End / Steps for the K-Factor. \n OK to continue, Cancel to return')) {
            document.forms['form1']['textarea'].value = '';
            return;
        }
    } else if (FIT_DIAGONAL > BED_DIAMETER - 5 && document.getElementById('ROUND_BED').checked) {
        if (!confirm('Your K-Factor settings exceed your bed\'s diameter. Check Start / End / Steps for the K-Factor. \n OK to continue, Cancel to return')) {
            document.forms['form1']['textarea'].value = '';
            return;
        }
    }   

    // Convert speeds from mm/s to mm/min if needed
    if (document.getElementById('MM_S').checked) {
        SPEED_SLOW = SPEED_SLOW * 60;
        SPEED_FAST = SPEED_FAST * 60;
        SPEED_MOVE = SPEED_MOVE * 60;
    }

    //Set the extrusion parameters
    var EXTRUSION_RATIO = LINE_WIDTH * HEIGHT_LAYER / (Math.pow(FILAMENT_DIAMETER / 2,2) * Math.PI);
    var EXT_PRIME = roundNumber(EXTRUSION_RATIO * EXT_MULT * (PRIME_END_Y - PRIME_START_Y), 5);
    var EXT_20 = roundNumber(EXTRUSION_RATIO * EXT_MULT * 20, 5);
    var EXT_40 = roundNumber(EXTRUSION_RATIO * EXT_MULT * 40, 5);
    var EXT_SPACE = roundNumber(EXTRUSION_RATIO * EXT_MULT * LINE_SPACING, 5);
    var EXT_FRAME1 = roundNumber(EXTRUSION_RATIO * EXT_MULT * (PRINT_SIZE - 19), 5);
    var EXT_FRAME2 = roundNumber(EXTRUSION_RATIO * EXT_MULT * LINE_WIDTH, 5);

    // Start G-code for test pattern
    document.forms['form1']['textarea'].value = '';
    document.forms['form1']['textarea'].value = '; ### Marlin K-Factor Calibration Pattern ###\n' +
                                                '; -------------------------------------------\n' +
                                                ';\n' +
                                                '; Created: ' + new Date() + '\n' +
                                                '; Settings:\n' +
                                                '; Filament Diameter = ' + FILAMENT_DIAMETER + '\n' +
                                                '; Nozzle Diameter = ' + NOZZLE_DIAMETER + '\n' +
                                                '; Nozzle Temperature = ' + NOZZLE_TEMP + '\n' +
                                                '; Nozzle / Line Ratio = ' + NOZZLE_LINE_RATIO + '\n' +
                                                '; Bed Temperature = ' +BED_TEMP + '\n' +
                                                '; Slow Printing Speed = ' + SPEED_SLOW + '\n' +
                                                '; Fast Printing Speed = ' + SPEED_FAST + '\n' +
                                                '; Movement Speed = ' + SPEED_MOVE + '\n' +
                                                '; Use UBL = ' + (document.getElementById('USE_UBL').checked ? "true" : "false") + '\n' +
                                                '; Retraction Distance = ' + RETRACT_DIST + '\n' +
                                                '; Bed Size X = ' + BED_X + '\n' +
                                                '; Bed Size Y = ' + BED_Y + '\n' +
                                                '; Layer Height = ' + HEIGHT_LAYER + '\n' +
                                                '; Extrusion Multiplier = ' + EXT_MULT + '\n' +
                                                '; Starting Value K-Factor = ' + START_K + '\n' +
                                                '; Ending value K-Factor = ' + END_K + '\n' +
                                                '; K-Factor Stepping = ' + STEP_K + '\n' +
                                                ';\n' +
                                                'G28 ; home all axes\n' +
                                                'M190 S' + BED_TEMP + ' ; set and wait for bed temp\n' +
                                                'M104 S' + NOZZLE_TEMP + ' ; set nozzle temp and continue\n';

    // Use bed levelling if activated
    if (document.getElementById('USE_UBL').checked) {
        document.forms['form1']['textarea'].value += 'G29 ; execute bed automatic levelling compensation\n';
    }

    document.forms['form1']['textarea'].value += 'M109 S' + NOZZLE_TEMP + ' ; block waiting for nozzle temp\n' +
                                                 'G21 ; set units to millimeters\n' +
                                                 'M204 S500 ; lower acceleration to 500mm/s2 during the test\n' +
                                                 'G90 ; use absolute coordinates\n' +
                                                 'M83 ; use relative distances for extrusion\n' +
                                                 ';\n' +
                                                 '; go to layer height and prime nozzle on a line to the left\n' +
                                                 ';\n' +
                                                 'G1 X' + roundNumber(rotateX(PRIME_START_X, CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(PRIME_START_X, CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' F' + SPEED_MOVE + '\n' +
                                                 'G1 Z' + HEIGHT_LAYER + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 X' + roundNumber(rotateX(PRIME_END_X, CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(PRIME_END_X, CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' E' + EXT_PRIME + ' F' + SPEED_SLOW + ' ; extrude some to start clean\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n';

    // if selected, print an anchor frame around test line start and end points
    if (document.getElementById('FRAME').checked) {
        document.forms['form1']['textarea'].value += ';\n' +
                                                     '; print anchor frame\n' +
                                                     ';\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' F' + SPEED_MOVE + ' ; move to frame start\n' +
                                                     'G1 E' + RETRACT_DIST + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME2 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 E-' + RETRACT_DIST + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X + 80, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X + 80, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' F' + SPEED_MOVE + ' ; move to frame start\n' +
                                                     'G1 E' + RETRACT_DIST + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X + 80, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X + 80, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X + 80 + LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X + 80 + LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE - 22, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME2 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 X' + roundNumber(rotateX(PAT_START_X  + 80 + LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' Y' + roundNumber(rotateY(PAT_START_X  + 80 + LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), 4) +
                                                         ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                     'G1 E-' + RETRACT_DIST + '\n';
    }

    // generate the k-factor test pattern
    document.forms['form1']['textarea'].value += ';\n' +
                                                 '; start the test pattern\n' +
                                                 ';\n' +
                                                 'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' F' + SPEED_MOVE + ' ; move to pattern start\n';
    var j = 0;
    var k = 0;
    for (var i = START_K; i <= END_K; i = i + STEP_K) {
        if (ALT_PATTERN && (k % 2 == 0)) {
            document.forms['form1']['textarea'].value += 'M900 K' + i + ' ; set K-factor\n' +
                                                         'G1 E' + RETRACT_DIST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_40 + ' F' + SPEED_FAST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 80, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 80, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 80, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 80, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_SPACE + ' F' + SPEED_FAST + '\n';
            j = j + LINE_SPACING;
            k = k + 1;
        } else if (ALT_PATTERN && (k % 2 != 0)) {
            document.forms['form1']['textarea'].value += 'M900 K' + i + ' ; set K-factor\n' +
                                                         'G1 E' + RETRACT_DIST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_40 + ' F' + SPEED_FAST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_SPACE + ' F' + SPEED_FAST + '\n';                                                      
            j = j + LINE_SPACING;
            k = k + 1;
        } else {
            document.forms['form1']['textarea'].value += 'M900 K' + i + ' ; set K-factor\n' +
                                                         'G1 E' + RETRACT_DIST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 20, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 60, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_40 + ' F' + SPEED_FAST + '\n' +
                                                         'G1 X' + roundNumber(rotateX(PAT_START_X + 80, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X + 80, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), 4) +
                                                             ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                         'G1 E-' + RETRACT_DIST + '\n' +
                                                         (i != END_K ? 'G1 X' + roundNumber(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' Y' + roundNumber(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), 4) +
                                                             ' F' + SPEED_MOVE + ' ; move to pattern start\n' : '');
            j = j + LINE_SPACING;
        }
    }
    // mark area of speed changes and close G-code
    document.forms['form1']['textarea'].value += ';\n' +
                                                 '; mark the test area for reference\n' +
                                                 ';\n' +
                                                 (ALT_PATTERN ? 'G1 E-' + RETRACT_DIST + '\n' : '') +
                                                 'G1 X' + roundNumber(rotateX(REF1_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(REF1_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' F' + SPEED_MOVE + '\n' +
                                                 'G1 E' + RETRACT_DIST + '\n' +
                                                 'G1 X' + roundNumber(rotateX(REF1_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(REF1_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n' +
                                                 'G1 X' + roundNumber(rotateX(REF2_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(REF2_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' F' + SPEED_MOVE + '\n' +
                                                 'G1 E' + RETRACT_DIST + '\n' +
                                                 'G1 X' + roundNumber(rotateX(REF2_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' Y' + roundNumber(rotateY(REF2_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), 4) +
                                                     ' E' + EXT_20 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n' +
                                                 ';\n' +
                                                 '; finish\n' +
                                                 ';\n' +
                                                 'M104 S0 ; turn off hotend\n' +
                                                 'M140 S0 ; turn off bed\n' +
                                                 'G1 Z30 Y200 F' + SPEED_MOVE + ' ; move away from the print\n' +
                                                 'M84 ; disable motors\n' +
                                                 'M502 ; resets parameters from ROM (for those who do not have an EEPROM)\n' +
                                                 'M501 ; resets parameters from EEPROM (preferably)\n' +
                                                 ';';
}

// https://stackoverflow.com/questions/21479107/saving-html5-textarea-contents-to-file
function saveTextAsFile(form) {
    var textToWrite = document.getElementById('textarea').value;
    var textFileAsBlob = new Blob([ textToWrite ], { type: 'text/plain' });
    var fileNameToSaveAs = "kfactor.gcode";

    var downloadLink = document.createElement("a");
    downloadLink.download = fileNameToSaveAs;
    downloadLink.innerHTML = "Download File";
    if (window.webkitURL != null) {
        // Chrome allows the link to be clicked without actually adding it to the DOM.
        downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
    } else {
        // Firefox requires the link to be added to the DOM before it can be clicked.
        downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
        downloadLink.onclick = destroyClickedElement;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
    }

    downloadLink.click();
}

function destroyClickedElement(event) {
    // remove the link from the DOM
    document.body.removeChild(event.target);
}

// https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-only-if-necessary
function roundNumber(num, scale) {
    if (!("" + num).includes("e")) {
        return +(Math.round(num + "e+" + scale)  + "e-" + scale);
    } else {
        var arr = ("" + num).split("e");
        var sig = ""
        if (+arr[1] + scale > 0) sig = "+";
        return +(Math.round(+arr[0] + "e" + sig + (+arr[1] + scale)) + "e-" + scale);
    }
}

function rotateX(x, xm, y, ym, a) {
    a = a * Math.PI / 180; // Convert to radians
    var cos = Math.cos(a);
    var sin = Math.sin(a);

    // Subtract midpoints, so that midpoint is translated to origin
    // and add it in the end again
    //var xr = (x - xm) * cos - (y - ym) * sin + xm; //CCW
    var xr = (cos * (x - xm)) + (sin * (y - ym)) + xm; //CW
    return xr;
}

function rotateY(x, xm, y, ym, a) {
    a = a * Math.PI / 180; // Convert to radians
    var cos = Math.cos(a);
    var sin = Math.sin(a);

    // Subtract midpoints, so that midpoint is translated to origin
    // and add it in the end again
    //var yr = (x - xm) * sin + (y - ym) * cos + ym; //CCW
    var yr = (cos * (y - ym)) - (sin * (x - xm)) + ym; //CW
    return yr;
}

function check_frame(form1) {
    if (document.getElementById('PAT_ALT').checked) {
        document.getElementById('FRAME').disabled = true;
        document.getElementById('FRAME').checked = false;
    } else {
        document.getElementById('FRAME').disabled = false;
    }
}

function check_shape(form1) {
    if (document.getElementById('ROUND_BED').checked) {
        document.getElementById('BEDSIZE_X').disabled = true;
        document.getElementById('BEDSIZE_Y').disabled = true;
        document.getElementById('BEDSIZE_DIAMETER').disabled = false;
    } else {
        document.getElementById('BEDSIZE_X').disabled = false;
        document.getElementById('BEDSIZE_Y').disabled = false;
        document.getElementById('BEDSIZE_DIAMETER').disabled = true;
    }
}