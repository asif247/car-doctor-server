const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const express = require('express')
const jwt= require('jsonwebtoken')
const cors = require('cors');
const app = express()
const port = process.env.PORT || 5000

// user pass


// middleware 
app.use(cors())
app.use(express.json())

// console.log(process.env.DB_PASS)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tidkull.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// verify jwt 
const verifyJWT = (req, res, next) => {
  console.log('hit the vrfy jwt')
  console.log(req.headers);
  const authorization = req.headers.authorization
  if (!authorization) {
    return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token= authorization.split(' ')[1]
  console.log('token inside jwt', token)
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
        return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
})
}
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
    const serviceCollection = client.db('car-doctor').collection('services')
    const bookingCollection = client.db('car-doctor').collection('booking-data')
    
    // jwt

    app.post('/jwt', (req, res) => {
      const user = req.body
      console.log(user)
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' });
      res.send({token})
    })

    // service 
      app.get('/services', async (req, res) => {
          const cursor = serviceCollection.find()
          const result = await cursor.toArray()
          res.send(result)
      })
      app.get('/services/:id',async (req, res) => {
          const id = req.params.id
          const query = { _id: new ObjectId(id) }
          const options = {
            // sort returned documents in ascending order by title (A->Z)
            // sort: { title: 1 },
            // Include only the `title` and `imdb` fields in each returned document
            projection: { title: 1, price: 1,service_id:1, img:1 },
          };
          const result = await serviceCollection.findOne(query,options)
          res.send(result)
      })
    // bookings 
      app.post('/bookings', async (req, res) => {
        const booking = req.body 
        console.log(booking)
        const result = await bookingCollection.insertOne(booking)
        res.send(result)
    })
    app.get('/bookings',verifyJWT, async (req, res) => {
      console.log(req.headers);
      console.log(req.query.email);
      const decoded = req.decoded;
            console.log('came back after verify', decoded)

            if(decoded.email !== req.query.email){
                return res.status(403).send({error: 1, message: 'forbidden access'})
            }

      let query = {};
      if (req.query?.email) {
          query = { email: req.query.email }
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })
    app.patch('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedBooking = req.body;
      console.log(updatedBooking);
      const updateDoc = {
          $set: {
              status: updatedBooking.status
          },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
  })

  app.delete('/bookings/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await bookingCollection.deleteOne(query);
    res.send(result);
})

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Doctor server is running')
})

app.listen(port, () => {
  console.log(`Doctor servr is running on port: ${port}`)
})