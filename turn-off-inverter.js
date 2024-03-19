#!/Users/beau/.nvm/versions/node/v20.3.0/bin/node

const Modbus = require("@glanglois/jsmodbus");
const net = require("net");

const VE_BUS = 227;

(async function main() {
  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket, VE_BUS);

  const options = {
    host: "venus.local",
    port: 502,
  };

  socket.on("error", (e) => {
    socket.end();
    reject(e);
  });

  socket.on("connect", async () => {
    try {
      const response = await client.writeSingleRegister(33, 4);
      console.log({ response });
    } catch (e) {
      console.error(e);
    }

    socket.end();
  });

  socket.connect(options);
})();
