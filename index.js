const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wr2olko.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
  try {
    // const appointmentOptionsCollection=client.db('doctorsPortal').collection('appointmentOptions');
    const appointmentOptionsCollection = client.db('doctorsPortal').collection('appointmentOptions');
    const bookingsCollection = client.db('doctorsPortal').collection('bookings');
    const usersCollection = client.db('doctorsPortal').collection('users');

    app.get('/appointmentOptions', async (req, res) => { // get all appointments data
      const date = req.query.date;
      // console.log(date);
      const query = {};
      const options = await appointmentOptionsCollection.find(query).toArray();
      const bookingQuery = { appointmentDate: date };//specific date er sob booking gula nici
      const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();//specific date er sob booking gula nici
      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
        const bookedSlots = optionBooked.map(book => book.slot);
        const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
        option.slots = remainingSlots;
      })

      res.send(options);
    })

    app.get('/bookings',async(req,res)=>{//show bookings data in appointment page
      const email=req.query.email;
      const query={email:email};
      const bookings=await bookingsCollection.find(query).toArray();
      res.send(bookings);
    })

    app.post('/bookings', async (req, res) => { //save appointment data to database from modal
      const booking = req.body;
      const query={
        appointmentDate:booking.appointmentDate,
        email: booking.email,
        treatment: booking.treatment
      }
      const alreadyBooked=await bookingsCollection.find(query).toArray();
      if(alreadyBooked.length){
        const message=`You already have a booking on ${booking.appointmentDate}`;
        return res.send({acknowledged : false,message});
      }
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    })

    app.post('/users',async(req,res)=>{
      const user=req.body;
      console.log(user)
      const result=await usersCollection.insertOne(user);
      res.send(result);

    })

  }
  finally {

  }

}
run().catch(console.log);











app.get('/', async (req, res) => {
  res.send('doctors portal server is running');
})

app.listen(port, () => console.log(`Doctor portal server running on port${port}`));