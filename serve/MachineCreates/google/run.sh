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

nohup sudo python3 -m http.server 80 > /dev/null 2>&1 &