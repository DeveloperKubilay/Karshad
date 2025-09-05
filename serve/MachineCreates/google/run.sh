#!/bin/bash
sudo apt-get update
sudo apt-get install -y util-linux
sudo fallocate -l 3G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
npm i express

cd $HOME
echo 'const express = require("express"),
      app = express(),
      port = 80;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, "0.0.0.0");' > index.js
nohup sudo node index.js > /dev/null 2>&1 &

#curl http://localhost