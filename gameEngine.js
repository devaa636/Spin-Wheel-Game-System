const db = require("./db")
const {broadcast} = require("./websocket")

let players = []
let eliminationInterval = null

function startGame(){
 console.log("Game starting...")
}

module.exports = {
 startGame
}