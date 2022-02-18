const { assert } = require("chai");
const io = require("socket.io-client");

describe("Trying to test", () => {
  before("Connecting to the socket", (done) => {
    const socket = io.connect("https://de7c-41-187-94-148.ngro", {
      reconnectionDelay: 0,
      
    });

    socket.on("connect", (socket) => {
      console.log("Connected to the socket", socket.id);
      done();
    });
  });

  it("test 1", (done) => {
    assert("hello", "hello");
    done();
  });
});
