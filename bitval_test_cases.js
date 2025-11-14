// Test case library for BitVal Debugger
// Each test case contains hero, villain, board, and reference equity data

module.exports = [
  {
    description: "Th 7c vs Qs Qh on As Ts Jc",
    hero: ['Th', '7c'],
    villain: ['Qs', 'Qh'],
    board: ['As', 'Ts', 'Jc'],
    deadCards: [],
    expectedOverallEquity: 16.06,
    referenceData: {
      turn: {
        'As': null,   // Dead card
        'Ah': 4.545,
        'Ac': 4.545,
        'Ad': 4.545,
        'Ks': 2.273,
        'Kh': 2.273,
        'Kc': 2.273,
        'Kd': 2.273,
        'Qs': null,   // Dead card
        'Qh': null,   // Dead card
        'Qc': 4.545,
        'Qd': 4.545,
        'Js': 4.545,
        'Jh': 4.545,
        'Jc': null,   // Dead card
        'Jd': 4.545,
        'Ts': null,   // Dead card
        'Th': null,   // Dead card
        'Tc': 86.36,
        'Td': 86.36,
        '9s': 9.091,
        '9h': 11.36,
        '9c': 11.36,
        '9d': 11.36,
        '8s': 9.091,
        '8h': 11.36,
        '8c': 11.36,
        '8d': 11.36,
        '7s': 56.82,
        '7h': 72.73,
        '7c': null,   // Dead card
        '7d': 72.73,
        '6s': 9.091,
        '6h': 11.36,
        '6c': 11.36,
        '6d': 11.36,
        '5s': 9.091,
        '5h': 11.36,
        '5c': 11.36,
        '5d': 11.36,
        '4s': 9.091,
        '4h': 11.36,
        '4c': 11.36,
        '4d': 11.36,
        '3s': 9.091,
        '3h': 11.36,
        '3c': 11.36,
        '3d': 11.36,
        '2s': 9.091,
        '2h': 11.36,
        '2c': 11.36,
        '2d': 11.36
      },
      river: {
        // Example river combinations when 7d is on turn
        // Format: 'turnCard riverCard': equity
        '7d 2c': 100.0,
        '7d 2d': 100.0,
        '7d 2h': 100.0,
        '7d 2s': 100.0,
        '7d 3c': 100.0,
        '7d 3d': 100.0,
        '7d 3h': 100.0,
        '7d 3s': 100.0,
        '7d 4c': 100.0,
        '7d 4d': 100.0,
        '7d 4h': 100.0,
        '7d 4s': 100.0,
        '7d 5c': 100.0,
        '7d 5d': 100.0,
        '7d 5h': 100.0,
        '7d 5s': 100.0,
        '7d 6c': 100.0,
        '7d 6d': 100.0,
        '7d 6h': 100.0,
        '7d 6s': 100.0,
        '7d 7h': 100.0,
        '7d 7s': 100.0,
        '7d 8c': 100.0,
        '7d 8d': 100.0,
        '7d 8h': 100.0,
        '7d 8s': 100.0,
        '7d 9c': 100.0,
        '7d 9d': 100.0,
        '7d 9h': 100.0,
        '7d 9s': 100.0,
        '7d Tc': 100.0,
        '7d Td': 100.0,
        '7d Ac': 0.0,
        '7d Ad': 0.0,
        '7d Ah': 0.0,
        '7d Jc': 0.0,
        '7d Jd': 0.0,
        '7d Jh': 0.0,
        '7d Js': 0.0,
        '7d Kc': 0.0,
        '7d Kd': 0.0,
        '7d Kh': 0.0,
        '7d Ks': 0.0,
        '7d Qc': 0.0,
        '7d Qd': 0.0
        // Add more combinations as needed
      }
    }
  }
  // Add more test cases here as needed
];

