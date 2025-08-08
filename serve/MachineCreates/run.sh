#!/bin/bash
sudo mkdir -p /var/www
echo "<h1>Karshad Load Balancer Server is Running!</h1><p>ARM64 Ubuntu Server</p>" > /var/www/index.html
cd /var/www
nohup sudo python3 -m http.server 80 > /dev/null 2>&1 &