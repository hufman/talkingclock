/**
 * Created with JetBrains PhpStorm.
 * User: hufman
 * Date: 11/3/12
 * Time: 2:53 PM
 * To change this template use File | Settings | File Templates.
 */

var Clock = {
    "sounds":{},
    "voice":null,
    "loadedCount":0,
    "soundsCount":0,
    "alreadyPlayed":false,
    "synced":false,
    "serverDifference":0,       // number of milliseconds to add to the local time to be real

    /** Start the clock going */
    "init": function() {
        this.voice = PatFleet;
        this.loadSounds();
        this.sync();
        this.tick();
        this.scheduleNextPhrase();
    },
    /** Sync from the server */
    "sync": function() {
        var differences = [];
        var count = 7;

        var run = function() {
            // set up the ajax call
            var request = null;
            if (window.XMLHttpRequest) {
                request = new XMLHttpRequest();
            } else if (window.ActiveXObject) {
                request = new ActiveXObject("Microsoft.XMLHTTP");
            }
            if (request == null) {
                Clock.synced = true;
            }

            // Calculate the server difference
            var startTime = new Date();
            request.onreadystatechange = function() {
                if (request.readyState === 4 && request.status === 200) {
                    var endTime = new Date();           // the current time
                    var reference = (endTime.getTime() - startTime.getTime())/2 + startTime.getTime();    // our local timestamp when the server's time was generated
                    var response = request.responseText;
                    var server = new Date(response);           // the server timei
                    if (server.toString() == 'Invalid Date') {
                        response = response.replace(/\..*\+/,"+");
                        server = new Date(response);
                        if (server.toString() == 'Invalid Date') {
                            return;
                        }
                    }
                    var difference = server.getTime() - reference;
                    differences.push(difference);
                    if (differences.length < count) {
                        Clock.loadingProgress('Syncing',differences.length, count);
                        run();
                    } else {
                        var sum = 0;
                        var counted = 0;
                        for (var i=2; i<differences.length; i++) {
                            sum += differences[i];
                            counted += 1;
                        }
                        Clock.serverDifference = sum / counted;
                        Clock.synced = true;
                        Clock.loadingProgress('Syncing',1, 1);
                    }
                }
            };
            request.open('GET', 'current_time', true);
            request.send();
        };
        run();
    },
    /** Get the current correct time */
    "getTime": function() {
        var date = new Date();
        date = new Date(date.getTime() + Clock.serverDifference);
        return date;
    },
    /** Update the text clock and schedule the next tick */
    "tick":function() {
        var date = Clock.getTime();
        var ms = date.getTime();
        var difference = 1000 - ms % 1000;
        setTimeout(Clock.tick, difference);

        var display = document.getElementById('clock');
        display.innerHTML = date.toString();
    },
    /** Change the progress indicator */
    "loadingProgress":function(action, current, max) {
        var percent = current / max;
        var output = action+' '+Math.floor(percent * 100) + '%';

        var display = document.getElementById('progress');
        display.innerHTML = output;

        if (current == max) {
            setTimeout(function() {
                display.innerHTML = '';
            }, 333);
        }
    },

    /** Preload the sounds */
    "loadSounds":function () {
        var loadSound = function(filename) {
            var sound = new Audio();
            var extensions = ['ogg', 'mp3', 'wav'];
            var mimes = {"ogg":"audio/ogg", "mp3":"audio/mpeg", "wav":"audio/wav"};
            for (var i=0; i<extensions.length; i++) {
                var extension = extensions[i];
                var mime = mimes[extension];
                var src = document.createElement('source');
                src.src = filename + '.' + extension;
                src.type = mime;
                sound.appendChild(src);
            }
            sound.preload = 'auto';
            sound.setAttribute('preload', 'auto');
            sound.load();
            sound.addEventListener('canplay', function() {
                Clock.loadedCount += 1;
                Clock.loadingProgress('Loaded',Clock.loadedCount, Clock.soundsCount);
            });
            return sound;
        };

        var sounds = this.voice.getSounds();
        Clock.soundsCount = sounds.length + 1;
        for (var i = 0; i < sounds.length; i++) {
            var name = sounds[i];
            this.sounds[name] = loadSound(this.voice.directory + name);
        }
        this.sounds['tone'] = loadSound('sounds/tone');
        Clock.loadingProgress('Loaded',0, Clock.soundsCount);
    },
    /** Play a certain sound */
    "playSound":function (sound) {
        this.sounds[sound].play();
    },
    /** Schedule a sequence to play */
    "scheduleSequence":function (startDate, sequence) {
        var curDate = Clock.getTime();
        var offset = startDate.getTime() - curDate.getTime();
        for (var i = 0; i < sequence.length; i++) {
            var curSound = sequence[i]+"";
            var scheduledFunction = function(sound) {
                return function() {
                    Clock.playSound(sound);
                };
            }(curSound);
            if (offset>0)
                setTimeout(scheduledFunction, offset);
            offset += this.voice.getSoundLength(curSound);
        }
        Clock.alreadyPlayed = true;
    },
    /** Generate and schedule the next phrase */
    "scheduleNextPhrase":function () {
        var curDate = Clock.getTime();
        var nextDate = curDate;
        do {
            nextDate = this.voice.getNextPromptTime(nextDate);
            var phrase = this.voice.getTimePhrase(nextDate);
            var phraselength = this.voice.getPhraseLength(phrase);

            curDate = Clock.getTime();
            var fullDelay = nextDate.getTime() - curDate.getTime();
        } while (Clock.alreadyPlayed && fullDelay - phraselength - 1000 < 0);

        if (this.loadedCount == this.soundsCount) {     // if all the sounds are loaded
            this.scheduleSequence(new Date(nextDate.getTime() - phraselength - 1000), phrase);
            curDate = Clock.getTime();
            fullDelay = nextDate.getTime() - curDate.getTime();
            setTimeout(function () {
                Clock.playSound("tone")
            }, fullDelay);
            setTimeout(function() {
                Clock.scheduleNextPhrase()
            }, fullDelay);
        } else {
            setTimeout(function() {
                Clock.scheduleNextPhrase()
            }, 50);
        }
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
        "and":598,
        "am":749,
        "pm":678,
        "oh":481,
        "oclock":798,
        "seconds":888,
        "at-tone-time-exactly":2680
    },
    /** Get the list of sounds */
    "getSounds": function() {
        return Object.keys(this.durations);
    },
    /** Get the next time that we could say */
    "getNextPromptTime": function(date) {
        var myDate = new Date(date.getTime() + 1000);
        myDate.setMilliseconds(0);
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
    /** Generate a phrase to say a specific number */
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
    /** Generate the phrase to say this specific time */
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
    /** Return the length (in milliseconds) for this sound */
    "getSoundLength": function(sound) {
        if (this.durations[sound])
            return this.durations[sound];
        return -1;
    },
    /** Return the length (in milliseconds) for this phrase */
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