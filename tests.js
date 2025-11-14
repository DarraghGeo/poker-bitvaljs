if (typeof require !== 'undefined') {
  const Bitval128 = require("./bitval_128.js");
  global.Bitval128 = Bitval128;
}

class BitvalTest{

  constructor(whitelist=[]){
    this.bitval = new Bitval128();
    this.HANDS = {
      "As Ks Qs Js Ts 5s 6h": ["0x200000000f8449248009001206",  "0x80249200000000000000000"],
      "Qh Qd Qc Qs 4s 5h Td": ["0x81028008002020080800120048a", "0x40008000000000008000000"],
      "Ac Ks Qd Jc Ts 5s 6h": ["0x20200240048409248009001253",  "0x8249200000000000000000"]
    }

    if (whitelist.length === 0 || whitelist.includes("masking")) this.testMasking();
  }

  testMasking(){
    let hands = Object.keys(this.HANDS);

    for (let hand of hands){
      let convertedBitmask = this.bitval.convertHandArrayToBitmask(hand.split(" "));
      let givenBitmask = BigInt(this.HANDS[hand][0])

      console.assert(convertedBitmask == givenBitmask,
        `BAD MASKING: ${hand}
        ${this.bitval.formatBitmask(convertedBitmask)} << Wrong
        ${this.bitval.formatBitmask(givenBitmask, false)} << Right
      `);
    }
  }
}

if (typeof require !== 'undefined') {
  let tester = new BitvalTest();
}
