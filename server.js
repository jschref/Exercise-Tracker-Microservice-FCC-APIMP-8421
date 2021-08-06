const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser');
const mongoose = require("mongoose");
const mySecret = process.env['MONGO_URI'];
require('dotenv').config()

mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true });

app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});


const { Schema } = mongoose;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  count: {
    type: Number,
    default: 0,
  },
  exercises: [{
    description: String,
    duration: Number,
    date: String
  }]
})

const User = mongoose.model('user', userSchema);

app.route("/api/users")
  .get(function (req, res) {
    //GET requests to /api/users returns an array of all users.
    //this seems like a questionable idea, but is necessary to pass the test. 
    //If you do this to the FCC demo, you get almost 20,000 entries, it takes a long time to load, and a surprising number of them contain what looks like personal information
    User.find(req.params, function (err, data) {
      if (err) {
        console.error(err, "mistakes were made");
      } else {
        res.json(data)
      }
    })
  })
  .post(function (req, res) {
    //POST to /api/users with form data username to creates a new user and returns a formatted response object. 
    let newUser = new User({
      username: req.body.username,
    });

    newUser.save(function (error, data) {
      if (error) {
        return console.error(error, "Error. User was not saved");
      } else {
        res.json({ username: data.username, _id: data.id });
      }
    });
  });


//handles date verification/creation
function dateChecker(intakeDate) {
  if (/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(intakeDate)) {
    return intakeDate;
  } else {
    return new Date().toISOString().substring(0, 10);
  }
}


app.post("/api/users/:_id/exercises", function (req, res) {
  //You can POST to /api/users/:_id/exercises with form data description, duration, and optionally date. 
  //If no date is supplied, the current date will be used. The response returned will be the user object with the exercise fields added.

  let newExercises = { //create a new exercise object
    description: req.body.description,
    duration: req.body.duration,
    date: dateChecker(req.body.date)
  }


  User.findById(req.params._id, function (err, data) {
    if (err) {
      console.error(err, "user ID not found");
    } else {
      data.exercises.push(newExercises)
      data.count++
      data.save(function (err, data) {
        if (err) {
          console.error(err, "there was an error saving your exercise");
        } else {
          let response = {
            _id: data._id,
            username: data.username,
            date: new Date(newExercises.date).toDateString(), //this formatting is necessary to pass FCC test #4, but oddly not #5
            duration: parseInt(newExercises.duration),
            description: newExercises.description
          }
          res.json(response)
        }
      })
    }
  })
});


app.get("/api/users/:_id/logs", function (req, res) {
  //GET requests to /api/users/:_id/logs retrieve a full exercise log of any user, and includes a "count" property representing the number of exercises.
  //from-to and limit queries retrieve part of the log of any user. from and to are dates in yyyy-mm-dd format. limit is an integer of how many logs to send back.

  User.findById(req.params._id, function (err, data) {
    if (err) {
      console.error(err, "user ID not found");
    } else {
      let log = []
      for (let i = 0;
        req.query.limit ? i < req.query.limit : i < data.count;
        i++) {
        let logEntry = {
          date: new Date(data.exercises[i].date).toDateString(),
          duration: parseInt(data.exercises[i].duration),
          description: data.exercises[i].description
        };
        log.push(logEntry);
      }

      //array must be sorted by date
      log.sort(function (a, b) {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      if (req.query.from && req.query.to) { //to limit date ranges fetched.
        //The test is broken, and doesn't require this to pass despite being specified. Simply sorting the array by date makes the test past. 
        //I built a range limiter anyway.

        log = log.filter(logEntry =>
          new Date(logEntry.date).getTime() >= new Date(req.query.from).getTime()
          &&
          new Date(logEntry.date).getTime() <= new Date(req.query.to).getTime()
        );
      }

      let response = {
        _id: data._id,
        username: data.username,
        count: data.count,
        log: log,
      }
      res.json(response)
    }
  })
});


//delete all users
app.get('/api/users/clearTheDecks/:deleteCode', function (req, res) {
  let fireCode = "501D500D58E49BF24CFAEAF412CFF6";
  if (deleteCode === fireCode) {
    User.deleteMany({ username: { $exists: true } }, req.body, function (err, data) {
      if (err) {
        console.error(err, "something went wrong")
      } else {
        console.log("It has been done!");
        res.json({ "isItDone?": "it has been done!" })
      }
    })
  } else {
    res.json({ "Nice work chief": null })
  }
});