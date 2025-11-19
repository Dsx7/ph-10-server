const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;

const decoded = Buffer.from(process.env.FIREBASE_SECRETE, "base64").toString(
    "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

const logger = (req, res, next) => {
    console.log("login info");
    next();
};

const verifyFirebaseToken = async(req, res, next) => {
    console.log("in the verify middleware", req.headers.authorization);

    if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(401).send({ message: "unauthorized access" });
    }

    try {
        const userInfoToken = await admin.auth().verifyIdToken(token);
        console.log("after valid token", userInfoToken);
        req.token_email = userInfoToken.email;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(401).send({ message: "unauthorized access" });
    }
};

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cewig2g.mongodb.net/?appName=Cluster0`;
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7cwh8s9.mongodb.net/?appName=Cluster0`;

// const uri = "mongodb+srv://finEaseDB:Zo1VYG4wQ5lNgWns@cluster0.jsnoqru.mongodb.net/?appName=Cluster0";

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

        const db = client.db("finEaseDB");
        const addtranstionCollection = db.collection("transtionAdded");
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
        app.get("/addtranstion", logger, verifyFirebaseToken, async(req, res) => {
            const email = req.query.email;
            const query = {};
            if (email) {
                query.user_email = email;
            }
            const cursor = addtranstionCollection.find(query).sort({
                created_at: -1,
            });
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get("/transtionAdded/:id", async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const cursor = await addtranstionCollection.findOne(query);
            res.send(cursor);
        });


        app.get("/category-total", verifyFirebaseToken, async(req, res) => {
            try {
                const email = req.query.email;
                const category = req.query.category;

                if (!email || !category) {
                    return res
                        .status(400)
                        .send({ message: "Email and category are required" });
                }
                const totalCat = [{
                        $match: {
                            user_email: email,
                            category: category,
                        },
                    },
                    {
                        $group: {
                            _id: "$category",
                            totalAmount: { $sum: { $toDouble: "$amount" } },
                        },
                    },
                ];

                const result = await addtranstionCollection
                    .aggregate(totalCat)
                    .toArray();

                if (result.length === 0) {
                    return res.send({ totalAmount: 0 });
                }

                res.send({ totalAmount: result[0].totalAmount });
            } catch (error) {
                console.error("Error calculating category total:", error);
                res.status(500).send({ message: "Internal server error" });
            }
        });

        app.patch("/transtionAdded/:id", async(req, res) => {
            const id = req.params.id;
            const updatedTransaction = req.body;

            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    type: updatedTransaction.type,
                    category: updatedTransaction.category,
                    amount: updatedTransaction.amount,
                    description: updatedTransaction.description,
                    date: updatedTransaction.date,
                },
            };
            const result = await addtranstionCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.post("/addtranstion", async(req, res) => {
            const newAddTransition = req.body;
            const result = await addtranstionCollection.insertOne(newAddTransition);
            res.send(result);
            // console.log(newAddTransition)
        });

        app.delete("/transtionAdded/:id", async(req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await addtranstionCollection.deleteOne(query);
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