const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

const PAYMENT_ADDRESS =
  "0x362CF6C729eDD5e42FABeF53E0F3826fF944b218";

const PRICE_PER_CDK = 1;

/*
=========================================================
   DATA DIRECTORY
=========================================================

Local development:
    ./data

Netlify:
    /tmp/cdk-store-data

IMPORTANT:
Netlify /tmp storage is temporary and is NOT persistent.
This fixes the deployment crash, but production should
eventually use Netlify Blobs, Supabase, or another database.
=========================================================
*/

const DATA_DIR = process.env.NETLIFY
  ? "/tmp/cdk-store-data"
  : path.join(__dirname, "data");

const ORDERS_FILE = path.join(
  DATA_DIR,
  "orders.json"
);

const CODES_FILE = path.join(
  DATA_DIR,
  "codes.json"
);


/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);


/* =========================================================
   DATA INITIALIZATION
========================================================= */

function ensureDataFiles() {
  fs.mkdirSync(DATA_DIR, {
    recursive: true
  });

  if (!fs.existsSync(ORDERS_FILE)) {
    fs.writeFileSync(
      ORDERS_FILE,
      "[]",
      "utf8"
    );
  }

  if (!fs.existsSync(CODES_FILE)) {
    fs.writeFileSync(
      CODES_FILE,
      "[]",
      "utf8"
    );
  }
}

ensureDataFiles();


/* =========================================================
   JSON HELPERS
========================================================= */

function readJSON(file) {
  try {
    const content = fs.readFileSync(
      file,
      "utf8"
    );

    return JSON.parse(content);

  } catch (error) {

    console.error(
      `Could not read ${file}:`,
      error.message
    );

    return [];
  }
}


function writeJSON(file, data) {
  fs.writeFileSync(
    file,
    JSON.stringify(
      data,
      null,
      2
    ),
    "utf8"
  );
}


/* =========================================================
   ID GENERATOR
========================================================= */

function createId(prefix) {
  return (
    `${prefix}_` +
    `${Date.now()}_` +
    crypto
      .randomBytes(4)
      .toString("hex")
  );
}


/* =========================================================
   TRANSACTION HASH VALIDATION
========================================================= */

function isValidTxHash(hash) {
  return /^0x[a-fA-F0-9]{64}$/.test(
    hash
  );
}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function requireAdmin(
  req,
  res,
  next
) {
  const token =
    req.headers["x-admin-token"];

  if (
    !token ||
    token !== ADMIN_PASSWORD
  ) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized."
    });
  }

  next();
}


/* =========================================================
   CONFIG
========================================================= */

app.get(
  "/api/config",
  (req, res) => {

    res.json({
      success: true,
      paymentAddress:
        PAYMENT_ADDRESS,
      pricePerCDK:
        PRICE_PER_CDK
    });

  }
);


/* =========================================================
   CREATE ORDER
========================================================= */

app.post(
  "/api/orders",
  (req, res) => {

    const quantity =
      Number(req.body.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 1000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be between 1 and 1000."
      });
    }

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order = {

      id:
        createId("ORD"),

      quantity:
        quantity,

      amountUsd:
        quantity *
        PRICE_PER_CDK,

      txHash:
        null,

      status:
        "AWAITING_PAYMENT",

      codes:
        [],

      createdAt:
        new Date().toISOString(),

      submittedAt:
        null,

      confirmedAt:
        null,

      rejectedAt:
        null
    };

    orders.push(order);

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      order: {

        id:
          order.id,

        quantity:
          order.quantity,

        amountUsd:
          order.amountUsd,

        status:
          order.status,

        codes:
          []
      }
    });

  }
);


/* =========================================================
   SUBMIT PAYMENT
========================================================= */

app.post(
  "/api/orders/:id/submit-payment",
  (req, res) => {

    const txHash =
      String(
        req.body.txHash || ""
      ).trim();

    if (
      !isValidTxHash(txHash)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid transaction hash."
      });
    }

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const duplicate =
      orders.find(
        order =>
          order.txHash &&
          order.txHash.toLowerCase() ===
          txHash.toLowerCase()
      );

    if (duplicate) {
      return res.status(409).json({
        success: false,

        message:
          "This transaction hash has already been submitted.",

        orderId:
          duplicate.id
      });
    }

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      order.status !==
      "AWAITING_PAYMENT"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "This order cannot accept a new payment submission."
      });
    }

    order.txHash =
      txHash;

    order.status =
      "PENDING_REVIEW";

    order.submittedAt =
      new Date().toISOString();

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      order: {

        id:
          order.id,

        quantity:
          order.quantity,

        amountUsd:
          order.amountUsd,

        status:
          order.status,

        codes:
          []
      },

      message:
        "Payment submitted successfully. Your order is awaiting verification."
    });

  }
);


/* =========================================================
   GET ORDER
========================================================= */

app.get(
  "/api/orders/:id",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    const approved =
      order.status ===
      "CONFIRMED";

    res.json({
      success: true,

      order: {

        id:
          order.id,

        quantity:
          order.quantity,

        amountUsd:
          order.amountUsd,

        status:
          order.status,

        codes:
          approved
            ? order.codes
            : []
      }
    });

  }
);


/* =========================================================
   ADMIN LOGIN
========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {

    const password =
      String(
        req.body.password || ""
      );

    if (
      password !==
      ADMIN_PASSWORD
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid admin password."
      });
    }

    res.json({
      success: true,

      token:
        ADMIN_PASSWORD
    });

  }
);


/* =========================================================
   ADMIN ORDERS
========================================================= */

app.get(
  "/api/admin/orders",
  requireAdmin,
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    res.json({
      success: true,

      orders:
        orders
          .slice()
          .reverse()
    });

  }
);


/* =========================================================
   ADMIN CDK INVENTORY
========================================================= */

app.get(
  "/api/admin/codes",
  requireAdmin,
  (req, res) => {

    const codes =
      readJSON(
        CODES_FILE
      );

    const available =
      codes.filter(
        code =>
          code.status ===
          "AVAILABLE"
      );

    const used =
      codes.filter(
        code =>
          code.status ===
          "USED"
      );

    res.json({
      success: true,

      total:
        codes.length,

      available:
        available.length,

      used:
        used.length,

      codes:
        codes
    });

  }
);


/* =========================================================
   GENERATE CDKs
========================================================= */

app.post(
  "/api/admin/codes",
  requireAdmin,
  (req, res) => {

    const quantity =
      Number(
        req.body.quantity
      );

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 10000
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be between 1 and 10000."
      });
    }

    const codes =
      readJSON(
        CODES_FILE
      );

    const generated = [];

    for (
      let i = 0;
      i < quantity;
      i++
    ) {

      const code =
        "CDK-" +
        crypto
          .randomBytes(10)
          .toString("hex")
          .toUpperCase();

      const item = {

        id:
          createId("CDK"),

        code:
          code,

        status:
          "AVAILABLE",

        createdAt:
          new Date().toISOString(),

        usedAt:
          null,

        orderId:
          null
      };

      codes.push(item);

      generated.push(code);
    }

    writeJSON(
      CODES_FILE,
      codes
    );

    res.json({
      success: true,

      count:
        generated.length,

      codes:
        generated
    });

  }
);


/* =========================================================
   APPROVE ORDER
========================================================= */

app.post(
  "/api/admin/orders/:id/approve",
  requireAdmin,
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const codes =
      readJSON(
        CODES_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      order.status ===
      "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Order is already approved."
      });
    }

    if (
      order.status ===
      "REJECTED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rejected orders cannot be approved."
      });
    }

    if (
      order.status !==
      "PENDING_REVIEW"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only orders awaiting payment review can be approved."
      });
    }

    if (!order.txHash) {
      return res.status(400).json({
        success: false,
        message:
          "No transaction hash has been submitted."
      });
    }

    const available =
      codes.filter(
        code =>
          code.status ===
          "AVAILABLE"
      );

    if (
      available.length <
      order.quantity
    ) {
      return res.status(400).json({
        success: false,

        message:
          `Not enough CDKs available. Required: ${order.quantity}, Available: ${available.length}`
      });
    }

    const selected =
      available.slice(
        0,
        order.quantity
      );

    selected.forEach(
      item => {

        item.status =
          "USED";

        item.orderId =
          order.id;

        item.usedAt =
          new Date().toISOString();

      }
    );

    order.codes =
      selected.map(
        item =>
          item.code
      );

    order.status =
      "CONFIRMED";

    order.confirmedAt =
      new Date().toISOString();

    writeJSON(
      CODES_FILE,
      codes
    );

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      message:
        "Order approved and CDKs assigned.",

      order:
        order
    });

  }
);


/* =========================================================
   REJECT ORDER
========================================================= */

app.post(
  "/api/admin/orders/:id/reject",
  requireAdmin,
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      order.status ===
      "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Approved orders cannot be rejected."
      });
    }

    order.status =
      "REJECTED";

    order.rejectedAt =
      new Date().toISOString();

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      message:
        "Order rejected."
    });

  }
);


/* =========================================================
   RESET ORDER
========================================================= */

app.post(
  "/api/admin/orders/:id/reset",
  requireAdmin,
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      order.status ===
      "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Confirmed orders cannot be reset."
      });
    }

    order.status =
      "AWAITING_PAYMENT";

    order.txHash =
      null;

    order.submittedAt =
      null;

    order.rejectedAt =
      null;

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      message:
        "Order reset."
    });

  }
);


/* =========================================================
   DELETE ORDER
========================================================= */

app.delete(
  "/api/admin/orders/:id",
  requireAdmin,
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const index =
      orders.findIndex(
        item =>
          item.id ===
          req.params.id
      );

    if (
      index === -1
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      orders[index].status ===
      "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Confirmed orders cannot be deleted."
      });
    }

    orders.splice(
      index,
      1
    );

    writeJSON(
      ORDERS_FILE,
      orders
    );

    res.json({
      success: true,

      message:
        "Order deleted."
    });

  }
);


/* =========================================================
   CUSTOMER CDK CODES
========================================================= */

app.get(
  "/api/orders/:id/codes",
  (req, res) => {

    const orders =
      readJSON(
        ORDERS_FILE
      );

    const order =
      orders.find(
        item =>
          item.id ===
          req.params.id
      );

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found."
      });
    }

    if (
      order.status !==
      "CONFIRMED"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "CDKs are not available until the order is approved."
      });
    }

    res.json({
      success: true,

      codes:
        order.codes
    });

  }
);


/* =========================================================
   API 404
========================================================= */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      success: false,
      message:
        "API endpoint not found."
    });

  }
);


/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  /.*/,
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );

  }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error."
    });

  }
);


/* =========================================================
   START SERVER / EXPORT FOR NETLIFY
========================================================= */

if (require.main === module) {

  app.listen(PORT, () => {

    console.log("");

    console.log(
      "===================================="
    );

    console.log(
      "             CDK STORE"
    );

    console.log(
      "===================================="
    );

    console.log(
      `Store: http://localhost:${PORT}`
    );

    console.log(
      `Admin: http://localhost:${PORT}/admin.html`
    );

    console.log(
      "Production payment flow enabled."
    );

    console.log(
      "Manual payment verification required."
    );

    console.log(
      "===================================="
    );

  });

}


module.exports = app;