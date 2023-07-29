class PrtBitvalTest{

  constructor(){
    this.bitval = new PrtBitVal();

    this.handStrengthsInOrder = ["High Card", "Pair", "Two Pair", "Trips", "Straight", "Flush", "Full House", "Quads", "Straight Flush"];
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
                "8h 8d 8c 8d 9s Ts Js",
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
        "High Card": {
          "correct": [
              "Kh 2c 4d 6s 8h Ts 3s",
              "Qh 3d 5c 7s 9h Js 2s",
              "Jh 4d 6c 8s Th Qs 3s",
              "Th 5d 7c 9s Jh Ks 2s",
              "9h 2d 4c 6s 8h Ts 3d",
              "8h 3d 5c 7s 9h Js 2c",
              "7h 2d 4c 6s 8h Ts 3h",
              "6h 5d 3c 7s 9h Js 2d",
              "4h 3d 5c 7s 9h Js 2h",
              "2h 5d 3c 7s 9h Js 6h",
              "Ah 2c 4d 6s 8h Ts 7h",
              "Kh 3d 5c 7s 9h Js 8h",
          ],
          "incorrect": [
                "Ah Ad 2c 3d 4s 5s 6s",
                "Ah Ad Ac 2d 3s 4s 5s",
                "Jh Jd 5c 5d 6s 7s 8s",
                "Th Td 6c 6d 7s 8s 9s",
                "6h 6d 6c Td Js Qs Ks",
                "4h 5d 6c 7h 8s 3s Qs",
                "5h 6d 7c 8h 9s 4s Ks",
                "Jh Jd Jc 5d 6s 7s 8s",
                "Jc Jd Js Jh 3h 2s 2d",
                "Th Td Ts Tc 8d Ah As",
                "9h 9d 9s 9c 7s 2h 2d",
                "7h 7d 7c 9d Ts Js Qs",
                "7h 7d 7c 9d 9s 8s 2s",
                "6h 6d 6c Td Ts 7s 2s",
                "2s 3s 4s 5s 6s 7c 8c",
                "3d 4d 5d 6d 7d Ks Kc",
             ]
        }
    };
  }

  testNew(){
    let caseQuads = this.bitval.getBitMasked("Ac Ad Ah As Kc Jd 4h".split(" "))[1];
    let evalQuads = this.bitval._bitQuads(caseQuads);
    console.log("Quads",this.bitval.printBitmask(evalQuads,4));
    console.assert(evalQuads != 0n);

    let casePairs = this.bitval.getBitMasked("Ac Ad Qh 2s Kc Jd 4h".split(" "))[1];
    let evalPairs = this.bitval._bitPairs(casePairs);
    console.log("Pairs",this.bitval.printBitmask(evalPairs,4));
    console.assert(evalPairs != 0n);

    let caseTrips = this.bitval.getBitMasked("Ac Ad Ah 2s Kc Jd 4h".split(" "))[1];
    let evalTrips = this.bitval._bitTrips(caseTrips);
    console.log("Trips",this.bitval.printBitmask(evalTrips,4));
    console.assert(evalTrips != 0n);

    let caseStraightFlush = this.bitval.getBitMasked("Ac Kc Qc Jc Tc 3d 4h".split(" "))[1];
    let evalStraightFlush = this.bitval._bitStraightFlush(caseStraightFlush);
    console.log("StrFl",this.bitval.printBitmask(evalStraightFlush,4));
    console.assert(evalStraightFlush != 0n);

    let caseStraight = this.bitval.getBitMasked("Ac Kh Qd Jc Ts 3d 4h".split(" "))[1];
    let evalStraight = this.bitval._bitStraight(caseStraight);
    console.log("Strgt",this.bitval.printBitmask(evalStraight,4));
    console.assert(evalStraight != 0n);
  }

  approximatelyEqual(val1, val2, epsilon = 0.1) { return Math.abs(val1 - val2) < epsilon; }

  testDifferentAssignment(){
    for(let handType in this.testHands){
      for (let hand of this.testHands[handType]["correct"]){
        let bitmask = this.bitval.getBitMasked(hand.split(" "));
        let evaled = this.bitval.evaluate(bitmask[0], bitmask[1]);
        console.assert(evaled[1] == handType, evaled[1] + " vs " + handType + " : : " + hand);
      }
    }
  }

  testExactnessOfEquity(iterations = 100000){

    let testCases = [
      {"hero": "Ac Kd", "villain": "Qh Qs", "board": "", "win": 42.66, "lose": 57.0, "tie": 0.337},
      {"hero": "Jc Jd", "villain": "Qh Ts", "board": "", "win": 70.54, "lose": 29.15, "tie": 0.313},
      {"hero": "4c 4h", "villain": "9h 9s", "board": "", "win": 18.3, "lose": 81.0, "tie": 0.71},
      {"hero": "Kc Qd", "villain": "6h Qs", "board": "", "win": 73.39, "lose": 24.1, "tie": 2.54},
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
      {"hero": "Jc 7c", "villain": "9s 9h", "board": "7h Qc 5d", "win": 24.66, "lose": 75.34, "tie": 0},/*
      {"hero": "6c 9c", "villain": "8h 7h", "board": "Ts 5c 5d", "win": , "lose": , "tie": },
      {"hero": "Ts 8s", "villain": "8c Tc", "board": "6h Jd 4s", "win": , "lose": , "tie": },
      {"hero": "7h Th", "villain": "9d Qd", "board": "Jc Kh Ks", "win": , "lose": , "tie": },
      {"hero": "9d 7d", "villain": "Jh 5h", "board": "Kh Ah 2s", "win": , "lose": , "tie": },
      {"hero": "8s Js", "villain": "6d Kd", "board": "4c 8h 2d", "win": , "lose": , "tie": },
      {"hero": "Td Kd", "villain": "Qs Qs", "board": "Ac 9c Jh", "win": , "lose": , "tie": },
      {"hero": "Ac 6d", "villain": "Qh 8s", "board": "2d 4s 4h 5c", "win": , "lose": , "tie": },
      {"hero": "5s 3s", "villain": "7c 5h", "board": "8d 5s Jc Qs", "win": , "lose": , "tie": },
      {"hero": "2h 3h", "villain": "4s Js", "board": "6c 2c Th 6s Ts", "win": , "lose": , "tie": },
      {"hero": "Ad Ks", "villain": "Qc Js", "board": "2h 3s 4d 5c 6h", "win": , "lose": , "tie": },
      {"hero": "2c 3d", "villain": "4h 5c", "board": "6s 7h 8c 9d Ts", "win": , "lose": , "tie": },
      {"hero": "Ah Kh", "villain": "Qd Jd", "board": "2c 3h 4s 5d 6c", "win": , "lose": , "tie": },
      {"hero": "3c 4c", "villain": "5h 6h", "board": "7s 8d 9c Ts Jh", "win": , "lose": , "tie": },
      {"hero": "Kc Qc", "villain": "Jd Td", "board": "9c 8h 7s 6d 5c", "win": , "lose": , "tie": },
      {"hero": "4d 5d", "villain": "6c 7c", "board": "8h 9s Ts Jc Qd", "win": , "lose": , "tie": },
      {"hero": "Qh Jh", "villain": "Th 9h", "board": "8c 7d 6s 5h 4c", "win": , "lose": , "tie": },
      {"hero": "5h 6h", "villain": "7d 8d", "board": "9c Ts Js Qs Kd", "win": , "lose": , "tie": },
      {"hero": "Jc Tc", "villain": "9s 8s", "board": "7h 6c 5d 4h 3s", "win": , "lose": , "tie": },
      {"hero": "6c 7c", "villain": "8h 9h", "board": "Ts Jc Qd Ks As", "win": , "lose": , "tie": },
      {"hero": "Ts 9s", "villain": "8c 7c", "board": "6h 5d 4s 3c 2h", "win": , "lose": , "tie": },
      {"hero": "7h 8h", "villain": "9d Td", "board": "Jc Qs Ks As 2d", "win": , "lose": , "tie": },
      {"hero": "9d Td", "villain": "Jh Qh", "board": "Kh Ah 2s 3c 4h", "win": , "lose": , "tie": },
      {"hero": "8s 7s", "villain": "6d 5d", "board": "4c 3h 2d As Ks", "win": , "lose": , "tie": },
      {"hero": "Td Jd", "villain": "Qs Ks", "board": "Ac 2c 3h 4d 5s", "win": , "lose": , "tie": },
      {"hero": "9h Th", "villain": "Jc Qc", "board": "Kd Ad 2s 3h 4c", "win": , "lose": , "tie": },*/
      //KcQd 5s Jc Js Qh 7s 6hQs
      //AcKd Jh As 5h Js 6s QhQs
    ];
    for (let testCase of testCases){
      let numberOfIterations = iterations;
      if (testCase["board"].split(" ").length == 5) numberOfIterations = Math.min(1, iterations);
      let result = this.bitval.simulate(numberOfIterations, 5, testCase["hero"].split(" "), testCase["villain"].split(" "), testCase["board"].split(" "));
      console.assert(this.approximatelyEqual(result["win"],testCase["win"],1) && this.approximatelyEqual(result["lose"],testCase["lose"],1) && this.approximatelyEqual(result["tie"],testCase["tie"],1),
       `Win: ${result["win"]} (${testCase["win"]}) \t\t Tie: ${result["tie"]} (${testCase["tie"]}) \t\t Lose: ${result["lose"]} (${testCase["lose"]}) \t\t`);
    }
  }

  testExactnessOfHandFrequencies(){

    let testCases = [
      {"hero": "Ac Kd", "villain": "Qh Qs", "board": "", "High Card": 19, "Pair": 45.54, "Two Pair": 23.56, "Trips": 4.68, "Straight": 2.34, "Flush": 2.27, "Full House": 2.45, "Quads": 0.15, "Straight Flush": 0.01},
      {"hero": "Jc Jd", "villain": "Qh Ts", "board": "", "High Card": 0, "Pair": 35.14, "Two Pair": 39.13, "Trips": 12.25, "Straight": 1.53, "Flush": 2.25, "Full House": 8.75, "Quads": 0.9, "Straight Flush": 0.02},
      {"hero": "4c 4h", "villain": "9h 9s", "board": "", "High Card": 0, "Pair": 34.44, "Two Pair": 39.48, "Trips": 12.06, "Straight": 2.23, "Flush": 1.91, "Full House": 8.93, "Quads": 0.93, "Straight Flush": 0.02},
      {"hero": "Kc Qd", "villain": "6h 5s", "board": "", "High Card": 18.1, "Pair": 44.11, "Two Pair": 22.94, "Trips": 4.56, "Straight": 5.5, "Flush": 2.24, "Full House": 2.38, "Quads": 0.13, "Straight Flush": 0.02}
    ];

    for (let testCase of testCases){
      let result = this.bitval.simulate(1000000, 5, testCase["hero"].split(" "), testCase["villain"].split(" "), testCase["board"].split(" "));
      
      for (let handType in testCase) {
        if (handType === "hero" || handType === "villain" || handType === "board") continue;
        
        console.assert(this.approximatelyEqual(result[handType], testCase[handType],0.25), 
          `${handType}: ${result[handType]} (${testCase[handType]}) ${testCase["hero"]}`
        );
      }
    }
  }

  testSimulationSpeed(iterations = 500000, timeLimit = 1000){
      let startTime = performance.now();
      this.bitval.simulate(iterations);
      let endTime = performance.now();

      let timeTaken = endTime - startTime;

      console.assert(timeTaken < timeLimit, iterations + " iterations took more than " + timeLimit + " miliseconds. Time taken: " + timeTaken + "ms");
  }

  testDifferentHandsCompared(){
    for (let handType1 of this.handStrengthsInOrder){
      
      for (let handType2 of this.handStrengthsInOrder){
        if (handType1 == handType2) continue;

        for (let hand1 of this.testHands[handType1]["correct"]){

          let hand1_mask = this.bitval.getBitMasked(hand1.split(" "));
          let hand1_eval = this.bitval.evaluate(hand1_mask[0], hand1_mask[1]);

          for (let hand2 of this.testHands[handType2]["correct"]){
            if (hand1 == hand2) continue;
            
            let hand2_mask = this.bitval.getBitMasked(hand2.split(" "));
            let hand2_eval = this.bitval.evaluate(hand2_mask[0], hand2_mask[1]);

            if (this.handStrengthsInOrder.indexOf(handType1) > this.handStrengthsInOrder.indexOf(handType2)){
              console.assert(hand1_eval[0] > hand2_eval[0], hand1 + " (" + hand1_eval[1] + ", " + handType1 + ") was ranked lower than " + hand2 + " (" + hand2_eval[1] + ", " + handType2 + ")")
            } else {
              console.assert(hand1_eval[0] < hand2_eval[0], hand1 + " (" + hand1_eval[1] + ", " + handType1 + ") was ranked higher than " + hand2 + " (" + hand2_eval[1] + ", " + handType2 + ")")
            }
          }
        }
      }
    }
  }

  testHasFlush(){
    let testHands = [
      "Ac 4c Qc 2d 3c Kh 7c",
      "Ac 4c Qc 2c 3c Kc 7c",
      "Ac 4c Qc 2d 3c Kc 7c",
    ];

    for (let testHand of testHands){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      console.assert(this.bitval.hasFlush(mask[0]), "No flush present.\t" + testHand + "\t\t" + this.bitval.printBitmask(mask[0]));
    }


    testHands = [
      "Ac 4c Qh 2d 3c Kh 7c",
      "Ac 4d Qh 2d 3c Kh 7c",
      "Ah 2d 3c 4h 5s Ks Qs",
      "Ah 2d 3c 4h 5s Ks Qs"
    ];

    for (let testHand of testHands){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      console.assert(!this.bitval.hasFlush(mask[0]), "Flush present.\t" + testHand + "\t\t" + this.bitval.printBitmask(mask[0]));
    }
  }

  testHasStraight(){
    let testHands = [
      "Ah 2d 3c 4h 5s Ks Qs",
      "2h 3d 4c 5h 6s As Qs",
      "3h 4d 5c 6h 7s 2s Ks",
    ];

    for (let testHand of testHands){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      console.assert(this.bitval.hasStraight(mask[0]), "No straight present.\t" + testHand + "\t\t" + this.bitval.printBitmask(mask[0]));
    }


    testHands = [
      "Ac 4c Qh 2d 3c Kh 7c",
      "Ac 4d Qh 2d 3c Kh 7c",
      "Ah 2d 3c 4h 6s Ks Qs",
    ];

    for (let testHand of testHands){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      console.assert(!this.bitval.hasStraight(mask[0]), "Straight present.\t" + testHand + "\t\t" + this.bitval.printBitmask(mask[0]));
    }
  }

  testEvaluateStraightFlush(){
    for (let testHand of this.testHands["Straight Flush"]["correct"]){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      let evaluation = this.bitval.STRAIGHT_FLUSH(mask[1]);
      console.assert(evaluation > 0, "Not evaluated as Straight Flush\t" + testHand + "\t\t" + evaluation);
    }


    for (let testHand of this.testHands["Straight Flush"]["incorrect"]){
      let mask = this.bitval.getBitMasked(testHand.split(" "));
      let evaluation = this.bitval.STRAIGHT_FLUSH(mask[1]);
      console.assert(evaluation === BigInt(0), "Evaluated as Straight Flush\t\t\t\t" + testHand + "\t\t" + evaluation);
    }
  }

  testEvaluateQuads() {
      for (let testHand of this.testHands["Quads"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.QUADS(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Quads\t\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Quads"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.QUADS(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Quads\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluateFlush() {
      for (let testHand of this.testHands["Flush"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.FLUSH(mask[0], mask[1]);
          console.assert(evaluation > 0, "Not evaluated as Flush\t\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Flush"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.FLUSH(mask[0], mask[1]);
          console.assert(evaluation === BigInt(0), "Evaluated as Flush\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluateStraight() {
      for (let testHand of this.testHands["Straight"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.STRAIGHT(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Straight\t\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Straight"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.STRAIGHT(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Straight\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluateFullHouse() {
      for (let testHand of this.testHands["Full House"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.FULL_HOUSE(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Full House\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Full House"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.FULL_HOUSE(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Full House\t\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluateTrips() {
      for (let testHand of this.testHands["Trips"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.TRIPS(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Trips\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Trips"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.TRIPS(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Trips\t\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluateTwoPair() {
      for (let testHand of this.testHands["Two Pair"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.TWO_PAIR(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Two Pair\t\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Two Pair"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.TWO_PAIR(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Two Pair\t\t" + testHand + "\t\t" + evaluation);
      }
  }

  testEvaluatePair() {
      for (let testHand of this.testHands["Pair"]["correct"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.PAIR(mask[0]);
          console.assert(evaluation > 0, "Not evaluated as Pair\t\t\t" + testHand + "\t\t" + evaluation);
      }

      for (let testHand of this.testHands["Pair"]["incorrect"]) {
          let mask = this.bitval.getBitMasked(testHand.split(" "));
          let evaluation = this.bitval.PAIR(mask[0]);
          console.assert(evaluation === BigInt(0), "Evaluated as Pair\t\t" + testHand + "\t\t" + evaluation);
      }
  }
}
