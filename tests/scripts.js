// ESTE ARCHIVO SIRVE COMO SCRATCH PARA ALGUNAS FUNCIONES
var fs = require("fs");
const MPL = require('../js/MPL.js');

var jsonString =`{
  "states": [
    {
      "id": 0,
      "assignment": {
        "p": true,
        "q": true
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
          "target": 2
        }
      ]
    },
    {
      "id": 2,
      "assignment": {
        "p": false,
        "q": true
      },
      "successors": [
      ]
    }
  ],
  "agents": ["a", "b"]
}`

const model = new MPL.Model
model.fromJSON(jsonString)
console.log(model.getModelString())
console.log("---")
console.log(model.getGroupSuccessorOf(0,['a','b']))
