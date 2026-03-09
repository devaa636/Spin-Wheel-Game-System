const mysql = require("mysql2")

const db = mysql.createConnection({
 host: "localhost",
 user: "root",
 password: "password",
 database: "spinwheel"
})

db.connect(err=>{
 if(err){
  console.log("DB connection error")
 } else{
  console.log("Database connected")
 }
})

module.exports = db