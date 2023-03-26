const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt=require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

const app = express();

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wr2olko.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
  console.log('token',req.headers.authorization);
  const authHeader=req.headers.authorization;
  if(!authHeader){
    return res.status(401).send('unauthorized access');
  }
  const token=authHeader.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN,function(err,decoded){
    if(err){
      return res.status(403).send({message:'forbedden access'})
    }
    req.decoded=decoded;
    next();
  })

}

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

    app.get('/bookings',verifyJWT,async(req,res)=>{//show bookings data in dashboard page (MyAppoinement 7 )
      const email=req.query.email;
      const decodedEmail=req.decoded.email;//const token=jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:'1h'});
      if(email !== decodedEmail){
        return res.status(403).send({message:'forbidden access'})
      }
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

    app.get('/jwt',async(req,res)=>{//signup 52
      const email=req.query.email;
      const query={email:email};
      const user=await usersCollection.findOne(query);
      console.log(user);
      if(user){
        const token=jwt.sign({email},process.env.ACCESS_TOKEN,{expiresIn:'1h'});
        return res.send({accessToken:token})
      }
      res.status(403).send({accessToken:'token'});
    })

    app.get('/users',async(req,res)=>{
      const query={};
      const users=await usersCollection.find(query).toArray();
      res.send(users);
    })
    app.get('/users/admin/:email', async(req,res)=>{// check a user is admin or not, we will check it from custom hook useAdmin
      const email=req.params.email;
      const query={email};
      const user=await usersCollection.findOne(query);
      res.send({isAdmin: user?.role==='admin'});

    })

    app.put('/users/admin/:id', verifyJWT, async(req,res)=>{
      const decodedEmail=req.decoded.email;
      const query={email:decodedEmail};
      const user= await usersCollection.findOne(query);
      if(user?.role!=='admin'){
        return res.status(403).send({message:'access forbidden'})
      }

      const id=req.params.id;
      const filter={_id:new ObjectId(id)};
      const options={upsert:true};
      const updateDoc={
        $set:{
          role:'admin'
        }
      }
      const result=await usersCollection.updateOne(filter,updateDoc,options);
      res.send(result);
    })


    app.post('/users',async(req,res)=>{//save user email and name to the database
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