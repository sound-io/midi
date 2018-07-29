// MIDI utilities
//
// Declares utility functions and constants on the MIDI object.

import { curry, deprecate, noop } from '../../fn/fn.js';

var A4        = 69;
var rnotename = /^([A-G][♭♯]?)(-?\d)$/;
var rshorthand = /[b#]/g;

export const noteNumbers = {
	'C':  0, 'C♯': 1, 'D♭': 1, 'D': 2, 'D♯': 3, 'E♭': 3, 'E': 4,
	'F':  5, 'F♯': 6, 'G♭': 6, 'G': 7, 'G♯': 8, 'A♭': 8, 'A': 9,
	'A♯': 10, 'B♭': 10, 'B': 11
};

export const noteNames = [
	'C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'
];

// MIDI message status bytes
//
// noteoff         128 - 143
// noteon          144 - 159
// polytouch       160 - 175
// control         176 - 191
// pc              192 - 207
// channeltouch    208 - 223
// pitch           224 - 240

const status = {
	noteoff:      128,
	noteon:       144,
	polytouch:    160,
	control:      176,
	pc:           192,
	channeltouch: 208,
	pitch:        224,
};

const types = Object.keys(status);

export function toType(message) {
	var name = types[Math.floor(message[0] / 16) - 8];

	// Catch type noteon with zero velocity and rename it as noteoff
	return name === types[1] && message[2] === 0 ?
		types[0] :
		name ;
}

export function toStatus(channel, type) {
	return channel > 0
		&& channel < 17
		&& status[type] + channel - 1 ;
}

export function toChannel(message) {
	return message[0] % 16 + 1;
}

export const normalise = (function(converters) {
	return function normalise(e) {
		var message = e.data;
		var time    = e.timeStamp;
		var type    = MIDI.toType(message);
		return (converters[type] || converters['default'])(data, time, type) ;
	};
})({
	pitch: function(message, time) {
		return [time, 'pitch', pitchToFloat(2, message)];
	},

	pc: function(data, time) {
		return [time, 'program', data[1]];
	},

	channeltouch: function(data, time) {
		return [time, 'touch', 'all', data[1] / 127];
	},

	polytouch: function(data, time) {
		return [time, 'touch', data[1], data[2] / 127];
	},

	default: function(data, time, type) {
		return [time, type, data[1], data[2] / 127] ;
	}
});

export function isNote(data) {
	return data[0] > 127 && data[0] < 160 ;
}

export function isControl(data) {
	return data[0] > 175 && data[0] < 192 ;
}

export function isPitch(data) {
	return data[0] > 223 && data[0] < 240 ;
}

export function normaliseNote(data) {
	// If it's a noteon with 0 velocity, normalise it to a noteoff
	if (data[2] === 0 && data[0] > 143 && data[0] < 160) {
		data[0] -= 16;
	}

	return data;
}

function replaceSymbol($0, $1) {
	return $1 === '#' ? '♯' :
		$1 === 'b' ? '♭' :
		'' ;
}

export function normaliseNoteName(name) {
	return name.replace(rshorthand, replaceSymbol);
}

export function pitchToInt(data) {
	return (data[2] << 7 | data[1]) - 8192 ;
}

export function pitchToFloat(range, message) {
	return (range === undefined ? 2 : range) * pitchToInt(message) / 8191 ;
}

export function nameToNumber(str) {
	var r = rnotename.exec(normaliseNoteName(str));
	return (parseInt(r[2], 10) + 1) * 12 + noteNumbers[r[1]];
}

export function numberToName(n) {
	return noteNames[n % 12] + numberToOctave(n);
}

export function numberToOctave(n) {
	return Math.floor(n / 12) - 1;
}

export function numberToFrequency(tuning, n) {
	return tuning * Math.pow(2, (n - A4) / 12);
}

export function frequencyToNumber(tuning, frequency) {
	var number = A4 + 12 * Math.log(frequency / tuning) / Math.log(2);

	// Rounded it to nearest 1,000,000th to avoid floating point errors and
	// return whole semitone numbers where possible. Surely no-one needs
	// more accuracy than a millionth of a semitone?
	return Math.round(1000000 * number) / 1000000;
}


// Deprecate

export const noteToNumber      = deprecate(nameToNumber, 'MIDI: noteToNumber(string) is now nameToNumber(string).');
export const numberToNote      = deprecate(numberToName, 'MIDI: numberToName(string) is now numberToName(string).');
export const normaliseData     = deprecate(noop, 'MIDI: deprecation warning - MIDI.normaliseData() has been deprecated');
export const normaliseNoteOn   = deprecate(noop, 'MIDI: normaliseNoteOn is deprecated');
export const normaliseNoteOff  = deprecate(normaliseNote, 'MIDI: normaliseNoteOff(message) is now normaliseNote(message)');
