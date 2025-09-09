import app from "./app.js";

const port = Number(process.env.PORT || 3100);
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  console.log(
    `Billing Simulator listening on ${process.env.PUBLIC_URL || `http://${host}:${port}`}`
  );
});