/* use strict-mode provided by ecma-script5, see http://ejohn.org/blog/ecmascript-5-strict-mode-json-and-more/ for details */
"use strict";

/*
 * Holds all relevant information from the study regulations 
 * 'Fachspezifische Ordnung für das Bachelor- und Masterstudium im Fach IT-Systems Engineering an der Universität Potsdam'
 * (variable names in german, because 'Vertiefungsgebiete' is hard to translate and not really nice)
 */
var studyRegulations = {
	softskills: ["SSK-RE", "SSK-KO", "SSK-DT", "SSK-SK"], // SSK-MA is not included because it is treated specially in the softskillsRule
	modules: ["ITSE", "VT BPET", "VT HCT", "VT IST", "VT OSIS", "VT SAMT"],
	// removing these kills frontend functionality - TODO: remove when frontend doesnt need them anymore
	vertiefungsgebiete: ["BPET", "HCT", "IST", "OSIS", "SAMT"],
	module: ["Grundlagen IT-Systems Engineering", "Mathematische und theoretische Grundlagen", "Softwaretechnik und Modellierung", "Rechtliche und wirtschaftliche Grundlagen", "Softwarebasissysteme", "Vertiefungsgebiete", "Softskills"],
};
var semesterManager = {
	semesters: ["WS10/11", "SS11", "WS11/12", "SS12", "WS12/13", "SS13", "WS13/14", "SS14", "WS14/15", "SS15", "WS15/16", "SS16"],
	shownSemesters: [
	/*
		"SS13"
		*/
	],
	numberDisplayed: 4,
	current: "WS13/14",
	lastSummerSemester: "SS13",
	lastWinterSemester: "WS13/14",
	/* the semester that is the first semester when you first start the application */
	startswith: "WS13/14",
	updateSemester: function(semester_number, semester_string) {
		var index = semester_number - 1;
		if (semester_string.search(/[WS]S((\d{2}\/\d{2})|(\d{2}))/) < 0) {
			console.error("Mismatched semester string. Check data!");
			return;
		}

		var old_chosen = this.semesters.indexOf(this.shownSemesters[index]);
		var new_chosen = this.semesters.indexOf(semester_string);
		var difference = new_chosen - old_chosen;

		this.shownSemesters[index] = semester_string;

		for (var i = index + 1; i < this.shownSemesters.length; i += 1) {
			var old_index = this.semesters.indexOf(this.shownSemesters[i]);
			if (old_index + difference < this.semesters.length) this.shownSemesters[i] = this.semesters[old_index + difference];
			else this.shownSemesters[i] = this.semesters.last();
		}
	}
};

var ruleManager = {
	getSemester: null,
	rules: [],
	init: function(getSemester_Function) {
		this.getSemester = getSemester_Function;
	},
	checkAll: function() {
		var numberFailedRules = 0;
		var rules = [];
		for (var rule = 0; rule < this.rules.length; rule += 1) {
			this.rules[rule].success = true;
			if (!this.rules[rule].check(this.getSemester)) {
				numberFailedRules += 1;
				this.rules[rule].success = false;
			}
			rules.push(this.rules[rule]);
		}
		rules.numberFailedRules = numberFailedRules;
		return rules;
	}
};

/*
 * Rule-objectes, each representing one special type of rule
 * These objects basically act as classes (will be 'cloned' by Object.create later
 * It's a kind of 'inheritance by convention', meaning:
 *	- each rule has a type, by which it can be identified
 * 	- each rule must have a check method, which - given a special course to check - passes or fails
 *	- each rule must have a message property, which will be displayed, if the rule/test fails
 *	- there is one init-method, serving as constructor, which takes neccessary parameters and saves them, finally returning 'this'
 *	- some rules assign special information to variables, which can be used in the frontend to e. g. display already chosen Vertiefungen
 *
 * Furthermore, most objects have some special properties needed for that special kind of rule
 */

/* 1. Semester-Rule: Check that the chosen semesters are valid. */
var semesterRule = {
	/* type */
	type: 'semesterRule',
	/* constructor */
	init: function(course) {
		return this;
	},
	/* check method */
	check: function(getSemester) {
		for (var i = 0; i < semesterManager.shownSemesters.length - 1; i += 1) {
			var earlier_index = semesterManager.semesters.indexOf(semesterManager.shownSemesters[i]);
			var later_index = semesterManager.semesters.indexOf(semesterManager.shownSemesters[i + 1]);
			if (earlier_index >= later_index) {
				this.message = "Das " + (i + 2).toString() + "te Semester kommt zeitlich nicht nach dem " + (i + 1).toString() + "ten.";
				return false;
			}
		}
		return true;
	},
	/* message */
	message: "Eine späteres Semester kommt vor einem früheren."
};

/* 2. Time-Rule: course is not schedulable in the chosen semester */
var timeRule = {
	/* type */
	type: "timeRule",
	/* constructor */
	init: function(course) {
		this.course = course;
		this.message = "Die Veranstaltung '" + data[this.course].nameLV + "' wird im gewählten Semester nicht angeboten.";

		return this;
	},
	/* check method */
	check: function(getSemester) {
		// get the semester number (first, second, third ...) for the given course
		var semesterNumber = getSemester(this.course);
		this.message = "Die Veranstaltung '" + data[this.course].nameLV + "' wird im gewählten " + semesterNumber + ". Semester nicht angeboten.";

		if (semesterNumber === - 1) return true;
		// now get the semester time (WS10/11, SS10, ...) for the given course
		// important: subtract 1, because semester number starts at 1, while array starts at 0
		var semesterTime = semesterManager.shownSemesters[semesterNumber - 1];

		// now we have to distinguish two cases:
		// -	the semester is in the past/present
		// -	the semester is in the future
		if (semesterManager.semesters.indexOf(semesterTime) <= semesterManager.semesters.indexOf(semesterManager.current)) {
			// past or present
			return data[this.course].semester.indexOf(semesterTime) !== - 1;
		}
		else {
			// if the course is currently chosen for a summer semester
			if (semesterTime.indexOf("SS") >= 0) {
				// check if it was explicitly allowed or offered in the last summer semester
				return data[this.course].semester.indexOf(semesterTime) !== -1 ||
				       data[this.course].semester.indexOf(semesterManager.lastSummerSemester) !== - 1;
			}
			// if the course is currently chosen for a winter semester
			else if (semesterTime.indexOf("WS") >= 0) {
				// check if it was explicitly allowed or offered in the last winter semester
				return data[this.course].semester.indexOf(semesterTime) !== -1 ||
				       data[this.course].semester.indexOf(semesterManager.lastWinterSemester) !== - 1;
			}
			// else something went completly wrong
			else {
				console.error("Something is wrong with the semester-time. Check data!");
			}
			return true;
		}
	},
	/* message */
	message: 'Der Kurs wird im gewählten Semester nicht angeboten.',
	course: ""
};

/* 3. Clone-Rule: take care of clones (repetitions) of a specific course */
var cloneRule = {
	/* type */
	type: "cloneRule",
	/* constructor */
	init: function(cloneId) {
		this.cloneId = cloneId;
		var index = cloneId.indexOf("-");
		this.course = cloneId.substr(0, index);

		this.message = "Die Veranstaltung '" + data[this.course].nameLV + "' wird im gewählten Semester nicht angeboten.";

		return this;
	},
	/* check method */
	check: function(getSemester) {
		// get the semester number (first, second, third ...) for the given course
		var semesterNumber = getSemester(this.cloneId);
		if (semesterNumber === -1)
			return true;
		if (semesterNumber <= getSemester(this.course) || getSemester(this.course) === -1) {
			this.message = "Die Wiederholung von '" + data[this.course].nameLV + "' muss nach dem ersten Belegen der Veranstaltung geschehen.";
			return false;
		}
		this.message = "Die Veranstaltung '" + data[this.course].nameLV + "' wird im gewählten " + semesterNumber + ". Semester nicht angeboten.";

		if (semesterNumber === - 1) return true;
		// now get the semester time (WS10/11, SS10, ...) for the given course
		// important: subtract 1, because semester number starts at 1, while array starts at 0
		var semesterTime = semesterManager.shownSemesters[semesterNumber - 1];

		// now we have to distinguish two cases:
		// -	the semester is in the past/present
		// -	the semester is in the future
		if (semesterManager.semesters.indexOf(semesterTime) <= semesterManager.semesters.indexOf(semesterManager.current)) {
			// past or present
			return data[this.course].semester.indexOf(semesterTime) !== - 1;
		}
		else {
			// if the course is currently chosen for a summer semester
			if (semesterTime.indexOf("SS") >= 0) {
				// check if it was offered in the last summer semester
				return data[this.course].semester.indexOf(semesterManager.lastSummerSemester) !== - 1;
			}
			// if the course is currently chosen for a winter semester
			else if (semesterTime.indexOf("WS") >= 0) {
				// check if it was offered in the last summer semester
				return data[this.course].semester.indexOf(semesterManager.lastWinterSemester) !== - 1;
			}
			// else something went completly wrong
			else {
				console.error("Something is wrong with the semester-time. Check data!");
			}
			return true;
		}
	},
	/* message */
	message: 'Der Kurs wird im gewählten Semester nicht angeboten.',
	course: "",
	cloneId: ""
};

/* 4. ITSE-Rule: 24 cp in ITSE-courses (included in Modules-Rule, but gives a clearer error message) */
var itseRule = {
	/* type */
	type: "itseRule",
	/* constructor */
	init: function() {
		return this;
	},
	/* check method */
	check: function(getSemester) {
		/* Helper */
		// return all courses which are in ITSE
		var getCourses = function() {
			var courses = [];
			for (var course in data) {				
				if (!data.hasOwnProperty(course)) continue;
				if (getSemester(course) == - 1 ) continue;
				
				if (data[course].kennung.indexOf("ITSE") !== -1) {
					courses.push(course);
				}
			}
			return courses;
		};		
		var cpSum = function(courses){
			var sum = 0;
			courses.forEach(function(element){
				sum += data[element].cp;
			});
			return sum;
		};
		
		/* actual function */
		var courses = getCourses();
		
		var itsecourses = [];
		courses.forEach(function(element){
			if ( data[element].kennung.indexOf("ITSE") !== -1 ) {
				itsecourses.push(element);
			}
		});		
		var itsesum = cpSum(itsecourses);
		return (itsesum >= 24);

	},
	message: 'Es müssen mindestens 24 Leistungspunkte im Modul ITSE erbracht werden.'
};

/* 5. Modules-Rule: 4x 6cp in ITSE-courses, 24cp in VT1, 15cp in VT2 */
var modulesRule = {
	/* type */
	type: "modulesRule",
	/* constructor */
	init: function() {
		return this;
	},
	/* check method */
	check: function(getSemester) {
		/* Helper */
		// return all courses which are in any Vertiefungsgebiet
		var getCourses = function() {		
			var modules = studyRegulations.modules;
			var courses = [];
			for (var course in data) {				
				if (!data.hasOwnProperty(course)) continue;
				if (getSemester(course) == - 1 ) continue;
				// go through kennung and add (once) if any VT-kennung is hit
				data[course].kennung.every(function(element) {
					if ( modules.indexOf(element) !== -1 ) {
						courses.push(course);
						return false;
					}
					return true;
				});
			}
			return courses;
		};		
		var cpSum = function(courses){
			var sum = 0;
			courses.forEach(function(element){
				sum += data[element].cp;
			});
			return sum;
		};
		var cloneCombination = function(obj){
			var cpy = {};
			for (var key in obj) {
				// these are arrays, slice()-copy them
				cpy[key] = obj[key].slice();
			}
			return cpy;
		}
		
		/* actual function */
		// Several valid combinations are possible
		// Each combination is a set of ITSE-courses (24cp), a set of VT1-courses (24cp) and a set of VT2-courses (15cp), as well as the names of VT1 and VT2
		// IMPORTANT: This rule assumes no course is SSK-* as well as ITSE or any VT
		//
		
		var courses = getCourses();
				// Most ITSE-Courses also fit in some VT, build all valid combinations
		var combinations = [];
		//build one empty config
		var empty = {};
		studyRegulations.modules.forEach(function(element){
			empty[element] = [];
		});
		combinations.push(empty);
		
		// For each course and each combination, create new configurations, with the course added in one of its modules each, and throw away the old ones
		for (var i = 0; i < courses.length; i += 1) {
			var newcombinations = [];
			for (var j = 0; j < combinations.length; j += 1) {
				data[courses[i]].kennung.forEach(function(element){
					var newcombination = cloneCombination(combinations[j]);
					newcombination[element].push(courses[i]);
					newcombinations.push(newcombination);
				});
			}
			combinations = newcombinations;
		}
		
		// now we have all combinations, copy valid ones 
		var validcombinations = [];
		for (var i = 0; i < combinations.length; i += 1) {
			var sums = {};
			studyRegulations.modules.forEach(function(element){
				sums[element] = cpSum(combinations[i][element]);
			});
			
			// Requirement 1: 24 cp in ITSE
			if(sums["ITSE"] < 24) continue;
			// Requirement 2: 24 cp in VT1 and 15 cp in VT2
			var hasVT1 = false;
			var hasVT2 = false;
			for (var module in sums) {
				if (module == "ITSE") continue;
				if (sums[module] >= 24 && !hasVT1) hasVT1 = true;
				else if (sums[module] >= 15 && !hasVT2) hasVT2 = true;
			}
			if(!hasVT1 || !hasVT2) continue;
			
			validcombinations.push(cloneCombination(combinations[i]));
		}
		this.combinations = validcombinations;
		console.log(this.combinations);
		return (this.combinations.length > 0);
	},
	message: 'Es müssen mindestens zwei unterschiedliche Vertiefungsgebiete mit 24 und 15 Leistungspunkten belegt werden.'
};

/* 6. Softskills-Rule: atleast six credit points in SSK-MA and twelve credit points in other Softskills must be done */
var softskillsRule = {
	/* type */
	type: "softskillsRule",
	/* constructor */
	init: function() {
		return this;
	},
	/* check method */
	check: function(getSemester) {
		/* Helper */
		// return all courses with a SSK-* kennung
		var getSSKCourses = function() {		
			var ssk = studyRegulations.softskills;
			var sskCourses = [];
			for (var course in data) {				
				if (!data.hasOwnProperty(course)) continue;
				if (getSemester(course) == - 1 ) continue;
				// go through kennung and add (once) if any SSK- kennung is hit
				data[course].kennung.every(function(element) {
					if ( element == "SSK-MA" || ssk.indexOf(element) !== -1 ) {
						sskCourses.push(course);
						return false;
					}
					return true;
				});
			}
			return sskCourses;
		};
		var cpSum = function(courses){
			var sum = 0;
			courses.forEach(function(element){
				sum += data[element].cp;
			});
			return sum;
		};
		
		/* actual function */		
		var creditpoints = 0;
		
		// Several valid combinations might be possible
		// Each combination is a set of SSK-MA-Courses (generally one) with 6CP and a set of SSK-Courses from the other SSK-Types (RE/KO/DT/SK)
		var courses = getSSKCourses();
		
		// first filter all SSK-MA courses
		var macourses = [];
		var restcourses = [];
		courses.forEach(function(element){
			if ( data[element].kennung.indexOf("SSK-MA") !== -1 ) {
				macourses.push(element);
			} else {
				restcourses.push(element);
			}
		});
		
		var masum = cpSum(macourses);
		var restsum = cpSum(restcourses);
		if(masum >= 6 && restsum >= 12) return true; // yay, that was easy
		if(masum < 6) { // early ending
			this.message = "Es müssen mindestens 6 Leistungspunkte in SSK: Management erbracht werden."
			return false;
		}
		// otherwise, this is the error message
		this.message = "Es müssen mindestens 12 Leistungspunkte in den weiteren Softskills-Bereichen erworben werden."
		
		// unfortunately, most SSK-* courses are also SSK-MA or something, so macourses will be to big and restcourses too small
		
		// Now we have macourses, which probably contains way too many elements and restcourses, which definately are SSK, but not MA
		// We have to find any valid combination
		for (var i = 0; i < macourses.length; i += 1) {
			if (data[macourses[i]].cp >= 6) {
				// now that we have chosen a SSK-MA, make sure the rest is 12 cp
				// create copy without this one from the array and count
				var restmacourses = macourses.slice().splice(i,1);
				var restmasum = cpSum(restmacourses);
				if (restmasum + restsum >= 12){
					return true;				
				}
			} else { // with less than 6 cp (3cp), we need to add a second course
				for (var j = i+1; j < macourses.length; j += 1) { // only search the ones behind us, the ones in front of us have already been tried (or rather, tried us)
					// even in worst case 3+3 = 6, so SSK-MA is satisfied
					// now that we have chosen two SSK-MA, make sure the rest is 12 cp
					// create copy without these two from the array and count
					var restmacourses = macourses.slice().splice(j,1).splice(i,1); // order is important here, since j>=i we don't need to worry about i changing
					var restmasum = cpSum(restmacourses);
					if (restmasum + restsum >= 12) {
						return true;
					}
				}
			}
		}		
		// no valid combination was found
		return false;
	},
	/* message */
	message: '' //overriden in check
};


// ---
// Rules created, now started adding them to rule manager
// ---
/* 1: create semester rule, just push it to rules array */
ruleManager.rules.push(semesterRule);

/* now walk through the array and add data-dependent rules */
for (var course in data) {
	if (!data.hasOwnProperty(course)) continue;
	
	/* 2: create time-rules for all courses saved in data */
	ruleManager.rules.push(Object.create(timeRule).init(course));
}
/* 4: create itse-rule, just push it to rules-array */
ruleManager.rules.push(itseRule);

/* 5: create modules-rule, just push it to rules-array */
ruleManager.rules.push(modulesRule);

/* 6: create softskills-rule, just push it to rules-array */
ruleManager.rules.push(softskillsRule);

/* 3: clone rules are added at runtime when items are cloned */
