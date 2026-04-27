// TEST FILE
const MPL = require('../js/MPL.js');
console.log("EMPEZANDO TESTS")
let json = `{
  "states": [
    {
      "id": 0,
      "assignment": {
        "p": true,
        "q": false
      },
      "successors": [
        {
          "agent": "a",
          "target": 1
        },
        {
          "agent": "b",
          "target": 0
        }
      ]
    },
    {
      "id": 1,
      "assignment": {
        "p": false,
        "q": true
      },
      "successors": [
        {
          "agent": "a",
          "target": 0
        },
        {
          "agent": "b",
          "target": 1
        }
      ]
    }
  ]
}
`
const model = new MPL.Model();
model.fromJSON(json);
console.log(model.getSuccessorsOf(0))
let modelprima = model.groupClosure(['a','b','c'])
console.log(modelprima.getSuccessorsOf(0))

