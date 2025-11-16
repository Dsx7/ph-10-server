const express = require("express");
const cors = require("cors");
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


const uri =
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cewig2g.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});


async function run() {
    try {
        await client.connect();

        const db = client.db("financeflowBDUser");
        const addtranstionCollection = db.collection("addtranstion");
        const usersCollections = db.collection("users");

        // Users API

        app.post("/users", async(req, res) => {
            const newUser = req.body;
            const email = req.body.email;
            const query = { email: email };
            const existingUser = await usersCollections.findOne(query);
            if (existingUser) {
                res.send({
                    message: "user already exits. do not need to insert again",
                });
            } else {
                const result = await usersCollections.insertOne(newUser);
                res.send(result);
            }
        });


        // Transtion API
        app.get("/addtranstion", async(req, res) => {
            const newTransition = req.body;
            const result = await addtranstionCollection.insertOne(newTransition);
            res.send(result);
        });

        await client.db("admin").command({ ping: 1 });
        console.log(
            "Pinged your deployment. You successfully connected to MongoDB!"
        );
    } finally {}
}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("financeflow Server is running");
});

app.listen(port, () => {
    console.log(`financeflow server is running on port: ${port}`);
});