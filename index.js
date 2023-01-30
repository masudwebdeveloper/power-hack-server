const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const SECRET_KEY = "NOTESAPI";
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

//middle ware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.jfl1bty.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const billCollections = client.db("powerHack").collection("bills");
    const userModel = client.db("powerHack").collection("user");

    //this api use to add bill
    app.post("/add-billing", async (req, res) => {
      const billingData = req.body;
      const result = await billCollections.insertOne(billingData);
      res.send(result);
    });

    // this api use to get bill list
    app.get("/billing-list", async (req, res) => {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page);
      const query = {};
      const name = req.query.search;
      const count = await billCollections.estimatedDocumentCount();
      if (name) {
        const query = { name: name };
        const billList = await billCollections.find(query).toArray();
        return res.send({count,billList});
      }
      const billList = await billCollections
        .find(query)
        .skip(page * size)
        .limit(size)
        .toArray();
      res.send({ count, billList });
    });

    //this api use to update billing information
    app.put("/update-billing/:id", async (req, res) => {
      const id = req.params.id;
      const { name, email, number, billId, amount } = req.body;
      const filter = { _id: ObjectId(id) };
      const option = { upsert: true };
      const updateDoc = {
        $set: {
          name,
          email,
          number,
          amount,
          billId,
        },
      };
      const result = await billCollections.updateOne(filter, updateDoc, option);
      res.send(result);
    });

    // this api use to delete billing documentation
    app.delete("/delete-billing/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await billCollections.deleteOne(filter);
      res.send(result);
    });

    app.post("/registration", async (req, res) => {
      const { userName, email, password } = req.body;
      try {
        const existingUser = await userModel.findOne({ email: email });
        if (existingUser) {
          return res.status(400).json({ message: "user already exists" });
        }

        const hashPassword = await bcrypt.hash(password, 10);

        const result = await userModel.insertOne({
          email: email,
          password: hashPassword,
          userName: userName,
        });

        const token = jwt.sign(
          { email: result.email, id: result.__id },
          SECRET_KEY
        );
        res.status(201).json({ user: result, token: token });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Somethings went wrong" });
      }
    });

    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      try {
        const existingUser = await userModel.findOne({ email: email });
        if (!existingUser) {
          return res.status(404).json({ message: "user not found!" });
        }
        const matchPassword = await bcrypt.compare(
          password,
          existingUser.password
        );
        if (!matchPassword) {
          return res.status(400).json({ message: "Invalid Credencials" });
        }

        const token = jwt.sign(
          { email: existingUser.email, id: existingUser.__id },
          SECRET_KEY
        );
        res.status(201).json({ user: existingUser, token: token });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Somethings went wrong" });
      }
    });

    //  api/registration
    //  api/login
    //  api/billing-list
    //  api/add-billing
    //  api/update-billing/:id
    //  api/delete-billing/:id
  } finally {
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("power hack server is running");
});
app.listen(port, () => {
  console.log(`power hack server is running on ${port}`);
});
