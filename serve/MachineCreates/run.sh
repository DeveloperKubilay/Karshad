#!/bin/bash
sudo swapoff /swapfile
sudo fallocate -l 10G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

sudo apt install nodejs -y

sudo mkdir -p /var/www
echo "<h1>Karshad Load Balancer Server is Running!</h1><p>ARM64 Ubuntu Server</p>" > /var/www/index.html
cd /var/www
nohup     sudo python3 -m http.server 80      > /dev/null 2>&1 &