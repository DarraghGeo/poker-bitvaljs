if (typeof require !== 'undefined') {
  const Bitval128 = require("./bitval_128.js");
  global.Bitval128 = Bitval128;
}

class BitvalTest{

  constructor(){
    this.bitval = new Bitval128();

    this.handStrengthsInOrder = ["Pair", "Two Pair", "Trips", "Straight", "Flush", "Full House", "Quads", "Straight Flush"];
    this.testHands = {
        "Straight Flush": {
            "correct": [
                "Ah Kh Qh Jh Th 2s 3s", 
                "6h 5h 4h 3h 2h Ac Ad",
                "2s 3s 4s 5s 6s 7c 8c",
                "3d 4d 5d 6d 7d Ks Kc",
                "9c Tc Jc Qc Kc Ah As",
                "Ts Js Qs Ks As 3d 4d",
                "5c 6c 7c 8c 9c 2d 2h",
                "4s 5s 6s 7s 8s 9d Td",
                "8d 9d Td Jd Qd Kc Kd",
                "7h 8h 9h Th Jh 2s 2h",
                "Kh Qh Jh Th 9h Ac Ad",
                "Ts Js Qs Ks As 2d 3d"
            ],
            "incorrect": [
                "Ac Ad As Qd Qc Ts 2h",
                "Ah Kh Qc Jh Th 3s 4s",
                "Ah Kh Qh Jh 9h 2c 3c",
                "2d 3d 4d 5d 6c Qh Qs",
                "2h 3h 4h 5h 7h 9s Ts",
                "2s 3s 4s 6s 7s Js Qs",
                "As Ks Qs Js 9s 2c 3c",
                "2c 4c 5c 6c 7c Th Jh",
                "Ac 2c 3c 4c 5s Qd Kd"
            ]
        },
        "Quads": {
            "correct": [
                "Ac Ad As Ah Qc 2s 3s",
                "Kc Kd Ks Kh 2c Ac Ah",
                "Qh Qd Qs Qc Js As 2h",
                "Jc Jd Js Jh 3h 2s 2d",
                "Th Td Ts Tc 8d Ah As",
                "9h 9d 9s 9c 7s 2h 2d",
                "8c 8d 8s 8h 6h Ac Ad",
                "7h 7d 7s 7c 5d 2s 2d",
                "6c 6d 6s 6h 4h Ah Ac",
                "8c 7d 7s 7h 7c 6s 6h",
                "5h 5d 5s 5c 3d 2h 2d"
            ],
            "incorrect": [
                "Ah Kh Qh Jh Th Ac Ad",
                "Ah Ad As Qd Qc Ts 2h",
                "Kc Kd Ks Qh Qc Ts 2h",
                "Qh Qd Qs Jd Js 7s 8s",
                "Jc Jd Th Ts Td 3h 4h",
                "9h 9d 8s 8c 8h 2s 2d",
                "6h 6d 5s 5h 5c 4h 4d",
                "5c 5d 4s 4h 4c 3h 3d",
                "4h 4d 3s 3h 3c 2h 2d"
            ]
        },
      "Flush": {
            "correct": [
                "Ah Kh 3h 5h 7h 9d Td",
                "2s Ks 8s 6s 4s Ac Ad",
                "3d 5d 9d Qd Kd 2s 3s",
                "4h 6h 8h Th Qh 2d 3d",
                "5c 7c 9c Jc Kc 2h 3h",
                "6s 8s Ts Js Qs 2c 3c",
                "7d 9d Jd Qd Ad 2h 3h",
                "8h Th Jh Kh Ah 2d 3d",
                "9c Jc Kc Ac 2c 2s 3s",
                "4s 6s 8s Ts Qs 2d 3d"
            ],
            "incorrect": [
                "9h 9s 6d 7h 8c 9c 5s",
                "Ah Kh Qh Jh Th 2s 3s",
                "2d Kd 8d 6s 4d Ac Ah",
                "3c 5d 9c Qc Kc 2s 3s",
                "5h 7s 9d Jd Kd 2h 3h",
                "6s 8c Tc Jc Qc 2s 3s",
                "7c 9s Js Qs As 2h 3h",
                "8h Td Jd Kd Ad 2s 3s",
                "9h Jh Kh Ad 2h 2c 3c",
                "Th Jh Qh Ks Ah 2d 3d",
                "Ts Js Qs Ks As 2d 3d"
            ]
        },
        "Straight": {
            "correct": [
                "Ah 2d 3c 4h 5s Ks Qs",
                "Kh Kd 2c 3d 4s 5s 6s",
                "2h 3d 4c 5h 6s As Qs",
                "3h 4d 5c 6h 7s 2s Ks",
                "4h 5d 6c 7h 8s 3s Qs",
                "5h 6d 7c 8h 9s 4s Ks",
                "6h 7d 8c 9h Ts 5s Qs",
                "7h 8d 9c Th Jh 6s Ks",
                "8h 9d Tc Jh Qh 7s Qs",
                "9h Td Jc Qh Kh 8s Ks",
                "Th Jd Qc Kh Ah 9s Qs",
                "4h 5d 6c 7h 9s 3s Qs",
                "4c 4h 6d 7h 8c 9c 5s",
            ],
            "incorrect": [
                "Ah 2d 3c 4h 6s Ks Qs",
                "2h 3d 4c 5h 7s Ks Qs",
                "3h 4h 5h 6h 8s 2h Ks",
                "5h 6d 3c 8h Ts 4s Ks",
                "6h 7d 8c 9h Js 2s Qs",
                "7h 8d 9c Th Qh 4s Ks",
                "8h 7d Tc Jh Kh 7s Qs",
                "9h 3d Jc Qh Ah 8s Ks",
            ]
        },
        "Full House": {
            "correct": [
                "Ah Ad Ac 2d 2s 3s 4s",
                "Kh Kd Kc 3d 3s As 2s",
                "Qh Qd Qc 4d 4s Ks 2s",
                "Jh Jd Jc 5d 5s Qs 2s",
                "Th Td Tc 6d 6s Js 2s",
                "9h 9d 9c 7d 7s Ts 2s",
                "7h 7d 7c 9d 9s 8s 2s",
                "6h 6d 6c Td Ts 7s 2s",
                "Jh Jd 5c 5d 5s Qs Js",
                "Kh Kd 3c 3d 3s Ks 2s",
                "Jh Jd 5c 5d 5s Qs Js",
                "Th Td 6c 6d 6s Js 2s",
                "5h 5d 5c Jd Js 6s 2s"
            ],
            "incorrect": [
                "Ah Ad 2c 2d 2s 2h 4s",
                "Qh Qd 4c 4d 3s Ks 2s",
                "7h 9d 7c 7d 7s Ts 2s",
                "8h 8d 7c 9d 9s 7s 2s",
                "7h 5d 7c Td Ts 6s 2s",
                "6h 6d 4c Jd Js 5s 2s",
                "5h 5d 2c Qd Qs 4s 2s"
            ]
        },
        "Trips": {
            "correct": [
                "Kh Kd Kc 3d 4s 5s 6s",
                "Qh Qd Qc 4d 5s 6s 7s",
                "Jh Jd Jc 5d 6s 7s 8s",
                "7h 7d 7c 9d Ts Js Qs",
                "6h 6d 6c Td Js Qs Ks",
                "5h 5d 5c Jd Qs Ks As"
            ],
            "incorrect": [
                "Ah Ad Ac 2d 3s 4s 5s",
                "Ah Ad 2c 2d 3s 4s 5s",
                "Kh Kd 3c 3d 4s 5s 6s",
                "Qh Qd 4c 4d 5s 6s 7s",
                "Th Td Tc 6d 7s 8s 9s",
                "Jh Jd 5c 5d 6s 7s 8s",
                "Th Td 6c 6d 7s 8s 9s",
                "9h 9d 9c 7d 8s 9s Ts",
                "9h 9d 7s 2s 8s 9s Ts",
                "8h 8d 8c 9d Ts Js Qs",
                "8h 8d 8c 8s 9s Ts Js",
                "7h 7d 4c Td Js Qs Ks",
                "6h 6d 6c Jd 6s Ks As",
                "5h 5d 5c Ad Ks As 2s"
            ]
        },
        "Two Pair": {
            "correct": [
                "Ah Ad 2c 2d 9s 4s 5s",
                "Kh Kd 3c 3d 4s 5s 6s",
                "Qh Qd 4c 4d 5s 6s 7s",
                "Jh Jd 5c 5d 6s 7s 8s",
                "Th Td 6c 6d 7s As 9s",
                "8h 8d Jc 9d Ts Js 2s",
                "7h 7d Kc Td Js Qs Ks",
                "6h 6d Jc Jd Qs Ks As",
            ],
            "incorrect": [
                "Ah Ad Ac 2d 3s 4s 5s",
                "Kh Kd Kc 3d 4s 5s 6s",
                "Qh Qd Qc 4d 5s 6s 7s",
                "Jh Jd Jc 5d 6s 7s 8s",
                "Th Td Tc 6d 7s 8s 9s",
                "9h 9d 9c 7d 8s 9s Ts",
                "9h 9d 7c 7d 8s 9s Ts",
                "8h 8d 8c 8d 9s Ts Js",
                "7h 7d 7c 9d Ts Js Qs",
                "6h 6d 6c Td Js Qs Ks",
                "5h 5d 5c Qd Ks As 2s",
                "5h 5d 5c Jd Js Ks Kc"
            ]
        },
        "Pair": {
            "correct": [
                "Qh Qd 2c 3d 4s 5s Ks",
                "Jh Jd 2c 3d 4s 5s 7s",
                "Th Td 2c 3d 4s Js 6s",
                "9h 9d 2c Ad 4s 5s 6s",
                "8h 8d 2c Td 4s 5s 6s",
                "7h 7d 2c 9d Ts 5s 6s",
                "6h Kd 2c Jd 4s 5s 6s"
            ],
            "incorrect": [
                "Ah Ad 2c 3d 4s 5s 6s",
                "Ah Ad Ac 2d 3s 4s 5s",
                "Kh Kd Kc 3d 4s 5s 6s",
                "Qh Qd Qc 4d 5s 6s 7s",
                "Jh Jd Jc 5d 6s 7s 8s",
                "Th Td Tc 6d 7s 8s 9s",
                "9h 9d 9c 7d 8s 9s Ts",
                "8h 8d 8c 8d 9s Ts Js",
                "7h 7d 7c 9d Ts Js Qs",
                "6h 6d 6c Td Js Qs Ks",
                "5h 5d 5c Jd Qs Ks As",
                "5h 5d 2c 3d 4s 5s 6s"
            ]
        },
    };
  }

  approximatelyEqual(val1, val2, epsilon = 0.1) { 
    return Math.abs(val1 - val2) < epsilon; 
  }

  printSpecificHand(hand){
    hand = this.bitval.convertHandArrayToBitmask(hand);
    console.log(this.bitval.formatBitmask(hand));
    let evaluation = this.bitval.lazyEvaluate(hand);
    console.log(evaluation.toString(2));
    console.log(this.bitval.FULL_HOUSE.toString(2));

    console.log("");
    console.log(this.bitval.ONE_PAIR.toString(2));
    console.log(this.bitval.TWO_PAIR.toString(2));
    console.log(this.bitval.THREE_OF_A_KIND.toString(2));
    console.log(this.bitval.STRAIGHT.toString(2));
    console.log(this.bitval.FLUSH.toString(2));
    console.log(this.bitval.FULL_HOUSE.toString(2));
    console.log(this.bitval.FOUR_OF_A_KIND.toString(2));
    console.log(this.bitval.STRAIGHT_FLUSH.toString(2));
  }

  testStrength(){

    let handStrengths = Object.keys(this.testHands);

    for (let handStrength of handStrengths){

        let handType = 0n;

        switch(handStrength){
          case "Straight Flush":
            handType = this.bitval.STRAIGHT;
            break;
          case "Flush":
            handType = this.bitval.FLUSH;
            break;
          case "Straight":
            handType = this.bitval.STRAIGHT;
            break;
          case "Quads":
            handType = this.bitval.FOUR_OF_A_KIND;
            break;
          case "Trips":
            handType = this.bitval.THREE_OF_A_KIND;
            break;
          case "Pair":
            handType = this.bitval.ONE_PAIR;
            break;
          case "Two Pair":
            handType = this.bitval.TWO_PAIR;
            break;
          case "Full House":
            handType = this.bitval.FULL_HOUSE;
            break;
        }

      for (let testCase of this.testHands[handStrength]["correct"]){

        let mask = this.bitval.convertHandArrayToBitmask(testCase.split(" "));
        let result = this.bitval.lazyEvaluate(mask);
        console.assert(
          result & handType, 
          testCase + " wrongly evaluated NOT as " + 
          handStrength, 
          "\n[H]",
          this.bitval.formatBitmask(mask),
          "\n[R]",
          this.bitval.formatBitmask(result));
      }

      for (let testCase of this.testHands[handStrength]["incorrect"]){

        let mask = this.bitval.convertHandArrayToBitmask(testCase.split(" "));
        let result = this.bitval.lazyEvaluate(mask);
        console.assert(
          (result & handType) === 0n, 
          testCase + " wrongly evaluated AS " + 
          handStrength, 
          "\n[H]",
          this.bitval.formatBitmask(mask),
          "\n[R]",
          this.bitval.formatBitmask(result));

      }
    }
  }

  testExactnessOfEquity(iterations = 100000){

    let testCases = [
      {"hero": "Ac Kd", "villain": "Qh Qs", "board": false, "win": 42.66, "lose": 57.0, "tie": 0.337},
      {"hero": "Jc Jd", "villain": "Qh Ts", "board": false, "win": 70.54, "lose": 29.15, "tie": 0.313},
      {"hero": "4c 4h", "villain": "9h 9s", "board": false, "win": 18.3, "lose": 81.0, "tie": 0.71},
      {"hero": "Kc Qd", "villain": "6h Qs", "board": false, "win": 73.39, "lose": 24.1, "tie": 2.54},
      {"hero": "4c 4h", "villain": "9h 9s", "board": "9d 3d Js Qd Qh", "win": 0, "lose": 100, "tie": 0},
      {"hero": "4c 4h", "villain": "9h 9s", "board": "6d 7h 8c 9c 5s", "win": 0, "lose": 0, "tie": 100},
      {"hero": "Kc Qd", "villain": "6h Qs", "board": "5s Jc Js Qh 7s", "win": 100, "lose": 0, "tie": 0},
      {"hero": "5s 6s", "villain": "7c 8h", "board": "9d Ts Jc", "win": 4.56, "lose": 92.01, "tie": 3.43},
      {"hero": "2h Kh", "villain": "4s Js", "board": "6c 7c 8h", "win": 62.8, "lose": 34.58, "tie": 2.67},
      {"hero": "Ad 3s", "villain": "Qc 5s", "board": "2h 3c 4d", "win": 62.52, "lose": 35.37, "tie": 2.112},
      {"hero": "2c Kd", "villain": "4h Jc", "board": "6s Jh 8c", "win": 11.82, "lose": 88.18, "tie": 0},
      {"hero": "Ah 4h", "villain": "Qd 6d", "board": "2c Qh 4s", "win": 24.75, "lose": 75.25, "tie": 0},
      {"hero": "3c Qc", "villain": "5h Th", "board": "7s 4d 9c", "win": 75.24, "lose": 24.76, "tie": 0},
      {"hero": "Kc 5c", "villain": "Jd 7d", "board": "9c Ah 2s", "win": 75.97, "lose": 23.12, "tie": 0.9},
      {"hero": "4d Jd", "villain": "6c 9c", "board": "8h 8s Ts", "win": 59.49, "lose": 35.96, "tie": 4.55},
      {"hero": "Qh 6h", "villain": "Th 8h", "board": "8c 2d 6s", "win": 20.24, "lose": 79.76, "tie": 0},
      {"hero": "5h Th", "villain": "7d 8d", "board": "9c As Js", "win": 60, "lose": 35.45, "tie": 4.55},
      {"hero": "Jc 7c", "villain": "9s 9h", "board": "7h Qc 5d", "win": 24.66, "lose": 75.34, "tie": 0},
    ];

    for (let testCase of testCases){
      //if (!testCase["board"] || testCase["board"].length < 10) continue;
      let numberOfIterations = testCase["board"].length > 10 ? 1 : iterations;

      let result = this.bitval.simulate(
        numberOfIterations, 
        5, 
        testCase["hero"] ? testCase["hero"].split(" ") : [],
        testCase["villain"] ? testCase["villain"].split(" ") : [],
        testCase["board"] ? testCase["board"].split(" ") : []
      );

      for (let key in result) { 
        result[key] = parseFloat((result[key] / numberOfIterations) * 100).toFixed(2); 
      }

      console.assert(
        this.approximatelyEqual(result["win"],testCase["win"],1) && 
        this.approximatelyEqual(result["lose"],testCase["lose"],1) && 
        this.approximatelyEqual(result["tie"],testCase["tie"],1),
        `
        ${testCase["hero"]} \t ${testCase["board"]} \t ${testCase["villain"]}
          Win: ${result["win"]} (${testCase["win"]}) \t\t 
          Tie: ${result["tie"]} (${testCase["tie"]}) \t\t 
          Lose: ${result["lose"]} (${testCase["lose"]})`);
    }
  }

  testExactnessOfHandFrequencies(){

    let testCases = [
      {
        "hero": "Ac Kd",    "villain": "Qh Qs", "board": "", 
        "High Card": 19,    "Pair": 45.54,      "Two Pair": 23.56, 
        "Trips": 4.68,      "Straight": 2.34,   "Flush": 2.27, 
        "Full House": 2.45, "Quads": 0.15,      "Straight Flush": 0.01
      },
      {
        "hero": "Jc Jd",    "villain": "Qh Ts", "board": "", 
        "High Card": 0,     "Pair": 35.14,      "Two Pair": 39.13, 
        "Trips": 12.25,     "Straight": 1.53,   "Flush": 2.25, 
        "Full House": 8.75, "Quads": 0.9,       "Straight Flush": 0.02
      },
      {
        "hero": "4c 4h",    "villain": "9h 9s", "board": "", 
        "High Card": 0,     "Pair": 34.44,      "Two Pair": 39.48, 
        "Trips": 12.06,     "Straight": 2.23,   "Flush": 1.91, 
        "Full House": 8.93, "Quads": 0.93,      "Straight Flush": 0.02
      },
      {
        "hero": "Kc Qd",    "villain": "6h 5s", "board": "", 
        "High Card": 18.1,  "Pair": 44.11,      "Two Pair": 22.94, 
        "Trips": 4.56,      "Straight": 5.5,    "Flush": 2.24, 
        "Full House": 2.38, "Quads": 0.13,      "Straight Flush": 0.02
      }
    ];

    for (let testCase of testCases){
      let result = this.bitval.simulate(
        1000000, 
        5, 
        testCase["hero"].split(" "), 
        testCase["villain"].split(" "), 
        testCase["board"].split(" "));
      
      for (let handType in testCase) {
        if (handType === "hero" || handType === "villain" || handType === "board") continue;
        
        console.assert(
          this.approximatelyEqual(result[handType], testCase[handType],0.25), 
          `${handType}: ${result[handType]} (${testCase[handType]}) ${testCase["hero"]}`
        );
      }
    }
  }

  testCompareHands(){
    let testCases = [
      {"hero": ["Jc","7c"], "villain": ["9s","9h"], "board": ["Qc","Jh","9c","7h","5d"]},
      {"hero": ["Jd","4d"], "villain": ["9c","6c"], "board": ["Ts","Td","8s","8h","7s"]},
      {"hero": ["9c","6c"], "villain": ["Jd","4d"], "board": ["Ts","8s","8h","7h","7c"]},
    ];


    for (let testCase of testCases){
      let hero = this.bitval.getBitMasked([...testCase["hero"],...testCase["board"]])
      let villain = this.bitval.getBitMasked([...testCase["villain"],...testCase["board"]])

      let heroResult = this.bitval.evaluate(hero);
      let villainResult = this.bitval.compare(villain, heroResult);

      console.assert(heroResult > villainResult,
      `${testCase["hero"]}:\t${result[handType]} (${testCase[handType]}) ${testCase["hero"]}`
      );
    }

  }

  testSimulationSpeed(iterations = 500000, timeLimit = 1000){
      let startTime = performance.now();
      this.bitval.simulate(iterations);
      let endTime = performance.now();

      let timeTaken = endTime - startTime;

      console.assert(
        timeTaken < timeLimit, 
        iterations + " iterations took more than " + 
        timeLimit + " miliseconds. Time taken: " + 
        timeTaken + "ms");
  }


  testMethods(iterations, timeGoal) {

    let methods = {
      "_bitFlush": this.bitval._bitFlush.bind(this.bitval),
      "_bitFlush2": this.bitval._bitFlush2.bind(this.bitval),
      "_bitQuads": this.bitval._bitQuads.bind(this.bitval),
      "_bitPairs": this.bitval._bitPairs.bind(this.bitval),
      "_bitStraightFlush": this.bitval._bitStraightFlush.bind(this.bitval),
      "_bitTrips": this.bitval._bitTrips.bind(this.bitval),
      "_bitTrips2": this.bitval._bitTrips2.bind(this.bitval),
      "_bitStraight": this.bitval._bitStraight.bind(this.bitval),
      "normalize": this.bitval.normalize.bind(this.bitval),
      "stripBits": this.bitval.stripBits.bind(this.bitval),
      "getBitMasked": this.bitval.getBitMasked.bind(this.bitval),
      "countBits": this.bitval.countBits.bind(this.bitval),
      "deal": this.bitval.countBits.bind(this.bitval),
    };

    for (let methodName in methods) {

      let hand = this.bitval.getBitMasked("Ac Qh 2c 3s 4h 6d 9s".split(" "));
      if(methodName === "getBitMasked") hand = "Ac Qh 2c 3s 4h 6d 9s".split(" ");
      if(methodName === "getRandomHand") hand = [];

      let method = methods[methodName];
      let startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        method(hand);
      }

      let executionTime = Date.now() - startTime;

      if (executionTime > timeGoal) {
        console.assert(false, 
          `${methodName} missed the time goal. 
          Execution Time: ${executionTime}ms, 
          Time Goal: ${timeGoal}ms`);
      }
    }
  }

  testDifferentHandsCompared(){
    for (let handType1 of this.handStrengthsInOrder){

      for (let handType2 of this.handStrengthsInOrder){
        if (handType1 == handType2) continue;

        for (let hand1 of this.testHands[handType1]["correct"]){

          let hand1_mask = this.bitval.getBitMasked(hand1.split(" "));
          let hand1_eval = this.bitval.evaluate(hand1_mask);

          for (let hand2 of this.testHands[handType2]["correct"]){
            if (hand1 == hand2) continue;
            if (handType1 != "Full House" && handType2 != "Full House") continue;

            let hand2_mask = this.bitval.getBitMasked(hand2.split(" "));
            let hand2_eval = this.bitval.evaluate(hand2_mask);

            if (this.handStrengthsInOrder.indexOf(handType1) > this.handStrengthsInOrder.indexOf(handType2)){
              console.assert(
                hand1_eval > hand2_eval, 
                `${hand1} (${handType1}) was ranked lower than ${hand2} (${handType2})
  ${this.bitval.formatBitmask(hand1_eval)}
  ${this.bitval.formatBitmask(hand2_eval)}
              `);
              continue;
            }
            console.assert(
              hand1_eval < hand2_eval, 
              `${hand1} (${handType1}) was ranked higher than ${hand2} (${handType2})
  ${this.bitval.formatBitmask(hand1_eval)}
  ${this.bitval.formatBitmask(hand2_eval)}

            `);
          }
        }
      }
    }
  }
}

if (typeof require !== 'undefined') {
  let tester = new BitvalTest();
  //tester.testStrength();
  tester.printSpecificHand(["Ac", "Ad", "3c", "4h", "2s", "6s", "7d"]);
}

