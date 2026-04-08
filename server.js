const http = require("http")
const url = require("url")
const db = require("./db")
const {broadcast} = require("./websocket")

const { startGame } = require("./gameEngine")

const server = http.createServer((req,res)=>{

 const parsedUrl = url.parse(req.url,true)

 if(parsedUrl.pathname === "/createWheel"){
  createWheel(res)
 }

 else if(parsedUrl.pathname === "/join"){

 const userId = parsedUrl.query.userId

 joinWheel(req,res,userId)

 }

 else if(parsedUrl.pathname === "/status"){

  db.query(
  "SELECT * FROM spin_wheels ORDER BY id DESC LIMIT 1",
  (err,result)=>{
   res.end(JSON.stringify(result))
  })

 }

})

server.listen(3000,()=>{
 console.log("Server running on port 3000")
})


function createWheel(res){

 db.query(
 "SELECT * FROM spin_wheels WHERE status='waiting'",
 (err,result)=>{

 if(result.length>0){
   res.end("Wheel already active")
   return
 }

 db.query(
  "INSERT INTO spin_wheels(entry_fee,status) VALUES (100,'WAITING')",
  (err,result)=>{

   console.log("Wheel created")

   // START 3 MINUTE TIMER HERE
   setTimeout(()=>{
     startGame()
   },180000)

   res.end("Wheel created")

  })

 })

}

function joinWheel(req,res,userId){

 db.query(
 "SELECT * FROM spin_wheels WHERE status='WAITING'",
 (err,wheels)=>{

  if(wheels.length === 0){
   res.end("Game already started or no active wheel")
   return
  }

  const wheelId = wheels[0].id
  const entryFee = wheels[0].entry_fee

  // check duplicate join
  db.query(
  "SELECT * FROM participants WHERE user_id=? AND wheel_id=?",
  [userId,wheelId],
  (err,participants)=>{

   if(participants.length > 0){
    res.end("User already joined")
    return
   }

   // get user
   db.query(
   "SELECT * FROM users WHERE id=?",
   [userId],
   (err,users)=>{

    const user = users[0]

    if(!user){
     res.end("User not found")
     return
    }

    // Admin cannot play the game
    if(userId == 1){
     res.end("Admin cannot join the game")
     return
    }

    if(user.coins < entryFee){
     res.end("Not enough coins")
     return
    }

    // deduct coins and log transaction
    db.query(
    "UPDATE users SET coins = coins - ? WHERE id=?",
    [entryFee,userId],
    (err,result)=>{

     if(err){
      res.end("Failed to deduct coins")
      return
     }

     // Record transaction for joining fee
     db.query(
     "INSERT INTO transactions(user_id,amount,type,wheel_id) VALUES (?,?,?,?)",
     [userId,entryFee,"ENTRY",wheelId],
     (err)=>{

      if(err){
       res.end("Failed to record transaction")
       return
      }

      // insert participant
      db.query(
      "INSERT INTO participants(user_id,wheel_id,eliminated) VALUES(?,?,false)",
      [userId,wheelId],
      (err)=>{
       if(err){
        res.end("Failed to add participant")
        return
       }
       res.end("Joined successfully")
      })

     })
    })

   })

  })

 })
}
