import "dotenv/config";
import http from "http";

import { control } from "./controllers.js";
import { dbInit } from "./database.js";
import { startContinuousUpdates } from "./services.js";

await dbInit();

const server = http.createServer(control);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startContinuousUpdates();
});
