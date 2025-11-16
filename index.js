const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cewig2g.mongodb.net/?appName=Cluster0`;

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

        // Users Update API

        app.patch("/users/:email", async(req, res) => {
            const email = req.params.email;
            const updatedName = req.body.name;
            const updatedPhoto = req.body.photo;

            const filter = { email: email };
            const updateDoc = {
                $set: {
                    name: updatedName,
                    photo: updatedPhoto,
                },
            };
            try {
                const result = await usersCollections.updateOne(filter, updateDoc);
                if (result.matchedCount === 0) {
                    return res.status(404).send({ message: "User not found" });
                }
                res.send({ message: "User updated successfully", result });
            } catch (error) {
                res.status(500).send({ message: "Error updating user", error });
            }
        });


        // Transtion API
        app.get("/addtranstion", async(req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.user_email = email;
            }
            const cursor = addtranstionCollection.find(query);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/addtranstion/:id", async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const cursor = await addtranstionCollection.findOne(query);
            res.send(cursor);
        });

        app.delete("/addtranstion/:id", async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addtranstionCollection.deleteOne(query);
            res.send(result);
        });

        app.post("/addtranstion", async(req, res) => {
            const newAddTransition = req.body;
            const result = await addtranstionCollection.insertOne(newAddTransition);
            res.send(result);
        });