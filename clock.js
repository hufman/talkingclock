/**
 * Created with JetBrains PhpStorm.
 * User: hufman
 * Date: 11/3/12
 * Time: 2:53 PM
 * To change this template use File | Settings | File Templates.
 */

var Clock = {
    /** Start the clock going */
    "init": function() {
        this.voice = PatFleet;
        this.loadSounds();
        this.tick();
        this.scheduleNextPhrase();
    },
    /** Update the text clock and schedule the next tick */
    "tick":function() {
        var date = new Date();
        var ms = date.getTime();
        var difference = 1000 - ms % 1000;
        setTimeout(Clock.tick, difference);

        var display = document.getElementById('clock');
        display.innerHTML = date.toString();
    },
    /** Change the progress indicator */
    "loadingProgress":function(current, max) {
        var percent = current / max;
        var output = "Loaded "+Math.floor(percent * 100) + '%';

        var display = document.getElementById('progress');
        display.innerHTML = output;

        if (current == max) {
            setTimeout(function() {
                display.innerHTML = '';
            }, 333);
        }
    },
    "sounds":{},
    "voice":null,
    "loadedCount":0,
    "soundsCount":0,
    "loadSounds":function () {
        var loadSound = function(filename) {
            var sound = new Audio();
            sound.src = filename;
            sound.load();
            sound.addEventListener('canplay', function() {
                Clock.loadedCount += 1;
                Clock.loadingProgress(Clock.loadedCount, Clock.soundsCount);
            });
            return sound;
        };
        var sounds = this.voice.getSounds();
        for (var i = 0; i < sounds.length; i++) {
            var name = sounds[i];
            this.sounds[name] = loadSound(this.voice.directory + name + '.wav');
        }
        this.sounds['tone'] = loadSound('sounds/tone.wav');
        Clock.soundsCount = sounds.length + 1;
    },
    "playSound":function (sound) {
        this.sounds[sound].play();
    },
    "playSequence":function (sequence) {
        var offset = 0;
        for (var i = 0; i < sequence.length; i++) {
            var curSound = sequence[i]+"";
            var scheduledFunction = function(sound) {
                return function() {
                    Clock.playSound(sound);
                };
            }(curSound);
            setTimeout(scheduledFunction, offset);
            offset += this.voice.getSoundLength(curSound);
        }
    },
    "scheduleNextPhrase":function () {
        var curDate = new Date();
        var nextDate = this.voice.getNextPromptTime(curDate);
        var phrase = this.voice.getTimePhrase(nextDate);
        var phraselength = this.voice.getPhraseLength(phrase);

        curDate = new Date();
        var fullDelay = nextDate.getTime() - curDate.getTime();
        var startDelay = fullDelay - phraselength - 1000;

        if (this.loadedCount == this.soundsCount) {     // if all the sounds are loaded
            setTimeout(function () {
                Clock.playSequence(phrase);
            }, startDelay);
            setTimeout(function () {
                Clock.playSound("tone")
            }, fullDelay);
        }
        setTimeout(function() {
            Clock.scheduleNextPhrase()
        }, fullDelay);
    }
};

var PatFleet = {
    "directory": "sounds/patfleet/",
    // The durations in milliseconds for each snippet
    "durations": {
        "0":758,
        "1":596,
        "2":516,
        "3":489,
        "4":533,
        "5":720,
        "6":774,
        "7":729,
        "8":587,
        "9":814,
        "10":720,
        "11":720,
        "12":693,
        "13":880,
        "14":827,
        "15":859,
        "16":1058,
        "17":1000,
        "18":839,
        "19":925,
        "20":587,
        "20_":667,
        "30":480,
        "30_":507,
        "40":631,
        "40_":596,
        "50":676,
        "50_":605,
        "60":809,
        "60_":756,
        "70":818,
        "70_":807,
        "80":560,
        "80_":551,
        "90":720,
        "90_":667,
        "and":598,
        "am":749,
        "pm":678,
        "oh":481,
        "oclock":798,
        "seconds":888,
        "at-tone-time-exactly":2680
    },
    "getSounds": function() {
        return Object.keys(this.durations);
    },
    "getNextPromptTime": function(date) {
        var myDate = new Date(date.getTime() + 8000);
        var seconds = myDate.getSeconds();
        var newseconds = 0;
        var roundups = [10, 15, 20, 30, 40, 45, 50, 60];        // what seconds we'll actually speak
        for (var i = roundups.length - 1; i >= 0; i--) {
            if (seconds<roundups[i])
                newseconds = roundups[i];
        }
        var mytimestamp = myDate.getTime() + (newseconds - seconds)*1000;
        return new Date(mytimestamp);
    },
    "getNumberPhrase": function(number) {
        var phrase = [];
        var tens = Math.floor((number % 100) / 10);
        var ones = number % 10;
        if (tens == 0)
            phrase = [String(ones)];
        if (tens == 1)
            phrase = [String(number)];
        if (tens > 1 && ones == 0)
            phrase = [String(tens*10)];
        if (tens > 1 && ones > 0)
            phrase = [String(tens*10), String(ones)];
        return phrase;
    },
    "getTimePhrase": function(date) {
        var hours = date.getHours();
        var minutes = date.getMinutes();
        var seconds = date.getSeconds();

        var phrase = [];
        if (minutes == 0 && seconds == 0) {
            phrase = [hours > 0 ? String(hours % 12) : String(12), 'oclock', hours > 11 ? 'pm': 'am'];
        }
        else {
            var hoursphrase = [hours > 0 ? String(hours % 12) : String(12)];

            var minutesphrase = [];
            if (minutes<10)
                minutesphrase = ['oh'];
            minutesphrase = minutesphrase.concat(this.getNumberPhrase(minutes), [hours > 11 ? 'pm': 'am']);
            if (minutes >= 20 && seconds>0)
                minutesphrase[minutesphrase.length-3] += '_';

            var secondsphrase = [];
            if (seconds != 0)
                secondsphrase = ["and"].concat(this.getNumberPhrase(seconds), ['seconds']);
            if (seconds>=20 && seconds % 10 > 0)
                secondsphrase[secondsphrase.length-3] += '_';
            phrase = [].concat(hoursphrase, minutesphrase, secondsphrase);
        }
        return ['at-tone-time-exactly'].concat(phrase);

    },
    "getSoundLength": function(sound) {
        if (this.durations[sound])
            return this.durations[sound];
        return -1;
    },
    "getPhraseLength": function(phrase) {
        var time = 0;
        for (var i=0; i<phrase.length; i++) {
            time += this.durations[phrase[i]];
        }
        return time;
    }
};

window.onload = function() {
    Clock.init();
};