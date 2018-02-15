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

function genGcode() {

  // get the values from the HTML elements
  var FILAMENT_DIAMETER = parseFloat(document.getElementById('FIL_DIA').value),
      NOZZLE_DIAMETER = parseFloat(document.getElementById('NOZ_DIA').value),
      NOZZLE_TEMP = parseInt(document.getElementById('NOZZLE_TEMP').value),
      NOZZLE_LINE_RATIO = parseFloat(document.getElementById('NOZ_LIN_R').value),
      BED_TEMP = parseInt(document.getElementById('BED_TEMP').value),
      SPEED_SLOW = parseInt(document.getElementById('SLOW_SPEED').value),
      SPEED_FAST = parseInt(document.getElementById('FAST_SPEED').value),
      SPEED_MOVE = parseInt(document.getElementById('MOVE_SPEED').value),
      ACCELERATION = parseInt(document.getElementById('PRINT_ACCL').value),
      RETRACT_DIST = parseFloat(document.getElementById('RETRACTION').value),
      SELECT_SHAPE = document.getElementById('SHAPE_BED'),
      BED_SHAPE = SELECT_SHAPE.options[SELECT_SHAPE.selectedIndex].value,
      BED_X = parseInt(document.getElementById('BEDSIZE_X').value),
      BED_Y = parseInt(document.getElementById('BEDSIZE_Y').value),
      NULL_CENTER = document.getElementById('CENTER_NULL').checked,
      HEIGHT_LAYER = parseFloat(document.getElementById('LAYER_HEIGHT').value),
      EXT_MULT = parseFloat(document.getElementById('EXTRUSION_MULT').value),
      SELECT_FACTOR = document.getElementById('TYPE_FACTOR'),
      FACTOR_TYPE = SELECT_FACTOR.options[SELECT_FACTOR.selectedIndex].value,
      SELECT_PATTERN = document.getElementById('TYPE_PATTERN'),
      PATTERN_TYPE = SELECT_PATTERN.options[SELECT_PATTERN.selectedIndex].value,
      START_K = parseFloat(document.getElementById('K_START').value),
      END_K = parseFloat(document.getElementById('K_END').value),
      STEP_K = parseFloat(document.getElementById('K_STEP').value),
      JERK_X = parseFloat(document.getElementById('X_JERK').value),
      JERK_Y = parseFloat(document.getElementById('Y_JERK').value),
      JERK_Z = parseFloat(document.getElementById('Z_JERK').value),
      JERK_E = parseFloat(document.getElementById('E_JERK').value),
      SELECT_DIR = document.getElementById('DIR_PRINT'),
      PRINT_DIR = SELECT_DIR.options[SELECT_DIR.selectedIndex].value,
      CIRC_RES = parseFloat(document.getElementById('RES_CIRC').value),
      CIRC_RADIUS = parseFloat(document.getElementById('RAD_CIRC').value),
      LINE_SPACING = parseFloat(document.getElementById('SPACE_LINE').value),
      //ALT_PATTERN = document.getElementById("PAT_ALT").checked,
      USE_FRAME = document.getElementById('FRAME').checked,
      USE_PRIME = document.getElementById('PRIME').checked,
      EXT_MULT_PRIME = parseFloat(document.getElementById('PRIME_EXT').value),
      PRIME_DWELL = parseFloat(document.getElementById('DWELL_PRIME').value),
      LENGTH_SLOW = parseFloat(document.getElementById('SLOW_LENGTH').value),
      LENGTH_FAST = parseFloat(document.getElementById('FAST_LENGTH').value);

    var speeds = {"slow": SPEED_SLOW,
      "fast": SPEED_FAST,
      "move": SPEED_MOVE
    },
       coords = {}

  // calculate some values for later use
  var DECIMALS = 0;
  if (FACTOR_TYPE == 'V') {
    DECIMALS = getDecimals(STEP_K);
    STEP_K *= Math.pow(10, DECIMALS);
    START_K *= Math.pow(10, DECIMALS);
    END_K *= Math.pow(10, DECIMALS);
  }
  if (BED_SHAPE == 'Round') {
    BED_Y = BED_X;
  }

  var RANGE_K = END_K - START_K,
      LINE_WIDTH = NOZZLE_DIAMETER * NOZZLE_LINE_RATIO,
      PRINT_SIZE_Y = (RANGE_K / STEP_K * LINE_SPACING) + 25, // +25 with ref marking
      PRINT_SIZE_X = (2 * LENGTH_SLOW) + LENGTH_FAST + (USE_PRIME ? 10 : 0),
      CENTER_X = (NULL_CENTER ? 0 : BED_X / 2),
      CENTER_Y = (NULL_CENTER ? 0 : BED_Y / 2),
      PRIME_START_X = CENTER_X - LENGTH_SLOW - (0.5 * LENGTH_FAST) - (USE_PRIME ? 5 : 0),
      PRIME_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2),
      PRIME_END_X = PRIME_START_X,
      PRIME_END_Y = CENTER_Y + (PRINT_SIZE_Y / 2),
      REF1_START_X = CENTER_X - (0.5 * LENGTH_FAST) + (USE_PRIME ? 5 : 0),
      REF2_START_X = CENTER_X + (0.5 * LENGTH_FAST) + (USE_PRIME ? 5 : 0),
      REF_START_Y = CENTER_Y + (PRINT_SIZE_Y / 2) - 20,
      REF_END_Y = CENTER_Y + (PRINT_SIZE_Y / 2),
      PAT_START_X = CENTER_X - (0.5 * LENGTH_FAST) - LENGTH_SLOW + (USE_PRIME ? 5 : 0),
      PAT_START_Y = CENTER_Y - (PRINT_SIZE_Y / 2);

  // Check if K-Factor Stepping is a multiple of the K-Factor Range
  if (RANGE_K % STEP_K != 0) {
    alert("Your K-Factor range cannot be cleanly divided. Check Start / End / Steps for the Pattern");
    document.getElementById('textarea').value = '';
    return;
  }

  // Calculate a straight (non rotated) least fit rectangle around the entire test pattern
  var PRINT_DIR_RAD = PRINT_DIR * Math.PI / 180,
      FIT_WIDTH = Math.abs(PRINT_SIZE_X * Math.cos(PRINT_DIR_RAD)) + Math.abs(PRINT_SIZE_Y * Math.sin(PRINT_DIR_RAD)),
      FIT_HEIGHT = Math.abs(PRINT_SIZE_X * Math.sin(PRINT_DIR_RAD)) + Math.abs(PRINT_SIZE_Y * Math.cos(PRINT_DIR_RAD));

  // Compare the fit rectangle with the bed size. Safety margin 5 mm
  if (BED_SHAPE == "Round" && (Math.sqrt(Math.pow(FIT_WIDTH, 2) + Math.pow(FIT_HEIGHT, 2)) > BED_X - 5)) {
    if (!confirm('Your Pattern settings exceed your bed\'s diameter. Check Start / End / Steps for the Pattern. \n OK to continue, Cancel to return')) {
      document.getElementById('textarea').value = '';
      return;
    }
  } else if (FIT_WIDTH > BED_X - 5) {
    if (!confirm('Your Pattern settings exceed your X bed size. Check Start / End / Steps for the Pattern. \n OK to continue, Cancel to return')) {
      document.getElementById('textarea').value = '';
      return;
    }
  } else if (FIT_HEIGHT > BED_Y - 5) {
    if (!confirm('Your Pattern settings exceed your Y bed size. Check Start / End / Steps for the Pattern. \n OK to continue, Cancel to return')) {
      document.getElementById('textarea').value = '';
      return;
    }
  }

  // Convert speeds from mm/s to mm/min if needed
  if (document.getElementById('MM_S').checked) {
    SPEED_SLOW *= 60;
    SPEED_FAST *= 60;
    SPEED_MOVE *= 60;
  }

  // Set the extrusion parameters
  var EXTRUSION_RATIO = LINE_WIDTH * HEIGHT_LAYER / (Math.pow(FILAMENT_DIAMETER / 2, 2) * Math.PI),
      EXT_PRIME1 = Math.round10(EXTRUSION_RATIO * EXT_MULT_PRIME * (PRIME_END_Y - PRIME_START_Y), -4),
      EXT_PRIME2 = Math.round10(EXTRUSION_RATIO * EXT_MULT_PRIME * LINE_WIDTH * 1.5, -4),
      EXT_SLOW = Math.round10(EXTRUSION_RATIO * EXT_MULT * LENGTH_SLOW, -4),
      EXT_FAST = Math.round10(EXTRUSION_RATIO * EXT_MULT * LENGTH_FAST, -4),
      EXT_ALT = Math.round10(EXTRUSION_RATIO * EXT_MULT * LINE_SPACING, -4),
      EXT_FRAME1 = Math.round10(EXTRUSION_RATIO * EXT_MULT * (PRINT_SIZE_Y - 19), -4),
      EXT_FRAME2 = Math.round10(EXTRUSION_RATIO * EXT_MULT * LINE_WIDTH, -4),
      EXT_SEGMENT = Math.round10(EXTRUSION_RATIO * EXT_MULT * (2 * CIRC_RADIUS * Math.sin(((360 / CIRC_RES / 2) * Math.PI / 180))), -4);

 var basicParams = {"slow": SPEED_SLOW,
   "fast": SPEED_FAST,
   "move": SPEED_MOVE,
   "centerX": (NULL_CENTER ? 0 : BED_X / 2),
   "centerY": (NULL_CENTER ? 0 : BED_Y / 2),
   "printDir": PRINT_DIR,
   "lineWidth": LINE_WIDTH,
   "extRatio": EXTRUSION_RATIO,

 }
  // Start G-code for test pattern
  document.getElementById('textarea').value = '';
  document.getElementById('textarea').value = '; ### Marlin K-Factor Calibration Pattern ###\n' +
                                              '; -------------------------------------------\n' +
                                              ';\n' +
                                              '; Created: ' + new Date() + '\n' +
                                              ';\n' +
                                              '; Settings Printer:\n' +
                                              '; Filament Diameter = ' + FILAMENT_DIAMETER + ' mm\n' +
                                              '; Nozzle Diameter = ' + NOZZLE_DIAMETER + ' mm\n' +
                                              '; Nozzle Temperature = ' + NOZZLE_TEMP + ' °C\n' +
                                              '; Bed Temperature = ' + BED_TEMP + ' °C\n' +
                                              '; Retraction Distance = ' + RETRACT_DIST + ' mm\n' +
                                              '; Layer Height = ' + HEIGHT_LAYER + ' mm\n' +
                                              ';\n' +
                                              '; Settings Print Bed:\n' +
                                              '; Bed Shape = ' + BED_SHAPE + '\n' +
                                              (BED_SHAPE == 'Round' ? '; Bed Diameter = ' + BED_X + ' mm\n' : '; Bed Size X = ' + BED_X + ' mm\n') +
                                              (BED_SHAPE == 'Round' ? '' : '; Bed Size Y = ' + BED_Y + ' mm\n') +
                                              '; Origin Bed Center = ' + (NULL_CENTER ? "true" : "false") + '\n' +
                                              ';\n' +
                                              '; Settings Speed:\n' +
                                              '; Slow Printing Speed = ' + SPEED_SLOW + ' mm/min\n' +
                                              '; Fast Printing Speed = ' + SPEED_FAST + ' mm/min\n' +
                                              '; Movement Speed = ' + SPEED_MOVE + ' mm/min\n' +
                                              '; Printing Acceleration = ' + ACCELERATION + ' mm/s^2\n' +
                                              '; Jerk X-axis = ' + (JERK_X != '-1' ? JERK_X + '\n': ' firmware default\n') +
                                              '; Jerk Y-axis = ' + (JERK_Y != '-1' ? JERK_Y + '\n': ' firmware default\n') +
                                              '; Jerk Z-axis = ' + (JERK_Z != '-1' ? JERK_Z + '\n': ' firmware default\n') +
                                              '; Jerk Extruder = ' + (JERK_E != '-1' ? JERK_E + '\n': ' firmware default\n') +
                                              ';\n' +
                                              '; Settings Pattern:\n' +
                                              (FACTOR_TYPE == 'V' ? '; Linear Advance Factor = Velocity\n' : '; Linear Advance Factor = K-Factor\n') +
                                              '; Starting Value Factor = ' + (FACTOR_TYPE == "V" ? START_K / Math.pow(10, DECIMALS) : START_K) + '\n' +
                                              '; Ending Value Factor = ' + (FACTOR_TYPE == "V" ? END_K / Math.pow(10, DECIMALS) : END_K) + '\n' +
                                              '; Factor Stepping = ' + (FACTOR_TYPE == "V" ? STEP_K / Math.pow(10, DECIMALS) : STEP_K) + '\n' +
                                              '; Test Line Spacing = ' + STEP_K + ' mm\n' +
                                              '; Test Line Length Slow = ' + LENGTH_SLOW + ' mm\n' +
                                              '; Test Line Length Fast = ' + LENGTH_FAST + ' mm\n' +
                                              //'; Print Pattern = ' + (ALT_PATTERN ? "Alternate" : "Standard") + '\n' +
                                              '; Print Frame = ' + (USE_FRAME ? "true" : "false") + '\n' +
                                              '; Print Size X = ' + FIT_WIDTH + ' mm\n' +
                                              '; Print Size Y = ' + FIT_HEIGHT + ' mm\n' +
                                              '; Print Rotation = ' + PRINT_DIR + ' degree\n' +
                                              ';\n' +
                                              '; Settings Advance:\n' +
                                              '; Nozzle / Line Ratio = ' + NOZZLE_LINE_RATIO + '\n' +
                                              '; Use BL = ' + (document.getElementById('USE_BL').checked ? "true" : "false") + '\n' +
                                              '; Extrusion Multiplier = ' + EXT_MULT + '\n' +
                                              '; Prime Nozzle = ' + (USE_PRIME ? "true" : "false") + '\n' +
                                              '; Prime Extrusion Multiplier = ' + EXT_MULT_PRIME + '\n' +
                                              '; Dwell Time = ' + PRIME_DWELL + ' s\n' +
                                              ';\n' +
                                              '; prepare printing\n' +
                                              ';\n' +
                                              'G28 ; home all axes\n' +
                                              'M190 S' + BED_TEMP + ' ; set and wait for bed temp\n' +
                                              'M104 S' + NOZZLE_TEMP + ' ; set nozzle temp and continue\n';

  // Use bed leveling if activated
  if (document.getElementById('USE_BL').checked) {
    document.getElementById('textarea').value += 'G29 ; execute bed automatic leveling compensation\n';
  }

  document.getElementById('textarea').value += 'M109 S' + NOZZLE_TEMP + ' ; block waiting for nozzle temp\n' +
                                               'G21 ; set units to millimeters\n' +
                                               'M204 P' + ACCELERATION + ' ; set acceleration\n' +
                                               (JERK_X != '-1' ? 'M205 X' + JERK_X + ' ; set X jerk\n' : '') +
                                               (JERK_Y != '-1' ? 'M205 Y' + JERK_Y + ' ; set Y jerk\n' : '') +
                                               (JERK_Z != '-1' ? 'M205 Z' + JERK_Z + ' ; set Z jerk\n' : '') +
                                               (JERK_E != '-1' ? 'M205 E' + JERK_E + ' ; set E jerk\n' : '') +
                                               'G90 ; use absolute coordinates\n' +
                                               'M83 ; use relative distances for extrusion\n' +
                                               'G92 E0 ; reset extruder distance\n';

  // Prime nozzle if activated
  if (USE_PRIME) {
    document.getElementById('textarea').value += ';\n' +
                                                 '; prime nozzle\n' +
                                                 ';\n' +
                                                 'G1 X' + Math.round10(rotateX(PRIME_START_X, CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PRIME_START_X, CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' F' + SPEED_MOVE + ' ; move to prime start\n' +
                                                 'G1 Z' + HEIGHT_LAYER + ' F' + SPEED_SLOW + ' ; move to layer height\n' +
                                                 'G1 X' + Math.round10(rotateX(PRIME_END_X, CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PRIME_END_X, CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_PRIME1 + ' F' + SPEED_SLOW + ' ; prime nozzle\n' +
                                                 'G1 X' + Math.round10(rotateX(PRIME_END_X + (LINE_WIDTH * 1.5), CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PRIME_END_X + (LINE_WIDTH * 1.5), CENTER_X, PRIME_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_PRIME2 + ' F' + SPEED_SLOW + ' ; prime nozzle\n' +
                                                 'G1 X' + Math.round10(rotateX(PRIME_END_X + (LINE_WIDTH * 1.5), CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PRIME_END_X + (LINE_WIDTH * 1.5), CENTER_X, PRIME_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_PRIME1 + ' F' + SPEED_SLOW + ' ; prime nozzle\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n';
  }

  // if selected, print an anchor frame around test line start and end points
  if (USE_FRAME) {
    document.getElementById('textarea').value += ';\n' +
                                                 '; print anchor frame\n' +
                                                 ';\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' F' + SPEED_MOVE + ' ; move to frame start\n' +
                                                 (USE_PRIME ? '' : 'G1 Z' + HEIGHT_LAYER + ' F' + SPEED_SLOW + ' ; move to layer height\n') +
                                                 (USE_PRIME ? 'G1 E' + RETRACT_DIST + '\n' : '') +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X - LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME2 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' F' + SPEED_MOVE + ' ; move to frame start\n' +
                                                 'G1 E' + RETRACT_DIST + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST + LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST + LINE_WIDTH, CENTER_X, PAT_START_Y + PRINT_SIZE_Y - 22, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME2 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST + LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST + LINE_WIDTH, CENTER_X, PAT_START_Y - 3, CENTER_Y, PRINT_DIR), -4) +
                                                   ' E' + EXT_FRAME1 + ' F' + SPEED_SLOW + '\n' +
                                                 'G1 E-' + RETRACT_DIST + '\n';
  }

  // insert a retract if no prime and no frame
  if (!USE_PRIME && !USE_FRAME) {
    document.getElementById('textarea').value += 'G1 E-' + RETRACT_DIST + '\n';
  }

  // generate the k-factor test pattern
  document.getElementById('textarea').value += ';\n' +
                                               '; start the test pattern\n' +
                                               ';\n' +
                                               (PRIME_DWELL ? 'G4 P' + (PRIME_DWELL * 1000) + ' ; Pause (dwell) for 2 seconds\n' : '') +
                                               'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' F' + SPEED_MOVE + ' ; move to pattern start\n' +
                                                (USE_PRIME || USE_FRAME ? '' : 'G1 Z' + HEIGHT_LAYER + ' F' + SPEED_SLOW + ' ; move to layer height\n');
//                                                (ALT_PATTERN ? 'G1 E' + RETRACT_DIST + '\n' : '');
  var j = 0,
      k = 0;

  for (var i = START_K; i <= END_K; i += STEP_K) {
    if (PATTERN_TYPE == "alt" && (k % 2 == 0)) {
      document.getElementById('textarea').value += (FACTOR_TYPE == 'V' ? 'M900 V' + (i / Math.pow(10, DECIMALS)) + ' ; set V-factor\n' : 'M900 K' + i + ' ; set K-factor\n') +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_FAST + ' F' + SPEED_FAST + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_ALT + ' F' + SPEED_FAST + '\n';
      j += LINE_SPACING;
      k += 1;
    } else if (PATTERN_TYPE == "alt" && (k % 2 != 0)) {
      document.getElementById('textarea').value += (FACTOR_TYPE == 'V' ? 'M900 V' + (i / Math.pow(10, DECIMALS)) + ' ; set V-factor\n' : 'M900 K' + i + ' ; set K-factor\n') +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_FAST + ' F' + SPEED_FAST + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_ALT + ' F' + SPEED_FAST + '\n';
      j += LINE_SPACING;
      k += 1;
    } else if (PATTERN_TYPE == "std") {
      document.getElementById('textarea').value += (FACTOR_TYPE == 'V' ? 'M900 V' + (i / Math.pow(10, DECIMALS)) + ' ; set V-factor\n' : 'M900 K' + i + ' ; set K-factor\n') +
                                                   'G1 E' + RETRACT_DIST + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + LENGTH_SLOW + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_FAST + ' F' + SPEED_FAST + '\n' +
                                                   'G1 X' + Math.round10(rotateX(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X + (2 * LENGTH_SLOW) + LENGTH_FAST, CENTER_X, PAT_START_Y + j, CENTER_Y, PRINT_DIR), -4) +
                                                     ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                                   'G1 E-' + RETRACT_DIST + '\n' +
                                                   (i != END_K ? 'G1 X' + Math.round10(rotateX(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' Y' + Math.round10(rotateY(PAT_START_X, CENTER_X, PAT_START_Y + j + LINE_SPACING, CENTER_Y, PRINT_DIR), -4) +
                                                     ' F' + SPEED_MOVE + '\n' : '');
      j += LINE_SPACING;
    }
  }

  if (PATTERN_TYPE == "circ") {
    var circles = circleRectPacking(BED_X, BED_Y, CIRC_RADIUS, 3, CENTER_X, CENTER_Y, 10, 10),
        midPointX = null,
        midPointY = null;

    for (var ii = 0; ii < circles.length; ii += 1) {
      for(var key in circles[ii]){
        if(circles[ii].hasOwnProperty(key)) {
          for(var val in circles[ii][key]){
            if(circles[ii][key].hasOwnProperty(val)) {
              midPointX = circles[ii][key][val]["x"];
              midPointY = circles[ii][key][val]["y"];
              document.getElementById('textarea').value += circlePattern(midPointX, midPointY, CIRC_RADIUS, CIRC_RES, SPEED_SLOW, SPEED_FAST, SPEED_MOVE, EXT_SEGMENT);
            }
          }
        }
      }
    }
  }
/*
  // mark area of speed changes and close G-code
  document.getElementById('textarea').value += ';\n' +
                                               '; mark the test area for reference\n' +
                                               ';\n' +
                                               (FACTOR_TYPE == 'V' ? 'M900 V0 ; set V-factor 0\n' : 'M900 K0 ; set K-factor 0\n') +
//                                               (ALT_PATTERN ? 'G1 E-' + RETRACT_DIST + '\n' : '') +
                                               'G1 X' + Math.round10(rotateX(REF1_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' Y' + Math.round10(rotateY(REF1_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' F' + SPEED_MOVE + '\n' +
                                               'G1 E' + RETRACT_DIST + '\n' +
                                               'G1 X' + Math.round10(rotateX(REF1_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' Y' + Math.round10(rotateY(REF1_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                               'G1 E-' + RETRACT_DIST + '\n' +
                                               'G1 X' + Math.round10(rotateX(REF2_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' Y' + Math.round10(rotateY(REF2_START_X, CENTER_X, REF_START_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' F' + SPEED_MOVE + '\n' +
                                               'G1 E' + RETRACT_DIST + '\n' +
                                               'G1 X' + Math.round10(rotateX(REF2_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' Y' + Math.round10(rotateY(REF2_START_X, CENTER_X, REF_END_Y, CENTER_Y, PRINT_DIR), -4) +
                                                 ' E' + EXT_SLOW + ' F' + SPEED_SLOW + '\n' +
                                               'G1 E-' + RETRACT_DIST + '\n' +
                                               ';\n' +
                                               '; finish\n' +
                                               ';\n' +
                                               'M104 S0 ; turn off hotend\n' +
                                               'M140 S0 ; turn off bed\n' +
                                               'G1 Z30 X' + (NULL_CENTER ? BED_X / 2 : BED_X) + ' Y' + (NULL_CENTER ? BED_Y / 2 : BED_Y) + ' F' + SPEED_MOVE + ' ; move away from the print\n' +
                                               'M84 ; disable motors\n' +
                                               'M502 ; resets parameters from ROM\n' +
                                               'M501 ; resets parameters from EEPROM\n' +
                                               ';';
*/
}

// Save content of textarea to file using
// https://github.com/eligrey/FileSaver.js
function saveTextAsFile() {
  var textToWrite = document.getElementById('textarea').value,
      textFileAsBlob = new Blob([textToWrite], {type: 'text/plain'}),
      fileNameToSaveAs = "kfactor.gcode";
  if (textToWrite) {
    saveAs(textFileAsBlob, fileNameToSaveAs);
  } else {
    alert("Generate G-code first");
    return;
  }
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
(function() {

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number} The adjusted value.
   */

  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || Number(exp) === 0) {
      return Math[type](value);
    }
    value = Number(value);
    exp = Number(exp);
    // If the value is not a number or the exp is not an integer...
    if (value === null || isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // If the value is negative...
    if (value < 0) {
      return -decimalAdjust(type, -value, exp);
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](Number(value[0] + 'e' + (value[1] ? (Number(value[1]) - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return Number(value[0] + 'e' + (value[1] ? (Number(value[1]) + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
}());

// get the number of decimal places of a float
function getDecimals(num) {
  var match = (String(num)).match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  if (!match) {
    return num;
  }
  var decimalPlaces = Math.max(0, (match[1] ? match[1].length : 0) - (match[2] ? Number(match[2]) : 0));
  return decimalPlaces;
}

// rotate x around a defined center xm, ym
function rotateX(x, xm, y, ym, a) {
  a = a * Math.PI / 180; // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var xr = (x - xm) * cos - (y - ym) * sin + xm; //CCW
  var xr = (cos * (x - xm)) + (sin * (y - ym)) + xm; //CW
  return xr;
}

// rotate y around a defined center xm, ym
function rotateY(x, xm, y, ym, a) {
  a = a * Math.PI / 180; // Convert to radians
  var cos = Math.cos(a),
      sin = Math.sin(a);

  // Subtract midpoints, so that midpoint is translated to origin
  // and add it in the end again
  //var yr = (x - xm) * sin + (y - ym) * cos + ym; //CCW
  var yr = (cos * (y - ym)) - (sin * (x - xm)) + ym; //CW
  return yr;
}

function moveToStart(coord, speedMove) {
  var gcode = '';
  gcode += ';\n' +
           '; move to start\n' +
           ';\n' +
           'G1 X' + Math.round10(rotateX(coord['startX'], coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
             ' Y' + Math.round10(rotateY(coord['startX'], coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
             ' F' + speedMove + ' ; move to pattern start start\n';
  return gcode;
}

function moveToLayerHeight(speed, layerHeight) {
  var gcode = '';
  gcode += ';\n' +
           '; move to layer height\n' +
           ';\n' +
           'G1 Z' + layerHeight + ' F' + speed + '\n';
  return gcode;
}

function retract(direction, amount) {
  var gcode = '';
  if (direction == '-') {
    gcode += 'G1 E-' + amount + '\n';
  } else if (direction == '+') {
    gcode += 'G1 E' + amount + '\n';
  }
  return gcode;
}

function createPrime(coord, lengthX, lengthY, speeds, extParam) {
  var gcode = '';

  gcode += ';\n' +
           '; prime nozzle\n' +
           ';\n' +
           'G1 X' + Math.round10(rotateX(coord['startX'] + lengthX, coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' Y' + Math.round10(rotateY(coord['startX'] + lengthX, coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' E' + EXT_PRIME1 + ' F' + speeds['slow'] + ' ; prime nozzle\n' +
           'G1 X' + Math.round10(rotateX(coord['startX'] + lengthX + (LINE_WIDTH * 1.5), coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' Y' + Math.round10(rotateY(coord['startX'] + lengthX + (LINE_WIDTH * 1.5), coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' E' + EXT_PRIME2 + ' F' + speeds['slow'] + ' ; prime nozzle\n' +
           'G1 X' + Math.round10(rotateX(coord['startX'] + lengthX + (LINE_WIDTH * 1.5), coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' Y' + Math.round10(rotateY(coord['startX'] + lengthX + (LINE_WIDTH * 1.5), coord['centerX'], coord['startY'] + lengthY, coord['centerY'], coord['printDir']), -4) +
             ' E' + EXT_PRIME1 + ' F' + speeds['slow'] + ' ; prime nozzle\n';
  return gcode;
}

function createGlyphs(coord, speeds) {
  var glyphSegHeight = 2;
  var glyphExt = 1;
  var glyphs = {"1": 'G1 X' + Math.round10(rotateX(coord['startX'], coord['centerX'], coord['startY'] + (2 * glyphSegHeight), coord['centerY'], coord['printDir']), -4) +
                     ' Y' + Math.round10(rotateY(coord['startX'], coord['centerX'], coord['startY'] + (2 * glyphSegHeight), coord['centerY'], coord['printDir']), -4) +
                     ' E' + (2 * glyphExt) + ' F' + speeds['slow'] + ' ; 1\n',
  "2": 'G1 X' + Math.round10(rotateX(coord['startX'], coord['centerX'], coord['startY'] + (2 * glyphSegHeight), coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'], coord['centerX'], coord['startY'] + (2 * glyphSegHeight), coord['centerY'], coord['printDir']), -4) +
       ' F' + speeds['move'] + ' ; 2\n' +
       'G1 X' + Math.round10(rotateX(coord['startX'] + glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'] + glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' E' + glyphExt + ' F' + speeds['slow'] + ' ; 2\n' +
       'G1 X' + Math.round10(rotateX(coord['startX'], coord['centerX'], coord['startY'] - glyphSegHeight, coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'], coord['centerX'], coord['startY'] - glyphSegHeight, coord['centerY'], coord['printDir']), -4) +
       ' E' + glyphExt + ' F' + speeds['slow'] + ' ; 2\n' +
       'G1 X' + Math.round10(rotateX(coord['startX'] - glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'] - glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' E' + glyphExt + ' F' + speeds['slow'] + ' ; 2\n' +
       'G1 X' + Math.round10(rotateX(coord['startX'], coord['centerX'], coord['startY'] - glyphSegHeight, coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'], coord['centerX'], coord['startY'] - glyphSegHeight, coord['centerY'], coord['printDir']), -4) +
       ' E' + glyphExt + ' F' + speeds['slow'] + ' ; 2\n' +
       'G1 X' + Math.round10(rotateX(coord['startX'] + glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' Y' + Math.round10(rotateY(coord['startX'] + glyphSegHeight, coord['centerX'], coord['startY'], coord['centerY'], coord['printDir']), -4) +
       ' E' + glyphExt + ' F' + speeds['slow'] + ' ; 2\n'
    };


}

/*
G1 X55 Y62.5 F7200 ; move to prime start
G1 X55 Y137.5 E7.4835 F1200 ; prime nozzle
G1 X55.72 Y137.5 E0.0718 F1200 ; prime nozzle
G1 X55.72 Y62.5 E7.4835 F1200 ; prime nozzle
*/
// Calculate circle packing in rectangle
function circleRectPacking(sizeX, sizeY, radius, spacing, xm, ym, offsetX, offsetY) {
  var midpoints = [],
      rows = [],
      i = 0,
      j = 0,
      xx = 0,
      yy = 0,
      nx = Math.floor10((sizeX - (2 * offsetX) + spacing) / ((2 * radius) + spacing)),
      ny = Math.floor10((sizeY - (2 * offsetY) + spacing) / ((2 * radius) + spacing));

  if (xm == 0 && ym == 0) {
    while (i < ny) {
      j = 0;
      while (j < nx) {
        xx = -(sizeX * 0.5) + offsetX + (((2 * j) + 1) * radius) + (j ? j * spacing : 0);
        yy = -(sizeY * 0.5) + offsetY + (((2 * i) + 1) * radius) + (i ? i * spacing : 0);
        midpoints.push({x: xx, y: yy});
        j += 1;
      }
      rows.push({row: midpoints.concat()});
      midpoints.length = 0;
      i += 1;
    }
  } else {
    while (i < ny) {
      j = 0;
      while (j < nx) {
        xx = 0 + offsetX + (((2 * j) + 1) * radius) + (j ? j * spacing : 0);
        yy = 0 + offsetY + (((2 * i) + 1) * radius) + (i ? i * spacing : 0);
        midpoints.push({x: xx, y: yy});
        j += 1;
      }
      rows.push({row: midpoints.concat()});
      midpoints.length = 0;
      i += 1;
    }
  }
  return rows;
}

function circlePattern(x, y, radius, seg, slow, fast, move, ext) {
  var gcode = '',
      end = 2 * Math.PI,
      step = end / seg,
      angle = 0;

  gcode += 'G1 X' + (x + radius) +
           ' Y' + y +
           ' F' + move + ' ; move to midpoint\n';
  for (angle=0; angle <= end * 0.2; angle += step) {
    gcode += 'G1 X' + Math.round10((Math.cos(angle) * radius) + x, -4) +
            ' Y' + Math.round10((Math.sin(angle) * radius) + y, -4) +
            ' E' + ext + ' F' + slow + '\n';
  }
  for (angle; angle <= end * 0.4; angle += step) {
    gcode += 'G1 X' + Math.round10((Math.cos(angle) * radius) + x, -4) +
            ' Y' + Math.round10((Math.sin(angle) * radius) + y, -4) +
            ' E' + ext + ' F' + fast + '\n';
  }
  for (angle; angle <= end * 0.6; angle += step) {
    gcode += 'G1 X' + Math.round10((Math.cos(angle) * radius) + x, -4) +
            ' Y' + Math.round10((Math.sin(angle) * radius) + y, -4) +
            ' E' + ext + ' F' + slow + '\n';
  }
  for (angle; angle <= end * 0.8; angle += step) {
    gcode += 'G1 X' + Math.round10((Math.cos(angle) * radius) + x, -4) +
            ' Y' + Math.round10((Math.sin(angle) * radius) + y, -4) +
            ' E' + ext + ' F' + fast + '\n';
  }
  for (angle; angle <= end; angle += step) {
    gcode += 'G1 X' + Math.round10((Math.cos(angle) * radius) + x, -4) +
            ' Y' + Math.round10((Math.sin(angle) * radius) + y, -4) +
            ' E' + ext + ' F' + slow + '\n';
  }
  return gcode;
}

// toggle html elements
$(window).load(function () {
  // Adapt textarea to cell size
  var TXTAREAHEIGHT = $('.txtareatd').height();
  $('.calibpat textarea').css({'height': (TXTAREAHEIGHT) + 'px'});

  $(":input:not(:hidden)").each(function (i) {
    $(this).attr('tabindex', i + 1);
  });

  // toggle between mm/s and mm/min speeds
  $('#MM_S').change(function() {
    var SPEED_SLOW = $('#SLOW_SPEED').val(),
        SPEED_FAST = $('#FAST_SPEED').val(),
        SPEED_MOVE = $('#MOVE_SPEED').val();
    if ($(this).is(':checked')) {
      SPEED_SLOW = $('#SLOW_SPEED').val();
      SPEED_FAST = $('#FAST_SPEED').val();
      SPEED_MOVE = $('#MOVE_SPEED').val();
      $('#SLOW_SPEED').val(SPEED_SLOW / 60);
      $('#FAST_SPEED').val(SPEED_FAST / 60);
      $('#MOVE_SPEED').val(SPEED_MOVE / 60);
    } else {
      SPEED_SLOW = $('#SLOW_SPEED').val();
      SPEED_FAST = $('#FAST_SPEED').val();
      SPEED_MOVE = $('#MOVE_SPEED').val();
      $('#SLOW_SPEED').val(SPEED_SLOW * 60);
      $('#FAST_SPEED').val(SPEED_FAST * 60);
      $('#MOVE_SPEED').val(SPEED_MOVE * 60);
    }
  });

  // Toggle Bed Shape
  $('#SHAPE_BED').change(function() {
    if ($(this).val() == 'Round') {
      $("label[for='BEDSIZE_X']").text("Bed Diameter:");
      $("#shape").text("Diameter (mm) of the bed");
      $('#BEDSIZE_Y').prop('disabled', true);
      $('label[for=BEDSIZE_Y]').css({opacity: 0.5});
      $("#CENTER_NULL").prop("checked", !$("#CENTER_NULL").prop("checked"));
    } else {
      $("label[for='BEDSIZE_X']").text("Bed Size X:");
      $("#shape").text("Size (mm) of the bed in X");
      $('#BEDSIZE_Y').prop('disabled', false);
      $('label[for=BEDSIZE_Y]').css({opacity: 1});
      $("#CENTER_NULL").prop("checked", !$("#CENTER_NULL").prop("checked"));
    }
  });

  // toggle prime relevant html elements
  $('#PRIME').change(function() {
    if ($(this).is(':checked')) {
      $('#PRIME_EXT').prop('disabled', false);
      $('label[for=PRIME_EXT]').css({opacity: 1});
    } else {
      $('#PRIME_EXT').prop('disabled', true);
      $('label[for=PRIME_EXT]').css({opacity: 0.5});
    }
  });

  // frame and alternate pattern are mutually exclusive
  $('#PAT_ALT').change(function() {
    if ($(this).is(':checked')) {
      $('#FRAME').prop('checked', false);
      $('#FRAME').prop('disabled', true);
      $('label[for=FRAME]').css({opacity: 0.5});
    } else {
      $('#FRAME').prop('disabled', false);
      $('label[for=FRAME]').css({opacity: 1});
    }
  });
  $('#FRAME').change(function() {
    if ($(this).is(':checked')) {
      $('#PAT_ALT').prop('checked', false);
      $('#PAT_ALT').prop('disabled', true);
      $('label[for=PAT_ALT]').css({opacity: 0.5});
    } else {
      $('#PAT_ALT').prop('disabled', false);
      $('label[for=PAT_ALT]').css({opacity: 1});
    }
  });

  // Change factor type
  $('#TYPE_FACTOR').change(function() {
    if ($(this).val() == 'V') {
      $("#K_START").attr("step", "any");
      $("#K_END").attr("step", "any");
      $("#K_STEP").attr("step", "any");
      $("#K_START").val("0");
      $("#K_END").val("2");
      $("#K_STEP").val("0.2");
      $("label[for='K_START']").text("Starting Value for V:");
      $("label[for='K_END']").text("Ending Value for V:");
      $("label[for='K_STEP']").text("V-Factor Stepping:");
      $("#start_factor").text("Starting value for the V-factor. Usually 0 but for bowden setups you might want to start higher, e.g. 30");
      $("#end_factor").text("Ending value of the V-factor. Bowden setups may be higher than 100");
      $("#step_factor").text("Stepping of the V-factor in the test pattern. Needs to be an exact divisor of the V-factor Range (End - Start)");
    } else {
      $("#K_START").attr("step", "1");
      $("#K_END").attr("step", "1");
      $("#K_STEP").attr("step", "1");
      $("#K_STEP").attr("value", "5");
      $("#K_START").val("0");
      $("#K_END").val("100");
      $("#K_STEP").val("5");
      $("label[for='K_START']").text("Starting Value for K:");
      $("label[for='K_END']").text("Ending Value for K:");
      $("label[for='K_STEP']").text("K-Factor Stepping:");
      $("#start_factor").text("Starting value for the K-factor. Usually 0 but for bowden setups you might want to start higher, e.g. 30");
      $("#end_factor").text("Ending value of the K-factor. Bowden setups may be higher than 100");
      $("#step_factor").text("Stepping of the K-factor in the test pattern. Needs to be an exact divisor of the K-factor Range (End - Start)");
    }
  });
});
