import http from "http";

import { control } from "./controllers.js";

const server = http.createServer(control);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
