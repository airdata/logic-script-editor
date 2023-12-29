// Repeats note that is played with specified beat divisions

var NeedsTimingInfo = true;
var activeNotes = [];

function HandleMIDI(event) {
	if (event instanceof NoteOn) {
		// add note to array
		activeNotes.push(event);
	}
	else if (event instanceof NoteOff) {
		// remove note from array
		for (i = 0; i < activeNotes.length; i++) {
			if (activeNotes[i].pitch == event.pitch) {
				activeNotes.splice (i, 1);
				break;
			}
		}
	}
	// pass non-note events through
	else event.send();

	// sort array of active notes
	activeNotes.sort(sortByPitchAscending);
}

//-----------------------------------------------------------------------------
function sortByPitchAscending (a, b) {
	if (a.pitch < b.pitch) {
    return -1;
  }
	if (a.pitch > b.pitch) {
    return 1;
  }
	return 0;
}

//-----------------------------------------------------------------------------
var wasPlaying = false;

function ProcessMIDI() {
	// Get timing information from the host application
	var musicInfo = GetTimingInfo();

	// clear activeNotes[] when the transport stops and send any remaining note off events
	if (wasPlaying && !musicInfo.playing) {
		for(i = 0;i < activeNotes.length; i++) {
			var off = new NoteOff(activeNotes[i]);
			off.send();
		}
	}

	wasPlaying = musicInfo.playing;

	if (activeNotes.length != 0) {

		// get parameters
		var division = GetParameter("Beat Division");
		var noteOrder = GetParameter("Note Order");
		var noteLength = (GetParameter("Note Length") / 100) * (1 / division);
		// var randomLength = Math.random() * ((GetParameter("Random Length") / 100) * (1 / division));
		// var randomDelay = Math.random() * ((GetParameter("Random Delay") / 100) * (1 / division));
		// var randomOctave = Math.floor(Math.random() * GetParameter("Random Octave")) * 12;

		// calculate beat to schedule
		var lookAheadEnd = musicInfo.blockEndBeat;
		var nextBeat = Math.ceil(musicInfo.blockStartBeat * division) / division;
		// var nextBeat = musicInfo.blockStartBeat;

		// when cycling, find the beats that wrap around the last buffer
		if (musicInfo.cycling && lookAheadEnd >= musicInfo.rightCycleBeat && lookAheadEnd >= musicInfo.rightCycleBeat) {
      var cycleBeats = musicInfo.rightCycleBeat - musicInfo.leftCycleBeat;
      var cycleEnd = lookAheadEnd - cycleBeats;
		}

    var state = GetParameter("Reset");
    if (state == 1) {
      Reset();
    }

		// loop through the beats that fall within this buffer
		while ((nextBeat >= musicInfo.blockStartBeat && nextBeat < lookAheadEnd && state == 0)
		// including beats that wrap around the cycle point
		|| (musicInfo.cycling && nextBeat < cycleEnd)) {

			// adjust for cycle
			if (musicInfo.cycling && nextBeat >= musicInfo.rightCycleBeat)
				nextBeat -= cycleBeats;

			// calculate step
			var step = Math.floor(nextBeat / (1 / division) - division);
			var chosenNote = chooseNote(noteOrder, step);

			// send events
			var noteOn = new NoteOn(chosenNote);
			// noteOn.pitch = MIDI.normalizeData(noteOn.pitch + randomOctave);
			noteOn.pitch = MIDI.normalizeData(noteOn.pitch);
			// noteOn.sendAtBeat(nextBeat + randomDelay);
			noteOn.sendAtBeat(nextBeat);
			var noteOff = new NoteOff(noteOn);
			// noteOff.sendAtBeat(nextBeat + randomDelay + noteLength + randomLength);
			noteOff.sendAtBeat(nextBeat + noteLength);

			// advance to next beat
			nextBeat += 0.001;
			nextBeat = Math.ceil(nextBeat * division) / division;
		}
	}
}

function Reset() {
  NeedsTimingInfo = true;
  activeNotes = [];
  SetParameter ("Reset", 0);
}

//-----------------------------------------------------------------------------
var noteOrders = ["up", "down", "random"];

function chooseNote(noteOrder, step) {
	var order = noteOrders[noteOrder];
	var length = activeNotes.length
	if (order == "up") return activeNotes[step % length];
	if (order == "down") return activeNotes[Math.abs(step % length - (length - 1))];
	if (order == "random") return activeNotes[Math.floor(Math.random() * length)];
	else return 0;
}

//-----------------------------------------------------------------------------
// var PluginParameters =
// [
// 		{name:"Beat Division", type:"linear",
// 		minValue:1, maxValue:16, numberOfSteps:15, defaultValue:1},
//
// 		{name:"Note Order", type:"menu", valueStrings:noteOrders,
// 		minValue:0, maxValue:2, numberOfSteps: 3, defaultValue:0},
//
// 		{name:"Note Length", unit:"%", type:"linear",
// 		minValue:1, maxValue:200, defaultValue:100.0, numberOfSteps:199},
//
// 		{name:"Random Length", unit:"%", type:"linear",
// 		minValue:0, maxValue:200, numberOfSteps: 200, defaultValue:0},
//
// 		{name:"Random Delay", unit:"%", type:"linear",
// 		minValue:0, maxValue:200, numberOfSteps:200, defaultValue:0},
//
// 		{name:"Random Octave", type:"linear",
// 		minValue:1, maxValue:4, defaultValue:1, numberOfSteps:3}
// ];
var PluginParameters =
[
		{name:"Beat Division", type:"linear",
		minValue:1, maxValue:16, numberOfSteps:15, defaultValue:1},

		{name:"Note Order", type:"menu", valueStrings:noteOrders,
		minValue:0, maxValue:2, numberOfSteps: 3, defaultValue:0},

		{name:"Reset", type:"menu", valueStrings:["Off", "On"],
		minValue:0, maxValue:1, numberOfSteps: 2, defaultValue:0},

		{name:"Note Length", unit:"%", type:"linear",
		minValue:1, maxValue:200, defaultValue:100.0, numberOfSteps:199}
];

// ----------------------------------------------------------------------------
// Code from plugin.js

// Copy and paste this chunk of code into your script editor to create controls in your plugin

// var PluginParameters = [];

// Types of Plugin Parameters
const LINEAR_FADER = "lin";
const LOGARITHMIC_FADER = "log";
const MOMENTARY_BUTTON = "momentary";
const MENU = "menu";
const NOT_NEEDED = "";

/*
To create a plugin parameter (a fader or knob that changes something is a basic way of desribing it), call the createPluginParameter function as follows:
createPluginParameter("Enter a name in quotes", Enter a type from above in quotes (for example: LINEAR_FADER), Enter a minimum value, Enter a maximum value, Enter a default value, enter the number of steps, "Enter a unit in quotes", "Enter text to create a divider/header in the plug-in", Enter a list of value strings if you are creating a menu as follows: ["something", "something", "something"]);
*/

function createPluginParameter (name, type, minValue, maxValue, defaultValue, numberOfSteps, unit, text, valueStrings) {
  if (type == MENU) {
    PluginParameters.push (createMenuPluginParameter (name, type, minValue, maxValue, defaultValue, numberOfSteps, unit, text, valueStrings));
  }
  else {
    PluginParameters.push (createBasicPluginParameter (name, type, minValue, maxValue, defaultValue, numberOfSteps, unit, text));
  }
}

function createBasicPluginParameter (name, type, minValue, maxValue, defaultValue, numberOfSteps, unit, text) {
  return {name: name, type: type, minValue: minValue, maxValue: maxValue, numberOfSteps: numberOfSteps, unit: unit, text: text};
}

function createMenuPluginParameter (name, type, minValue, maxValue, defaultValue, numberOfSteps, unit, text, valueStrings) {
  return {name: name, type: type, minValue: minValue, maxValue: maxValue, numberOfSteps: numberOfSteps, unit: unit, text: text, valueStrings: valueStrings};
}

//Parameters for the plugin
