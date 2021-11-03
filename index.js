const express = require("express");
const { MongoClient } = require('mongodb');
const cors = require("cors");

var admin = require("firebase-admin");
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;



// firebase connection setup for verify token id


var serviceAccount = require("./ema-john-simple-6d302-firebase-adminsdk-nsp35-566ab2d7ee.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7niub.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
        try {
            const decodedUser = await admin.auth().verifyIdToken(idToken);
            req.decodedUserEmail = decodedUser.email;

        }
        catch {

        }

    }
    next();
}

// database connection 

async function run() {
    try {
        await client.connect();
        const database = client.db("online_Shop");
        const productsCollection = database.collection('products');
        const orderCollection = database.collection('orders');


        // api get all products 
        app.get("/products", async (req, res) => {

            const cursor = productsCollection.find({});
            const count = await cursor.count();
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();

            }
            else {
                products = await cursor.toArray();
            }




            res.send({
                count,
                products
            });
        })

        // use post to get data by keys 

        app.post("/products/bykeys", async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productsCollection.find(query).toArray();


            res.json(products)
        })

        // order post 

        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);

            res.json(result);
        })
        // orders get method to get all my orders
        app.get("/orders", verifyToken, async (req, res) => {

            const email = req.query.email;

            if (req.decodedUserEmail === email) {
                const query = { email: email };
                const cursor = orderCollection.find(query);
                const result = await cursor.toArray();
                res.json(result);
            }
            else {
                res.status(401).json({ message: "User not authorized" });
            }



        })


    }
    finally {
        // await client.close()
    }


}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send('ema john server is running')
})

app.listen(port, () => {
    console.log("server is running at port ", port);
})